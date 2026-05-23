"use client";

import { motion } from "framer-motion";

export function GlowBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -left-[10%] -top-[20%] h-[60vw] w-[60vw] rounded-full bg-blue-500/25 blur-[120px]"
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-[20%] -right-[10%] h-[50vw] w-[50vw] rounded-full bg-purple-500/25 blur-[120px]"
        animate={{ opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </div>
  );
}
