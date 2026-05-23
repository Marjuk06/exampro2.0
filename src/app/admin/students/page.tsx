"use client";

import { Card, CardContent } from "@/components/ui/card";
import { publicPaths } from "@/lib/firestore/public-data";
import { useNormalizedFirestoreCollection } from "@/hooks/use-normalized-collection";
import {
  normalizeExamResult,
  normalizeStudentProfile,
} from "@/lib/firestore/normalize";

export default function AdminStudentsPage() {
  const { data: results } = useNormalizedFirestoreCollection(
    [...publicPaths.results],
    normalizeExamResult
  );

  const list = Array.from(
    results
      .reduce((map, r) => {
        const key = r.uid || r.id;
        const profile = normalizeStudentProfile(r.studentProfile);
        if (!map.has(key)) {
          map.set(key, {
            uid: key,
            name: profile.name,
            studentId: profile.studentId,
            submissions: 0,
          });
        }
        map.get(key)!.submissions++;
        return map;
      }, new Map<string, { uid: string; name: string; studentId: string; submissions: number }>())
      .values()
  );

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Students</h2>
      <div className="glass-panel overflow-x-auto rounded-2xl">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="p-4">Name</th>
              <th className="p-4">Student ID</th>
              <th className="p-4">Submissions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.uid} className="border-t border-white/5 hover:bg-white/5">
                <td className="p-4">{s.name}</td>
                <td className="p-4 text-muted-foreground">{s.studentId}</td>
                <td className="p-4">{s.submissions}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <Card className="border-0 shadow-none">
            <CardContent className="py-8 text-center text-muted-foreground">
              No student submissions yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
