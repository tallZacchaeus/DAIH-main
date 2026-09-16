import React from "react";
import { cn } from "../utils/cn";
import { BookingState } from "@daih/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "amber";
  size?: "sm" | "md";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant = "default", size = "sm", children, ...props },
    ref,
  ) => {
    const variants = {
      default: "bg-slate-100 text-slate-800 border-slate-200",
      success: "bg-emerald-50 text-emerald-700 border-emerald-200",
      warning: "bg-amber-50 text-amber-800 border-amber-200",
      danger: "bg-rose-50 text-rose-700 border-rose-200",
      info: "bg-blue-50 text-blue-700 border-blue-200",
      amber: "bg-orange-50 text-orange-800 border-orange-200",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-sm",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-medium rounded-full border",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";

export function StatusBadge({ status }: { status: BookingState | string }) {
  const getStatusConfig = (st: string) => {
    switch (st) {
      case BookingState.CONFIRMED:
      case BookingState.ACTIVE:
      case BookingState.COMPLETED:
        return { variant: "success" as const, label: st.replace("_", " ") };
      case BookingState.HELD:
      case BookingState.PENDING_PAYMENT:
        return { variant: "warning" as const, label: st.replace("_", " ") };
      case BookingState.CANCELLED:
      case BookingState.EXPIRED:
      case BookingState.NO_SHOW:
        return { variant: "danger" as const, label: st.replace(/_/g, " ") };
      case BookingState.REFUND_PENDING:
        return { variant: "warning" as const, label: "REFUND PENDING" };
      case BookingState.REFUNDED:
        return { variant: "default" as const, label: "REFUNDED" };
      case BookingState.CHECKED_IN:
      case BookingState.CHECKED_OUT:
        return { variant: "info" as const, label: st.replace(/_/g, " ") };
      default:
        return {
          variant: "default" as const,
          label: String(st).replace(/_/g, " "),
        };
    }
  };

  const config = getStatusConfig(status);

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
