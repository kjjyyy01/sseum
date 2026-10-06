"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/motion";
import { m06Fab } from "@/lib/motion/presets";

const NAV = [
  { key: "home", label: "홈", href: "/" },
  { key: "transactions", label: "내역", href: "/transactions" },
  { key: "subscriptions", label: "구독", href: "/subscriptions" },
  { key: "settings", label: "설정", href: "/settings" },
] as const;
export type NavKey = (typeof NAV)[number]["key"];

type Props = { current?: NavKey }; // current 없음 = 내비 밖 화면(카테고리)

/** 인증 화면 공통 상단 바 — 내비 + 입력 FAB(M-06). SCR-002는 제외 */
export function AppHeader({ current }: Props) {
  const fab = useRef<HTMLAnchorElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (fab.current) m06Fab(fab.current);
    });
    return () => mm.revert();
  });

  return (
    <header className="border-b border-border">
        <div className="mx-auto flex min-h-[72px] max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 md:px-8">
          <Link
            href="/"
            aria-label="sseum 홈"
            className="flex min-h-11 items-center gap-1.5 text-[1.625rem] font-bold leading-none tracking-[-0.04em]"
          >
            sseum
            <span className="inline-block size-2 bg-watch" />
          </Link>
          <nav aria-label="주 내비게이션" className="flex min-h-12 items-stretch gap-1 max-md:order-last max-md:-ml-3.5 max-md:w-full">
            {NAV.map((n) => {
              const on = n.key === current;
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex min-w-11 items-center justify-center px-3.5 text-[.9375rem] hover:text-watch ${
                    on ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                  }`}
                >
                  {n.label}
                  {on && <span className="absolute inset-x-3.5 bottom-0 h-[3px] bg-watch" />}
                </Link>
              );
            })}
          </nav>
          <span className="flex-1" />
          <Link
            ref={fab}
            href="/input"
            aria-label="지출 입력"
            className="flex min-h-11 items-center gap-2 bg-watch py-0 pl-3.5 pr-[18px] text-[.9375rem] font-bold tracking-[-0.01em] text-watch-foreground hover:bg-watch-hover active:scale-[.97]"
          >
            <Plus className="size-5" aria-hidden />입력
          </Link>
        </div>
    </header>
  );
}
