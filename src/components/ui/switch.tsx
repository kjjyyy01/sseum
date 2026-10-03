"use client"

import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center border transition-colors data-[state=checked]:border-watch data-[state=checked]:bg-watch data-[state=unchecked]:border-placeholder data-[state=unchecked]:bg-border data-disabled:cursor-not-allowed data-disabled:opacity-40",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-watch-foreground data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-muted-foreground"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
