"use client";

import { X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { amountDigits, amountText } from "@/lib/format";
import { useGSAP } from "@/lib/motion";
import { m10Shake } from "@/lib/motion/presets";
import { isValidAmount } from "@/lib/store";
import { ERR, LABEL } from "@/lib/utils";

export type NewSub = { name: string; amount: number; day: number; categoryId: string | null };
type Form = { name: string; amount: string; day: string; categoryId: string | null };
type Errors = { name?: string; amount?: string; day?: string };

const NUM_INPUT =
  "h-[46px] min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-[-0.02em] text-foreground caret-watch tabular-nums shadow-[inset_0_-3px_0_transparent] outline-none transition-shadow focus:shadow-[inset_0_-3px_0_var(--watch)]";

type Props = {
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string }[];
  defaultCat: string | null;
  onCreate: (input: NewSub) => boolean; // 저장 실패면 false
};

/** 구독 추가 바텀시트 (EL-SUB-001) — 폼 상태는 시트가 갖고, 열릴 때마다 비운다 */
export function AddSheet({ open, onClose, categories, defaultCat, onCreate }: Props) {
  const empty: Form = { name: "", amount: "", day: "", categoryId: defaultCat };
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [saveError, setSaveError] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const amountWrap = useRef<HTMLDivElement>(null);
  const dayWrap = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP();
  const shake = contextSafe((el: Element | null) => el && m10Shake(el));

  // 열리는 순간 초기화 — 렌더 중 이전 값 비교 패턴
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(empty);
      setErrors({});
      setSaveError(false);
    }
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
    if (!isValidAmount(amt)) e.amount = "1원 이상 1억원 이하로 입력해 주세요.";
    if (!(Number.isInteger(day) && day >= 1 && day <= 28)) e.day = "결제일은 1~28 사이로 입력해 주세요.";
    return e;
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      if (errs.name) nameInput.current?.focus();
      if (errs.amount) shake(amountWrap.current);
      if (errs.day) shake(dayWrap.current);
      return;
    }
    setSaveError(false);
    const ok = onCreate({ name: form.name.trim(), amount: Number(form.amount), day: Number(form.day), categoryId: form.categoryId });
    if (!ok) setSaveError(true);
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          nameInput.current?.focus();
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          document.querySelector<HTMLButtonElement>("[data-add]")?.focus({ preventScroll: true });
        }}
      >
        <form onSubmit={submit} noValidate className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 pb-8 pt-5 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <DrawerTitle className={`${LABEL} font-semibold`}>Add · 구독 추가</DrawerTitle>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="닫기" className="-my-2.5 -mr-2.5">
              <X className="size-5" aria-hidden />
            </Button>
          </div>
          {saveError && (
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
                  value={amountText(form.amount)}
                  onChange={(e) => setField("amount", amountDigits(e.target.value))}
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
            <Button type="button" variant="secondary" size="lg" onClick={onClose} className="font-semibold">
              취소
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
