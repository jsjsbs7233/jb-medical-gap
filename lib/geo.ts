// CLAUDE.md §3 — haversine, 격자 스냅.

const GRID = 0.01; // 약 1.1km

/** 위치를 격자로 스냅한 캐시 키. 35.8234,127.1456 -> "3582_12715" */
export function gridKey(lat: number, lng: number): string {
  const gLat = Math.round(lat / GRID);
  const gLng = Math.round(lng / GRID);
  return `${gLat}_${gLng}`;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
