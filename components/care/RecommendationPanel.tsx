import type { CareFilter, HospitalCareInfo } from '@/lib/careTypes';
import { summarizeEmergencyBeds } from '@/lib/careRecommend';
import HospitalFilter from './HospitalFilter';
import SpecialistCareCard from './SpecialistCareCard';
import HospitalListItem from './HospitalListItem';

interface Props {
  locationLabel: string;
  filter: CareFilter;
  onFilterChange: (v: CareFilter) => void;
  nearestSpecialist: HospitalCareInfo | null;
  hospitals: HospitalCareInfo[]; // 주변 병원 전체 목록(필터 적용됨, 이동시간 오름차순)
  selectedId: string | null;
  onDetail: (id: string) => void;
  onDirections: (id: string) => void;
  mobileExpanded: boolean;
  onToggleMobile: () => void;
}

/**
 * "가장 가까운 소아 전문진료" 추천을 보여주는 패널.
 * 데스크톱: 좌측 고정 패널 / 모바일: 하단 바텀시트.
 */
export default function RecommendationPanel({
  locationLabel,
  filter,
  onFilterChange,
  nearestSpecialist,
  hospitals,
  selectedId,
  onDetail,
  onDirections,
  mobileExpanded,
  onToggleMobile,
}: Props) {
  // 필터 탭마다 최상단 카드가 답해야 하는 질문이 다르다.
  // - 응급실: "지금 갈 수 있는 가장 가까운 응급실" — 이미 병상 있음 우선+거리순으로
  //   정렬된 목록(hospitals)의 1위를 그대로 쓴다.
  // - 소아 진료 가능: "전문의 여부 무관, 가장 가까운 소아 진료 가능" — 마찬가지로
  //   이미 순수 이동시간순으로 정렬된 목록의 1위를 쓴다.
  // - 전체/전문의 진료: 기존대로 nearestSpecialist(실제 전문의 확인된 곳 기준).
  const topPick = filter === 'emergency' || filter === 'general' ? (hospitals[0] ?? null) : nearestSpecialist;
  const topTitle =
    filter === 'emergency'
      ? '⭐ 지금 갈 수 있는 가장 가까운 응급실'
      : filter === 'general'
        ? '⭐ 가장 가까운 소아 진료 가능'
        : undefined;
  const emptyText =
    filter === 'emergency'
      ? '반경 내 응급실이 없습니다.'
      : filter === 'general'
        ? '반경 내 소아 진료 가능한 의료기관이 없습니다.'
        : '반경 내 소아청소년과 전문의 의료기관이 없습니다.';

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
        {topPick ? (
          <SpecialistCareCard hospital={topPick} onDetail={onDetail} onDirections={onDirections} title={topTitle} />
        ) : (
          <EmptyNotice text={emptyText} />
        )}
      </div>

      {filter === 'emergency' && (
        <EmergencySummary hospitals={hospitals} />
      )}

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold text-neutral-500">
          주변 병원 목록 ({hospitals.length}곳)
        </p>
        <div className="flex flex-col gap-2">
          {hospitals.length === 0 ? (
            <EmptyNotice text="조건에 맞는 병원이 없습니다." />
          ) : (
            hospitals.map((h) => (
              <HospitalListItem
                key={h.id}
                hospital={h}
                isSelected={h.id === selectedId}
                onDetail={onDetail}
                onDirections={onDirections}
              />
            ))
          )}
        </div>
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

function EmergencySummary({ hospitals }: { hospitals: HospitalCareInfo[] }) {
  const { hospitalCount, totalAvailableBeds } = summarizeEmergencyBeds(hospitals);
  return (
    <div className="mt-4 rounded-2xl bg-red-50 p-3.5">
      <p className="text-xs font-semibold text-red-700">🚑 응급실 현황</p>
      <p className="mt-1 text-sm text-red-800">
        응급실 보유 <span className="font-bold">{hospitalCount}곳</span> · 지금 가용 병상 합계{' '}
        <span className="font-bold">{totalAvailableBeds}개</span>
      </p>
      <p className="mt-1 text-[10px] leading-snug text-red-500">
        국립중앙의료원 실시간 데이터 기준. 병원명으로 매칭해서 일부 병원은 누락될 수 있습니다.
      </p>
    </div>
  );
}
