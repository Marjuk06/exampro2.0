"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import type { Exam, ExamResult, RetakeRequest } from "@/types";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { publicPaths } from "@/lib/firestore/public-data";
import { useAuth } from "@/components/providers/auth-provider";
import { normalizeExam, normalizeExamResult } from "@/lib/firestore/normalize";

export interface StudentDashboardData {
  exams: Exam[];
  results: ExamResult[];
  retakes: RetakeRequest[];
  questionCounts: Record<string, number>;
}

export function useStudentDashboard(enabled = true) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const queryResult = useQuery({
    queryKey: queryKeys.studentDashboard,
    queryFn: () => fetchJson<StudentDashboardData>("/api/student/dashboard"),
    enabled: enabled && !!profile,
    staleTime: Infinity, // Rely on snapshot subscriptions for freshness
    refetchOnWindowFocus: false,
  });

  // Real-time synchronization
  useEffect(() => {
    if (!enabled || !profile) return;
    const db = getFirebaseDb();
    
    // Listen to Exams
    const unsubExams = onSnapshot(collection(db, ...publicPaths.exams), (snap) => {
      queryClient.setQueryData<StudentDashboardData | undefined>(queryKeys.studentDashboard, (old) => {
        if (!old) return old;
        const newExams = snap.docs.map(d => normalizeExam({ id: d.id, ...d.data() }));
        return { ...old, exams: newExams };
      });
    });

    // Listen to Results for this user
    const unsubResults = onSnapshot(
      query(collection(db, ...publicPaths.results), where("uid", "==", profile.uid)), 
      (snap) => {
        queryClient.setQueryData<StudentDashboardData | undefined>(queryKeys.studentDashboard, (old) => {
          if (!old) return old;
          const newResults = snap.docs.map(d => normalizeExamResult({ id: d.id, ...d.data() }));
          return { ...old, results: newResults };
        });
      }
    );

    return () => {
      unsubExams();
      unsubResults();
    };
  }, [enabled, profile, queryClient]);

  return queryResult;
}
