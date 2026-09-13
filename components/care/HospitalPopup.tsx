'use client';

import { useEffect, useState } from 'react';
import type { HospitalCareInfo } from '@/lib/careTypes';

interface Props {
  hospital: HospitalCareInfo;
  onClose: () => void;
  onDetail: (id: string) => void;
  onDirections: (id: string) => void;
  openOnly?: boolean; // "지금 진료중만" 토글 — 켜져 있을 때만 진료시간 안내를 보여준다
}

interface EquipmentItem {
  code: string;
  name: string;
  count: number;
}

/** 마커 클릭 시 뜨는 floating 정보 팝업. */
export default function HospitalPopup({ hospital, onClose, onDetail, onDirections, openOnly }: Props) {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);

  // 병원을 선택할 때만(상세 팝업이 열릴 때) 그 병원 1곳의 장비 정보를 가져온다.
  // 아직 주소가 검증 안 된 API라 실패하면 조용히 빈 배열로 남는다 — 화면은 그대로 정상 동작.
  useEffect(() => {
    let cancelled = false;
    // setState는 콜백 안에서 — react-hooks/set-state-in-effect
    queueMicrotask(() => {
      if (!cancelled) setEquipment([]);
    });

    // name도 같이 보낸다 — 응급실 목록(국립중앙의료원 hpid 기준)에서 열린
    // 팝업은 hospital.id가 심평원 ykiho가 아니라 hpid라서, 서버가 name으로
    // 실제 ykiho를 역으로 찾아 재조회한다.
    fetch(`/api/equipment?ykiho=${encodeURIComponent(hospital.id)}&name=${encodeURIComponent(hospital.name)}`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) setEquipment(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setEquipment([]);
      });

    return () => {
      cancelled = true;
    };
  }, [hospital.id, hospital.name]);

  return (
    <div className="w-[19rem] rounded-2xl bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-neutral-400">{hospital.region}</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-[15px] font-semibold text-neutral-900">{hospital.name}</p>
            {hospital.tel && (
              <a href={`tel:${hospital.tel}`} className="text-xs text-neutral-400">
                {hospital.tel}
              </a>
            )}
          </div>
        </div>
        <button onClick={onClose} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100">
          ✕
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-3 text-sm tabular-nums text-neutral-700">
        <span>🚗 {hospital.travelTime}분</span>
        <span>📍 {hospital.distance.toFixed(1)}km</span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {typeof hospital.isOpen === 'boolean' && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              hospital.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${hospital.isOpen ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
            {hospital.isOpen ? '현재 진료 가능' : '진료 종료'}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
          {hospital.acceptsPediatricPatients ? '✓' : '—'} 소아 진료 가능
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            hospital.hasPediatricSpecialist ? 'bg-teal-50 text-teal-700' : 'bg-neutral-100 text-neutral-400'
          }`}
        >
          {hospital.hasPediatricSpecialist ? '✓' : '—'} 소아청소년과 전문의
        </span>
        {typeof hospital.pediatricSpecialistCount === 'number' && hospital.pediatricSpecialistCount > 0 ? (
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
            소아청소년과 전문의 {hospital.pediatricSpecialistCount}명
          </span>
        ) : (
          !!hospital.specialistDoctorCount && (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
              병원 전체 전문의 {hospital.specialistDoctorCount}명(추정)
            </span>
          )
        )}
        {hospital.hasEmergencyRoom && (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
            🚑 응급실 가용병상 {hospital.erAvailableBeds}
            {hospital.erUpdatedAt ? ` (${hospital.erUpdatedAt.slice(11)} 기준)` : ''}
          </span>
        )}
        {openOnly && hospital.openStatus === 'unknown' && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            📞 전화로 문의해주세요
          </span>
        )}
      </div>

      {equipment.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {equipment.map((eq) => (
            <span
              key={eq.code}
              className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
            >
              {eq.name} {eq.count}대
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onDetail(hospital.id)}
          className="flex-1 rounded-xl border border-neutral-200 py-2 text-xs font-medium text-neutral-600"
        >
          상세보기
        </button>
        <button
          onClick={() => onDirections(hospital.id)}
          className="flex-1 rounded-xl bg-neutral-900 py-2 text-xs font-semibold text-white"
        >
          길찾기
        </button>
      </div>
    </div>
  );
}
