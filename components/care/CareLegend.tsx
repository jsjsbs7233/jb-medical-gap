import { TRAFFIC_MARKER_COLOR } from '../markerIcon';

/** 마커 범례. 이동시간 등급별 색 구분은 팀 합의로 없애서, 마커 색은 전부 동일하다. */
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
            style={{ backgroundColor: TRAFFIC_MARKER_COLOR.FAST }}
          />
          소아과
        </div>
        <div className="flex items-center gap-1">⭐ 추천</div>
      </div>
      <p className="mt-1.5 max-w-[220px] text-[10px] leading-snug text-neutral-400">
        마커 안 아이콘 — 👶 아기 얼굴: 소아청소년과 전문의 / 🏥 건물: 일반 소아 진료.
      </p>
    </div>
  );
}
