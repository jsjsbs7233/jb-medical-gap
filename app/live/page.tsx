'use client';

// 실제 /api/nearby, /api/route 연동 화면. 팀의 CLAUDE.md §5 계약대로 동작한다.
// (이 프로젝트 루트 "/"는 지금 소아 진료/전문진료 두 트랙 UI 프로토타입(mock)을
// 보여주고 있어서, 실데이터 화면은 이 경로로 옮겨뒀다. 나중에 두 트랙 UI에
// 실제 데이터를 연결하면 이 페이지와 합치면 된다.)

import { useCallback, useEffect, useState } from 'react';
import type { Clinic, NearbyResponse, RouteResponse } from '@/lib/types';
import { MOCK_CLINICS, FALLBACK_LOCATION } from '@/lib/mock';
import HospitalMap from '@/components/HospitalMap';
import HospitalSheet from '@/components/HospitalSheet';
import Legend from '@/components/Legend';

export default function LivePage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null);

  useEffect(() => {
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

  useEffect(() => {
    if (!userLocation) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });

    fetch(`/api/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}`)
      .then((res) => (res.ok ? (res.json() as Promise<NearbyResponse>) : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return;
        setClinics(data.items);
        if (data.error) setNotice(data.error);
      })
      .catch(() => {
        if (cancelled) return;
        setClinics(MOCK_CLINICS);
        setNotice('실시간 데이터를 불러오지 못해 예시 데이터를 보여드립니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userLocation]);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (!userLocation) return;
      const clinic = clinics.find((c) => c.id === id);
      if (!clinic) return;

      fetch(`/api/route?sx=${userLocation.lng}&sy=${userLocation.lat}&ex=${clinic.lng}&ey=${clinic.lat}`)
        .then((res) => (res.ok ? (res.json() as Promise<RouteResponse>) : Promise.reject(res.status)))
        .then((data) => setRoutePath(data.path))
        .catch(() => {
          setRoutePath([
            [userLocation.lng, userLocation.lat],
            [clinic.lng, clinic.lat],
          ]);
        });
    },
    [userLocation, clinics]
  );

  const handleClose = useCallback(() => {
    setSelectedId(null);
    setRoutePath(null);
  }, []);

  const selectedClinic = clinics.find((c) => c.id === selectedId) ?? null;
  const isFastestOverall = clinics.length > 0 && clinics[0].id === selectedId;

  if (!userLocation) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-neutral-100 text-sm text-neutral-400">
        위치 확인 중...
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <HospitalMap
        userLocation={userLocation}
        clinics={clinics}
        selectedId={selectedId}
        routePath={routePath}
        onSelect={handleSelect}
      />

      <div className="absolute left-3 top-3 z-20">
        <Legend />
      </div>

      {loading && (
        <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs text-neutral-500 shadow-lg">
          주변 소아과를 찾는 중...
        </div>
      )}

      {!loading && clinics.length === 0 && (
        <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs text-neutral-500 shadow-lg">
          반경 60km 내 소아과가 없습니다.
        </div>
      )}

      {!loading && notice && (
        <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-neutral-900/85 px-4 py-2 text-xs text-white shadow-lg">
          {notice}
        </div>
      )}

      {selectedClinic && (
        <div className="absolute inset-x-0 bottom-0 z-30 md:bottom-4 md:left-4 md:right-auto md:w-96">
          <HospitalSheet
            clinic={selectedClinic}
            isFastestOverall={isFastestOverall}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
}
