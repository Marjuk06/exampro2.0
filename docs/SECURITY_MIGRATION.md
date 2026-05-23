# Phase 1 — Security Migration Guide

## Deploy Firestore & Storage rules (required)

```bash
firebase deploy --only firestore:rules,storage
```

Without this step, client writes will fail (expected) but rules must match production.

## Bootstrap superadmin

1. Add to `.env.local`:
   ```env
   INITIAL_SUPERADMIN_EMAIL=your@email.com
   ```
   or `INITIAL_SUPERADMIN_UID=<firebase-uid>`

2. Sign in at `/auth/login`
3. Visit `/admin/login` → **Refresh admin session**
4. Assign other admins in **Settings → RBAC** (superadmin only)

## Breaking changes

| Before | After |
|--------|--------|
| Admin passcode at `/admin/login` | Custom claims + session refresh |
| Client Firestore writes (exams, questions, etc.) | Secured API routes only |
| Students read all `results` | Scoped to `uid == auth.uid` |
| `adminPasscode` in settings | Removed |

## Assign admin role

```http
POST /api/superadmin/users/{uid}/role
{ "role": "admin" }
```

Requires superadmin session. User must sign out/in or refresh Firebase ID token.

## Remaining manual steps

- Remove `adminPasscode` field from Firestore `config/settings` (optional cleanup)
- Deploy Firestore index for `global_leaderboard` orderBy `xp` if not auto-created
- Configure Upstash Redis for distributed rate limits (optional)
