# RuralCare Connect

RuralCare Connect is an independent healthcare workflow demonstration prototype for rural primary care. It uses synthetic data to show how patient prioritization, care-team work queues, closed-loop referrals, chronic care follow-up, low-bandwidth outreach, financial health and analytics can share one operational workspace.

## Run locally

```bash
npm install
npm run dev
```

Create the local database and seed synthetic data before starting the app:

```bash
copy .env.example .env       # PowerShell: Copy-Item .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The app retrieves patients, tasks, referrals, care plans, communications, transactions and audit events from the database. Task completion, referral transitions, patient registration, care-plan creation, simulated outreach and simulated payments are persisted through server APIs.

Useful database commands:

```bash
npm run db:reset              # recreate the local database and reseed demo data
npm run build                 # production compilation and type validation
```

## Persistence and deployment

The local default is SQLite through Prisma. For a hosted free-tier deployment, provision a managed PostgreSQL database such as Neon or Supabase, change the Prisma datasource provider to `postgresql`, set `DATABASE_URL` in the hosting environment, run `prisma migrate deploy` (or `prisma db push` for a prototype), then run the seed command once. Do not commit `.env` or database files. Vercel can host the Next.js application, but a hosted database is required because serverless filesystems are ephemeral.

The current workspace is not connected to a GitHub remote and does not have GitHub CLI authentication, so publishing requires the repository URL and authenticated Git credentials.

## Scope and limitations

All workflows, integrations, communications, clinical observations and financial activity are simulated. This is not a production EHR, medical device, clinical decision-support system or HIPAA certification. It is not affiliated with or endorsed by athenahealth and does not use proprietary assets or patient data.
