import type { Grade } from './types';

/**
 * 절대 시간이 아니라 후보군 안에서의 상대 순위로 등급을 매긴다.
 * 하위 34%=FAST(빠름) / 중위 33%=NORMAL(보통) / 상위 33%=SLOW(느림)
 * 각 화면에서 따로 계산하지 말고 이 함수 하나만 쓴다. (CLAUDE.md §3)
 */
export function gradeByRank(times: number[]): Grade[] {
  const n = times.length;
  if (n === 0) return [];

  const order = times
    .map((t, i) => [t, i] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([, i]) => i);

  const fastCut = Math.ceil(n * 0.34);
  const normalCut = Math.ceil(n * 0.67);

  const grades: Grade[] = new Array(n);
  order.forEach((originalIndex, rank) => {
    grades[originalIndex] = rank < fastCut ? 'FAST' : rank < normalCut ? 'NORMAL' : 'SLOW';
  });

  return grades;
}

/** 지연율 — 보조 지표. 1.0=원활, 1.5=평소보다 1.5배 지연 */
export function delayRatio(seconds: number, meters: number, freeKmh = 55): number {
  if (meters <= 0 || seconds <= 0) return 1;
  const freeSeconds = (meters / 1000 / freeKmh) * 3600;
  if (freeSeconds <= 0) return 1;
  return Math.round((seconds / freeSeconds) * 10) / 10;
}
