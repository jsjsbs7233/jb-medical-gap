// 건강보험심사평가원 "의료기관별상세정보서비스" — 의료장비정보(getMedicalEquipmentInfoList).
//
// ⚠ 이 서비스는 병원정보서비스(lib/hira.ts, DATA_GO_KR_KEY)와는 다른 별도 API
//   상품이라 서비스키가 다르다(DATA_GO_KR_DETAIL_KEY). 오퍼레이션 이름은
//   opendata.hira.or.kr에서 확인했지만, 정확한 요청 경로(BASE)는 아직 실제로
//   검증하지 못했다 — 여러 후보로 테스트했는데 전부 NO_OPENAPI_SERVICE_ERROR였다.
//   data.go.kr 마이페이지의 "활용신청 상세 > OpenAPI 개발가이드"에 있는 실제
//   샘플 요청 URL을 보고 아래 BASE 상수만 맞는 값으로 고치면 된다.
//   (경로가 틀려도 이 함수는 절대 throw하지 않고 빈 배열을 반환한다 — 화면은
//   장비 정보 없이 계속 정상 동작한다.)
//
// ⚠ 응답 필드명(equmCd/equmNm/equmCnt)도 실제로 성공 응답을 받아본 적이 없어
//   추정치다. BASE를 고친 뒤 첫 호출 결과를 콘솔에 찍어서 반드시 확인할 것.

const BASE = 'https://apis.data.go.kr/B551182/MadmDtlInfoService2/getMedicalEquipmentInfoList';

export interface EquipmentInfo {
  code: string;
  name: string;
  count: number;
}

function getServiceKey(): string | null {
  const key = process.env.DATA_GO_KR_DETAIL_KEY;
  if (!key) return null;
  // 이미 퍼센트 인코딩된 키(%3D 등 포함)라면 그대로 쓰고, URLSearchParams에
  // 태우면 이중 인코딩(%3D -> %253D)되어 인증이 깨지므로 별도로 처리한다.
  return key;
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
  const key = getServiceKey();
  if (!key) return [];

  try {
    const otherParams = new URLSearchParams({
      pageNo: '1',
      numOfRows: '50',
      _type: 'json',
      ykiho,
    }).toString();

    const res = await fetch(`${BASE}?serviceKey=${key}&${otherParams}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const json = await res.json();
    const header = (json as { response?: { header?: { resultCode?: string } } })?.response?.header;
    if (header?.resultCode !== '00') return [];

    return normalizeItems(json).map((it) => ({
      code: String(it.equmCd ?? ''),
      name: String(it.equmNm ?? ''),
      count: Number(it.equmCnt ?? 0),
    }));
  } catch {
    return [];
  }
}
