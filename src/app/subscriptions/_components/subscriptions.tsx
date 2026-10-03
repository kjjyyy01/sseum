"use client";

import { ChevronDown, MoreHorizontal, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { AppHeader } from "@/components/app-header";
import { Toast, useToast } from "@/components/toast";
import { focusMore } from "@/lib/focus";
import { addMonth, cancelSubscription, checkinOf, createSubscription, fixedCost as dbFixedCost, submitCheckin, todayStr, useDb, type Db } from "@/lib/store";
import { krw } from "@/lib/format";
import { Flip, gsap, prefersReduced, useGSAP } from "@/lib/motion";
import { flipRows, m01Enter, m02CountUp, m10Shake, revealInstant } from "@/lib/motion/presets";

type Subscription = {
  id: string;
  name: string;
  amount: number;
  day: number; // 결제일 1~28 (BR-015)
  categoryId: string | null;
  checkin: "used" | "unused" | null; // 이번 달 체크인
  prev: ("used" | "unused")[]; // 직전 달부터 과거순
  cancelledAt: string | null; // "2026.06" — 있으면 해지
};
type CategoryOption = { id: string; name: string };

type Form = { name: string; amount: string; day: string; categoryId: string | null };
type Errors = { name?: string; amount?: string; day?: string };

const LABEL = "text-[.8125rem] uppercase leading-[1.25] tracking-[.08em] text-muted-foreground";
const ERR = "min-h-5 text-[.8125rem] font-semibold leading-[1.4] text-negative";
const NUM_INPUT =
  "h-[46px] min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-[-0.02em] text-foreground caret-watch tabular-nums shadow-[inset_0_-3px_0_transparent] outline-none transition-shadow focus:shadow-[inset_0_-3px_0_var(--watch)]";

/** BR-010 — 이번 달·직전 달 연속 미사용이면 해지 검토 */
const needsReview = (s: Subscription) => s.checkin === "unused" && s.prev[0] === "unused";
const toUse = (v: boolean | null) => (v === null ? null : v ? "used" : "unused");

/** 저장소 → 화면 행. 체크인은 이번 달 + 직전 달 (BR-010) */
function selectSubs(db: Db, ym: string): Subscription[] {
  return db.subs.map((s) => {
    const prev = toUse(checkinOf(db, s.id, addMonth(ym, -1)));
    return {
      ...s,
      cancelledAt: s.cancelledAt?.replace("-", ".") ?? null, // 표시용 "2026.06"
      checkin: toUse(checkinOf(db, s.id, ym)),
      prev: prev ? [prev] : [],
    };
  });
}

/** SCR-005 — 저장소를 읽은 뒤에만 렌더 */
export function SubscriptionsScreen() {
  const db = useDb();
  if (!db) return null;
  const ym = todayStr().slice(0, 7);
  const categories = db.categories.filter((c) => !c.archived).map((c) => ({ id: c.id, name: c.name }));
  return (
    <Screen
      subs={selectSubs(db, ym)}
      total={dbFixedCost(db)}
      ym={ym}
      categories={categories}
      defaultCat={categories.find((c) => c.name === "구독")?.id ?? null}
    />
  );
}

type Props = { subs: Subscription[]; total: number; ym: string; categories: CategoryOption[]; defaultCat: string | null };

function Screen({ subs, total, ym, categories, defaultCat }: Props) {
  const EMPTY_FORM: Form = { name: "", amount: "", day: "", categoryId: defaultCat };
  const [confirming, setConfirming] = useState<string | null>(null);
  const [histOpen, setHistOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetError, setSheetError] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const { text: toast, show: showToast } = useToast();

  const root = useRef<HTMLDivElement>(null);
  const totalEl = useRef<HTMLSpanElement>(null);
  const shownTotal = useRef(0);
  const nameInput = useRef<HTMLInputElement>(null);
  const amountWrap = useRef<HTMLDivElement>(null);
  const dayWrap = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const newIds = useRef<Set<string> | null>(null); // 추가 직전 id 목록

  const active = subs.filter((s) => !s.cancelledAt);
  const hist = subs.filter((s) => s.cancelledAt);
  const isEmpty = active.length === 0;
  const pending = active.filter((s) => s.checkin === null).length;

  const { contextSafe } = useGSAP({ scope: root });
  const shake = contextSafe((el: Element | null) => el && m10Shake(el));

  /* M-01 섹션 등장 — 뷰 전환·빈 상태 해제 시 */
  useGSAP(
    () => {
      if (isEmpty) {
        revealInstant("[data-animate='M-01']"); // 빈 상태에 남는 해지 이력
        return;
      }
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
    { scope: root, dependencies: [isEmpty] },
  );

  /* M-02 고정비 카운트업 — 마운트·변경 시. 값은 DOM에 직접 */
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
    { dependencies: [total] },
  );

  /* 행 이동(Flip) 또는 새 행 등장 */
  useGSAP(
    () => {
      if (flipState.current) {
        flipRows(flipState.current);
        flipState.current = null;
        return;
      }
      if (newIds.current) {
        const added = subs.find((s) => !newIds.current!.has(s.id));
        if (added) m01Enter(`[data-sub="${added.id}"]`);
        newIds.current = null;
      }
    },
    { scope: root, dependencies: [subs.length, hist.length] },
  );

  /* 해지 확인 — 확인 버튼 포커스, Esc 취소 */
  useEffect(() => {
    if (!confirming) return;
    root.current?.querySelector<HTMLButtonElement>(`[data-sub="${confirming}"] [data-confirm] button`)?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfirming(null);
        focusMore(root.current, `[data-sub="${confirming}"]`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming]);

  // REQ-SUB-002 체크인 — 응답 후 반영 (낙관적 처리 금지)
  function checkin(id: string, used: boolean) {
    if (!submitCheckin(id, ym, used)) {
      showToast("저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
      return;
    }
    focusMore(root.current, `[data-sub="${id}"]`);
    if (!used) showToast("해지 검토 · 다음 달에 한 번 더 물어볼게요");
  }

  // REQ-SUB-003 해지 → 이력으로 Flip
  function cancelSub(id: string) {
    const rows = root.current?.querySelectorAll("[data-flip-id]");
    if (rows?.length) flipState.current = Flip.getState(rows);
    if (!cancelSubscription(id, ym)) {
      flipState.current = null;
      showToast("저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
      return;
    }
    setConfirming(null);
    setHistOpen(true);
    showToast("해지했어요");
    setTimeout(() => root.current?.querySelector<HTMLButtonElement>("[aria-controls='hist']")?.focus({ preventScroll: true }), 30);
  }

  // REQ-SUB-001 추가 시트
  function openSheet() {
    setForm(EMPTY_FORM);
    setErrors({});
    setSheetError(false);
    setSheetOpen(true);
  }
  function setField<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }
  function validate(f: Form): Errors {
    const e: Errors = {};
    const name = f.name.trim();
    const amt = Number(f.amount || 0);
    const day = Number(f.day || 0);
    if (name.length < 1 || name.length > 30) e.name = "이름은 1~30자로 입력해 주세요.";
    if (!(amt >= 1 && amt <= 100_000_000)) e.amount = "1원 이상 1억원 이하로 입력해 주세요.";
    if (!(Number.isInteger(day) && day >= 1 && day <= 28)) e.day = "결제일은 1~28 사이로 입력해 주세요.";
    return e;
  }
  function submitSheet(e: FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      if (errs.name) nameInput.current?.focus();
      if (errs.amount) shake(amountWrap.current);
      if (errs.day) shake(dayWrap.current);
      return;
    }
    setSheetError(false);
    const before = new Set(subs.map((s) => s.id));
    const ok = createSubscription({
      name: form.name.trim(),
      amount: Number(form.amount),
      day: Number(form.day),
      categoryId: form.categoryId,
    });
    if (!ok) {
      setSheetError(true);
      return;
    }
    newIds.current = before; // 다음 렌더에서 새 행을 찾아 등장 모션
    setSheetOpen(false);
  }


  return (
    <div
      ref={root}
      className="flex min-h-screen flex-col bg-background"
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 80% -10%, rgba(227,181,58,.10), transparent 60%), radial-gradient(800px 500px at -10% 110%, rgba(227,181,58,.06), transparent 60%)",
      }}
    >
      <AppHeader current="subscriptions" />

      <main className="flex-1">
        <div className="mx-auto flex max-w-[640px] flex-col gap-10 px-4 pb-40 pt-12 md:px-8">
          {/* 월 고정비 */}
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2.5">
              <h1 className={`${LABEL} font-semibold`}>Fixed · 월 고정비</h1>
              <span ref={totalEl} className="text-[clamp(3rem,10vw,4.5rem)] font-bold leading-[.95] tracking-[-0.05em] tabular-nums">
                {krw(total)}
              </span>
              <span role="status" aria-live="polite" className="sr-only">
                {`월 고정비 ${krw(total)}`}
              </span>
              <p className="max-w-[400px] text-[.9375rem] leading-[1.5] text-muted-foreground text-pretty">
                {isEmpty ? "아직 등록한 구독이 없어요." : `${active.length}개 구독 · 매달 자동으로 나가요. 거래로 자동 기록되지는 않아요.`}
              </p>
            </div>
            {!isEmpty && (
              <Button type="button" size="lg" data-add onClick={openSheet} className="mb-1.5 gap-2.5">
                <Plus className="size-5" aria-hidden />구독 추가
              </Button>
            )}
          </div>

          {isEmpty && (
            <section aria-labelledby="empty-title" className="flex flex-col items-start gap-6 border-y border-border py-18">
              <h2 id="empty-title" className="max-w-[480px] text-[2.75rem] font-medium leading-[1.05] tracking-[-0.04em] text-pretty">
                매달 나가는 구독을
                <br />
                등록해 두세요
              </h2>
              <p className="max-w-[420px] text-[1.0625rem] leading-[1.55] text-muted-foreground text-pretty">
                고정비가 얼마인지 보이고, 매달 한 번 &quot;이번 달 썼어요?&quot;를 물어봐 드려요.
              </p>
              <Button type="button" size="lg" data-add onClick={openSheet}>
                + 구독 추가
              </Button>
            </section>
          )}

          {/* 구독 리스트 */}
          {!isEmpty && (
              <section aria-labelledby="list-title" data-animate="M-01" className="flex flex-col border-t-[3px] border-foreground pt-3">
                <div className="flex items-baseline justify-between gap-3 pb-1">
                  <h2 id="list-title" className={LABEL}>
                    구독 · {active.length}
                  </h2>
                  <span className="text-[.8125rem] leading-[1.25] text-muted-foreground">
                    {pending ? `이번 달 체크인 ${pending}개 남음` : "이번 달 체크인 완료"}
                  </span>
                </div>

                {active.map((s) => {
                  const cat = categories.find((c) => c.id === s.categoryId);
                  return (
                    <div key={s.id} data-sub={s.id} data-flip-id={s.id} className="relative flex flex-col gap-3 border-b border-border py-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1">
                          <span className="flex flex-wrap items-center gap-2.5">
                            <span className="text-xl font-semibold leading-[1.2] tracking-[-0.02em]">{s.name}</span>
                            {needsReview(s) && (
                              <span className="bg-foreground px-2 py-[5px] text-[.8125rem] font-bold leading-none tracking-[.04em] text-background">해지 검토</span>
                            )}
                          </span>
                          <span className="text-[.9375rem] leading-[1.4] tabular-nums text-muted-foreground">
                            매달 {s.day}일 · <strong className="font-semibold text-foreground">{krw(s.amount)}</strong>
                            {cat && ` · ${cat.name}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {s.checkin === null ? (
                            <div role="group" aria-label={`${s.name} 이번 달 썼어요?`} className="flex flex-wrap items-center gap-3">
                              <span className="whitespace-nowrap text-[.9375rem] font-medium leading-[1.3]">이번 달 썼어요?</span>
                              <div className="flex gap-px border border-foreground/30 bg-foreground/30">
                                {[
                                  { label: "썼어요", used: true },
                                  { label: "안 썼어요", used: false },
                                ].map((b) => (
                                  <Button
                                    key={b.label}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => checkin(s.id, b.used)}
                                    className="bg-background px-[18px] font-semibold hover:bg-foreground hover:text-background"
                                  >
                                    {b.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-[.9375rem] font-semibold leading-[1.3] animate-[ss-rise_.2s_ease-out] motion-reduce:animate-none ${
                                s.checkin === "used" ? "text-muted-foreground" : "text-foreground"
                              }`}
                            >
                              <span aria-hidden className={`inline-block size-2 ${s.checkin === "used" ? "bg-muted-foreground" : "bg-watch"}`} />
                              {s.checkin === "used" ? "이번 달 사용" : "이번 달 미사용"}
                            </span>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`${s.name} 더보기`}>
                                <MoreHorizontal className="size-5" aria-hidden />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              aria-label={`${s.name} 더보기`}
                              // 메뉴가 닫히며 트리거로 돌아가는 포커스를 가로채 확인 버튼으로 — effect보다 늦게 실행된다
                              onCloseAutoFocus={(e) => {
                                if (confirming !== s.id) return;
                                e.preventDefault();
                                root.current?.querySelector<HTMLButtonElement>(`[data-sub="${s.id}"] [data-confirm] button`)?.focus({ preventScroll: true });
                              }}
                            >
                              <DropdownMenuItem onSelect={() => setConfirming(s.id)}>해지</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {confirming === s.id && (
                        <div
                          data-confirm
                          role="group"
                          aria-label="해지 확인"
                          className="flex flex-wrap items-center justify-between gap-3 bg-foreground px-4 py-3.5 text-background animate-[ss-rise_.2s_ease-out] motion-reduce:animate-none"
                        >
                          <span className="text-[.9375rem] font-semibold leading-[1.4]">{s.name} 구독을 해지할까요? 이력은 남아요.</span>
                          <div className="flex gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelSub(s.id)}
                              className="bg-background px-[18px] font-bold text-foreground hover:bg-negative hover:text-background"
                            >
                              해지
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setConfirming(null);
                                focusMore(root.current, `[data-sub="${s.id}"]`);
                              }}
                              className="border border-background px-3.5 font-semibold hover:text-background"
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>

          )}

          {/* 해지 이력 — 해지한 구독이 있으면 빈 상태에서도 보인다. Flip 측정과 충돌하지 않게 전환 없이 토글 */}
          {(!isEmpty || hist.length > 0) && (
              <section aria-labelledby="hist-title" data-animate="M-01" className="flex flex-col border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setHistOpen((o) => !o)}
                  aria-expanded={histOpen}
                  aria-controls="hist"
                  className="min-h-14 w-full justify-between gap-4 px-0 text-left"
                >
                  <h2 id="hist-title" className="text-[.8125rem] font-semibold uppercase leading-[1.25] tracking-[.08em]">
                    해지 이력 · {hist.length}
                  </h2>
                  <span aria-hidden className={`text-xl leading-none transition-transform duration-200 motion-reduce:transition-none ${histOpen ? "rotate-180" : ""}`}>
                    <ChevronDown className="size-5" aria-hidden />
                  </span>
                </Button>
                {histOpen && (
                  <div id="hist" className="flex flex-col pb-2">
                    {hist.length === 0 && <p className="pb-4 pt-2 text-[.9375rem] leading-[1.5] text-muted-foreground">해지한 구독이 없어요.</p>}
                    {hist.map((h) => (
                      <div key={h.id} data-sub={h.id} data-flip-id={h.id} className="flex min-h-14 flex-wrap items-center justify-between gap-4 border-b border-border py-1.5">
                        <span className="text-[1.0625rem] font-medium leading-[1.2] tracking-[-0.01em] text-muted-foreground">{h.name}</span>
                        <span className="text-[.8125rem] leading-[1.4] tabular-nums text-muted-foreground">
                          {krw(h.amount)} · {h.cancelledAt} 해지
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
          )}
        </div>
      </main>

      {/* 추가 시트 — vaul: 포커스 트랩·Esc·스크림·드래그 닫기 내장 */}
      <Drawer open={sheetOpen} onOpenChange={(o) => !o && setSheetOpen(false)}>
          <DrawerContent
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              nameInput.current?.focus();
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              root.current?.querySelector<HTMLButtonElement>("[data-add]")?.focus({ preventScroll: true });
            }}
            className=""
          >
            <form onSubmit={submitSheet} noValidate className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 pb-8 pt-5 md:px-8">
              <div className="flex items-center justify-between gap-3">
                <DrawerTitle className={`${LABEL} font-semibold`}>Add · 구독 추가</DrawerTitle>
                <Button type="button" variant="ghost" size="icon" onClick={() => setSheetOpen(false)} aria-label="닫기" className="-my-2.5 -mr-2.5">
                  <X className="size-5" aria-hidden />
                </Button>
              </div>
              {sheetError && (
                <div role="alert" className="border border-foreground px-3.5 py-3 text-[.9375rem] font-semibold leading-[1.4]">
                  잠시 문제가 생겼어요. 다시 시도해 주세요.
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="f-name" className={`${LABEL} block`}>
                  이름 · 1~30자
                </Label>
                <Input
                  ref={nameInput}
                  id="f-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value.slice(0, 34))}
                  placeholder="넷플릭스"
                  maxLength={34}
                  aria-invalid={!!errors.name}
                  aria-describedby="f-name-err"
                  />
                <span id="f-name-err" role="alert" className={ERR}>
                  {errors.name}
                </span>
              </div>

              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="f-amount" className={`${LABEL} block`}>
                    월 금액
                  </Label>
                  <div ref={amountWrap} className={`flex min-h-12 items-baseline gap-1.5 border px-3.5 ${errors.amount ? "border-negative" : "border-placeholder"}`}>
                    <input
                      id="f-amount"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.amount ? Number(form.amount).toLocaleString("ko-KR") : ""}
                      onChange={(e) => setField("amount", e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))}
                      placeholder="0"
                      aria-invalid={!!errors.amount}
                      aria-describedby="f-amount-err"
                      className={NUM_INPUT}
                    />
                    <span aria-hidden className="text-[.9375rem] text-muted-foreground">원</span>
                  </div>
                  <span id="f-amount-err" role="alert" className={ERR}>
                    {errors.amount}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="f-day" className={`${LABEL} block`}>
                    결제일 · 1~28
                  </Label>
                  <div ref={dayWrap} className={`flex min-h-12 items-baseline gap-1.5 border px-3.5 ${errors.day ? "border-negative" : "border-placeholder"}`}>
                    <span aria-hidden className="text-[.9375rem] text-muted-foreground">매달</span>
                    <input
                      id="f-day"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.day}
                      onChange={(e) => setField("day", e.target.value.replace(/\D/g, "").slice(0, 2))}
                      placeholder="15"
                      aria-invalid={!!errors.day}
                      aria-describedby="f-day-err"
                      className={NUM_INPUT}
                    />
                    <span aria-hidden className="text-[.9375rem] text-muted-foreground">일</span>
                  </div>
                  <span id="f-day-err" role="alert" className={ERR}>
                    {errors.day}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span id="f-cat-title" className={LABEL}>
                  카테고리 · 선택
                </span>
                <div role="group" aria-labelledby="f-cat-title" className="flex flex-wrap gap-1.5">
                  {categories.map((c) => {
                    const on = form.categoryId === c.id;
                    return (
                      <Toggle
                        key={c.id}
                        pressed={on}
                        onPressedChange={() => setField("categoryId", on ? null : c.id)}
                        className="border border-border text-[.9375rem] hover:border-foreground data-[state=on]:border-foreground"
                      >
                        {c.name}
                      </Toggle>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <Button type="submit" size="lg">
                  저장
                </Button>
                <Button type="button" variant="secondary" size="lg" onClick={() => setSheetOpen(false)} className="font-semibold">
                  취소
                </Button>
              </div>
            </form>
          </DrawerContent>
      </Drawer>

      <Toast text={toast} />
    </div>
  );
}
