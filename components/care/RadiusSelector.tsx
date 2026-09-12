const OPTIONS = [50, 100, 200] as const;

interface Props {
  value: number;
  onChange: (v: number) => void;
}

/** 검색 반경(50/100/200km) 선택 — 지도/목록에 뜨는 병원 범위를 바꾼다. */
export default function RadiusSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-neutral-400">반경</span>
      <div className="flex gap-1">
        {OPTIONS.map((km) => {
          const active = value === km;
          return (
            <button
              key={km}
              onClick={() => onChange(km)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600'
              }`}
            >
              {km}km
            </button>
          );
        })}
      </div>
    </div>
  );
}
