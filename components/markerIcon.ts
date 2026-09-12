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

// 지도 마커 원 색깔은 실시간 교통(이동시간 등급)을 나타낸다.
// 빠름(원활)=초록 / 보통=주황 / 느림(혼잡)=빨강. ("혼잡"이라는 단어는 화면 텍스트엔 안 씀)
export const TRAFFIC_MARKER_COLOR: Record<Grade, string> = {
  FAST: '#16A34A',
  NORMAL: '#F59E0B',
  SLOW: '#DC2626',
};

export function careMarkerIcon(
  grade: Grade,
  minutes: number,
  opts: { selected?: boolean; recommended?: boolean } = {}
) {
  const { selected = false, recommended = false } = opts;
  const size = recommended ? 56 : selected ? 52 : 42;
  const r = size / 2 - 3;
  const cx = size / 2;
  const cy = size / 2;
  const color = TRAFFIC_MARKER_COLOR[grade];

  const badge = recommended
    ? `<circle cx="${size - 8}" cy="8" r="8" fill="#F5B300" stroke="#ffffff" stroke-width="2" />
       <text x="${size - 8}" y="8.5" text-anchor="middle" dominant-baseline="central"
         font-family="Arial, sans-serif" font-size="10" fill="#ffffff">★</text>`
    : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="#ffffff" stroke-width="${recommended ? 3.5 : selected ? 3 : 2.5}" />
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
        font-family="Arial, sans-serif" font-weight="700"
        font-size="${recommended ? 15 : selected ? 15 : 13}" fill="#ffffff">${minutes}</text>
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
