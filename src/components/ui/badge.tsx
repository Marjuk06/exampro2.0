import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-blue-500/30 bg-blue-500/20 text-blue-400",
        success: "border-green-500/30 bg-green-500/20 text-green-400",
        warning: "border-yellow-500/30 bg-yellow-500/20 text-yellow-400",
        danger: "border-red-500/30 bg-red-500/20 text-red-400",
        purple: "border-purple-500/30 bg-purple-500/20 text-purple-400",
        muted: "border-gray-500/30 bg-gray-500/20 text-gray-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
