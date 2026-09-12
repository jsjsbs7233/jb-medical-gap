import type { CareFilter, HospitalCareInfo } from '@/lib/careTypes';
import HospitalFilter from './HospitalFilter';
import PediatricCareCard from './PediatricCareCard';
import SpecialistCareCard from './SpecialistCareCard';

interface Props {
  locationLabel: string;
  filter: CareFilter;
  onFilterChange: (v: CareFilter) => void;
  nearestGeneral: HospitalCareInfo | null;
  nearestSpecialist: HospitalCareInfo | null;
  onDetail: (id: string) => void;
  onDirections: (id: string) => void;
  mobileExpanded: boolean;
  onToggleMobile: () => void;
}

/**
 * "가까운 소아 진료" + "가장 가까운 소아 전문진료" 두 추천을 함께 보여주는 패널.
 * 데스크톱: 좌측 고정 패널 / 모바일: 하단 바텀시트.
 */
export default function RecommendationPanel({
  locationLabel,
  filter,
  onFilterChange,
  nearestGeneral,
  nearestSpecialist,
  onDetail,
  onDirections,
  mobileExpanded,
  onToggleMobile,
}: Props) {
  const body = (
    <>
      <div className="mb-1 flex items-center gap-1.5 text-xs text-neutral-500">
        📍 현재 위치
      </div>
      <p className="text-sm font-semibold text-neutral-800">{locationLabel}</p>

      <div className="mt-3">
        <HospitalFilter value={filter} onChange={onFilterChange} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {nearestGeneral ? (
          <PediatricCareCard hospital={nearestGeneral} onDetail={onDetail} onDirections={onDirections} />
        ) : (
          <EmptyNotice text="반경 내 소아 진료 가능한 의료기관이 없습니다." />
        )}

        {nearestSpecialist ? (
          <SpecialistCareCard hospital={nearestSpecialist} onDetail={onDetail} onDirections={onDirections} />
        ) : (
          <EmptyNotice text="반경 내 소아청소년과 전문의 의료기관이 없습니다." />
        )}
      </div>
    </>
  );

  return (
    <>
      {/* 데스크톱: 좌측 고정 패널 */}
      <div className="absolute left-4 top-4 z-20 hidden w-96 max-h-[calc(100vh-2rem)] flex-col overflow-y-auto rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur md:flex">
        {body}
      </div>

      {/* 모바일: 하단 바텀시트 */}
      <div
        className={`fixed inset-x-0 bottom-0 z-20 rounded-t-2xl bg-white shadow-2xl transition-all md:hidden ${
          mobileExpanded ? 'max-h-[75vh]' : 'max-h-24'
        } overflow-hidden`}
      >
        <button onClick={onToggleMobile} className="flex w-full flex-col items-center gap-2 pt-2.5 pb-1">
          <span className="h-1 w-10 rounded-full bg-neutral-200" />
        </button>
        <div className="max-h-[75vh] overflow-y-auto px-4 pb-5">{body}</div>
      </div>
    </>
  );
}

function EmptyNotice({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-400">
      {text}
    </div>
  );
}
