import type { HospitalCareInfo } from '@/lib/careTypes';

interface Props {
  hospital: HospitalCareInfo;
  onClose: () => void;
  onDetail: (id: string) => void;
  onDirections: (id: string) => void;
}

/** 마커 클릭 시 뜨는 floating 정보 팝업. */
export default function HospitalPopup({ hospital, onClose, onDetail, onDirections }: Props) {
  return (
    <div className="w-[19rem] rounded-2xl bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-neutral-400">{hospital.region}</p>
          <p className="text-[15px] font-semibold text-neutral-900">{hospital.name}</p>
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
        {!!hospital.specialistDoctorCount && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
            병원 전체 전문의 {hospital.specialistDoctorCount}명
          </span>
        )}
      </div>

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
