"""
4Margin Comprehensive Project Audit — PDF Generator
Generates a printable audit document with light background.
Run: py scripts/generate-audit-pdf.py
Output: Desktop/4Margin-Audit-2026-03-11.pdf
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether,
)
from reportlab.platypus.flowables import Flowable
from datetime import datetime
import os

# ── Colors ──────────────────────────────────────────────────
BRAND_BLUE = HexColor("#1e3a5f")
BRAND_LIGHT = HexColor("#e8f0fe")
ACCENT_BLUE = HexColor("#2563eb")
ACCENT_GREEN = HexColor("#16a34a")
ACCENT_RED = HexColor("#dc2626")
ACCENT_AMBER = HexColor("#d97706")
GRAY_700 = HexColor("#374151")
GRAY_500 = HexColor("#6b7280")
GRAY_300 = HexColor("#d1d5db")
GRAY_100 = HexColor("#f3f4f6")
WHITE = HexColor("#ffffff")
BG_CREAM = HexColor("#faf8f5")

# ── Page background ─────────────────────────────────────────
def draw_background(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG_CREAM)
    canvas.rect(0, 0, letter[0], letter[1], fill=1, stroke=0)
    # Footer
    canvas.setFillColor(GRAY_500)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(
        72, 30,
        f"4Margin Project Audit — Generated {datetime.now().strftime('%B %d, %Y')}"
    )
    canvas.drawRightString(letter[0] - 72, 30, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


# ── Styles ──────────────────────────────────────────────────
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    "AuditTitle", parent=styles["Title"],
    fontSize=26, leading=32, textColor=BRAND_BLUE,
    spaceAfter=4, alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    "AuditSubtitle", parent=styles["Normal"],
    fontSize=12, leading=16, textColor=GRAY_500,
    spaceAfter=24, alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    "H1", parent=styles["Heading1"],
    fontSize=18, leading=24, textColor=BRAND_BLUE,
    spaceBefore=20, spaceAfter=10,
    borderWidth=0, borderPadding=0,
))
styles.add(ParagraphStyle(
    "H2", parent=styles["Heading2"],
    fontSize=14, leading=18, textColor=HexColor("#1e40af"),
    spaceBefore=14, spaceAfter=6,
))
styles.add(ParagraphStyle(
    "H3", parent=styles["Heading3"],
    fontSize=11, leading=15, textColor=GRAY_700,
    spaceBefore=10, spaceAfter=4,
))
styles.add(ParagraphStyle(
    "Body", parent=styles["Normal"],
    fontSize=9.5, leading=13, textColor=GRAY_700,
    spaceAfter=6, alignment=TA_JUSTIFY,
))
styles.add(ParagraphStyle(
    "BodyBold", parent=styles["Normal"],
    fontSize=9.5, leading=13, textColor=GRAY_700,
    spaceAfter=6, fontName="Helvetica-Bold",
))
styles.add(ParagraphStyle(
    "AuditBullet", parent=styles["Normal"],
    fontSize=9.5, leading=13, textColor=GRAY_700,
    spaceAfter=3, leftIndent=18, bulletIndent=6,
    bulletFontName="Helvetica", bulletFontSize=9,
))
styles.add(ParagraphStyle(
    "BulletSub", parent=styles["Normal"],
    fontSize=9, leading=12, textColor=GRAY_500,
    spaceAfter=2, leftIndent=36, bulletIndent=24,
    bulletFontName="Helvetica", bulletFontSize=8,
))
styles.add(ParagraphStyle(
    "CodeBlock", parent=styles["Normal"],
    fontSize=8.5, leading=11, textColor=GRAY_700,
    fontName="Courier", backColor=GRAY_100,
    leftIndent=12, rightIndent=12,
    spaceBefore=4, spaceAfter=4,
    borderWidth=0.5, borderColor=GRAY_300,
    borderPadding=6,
))
styles.add(ParagraphStyle(
    "Alert", parent=styles["Normal"],
    fontSize=9.5, leading=13, textColor=ACCENT_RED,
    spaceAfter=6, fontName="Helvetica-Bold",
    leftIndent=6,
))
styles.add(ParagraphStyle(
    "AlertAmber", parent=styles["Normal"],
    fontSize=9.5, leading=13, textColor=ACCENT_AMBER,
    spaceAfter=6, fontName="Helvetica-Bold",
    leftIndent=6,
))
styles.add(ParagraphStyle(
    "Good", parent=styles["Normal"],
    fontSize=9.5, leading=13, textColor=ACCENT_GREEN,
    spaceAfter=6, fontName="Helvetica-Bold",
    leftIndent=6,
))
styles.add(ParagraphStyle(
    "TableCell", parent=styles["Normal"],
    fontSize=8.5, leading=11, textColor=GRAY_700,
))
styles.add(ParagraphStyle(
    "TableHeader", parent=styles["Normal"],
    fontSize=8.5, leading=11, textColor=WHITE,
    fontName="Helvetica-Bold",
))

# ── Helpers ─────────────────────────────────────────────────
def hr():
    return HRFlowable(width="100%", thickness=0.5, color=GRAY_300,
                       spaceBefore=8, spaceAfter=8)

def section_header(title):
    return Paragraph(title, styles["H1"])

def sub_header(title):
    return Paragraph(title, styles["H2"])

def sub3(title):
    return Paragraph(title, styles["H3"])

def body(text):
    return Paragraph(text, styles["Body"])

def bold(text):
    return Paragraph(text, styles["BodyBold"])

def bullet(text):
    return Paragraph(f"<bullet>&bull;</bullet> {text}", styles["AuditBullet"])

def bullet_sub(text):
    return Paragraph(f"<bullet>-</bullet> {text}", styles["BulletSub"])

def alert(text):
    return Paragraph(f"&#x26A0; {text}", styles["Alert"])

def amber(text):
    return Paragraph(f"&#x26A0; {text}", styles["AlertAmber"])

def good(text):
    return Paragraph(f"&#x2713; {text}", styles["Good"])

def make_table(headers, rows, col_widths=None):
    """Create a styled table with header row."""
    data = [[Paragraph(h, styles["TableHeader"]) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), styles["TableCell"]) for c in row])

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("BACKGROUND", (0, 1), (-1, -1), WHITE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("TOPPADDING", (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, GRAY_300),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


# ══════════════════════════════════════════════════════════════
#  BUILD THE DOCUMENT
# ══════════════════════════════════════════════════════════════
output_path = os.path.join(
    os.path.expanduser("~"), "OneDrive", "Desktop",
    "4Margin-Audit-2026-03-11.pdf"
)

doc = SimpleDocTemplate(
    output_path,
    pagesize=letter,
    leftMargin=60, rightMargin=60,
    topMargin=50, bottomMargin=50,
)

story = []

# ── COVER PAGE ──────────────────────────────────────────────
story.append(Spacer(1, 120))
story.append(Paragraph("4Margin", styles["AuditTitle"]))
story.append(Paragraph("Comprehensive Project Audit", ParagraphStyle(
    "CoverSub", parent=styles["AuditTitle"], fontSize=18, leading=24,
    spaceAfter=12,
)))
story.append(Paragraph(
    "Full-Stack Inventory &bull; Knowledge Base Review &bull; Inconsistency Report &bull; Launch Readiness",
    styles["AuditSubtitle"],
))
story.append(Spacer(1, 40))
story.append(Paragraph(
    f"Generated: {datetime.now().strftime('%B %d, %Y')}",
    ParagraphStyle("CoverDate", parent=styles["AuditSubtitle"],
                   fontSize=10, spaceAfter=4),
))
story.append(Paragraph(
    "Document Version: 1.0 &bull; Session: Field Review Follow-Up",
    ParagraphStyle("CoverVer", parent=styles["AuditSubtitle"],
                   fontSize=9, spaceAfter=0),
))
story.append(Spacer(1, 80))

# Summary stats box
summary_data = [
    ["METRIC", "COUNT"],
    ["Database Migrations", "38"],
    ["API Routes (total)", "38 (22 contractor + 16 DC)"],
    ["Server Actions", "31 functions"],
    ["Dashboard Pages", "13"],
    ["Knowledge Base Items", "~1,330"],
    ["Test Files / Tests", "16 files / 449+ tests"],
    ["PDF Generators", "10 files"],
    ["Supabase Tables", "~25 tables"],
    ["Building Codes", "29 IRC entries"],
    ["Counties Covered", "43 (MD/PA/DE)"],
    ["Manufacturers", "6 (48 requirements)"],
    ["Carrier Profiles", "13 carriers"],
]
t = Table(summary_data, colWidths=[220, 260])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, 0), 9),
    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
    ("TOPPADDING", (0, 0), (-1, 0), 8),
    ("BACKGROUND", (0, 1), (-1, -1), WHITE),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_100]),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 1), (-1, -1), 9),
    ("TOPPADDING", (0, 1), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("GRID", (0, 0), (-1, -1), 0.5, GRAY_300),
    ("ALIGN", (1, 0), (1, -1), "CENTER"),
]))
story.append(t)
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  TABLE OF CONTENTS
# ══════════════════════════════════════════════════════════════
story.append(Paragraph("Table of Contents", styles["AuditTitle"]))
story.append(Spacer(1, 12))
toc_items = [
    "1. Executive Summary",
    "2. Project Timeline & Key Milestones",
    "3. Current Feature Inventory",
    "4. Database Schema — All 38 Migrations",
    "5. API Routes & Server Actions",
    "6. Knowledge Base Complete Inventory",
    "7. AI Pipeline & Confidence Scoring",
    "8. Pricing, Billing & Stripe Configuration",
    "9. Test Coverage Report",
    "10. DecodeCoverage (B2C) App",
    "11. Known Inconsistencies & Data Gaps",
    "12. Launch Readiness Checklist",
    "13. Competitive Moats & Defensibility",
    "14. Value Proposition by Customer Segment",
    "15. Pricing Strategy & Unit Economics",
    "16. Revenue Forecasting",
    "17. Sales & Outreach Strategy",
    "18. Lead Generation Engine",
    "19. Recommended Next Steps",
]
for item in toc_items:
    story.append(Paragraph(item, ParagraphStyle(
        "TOC", parent=styles["Body"], fontSize=11, leading=18,
        leftIndent=30, textColor=BRAND_BLUE,
    )))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  1. EXECUTIVE SUMMARY
# ══════════════════════════════════════════════════════════════
story.append(section_header("1. Executive Summary"))
story.append(hr())
story.append(body(
    "4Margin is an AI-powered insurance supplement engine for roofing contractors operating in MD, PA, and DE. "
    "The platform parses adjuster Xactimate PDF estimates, identifies missing or underpaid line items, calculates "
    "correct waste percentages using roof geometry, analyzes inspection photos via Claude Vision AI, and generates "
    "professional carrier-ready supplement documents."
))
story.append(body(
    "The monorepo contains two applications and two shared packages: the <b>contractor app</b> (B2B SaaS at 4margin.com) "
    "and <b>DecodeCoverage</b> (B2C free policy decoder at decodecoverage.com), plus <b>@4margin/policy-engine</b> "
    "(AI parser + knowledge base) and <b>@4margin/pdf</b> (PDF generation)."
))
story.append(Spacer(1, 6))
story.append(sub_header("Current State Assessment"))
story.append(good("Policy Decoder — Fully functional, payment flow works, PDF generation complete"))
story.append(good("Knowledge Base — 29 building codes, 43 counties, 6 manufacturers, 13 carrier profiles"))
story.append(good("Enterprise System — Multi-office, usage tracking, tiered billing, RLS"))
story.append(good("Test Coverage — 449+ tests across 16 files, all passing"))
story.append(amber("Supplement Pipeline — Returns 0 items (suspected Vercel Fluid Compute timeout)"))
story.append(amber("Pricing Constants — Inconsistencies between code and landing page"))
story.append(amber("Migrations 034-038 — Not yet applied to production Supabase"))
story.append(alert("JUSTIFICATION_MATRIX — Only 6 Xactimate codes mapped, needs expansion"))
story.append(alert("Legacy manufacturer lookup — GAF+CT only function still exists alongside all-6 version"))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  2. PROJECT TIMELINE
# ══════════════════════════════════════════════════════════════
story.append(section_header("2. Project Timeline & Key Milestones"))
story.append(hr())

timeline = [
    ["Phase", "Date", "Key Deliverables"],
    ["Initial Build", "Jan 2026", "Core schema, auth, dashboard, claim wizard, PDF upload, multi-tenant RLS"],
    ["Supplement Engine v1", "Feb 2026", "AI pipeline, Claude parsing, missing item detection, basic PDF generation"],
    ["Stripe Integration", "Feb 2026", "$149/supplement, first-free trial, checkout flow, webhook handling"],
    ["Policy Decoder", "Feb 2026", "Standalone $50 product, Claude policy parsing, risk scoring, PDF report"],
    ["DecodeCoverage Launch", "Feb 26", "B2C app, landing page, 3-step form, email sequences, weather alerts"],
    ["Enterprise System", "Feb 2026", "Multi-office, tiered usage, metered billing, admin controls"],
    ["Supplement v2 Phase 1", "Mar 2026", "8-col Xactimate table, cover letter, O&P/waste/IWS calcs, branding"],
    ["Intelligence Engine", "Mar 2026", "5-dim confidence scorer, outcome tracking schema (migration 034)"],
    ["Code Engine Expansion", "Mar 8", "24 IRC codes, 43 counties, 6 manufacturers (48 reqs), modular arch"],
    ["KB Field Review", "Mar 11", "Corrected I/W barriers, permits, rebuttals, waste factor, warranty language"],
    ["Session Today", "Mar 11", "Pre-inspection moved to decoder, 3 intake questions, 5 new gutter/siding codes"],
]
story.append(make_table(
    timeline[0], timeline[1:],
    col_widths=[120, 60, 310]
))
story.append(Spacer(1, 10))
story.append(body(
    "<b>Notable pivots:</b> Supplement engine was originally the primary product. After the pipeline bug "
    "(0 items returned), focus shifted to Policy Decoder as the lead product for launch. Supplements are "
    "now hidden in the contractor app pending the Xactimate data + top 25 denials document (~72h from Mar 11)."
))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  3. CURRENT FEATURE INVENTORY
# ══════════════════════════════════════════════════════════════
story.append(section_header("3. Current Feature Inventory"))
story.append(hr())

story.append(sub_header("3.1 Dashboard Pages (13 total)"))
pages_data = [
    ["/dashboard", "Main dashboard — claim list, status overview, quick actions"],
    ["/dashboard/upload", "4-step claim wizard: estimate upload, photos, measurements, review"],
    ["/dashboard/supplements", "Supplement list with status badges (draft/generating/complete/approved/denied)"],
    ["/dashboard/supplements/[id]", "Supplement detail — line items, justifications, download, rebuttal, advocacy"],
    ["/dashboard/policy-decoder", "Policy decoder list — all decoded policies"],
    ["/dashboard/policy-decoder/new", "New policy decode — upload policy PDF + enter claim context"],
    ["/dashboard/policy-decoder/[id]", "Decoder results — risk score, coverages, landmines, pre-inspection prep"],
    ["/dashboard/policy-checks", "Policy checks list ($29 product) — contractor-initiated for homeowners"],
    ["/dashboard/policy-checks/[id]", "Policy check detail — results + homeowner email delivery"],
    ["/dashboard/enterprise", "Enterprise admin — offices, usage, domains, user management"],
    ["/dashboard/settings", "Company settings — profile, branding, logo, billing"],
    ["/dashboard/admin", "Super-admin — carrier/code management, DB explorer, user admin"],
    ["/dashboard/knowledge-base", "KB browser — building codes, counties, manufacturer requirements"],
]
story.append(make_table(
    ["Route", "Description"],
    pages_data,
    col_widths=[160, 330]
))

story.append(Spacer(1, 10))
story.append(sub_header("3.2 Claim Creation Wizard (4 Steps)"))
story.append(bold("Step 1 — Estimate Upload & Claim Details"))
story.append(bullet("Upload adjuster Xactimate PDF estimate (required)"))
story.append(bullet("Upload insurance policy PDF (optional)"))
story.append(bullet("Auto-parse: Claude extracts claim #, carrier, property address, line items"))
story.append(bullet("Manual fields: claim description, date of loss, adjuster info"))
story.append(bullet("Claim overview: adjuster scope notes, items believed missing, prior supplement history"))
story.append(bullet("<b>NEW (Mar 11):</b> Property condition intake questions:"))
story.append(bullet_sub("Are gutters nailed through drip edge? (Yes/No/Not sure)"))
story.append(bullet_sub("Is current roof under manufacturer warranty? (Yes/No/Unknown)"))
story.append(bullet_sub("Pre-existing conditions (free text)"))

story.append(bold("Step 2 — Inspection Photos"))
story.append(bullet("Upload inspection photos with optional annotations"))
story.append(bullet("Claude Vision AI analyzes damage, materials, components"))

story.append(bold("Step 3 — Measurements"))
story.append(bullet("Upload EagleView or similar roof measurement report"))
story.append(bullet("Auto-parse roof geometry: ridges, hips, valleys, rakes, eaves, drip edge"))
story.append(bullet("Pitch breakdown table, penetration areas, structure complexity"))

story.append(bold("Step 4 — Review & Submit"))
story.append(bullet("Name the claim, review all data, submit"))
story.append(bullet("Creates claim + supplement records, triggers pipeline"))

story.append(Spacer(1, 10))
story.append(sub_header("3.3 Policy Decoder"))
story.append(bullet("Upload insurance policy PDF + optional claim context"))
story.append(bullet("Claude AI extracts: policy type (HO-3/5/6), coverages, deductibles, endorsements"))
story.append(bullet("Risk scoring: identifies landmines (cosmetic exclusions, ACV, matching limits)"))
story.append(bullet("Favorable provisions: matching, code upgrade, O&P, recoverable depreciation"))
story.append(bullet("Carrier-specific endorsement matching (47 known forms across 13 carriers)"))
story.append(bullet("Downloadable PDF report with color-coded risk indicators"))
story.append(bullet("<b>NEW (Mar 11):</b> Pre-Inspection Prep — AI-generated talking points:"))
story.append(bullet_sub("Contractor sections: coverage summary, documentation checklist, carrier tactics, landmines, code requirements"))
story.append(bullet_sub("Homeowner guide: what to expect, rights during inspection, questions for adjuster"))
story.append(bullet_sub("PDF download for homeowner handout"))

story.append(Spacer(1, 10))
story.append(sub_header("3.4 Supplement Engine (10-Layer Pipeline)"))
story.append(body("The supplement pipeline runs as a background job via Upstash QStash:"))
layers_data = [
    ["1", "Estimate Download", "Fetch adjuster PDF from Supabase storage"],
    ["2", "Estimate Analyzer", "Claude parses line items, quantities, prices from PDF"],
    ["3", "Policy Decoder", "Parse policy context — coverages, exclusions, endorsements"],
    ["4", "Code Engine", "Match jurisdiction-specific IRC code requirements"],
    ["5", "Waste Calculator", "Geometry-based waste % using hip/valley/flat slope math"],
    ["6", "Manufacturer Library", "Match manufacturer installation requirements to Xactimate codes"],
    ["7", "O&P Calculator", "Multi-trade overhead & profit validation (runs at finalization)"],
    ["8", "Generator", "Missing item detection via Claude with full KB context injection"],
    ["9", "Rebuttal Engine", "Carrier-specific rebuttal language embedded in prompt"],
    ["10", "Document Assembly", "PDF generation at finalization (supplement + cover letter + evidence)"],
]
story.append(make_table(
    ["#", "Layer", "Function"],
    layers_data,
    col_widths=[25, 120, 345]
))
story.append(Spacer(1, 4))
story.append(alert("PIPELINE BUG: Currently returns 0 items. Suspected cause: Vercel Fluid Compute may be OFF, "
                    "capping serverless functions at 60s. Pipeline needs 2-3 minutes for full analysis."))

story.append(Spacer(1, 10))
story.append(sub_header("3.5 Additional Features"))
story.append(bullet("<b>Enterprise System:</b> Multi-office support, usage tracking, tiered billing, email domain auto-assignment, admin dashboard"))
story.append(bullet("<b>Weather Verification:</b> Visual Crossing API — fetches storm data by date/location, generates weather report PDF"))
story.append(bullet("<b>Rebuttal Generator:</b> AI-powered carrier-specific denial rebuttals with IRC code citations"))
story.append(bullet("<b>Advocacy Scripts:</b> Post-denial talking points for contractor coaching"))
story.append(bullet("<b>Policy Checks:</b> $29 contractor-initiated policy analysis emailed to homeowner (lead gen)"))
story.append(bullet("<b>Knowledge Base Browser:</b> Interactive UI for browsing/editing building codes, counties, manufacturer requirements"))
story.append(bullet("<b>Admin Panel:</b> Super-admin with carrier management, Xactimate code editor, DB explorer, user management"))
story.append(bullet("<b>Team Invites:</b> Email-based team member invitations with role assignment"))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  4. DATABASE SCHEMA
# ══════════════════════════════════════════════════════════════
story.append(section_header("4. Database Schema — All 38 Migrations"))
story.append(hr())
story.append(body(
    "Supabase PostgreSQL with Row-Level Security (RLS) on all tenant-scoped tables. "
    "All data segregated by <b>company_id</b>. Enterprise accounts use additional "
    "<b>office_id</b> scoping."
))
story.append(Spacer(1, 6))

migrations = [
    ["001", "Core multi-tenant schema: companies, users, claims, estimates, supplements, line_items, roles"],
    ["002", "Supabase Storage buckets: adjuster-estimates, inspection-photos"],
    ["003", "RLS policies for onboarding flow"],
    ["004", "Policy and measurement storage buckets + bucket policies"],
    ["005", "EagleView-specific measurement columns (roof geometry)"],
    ["006", "Archive soft-delete functionality and admin role refinements"],
    ["007", "Supplement status enum: draft, generating, complete, approved, partially_approved, denied"],
    ["008", "Stripe subscription and payment tracking columns"],
    ["009", "Claims description field for adjuster notes"],
    ["010", "Overview/summary columns for claim display"],
    ["011", "Weather verification and storm report tables"],
    ["012", "User role refinements (owner, admin, member)"],
    ["013", "Extended roof measurements: pitch, valleys, hips, squares breakdown"],
    ["014", "Team member invitations with expiry"],
    ["015", "Steep pitch and high-story roof adjustment columns"],
    ["016", "Temporary bucket for intermediate parsing results"],
    ["017", "Storage bucket for generated supplement PDFs"],
    ["018", "Draft supplement status (payment pending before generation)"],
    ["019", "Policy analysis JSONB column for parsed policy data"],
    ["020", "Policy Decodings table — standalone $50 decoder product"],
    ["021", "Policy-to-claim context linking"],
    ["022", "Consumer leads table for DecodeCoverage B2C app"],
    ["023", "Consent/certification tracking for compliance"],
    ["024", "IRC code verification and validation columns on line items"],
    ["025", "Policy PDF URL storage on claims"],
    ["026", "Switching interest tracking for lead qualification"],
    ["027", "Policy checks table — $29 contractor-initiated analysis"],
    ["028", "Funnel tracking for lead generation metrics"],
    ["029", "Consumer leads schema consolidation"],
    ["030", "File hash tracking to prevent duplicate policy uploads"],
    ["031", "Enterprise account types with tiered usage limits"],
    ["032", "Enterprise-specific RLS policies"],
    ["033", "exec_sql database admin function"],
    ["034", "Intelligence engine: outcome tracking, confidence scoring, carrier patterns"],
    ["035", "Knowledge base tables: IRC codes, manufacturer reqs, county building codes"],
    ["036", "Supplement messages: rebuttal and message history"],
    ["037", "Rebuttal generation support tables"],
    ["038", "Claim intake questions: gutters_nailed_through_drip_edge, roof_under_warranty, pre_existing_conditions"],
]
story.append(make_table(
    ["#", "Purpose"],
    migrations,
    col_widths=[30, 460]
))
story.append(Spacer(1, 8))
story.append(alert("Migrations 034-038 have NOT been applied to production Supabase yet."))
story.append(body(
    "Migration 034 (intelligence engine) was created during the confidence scorer work. "
    "Migrations 035-037 (KB tables, supplement messages, rebuttal support) were created during "
    "code engine expansion. Migration 038 (intake questions) was created today. All need to be "
    "applied before their dependent features will work in production."
))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  5. API ROUTES & SERVER ACTIONS
# ══════════════════════════════════════════════════════════════
story.append(section_header("5. API Routes & Server Actions"))
story.append(hr())

story.append(sub_header("5.1 Contractor App API Routes (22)"))
api_routes = [
    ["/api/parse/estimate", "POST", "Parse adjuster Xactimate PDF"],
    ["/api/parse/measurement", "POST", "Parse roof measurement report"],
    ["/api/parse/policy", "POST", "Parse insurance policy (with claim)"],
    ["/api/parse/policy-standalone", "POST", "Parse policy without claim context"],
    ["/api/stripe/checkout", "POST", "Stripe checkout ($149 supplement)"],
    ["/api/stripe/policy-checkout", "POST", "Stripe checkout ($50 decode)"],
    ["/api/stripe/policy-check-checkout", "POST", "Stripe checkout ($29 check)"],
    ["/api/stripe/billing-portal", "POST", "Stripe billing portal link"],
    ["/api/stripe/webhook", "POST", "Stripe webhook handler"],
    ["/api/supplements/[id]/generate", "POST", "Trigger supplement pipeline"],
    ["/api/supplements/[id]/finalize", "POST", "Finalize + persist results"],
    ["/api/supplements/[id]/download", "GET", "Download supplement PDF"],
    ["/api/supplements/[id]/weather-download", "GET", "Download weather report"],
    ["/api/supplements/[id]/chat", "POST", "Chat for supplement edits"],
    ["/api/supplements/[id]/rebuttal", "POST", "Generate rebuttal doc"],
    ["/api/supplements/[id]/rebuttal/ai", "POST", "AI-powered rebuttal"],
    ["/api/supplements/[id]/advocacy", "POST", "Advocacy PDF generation"],
    ["/api/policy-decoder/[id]/download", "GET", "Download decoder PDF"],
    ["/api/policy-decoder/[id]/pre-inspection", "POST", "Pre-inspection script (NEW)"],
    ["/api/coverage-request", "POST", "Coverage request to adjuster"],
    ["/api/geocode", "POST", "Geocode property address"],
    ["/api/webhooks/qstash/pipeline", "POST", "QStash background pipeline"],
]
story.append(make_table(
    ["Route", "Method", "Purpose"],
    api_routes,
    col_widths=[195, 35, 260]
))

story.append(Spacer(1, 10))
story.append(sub_header("5.2 Server Actions (31 functions, 12 files)"))
action_groups = [
    ["dashboard/actions.ts", "updateClaim, archiveClaim, restoreClaim, resultSupplement"],
    ["dashboard/admin/actions.ts", "createCode, updateCode, deleteCode, createCarrier, updateCarrier, deleteCarrier, adminUpdateUser, adminUpdateClaim, deleteClaim, inviteTeamMember"],
    ["dashboard/upload/actions.ts", "createClaimAndSupplement"],
    ["dashboard/enterprise/actions.ts", "createOffice, updateOffice, deleteOffice, updateUserRole, assignUserOffice, addDomain, removeDomain, getUsageData, exportUsageCsv"],
    ["dashboard/policy-checks/actions.ts", "createPolicyCheck, getPolicyChecks, getPolicyCheck, resendCheckEmail, setCheckOutcome"],
    ["dashboard/policy-decoder/actions.ts", "createDraftDecoding, createPolicyDecoding, uploadPolicyFile, unlockFreeDecoding, getPolicyDecodings, getPolicyDecoding, getPaidDecodingCount, checkPaymentStatus"],
    ["dashboard/settings/actions.ts", "updateCompany, updateProfile, uploadLogo, removeLogo, checkAutoJoin, createCompanyAndProfile"],
    ["dashboard/knowledge-base/actions.ts", "updateCounty, updateBuildingCode, updateCodeJurisdiction"],
    ["dashboard/admin/database-actions.ts", "listTables, getTableSchema, getTableRows, updateCell, deleteRow, insertRow, executeSQL"],
]
story.append(make_table(
    ["File", "Functions"],
    action_groups,
    col_widths=[170, 320]
))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  6. KNOWLEDGE BASE INVENTORY
# ══════════════════════════════════════════════════════════════
story.append(section_header("6. Knowledge Base Complete Inventory"))
story.append(hr())
story.append(body(
    "The knowledge base contains ~1,330 static data items across 6 modules. All data is defined in TypeScript "
    "files and compiled into the application. The KB tracking Google Sheet was created for manual verification "
    "(Phases 3 & 4 of the verification plan)."
))

story.append(sub_header("6.1 Building Codes — 29 Entries"))
story.append(body("Source: <font face='Courier' size='8'>apps/contractor/src/data/building-codes.ts</font>"))
codes_data = [
    ["roofing", "15", "R905.x series — shingles, sheathing, underlayment, wind resistance, fasteners, slope, ice barrier, starter/ridge/hip/valley, drip edge, re-roofing"],
    ["flashing", "3", "R903.2.1 (wall intersections), R903.2.2 (penetrations), R903.2.2-CRICKET (chimney)"],
    ["gutters", "2", "R903.4 (roof drainage), R903.4-DR (gutter detach/reset for drip edge) [NEW]"],
    ["siding", "4", "R703.1 (wall covering), R703.2 (WRB/house wrap), R703.4 (wall openings flashing), R703.11 (fiber cement) [ALL NEW]"],
    ["ventilation", "2", "R806.1 (ventilation required), R806.2 (min vent area calculations)"],
    ["insulation", "0", "(none — future expansion)"],
    ["general", "3", "R105.1 (permits), R301.2.1 (wind design), R905.1.1 (fire classification), PERMIT-FEE"],
]
story.append(make_table(
    ["Category", "Count", "Details"],
    codes_data,
    col_widths=[60, 35, 395]
))
story.append(Spacer(1, 4))
story.append(body(
    "Each code entry includes: IRC section, title, requirement text, justification text, Xactimate codes, "
    "carrier objection rate (high/medium/low), typical objection, rebuttal, and 3 jurisdiction records "
    "(MD, PA, DE) with state-specific IRC edition and amendment notes."
))
story.append(amber("KB tracking sheet still shows 24 codes — needs update to 29 after today's additions."))

story.append(Spacer(1, 10))
story.append(sub_header("6.2 County Jurisdictions — 43 Counties"))
story.append(body("Source: <font face='Courier' size='8'>apps/contractor/src/data/county-jurisdictions.ts</font>"))
county_data = [
    ["Maryland", "24", "All counties + Baltimore City. Climate zones 4A/5A. Wind speeds 115-130 mph."],
    ["Pennsylvania", "16", "Southeast/south-central PA counties. Climate zones 4A/5A."],
    ["Delaware", "3", "Kent, New Castle, Sussex. Climate zone 4A. Coastal wind zones."],
]
story.append(make_table(
    ["State", "Counties", "Details"],
    county_data,
    col_widths=[70, 50, 370]
))
story.append(Spacer(1, 4))
story.append(body(
    "Each county includes: climate zone, design wind speed, high-wind zone flag, ice barrier requirement "
    "(eaves_only / eaves_valleys / eaves_valleys_penetrations), permit requirements (required flag, AHJ name, "
    "phone, URL, fee range), local amendments, and FIPS code."
))
story.append(body("<b>ZIP-to-County mappings:</b> 969 ZIP codes mapped across all 3 states."))
story.append(good("KB field review (Mar 11) corrected: I/W barrier for MD counties changed to eaves_valleys statewide, "
                   "permit data updated to reflect most MD counties don't enforce roofing permits."))

story.append(Spacer(1, 10))
story.append(sub_header("6.3 Manufacturers — 6 Manufacturers, 48 Requirements"))
mfg_data = [
    ["GAF", "9", "manufacturer-requirements.ts (legacy)", "GAF-REQ-001 through GAF-REQ-009"],
    ["CertainTeed", "6", "manufacturer-requirements.ts (legacy)", "CT-REQ-001 through CT-REQ-006"],
    ["Owens Corning", "9", "manufacturers/owens-corning.ts", "OC-REQ-001 through OC-REQ-009"],
    ["IKO", "8", "manufacturers/iko.ts", "IKO-REQ-001 through IKO-REQ-008"],
    ["Atlas", "8", "manufacturers/atlas.ts", "ATLAS-REQ-001 through ATLAS-REQ-008"],
    ["TAMKO", "8", "manufacturers/tamko.ts", "TAMKO-REQ-001 through TAMKO-REQ-008"],
]
story.append(make_table(
    ["Manufacturer", "Reqs", "Source File", "ID Range"],
    mfg_data,
    col_widths=[80, 30, 180, 200]
))
story.append(Spacer(1, 4))
story.append(body(
    "Each requirement includes: ID, requirement text, description, Xactimate code, unit (LF/SQ/EA/SF/RL), "
    "source URL, source section, mandatory for warranty flag, warranty impact text."
))
story.append(alert(
    "LEGACY INCONSISTENCY: manufacturer-requirements.ts exports MANUFACTURERS (GAF+CT only) and "
    "getRequirementsForCode() which only searches 2 manufacturers. The new manufacturers/index.ts "
    "exports ALL_MANUFACTURERS (all 6) and getRequirementsForXactimateCode() which searches all 6. "
    "Both exist simultaneously. Legacy function should be deprecated."
))

story.append(Spacer(1, 10))
story.append(sub_header("6.4 Justification Matrix — 6 Xactimate Codes"))
story.append(body("Source: <font face='Courier' size='8'>apps/contractor/src/data/manufacturer-requirements.ts</font>"))
jm_data = [
    ["RFG STRP", "Starter strip", "Multi-manufacturer sourcing for starter strip requirement"],
    ["RFG DRIP", "Drip edge", "Multi-manufacturer sourcing for drip edge requirement"],
    ["RFG FELT+", "Ice & water barrier", "Multi-manufacturer sourcing for I&W requirement"],
    ["RFG FLSH", "Step flashing", "Multi-manufacturer sourcing for flashing requirement"],
    ["RFG VENT+", "Ridge vent", "Multi-manufacturer sourcing for ventilation requirement"],
    ["RFG FLCR", "Chimney flashing", "Multi-manufacturer sourcing for chimney flashing"],
]
story.append(make_table(
    ["Xactimate Code", "Item", "Description"],
    jm_data,
    col_widths=[90, 90, 310]
))
story.append(alert(
    "JUSTIFICATION_MATRIX only has 6 entries — ONLY references GAF+CT source IDs. "
    "Needs expansion to include OC, IKO, Atlas, TAMKO requirement IDs for multi-manufacturer evidence."
))
story.append(PageBreak())

story.append(sub_header("6.5 Policy Knowledge Base"))
story.append(body("Source: <font face='Courier' size='8'>packages/policy-engine/src/knowledge.ts</font>"))

story.append(sub3("Coverage Sections (6 entries)"))
story.append(bullet("Coverage A — Dwelling (primary)"))
story.append(bullet("Coverage B — Other Structures (secondary)"))
story.append(bullet("Coverage C — Personal Property (reference)"))
story.append(bullet("Coverage D — Loss of Use / ALE (secondary)"))
story.append(bullet("Law & Ordinance Coverage (primary)"))
story.append(bullet("Extended Replacement Cost (secondary)"))

story.append(sub3("Landmine Rules (10 entries)"))
story.append(bullet("Cosmetic Damage Exclusion (critical)"))
story.append(bullet("Anti-Matching / Limited Matching (critical)"))
story.append(bullet("ACV (Actual Cash Value) Policy (critical)"))
story.append(bullet("Roof Age / Payment Schedule (critical)"))
story.append(bullet("Wind/Hail Sublimit or Separate Deductible (warning)"))
story.append(bullet("Duty to Cooperate / Duty to Mitigate (warning)"))
story.append(bullet("No Law & Ordinance Coverage (warning)"))
story.append(bullet("Prior/Pre-Existing Damage Language (warning)"))
story.append(bullet("Assignment of Benefits (AOB) Restriction (info)"))
story.append(bullet("Supplemental exclusion (info)"))

story.append(sub3("Favorable Provisions (4 entries)"))
story.append(bullet("Matching Provision"))
story.append(bullet("Code Upgrade / Law & Ordinance Coverage"))
story.append(bullet("Overhead & Profit Allowance"))
story.append(bullet("Recoverable Depreciation (RCV)"))

story.append(sub3("Base Form Exclusions (18 entries)"))
story.append(bullet("HO-3: 12 standard exclusions (ordinance/law, earth movement, flood, power failure, neglect, war, nuclear, intentional loss, government action, wear & tear, faulty workmanship, agricultural smoke)"))
story.append(bullet("HO-5: 5 standard exclusions"))
story.append(bullet("HO-6: 3 condo-specific exclusions"))

story.append(sub3("Carrier Endorsement Forms (41+ entries, 13 carriers)"))
carrier_endorse = [
    ["State Farm", "5", "Cosmetic, roof schedule, wind/hail deductible, ordinance, water backup"],
    ["Erie", "5", "Cosmetic, roof schedule, wind/hail %, matching, ordinance"],
    ["Nationwide", "4", "Cosmetic, roof schedule, wind/hail deductible, limited matching"],
    ["Allstate", "4", "Cosmetic, depreciation schedule, wind/hail, anti-matching"],
    ["Travelers", "3", "Cosmetic, roof schedule, wind/hail"],
    ["USAA", "4", "Cosmetic, roof schedule, wind/hail, ordinance"],
    ["Farmers", "3", "Cosmetic, roof schedule, wind/hail"],
    ["Progressive", "3", "Cosmetic, roof schedule, wind/hail"],
    ["Liberty Mutual", "3", "Cosmetic, roof schedule, wind/hail"],
    ["Chubb", "3", "Cosmetic, roof schedule, matching"],
    ["Encompass", "4", "Cosmetic, depreciation, wind/hail, matching"],
    ["Auto-Owners", "3", "Cosmetic, roof schedule, wind/hail"],
    ["Amica", "3", "Cosmetic, roof schedule, wind/hail"],
]
story.append(make_table(
    ["Carrier", "Forms", "Coverage Areas"],
    carrier_endorse,
    col_widths=[80, 35, 375]
))

story.append(Spacer(1, 10))
story.append(sub_header("6.6 Carrier Profiles — 13 Carriers"))
story.append(body("Source: <font face='Courier' size='8'>packages/policy-engine/src/carrier-profiles.ts</font>"))
story.append(body(
    "Each carrier profile includes: aggressiveness rating (low/moderate/aggressive), supplement tactics, "
    "common denial language patterns, adjuster behavior patterns, depreciation approach, cosmetic damage stance, "
    "strengths, and weaknesses. Used by the pre-inspection prompt and rebuttal engine."
))
story.append(body("<b>Carrier Code Objections:</b> Cross-references specific IRC sections that each carrier "
                   "commonly objects to, with typical objection language and effective rebuttals."))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  7. AI PIPELINE & CONFIDENCE SCORING
# ══════════════════════════════════════════════════════════════
story.append(section_header("7. AI Pipeline & Confidence Scoring"))
story.append(hr())

story.append(sub_header("7.1 Three Evidence Pillars"))
story.append(body(
    "Every supplement line item is justified using three independent evidence pillars. "
    "The stronger the multi-pillar support, the higher the confidence score and approval probability."
))
story.append(bullet("<b>Policy Basis:</b> Coverage provisions, endorsements, O&L coverage, depreciation method"))
story.append(bullet("<b>Code Authority:</b> IRC section citations, state adoption, jurisdiction amendments"))
story.append(bullet("<b>Manufacturer Requirement:</b> Installation guide requirements, warranty impact, source documentation"))

story.append(Spacer(1, 10))
story.append(sub_header("7.2 Five-Dimension Confidence Scorer"))
story.append(body("Source: <font face='Courier' size='8'>apps/contractor/src/lib/scoring/confidence.ts</font>"))
score_dims = [
    ["Policy Support", "0-30", "O&L endorsement (30), RCV (18), ACV (12), Unknown (6), Excludes (0)"],
    ["Code Authority", "0-30", "Code-required + confirmed (30), Unverified (18), IRC referenced (12), None (0)"],
    ["Manufacturer Req", "0-30", "Required + applies (30), Warranty basis (18), Recommended (6), None (0)"],
    ["Physical Presence", "0-30", "On-roof + removal (30), General scope (15), Not physical (0)"],
    ["Measurement Evidence", "0-30", "Measurement-derived (30), On file (10), None (0)"],
]
story.append(make_table(
    ["Dimension", "Range", "Scoring Logic"],
    score_dims,
    col_widths=[100, 40, 350]
))
story.append(Spacer(1, 4))
story.append(body("<b>Raw range:</b> 0-150 points, normalized to 0-100 scale."))
tier_data = [
    ["High", "85-100", "Strong 3-pillar support — include with confidence"],
    ["Good", "60-84", "Good support — include with rebuttal language"],
    ["Moderate", "35-59", "Moderate support — needs additional documentation"],
    ["Low", "0-34", "Weak support — contractor discretion, optional inclusion"],
]
story.append(make_table(
    ["Tier", "Score Range", "Recommendation"],
    tier_data,
    col_widths=[60, 70, 360]
))

story.append(Spacer(1, 10))
story.append(sub_header("7.3 Calculators"))
story.append(bullet("<b>Waste Calculator</b> (<font face='Courier' size='8'>src/lib/calculators/waste.ts</font>): "
                     "Geometry-based waste % using hip count, valley count, and slope. Adjusters use generic 10-15%; "
                     "actual waste on complex roofs is 18-25%. Recovers $200-800 per job."))
story.append(bullet("<b>IWS/Steep Pitch Calculator</b> (<font face='Courier' size='8'>src/lib/calculators/iws-steep.ts</font>): "
                     "Climate-zone-based ice barrier calculation for steep pitch roofs."))
story.append(bullet("<b>O&P Calculator</b> (<font face='Courier' size='8'>src/lib/calculators/ohp.ts</font>): "
                     "10% overhead + 10% profit validation. Denied 85% on first submission."))

story.append(Spacer(1, 10))
story.append(sub_header("7.4 Context Injection into Claude Prompt"))
story.append(body(
    "When the supplement pipeline runs, the following context is injected into the Claude system prompt:"
))
story.append(bullet("Carrier behavioral profile (aggressiveness, tactics, denial patterns, weaknesses)"))
story.append(bullet("Carrier-specific code objections (IRC sections this carrier commonly disputes)"))
story.append(bullet("Jurisdiction data (county, climate zone, wind speed, ice barrier requirement, permits)"))
story.append(bullet("Building codes (all 29 IRC entries with state-specific adoption info)"))
story.append(bullet("Manufacturer requirements (filtered by Xactimate codes found in estimate)"))
story.append(bullet("Policy analysis (coverages, exclusions, endorsements, landmines, favorable provisions)"))
story.append(bullet("Roof measurements (geometry for waste calc, pitch breakdown)"))
story.append(bullet("Damage types and inspection photo analysis results"))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  8. PRICING & BILLING
# ══════════════════════════════════════════════════════════════
story.append(section_header("8. Pricing, Billing & Stripe Configuration"))
story.append(hr())

story.append(sub_header("8.1 Current Code Constants"))
story.append(body("Source: <font face='Courier' size='8'>apps/contractor/src/lib/stripe/constants.ts</font>"))
pricing_data = [
    ["Supplement Generation", "$149.00", "14900", "Per supplement, first one free"],
    ["Policy Decoder", "$50.00", "5000", "Per decode, first one free"],
    ["Policy Check", "$29.00", "2900", "Contractor-initiated, emailed to homeowner"],
]
story.append(make_table(
    ["Product", "Price", "Cents", "Notes"],
    pricing_data,
    col_widths=[120, 60, 50, 260]
))

story.append(Spacer(1, 10))
story.append(sub_header("8.2 Enterprise Billing"))
story.append(body(
    "Enterprise accounts use Stripe metered billing with base subscription + overage charges. "
    "Products configured via environment variables:"
))
story.append(bullet("STRIPE_ENTERPRISE_BASE_PRODUCT_ID — monthly base subscription"))
story.append(bullet("STRIPE_ENTERPRISE_DECODE_OVERAGE_PRODUCT_ID — per-decode overage"))
story.append(bullet("STRIPE_ENTERPRISE_SUPPLEMENT_OVERAGE_PRODUCT_ID — per-supplement overage"))

story.append(Spacer(1, 10))
story.append(sub_header("8.3 8-Tier Pricing Model (from user screenshots)"))
story.append(body("The user designed an 8-tier pricing model. These are NOT yet reflected in the codebase:"))
tiers = [
    ["Pay-Per-Use", "$10/decode, $50/supplement", "No subscription, a la carte"],
    ["Starter", "$520/mo", "15 decodes + 8 supplements included"],
    ["Growth", "$1,150/mo", "40 decodes + 18 supplements included"],
    ["Pro", "$1,950/mo", "75 decodes + 35 supplements included"],
    ["Scale", "$3,300/mo", "150 decodes + 65 supplements included"],
    ["Elite", "$4,525/mo", "250 decodes + 100 supplements included"],
    ["Enterprise", "$5,500/mo", "500+ decodes + 200+ supplements, custom"],
]
story.append(make_table(
    ["Tier", "Price", "Includes"],
    tiers,
    col_widths=[80, 130, 280]
))
story.append(alert(
    "PRICING INCONSISTENCY: Code says $50/decode but landing page copy says $15/report. "
    "The 8-tier model from user screenshots hasn't been implemented in Stripe constants yet. "
    "Need to reconcile before launch."
))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  9. TEST COVERAGE
# ══════════════════════════════════════════════════════════════
story.append(section_header("9. Test Coverage Report"))
story.append(hr())
story.append(body("Framework: Vitest. All 449+ tests passing across 16 files as of Mar 11, 2026."))

story.append(sub_header("9.1 Contractor App Tests (14 files)"))
test_data = [
    ["src/data/building-codes.test.ts", "Building codes structure, categories, lookups", "~30"],
    ["src/data/county-jurisdictions.test.ts", "County data, FIPS, wind speeds, ice barriers", "91"],
    ["src/data/zip-mapping.test.ts", "ZIP-to-county mappings, state prefixes", "~20"],
    ["src/data/manufacturers/manufacturers.test.ts", "Manufacturer requirements, IDs, cross-refs", "~25"],
    ["src/data/cross-references.test.ts", "Cross-module data consistency checks", "~15"],
    ["src/lib/scoring/confidence.test.ts", "5-dimension scorer, tiers, normalization", "~20"],
    ["src/lib/pdf/generate-supplement.test.ts", "Supplement PDF generation", "7"],
    ["src/lib/pdf/generate-weather-report.test.ts", "Weather report PDF generation", "~10"],
    ["src/lib/email/templates.test.ts", "Email template rendering", "~15"],
    ["src/lib/rate-limit.test.ts", "Rate limiting logic", "6"],
    ["src/lib/queue/client.test.ts", "QStash queue client", "~10"],
    ["src/lib/weather/fetch-weather.test.ts", "Weather API integration", "~10"],
    ["src/lib/ai/retry.test.ts", "AI retry logic with backoff", "~10"],
    ["src/lib/validations/schemas.test.ts", "Zod schema validation", "~25"],
]
story.append(make_table(
    ["Test File", "Coverage Area", "Tests"],
    test_data,
    col_widths=[195, 210, 35],
))

story.append(Spacer(1, 8))
story.append(sub_header("9.2 Policy Engine Tests (2 files)"))
pe_tests = [
    ["src/knowledge.test.ts", "Coverage sections, landmines, provisions, exclusions, endorsements", "47"],
    ["src/carrier-profiles.test.ts", "Carrier profiles, aliases, aggressiveness, code objections", "50"],
]
story.append(make_table(
    ["Test File", "Coverage Area", "Tests"],
    pe_tests,
    col_widths=[170, 235, 35],
))
story.append(Spacer(1, 8))
story.append(body("<b>Run commands:</b>"))
story.append(Paragraph(
    "cd apps/contractor &amp;&amp; npx vitest run    # 346+ tests<br/>"
    "cd packages/policy-engine &amp;&amp; npx vitest run   # 103 tests",
    styles["CodeBlock"]
))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  10. DECODECOVERAGE B2C APP
# ══════════════════════════════════════════════════════════════
story.append(section_header("10. DecodeCoverage (B2C) App"))
story.append(hr())
story.append(body(
    "Free homeowner-facing policy decoder for lead generation. Domain: decodecoverage.com. "
    "No auth required, no Stripe. Uses same Supabase project with consumer_leads table (no RLS, service role key). "
    "Branding: 'Powered by 4Margin'."
))

story.append(sub_header("10.1 Pages (8)"))
dc_pages = [
    ["/", "Landing page — value prop, 3-step form entry point"],
    ["/results/[id]", "AI analysis results — coverages, risks, recommendations"],
    ["/check/[token]", "Policy check entry (sent by contractor to homeowner)"],
    ["/check/[token]/results", "Policy check results page"],
    ["/check/[token]/opt-in", "Lead opt-in from policy check"],
    ["/privacy", "Privacy policy"],
    ["/terms", "Terms of service"],
    ["/unsubscribe", "Email unsubscribe"],
]
story.append(make_table(["Route", "Purpose"], dc_pages, col_widths=[140, 350]))

story.append(Spacer(1, 8))
story.append(sub_header("10.2 API Routes (16)"))
dc_routes = [
    ["/api/analyze", "POST", "AI policy parsing via Claude"],
    ["/api/upload", "POST", "Upload policy PDF to Supabase Storage"],
    ["/api/report/[id]/download", "GET", "Download analysis PDF"],
    ["/api/report/[id]/email", "POST", "Email results to homeowner"],
    ["/api/check/[token]/*", "Various", "Policy check flow (download, submit, opt-in)"],
    ["/api/leads/[id]/*", "POST", "Lead management (status, contact, opt-in, exit-intent)"],
    ["/api/unsubscribe", "POST", "Email unsubscribe handler"],
    ["/api/cron/email-sequence", "POST", "Automated email follow-up (Vercel Cron)"],
    ["/api/cron/weather-alerts", "POST", "Storm-based lead triggers"],
    ["/api/cron/anniversary", "POST", "Policy anniversary date reminders"],
    ["/api/cron/retrigger", "POST", "Retrigger lead outreach"],
]
story.append(make_table(
    ["Route", "Method", "Purpose"],
    dc_routes,
    col_widths=[150, 40, 300]
))

story.append(Spacer(1, 10))
story.append(sub_header("10.3 Stack Differences from Contractor App"))
story.append(bullet("Next.js 16 (vs 15 for contractor) + CSS custom properties (not Tailwind)"))
story.append(bullet("DM Sans / Fraunces fonts + lucide-react icons"))
story.append(bullet("No auth, no Stripe, no RLS"))
story.append(bullet("consumer_leads table (not claims/supplements)"))
story.append(bullet("consumer-policies storage bucket"))
story.append(bullet("Shared @4margin/policy-engine package for parsing"))
story.append(bullet("Shared @4margin/pdf package for PDF generation"))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  11. KNOWN INCONSISTENCIES & DATA GAPS
# ══════════════════════════════════════════════════════════════
story.append(section_header("11. Known Inconsistencies & Data Gaps"))
story.append(hr())
story.append(body(
    "This section catalogues every known inconsistency, data gap, and area where different parts of the "
    "system are out of sync. These must be resolved before production launch."
))

story.append(sub_header("11.1 Critical Issues"))

story.append(sub3("A. Supplement Pipeline Bug"))
story.append(alert("Pipeline returns 0 items. Status: UNRESOLVED since Feb 26."))
story.append(body(
    "The supplement generation pipeline consistently returns 0 missing items. Top suspect is Vercel Fluid Compute "
    "being OFF, capping serverless functions at 60 seconds when the pipeline needs 2-3 minutes. "
    "The pipeline works correctly in local development."
))
story.append(bullet("Location: src/lib/ai/pipeline.ts + /api/supplements/[id]/generate/route.ts"))
story.append(bullet("Fix: Enable Vercel Fluid Compute OR switch to QStash chained background jobs"))
story.append(bullet("Impact: Entire supplement product is non-functional in production"))

story.append(Spacer(1, 8))
story.append(sub3("B. Unapplied Database Migrations"))
story.append(alert("Migrations 034-038 not applied to production Supabase."))
story.append(bullet("034 — Intelligence engine tables (confidence scoring, outcome tracking)"))
story.append(bullet("035 — Knowledge base tables (IRC codes, manufacturer reqs, county codes)"))
story.append(bullet("036 — Supplement messages (rebuttal history)"))
story.append(bullet("037 — Rebuttal generation support"))
story.append(bullet("038 — Claim intake questions (gutters, warranty, pre-existing)"))
story.append(body(
    "Features depending on these migrations will throw errors or silently fail in production until applied."
))

story.append(Spacer(1, 8))
story.append(sub3("C. Legacy vs Modern Manufacturer Lookup"))
story.append(alert("Two conflicting manufacturer lookup systems coexist."))
story.append(bullet("<b>Legacy:</b> manufacturer-requirements.ts exports MANUFACTURERS (GAF + CertainTeed only) "
                     "and getRequirementsForCode() — searches 2 manufacturers"))
story.append(bullet("<b>Modern:</b> manufacturers/index.ts exports ALL_MANUFACTURERS (all 6) "
                     "and getRequirementsForXactimateCode() — searches all 6"))
story.append(bullet("Both are imported in different parts of the codebase"))
story.append(bullet("Fix: Deprecate legacy exports, update all imports to use modern versions"))

story.append(Spacer(1, 14))
story.append(sub_header("11.2 Data Inconsistencies"))

story.append(sub3("D. Pricing Mismatches"))
story.append(amber("Multiple pricing discrepancies across the codebase:"))
story.append(bullet("Stripe constants: $50/decode — but landing page copy says $15/report"))
story.append(bullet("8-tier pricing model designed by user is NOT in codebase at all"))
story.append(bullet("Enterprise metered billing env vars exist but no tier configuration"))
story.append(bullet("Fix: Decide on final pricing, update Stripe constants + all UI copy"))

story.append(Spacer(1, 8))
story.append(sub3("E. JUSTIFICATION_MATRIX Incomplete"))
story.append(amber("Only 6 Xactimate codes mapped, only references GAF + CertainTeed."))
story.append(bullet("Current 6 codes: RFG STRP, RFG DRIP, RFG FELT+, RFG FLSH, RFG VENT+, RFG FLCR"))
story.append(bullet("justificationSources arrays only contain GAF-REQ-xxx and CT-REQ-xxx IDs"))
story.append(bullet("Missing all OC-REQ, IKO-REQ, ATLAS-REQ, TAMKO-REQ source references"))
story.append(bullet("Missing all SDG codes (siding): SDG VNYL, SDG FBCM, SDG WOOD, SDG ALUM, SDG WRAP, SDG FELT, SDG JCHN, SDG TRIM, SDG FLSH, SDG HRDP"))
story.append(bullet("Missing new GTR codes (gutters): GTR DET, GTR ALM5, GTR DSAL"))
story.append(bullet("Impact: Supplements for siding/gutter items have NO manufacturer cross-reference justification"))
story.append(bullet("Fix: Expand matrix to include all 6 manufacturers and all SDG/GTR/additional RFG codes"))

story.append(Spacer(1, 8))
story.append(sub3("F. KB Tracking Sheet vs Codebase"))
story.append(amber("Google Sheet for Phase 4 verification is out of date:"))
story.append(bullet("Sheet shows 24 building codes — codebase now has 29 (5 new gutter/siding codes added today)"))
story.append(bullet("New intake questions (gutters, warranty, pre-existing) not reflected in any tracking"))
story.append(bullet("Pre-inspection prep moved from supplement tab to decoder tab — not tracked"))
story.append(bullet("Fix: Re-run populate-sheet.ts script after all code changes are finalized"))

story.append(Spacer(1, 8))
story.append(sub3("G. Agent Prompt Documents"))
story.append(amber("3 agent prompt .docx files in /docs/ may reference outdated data:"))
story.append(bullet("Files: 4Margin-Agent-Prompts-Reviewed.docx, v2-updated.docx, v2.docx"))
story.append(bullet("Likely reference 24 building codes — now 29 (5 new gutter/siding codes added Mar 11)"))
story.append(bullet("Likely reference pre-inspection script on supplement detail page — now on policy decoder page"))
story.append(bullet("Missing new intake question fields: guttersNailedThroughDripEdge, roofUnderWarranty, preExistingConditions"))
story.append(bullet("Missing new siding category in building codes (was only roofing/flashing/ventilation/gutters/general)"))
story.append(bullet("Missing new PreInspectionPrep component and /api/policy-decoder/[id]/pre-inspection route"))
story.append(bullet("Fix: Review and update all 3 documents to match current codebase state after stabilization"))

story.append(Spacer(1, 14))
story.append(sub_header("11.3 Architectural Gaps"))

story.append(sub3("H. Supplement Engine Revamp"))
story.append(body(
    "The supplement engine is BLOCKED pending receipt of Xactimate data + top 25 denials document "
    "(expected ~72h from Mar 11). Once received, the engine needs:"
))
story.append(bullet("Real Xactimate code database (currently using curated subset)"))
story.append(bullet("Denial pattern training from top 25 denials"))
story.append(bullet("Approval talking points on supplement page (replacing old pre-inspection location)"))
story.append(bullet("Pipeline timeout fix (Fluid Compute or QStash chaining)"))

story.append(Spacer(1, 8))
story.append(sub3("I. Missing Siding Manufacturer Requirements"))
story.append(alert("4 new siding IRC codes added but ZERO manufacturer requirements exist for siding products."))
story.append(body(
    "4 new siding IRC codes (R703.1, R703.2, R703.4, R703.11) were added today. They reference "
    "10 Xactimate codes: SDG VNYL, SDG FBCM, SDG WOOD, SDG ALUM, SDG WRAP, SDG FELT, SDG JCHN, "
    "SDG TRIM, SDG FLSH, SDG HRDP. However, all 48 manufacturer requirements in the KB are "
    "roofing-specific. No manufacturer has siding installation requirements."
))
story.append(bullet("<b>Confidence scorer impact:</b> The 'Manufacturer Requirement' dimension (max 30 pts) "
                     "will score 0 for EVERY siding item — dropping max possible score to 80/100"))
story.append(bullet("<b>Supplement impact:</b> Siding line items will never have 3-pillar justification "
                     "(only Policy + Code, no Manufacturer)"))
story.append(bullet("Fix: Add siding manufacturer requirements for James Hardie, LP SmartSide, CertainTeed "
                     "vinyl, and other common siding manufacturers, OR accept 2-pillar justification for siding"))

story.append(Spacer(1, 8))
story.append(sub3("J. New Intake Questions Not Wired into AI"))
story.append(alert("3 new intake fields saved to DB but NOT injected into any AI prompt."))
story.append(body(
    "The claim creation wizard now collects guttersNailedThroughDripEdge, roofUnderWarranty, and "
    "preExistingConditions. These are saved to the claims table (migration 038). However:"
))
story.append(bullet("<b>pipeline.ts</b> does NOT read these columns or inject them into the Claude system prompt"))
story.append(bullet("<b>pre-inspection-prompt.ts</b> does NOT use these fields in its context building"))
story.append(bullet("<b>roofUnderWarranty</b> was specifically intended to trigger warranty-angle rebuttals "
                     "(e.g., 'new roof IC is paying for must be installed per manufacturer guidelines to be "
                     "warrantable') — this logic does not exist yet"))
story.append(bullet("<b>guttersNailedThroughDripEdge</b> should trigger IRC-R903.4-DR (gutter detach/reset) — "
                     "currently no code maps this intake answer to that building code"))
story.append(bullet("<b>preExistingConditions</b> should be injected into Claude prompt so AI can distinguish "
                     "storm damage from pre-existing conditions in its analysis"))
story.append(bullet("Fix: Wire all 3 fields into pipeline.ts claim context injection and pre-inspection prompt"))

story.append(Spacer(1, 8))
story.append(sub3("K. KB Admin UI vs Static TypeScript — Dual Source of Truth"))
story.append(alert("KB admin UI writes to database tables but the AI pipeline reads from static TS files."))
story.append(body(
    "Migration 035 creates database tables for building codes, manufacturer requirements, and county "
    "code jurisdictions. The dashboard KB browser (knowledge-base page) has server actions that write "
    "to these DB tables: updateCounty(), updateBuildingCode(), updateCodeJurisdiction()."
))
story.append(bullet("However, the supplement pipeline and all code/manufacturer lookups read from "
                     "static TypeScript files: building-codes.ts, county-jurisdictions.ts, manufacturers/*.ts"))
story.append(bullet("If someone edits data via the admin UI, changes go to the DB only — the pipeline "
                     "will still use the old static data"))
story.append(bullet("The two data sources WILL drift apart over time"))
story.append(bullet("Fix options: (a) Make pipeline read from DB instead of static TS, (b) Remove admin "
                     "edit capability and treat TS files as single source of truth, (c) Add sync mechanism "
                     "that writes DB changes back to TS files"))

story.append(Spacer(1, 8))
story.append(sub3("L. AdvocacyScripts Component Still Has pre_inspection Scenario"))
story.append(amber("Stale code path: AdvocacyScripts component still accepts 'pre_inspection' as valid scenario."))
story.append(body(
    "Pre-inspection was moved from the supplement detail page to the policy decoder page today "
    "via a new dedicated PreInspectionPrep component and /api/policy-decoder/[id]/pre-inspection route. "
    "However:"
))
story.append(bullet("The AdvocacyScripts component type still lists 'pre_inspection' as a valid scenario"))
story.append(bullet("The /api/supplements/[id]/advocacy route still handles pre_inspection requests"))
story.append(bullet("The old advocacy prompt builder still has pre_inspection logic"))
story.append(bullet("Nothing currently calls these old paths (removed from supplement page), but the dead code "
                     "remains and could cause confusion"))
story.append(bullet("Fix: Remove 'pre_inspection' from AdvocacyScripts scenario type and clean up dead code paths"))

story.append(Spacer(1, 8))
story.append(sub3("M. Cross-Reference Test Gaps"))
story.append(body(
    "The cross-references.test.ts file validates that data modules reference each other correctly. "
    "With 5 new building codes added today, the cross-reference tests should be updated to verify "
    "the new gutter/siding Xactimate codes are findable via manufacturer lookup functions. Currently "
    "these new codes will fail cross-reference checks since no manufacturer requirements map to SDG codes."
))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  12. LAUNCH READINESS
# ══════════════════════════════════════════════════════════════
story.append(section_header("12. Launch Readiness Checklist"))
story.append(hr())
story.append(body(
    "Current launch strategy: Ship DecodeCoverage (B2C) + 4Margin contractor app with policy decoder "
    "as lead product. Supplements hidden until pipeline bug is fixed and Xactimate data arrives."
))

story.append(sub_header("12.1 DecodeCoverage (B2C) — Launch Blockers"))
launch_dc = [
    ["Apply remaining migrations to production", "Required", "Migrations 022-030 for consumer leads"],
    ["Set production environment variables", "Required", "Supabase, Anthropic, Resend, Cron secrets"],
    ["Verify DNS for decodecoverage.com", "Required", "A/CNAME records pointing to Vercel"],
    ["SSL certificate provisioned", "Required", "Auto via Vercel"],
    ["Legal pages (privacy, terms) reviewed", "Required", "Currently exist but need legal review"],
    ["Favicon and OG image", "Required", "Brand assets for social sharing"],
    ["Google Analytics / Meta Pixel", "Recommended", "Tracking for ad spend ROI"],
    ["Email sequence content finalized", "Recommended", "Follow-up drip emails for leads"],
    ["Error monitoring (Sentry)", "Recommended", "Production error tracking"],
]
story.append(make_table(
    ["Item", "Priority", "Notes"],
    launch_dc,
    col_widths=[200, 70, 220]
))

story.append(Spacer(1, 10))
story.append(sub_header("12.2 Contractor App — Launch Blockers"))
launch_contractor = [
    ["Apply migrations 034-038", "Critical", "Intelligence engine + KB tables + intake questions"],
    ["Fix supplement pipeline (0 items)", "Critical", "Enable Fluid Compute or restructure pipeline"],
    ["Wire intake questions into AI pipeline", "Required", "gutters/warranty/pre-existing into Claude prompt"],
    ["Reconcile pricing constants", "Required", "Decide on final pricing, update code + UI"],
    ["Deprecate legacy manufacturer lookup", "Required", "Single source of truth for all 6 manufacturers"],
    ["Expand JUSTIFICATION_MATRIX", "Required", "Add OC/IKO/Atlas/TAMKO + SDG/GTR codes"],
    ["Resolve KB dual source of truth", "Required", "DB tables vs static TS files — pick one"],
    ["Clean up dead pre_inspection code paths", "Recommended", "Remove from AdvocacyScripts + old API route"],
    ["Update agent prompt documents", "Recommended", "Reflect 29 codes, intake Qs, decoder pre-inspection"],
    ["Update KB tracking sheet", "Recommended", "Re-populate with current 1,330+ items"],
    ["Review landing page copy", "Required", "Currently has supplement-focused copy; needs decoder focus"],
    ["Hide supplement features in nav", "Required", "Until pipeline is fixed"],
    ["Production Stripe products created", "Required", "Products + prices in Stripe dashboard"],
    ["Vercel deployment verified", "Required", "Build + deploy without errors"],
]
story.append(make_table(
    ["Item", "Priority", "Notes"],
    launch_contractor,
    col_widths=[200, 70, 220]
))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  13. COMPETITIVE MOATS & DEFENSIBILITY
# ══════════════════════════════════════════════════════════════
story.append(section_header("13. Competitive Moats & Defensibility"))
story.append(hr())
story.append(body(
    "4Margin's defensibility comes from the depth of its domain-specific knowledge base and the "
    "compounding intelligence loop. The platform is not a generic AI wrapper — it is a purpose-built "
    "system for insurance supplement advocacy with layers that are difficult and time-intensive to replicate."
))

story.append(sub_header("13.1 Primary Moats"))

story.append(sub3("A. Three-Pillar Evidence System"))
story.append(body(
    "Every supplement line item is justified through three independent evidence pillars: Policy Basis, "
    "Code Authority, and Manufacturer Requirement. No competitor currently uses this structured approach. "
    "Most supplement services rely on a single contractor's opinion or generic code references."
))
story.append(bullet("Policy-specific: Maps exact endorsement forms, exclusions, and favorable provisions to each line item"))
story.append(bullet("Code-specific: Cites the exact IRC section + state adoption date + jurisdiction amendments"))
story.append(bullet("Manufacturer-specific: References specific installation guide page/section for warranty compliance"))
story.append(bullet("<b>Why it matters:</b> Adjusters can dismiss opinion but cannot dismiss three independent authoritative sources"))

story.append(Spacer(1, 8))
story.append(sub3("B. Jurisdiction-Specific Knowledge Base"))
story.append(body(
    "43 counties across MD, PA, and DE with hyper-local data: climate zones, design wind speeds, "
    "ice barrier requirements, permit enforcement, AHJ contact info, local code amendments. "
    "This data took field research and manual verification to compile — it is not available in any "
    "public database and represents months of work."
))
story.append(bullet("969 ZIP-to-county mappings for instant jurisdiction lookup"))
story.append(bullet("County-specific ice barrier requirements (eaves_only vs eaves_valleys vs eaves_valleys_penetrations)"))
story.append(bullet("Permit enforcement reality (most MD counties don't actually enforce roofing permits — this is field knowledge)"))
story.append(bullet("<b>Expansion moat:</b> Every new state/county added deepens the competitive advantage"))

story.append(Spacer(1, 8))
story.append(sub3("C. Carrier Behavioral Intelligence"))
story.append(body(
    "13 carrier profiles with behavioral data no competitor has: aggressiveness ratings, specific supplement "
    "tactics, common denial language patterns, adjuster behavior patterns, cosmetic damage stances, "
    "strengths, and weaknesses. Plus carrier-specific code objection patterns."
))
story.append(bullet("Pre-inspection prep uses carrier profile to coach contractors on what to expect"))
story.append(bullet("Rebuttal engine uses carrier weaknesses to craft targeted responses"))
story.append(bullet("Denial language patterns help identify which objections to expect"))
story.append(bullet("<b>Intelligence loop:</b> Outcome tracking (migration 034) will feed success/failure data back to improve profiles"))

story.append(Spacer(1, 8))
story.append(sub3("D. Compounding Intelligence Loop"))
story.append(body(
    "The outcome tracking schema (migration 034) creates a feedback loop: every supplement submission, "
    "approval, partial approval, and denial gets recorded with carrier, jurisdiction, and line-item data. "
    "Over time this builds a proprietary dataset of what works and what doesn't, by carrier, by county, "
    "by line item."
))
story.append(bullet("Confidence scores improve as real outcome data validates or invalidates assumptions"))
story.append(bullet("Carrier profiles become more accurate with each interaction"))
story.append(bullet("Denial patterns become predictable — system can pre-empt common objections"))
story.append(bullet("<b>This is the ultimate moat:</b> A competitor starting today has zero outcome data. 4Margin's dataset grows with every job."))

story.append(Spacer(1, 8))
story.append(sub_header("13.2 Secondary Moats"))
story.append(bullet("<b>Multi-trade coverage:</b> Roofing + siding + gutters — competitors typically only handle roofing"))
story.append(bullet("<b>Manufacturer depth:</b> 6 manufacturers, 48 requirements — competitors reference 1-2 at best"))
story.append(bullet("<b>Endorsement form library:</b> 47 carrier-specific endorsement forms — built through manual policy review"))
story.append(bullet("<b>Full-stack automation:</b> From policy upload to carrier-ready PDF — no manual steps required"))
story.append(bullet("<b>B2C lead funnel:</b> DecodeCoverage provides a free homeowner tool that feeds contractor leads — "
                     "competitors have no B2C acquisition channel"))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  14. VALUE PROPOSITION BY CUSTOMER SEGMENT
# ══════════════════════════════════════════════════════════════
story.append(section_header("14. Value Proposition by Customer Segment"))
story.append(hr())

story.append(sub_header("14.1 Solo Roofing Contractor (1-5 jobs/month)"))
story.append(body("<b>Pain point:</b> Leaves $2,000-8,000 on the table per job because they don't know what the policy covers "
                   "or which IRC codes to cite. Writes supplements by hand or skips them entirely."))
story.append(bullet("<b>4Margin value:</b> Instant policy decode reveals hidden coverage and landmines before inspection"))
story.append(bullet("AI-generated supplement with 3-pillar justification — would take 4-6 hours to write manually"))
story.append(bullet("Pre-inspection coaching based on carrier behavioral profile"))
story.append(bullet("<b>ROI:</b> If 4Margin recovers even 1 additional line item per supplement at $300-800, "
                     "the $149 supplement fee pays for itself 2-5x"))
story.append(bullet("<b>Ideal tier:</b> Pay-Per-Use ($10/decode, $50/supplement) or Starter ($520/mo)"))

story.append(Spacer(1, 10))
story.append(sub_header("14.2 Mid-Size Roofing Company (10-30 jobs/month)"))
story.append(body("<b>Pain point:</b> Has a supplement writer but they're overwhelmed, inconsistent, and not citing "
                   "all available evidence. Missing manufacturer requirements and jurisdiction-specific codes."))
story.append(bullet("<b>4Margin value:</b> Standardizes supplement quality across all jobs"))
story.append(bullet("Knowledge base catches items human writers miss (e.g., gutter detach/reset, steep pitch IWS)"))
story.append(bullet("Waste calculator recovers $200-800/job from geometry-based waste vs generic 10%"))
story.append(bullet("Confidence scoring prioritizes highest-probability items first"))
story.append(bullet("<b>ROI:</b> At 20 jobs/month, recovering $500 extra per job = $10,000/month in additional revenue. "
                     "Growth tier at $1,150/mo = 8.7x ROI"))
story.append(bullet("<b>Ideal tier:</b> Growth ($1,150/mo) or Pro ($1,950/mo)"))

story.append(Spacer(1, 10))
story.append(sub_header("14.3 Large/Multi-Office Contractor (50+ jobs/month)"))
story.append(body("<b>Pain point:</b> Multiple offices, inconsistent supplement quality, no visibility into what's working. "
                   "Paying for supplement services that charge $300-500 per supplement with slow turnaround."))
story.append(bullet("<b>4Margin value:</b> Enterprise multi-office with centralized KB and outcome tracking"))
story.append(bullet("Usage dashboards show performance by office, by carrier, by item type"))
story.append(bullet("Tiered pricing makes unit cost drop significantly at scale"))
story.append(bullet("Intelligence loop gets smarter with their volume — more data = better confidence scores"))
story.append(bullet("<b>ROI:</b> At 100 jobs/month, recovering $400 extra per job = $40,000/month. "
                     "Elite tier at $4,525/mo = 8.8x ROI"))
story.append(bullet("<b>Ideal tier:</b> Scale ($3,300/mo) through Enterprise ($5,500/mo)"))

story.append(Spacer(1, 10))
story.append(sub_header("14.4 Homeowner (via DecodeCoverage)"))
story.append(body("<b>Pain point:</b> Doesn't understand their insurance policy, worried about getting lowballed by adjuster, "
                   "doesn't know their rights."))
story.append(bullet("<b>DecodeCoverage value:</b> Free AI policy decode with plain-English explanation"))
story.append(bullet("Risk scoring shows if policy has landmines (cosmetic exclusions, ACV, matching limits)"))
story.append(bullet("Pre-inspection guide teaches them what to document and what questions to ask"))
story.append(bullet("<b>Lead funnel:</b> Homeowner enters policy data, gets value, then gets connected to a 4Margin contractor"))
story.append(bullet("<b>Cost to serve:</b> ~$0.15 Claude API per decode. Zero marginal cost beyond that."))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  15. PRICING STRATEGY & UNIT ECONOMICS
# ══════════════════════════════════════════════════════════════
story.append(section_header("15. Pricing Strategy & Unit Economics"))
story.append(hr())

story.append(sub_header("15.1 Proposed 8-Tier Model"))
tiers_full = [
    ["Tier", "Monthly", "Decodes", "Supplements", "Per-Decode", "Per-Supp", "Target Segment"],
    ["Pay-Per-Use", "$0", "a la carte", "a la carte", "$10", "$50", "Occasional users, trial"],
    ["Starter", "$520", "15", "8", "$34.67", "$65.00", "Solo contractor, 1-5 jobs/mo"],
    ["Growth", "$1,150", "40", "18", "$28.75", "$63.89", "Small company, 10-15 jobs/mo"],
    ["Pro", "$1,950", "75", "35", "$26.00", "$55.71", "Mid-size, 15-30 jobs/mo"],
    ["Scale", "$3,300", "150", "65", "$22.00", "$50.77", "Large, 30-50 jobs/mo"],
    ["Elite", "$4,525", "250", "100", "$18.10", "$45.25", "Multi-office, 50-100 jobs/mo"],
    ["Enterprise", "$5,500", "500+", "200+", "$11.00", "$27.50", "100+ jobs/mo, custom"],
]
story.append(make_table(
    tiers_full[0], tiers_full[1:],
    col_widths=[65, 50, 50, 55, 55, 50, 165]
))

story.append(Spacer(1, 10))
story.append(sub_header("15.2 Unit Economics"))
story.append(body("<b>Cost per decode (Claude API):</b>"))
story.append(bullet("Policy PDF parse: ~5,000-15,000 input tokens + ~2,000-4,000 output tokens"))
story.append(bullet("Sonnet 4 pricing: $3/M input, $15/M output"))
story.append(bullet("Estimated cost per decode: <b>$0.10-0.15</b>"))
story.append(bullet("At $10 pay-per-use price: <b>~98.5% gross margin</b>"))

story.append(Spacer(1, 6))
story.append(body("<b>Cost per supplement (Claude API):</b>"))
story.append(bullet("Estimate parse + policy parse + item detection + photo analysis: ~20,000-40,000 input + ~5,000-10,000 output"))
story.append(bullet("Estimated cost per supplement: <b>$0.25-0.50</b>"))
story.append(bullet("At $50 pay-per-use price: <b>~99% gross margin</b>"))
story.append(bullet("Additional: Supabase storage (~$0.01/job), Vercel compute (~$0.02/job), Resend email (~$0.001/email)"))

story.append(Spacer(1, 6))
story.append(body("<b>Blended unit economics at scale:</b>"))
story.append(bullet("Total COGS per job (decode + supplement + storage + compute): <b>~$0.50-0.75</b>"))
story.append(bullet("Enterprise tier at $5,500/mo for 700 jobs: <b>$7.86/job revenue, $7.11/job margin = 90.4% gross margin</b>"))
story.append(bullet("Pay-Per-Use at $60/job (decode + supplement): <b>$59.25/job margin = 98.8% gross margin</b>"))

story.append(Spacer(1, 10))
story.append(sub_header("15.3 Pricing Anchoring"))
story.append(body("Competitive context for supplement pricing:"))
price_comp = [
    ["Manual supplement writer (freelance)", "$300-500/supplement", "24-72 hour turnaround"],
    ["Supplement company (e.g., Supplement Experts)", "$250-400/supplement", "3-5 day turnaround"],
    ["In-house supplement writer (salary)", "$4,000-6,000/month", "Full-time employee cost"],
    ["4Margin (Pay-Per-Use)", "$60/job (decode + supp)", "Minutes, not days"],
    ["4Margin (Pro tier, 35 supps)", "$55.71/supplement", "Instant, consistent quality"],
    ["4Margin (Enterprise, 200 supps)", "$27.50/supplement", "Lowest unit cost at scale"],
]
story.append(make_table(
    ["Service", "Cost", "Turnaround"],
    price_comp,
    col_widths=[195, 130, 165]
))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  16. REVENUE FORECASTING
# ══════════════════════════════════════════════════════════════
story.append(section_header("16. Revenue Forecasting"))
story.append(hr())

story.append(sub_header("16.1 Market Size (MD/PA/DE Focus)"))
story.append(bullet("Estimated roofing contractors in MD/PA/DE: ~3,500-5,000"))
story.append(bullet("Active storm damage contractors (target market): ~800-1,200"))
story.append(bullet("Average supplements per contractor per month: 5-15"))
story.append(bullet("Average policy decodes needed per contractor per month: 10-30"))
story.append(bullet("Total addressable market (TAM) in target region: ~$2M-4M/month"))

story.append(Spacer(1, 10))
story.append(sub_header("16.2 Conservative Growth Scenarios"))

forecast = [
    ["Month", "Pay-Per-Use", "Starter", "Growth", "Pro+", "MRR", "Notes"],
    ["Month 1", "20 users", "3", "0", "0", "$2,760", "Launch: organic + direct outreach"],
    ["Month 3", "40 users", "8", "2", "0", "$8,460", "Word of mouth, DC leads converting"],
    ["Month 6", "60 users", "15", "5", "2", "$18,350", "Meta ads scaling, enterprise interest"],
    ["Month 9", "80 users", "20", "10", "5", "$33,750", "Case studies published, referrals"],
    ["Month 12", "100 users", "25", "15", "10", "$53,475", "Market penetration ~5% of target"],
]
story.append(make_table(
    forecast[0], forecast[1:],
    col_widths=[55, 65, 45, 45, 35, 60, 185]
))
story.append(Spacer(1, 4))
story.append(body(
    "<b>Assumptions:</b> Pay-per-use users average $80/month. MRR calculations use midpoint tier pricing. "
    "Churn estimated at 5-8% monthly for pay-per-use, 3-5% for subscription tiers."
))

story.append(Spacer(1, 10))
story.append(sub_header("16.3 Revenue Milestones"))
story.append(bullet("<b>$10K MRR:</b> ~Month 3-4. Achievable with 10 Starter + 2 Growth + organic pay-per-use"))
story.append(bullet("<b>$25K MRR:</b> ~Month 6-7. Requires enterprise interest or strong Growth tier adoption"))
story.append(bullet("<b>$50K MRR:</b> ~Month 10-12. Requires expansion beyond MD/DE/PA or strong enterprise accounts"))
story.append(bullet("<b>$100K MRR:</b> ~Month 18-24. Requires multi-state expansion (VA, NJ, NY, OH)"))

story.append(Spacer(1, 10))
story.append(sub_header("16.4 Key Metrics to Track"))
story.append(bullet("MRR / ARR"))
story.append(bullet("Supplement approval rate (target: >70%) — proves product works"))
story.append(bullet("Average recovery per supplement ($) — proves ROI"))
story.append(bullet("Decoder-to-supplement conversion rate — measures upsell efficiency"))
story.append(bullet("DecodeCoverage lead-to-contractor conversion — measures B2C funnel"))
story.append(bullet("Churn rate by tier"))
story.append(bullet("Net Revenue Retention (NRR) — are users upgrading tiers?"))
story.append(bullet("Cost per acquisition (CPA) by channel"))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  17. SALES & OUTREACH STRATEGY
# ══════════════════════════════════════════════════════════════
story.append(section_header("17. Sales & Outreach Strategy"))
story.append(hr())

story.append(sub_header("17.1 Sales Motion"))
story.append(body(
    "4Margin is a product-led growth (PLG) play with a B2C acquisition funnel feeding the B2B core. "
    "The sales motion has three stages:"
))

story.append(sub3("Stage 1: Free Value (DecodeCoverage)"))
story.append(bullet("Homeowner uploads policy, gets free AI decode"))
story.append(bullet("Sees risk score, landmines, favorable provisions"))
story.append(bullet("Downloads PDF report, enters email for follow-up"))
story.append(bullet("Converted into lead with full policy data attached"))
story.append(bullet("<b>Key insight:</b> The homeowner gives us the data we need to sell the contractor"))

story.append(sub3("Stage 2: Contractor Demo (Policy Decoder)"))
story.append(bullet("Contractor signs up, gets first decode free"))
story.append(bullet("Uploads a real policy they're working on — immediate value"))
story.append(bullet("Sees carrier behavioral profile + pre-inspection coaching"))
story.append(bullet("Downloads professional PDF they can show the homeowner"))
story.append(bullet("<b>Conversion trigger:</b> 'Now imagine getting a full supplement with 3-pillar justification for $149'"))

story.append(sub3("Stage 3: Supplement Subscription"))
story.append(bullet("After 2-3 successful decodes, contractor sees the pattern"))
story.append(bullet("Supplement product becomes the upsell — 'you decode it, we supplement it'"))
story.append(bullet("Enterprise tier for multi-office operations"))
story.append(bullet("<b>Retention driver:</b> Intelligence loop means the product gets better the more they use it"))

story.append(Spacer(1, 10))
story.append(sub_header("17.2 Outreach Channels"))

channels = [
    ["Channel", "Method", "Expected CPA", "Volume"],
    ["Meta/Facebook Ads", "Targeted ads to roofing contractor groups in MD/PA/DE. Creative: 'Stop leaving money on the table'", "$30-60", "High"],
    ["Google Ads", "Keywords: 'insurance supplement software', 'roofing supplement help', 'Xactimate supplement'", "$50-100", "Medium"],
    ["Roofing Facebook Groups", "Organic posts showing real supplement results (redacted). Value-first content.", "$0", "Medium"],
    ["Local Roofing Associations", "Sponsor MD/PA/DE roofing association events. Demo at meetings.", "$200-500", "Low but high-quality"],
    ["Storm Chaser Networks", "Partner with storm chasers who need fast supplement turnaround", "$20-40", "High after storms"],
    ["Referral Program", "Contractor refers contractor, both get 1 free supplement", "$0-50", "Grows with base"],
    ["DecodeCoverage Leads", "Homeowner leads matched to contractors in their ZIP code", "$0.15 (API cost)", "Scales with ad spend"],
]
story.append(make_table(
    channels[0], channels[1:],
    col_widths=[100, 210, 60, 60]
))

story.append(Spacer(1, 10))
story.append(sub_header("17.3 Sales Collateral Needed"))
story.append(bullet("<b>Before/After case study:</b> Show adjuster estimate vs 4Margin supplement — dollars recovered"))
story.append(bullet("<b>ROI calculator:</b> Input jobs/month, get projected additional revenue"))
story.append(bullet("<b>Demo video:</b> 2-minute walkthrough: upload policy, decode, supplement, download"))
story.append(bullet("<b>Competitor comparison:</b> 4Margin vs manual writer vs supplement company (cost, speed, quality)"))
story.append(bullet("<b>Testimonial program:</b> First 10 contractors get free tier in exchange for documented results"))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  18. LEAD GENERATION ENGINE
# ══════════════════════════════════════════════════════════════
story.append(section_header("18. Lead Generation Engine"))
story.append(hr())
story.append(body(
    "4Margin has a built-in lead generation engine through DecodeCoverage (B2C) that no competitor has. "
    "The system creates a two-sided marketplace dynamic: homeowners get free policy analysis, "
    "contractors get qualified leads with full policy data already parsed."
))

story.append(sub_header("18.1 DecodeCoverage Funnel"))
story.append(body("<b>Acquisition Flow:</b>"))
story.append(bullet("<b>Step 1 — Ad:</b> Meta/Google ad targeting homeowners after storms in MD/PA/DE. "
                     "Creative: 'Is your insurance covering everything? Free AI policy analysis in 60 seconds.'"))
story.append(bullet("<b>Step 2 — Landing:</b> decodecoverage.com — value prop, social proof, 3-step form"))
story.append(bullet("<b>Step 3 — Upload:</b> Homeowner uploads policy PDF + enters basic info (name, email, ZIP)"))
story.append(bullet("<b>Step 4 — Results:</b> AI decode shows coverages, risk score, landmines, favorable provisions"))
story.append(bullet("<b>Step 5 — PDF Report:</b> Download professional PDF, enter email for full report"))
story.append(bullet("<b>Step 6 — Email Sequence:</b> Automated follow-up: 'Here is what you should know before your adjuster arrives...'"))
story.append(bullet("<b>Step 7 — Contractor Match:</b> Lead is offered to contractors in that ZIP code"))

story.append(Spacer(1, 10))
story.append(sub_header("18.2 Built-in Lead Qualification"))
story.append(body("Every DecodeCoverage lead comes pre-qualified with data contractors would normally have to gather themselves:"))
story.append(bullet("Full policy PDF (already parsed by AI)"))
story.append(bullet("Coverage amounts, deductible type, endorsements"))
story.append(bullet("Risk score — contractor knows upfront if this is a good lead or a landmine"))
story.append(bullet("Carrier name — contractor knows which behavioral profile applies"))
story.append(bullet("Property ZIP — instant jurisdiction matching"))
story.append(bullet("Homeowner contact info + consent"))
story.append(bullet("<b>This is the highest-quality lead a roofing contractor can get</b> — pre-qualified with full policy data"))

story.append(Spacer(1, 10))
story.append(sub_header("18.3 Automated Email Sequences (Built into DecodeCoverage)"))
story.append(body("The B2C app has 4 automated email cron jobs already built:"))
email_seq = [
    ["/api/cron/email-sequence", "Drip sequence", "Multi-touch follow-up after initial decode (education, next steps, contractor intro)"],
    ["/api/cron/weather-alerts", "Storm triggers", "When storms hit a lead's ZIP code, send alert: 'Time to use your policy analysis'"],
    ["/api/cron/anniversary", "Anniversary", "Policy renewal date reminders — re-engage leads when their policy renews"],
    ["/api/cron/retrigger", "Retrigger", "Re-engage cold leads with new content or updated analysis"],
]
story.append(make_table(
    ["Endpoint", "Type", "Description"],
    email_seq,
    col_widths=[130, 70, 290]
))

story.append(Spacer(1, 10))
story.append(sub_header("18.4 Policy Check Flow ($29 Product)"))
story.append(body(
    "The contractor-initiated Policy Check is a hybrid lead gen + revenue product:"
))
story.append(bullet("Contractor sends homeowner a link to upload their policy"))
story.append(bullet("Homeowner uploads, 4Margin AI analyzes, results emailed to both"))
story.append(bullet("Contractor pays $29 — but gets a qualified lead with full policy data"))
story.append(bullet("Homeowner gets value and is connected to the contractor"))
story.append(bullet("<b>Conversion path:</b> Homeowner uploads via policy check, contractor sees decoded results, "
                     "contractor upgrades to supplement if the policy supports it"))

story.append(Spacer(1, 10))
story.append(sub_header("18.5 Lead Gen Unit Economics"))
story.append(bullet("<b>Cost per DecodeCoverage lead:</b> Meta ad ($5-15) + Claude API ($0.15) = <b>$5.15-15.15</b>"))
story.append(bullet("<b>Value of lead to contractor:</b> If 20% of leads become jobs, and average job profit is $3,000-5,000, "
                     "each lead is worth <b>$600-1,000</b>"))
story.append(bullet("<b>Lead sale pricing opportunity:</b> Sell qualified leads to contractors at $25-75 each "
                     "(in addition to subscription revenue)"))
story.append(bullet("<b>Flywheel:</b> More ad spend on DC = more leads = more contractors sign up = more supplement revenue = "
                     "fund more ad spend"))
story.append(PageBreak())


# ══════════════════════════════════════════════════════════════
#  19. RECOMMENDED NEXT STEPS
# ══════════════════════════════════════════════════════════════
story.append(section_header("19. Recommended Next Steps"))
story.append(hr())

story.append(sub_header("Immediate (This Week)"))
story.append(bullet("<b>Apply migrations 034-038</b> to production Supabase"))
story.append(bullet("<b>Fix pricing inconsistency:</b> Decide final pricing structure, update Stripe constants + all UI copy"))
story.append(bullet("<b>Deprecate legacy manufacturer exports</b> — update all imports to modern all-6 versions"))
story.append(bullet("<b>Wire 3 intake questions into pipeline.ts</b> — inject gutters/warranty/pre-existing into Claude prompt"))
story.append(bullet("<b>Wire intake questions into pre-inspection prompt</b> — use warranty field for rebuttal angle"))
story.append(bullet("<b>Deploy current codebase</b> to Vercel, verify no build errors"))

story.append(sub_header("Short Term (Next 1-2 Weeks)"))
story.append(bullet("<b>Receive Xactimate data + top 25 denials</b> document"))
story.append(bullet("<b>Fix supplement pipeline</b> — investigate Vercel Fluid Compute, implement QStash chaining"))
story.append(bullet("<b>Expand JUSTIFICATION_MATRIX</b> — add all 6 manufacturer refs + SDG/GTR codes"))
story.append(bullet("<b>Resolve KB dual source of truth</b> — decide: DB tables vs static TS files"))
story.append(bullet("<b>Clean up dead pre_inspection code</b> — remove from AdvocacyScripts type + old API route"))
story.append(bullet("<b>Update all 3 agent prompt documents</b> to reflect current state (29 codes, intake Qs, decoder pre-inspection)"))
story.append(bullet("<b>Re-populate KB tracking sheet</b> from codebase (29 codes, 43 counties, 48 mfg reqs)"))

story.append(sub_header("Medium Term (2-4 Weeks)"))
story.append(bullet("<b>Supplement engine revamp</b> using real Xactimate data + top 25 denials"))
story.append(bullet("<b>Build approval talking points</b> for supplement detail page (replaces old pre-inspection location)"))
story.append(bullet("<b>Add siding manufacturer requirements</b> — James Hardie, LP SmartSide, CertainTeed vinyl to match IRC R703.x codes"))
story.append(bullet("<b>Map guttersNailedThroughDripEdge intake answer</b> to IRC-R903.4-DR auto-trigger in code engine"))
story.append(bullet("<b>Build warranty rebuttal framework</b> — roofUnderWarranty = yes triggers warranty angle in rebuttals"))
story.append(bullet("<b>Implement 8-tier pricing model</b> in Stripe + update all checkout flows"))
story.append(bullet("<b>Complete KB Phase 4 manual verification</b> (two-person effort with updated tracking sheet)"))

story.append(sub_header("Pre-Launch Final"))
story.append(bullet("<b>All migrations applied and verified</b> (034-038 + any new)"))
story.append(bullet("<b>All tests passing (449+)</b> — run full suite including updated cross-reference tests"))
story.append(bullet("<b>Stripe products created in production</b> matching final pricing model"))
story.append(bullet("<b>Landing page copy updated</b> — decoder-first messaging, correct pricing"))
story.append(bullet("<b>Legal review of privacy/terms</b>"))
story.append(bullet("<b>DNS configured, SSL provisioned</b>"))
story.append(bullet("<b>Error monitoring active (Sentry)</b>"))
story.append(bullet("<b>End-to-end pipeline test in production</b> — verify supplement generation actually returns items"))

story.append(Spacer(1, 30))
story.append(hr())
story.append(Paragraph(
    "End of Audit Document",
    ParagraphStyle("EndNote", parent=styles["AuditSubtitle"],
                   fontSize=10, textColor=GRAY_500)
))
story.append(Paragraph(
    f"Generated {datetime.now().strftime('%B %d, %Y at %I:%M %p')} &bull; 4Margin Project Audit v1.0",
    ParagraphStyle("EndDate", parent=styles["AuditSubtitle"],
                   fontSize=8, textColor=GRAY_500)
))


# ── BUILD PDF ───────────────────────────────────────────────
doc.build(story, onFirstPage=draw_background, onLaterPages=draw_background)
print(f"\nPDF generated successfully!")
print(f"Output: {output_path}")
print(f"Pages: ~{doc.page}")
