import { DUR, EASE, Flip, STAGGER, cssVar, gsap, prefersReduced } from "./index";

type Targets = gsap.TweenTarget;

/**
 * M-01 카드·리스트 등장. stagger는 md+ 에서만 (규칙 8).
 * `html.js [data-animate]{opacity:0}`로 선숨김된 요소라 from이 아니라 fromTo다 —
 * from은 현재 값(=0)을 도착점으로 잡아 0→0이 된다
 */
export function m01Enter(targets: Targets, staggered = false) {
  return gsap.fromTo(
    targets,
    { y: 12, autoAlpha: 0 },
    {
      y: 0,
      autoAlpha: 1,
      duration: DUR.enter,
      ease: EASE.out,
      stagger: staggered ? STAGGER.list : 0,
    },
  );
}

/** reduce 시 등장 모션을 즉시 완료 상태로 대체 (규칙 3). 선숨김 해제 책임 포함 */
export function revealInstant(targets: Targets) {
  return gsap.set(targets, { y: 0, autoAlpha: 1 });
}

export const M01 = "[data-animate='M-01']";

/**
 * 화면 M-01 등장 — reduce면 즉시, stagger는 md+만. 반환값 = 정리 함수.
 * 화면별 추가 모션은 full(모션 허용)·reduce 콜백으로 붙인다
 */
export function m01Screen(extra: { full?: () => void; reduce?: () => void } = {}) {
  const mm = gsap.matchMedia();
  mm.add(
    {
      reduce: "(prefers-reduced-motion: reduce)",
      md: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
      base: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
    },
    (ctx) => {
      const has = !!document.querySelector(M01); // 빈 화면이면 "target not found" 경고 방지
      if (ctx.conditions?.reduce) {
        if (has) revealInstant(M01);
        extra.reduce?.();
        return;
      }
      if (has) m01Enter(M01, !!ctx.conditions?.md);
      extra.full?.();
    },
  );
  return () => mm.revert();
}

/** M-02 숫자 카운트업. snap으로 정수 고정, 포맷은 onUpdate가 담당 */
export function m02CountUp(
  from: number,
  to: number,
  onUpdate: (value: number) => void,
) {
  const proxy = { value: from };
  return gsap.to(proxy, {
    value: to,
    duration: DUR.count,
    ease: EASE.out,
    snap: "value",
    onUpdate: () => onUpdate(proxy.value),
  });
}

/** 정(正)자 작대기 펼치기 — 개수와 무관하게 0.3s 안에 다 펼친다. M-04·감시 대상 히어로 공용 */
export function strokesIn(targets: Targets) {
  return gsap.from(targets, { scaleY: 0, duration: 0.25, ease: EASE.out, stagger: { amount: 0.3 } });
}

/** M-04 피드백 등장 — 시트 + 문구 stagger + 감시 대상 펄스. 총 ≤ 0.8s */
export function m04Feedback(
  sheet: Element,
  phrases: Targets,
  opts: { watched: boolean; strokes?: Targets; onComplete?: () => void },
) {
  const tl = gsap.timeline({ onComplete: opts.onComplete });

  if (opts.strokes) tl.add(strokesIn(opts.strokes), 0.25);

  tl.from(sheet, {
    yPercent: 100,
    duration: DUR.sheetIn,
    ease: EASE.strong,
  });

  tl.from(
    phrases,
    {
      y: 8,
      autoAlpha: 0,
      duration: DUR.phrase,
      ease: EASE.out,
      stagger: STAGGER.phrase,
    },
    0.1,
  );

  // 감시 대상일 때만 배경 1회 펄스
  if (opts.watched) {
    tl.to(
      sheet,
      {
        backgroundColor: cssVar("--foreground"),
        duration: DUR.pulse,
        yoyo: true,
        repeat: 1,
        ease: "none",
      },
      0.2,
    );
  }

  return tl;
}

/** M-04 퇴장. 재생 중 중단 가능하도록 진행 중 트윈을 먼저 죽인다 */
export function m04Dismiss(sheet: Element, onComplete: () => void) {
  gsap.killTweensOf(sheet);
  return gsap.to(sheet, {
    yPercent: 100,
    duration: DUR.sheetOut,
    ease: EASE.out,
    onComplete,
  });
}

/**
 * M-05 월 전환 퇴장 — 진행 반대쪽으로 밀려 사라진 뒤 onComplete에서 라우터 push.
 * overwrite로 연타 시 이전 트윈(과 그 push)을 죽여 마지막 목표만 남긴다
 */
export function m05Out(targets: Targets, dir: number, onComplete: () => void) {
  return gsap.to(targets, { x: -dir * 16, autoAlpha: 0, duration: DUR.swapOut, ease: EASE.out, overwrite: true, onComplete });
}

/** M-05 월 전환 진입 — SSR 재렌더 뒤 진행 방향에서 들어온다 */
export function m05In(targets: Targets, dir: number) {
  return gsap.fromTo(
    targets,
    { x: dir * 16, autoAlpha: 0 },
    { x: 0, autoAlpha: 1, duration: DUR.swapIn, ease: EASE.out, overwrite: true },
  );
}

/** M-08 행 퇴장 — 페이드 후 호출부가 제거하고 flipRows로 빈자리를 메운다 */
export function m08RowOut(targets: Targets, onComplete: () => void) {
  return gsap.to(targets, { autoAlpha: 0, duration: DUR.swapOut, ease: EASE.out, onComplete });
}

/** M-06 FAB 등장 */
export function m06Fab(target: Targets) {
  return gsap.from(target, {
    scale: 0.6,
    duration: DUR.fab,
    ease: EASE.back,
  });
}

/**
 * 행 제거·이동 Flip — M-08 체크인 퇴장, 구독 해지→이력 이동.
 * 변경 전 캡처한 상태로 남은 행의 재배치를 보간한다 (규칙 6: height 직접 트윈 금지).
 * 같은 data-flip-id가 다른 위치에 다시 그려지면 이동으로 보간된다
 */
export function flipRows(state: Flip.FlipState) {
  return Flip.from(state, {
    duration: DUR.collapse,
    ease: EASE.out,
    absolute: true,
    onEnter: (els) =>
      gsap.fromTo(els, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: DUR.collapse, ease: EASE.out }),
    onLeave: (els) =>
      gsap.to(els, { autoAlpha: 0, duration: DUR.collapse, ease: EASE.out }),
  });
}

/** M-10 에러 흔들기. reduce 시 문구만(aria-live) — 호출부가 문구를 담당 */
export function m10Shake(target: Targets) {
  if (prefersReduced()) return null;
  return gsap.to(target, {
    keyframes: { x: [0, -4, 4, -2, 0] },
    duration: DUR.shake,
    ease: EASE.out,
  });
}
