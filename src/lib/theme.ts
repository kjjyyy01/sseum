/*
 * 화면 테마 — 데이터(sseum:v1)와 분리된 키.
 * 첫 페인트 전 적용은 layout.tsx THEME_INIT이 맡는다.
 * ponytail: "시스템"은 OS 변경을 새로고침 때 반영 — 실시간이 필요하면 matchMedia change 리스너
 */

export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "sseum:theme";

/** 저장된 선택 — 없거나 못 읽으면 시스템 */
export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/** 저장 + html[data-theme] 즉시 반영 */
export function setTheme(t: Theme) {
  try {
    if (t === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {
    // 저장 실패해도 이번 화면엔 적용한다
  }
  const light = t === "light" || (t === "system" && matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.dataset.theme = light ? "light" : "dark";
}
