---
doc_id: PRD-API명세
title: API명세
version: 1.0.0
status: Approved
owner: jongyeon
last_updated: 2026-09-15
tier: Scale
---
# API 명세 (MVP §12 승계 후 상세화 — SSOT 이관)

전제: PRD-API공통규약(Server Action 반환 `ActionResult<T>`, 멱등성 키, rate limit, 401/403/404 규약). 조회(GET)는 Server Component가 `lib/queries/*.ts`로 직접 수행하며 여기서는 계약만 정의한다. `action` 열 = Server Action 함수명(`app/actions/*.ts`).

| Method | Endpoint | action / query | 인증 | 요청 필드(전체) | 응답 필드(전체) | 에러(ERR-ID) | 멱등성 |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| GET | `/api/v1/dashboard?month=YYYY-MM` | `getDashboard` | 필요 | month(기본 이번 달) | `{ watched: [{ category_id, name, week_count, month_sum, diff_vs_prev: int\|null }], summary: { month_total, fixed_cost, top3: [{ category_id, name, sum }] }, recent: [{ id, amount, category_name, spent_at, memo }] (≤5), pending_checkins: [{ subscription_id, name, month }] }` | ERR-AUTH-004, ERR-COMMON-001 | — |
| POST | `/api/v1/transactions` | `createTransaction` | 필요 | `{ amount: int, category_id: uuid, spent_at: 'YYYY-MM-DD', memo?: string, idempotency_key: uuid, via_preset: bool, tap_count: int, duration_ms: int }` | `{ id, feedback: { text_key: 'CPY-INPUT-004'\|'CPY-INPUT-005', category_name, week_count, month_sum, diff_vs_prev: int\|null, is_watched: bool } }` | ERR-TXN-001/002/004, ERR-CAT-004, ERR-AUTH-004, ERR-COMMON-001/004 | Y (idempotency_key) |
| GET | `/api/v1/transactions?month=YYYY-MM` | `getTransactionsByMonth` | 필요 | month | `{ days: [{ date, subtotal, items: [{ id, amount, category_id, category_name, memo, spent_at }] }], month_total, truncated: bool }` | ERR-AUTH-004, ERR-COMMON-001 | — |
| PATCH | `/api/v1/transactions/{id}` | `updateTransaction` | 필요 | `{ id, amount?, category_id?, spent_at?, memo? }` (1개 이상) | `{ id, updated_at }` | ERR-TXN-001/002/003/004, ERR-CAT-004, ERR-COMMON-003 | Y |
| DELETE | `/api/v1/transactions/{id}` | `deleteTransaction` | 필요 | `{ id }` | `{ id }` | ERR-TXN-003, ERR-COMMON-003 | Y |
| GET | `/api/v1/presets` | `getPresets` | 필요 | — | `{ presets: [{ category_id, category_name, amount, count }] }` (≤4, BR-007) | ERR-AUTH-004 | — |
| GET | `/api/v1/categories` | `getCategories` | 필요 | `{ include_archived?: bool }` | `{ categories: [{ id, name, is_watched, is_system, status, last_used_at: date\|null }] }` 최근 사용순 | ERR-AUTH-004 | — |
| POST | `/api/v1/categories` | `createCategory` | 필요 | `{ name, idempotency_key }` | `{ id, name }` | ERR-CAT-002/003, ERR-COMMON-004 | Y |
| PATCH | `/api/v1/categories/{id}` | `updateCategory` | 필요 | `{ id, name?, is_watched?, status? }` | `{ id, name, is_watched, status, watched_count }` | ERR-CAT-001/002/003/004/005, ERR-COMMON-003 | Y |
| GET | `/api/v1/subscriptions` | `getSubscriptions` | 필요 | — | `{ subscriptions: [{ id, name, amount, billing_day, category_id, status, this_month_checkin: bool\|null, needs_cancel_review: bool }], fixed_cost }` | ERR-AUTH-004 | — |
| POST | `/api/v1/subscriptions` | `createSubscription` | 필요 | `{ name, amount, billing_day, category_id?, idempotency_key }` | `{ id }` | ERR-SUB-002/004, ERR-TXN-001(amount 재사용), ERR-CAT-004 | Y |
| PATCH | `/api/v1/subscriptions/{id}` | `updateSubscription` | 필요 | `{ id, name?, amount?, billing_day?, status?: 'CANCELLED' }` | `{ id, status }` | ERR-SUB-002/003/004, ERR-COMMON-003 | Y |
| POST | `/api/v1/subscriptions/{id}/checkins` | `submitCheckin` | 필요 | `{ subscription_id, month: 'YYYY-MM', used: bool, from_screen: 'HOME'\|'SUB' }` | `{ id, needs_cancel_review: bool }` | ERR-SUB-001/003, ERR-COMMON-003 | Y (UNIQUE) |
| POST | `/api/v1/auth/magic-link` | `sendMagicLink` | 불필요 | `{ email, next?: string }` | `{ sent: true }` | ERR-AUTH-001/002/005 | N (rate limit) |
| GET | `/auth/callback?code=` | Route Handler | 불필요 | code | 302 → `/` 또는 `/login?consent=1` (동의 없음) 또는 `next` | — | — |
| POST | `/api/v1/consents` | `recordConsent` | 필요 | `{ terms_version, privacy_version, over_14: true }` | `{ agreed_at }` | ERR-AUTH-006, ERR-AUTH-004 | Y (동일 버전 재기록은 무시) |
| POST | `/api/v1/auth/logout` | `signOut` | 필요 | — | `{ ok }` → 302 `/login` | — | Y |
| DELETE | `/api/v1/account` | `deleteAccount` | 필요 | `{ email_confirm }` | `{ deleted: true }` → 302 `/login?deleted=1` | ERR-ACC-001/002, ERR-COMMON-004 | Y (1회 후 세션 없음) |

## 화면 ↔ API 매핑 (정합성 검사 2)
| SCR | 로드 | 액션 |
| ---- | ---- | ---- |
| SCR-001 | getDashboard | submitCheckin |
| SCR-002 | getCategories, getPresets | createTransaction |
| SCR-003 | getTransactionsByMonth, getCategories | updateTransaction, deleteTransaction |
| SCR-004 | getCategories(include_archived) | createCategory, updateCategory |
| SCR-005 | getSubscriptions, getCategories | createSubscription, updateSubscription, submitCheckin |
| SCR-006 | — (SSG) | sendMagicLink, recordConsent, /auth/callback |
| SCR-007 | 세션 이메일 | signOut, deleteAccount |

## 공통 요청 규칙
- 모든 Server Action은 첫 줄에서 `getUser()`로 세션 확인 → 없으면 `ERR-AUTH-004`. 동의 확인은 미들웨어가 담당(BR-011), 액션은 재확인하지 않는다(rate_limits·consents 제외).
- zod 스키마는 `lib/schemas.ts`에 액션당 1개, 클라이언트 폼도 동일 스키마 사용.
- `getDashboard` 집계는 SQL 1회(`rpc('dashboard', { month })` Postgres 함수) — N+1 금지. 함수는 `security invoker`로 RLS 적용.
