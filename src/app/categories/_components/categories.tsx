"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppHeader } from "@/components/app-header";
import { Toast, useToast } from "@/components/toast";
import { focusMore } from "@/lib/focus";
import { Flip, useGSAP } from "@/lib/motion";
import { flipRows, m01Enter, m01Screen, m10Shake, strokesIn } from "@/lib/motion/presets";
import { WATCH_MAX, createCategory, updateCategory, useDb, type Db } from "@/lib/store";
import { ERR, LABEL } from "@/lib/utils";
import { TallyStrokes } from "@/components/tally";
import { CategoryRow } from "./category-row";

type Category = {
  id: string;
  name: string;
  watched: boolean;
  month: number; // 이번 달 횟수
  system: boolean; // "기타" — 보관 불가 (BR-017)
  archived: boolean;
};

const MAX = WATCH_MAX; // BR-004
const NAME_MAX = 20;

const row = (id: string) => `[data-cat="${id}"]`;

/** 이번 달 횟수를 붙인 카테고리 목록 */
function selectCategories(db: Db): Category[] {
  const ym = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date()).slice(0, 7);
  return db.categories.map((c) => ({
    ...c,
    month: db.txns.filter((t) => t.categoryId === c.id && t.date.startsWith(ym)).length,
  }));
}

/** SCR-004 — 저장소를 읽은 뒤에만 렌더 */
export function CategoriesScreen() {
  const db = useDb();
  if (!db) return null;
  return <Screen cats={selectCategories(db)} />;
}

function Screen({ cats }: { cats: Category[] }) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameErr, setRenameErr] = useState("");
  const [addValue, setAddValue] = useState("");
  const [addErr, setAddErr] = useState("");
  const [archivedOpen, setArchivedOpen] = useState(false);
  const { text: toast, show: showToast } = useToast();

  const root = useRef<HTMLDivElement>(null);
  const renameInput = useRef<HTMLInputElement>(null);
  const renameWrap = useRef<HTMLDivElement>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const addWrap = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const enterId = useRef<string | null>(null);

  const active = cats.filter((c) => !c.archived);
  const archived = cats.filter((c) => c.archived);
  const n = active.filter((c) => c.watched).length;
  const full = n >= MAX;

  const { contextSafe } = useGSAP({ scope: root });
  const shake = contextSafe((el: Element | null) => el && m10Shake(el));

  /* M-01 섹션 등장 + 히어로 작대기 — 뷰 전환 시 */
  useGSAP(() => m01Screen({ full: () => strokesIn("[data-hero-stroke]") }), { scope: root });

  /* 행 이동(Flip) 또는 새 행 등장 */
  useGSAP(
    () => {
      if (flipState.current) {
        flipRows(flipState.current);
        flipState.current = null;
        return;
      }
      if (enterId.current) {
        m01Enter(row(enterId.current));
        enterId.current = null;
      }
    },
    { scope: root, dependencies: [cats.length, archived.length] },
  );

  /* 이름 변경 진입 — 입력 포커스 + 전체 선택 */
  useEffect(() => {
    if (!renaming) return;
    const t = setTimeout(() => {
      renameInput.current?.focus({ preventScroll: true });
      renameInput.current?.select();
    }, 30);
    return () => clearTimeout(t);
  }, [renaming]);

  /* CPY-CAT-002 / 003 */
  function validateName(name: string, selfId: string | null) {
    const t = name.trim();
    if (t.length < 1 || t.length > NAME_MAX) return "이름은 1~20자로 입력해 주세요.";
    if (cats.some((c) => c.id !== selfId && c.name.toLowerCase() === t.toLowerCase())) return "같은 이름의 카테고리가 있어요.";
    return "";
  }

  // REQ-CAT-001 감시 토글 — 5개 상한 (BR-004)
  function toggle(id: string) {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    const next = !c.watched;
    if (next && full) {
      showToast("감시 대상은 5개까지만 둘 수 있어요.");
      return;
    }
    if (!updateCategory(id, { watched: next })) showToast("저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
  }

  // REQ-CAT-003 이름 변경
  function startRename(id: string) {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    setRenaming(id);
    setRenameValue(c.name);
    setRenameErr("");
  }
  function cancelRename() {
    const id = renaming;
    setRenaming(null);
    setRenameErr("");
    if (id) focusMore(root.current, row(id));
  }
  function saveRename(e: FormEvent) {
    e.preventDefault();
    if (!renaming) return;
    const id = renaming;
    const err = validateName(renameValue, id);
    if (err) {
      setRenameErr(err);
      shake(renameWrap.current);
      return;
    }
    const name = renameValue.trim();
    if (!updateCategory(id, { name })) {
      setRenameErr("저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
      return;
    }
    setRenaming(null);
    showToast("저장했어요");
    focusMore(root.current, row(id));
  }

  // REQ-CAT-002 추가 — "기타" 앞에
  function addCategory(e: FormEvent) {
    e.preventDefault();
    const err = validateName(addValue, null);
    if (err) {
      setAddErr(err);
      shake(addWrap.current);
      addInput.current?.focus();
      return;
    }
    const name = addValue.trim();
    const id = createCategory(name);
    if (!id) {
      setAddErr("저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
      return;
    }
    enterId.current = id;
    setAddValue("");
    setTimeout(() => addInput.current?.focus({ preventScroll: true }), 30);
  }

  /** 보관 ⇄ 복원 — 행이 다른 섹션으로 Flip 이동 */
  function moveRow(id: string, patch: { archived: boolean }, afterFocus: () => void) {
    const rows = root.current?.querySelectorAll("[data-flip-id]");
    if (rows?.length) flipState.current = Flip.getState(rows);
    if (!updateCategory(id, patch)) {
      flipState.current = null;
      showToast("저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
      return;
    }
    if (patch.archived) setArchivedOpen(true);
    setTimeout(afterFocus, 30);
  }
  function archive(id: string) {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    if (c.system) {
      showToast("'기타'는 보관할 수 없어요.");
      return;
    }
    // BR-014 — 보관 시 감시 해제
    moveRow(id, { archived: true }, () =>
      root.current?.querySelector<HTMLButtonElement>("[aria-controls='archived']")?.focus({ preventScroll: true }),
    );
  }
  function restore(id: string) {
    moveRow(id, { archived: false }, () =>
      root.current?.querySelector<HTMLButtonElement>(`[id="sw-${id}"]`)?.focus({ preventScroll: true }),
    );
  }

  return (
    <div ref={root} className="flex min-h-screen flex-col bg-ambient">
      <AppHeader />

      <main className="flex-1">
        <div className="mx-auto flex max-w-[640px] flex-col gap-10 px-4 pb-40 pt-12 md:px-8">
          {/* 카운터 n/5 */}
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2.5">
              <Link href="/" className="-mb-2 -mt-3 inline-flex min-h-11 items-center text-[.8125rem] tracking-[.02em] text-muted-foreground hover:text-watch">
                ← 홈
              </Link>
              <h1 className="flex items-center gap-2 text-[.8125rem] font-semibold uppercase leading-[1.25] tracking-[.08em] text-watch">
                <span className="inline-block size-2 bg-watch" />
                Watch · 감시 대상
              </h1>
              <div className="flex items-baseline gap-1.5 tabular-nums">
                {/* key 교체로 값 변경마다 튐 재생 */}
                <span key={n} aria-hidden className="text-[clamp(5rem,16vw,8rem)] font-bold leading-[.9] tracking-[-0.06em] animate-[ss-bump_.32s_ease-out] motion-reduce:animate-none">
                  {n}
                </span>
                <span aria-hidden className="text-[2.75rem] font-medium leading-none tracking-[-0.02em] text-muted-foreground">
                  /{MAX}
                </span>
                <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                  감시 대상 {n}개, 최대 {MAX}개
                </span>
              </div>
              <p className="max-w-[400px] text-[.9375rem] leading-[1.5] text-muted-foreground text-pretty">
                {full ? "5개가 다 찼어요. 하나를 끄면 다른 걸 볼 수 있어요." : "줄이고 싶은 걸 5개까지 골라두면 홈에서 이번 주 횟수를 바로 보여드려요."}
              </p>
            </div>
            <div aria-hidden className="relative mb-3 h-14 w-[120px]">
              <TallyStrokes
                n={MAX}
                scale={1.4}
                data-hero-stroke
                stroke={(i) => `transition-colors duration-200 ${i < n ? "bg-watch" : "bg-placeholder"}`}
              />
            </div>
          </div>

          {/* 활성 카테고리 */}
          <section aria-labelledby="active-title" data-animate="M-01" className="flex flex-col border-t-[3px] border-foreground pt-3">
            <div className="flex items-baseline justify-between gap-3 pb-1">
              <h2 id="active-title" className={LABEL}>
                카테고리 · {active.length}
              </h2>
              <span className="text-[.8125rem] leading-[1.25] text-muted-foreground">이번 달 횟수</span>
            </div>

            {active.length === 0 && (
              <p className="py-8 text-xl font-medium leading-[1.3] tracking-[-0.02em] text-muted-foreground text-pretty">
                사용할 카테고리가 없어요. 카테고리를 먼저 만들어 주세요.
              </p>
            )}

            {active.map((c) => {
              const capped = full && !c.watched;
              return (
                <div key={c.id} data-cat={c.id} data-flip-id={c.id} className="relative flex min-h-16 flex-wrap items-center gap-4 border-b border-border py-2.5">
                  {renaming === c.id ? (
                    <form onSubmit={saveRename} className="flex min-w-0 flex-[1_1_260px] flex-wrap items-center gap-2">
                      <div ref={renameWrap} className="flex min-w-0 flex-[1_1_180px] flex-col gap-1">
                        <Input
                          ref={renameInput}
                          type="text"
                          value={renameValue}
                          onChange={(e) => {
                            setRenameValue(e.target.value.slice(0, 24));
                            setRenameErr("");
                          }}
                          onKeyDown={(e) => e.key === "Escape" && cancelRename()}
                          maxLength={24}
                          aria-label="새 이름"
                          aria-invalid={!!renameErr}
                          aria-describedby="rename-err"
                          className="min-h-11 border-foreground px-3 font-medium"
                        />
                        <span id="rename-err" role="alert" className="text-[.8125rem] font-semibold leading-[1.4] text-negative">
                          {renameErr}
                        </span>
                      </div>
                      <Button type="submit" size="sm">
                        저장
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={cancelRename} className="px-3.5 font-semibold">
                        취소
                      </Button>
                    </form>
                  ) : (
                    <CategoryRow c={c} capped={capped} onToggle={toggle} onRename={startRename} onArchive={archive} />
                  )}
                </div>
              );
            })}

            {/* 추가 */}
            <form onSubmit={addCategory} className="flex flex-wrap items-start gap-2 pt-4">
              <div ref={addWrap} className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                <Input
                  ref={addInput}
                  type="text"
                  value={addValue}
                  onChange={(e) => {
                    setAddValue(e.target.value.slice(0, 24));
                    setAddErr("");
                  }}
                  placeholder="새 카테고리 이름 · 1~20자"
                  maxLength={24}
                  aria-label="새 카테고리 이름"
                  aria-invalid={!!addErr}
                  aria-describedby="add-err"
                />
                <span id="add-err" role="alert" className={ERR}>
                  {addErr}
                </span>
              </div>
              <Button type="submit" variant="outline">
                + 카테고리 추가
              </Button>
            </form>
          </section>

          {/* 보관됨 — Flip 측정과 충돌하지 않게 전환 없이 토글 */}
          <section aria-labelledby="archived-title" data-animate="M-01" className="flex flex-col border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setArchivedOpen((o) => !o)}
              aria-expanded={archivedOpen}
              aria-controls="archived"
              className="min-h-14 w-full justify-between gap-4 px-0 text-left"
            >
              <h2 id="archived-title" className="text-[.8125rem] font-semibold uppercase leading-[1.25] tracking-[.08em]">
                보관됨 · {archived.length}
              </h2>
              <span aria-hidden className={`text-xl leading-none transition-transform duration-200 motion-reduce:transition-none ${archivedOpen ? "rotate-180" : ""}`}>
                <ChevronDown className="size-5" aria-hidden />
              </span>
            </Button>
            {archivedOpen && (
              <div id="archived" className="flex flex-col pb-2">
                {archived.length === 0 && <p className="pb-4 pt-2 text-[.9375rem] leading-[1.5] text-muted-foreground">보관한 카테고리가 없어요.</p>}
                {archived.map((a) => (
                  <div key={a.id} data-cat={a.id} data-flip-id={a.id} className="flex min-h-14 items-center justify-between gap-4 border-b border-border py-1.5">
                    <span className="text-[1.0625rem] font-medium leading-[1.2] tracking-[-0.01em] text-muted-foreground">{a.name}</span>
                    <Button type="button" variant="secondary" size="sm" onClick={() => restore(a.id)} className="font-semibold">
                      복원
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Toast text={toast} />
    </div>
  );
}
