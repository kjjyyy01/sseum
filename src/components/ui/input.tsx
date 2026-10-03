import * as React from "react"
import { cn } from "cn"

// 텍스트 입력 (각진 테두리, 전역 focus-visible)
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-12 w-full min-w-0 border border-placeholder bg-transparent px-3.5 text-[1.0625rem] text-foreground placeholder:text-placeholder disabled:opacity-40 aria-invalid:border-negative",
        className
      )}
      {...props}
    />
  )
}

export { Input }
