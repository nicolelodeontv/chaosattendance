# Attendance Checker

A squadron/guild attendance tracker: members sign in with Discord, submit their IGN,
attendance, pilot status and hours, and every submission posts to a Discord channel
via webhook. Admins can view, filter, delete and export submissions, change the
webhook, rotate the active op, and manage admin access.

Built with Next.js 14 (App Router), Auth.js (Discord OAuth), Prisma + Postgres,
and Tailwind. Light and dark mode included.

## Setup

Install dependencies, configure the values in .env from .env.example, update the
database schema, and run the app:

    npm install
    npm run db:push
    npm run dev

Required environment variables are DATABASE_URL, AUTH_SECRET, AUTH_DISCORD_ID,
AUTH_DISCORD_SECRET, OWNER_DISCORD_ID, and DISCORD_WEBHOOK_URL.

For Discord OAuth, add the production callback URL:

    https://your-domain.example/api/auth/callback/discord

## Submission locking

Each submission is scoped by the current op ID stored in Admin → Settings.
The database enforces a unique combination of opId + discordId, so one Discord
account can submit only once for the same op.

The page checks the current op on the server before rendering the form. The POST
handler also performs the check and catches the database unique-constraint race,
returning HTTP 409 for duplicate submissions.

After submitting, the form is replaced by a persistent locked state. The user can
open the Contact mods / admins dialog, which shows:

"You've already submitted for this op. If you need to change your response, please DM a mod or admin."

There is no second "Submit another entry" action.

## Starting a new op

Open Admin → Settings and change Current op ID, for example:

    FD-2026-S2

Changing the ID opens a new submission window while preserving previous submissions
in the admin log.

Admin deletion removes the submission record, which also releases that Discord
account's lock for that op so a correction can be submitted.

## Database upgrade required for this version

The Prisma schema now adds Submission.opId, a unique constraint on
Submission(opId, discordId), and Settings.currentOpId.

Existing Submission rows receive the default op ID "current". Run:

    npm run db:push

against every database environment before deploying/using the new form.

## Admin access

The account matching OWNER_DISCORD_ID is always an admin. Other admins can be
managed from Admin → Access.

## UI

Colors, surfaces, spacing, controls and card treatment live in src/app/globals.css.
The existing font-family declarations in src/app/layout.tsx and
tailwind.config.ts are intentionally unchanged.
