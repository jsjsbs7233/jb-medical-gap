// Tmap 좌표→주소 변환(리버스 지오코딩). 사용자 위치를 위경도 숫자 대신
// "전북대학교"처럼 사람이 읽을 수 있는 이름으로 보여주기 위해 쓴다.
//
// ⚠ lib/tmap.ts(B 담당 — 경로안내 전용)와 일부러 분리했다. 같은 TMAP_APP_KEY를
//   쓰지만 완전히 다른 REST 엔드포인트라, 여기 두면 B님 파일과 충돌할 일이 없다.
//
// ✅ 실제 호출로 검증 완료 (35.845, 127.131 → buildingName: "전북대학교").

const BASE = 'https://apis.openapi.sk.com/tmap/geo/reversegeocoding';

interface AddressInfo {
  city_do?: string;
  gu_gun?: string;
  legalDong?: string;
  adminDong?: string;
  buildingName?: string;
}

/**
 * 좌표를 사람이 읽을 수 있는 위치 이름으로 바꾼다.
 * 건물 이름이 있으면 그걸 쓰고("전북대학교"), 없으면 "구/군 + 동" 정도로 대체한다.
 * 실패하면 null — 호출부가 좌표 숫자 등으로 대체해야 한다.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = process.env.TMAP_APP_KEY;
  if (!key) return null;

  try {
    const qs = new URLSearchParams({
      version: '1',
      lat: String(lat),
      lon: String(lng),
      coordType: 'WGS84GEO',
      addressType: 'A10',
    });

    const res = await fetch(`${BASE}?${qs.toString()}`, {
      headers: { appKey: key },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const info = (json as { addressInfo?: AddressInfo })?.addressInfo;
    if (!info) return null;

    if (info.buildingName) return info.buildingName;

    const dong = info.legalDong || info.adminDong;
    const parts = [info.gu_gun, dong].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');

    return info.city_do ?? null;
  } catch {
    return null;
  }
}
