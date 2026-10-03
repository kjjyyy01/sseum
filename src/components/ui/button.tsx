import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// 버튼 변형·크기 (각진 사각형, 토큰 색)
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap transition-colors select-none active:scale-[.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-watch font-bold text-watch-foreground hover:bg-watch-hover",
        outline:
          "border border-foreground bg-transparent font-semibold hover:bg-foreground hover:text-background",
        ghost: "bg-transparent hover:text-watch",
        secondary: "border border-border hover:border-foreground",
        destructive: "bg-negative/10 font-semibold text-negative hover:bg-negative/20",
      },
      size: {
        sm: "min-h-11 px-4 text-[.9375rem]",
        default: "min-h-12 px-5 text-[.9375rem]",
        lg: "min-h-14 px-7 text-[1.0625rem]",
        icon: "min-h-11 min-w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
