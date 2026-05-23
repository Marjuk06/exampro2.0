import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicProfileView } from "@/features/profile/public-profile-view";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;

  return (
    <div className="min-h-screen px-4 pb-12 pt-24">
      <div className="mx-auto max-w-3xl">
        <Link href="/student">
          <Button variant="outline" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <PublicProfileView studentId={studentId} />
      </div>
    </div>
  );
}
