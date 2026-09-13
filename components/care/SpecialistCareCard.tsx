import type { HospitalCareInfo } from '@/lib/careTypes';
import { isOutsideJeonbuk } from '@/lib/careRecommend';

interface Props {
  hospital: HospitalCareInfo;
  onDetail: (id: string) => void;
  onDirections: (id: string) => void;
  // 응급실 필터일 땐 "전문의 추천"이 아니라 "지금 갈 수 있는 가장 가까운 응급실"을
  // 보여주므로 배지 문구가 달라진다.
  title?: string;
  openOnly?: boolean; // "지금 진료중만" 토글 — 켜져 있을 때만 진료시간 안내를 보여준다
}

/**
 * 최상단 추천 카드. 기본은 "가장 가까운 소아 전문진료"(서비스의 핵심 추천이라
 * 메인 컬러 테두리 + 별 배지로 구분) — 응급실 필터일 땐 title을 바꿔서 재사용한다.
 * 이 카드가 뜬 병원이 전북 밖이면, 이 프로젝트의 핵심 메시지("전북 밖이지만
 * 전주보다 빠릅니다")를 배지로 보여준다.
 */
export default function SpecialistCareCard({
  hospital,
  onDetail,
  onDirections,
  title = '⭐ 가장 가까운 소아 전문진료',
  openOnly,
}: Props) {
  return (
    <div className="rounded-2xl border-2 border-teal-600 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white">
          {title}
        </span>
      </div>

      {isOutsideJeonbuk(hospital.region) && (
        <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-700">
          전북 밖이지만 전주보다 빠릅니다
        </div>
      )}

      <div className="mt-2 flex items-baseline gap-1.5">
        <p className="text-[15px] font-semibold text-neutral-900">{hospital.name}</p>
        {hospital.tel && (
          <a href={`tel:${hospital.tel}`} className="text-xs text-neutral-400">
            {hospital.tel}
          </a>
        )}
      </div>
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
        {hospital.hasPediatricSpecialist && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
            ✓ 소아청소년과 전문의
          </span>
        )}
        {hospital.closeTime && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
            🕙 {hospital.closeTime} 진료 종료
          </span>
        )}
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
          </span>
        )}
        {openOnly && hospital.openStatus === 'unknown' && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            📞 전화로 문의해주세요
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
