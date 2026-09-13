interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
}

/** "현재 위치" 라벨 옆의 on/off 토글 — 켜면 확인된 휴진 병원만 목록/지도에서 뺀다. */
export default function OpenNowToggle({ value, onChange }: Props) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        value ? 'border-teal-600 bg-teal-600 text-white' : 'border-neutral-200 bg-white text-neutral-500'
      }`}
    >
      🕐 지금 진료중만
    </button>
  );
}
