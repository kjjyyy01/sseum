/*
 * store.ts 계산 규칙 자가 점검 — 실행: node src/lib/store.check.ts
 * localStorage는 Map으로 흉내 낸다 (브라우저 불필요)
 */
import assert from "node:assert/strict";

const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
  window: { addEventListener() {}, removeEventListener() {} },
});

const s = await import("./store.ts");

// 시드 (BR-017) — 7개, "기타"만 system
let db = s.getDb();
assert.equal(db.categories.length, 7);
assert.deepEqual(db.categories.filter((c) => c.system).map((c) => c.name), ["기타"]);
const food = db.categories[0].id;
const delivery = db.categories[1].id;

// 2026-09-17(목) 기준. 이번 주 = 09-14(월)~
const today = "2026-09-17";
const add = (date: string, categoryId: string, amount: number) => assert.ok(s.createTransaction({ date, categoryId, amount, memo: " " }));
add("2026-09-13", delivery, 8000); // 지난주 일요일 — 이번 주 아님
add("2026-09-14", delivery, 8000); // 월요일 — 이번 주 첫날
add("2026-09-17", delivery, 8000);
add("2026-08-10", delivery, 8000); // 전월 동기간(8/1~8/17) 1건
add("2026-08-20", delivery, 8000); // 전월 동기간 밖
db = s.getDb();

assert.equal(s.countThisWeek(db, delivery, today), 2, "주=월요일 시작");
assert.equal(s.sumThisMonth(db, delivery, today), 24000);
assert.equal(s.diffVsPrevMonthToDate(db, delivery, today), 3 - 1, "이번 달 3건 − 전월 동기간 1건");
assert.equal(s.diffVsPrevMonthToDate(db, food, today), null, "전월 0건 → null");
assert.equal(db.txns[0].memo, "", "메모 trim");

// 전월 말일 보정 — 3/31 기준 전월(2월) 동기간은 2/28까지
add("2026-02-28", food, 5000);
add("2026-03-05", food, 5000);
assert.equal(s.diffVsPrevMonthToDate(s.getDb(), food, "2026-03-31"), 0);
assert.equal(s.addMonth("2026-01", -1), "2025-12");

// 프리셋 (BR-007) — 30일 안 같은 (카테고리, 금액) 2회 이상만
const presets = s.derivePresets(db, today);
assert.equal(presets.length, 1);
assert.deepEqual([presets[0].categoryId, presets[0].amount], [delivery, 8000]);

// 보관 시 감시 해제 강제 (BR-014) + 보관 카테고리는 프리셋 제외
assert.ok(s.updateCategory(delivery, { watched: true }));
assert.ok(s.updateCategory(delivery, { archived: true }));
db = s.getDb();
assert.equal(db.categories.find((c) => c.id === delivery)!.watched, false);
assert.equal(s.derivePresets(db, today).length, 0);

// 해지 검토 (BR-010) — 이번 달·직전 달 연속 미사용일 때만
assert.ok(s.createSubscription({ name: "넷플릭스", amount: 17000, day: 5, categoryId: null }));
const sub = s.getDb().subs[0].id;
s.submitCheckin(sub, "2026-09", false);
assert.equal(s.needsReview(s.getDb(), sub, "2026-09"), false, "직전 달 미응답은 미사용으로 안 셈");
s.submitCheckin(sub, "2026-08", false);
assert.equal(s.needsReview(s.getDb(), sub, "2026-09"), true);
s.submitCheckin(sub, "2026-09", true); // 다시 답하면 덮어쓴다
assert.equal(s.getDb().checkins.length, 2);
assert.equal(s.fixedCost(s.getDb()), 17000);
s.cancelSubscription(sub, "2026-09");
assert.equal(s.fixedCost(s.getDb()), 0, "해지하면 고정비 제외");

// 백업 왕복 · 잘못된 파일 거부 · 전체 지우기
const backup = s.exportJson();
assert.equal(s.importJson("{}"), false);
assert.equal(s.importJson("not json"), false);
assert.ok(s.clearAll());
assert.equal(s.getDb().txns.length, 0, "지우면 시드로 다시 시작");
assert.ok(s.importJson(backup));
assert.equal(s.getDb().txns.length, 7);

console.log("store.check: ok");
