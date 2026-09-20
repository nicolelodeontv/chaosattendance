# Attendance Checker

A squadron/guild attendance tracker: members sign in with Discord, submit their IGN,
attendance, pilot status and hours, and every submission can be posted to a Discord
channel via webhook. Admins can view, filter, edit, export and manage attendance.

Built with Next.js 14 (App Router), Auth.js (Discord OAuth), Prisma + PostgreSQL,
and Tailwind. Light and dark mode are supported.

## Requirements

- Node.js 20 LTS is recommended.
- A PostgreSQL database.
- A Discord application for OAuth.
- A Discord webhook for notifications when notifications are enabled.

## Environment variables

Copy `.env.example` to `.env.local` for local development. Never commit real
secrets.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `AUTH_SECRET` | Auth.js session/JWT secret |
| `NEXTAUTH_URL` | Application URL |
| `AUTH_DISCORD_ID` | Discord OAuth client ID |
| `AUTH_DISCORD_SECRET` | Discord OAuth client secret |
| `OWNER_DISCORD_ID` | Discord ID that receives owner access |
| `DISCORD_WEBHOOK_URL` | Default Discord notification webhook |

The production values belong in the deployment environment. Do not print, commit,
or paste the full values into source control or issue/PR discussions.

## Local setup

Install the locked dependency tree and start the app:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Run the static checks before opening a pull request:

```bash
npm run typecheck
npm run build
```

For a disposable/local database, the Prisma scripts can be used as appropriate.
Production database changes are handled separately and must not be performed by the
Vercel build.

## Roles and access

### Owner

The account matching `OWNER_DISCORD_ID` is the owner.

Owner-only actions include:

- Settings
- Access management
- Single submission deletion
- Bulk submission deletion
- Recently removed and restore

Owner recognition is enforced server-side.

### Additional admins

Additional admins can work with the submission log and notifications, including:

- View and filter submissions
- Export submissions
- Edit submissions
- View admin notifications

They do not receive owner-only Settings, Access, delete, bulk-delete, or Recently
Removed/restore controls.

### Members

Regular members sign in with Discord and can submit attendance for the current
operation. A member's submission is scoped by the current operation ID and Discord
user ID, so the same account cannot submit twice for the same operation.

## Submission locking

Each submission is scoped by the current op ID stored in Admin → Settings. The
database enforces a unique combination of `opId` + `discordId`.

The server checks the lock as well as the database constraint. A duplicate member
submission returns HTTP 409, and the public form shows the locked response state.

Admin editing remains available by submission ID for authorized admins. Owner
deletion removes the stored submission so a corrected response can be submitted.

## Recently removed archive

Recently removed is backed by the additive `DeletedSubmission` table. The current
application does **not** change the production database automatically during a
Vercel build.

The production archive table is created manually from:

```text
docs/sql/deleted-submission.sql
```

Run that file once in the SQL editor for the same PostgreSQL database used by the
production `DATABASE_URL`. The SQL uses `IF NOT EXISTS` for the table and indexes,
so rerunning it is safe.

Do **not** use `npm run db:push`, `prisma migrate`, or a Vercel build to create
the production archive table. The production database schema is managed separately
from application deployment.

When the archive table is missing, Admin → Recently removed shows a setup message
instead of a misleading empty/error state. Once the table exists, Refresh loads the
30-day archive window.

The archive preserves the original submission values needed for restore, including
the original `createdAt` and optional `notes`.

## Database schema safety

The `Submission` model and its unique `(opId, discordId)` constraint are part of
the live attendance data rules. Do not change them casually.

This repository intentionally keeps database setup separate from the normal
application deployment. Review any schema or data change independently before
running it against production.

## Deploying to Vercel

1. Import the GitHub repository into Vercel.
2. Add the required production environment variables in the Vercel project.
3. Deploy from `main`.
4. Confirm the production deployment reaches READY.
5. If Recently removed is needed, create the archive table manually with
   `docs/sql/deleted-submission.sql` in the production database's SQL editor.
6. Use the Vercel preview deployment for pull-request verification before merging.

The application build is:

```text
prisma generate && next build
```

No database migration or `prisma db push` is part of the production build.

### Ignored Build Step recommendation

Vercel can skip preview builds on non-`main` branches to conserve deployments.

**Recommendation only. This is not applied in the project settings.**

In Vercel Project Settings → Build & Deployment → Ignored Build Step, a branch-only
guard can be used:

```bash
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 1; else exit 0; fi
```

With Vercel's ignored-build semantics, the command exits non-zero for `main` so
the main build continues, and exits zero on other branches so their preview build
is skipped.

## Pull request checks

Pull requests run the GitHub Actions typecheck workflow:

```text
npm ci
npm run typecheck
```

Keep the lockfile committed so CI uses the same dependency tree everywhere.

## Admin notifications

The admin notification panel polls for recent submission events and keeps unread
state in the browser. Notification failures do not block successful attendance
writes.

Discord notification configuration can be managed from the owner-only Settings
area. Webhook values are kept server-side.

## Project layout

- `src/app/` — Next.js pages and API routes
- `src/components/` — reusable UI components
- `src/lib/` — shared server helpers
- `prisma/schema.prisma` — application data model
- `docs/sql/` — manual SQL for the production archive setup

## Security and secrets

- `.env` and local environment files are ignored by Git.
- `.env.example` contains placeholders only.
- Keep Discord OAuth secrets, webhook URLs, database connection strings and auth
  secrets out of source control.
- Server-side APIs enforce the relevant owner/admin/member rules even when a client
  hides a control.
