import { NextResponse } from 'next/server';
import { fetchPediatricClinicsNearby } from '@/lib/hira';
import { supabaseServer } from '@/lib/supabase';

// 전주를 중심으로 넉넉하게 적재 — 전북·충남·전남·광주·경남 경계까지 걸치도록.
// (실제 서비스 반경(RADIUS_KM=60)보다 넉넉해야 어느 위치에서 요청해도 DB에 후보가 있다)
const SYNC_CENTER = { lat: 35.8242, lng: 127.148 };
const SYNC_RADIUS_M = 100_000;

/**
 * 심평원 → Supabase 적재. 개발 중 수동 호출용 (하루 1회).
 * POST /api/sync
 */
export async function POST() {
  const supabase = supabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { inserted: 0, error: 'Supabase 환경변수가 설정되지 않았습니다.' },
      { status: 200 }
    );
  }

  try {
    const clinics = await fetchPediatricClinicsNearby(
      SYNC_CENTER.lat,
      SYNC_CENTER.lng,
      SYNC_RADIUS_M
    );

    if (clinics.length === 0) {
      return NextResponse.json({ inserted: 0, error: '심평원 응답이 비어 있습니다.' });
    }

    const rows = clinics.map((c) => ({
      id: c.ykiho,
      name: c.name,
      sido: c.sido || null,
      sigungu: c.sigungu || null,
      addr: c.addr,
      tel: c.tel,
      lat: c.lat,
      lng: c.lng,
    }));

    const { error } = await supabase.from('clinics').upsert(rows, { onConflict: 'id' });
    if (error) {
      return NextResponse.json({ inserted: 0, error: error.message });
    }

    return NextResponse.json({ inserted: rows.length });
  } catch (err) {
    return NextResponse.json({
      inserted: 0,
      error: err instanceof Error ? err.message : '알 수 없는 오류',
    });
  }
}
