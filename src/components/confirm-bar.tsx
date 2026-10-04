import type { HTMLAttributes, ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string; // 그룹 aria-label (예: "삭제 확인")
  children: ReactNode; // 질문 문구
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  confirmRef?: Ref<HTMLButtonElement>;
  autoFocus?: boolean;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

/** 브라우저 confirm 대신 쓰는 인라인 2단계 확인 바 — 밝은 띠 + 확인·취소 */
export function ConfirmBar({ label, children, confirmText, onConfirm, onCancel, busy, confirmRef, autoFocus, className = "", ...rest }: Props) {
  return (
    <div
      role="group"
      aria-label={label}
      {...rest}
      className={`flex flex-wrap items-center justify-between gap-3 bg-foreground px-4 py-3.5 text-background animate-[ss-rise_.2s_ease-out] motion-reduce:animate-none ${className}`}
    >
      <span className="min-w-0 text-[.9375rem] font-semibold leading-[1.4] [overflow-wrap:anywhere]">{children}</span>
      <div className="flex gap-1.5">
        <Button
          ref={confirmRef}
          type="button"
          variant="ghost"
          size="sm"
          autoFocus={autoFocus}
          onClick={onConfirm}
          disabled={busy}
          className="bg-background px-[18px] font-bold text-foreground hover:bg-negative hover:text-background"
        >
          {confirmText}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={busy}
          className="border border-background px-3.5 font-semibold hover:text-background"
        >
          취소
        </Button>
      </div>
    </div>
  );
}
