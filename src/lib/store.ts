import { useSyncExternalStore } from "react";

/*
 * localStorage 저장소 — 1인용. 함수명은 PRD-API명세 액션과 같게 둬서
 * DB로 옮길 때 이 파일 안쪽만 Supabase 호출로 바꾸면 된다.
 * ponytail: 전체 JSON 1개 키 — 수만 건 넘으면 IndexedDB나 DB로
 */

export type Category = { id: string; name: string; watched: boolean; system: boolean; archived: boolean };
export type Txn = { id: string; categoryId: string; amount: number; date: string; memo: string; createdAt: number };
export type Subscription = {
  id: string;
  name: string;
  amount: number;
  day: number; // 결제일 1~28 (BR-015)
  categoryId: string | null;
  cancelledAt: string | null; // "YYYY-MM" — 있으면 해지
};
export type Checkin = { subscriptionId: string; month: string; used: boolean };
export type Db = { version: 1; categories: Category[]; txns: Txn[]; subs: Subscription[]; checkins: Checkin[] };

const KEY = "sseum:v1";
export const WATCH_MAX = 5; // BR-004

/** 첫 실행 시드 (BR-017) — "기타"만 보관 불가 */
function seed(): Db {
  const names = ["식비", "배달", "술/여가", "구독", "교통", "생활", "기타"];
  return {
    version: 1,
    categories: names.map((name) => ({ id: uid(), name, watched: false, system: name === "기타", archived: false })),
    txns: [],
    subs: [],
    checkins: [],
  };
}

const uid = () => crypto.randomUUID();

/* ---------- 구독 · 스냅샷 ---------- */

const listeners = new Set<() => void>();
let cache: { raw: string | null; db: Db } | null = null;

/** 스냅샷 — 원문이 같으면 같은 객체 (useSyncExternalStore 요구) */
function read(): Db {
  const raw = localStorage.getItem(KEY);
  if (cache && cache.raw === raw) return cache.db;
  let db: Db;
  try {
    db = raw ? (JSON.parse(raw) as Db) : seed();
  } catch {
    db = seed(); // 손상된 값 — 덮어쓰기 전까지 원문은 그대로 둔다
  }
  cache = { raw, db };
  return db;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // 다른 탭에서 바뀐 경우
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** 저장 후 알림. 용량 초과·사생활 모드 등으로 실패하면 false */
function commit(next: Db): boolean {
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    return false;
  }
  cache = { raw, db: next };
  listeners.forEach((l) => l());
  return true;
}

/** 이벤트 핸들러용 즉시 읽기 — 방금 저장한 값으로 계산할 때 */
export const getDb = read;

/** 데이터 훅 — 서버·하이드레이션 첫 렌더에선 null */
export function useDb(): Db | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/* ---------- 날짜 (Asia/Seoul) ---------- */

export const todayStr = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());

/** "2026-09" ± n개월 */
export function addMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 이번 주 월요일 "YYYY-MM-DD" (BR-005 주=월요일 시작) */
function mondayOf(day: string) {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return new Intl.DateTimeFormat("sv-SE").format(d);
}

/* ---------- 계산 규칙 (PRD-도메인규칙 §계산 규칙) ---------- */

const inMonth = (t: Txn, ym: string) => t.date.startsWith(ym);

/** 이번 주 횟수 — [월요일, 오늘] */
export function countThisWeek(db: Db, categoryId: string, today: string) {
  const mon = mondayOf(today);
  return db.txns.filter((t) => t.categoryId === categoryId && t.date >= mon && t.date <= today).length;
}

/** 이번 달 누적 금액 */
export function sumThisMonth(db: Db, categoryId: string, today: string) {
  const ym = today.slice(0, 7);
  return db.txns.filter((t) => t.categoryId === categoryId && inMonth(t, ym)).reduce((a, t) => a + t.amount, 0);
}

/** 전월 동기간 대비 횟수 차. 전월 0건이면 null (BR-005) */
export function diffVsPrevMonthToDate(db: Db, categoryId: string, today: string) {
  const ym = today.slice(0, 7);
  const prev = addMonth(ym, -1);
  const [py, pm] = prev.split("-").map(Number);
  const lastDay = new Date(py, pm, 0).getDate();
  const cutoff = `${prev}-${String(Math.min(Number(today.slice(8)), lastDay)).padStart(2, "0")}`;
  const mine = db.txns.filter((t) => t.categoryId === categoryId);
  const before = mine.filter((t) => inMonth(t, prev) && t.date <= cutoff).length;
  if (before === 0) return null;
  return mine.filter((t) => inMonth(t, ym) && t.date <= today).length - before;
}

/** 고정비 = 해지 안 된 구독 합 (BR-006) */
export const fixedCost = (db: Db) => db.subs.filter((s) => !s.cancelledAt).reduce((a, s) => a + s.amount, 0);

/** 프리셋 — 최근 30일 (카테고리, 금액) 2회 이상, 빈도 상위 4. 동률은 최근 순 (BR-007) */
export function derivePresets(db: Db, today: string) {
  const from = new Date(`${today}T00:00:00`);
  from.setDate(from.getDate() - 29);
  const since = new Intl.DateTimeFormat("sv-SE").format(from);
  const live = new Set(db.categories.filter((c) => !c.archived).map((c) => c.id));
  const groups = new Map<string, { categoryId: string; amount: number; count: number; last: number }>();
  for (const t of db.txns) {
    if (t.date < since || t.date > today || !live.has(t.categoryId)) continue;
    const k = `${t.categoryId}:${t.amount}`;
    const g = groups.get(k) ?? { categoryId: t.categoryId, amount: t.amount, count: 0, last: 0 };
    g.count++;
    g.last = Math.max(g.last, t.createdAt);
    groups.set(k, g);
  }
  return [...groups.entries()]
    .filter(([, g]) => g.count >= 2)
    .sort(([, a], [, b]) => b.count - a.count || b.last - a.last)
    .slice(0, 4)
    .map(([id, g]) => ({ id, categoryId: g.categoryId, amount: g.amount }));
}

/** 해지 검토 — 이번 달·직전 달 연속 미사용 (BR-010, 미응답은 미사용으로 안 셈) */
export function needsReview(db: Db, subscriptionId: string, month: string) {
  const used = (m: string) => db.checkins.find((c) => c.subscriptionId === subscriptionId && c.month === m)?.used;
  return used(month) === false && used(addMonth(month, -1)) === false;
}

/** 이번 달 체크인 응답. 없으면 null */
export const checkinOf = (db: Db, subscriptionId: string, month: string) =>
  db.checkins.find((c) => c.subscriptionId === subscriptionId && c.month === month)?.used ?? null;

/* ---------- 액션 (PRD-API명세 이름) — 실패 시 false ---------- */

export function createTransaction(input: { amount: number; categoryId: string; date: string; memo: string }) {
  const db = read();
  const txn: Txn = { id: uid(), ...input, memo: input.memo.trim(), createdAt: Date.now() };
  return commit({ ...db, txns: [...db.txns, txn] });
}

export function updateTransaction(id: string, patch: Partial<Pick<Txn, "amount" | "categoryId" | "date" | "memo">>) {
  const db = read();
  return commit({ ...db, txns: db.txns.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
}

/** 하드 삭제 — 1인용이라 복원·감사 목적의 소프트 삭제 불필요 */
export function deleteTransaction(id: string) {
  const db = read();
  return commit({ ...db, txns: db.txns.filter((t) => t.id !== id) });
}

/** 추가 — "기타" 앞에. 성공 시 새 id, 실패 시 null */
export function createCategory(name: string) {
  const db = read();
  const cat: Category = { id: uid(), name, watched: false, system: false, archived: false };
  const ok = commit({
    ...db,
    categories: [...db.categories.filter((c) => !c.system), cat, ...db.categories.filter((c) => c.system)],
  });
  return ok ? cat.id : null;
}

/** 보관 시 감시 해제 강제 (BR-014) */
export function updateCategory(id: string, patch: Partial<Pick<Category, "name" | "watched" | "archived">>) {
  const db = read();
  return commit({
    ...db,
    categories: db.categories.map((c) => (c.id === id ? { ...c, ...patch, ...(patch.archived ? { watched: false } : {}) } : c)),
  });
}

export function createSubscription(input: Omit<Subscription, "id" | "cancelledAt">) {
  const db = read();
  return commit({ ...db, subs: [...db.subs, { id: uid(), ...input, cancelledAt: null }] });
}

export function cancelSubscription(id: string, month: string) {
  const db = read();
  return commit({ ...db, subs: db.subs.map((s) => (s.id === id ? { ...s, cancelledAt: month } : s)) });
}

/** (구독, 월)당 1회 — 다시 답하면 덮어쓴다 (BR-008) */
export function submitCheckin(subscriptionId: string, month: string, used: boolean) {
  const db = read();
  const rest = db.checkins.filter((c) => !(c.subscriptionId === subscriptionId && c.month === month));
  return commit({ ...db, checkins: [...rest, { subscriptionId, month, used }] });
}

/* ---------- 설정: 전체 지우기 · 백업 ---------- */

/** 모든 데이터 지우기 — 다음 읽기에서 시드로 다시 시작 */
export function clearAll() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    return false;
  }
  cache = null;
  listeners.forEach((l) => l());
  return true;
}

export const exportJson = () => JSON.stringify(read(), null, 2);

/** 백업 복원 — 형태가 맞을 때만 통째로 교체 */
export function importJson(text: string) {
  let db: Db;
  try {
    db = JSON.parse(text);
  } catch {
    return false;
  }
  const ok =
    db?.version === 1 &&
    Array.isArray(db.categories) &&
    Array.isArray(db.txns) &&
    Array.isArray(db.subs) &&
    Array.isArray(db.checkins);
  return ok && commit(db);
}
