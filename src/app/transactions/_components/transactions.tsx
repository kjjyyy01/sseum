"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition, type FormEvent, type MouseEvent } from "react";
import { Drawer } from "vaul";
import { AppHeader } from "@/components/app-header";
import { Toast, useToast } from "@/components/toast";
import { krw } from "@/lib/format";
import { Flip, gsap, prefersReduced, useGSAP } from "@/lib/motion";
import { flipRows, m01Enter, m02CountUp, m05In, m05Out, m08RowOut, m10Shake, revealInstant } from "@/lib/motion/presets";
import { deleteTransaction, updateTransaction, useDb, type Db, type Txn } from "@/lib/store";
import { tally } from "@/lib/tally";
import { DayGroupSkeleton } from "./day-group-skeleton";

type Edit = { amount: string; categoryId: string; date: string; memo: string };
type Errors = { amount?: string; date?: string; memo?: string };

const LABEL = "text-[.8125rem] uppercase leading-[1.25] tracking-[.08em] text-muted-foreground";
const ERR = "min-h-5 text-[.8125rem] font-semibold leading-[1.4] text-negative";
const FIELD = "min-h-12 w-full border bg-transparent px-3 text-[.9375rem] text-foreground";
const WD = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-09" ± n개월 */
const addMonth = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (ym: string) => `${Number(ym.slice(5))}월`;
/** 날짜 최신순, 같은 날은 나중에 입력한 것 먼저 */
const byDateDesc = (a: Txn, b: Txn) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt;

/** SCR-002 §7과 같은 규칙 */
function validate(e: Edit, today: string): Errors {
  const errs: Errors = {};
  const n = Number(e.amount || 0);
  if (!(n >= 1 && n <= 100_000_000)) errs.amount = "1원 이상 1억원 이하로 입력해 주세요.";
  if (e.date > today) errs.date = "미래 날짜는 기록할 수 없어요.";
  if (e.memo.trim().length > 100) errs.memo = "메모는 100자까지예요.";
  return errs;
}

/** md 이상 = 우측 편집 패널, 미만 = 바텀시트. 서버에선 시트로 가정 */
const WIDE = "(min-width: 768px)";
const subscribeWide = (cb: () => void) => {
  const mq = matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

type Props = { month: string; currentMonth: string; today: string };

/** SCR-003 — 저장소를 읽은 뒤에만 렌더. month는 서버가 정규화해 넘긴다 */
export function TransactionsScreen(props: Props) {
  const db = useDb();
  if (!db) return <DayGroupSkeleton />;
  return <Screen {...props} db={db} />;
}

function Screen({ month, currentMonth, today, db }: Props & { db: Db }) {
  const router = useRouter();
  const txns = db.txns.filter((t) => t.date.startsWith(month)).sort(byDateDesc);
  const categories = db.categories;
  const [sel, setSel] = useState<string | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { text: toast, show: showToast } = useToast();
  const wide = useSyncExternalStore(subscribeWide, () => matchMedia(WIDE).matches, () => false);
  const [switching, startSwitch] = useTransition(); // 월 전환 SSR 대기
  const [target, setTarget] = useState<string | null>(null); // 대기 중 보여줄 목표 월

  // 월 전환(SSR 재렌더)으로 새 목록이 오면 로컬 상태 교체
  const [shownMonth, setShownMonth] = useState(month);
  if (shownMonth !== month) {
    setShownMonth(month);
    setTarget(null);
    setSel(null);
    setEdit(null);
    setConfirming(false);
  }

  const root = useRef<HTMLDivElement>(null);
  const totalEl = useRef<HTMLSpanElement>(null);
  const shownTotal = useRef(0);
  const amountInput = useRef<HTMLInputElement>(null);
  const amountWrap = useRef<HTMLDivElement>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const edited = useRef(false);
  const swapDir = useRef(0); // M-05 진행 방향 (−1 이전 / 1 다음)
  const swapTarget = useRef<string | null>(null); // 연타 누적 목표 월

  const locked = busy;
  const isEmpty = !switching && txns.length === 0;
  const shown = target ?? month; // 헤더 월 — 전환 대기 중엔 목표 월
  const isCurrent = shown === currentMonth;
  const selTxn = txns.find((t) => t.id === sel) ?? null;
  const catOf = (id: string) => categories.find((c) => c.id === id);

  const total = txns.reduce((a, t) => a + t.amount, 0);
  const days = new Map<string, Txn[]>();
  for (const t of txns) days.set(t.date, [...(days.get(t.date) ?? []), t]);
  const watch = categories
    .filter((c) => c.watched && !c.archived)
    .map((c) => ({ ...c, count: txns.filter((t) => t.categoryId === c.id).length }));

  const changed =
    !!selTxn &&
    !!edit &&
    (Number(edit.amount || 0) !== selTxn.amount ||
      edit.categoryId !== selTxn.categoryId ||
      edit.date !== selTxn.date ||
      edit.memo.trim() !== selTxn.memo);
  const amountOk = !!edit && Number(edit.amount || 0) >= 1 && Number(edit.amount || 0) <= 100_000_000;
  const canSave = changed && amountOk && !locked;

  const { contextSafe } = useGSAP({ scope: root });
  const shake = contextSafe((el: Element | null) => el && m10Shake(el));
  const swapOut = contextSafe((dir: number, done: () => void) => m05Out("[data-month-swap]", dir, done));
  const rowOut = contextSafe((id: string, done: () => void) => m08RowOut(`[data-row="${id}"]`, done));
  const rowBack = contextSafe((id: string) => gsap.set(`[data-row="${id}"]`, { autoAlpha: 1 })); // 저장 실패 시 되살림

  /* 등장 — 첫 로드는 M-01, 월 전환 직후는 M-05 진입 */
  useGSAP(
    () => {
      const dir = swapDir.current;
      swapDir.current = 0;
      swapTarget.current = null;
      if (dir) {
        if (prefersReduced()) gsap.set("[data-month-swap]", { x: 0, autoAlpha: 1 });
        else m05In("[data-month-swap]", dir);
        revealInstant("[data-animate='M-01']");
        return;
      }
      if (isEmpty) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          md: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          base: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          if (ctx.conditions?.reduce) {
            revealInstant("[data-animate='M-01']");
            return;
          }
          m01Enter("[data-animate='M-01']", !!ctx.conditions?.md);
        },
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [month, isEmpty] },
  );

  /* M-02 월 합계 카운트업. 값은 DOM에 직접 */
  useGSAP(
    () => {
      const el = totalEl.current;
      if (!el) return;
      if (prefersReduced()) {
        el.textContent = krw(total);
        shownTotal.current = total;
        return;
      }
      m02CountUp(shownTotal.current, total, (v) => {
        el.textContent = krw(v);
        shownTotal.current = v;
      });
    },
    { dependencies: [total, switching] },
  );

  /* 편집 반영 — 빠진 행 자리 Flip(M-08), 새로 생긴 일자 그룹 노출 */
  useGSAP(
    () => {
      if (!edited.current) return;
      edited.current = false;
      revealInstant("[data-animate='M-01']");
      if (flipState.current) {
        flipRows(flipState.current);
        flipState.current = null;
      }
    },
    { scope: root, dependencies: [db] },
  );

  /* 패널(md+) 열림 — 금액 포커스. 시트는 onOpenAutoFocus가 담당 */
  useEffect(() => {
    if (sel && wide) amountInput.current?.focus({ preventScroll: true });
  }, [sel, wide]);

  /* 삭제 확인 — 확인 버튼 포커스 */
  useEffect(() => {
    if (confirming) confirmBtn.current?.focus({ preventScroll: true });
  }, [confirming]);

  // EL-TXN-001 — href로 JS 없이도 이동, JS 있으면 M-05 퇴장 뒤 push
  function goMonth(e: MouseEvent, dir: -1 | 1) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // 새 탭 등은 브라우저 기본
    e.preventDefault();
    const next = addMonth(swapTarget.current ?? month, dir);
    if (next > currentMonth) return;
    swapTarget.current = next;
    swapDir.current = dir;
    setTarget(next);
    // 트랜지션이라 loading.tsx 대신 isPending(switching)으로 자리 스켈레톤
    const go = () => startSwitch(() => router.push(`/transactions?month=${next}`, { scroll: false }));
    // 빈 달엔 퇴장시킬 목록이 없다 — 트윈 없이 바로 이동
    if (prefersReduced() || !root.current?.querySelector("[data-month-swap]")) go();
    else swapOut(dir, go);
  }

  function openEdit(t: Txn) {
    if (locked) return;
    setSel(t.id);
    setEdit({ amount: String(t.amount), categoryId: t.categoryId, date: t.date, memo: t.memo });
    setErrors({});
    setEditError(false);
    setConfirming(false);
  }

  /** 닫고 원래 행으로 포커스 복원. 행이 사라졌으면 첫 행 */
  function closeEdit() {
    const id = sel;
    setSel(null);
    setEdit(null);
    setConfirming(false);
    setTimeout(() => {
      const r = root.current;
      (r?.querySelector<HTMLElement>(`[data-row="${id}"]`) ?? r?.querySelector<HTMLElement>("[data-row]"))?.focus({ preventScroll: true });
    }, 30);
  }

  function setField<K extends keyof Edit>(key: K, value: Edit[K]) {
    setEdit((e) => (e ? { ...e, [key]: value } : e));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  /** M-08 — 페이드 → 현재 배치 캡처 → 제거(done) → flipRows */
  function exitRow(id: string, done: () => void) {
    const capture = () => {
      const els = root.current?.querySelectorAll("[data-flip-id]");
      if (els?.length) flipState.current = Flip.getState(els);
      edited.current = true;
      done();
    };
    if (prefersReduced()) capture();
    else rowOut(id, capture);
  }

  // REQ-TXN-002 수정 — 낙관적 갱신 없음, 응답 후 반영
  function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!edit || !selTxn || !canSave) return;
    const errs = validate(edit, today);
    if (Object.keys(errs).length) {
      setErrors(errs);
      if (errs.amount) {
        shake(amountWrap.current);
        amountInput.current?.focus();
      }
      return;
    }
    setBusy(true);
    setEditError(false);
    const id = selTxn.id;
    const patch = { amount: Number(edit.amount), categoryId: edit.categoryId, date: edit.date, memo: edit.memo.trim() };
    const leaves = !patch.date.startsWith(month); // 다른 달로 옮기면 목록에서 빠짐 (엣지 #1)
    const apply = () => {
      setBusy(false);
      if (!updateTransaction(id, patch)) {
        failRow(id);
        setEditError(true);
        return;
      }
      closeEdit();
      showToast("저장했어요");
    };
    if (leaves) exitRow(id, apply);
    else {
      edited.current = true;
      apply();
    }
  }

  /** 저장 실패 — 퇴장시킨 행을 되돌리고 Flip 취소 */
  function failRow(id: string) {
    edited.current = false;
    flipState.current = null;
    rowBack(id);
  }

  // REQ-TXN-003 삭제 — 하드 삭제, 퇴장(M-08) 후 반영
  function confirmDelete() {
    if (!selTxn || locked) return;
    const id = selTxn.id;
    setBusy(true);
    exitRow(id, () => {
      setBusy(false);
      if (!deleteTransaction(id)) {
        failRow(id);
        setConfirming(false);
        showToast("지우지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
        return;
      }
      closeEdit();
      showToast("지웠어요");
    });
  }


  const prev = addMonth(shown, -1);
  const next = addMonth(shown, 1);
  const MONTH_BTN =
    "inline-flex min-h-11 min-w-11 items-center justify-center bg-background text-xl";

  const editTitle = selTxn && `Edit · ${catOf(selTxn.categoryId)?.name} · ${selTxn.date.slice(5).replace("-", ".")}`;

  // 편집 폼 — md+ 패널 또는 모바일 시트 중 한 곳에만 렌더
  const editForm = selTxn && edit && (
    <form onSubmit={submitEdit} noValidate className="flex flex-col gap-5 px-4 pb-6 pt-5 md:px-6">
      <div className="flex items-center justify-between gap-3">
        {/* Drawer.Title은 시트 안에서만 — 패널엔 Drawer 컨텍스트가 없다 */}
        {wide ? <span className={LABEL}>{editTitle}</span> : <Drawer.Title className={LABEL}>{editTitle}</Drawer.Title>}
        <button
          type="button"
          onClick={closeEdit}
          disabled={busy}
          aria-label="편집 닫기"
          className="-my-2.5 -mr-2.5 min-h-11 min-w-11 cursor-pointer text-[1.375rem] leading-none hover:text-watch active:scale-[.97] disabled:opacity-40"
        >
          ×
        </button>
      </div>

      {editError && (
        <div role="alert" className="border border-foreground px-3.5 py-3 text-[.9375rem] font-semibold leading-[1.4]">
          잠시 문제가 생겼어요. 다시 시도해 주세요.
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="e-amount" className={LABEL}>
          금액
        </label>
        <div ref={amountWrap} className="flex items-baseline gap-1.5">
          <input
            ref={amountInput}
            id="e-amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={edit.amount ? Number(edit.amount).toLocaleString("ko-KR") : ""}
            onChange={(e) => setField("amount", e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))}
            placeholder="0"
            aria-invalid={!!errors.amount}
            aria-describedby="e-amount-err"
            disabled={locked}
            className="field-sizing-content min-w-[1ch] max-w-full bg-transparent pb-1 text-[2.75rem] font-bold leading-none tracking-[-0.04em] text-foreground caret-watch tabular-nums shadow-[inset_0_-3px_0_transparent] outline-none transition-shadow focus:shadow-[inset_0_-3px_0_var(--watch)]"
          />
          <span aria-hidden className="text-xl font-medium text-muted-foreground">
            원
          </span>
        </div>
        <span id="e-amount-err" role="alert" className={ERR}>
          {errors.amount}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span id="e-cat-title" className={LABEL}>
          카테고리
        </span>
        <div role="group" aria-labelledby="e-cat-title" className="flex flex-wrap gap-1.5">
          {categories
            .filter((c) => !c.archived)
            .map((c) => {
              const on = edit.categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setField("categoryId", c.id)}
                  aria-pressed={on}
                  disabled={locked}
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-2 border px-3.5 text-[.9375rem] font-semibold hover:border-foreground active:scale-[.97] ${
                    on ? "border-foreground bg-foreground text-background" : "border-border text-foreground"
                  }`}
                >
                  {c.name}
                  {c.watched && <span aria-hidden className={`inline-block size-1.5 ${on ? "bg-background" : "bg-watch"}`} />}
                </button>
              );
            })}
        </div>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="e-date" className={LABEL}>
            날짜
          </label>
          <input
            id="e-date"
            type="date"
            value={edit.date}
            max={today}
            onChange={(e) => setField("date", e.target.value || today)}
            aria-invalid={!!errors.date}
            aria-describedby="e-date-err"
            disabled={locked}
            className={`${FIELD} tabular-nums [color-scheme:dark] ${errors.date ? "border-negative" : "border-placeholder"}`}
          />
          <span id="e-date-err" role="alert" className={ERR}>
            {errors.date}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="e-memo" className={LABEL}>
            메모 · {edit.memo.length}/100
          </label>
          <input
            id="e-memo"
            type="text"
            value={edit.memo}
            onChange={(e) => setField("memo", e.target.value.slice(0, 120))}
            placeholder="없음"
            aria-invalid={!!errors.memo}
            aria-describedby="e-memo-err"
            disabled={locked}
            className={`${FIELD} ${errors.memo ? "border-negative" : "border-placeholder"}`}
          />
          <span id="e-memo-err" role="alert" className={ERR}>
            {errors.memo}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          type="submit"
          disabled={!canSave && !busy}
          className="inline-flex min-h-12 cursor-pointer items-center gap-2.5 bg-watch px-[22px] text-[.9375rem] font-bold text-watch-foreground hover:bg-watch-hover active:scale-[.97] disabled:cursor-not-allowed disabled:bg-muted-foreground disabled:opacity-50"
        >
          수정
        </button>
        <button
          type="button"
          onClick={closeEdit}
          disabled={busy}
          className="min-h-12 cursor-pointer border border-border px-[18px] text-[.9375rem] font-semibold hover:border-foreground active:scale-[.97]"
        >
          취소
        </button>
        <span className="flex-1" />
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={locked}
            className="min-h-12 cursor-pointer px-3.5 text-[.9375rem] font-semibold text-negative underline-offset-4 hover:underline active:scale-[.97] disabled:opacity-40"
          >
            지우기
          </button>
        )}
      </div>

      {/* EL-TXN-005 — 브라우저 confirm 대신 인라인 2단계 */}
      {confirming && (
        <div
          role="group"
          aria-label="삭제 확인"
          className="-mt-2 flex flex-wrap items-center justify-between gap-3 bg-foreground px-4 py-3.5 text-background animate-[ss-rise_.2s_ease-out] motion-reduce:animate-none"
        >
          <span className="text-[.9375rem] font-semibold leading-[1.4]">이 기록을 지울까요?</span>
          <div className="flex gap-1.5">
            <button
              ref={confirmBtn}
              type="button"
              onClick={confirmDelete}
              disabled={busy}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 bg-background px-[18px] text-[.9375rem] font-bold text-foreground hover:bg-negative hover:text-background active:scale-[.97] disabled:opacity-60"
            >
              지우기
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="min-h-11 cursor-pointer border border-background px-3.5 text-[.9375rem] font-semibold active:scale-[.97]"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </form>
  );

  return (
    <div
      ref={root}
      className="flex min-h-screen flex-col bg-background"
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 80% -10%, rgba(227,181,58,.10), transparent 60%), radial-gradient(800px 500px at -10% 110%, rgba(227,181,58,.06), transparent 60%)",
      }}
    >
      <AppHeader current="transactions" />

      <main className="flex-1">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-10 px-4 pb-40 pt-12 md:px-8">
          {/* 월 선택 + 합계 */}
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap items-end gap-5">
              <nav aria-label="월 이동" className="mb-2 flex items-center gap-px border border-border bg-border">
                <Link
                  href={`/transactions?month=${prev}`}
                  scroll={false}
                  onClick={(e) => goMonth(e, -1)}
                  aria-label={`이전 달 · ${monthLabel(prev)}`}
                  className={`${MONTH_BTN} hover:bg-foreground hover:text-background active:scale-[.97]`}
                >
                  ←
                </Link>
                {isCurrent ? (
                  <a role="link" aria-disabled="true" aria-label="다음 달 없음 · 이번 달까지" className={`${MONTH_BTN} text-placeholder`}>
                    →
                  </a>
                ) : (
                  <Link
                    href={`/transactions?month=${next}`}
                    scroll={false}
                    onClick={(e) => goMonth(e, 1)}
                    aria-label={`다음 달 · ${monthLabel(next)}`}
                    className={`${MONTH_BTN} hover:bg-foreground hover:text-background active:scale-[.97]`}
                  >
                    →
                  </Link>
                )}
              </nav>
              <h1
                className="flex items-baseline text-[clamp(5rem,16vw,8rem)] font-bold leading-[.9] tracking-[-0.06em] tabular-nums"
              >
                {Number(shown.slice(5))}
                <span className="ml-1.5 text-[2.75rem] font-medium tracking-[-0.02em]">월</span>
              </h1>
              <div className="flex flex-col gap-1 pb-1.5 text-[.9375rem] leading-[1.4] tracking-[.02em] text-muted-foreground">
                <span>
                  {shown.slice(0, 4)} · {isCurrent ? `${Number(today.slice(8))}일까지` : "전체"}
                </span>
                <span>{switching ? "불러오는 중" : `${txns.length}건 · ${days.size}일`}</span>
              </div>
            </div>

            {!isEmpty && !switching && (
              <div className="flex flex-col items-end gap-1.5 pb-2 text-right">
                <span className={LABEL}>Total · 이 달 전체</span>
                <span ref={totalEl} className="text-[clamp(3rem,10vw,4.5rem)] font-bold leading-[.95] tracking-[-0.05em] tabular-nums">
                  {krw(total)}
                </span>
                <div
                  aria-label={`감시 대상 이 달 횟수 · ${watch.map((w) => `${w.name} ${w.count}번`).join(", ")}`}
                  className="flex flex-wrap justify-end gap-5 pt-1.5"
                >
                  {watch.map((w) => (
                    <div key={w.id} aria-hidden className="flex items-center gap-2.5 text-[.8125rem] font-semibold leading-[1.25] text-watch">
                      <span className="shrink-0 whitespace-nowrap">
                        {w.name} {w.count}
                      </span>
                      <span className="relative block h-3.5" style={{ width: Math.ceil(w.count / 5) * 26 + 4 }}>
                        {tally(w.count, 0.5).map((s, i) => (
                          <span
                            key={i}
                            className="absolute origin-center bg-current"
                            style={{ left: s.left, top: s.top, width: s.w, height: s.h, transform: s.rot }}
                          />
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {switching && <DayGroupSkeleton />}

          {isEmpty && (
            <section
              aria-labelledby="empty-title"
              className="grid items-end gap-8 border-y border-border py-18 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]"
            >
              <h2 id="empty-title" className="text-[2.75rem] font-medium leading-[1.05] tracking-[-0.04em] text-pretty">
                이 달엔
                <br />
                기록이 없어요
              </h2>
              <div className="flex justify-end">
                <Link
                  href="/input"
                  className="inline-flex min-h-14 items-center bg-watch px-7 text-[1.0625rem] font-bold text-watch-foreground hover:bg-watch-hover active:scale-[.97]"
                >
                  + 지출 입력
                </Link>
              </div>
            </section>
          )}

          {!isEmpty && !switching && (
            <>

              <div className="flex flex-col gap-8 md:grid md:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] md:items-start">
                {/* EL-TXN-002 일자별 그룹 */}
                <div data-month-swap className="flex min-w-0 flex-col gap-8">
                  {[...days].map(([date, rows]) => {
                    const dt = new Date(`${date}T00:00:00`);
                    const hid = `g-${date}`;
                    return (
                      <section
                        key={date}
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
                            <button
                              key={t.id}
                              type="button"
                              data-row={t.id}
                              data-flip-id={t.id}
                              onClick={() => openEdit(t)}
                              aria-pressed={on}
                              aria-label={`${c?.name}${c?.watched ? " · 감시 대상" : ""} ${krw(t.amount)}${t.memo ? ` · ${t.memo}` : ""} · 편집`}
                              className={`-mx-3 grid min-h-14 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-3 py-3 text-left tabular-nums transition-[box-shadow,background-color] duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                                on
                                  ? "bg-foreground text-background hover:shadow-[inset_0_0_0_2px_var(--watch)]"
                                  : "text-foreground hover:shadow-[inset_0_0_0_2px_var(--foreground)]"
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
                            </button>
                          );
                        })}
                      </section>
                    );
                  })}
                </div>

                {/* EL-TXN-003 편집 — md+ 우측 패널 */}
                <aside
                  aria-label="기록 편집"
                  onKeyDown={(e) => {
                    // Esc — 삭제 확인 중이면 확인만 취소, 아니면 닫기
                    if (e.key !== "Escape" || !sel || busy) return;
                    if (confirming) setConfirming(false);
                    else closeEdit();
                  }}
                  className={`hidden max-h-[calc(100vh-48px)] overflow-auto border md:sticky md:top-6 md:block ${
                    sel && wide ? "border-foreground" : "border-border"
                  }`}
                >
                  {wide && editForm ? (
                    editForm
                  ) : (
                    <div className="flex min-h-[220px] flex-col justify-end gap-2 px-6 py-8">
                      <span className={LABEL}>Edit · 편집</span>
                      <p className="text-xl font-medium leading-[1.3] tracking-[-0.02em] text-muted-foreground text-pretty">
                        항목을 탭하면 여기서 바로 고칠 수 있어요.
                      </p>
                    </div>
                  )}
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      {/* EL-TXN-003 편집 — 모바일 바텀시트 (vaul: 포커스 트랩·Esc·스크림·드래그) */}
      <Drawer.Root open={!!sel && !wide} onOpenChange={(o) => !o && !busy && closeEdit()} dismissible={!busy}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[25] bg-surface-dim/60" />
          <Drawer.Content
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              amountInput.current?.focus();
            }}
            onCloseAutoFocus={(e) => e.preventDefault()} // 포커스 복원은 closeEdit
            onEscapeKeyDown={(e) => {
              // 삭제 확인 중이면 확인만 취소
              if (!confirming) return;
              e.preventDefault();
              setConfirming(false);
            }}
            className="fixed inset-x-0 bottom-0 z-[26] max-h-[85vh] overflow-auto border-t-[3px] border-foreground bg-background shadow-[0_-12px_40px_rgba(0,0,0,.5)] outline-none"
          >
            {!wide && editForm}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <Toast text={toast} />
    </div>
  );
}
