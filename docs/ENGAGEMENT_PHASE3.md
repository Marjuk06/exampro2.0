# Phase 3 — Student Engagement & Competitive Ecosystem

## Summary

Phase 3 expands MCQ Pro from an exam platform into a competitive learning ecosystem while preserving UI identity, security, and Phase 2 performance optimizations.

## New Systems

### Advanced Rankings
- **Global rank** via count query (`getGlobalRankPosition`)
- **Subject rank** from `subject_leaderboards` cache
- **Weekly / monthly / all-time** leaderboards (period tabs in UI)
- **Rank history** per user (`users/{uid}/rank_history`)
- **Rank delta** on submit + `RankMovementBadge` UI
- **Nearby ranks** API for exam context

### Gamification 2.0
- **Daily rewards** with streak multiplier (`/api/student/engagement`)
- **Daily & weekly missions** with XP claim (`/api/student/missions`)
- **Extended achievements** (Top 10%, Practice Pro, 1000 Questions, etc.)
- **XP progress bar** in engagement hub
- Mission progress auto-updates on exam submit & practice

### Practice Ecosystem
- **Practice modes**: daily challenge, weak topics, mistakes, timed, subject, adaptive
- Sessions stored in `users/{uid}/practice_sessions`
- Wrong answers → `users/{uid}/mistakes` for revision
- Practice XP without official exam submission

### Weak Topic Analytics
- `computeStudentInsights()` — weakest/strongest topics, heatmap, recommendations
- Rank history chart in analytics tab
- Server API: `GET /api/student/insights`

### Profile 2.0
- `PATCH /api/student/profile` — bio, favorite subjects, avatar upload
- Public profile shows achievements, streak, stats (existing + synced)

### Social Competition
- Friends & rivals via student ID (`/api/student/social`)
- Public activity feed (`activity_feed` collection)
- Compare stats API

### Revision System
- Persistent bookmarks API (`/api/student/bookmarks`)
- Revision folders
- Auto-mistake collection from exams & practice

### PDF Reports
- Server-generated certificates via `pdf-lib`
- `GET /api/student/reports/result?resultId=`
- `GET /api/student/reports/achievement?badgeId=`

### Dashboard 2.0
- **Engagement hub** widgets: rank, streak, XP, weekly goal, missions, daily reward
- New tabs: Practice, Revision, Social

### Leaderboard Experience
- Period switcher (all-time / weekly / monthly)
- Podium UI for top 3 with crown/medals

## Retention Strategy

| Loop | Mechanism |
|------|-----------|
| Daily return | Daily reward + daily challenge + streak |
| Progression | XP levels, missions, achievements |
| Competition | Leaderboards, rivals, rank movement |
| Practice | Weak-topic recommendations, mistake review |
| Social proof | Activity feed, public profiles |

## Scalability Notes

- Practice/insights use bounded queries (limit 80–300 docs)
- Activity feed capped at 25–30 items
- Rank history paginated (20 entries)
- Daily challenge doc = 1 read per day per platform
- No client-side full collection scans added

## Deploy

1. `npm install` (adds `pdf-lib`)
2. `firebase deploy --only firestore:rules,firestore:indexes`
3. `npm run build`

## Future Expansion

- Real-time friend challenges with push notifications
- Institution/clan leaderboards
- ML-based adaptive difficulty
- Streak freeze UI + IAP
- Full chapter-rank boards per exam section
- WebSocket rank preview during live exams
