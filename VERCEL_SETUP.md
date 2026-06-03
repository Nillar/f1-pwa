# Vercel Setup

This repo is prepared for a Vercel deployment with hosted Postgres and Vercel Cron.

## Required Vercel Resources

1. Create or import the project in Vercel.
2. Add a managed Postgres database from Vercel Storage or Marketplace.
3. Connect the database to this project so Vercel injects `DATABASE_URL`.
4. Add the required notification and cron environment variables.

Recommended database provider:

- Prisma Postgres through the Vercel Marketplace

Good alternatives:

- Neon
- Supabase

## Required Environment Variables

Set these in Vercel Project Settings.

```text
DATABASE_URL
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
CRON_SECRET
```

`CRON_SECRET` should be a random secret. In production, `/api/cron/send-reminders` rejects requests unless Vercel sends this secret in the `Authorization` header.

## Build And Migration Flow

Vercel uses `vercel.json`:

```json
{
  "buildCommand": "npm run vercel-build"
}
```

The build script runs:

```text
prisma generate
prisma migrate deploy
next build --turbopack
```

`prisma migrate deploy` applies committed migration files to the hosted database. Keep `prisma/migrations/` committed.

## Cron Flow

Vercel calls this route:

```text
GET /api/cron/send-reminders
```

Current schedule:

```text
0 0 * * *
```

This checks reminders once per day at 00:00 UTC, which fits Vercel Hobby cron limits.

The cron route:

- loads all users with push subscriptions
- applies race mute settings
- applies race-specific session reminders over global reminders
- checks for reminders due on the current UTC calendar day
- creates a `SentNotification` row before sending
- skips duplicate sends using the unique `SentNotification` constraint
- removes expired browser push subscriptions when Web Push returns `404` or `410`

Reminder offsets are daily only. Users can set up to 3 reminders per session, and each reminder must be a different day offset such as 1, 2, or 3 days before the session.

## Local Development Notes

The Prisma datasource is now Postgres:

```prisma
provider = "postgresql"
```

Local SQLite is no longer compatible with the current schema config.

For local database work, use a local Postgres instance or a development database URL from the hosted provider.

Common commands:

```bash
npm run prisma:generate
npm run prisma:migrate:dev -- --name migration_name
npm run prisma:migrate:deploy
npm run lint
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`:

```powershell
npm.cmd run lint
```

## Preview Deployment Note

Preview deployments should use a separate preview database if you plan to run migrations in previews. Otherwise, preview builds can apply schema changes to the production database.

For a small personal project, using only production may be acceptable at first, but separate preview and production databases are the safer setup.

## Remaining Vercel Dashboard Steps

1. Create/connect hosted Postgres.
2. Add all environment variables.
3. Confirm the Vercel build command is using `npm run vercel-build`.
4. Deploy to production.
5. Open Vercel Cron Jobs settings and confirm `/api/cron/send-reminders` is registered.
6. Enable notifications from the deployed app.
7. Save a daily reminder for an upcoming session and confirm a row appears in `SentNotification` after the next midnight UTC cron run.
