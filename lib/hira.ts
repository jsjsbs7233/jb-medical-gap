import { XMLParser } from 'fast-xml-parser';

const HIRA = 'http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList';
const PEDIATRICS = '11';                    // 소아청소년과 (검증 완료)
const parser = new XMLParser({ ignoreAttributes: true });

export interface RawClinic {
  id: string;        // ykiho (기관 고유번호)
  name: string;
  clName: string;    // 상급종합 / 종합병원 / 병원 / 의원
  sido: string;
  sigungu: string;
  addr: string | null;
  tel: string | null;
  lat: number;
  lng: number;
  specialistDoctorCount: number; // mdeptSdrCnt(의과 전문의 총원) — 병원 전체 기준, 과목별 구분 아님
}

/** 한 페이지 조회 */
async function fetchPage(center: { lat: number; lng: number }, radiusM: number, pageNo: number) {
  const qs = new URLSearchParams({
    serviceKey: process.env.DATA_GO_KR_KEY!,   // 디코딩키
    pageNo: String(pageNo),
    numOfRows: '100',
    xPos: String(center.lng),   // X = 경도
    yPos: String(center.lat),   // Y = 위도
    radius: String(radiusM),
    dgsbjtCd: PEDIATRICS,
  });

  const res = await fetch(`${HIRA}?${qs}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return { items: [] as RawClinic[], totalCount: 0 };

  const xml = await res.text();
  const json = parser.parse(xml);
  const body = json?.response?.body;

  // 항목이 1개면 배열이 아니라 객체로 온다
  const raw = body?.items?.item;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

  const items: RawClinic[] = list
    .filter((it: any) => it.XPos && it.YPos)   // 좌표 없는 기관은 지도에 못 찍는다
    .map((it: any) => ({
      id: String(it.ykiho),
      name: String(it.yadmNm),
      clName: String(it.clCdNm ?? ''),
      sido: String(it.sidoCdNm ?? ''),
      sigungu: String(it.sgguCdNm ?? ''),
      addr: it.addr ? String(it.addr) : null,
      tel: it.telno ? String(it.telno) : null,
      lng: Number(it.XPos),   // X = 경도
      lat: Number(it.YPos),   // Y = 위도
      specialistDoctorCount: Number(it.mdeptSdrCnt ?? 0),
    }));

  return { items, totalCount: Number(body?.totalCount ?? 0) };
}

/** 중심점 하나를 끝까지 페이징해서 다 가져온다 */
export async function fetchAround(center: { lat: number; lng: number }, radiusM = 25000) {
  const first = await fetchPage(center, radiusM, 1);
  const pages = Math.ceil(first.totalCount / 100);
  const out = [...first.items];

  for (let p = 2; p <= Math.min(pages, 20); p++) {
    const next = await fetchPage(center, radiusM, p);
    out.push(...next.items);
  }
  return out;
}
