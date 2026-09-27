---
doc_id: PRD-API공통규약
title: API공통규약
version: 1.1.0
status: Approved
owner: jongyeon
last_updated: 2026-09-27
tier: Lite
---
# API 공통규약 — 저장소 함수

## 구현 형태
- 서버 API 없음. PRD-API명세의 각 행은 `src/lib/store.ts`의 함수 1개에 대응한다.
- 함수명은 v1.0.0 Server Action 이름을 그대로 쓴다. DB 전환 시 같은 이름의 Server Action으로 바꾸고 호출부는 `await`만 추가한다.
- 화면은 localStorage를 직접 만지지 않는다. 읽기는 `useDb()`(구독) 또는 `getDb()`(이벤트 핸들러 즉시 읽기), 쓰기는 액션 함수.

## 인증·인가: 없음 (단일 사용자)
## 응답 포맷
- 쓰기 함수는 **성공 `true` / 실패 `false`** 를 돌려준다(예외를 밖으로 던지지 않음). 예외: `createCategory`는 성공 시 새 id, 실패 시 `null`.
- 실패 원인은 localStorage 쓰기 예외(용량 초과·사생활 보호 모드 등) 하나뿐 → `ERR-STORE-001`.
## 검증
- 입력 검증은 화면 폼에서 한다(PRD-도메인규칙 BR 표). 저장소가 직접 강제하는 것은 메모 trim, 보관 시 감시 해제, 체크인 (구독, 월) 1개뿐.
## 동시성·멱등성
- 쓰기는 동기 호출 1회로 끝나므로 중복 요청·재시도 개념이 없다. `idempotency_key` 미사용.
- 다른 탭에서 쓰면 `storage` 이벤트로 이 탭의 스냅샷이 갱신된다. 두 탭이 거의 동시에 쓰면 나중 쓰기가 이긴다(1인용이라 허용).
## Rate limit·타임아웃·오프라인: 해당 없음 (네트워크 미사용)
## 갱신
- 쓰기 성공 → 캐시 스냅샷 교체 → `useDb()` 구독 화면 재렌더. 집계는 렌더마다 스냅샷에서 다시 계산(캐시 없음).
