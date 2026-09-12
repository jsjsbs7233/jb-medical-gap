import { NextRequest, NextResponse } from 'next/server';
import { fetchSevereIllnessAcceptance } from '@/lib/hiraEmergency';

/**
 * 시도 기준 중증질환자 수용 가능 응급의료기관 목록.
 * GET /api/emergency?sido=
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sido = searchParams.get('sido');

  if (!sido) {
    return NextResponse.json({ items: [], error: 'sido 파라미터가 필요합니다.' });
  }

  const items = await fetchSevereIllnessAcceptance(sido);
  return NextResponse.json({ items });
}
