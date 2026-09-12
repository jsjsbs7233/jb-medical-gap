/**
 * Tmap 자동차 경로안내 래퍼.
 * 여기가 우리 서버에서 Tmap으로 전화를 거는 유일한 곳이다.
 */
const TMAP_ROUTES = 'https://apis.openapi.sk.com/tmap/routes?version=1&format=json';

export interface RouteResult {
  totalTime: number;          // 소요시간 (초)
  totalDistance: number;      // 주행거리 (미터)
  totalFare: number;          // 통행료 (원)
  path?: [number, number][];  // 경로선 좌표 [경도, 위도][]
}

export async function getRoute(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number },
  withPath = false,            // 경로선까지 필요할 때만 true
): Promise<RouteResult | null> {
  try {
    const res = await fetch(TMAP_ROUTES, {
      method: 'POST',
      headers: {
        appKey: process.env.TMAP_APP_KEY!,   // 키는 서버 환경변수에서만 읽는다
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // ⚠️ X가 경도(lng), Y가 위도(lat). 헷갈리면 엉뚱한 곳으로 간다
        startX: from.lng, startY: from.lat,
        endX:   to.lng,   endY:   to.lat,
        startName: '출발', endName: '도착',
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
        searchOption: '0',      // 교통최적 + 추천
        trafficInfo:  'Y',      // ★ 실시간 교통 반영
      }),
      signal: AbortSignal.timeout(4000),   // 4초 넘으면 포기
    });

    if (!res.ok) return null;

    const json = await res.json();
    const p = json.features?.[0]?.properties;
    if (!p) return null;

    // 경로선이 필요하면 LineString 조각들을 순서대로 이어붙인다
    let path: [number, number][] | undefined;
    if (withPath) {
      path = json.features
        .filter((f: any) => f.geometry?.type === 'LineString')
        .flatMap((f: any) => f.geometry.coordinates as [number, number][]);
    }

    return {
      totalTime: p.totalTime,
      totalDistance: p.totalDistance,
      totalFare: p.totalFare ?? 0,
      path,
    };
  } catch {
    // 실패해도 절대 throw하지 않는다.
    // null을 받은 쪽에서 직선거리 추정치로 대체하고 앱은 계속 돈다.
    return null;
  }
}
