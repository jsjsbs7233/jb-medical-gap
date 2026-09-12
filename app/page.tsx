'use client';

// 소아 진료 / 소아 전문진료 두 트랙 추천 UI — 지금은 mock 데이터로만 구현.
// (실제 /api/nearby 연동 화면은 app/live/page.tsx 로 옮겨뒀다. 나중에 이 화면에
// 실제 데이터를 연결하려면 lib/careTypes.ts의 필드를 /api/nearby 응답에 추가하는
// 작업이 필요한데, 그건 팀 공용 계약(lib/types.ts)을 바꾸는 일이라 먼저 공유해야 한다.)

import { useCallback, useMemo, useState } from 'react';
import type { CareFilter } from '@/lib/careTypes';
import { MOCK_CARE_HOSPITALS, MOCK_USER_LOCATION } from '@/lib/careMock';
import { filterByCareType, pickNearestAccepting, pickNearestSpecialist } from '@/lib/careRecommend';
import CareMap from '@/components/care/CareMap';
import CareLegend from '@/components/care/CareLegend';
import RecommendationPanel from '@/components/care/RecommendationPanel';
import HospitalPopup from '@/components/care/HospitalPopup';

export default function Home() {
  const [filter, setFilter] = useState<CareFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeTargetId, setRouteTargetId] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState(true);

  const nearestGeneral = useMemo(() => pickNearestAccepting(MOCK_CARE_HOSPITALS), []);
  const nearestSpecialist = useMemo(() => pickNearestSpecialist(MOCK_CARE_HOSPITALS), []);
  const mapHospitals = useMemo(() => filterByCareType(MOCK_CARE_HOSPITALS, filter), [filter]);

  const selectedHospital = MOCK_CARE_HOSPITALS.find((h) => h.id === selectedId) ?? null;
  const routeTarget = MOCK_CARE_HOSPITALS.find((h) => h.id === routeTargetId) ?? null;

  const handleDetail = useCallback((id: string) => {
    setSelectedId(id);
    setRouteTargetId(null);
  }, []);

  const handleDirections = useCallback((id: string) => {
    setSelectedId(id);
    setRouteTargetId(id);
  }, []);

  const handleClosePopup = useCallback(() => setSelectedId(null), []);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <CareMap
        userLocation={{ lat: MOCK_USER_LOCATION.lat, lng: MOCK_USER_LOCATION.lng }}
        hospitals={mapHospitals}
        selectedId={selectedId}
        recommendedGeneralId={nearestGeneral?.id ?? null}
        recommendedSpecialistId={nearestSpecialist?.id ?? null}
        routeTarget={routeTarget}
        onSelect={(id) => {
          setSelectedId(id);
          setRouteTargetId(null);
        }}
      />

      <RecommendationPanel
        locationLabel={MOCK_USER_LOCATION.label}
        filter={filter}
        onFilterChange={setFilter}
        nearestGeneral={nearestGeneral}
        nearestSpecialist={nearestSpecialist}
        onDetail={handleDetail}
        onDirections={handleDirections}
        mobileExpanded={mobileExpanded}
        onToggleMobile={() => setMobileExpanded((v) => !v)}
      />

      <div className="absolute bottom-6 left-4 z-20 hidden md:block">
        <CareLegend />
      </div>

      {selectedHospital && !routeTarget && (
        <div className="absolute bottom-28 left-1/2 z-30 -translate-x-1/2 md:bottom-6 md:left-[27rem] md:translate-x-0">
          <HospitalPopup
            hospital={selectedHospital}
            onClose={handleClosePopup}
            onDetail={handleDetail}
            onDirections={handleDirections}
          />
        </div>
      )}
    </div>
  );
}
