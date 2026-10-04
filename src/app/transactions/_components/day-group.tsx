import { Toggle } from "@/components/ui/toggle";
import { krw, WD } from "@/lib/format";
import type { Category, Txn } from "@/lib/store";

type Props = {
  date: string;
  rows: Txn[];
  today: string;
  sel: string | null; // 편집 중인 거래 id
  catOf: (id: string) => Category | undefined;
  onOpen: (t: Txn) => void;
};

/** 지출 내역 일자 그룹 (EL-TXN-002) — 날짜·소계 머리 + 거래 행. 행 탭 = 편집 열기 */
export function DayGroup({ date, rows, today, sel, catOf, onOpen }: Props) {
  const dt = new Date(`${date}T00:00:00`);
  const hid = `g-${date}`;
  return (
    <section
      aria-labelledby={hid}
      data-animate="M-01"
      data-flip-id={hid}
      className="flex flex-col border-t-[3px] border-foreground pt-3"
    >
      <div className="flex items-baseline justify-between gap-3 pb-1">
        <h2 id={hid} className="flex items-baseline gap-2.5 text-xl font-semibold leading-[1.2] tracking-[-0.02em]">
          {dt.getDate()}일
          <span className="text-[.8125rem] font-normal tracking-[.02em] text-muted-foreground">
            {date === today ? `오늘 · ${WD[dt.getDay()]}` : WD[dt.getDay()]}
          </span>
        </h2>
        <span className="text-[.9375rem] leading-[1.4] tabular-nums text-muted-foreground">
          소계 <strong className="font-semibold text-foreground">{krw(rows.reduce((a, t) => a + t.amount, 0))}</strong>
        </span>
      </div>
      {rows.map((t) => {
        const c = catOf(t.categoryId);
        const on = t.id === sel;
        return (
          <Toggle
            key={t.id}
            data-row={t.id}
            data-flip-id={t.id}
            pressed={on}
            onPressedChange={() => onOpen(t)}
            aria-label={`${c?.name}${c?.watched ? " · 감시 대상" : ""} ${krw(t.amount)}${t.memo ? ` · ${t.memo}` : ""} · 편집`}
            className={`-mx-3 grid min-h-14 grid-cols-[minmax(0,1fr)_auto] justify-start gap-4 border-b border-border px-3 py-3 text-left font-normal tabular-nums data-[state=off]:bg-transparent transition-[box-shadow,background-color] duration-150 active:scale-100 ${
              on
                ? "hover:shadow-[inset_0_0_0_2px_var(--watch)]"
                : "hover:shadow-[inset_0_0_0_2px_var(--foreground)]"
            }`}
          >
            <span className="flex min-w-0 flex-wrap items-baseline gap-3">
              <span className="flex items-center gap-2 text-[1.0625rem] font-medium tracking-[-0.01em]">
                {c?.name}
                {c?.watched && <span aria-hidden className={`inline-block size-1.5 ${on ? "bg-background" : "bg-watch"}`} />}
              </span>
              <span className={`min-w-0 truncate text-[.8125rem] ${on ? "text-background" : "text-muted-foreground"}`}>{t.memo}</span>
            </span>
            <span className="text-right text-xl font-semibold tracking-[-0.03em]">{krw(t.amount)}</span>
          </Toggle>
        );
      })}
    </section>
  );
}
