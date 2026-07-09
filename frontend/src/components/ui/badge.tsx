import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-50",
        pending:
          "border border-yellow-200 bg-yellow-100 text-yellow-900 hover:bg-yellow-200 dark:border-yellow-900 dark:bg-yellow-900 dark:text-yellow-50",
        approved:
          "border border-green-200 bg-green-100 text-green-900 hover:bg-green-200 dark:border-green-900 dark:bg-green-900 dark:text-green-50",
        blocked:
          "border border-red-200 bg-red-100 text-red-900 hover:bg-red-200 dark:border-red-900 dark:bg-red-900 dark:text-red-50",
        rejected:
          "border border-red-200 bg-red-100 text-red-900 hover:bg-red-200 dark:border-red-900 dark:bg-red-900 dark:text-red-50",
        secondary:
          "border border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-50",
        destructive:
          "border border-red-200 bg-red-100 text-red-900 hover:bg-red-200 dark:border-red-900 dark:bg-red-900 dark:text-red-50",
        outline: "text-slate-950 dark:text-slate-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
