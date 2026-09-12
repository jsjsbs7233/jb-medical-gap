'use client';

/* eslint-disable @typescript-eslint/no-explicit-any -- Tmap JS SDK(window.Tmapv2)는 공식 타입 정의가 없다 */

import { useEffect, useRef, useState } from 'react';
import type { HospitalCareInfo } from '@/lib/careTypes';
import { careMarkerIcon, userMarkerIcon, ROUTE_COLOR } from '../markerIcon';

declare global {
  interface Window {
    Tmapv2: any;
  }
}

function waitForTmap(timeoutMs = 8000): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.Tmapv2) {
      resolve(window.Tmapv2);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.Tmapv2) {
        clearInterval(timer);
        resolve(window.Tmapv2);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error('TMAP_LOAD_TIMEOUT'));
      }
    }, 50);
  });
}

interface Props {
  userLocation: { lat: number; lng: number };
  hospitals: HospitalCareInfo[]; // 이미 필터가 적용된 목록
  selectedId: string | null;
  recommendedGeneralId: string | null;
  recommendedSpecialistId: string | null;
  routeTarget: HospitalCareInfo | null;
  onSelect: (id: string) => void;
}

/**
 * "가까운 소아 진료 / 가장 가까운 소아 전문진료" UI 전용 지도.
 * 기존 components/HospitalMap.tsx(실데이터·등급 기반)는 그대로 두고, 이 프로토타입은
 * 별도 컴포넌트로 분리했다 — 나중에 실제 데이터로 교체할 때 여기만 바꾸면 된다.
 */
export default function CareMap({
  userLocation,
  hospitals,
  selectedId,
  recommendedGeneralId,
  recommendedSpecialistId,
  routeTarget,
  onSelect,
}: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    waitForTmap()
      .then((Tmapv2) => {
        if (cancelled || !mapDivRef.current) return;
        const map = new Tmapv2.Map(mapDivRef.current, {
          center: new Tmapv2.LatLng(userLocation.lat, userLocation.lng),
          width: '100%',
          height: '100%',
          zoom: 10,
        });
        mapRef.current = map;

        const icon = userMarkerIcon();
        userMarkerRef.current = new Tmapv2.Marker({
          position: new Tmapv2.LatLng(userLocation.lat, userLocation.lng),
          icon: icon.uri,
          iconSize: new Tmapv2.Size(icon.size, icon.size),
          map,
          zIndex: 1000,
        });

        setReady(true);
      })
      .catch(() => setLoadError(true));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !window.Tmapv2 || !mapRef.current) return;
    const Tmapv2 = window.Tmapv2;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    hospitals.forEach((h) => {
      const isSelected = h.id === selectedId;
      const isRecommended = h.id === recommendedGeneralId || h.id === recommendedSpecialistId;
      const kind = h.hasPediatricSpecialist ? 'specialist' : 'general';
      const { uri, size } = careMarkerIcon(kind, h.travelTime, {
        selected: isSelected,
        recommended: isRecommended,
      });

      const marker = new Tmapv2.Marker({
        position: new Tmapv2.LatLng(h.latitude, h.longitude),
        icon: uri,
        iconSize: new Tmapv2.Size(size, size),
        map,
        zIndex: isSelected ? 999 : isRecommended ? 500 : 100,
      });

      marker.addListener('click', () => onSelect(h.id));
      markersRef.current.push(marker);
    });
  }, [hospitals, selectedId, recommendedGeneralId, recommendedSpecialistId, ready, onSelect]);

  useEffect(() => {
    if (!ready || !mapRef.current || !selectedId) return;
    const hospital = hospitals.find((h) => h.id === selectedId);
    if (!hospital || !window.Tmapv2) return;
    mapRef.current.setCenter(new window.Tmapv2.LatLng(hospital.latitude, hospital.longitude));
  }, [selectedId, hospitals, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.Tmapv2) return;
    const Tmapv2 = window.Tmapv2;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    if (!routeTarget) return;

    const path = [
      new Tmapv2.LatLng(userLocation.lat, userLocation.lng),
      new Tmapv2.LatLng(routeTarget.latitude, routeTarget.longitude),
    ];
    polylineRef.current = new Tmapv2.Polyline({
      path,
      strokeColor: ROUTE_COLOR,
      strokeWeight: 5,
      strokeOpacity: 0.9,
      map: mapRef.current,
    });

    mapRef.current.setCenter(
      new Tmapv2.LatLng(
        (userLocation.lat + routeTarget.latitude) / 2,
        (userLocation.lng + routeTarget.longitude) / 2
      )
    );
  }, [routeTarget, userLocation, ready]);

  return (
    <div className="absolute inset-0 h-full w-full bg-neutral-100">
      <div ref={mapDivRef} className="h-full w-full [&>div]:h-full [&>div]:w-full" />
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-100 px-6 text-center text-sm text-neutral-400">
          {loadError ? 'Tmap 지도를 불러오지 못했습니다.' : '지도를 불러오는 중...'}
        </div>
      )}
    </div>
  );
}
