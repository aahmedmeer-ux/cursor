"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  indicatorClassName,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]",
        className,
      )}
      value={value}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-transform duration-500 ease-out",
          indicatorClassName ?? "bg-[var(--brand)]",
        )}
        style={{ transform: `translateX(-${100 - Math.min(100, value)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
