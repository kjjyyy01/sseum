"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { FeedbackLine, type FeedbackData, type FeedbackHandle } from "@/components/feedback-line";
import { Toast, useToast } from "@/components/toast";
import { krw } from "@/lib/format";
import {
  countThisWeek,
  createTransaction,
  derivePresets,
  diffVsPrevMonthToDate,
  getDb,
  sumThisMonth,
  todayStr,
  useDb,
  type Db,
} from "@/lib/store";
import { useGSAP } from "@/lib/motion";
import { m10Shake } from "@/lib/motion/presets";
import { tally } from "@/lib/tally";

type Category = { id: string; name: string; watched: boolean; week: number }; // week = 이번 주 횟수
type Preset = { id: string; categoryId: string; amount: number };
type Errors = { amount?: string; date?: string; memo?: string };
type Tx = { amount: number; categoryId: string; date: string; memo: string };

const AMOUNT_MAX = 100_000_000; // BR-001
const MEMO_MAX = 100; // BR-016

const LABEL = "text-[.8125rem] uppercase leading-[1.25] tracking-[.08em] text-muted-foreground";
const ERR = "text-[.8125rem] font-semibold leading-[1.4] text-negative";

const noSubscribe = () => () => {};

/** 보관 안 된 카테고리 — 최근 사용순, 안 쓴 것은 원래 순서로 뒤에 */
function selectCategories(db: Db, today: string): Category[] {
  const last = new Map<string, number>();
  for (const t of db.txns) last.set(t.categoryId, Math.max(last.get(t.categoryId) ?? 0, t.createdAt));
  return db.categories
    .filter((c) => !c.archived)
    .map((c, i) => ({ c, i, at: last.get(c.id) ?? 0 }))
    .sort((a, b) => b.at - a.at || a.i - b.i)
    .map(({ c }) => ({ id: c.id, name: c.name, watched: c.watched, week: countThisWeek(db, c.id, today) }));
}

/** SCR-002 — 저장소를 읽은 뒤에만 렌더 */
export function QuickInput() {
  const db = useDb();
  if (!db) return null;
  const today = todayStr();
  return <QuickInputForm categories={selectCategories(db, today)} presets={derivePresets(db, today)} />;
}

/** 30ms 뒤 포커스 — 렌더 직후 disabled가 풀린 다음 */
function focusLater(el: HTMLInputElement | null) {
  setTimeout(() => {
    if (el && !el.disabled) el.focus({ preventScroll: true });
  }, 30);
}

function QuickInputForm({ categories, presets }: { categories: Category[]; presets: Preset[] }) {
  const [amount, setAmount] = useState(""); // 숫자만
  const [catId, setCatId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(""); // "" = 오늘
  const [moreOpen, setMoreOpen] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState(false);
  const [fb, setFb] = useState<FeedbackData | null>(null);
  const { text: toast, show: showToast } = useToast();

  const root = useRef<HTMLDivElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);
  const amountWrap = useRef<HTMLDivElement>(null);
  const retryBtn = useRef<HTMLButtonElement>(null);
  const fbRef = useRef<FeedbackHandle>(null);

  const today = useSyncExternalStore(noSubscribe, todayStr, () => "");
  const n = Number(amount || 0);
  const amountValid = n >= 1 && n <= AMOUNT_MAX;
  const selected = categories.find((c) => c.id === catId);
  const dateValue = date || today;
  const amountDisplay = amount ? n.toLocaleString("ko-KR") : "";

  // M-10 — 이벤트 핸들러의 트윈은 contextSafe로
  const { contextSafe } = useGSAP({ scope: root });
  const shake = contextSafe((el: Element | null) => el && m10Shake(el));

  useEffect(() => {
    focusLater(amountInput.current);
  }, []);
  useEffect(() => {
    if (serverError) retryBtn.current?.focus({ preventScroll: true });
  }, [serverError]);

  /* 검증 — BR-001 / BR-002 / BR-016 */
  function validate(): Errors {
    const e: Errors = {};
    if (!amountValid) e.amount = "1원 이상 1억원 이하로 입력해 주세요.";
    if (date && date > today) e.date = "미래 날짜는 기록할 수 없어요.";
    if (memo.trim().length > MEMO_MAX) e.memo = "메모는 100자까지예요.";
    return e;
  }

  function onAmount(e: React.ChangeEvent<HTMLInputElement>) {
    if (fb) fbRef.current?.dismiss(); // 다음 입력 시작 → 피드백 즉시 퇴장
    const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);
    setAmount(digits);
    setErrors((er) => ({ ...er, amount: undefined }));
  }

  // REQ-INPUT-004 카테고리 탭 = 저장 (금액이 유효할 때)
  function pickCategory(id: string) {
    if (fb) fbRef.current?.dismiss();
    const errs = validate();
    if (!errs.amount && !errs.date && !errs.memo) {
      save({ amount: n, categoryId: id, date: dateValue, memo });
      return;
    }
    setCatId(id);
    setErrors(amount ? errs : {});
    if (amount) shake(amountWrap.current);
    focusLater(amountInput.current);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length || !catId) {
      setErrors(errs);
      if (errs.date || errs.memo) setMoreOpen(true);
      if (errs.amount) {
        shake(amountWrap.current);
        focusLater(amountInput.current);
      } else if (!catId) {
        showToast("카테고리를 골라 주세요");
      }
      return;
    }
    save({ amount: n, categoryId: catId, date: dateValue, memo });
  }

  // REQ-INPUT-003 프리셋 1탭 저장
  function tapPreset(p: Preset) {
    if (fb) fbRef.current?.dismiss();
    save({ amount: p.amount, categoryId: p.categoryId, date: today, memo: "" });
  }

  function retry() {
    setServerError(false);
    if (catId) save({ amount: n, categoryId: catId, date: dateValue, memo });
  }

  // REQ-INPUT-001 — 저장 실패(용량 등)면 입력값 유지 + 재시도 배너
  function save(tx: Tx) {
    setErrors({});
    if (!createTransaction(tx)) {
      setServerError(true);
      return;
    }
    setServerError(false);
    const db = getDb();
    const c = categories.find((x) => x.id === tx.categoryId)!;
    // 폼 초기화 → 피드백 → 금액 재포커스 (연속 입력)
    setAmount("");
    setCatId(null);
    setMemo("");
    setDate("");
    setMoreOpen(false);
    setFb({
      category: c.name,
      spent: tx.amount,
      count: countThisWeek(db, c.id, today),
      total: sumThisMonth(db, c.id, today),
      diff: diffVsPrevMonthToDate(db, c.id, today),
      watched: c.watched,
    });
    focusLater(amountInput.current);
  }

  function onMemoKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  const catHint = selected
    ? `${selected.name} 선택 · 금액 입력 후 Enter`
    : amountValid
      ? "탭하면 바로 저장돼요"
      : "금액 먼저, 카테고리 탭으로 저장";
  const memoSnip = memo.trim();
  const moreSummary =
    (memoSnip ? `"${memoSnip.slice(0, 18)}${memoSnip.length > 18 ? "…" : ""}" · ` : "") +
    (!date || date === today ? "오늘" : date);
  const canSave = amountValid && !!catId;

  return (
    <div
      ref={root}
      className="flex min-h-screen flex-col bg-background"
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 80% -10%, rgba(227,181,58,.10), transparent 60%), radial-gradient(800px 500px at -10% 110%, rgba(227,181,58,.06), transparent 60%)",
      }}
    >
      {/* 상단 바 — 닫기만, 내비 없음 */}
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-[72px] max-w-[1120px] flex-wrap items-center gap-6 px-4 py-3 md:px-8">
          <Link
            href="/"
            aria-label="sseum 홈"
            className="flex min-h-11 items-center gap-1.5 text-[1.625rem] font-bold leading-none tracking-[-0.04em]"
          >
            sseum
            <span className="inline-block size-2 bg-watch" />
          </Link>
          <span className={LABEL}>Input · 지출 입력</span>
          <span className="flex-1" />
          <Link
            href="/"
            aria-label="닫기 · 이전 화면으로"
            className="inline-flex min-h-11 min-w-11 items-center justify-center border border-foreground text-[1.375rem] leading-none hover:bg-foreground hover:text-background active:scale-[.97]"
          >
            ×
          </Link>
        </div>
      </header>


      <main className="flex-1">
        <div className="mx-auto flex max-w-[760px] flex-col gap-12 px-4 pb-40 pt-12 md:px-8">
          {serverError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-4 border border-foreground px-5 py-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[1.0625rem] font-semibold leading-[1.4] tracking-[-0.01em]">
                  잠시 문제가 생겼어요. 다시 시도해 주세요.
                </span>
                <span className="text-[.8125rem] leading-[1.4] text-muted-foreground">입력한 내용은 그대로 남아 있어요.</span>
              </div>
              <button
                ref={retryBtn}
                type="button"
                onClick={retry}
                className="min-h-11 cursor-pointer border border-foreground px-5 text-[.9375rem] font-semibold hover:bg-foreground hover:text-background active:scale-[.97]"
              >
                다시 시도
              </button>
            </div>
          )}

          {categories.length === 0 ? (
            <section aria-labelledby="empty-title" className="flex flex-col items-start gap-6 border-y border-border py-18">
              <h1
                id="empty-title"
                className="max-w-[520px] text-[2.75rem] font-medium leading-[1.05] tracking-[-0.04em] text-pretty"
              >
                사용할 카테고리가 없어요. 카테고리를 먼저 만들어 주세요.
              </h1>
              <Link
                href="/categories"
                className="inline-flex min-h-14 items-center bg-watch px-7 text-[1.0625rem] font-bold text-watch-foreground hover:bg-watch-hover active:scale-[.97]"
              >
                카테고리 만들기 →
              </Link>
            </section>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-12">
              {/* 프리셋 — 반복 조합이 생긴 뒤에만 (BR-007) */}
              {presets.length > 0 && (
                <section aria-labelledby="preset-title" className="flex flex-col gap-2">
                  <h2 id="preset-title" className={LABEL}>
                    자주 쓰는 조합 · 1탭
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => {
                      const c = categories.find((x) => x.id === p.categoryId);
                      if (!c) return null;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => tapPreset(p)}
                          aria-label={`${c.name} ${krw(p.amount)} 바로 저장`}
                          className="inline-flex min-h-12 cursor-pointer items-center gap-2.5 border border-foreground px-4 text-[.9375rem] font-semibold tracking-[-0.01em] tabular-nums hover:bg-foreground hover:text-background active:scale-[.97] disabled:opacity-40"
                        >
                          {c.name}
                          <span className="font-normal">{krw(p.amount)}</span>
                          {c.watched && <span aria-hidden className="inline-block size-1.5 bg-watch" />}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 금액 — LCP */}
              <section aria-labelledby="amt-title" className="flex flex-col gap-1 border-t-[3px] border-foreground pt-3.5">
                <label id="amt-title" htmlFor="amount" className={LABEL}>
                  얼마 썼어요?
                </label>
                <div ref={amountWrap} className="flex flex-wrap items-baseline gap-2">
                  <input
                    ref={amountInput}
                    id="amount"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    size={Math.max(1, amountDisplay.length || 1)}
                    value={amountDisplay}
                    onChange={onAmount}
                    aria-invalid={!!errors.amount}
                    aria-describedby="amt-err"
                    className="field-sizing-content min-w-[1ch] max-w-full bg-transparent pb-1.5 text-[clamp(3.5rem,14vw,8rem)] font-bold leading-[.9] tracking-[-0.06em] text-foreground caret-watch tabular-nums shadow-[inset_0_-4px_0_transparent] outline-none transition-shadow focus:shadow-[inset_0_-4px_0_var(--watch)]"
                  />
                  <span
                    aria-hidden
                    className={`text-[clamp(1.5rem,5vw,2.75rem)] font-medium leading-none tracking-[-0.02em] ${
                      amount ? "text-foreground" : "text-placeholder"
                    }`}
                  >
                    원
                  </span>
                </div>
                <div id="amt-err" role="alert" aria-live="polite" className="min-h-5 text-[.9375rem] font-semibold leading-[1.4] text-negative">
                  {errors.amount}
                </div>
              </section>

              {/* 카테고리 — 탭이 곧 저장 */}
              <section aria-labelledby="cat-title" className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 id="cat-title" className={LABEL}>
                    카테고리 · 최근 사용순
                  </h2>
                  <span className="text-[.8125rem] leading-[1.25] text-muted-foreground">{catHint}</span>
                </div>
                <div
                  role="group"
                  aria-labelledby="cat-title"
                  className="grid gap-px border border-border bg-border [grid-template-columns:repeat(auto-fill,minmax(128px,1fr))]"
                >
                  {categories.map((c) => {
                    const on = c.id === catId;
                    const wk = c.week;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => pickCategory(c.id)}
                        aria-label={`${c.name}${c.watched ? " · 감시 대상" : ""} · 이번 주 ${wk}번`}
                        className={`flex min-h-[88px] cursor-pointer flex-col items-start justify-between gap-3 px-4 py-3.5 text-left transition-shadow disabled:opacity-40 ${
                          on
                            ? "bg-foreground text-background hover:shadow-[inset_0_0_0_2px_var(--watch)] active:shadow-[inset_0_0_0_3px_var(--watch)]"
                            : "bg-background text-foreground hover:shadow-[inset_0_0_0_2px_var(--foreground)] active:shadow-[inset_0_0_0_3px_var(--foreground)]"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-[1.0625rem] font-semibold leading-[1.2] tracking-[-0.02em]">
                          {c.name}
                          {c.watched && <span aria-hidden className={`inline-block size-1.5 ${on ? "bg-background" : "bg-watch"}`} />}
                        </span>
                        <span aria-hidden className="relative block h-3.5 w-full">
                          {tally(wk, 0.5).map((s, i) => (
                            <span
                              key={i}
                              className={`absolute origin-center ${on ? "bg-background" : c.watched ? "bg-watch" : "bg-muted-foreground"}`}
                              style={{ left: s.left, top: s.top, width: s.w, height: s.h, transform: s.rot }}
                            />
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 접힘 영역: 메모 · 날짜 — CSS grid-rows 전환, 닫히면 inert */}
              <section className="flex flex-col border-t border-border">
                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  aria-expanded={moreOpen}
                  aria-controls="more"
                  className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 text-left hover:text-watch"
                >
                  <span className="flex flex-wrap items-baseline gap-4 text-[.9375rem] leading-[1.4]">
                    <span className="font-semibold">{moreOpen ? "메모 · 날짜" : "메모 추가 · 날짜"}</span>
                    <span className="tabular-nums text-muted-foreground">{moreSummary}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`text-xl leading-none transition-transform duration-200 motion-reduce:transition-none ${moreOpen ? "rotate-180" : ""}`}
                  >
                    ↓
                  </span>
                </button>
                <div
                  id="more"
                  inert={!moreOpen}
                  className={`grid transition-[grid-template-rows] duration-[250ms] motion-reduce:transition-none ${
                    moreOpen ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="grid gap-6 pb-6 pt-2 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="memo" className={LABEL}>
                          메모 · {memo.length}/{MEMO_MAX}
                        </label>
                        <textarea
                          id="memo"
                          rows={2}
                          value={memo}
                          onChange={(e) => {
                            setMemo(e.target.value.slice(0, 120));
                            setErrors((er) => ({ ...er, memo: undefined }));
                          }}
                          onKeyDown={onMemoKey}
                          placeholder="배민 · 점심"
                          aria-invalid={!!errors.memo}
                          aria-describedby="memo-err"
                          className={`min-h-14 resize-y border bg-transparent px-3.5 py-3 text-[1.0625rem] leading-[1.5] text-foreground ${
                            errors.memo ? "border-negative" : "border-placeholder"
                          }`}
                        />
                        <span id="memo-err" role="alert" className={`min-h-5 ${ERR}`}>
                          {errors.memo}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="date" className={LABEL}>
                          날짜 · 오늘까지
                        </label>
                        <input
                          id="date"
                          type="date"
                          value={dateValue}
                          max={today}
                          onChange={(e) => {
                            setDate(e.target.value);
                            setErrors((er) => ({ ...er, date: undefined }));
                          }}
                          aria-invalid={!!errors.date}
                          aria-describedby="date-err"
                          className={`min-h-14 border bg-transparent px-3.5 text-[1.0625rem] text-foreground tabular-nums scheme-dark ${
                            errors.date ? "border-negative" : "border-placeholder"
                          }`}
                        />
                        <span id="date-err" role="alert" className={`min-h-5 ${ERR}`}>
                          {errors.date}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 저장 — 보조. 주 경로는 카테고리 탭 */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  className={`inline-flex min-h-14 cursor-pointer items-center gap-3 px-7 text-[1.0625rem] font-bold tracking-[-0.01em] text-background hover:bg-watch-hover active:scale-[.97] disabled:opacity-40 ${
                    canSave ? "bg-watch" : "bg-muted-foreground"
                  }`}
                >
                  저장
                </button>
                <span className="text-[.8125rem] leading-[1.4] text-muted-foreground">
                  {canSave ? "Enter" : "카테고리 탭이 저장이라 이 버튼은 보조예요"}
                </span>
              </div>
            </form>
          )}
        </div>
      </main>

      <Toast text={toast} bottom={fb ? 260 : 32} />

      {fb && <FeedbackLine ref={fbRef} data={fb} onDismissed={() => setFb(null)} />}
    </div>
  );
}
