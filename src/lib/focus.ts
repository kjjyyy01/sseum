/** 행의 ··· 버튼으로 포커스 — 버튼이 사라진 자리 대신. 렌더 반영 뒤 30ms */
export function focusMore(root: HTMLElement | null, rowSelector: string) {
  setTimeout(
    () => root?.querySelector<HTMLButtonElement>(`${rowSelector} [aria-haspopup]`)?.focus({ preventScroll: true }),
    30,
  );
}
