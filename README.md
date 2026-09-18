# Attendance Checker

A squadron/guild attendance tracker: members sign in with Discord, submit their
IGN, attendance, pilot status and hours, and every submission posts to a
Discord channel via webhook. Admins get a console to view, filter, delete and
export submissions, change the webhook, and manage who else has admin access.

Built with Next.js 14 (App Router), Auth.js (Discord OAuth), Prisma +
Postgres, and Tailwind. Light and dark mode included.

---

## 1. What you need before you start

- **Node.js 18+** installed on your machine
- A **free Postgres database** — [Neon](https://neon.tech) or
  [Supabase](https://supabase.com) both work well and take ~2 minutes to set up.
  Copy the connection string they give you.
- A **Discord application** for OAuth login (step 2 below)
- A **Discord webhook URL** for notifications (step 3 below)
- A **GitHub account**, to push this code (step 6 below)

## 2. Create the Discord OAuth app

1. Go to <https://discord.com/developers/applications> → **New Application**.
2. Open **OAuth2** in the sidebar. Copy the **Client ID** and **Client Secret**
   — these become `AUTH_DISCORD_ID` and `AUTH_DISCORD_SECRET`.
3. Under **Redirects**, add:
   - `http://localhost:3000/api/auth/callback/discord` (for local dev)
   - `https://your-domain.vercel.app/api/auth/callback/discord` (once deployed —
     you can add this after step 7)

## 3. Create a Discord webhook (for notifications)

In your Discord server: **Server Settings → Integrations → Webhooks → New
Webhook**. Pick the channel you want submissions posted to, then **Copy
Webhook URL**. This is your `DISCORD_WEBHOOK_URL` (you can also change it
later from the admin panel without redeploying).

## 4. Find your Discord user ID (so you're the first admin)

In Discord: **Settings → Advanced → Enable Developer Mode**. Then right-click
your own name anywhere and choose **Copy User ID**. This is your
`OWNER_DISCORD_ID` — that account always has admin access, no matter what's in
the database, so you can never lock yourself out.

## 5. Local setup

```bash
# install dependencies
npm install

# copy the env file and fill in the values from steps 1–4
cp .env.example .env

# push the schema to your database
npx prisma db push

# run it
npm run dev
```

Visit `http://localhost:3000`, sign in with Discord, and you should land on
the attendance form. Sign in with the account matching `OWNER_DISCORD_ID` and
an **Admin** link appears in the top bar.

## 6. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

`.env` is already in `.gitignore`, so your secrets won't be committed — only
`.env.example` (with placeholder values) goes to GitHub.

## 7. Deploy (Vercel is the easiest path)

1. Go to [vercel.com](https://vercel.com) → **New Project** → import the
   GitHub repo you just pushed.
2. In **Environment Variables**, add everything from your `.env` file
   (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`,
   `OWNER_DISCORD_ID`, `DISCORD_WEBHOOK_URL`), plus `NEXTAUTH_URL` set to your
   production URL (e.g. `https://your-app.vercel.app`).
3. Deploy. Once it's live, go back to the Discord Developer Portal and add
   `https://your-app.vercel.app/api/auth/callback/discord` to the OAuth2
   redirect list.
4. Run `npx prisma db push` once against your production `DATABASE_URL` (or
   just reuse the same database you used locally — that already has the
   schema).

## How admin access works

- The account matching `OWNER_DISCORD_ID` is always an admin — a hardcoded
  safety net.
- From **Admin → Access**, the owner (or any admin) can add other Discord
  users as admins by their Discord user ID. They get access the next time
  they sign in — no redeploy needed.

## Customizing

- **Squadron/server name and webhook** — editable live from **Admin →
  Settings**.
- **Colors and fonts** — `src/app/globals.css` (CSS variables for light/dark)
  and `tailwind.config.ts`.
- **Form fields** — `src/components/attendance-form.tsx` on the frontend,
  `src/app/api/attendance/route.ts` for validation, and `prisma/schema.prisma`
  for storage. Run `npx prisma db push` again after changing the schema.
