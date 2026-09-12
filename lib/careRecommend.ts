// 추천 로직 — UI 컴포넌트와 분리. 나중에 실제 데이터(HospitalCareInfo[])로
// 바꿔 끼워도 이 함수들은 그대로 쓸 수 있다.

import type { CareFilter, HospitalCareInfo } from './careTypes';

/** 소아 환자 진료가 가능한 곳 중 이동시간이 가장 짧은 곳 (전문의 여부 무관) */
export function pickNearestAccepting(hospitals: HospitalCareInfo[]): HospitalCareInfo | null {
  const candidates = hospitals.filter((h) => h.acceptsPediatricPatients);
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.travelTime - b.travelTime)[0];
}

/** 소아청소년과 전문의가 있는 곳 중 이동시간이 가장 짧은 곳 — 행정구역 제한 없음 */
export function pickNearestSpecialist(hospitals: HospitalCareInfo[]): HospitalCareInfo | null {
  const candidates = hospitals.filter((h) => h.hasPediatricSpecialist);
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.travelTime - b.travelTime)[0];
}

/** 지도 마커/목록 필터링 — "전체 / 소아 진료 가능 / 전문의 진료" */
export function filterByCareType(
  hospitals: HospitalCareInfo[],
  filter: CareFilter
): HospitalCareInfo[] {
  if (filter === 'general') return hospitals.filter((h) => h.acceptsPediatricPatients);
  if (filter === 'specialist') return hospitals.filter((h) => h.hasPediatricSpecialist);
  return hospitals;
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
    return a.travelTime - b.travelTime;
  });
}
