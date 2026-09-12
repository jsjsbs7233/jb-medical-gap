import type { HospitalCareInfo } from '@/lib/careTypes';

interface Props {
  hospital: HospitalCareInfo;
  onDetail: (id: string) => void;
  onDirections: (id: string) => void;
}

/**
 * "가장 가까운 소아 전문진료" — 서비스의 핵심 추천이라 메인 컬러 테두리 +
 * 별 배지로 구분한다. 다만 과하게 화려하지 않게, 흰 배경 + 얇은 강조 테두리 정도로.
 */
export default function SpecialistCareCard({ hospital, onDetail, onDirections }: Props) {
  return (
    <div className="rounded-2xl border-2 border-teal-600 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white">
          ⭐ 가장 가까운 소아 전문진료
        </span>
      </div>

      <p className="mt-2 text-[15px] font-semibold text-neutral-900">{hospital.name}</p>
      <p className="text-xs text-neutral-400">{hospital.region}</p>

      <div className="mt-2 flex items-center gap-3 text-sm tabular-nums text-neutral-700">
        <span>🚗 {hospital.travelTime}분</span>
        <span>📍 {hospital.distance.toFixed(1)}km</span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
          ✓ 소아청소년과 전문의
        </span>
        {hospital.closeTime && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
            🕙 {hospital.closeTime} 진료 종료
          </span>
        )}
        {!!hospital.specialistDoctorCount && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
            병원 전체 전문의 {hospital.specialistDoctorCount}명
          </span>
        )}
      </div>

      {hospital.recommendationReason && (
        <p className="mt-2.5 rounded-lg bg-teal-50/70 px-2.5 py-2 text-xs leading-relaxed text-teal-800">
          “{hospital.recommendationReason}”
        </p>
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
          className="flex-1 rounded-xl bg-teal-600 py-2 text-xs font-semibold text-white"
        >
          길찾기
        </button>
      </div>
    </div>
  );
}
