import { redirect } from "next/navigation";
import { TransactionsScreen } from "./_components/transactions";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** SCR-003 — ?month=YYYY-MM 정규화만 서버에서. 데이터는 브라우저 저장소 */
export default async function Page({ searchParams }: PageProps<"/transactions">) {
  const { month: raw } = await searchParams;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  const current = today.slice(0, 7);

  // 형식 오류·미래 월 → 이번 달로 replace (AC-2)
  if (raw !== undefined && (typeof raw !== "string" || !MONTH_RE.test(raw) || raw > current)) {
    redirect(`/transactions?month=${current}`);
  }

  return <TransactionsScreen month={raw ?? current} currentMonth={current} today={today} />;
}
