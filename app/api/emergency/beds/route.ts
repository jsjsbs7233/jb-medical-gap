import { NextRequest, NextResponse } from 'next/server';
import { fetchErRealtimeBeds } from '@/lib/hiraEmergency';

/**
 * 시도 기준 응급실 실시간 가용 병상 수.
 * GET /api/emergency/beds?sido=
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sido = searchParams.get('sido');

  if (!sido) {
    return NextResponse.json({ items: [], error: 'sido 파라미터가 필요합니다.' });
  }

  const items = await fetchErRealtimeBeds(sido);
  return NextResponse.json({ items });
}
