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
