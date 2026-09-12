import { CARE_MARKER_COLOR } from '../markerIcon';

/** 마커 색상 범례 — 일반 소아 진료 / 전문의 진료 / 추천. */
export default function CareLegend() {
  return (
    <div className="rounded-2xl bg-white/95 px-4 py-3 text-xs text-neutral-600 shadow-lg backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#2563eb' }} />
          현재 위치
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CARE_MARKER_COLOR.general }}
          />
          소아 진료
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CARE_MARKER_COLOR.specialist }}
          />
          전문의 진료
        </div>
        <div className="flex items-center gap-1">⭐ 추천</div>
      </div>
    </div>
  );
}
