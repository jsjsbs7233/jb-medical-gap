#!/bin/bash
# 발표 10분 전에 실행 — 시연 좌표(DEMO.md) 캐시 워밍.
# 이걸 미리 돌려두면 발표 중 실제 화면에서 Tmap을 다시 안 부르고
# traffic_cache에서 바로 꺼내 써서 0.3초에 뜬다 (CLAUDE.md §7).
#
# 사용법:
#   BASE_URL=https://우리앱.vercel.app ./scripts/warm-cache.sh
#   (BASE_URL 생략하면 로컬 http://localhost:3000 으로 감)

BASE_URL="${BASE_URL:-http://localhost:3000}"

warm() {
  local label="$1" lat="$2" lng="$3"
  echo "=== ${label} (${lat}, ${lng}) ==="
  curl -s "${BASE_URL}/api/nearby?lat=${lat}&lng=${lng}" \
    | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log(`items=${j.items.length} cached=${j.cached} 1위=${j.items[0]?.name ?? "-"} ${j.items[0]?.minutes ?? "-"}분`);})' \
    2>/dev/null || echo "(node 파싱 실패 — 응답만 확인) "
  echo
}

warm "메인 (완주군 동북부 ↔ 논산)" 36.1 127.3
warm "백업 (남원시 동부 ↔ 곡성)" 35.3 127.3

echo "완료. 두 번째로 같은 좌표를 다시 호출하면 cached=true가 나와야 정상."
