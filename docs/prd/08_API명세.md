---
doc_id: PRD-API명세
title: API명세
version: 1.1.0
status: Approved
owner: jongyeon
last_updated: 2026-09-27
tier: Lite
---
# API 명세 — `src/lib/store.ts` (SSOT)

전제: PRD-API공통규약(쓰기 = `true`/`false`, 예외 미전파). 에러 코드는 PRD-에러코드_카탈로그.

## 읽기
| 함수 | 입력 | 반환 | 비고 |
| ---- | ---- | ---- | ---- |
| `useDb()` | — | `Db \| null` | React 훅. 서버·하이드레이션 첫 렌더는 `null` |
| `getDb()` | — | `Db` | 이벤트 핸들러에서 방금 저장한 값으로 계산할 때 |
| `exportJson()` | — | `string` | 백업 JSON |

## 쓰기
| 함수 (v1.0.0 액션명) | 입력 | 반환 | 규칙 |
| ---- | ---- | ---- | ---- |
| `createTransaction` | `{ amount, categoryId, date, memo }` | `boolean` | memo trim(BR-016), `createdAt` 자동 |
| `updateTransaction` | `id, { amount?, categoryId?, date?, memo? }` | `boolean` | — |
| `deleteTransaction` | `id` | `boolean` | 하드 삭제(BR-003) |
| `createCategory` | `name` | `string \| null` | "기타" 앞에 삽입 |
| `updateCategory` | `id, { name?, watched?, archived? }` | `boolean` | 보관 시 watched=false(BR-014) |
| `createSubscription` | `{ name, amount, day, categoryId }` | `boolean` | 거래 자동 생성 없음(BR-006) |
| `cancelSubscription` | `id, month` | `boolean` | v1.0.0 `updateSubscription({status:'CANCELLED'})` |
| `submitCheckin` | `subscriptionId, month, used` | `boolean` | (구독, 월)당 1개, 다시 답하면 덮어씀(BR-008) |
| `clearAll` | — | `boolean` | 키 삭제 → 시드로 재시작(BR-012). v1.0.0 `deleteAccount` 대체 |
| `importJson` | `text` | `boolean` | 형식 검사 후 통째로 교체 |

## 계산 (순수 함수 — PRD-도메인규칙 §계산 규칙)
`countThisWeek` · `sumThisMonth` · `diffVsPrevMonthToDate` · `fixedCost` · `derivePresets` · `needsReview` · `checkinOf` · `addMonth` · `todayStr`

## 폐기 (v1.0.0 → 없음)
`sendMagicLink` · `/auth/callback` · `recordConsent` · `signOut` · `getPresets`·`getCategories`·`getSubscriptions`(화면이 `useDb()` 스냅샷에서 직접 계산) · `getDashboard`(→ `selectHome`, `app/_components/home-dashboard.tsx`)

## 화면 ↔ 함수 매핑 (정합성 검사 2)
| SCR | 읽기·계산 | 쓰기 |
| ---- | ---- | ---- |
| SCR-001 | `useDb` → `selectHome`(countThisWeek·sumThisMonth·diffVsPrevMonthToDate·fixedCost·checkinOf) | submitCheckin |
| SCR-002 | `useDb` → 최근 사용순 카테고리·derivePresets, 저장 후 `getDb` | createTransaction |
| SCR-003 | `useDb` → 월 필터·일자 그룹 | updateTransaction, deleteTransaction |
| SCR-004 | `useDb` → 이번 달 횟수 | createCategory, updateCategory |
| SCR-005 | `useDb` → checkinOf·fixedCost | createSubscription, cancelSubscription, submitCheckin |
| SCR-007 | `useDb` → 건수·고정비, exportJson | clearAll, importJson |
