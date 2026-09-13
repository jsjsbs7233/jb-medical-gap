/**
 * 핵심 라우트. CLAUDE.md §3 "API 호출을 200회에서 8회로" 순서를 그대로 따르되,
 * Supabase가 없어도(또는 아직 /api/sync를 안 돌렸어도) 심평원 직접 호출로
 * 자동 대체하고, 소아 진료 가능/소아청소년과 전문의를 구분해서 내려준다.
 *
 * ① 심평원 목록은 Supabase에서 읽는다 (없으면 직접 호출로 대체) — Tmap 호출 0회
 * ② bounding box + 직선거리로 반경 60km 내 가까운 8개 + 전문의 병원 최대 3개를 더한다
 * ③ 위치를 격자로 스냅해 캐시가 있으면 그대로 쓴다(Supabase 있으면 DB, 없으면 서버 메모리)
 * ④ 캐시에 없는 후보만 Tmap 병렬 호출
 */
import { NextRequest, NextResponse } from 'next/server';
import { getRoute } from '@/lib/tmap';
import { fetchAround } from '@/lib/hira';
import { supabaseServer, type ClinicRow } from '@/lib/supabase';
import { CANDIDATES, RADIUS_KM, CACHE_SEC, haversineKm, toGridKey, boundingBox } from '@/lib/geo';
import { gradeByRank, delayRatio } from '@/lib/grade';
import {
  isPediatricSpecialistInstitution,
  isLikelyPediatricSpecialistCandidate,
  isRelevantForPediatricCare,
} from '@/lib/pediatricSpecialist';
import { fetchPediatricSpecialistCount } from '@/lib/hiraDeptSpecialist';
import type { Clinic, NearbyResponse } from '@/lib/types';
import demoFixtures from '@/lib/demoFixtures.json';

const SPECIALIST_CANDIDATES = 3; // 거리순 8개 안에 전문의 병원이 없을 수 있어 추가로 확보
const GENERAL_CANDIDATES = 10; // "소아 진료 가능" 필터 목록이 최소 이 수만큼은 나오도록 확보
const FALLBACK_KMH = 45; // Tmap이 죽었을 때 직선거리를 시간으로 환산하는 가정 속도

// Supabase가 아직 설정되지 않았을 때를 위한 인메모리 폴백 캐시 (같은 서버 인스턴스 안에서만 유효)
const memCache = new Map<string, { totalTime: number; totalDist: number; ts: number }>();

async function loadBaseClinics(lat: number, lng: number): Promise<ClinicRow[]> {
  const supabase = supabaseServer();

  if (supabase) {
    // bounding box로 먼저 좁혀서 DB가 커져도 매 요청 전체 스캔을 피한다
    const box = boundingBox({ lat, lng }, RADIUS_KM);
    const { data, error } = await supabase
      .from('clinics')
      .select('id, name, sido, sigungu, addr, tel, lat, lng, cl_name, specialist_doctor_count')
      .gte('lat', box.minLat)
      .lte('lat', box.maxLat)
      .gte('lng', box.minLng)
      .lte('lng', box.maxLng);
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

async function writeCache(grid: string, clinicId: string, totalTime: number, totalDist: number) {
  const supabase = supabaseServer();
  if (supabase) {
    await supabase
      .from('traffic_cache')
      .upsert(
        {
          grid_key: grid,
          clinic_id: clinicId,
          total_time: totalTime,
          total_dist: totalDist,
          // created_at은 insert에만 default now()가 적용되고, 이미 있는 행을 upsert로
          // 갱신할 땐 명시적으로 안 넣으면 안 바뀐다 — "신선도" 체크가 영원히 오래됨으로
          // 판정돼서 매번 Tmap을 다시 부르게 되는 버그가 있었다. 매번 명시적으로 갱신한다.
          created_at: new Date().toISOString(),
        },
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
 * 무슨 일이 있어도 500을 던지지 않는다 — 실패하면 200 + 빈 배열/추정치.
 */
export async function GET(req: NextRequest) {
  const latParam = req.nextUrl.searchParams.get('lat');
  const lngParam = req.nextUrl.searchParams.get('lng');

  // Number(null) === 0 이라 누락된 것과 진짜 0,0을 구분하려면 null 체크를 먼저 해야 한다
  if (latParam === null || lngParam === null) {
    return empty('lat, lng 파라미터가 필요합니다.');
  }

  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return empty('lat, lng 값이 올바르지 않습니다.');
  }

  const grid = toGridKey(lat, lng);

  // 최후의 보험(CLAUDE.md §7) — DB/Tmap을 아예 건드리지 않고 미리 검증해둔 고정 응답을 낸다.
  if (process.env.DEMO_MODE === '1') {
    const fixture = (demoFixtures as Record<string, NearbyResponse>)[grid];
    if (fixture) return NextResponse.json<NearbyResponse>(fixture);
  }

  try {
    const base = await loadBaseClinics(lat, lng);

    const scored = base
      .map((c) => ({ ...c, distanceKm: haversineKm({ lat, lng }, { lat: c.lat, lng: c.lng }) }))
      .filter((c) => c.distanceKm <= RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearestOverall = scored.slice(0, CANDIDATES);
    // 거리순 후보 안에 전문의 병원이 없을 수 있어(일반의 GP 의원이 훨씬 많음),
    // "가장 가까운 소아 전문진료"가 항상 실제 이동시간을 갖도록 별도로 확보한다.
    const nearestSpecialists = scored
      .filter((c) => isLikelyPediatricSpecialistCandidate(c.cl_name ?? '', c.name))
      .slice(0, SPECIALIST_CANDIDATES);
    // 거리순 8개 중 정형외과·이비인후과 등 소아과와 무관한 곳이 섞여 있으면
    // "소아 진료 가능" 목록이 8개보다 훨씬 적게 남을 수 있어, 실제로 소아 진료가
    // 관련 있는 곳만 따로 더 넉넉히 확보한다.
    const nearestRelevant = scored
      .filter((c) => isRelevantForPediatricCare(c.cl_name ?? '', c.name))
      .slice(0, GENERAL_CANDIDATES);

    const merged = new Map<string, (typeof scored)[number]>();
    [...nearestOverall, ...nearestSpecialists, ...nearestRelevant].forEach((c) => merged.set(c.id, c));
    const withDistance = Array.from(merged.values());

    if (withDistance.length === 0) {
      return NextResponse.json<NearbyResponse>({
        items: [],
        gridKey: grid,
        cached: true,
        error: `반경 ${RADIUS_KM}km 내 소아과가 없습니다`,
      });
    }

    let allFromCache = true;

    const results = await Promise.all(
      withDistance.map(async (c) => {
        // 소아청소년과 전문의 정확한 인원수 — 이동시간 계산과 동시에 병렬로 조회한다.
        // 실패(null)하면 아래에서 기존 추정 로직으로 대체한다.
        const [hit, pediatricSpecialistCount] = await Promise.all([
          readCache(grid, c.id),
          fetchPediatricSpecialistCount(c.id),
        ]);

        if (hit) {
          return {
            clinic: c,
            totalTime: hit.totalTime,
            totalDist: hit.totalDist,
            estimated: false,
            pediatricSpecialistCount,
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
            pediatricSpecialistCount,
          };
        }

        // Tmap 실패 — 직선거리 ÷ 45km/h 로 추정
        return {
          clinic: c,
          totalTime: (c.distanceKm / FALLBACK_KMH) * 3600,
          totalDist: c.distanceKm * 1000,
          estimated: true,
          pediatricSpecialistCount,
        };
      })
    );

    const minutesList = results.map((r) => Math.max(1, Math.round(r.totalTime / 60)));
    const grades = gradeByRank(minutesList);

    const items: Clinic[] = results.map((r, i) => {
      // 실제 과목별 전문의 수(getDgsbjtInfo2.8)를 확인했으면 그게 정답이고,
      // 조회 실패(null)했을 때만 상호명/종별 추정 로직으로 대체한다.
      const hasPediatricSpecialist =
        r.pediatricSpecialistCount !== null
          ? r.pediatricSpecialistCount > 0
          : isPediatricSpecialistInstitution(
              r.clinic.cl_name ?? '',
              r.clinic.name,
              r.clinic.specialist_doctor_count ?? undefined
            );

      return {
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
      delay: r.estimated ? 1 : Math.round(delayRatio(r.totalTime, r.totalDist) * 100) / 100,
      grade: grades[i],
      estimated: r.estimated,
      // dgsbjtCd=11(소아청소년과)로 걸러진 후보지만, 정형외과·이비인후과 등 상호가
      // 소아과와 무관한 전문과목이면 이름만으론 "소아 진료 가능"으로 안 본다.
      // 단, 실제 전문의가 확인됐으면("한나여성의원"처럼 이름은 산부인과 계열이어도
      // 실측 데이터에 소아청소년과 전문의 1명이 있는 경우) 이름 추정보다 우선한다 —
      // 전문의가 있는데 "소아 진료 불가"로 나오면 앞뒤가 안 맞는다.
      acceptsPediatricPatients:
        isRelevantForPediatricCare(r.clinic.cl_name ?? '', r.clinic.name) || hasPediatricSpecialist,
      hasPediatricSpecialist,
      specialistDoctorCount: r.clinic.specialist_doctor_count ?? undefined,
      pediatricSpecialistCount: r.pediatricSpecialistCount ?? undefined,
      };
    });

    items.sort((a, b) => a.minutes - b.minutes);

    return NextResponse.json<NearbyResponse>({ items, gridKey: grid, cached: allFromCache });
  } catch {
    return empty('일시적으로 정보를 불러오지 못했습니다');
  }
}

function empty(error: string) {
  return NextResponse.json<NearbyResponse>({ items: [], gridKey: '', cached: false, error });
}
