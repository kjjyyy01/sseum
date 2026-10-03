# 작업 이력

## 2026-09-14 — 런칭 플랜 + MVP 기획서 초안 (make-plan)

- **무엇을**: `PLAN.md`(실행 스캐폴드)와 `MVP-기획서.md`(v0.1.0 Draft, Scale) 생성
- **어떻게**: `~/Downloads/가계부-아이디어-스케치.md`를 입력으로 make-plan Step 1~5 수행. SCR 7개, F 11개, BR 13개, H 3개, ADR 5개. 도구 생태계는 현재 세션에 설치된 스킬·플러그인·MCP로 채움. 렌더링 전략(SSG/SSR/CSR, ISR 미사용)을 MVP §7·§14, PLAN 위생 기준에 고정
- **왜**: 스케치 §8 다음 단계. make-prd가 소비할 표준 규격 유지
- **결과**: ID 무결성 검사 통과(미정의 참조 없음). 기간 산정(N)·§1 산출물 4종·L1~L5 확정은 사용자 답 대기 → PLAN.md 상단 "산정 차단 항목", MVP OQ-004·005

## 2026-09-14 — PRD 생성 (make-prd)

- **무엇을**: `docs/prd/` 에 SSOT 문서 28개(01~28, 빈 번호 없음) + 화면 문서 7개(SCR-001~007) 생성. 전부 status Draft, tier Scale
- **어떻게**: spec-common v1.1 승계 매핑대로 MVP §1·4·5·7·9·10·11·12·13·16·17·19·20·22를 승계 후 상세화. Server Action을 1차 인터페이스로, REST 경로는 계약 식별자로 고정. 렌더링 전략(SSG 공개 3라우트 / 동적 SSR / CSR 리프 / ISR 미사용)을 공통규약·정보구조·환경 문서에 기록. GSAP 모션 규칙(M-01~M-10, 절대 규칙 8개)을 디자인시스템 문서를 SSOT로 정의
- **왜**: 사용자 지시 "GSAP 적극 활용" → 중점 축을 애니메이션·비주얼로 확정(MVP OQ-005 해소, v0.1.1). MVP는 아직 Draft이나 사용자 지시로 선행 진행(OQ-008)
- **결과**: 정합성 검사 9항목 통과 — 파일 번호 연속, 색인 1:1, 미정의 참조 0(오타 1건 수정), enum 1:1, 권한 행↔TC 매핑, P0 REQ 12개 전부 자동화 TC 보유, 티어 반증 없음. 타인 리소스는 RLS 특성상 403 대신 404로 규약(공통규약에 명시)

## 2026-09-15 — 전체 승인

- **무엇을**: MVP-기획서 v1.0.0 및 PRD 35개 문서 status Draft → Approved
- **어떻게**: 프론트매터 일괄 갱신, OQ-008 해소, PLAN.md·공통규약 참조 갱신
- **왜**: 사용자 "전체 승인" — make-prd 변환 게이트·구현 진입 게이트 통과
- **결과**: 구현 에이전트 진입 가능. 단 기간 산정(N)과 OQ-001·002·004·007은 여전히 미확정

## 2026-09-17 — SCR-001 홈 대시보드 구현 (claude.ai/design → Next.js)

- **무엇을**: Next.js 16 스캐폴드 + `src/app/page.tsx`(SCR-001) 구현. claude.ai/design 프로젝트 `sseum`의 `sseum Home.dc.html`을 이식
- **어떻게**: DesignSync MCP 읽기 메서드로 `.dc.html` 원문 조회. `{{ }}`→JSX, `<sc-for>`→`.map()`, `<sc-if>`→조건부 렌더, `style-hover`→Tailwind `hover:`로 변환. 인라인 색상 6종은 `globals.css`의 CSS 변수 토큰(`--watch`·`--positive`·`--negative` 등)으로 승격. 디자인 원본의 Web Animations API는 PRD-디자인시스템 §3이 SSOT이므로 GSAP+`useGSAP`으로 재작성하고 M-01·M-02·M-04·M-06·M-08을 `lib/motion/presets.ts`에 분리. 목업 데이터는 서버 컴포넌트(`page.tsx`)에 격리해 Supabase 교체 지점을 한 곳으로 고정
- **왜**: 사용자 지시 — 디자인 파일이 시각 기준, PRD가 모션 기준. 파일럿 1화면으로 나머지 6개 화면의 변환 패턴을 확정하기 위함
- **결과**: build·lint 통과. 데스크톱/모바일(390px) 렌더 및 5개 화면 상태(loaded/empty/loading/error/offline) 동작 확인. M-04 피드백·M-08 체크인 퇴장 실동작 검증. 버그 2건 수정 — ① `html.js [data-animate]{opacity:0}` 선숨김과 `gsap.from`이 충돌(from은 현재값 0을 도착점으로 삼음) → `fromTo`로 도착점 명시, reduce 경로에 `m01Instant` 추가 ② `js` 클래스 인라인 스크립트로 인한 하이드레이션 불일치 → `<html suppressHydrationWarning>`
- **미해결**: PRD-디자인시스템 §1과 디자인 파일의 타이포 스케일·라운드 불일치(아래 "결정 필요" 참조). shadcn/ui·lucide-react는 이 화면에 사용처가 없어 미설치

## 2026-09-17 — PRD-디자인시스템 §1 개정 (v1.0.0 → v1.0.1)

- **무엇을**: `docs/prd/13_디자인시스템.md` §1 기반 표의 6개 행(폰트·그리드·스페이싱·타이포·컬러 토큰·라운드)을 디자인 파일 실측값으로 교체. 문서 SSOT 선언 범위를 "모션 규칙"에서 "시각 토큰(§1)과 모션 규칙(§3) 양쪽"으로 확장
- **어떻게**: claude.ai/design 프로젝트의 5개 화면(Home·Settings·Categories·Login·Input) 원문을 DesignSync로 조회해 타이포 스케일·컨테이너 폭·색상·라운드를 집계 후 반영. 주요 변경 — ① 폰트에 Space Grotesk(라틴·숫자) 추가 ② 컨테이너 폭을 화면 성격별로 분리(대시보드·랜딩 1120 / 입력 760 / 관리·설정 640) ③ 타이포를 디스플레이(월 헤더 clamp(4rem,14vw,8rem) 등)와 본문 2계층으로 재정의 ④ **컬러 토큰을 "라이트 고정"에서 "다크 고정"으로 정정하고 12개 토큰의 실제 hex 명시** ⑤ 라운드를 "카드 16px·칩 999px"에서 "없음(0), 예외는 스피너 원형"으로 변경
- **왜**: 사용자 확인 — "PRD 기준으로 했을 때 디자인이 마음에 안 들어 바꾼 것"이므로 디자인 파일이 최신 의도다. 기존 §1은 SCR-001 구현과 정면으로 어긋난 채 Approved 상태로 남아 있었고, 방치하면 나머지 6개 화면이 문서를 보고 다른 방향으로 만들어질 위험이 있었다
- **결과**: 코드(`src/app/globals.css` 토큰 12종, `layout.tsx` 폰트, `home-dashboard.tsx` 타이포·라운드)와 문서가 일치. 표 구조·frontmatter 검증 통과. **§1의 "라이트 고정"은 단순 불일치가 아니라 명백한 오류였다** — 디자인은 처음부터 다크(#161310)였다
- **미해결**: ① Transactions(SCR-003)·Subscriptions(SCR-005) 2개 화면은 미조회 — 리스트형이라 Categories와 유형이 겹쳐 생략했으나, 구현 시 새 값이 나오면 §1에 반영 필요 ② §2 컴포넌트 인벤토리는 미수정 — BottomSheet(vaul)·Toast(sonner) 지정이 실제 구현(자체 시트·자체 토스트)과 다르나 이는 시각 토큰이 아닌 구현 수단이라 별건으로 남김

## 2026-09-17 — SCR-006 랜딩·로그인 구현 (claude.ai/design → Next.js)

- **무엇을**: `/login` 라우트(SSG) — `page.tsx`(서버·메타데이터·히어로·푸터) + `_components/login-main.tsx`(모션 스코프·데모 카드) + `_components/login-form.tsx`(URL 파라미터·이메일/발송완료/동의 3모드·배너). `lib/motion`에 ScrollTrigger 등록, M-09·M-10 프리셋 추가. `tally`·`prefersReduced`를 공용으로 이동(Home도 교체)
- **어떻게**: ① `useSearchParams`는 정적 트리에서 서브트리를 CSR로 빼내므로(Next 문서) 배너·폼 두 `<Suspense>` 섬으로 격리하고 H1 히어로는 섬 바깥에 둠 → 빌드 산출물 `login.html`에 H1·폼·데모 최종값 포함 확인. 폼 섬의 fallback은 같은 마크업(비활성)이라 정적 HTML에도 폼이 보임 ② 개발용 상태 스위처는 `?state=` 링크로 구현해 두 섬이 같은 파라미터를 읽음(`NODE_ENV=development`에서만 인식) ③ 데모 카드 숫자는 React 상태 없이 GSAP 타임라인 `onUpdate`가 `textContent`에 직접 씀 — SSR 텍스트는 최종값, 뷰포트 진입(top 80%) 시 0에서 재생, 총 1.2s ④ `?next=`는 `/`로 시작하고 `//`가 아닐 때만 허용(오픈 리다이렉트 차단) ⑤ 이벤트 핸들러의 M-10 흔들기는 `useGSAP().contextSafe`로 감쌈
- **왜**: 사용자 지시(디자인 파일 지목). 시각은 디자인, 모션은 PRD §3 — 디자인의 H1 줄 단위 페이드는 PRD 규칙 1(LCP 가시 시작)·M-09 명시에 따라 제외. 디자인의 IntersectionObserver 대신 PRD가 지정한 ScrollTrigger 사용
- **결과**: build(`/login` ○ Static)·lint·tsc 통과. 데스크톱 1280/모바일 390 렌더 확인. 브라우저 실동작 검증 — 형식 오류(문구·aria-invalid·포커스·M-10) / 발송 중 라벨 / 발송 완료 + 60초 카운트다운 + 첫 활성 버튼 포커스 / 이메일 변경 프리필 / 동의 미체크 오류 → 체크 → 저장 중 → `/` 리다이렉트 / `?next=//evil.com` 차단 / 동의 서버 오류 배너·재시도 가능 / 레이트리밋 문구 / SMTP 오류 시 입력값 보존 / 오프라인 배너·비활성. 콘솔 에러 0, 하이드레이션 경고 0
- **디자인에서 벗어난 것**: ① H1 애니메이션 제외(PRD) ② **모바일 이메일 폼 — 원본은 버튼이 줄바꿈되면 옆에 래퍼 배경 빈칸이 남는다(원본도 동일). `sm` 미만에서 버튼을 전체 폭으로 내려 보정.** 디자인 파일 자체는 미수정 ③ 발송 완료 블록 진입 페이드(디자인엔 있으나 PRD 카탈로그에 없어 생략)
- **미해결**: 실제 오프라인 감지(`navigator.onLine`) 미구현 — Supabase 연결 시 공용 훅으로. `/terms` `/privacy` 라우트 부재(404). reduce-motion 실동작은 도구 한계로 미검증. `login-form.tsx`가 320줄로 커서 3모드 분리 후보 — 3번째 폼 화면 나올 때 판단

## 2026-09-17 — SCR-002 빠른 입력 구현 (claude.ai/design → Next.js)

- **무엇을**: `/input` — `page.tsx`(서버 · 카테고리·프리셋 목업) + `_components/quick-input.tsx`(폼 전체). **`components/feedback-line.tsx` 공용 분리**(PRD §2 `FeedbackLine`) — Home의 M-04 데모도 이걸로 교체(707→613줄). `m04Feedback`에 정자 작대기 stagger 추가, `diffLabel`에 ±0 케이스
- **어떻게**: ① 카테고리 탭 = 저장(금액 유효 시), 아니면 선택만 — 힌트 문구가 상태를 안내 ② 프리셋 1탭 즉시 저장 ③ 다음 입력 시작·프리셋 탭 시 진행 중 피드백 즉시 퇴장(`useImperativeHandle`로 `dismiss` 노출) ④ 피드백은 포커스를 뺏지 않고 금액 필드로 재포커스(연속 입력, H-03) ⑤ 접힘 영역은 CSS `grid-template-rows 0fr→1fr` 전환 + 닫힘 시 `inert` ⑥ "오늘"은 `useSyncExternalStore`로 클라이언트에서만 계산(SSG 빌드 시각이 박히는 것 방지) ⑦ 금액 입력 `field-sizing-content` + `inputmode=numeric`, 9자리·앞자리 0 제거
- **왜**: 사용자 지시. 핵심 접점(FLOW-001)이라 M-04가 실데이터로 처음 도는 화면. 접힘 애니메이션은 PRD 카탈로그에 없어 GSAP 대신 CSS 2줄로
- **결과**: build(`/input` ○)·lint·tsc 통과. 플로우 검증 — 금액 8000+배달 탭 → 저장 중 → 피드백(감시 강조·3번째·84,500원·+2회·정자 3획) → 폼 초기화·재포커스 / 입력 시작 시 퇴장 / 프리셋 커피 → 비감시 피드백 / 카테고리 없이 저장 → 토스트 / 금액 0 → 오류 / 빈 금액 카테고리 탭 → 선택만 / 메모 101자+미래 날짜 → 접힘 자동 펼침 + 오류 2건. 데스크톱·모바일 390 렌더 확인. Home 데모 회귀 통과. 콘솔 에러 0
- **수정 2건**: ① `react-hooks/refs` — `contextSafe` 클로저 안 ref 읽기를 React Compiler가 거부 → 클로저 생성을 effect로 이동 ② **전역 `:focus-visible` 외곽선이 `outline-none` 유틸리티를 이김**(레이어 없는 규칙 > `@layer utilities`) → `@layer base`로 이동. Login 이메일 입력도 같은 문제였음
- **미해결**: 실제 오프라인 감지·idempotency_key·tap_count/duration_ms 계측(EVT-TXN-001)은 Server Action 연결 시. `AmountInput`·`ChipGroup`·`Toast` 공용 분리는 SCR-003/004에서 2번째 사용처가 나올 때. 서버 오류 뷰는 첫 저장만 실패하는 목업

## 2026-09-17 — SCR-005 구독 관리 구현 (claude.ai/design → Next.js)

- **무엇을**: `/subscriptions` — `page.tsx`(서버 · 구독·카테고리 목업) + `_components/subscriptions.tsx`. **공용 부품 4개 신설**(PRD §2 인벤토리, 3번째 사용처 도달): `components/app-header.tsx`(내비 + 입력 FAB M-06) · `toast.tsx`(`useToast`+`Toast`) · `spinner.tsx` · `BottomSheet`는 PRD 지정대로 **vaul 1.1.2 설치**. Home·Input·Login을 공용 부품으로 교체. `m08CheckinExit` → `flipRows`(onEnter 추가)로 일반화
- **어떻게**: ① 체크인 Y/N → 상태 라벨 + 해지 검토 배지(BR-010: 이번 달·직전 달 연속 미사용) ② ··· 메뉴(첫 항목 포커스, Esc·Tab·바깥 클릭 닫기) → 인라인 확인바(확인 버튼 포커스, Esc 취소) → 해지 → **`data-flip-id`로 이력 섹션까지 Flip 이동**, 고정비 M-02 재계산, 토스트, 포커스는 이력 토글로 ③ 추가 시트는 vaul(포커스 트랩·Esc·스크림·드래그 닫기 내장) + `onOpenAutoFocus`로 이름 필드, `onCloseAutoFocus`로 추가 버튼 복원 ④ 고정비 카운트업은 React 상태 없이 GSAP `onUpdate`가 DOM에 직접 ⑤ 메뉴·확인바·상태 라벨 등장은 CSS keyframe(`ss-pop`·`ss-rise`) — PRD 카탈로그 밖 모션이라 GSAP 미개입 ⑥ 이력 접힘은 Flip 측정과 충돌하지 않게 전환 없이 조건부 렌더
- **왜**: 사용자 지시. 헤더·토스트·스피너·시트가 이 화면에서 3번째 중복이 되어 분리 시점(3회 규칙) 도달. vaul은 직접 짜면 ~50줄(포커스 트랩·스크롤 잠금·드래그)인데 설정·내역 화면도 시트를 써서 설치가 더 싸다
- **결과**: build(`/subscriptions` ○)·lint·tsc 통과. 플로우 검증 — 체크인 사용/미사용(배지·토스트·포커스) / 메뉴 열기·Esc·바깥 클릭 / 해지 → 이력 Flip(총액 49,690→41,800, 이력 2, 포커스 이력 토글) / 시트: 빈 제출 오류 3건 → 유효 저장 → 닫힘 + 새 행 + 총액 59,590 → 포커스 추가 버튼 / 서버 오류 시 시트 유지 + 입력 보존 / 빈·로딩·오류→재시도·오프라인 상태. Home(헤더·FAB·토스트·M-04)·Input(토스트·스피너) 회귀 통과. 데스크톱·모바일 390 렌더 확인. 콘솔 에러 0
- **수정 1건**: 시트 닫은 뒤 포커스가 추가 버튼으로 안 돌아옴 — Radix는 자기 `Drawer.Trigger`로 열었을 때만 복원. `onCloseAutoFocus`에서 `[data-add]`로 직접 복원
- **미해결**: `aria-modal`은 vaul이 안 붙임(Radix가 바깥을 `aria-hidden` 처리하므로 동등). 해지 확인바·메뉴 퇴장 애니메이션 없음(조건부 렌더). `AppHeader`의 M-06은 라우트마다 재생 — `app/(app)/layout.tsx` 생기면 거기로 이동

## 2026-09-17 — SCR-004 카테고리·감시 대상 구현 (claude.ai/design → Next.js)

- **무엇을**: `/categories` — `page.tsx`(서버 · 카테고리 12개 목업) + `_components/categories.tsx`. `lib/focus.ts`(`focusMore` — 구독과 공용화), `strokesIn` 프리셋(M-04·히어로 작대기 공용), `AppHeader.current` 선택 속성화(내비 밖 화면)
- **어떻게**: ① 감시 토글은 PRD대로 **낙관적 전환 + 실패 시 롤백**(toggle5xx 뷰로 검증) ② 5/5 도달 시 나머지 토글은 `disabled` 대신 **`aria-disabled` + 탭하면 토스트** — PRD AC-2의 "disabled 선제 차단"보다 디자인 방식이 포커스·툴팁을 유지해 접근성이 낫고 차단 효과는 같음 ③ 카운터 `n/5`는 `key={n}`으로 span을 교체해 CSS keyframe(`ss-bump`)이 값 변경마다 재생 — JS 없음 ④ 메뉴는 화살표 순환·Esc 복원·Tab·바깥 클릭 닫기, "기타"는 보관 항목 대신 `aria-disabled` 안내 ⑤ 이름 변경은 인라인 폼(진입 시 전체 선택, Esc 취소), 중복은 보관 포함 전체와 대소문자 무시 비교 ⑥ 추가는 "기타" 앞에 삽입 후 M-01 등장, 입력 포커스 유지(연속 추가) ⑦ 보관(BR-014: 감시 해제 강제) ⇄ 복원은 `data-flip-id` Flip 이동, 포커스는 보관 토글 / 복원된 행의 스위치로
- **왜**: 사용자 지시. 히어로 작대기 등장과 M-04 작대기가 같은 모션이라 프리셋 1개로 통합
- **결과**: build(`/categories` ○)·lint·tsc 통과. 검증 — 토글 3→5(캡 5개·"5/5" 라벨·히어로 작대기 5개 금색)→캡 탭 토스트→해제 / 메뉴 ArrowDown 순환·Esc 포커스 복원 / 이름 변경: 진입 시 전체 선택·중복 오류·저장 토스트·포커스 ··· / 추가: 빈 값 오류·기타 앞 삽입·입력 유지 / 보관→보관됨 3·포커스 토글 / 기타 보관 불가 안내 / 복원→스위치 포커스 / toggle5xx 낙관적 전환 후 450ms 롤백+토스트 / full·noactive 뷰. 구독 회귀(`focusMore` 교체) 통과. 데스크톱·모바일 390 렌더, 콘솔 에러 0
- **미해결**: 카운터 튐이 첫 마운트에도 1회 재생됨(무해). 메뉴·이름 변경 폼 퇴장 애니메이션 없음. 이번 달 횟수(`month`)는 서버 집계 예정

## 2026-09-17 — 개발용 상태 스위처 제거 (전 화면)

- **무엇을**: 5개 화면 상단의 "SCR-00N · state" 리뷰용 스위처 제거. 스위처만 쓰던 `VIEWS`·`switchView`·`DEV_STATES`와 Home의 "▶ M-04 feedback" 데모 버튼·`FeedbackLine` 사용 제거(Home 545→504줄 등 총 −155줄)
- **어떻게**: 정규식 일괄 편집 후 잔여 참조 grep. `view` 상태 자체와 빈/로딩/오류/오프라인 분기는 실데이터 연결 시 쓰이므로 유지 — Home·Input은 `setView`가 사라져 `const [view] = useState`로, 구독·카테고리는 `retryLoad`가 써서 유지. 로그인의 `?state=` 파라미터 파싱은 화면에 보이지 않아 남김(개발 환경에서만 인식)
- **왜**: 사용자 요청 — 모든 페이지에 보이던 영역 제거
- **결과**: lint·build 통과. 5개 라우트 서버 HTML에서 스위처 문자열 0건, 렌더 정상. 이후 화면 상태 검증은 스위처 대신 목업 데이터 교체나 DOM 스크립트로 수행

## 2026-09-26 — SCR-003 지출 내역 · SCR-007 설정·계정 구현 (claude.ai/design → Next.js)

- **무엇을**: `/transactions`(동적 SSR, `?month=YYYY-MM`) — `page.tsx`(month 정규화·목업) + `_components/transactions.tsx`. `/settings` — `page.tsx`(목업·피드백 URL 환경변수 `FEEDBACK_URL`) + `_components/settings.tsx`. `presets.ts`에 `m05Out`·`m05In`(월 전환)·`m08RowOut`(행 퇴장) 추가, `DUR.swapOut·swapIn`
- **어떻게**: ① 월 선택기는 `<Link href>`라 JS 없이도 이동, JS 있으면 M-05 퇴장 → `router.push` → 새 SSR 결과로 M-05 진입. 연타는 `swapTarget` 누적 + `overwrite`로 마지막 목표만 유효(엣지 #4) ② 형식 오류·미래 month는 서버에서 `redirect`(AC-2) ③ 편집은 md+ 우측 sticky 패널 / 모바일 vaul 시트 — `useSyncExternalStore(matchMedia)`로 한 곳에만 렌더 ④ 변경 없으면 저장 비활성, 다른 달로 옮기면 M-08 퇴장 후 목록에서 제거(엣지 #1) ⑤ 삭제는 인라인 2단계 확인, Esc는 확인만 먼저 취소 ⑥ 설정 삭제 시트는 대소문자·공백 무시 이메일 비교, 불일치여도 `aria-disabled`라 눌러서 오류 문구를 받음, 처리 중 닫기 불가(`dismissible=false`)
- **왜**: 사용자 지시 — 남은 UI 2개 화면. 모션은 PRD §3(M-05는 Flip 대신 교체 전후가 다른 DOM이라 퇴장/진입 트윈 2단)
- **결과**: build(`/transactions` ƒ, `/settings` ○)·lint·tsc 통과. 브라우저 검증 — 수정(금액 0 비활성·저장 중·행 갱신·토스트·포커스 복원) / 미래 날짜·메모 101자 오류 / 8월로 옮기기 → 행 퇴장 / 삭제 확인 포커스·Esc 확인만 취소·삭제 / 월 전환·연타(9→8→6월)·빈 달 / `?month=2099-01`·`abc` 리다이렉트 / 모바일 390 시트(포커스·저장·Esc·포커스 복원) / 설정: 시트 Esc·포커스 복원·불일치 오류·일치 힌트·삭제 중 닫기 무시·`/login?deleted=1` / 로그아웃 → `/login`. 데스크톱 1280·모바일 390 렌더, 콘솔 에러 0
- **미해결**: 월 전환 Loading 스켈레톤(라우터 전환 중)은 `loading.tsx` 미작성 — 목업은 즉시 응답. 오프라인·편집 5xx·삭제 5xx 분기는 `view` 상태로만 존재(실데이터 연결 시 사용). 2,000행 truncated 배너는 서버 값 연결 시. `/terms`·`/privacy` 여전히 404

## 2026-09-26 — SCR-003 로딩 스켈레톤 (loading.tsx + 월 전환 대기)

- **무엇을**: `app/transactions/loading.tsx`(헤더 + 월 자리 + 그룹 스켈레톤 3개), `_components/day-group-skeleton.tsx`(재시도·라우트 로딩 공용 분리). 월 전환은 `useTransition`의 `isPending` 동안 같은 자리에 스켈레톤
- **어떻게**: 1.5초 지연을 임시로 넣어 실측 — ① 다른 탭 → 내역 진입 시 `loading.tsx` 표시 확인 ② **`?month=`만 바뀌는 `router.push`는 트랜지션이라 `loading.tsx`가 뜨지 않고 이전 UI를 유지**(목록이 opacity 0인 빈 화면이 1.5초 지속) → `startTransition(router.push)`로 감싸 `isPending`이면 목록·합계 대신 스켈레톤, 헤더 월 숫자는 목표 월로 즉시 교체. M-05 모션 대상은 PRD대로 리스트만(h1 제외). 빈 달에서 이동 시 퇴장 대상이 없어 push가 막히는 경우를 가드
- **왜**: 사용자 요청. 실데이터 연결 시 SSR 대기가 생기므로 두 경로 모두 필요
- **결과**: tsc·lint·build 통과. 지연 상태에서 9→8월(스켈레톤 1.4s → 8월 10건), 8→7월(빈 달) → 8월 복귀, 홈 → 내역 진입(loading.tsx → 27건) 확인. 임시 지연 제거 확인

## 2026-09-27 — 저장 방식 전환: Supabase → localStorage (1인용) + PRD v1.1.0

- **무엇을**: 목업 데이터를 걷어내고 전 화면을 브라우저 localStorage 실데이터로 연결. 로그인(`/login`)·로그아웃·계정 삭제 제거, 설정에 "모든 데이터 지우기" + JSON 백업 내보내기·가져오기 추가. PRD 35건 v1.1.0(티어 Scale → Lite), CLAUDE.md·PLAN.md·MVP-기획서에 결정 기록
- **어떻게**: ① `src/lib/store.ts` 1파일 — 키 `sseum:v1`에 JSON 1개, `useSyncExternalStore` 구독 + `storage` 이벤트로 탭 동기화, 첫 실행 시드 7개(BR-017). 함수명은 PRD v1.0.0 Server Action 이름 그대로(`createTransaction` 등) — DB 전환 시 내부만 교체. 쓰기는 `true/false`(localStorage 예외만 실패) ② 계산 규칙(주=월요일, 전월 동기간·말일 보정, 프리셋 BR-007, 해지 검토 BR-010, 고정비)을 순수 함수로 두고 `npm run check`(`store.check.ts`, node:assert) 자가 점검 ③ 각 화면은 `useDb()`가 null(서버·하이드레이션)이면 렌더 생략, 목업 `setTimeout`·가짜 오프라인/5xx 분기·`busy` 상태 제거. 퇴장 애니메이션이 있는 삭제·다른 달 이동은 "퇴장 → 저장, 실패 시 행 복원" 순서 ④ 헤더에서 이메일·오프라인 배너 제거, 로그인 전용 M-09 프리셋·ScrollTrigger 제거 ⑤ `tsconfig`에 `allowImportingTsExtensions`(noEmit이라 무해) — node가 `.ts` import를 직접 실행
- **왜**: 사용자 결정 "나만 사용할 서비스라 localStorage로, 규모를 키우면 DB". 인증 없이는 RLS 전제의 DB 연결이 불가능했고, 1인용이면 서버가 필요 없음
- **결과**: tsc·lint·build·`npm run check` 통과(`/transactions`만 ƒ). 빈 저장소에서 브라우저 검증 — 홈 빈 상태 / 입력: 시드 7개·카테고리 탭 저장·피드백("이번 주 3번째, 누적 28,000원")·최근 사용순·프리셋 등장과 1탭 저장 / 카테고리: 감시 토글·추가("기타" 앞)·중복 오류·보관(감시 해제)·복원 / 구독: 추가(기본 "구독")·홈 체크인 카드 응답·해지 / 홈 합계(거래 36,000 + 고정비 17,000 → 하루 평균 2,038원) / 내역: 수정·다른 달 이동·삭제 / 설정: 내보내기 파일명·확인어 불일치 오류·전체 지우기(시드 복귀)·가져오기 확인 후 복원·잘못된 파일 거부 / `/login` 404. 콘솔 에러 0
- **수정 1건**: 마지막 구독을 해지하면 빈 상태가 되면서 해지 이력까지 사라짐(원래 코드부터 있던 버그, 실데이터에서 드러남) → 이력 섹션을 빈 상태와 분리하고 M-01 선숨김을 풀어 줌
- **미해결**: iOS Safari 7일 미방문 시 localStorage 삭제(ITP) — 홈 화면 추가 + 수동 백업으로 대응, 안내 방식은 OQ-009. 백업 가져오기에서 형식 오류와 저장 실패를 같은 문구로 보임. 저장소 읽기 전 첫 프레임은 빈 화면. `/login` 구현 코드는 커밋 전이라 git에 남지 않음 — 복원 기준은 SCR-006 문서뿐

## 2026-10-03 — PLAN §0 사전 세팅 정리

- **무엇을**: `.gitignore`에 `.serena/` `graphify-out/` 추가. `backlog.md`(Phase 2 제외 9건 + 개선 7건 + 컷된 SCR-006 + 발동 조건부 4건). `docs/architecture.md`(라우트 렌더 모드·Server/Client 경계·store 데이터 흐름·모션 규칙), `docs/design-system.md`(PRD-13 값의 코드 위치 지도), `docs/quality-rules.md`(§3.2 절대 규칙 8개 + 완료 4항목 체크리스트), `docs/tasks.md`(SCR 현황). PLAN §0 체크박스 4개 완료 표시, CLAUDE.md에 Git 전략·문서 위치
- **어떻게**: 문서는 값을 복제하지 않고 PRD를 SSOT로 가리키는 지도 형식. shadcn·lucide 항목은 "미사용 — 커스텀 토큰" 사유로 취소선. 인프라 항목은 9/27 Lite 전환 기록대로 Supabase·Sentry·PostHog 비대상 표기
- **왜**: 사용자 요청. 구현이 먼저 끝나 §0 문서가 사후 작성됐지만, PLAN §4·§6이 이 문서들을 참조한다
- **결과**: 미커밋 잔여 `.gitignore`만. §0 중 사용자 결정 대기 4건: 시작일 역산(N 미확정) / 도구 off 목록 / 도메인·Vercel 배포 여부 / 기록 시스템(Notion EOD·Obsidian TIL) 확인
- **10/03 추가 결정**: 배포 함(Vercel, 도메인은 §7) / 시작일 = 첫 구현일 2026-09-17, 실작업일은 history 날짜로 집계(현재 4일) / 외부 기록 시스템(Notion·Obsidian) 하지 않음 — history.md 단일. 도구 off는 설명 후 결정 대기

- **10/03 도구 off**: `.claude/settings.json` `skillOverrides`로 무관 스킬 62개 비활성화(보안 테스트 8 · SEO 25 · Notion tasks 4 · claude-mem:do · 미선택 디자인 미학 24). 프로젝트 범위, 되돌리려면 항목 삭제

## 2026-10-03 — shadcn/ui + lucide 도입 (A·B 단계)

- **무엇을**: `shadcn init`(radix-nova) → `components/ui/button·input·drawer`, `lib/utils.ts`(cn). `lucide-react`로 글리프 아이콘 8파일 교체(`×`→X, `↓`→ChevronDown, `···`→MoreHorizontal, `←→`→Chevron, 링크 `→`→ArrowRight, `+`→Plus). vaul 직접 호출 3곳 → shadcn `Drawer` 래퍼
- **어떻게**: init이 `globals.css`를 **라이트 흰 배경·Geist·라운드 0.625rem**으로 덮어쓴 것을 되돌려, shadcn 시맨틱 변수(`--primary`=watch, `--popover`=밝은 면, `--input`=placeholder, `--radius: 0`)에 우리 토큰을 매핑. 안 쓰는 chart·sidebar·`.dark` 블록 제거, `layout.tsx`의 Geist 제거. `drawer.tsx`는 소유 코드이므로 시트 규격(다크 배경·3px 상단선·90vh·핸들 없음·오버레이 surface-dim/60)으로 수정 — 사용처는 중복 클래스만 제거
- **왜**: 사용자 결정 "shadcn·lucide 사용". 범위는 A(설치·테마·아이콘) + B(Drawer)까지, C(Switch·DropdownMenu 등 직접 짠 ARIA 위젯 교체)는 보류
- **결과**: build·lint·check 통과. 브라우저 — 배경 #161310·Space Grotesk·라운드 0 유지, 시트 규격 유지, 이름 필드 포커스·닫은 뒤 추가 버튼 복원, 아이콘 렌더(plus·ellipsis·chevron-down). 콘솔 경고 1건: 빈 상태에서 `GSAP target [data-animate='M-01'] not found`(이번 변경과 무관, backlog)
- **미해결(C 단계 후보)**: 직접 짠 `role=switch`·`role=menu`·칩 토글을 shadcn `Switch`·`DropdownMenu`·`Toggle`로 교체할지. 기존 `<button>`들을 `Button` 컴포넌트로 통일할지
