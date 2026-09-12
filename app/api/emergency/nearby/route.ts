import { NextRequest, NextResponse } from 'next/server';
import { fetchAllErHospitals, fetchErRealtimeBeds, type NearbyErHospital } from '@/lib/hiraEmergency';
import { haversineKm } from '@/lib/geo';

const DEFAULT_RADIUS_KM = 30;
const FALLBACK_KMH = 45; // 실시간 경로 없이 직선거리로만 추정(Tmap 호출 안 함 — 최대 500여 곳이라 호출량이 너무 커짐)

/**
 * "응급실" 필터 전용 — 소아과 후보 목록과 무관하게, 반경 내 응급실 운영 기관을
 * 전부 보여준다. 500여 곳 전체에 실시간 경로(Tmap)를 부르면 한도가 바로 소진되니
 * 직선거리 추정 시간만 쓴다. 실패해도 200 + 빈 배열.
 */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));
  const radiusParam = Number(req.nextUrl.searchParams.get('radiusKm'));
  const radiusKm = Number.isFinite(radiusParam) && radiusParam > 0 ? radiusParam : DEFAULT_RADIUS_KM;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ items: [], error: 'lat, lng 파라미터가 필요합니다.' });
  }

  try {
    const all = await fetchAllErHospitals();

    const withinRadius = all
      .map((h) => ({ ...h, distanceKm: haversineKm({ lat, lng }, { lat: h.lat, lng: h.lng }) }))
      .filter((h) => h.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (withinRadius.length === 0) {
      return NextResponse.json({ items: [], error: `반경 ${radiusKm}km 내 응급실이 없습니다` });
    }

    const sidoList = [...new Set(withinRadius.map((h) => h.sido).filter(Boolean))];
    const bedLists = await Promise.all(sidoList.map((sido) => fetchErRealtimeBeds(sido)));
    const bedsByHpid = new Map(bedLists.flat().map((b) => [b.hpid, b]));

    const items: NearbyErHospital[] = withinRadius.map((h) => {
      const bed = bedsByHpid.get(h.hpid);
      return {
        id: h.hpid,
        name: h.name,
        addr: h.addr,
        sido: h.sido,
        tel: h.tel,
        lat: h.lat,
        lng: h.lng,
        distanceKm: Math.round(h.distanceKm * 10) / 10,
        minutes: Math.max(1, Math.round((h.distanceKm / FALLBACK_KMH) * 60)),
        hasEmergencyRoom: true,
        erAvailableBeds: bed?.availableBeds,
        erUpdatedAt: bed?.updatedAt,
      };
    });

    // 병상이 있는 곳을 먼저, 그다음 짧은 시간순으로 정렬한다 — 아무리 가까워도
    // 지금 받을 수 있는 병상이 0(또는 그 이하로 초과)이면 실제로는 못 가는
    // 병원이라 단순 거리순 위에 두면 안 된다. 병상 정보를 못 찾은 곳(매칭 실패)은
    // "없다"고 확정할 수 없으니 있음/없음 사이 중간 순위로 둔다.
    function bedTier(beds: number | undefined): number {
      if (beds === undefined) return 1; // 정보 없음 — 중간
      return beds > 0 ? 0 : 2; // 있음 — 최우선 / 0 이하(꽉 참) — 최하위
    }
    items.sort((a, b) => {
      const tierDiff = bedTier(a.erAvailableBeds) - bedTier(b.erAvailableBeds);
      if (tierDiff !== 0) return tierDiff;
      return a.distanceKm - b.distanceKm;
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [], error: '일시적으로 정보를 불러오지 못했습니다' });
  }
}
