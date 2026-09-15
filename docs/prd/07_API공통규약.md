---
doc_id: PRD-API공통규약
title: API공통규약
version: 1.0.0
status: Approved
owner: jongyeon
last_updated: 2026-09-15
tier: Scale
---
# API 공통규약

## 구현 형태
- **1차 인터페이스 = Next.js Server Actions** (`app/actions/*.ts`, `"use server"`). PRD-API명세의 각 행은 Server Action 1개에 대응한다(함수명 = 명세의 `action` 열).
- REST 경로(`/api/v1/...`)는 계약 식별자다. Route Handler 노출은 선택(외부 클라이언트 필요 시), 노출 시 동일 스키마.
- 조회는 Server Component에서 Supabase 서버 클라이언트로 직접 수행(§9.1 "페이지 로드"). CSR에서 데이터 fetch 금지.

## 버저닝: /api/v1
## 인증: Supabase Auth 세션 쿠키(httpOnly) — 수명주기는 PRD-보안및프라이버시가 SSOT
## 인증·인가 실패 규약
- 401 `ERR-AUTH-004`: 미인증. 미들웨어가 `/login?next={path}`로 리다이렉트. Server Action 내부에서는 에러 반환 후 클라이언트가 동일 이동.
- 403 `ERR-AUTH-003`: 동의 미완료. `/login?consent=1`로 이동.
- 404 `ERR-COMMON-003`: 타인 리소스(RLS로 비가시). 존재 여부 비노출.
## 응답 포맷 (Server Action 반환값 — 예외 throw 금지)
```ts
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; field?: string } }
```
`code`는 PRD-에러코드_카탈로그의 ERR-ID. `message`는 PRD-UX카피사전의 CPY-ID로 해석한 문구. 내부 정보(스택·쿼리·Supabase 원문) 노출 금지 — 서버 로그(Sentry)에만.
## 검증: zod 스키마를 Server Action 진입부에서 실행. 클라이언트도 동일 스키마 재사용(`lib/schemas.ts`).
## 페이징: 월 단위 조회만 존재 — 페이징 없음. 월당 최대 2,000행 상한(초과 시 최신 2,000 + Partial 상태).
## 멱등성
- 생성(POST transactions·subscriptions·categories·checkins): 클라이언트가 `idempotency_key`(UUID v4)를 폼 상태에 1회 생성해 전달. 서버는 `(user_id, idempotency_key)` UNIQUE로 중복 저장 방지(PRD-데이터모델). 재시도 시 동일 키 → 기존 행 반환.
- PATCH·DELETE: 자연 멱등.
## Rate limit
| 대상 | 기준 | 한도 | 초과 |
| ---- | ---- | ---- | ---- |
| 매직링크 발송 | 이메일 | 3회 / 5분 (BR-013) | 429 `ERR-AUTH-002` |
| 쓰기 Server Action 전체 | 사용자 | 60회 / 분 | 429 `ERR-COMMON-004` |
| 계정 삭제 | 사용자 | 1회 / 10분 | 429 `ERR-COMMON-004` |
구현: Supabase `rate_limits` 테이블 카운터(PRD-데이터모델) — 외부 KV 의존 없음.
## 타임아웃·재시도
- Server Action 내 Supabase 호출 타임아웃 8s. 5xx·타임아웃 → `ERR-COMMON-001`. 클라이언트 자동 재시도 없음(사용자 재시도 버튼). 오프라인(`navigator.onLine=false`) 시 액션 호출 자체를 막고 `ERR-COMMON-002` 표시.
## 갱신
성공 시 `revalidatePath('/')` + 해당 화면 경로. 대시보드 집계는 항상 재계산(캐시 없음).
