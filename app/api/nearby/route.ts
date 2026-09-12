/**
 * 핵심 라우트. CLAUDE.md §3 "API 호출을 200회에서 8회로" 순서를 그대로 따른다.
 *
 * ① 심평원 데이터는 Supabase에서만 읽는다 (Tmap 호출 0회)
 * ② 직선거리로 후보를 CANDIDATES개로 압축한다 (Tmap 호출 0회)
 * ③ 위치를 격자로 스냅해 캐시를 먼저 본다 (캐시 히트면 0회)
 * ④ 캐시에 없는 후보만 Tmap 병렬 호출 (최대 CANDIDATES회)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { CANDIDATES, RADIUS_KM, CACHE_SEC, haversineKm, toGridKey, boundingBox } from '@/lib/geo';
import { gradeByRank, delayRatio } from '@/lib/grade';
import { getRoute } from '@/lib/tmap';
import type { Clinic, NearbyResponse } from '@/lib/types';
import demoFixtures from '@/lib/demoFixtures.json';

// Tmap이 죽었을 때 직선거리를 시간으로 환산하는 가정 속도 (km/h)
const FALLBACK_KMH = 45;

export async function GET(req: NextRequest) {
  const latParam = req.nextUrl.searchParams.get('lat');
  const lngParam = req.nextUrl.searchParams.get('lng');

  // Number(null) === 0 이라 누락된 것과 진짜 0,0을 구분하려면 null 체크를 먼저 해야 한다
  if (latParam === null || lngParam === null) {
    return empty('lat/lng 파라미터가 필요합니다');
  }

  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return empty('lat/lng 값이 올바르지 않습니다');
  }

  const gridKey = toGridKey(lat, lng);

  // 최후의 보험(CLAUDE.md §7) — DB/Tmap을 아예 건드리지 않고 미리 검증해둔 고정 응답을 낸다.
  // 발표 시연 좌표(DEMO.md)에서만 동작하고, 그 외 좌표는 평소처럼 실시간 로직을 탄다.
  if (process.env.DEMO_MODE === '1') {
    const fixture = (demoFixtures as Record<string, NearbyResponse>)[gridKey];
    if (fixture) {
      return NextResponse.json<NearbyResponse>(fixture);
    }
  }

  try {
    const supabase = getSupabaseServiceClient();

    // ② 직선거리로 후보 압축 — DB 쿼리에서 먼저 사각형으로 좁혀 haversine 계산량을 줄인다
    const box = boundingBox({ lat, lng }, RADIUS_KM);
    const { data: clinics, error: dbError } = await supabase
      .from('clinics')
      .select('id, name, sido, sigungu, addr, tel, lat, lng')
      .gte('lat', box.minLat)
      .lte('lat', box.maxLat)
      .gte('lng', box.minLng)
      .lte('lng', box.maxLng);

    if (dbError || !clinics) {
      return empty('병원 목록을 불러오지 못했습니다');
    }

    const candidates = clinics
      .map((c) => ({ ...c, distanceKm: haversineKm({ lat, lng }, { lat: c.lat, lng: c.lng }) }))
      .filter((c) => c.distanceKm <= RADIUS_KM) // 사각형은 원보다 넓으니 정확한 반경으로 다시 거른다
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, CANDIDATES);

    if (candidates.length === 0) {
      return NextResponse.json<NearbyResponse>({
        items: [],
        gridKey,
        cached: false,
        error: `반경 ${RADIUS_KM}km 내 소아과가 없습니다`,
      });
    }

    // ③ 격자 캐시 확인 — CACHE_SEC 이내에 같은 격자에서 조회한 기록이 있으면 재사용
    const cacheCutoff = new Date(Date.now() - CACHE_SEC * 1000).toISOString();
    const { data: cacheRows } = await supabase
      .from('traffic_cache')
      .select('clinic_id, total_time, total_dist')
      .eq('grid_key', gridKey)
      .in(
        'clinic_id',
        candidates.map((c) => c.id),
      )
      .gte('created_at', cacheCutoff);

    const cacheMap = new Map(
      (cacheRows ?? []).map((r) => [r.clinic_id, { totalTime: r.total_time, totalDist: r.total_dist }]),
    );
    const needsFetch = candidates.filter((c) => !cacheMap.has(c.id));
    const servedEntirelyFromCache = needsFetch.length === 0;

    // ④ 캐시에 없는 후보만 Tmap 병렬 호출
    if (needsFetch.length > 0) {
      const results = await Promise.allSettled(
        needsFetch.map((c) => getRoute({ lat, lng }, { lat: c.lat, lng: c.lng })),
      );

      const toUpsert: { grid_key: string; clinic_id: string; total_time: number; total_dist: number }[] = [];

      results.forEach((r, i) => {
        const clinic = needsFetch[i];
        if (r.status === 'fulfilled' && r.value) {
          cacheMap.set(clinic.id, { totalTime: r.value.totalTime, totalDist: r.value.totalDistance });
          toUpsert.push({
            grid_key: gridKey,
            clinic_id: clinic.id,
            total_time: r.value.totalTime,
            total_dist: r.value.totalDistance,
          });
        }
        // 실패(null 또는 reject)한 건은 cacheMap에 안 남긴다 → 아래에서 직선거리 추정으로 대체
      });

      if (toUpsert.length > 0) {
        await supabase.from('traffic_cache').upsert(toUpsert, { onConflict: 'grid_key,clinic_id' });
      }
    }

    // Tmap 성공분은 실측치, 실패분은 직선거리 ÷ 45km/h 추정치
    const enriched = candidates.map((c) => {
      const route = cacheMap.get(c.id);
      if (route) {
        return {
          ...c,
          minutes: Math.round(route.totalTime / 60),
          delay: delayRatio(route.totalTime, route.totalDist),
          estimated: false,
        };
      }
      return {
        ...c,
        minutes: Math.round((c.distanceKm / FALLBACK_KMH) * 60),
        delay: 1,
        estimated: true,
      };
    });

    const grades = gradeByRank(enriched.map((c) => c.minutes));

    const items: Clinic[] = enriched
      .map((c, i) => ({
        id: c.id,
        name: c.name,
        addr: c.addr,
        tel: c.tel,
        sido: c.sido,
        sigungu: c.sigungu,
        lat: c.lat,
        lng: c.lng,
        minutes: c.minutes,
        distanceKm: Math.round(c.distanceKm * 10) / 10,
        delay: Math.round(c.delay * 100) / 100,
        grade: grades[i],
        estimated: c.estimated,
      }))
      .sort((a, b) => a.minutes - b.minutes);

    return NextResponse.json<NearbyResponse>({
      items,
      gridKey,
      cached: servedEntirelyFromCache,
    });
  } catch {
    return empty('일시적으로 정보를 불러오지 못했습니다');
  }
}

function empty(error: string) {
  return NextResponse.json<NearbyResponse>({ items: [], gridKey: '', cached: false, error });
}
