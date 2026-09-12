// /api/nearby가 주는 공용 Clinic[]을 두 트랙 추천 UI가 쓰는 HospitalCareInfo로 변환.
// isOpen은 /api/nearby가 getDtlInfo2.8 요일별 진료시간으로 실측한 값이다(휴진인 곳은
// /api/nearby가 이미 걸러서 안 보내므로 여기 남아있는 건 true거나, 진료시간 정보 자체가
// 없어 "모름"인 undefined다). closeTime은 아직 실데이터로 안 채운다(선택 필드).

import type { Clinic } from './types';
import type { HospitalCareInfo } from './careTypes';
import type { ErBedStatus } from './hiraEmergency';

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
    specialistDoctorCount: c.specialistDoctorCount,
    pediatricSpecialistCount: c.pediatricSpecialistCount,
    isOpen: c.isOpen,
    isNightClinic: false,
    isHolidayClinic: false,
    recommendationReason: null,
  };
}

// 공백만 지우고 비교한다 — "재단법인 아산사회복지재단 정읍아산병원"처럼 기관마다
// 띄어쓰기가 다르게 등록된 경우가 있어서, 완전 일치보다 이게 더 잘 맞는다.
function normalizeName(name: string): string {
  return name.replace(/\s+/g, '');
}

/**
 * 국립중앙의료원 응급실 데이터(hpid 기준)를 병원명으로 우리 목록(ykiho 기준)에 매칭한다.
 * ⚠ 서로 다른 기관 ID 체계라 이름으로만 잇는 것이라 100% 정확하진 않다 — 매칭
 *   안 되는 병원은 hasEmergencyRoom이 그냥 undefined로 남는다(있는데 못 찾은 것과
 *   실제로 없는 것을 구분하지 않는다).
 */
export function applyEmergencyInfo(
  hospitals: HospitalCareInfo[],
  erList: ErBedStatus[]
): HospitalCareInfo[] {
  if (erList.length === 0) return hospitals;

  const byName = new Map(erList.map((er) => [normalizeName(er.name), er]));

  return hospitals.map((h) => {
    const match = byName.get(normalizeName(h.name));
    if (!match) return h;
    return {
      ...h,
      hasEmergencyRoom: true,
      erAvailableBeds: match.availableBeds,
      erUpdatedAt: match.updatedAt,
    };
  });
}
