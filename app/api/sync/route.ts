import { NextResponse } from 'next/server';
import { fetchAround, type RawClinic } from '@/lib/hira';
import { supabaseServer } from '@/lib/supabase';

export const maxDuration = 120; // 중심점 19개로 늘어나서 여유 있게 잡는다

const CHUNK_SIZE = 500; // 한 번에 다 넣지 않고 잘라서 upsert (C님 개선점)

/** 전북 + 인접 권역을 덮는 중심점들. 경계를 넘는 게 이 프로젝트의 핵심이다 */
const CENTERS = [
  { name: '전주', lat: 35.8242, lng: 127.148 },
  { name: '군산', lat: 35.9676, lng: 126.737 },
  { name: '익산', lat: 35.9483, lng: 126.9576 },
  { name: '정읍', lat: 35.5699, lng: 126.856 },
  { name: '남원', lat: 35.4164, lng: 127.3905 },
  { name: '무주', lat: 36.0068, lng: 127.6608 },
  { name: '장수', lat: 35.6472, lng: 127.5213 },
  { name: '고창', lat: 35.4355, lng: 126.702 },
  { name: '논산', lat: 36.1872, lng: 127.0987 },
  { name: '금산', lat: 36.1089, lng: 127.488 },
  { name: '대전', lat: 36.3504, lng: 127.3845 },
  { name: '광주', lat: 35.1595, lng: 126.8526 },
  { name: '순천', lat: 34.9506, lng: 127.4872 },
  { name: '함양', lat: 35.5205, lng: 127.7250 },
  { name: '거창', lat: 35.6867, lng: 127.9095 },
  { name: '영동', lat: 36.1750, lng: 127.7764 },
  { name: '옥천', lat: 36.3064, lng: 127.5714 },
  { name: '담양', lat: 35.3211, lng: 126.9881 },
  { name: '장성', lat: 35.3018, lng: 126.7889 },
];

function toRow(c: RawClinic) {
  return {
    id: c.id,
    name: c.name,
    cl_name: c.clName || null, // "진짜 소아청소년과 전문의" 추정(lib/pediatricSpecialist.ts)에 필요
    sido: c.sido || null,
    sido_raw: c.sidoRaw || null,
    sigungu: c.sigungu || null,
    is_jeonbuk: c.isJeonbuk,
    addr: c.addr,
    tel: c.tel,
    lat: c.lat,
    lng: c.lng,
    specialist_doctor_count: c.specialistDoctorCount,
  };
}

/**
 * 심평원 → Supabase 적재. 개발 중 수동 호출용 (하루 1회).
 * POST /api/sync → { inserted: number } (CLAUDE.md §5 계약)
 */
export async function POST() {
  const seen = new Map<string, RawClinic>();
  const report: Record<string, number> = {};

  for (const c of CENTERS) {
    try {
      const list = await fetchAround(c);
      report[c.name] = list.length;
      list.forEach((x) => seen.set(x.id, x)); // ykiho로 자동 중복 제거
    } catch {
      report[c.name] = -1; // 실패해도 나머지는 계속
    }
  }

  const items = [...seen.values()];

  // 시도별로 몇 곳이 잡혔는지 — 경계를 넘었는지 여기서 확인한다
  const bySido: Record<string, number> = {};
  items.forEach((x) => {
    bySido[x.sido] = (bySido[x.sido] ?? 0) + 1;
  });

  if (items.length === 0) {
    return NextResponse.json({ inserted: 0, bySido, report, error: '심평원 응답이 비어 있습니다.' });
  }

  const supabase = supabaseServer();
  if (!supabase) {
    return NextResponse.json({
      inserted: 0,
      bySido,
      report,
      error: 'Supabase 환경변수가 설정되지 않았습니다.',
    });
  }

  // 500건씩 잘라서 upsert. 한 청크가 실패해도 나머지는 계속 넣고, 실패 원인은 남긴다.
  let inserted = 0;
  const errors: string[] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE).map(toRow);
    const { error } = await supabase.from('clinics').upsert(chunk, { onConflict: 'id' });

    if (error) {
      console.error(`[/api/sync] upsert 실패 (${i}~${i + chunk.length}):`, error.message);
      errors.push(error.message);
    } else {
      inserted += chunk.length;
    }
  }

  return NextResponse.json({ inserted, total: items.length, bySido, report, errors });
}
