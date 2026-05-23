import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60)
    .toString()
    .padStart(2, "0");
  const s = (Math.max(0, seconds) % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function formatPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

/** Deterministic shuffle per student (matches legacy HTML behavior) */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const s = [...arr];
  let h = seed;
  for (let i = s.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h ^= h >>> 11;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    const j = Math.abs(h) % (i + 1);
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

export function uidToSeed(uid: string): number {
  return uid.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

export function generateStudentId(): string {
  return `STU-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function examLink(examId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/exam/${examId}`;
}

export function sanitizeCsvCell(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
