import { NextRequest, NextResponse } from 'next/server';
import { fetchEquipmentInfo } from '@/lib/hiraEquipment';
import { resolveYkihoByName } from '@/lib/hiraLookup';

/**
 * 특정 병원의 보유 의료장비 목록.
 * GET /api/equipment?ykiho=&name=
 *
 * /api/nearby와 달리 목록 전체가 아니라 "상세보기"를 눌렀을 때 그 병원 1곳만
 * 조회한다 — 아직 주소가 검증 안 된 API라 실패해도 빈 배열만 돌아온다.
 *
 * 응급실 목록(국립중앙의료원 hpid 기준)에서 열린 팝업은 ykiho 자리에 hpid가
 * 들어오는데, 이걸로는 장비 API가 항상 빈 결과만 준다. 그럴 때 name으로
 * 심평원 ykiho를 역으로 찾아 재조회한다.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ykiho = searchParams.get('ykiho');
  const name = searchParams.get('name');

  if (!ykiho) {
    return NextResponse.json({ items: [], error: 'ykiho 파라미터가 필요합니다.' });
  }

  const items = await fetchEquipmentInfo(ykiho);
  if (items.length > 0 || !name) {
    return NextResponse.json({ items });
  }

  const resolvedYkiho = await resolveYkihoByName(name);
  if (!resolvedYkiho || resolvedYkiho === ykiho) {
    return NextResponse.json({ items });
  }

  const retried = await fetchEquipmentInfo(resolvedYkiho);
  return NextResponse.json({ items: retried });
}
