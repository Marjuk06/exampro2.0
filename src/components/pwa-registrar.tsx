"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for PWA/offline support.
 * Must be a client component to access `navigator`.
 * Renders nothing — purely a side-effect hook.
 */
export function PwaRegistrar() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Check for updates every 60s
        const interval = setInterval(() => {
          reg.update().catch(() => {});
        }, 60_000);
        window.addEventListener("beforeunload", () => clearInterval(interval));
      })
      .catch((err) => {
        // SW registration failure is non-fatal
        console.warn("[PWA] Service worker registration failed:", err);
      });
  }, []);

  return null;
}
