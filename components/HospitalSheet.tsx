import type { Clinic } from '@/lib/types';
import { GRADE_COLOR } from './markerIcon';

const GRADE_LABEL: Record<Clinic['grade'], string> = {
  FAST: '빠름',
  NORMAL: '보통',
  SLOW: '느림',
};

interface Props {
  clinic: Clinic;
  isFastestOverall: boolean; // 전체 후보 중 가장 빠른 곳인지 (전북 밖 배지 조건에 사용)
  onClose: () => void;
}

export default function HospitalSheet({ clinic, isFastestOverall, onClose }: Props) {
  const showOutsideBadge = isFastestOverall && clinic.sido !== '전북특별자치도';

  return (
    <div className="rounded-t-2xl bg-white p-5 shadow-2xl md:rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-400">
            {clinic.sido} {clinic.sigungu}
          </p>
          <p className="mt-0.5 text-base font-semibold text-neutral-900">{clinic.name}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      {showOutsideBadge && (
        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          전북 밖이지만 전주보다 빠릅니다
        </div>
      )}

      <div className="mt-4 flex items-end gap-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tabular-nums text-neutral-900">
            {clinic.minutes}
          </span>
          <span className="text-sm font-medium text-neutral-500">분</span>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: GRADE_COLOR[clinic.grade] }}
        >
          {GRADE_LABEL[clinic.grade]}
        </span>
        {clinic.estimated && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
            추정치
          </span>
        )}
      </div>

      <p className="mt-1.5 text-xs tabular-nums text-neutral-400">
        {clinic.distanceKm.toFixed(1)}km · 평소보다 {clinic.delay.toFixed(1)}배 지연
      </p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600"
        >
          닫기
        </button>
        {clinic.tel && (
          <a
            href={`tel:${clinic.tel}`}
            className="flex flex-1 items-center justify-center rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white"
          >
            전화하기 {clinic.tel}
          </a>
        )}
      </div>
    </div>
  );
}
