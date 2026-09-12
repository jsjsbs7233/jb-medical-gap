/**
 * 공용 타입. CLAUDE.md §3에 고정된 계약이므로 임의로 바꾸지 않는다.
 * A/B/C 모두 이 파일을 참조한다.
 */

export type Grade = 'FAST' | 'NORMAL' | 'SLOW';

/** 지도에 찍히는 소아과 한 곳 */
export interface Clinic {
  id: string;            // 심평원 ykiho
  name: string;
  addr: string | null;
  tel: string | null;
  sido: string;          // '전북특별자치도' | '충청남도' | '광주광역시' …
  sigungu: string;
  lat: number;
  lng: number;
  minutes: number;       // 실시간 교통 반영 소요시간(분)
  distanceKm: number;    // 실제 주행거리
  delay: number;         // 지연율. 1.0=원활, 1.5=평소의 1.5배
  grade: Grade;
  estimated: boolean;    // true면 Tmap 실패로 직선거리 추정치
}

export interface NearbyResponse {
  items: Clinic[];       // 소요시간 오름차순
  gridKey: string;
  cached: boolean;
  error?: string;
}

export interface RouteResponse {
  path: [number, number][];  // [lng, lat][]
  minutes: number;
  error?: string;
}
