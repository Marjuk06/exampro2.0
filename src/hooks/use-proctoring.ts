"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ViolationType } from "@/types";

interface ProctoringOptions {
  enabled: boolean;
  examId: string;
  sessionId: string;
  maxViolations: number;
  onViolation: (type: ViolationType, count: number) => void;
  onForceSubmit: () => void;
}

const BLOCKED_KEYS = new Set([
  "F12",
  "c",
  "v",
  "x",
  "a",
  "p",
  "u",
  "s",
]);

export function useProctoring({
  enabled,
  examId,
  sessionId,
  maxViolations,
  onViolation,
  onForceSubmit,
}: ProctoringOptions) {
  const countRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const report = useCallback(
    async (type: ViolationType) => {
      if (!enabled) return;
      countRef.current += 1;
      const count = countRef.current;
      onViolation(type, count);

      try {
        await fetch("/api/exam/violation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId, sessionId, type }),
        });
      } catch {
        /* best effort */
      }

      if (count >= maxViolations) {
        onForceSubmit();
      }
    },
    [enabled, examId, sessionId, maxViolations, onViolation, onForceSubmit]
  );

  useEffect(() => {
    if (!enabled) return;

    channelRef.current = new BroadcastChannel(`exam-${examId}`);
    channelRef.current.postMessage({ type: "ping", sessionId });
    channelRef.current.onmessage = (e) => {
      if (e.data?.sessionId && e.data.sessionId !== sessionId) {
        report("multiple_tabs");
      }
    };

    const onVisibility = () => {
      if (document.hidden) report("visibility_hidden");
    };

    const onBlur = () => report("tab_switch");

    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      report("copy_paste");
    };

    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      report("right_click");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        report("devtools");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && BLOCKED_KEYS.has(e.key.toLowerCase())) {
        e.preventDefault();
        report("keyboard_shortcut");
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) report("fullscreen_exit");
    };

    let devtoolsOpen = false;
    const devtoolsCheck = setInterval(() => {
      const threshold = 160;
      const open =
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold;
      if (open && !devtoolsOpen) {
        devtoolsOpen = true;
        report("devtools");
      }
    }, 1000);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onCopy);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      clearInterval(devtoolsCheck);
      channelRef.current?.close();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onCopy);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [enabled, examId, sessionId, report]);

  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* user may deny */
    }
  }, []);

  return { requestFullscreen, violationCount: countRef };
}
