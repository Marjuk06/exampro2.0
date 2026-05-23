"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { useMounted } from "@/hooks/use-mounted";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  return (
    <Sonner
      theme={(mounted ? resolvedTheme : "dark") as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-black/80 group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-lg group-[.toaster]:backdrop-blur-xl",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
