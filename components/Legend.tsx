import { GRADE_COLOR } from './markerIcon';

const ITEMS: { grade: keyof typeof GRADE_COLOR; label: string }[] = [
  { grade: 'FAST', label: '빠름' },
  { grade: 'NORMAL', label: '보통' },
  { grade: 'SLOW', label: '느림' },
];

export default function Legend() {
  return (
    <div className="rounded-2xl bg-white/95 px-3 py-2.5 text-xs text-neutral-600 shadow-lg backdrop-blur">
      <div className="flex items-center gap-3">
        {ITEMS.map((item) => (
          <div key={item.grade} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: GRADE_COLOR[item.grade] }}
            />
            {item.label}
          </div>
        ))}
      </div>
      <p className="mt-1 max-w-[180px] text-[10px] leading-snug text-neutral-400">
        같은 후보 안에서의 상대적인 도착 소요시간입니다.
      </p>
    </div>
  );
}
