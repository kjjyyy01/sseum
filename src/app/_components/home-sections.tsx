import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TallyStrokes } from "@/components/tally";
import { diffLabel, krw } from "@/lib/format";
import type { HomeData } from "./home-dashboard";

/* 홈(SCR-001) 섹션들 — 표시 전용. 상태·모션은 home-dashboard가 가진다 */

const RANKS = ["01 / most", "02", "03"];
const BAR_COLORS = ["var(--foreground)", "var(--watch)", "var(--muted-foreground)"];

type Nums = Record<string, number>; // 카운트업 중인 표시값

/** 구독 체크인 — 답하면 카드가 빠진다 (BR-008) */
export function CheckinSection({ checkins, onAnswer }: { checkins: HomeData["checkins"]; onAnswer: (id: string, used: boolean) => void }) {
  return (
    <section
      aria-labelledby="checkin-title"
      data-animate="M-01"
      className="overflow-hidden border-t-[3px] border-foreground"
    >
      <div className="flex flex-wrap items-baseline gap-3 pb-1 pt-3.5">
        <h2
          id="checkin-title"
          className="text-[.8125rem] leading-[1.25] tracking-[.08em] text-muted-foreground uppercase"
        >
          Check-in · 구독
        </h2>
        <span className="text-[.8125rem] text-muted-foreground">답하면 사라져요</span>
        <span className="flex-1" />
        <Link
          href="/subscriptions"
          className="-my-3.5 inline-flex min-h-11 items-center px-1 text-[.8125rem] tracking-[.02em] text-muted-foreground"
        >
          전체 보기 <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      {checkins.map((c) => (
        <div
          key={c.id}
          data-checkin={c.id}
          className="flex flex-wrap items-center justify-between gap-6 border-b border-border py-4"
        >
          <div className="flex flex-wrap items-baseline gap-4">
            <span className="text-2xl font-medium leading-[1.3] tracking-[-0.02em]">
              이번 달 {c.name} 썼어요?
            </span>
            <span className="text-[.8125rem] leading-[1.4] tabular-nums text-muted-foreground">
              매달 {c.day}일 · {krw(c.amount)}
            </span>
          </div>
          <div
            className="flex gap-px border border-foreground/30 bg-foreground/30"
          >
            {[
              { label: "썼어요", used: true },
              { label: "안 썼어요", used: false },
            ].map((b) => (
              <Button
                key={b.label}
                variant="ghost"
                size="sm"
                onClick={() => onAnswer(c.id, b.used)}
                className="bg-background px-[22px] font-semibold hover:bg-foreground hover:text-background"
              >
                {b.label}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/** 감시 대상 카드 — 첫 카드가 가장 잦은 것 */
export function WatchSection({ data, nums }: { data: HomeData; nums: Nums }) {
  return (
    <section aria-labelledby="watch-title" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="watch-title"
          className="flex items-center gap-2 text-[.8125rem] leading-[1.25] tracking-[.08em] text-watch uppercase"
        >
          <span className="inline-block size-2 bg-watch" />
          Watch · 감시 대상 {data.watched.length}/{data.watchLimit}
        </h2>
        <Link
          href="/categories"
          className="inline-flex min-h-11 items-center px-1 text-[.8125rem] tracking-[.02em] text-muted-foreground"
        >
          감시 대상 관리 <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="grid gap-px border border-border bg-border [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {data.watched.map((w, i) => {
          const top = i === 0;
          const diff = w.diff;
          return (
            <Link
              key={w.id}
              href="/transactions"
              // 첫 카드는 LCP 후보 — 등장 모션 제외 (PRD §3.2 규칙 1)
              data-animate={top ? undefined : "M-01"}
              aria-label={`${w.name} 이번 주 ${w.count}번 · 이번 달 ${krw(w.amount)}`}
              className={`flex min-h-[300px] flex-col justify-between gap-7 p-6 transition-shadow hover:shadow-[inset_0_0_0_2px_var(--foreground)] active:shadow-[inset_0_0_0_3px_var(--foreground)] ${
                top ? "bg-watch text-watch-foreground" : "bg-background text-foreground"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl font-semibold leading-[1.2] tracking-[-0.02em]">
                  {w.name}
                </span>
                <span className="text-[.8125rem] uppercase tracking-[.1em] opacity-75">
                  {RANKS[i]}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline gap-2 tabular-nums">
                  <span className="text-[7rem] font-bold leading-[.85] tracking-[-0.07em]">
                    {nums[`${w.id}c`] ?? w.count}
                  </span>
                  <span className="text-[.9375rem] font-medium leading-[1.3]">
                    번
                    <br />
                    <span className="opacity-75">이번 주</span>
                  </span>
                </div>
                <div aria-hidden className="relative h-7">
                  <TallyStrokes n={w.count} stroke="bg-current" />
                </div>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-current pt-3 tabular-nums">
                <span className="text-[.9375rem] leading-[1.3]">
                  이번 달 <strong className="font-bold">{krw(nums[`${w.id}a`] ?? w.amount)}</strong>
                </span>
                {diff === null ? (
                  <span className="text-[.8125rem] leading-[1.4] opacity-70">첫 달</span>
                ) : (
                  <span
                    className="text-[.8125rem] font-bold leading-[1.4] underline-offset-[3px]"
                    style={{
                      color: top
                        ? "var(--watch-foreground)"
                        : diff > 0
                          ? "var(--negative)"
                          : diff < 0
                            ? "var(--positive)"
                            : "var(--muted-foreground)",
                      textDecoration: top && diff > 0 ? "underline" : "none",
                    }}
                  >
                    지난달 이맘때보다 {diffLabel(diff)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** 이번 달 전체 — 합계 + 상위 3 카테고리 막대 */
export function TotalSection({ data, nums }: { data: HomeData; nums: Nums }) {
  return (
    <section
      aria-labelledby="sum-title"
      data-animate="M-01"
      className="grid items-end gap-8 border-t-[3px] border-foreground pt-3.5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]"
    >
      <div className="flex flex-col gap-3">
        <h2
          id="sum-title"
          className="text-[.8125rem] leading-[1.25] tracking-[.08em] text-muted-foreground uppercase"
        >
          Total · 이번 달 전체
        </h2>
        <span className="text-[4.5rem] font-bold leading-[.95] tracking-[-0.05em] tabular-nums">
          {krw(nums.total ?? data.total)}
        </span>
        <span className="text-[.8125rem] leading-[1.4] text-muted-foreground">
          고정비 {krw(data.fixedCost)} 포함 · 하루 평균 {krw(data.dailyAverage)}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex h-10 gap-0.5">
          {data.topCategories.map((t, i) => (
            <span
              key={t.name}
              title={t.name}
              className="block"
              style={{
                width: `${((t.amount / data.total) * 100).toFixed(1)}%`,
                background: BAR_COLORS[i],
              }}
            />
          ))}
          <span className="flex-1 bg-border" />
        </div>
        <div className="grid gap-4 tabular-nums [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
          {data.topCategories.map((t, i) => (
            <div
              key={t.name}
              className="flex flex-col gap-1 pl-2.5"
              style={{ borderLeft: `3px solid ${BAR_COLORS[i]}` }}
            >
              <span className="text-[.8125rem] leading-[1.4] text-muted-foreground">
                {t.name}
              </span>
              <span className="text-xl font-semibold leading-[1.2] tracking-[-0.02em]">
                {krw(t.amount)}
              </span>
            </div>
          ))}
          <div className="flex flex-col gap-1 border-l-[3px] border-border pl-2.5">
            <span className="text-[.8125rem] leading-[1.4] text-muted-foreground">그 외</span>
            <span className="text-xl font-semibold leading-[1.2] tracking-[-0.02em]">
              {krw(data.otherAmount)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** 최근 입력 5건 */
export function RecentSection({ recent }: { recent: HomeData["recent"] }) {
  return (
    <section
      aria-labelledby="recent-title"
      data-animate="M-01"
      className="flex flex-col border-t-[3px] border-foreground pt-1.5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="recent-title"
          className="text-[.8125rem] leading-[1.25] tracking-[.08em] text-muted-foreground uppercase"
        >
          Recent · 최근 입력
        </h2>
        <Link
          href="/transactions"
          className="inline-flex min-h-11 items-center px-1 text-[.8125rem] tracking-[.02em] text-muted-foreground"
        >
          전체 내역 <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      {recent.map((r) => (
        <Link
          key={r.id}
          href={`/transactions?month=${r.ym}`}
          className="grid min-h-14 grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 border-b border-border py-3 tabular-nums hover:text-watch md:grid-cols-[72px_minmax(0,1fr)_auto]"
        >
          <span className="text-[.8125rem] tracking-[.02em] text-muted-foreground">
            {r.day}
          </span>
          <span className="flex min-w-0 flex-wrap items-baseline gap-3">
            <span className="flex items-center gap-2 text-[1.0625rem] font-medium tracking-[-0.01em]">
              {r.category}
              {r.watched && <span className="inline-block size-1.5 bg-watch" />}
            </span>
            <span className="min-w-0 truncate text-[.8125rem] text-muted-foreground">
              {r.memo}
            </span>
          </span>
          <span className="text-right text-xl font-semibold tracking-[-0.03em]">
            {krw(r.amount)}
          </span>
        </Link>
      ))}
    </section>
  );
}
