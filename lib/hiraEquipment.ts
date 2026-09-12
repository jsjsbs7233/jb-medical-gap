// 건강보험심사평가원 "의료기관별상세정보서비스" — 의료장비정보(getMedOftInfo2.8).
//
// 이 서비스는 병원정보서비스(lib/hira.ts, DATA_GO_KR_KEY)와는 다른 별도 API
// 상품이라 서비스키가 다르다(DATA_GO_KR_DETAIL_KEY, 디코딩키).
//
// ✅ BASE/오퍼레이션 이름 모두 실제 호출로 검증 완료 (2026-09-13).
//   data.go.kr에 문서화된 이름(getMedicalEquipmentInfoList 등)과 실제 등록된
//   이름이 달랐다 — "MadmDtlInfoService2.8" / "getMedOftInfo2.8"가 진짜 이름이고,
//   끝의 ".8"은 오타가 아니라 실제 서비스/오퍼레이션 이름의 일부였다.
//   응답 필드도 문서 추정치(equmCd 등)가 아니라 실제로는 oftCd/oftCdNm/oftCnt였다.
const BASE = 'https://apis.data.go.kr/B551182/MadmDtlInfoService2.8/getMedOftInfo2.8';

export interface EquipmentInfo {
  code: string;
  name: string;
  count: number;
}

function normalizeItems(json: unknown): Record<string, unknown>[] {
  const body = (json as { response?: { body?: { items?: unknown } } })?.response?.body;
  const items = body?.items;
  if (!items || items === '') return [];
  const list = (items as { item?: unknown }).item;
  if (Array.isArray(list)) return list as Record<string, unknown>[];
  return list ? [list as Record<string, unknown>] : [];
}

/**
 * 특정 병원(ykiho)의 보유 의료장비 목록(장비명, 보유대수)을 가져온다.
 * 실패해도 절대 throw하지 않는다 — 빈 배열을 반환하고 화면은 계속 정상 동작한다.
 */
export async function fetchEquipmentInfo(ykiho: string): Promise<EquipmentInfo[]> {
  const key = process.env.DATA_GO_KR_DETAIL_KEY;
  if (!key) return [];

  try {
    const qs = new URLSearchParams({
      serviceKey: key,
      pageNo: '1',
      numOfRows: '50',
      _type: 'json',
      ykiho,
    });

    const res = await fetch(`${BASE}?${qs.toString()}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const json = await res.json();
    const header = (json as { response?: { header?: { resultCode?: string } } })?.response?.header;
    if (header?.resultCode !== '00') return [];

    return normalizeItems(json).map((it) => ({
      code: String(it.oftCd ?? ''),
      name: String(it.oftCdNm ?? ''),
      count: Number(it.oftCnt ?? 0),
    }));
  } catch {
    return [];
  }
}
