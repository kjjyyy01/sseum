import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(useGSAP, Flip);

/** 이징 — PRD-디자인시스템 §3.2 규칙 5 */
export const EASE = {
  out: "power2.out", // 기본
  strong: "power3.out", // 시트 진입
  back: "back.out(1.7)", // FAB 강조
} as const;

/** duration 상한 0.6s (랜딩 M-09만 1.2s) */
export const DUR = {
  enter: 0.4, // M-01 등장
  count: 0.6, // M-02 카운트업
  sheetIn: 0.35, // M-04 시트 진입
  sheetOut: 0.25, // M-04 시트 퇴장
  phrase: 0.3, // M-04 문구
  fab: 0.4, // M-06
  collapse: 0.3, // M-08 접힘
  swapOut: 0.15, // M-05 이전 달 퇴장
  swapIn: 0.35, // M-05 새 달 진입
  pulse: 0.2, // M-04 펄스 (왕복 0.4s)
  shake: 0.3, // M-10
} as const;

/** stagger 합계 0.8s 이내 */
export const STAGGER = {
  list: 0.06, // M-01 — md+ 에서만
  phrase: 0.08, // M-04 문구 3구절
} as const;

/** M-04 자동 퇴장까지 대기 (ms) */
export const FEEDBACK_HOLD_MS = 2500;

export const prefersReduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 색 보간 대상에 var()를 직접 주면 환경에 따라 실패할 수 있어 실제 값으로 푼다 */
export const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export { Flip, gsap, useGSAP };
