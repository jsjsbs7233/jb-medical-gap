// 추천 로직 — UI 컴포넌트와 분리. 나중에 실제 데이터(HospitalCareInfo[])로
// 바꿔 끼워도 이 함수들은 그대로 쓸 수 있다.

import type { CareFilter, HospitalCareInfo } from './careTypes';

// 이동시간(분)은 반올림값이라 실제로는 다른 두 병원이 "3분"으로 같이 찍힐 수 있다.
// 그럴 때 정렬이 안정적이지 않으면(원래 배열 순서에 의존) 더 먼 곳이 뽑힐 수 있어서,
// 반올림 전이라 더 정밀한 직선거리(km)를 2차 기준으로 둔다.
function byTravelTimeThenDistance(a: HospitalCareInfo, b: HospitalCareInfo): number {
  return a.travelTime - b.travelTime || a.distance - b.distance;
}

/** 소아 환자 진료가 가능한 곳 중 이동시간이 가장 짧은 곳 (전문의 여부 무관) */
export function pickNearestAccepting(hospitals: HospitalCareInfo[]): HospitalCareInfo | null {
  const candidates = hospitals.filter((h) => h.acceptsPediatricPatients);
  if (candidates.length === 0) return null;
  return [...candidates].sort(byTravelTimeThenDistance)[0];
}

/** 소아청소년과 전문의가 있는 곳 중 이동시간이 가장 짧은 곳 — 행정구역 제한 없음 */
export function pickNearestSpecialist(hospitals: HospitalCareInfo[]): HospitalCareInfo | null {
  const candidates = hospitals.filter((h) => h.hasPediatricSpecialist);
  if (candidates.length === 0) return null;
  return [...candidates].sort(byTravelTimeThenDistance)[0];
}

/**
 * "전북 밖" 여부 — 이 프로젝트의 핵심 메시지("전북 밖이지만 전주보다 빠릅니다")를
 * 보여줄지 판단할 때 쓴다. region은 "시도 시군구" 형태라 앞부분만 본다.
 */
export function isOutsideJeonbuk(region: string): boolean {
  const sido = region.split(' ')[0] ?? '';
  return !sido.startsWith('전북') && !sido.startsWith('전라북도');
}

/** 지도 마커/목록 필터링 — "전체 / 소아 진료 가능 / 전문의 진료 / 응급실" */
export function filterByCareType(
  hospitals: HospitalCareInfo[],
  filter: CareFilter
): HospitalCareInfo[] {
  if (filter === 'general') return hospitals.filter((h) => h.acceptsPediatricPatients);
  if (filter === 'specialist') return hospitals.filter((h) => h.hasPediatricSpecialist);
  if (filter === 'emergency') return hospitals.filter((h) => h.hasEmergencyRoom);
  return hospitals;
}

/** "응급실" 필터일 때 좌측 패널 상단에 보여줄 합계 요약. */
export function summarizeEmergencyBeds(hospitals: HospitalCareInfo[]): {
  hospitalCount: number;
  totalAvailableBeds: number;
} {
  const withEr = hospitals.filter((h) => h.hasEmergencyRoom);
  const totalAvailableBeds = withEr.reduce((sum, h) => sum + Math.max(0, h.erAvailableBeds ?? 0), 0);
  return { hospitalCount: withEr.length, totalAvailableBeds };
}

/**
 * "주변 병원 목록" 정렬 — 이동시간 하나만으로 줄 세우면 일반의(가정의학과 등)가
 * 전문의보다 앞에 뜨는 게 이상해 보인다. 그래서 전문의 여부를 먼저 나누고,
 * 각 그룹 안에서만 이동시간 오름차순으로 정렬한다.
 *   1. 전문의 + 시간 짧은 순
 *   2. 전문의 + 시간 긴 순
 *   3. 일반의 + 시간 짧은 순
 *   4. 일반의 + 시간 긴 순
 */
export function sortForList(hospitals: HospitalCareInfo[]): HospitalCareInfo[] {
  return [...hospitals].sort((a, b) => {
    if (a.hasPediatricSpecialist !== b.hasPediatricSpecialist) {
      return a.hasPediatricSpecialist ? -1 : 1;
    }
    return byTravelTimeThenDistance(a, b);
  });
}
