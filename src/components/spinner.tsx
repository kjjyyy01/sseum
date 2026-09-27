/** 버튼 안 회전 스피너. 색은 currentColor */
export function Spinner({ className = "size-3" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block rounded-full border-[3px] border-current border-r-transparent animate-[ss-spin_.8s_linear_infinite] motion-reduce:animate-none ${className}`}
    />
  );
}
