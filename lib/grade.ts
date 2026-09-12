/**
 * 등급 산정 — 절대 시간이 아니라 "후보군 내 상대 순위"로 매긴다.
 * 장수군에서 열어도 전부 빨강이 되지 않도록 하는 장치. 각 화면에서 따로
 * 등급을 계산하지 말고 이 함수 하나만 쓴다.
 */
import type { Grade } from './types';

/**
 * times: 후보들의 소요시간(분 또는 초, 단위는 무관하고 상대비교만 함).
 * 반환값은 입력과 같은 순서 — 하위 34% = FAST, 중위 33% = NORMAL, 상위 33% = SLOW.
 *
 * 값이 같은 후보는 반드시 같은 등급을 받는다 — 인덱스 순서로만 순위를 매기면
 * "30분짜리 두 곳 중 하나는 FAST, 하나는 NORMAL"처럼 같은 시간인데 색이 갈리는
 * 버그가 생긴다(실제 데모 데이터에서 발견됨). 동일한 값끼리는 평균 순위를 써서
 * 같은 백분위 → 같은 등급이 되도록 한다.
 */
export function gradeByRank(times: number[]): Grade[] {
  const n = times.length;
  if (n === 0) return [];

  const sorted = [...times].sort((a, b) => a - b);
  const avgPercentileByValue = new Map<number, number>();
  for (let i = 0; i < n; ) {
    let j = i;
    while (j < n && sorted[j] === sorted[i]) j++;
    const avgRank = (i + j - 1) / 2; // 동일 구간[i, j)의 평균 순위
    avgPercentileByValue.set(sorted[i], avgRank / n);
    i = j;
  }

  return times.map((t) => {
    const percentile = avgPercentileByValue.get(t)!;
    if (percentile < 0.34) return 'FAST';
    if (percentile < 0.67) return 'NORMAL';
    return 'SLOW';
  });
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
