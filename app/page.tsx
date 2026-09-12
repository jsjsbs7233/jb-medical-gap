'use client';

// 소아 진료 / 소아 전문진료 두 트랙 추천 UI — 실제 /api/nearby(+/api/route) 데이터 사용.
// 실패하거나 위치를 못 가져오면 lib/careMock.ts 목업으로 화면을 계속 채운다.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NearbyResponse, RouteResponse } from '@/lib/types';
import { FALLBACK_LOCATION } from '@/lib/mock';
import type { CareFilter, HospitalCareInfo } from '@/lib/careTypes';
import { MOCK_CARE_HOSPITALS } from '@/lib/careMock';
import {
  clinicToCareInfo,
  applyEmergencyInfo,
  erHospitalToCareInfo,
  enrichErWithPediatricInfo,
} from '@/lib/careAdapt';
import {
  filterByCareType,
  pickNearestAccepting,
  pickNearestSpecialist,
  sortForList,
} from '@/lib/careRecommend';
import CareMap from '@/components/care/CareMap';
import CareLegend from '@/components/care/CareLegend';
import RecommendationPanel from '@/components/care/RecommendationPanel';
import HospitalPopup from '@/components/care/HospitalPopup';

export default function Home() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitals, setHospitals] = useState<HospitalCareInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [filter, setFilter] = useState<CareFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [emergencyHospitals, setEmergencyHospitals] = useState<HospitalCareInfo[]>([]);
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  // 위치 권한 요청, 실패하면 전주 좌표로 폴백.
  // URL에 ?lat=&lng=가 있으면 GPS보다 우선한다 — 발표장에서 GPS를 켜면 발표장
  // 좌표가 잡혀 시연 좌표(순창 등)를 못 띄우는 문제 때문에 필요하다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const latParam = params.get('lat');
    const lngParam = params.get('lng');
    if (latParam !== null && lngParam !== null) {
      const lat = Number(latParam);
      const lng = Number(lngParam);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        queueMicrotask(() => setUserLocation({ lat, lng }));
        return;
      }
    }

    if (!('geolocation' in navigator)) {
      queueMicrotask(() => setUserLocation(FALLBACK_LOCATION));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation(FALLBACK_LOCATION),
      { timeout: 5000 }
    );
  }, []);

  // 현재 위치를 "전북대학교"처럼 사람이 읽을 수 있는 이름으로 바꾼다.
  // 실패하면 placeName이 null로 남고, 화면은 좌표 숫자로 대체해서 계속 정상 동작한다.
  useEffect(() => {
    if (!userLocation) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPlaceName(null);
    });

    fetch(`/api/reverse-geocode?lat=${userLocation.lat}&lng=${userLocation.lng}`)
      .then((res) => (res.ok ? res.json() : { label: null }))
      .then((data) => {
        if (!cancelled) setPlaceName(data.label ?? null);
      })
      .catch(() => {
        if (!cancelled) setPlaceName(null);
      });

    return () => {
      cancelled = true;
    };
  }, [userLocation]);

  // 주변 소아과 목록: /api/nearby 우선 시도, 실패하면 목업으로 화면을 계속 채운다
  useEffect(() => {
    if (!userLocation) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });

    fetch(`/api/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}`)
      .then((res) => (res.ok ? (res.json() as Promise<NearbyResponse>) : Promise.reject(res.status)))
      .then(async (data) => {
        if (cancelled) return;
        let list: HospitalCareInfo[];
        if (data.items.length === 0) {
          list = MOCK_CARE_HOSPITALS;
          setNotice(data.error ?? '반경 내 데이터가 없어 예시 데이터를 보여드립니다.');
        } else {
          list = data.items.map(clinicToCareInfo);
          if (data.error) setNotice(data.error);
        }

        // 응급실 실시간 가용 병상 — 목록에 걸쳐있는 시도를 전부 조회해서 병원명으로
        // 매칭한다 (전북만 보면 경남 함양 등 인접 지역 병원이 빠진다). 실패해도
        // 조용히 넘어간다(hasEmergencyRoom이 그냥 안 채워질 뿐).
        const sidoList = [...new Set(list.map((h) => h.region.split(' ')[0]).filter(Boolean))];
        if (sidoList.length > 0) {
          try {
            const results = await Promise.all(
              sidoList.map((sido) =>
                fetch(`/api/emergency/beds?sido=${encodeURIComponent(sido)}`)
                  .then((res) => (res.ok ? res.json() : { items: [] }))
                  .catch(() => ({ items: [] }))
              )
            );
            const erItems = results.flatMap((r) => r.items ?? []);
            if (!cancelled) list = applyEmergencyInfo(list, erItems);
          } catch {
            // 응급실 데이터 실패는 무시 — 나머지 화면은 그대로 정상 동작
          }
        }

        if (!cancelled) setHospitals(list);
      })
      .catch(() => {
        if (cancelled) return;
        setHospitals(MOCK_CARE_HOSPITALS);
        setNotice('실시간 데이터를 불러오지 못해 예시 데이터를 보여드립니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userLocation]);

  // "응급실" 필터를 켰을 때만 반경 100km 내 모든 응급실 운영 기관을 따로 불러온다.
  // 소아과 후보(hospitals)와 출처가 완전히 다른 별도 데이터셋이라 겹치지 않는다.
  useEffect(() => {
    if (!userLocation || filter !== 'emergency') return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setEmergencyLoading(true);
    });

    fetch(`/api/emergency/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radiusKm=30`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) setEmergencyHospitals((data.items ?? []).map(erHospitalToCareInfo));
      })
      .catch(() => {
        if (!cancelled) setEmergencyHospitals([]);
      })
      .finally(() => {
        if (!cancelled) setEmergencyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userLocation, filter]);

  const nearestGeneral = useMemo(() => pickNearestAccepting(hospitals), [hospitals]);
  const nearestSpecialist = useMemo(() => pickNearestSpecialist(hospitals), [hospitals]);
  // "응급실" 필터는 소아과 후보가 아니라 반경 내 전체 응급실 데이터를 쓴다.
  // 다만 같은 병원이 소아과 후보 목록에도 있으면(예: 진안군의료원) 그쪽의 실측
  // 소아청소년과 전문의 정보를 가져와 채운다 — 안 그러면 카드/목록에서 같은
  // 병원의 "전문의 있음/없음" 표시가 서로 어긋난다.
  const mapHospitals = useMemo(
    () =>
      filter === 'emergency'
        ? enrichErWithPediatricInfo(emergencyHospitals, hospitals)
        : filterByCareType(hospitals, filter),
    [hospitals, filter, emergencyHospitals]
  );
  // 목록은 지도 마커와 달리 "전문의 먼저, 그 안에서 시간순"으로 그룹 정렬한다.
  // (응급실 목록은 이미 거리순으로 와서 그대로 둔다 — 전문의 여부를 모르는 병원들이라
  // sortForList로 다시 묶으면 의미가 없다)
  const listHospitals = useMemo(
    () => (filter === 'emergency' ? mapHospitals : sortForList(mapHospitals)),
    [mapHospitals, filter]
  );
  // selectedId는 필터에 따라 hospitals(소아과 후보) 또는 mapHospitals(응급실
  // 전체, 소아과 정보 보강됨) 어느 쪽에서 왔을 수 있어서 둘 다 찾아본다.
  const selectedHospital =
    hospitals.find((h) => h.id === selectedId) ?? mapHospitals.find((h) => h.id === selectedId) ?? null;

  // 길찾기: /api/route 우선 시도, 실패하면 직선 경로로 대체
  const handleDirections = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (!userLocation) return;
      const hospital = hospitals.find((h) => h.id === id) ?? mapHospitals.find((h) => h.id === id);
      if (!hospital) return;

      fetch(
        `/api/route?sx=${userLocation.lng}&sy=${userLocation.lat}&ex=${hospital.longitude}&ey=${hospital.latitude}`
      )
        .then((res) => (res.ok ? (res.json() as Promise<RouteResponse>) : Promise.reject(res.status)))
        .then((data) => setRoutePath(data.path))
        .catch(() => {
          setRoutePath([
            [userLocation.lng, userLocation.lat],
            [hospital.longitude, hospital.latitude],
          ]);
        });
    },
    [userLocation, hospitals, mapHospitals]
  );

  const handleDetail = useCallback((id: string) => {
    setSelectedId(id);
    setRoutePath(null);
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedId(null);
  }, []);

  if (!userLocation) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-neutral-100 text-sm text-neutral-400">
        위치 확인 중...
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <CareMap
        userLocation={userLocation}
        hospitals={mapHospitals}
        selectedId={selectedId}
        recommendedGeneralId={nearestGeneral?.id ?? null}
        recommendedSpecialistId={nearestSpecialist?.id ?? null}
        routePath={routePath}
        onSelect={(id) => {
          setSelectedId(id);
          setRoutePath(null);
        }}
      />

      <RecommendationPanel
        locationLabel={
          loading
            ? '위치 확인 중...'
            : (placeName ?? `현재 위치 (${userLocation.lat.toFixed(3)}, ${userLocation.lng.toFixed(3)})`)
        }
        filter={filter}
        onFilterChange={setFilter}
        nearestSpecialist={nearestSpecialist}
        hospitals={listHospitals}
        selectedId={selectedId}
        onDetail={handleDetail}
        onDirections={handleDirections}
        mobileExpanded={mobileExpanded}
        onToggleMobile={() => setMobileExpanded((v) => !v)}
      />

      <div className="absolute bottom-6 left-4 z-20 hidden md:block">
        <CareLegend />
      </div>

      {!loading && (emergencyLoading ? true : !!notice) && (
        <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-neutral-900/85 px-4 py-2 text-xs text-white shadow-lg md:bottom-3">
          {emergencyLoading ? '반경 30km 내 응급실을 불러오는 중...' : notice}
        </div>
      )}

      {selectedHospital && !routePath && (
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
