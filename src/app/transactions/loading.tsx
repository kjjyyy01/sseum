import { AppHeader } from "@/components/app-header";
import { DayGroupSkeleton } from "./_components/day-group-skeleton";

/** 내역 SSR 대기 중 — 헤더·월 자리 유지 + 그룹 스켈레톤 3개 */
export default function Loading() {
  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 80% -10%, rgba(227,181,58,.10), transparent 60%), radial-gradient(800px 500px at -10% 110%, rgba(227,181,58,.06), transparent 60%)",
      }}
    >
      <AppHeader current="transactions" />
      <main className="flex-1">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-10 px-4 pb-40 pt-12 md:px-8">
          {/* 월 선택기 + 월 숫자 높이만큼 자리 확보 (레이아웃 점프 방지) */}
          <div aria-hidden className="flex items-end gap-5">
            <div className="mb-2 h-11 w-[89px] border border-border" />
            <div className="ss-pulse h-[clamp(4.5rem,14.4vw,7.2rem)] w-40 bg-skeleton" style={{ animation: "ss-pulse 1.6s ease-in-out infinite" }} />
          </div>
          <DayGroupSkeleton />
        </div>
      </main>
    </div>
  );
}
