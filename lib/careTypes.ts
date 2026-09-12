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

  travelTime: number; // 분
  distance: number; // km

  // 실시간 교통 기반 등급 — lib/types.ts의 Clinic.grade/delay와 같은 값(Tmap
  // trafficInfo:'Y'로 계산). 지도 마커 색이 이 값을 따른다(빠름=초록/보통=주황/느림=빨강).
  grade: Grade;
  delay: number; // 지연율. 1.0=원활, 1.5=평소의 1.5배

  // 실제 심평원 데이터로는 진료시간을 알 수 없다(상세 API 미승인 + CLAUDE.md도
  // "진료시간 필터"는 범위에서 제외). 그래서 선택 필드로 두고, 값이 있을 때만
  // (주로 mock 데이터) 카드에 뱃지를 그린다.
  isOpen?: boolean;
  closeTime?: string | null;

  acceptsPediatricPatients: boolean; // 소아 환자 진료 가능
  hasPediatricSpecialist: boolean; // 소아청소년과 전문의 보유

  // 병원 "전체"의 전문의 총원(과목 구분 없음, 심평원 mdeptSdrCnt). 값이 있을 때만 표시.
  specialistDoctorCount?: number;

  isNightClinic: boolean;
  isHolidayClinic: boolean;

  recommendationReason: string | null;
}

export type CareFilter = 'all' | 'general' | 'specialist';
