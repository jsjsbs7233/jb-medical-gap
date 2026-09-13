// "가까운 소아 진료" / "가장 가까운 소아 전문진료" 두 트랙 추천 UI 전용 타입.
//
// ⚠ lib/types.ts 의 Clinic (팀 공용 계약, §3)과는 별개의 타입이지만, 지금은 실제
//   /api/nearby 데이터를 lib/careAdapt.ts가 이 타입으로 변환해서 채운다 (실패
//   시에만 lib/careMock.ts 목업으로 대체).
//
// acceptsPediatricPatients(소아 환자 진료 가능)와 hasPediatricSpecialist
// (소아청소년과 전문의 보유)는 절대 같은 의미가 아니다 — 이 프로젝트가 원래
// 짚으려던 문제(전문의 없는 지역은 일반의가 소아 진료를 대신한다)가 바로 이 둘의
// 차이에서 나온다.
import type { Grade } from './types';

export interface HospitalCareInfo {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  region: string;
  address: string;
  tel?: string | null;

  travelTime: number; // 분
  distance: number; // km

  // 실시간 교통 기반 등급 — lib/types.ts의 Clinic.grade/delay와 같은 값(Tmap
  // trafficInfo:'Y'로 계산). 지도 마커 색이 이 값을 따른다(빠름=초록/보통=주황/느림=빨강).
  grade: Grade;
  delay: number; // 지연율. 1.0=원활, 1.5=평소의 1.5배

  // mock 데이터 전용(선택 필드) — 값이 있을 때만 카드에 뱃지를 그린다.
  isOpen?: boolean;
  closeTime?: string | null;

  // "지금 진료중만" 토글용 실측치(getDtlInfo2.8, §1 예외로 팀 합의). 'unknown'은
  // 이 병원의 진료시간 정보 자체가 없다는 뜻 — 휴진이 아니라 확인 불가라서, 토글을
  // 켜도 목록에서 빼지 않고 "전화로 문의해주세요" 안내로 대체한다.
  openStatus?: 'open' | 'closed' | 'unknown';

  acceptsPediatricPatients: boolean; // 소아 환자 진료 가능
  hasPediatricSpecialist: boolean; // 소아청소년과 전문의 보유

  // 병원 "전체"의 전문의 총원(과목 구분 없음, 심평원 mdeptSdrCnt). 값이 있을 때만 표시.
  specialistDoctorCount?: number;

  // 이 병원의 "소아청소년과" 전문의 정확한 인원수(getDgsbjtInfo2.8 실측치).
  // hasPediatricSpecialist를 판단하는 진짜 근거이기도 하다.
  pediatricSpecialistCount?: number;

  // 국립중앙의료원 응급의료기관 데이터(hpid 기준)와 병원명으로 매칭한 결과라
  // 완전히 정확하진 않다(다른 기관 ID 체계). 매칭 안 되면 undefined로 남는다.
  hasEmergencyRoom?: boolean;
  erAvailableBeds?: number; // 지금 바로 쓸 수 있는 응급실 병상 수 (음수=정원 초과)
  erUpdatedAt?: string | null; // 이 병상 정보가 언제 기준인지("YYYY-MM-DD HH:mm")

  isNightClinic: boolean;
  isHolidayClinic: boolean;

  recommendationReason: string | null;
}

export type CareFilter = 'general' | 'specialist' | 'emergency';
