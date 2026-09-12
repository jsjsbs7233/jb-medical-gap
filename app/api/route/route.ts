import { NextRequest, NextResponse } from 'next/server';
import { getRoute } from '@/lib/tmap';
import type { RouteResponse } from '@/lib/types';

/**
 * 선택 병원까지의 경로 폴리라인.
 * GET /api/route?sx=&sy=&ex=&ey=  (sx/sy 출발 경도/위도, ex/ey 도착 경도/위도)
 * 실패해도 200 + 직선 경로로 대체 (화면을 죽이지 않는다).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sx = Number(searchParams.get('sx'));
  const sy = Number(searchParams.get('sy'));
  const ex = Number(searchParams.get('ex'));
  const ey = Number(searchParams.get('ey'));

  if ([sx, sy, ex, ey].some((v) => Number.isNaN(v))) {
    return NextResponse.json<RouteResponse>({
      path: [],
      minutes: 0,
      error: 'sx, sy, ex, ey 파라미터가 필요합니다.',
    });
  }

  const result = await getRoute({ lat: sy, lng: sx }, { lat: ey, lng: ex }, true);

  if (!result) {
    return NextResponse.json<RouteResponse>({
      path: [
        [sx, sy],
        [ex, ey],
      ],
      minutes: 0,
      error: '실시간 경로를 불러오지 못해 직선으로 대체했습니다.',
    });
  }

  return NextResponse.json<RouteResponse>({
    path: result.path && result.path.length > 0 ? result.path : [[sx, sy], [ex, ey]],
    minutes: Math.round(result.totalTime / 60),
  });
}
