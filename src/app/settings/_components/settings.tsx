"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { AppHeader } from "@/components/app-header";
import { Toast, useToast } from "@/components/toast";
import { krw } from "@/lib/format";
import { LABEL } from "@/lib/utils";
import { useGSAP } from "@/lib/motion";
import { m01Screen, m10Shake } from "@/lib/motion/presets";
import { WATCH_MAX, clearAll, exportJson, fixedCost, importJson, todayStr, useDb, type Db } from "@/lib/store";

const CONFIRM_WORD = "삭제"; // 지우기 확인 입력값
const STORAGE_FAIL = "저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.";

/** SCR-007 — 저장소를 읽은 뒤에만 렌더 */
export function SettingsScreen() {
  const db = useDb();
  if (!db) return null;
  return <Screen db={db} />;
}

function Screen({ db }: { db: Db }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [confirmErr, setConfirmErr] = useState("");
  const [pending, setPending] = useState<{ name: string; text: string } | null>(null); // 가져올 백업
  const { text: toast, show: showToast } = useToast();

  const root = useRef<HTMLDivElement>(null);
  const clearBtn = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const confirmInput = useRef<HTMLInputElement>(null);
  const confirmWrap = useRef<HTMLDivElement>(null);

  const active = db.categories.filter((c) => !c.archived);
  const watched = active.filter((c) => c.watched).length;
  const liveSubs = db.subs.filter((s) => !s.cancelledAt).length;
  const matches = confirm.trim() === CONFIRM_WORD;

  const { contextSafe } = useGSAP({ scope: root });
  const shake = contextSafe((el: Element | null) => el && m10Shake(el));

  /* M-01 섹션 등장 */
  useGSAP(() => m01Screen(), { scope: root });

  // 백업 내보내기 — JSON 파일 다운로드
  function exportBackup() {
    const url = URL.createObjectURL(new Blob([exportJson()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `sseum-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 백업 가져오기 — 파일을 읽고 덮어쓰기 전 확인
  async function pickBackup(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 다시 고를 수 있게
    if (file) setPending({ name: file.name, text: await file.text() });
  }
  function applyBackup() {
    if (!pending) return;
    const ok = importJson(pending.text);
    setPending(null);
    showToast(ok ? "백업을 불러왔어요" : "백업 파일 형식이 아니에요.");
  }

  function openSheet() {
    setConfirm("");
    setConfirmErr("");
    setSheetOpen(true);
  }

  // 모든 데이터 지우기 — 확인어 불일치면 흔들기
  function submitClear(e: FormEvent) {
    e.preventDefault();
    if (!matches) {
      setConfirmErr(`"${CONFIRM_WORD}"를 입력해 주세요.`);
      shake(confirmWrap.current);
      confirmInput.current?.focus();
      return;
    }
    if (!clearAll()) {
      setConfirmErr(STORAGE_FAIL);
      return;
    }
    setSheetOpen(false);
    showToast("모든 데이터를 지웠어요");
  }

  const manage = [
    { label: "카테고리 · 감시 대상", meta: `${active.length}개 카테고리 · 감시 대상 ${watched}/${WATCH_MAX}`, href: "/categories" },
    { label: "구독", meta: `${liveSubs}개 · 월 고정비 ${krw(fixedCost(db))}`, href: "/subscriptions" },
  ];

  return (
    <div
      ref={root}
      className="flex min-h-screen flex-col bg-ambient"
    >
      <AppHeader current="settings" />

      <main className="flex-1">
        <div className="mx-auto flex max-w-[640px] flex-col gap-10 px-4 pb-40 pt-12 md:px-8">
          {/* 요약 */}
          <section aria-labelledby="set-title" data-animate="M-01" className="flex flex-col gap-2.5">
            <h1 id="set-title" className={`${LABEL} font-semibold`}>
              Settings · 설정
            </h1>
            <span className="text-[clamp(1.5rem,4.5vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.03em] tabular-nums">
              기록 {db.txns.length.toLocaleString("ko-KR")}건
            </span>
            <span className="text-[.9375rem] leading-[1.5] text-muted-foreground">이 브라우저에만 저장돼요. 가끔 백업해 두세요.</span>
          </section>

          {/* 관리 */}
          <section aria-labelledby="manage-title" data-animate="M-01" className="flex flex-col border-t-[3px] border-foreground pt-3">
            <h2 id="manage-title" className={`${LABEL} mb-1`}>
              관리
            </h2>
            {manage.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex min-h-16 items-center justify-between gap-4 border-b border-border py-3 hover:text-watch"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[1.0625rem] font-semibold leading-[1.3] tracking-[-0.01em]">{l.label}</span>
                  <span className="text-[.8125rem] leading-[1.4] text-muted-foreground">{l.meta}</span>
                </span>
                <span aria-hidden className="shrink-0 text-xl leading-none">
                  <ArrowRight className="size-5" aria-hidden />
                </span>
              </Link>
            ))}
          </section>

          {/* 백업 — 내보내기 · 가져오기 */}
          <section aria-labelledby="backup-title" data-animate="M-01" className="flex flex-col gap-4 border-t border-border pt-3">
            <h2 id="backup-title" className={LABEL}>
              백업
            </h2>
            <p className="max-w-[420px] text-[.9375rem] leading-[1.5] text-muted-foreground text-pretty">
              브라우저 데이터를 지우면 기록도 사라져요. 파일로 내보내 두면 다른 기기에서 불러올 수 있어요.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={exportBackup}>
                내보내기
              </Button>
              <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} className="font-semibold">
                가져오기
              </Button>
              <input ref={fileInput} type="file" accept="application/json,.json" onChange={pickBackup} className="hidden" />
            </div>
            {pending && (
              <div
                role="group"
                aria-label="가져오기 확인"
                className="flex flex-wrap items-center justify-between gap-3 bg-foreground px-4 py-3.5 text-background animate-[ss-rise_.2s_ease-out] motion-reduce:animate-none"
              >
                <span className="min-w-0 text-[.9375rem] font-semibold leading-[1.4] [overflow-wrap:anywhere]">
                  지금 데이터를 {pending.name}(으)로 바꿀까요?
                </span>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    autoFocus
                    onClick={applyBackup}
                    className="bg-background px-[18px] font-bold text-foreground hover:bg-negative hover:text-background"
                  >
                    바꾸기
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPending(null)}
                    className="border border-background px-3.5 font-semibold hover:text-background"
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* 위험 구역 */}
          <section aria-labelledby="danger-title" data-animate="M-01" className="mt-8 flex flex-col gap-4 border border-negative px-4 py-6 md:px-6">
            <h2 id="danger-title" className="flex items-center gap-2 text-[.8125rem] font-bold uppercase leading-[1.25] tracking-[.08em] text-negative">
              <span aria-hidden className="inline-block size-2 bg-negative" />
              Danger · 되돌릴 수 없어요
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="max-w-[360px] text-[.9375rem] leading-[1.5] text-pretty">
                거래 <strong className="font-bold">{db.txns.length}</strong>건 · 구독 <strong className="font-bold">{db.subs.length}</strong>개 ·
                카테고리 <strong className="font-bold">{db.categories.length}</strong>개가 즉시 지워져요.
              </span>
              <Button
                ref={clearBtn}
                type="button"
                variant="outline"
                onClick={openSheet}
                className="border-negative font-bold text-negative hover:bg-negative hover:text-background"
              >
                모든 데이터 지우기
              </Button>
            </div>
          </section>
        </div>
      </main>

      {/* 지우기 시트 — vaul */}
      <Drawer open={sheetOpen} onOpenChange={(o) => !o && setSheetOpen(false)}>
          <DrawerContent
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              confirmInput.current?.focus();
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              clearBtn.current?.focus({ preventScroll: true });
            }}
            className="fixed inset-x-0 bottom-0 z-[26] max-h-[90vh] overflow-auto border-t-[3px] border-negative bg-background shadow-[0_-12px_40px_rgba(0,0,0,.5)] outline-none"
          >
            <form onSubmit={submitClear} noValidate className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 pb-8 pt-5 md:px-8">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2.5">
                  <span className="text-[.8125rem] font-bold uppercase leading-[1.25] tracking-[.08em] text-negative">Clear · 데이터 지우기</span>
                  <DrawerTitle className="text-2xl font-medium leading-[1.3] tracking-[-0.02em]">모든 데이터를 지울까요?</DrawerTitle>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setSheetOpen(false)} aria-label="닫기" className="-mr-2.5 -mt-2.5">
                  <X className="size-5" aria-hidden />
                </Button>
              </div>
              <DrawerDescription className="max-w-[520px] text-[1.0625rem] leading-[1.55] text-pretty">
                모든 기록이 즉시 지워지고 되돌릴 수 없어요. 카테고리는 처음 상태로 돌아가요. 확인을 위해 &quot;{CONFIRM_WORD}&quot;를 입력해 주세요.
              </DrawerDescription>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clear-confirm" className={`${LABEL} block`}>
                  확인 · <span className="normal-case tracking-[.02em] text-foreground">{CONFIRM_WORD}</span>
                </Label>
                <div ref={confirmWrap}>
                  <input
                    ref={confirmInput}
                    id="clear-confirm"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={`"${CONFIRM_WORD}" 입력`}
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value.slice(0, 20));
                      setConfirmErr("");
                    }}
                    aria-invalid={!!confirmErr}
                    aria-describedby="clear-err"
                    className={`min-h-14 w-full border bg-transparent px-4 text-[1.0625rem] text-foreground caret-negative shadow-[inset_0_-3px_0_transparent] outline-none transition-[box-shadow,border-color] focus:shadow-[inset_0_-3px_0_var(--negative)] ${
                      confirmErr ? "border-negative" : matches ? "border-foreground" : "border-placeholder"
                    }`}
                  />
                </div>
                <span id="clear-err" role="alert" className="min-h-5 text-[.9375rem] font-semibold leading-[1.4] text-negative">
                  {confirmErr}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                {/* 불일치여도 눌러서 오류 문구를 받을 수 있게 aria-disabled */}
                <Button
                  type="submit"
                  size="lg"
                  aria-disabled={!matches}
                  className={`min-h-13 px-6 ${
                    matches ? "bg-negative text-background hover:bg-[#ff9683]" : "cursor-not-allowed bg-border text-muted-foreground hover:bg-border"
                  }`}
                >
                  모두 지우기
                </Button>
                <Button type="button" variant="secondary" size="lg" onClick={() => setSheetOpen(false)} className="min-h-13 border-placeholder px-[18px] font-semibold">
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
