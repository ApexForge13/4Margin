# 4Margin — Monorepo

## What This Is

Turborepo monorepo containing two Next.js apps and two shared packages for AI-powered insurance and roofing contractor tools.

## Structure

```
4Margin/
├── apps/
│   ├── contractor/           # B2B supplement engine (port 3000)
│   │   └── Next.js 15 + Tailwind + shadcn/ui
│   └── decodecoverage/       # B2C policy decoder (port 3001)
│       └── Next.js 16 + CSS custom properties + DM Sans/Fraunces
├── packages/
│   ├── policy-engine/        # @4margin/policy-engine — AI parser + knowledge base
│   └── pdf/                  # @4margin/pdf — PDF generation
├── turbo.json
├── package.json              # root workspace (npm workspaces)
└── start-dev.js
```

## Commands

```bash
turbo dev                                    # Run both apps
turbo dev --filter=@4margin/contractor       # Contractor only (port 3000)
turbo dev --filter=@4margin/decodecoverage   # DecodeCoverage only (port 3001)
turbo build                                  # Build all
```

## Shared Packages

Packages use direct TS imports (no build step). Each has `"main": "./src/index.ts"`.

- **@4margin/policy-engine** — `parsePolicyPdfV2()` returns `PolicyAnalysis`. Exports knowledge base (LANDMINE_RULES, FAVORABLE_PROVISIONS, CARRIER_PROFILES), carrier context builders, and `withRetry` utility.
- **@4margin/pdf** — `generateDecoderPdf(data: DecoderPdfData): ArrayBuffer` for B2C decoder PDF output.

## Database

Single Supabase project shared by both apps. Multi-tenant via `company_id` on all contractor tables. Consumer tables (`consumer_leads`) have no RLS (service role key only).

Migrations: `apps/contractor/supabase/migrations/` — currently at `038_claim_intake_questions.sql`.

## Key Conventions

- TypeScript strict mode everywhere
- Server Components by default, Client Components only for interactivity
- Contractor app: Tailwind + shadcn/ui
- DecodeCoverage app: CSS custom properties + lucide-react (NOT Tailwind)
- All carrier-facing outputs: code authority + industry manufacturer standards only, NEVER policy language
- All outputs: educational framing with disclaimers, never legal/insurance advice
- Multi-tenant: every query must filter by company_id, every table must have RLS

## Environment Variables

Both apps need: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`
Contractor also needs: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `VISUAL_CROSSING_API_KEY`, `QSTASH_TOKEN`
DecodeCoverage also needs: `RESEND_API_KEY`
