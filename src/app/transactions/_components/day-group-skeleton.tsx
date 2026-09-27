/** 일자 그룹 스켈레톤 3개 — 재시도·라우트 로딩 공용. CSS pulse만 */
export function DayGroupSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-8">
      <span className="sr-only">불러오는 중</span>
      {[
        [160, 2],
        [120, 1],
        [140, 2],
      ].map(([w, rows], g) => (
        <div key={g} aria-hidden className="flex flex-col gap-3 border-t-[3px] border-border pt-3.5">
          {Array.from({ length: rows + 1 }, (_, i) => (
            <div
              key={i}
              className={`ss-pulse bg-skeleton ${i === 0 ? "h-6" : "h-14"}`}
              style={{ width: i === 0 ? w : undefined, animation: `ss-pulse 1.6s ease-in-out ${(g * 3 + i) * 0.1}s infinite` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
