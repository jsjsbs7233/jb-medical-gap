// 공용 타입. CLAUDE.md §3 계약 — 임의 변경 금지.
// 변경이 필요하면 코드를 고치지 말고 팀에 먼저 공유하세요.

export type Grade = 'FAST' | 'NORMAL' | 'SLOW';

/** 지도에 찍히는 소아과 한 곳 */
export interface Clinic {
  id: string; // 심평원 ykiho
  name: string;
  addr: string | null;
  tel: string | null;
  sido: string; // '전북특별자치도' | '충청남도' | '광주광역시' …
  sigungu: string;
  lat: number;
  lng: number;
  minutes: number; // 실시간 교통 반영 소요시간(분)
  distanceKm: number; // 실제 주행거리
  delay: number; // 지연율. 1.0=원활, 1.5=평소의 1.5배
  grade: Grade;
  estimated: boolean; // true면 Tmap 실패로 직선거리 추정치

  // 아래 두 필드는 선택 필드로 추가함(기존 필드는 그대로 — 다른 담당자 코드 안 깨짐).
  // acceptsPediatricPatients(소아 진료 가능)와 hasPediatricSpecialist(소아청소년과
  // 전문의)는 절대 같은 의미가 아니다. 지금 /api/nearby가 lib/hira.ts의 clName+병원명으로
  // 추정해서 채운다 (lib/pediatricSpecialist.ts 참고) — 심평원 상세 API 승인 전까지의 추정치.
  acceptsPediatricPatients?: boolean;
  hasPediatricSpecialist?: boolean;

  // 병원 "전체"의 전문의 총원(과목 구분 없음, 심평원 mdeptSdrCnt). 선택 필드.
  specialistDoctorCount?: number;

  // 이 병원의 "소아청소년과" 전문의 정확한 인원수(getDgsbjtInfo2.8로 확인된 실측치,
  // 위의 추정 로직보다 우선한다). 조회 실패 시에만 undefined로 남는다.
  pediatricSpecialistCount?: number;

  // 지금(KST) 진료 중인지(getDtlInfo2.8 요일별 진료시간 기준) — "지금 진료중만"
  // 토글용. 'unknown'은 이 병원의 진료시간 상세정보 자체가 없다는 뜻으로,
  // 휴진이 아니라 "확인 안 됨"이다(전화 문의 안내 문구로 이어짐).
  openStatus?: 'open' | 'closed' | 'unknown';
}

export interface NearbyResponse {
  items: Clinic[]; // 소요시간 오름차순
  gridKey: string;
  cached: boolean;
  error?: string;
}

export interface RouteResponse {
  path: [number, number][]; // [lng, lat][]
  minutes: number;
  error?: string;
}
