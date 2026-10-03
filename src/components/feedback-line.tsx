"use client";

import { X } from "lucide-react";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { diffLabel, krw } from "@/lib/format";
import { FEEDBACK_HOLD_MS, prefersReduced, useGSAP } from "@/lib/motion";
import { m02CountUp, m04Dismiss, m04Feedback } from "@/lib/motion/presets";
import { tally } from "@/lib/tally";

export type FeedbackData = {
  category: string;
  spent: number; // 방금 저장한 금액
  count: number; // 이번 주 n번째
  total: number; // 이번 달 누적
  diff: number | null; // 지난달 이맘때 대비 횟수 차. null = 비교 없음
  watched: boolean;
};
export type FeedbackHandle = { dismiss: () => void };

type Props = { ref?: Ref<FeedbackHandle>; data: FeedbackData; onDismissed: () => void };

/** 저장 직후 하단에서 올라오는 피드백 시트 (M-04). 포커스는 뺏지 않는다 — 다음 입력이 우선 */
export function FeedbackLine({ ref, data, onDismissed }: Props) {
  const sheet = useRef<HTMLDivElement>(null);
  const countEl = useRef<HTMLSpanElement>(null);
  const totalEl = useRef<HTMLSpanElement>(null);
  const closing = useRef(false);
  const dismissRef = useRef<() => void>(() => {});

  const { contextSafe } = useGSAP(
    () => {
      if (!sheet.current || prefersReduced()) return; // reduce: 최종값 그대로
      // 첫 프레임에 최종값이 비치지 않도록 0에서 시작
      if (countEl.current) countEl.current.textContent = "0";
      if (totalEl.current) totalEl.current.textContent = krw(0);
      m04Feedback(sheet.current, "[data-fb-phrase]", { watched: data.watched, strokes: "[data-fb-stroke]" });
      m02CountUp(0, data.count, (v) => {
        if (countEl.current) countEl.current.textContent = String(v);
      });
      m02CountUp(0, data.total, (v) => {
        if (totalEl.current) totalEl.current.textContent = krw(v);
      });
    },
    { scope: sheet, dependencies: [data] },
  );

  // ref를 읽는 클로저는 렌더 밖(effect)에서 만든다 — react-hooks/refs
  useEffect(() => {
    dismissRef.current = contextSafe(() => {
      if (closing.current) return;
      if (!sheet.current || prefersReduced()) {
        onDismissed();
        return;
      }
      closing.current = true;
      m04Dismiss(sheet.current, onDismissed);
    });
  });
  const dismiss = () => dismissRef.current();
  useImperativeHandle(ref, () => ({ dismiss }), []);

  /* 자동 퇴장 + Esc. data가 바뀌면 타이머도 새로 */
  useEffect(() => {
    closing.current = false;
    const t = setTimeout(() => dismissRef.current(), FEEDBACK_HOLD_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [data]);

  const compare = data.diff === null ? "" : `, 지난달 이맘때 대비 ${diffLabel(data.diff)}`;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
      <span role="status" aria-live="polite" className="sr-only">
        저장했어요. {data.category} {krw(data.spent)}. 이번 주 {data.category} {data.count}번째, 이번 달 누적{" "}
        {krw(data.total)}
        {compare}.
      </span>
      <div
        ref={sheet}
        onClick={dismiss}
        aria-hidden
        className={`pointer-events-auto cursor-pointer px-4 pb-8 pt-7 text-background shadow-[0_-12px_40px_rgba(0,0,0,.5)] md:px-8 ${
          data.watched ? "bg-watch" : "bg-foreground"
        }`}
      >
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-[.8125rem] font-bold uppercase tracking-[.08em]">
              <span className="inline-block size-2 bg-background" />
              저장했어요 · {data.category} {krw(data.spent)}
              {data.watched && " · watch"}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                dismiss();
              }}
              aria-label="피드백 닫기"
              className="-m-2.5 ml-0 hover:bg-background/10 hover:text-current"
            >
              <X className="size-5" aria-hidden />
            </Button>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-5 text-[2.75rem] font-bold leading-[1.05] tracking-[-0.04em] tabular-nums">
            <span data-fb-phrase>
              이번 주 {data.category}{" "}
              <span ref={countEl} className="text-[4.5rem]">
                {data.count}
              </span>
              번째
            </span>
            <span data-fb-phrase className="font-medium opacity-75">
              이번 달 누적 <span ref={totalEl}>{krw(data.total)}</span>
            </span>
            {data.diff !== null && (
              <span data-fb-phrase className="font-medium opacity-75">
                지난달 이맘때 대비 {diffLabel(data.diff)}
              </span>
            )}
          </div>
          <div aria-hidden className="relative h-7">
            {tally(data.count).map((s, i) => (
              <span
                key={i}
                data-fb-stroke
                className="absolute origin-center bg-background"
                style={{ left: s.left, top: s.top, width: s.w, height: s.h, transform: s.rot }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
