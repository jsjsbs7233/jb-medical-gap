// 마커 아이콘을 SVG data URI로 즉석 생성. 이미지 파일이 필요 없다.
// CLAUDE.md §8: "마커 안에 숫자를 박습니다", 색상은 고정값.
import type { Grade } from '@/lib/types';

export const GRADE_COLOR: Record<Grade, string> = {
  FAST: '#F5B300',
  NORMAL: '#E8722C',
  SLOW: '#CC3B27',
};

export const ROUTE_COLOR = '#0E7C86';

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function clinicMarkerIcon(grade: Grade, minutes: number, selected: boolean) {
  const size = selected ? 52 : 42;
  const r = size / 2 - 3;
  const cx = size / 2;
  const cy = size / 2;
  const color = GRADE_COLOR[grade];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="#ffffff" stroke-width="${selected ? 3 : 2.5}" />
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
        font-family="Arial, sans-serif" font-weight="700"
        font-size="${selected ? 15 : 13}" fill="#ffffff">${minutes}</text>
    </svg>`;

  return { uri: svgToDataUri(svg), size };
}

// "가까운 소아 진료 / 가장 가까운 소아 전문진료" 두 트랙 UI용 마커.
//
// 리스트 카드(HospitalListItem)의 작은 점은 여전히 일반/전문의 구분에 이 색을 쓴다.
export const CARE_MARKER_COLOR = {
  general: '#64748B', // slate-500 — 소아 진료 가능(전문의 여부 무관)
  specialist: '#0E7C86', // 메인 컬러(경로선과 동일) — 소아청소년과 전문의
};

// 팀 합의로 이동시간 등급별 색 구분(초록/주황/빨강)을 없애고 단일 색으로 통일했다.
// Grade 값 자체(FAST/NORMAL/SLOW)는 목록 정렬 등 다른 곳에서 계속 쓰이므로 남겨둔다.
export const TRAFFIC_MARKER_COLOR: Record<Grade, string> = {
  FAST: '#16A34A',
  NORMAL: '#16A34A',
  SLOW: '#16A34A',
};

// 아기 얼굴(소아청소년과 전문의) / 병원 건물(일반 소아 진료) 아이콘.
// 44 기준 좌표로 그려두고 실제 마커 크기에 맞춰 scale()로 늘리고 줄인다 —
// 크기별로 좌표를 다시 계산할 필요가 없어서 훨씬 간단하다.
const BABY_FACE_ICON = `
  <circle cx="0" cy="1" r="11" fill="none" stroke="#ffffff" stroke-width="2.2" />
  <path d="M -3 -11 Q 1 -16 5 -12 Q 6.5 -9 3 -8" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" />
  <circle cx="-4" cy="1" r="1.5" fill="#ffffff" />
  <circle cx="4" cy="1" r="1.5" fill="#ffffff" />
  <path d="M -4.5 5 Q 0 8.5 4.5 5" fill="none" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" />
`;

const HOSPITAL_ICON = `
  <rect x="-9" y="-2" width="18" height="12" rx="1" fill="none" stroke="#ffffff" stroke-width="2.1" />
  <rect x="-4.5" y="-11" width="9" height="9" rx="1" fill="none" stroke="#ffffff" stroke-width="2" />
  <path d="M 0 -8.5 V -3.5 M -2.5 -6 H 2.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" />
  <rect x="-2" y="4" width="4" height="6" fill="#ffffff" />
`;

export function careMarkerIcon(
  grade: Grade,
  kind: 'general' | 'specialist',
  opts: { selected?: boolean; recommended?: boolean } = {}
) {
  const { selected = false, recommended = false } = opts;
  const size = recommended ? 56 : selected ? 52 : 42;
  const r = size / 2 - 3;
  const cx = size / 2;
  const cy = size / 2;
  const color = TRAFFIC_MARKER_COLOR[grade];
  const scale = size / 44;

  const badge = recommended
    ? `<circle cx="${size - 8}" cy="8" r="8" fill="#F5B300" stroke="#ffffff" stroke-width="2" />
       <text x="${size - 8}" y="8.5" text-anchor="middle" dominant-baseline="central"
         font-family="Arial, sans-serif" font-size="10" fill="#ffffff">★</text>`
    : '';

  const icon = kind === 'specialist' ? BABY_FACE_ICON : HOSPITAL_ICON;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="#ffffff" stroke-width="${recommended ? 3.5 : selected ? 3 : 2.5}" />
      <g transform="translate(${cx} ${cy}) scale(${scale})">
        ${icon}
      </g>
      ${badge}
    </svg>`;

  return { uri: svgToDataUri(svg), size };
}

export function userMarkerIcon() {
  const size = 36;
  const cx = size / 2;
  const cy = size / 2;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="15" fill="#2563eb" opacity="0.18" />
      <circle cx="${cx}" cy="${cy}" r="8" fill="#2563eb" stroke="#ffffff" stroke-width="3" />
    </svg>`;

  return { uri: svgToDataUri(svg), size };
}
