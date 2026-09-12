# CLAUDE.md — 전북 의료공백 지도

> 이 파일은 팀원 3명이 **각자의 Claude 계정**에서 같은 규칙으로 작업하기 위한 공유 설정입니다.
> 프로젝트 루트에 `CLAUDE.md`로 두세요. 내용을 임의로 바꾸면 3명의 코드가 갈라집니다.
> 수정이 필요하면 팀 채팅방에 먼저 공유하고 모두 같이 교체하세요.

---

## 0. Claude 행동 규칙 (가장 먼저 읽을 것)

- **답변은 한국어로.** 코드 주석도 한국어.
- **24시간 해커톤입니다.** 완벽한 설계보다 동작하는 배포본이 우선입니다.
- **요청하지 않은 기능을 추가하지 마세요.** "이것도 있으면 좋을 것 같아서" 금지.
- **테스트 코드를 작성하지 마세요.** 시간이 없습니다.
- **아래 §4 API 계약과 §3 타입 정의를 임의로 바꾸지 마세요.** 3명이 동시에 작업 중이라 시그니처가 바뀌면 머지가 깨집니다. 변경이 필요하면 코드를 고치지 말고 "이건 팀에 공유하고 바꿔야 합니다"라고 먼저 말하세요.
- **새 라이브러리를 함부로 추가하지 마세요.** §2에 없는 패키지를 쓰려면 먼저 물어보세요.
- **에러 처리는 반드시 넣으세요.** 외부 API가 죽어도 화면은 살아있어야 합니다. 심사 중에 흰 화면이 뜨면 끝입니다.
- 파일을 새로 만들기 전에 §3 디렉토리 구조를 확인하고 이미 있는 파일에 넣으세요.
- **팀원 3명 전원이 팀 프로젝트와 git이 처음입니다. git 명령은 설명하지 말고 §9에 따라 Claude가 직접 실행하세요.**

---

## 1. 프로젝트

전북특별자치도 14개 시군의 **야간·휴일 의료공백**을 드러내는 웹 서비스.

밤 10시에 아이가 열이 나도 군 지역에는 갈 곳이 없습니다. 이 앱은 "지금 갈 수 있는 곳"을 찾아주는 동시에, **"지금 이 시군에는 진료 가능 기관이 몇 곳인가"** 라는 숫자로 문제 자체를 보여줍니다.

**대상 지역 (14개, 이 밖은 다루지 않음)**
전주시 · 군산시 · 익산시 · 정읍시 · 남원시 · 김제시 · 완주군 · 진안군 · 무주군 · 장수군 · 임실군 · 순창군 · 고창군 · 부안군

**화면 3개. 이게 전부입니다.**

| | 화면 | 설명 |
|---|---|---|
| ① | 지금 문 연 곳 | 내 위치 기준 거리순 리스트 + 전화 걸기 |
| ② | 응급실 실시간 병상 | 전북 응급의료기관 가용병상 |
| ③ | 시군별 의료공백 현황 | 지금 진료 가능한 기관 수 — **발표의 핵심** |

**구현하지 않는 것 (제안도 하지 마세요)**
로그인 · 회원가입 · 즐겨찾기 · 리뷰/평점 · 관리자 페이지 · 푸시 알림 · 채팅 · 예약 · 다국어 · 다크모드 토글 · PWA

---

## 2. 기술 스택 (변경 금지)

```
Next.js 15 (App Router) + TypeScript
Tailwind CSS
Supabase (Postgres)
Vercel (배포)
fast-xml-parser  ← 공공 API 응답이 XML이라 필수
```

**Vite / CRA 등 SPA는 쓸 수 없습니다.** 이유는 §4 함정 2·3번을 보세요. 서버 사이드 프록시가 반드시 필요합니다.

지도 라이브러리는 **쓰지 않습니다.** 리스트 + 거리 표시로 갑니다. (③번 화면은 지도 없이 시군 그리드로)

### 환경변수 (이름 고정)

```bash
DATA_GO_KR_KEY=            # 공공데이터포털 '디코딩' 키. 절대 NEXT_PUBLIC_ 금지
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # 서버 전용. 절대 NEXT_PUBLIC_ 금지
```

---

## 3. 구조와 타입

```
app/
  page.tsx                   # ① 지금 문 연 곳
  er/page.tsx                # ② 응급실 병상
  coverage/page.tsx          # ③ 시군별 의료공백
  api/
    facilities/route.ts      # 기관 목록 (Supabase 캐시에서)
    er/route.ts              # 응급실 실시간 (공공 API 직접)
    coverage/route.ts        # 시군별 집계
    sync/route.ts            # 공공 API → Supabase 적재 (수동 호출)
lib/
  types.ts                   # ← 공용 타입. 임의 변경 금지
  openHours.ts               # ← 영업 판정 단일 진입점. 임의 변경 금지
  supabase.ts
  dataGoKr.ts                # 공공 API 호출 + XML 파싱 래퍼
  sigungu.ts                 # 14개 시군 상수
components/
```

### lib/types.ts

```ts
export type Kind = 'ER' | 'HOSPITAL' | 'PHARMACY';

/** 요일별 진료시간. 키 1=월 … 7=일, 8=공휴일. s/c는 "0900" 형식 */
export type DutyTime = Record<string, { s: string; c: string }>;

export interface Facility {
  id: string;          // 공공데이터 hpid
  name: string;
  kind: Kind;
  sigungu: string;     // §1의 14개 중 하나
  address: string | null;
  tel: string | null;
  erTel: string | null;
  lat: number | null;
  lng: number | null;
  dutyTime: DutyTime;
  distanceKm?: number; // 위치 제공 시에만
  isOpen?: boolean;    // 서버에서 판정해서 내려줌
}

export interface ErBed {
  id: string;
  name: string;
  sigungu: string;
  tel: string | null;
  generalTotal: number | null;   // 응급실 일반 병상 기준
  generalAvail: number | null;
  updatedAt: string | null;      // 공공 API가 준 갱신시각
}

export interface Coverage {
  sigungu: string;
  total: number;     // 등록 기관 수
  openNow: number;   // 지금 진료 가능
  erCount: number;   // 응급의료기관 수
}
```

### lib/openHours.ts — 영업 판정은 여기서만

```ts
/** 이 함수 하나만 씁니다. 각 화면에서 따로 시간 계산하지 마세요. */
export function isOpenAt(dutyTime: DutyTime, at: Date): boolean;
```

규칙:
- 요일 인덱스는 월=1 … 일=7, 공휴일=8. **공휴일이면 8번을 우선 적용**합니다.
- 공휴일은 `lib/openHours.ts` 안에 **상수 배열로 하드코딩**합니다. 특일정보 API 붙이지 마세요.
- `"0900"` 형식 문자열을 분 단위 정수로 바꿔 비교합니다.
- 자정을 넘기는 경우(`c < s`)를 처리하세요. 24시간 기관은 `0000`~`2400`으로 들어옵니다.
- 값이 없거나 파싱 실패하면 **`false`** 를 반환합니다. "열려있을 수도 있음"으로 처리하면 안 됩니다. 헛걸음이 이 앱이 막으려는 문제입니다.

### Supabase 스키마

```sql
create table facilities (
  id          text primary key,
  name        text not null,
  kind        text not null check (kind in ('ER','HOSPITAL','PHARMACY')),
  sigungu     text not null,
  address     text,
  tel         text,
  er_tel      text,
  lat         double precision,
  lng         double precision,
  duty_time   jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);
create index facilities_sigungu_idx on facilities (sigungu);
create index facilities_kind_idx    on facilities (kind);
```

---

## 4. 외부 API — 읽지 않으면 반드시 시간을 날립니다

### 아키텍처 원칙

> **기관 기본정보는 Supabase 캐시에서, 응급실 실시간 병상만 공공 API 라이브 호출.**

매 요청마다 공공 API를 호출하지 마세요. 느리고, 일일 한도에 걸리고, 심사 중에 죽습니다. `/api/sync`로 한 번 적재한 뒤에는 DB만 읽습니다.

### 엔드포인트

```
# 응급의료 (국립중앙의료원) — 개발·운영 모두 자동승인
http://apis.data.go.kr/B552657/ErmctInfoInqireService/
  getEgytListInfoInqire                  # 응급의료기관 목록
  getEmrrmRltmUsefulSckbdInfoInqire      # 응급실 실시간 가용병상  ← ②번 화면
  getSrsillDissAceptncPosblInfoInqire    # 중증질환 수용가능

# 병·의원 기본정보 (건강보험심사평가원) — 개발계정만 자동승인, 1만건/일
http://apis.data.go.kr/B551182/hospInfoServicev2/
```

심평원은 **운영계정이 심의승인**이라 24시간 안에는 못 받습니다. 개발계정 키로 배포합니다. 하루 1만 건이면 충분합니다.

### 반드시 알아야 할 함정 6개

**1. `SERVICE_KEY_IS_NOT_REGISTERED_ERROR`**
인코딩키와 디코딩키를 섞어 쓴 것입니다. 우리는 **디코딩키**를 `DATA_GO_KR_KEY`에 넣고 `URLSearchParams`로 붙입니다. 절대 디코딩키를 문자열에 직접 이어붙이지 마세요.

```ts
// ✅ 이렇게
const qs = new URLSearchParams({ serviceKey: process.env.DATA_GO_KR_KEY!, /* … */ });
const url = `${BASE}/${op}?${qs}`;

// ❌ 이러면 실패
const url = `${BASE}/${op}?serviceKey=${process.env.DATA_GO_KR_KEY}&…`;
```

**2. Mixed Content 차단**
공공 API는 평문 `http://`입니다. HTTPS로 배포된 페이지의 브라우저에서 직접 호출하면 차단됩니다. **반드시 `app/api/**/route.ts` 서버 라우트를 거칩니다.**

**3. CORS 미지원**
공공 API는 CORS 헤더를 주지 않습니다. 2번과 같은 결론 — 클라이언트 컴포넌트에서 `apis.data.go.kr`을 직접 `fetch`하는 코드를 절대 쓰지 마세요.

**4. 응답이 XML**
`_type=json`을 받지 않는 오퍼레이션이 많습니다. `fast-xml-parser`로 파싱하고, 파싱 로직은 `lib/dataGoKr.ts` 한 곳에만 둡니다.

**5. 지역명 불일치**
`STAGE1` 파라미터에 `전북특별자치도`로 조회해서 결과가 비면 **`전라북도`로도 시도**하세요. 도명 개편 이후 데이터가 섞여 있습니다. `lib/dataGoKr.ts`에서 두 값을 순서대로 시도하는 폴백을 넣으세요.

**6. 빈 응답이 정상 응답처럼 옵니다**
`items`가 비어도 HTTP 200입니다. `resultCode`를 확인하고, 항목이 1개일 때 배열이 아니라 객체로 오는 경우도 처리하세요.

```ts
const list = Array.isArray(items?.item) ? items.item : items?.item ? [items.item] : [];
```

---

## 5. API 계약 (프론트·백엔드 공용 — 변경 금지)

```
GET /api/facilities?sigungu=&kind=&lat=&lng=&openOnly=true
  → { items: Facility[], total: number }
     lat/lng이 있으면 distanceKm 채워서 거리순 정렬

GET /api/er
  → { items: ErBed[], fetchedAt: string }

GET /api/coverage
  → { items: Coverage[], at: string }

POST /api/sync
  → { inserted: number, updated: number }
     공공 API → Supabase 적재. 개발 중 수동 호출용
```

모든 라우트는 실패 시 **200과 빈 배열**을 반환하고 `error` 필드를 함께 내려줍니다. 500을 던져서 화면을 죽이지 마세요.

```ts
return NextResponse.json({ items: [], total: 0, error: '일시적으로 정보를 불러오지 못했습니다' });
```

---

## 6. 역할 분담

| | 담당 | 브랜치 접두사 |
|---|---|---|
| **A** | 화면 3개 (`app/page.tsx`, `er/`, `coverage/`, `components/`) | `feat/a-` |
| **B** | API 라우트 · `lib/dataGoKr.ts` · Supabase · 배포 · **패키지 설치** | `feat/b-` |
| **C** | `lib/openHours.ts` · `lib/sigungu.ts` · 데이터 정제 → **T+12부터 발표 전담** | `feat/c-` |

- `main`에 머지되면 Vercel이 자동 배포됩니다. **`main`은 항상 배포 가능한 상태로 유지하세요.**
- **2시간마다 `main`으로 머지합니다.** 몰아서 하면 안 합쳐집니다.
- 남의 담당 파일을 고치지 마세요. 필요하면 팀 채팅방에 말하세요.
- **`npm install`은 B만 합니다.** 나머지는 필요한 패키지를 채팅방에 말하고, B가 설치해 올리면 받아 씁니다. (`package-lock.json` 충돌 방지)

---

## 7. 마감 규칙

- **T+19시 기능 프리즈.** 이후 새 기능 추가 금지. 데모 시나리오를 막는 버그만 고칩니다.
- 프리즈 이후 Claude가 리팩터링이나 개선을 제안하면 무시하세요.

### 배포 완료 판정

- [ ] 프로덕션 URL이 외부망에서 열린다
- [ ] 폰 브라우저(LTE)에서 정상 동작한다
- [ ] `DATA_GO_KR_KEY`와 `SUPABASE_SERVICE_ROLE_KEY`가 클라이언트 번들에 없다
- [ ] 외부 API가 죽어도 화면이 안 죽는다
- [ ] 위치 권한을 거부해도 시군 직접 선택으로 쓸 수 있다
- [ ] QR 스캔 → 3초 안에 첫 화면
- [ ] 동시 접속 10명을 견딘다

---

## 8. UI 원칙

- **모바일 우선.** 심사위원은 폰으로 엽니다.
- 전화번호는 `tel:` 링크로. 군 지역에서는 이게 가장 중요한 기능입니다.
- 로딩 중에는 스켈레톤. 흰 화면 금지.
- 결과가 0건일 때 빈 화면을 두지 말고 **"장수군은 지금 진료 가능한 기관이 없습니다"** 라고 명시하세요. 그게 이 프로젝트가 말하려는 바입니다.
- 숫자는 `tabular-nums`로 정렬합니다.

---

## 9. Git — Claude가 직접 실행합니다

### 9.0 Claude에게 주는 지시

이 팀은 **3명 전원이 팀 프로젝트도, git도 처음**입니다. 아래대로 행동하세요.

- **git 명령어를 설명하지 말고 직접 실행하세요.** 사용자에게 복사·붙여넣기를 시키지 마세요.
- **`git add`와 `git commit`은 물어보지 말고 알아서 하세요.** 의미 있는 작업 단위가 끝날 때마다(파일 2~3개 수정, 기능 하나 완성, 버그 하나 수정) 바로 커밋합니다. 메시지는 한국어 한 줄. (`응급실 병상 카드 추가`)
- **`git push` · PR 생성 · `main` 머지는 한 줄로 확인받고** 실행하세요. ("GitHub에 올릴까요?")
- 실행한 뒤에는 **무슨 일이 일어났는지 한 줄로** 알려주세요. → *"feat/a-list에 커밋했습니다. 아직 GitHub엔 안 올라갔어요."*
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
> "이 프로젝트에서 A(화면) / B(API·배포) / C(데이터·발표) 중 어느 담당이세요?"

답을 받으면 `.myrole` 파일에 한 글자(`A`)만 저장하고, `.gitignore`에 `.myrole` 줄을 추가하세요.

**있으면** — 읽어서 담당을 파악하고, `git status`·`git branch`로 현재 상태를 확인한 뒤 **지금 뭘 하면 되는지 한 줄로** 알려주세요.

---

### 9.2 레포를 처음 만드는 사람 (1명만, 딱 한 번)

**사용자가 직접 해야 하는 것** — 이것만 안내하고 기다리세요.

1. GitHub → **New repository** → 이름 `jb-medical-gap` → **Private** → Create
2. 만들어진 레포 → **Settings → Collaborators → Add people** → 팀원 2명의 GitHub 아이디 초대
3. 레포 주소(`https://github.com/…/jb-medical-gap.git`)를 Claude에게 알려주기

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
> "레포 준비됐습니다. 팀원들에게 **① 초대 수락하기 ② 레포 주소 ③ `.env.local` 내용을 채팅방에 공유**해 주세요."

---

### 9.3 합류하는 사람 (2명, 딱 한 번)

사용자에게 레포 주소를 묻고, Claude가 실행합니다.

```bash
git clone <레포 주소> .
npm install
```

> ⚠️ GitHub 초대를 수락하지 않으면 여기서 권한 오류가 납니다. 오류가 나면 "GitHub 알림 또는 메일에서 초대를 먼저 수락해 주세요"라고 안내하세요.

그다음 사용자에게:
> "팀 채팅방에 있는 `.env.local` 내용을 붙여넣어 주세요. 제가 파일로 만들어 드릴게요."

받으면 Claude가 `.env.local`을 생성합니다. **이 파일은 절대 커밋하지 마세요.**

---

### 9.4 작업 사이클 (계속 반복)

#### ① 작업 시작할 때 — Claude가 실행

```bash
git checkout main
git pull
git checkout -b feat/a-list      # 접두사는 .myrole에 맞춰서
```

브랜치 이름은 담당 접두사 + 짧은 영어 (`feat/b-er-api`, `feat/c-openhours`).

#### ② 작업하는 동안 — Claude가 알아서

작업 단위가 끝날 때마다 **묻지 말고** 실행:

```bash
git add .
git commit -m "병원 리스트 거리순 정렬"
```

#### ③ 합칠 때 (2시간마다) — Claude가 순서대로 실행

```bash
# 1. 내 작업 저장
git add . && git commit -m "..."

# 2. main 최신 내용을 내 브랜치로 먼저 가져온다  ★이 순서를 절대 바꾸지 마세요★
git checkout main
git pull
git checkout feat/a-list
git merge main

# 3. 충돌 없으면 올린다  (여기서 사용자에게 확인)
git push -u origin feat/a-list
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
3. 해결한 내용을 **사용자에게 한국어로 요약**해서 보고합니다. → *"page.tsx에서 A님의 리스트 코드와 B님의 로딩 처리가 겹쳤습니다. 둘 다 남겼습니다."*
4. `git add . && git commit -m "충돌 해결"`

**남의 담당 파일에서 충돌이 났고 어느 쪽을 남길지 애매하면, 임의로 지우지 말고 멈추세요.** 사용자에게 "이건 담당자에게 확인이 필요합니다"라고 말하고 채팅방에 물어보게 하세요. 잘못 지우면 그 사람의 몇 시간이 사라집니다.

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
cd .. && git clone <레포 주소> jb-medical-gap-new && cd jb-medical-gap-new
npm install

# 3. 백업에서 내가 작업한 파일만 골라 덮어쓰기 (node_modules, .git 제외)
# 4. .env.local 복사
# 5. 새 브랜치 만들고 add → commit → push
```

지저분하지만 **확실하고 5분이면 끝납니다.** 해커톤에서 git을 공부할 시간은 없습니다. 사용자에게 이 방법을 부끄러워할 일이 아니라고 말해 주세요.

---

### 9.7 절대 하면 안 되는 것 (사람도, Claude도)

| 금지 | 이유 |
|---|---|
| `.env.local` 커밋 | 공공데이터 키·Supabase 키 유출 |
| `git push --force` | 남의 커밋이 사라집니다. **예외 없음** |
| `main`에서 직접 코드 작성 | 배포가 깨집니다 |
| 남의 담당 파일 수정 | 충돌 제조기 |
| 8시간 몰아서 한 번에 머지 | 합쳐지지 않습니다 |
| `node_modules` 커밋 | `.gitignore` 먼저 확인 |
