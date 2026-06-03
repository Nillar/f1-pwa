# TODO Next Steps

## Goal

Move the app from local SQLite to a hosted Postgres database, deploy on Vercel, and use once-daily Vercel Cron for scheduled reminder delivery.

## Completed In Code

- `prisma/schema.prisma` now targets Postgres
- `prisma/migrations/` now contains a Postgres initial migration
- `package.json` has Prisma and Vercel build scripts
- `vercel.json` configures the Vercel build command and cron schedule
- `/api/cron/send-reminders` sends due production reminders
- `SentNotification` is used to dedupe scheduled sends
- reminder settings are daily offsets only, with up to 3 unique days per session
- `.env.example` lists the required Vercel variables
- `VERCEL_SETUP.md` documents the remaining dashboard setup

## Recommended Direction

- Host the app on Vercel
- Host the database as managed Postgres
- Use Prisma against Postgres
- Use Vercel Cron once daily at 00:00 UTC to call an API route that checks which daily notifications should be sent

## Database Hosting Recommendation

Best default:

- Prisma Postgres through the Vercel Marketplace

Reasons:

- clean fit for Prisma + Vercel
- Vercel injects `DATABASE_URL`
- avoids trying to run production on local SQLite files

Alternatives:

- Neon
- Supabase

## Why This Change Is Needed

Current state:

- the app uses SQLite in `prisma/dev.db`
- SQLite is fine locally
- SQLite is not a good production fit for Vercel serverless functions

Implication:

- local file storage is not a durable shared production database on Vercel
- production should use hosted Postgres instead

## Vercel Dashboard Setup Steps

1. Create a Vercel project from this repository.
2. In Vercel, open `Storage`.
3. Add a Postgres provider from the Vercel Marketplace.
4. Connect the database to the Vercel project so `DATABASE_URL` is injected.
5. Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, and `CRON_SECRET`.
6. Confirm the build command is `npm run vercel-build`.
7. Deploy production.
8. Confirm the Vercel Cron entry for `/api/cron/send-reminders`.
9. Test an end-to-end push notification from the deployed app.

## Important Migration Note

Do not reuse the current SQLite migration SQL files for Postgres.

Reason:

- the existing `prisma/migrations/` history was generated for SQLite
- Postgres needs a fresh initial migration based on the current schema

Completed code approach:

- switch Prisma to Postgres
- create a new initial migration for Postgres
- apply it to the hosted database with `prisma migrate deploy`

## Suggested Build Script Direction

Add scripts so Vercel runs production-safe Prisma commands.

Likely shape:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

## Cron Direction

Planned route:

- `/api/cron/send-reminders`

Planned behavior:

- find reminders scheduled for the current UTC calendar day
- match user global and race-specific reminder preferences
- send push notifications to eligible subscriptions
- record each send in `SentNotification`
- skip duplicates based on reminder/session/subscription identity

## Preview Environment Note

Safer setup:

- production database
- preview database

Reason:

- preview deployments should not run migrations against production

For a small project, production-only may be acceptable at first, but separate preview and production databases are the better setup.

## Repository Changes To Make Later

- verify Prisma connection handling on Vercel after env vars are configured
- test push sends end to end in production

## Current Constraint To Remember

The repo now has a production reminder scheduler route, but it still needs a deployed Vercel project, hosted Postgres, and production environment variables.

What exists now:

- preference storage
- push subscription storage
- test notification sending
- production reminder scan route

What still needs to be built:

- Vercel dashboard setup
- hosted Postgres provisioning
- end-to-end production verification
