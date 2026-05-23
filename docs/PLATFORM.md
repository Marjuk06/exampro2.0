# MCQ Pro 2.0 — Platform Architecture

## Overview

MCQ Pro 2.0 is a Next.js 15 competitive examination platform with Firebase backend, JWT sessions, gamification, and real-time exam monitoring.

## Folder structure

```
src/
├── app/                    # App Router pages & API routes
├── components/             # Shared UI (admin, exam, layout, student)
├── features/               # Domain modules (leaderboard, profile, gamification)
├── hooks/                  # React hooks
├── lib/                    # Firebase, auth, validations, utilities
├── server/                 # Server-only orchestration (post-submit, notifications)
├── store/                  # Zustand client state
└── types/                  # TypeScript contracts
```

## Firestore schema

### Public data (`artifacts/{appId}/public/data/`)

| Collection | Purpose |
|------------|---------|
| `exams` | Exam definitions |
| `questions` | Question bank (`imageUrl`, `explanation` optional) |
| `results` | Submissions with rank snapshot fields |
| `retakes` | Student retake requests |
| `live_sessions` | Active exam sessions |
| `exam_leaderboards/{examId}` | Top 50 + participant count (aggregate) |
| `exam_ranks/{examId}_{uid}` | Per-student rank for an exam |
| `global_leaderboard/{uid}` | XP-based global ranking |
| `public_profiles/{studentId}` | Denormalized public profile |

### User data (`artifacts/{appId}/users/{uid}/`)

| Path | Purpose |
|------|---------|
| `profile/main` | Auth profile + XP, level, streak, badges, stats |
| `notifications/{id}` | In-app notifications |
| `bookmarks/{questionId}` | Saved questions (Tier 2) |
| `exam_attempts/{examId}` | Attempt count tracking |

## Ranking pipeline

1. Student submits MCQ via `POST /api/exam/submit`
2. Server writes `results` document
3. `processMcqSubmission()` loads all numeric scores for exam, sorts, assigns rank/percentile
4. Updates result doc, `exam_ranks`, `exam_leaderboards`, global leaderboard, gamification

**Cost note:** Re-ranks all participants per submit. For large exams (>5k), move to Cloud Functions + incremental rank queues.

## Gamification

- **XP:** exam complete, perfect score, top %, streaks, achievements
- **Level:** derived from total XP (`features/gamification/xp.ts`)
- **Streak:** updated on login and exam submit
- **Achievements:** evaluated post-submit (`features/gamification/achievements.ts`)

## API routes

| Route | Description |
|-------|-------------|
| `POST /api/exam/submit` | MCQ submit + ranking + XP |
| `GET /api/leaderboard/exam/[examId]` | Exam leaderboard |
| `GET /api/leaderboard/global` | Global XP leaderboard |
| `GET /api/profile/[studentId]` | Public profile |
| `GET/PATCH /api/notifications` | In-app notifications |

## Security

- JWT httpOnly session cookie (`mcqpro_session`)
- Middleware protects `/student`, `/exam`, `/profile`, `/admin`
- Admin elevation via passcode (migrate to Firestore roles in production)
- Aggregate collections: client read-only in `firestore.rules`
- Server writes via Firebase Admin SDK

## Deployment

1. Set `.env.local` (Firebase client + Admin credentials)
2. Deploy Firestore rules: `firebase deploy --only firestore:rules`
3. `npm run build && npm start`

## Production checklist

- [ ] Rotate `SESSION_SECRET` and service account keys
- [ ] Tighten Firestore rules (disable client writes on `results`)
- [ ] Add Firestore composite indexes for leaderboard queries
- [ ] Enable CSP headers in `next.config.ts`
- [ ] Replace admin passcode with custom claims / role documents
- [ ] Cloud Functions for rank aggregation at scale

## Future scaling

- Incremental rank updates (Redis / BigQuery)
- Practice mode & bookmark collections
- PWA + offline cache
- Real-time leaderboard via Firestore listeners on `exam_leaderboards`
- Image optimization pipeline (Cloud Storage triggers → WebP)
