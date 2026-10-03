# 디자인 시스템 — 코드 위치 지도

값의 SSOT는 **`docs/prd/13_디자인시스템.md`** (§1 시각 토큰 · §3 모션). 이 문서는 그 값이 코드 어디에 사는지만 적는다. 둘이 다르면 PRD를 고치거나 코드를 고치고, 여기엔 적지 않는다.

| 항목 | PRD 위치 | 코드 위치 |
| ---- | ---- | ---- |
| 컬러 토큰 12종 (`--watch` `--positive` …) | §1 컬러 토큰 | `src/app/globals.css` `:root` → `@theme inline` → `bg-watch` 등 |
| 폰트 (Space Grotesk 라틴·숫자 + Pretendard 한글) | §1 폰트 | `src/app/layout.tsx` (`next/font/google` + `next/font/local`, `src/app/fonts/`) |
| 타이포 스케일 (디스플레이/본문 2계층) | §1 타이포 | 화면 클래스 `text-[clamp(…)]` — 공용 상수 없음, PRD 표가 기준 |
| 그리드·컨테이너 폭 (1120 / 760 / 640) | §1 그리드 | 각 화면 `max-w-[…]` + `px-4 md:px-8` |
| 라운드 없음 | §1 라운드 | `rounded-*` 미사용 (스피너만 `rounded-full`) |
| 브레이크포인트 | PRD-27 | Tailwind 내장 (`sm` `md`) |
| 모션 M-01~M-10 | §3.3 | `src/lib/motion/presets.ts` — 상수는 `index.ts` |
| 선숨김·스켈레톤·소형 keyframe | §3.2 규칙 2 | `globals.css` (`html.js [data-animate]`, `ss-pulse` `ss-spin` `ss-pop` `ss-rise` `ss-bump`) |
| 접근성 기본 | — | 터치 44px(`min-h-11`), `:focus-visible` 2px `--watch`, `prefers-reduced-motion`, `prefers-contrast: more` |

## 공용 컴포넌트 (`src/components/`)
`AppHeader` · `FeedbackLine` · `Toast`/`useToast` · `Spinner` — 커스텀. `components/ui/`는 shadcn 8종 — 소유 코드라 규격(각짐·토큰·44/48/56 높이)으로 고쳐 쓴다. 화면의 버튼·입력·스위치·토글·메뉴는 전부 이걸 쓴다. 예외: 대형 타이포 금액 입력(`#amount` `#f-amount` `#f-day` `#e-amount`)과 설정 확인 입력은 raw `<input>`. 아이콘은 lucide.
분리 기준: 같은 마크업이 **3번째** 쓰일 때 (PRD §2 인벤토리의 `AmountInput` `ChipGroup`은 아직 1곳).
