import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-[var(--surface-2)] text-[var(--foreground)]",
        brand: "bg-[var(--brand-soft)] text-[var(--brand-strong)]",
        success: "bg-emerald-100 text-emerald-800",
        warn: "bg-amber-100 text-amber-900",
        danger: "bg-rose-100 text-rose-800",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
