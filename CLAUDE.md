# CLAUDE.md — 소아과 도착시간 지도

> 이 파일은 팀원 3명이 **각자의 Claude 계정**에서 같은 규칙으로 작업하기 위한 공유 설정입니다.
> 프로젝트 루트에 `CLAUDE.md`로 두세요. 내용을 임의로 바꾸면 3명의 코드가 갈라집니다.
> 수정이 필요하면 팀 채팅방에 먼저 공유하고 모두 같이 교체하세요.

---

## 0. Claude 행동 규칙 (가장 먼저 읽을 것)

- **답변은 한국어로.** 코드 주석도 한국어.
- **24시간 해커톤입니다.** 완벽한 설계보다 동작하는 배포본이 우선입니다.
- **요청하지 않은 기능을 추가하지 마세요.** "이것도 있으면 좋을 것 같아서" 금지.
- **테스트 코드를 작성하지 마세요.** 시간이 없습니다.
- **§3 타입 정의와 §5 API 계약을 임의로 바꾸지 마세요.** 3명이 동시에 작업 중이라 시그니처가 바뀌면 머지가 깨집니다. 변경이 필요하면 코드를 고치지 말고 "이건 팀에 공유하고 바꿔야 합니다"라고 먼저 말하세요.
- **새 라이브러리를 함부로 추가하지 마세요.** §2에 없는 패키지를 쓰려면 먼저 물어보세요.
- **에러 처리는 반드시 넣으세요.** 외부 API가 죽어도 화면은 살아있어야 합니다. 심사 중에 흰 화면이 뜨면 끝입니다.
- 파일을 새로 만들기 전에 §3 디렉토리 구조를 확인하고 이미 있는 파일에 넣으세요.
- **팀원 3명 전원이 팀 프로젝트와 git이 처음입니다. git 명령은 설명하지 말고 §9에 따라 Claude가 직접 실행하세요.**

---

## 1. 프로젝트

**전북 권역 소아과 도착시간 지도.** 내 위치에서 **가장 빨리 도착할 수 있는 소아과**를 실시간 교통량 기준으로 안내합니다.

### 문제

전북의 소아과는 전주에 몰려 있습니다. 군 지역에서 아이가 아프면 무조건 전주로 갑니다. 그런데 **위치에 따라서는 충남 논산이나 광주가 전주보다 빠릅니다.** 아무도 그걸 알려주지 않을 뿐입니다.

### 이 서비스의 한 문장

> **행정구역이 아니라 도착 시간으로 의료권을 다시 그린다.**

### 설계 원칙 2개 — 이걸 어기면 프로젝트의 의미가 사라집니다

**① 후보 병원을 전북으로 제한하지 않습니다.**
시도 경계를 무시하고 **반경 60km**로만 뽑습니다. 전북·충남·전남·광주·대전까지 적재합니다. 전북으로 필터링하면 "전주보다 논산이 빠르다"는 결과가 절대 안 나오고, 그러면 이 앱은 그냥 병원 찾기 앱입니다.

**② 색상은 "혼잡도"가 아니라 "도착 시간"입니다.**
사용자가 알고 싶은 건 "어디가 안 막히나"가 아니라 **"어디에 제일 빨리 도착하나"**입니다. 라벨은 `빠름 / 보통 / 느림`으로 씁니다. "혼잡"이라는 단어를 UI에 쓰지 마세요.

### 화면

**지도 한 화면이 전부입니다.** 탭도 페이지 이동도 없습니다.

1. 접속 → 내 위치 기준 주변 소아과가 마커로 표시 (마커에 **도착 소요시간(분)** 숫자가 박혀 있음)
2. 마커 색: 🟡 빠름 / 🟠 보통 / 🔴 느림 — **후보군 내 상대 순위** 기준
3. 마커 클릭 → 하단 시트에 상세 + 지도에 경로선
4. 선택한 병원이 전북 밖이면 **"전북 밖이지만 전주보다 빠릅니다"** 배지 표시 ← 이게 발표의 핵심 장치

### 구현하지 않는 것 (제안도 하지 마세요)

로그인 · 회원가입 · 즐겨찾기 · 리뷰 · 관리자 페이지 · 알림 · 예약 · 진료시간 필터 · 소아과 외 진료과 · 대중교통 경로 · 다국어 · PWA

---

## 2. 기술 스택 (변경 금지)

```
Next.js 15 (App Router) + TypeScript
Tailwind CSS
Supabase (Postgres)
Vercel (배포)
Tmap JavaScript API v2   ← 지도 렌더링
Tmap 자동차 경로안내 REST  ← 실시간 교통 소요시간
건강보험심사평가원 API     ← 소아과 목록
fast-xml-parser           ← 심평원 응답이 XML
```

**별도 백엔드 서버를 만들지 않습니다.** Next.js Route Handler가 백엔드입니다. 배포 지점이 하나여야 24시간 안에 끝납니다.

**Vite / CRA 등 SPA는 쓸 수 없습니다.** Tmap 앱키와 공공데이터 키를 서버에 숨겨야 하고, 심평원 API는 CORS 미지원 + 평문 HTTP입니다.

### 환경변수 (이름 고정)

```bash
TMAP_APP_KEY=                   # 서버 전용. 경로 계산용. 절대 NEXT_PUBLIC_ 금지
NEXT_PUBLIC_TMAP_MAP_KEY=       # 지도 SDK용. 클라이언트 노출됨 → SK 콘솔에서 도메인 제한 필수
DATA_GO_KR_KEY=                 # 심평원 '디코딩' 키. 절대 NEXT_PUBLIC_ 금지
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # 서버 전용
DEMO_MODE=                      # '1'이면 고정 응답 반환 (발표용 보험)
```

> **Tmap 앱키는 반드시 2개 발급받습니다.** 서버용과 지도용을 분리하고, 지도용에는 도메인 화이트리스트를 거세요. 하나로 쓰면 클라이언트에 노출된 키로 경로 API까지 무제한 호출당합니다.

---

## 3. 구조와 타입

```
app/
  page.tsx                  # 지도 한 화면
  api/
    nearby/route.ts         # ★ 핵심: 후보 압축 → 캐시 → Tmap → 등급
    route/route.ts          # 선택 병원까지의 경로 폴리라인
    sync/route.ts           # 심평원 → Supabase 적재 (수동 1회)
components/
  HospitalMap.tsx           # ★ Tmap 지도 + 마커 + 경로선
  HospitalSheet.tsx         # 하단 바텀시트
  Legend.tsx                # 색상 범례
lib/
  types.ts                  # ← 공용 타입. 임의 변경 금지
  geo.ts                    # haversine, 격자 스냅
  grade.ts                  # 등급 산정
  tmap.ts                   # Tmap 호출 래퍼
  hira.ts                   # 심평원 호출 + XML 파싱
  supabase.ts
  mock.ts                   # 프론트용 목업 데이터 (A가 초반에 사용)
```

### lib/types.ts

```ts
export type Grade = 'FAST' | 'NORMAL' | 'SLOW';

/** 지도에 찍히는 소아과 한 곳 */
export interface Clinic {
  id: string;            // 심평원 ykiho
  name: string;
  addr: string | null;
  tel: string | null;
  sido: string;          // '전북특별자치도' | '충청남도' | '광주광역시' …
  sigungu: string;
  lat: number;
  lng: number;
  minutes: number;       // 실시간 교통 반영 소요시간(분)
  distanceKm: number;    // 실제 주행거리
  delay: number;         // 지연율. 1.0=원활, 1.5=평소의 1.5배
  grade: Grade;
  estimated: boolean;    // true면 Tmap 실패로 직선거리 추정치
}

export interface NearbyResponse {
  items: Clinic[];       // 소요시간 오름차순
  gridKey: string;
  cached: boolean;
  error?: string;
}

export interface RouteResponse {
  path: [number, number][];  // [lng, lat][]
  minutes: number;
  error?: string;
}
```

### 성능 설계 — API 호출을 200회에서 8회로

이 앱의 핵심 엔지니어링이고, 심사에서 반드시 질문받는 지점입니다. `/api/nearby`는 이 순서를 지킵니다.

```
① 심평원은 실시간이 아니다        → Tmap 호출 0회
   소아과 목록은 하루 1회 적재해 Supabase에 저장. 요청 시엔 DB만 읽는다.

② 직선거리로 후보 압축            → Tmap 호출 0회
   Haversine으로 반경 60km 내 가까운 순 8개만 남긴다.
   교통을 반영해도 9위가 1위로 뒤집히는 일은 거의 없다.

③ 위치를 1km 격자로 스냅          → 캐시 히트 시 0회
   35.8234, 127.1456 → "3582_12715"
   같은 격자 + 3분 이내면 DB 캐시 그대로 반환.
   심사위원 5명이 같은 자리에서 열어도 1명분만 호출된다.

④ 남은 것만 Tmap 병렬 호출        → Tmap 호출 최대 8회
   Promise.allSettled로 동시 발사. 순차 8초 → 병렬 1초.
```

상수는 이 값으로 고정합니다.

```ts
const CANDIDATES = 8;     // Tmap을 부를 병원 수
const RADIUS_KM  = 60;    // 권역 경계를 넘기 위해 넉넉하게
const CACHE_SEC  = 180;   // 교통 캐시 3분
const GRID       = 0.01;  // 격자 크기 (약 1.1km)
```

### 등급은 절대값이 아니라 상대 순위

```
❌ 30분 미만=노랑, 30~60분=주황, 60분 초과=빨강
   → 장수군에서 열면 전부 빨강. 화면이 아무 정보도 주지 않는다.

✅ 후보 8개 안에서 소요시간 순위로 자른다
   하위 34%=FAST / 중위=NORMAL / 상위 33%=SLOW
   → 어디서 열어도 "이 중엔 여기가 제일 빠르다"가 보인다.
```

`lib/grade.ts`에 `gradeByRank(times: number[]): Grade[]` 하나만 둡니다. 각 화면에서 따로 등급을 계산하지 마세요.

지연율은 보조 지표입니다. `delayRatio(초, 미터, freeKmh=55)` — 툴팁에 "평소보다 1.4배 지연"을 띄워 **실시간 교통이 반영되고 있다는 걸 눈에 보이게** 만듭니다.

### Supabase 스키마

```sql
-- 소아과 목록 (하루 1회 적재, 시도 경계 없음)
create table clinics (
  id       text primary key,          -- 심평원 ykiho
  name     text not null,
  sido     text, sigungu text,
  addr     text, tel text,
  lat      double precision not null,
  lng      double precision not null
);
create index clinics_geo_idx on clinics (lat, lng);

-- 교통 캐시 (격자 단위)
create table traffic_cache (
  grid_key   text not null,
  clinic_id  text not null,
  total_time int not null,            -- 초
  total_dist int not null,            -- 미터
  created_at timestamptz default now(),
  primary key (grid_key, clinic_id)
);
```

---

## 4. 외부 API — 읽지 않으면 반드시 시간을 날립니다

### Tmap 자동차 경로안내

```
POST https://apis.openapi.sk.com/tmap/routes?version=1&format=json
헤더: appKey: <TMAP_APP_KEY>, Content-Type: application/json
본문: {
  startX, startY, endX, endY,        // 경도(X), 위도(Y) 순서 주의
  startName: '출발', endName: '도착',
  reqCoordType: 'WGS84GEO',
  resCoordType: 'WGS84GEO',
  searchOption: '0',                  // 교통최적+추천
  trafficInfo: 'Y'                    // ★ 실시간 교통 반영
}
응답: features[0].properties.totalTime(초), totalDistance(m)
      경로선은 features 중 geometry.type === 'LineString'의 coordinates
```

> ⚠️ **응답 구조는 첫 호출을 콘솔에 찍어 반드시 확인하세요.** `totalTime`이 `features[0].properties`에 있다는 건 확정이 아닙니다. 다르면 `lib/tmap.ts` 한 곳만 고치면 됩니다.

### 건강보험심사평가원 병원정보서비스

```
http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList
좌표 반경 검색: xPos(경도), yPos(위도), radius(미터) 지원
진료과목: dgsbjtCd 파라미터
```

> ⚠️ **소아청소년과 코드는 `11`로 추정되지만 확정이 아닙니다.** 첫 응답의 `dgsbjtCdNm` 값을 눈으로 확인하고 코드를 확정하세요. 안 되면 진료과목정보서비스(`getDgsbjtInfo`)로 필터링하는 방법도 있습니다. **이 확인을 건너뛰고 코드를 짜지 마세요.**

심평원은 **운영계정이 심의승인**이라 24시간 안엔 못 받습니다. 개발계정(자동승인, 1만건/일)으로 배포합니다.

### 함정 7개

**1. `SERVICE_KEY_IS_NOT_REGISTERED_ERROR`**
인코딩키·디코딩키를 섞어 쓴 것입니다. **디코딩키**를 `DATA_GO_KR_KEY`에 넣고 `URLSearchParams`로 붙입니다.

```ts
// ✅ 이렇게
const qs = new URLSearchParams({ serviceKey: process.env.DATA_GO_KR_KEY!, /* … */ });
// ❌ 이러면 실패
const url = `${BASE}?serviceKey=${process.env.DATA_GO_KR_KEY}&…`;
```

**2. Mixed Content 차단** — 심평원은 평문 `http://`입니다. HTTPS 페이지에서 브라우저가 직접 호출하면 차단됩니다. 반드시 서버 라우트 경유.

**3. CORS 미지원** — 같은 결론. 클라이언트 컴포넌트에서 `apis.data.go.kr`을 직접 `fetch`하지 마세요.

**4. 심평원 응답이 XML** — `fast-xml-parser`로 파싱. 파싱은 `lib/hira.ts` 한 곳에만.

**5. 항목 1개일 때 배열이 아니다**

```ts
const list = Array.isArray(items?.item) ? items.item : items?.item ? [items.item] : [];
```

**6. Tmap 좌표 순서** — `startX`가 **경도**, `startY`가 **위도**입니다. 뒤집으면 엉뚱한 곳으로 경로가 나옵니다. 가장 흔한 실수입니다.

**7. Tmap 호출 한도** — 무료 한도를 SK 콘솔에서 확인하세요. **캐시를 켜지 않은 채 개발하면 몇 시간 만에 한도를 씁니다.** 위치 바꿔가며 새로고침하는 것만으로 소진됩니다.

---

## 5. API 계약 (프론트·백엔드 공용 — 변경 금지)

```
GET /api/nearby?lat=&lng=
  → NearbyResponse
     후보 압축 → 격자 캐시 → Tmap 병렬 → 상대등급. items는 minutes 오름차순

GET /api/route?sx=&sy=&ex=&ey=
  → RouteResponse
     sx/sy는 출발 경도/위도, ex/ey는 도착 경도/위도

POST /api/sync
  → { inserted: number }
     심평원 → Supabase 적재. 개발 중 수동 호출용
```

**모든 라우트는 실패해도 200과 빈 배열을 반환합니다.** 500을 던져 화면을 죽이지 마세요.

```ts
return NextResponse.json({ items: [], error: '일시적으로 정보를 불러오지 못했습니다' });
```

**Tmap 실패 시 폴백** — `null`이면 직선거리 ÷ 45km/h로 추정하고 `estimated: true`를 답니다. UI엔 "추정치"로 표시되고 앱은 계속 돕니다. 심사위원 앞의 흰 화면보다 백 배 낫습니다.

---

## 6. 역할 분담 — 프론트 1명 + 백엔드 2명

| | 전공 | 담당 영역 | 브랜치 접두사 |
|---|---|---|---|
| **A** | 프론트 | `HospitalMap.tsx`, `HospitalSheet.tsx`, `Legend.tsx`, Tmap SDK, 반응형 | `feat/a-` |
| **B** | 백엔드 | **외부** — `lib/tmap.ts`, `lib/hira.ts`, `/api/route`, `/api/sync`, 배포, 통합 리드 | `feat/b-` |
| **C** | 백엔드 | **내부** — Supabase, `lib/geo.ts`, `lib/grade.ts`, **`/api/nearby`** → 발표 | `feat/c-` |

**백엔드 2명의 경계**
- **B = 바깥으로 나가는 호출** (Tmap·심평원 인증, XML 파싱, 좌표 변환)
- **C = 우리 서버 안의 판단** (후보 압축, 캐시, 등급, 정렬)
- 접점은 `lib/tmap.ts`의 `getRoute()` 함수 하나뿐입니다. B가 만들고 C가 가져다 씁니다.

### 시간대별 배치

| 구간 | A (프론트) | B (백) | C (백) |
|---|---|---|---|
| T+0.5~2 | **Tmap 지도 띄우기** | **배포 파이프라인** | **배포 파이프라인 (B와 2인 1조)** |
| T+2~6 | 목업으로 마커 렌더 | `lib/tmap.ts` + 심평원 적재 | Supabase + geo/grade + `/api/nearby` |
| T+6~12 | 경로선 + 바텀시트 + 배지 | `/api/route` + 통합 | 캐시·등급 완성 + **시연 좌표 검증** |
| T+12~15 | 수면 | 수면 | 수면 |
| T+15~19 | 반응형·디테일 마감 | 버그·캐시 워밍 스크립트 | **발표 전담** |
| T+19~22 | 리허설 참여 | 리허설 참여 | 슬라이드·녹화·QR·리허설 |

### 이 구성에서 반드시 지킬 것

- **A는 백엔드를 기다리지 않습니다.** Tmap 지도 SDK는 `NEXT_PUBLIC_TMAP_MAP_KEY`만 있으면 뜹니다. `lib/mock.ts`에 `Clinic[]` 목업을 만들어 화면을 끝까지 완성하고, 나중에 `fetch('/api/nearby')`로 바꾸기만 하면 됩니다. **T+2에 이미 마커가 보여야 합니다.**
- **C는 T+6~12에 시연 좌표를 직접 검증합니다.** 장수·남원·군산 등에서 `/api/nearby`를 호출해 **"전북 밖이 더 빠른" 좌표를 찾아내세요.** 이게 발표의 전부입니다. 그 좌표가 안 나오면 반경을 키우거나 적재 범위를 넓혀야 합니다.
- **커스텀 CSS 파일을 만들지 마세요. Tailwind 유틸리티만.** 백엔드 2명도 읽고 고칠 수 있어야 합니다.
- **백엔드 2명은 T+8이면 API가 끝납니다.** 그때부터 "백엔드 담당"을 내려놓고 프론트를 도우세요.
- **프론트가 1명이라 대체 인력이 없습니다.** A가 막히면 즉시 채팅방에 알리고 백엔드 중 한 명이 붙으세요. 혼자 2시간 붙잡고 있으면 팀이 끝납니다.

### 공통 규칙

- `main`에 머지되면 Vercel이 자동 배포됩니다. **`main`은 항상 배포 가능한 상태로.**
- **2시간마다 `main`으로 머지합니다.** 몰아서 하면 안 합쳐집니다.
- 남의 담당 파일을 고치지 마세요. 필요하면 채팅방에 말하세요.
- **패키지는 T+1에 B가 한 번에 다 설치하고 `main`에 올립니다.** `package-lock.json` 충돌은 초보 팀의 최대 사고입니다.
- **T+15부터는 담당 구분을 버립니다.** 남은 것부터 잡으세요.

---

## 7. 마감 규칙

- **T+19 기능 프리즈.** 이후 새 기능 추가 금지. 데모 시나리오를 막는 버그만 고칩니다.
- 프리즈 이후 Claude가 리팩터링이나 개선을 제안하면 무시하세요.

### 발표 직전 캐시 워밍 ← 반드시

시연할 좌표 3곳을 발표 10분 전에 미리 호출해 캐시에 넣으세요.

```bash
curl "https://우리주소/api/nearby?lat=35.65&lng=127.52"   # 장수
curl "https://우리주소/api/nearby?lat=35.82&lng=127.14"   # 전주
curl "https://우리주소/api/nearby?lat=36.18&lng=127.09"   # 논산 경계
```

캐시가 차 있으면 데모가 0.3초에 뜹니다. 발표에서 로딩 3초는 30초처럼 느껴집니다.

### 최후의 보험

정상 응답 JSON을 파일로 저장하고, `DEMO_MODE=1`이면 그걸 반환하게 만드세요. 20분이면 만들고, 네트워크가 죽어도 발표는 끝납니다.

### 배포 완료 판정

- [ ] 프로덕션 URL이 외부망에서 열린다
- [ ] 폰 브라우저(LTE)에서 위치 권한이 뜨고 지도가 보인다
- [ ] `TMAP_APP_KEY`·`DATA_GO_KR_KEY`·`SERVICE_ROLE_KEY`가 클라이언트 번들에 없다
- [ ] `NEXT_PUBLIC_TMAP_MAP_KEY`에 도메인 제한이 걸려 있다
- [ ] Tmap이 죽어도 추정치로 화면이 뜬다
- [ ] 위치 권한을 거부해도 전주 좌표로 폴백된다
- [ ] QR 스캔 → 3초 안에 마커가 보인다

---

## 8. UI 원칙

- **모바일 우선.** 심사위원은 폰으로 엽니다. 지도는 `h-dvh`.
- **마커에 숫자를 박습니다.** 색만으로는 정보가 부족합니다. 마커 안에 도착 소요시간(분)을 넣으세요. SVG data URI로 만들면 이미지 파일이 필요 없습니다.
- **색상 고정**
  ```
  FAST(빠름)   #F5B300
  NORMAL(보통) #E8722C
  SLOW(느림)   #CC3B27
  경로선        #0E7C86
  ```
- **점진적 렌더링.** 후보 마커를 회색으로 먼저 그리고, 소요시간이 도착하면 색을 칠합니다. 빈 화면 1초와 체감이 완전히 다릅니다.
- 전화번호는 `tel:` 링크로. 군 지역에선 가장 중요한 기능입니다.
- **전북 밖 병원을 선택하면 배지를 띄웁니다.** "전북 밖이지만 전주보다 빠릅니다." 이 한 줄이 프로젝트의 메시지입니다.
- 숫자는 `tabular-nums`로 정렬합니다.
- 결과가 0건이면 빈 화면 대신 명시하세요. "반경 60km 내 소아과가 없습니다."

---

## 9. Git — Claude가 직접 실행합니다

### 9.0 Claude에게 주는 지시

이 팀은 **3명 전원이 팀 프로젝트도, git도 처음**입니다. 아래대로 행동하세요.

- **git 명령어를 설명하지 말고 직접 실행하세요.** 사용자에게 복사·붙여넣기를 시키지 마세요.
- **`git add`와 `git commit`은 물어보지 말고 알아서 하세요.** 의미 있는 작업 단위가 끝날 때마다(파일 2~3개 수정, 기능 하나 완성, 버그 하나 수정) 바로 커밋합니다. 메시지는 한국어 한 줄. (`마커 색상 등급 반영`)
- **`git push` · PR 생성 · `main` 머지는 한 줄로 확인받고** 실행하세요. ("GitHub에 올릴까요?")
- 실행한 뒤에는 **무슨 일이 일어났는지 한 줄로** 알려주세요. → *"feat/a-map에 커밋했습니다. 아직 GitHub엔 안 올라갔어요."*
- 에러가 나면 영문 원문을 그대로 붙여넣지 말고, **무슨 상황인지 + 어떻게 해결할지**를 한국어로 말한 뒤 직접 해결하세요.
- `gh` (GitHub CLI)가 설치·로그인되어 있으면 PR 생성과 머지도 `gh`로 처리하세요. 없으면 사용자에게 GitHub 웹에서 누를 버튼을 알려주세요.

**절대 실행 금지 — 사용자가 요청해도 거부하고 이유를 설명하세요**

| 명령 | 이유 |
|---|---|
| `git push --force`, `-f` | 남의 커밋이 영구히 사라집니다 |
| `git reset --hard` | 저장 안 된 작업이 사라집니다 |
| `git checkout .` / `git restore .` | 위와 같음 |
| `git branch -D` | 남의 브랜치 삭제 |
| `git rebase` | 초보 팀에겐 위험합니다. **merge만** 씁니다 |

꼬였을 때는 §9.6으로 가세요. 위 명령으로 해결하려 들지 마세요.

---

### 9.1 첫 대화에서 먼저 할 일

`.myrole` 파일이 있는지 확인하세요.

**없으면** — 사용자에게 묻습니다.
> "이 프로젝트에서 A(프론트·지도) / B(백엔드·Tmap·심평원·배포) / C(백엔드·DB·nearby·발표) 중 어느 담당이세요?"

답을 받으면 `.myrole` 파일에 한 글자(`A`)만 저장하고, `.gitignore`에 `.myrole` 줄을 추가하세요.

**있으면** — 읽어서 담당을 파악하고, `git status`·`git branch`로 현재 상태를 확인한 뒤 **지금 뭘 하면 되는지 한 줄로** 알려주세요.

---

### 9.2 레포를 처음 만드는 사람 (1명만, 딱 한 번)

**사용자가 직접 해야 하는 것** — 이것만 안내하고 기다리세요.

1. GitHub → **New repository** → 이름 입력 → **Private** → README·gitignore·license **모두 체크 해제** → Create
2. 레포 → **Settings → Collaborators → Add people** → 팀원 2명 초대
3. 레포 주소를 Claude에게 알려주기

**그다음 Claude가 실행**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
npm install fast-xml-parser @supabase/supabase-js
git init
git add .
git commit -m "프로젝트 초기 세팅"
git branch -M main
git remote add origin <사용자가 준 주소>
git push -u origin main
```

이어서 Claude가 확인할 것:
- `.gitignore`에 `node_modules`, `.env*`, `.myrole`이 있는지 — 없으면 추가하고 커밋
- `.env.local.example`을 만들어 §2의 환경변수 **이름만** 적어 커밋 (값은 절대 넣지 마세요)

마지막으로 사용자에게 안내:
> "레포 준비됐습니다. 팀원들에게 **① 초대 수락하기 ② 레포 주소 ③ `.env.local` 내용**을 공유해 주세요. 키는 단톡방보다 DM으로 보내시는 게 안전합니다."

---

### 9.3 합류하는 사람 (2명, 딱 한 번)

사용자에게 레포 주소를 묻고, Claude가 실행합니다.

```bash
git clone <레포 주소> .
npm install
```

> ⚠️ GitHub 초대를 수락하지 않으면 권한 오류가 납니다. 오류가 나면 "GitHub 알림 또는 메일에서 초대를 먼저 수락해 주세요"라고 안내하세요. Private 레포라 수락 전엔 주소로 들어가도 404가 뜹니다 — 링크가 잘못된 게 아닙니다.

그다음 사용자에게:
> "팀 채팅방에 있는 `.env.local` 내용을 붙여넣어 주세요. 제가 파일로 만들어 드릴게요."

받으면 Claude가 `.env.local`을 생성합니다. **이 파일은 절대 커밋하지 마세요.**

---

### 9.4 작업 사이클 (계속 반복)

#### ① 작업 시작할 때 — Claude가 실행

```bash
git checkout main
git pull
git checkout -b feat/a-map          # 접두사는 .myrole에 맞춰서
```

브랜치 이름은 담당 접두사 + 짧은 영어 (`feat/b-tmap`, `feat/c-nearby`).

#### ② 작업하는 동안 — Claude가 알아서

작업 단위가 끝날 때마다 **묻지 말고** 실행:

```bash
git add .
git commit -m "마커 클릭 시 경로선 표시"
```

#### ③ 합칠 때 (2시간마다) — Claude가 순서대로 실행

```bash
# 1. 내 작업 저장
git add . && git commit -m "..."

# 2. main 최신 내용을 내 브랜치로 먼저 가져온다  ★이 순서를 절대 바꾸지 마세요★
git checkout main
git pull
git checkout feat/a-map
git merge main

# 3. 충돌 없으면 올린다  (여기서 사용자에게 확인)
git push -u origin feat/a-map
```

그다음 `gh`가 있으면:

```bash
gh pr create --fill --base main
gh pr merge --merge --delete-branch
```

`gh`가 없으면 사용자에게:
> "GitHub 레포에 들어가면 노란 띠에 **Compare & pull request** 버튼이 떠 있습니다. → **Create pull request** → **Merge pull request** → **Confirm** 누르시면 끝입니다."

머지 후 Claude가 실행:

```bash
git checkout main
git pull
```

> **왜 2번이 중요한가** — `main`을 내 브랜치로 먼저 당겨오면 충돌이 **내 브랜치 안에서만** 터집니다. 이 순서를 건너뛰면 `main`이 깨지고 3명 전부가 멈춥니다. Claude는 이 순서를 절대 생략하지 마세요.

---

### 9.5 충돌(conflict)이 났을 때

`git merge main`에서 `CONFLICT`가 뜨면 Claude가 처리합니다.

1. 충돌 파일을 열어 `<<<<<<< HEAD` / `=======` / `>>>>>>> main` 구간을 확인합니다.
2. **양쪽 코드가 모두 살아야 하는지 판단**하고 표시 3줄을 지운 뒤 정리합니다.
3. 해결한 내용을 **사용자에게 한국어로 요약**해서 보고합니다. → *"HospitalMap.tsx에서 A님의 마커 코드와 B님의 로딩 처리가 겹쳤습니다. 둘 다 남겼습니다."*
4. `git add . && git commit -m "충돌 해결"`

**남의 담당 파일에서 충돌이 났고 어느 쪽을 남길지 애매하면, 임의로 지우지 말고 멈추세요.** 사용자에게 "이건 담당자에게 확인이 필요합니다"라고 말하고 채팅방에 물어보게 하세요.

**`package-lock.json` 충돌** — 내용을 볼 필요 없습니다. 바로 이렇게:

```bash
git checkout --theirs package-lock.json
npm install
git add . && git commit -m "lock 파일 정리"
```

---

### 9.6 완전히 꼬였을 때 (새벽 4시용 탈출구)

git 상태가 이해 안 되는 지경이 되면 **원인을 찾느라 시간 쓰지 말고** Claude가 이 순서로 처리하세요.

```bash
# 1. 지금 작업물을 통째로 안전한 곳에 복사
cp -r . ../백업-$(date +%H%M)

# 2. 새 폴더에 깨끗하게 다시 받기
cd .. && git clone <레포 주소> project-new && cd project-new
npm install

# 3. 백업에서 내가 작업한 파일만 골라 덮어쓰기 (node_modules, .git 제외)
# 4. .env.local 복사
# 5. 새 브랜치 만들고 add → commit → push
```

지저분하지만 **확실하고 5분이면 끝납니다.** 해커톤에서 git을 공부할 시간은 없습니다. 사용자에게 부끄러워할 일이 아니라고 말해 주세요.

---

### 9.7 절대 하면 안 되는 것 (사람도, Claude도)

| 금지 | 이유 |
|---|---|
| `.env.local` 커밋 | Tmap 앱키·공공데이터 키 유출 |
| `git push --force` | 남의 커밋이 사라집니다. **예외 없음** |
| `main`에서 직접 코드 작성 | 배포가 깨집니다 |
| 남의 담당 파일 수정 | 충돌 제조기 |
| 8시간 몰아서 한 번에 머지 | 합쳐지지 않습니다 |
| `node_modules` 커밋 | `.gitignore` 먼저 확인 |
