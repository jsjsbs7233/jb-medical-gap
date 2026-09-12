import { NextRequest, NextResponse } from 'next/server';
import { fetchEquipmentInfo } from '@/lib/hiraEquipment';

/**
 * 특정 병원의 보유 의료장비 목록.
 * GET /api/equipment?ykiho=
 *
 * /api/nearby와 달리 목록 전체가 아니라 "상세보기"를 눌렀을 때 그 병원 1곳만
 * 조회한다 — 아직 주소가 검증 안 된 API라 실패해도 빈 배열만 돌아온다.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ykiho = searchParams.get('ykiho');

  if (!ykiho) {
    return NextResponse.json({ items: [], error: 'ykiho 파라미터가 필요합니다.' });
  }

  const items = await fetchEquipmentInfo(ykiho);
  return NextResponse.json({ items });
}
