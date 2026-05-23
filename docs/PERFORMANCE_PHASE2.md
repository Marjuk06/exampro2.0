# Phase 2 — Performance, Scalability & Data Optimization

## Summary

Phase 2 reduces Firestore read/write cost, replaces O(n) ranking with incremental updates, introduces server APIs + TanStack Query caching, and prepares background job handlers for Cloud Functions.

## 1. Eliminated full collection reads (client)

| Area | Before | After |
|------|--------|-------|
| Student dashboard | Full `exams`, `questions`, scoped `results` listeners | `GET /api/student/dashboard` (limited queries + `exam_stats` counts) |
| Student analytics | Full exams + questions + all results | `GET /api/student/analytics` (100 results max) |
| Admin overview | Full exams, results, questions, live_sessions | `GET /api/admin/dashboard` |
| Admin analytics | Full results + questions scan | `GET /api/admin/analytics` (500 results + count aggregates) |
| Admin results | Full results listener | Paginated `GET /api/admin/results` (50/page, cursor) |
| Live monitor | Full `live_sessions` collection | `GET /api/admin/live-sessions` (`endTime > now`, limit 100) |
| Notifications | Ad-hoc fetch | TanStack Query + paginated API + unread `.count()` |
| Admin exams/questions | Unbounded listeners | `limit(100)` / `limit(500)` on listeners |

## 2. Ranking architecture

**Before:** On each MCQ submit, load all results for exam → O(n) sort → write ranks.

**After (`processIncrementalRanking`):**

1. `exam_stats.participantCount` increment (1 write)
2. Two Firestore `.count()` queries for rank position (score higher + tie-breaker)
3. Merge into cached `exam_leaderboards/{examId}` top-50 only
4. Update `exam_ranks/{examId}_{uid}`, weekly/monthly `period_leaderboards`, subject boards
5. Enqueue `analytics.rebuild` job (async)

**Rebuild path:** `rebuildExamLeaderboard()` remains for admin/jobs only.

## 3. Caching (TanStack Query)

- Default `staleTime: 30s` in `AppProviders`
- Hooks: `useStudentDashboard`, `useStudentAnalytics`, `useNotifications`, `useGlobalLeaderboard`, `useAdminDashboard`, `useAdminAnalytics`, `useAdminResults` (infinite)
- Query keys centralized in `src/lib/query/query-keys.ts`

## 4. New Firestore collections (server-written)

- `exam_stats/{examId}` — participant + question counts
- `period_leaderboards/{key}` — weekly/monthly top-N
- `subject_leaderboards/{subject}` — subject top-N
- `analytics/global`, `analytics/exams/{examId}` — precomputed metrics

Rules: read for signed-in (stats/leaderboards) or admin (analytics); client writes denied.

## 5. Realtime optimization

- Live exam: answer sync **45s** (was 15s); heartbeat **60s** (metadata only)
- `lastHeartbeat` on live session documents
- Job `live_sessions.prune` deletes expired sessions (indexed query, batch 200)
- Admin live view: polling API every 30s instead of full collection listener

## 6. Pagination

- Notifications: cursor + `limit`
- Admin results: `startAfter` cursor
- Global leaderboard: cursor support in API

## 7. Images & storage

- CQ uploads: `sharp` WebP resize (max 1920px, quality 82)
- Structured paths: `cq-submissions/{uid}/{examId}/{file}`
- Metadata on GCS objects (dimensions, original name)

## 8. Indexes (`firestore.indexes.json`)

Added composites for: `results` (uid+submittedAt, examId+submittedAt, examId+score, ranking tie-break), `live_sessions` (endTime), `global_leaderboard` (xp), `notifications`.

Deploy: `firebase deploy --only firestore:indexes`

## 9. Background jobs

`src/server/jobs/register-handlers.ts`:

| Job | Handler |
|-----|---------|
| `analytics.rebuild` | Global + per-exam analytics docs |
| `live_sessions.prune` | Delete expired sessions |
| `ranking.refresh_exam` | Full leaderboard rebuild |

Swap `enqueueJob` implementation for Cloud Tasks / Pub/Sub when scaling.

## 10. Query monitoring

`src/server/observability/query-metrics.ts` — `trackQuery(name, fn)` logs slow operations (>500ms) in development.

## Estimated scale impact

| Metric | Before (approx.) | After (per active student session) |
|--------|------------------|--------------------------------------|
| Dashboard load | 3 listeners + all questions | 1 API (~150 reads) |
| Each MCQ submit ranking | O(n) result reads | ~6–10 reads + bounded writes |
| Live exam (1 hour) | 240 PATCH/min potential | ~80 answer + 60 heartbeat writes/hour |
| Admin live page | All sessions realtime | 100 docs / 30s poll |

**Supported scale (estimate):** comfortable for **5k–20k MAU** on Firestore Blaze with current patterns; ranking count queries become the next bottleneck beyond ~50k submissions/exam (consider Cloud Functions + dedicated rank service).

## Future bottlenecks

1. Firestore `.count()` cost at very high submission volume per exam
2. Admin question bank still uses client listener (500 cap) — move to admin API for 10k+ questions
3. Global analytics rebuild still samples 1000 results — schedule nightly full rebuild in Cloud Functions
4. Period leaderboard merge is in-process — shard by period in workers at scale
5. Signed URL expiry for CQ images — add renewal job or public CDN paths

## Deploy checklist

1. `npm install` (adds `sharp`)
2. `firebase deploy --only firestore:rules,firestore:indexes`
3. `npm run build`
4. Verify indexes build in Firebase Console (no failed queries)
