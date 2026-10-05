"use client";

import { useRef, useState } from "react";

/** 2.4초 뒤 사라지는 상태 토스트 */
export function useToast() {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = (t: string) => {
    setText(t);
    clearTimeout(timer.current); // 같은 문구 연속 — 이전 타이머가 새 토스트를 지우지 않게
    timer.current = setTimeout(() => setText(null), 2400);
  };
  return { text, show };
}

export function Toast({ text, bottom = 32 }: { text: string | null; bottom?: number }) {
  if (!text) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 z-30 max-w-[calc(100vw-48px)] -translate-x-1/2 bg-foreground px-[18px] py-3 text-[.9375rem] font-semibold leading-[1.4] text-background shadow-[0_12px_32px_rgba(0,0,0,.4)] transition-[bottom] duration-[250ms]"
      style={{ bottom }}
    >
      {text}
    </div>
  );
}
