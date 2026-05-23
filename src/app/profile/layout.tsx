import { GlowBackground } from "@/components/layout/glow-background";
import { StudentHeader } from "@/components/layout/student-header";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <GlowBackground />
      <StudentHeader />
      <main>{children}</main>
    </div>
  );
}
