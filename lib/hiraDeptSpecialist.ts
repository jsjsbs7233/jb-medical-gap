// 건강보험심사평가원 "의료기관별상세정보서비스" — 진료과목별 전문의 수(getDgsbjtInfo2.8).
//
// 이게 나오기 전까지는(lib/pediatricSpecialist.ts) 병원 종별·상호명으로 "아마 전문의가
// 있을 것"이라고 추정만 했다. 이 API는 병원별로 진료과목마다 전문의가 정확히 몇 명인지
// 직접 알려준다 — 예를 들어 전북대학교병원은 dgsbjtCd=11(소아청소년과) 전문의 13명,
// 진안군의료원은 1명으로 실제 확인됨(진안군의료원은 병원 종별만 보고 "전문의 있음"으로
// 추정했던 게 우연히 맞았던 경우였다).
//
// ✅ base/operation 모두 실제 호출로 검증 완료.
//   https://apis.data.go.kr/B551182/MadmDtlInfoService2.8/getDgsbjtInfo2.8
// ✅ dgsbjtCd='11' = 소아청소년과인 것도 응답의 dgsbjtCdNm으로 직접 재확인함
//   (심평원 병원정보서비스 dgsbjtCd 필터와 코드가 같다).
//
// DATA_GO_KR_DETAIL_KEY 사용 — 병원정보서비스(DATA_GO_KR_KEY)와는 다른 API 상품.

const BASE = 'https://apis.data.go.kr/B551182/MadmDtlInfoService2.8/getDgsbjtInfo2.8';
const PEDIATRIC_DEPT_CODE = '11';

function normalizeItems(json: unknown): Record<string, unknown>[] {
  const body = (json as { response?: { body?: { items?: unknown } } })?.response?.body;
  const items = body?.items;
  if (!items || items === '') return [];
  const list = (items as { item?: unknown }).item;
  if (Array.isArray(list)) return list as Record<string, unknown>[];
  return list ? [list as Record<string, unknown>] : [];
}

/**
 * 특정 병원(ykiho)의 소아청소년과 전문의 정확한 인원수를 가져온다.
 * 몰라서 못 가져온 경우(키 없음, API 실패 등)엔 null을 반환한다 — 호출부가
 * null이면 lib/pediatricSpecialist.ts의 추정 로직으로 대체하도록 만들어져 있다.
 * 실패해도 절대 throw하지 않는다.
 */
export async function fetchPediatricSpecialistCount(ykiho: string): Promise<number | null> {
  const key = process.env.DATA_GO_KR_DETAIL_KEY;
  if (!key) return null;

  try {
    const qs = new URLSearchParams({
      serviceKey: key,
      ykiho,
      pageNo: '1',
      numOfRows: '50',
      _type: 'json',
    });

    const res = await fetch(`${BASE}?${qs.toString()}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;

    const json = await res.json();
    const header = (json as { response?: { header?: { resultCode?: string } } })?.response?.header;
    if (header?.resultCode !== '00') return null;

    const items = normalizeItems(json);
    const dept = items.find((it) => String(it.dgsbjtCd) === PEDIATRIC_DEPT_CODE);
    return dept ? Number(dept.dgsbjtPrSdrCnt ?? 0) : 0;
  } catch {
    return null;
  }
}
