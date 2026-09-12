import type { CareFilter } from '@/lib/careTypes';

const OPTIONS: { key: CareFilter; label: string }[] = [
  { key: 'general', label: '소아 진료 가능' },
  { key: 'specialist', label: '전문의 진료' },
  { key: 'emergency', label: '응급실' },
];

interface Props {
  value: CareFilter;
  onChange: (v: CareFilter) => void;
}

/** 지도 마커를 종류별로 강조해서 보는 필터. */
export default function HospitalFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              active
                ? 'border-teal-600 bg-teal-600 text-white'
                : 'border-neutral-200 bg-white text-neutral-600'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
