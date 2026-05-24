"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Construction, FlaskConical, X } from "lucide-react";
import { usePublicSettings } from "@/hooks/queries/use-public-settings";
import { cn } from "@/lib/utils";

/**
 * AppBanner — renders two optional elements based on admin settings:
 *
 * 1. 🔨 Under Construction banner — full-width strip at the very top of the page.
 *    Dismissible per-session (does not persist across reloads).
 *
 * 2. (Beta tag) — consumed via `useBetaMode()` by the header components.
 *    This component itself doesn't render the beta tag — headers do.
 *
 * Place once inside <body> before any other layout (already done in layout.tsx).
 */
export function AppBanner() {
  const { settings, isLoading } = usePublicSettings();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || !settings.constructionBanner || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="construction-banner"
        initial={{ y: -44, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -44, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className={cn(
          "relative z-[60] w-full",
          "bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-amber-500/90",
          "backdrop-blur-md border-b border-amber-400/30",
          "flex items-center justify-center gap-2 px-4 py-2"
        )}
      >
        {/* Animated stripes overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, #000 0px, #000 8px, transparent 8px, transparent 16px)",
          }}
        />

        <Construction className="h-4 w-4 shrink-0 text-amber-900 drop-shadow" />

        <p className="text-center text-xs font-semibold text-amber-950 sm:text-sm">
          {settings.constructionMessage}
        </p>

        <button
          onClick={() => setDismissed(true)}
          className="ml-auto shrink-0 rounded-full p-1 text-amber-900 transition-colors hover:bg-amber-900/10"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * BetaTag — an inline badge for use inside header logo areas.
 * Renders nothing when betaMode is off.
 */
export function BetaTag({ className }: { className?: string }) {
  const { settings, isLoading } = usePublicSettings();
  if (isLoading || !settings.betaMode) return null;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        "bg-indigo-500/20 text-[10px] font-bold uppercase tracking-wider text-indigo-300",
        "ring-1 ring-inset ring-indigo-500/40",
        className
      )}
    >
      <FlaskConical className="h-2.5 w-2.5" />
      BETA
    </motion.span>
  );
}

/**
 * Legacy export kept for compatibility.
 * @deprecated Use <AppBanner /> instead.
 */
export function BetaBanner() {
  return <AppBanner />;
}