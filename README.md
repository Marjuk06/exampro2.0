# MCQ Pro 2.0 — Ultimate Exam Center

Production-grade online examination platform built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **Firebase**, **Zustand**, and **TanStack Query**.

## Features

- **Authentication**: Google OAuth, email/password, JWT session cookies, role-based access
- **Student portal**: Exam dashboard, live timer, MCQ/CQ exams, results, analytics, retake requests
- **Admin portal**: Dashboard, analytics (Recharts), live monitor, exam/question management, CQ grading, CSV export
- **Exam engine**: Seeded question shuffle, question palette, bookmarks, auto-save, server-side scoring
- **Proctoring**: Fullscreen, tab switch, copy/paste block, devtools heuristics, violation logging
- **CQ submissions**: Multi-image upload to Firebase Storage
- **Security**: CSP headers, rate limiting, Zod validation, Firestore/Storage rules

## Quick Start

```bash
cp .env.example .env.local
# Fill Firebase client + admin credentials

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Admin Access

1. Sign in with any account at `/auth/login`
2. Go to `/admin/login` and enter passcode (default: `admin123` unless changed in Firestore settings)

## Environment Variables

See `.env.example`. Required:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web config |
| `FIREBASE_PROJECT_ID` | Admin SDK project |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account `private_key` from JSON (use `\n` for newlines) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Alternative: entire service account JSON as one line |

### Private key setup

1. Firebase Console → **Project Settings** → **Service accounts** → **Generate new private key**
2. Open the downloaded `.json` file
3. Copy the `private_key` value into `.env.local`:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

Keep the `\n` escape sequences — do not paste only numbers or a key ID.

Verify configuration: `GET http://localhost:3000/api/health/firebase`
| `SESSION_SECRET` | 32+ char secret for JWT cookies |

## Firebase Setup

1. Enable **Authentication** (Google + Email/Password)
2. Create **Firestore** database
3. Enable **Storage**
4. Deploy rules: `firebase deploy --only firestore:rules,storage`
5. Create service account key for Admin SDK

Data paths match the legacy HTML app:

```
artifacts/{APP_ID}/public/data/{exams|questions|results|...}
artifacts/{APP_ID}/users/{uid}/profile/main
```

## Project Structure

```
src/
├── app/           # App Router pages & API routes
├── components/  # UI, exam, admin, layouts
├── hooks/         # Auth, Firestore, proctoring
├── lib/           # Firebase, auth, validations, scoring
├── store/         # Zustand exam + UI state
└── types/         # Shared TypeScript models
```

## Scripts

- `npm run dev` — Development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript check

## License

Private — MCQ Pro examination platform.
# exampro2.0
