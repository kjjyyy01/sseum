"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Toggle as TogglePrimitive } from "radix-ui"

// 칩형 토글: on=반전색, off=배경색
const toggleVariants = cva(
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 px-3.5 font-semibold whitespace-nowrap transition-colors select-none active:scale-[.97] disabled:pointer-events-none disabled:opacity-40 data-[state=off]:bg-background data-[state=off]:text-foreground data-[state=on]:bg-foreground data-[state=on]:text-background",
  {
    variants: {
      variant: { default: "" },
      size: { default: "" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
