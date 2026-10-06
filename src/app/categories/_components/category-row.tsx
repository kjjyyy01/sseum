import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TallyStrokes } from "@/components/tally";
import { WATCH_MAX as MAX } from "@/lib/store";

type Props = {
  c: { id: string; name: string; watched: boolean; system: boolean; month: number };
  capped: boolean; // 5/5 찼고 이 행은 꺼져 있음
  onToggle: (id: string) => void;
  onRename: (id: string) => void;
  onArchive: (id: string) => void;
};

/** 카테고리 행 표시부 (EL-CAT-001·002·004) — 이름·이번 달 탈리·감시 스위치·더보기 메뉴 */
export function CategoryRow({ c, capped, onToggle, onRename, onArchive }: Props) {
  const swId = `sw-${c.id}`;
  return (
    <>
      {/* 행 전체 = 토글 라벨 (탭 영역 44+) */}
      <Label htmlFor={swId} className={`min-h-11 min-w-0 flex-[1_1_200px] gap-3.5 text-base leading-normal font-normal ${capped ? "cursor-not-allowed" : "cursor-pointer"}`}>
        <span className={`flex items-center gap-2 whitespace-nowrap text-[1.0625rem] leading-[1.2] tracking-[-0.01em] ${c.watched ? "font-bold" : "font-medium"}`}>
          {c.name}
          {c.system && <span className="text-[.8125rem] font-normal tracking-[.02em] text-muted-foreground">기본</span>}
        </span>
        <span aria-hidden className="relative block h-3.5 min-w-10 flex-[1_1_40px]">
          <TallyStrokes
            n={c.month}
            scale={0.5}
            stroke={`transition-colors duration-200 ${c.watched ? "bg-watch" : "bg-placeholder"}`}
          />
        </span>
        <span className="whitespace-nowrap text-[.8125rem] leading-[1.25] tabular-nums text-muted-foreground">
          {c.month ? `${c.month}번` : "—"}
        </span>
      </Label>

      <div className="flex items-center gap-1">
        <span className={`min-w-14 whitespace-nowrap max-sm:hidden text-right text-[.8125rem] leading-[1.25] tracking-[.02em] ${c.watched ? "text-watch" : "text-muted-foreground"}`}>
          {c.watched ? "감시 대상" : capped ? `${MAX}/${MAX}` : ""}
        </span>
        {/* 5/5는 aria-disabled로 두고 탭하면 이유를 토스트로 — 포커스·툴팁 유지 */}
        <Switch
          id={swId}
          checked={c.watched}
          onCheckedChange={() => onToggle(c.id)}
          aria-label={`${c.name} 감시 대상`}
          aria-disabled={capped || undefined}
          title={capped ? "감시 대상은 5개까지만 둘 수 있어요." : undefined}
          className={`mx-1.5 my-2.5 ${capped ? "cursor-not-allowed opacity-40" : ""}`}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`${c.name} 더보기`}>
              <MoreHorizontal className="size-5" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" aria-label={`${c.name} 더보기`}>
            <DropdownMenuItem onSelect={() => onRename(c.id)}>이름 변경</DropdownMenuItem>
            {c.system ? (
              <DropdownMenuItem disabled>&apos;기타&apos;는 보관할 수 없어요.</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => onArchive(c.id)}>보관</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
