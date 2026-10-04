/** 금액 → "12,340원". 카운트업 중 매 프레임 호출된다 */
export const krw = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

/** 전월 대비 횟수 차 → "+2회" / "−1회" / "±0회" (− 는 U+2212) */
export const diffLabel = (d: number) =>
  `${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.abs(d)}회`;

/** 금액 입력값 → 숫자만, 앞자리 0 제거, 최대 9자리 */
export const amountDigits = (v: string) => v.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);

/** 숫자 문자열 → "12,340" (입력 필드 표시용, 빈 값은 그대로) */
export const amountText = (digits: string) => (digits ? Number(digits).toLocaleString("ko-KR") : "");

/** Date.getDay() 인덱스 → 한글 요일 */
export const WD = ["일", "월", "화", "수", "목", "금", "토"];
