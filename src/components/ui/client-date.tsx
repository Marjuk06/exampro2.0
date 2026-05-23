"use client";

import { useMounted } from "@/hooks/use-mounted";

interface ClientDateProps {
  timestamp: number;
  className?: string;
  options?: Intl.DateTimeFormatOptions;
}

/** Renders locale-formatted dates only after mount to prevent hydration mismatches. */
export function ClientDate({ timestamp, className, options }: ClientDateProps) {
  const mounted = useMounted();

  if (!mounted) {
    return <span className={className} suppressHydrationWarning />;
  }

  return (
    <span className={className} suppressHydrationWarning>
      {new Date(timestamp).toLocaleString(undefined, options)}
    </span>
  );
}
