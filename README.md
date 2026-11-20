# RuralCare Connect

RuralCare Connect is an independent rural-care coordination demonstration. It uses synthetic data to demonstrate patient intake, Patient 360, task management, closed-loop referrals, chronic-care plans, simulated outreach, payment posting, audit history and practice analytics.

## Stack

- Next.js 15, React 19 and TypeScript
- Prisma 6 ORM
- Neon PostgreSQL for persistent hosted data
- Vercel for hosting

## Local setup (PowerShell)

1. Install Node.js 20 or later and run `npm install`.
2. Copy `.env.example` to `.env.local` and replace both placeholder connection strings with your Neon connection details.
3. Generate Prisma Client and create the tables:

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The app loads its records from PostgreSQL. If the database is empty, the first bootstrap request inserts the synthetic starter dataset automatically.

## Database configuration

`DATABASE_URL` is the pooled Neon connection string used by the Next.js server at runtime. `DIRECT_URL` is the direct Neon connection used by Prisma schema operations at build time. Do not commit either value, and do not paste database secrets into source files or issue comments.

The Vercel build command is `npm run build`. The build generates Prisma Client, applies non-destructive schema updates with `prisma db push`, and then builds Next.js. Configure both environment variables in Vercel for Preview and Production before deploying.

Useful commands:

```powershell
npm run lint       # TypeScript type-check
npm run db:push    # apply the Prisma schema to the configured database
npm run db:seed    # seed only when the database is empty
npm run db:reset   # LOCAL DEMO ONLY: recreate tables and seed synthetic data
npm run build      # production build (requires database environment variables)
```

## Functional demo workflows

Patient intake and edits, care-team task creation/status updates, referral creation/status transitions, chronic-care plan management, simulated communications, and financial transactions are stored in PostgreSQL. Posted simulated payments reduce the patient balance; reversing or deleting a posted payment restores the amount. Create/update/delete operations write audit events.

The Reset demo data action restores the synthetic starter dataset and replaces records in the connected demo database. Use that action only in this prototype environment.

## Scope and safety

All clinical records, identifiers, outreach and financial activity are synthetic. No external messaging, claims, EHR or referral systems are connected. This is not a production EHR, medical device, clinical decision-support system or HIPAA-certified service. Do not enter real patient information or use it for actual care or payment processing. RuralCare Connect is independent and is not affiliated with or endorsed by athenahealth.
