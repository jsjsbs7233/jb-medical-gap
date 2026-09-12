// /api/nearby가 주는 공용 Clinic[]을 두 트랙 추천 UI가 쓰는 HospitalCareInfo로 변환.
// 실제 심평원 데이터에는 진료시간 정보가 없어서 isOpen/closeTime은 비워둔다(선택 필드).

import type { Clinic } from './types';
import type { HospitalCareInfo } from './careTypes';

export function clinicToCareInfo(c: Clinic): HospitalCareInfo {
  return {
    id: c.id,
    name: c.name,
    latitude: c.lat,
    longitude: c.lng,
    region: [c.sido, c.sigungu].filter(Boolean).join(' '),
    address: c.addr ?? '',
    travelTime: c.minutes,
    distance: c.distanceKm,
    grade: c.grade,
    delay: c.delay,
    acceptsPediatricPatients: c.acceptsPediatricPatients ?? true,
    hasPediatricSpecialist: c.hasPediatricSpecialist ?? false,
    isNightClinic: false,
    isHolidayClinic: false,
    recommendationReason: null,
  };
}
