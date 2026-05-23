import { StudentHeader } from "@/components/layout/student-header";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StudentHeader />
      <div className="mx-auto min-h-screen max-w-5xl px-4 pb-12 pt-24">
        {children}
      </div>
    </>
  );
}
