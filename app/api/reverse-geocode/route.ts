import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocode } from '@/lib/tmapGeocode';

/**
 * 좌표 → 사람이 읽을 수 있는 위치 이름.
 * GET /api/reverse-geocode?lat=&lng= → { label: string | null }
 * 실패해도 절대 500을 던지지 않는다 — label만 null로 내려주면 프론트가 좌표로 대체한다.
 */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ label: null });
  }

  const label = await reverseGeocode(lat, lng);
  return NextResponse.json({ label });
}
