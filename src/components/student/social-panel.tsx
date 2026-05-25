"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Check,
  ChevronRight,
  Shield,
  Swords,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  useSocialData,
  useAddConnection,
  useSendFriendRequest,
  useRespondFriendRequest,
} from "@/hooks/queries/use-social";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import { cn } from "@/lib/utils";

// ─── Clan Tab ─────────────────────────────────────────────────────────────────
function ClanTab() {
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [desc, setDesc] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.clanLeaderboard,
    queryFn: () => fetchJson<{ clans: Array<{ id: string; name: string; tag: string; totalXp: number; memberCount: number }> }>("/api/student/social/clans"),
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: () =>
      fetchJson("/api/student/social/clans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tag, description: desc }),
      }),
    onSuccess: () => {
      toast.success("Clan created!");
      void qc.invalidateQueries({ queryKey: queryKeys.clanLeaderboard });
      setName(""); setTag(""); setDesc("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const joinMut = useMutation({
    mutationFn: (clanId: string) =>
      fetchJson("/api/student/social/clans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clanId }),
      }),
    onSuccess: () => {
      toast.success("Joined clan!");
      void qc.invalidateQueries({ queryKey: queryKeys.clanLeaderboard });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={tab === "browse" ? "default" : "outline"} onClick={() => setTab("browse")}>Browse Clans</Button>
        <Button size="sm" variant={tab === "create" ? "default" : "outline"} onClick={() => setTab("create")}>Create Clan</Button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "browse" && (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (data?.clans.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No clans yet. Be the first to create one!</p>
            ) : (
              <div className="space-y-2">
                {data!.clans.map((clan, i) => (
                  <motion.div
                    key={clan.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:border-purple-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-xs font-bold text-purple-400">
                        [{clan.tag}]
                      </span>
                      <div>
                        <p className="font-medium">{clan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {clan.memberCount} members · {clan.totalXp.toLocaleString()} XP
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => joinMut.mutate(clan.id)}
                      disabled={joinMut.isPending}
                    >
                      Join
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === "create" && (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="border-purple-500/20 bg-purple-500/5">
              <CardContent className="space-y-3 p-4">
                <div className="flex gap-2">
                  <Input placeholder="Clan name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
                  <Input placeholder="TAG" value={tag} onChange={(e) => setTag(e.target.value.toUpperCase())} className="w-20 font-mono uppercase" maxLength={5} />
                </div>
                <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
                <Button
                  onClick={() => createMut.mutate()}
                  disabled={!name.trim() || !tag.trim() || createMut.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  {createMut.isPending ? "Creating…" : "Create Clan"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Challenges Tab ───────────────────────────────────────────────────────────
function ChallengesTab() {
  const [studentId, setStudentId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const qc = useQueryClient();

  // Fetch available exams for the challenge selector
  const { data: dashboardData } = useQuery({
    queryKey: ["student", "dashboard"],
    queryFn: () => fetchJson<{ exams: Array<{ id: string; title: string }> }>("/api/student/dashboard"),
    staleTime: 60_000,
  });
  const availableExams = dashboardData?.exams ?? [];

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.challenges,
    queryFn: () => fetchJson<{ challenges: Array<{
      id: string; status: string; challengerName: string;
      challengedName: string; examTitle: string; wagerXp: number;
      challengerScore: number | null; challengedScore: number | null;
      createdAt: number;
    }> }>("/api/student/challenges"),
    staleTime: 30_000,
  });

  const challengeMut = useMutation({
    mutationFn: () => {
      if (!selectedExamId) throw new Error("Please select an exam first");
      if (!studentId.trim()) throw new Error("Please enter a student ID");
      return fetchJson("/api/student/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", challengedStudentId: studentId.trim(), wagerXp: 100, examId: selectedExamId }),
      });
    },
    onSuccess: () => {
      toast.success("Challenge sent!");
      void qc.invalidateQueries({ queryKey: queryKeys.challenges });
      setStudentId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const respondMut = useMutation({
    mutationFn: (vars: { challengeId: string; action: "accept" | "decline" }) =>
      fetchJson("/api/student/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.challenges }),
    onError: (e: Error) => toast.error(e.message),
  });

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    active: "bg-green-500/20 text-green-400",
    completed: "bg-blue-500/20 text-blue-400",
    declined: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-4">
      {/* Send challenge */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Student ID to challenge"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="min-w-[160px] flex-1"
          />
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="flex-1 min-w-[160px] rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-white"
          >
            <option value="">Select exam…</option>
            {availableExams.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => challengeMut.mutate()}
          disabled={!studentId.trim() || !selectedExamId || challengeMut.isPending}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          <Swords className="mr-1 h-4 w-4" />
          {challengeMut.isPending ? "Sending…" : "Send Challenge"}
        </Button>
      </div>

      {/* Challenges list */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !data?.challenges.length ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <Swords className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No challenges yet. Challenge a fellow student!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.challenges.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{c.challengerName}</span>
                    <Swords className="h-3 w-3 text-orange-400" />
                    <span>{c.challengedName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.examTitle}</p>
                  <p className="mt-1 text-xs text-orange-400">
                    <Zap className="mr-0.5 inline h-3 w-3" />
                    {c.wagerXp} XP at stake
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge className={cn("text-xs", statusColor[c.status] ?? "")}>
                    {c.status}
                  </Badge>
                  {c.status === "pending" && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 bg-green-600 hover:bg-green-700 px-2"
                        onClick={() => respondMut.mutate({ challengeId: c.id, action: "accept" })}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-red-400"
                        onClick={() => respondMut.mutate({ challengeId: c.id, action: "decline" })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {c.status === "completed" && c.challengerScore !== null && (
                    <p className="text-xs text-muted-foreground">
                      {c.challengerScore} vs {c.challengedScore}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Friends Tab ──────────────────────────────────────────────────────────────
function FriendsTab() {
  const [studentId, setStudentId] = useState("");
  const { data, isLoading } = useSocialData();
  const addConnection = useAddConnection();
  const sendRequest = useSendFriendRequest();
  const respondRequest = useRespondFriendRequest();

  const { data: requests } = useQuery({
    queryKey: queryKeys.friendRequests,
    queryFn: () => fetchJson<{ requests: Array<{ id: string; fromName: string; fromStudentId: string; createdAt: number }> }>("/api/student/social/requests"),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4">
      {/* Pending requests */}
      {(requests?.requests.length ?? 0) > 0 && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserCheck className="h-4 w-4 text-blue-400" />
              Pending requests ({requests!.requests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests!.requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{req.fromName}</span>
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 bg-green-600 px-2" onClick={() => respondRequest.mutate({ requestId: req.id, action: "accept" })}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-red-400" onClick={() => respondRequest.mutate({ requestId: req.id, action: "reject" })}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add friend / rival */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Student ID"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="max-w-[200px]"
        />
        <Button
          size="sm"
          onClick={() => {
            sendRequest.mutate({ toStudentId: studentId.trim() });
            setStudentId("");
          }}
          disabled={!studentId.trim() || sendRequest.isPending}
        >
          <UserPlus className="mr-1 h-4 w-4" /> Friend Request
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            addConnection.mutate({ studentId: studentId.trim(), type: "rival" });
            setStudentId("");
          }}
          disabled={!studentId.trim() || addConnection.isPending}
        >
          <Swords className="mr-1 h-4 w-4" /> Add Rival
        </Button>
      </div>

      {/* Connections list */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (data?.connections.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No connections yet. Add friends or rivals!</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data!.connections.map((c, i) => (
            <motion.li
              key={c.uid}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:border-white/20 transition-colors"
            >
              <a href={`/profile/${c.studentId}`} className="flex items-center gap-2 font-medium hover:text-blue-400 transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
                  {c.name.charAt(0)}
                </div>
                {c.name}
              </a>
              <div className="flex items-center gap-2">
                <Badge variant={c.type === "rival" ? "danger" : "default"}>
                  {c.type}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
function FeedTab() {
  const { data, isLoading } = useSocialData();
  return isLoading ? (
    <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
  ) : (data?.feed.length ?? 0) === 0 ? (
    <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
      <Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">No community activity yet.</p>
    </div>
  ) : (
    <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
      {data!.feed.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="border-b border-white/5 pb-3 text-sm last:border-0"
        >
          <p className="font-medium text-white">{item.name}</p>
          <p className="text-muted-foreground">{item.message}</p>
          <p className="mt-0.5 text-xs text-muted-foreground/50">
            {new Date(item.createdAt).toLocaleTimeString()}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Social Panel ────────────────────────────────────────────────────────
export function SocialPanel() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="friends">
        <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
          <TabsTrigger value="friends">
            <Users className="mr-1.5 h-3.5 w-3.5" />Friends
          </TabsTrigger>
          <TabsTrigger value="challenges">
            <Swords className="mr-1.5 h-3.5 w-3.5" />Challenges
          </TabsTrigger>
          <TabsTrigger value="clans">
            <Shield className="mr-1.5 h-3.5 w-3.5" />Clans
          </TabsTrigger>
          <TabsTrigger value="feed">
            <Activity className="mr-1.5 h-3.5 w-3.5" />Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <FriendsTab />
        </TabsContent>
        <TabsContent value="challenges">
          <ChallengesTab />
        </TabsContent>
        <TabsContent value="clans">
          <ClanTab />
        </TabsContent>
        <TabsContent value="feed">
          <FeedTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
