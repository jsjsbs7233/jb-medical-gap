import type { HospitalCareInfo } from '@/lib/careTypes';
import { CARE_MARKER_COLOR } from '../markerIcon';

interface Props {
  hospital: HospitalCareInfo;
  isSelected: boolean;
  onDetail: (id: string) => void;
  onDirections: (id: string) => void;
}

/** 주변 병원 목록의 카드 한 줄 — 위 두 추천 카드와 같은 방식(정보/버튼 구성)을 따르되 더 간결하게. */
export default function HospitalListItem({ hospital, isSelected, onDetail, onDirections }: Props) {
  const kind = hospital.hasPediatricSpecialist ? 'specialist' : 'general';

  return (
    <button
      onClick={() => onDetail(hospital.id)}
      className={`w-full rounded-xl border p-3 text-left transition ${
        isSelected ? 'border-teal-500 bg-teal-50/40' : 'border-neutral-200 bg-white hover:border-neutral-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: CARE_MARKER_COLOR[kind] }}
          />
          <p className="text-sm font-semibold text-neutral-900">{hospital.name}</p>
          {hospital.tel && (
            // 카드 전체가 <button>이라 <a>를 못 넣는다(버튼 안에 링크 중첩 금지) —
            // 기존 "상세보기"/"길찾기"처럼 role="button" span으로 tel: 이동을 흉내낸다.
            <span
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `tel:${hospital.tel}`;
              }}
              role="button"
              className="text-xs text-neutral-400"
            >
              {hospital.tel}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1 whitespace-nowrap text-sm font-bold tabular-nums text-neutral-800">
          {hospital.travelTime}
          <span className="text-xs font-medium text-neutral-400">분</span>
        </div>
      </div>

      <p className="mt-0.5 pl-3.5 text-xs text-neutral-400">{hospital.region}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-3.5">
        <span className="text-xs tabular-nums text-neutral-400">📍 {hospital.distance.toFixed(1)}km</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            hospital.hasPediatricSpecialist ? 'bg-teal-50 text-teal-700' : 'bg-neutral-100 text-neutral-500'
          }`}
        >
          {hospital.hasPediatricSpecialist ? '소아청소년과 전문의' : '소아 진료 가능(일반의)'}
        </span>
        {typeof hospital.pediatricSpecialistCount === 'number' && hospital.pediatricSpecialistCount > 0 ? (
          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
            소아청소년과 전문의 {hospital.pediatricSpecialistCount}명
          </span>
        ) : (
          !!hospital.specialistDoctorCount && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
              병원 전체 전문의 {hospital.specialistDoctorCount}명
            </span>
          )
        )}
        {hospital.hasEmergencyRoom && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
            🚑 응급실 가용병상 {hospital.erAvailableBeds}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex gap-2 pl-3.5">
        <span
          onClick={(e) => {
            e.stopPropagation();
            onDetail(hospital.id);
          }}
          role="button"
          className="flex-1 rounded-lg border border-neutral-200 py-1.5 text-center text-[11px] font-medium text-neutral-600"
        >
          상세보기
        </span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onDirections(hospital.id);
          }}
          role="button"
          className="flex-1 rounded-lg bg-neutral-900 py-1.5 text-center text-[11px] font-semibold text-white"
        >
          길찾기
        </span>
      </div>
    </button>
  );
}
