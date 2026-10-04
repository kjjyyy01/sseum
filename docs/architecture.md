# 아키텍처

1인용 · 서버 없음 · 데이터는 브라우저 localStorage. 코드가 SSOT이며 이 문서는 지도다.

## 라우트 (`src/app/`)
| 경로 | SCR | 렌더 | 비고 |
| ---- | ---- | ---- | ---- |
| `/` | 001 홈 | ○ 정적 | 체크인 카드 · 감시 카드 · 월 합계 · 최근 |
| `/input` | 002 입력 | ○ | 핵심 접점. 피드백 M-04 |
| `/transactions` | 003 내역 | **ƒ 동적** | `?month=YYYY-MM` 읽어 정규화·리다이렉트, `loading.tsx` |
| `/categories` | 004 카테고리 | ○ | 내비 밖. 홈 CTA·설정에서 진입 |
| `/subscriptions` | 005 구독 | ○ | |
| `/settings` | 007 설정 | ○ | 데이터 지우기 · JSON 백업 |

"정적"이어도 화면 본체는 Client Component라 데이터는 클라이언트에서 읽는다. 서버 `page.tsx`는 라우트·메타데이터·쿼리 정규화만.

## Server / Client 경계
```
page.tsx (서버)            ← 쿼리 정규화·redirect·metadata. 데이터 접근 없음
 └ _components/*.tsx (클라) ← "use client". useDb()로 구독, store 함수로 쓰기
    ├ components/app-header  ← 내비 + FAB(M-06)
    ├ components/feedback-line ← M-04 시트 (입력 화면)
    └ components/toast · spinner
```

## 데이터 흐름 — `src/lib/store.ts` 한 파일
- 저장: localStorage 키 `sseum:v1`, JSON 1개 `{ version, categories, txns, subs, checkins }`
- 읽기: `useDb()` → `useSyncExternalStore`. 서버·하이드레이션 전엔 `null`(화면은 빈 상태로 대기). `storage` 이벤트로 탭 간 동기화
- 쓰기: `createTransaction` `updateTransaction` `deleteTransaction` `createCategory` `updateCategory` `createSubscription` `cancelSubscription` `submitCheckin` `clearAll` `importJson` — PRD v1.0.0 Server Action 이름 그대로. DB로 바꿀 때 내부만 교체
- 계산(순수 함수): `countThisWeek` `sumThisMonth` `diffVsPrevMonthToDate` `derivePresets` `needsReview` `fixedCost` 등. `pnpm check`(`store.check.ts`, node:assert)로 규칙 자가 점검
- 첫 실행 시드 카테고리 7개 (BR-017)

**규칙: 화면은 store 밖에서 localStorage를 만지지 않는다.**

## 모션 — `src/lib/motion/`
- `index.ts`: GSAP·Flip 등록, `EASE`·`DUR`·`STAGGER` 상수, `prefersReduced`, `cssVar`
- `presets.ts`: M-01~M-10 함수. **숫자는 여기만** — 화면에 duration 하드코딩 금지 (PRD-디자인시스템 §3.4)
- 화면은 `useGSAP(..., { scope })`로만 호출. 이벤트 핸들러 트윈은 `contextSafe`
- 선숨김은 `html.js [data-animate]{opacity:0}` + `fromTo`(from은 0→0이 됨). reduce는 `revealInstant`
- 카탈로그 밖 소형 모션(메뉴 팝·확인바·카운터 튐·접힘)은 CSS keyframe/transition — `globals.css`

## 스타일
Tailwind v4 + `shadcn/tailwind.css` + `tw-animate-css`. 토큰은 `globals.css` `:root` CSS 변수(shadcn 시맨틱 이름) → `@theme inline`. 값의 SSOT는 `docs/prd/13_디자인시스템.md` §1. 전역 `:focus-visible`은 `@layer base`(유틸리티가 덮어쓸 수 있게).

## 외부 의존성
`next` `react` `gsap` `@gsap/react` + **shadcn/ui**(radix 베이스, `components/ui/` — Button·Input·Textarea·Label·Switch·Toggle·DropdownMenu·Drawer, 전부 우리 규격으로 수정됨) + **lucide-react**. 바텀시트 3곳(구독 추가·내역 편집(모바일)·설정 삭제)은 `components/ui/drawer.tsx`(vaul 래퍼, 우리 시트 규격으로 수정). shadcn 시맨틱 변수(`--primary` 등)에 우리 토큰을 매핑 — 다크 고정, `--radius: 0`. 아이콘은 lucide(`Plus` `X` `ChevronDown` `MoreHorizontal` `ChevronLeft/Right` `ArrowRight`).
