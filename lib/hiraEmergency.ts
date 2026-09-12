// 국립중앙의료원(NEMC) "전국 응급의료기관 정보 조회 서비스" — 중증질환자 수용가능정보.
//
// ⚠ 심평원(B551182) 서비스들과는 완전히 다른 기관/API 상품이라 서비스키가 다르다
//   (DATA_GO_KR_ERMCT_KEY). 병원 식별자도 심평원 ykiho가 아니라 이 기관 고유의
//   hpid를 쓴다 — 우리 심평원 기반 병원 목록과 1:1로 안 이어진다. 그래서 이
//   API는 "특정 병원 하나"가 아니라 "지역(시도/시군구) 단위"로 조회한다.
//
// ✅ base/operation 모두 실제 호출로 검증 완료 (서울 강남구 예시로 성공 응답 확인).
//   https://apis.data.go.kr/B552657/ErmctInfoInqireService/getSrsillDissAceptncPosblInfoInqire
//
// ⚠ MKioskTy1~28 각각이 정확히 어떤 중증질환 항목인지는 아직 공식 코드표를
//   못 구해서 라벨을 못 붙였다 — 지금은 원본 값을 그대로 넘긴다. 나중에 코드표를
//   구하면 여기서 사람이 읽을 수 있는 이름으로 매핑해야 한다.
//
// ⚠ STAGE2(시군구)는 이 API가 기대하는 형식("전주시 덕진구", 띄어쓰기 포함)과
//   우리 심평원 기반 데이터의 sigungu 형식("전주덕진구", 붙여쓰기·"시" 없음)이
//   달라서 그대로 넘기면 조용히 0건이 나온다. 그래서 STAGE2는 아예 안 쓰고
//   STAGE1(시도)만으로 조회한다 — 전북 전체 기준 6건처럼 범위가 넓어도 다루기
//   좋은 수준이라 이 편이 더 안전하다.

const BASE = 'https://apis.data.go.kr/B552657/ErmctInfoInqireService/getSrsillDissAceptncPosblInfoInqire';

export interface SevereIllnessAcceptance {
  name: string; // dutyName
  hpid: string;
  // MKioskTy1~28 원본 그대로. 값은 보통 'Y'(가능) / '불가능' / '정보미제공' 중 하나.
  capabilities: Record<string, string>;
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
 * 시도 기준 중증질환자 수용 가능 응급의료기관 목록을 가져온다.
 * 실패해도 절대 throw하지 않는다 — 빈 배열을 반환하고 화면은 계속 정상 동작한다.
 */
export async function fetchSevereIllnessAcceptance(sido: string): Promise<SevereIllnessAcceptance[]> {
  const key = process.env.DATA_GO_KR_ERMCT_KEY;
  if (!key || !sido) return [];

  try {
    const qs = new URLSearchParams({
      serviceKey: key,
      STAGE1: sido,
      SM_TYPE: '1', // mkioskty(중증질환) Y(가능)한 병원 찾기
      pageNo: '1',
      numOfRows: '50',
      _type: 'json',
    });

    const res = await fetch(`${BASE}?${qs.toString()}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];

    const json = await res.json();
    const header = (json as { response?: { header?: { resultCode?: string } } })?.response?.header;
    if (header?.resultCode !== '00') return [];

    return normalizeItems(json).map((it) => {
      const capabilities: Record<string, string> = {};
      for (const [key2, value] of Object.entries(it)) {
        if (key2.startsWith('MKioskTy')) capabilities[key2] = String(value).trim();
      }
      return {
        name: String(it.dutyName ?? ''),
        hpid: String(it.hpid ?? ''),
        capabilities,
      };
    });
  } catch {
    return [];
  }
}
