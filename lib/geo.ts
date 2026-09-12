/**
 * 거리 계산과 격자 스냅.
 * "우리 서버 안의 판단"(C 담당) 중 후보 압축·캐시 키 생성에 쓰인다.
 */

// CLAUDE.md §3에 고정된 상수 — 임의로 바꾸지 않는다.
export const CANDIDATES = 8;     // Tmap을 부를 병원 수
export const RADIUS_KM = 60;     // 권역 경계를 넘기 위해 넉넉하게
export const CACHE_SEC = 180;    // 교통 캐시 3분
export const GRID = 0.01;        // 격자 크기 (약 1.1km)

const EARTH_RADIUS_KM = 6371;

/** 두 좌표 사이의 직선거리(km). 후보 압축용 1차 필터에 쓴다. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 위치를 1km 격자로 스냅해 캐시 키를 만든다.
 * 35.8234, 127.1456 → "3582_12715"
 * 같은 격자에서 요청하면 Tmap을 다시 부르지 않고 캐시를 그대로 쓴다.
 */
export function toGridKey(lat: number, lng: number): string {
  const latGrid = Math.round(lat / GRID);
  const lngGrid = Math.round(lng / GRID);
  return `${latGrid}_${lngGrid}`;
}
