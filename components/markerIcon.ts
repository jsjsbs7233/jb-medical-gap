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
