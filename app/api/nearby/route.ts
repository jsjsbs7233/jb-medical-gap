import { NextRequest, NextResponse } from 'next/server';
import { getRoute } from '@/lib/tmap';
import { fetchAround } from '@/lib/hira';
import { supabaseServer, type ClinicRow } from '@/lib/supabase';
import { gridKey, haversineKm } from '@/lib/geo';
import { gradeByRank, delayRatio } from '@/lib/grade';
import { isPediatricSpecialistInstitution, isRelevantForPediatricCare } from '@/lib/pediatricSpecialist';
import type { Clinic, NearbyResponse } from '@/lib/types';

const CANDIDATES = 8; // 거리순으로 Tmap을 부를 병원 수
const SPECIALIST_CANDIDATES = 3; // 거리순 8개 안에 전문의 병원이 없을 수 있어 추가로 확보
const RADIUS_KM = 60; // 권역 경계를 넘기 위해 넉넉하게
const CACHE_SEC = 180; // 교통 캐시 3분

// Supabase가 아직 설정되지 않았을 때를 위한 인메모리 폴백 캐시 (같은 서버 인스턴스 안에서만 유효)
const memCache = new Map<string, { totalTime: number; totalDist: number; ts: number }>();

async function loadBaseClinics(lat: number, lng: number): Promise<ClinicRow[]> {
  const supabase = supabaseServer();

  if (supabase) {
    const { data, error } = await supabase
      .from('clinics')
      .select('id, name, sido, sigungu, addr, tel, lat, lng, cl_name, specialist_doctor_count');
    if (!error && data && data.length > 0) return data as ClinicRow[];
  }

  // Supabase 미설정이거나 아직 /api/sync를 안 돌렸을 때 — 심평원 직접 호출로 대체
  const hira = await fetchAround({ lat, lng }, RADIUS_KM * 1000);
  return hira.map((h) => ({
    id: h.id,
    name: h.name,
    sido: h.sido,
    sigungu: h.sigungu,
    addr: h.addr,
    tel: h.tel,
    lat: h.lat,
    lng: h.lng,
    cl_name: h.clName,
    specialist_doctor_count: h.specialistDoctorCount,
  }));
}

async function readCache(grid: string, clinicId: string) {
  const supabase = supabaseServer();
  const cutoff = Date.now() - CACHE_SEC * 1000;

  if (supabase) {
    const { data } = await supabase
      .from('traffic_cache')
      .select('total_time, total_dist, created_at')
      .eq('grid_key', grid)
      .eq('clinic_id', clinicId)
      .maybeSingle();
    if (data && new Date(data.created_at as string).getTime() > cutoff) {
      return { totalTime: data.total_time as number, totalDist: data.total_dist as number };
    }
    return null;
  }

  const hit = memCache.get(`${grid}_${clinicId}`);
  if (hit && hit.ts > cutoff) return { totalTime: hit.totalTime, totalDist: hit.totalDist };
  return null;
}

async function writeCache(
  grid: string,
  clinicId: string,
  totalTime: number,
  totalDist: number
) {
  const supabase = supabaseServer();
  if (supabase) {
    await supabase
      .from('traffic_cache')
      .upsert(
        { grid_key: grid, clinic_id: clinicId, total_time: totalTime, total_dist: totalDist },
        { onConflict: 'grid_key,clinic_id' }
      );
    return;
  }
  memCache.set(`${grid}_${clinicId}`, { totalTime, totalDist, ts: Date.now() });
}

/**
 * 주변 소아과 목록.
 * GET /api/nearby?lat=&lng=
 *
 * ① 심평원 목록은 Supabase에서 읽는다 (없으면 직접 호출로 대체) — Tmap 호출 0회
 * ② 직선거리로 반경 60km 내 가까운 8개 + 그 안에 없는 전문의 병원 최대 3개를 더한다 — Tmap 호출 0회
 * ③ 위치를 격자로 스냅해 3분 이내 캐시가 있으면 그대로 쓴다 — 캐시 히트 시 0회
 * ④ 남은 것만 Tmap 병렬 호출
 *
 * 무슨 일이 있어도 500을 던지지 않는다 — 실패하면 200 + 빈 배열/추정치.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json<NearbyResponse>({
      items: [],
      gridKey: '',
      cached: false,
      error: 'lat, lng 파라미터가 필요합니다.',
    });
  }

  const grid = gridKey(lat, lng);

  try {
    const base = await loadBaseClinics(lat, lng);

    const scored = base
      .map((c) => ({ ...c, distanceKm: haversineKm({ lat, lng }, { lat: c.lat, lng: c.lng }) }))
      .filter((c) => c.distanceKm <= RADIUS_KM)
      // dgsbjtCd=11로 걸러졌어도 상호가 정형외과·이비인후과 등 소아과와 무관한
      // 전문과목이면 제외한다 (실제 심평원 데이터에 이런 경우가 섞여 있음)
      .filter((c) => isRelevantForPediatricCare(c.cl_name ?? '', c.name))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearestOverall = scored.slice(0, CANDIDATES);
    // 거리순 후보 안에 전문의 병원이 없을 수 있어(일반의 GP 의원이 훨씬 많음),
    // "가장 가까운 소아 전문진료"가 항상 실제 이동시간을 갖도록 별도로 확보한다.
    const nearestSpecialists = scored
      .filter((c) =>
        isPediatricSpecialistInstitution(c.cl_name ?? '', c.name, c.specialist_doctor_count ?? undefined)
      )
      .slice(0, SPECIALIST_CANDIDATES);

    const merged = new Map<string, (typeof scored)[number]>();
    [...nearestOverall, ...nearestSpecialists].forEach((c) => merged.set(c.id, c));
    const withDistance = Array.from(merged.values());

    if (withDistance.length === 0) {
      return NextResponse.json<NearbyResponse>({ items: [], gridKey: grid, cached: true });
    }

    let allFromCache = true;

    const results = await Promise.all(
      withDistance.map(async (c) => {
        const hit = await readCache(grid, c.id);
        if (hit) {
          return {
            clinic: c,
            totalTime: hit.totalTime,
            totalDist: hit.totalDist,
            estimated: false,
          };
        }

        allFromCache = false;
        const route = await getRoute({ lat, lng }, { lat: c.lat, lng: c.lng }, false);

        if (route) {
          await writeCache(grid, c.id, route.totalTime, route.totalDistance);
          return {
            clinic: c,
            totalTime: route.totalTime,
            totalDist: route.totalDistance,
            estimated: false,
          };
        }

        // Tmap 실패 — 직선거리 ÷ 45km/h 로 추정
        const distM = c.distanceKm * 1000;
        return {
          clinic: c,
          totalTime: (c.distanceKm / 45) * 3600,
          totalDist: distM,
          estimated: true,
        };
      })
    );

    const minutesList = results.map((r) => Math.max(1, Math.round(r.totalTime / 60)));
    const grades = gradeByRank(minutesList);

    const items: Clinic[] = results.map((r, i) => ({
      id: r.clinic.id,
      name: r.clinic.name,
      addr: r.clinic.addr,
      tel: r.clinic.tel,
      sido: r.clinic.sido ?? '',
      sigungu: r.clinic.sigungu ?? '',
      lat: r.clinic.lat,
      lng: r.clinic.lng,
      minutes: minutesList[i],
      distanceKm: Math.round((r.totalDist / 1000) * 10) / 10,
      delay: r.estimated ? 1 : delayRatio(r.totalTime, r.totalDist),
      grade: grades[i],
      estimated: r.estimated,
      // dgsbjtCd=11(소아청소년과)로 이미 걸러진 후보라 전부 소아 진료는 가능하다고 본다.
      acceptsPediatricPatients: true,
      hasPediatricSpecialist: isPediatricSpecialistInstitution(
        r.clinic.cl_name ?? '',
        r.clinic.name,
        r.clinic.specialist_doctor_count ?? undefined
      ),
      specialistDoctorCount: r.clinic.specialist_doctor_count ?? undefined,
    }));

    items.sort((a, b) => a.minutes - b.minutes);

    return NextResponse.json<NearbyResponse>({ items, gridKey: grid, cached: allFromCache });
  } catch {
    return NextResponse.json<NearbyResponse>({
      items: [],
      gridKey: grid,
      cached: false,
      error: '일시적으로 정보를 불러오지 못했습니다',
    });
  }
}
