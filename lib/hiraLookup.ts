// 병원 상호명으로 심평원 ykiho를 찾는다.
//
// 응급실 목록(국립중앙의료원 hpid 기준)에서 "상세보기"를 눌렀을 때, 의료장비
// 정보 API(getMedOftInfo2.8)는 심평원 ykiho가 있어야 조회되는데 hpid로는
// 안 된다 — 같은 병원이라도 기관 ID 체계가 다르기 때문. 그래서 상호명으로
// 심평원 기본정보(hospInfoServicev2/getHospBasisList)를 검색해서 ykiho를 역으로
// 찾는다. DATA_GO_KR_KEY(심평원 병원정보서비스, /api/nearby와 같은 키) 사용.

const BASE = 'http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList';

function normalizeItems(json: unknown): Record<string, unknown>[] {
  const body = (json as { response?: { body?: { items?: unknown } } })?.response?.body;
  const items = body?.items;
  if (!items || items === '') return [];
  const list = (items as { item?: unknown }).item;
  if (Array.isArray(list)) return list as Record<string, unknown>[];
  return list ? [list as Record<string, unknown>] : [];
}

/**
 * 상호명으로 검색해서 정확히 일치하는(공백 제거 기준) 병원의 ykiho를 반환한다.
 * 못 찾거나 실패하면 null — 호출부는 장비 정보를 그냥 빈 배열로 둬야 한다.
 */
export async function resolveYkihoByName(name: string): Promise<string | null> {
  const key = process.env.DATA_GO_KR_KEY;
  if (!key || !name) return null;

  try {
    const qs = new URLSearchParams({
      serviceKey: key,
      yadmNm: name,
      pageNo: '1',
      numOfRows: '10',
      _type: 'json',
    });

    const res = await fetch(`${BASE}?${qs.toString()}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;

    const json = await res.json();
    const header = (json as { response?: { header?: { resultCode?: string } } })?.response?.header;
    if (header?.resultCode !== '00') return null;

    const target = name.replace(/\s+/g, '');
    const items = normalizeItems(json);
    const match = items.find((it) => String(it.yadmNm ?? '').replace(/\s+/g, '') === target);
    return match ? String(match.ykiho) : null;
  } catch {
    return null;
  }
}
