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
const BEDS_BASE = 'https://apis.data.go.kr/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire';
const LIST_BASE = 'https://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytListInfoInqire';

export interface ErHospital {
  hpid: string;
  name: string; // dutyName
  addr: string | null; // dutyAddr
  sido: string; // addr 첫 토큰
  tel: string | null; // dutyTel1
  lat: number;
  lng: number;
}

export interface SevereIllnessAcceptance {
  name: string; // dutyName
  hpid: string;
  // MKioskTy1~28 원본 그대로. 값은 보통 'Y'(가능) / '불가능' / '정보미제공' 중 하나.
  capabilities: Record<string, string>;
}

export interface ErBedStatus {
  name: string; // dutyName
  hpid: string;
  availableBeds: number; // hvec — 응급실 가용 병상수. 음수면 정원 초과(대기)로 해석됨
  updatedAt: string | null; // hvidate(YYYYMMDDHHMMSS)를 ISO 비슷한 문자열로 변환
}

// "응급실" 필터에서 반경 내 모든 응급실을 보여줄 때 쓰는 응답 항목 —
// 소아과 후보 목록(Clinic)과는 별개로, ErHospital + ErBedStatus를 합친 모양이다.
export interface NearbyErHospital {
  id: string; // hpid
  name: string;
  addr: string | null;
  sido: string;
  tel: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
  minutes: number; // 추정치(직선거리 ÷ 45km/h) — 실시간 교통 아님
  hasEmergencyRoom: true;
  erAvailableBeds?: number;
  erUpdatedAt?: string | null;
}

function parseHvidate(raw: unknown): string | null {
  const s = String(raw ?? '');
  if (!/^\d{14}$/.test(s)) return null;
  const y = s.slice(0, 4);
  const mo = s.slice(4, 6);
  const d = s.slice(6, 8);
  const h = s.slice(8, 10);
  const mi = s.slice(10, 12);
  return `${y}-${mo}-${d} ${h}:${mi}`;
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

/**
 * 전국 응급실 운영 기관 목록(좌표 포함)을 한 번에 가져온다. STAGE1(시도) 파라미터를
 * 이 오퍼레이션은 무시하고 항상 전국 목록(총 500여 곳)을 주기 때문에, 지역은 우리가
 * 좌표로 직접 걸러야 한다 — "응급실" 필터에서 "반경 Nkm 내 모든 응급실"을 보여줄 때 쓴다.
 * 실패해도 절대 throw하지 않는다 — 빈 배열을 반환한다.
 */
export async function fetchAllErHospitals(): Promise<ErHospital[]> {
  const key = process.env.DATA_GO_KR_ERMCT_KEY;
  if (!key) return [];

  try {
    const qs = new URLSearchParams({
      serviceKey: key,
      pageNo: '1',
      numOfRows: '1000',
      _type: 'json',
    });

    const res = await fetch(`${LIST_BASE}?${qs.toString()}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];

    const json = await res.json();
    const header = (json as { response?: { header?: { resultCode?: string } } })?.response?.header;
    if (header?.resultCode !== '00') return [];

    return normalizeItems(json)
      .filter((it) => it.wgs84Lat !== undefined && it.wgs84Lon !== undefined)
      .map((it) => {
        const addr = it.dutyAddr ? String(it.dutyAddr) : null;
        return {
          hpid: String(it.hpid ?? ''),
          name: String(it.dutyName ?? ''),
          addr,
          sido: addr?.trim().split(/\s+/)[0] ?? '',
          tel: it.dutyTel1 ? String(it.dutyTel1) : null,
          lat: Number(it.wgs84Lat),
          lng: Number(it.wgs84Lon),
        };
      });
  } catch {
    return [];
  }
}

/**
 * 시도 기준 응급실 실시간 가용 병상 수를 가져온다 (hvec 필드).
 * ⚠ hvec 하나만 신뢰해서 쓴다 — hvs01~hvs61 등 세부 병상 코드는 공식 코드표를
 *   못 구해서 화면에 노출하지 않는다. "총 병상수" 짝 필드가 이 응답에 없어서
 *   "총원 대비 현재 수용"은 못 보여주고, "지금 바로 쓸 수 있는 병상 수"만 보여준다.
 * 실패해도 절대 throw하지 않는다 — 빈 배열을 반환하고 화면은 계속 정상 동작한다.
 */
export async function fetchErRealtimeBeds(sido: string): Promise<ErBedStatus[]> {
  const key = process.env.DATA_GO_KR_ERMCT_KEY;
  if (!key || !sido) return [];

  try {
    const qs = new URLSearchParams({
      serviceKey: key,
      STAGE1: sido,
      pageNo: '1',
      numOfRows: '100',
      _type: 'json',
    });

    const res = await fetch(`${BEDS_BASE}?${qs.toString()}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];

    const json = await res.json();
    const header = (json as { response?: { header?: { resultCode?: string } } })?.response?.header;
    if (header?.resultCode !== '00') return [];

    return normalizeItems(json)
      .filter((it) => it.hvec !== undefined)
      .map((it) => ({
        name: String(it.dutyName ?? ''),
        hpid: String(it.hpid ?? ''),
        availableBeds: Number(it.hvec ?? 0),
        updatedAt: parseHvidate(it.hvidate),
      }));
  } catch {
    return [];
  }
}
