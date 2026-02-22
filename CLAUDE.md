# 4Margin — Insurance Supplement Engine

## What This Is

AI-powered insurance supplement engine for roofing contractors. Parses adjuster Xactimate PDF estimates, identifies missing/underpaid line items, calculates correct waste percentages using roof geometry, analyzes inspection photos via Vision AI, and generates professional carrier-ready supplement documents — in under 10 minutes instead of 2-4 hours manually or $425-1,500 outsourced.

## Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui component library
- **Database**: Supabase PostgreSQL (multi-tenant with Row-Level Security)
- **Auth**: Supabase Auth (magic link + email/password)
- **File Storage**: Supabase Storage (PDFs, inspection photos, generated supplements)
- **AI**: Claude API — Sonnet for PDF parsing, missing item detection, supplement generation; Vision for photo analysis
- **PDF Processing**: pdf-parse (extraction), React-PDF / Puppeteer (generation)
- **Hosting**: Vercel (edge functions, auto-deploy from GitHub)
- **Payments**: Stripe (subscriptions + per-supplement metered billing)
- **Email**: Resend (carrier supplement submission, status notifications)
- **SMS**: Twilio (status notifications to contractors)
- **Queue/Cache**: Upstash Redis + QStash (background jobs, follow-up scheduling)
- **Analytics**: PostHog (product analytics), Sentry (error tracking)

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth pages (login, register)
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── supplements/    # Supplement list, detail, generation
│   │   ├── upload/         # Estimate upload + photo upload flow
│   │   ├── history/        # Supplement history + status tracking
│   │   └── settings/       # Company info, branding, billing
│   ├── api/                # API routes
│   │   ├── parse/          # PDF parsing pipeline
│   │   ├── analyze/        # Missing item detection + waste calc
│   │   ├── generate/       # Supplement document generation
│   │   ├── vision/         # Photo analysis via Claude Vision
│   │   ├── webhooks/       # Stripe, Twilio webhooks
│   │   └── carriers/       # Carrier submission + tracking
│   └── layout.tsx
├── components/             # Shared UI components (shadcn/ui based)
├── lib/                    # Core business logic
│   ├── ai/                 # Claude API integration + prompts
│   ├── parser/             # PDF text extraction + structuring
│   ├── detection/          # Missing item rules engine
│   ├── waste/              # Geometry-based waste calculator
│   ├── generator/          # Supplement PDF document builder
│   ├── carriers/           # Carrier database + submission logic
│   ├── supabase/           # Supabase client + helpers
│   └── stripe/             # Stripe billing helpers
├── types/                  # TypeScript type definitions
└── data/                   # Static data
    ├── xactimate-codes.ts  # Curated Xactimate code database (200+ items)
    ├── carriers.ts         # Carrier claims dept contacts
    └── irc-codes.ts        # Building code references by jurisdiction
```

### Database Schema (Supabase PostgreSQL)

Key tables:
- `users` — contractor accounts (multi-tenant)
- `companies` — company info, branding, preferences
- `claims` — insurance claims (property address, carrier, claim #, date of loss)
- `estimates` — parsed adjuster scopes (line items as JSONB)
- `supplements` — generated supplement documents + status tracking
- `line_items` — individual Xactimate line items (detected missing items)
- `carrier_patterns` — approval/rejection data per carrier per item (THE DATA MOAT)
- `photos` — inspection photos with Vision AI analysis results

### Core Pipeline

1. **Upload**: Contractor uploads adjuster PDF + inspection photos + roof measurements
2. **Parse**: pdf-parse extracts text → Claude Sonnet structures into JSON line items
3. **Detect**: Rules engine (200+ items) + Claude contextual analysis flags missing items
4. **Calculate**: Geometry engine computes correct waste % from roof measurements
5. **Analyze Photos**: Claude Vision identifies damage, materials, components in photos
6. **Review**: Contractor accepts/rejects/modifies each flagged item in dashboard
7. **Generate**: Professional supplement PDF with Xactimate codes, justifications, photo refs, IRC codes
8. **Submit**: Email supplement directly to carrier claims department

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run start        # Start production server
```

## Key Domain Concepts

- **Xactimate**: Industry-standard insurance estimating software (owned by Verisk). Uses proprietary line item codes (e.g., RFG STRSA = starter strip shingles)
- **Supplement**: Additional documentation submitted to insurance carrier requesting payment for items missed or underpaid in the original adjuster scope
- **O&P (Overhead & Profit)**: 10% overhead + 10% profit markup — denied 85% of the time on first submission, recoverable with proper documentation
- **Waste %**: Material waste from cuts on complex roofs. Adjusters use generic 10-15%; actual waste on hip/valley roofs is 18-25%. This alone recovers $200-800 per job
- **ESX files**: Xactimate's proprietary file format (ZIP-compressed XML) — Phase 2 feature
- **Carrier patterns**: Which items each insurance carrier approves/denies, by region and adjuster — this data is the competitive moat

## Code Style

- TypeScript strict mode
- Server Components by default, Client Components only when needed (interactivity)
- Server Actions for mutations
- Tailwind CSS for styling, shadcn/ui for component primitives
- Descriptive variable names over comments
- Colocate related files (component + types + utils in same directory when practical)
