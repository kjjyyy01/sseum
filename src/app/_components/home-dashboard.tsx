"use client";

import { useCallback, useRef, useState } from "react";
import { WATCH_MAX, checkinOf, countThisWeek, diffVsPrevMonthToDate, fixedCost, submitCheckin, sumThisMonth, todayStr, useDb, type Db } from "@/lib/store";
import Link from "next/link";
import { diffLabel, krw } from "@/lib/format";
import { AppHeader } from "@/components/app-header";
import { Toast, useToast } from "@/components/toast";
import { Flip, gsap, useGSAP } from "@/lib/motion";
import { flipRows, m01Enter, m02CountUp, revealInstant } from "@/lib/motion/presets";
import { tally } from "@/lib/tally";

export type HomeData = {
  month: number;
  year: number;
  dayLabel: string;
  weekLabel: string;
  weekSummary: string;
  watchLimit: number;
  watched: { id: string; name: string; count: number; amount: number; diff: number | null }[];
  total: number;
  fixedCost: number;
  dailyAverage: number;
  topCategories: { name: string; amount: number }[];
  otherAmount: number;
  checkins: { id: string; name: string; amount: number; day: number }[];
  recent: { id: string; ym: string; day: string; category: string; memo: string; amount: number; watched: boolean }[];
};

type View = "loaded" | "empty";

const RANKS = ["01 / most", "02", "03"];
const BAR_COLORS = ["var(--foreground)", "var(--watch)", "var(--muted-foreground)"];

const WD = ["일", "월", "화", "수", "목", "금", "토"];

/** 저장소 → 대시보드 표시값 (PRD-API명세 getDashboard 계약) */
function selectHome(db: Db, today: string): HomeData {
  const ym = today.slice(0, 7);
  const d = Number(today.slice(8));
  const yesterday = new Intl.DateTimeFormat("sv-SE").format(new Date(new Date(`${today}T00:00:00`).getTime() - 864e5));
  const catOf = (id: string) => db.categories.find((c) => c.id === id);
  const watched = db.categories
    .filter((c) => c.watched && !c.archived)
    .map((c) => ({
      id: c.id,
      name: c.name,
      count: countThisWeek(db, c.id, today),
      amount: sumThisMonth(db, c.id, today),
      diff: diffVsPrevMonthToDate(db, c.id, today),
    }))
    .sort((a, b) => b.count - a.count); // 첫 카드 = 가장 잦은 것
  const fixed = fixedCost(db);
  const spent = db.txns.filter((t) => t.date.startsWith(ym));
  const total = spent.reduce((a, t) => a + t.amount, 0) + fixed; // 월 총 지출 = 거래 + 고정비
  const byCat = new Map<string, number>();
  for (const t of spent) byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + t.amount);
  const top = [...byCat].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, amount]) => ({ name: catOf(id)?.name ?? "?", amount }));
  return {
    month: Number(ym.slice(5)),
    year: Number(ym.slice(0, 4)),
    dayLabel: `${d}일 ${WD[new Date(`${today}T00:00:00`).getDay()]}요일`,
    weekLabel: `${Math.ceil(d / 7)}주차 · ${d}일 지남`,
    weekSummary: watched.filter((w) => w.count).map((w) => `${w.name} ${w.count}`).join(" · ") || "아직 없어요",
    watchLimit: WATCH_MAX,
    watched,
    total,
    fixedCost: fixed,
    dailyAverage: Math.round(total / d),
    topCategories: top,
    otherAmount: total - top.reduce((a, t) => a + t.amount, 0),
    // BR-008 — 이번 달 아직 답하지 않은 구독
    checkins: db.subs.filter((s) => !s.cancelledAt && checkinOf(db, s.id, ym) === null),
    recent: [...db.txns]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        ym: t.date.slice(0, 7),
        day: t.date === today ? "오늘" : t.date === yesterday ? "어제" : `${Number(t.date.slice(5, 7))}.${t.date.slice(8)}`,
        category: catOf(t.categoryId)?.name ?? "?",
        memo: t.memo,
        amount: t.amount,
        watched: !!catOf(t.categoryId)?.watched,
      })),
  };
}

/** SCR-001 — 저장소를 읽은 뒤에만 렌더 (서버엔 데이터가 없다) */
export function HomeDashboard() {
  const db = useDb();
  if (!db) return null;
  const today = todayStr();
  return <Home data={selectHome(db, today)} today={today} />;
}

function Home({ data, today }: { data: HomeData; today: string }) {
  const view: View = data.recent.length === 0 ? "empty" : "loaded";
  const checkins = data.checkins;
  const { text: toast, show: showToast } = useToast();

  // 카운트업 표시값 — SSR/no-JS에서는 최종값 그대로 보인다
  const finalNums = useCallback(() => {
    const t: Record<string, number> = { total: data.total };
    data.watched.forEach((w) => {
      t[`${w.id}c`] = w.count;
      t[`${w.id}a`] = w.amount;
    });
    return t;
  }, [data]);
  const [nums, setNums] = useState<Record<string, number>>(finalNums);

  const root = useRef<HTMLDivElement>(null);
  const checkinCard = useRef<HTMLElement>(null);
  const flipState = useRef<ReturnType<typeof Flip.getState> | null>(null);

  const isLoaded = view === "loaded";
  const showCheckin = isLoaded && checkins.length > 0;

  const setNum = useCallback(
    (key: string, value: number) => setNums((n) => ({ ...n, [key]: value })),
    [],
  );

  /* M-01 등장 · M-02 카운트업 · M-06 FAB — reduce면 전부 즉시 완료 */
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          md: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          base: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          if (ctx.conditions?.reduce) {
            revealInstant("[data-animate='M-01']"); // CSS 선숨김 해제
            setNums(finalNums());
            return;
          }
          m01Enter("[data-animate='M-01']", !!ctx.conditions?.md);
          if (!isLoaded) return;
          Object.entries(finalNums()).forEach(([key, to]) => {
            m02CountUp(0, to, (v) => setNum(key, v));
          });
        },
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [view] },
  );

  /* M-08 체크인 퇴장 — 제거 직전 캡처한 상태로 남은 행 재배치 */
  useGSAP(
    () => {
      if (!flipState.current) return;
      flipRows(flipState.current);
      flipState.current = null;
    },
    { scope: root, dependencies: [checkins.length] },
  );

  /** 체크인 응답 — 저장 성공 후 카드 퇴장(M-08) */
  function answerCheckin(id: string, used: boolean) {
    const rows = root.current?.querySelectorAll("[data-checkin]");
    if (rows?.length) flipState.current = Flip.getState(rows);
    if (!submitCheckin(id, today.slice(0, 7), used)) {
      flipState.current = null;
      showToast("저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
      return;
    }
    if (!used) showToast("해지 검토 · 다음 달에 한 번 더 물어볼게요");
  }

  const watchedCount = data.watched.length;
  const strokesFor = (w: HomeData["watched"][number]) => tally(w.count);

  return (
    <div
      ref={root}
      className="flex min-h-screen flex-col bg-background"
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 80% -10%, rgba(227,181,58,.10), transparent 60%), radial-gradient(800px 500px at -10% 110%, rgba(227,181,58,.06), transparent 60%)",
      }}
    >
      <AppHeader current="home" />

      <main className="flex-1">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-12 px-4 pb-30 pt-12 md:px-8">
          {/* 월 헤더 */}
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap items-baseline gap-5">
              <h1 className="text-[clamp(4rem,14vw,8rem)] font-bold leading-[.9] tracking-[-0.06em] tabular-nums">
                {data.month}
                <span className="ml-1.5 text-[2.75rem] font-medium tracking-[-0.02em]">월</span>
              </h1>
              <div className="flex flex-col gap-1 pb-1.5 text-[.9375rem] leading-[1.4] tracking-[.02em] text-muted-foreground">
                <span>
                  {data.year} · {data.dayLabel}
                </span>
                <span>{data.weekLabel}</span>
              </div>
            </div>
            {isLoaded && (
              <div className="flex flex-col gap-0.5 pb-2 text-right">
                <span className="text-[.8125rem] leading-[1.25] tracking-[.08em] text-muted-foreground">
                  뭘 자주 했나 · 이번 주
                </span>
                <span className="text-2xl font-medium leading-[1.2] tracking-[-0.02em]">
                  {data.weekSummary}
                </span>
              </div>
            )}
          </div>

          {/* Empty */}
          {view === "empty" && (
            <section
              aria-labelledby="empty-title"
              className="grid items-end gap-8 border-y border-border py-18 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]"
            >
              <div className="flex flex-col gap-4">
                <h2
                  id="empty-title"
                  className="text-[2.75rem] font-medium leading-[1.05] tracking-[-0.04em] text-pretty"
                >
                  첫 지출을
                  <br />
                  기록해 보세요
                </h2>
                <p className="max-w-[420px] text-[1.0625rem] leading-[1.55] text-muted-foreground text-pretty">
                  배달, 술, 구독처럼 줄이고 싶은 걸 골라두면 여기서 바로 보여드려요.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Link
                  href="/input"
                  className="flex min-h-14 items-center bg-watch px-7 text-[1.0625rem] font-bold text-watch-foreground hover:bg-watch-hover active:scale-[.97]"
                >
                  + 지출 입력
                </Link>
                <Link
                  href="/categories"
                  className="flex min-h-14 items-center border border-foreground px-7 text-[1.0625rem] font-semibold hover:bg-foreground hover:text-background active:scale-[.97]"
                >
                  감시 대상 정하기
                </Link>
              </div>
            </section>
          )}

          {/* 체크인 */}
          {showCheckin && (
            <section
              ref={checkinCard}
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
                  전체 보기 →
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
                      <button
                        key={b.label}
                        onClick={() => answerCheckin(c.id, b.used)}
                        className="min-h-11 cursor-pointer bg-background px-[22px] text-[.9375rem] font-semibold hover:bg-foreground hover:text-background active:scale-[.97] disabled:opacity-40"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {isLoaded && (
            <>
              {/* 감시 대상 */}
              <section aria-labelledby="watch-title" className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2
                    id="watch-title"
                    className="flex items-center gap-2 text-[.8125rem] leading-[1.25] tracking-[.08em] text-watch uppercase"
                  >
                    <span className="inline-block size-2 bg-watch" />
                    Watch · 감시 대상 {watchedCount}/{data.watchLimit}
                  </h2>
                  <Link
                    href="/categories"
                    className="inline-flex min-h-11 items-center px-1 text-[.8125rem] tracking-[.02em] text-muted-foreground"
                  >
                    감시 대상 관리 →
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
                            {strokesFor(w).map((s, si) => (
                              <span
                                key={si}
                                className="absolute origin-center bg-current"
                                style={{
                                  left: s.left,
                                  top: s.top,
                                  width: s.w,
                                  height: s.h,
                                  transform: s.rot,
                                }}
                              />
                            ))}
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

              {/* 이번 달 전체 */}
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

              {/* 최근 입력 */}
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
                    전체 내역 →
                  </Link>
                </div>
                {data.recent.map((r) => (
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
            </>
          )}
        </div>
      </main>

      <Toast text={toast} />

    </div>
  );
}
