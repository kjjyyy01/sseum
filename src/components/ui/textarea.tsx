import * as React from "react"
import { cn } from "cn"

// 여러 줄 입력 (각진 테두리, 전역 focus-visible)
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-12 w-full border border-placeholder bg-transparent px-3.5 py-3 text-[1.0625rem] text-foreground placeholder:text-placeholder disabled:opacity-40 aria-invalid:border-negative",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
