# 품질 규칙 — 중점 축: 애니메이션·비주얼 (GSAP)

2026-09-14 확정(OQ-005). 우선 원칙: **모션 vs LCP·입력 10초(H-03) 충돌 시 속도 승.**
모션 규칙 원문은 `docs/prd/13_디자인시스템.md` §3 — 거기가 SSOT, 여기는 체크리스트.

## 절대 규칙 (§3.2 요약 — 위반 = 버그)
1. LCP 요소는 가시 상태로 시작 (홈 첫 카드 / 내역 첫 그룹 / 입력 금액 필드)
2. 초기 숨김은 CSS가 아니라 GSAP — 예외는 `html.js [data-animate]` 조합뿐, LCP엔 금지
3. `prefers-reduced-motion` → 즉시 완료 상태
4. 입력 경로(SCR-002)에 블로킹 모션 없음. 피드백은 응답 **후**, 재생 중에도 즉시 닫힘
5. duration ≤ 0.6s, stagger 합 ≤ 0.8s
6. transform·opacity만. 크기·위치 변화는 Flip
7. `will-change` 수동 지정 금지
8. stagger는 md+ 에서만

## 화면 완료 4항목 (PLAN §4)
- [ ] 데스크톱 1280 · 모바일 390 렌더 확인
- [ ] 7개 화면 상태 중 해당 상태 동작 (빈/로딩/오류/오프라인)
- [ ] 키보드: 포커스 이동·Esc·포커스 복원
- [ ] 콘솔 에러 0, `npm run build && npm run lint && npm run check`

## 폴리싱 체크 (PRD §3.5)
- [ ] LCP 트레이스에서 첫 페인트 가시 확인
- [ ] JS 비활성 시 전 콘텐츠 가시
- [ ] reduce-motion 에뮬레이션에서 카운트업·시트·stagger 즉시 — **미검증**
- [ ] 라우트 20회 왕복 후 트윈 누수 없음
- [ ] 입력 3탭 경로에 Long Task 없음
