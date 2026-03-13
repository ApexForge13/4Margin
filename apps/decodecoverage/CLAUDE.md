# DecodeCoverage — B2C Policy Decoder

## What This Is

Free homeowner-facing insurance policy decoder for lead generation. Homeowners upload their policy PDF, the AI analyzes it, and they get a plain-language breakdown of their coverage. No auth, no payments. Domain: decodecoverage.com. Brand: "Powered by 4Margin."

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: CSS custom properties (NOT Tailwind) + DM Sans / Fraunces fonts + lucide-react icons
- **Database**: Supabase — `consumer_leads` table (no RLS, service role key only)
- **Storage**: `consumer-policies` bucket in Supabase Storage
- **AI**: Claude API via @4margin/policy-engine shared package
- **PDF**: @4margin/pdf shared package for decoder report generation
- **Email**: Resend for results delivery

## Key Files

```
src/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── api/
│   │   ├── analyze/route.ts              # Main decode pipeline
│   │   └── upload/route.ts               # Policy PDF upload
│   └── results/[id]/page.tsx             # Results display page
├── components/
│   ├── scan-form/index.tsx               # 3-step upload form
│   └── results/results-display.tsx       # Results UI
└── lib/
    ├── supabase.ts                       # Supabase client
    └── email.ts                          # Resend email helpers
```

## Flow

1. Ad / organic → Landing page
2. 3-step form: upload policy PDF → enter email → submit
3. API uploads to Supabase Storage, calls `parsePolicyPdfV2()` from @4margin/policy-engine
4. Results stored in `consumer_leads` table
5. Results page displays analysis + option to download PDF / email results

## Commands

```bash
npm run dev    # Port 3001
npm run build
npm run start
```

## Code Style

- CSS custom properties for theming — NOT Tailwind
- lucide-react for icons — NOT heroicons or shadcn icons
- DM Sans for body text, Fraunces for headings
- Server Components by default
- All outputs are educational with disclaimers — never legal/insurance advice
