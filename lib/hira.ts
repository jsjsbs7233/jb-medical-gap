/**
 * 건강보험심사평가원(HIRA) 병원정보서비스 연동.
 *
 * ⚠ 문서(CLAUDE.md)에는 "심평원 응답이 XML"이라고 되어 있지만, 실제로 발급받은 키로
 *   직접 호출해서 확인한 결과 `_type=json` 파라미터를 주면 JSON으로 바로 응답한다.
 *   그래서 fast-xml-parser는 쓰지 않는다. (package.json엔 남아있어도 무해함)
 *
 * ✅ dgsbjtCd(진료과목코드) = '11' = 소아청소년과. HIRA 공식 코드조회 페이지
 *   (opendata.hira.or.kr/op/opc/selectColumnDetailCode.do)에서 확인함.
 *   참고: 장수·진안처럼 소아청소년과 전문의가 없는 지역에서는 "가정의학과의원",
 *   "내과의원" 같은 이름의 병원도 이 필터에 걸려서 나온다 — 버그가 아니라, 그
 *   지역엔 소아 전문의 대신 일반의가 소아청소년과로도 등록해 진료하는 현실이
 *   그대로 반영된 것이다(이 프로젝트가 짚으려는 문제 그 자체).
 *   이 계정에서 getDgsbjtInfo/getDtlInfo는 "NO_OPENAPI_SERVICE_ERROR"로 막혀 있다
 *   (활용신청 미승인 추정) — 그래서 진료시간 정보는 애초에 못 쓰는데, 마침
 *   CLAUDE.md가 "진료시간 필터"는 구현 범위에서 뺐으니 문제 없다.
 *
 * ⚠ sidoCd/sgguCd는 표준 행정구역코드(11,26,...45)가 아니라 심평원 자체 코드다
 *   (예: 전북=350000). 이 프로젝트는 행정구역이 아니라 반경(xPos/yPos/radius)으로만
 *   검색하므로 사용하지 않는다 — 오히려 이게 "행정구역 무관 검색" 원칙에 더 맞다.
 *
 * ⚠ getDtlInfo(진료시간)가 막혀 있는 건 오히려 잘 됐다 — CLAUDE.md는애초에
 *   "진료시간 필터"를 구현하지 않는 것으로 정해뒀다.
 */

const BASE = 'http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList';

// 소아청소년과 진료과목코드. 위 경고 참고 — 확정 아님.
const PEDIATRIC_DEPT_CODE = '11';

export interface HiraClinic {
  ykiho: string;
  name: string;
  addr: string | null;
  tel: string | null;
  sido: string;
  sigungu: string;
  lat: number;
  lng: number;
  distanceM: number; // 심평원이 직접 계산해서 주는 직선거리(미터) — xPos/yPos/radius로 요청했을 때만 내려온다
}

// 항목이 1개면 배열이 아니고, 0개면 items 자체가 빈 문자열("")로 온다.
function normalizeItems(json: unknown): Record<string, unknown>[] {
  const body = (json as { response?: { body?: { items?: unknown } } })?.response?.body;
  const items = body?.items;
  if (!items || items === '') return [];
  const list = (items as { item?: unknown }).item;
  if (Array.isArray(list)) return list as Record<string, unknown>[];
  return list ? [list as Record<string, unknown>] : [];
}

/**
 * 좌표 기준 반경(미터) 내 소아청소년과 진료 가능 기관을 가져온다.
 * 실패해도 절대 throw하지 않는다 — 지금까지 모은 것만이라도(혹은 빈 배열) 반환한다.
 */
export async function fetchPediatricClinicsNearby(
  lat: number,
  lng: number,
  radiusM: number
): Promise<HiraClinic[]> {
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) return [];

  const collected: HiraClinic[] = [];
  const numOfRows = 500;
  const MAX_PAGES = 5; // 안전장치: 최대 2500건

  try {
    for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
      // ⚠ 인코딩키가 아니라 디코딩키를 URLSearchParams로 붙인다 (CLAUDE.md §4 함정 1)
      const qs = new URLSearchParams({
        serviceKey: key,
        pageNo: String(pageNo),
        numOfRows: String(numOfRows),
        _type: 'json',
        xPos: String(lng),
        yPos: String(lat),
        radius: String(Math.round(radiusM)),
        dgsbjtCd: PEDIATRIC_DEPT_CODE,
      });

      const res = await fetch(`${BASE}?${qs.toString()}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) break;

      const json = await res.json();
      const header = (json as { response?: { header?: { resultCode?: string } } })?.response
        ?.header;
      if (header?.resultCode !== '00') break;

      const items = normalizeItems(json);
      for (const it of items) {
        const xPos = it.XPos as number | undefined;
        const yPos = it.YPos as number | undefined;
        if (!xPos || !yPos) continue;
        collected.push({
          ykiho: String(it.ykiho ?? ''),
          name: String(it.yadmNm ?? ''),
          addr: (it.addr as string) ?? null,
          tel: (it.telno as string) ?? null,
          sido: (it.sidoCdNm as string) ?? '',
          sigungu: (it.sgguCdNm as string) ?? '',
          lat: Number(yPos),
          lng: Number(xPos),
          distanceM: Number(it.distance ?? 0),
        });
      }

      const body = (json as { response?: { body?: { totalCount?: number } } })?.response?.body;
      const total = body?.totalCount ?? 0;
      if (pageNo * numOfRows >= total) break;
    }
  } catch {
    // 네트워크/타임아웃 실패 — 지금까지 모은 것만이라도 반환하고 화면은 계속 돈다
  }

  return collected;
}
