// "가까운 소아 진료" / "가장 가까운 소아 전문진료" 두 트랙 추천 UI 전용 타입.
//
// ⚠ lib/types.ts 의 Clinic (팀 공용 계약, §3)과는 별개의 타입이다 — 지금은
//   프론트 UI 프로토타입 단계라 mock 데이터로만 채운다. 나중에 이 필드들을
//   실제 데이터로 연결하려면 /api/nearby의 응답(Clinic)에 acceptsPediatricPatients
//   / hasPediatricSpecialist 등을 추가해야 하는데, 그건 공용 계약을 바꾸는 일이라
//   팀에 먼저 공유하고 lib/types.ts를 다 같이 고쳐야 한다 (임의로 건드리지 않았음).
//
// acceptsPediatricPatients(소아 환자 진료 가능)와 hasPediatricSpecialist
// (소아청소년과 전문의 보유)는 절대 같은 의미가 아니다 — 이 프로젝트가 원래
// 짚으려던 문제(전문의 없는 지역은 일반의가 소아 진료를 대신한다)가 바로 이 둘의
// 차이에서 나온다.
export interface HospitalCareInfo {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  region: string;
  address: string;

  travelTime: number; // 분
  distance: number; // km

  isOpen: boolean;
  closeTime: string | null;

  acceptsPediatricPatients: boolean; // 소아 환자 진료 가능
  hasPediatricSpecialist: boolean; // 소아청소년과 전문의 보유

  isNightClinic: boolean;
  isHolidayClinic: boolean;

  recommendationReason: string | null;
}

export type CareFilter = 'all' | 'general' | 'specialist';
