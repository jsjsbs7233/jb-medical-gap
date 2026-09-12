import { TRAFFIC_MARKER_COLOR } from '../markerIcon';

/** 마커 색상 범례 — 마커 원 색은 실시간 교통(이동시간) 등급을 나타낸다. */
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
          빠름
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: TRAFFIC_MARKER_COLOR.NORMAL }}
          />
          보통
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: TRAFFIC_MARKER_COLOR.SLOW }}
          />
          느림
        </div>
        <div className="flex items-center gap-1">⭐ 추천</div>
      </div>
      <p className="mt-1.5 max-w-[220px] text-[10px] leading-snug text-neutral-400">
        마커 색은 같은 후보 안에서의 상대적인 이동시간입니다. 병원 종류(일반/전문의)는
        좌측 목록의 점 색으로 구분됩니다.
      </p>
    </div>
  );
}
