"use client";

import { useCallback, useRef, useState } from "react";
import { WATCH_MAX, checkinOf, countThisWeek, diffVsPrevMonthToDate, fixedCost, submitCheckin, sumThisMonth, todayStr, useDb, type Db } from "@/lib/store";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WD } from "@/lib/format";
import { AppHeader } from "@/components/app-header";
import { Toast, useToast } from "@/components/toast";
import { Flip, useGSAP } from "@/lib/motion";
import { flipRows, m01Screen, m02CountUp } from "@/lib/motion/presets";
import { CheckinSection, RecentSection, TotalSection, WatchSection } from "./home-sections";

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
  const flipState = useRef<ReturnType<typeof Flip.getState> | null>(null);

  const isLoaded = view === "loaded";
  const showCheckin = isLoaded && checkins.length > 0;

  const setNum = useCallback(
    (key: string, value: number) => setNums((n) => ({ ...n, [key]: value })),
    [],
  );

  /* M-01 등장 · M-02 카운트업 · M-06 FAB — reduce면 전부 즉시 완료 */
  useGSAP(
    () =>
      m01Screen({
        reduce: () => setNums(finalNums()),
        full: () => {
          if (!isLoaded) return;
          Object.entries(finalNums()).forEach(([key, to]) => {
            m02CountUp(0, to, (v) => setNum(key, v));
          });
        },
      }),
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

  return (
    <div ref={root} className="flex min-h-screen flex-col bg-ambient">
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
                <Button asChild size="lg">
                  <Link href="/input">+ 지출 입력</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/categories">감시 대상 정하기</Link>
                </Button>
              </div>
            </section>
          )}

          {showCheckin && <CheckinSection checkins={checkins} onAnswer={answerCheckin} />}

          {isLoaded && (
            <>
              <WatchSection data={data} nums={nums} />

              <TotalSection data={data} nums={nums} />

              <RecentSection recent={data.recent} />
            </>
          )}
        </div>
      </main>

      <Toast text={toast} />

    </div>
  );
}
