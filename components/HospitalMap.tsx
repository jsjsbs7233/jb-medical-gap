'use client';

/* eslint-disable @typescript-eslint/no-explicit-any -- Tmap JS SDK(window.Tmapv2)는 공식 타입 정의가 없다 */

import { useEffect, useRef, useState } from 'react';
import type { Clinic } from '@/lib/types';
import { clinicMarkerIcon, userMarkerIcon, ROUTE_COLOR } from './markerIcon';

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
  clinics: Clinic[];
  selectedId: string | null;
  routePath: [number, number][] | null; // [lng, lat][]
  onSelect: (id: string) => void;
}

export default function HospitalMap({
  userLocation,
  clinics,
  selectedId,
  routePath,
  onSelect,
}: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // 지도 최초 1회 생성
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

  // 소아과 마커 갱신
  useEffect(() => {
    if (!ready || !window.Tmapv2 || !mapRef.current) return;
    const Tmapv2 = window.Tmapv2;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    clinics.forEach((clinic) => {
      const isSelected = clinic.id === selectedId;
      const { uri, size } = clinicMarkerIcon(clinic.grade, clinic.minutes, isSelected);

      const marker = new Tmapv2.Marker({
        position: new Tmapv2.LatLng(clinic.lat, clinic.lng),
        icon: uri,
        iconSize: new Tmapv2.Size(size, size),
        map,
        zIndex: isSelected ? 999 : 100,
      });

      marker.addListener('click', () => onSelect(clinic.id));
      markersRef.current.push(marker);
    });
  }, [clinics, selectedId, ready, onSelect]);

  // 선택한 병원 경로선
  useEffect(() => {
    if (!ready || !window.Tmapv2 || !mapRef.current) return;
    const Tmapv2 = window.Tmapv2;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!routePath || routePath.length === 0) return;

    const path = routePath.map(([lng, lat]) => new Tmapv2.LatLng(lat, lng));
    polylineRef.current = new Tmapv2.Polyline({
      path,
      strokeColor: ROUTE_COLOR,
      strokeWeight: 5,
      strokeOpacity: 0.9,
      map: mapRef.current,
    });
  }, [routePath, ready]);

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
