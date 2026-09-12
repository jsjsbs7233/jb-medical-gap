/**
 * 등급 산정 — 절대 시간이 아니라 "후보군 내 상대 순위"로 매긴다.
 * 장수군에서 열어도 전부 빨강이 되지 않도록 하는 장치. 각 화면에서 따로
 * 등급을 계산하지 말고 이 함수 하나만 쓴다.
 */
import type { Grade } from './types';

/**
 * times: 후보들의 소요시간(분 또는 초, 단위는 무관하고 상대비교만 함).
 * 반환값은 입력과 같은 순서 — 하위 34% = FAST, 중위 33% = NORMAL, 상위 33% = SLOW.
 */
export function gradeByRank(times: number[]): Grade[] {
  const n = times.length;
  if (n === 0) return [];

  const order = times
    .map((t, i) => ({ t, i }))
    .sort((a, b) => a.t - b.t);

  const grades: Grade[] = new Array(n);
  order.forEach(({ i }, rank) => {
    const percentile = rank / n; // 0(가장 빠름) ~ 1(가장 느림)
    if (percentile < 0.34) grades[i] = 'FAST';
    else if (percentile < 0.67) grades[i] = 'NORMAL';
    else grades[i] = 'SLOW';
  });

  return grades;
}

/**
 * 지연율(보조 지표). "평소보다 1.4배 지연" 툴팁에 쓴다.
 * seconds/meters는 Tmap 실시간 응답값, freeKmh는 정체 없을 때 가정 속도.
 */
export function delayRatio(seconds: number, meters: number, freeKmh = 55): number {
  if (seconds <= 0 || meters <= 0) return 1;
  const freeFlowSec = ((meters / 1000) / freeKmh) * 3600;
  if (freeFlowSec <= 0) return 1;
  return seconds / freeFlowSec;
}
