/** 금액 → "12,340원". 카운트업 중 매 프레임 호출된다 */
export const krw = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

/** 전월 대비 횟수 차 → "+2회" / "−1회" / "±0회" (− 는 U+2212) */
export const diffLabel = (d: number) =>
  `${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.abs(d)}회`;
