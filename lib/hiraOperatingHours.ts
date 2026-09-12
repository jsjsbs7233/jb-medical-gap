// 건강보험심사평가원 "의료기관별상세정보서비스" — 요일별 진료시간(getDtlInfo2.8).
//
// ✅ 실제 호출로 검증 완료. https://apis.data.go.kr/B551182/MadmDtlInfoService2.8/getDtlInfo2.8
// DATA_GO_KR_DETAIL_KEY 사용 (getDgsbjtInfo2.8·getMedOftInfo2.8와 같은 API 상품).
//
// ⚠ 전체 병원이 이 상세정보를 갖고 있진 않다(의원급 일부는 totalCount:0으로 옴).
//   정보가 없으면 "휴진"이 아니라 "모름 = 열려있다고 간주"로 처리한다 — 데이터가
//   없다는 이유로 실제로 열려있는 병원을 화면에서 숨기면 안 되기 때문이다.

const BASE = 'https://apis.data.go.kr/B551182/MadmDtlInfoService2.8/getDtlInfo2.8';

export interface OperatingHours {
  trmtMonStart?: string; trmtMonEnd?: string | number;
  trmtTueStart?: string; trmtTueEnd?: string | number;
  trmtWedStart?: string; trmtWedEnd?: string | number;
  trmtThuStart?: string; trmtThuEnd?: string | number;
  trmtFriStart?: string; trmtFriEnd?: string | number;
  trmtSatStart?: string; trmtSatEnd?: string | number;
  trmtSunStart?: string; trmtSunEnd?: string | number;
}

const DAY_FIELDS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * 특정 병원(ykiho)의 요일별 진료시간을 가져온다.
 * 데이터가 없거나(커버리지 밖) 실패하면 null — 호출부는 null을 "모름"으로 다뤄야 한다.
 */
export async function fetchOperatingHours(ykiho: string): Promise<OperatingHours | null> {
  const key = process.env.DATA_GO_KR_DETAIL_KEY;
  if (!key) return null;

  try {
    const qs = new URLSearchParams({
      serviceKey: key,
      ykiho,
      pageNo: '1',
      numOfRows: '1',
      _type: 'json',
    });

    const res = await fetch(`${BASE}?${qs.toString()}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;

    const json = await res.json();
    const header = (json as { response?: { header?: { resultCode?: string } } })?.response?.header;
    if (header?.resultCode !== '00') return null;

    const items = (json as { response?: { body?: { items?: unknown } } })?.response?.body?.items;
    if (!items || items === '') return null; // 이 병원은 상세정보 자체가 없음

    const item = (items as { item?: unknown }).item;
    const row = Array.isArray(item) ? item[0] : item;
    return (row as OperatingHours) ?? null;
  } catch {
    return null;
  }
}

/** 지금(KST) 이 병원이 진료 중인지. 서버가 어떤 타임존에서 돌든 KST 기준으로 판정한다. */
function nowInKST(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

export type OpenStatus = 'open' | 'closed' | 'unknown';

/**
 * hours가 null(이 병원은 상세정보 자체가 없음 — 예: "함께하는내과의원")이면 'unknown'.
 * 있으면 오늘 요일의 trmt{Day}Start~End 범위로 실제 판정해서 'open'/'closed'를 준다.
 * 'unknown'을 "닫음"과 구분하는 이유 — 정보가 없다고 실제로 열려있는 병원을 화면에서
 * 숨기면 안 되지만, 확인도 안 됐는데 "진료 가능" 배지를 확정적으로 붙이면 안 되기 때문.
 */
export function getOpenStatus(hours: OperatingHours | null, now: Date = nowInKST()): OpenStatus {
  if (!hours) return 'unknown';

  const day = DAY_FIELDS[now.getUTCDay()];
  const start = hours[`trmt${day}Start` as keyof OperatingHours];
  const end = hours[`trmt${day}End` as keyof OperatingHours];
  if (start === undefined || end === undefined) return 'closed';

  const startNum = Number(start);
  const endNum = Number(end);
  if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) return 'unknown';

  const nowHHMM = now.getUTCHours() * 100 + now.getUTCMinutes();
  return nowHHMM >= startNum && nowHHMM < endNum ? 'open' : 'closed';
}
