import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const {
      email,
      carrier,
      state,
      dwellingCoverage,
      yearBuilt,
      deductible,
      utmSource,
      utmMedium,
      utmCampaign,
    } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Build an estimated score based on quiz answers
    const estimatedScore = estimateScore({
      carrier,
      state,
      dwellingCoverage,
      yearBuilt,
      deductible,
    });

    // Create lead with quiz data
    const { data: lead, error: insertErr } = await supabase
      .from("consumer_leads")
      .insert({
        email,
        carrier: carrier || null,
        property_address: state ? `${state}` : null,
        status: "quiz_complete",
        policy_score: estimatedScore.score,
        policy_grade: estimatedScore.grade,
        policy_analysis: {
          source: "quiz",
          carrier,
          state,
          dwellingCoverage,
          yearBuilt,
          deductible,
          estimatedFindings: estimatedScore.findings,
          riskLevel: estimatedScore.score >= 80 ? "low" : estimatedScore.score >= 60 ? "medium" : "high",
          summaryForContractor: estimatedScore.summary,
        },
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
      })
      .select("id")
      .single();

    if (insertErr || !lead) {
      console.error("[quiz] Insert error:", insertErr);
      return NextResponse.json(
        { error: "Failed to save quiz results" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: lead.id });
  } catch (err) {
    console.error("[quiz] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

interface QuizInput {
  carrier: string;
  state: string;
  dwellingCoverage: number | null;
  yearBuilt: number | null;
  deductible: number | null;
}

interface EstimatedResult {
  score: number;
  grade: string;
  findings: string[];
  summary: string;
}

function estimateScore(input: QuizInput): EstimatedResult {
  let score = 75; // Start at baseline
  const findings: string[] = [];

  // High-deductible penalty
  if (input.deductible && input.deductible >= 5000) {
    score -= 10;
    findings.push("Your deductible is above $5,000 — you'll pay more out of pocket before coverage kicks in.");
  } else if (input.deductible && input.deductible >= 2500) {
    score -= 5;
    findings.push("Your deductible is moderately high at $" + input.deductible.toLocaleString() + ".");
  }

  // Older home risk
  if (input.yearBuilt && input.yearBuilt < 1980) {
    score -= 8;
    findings.push("Homes built before 1980 often have outdated plumbing, wiring, or roofing that may not be fully covered.");
  } else if (input.yearBuilt && input.yearBuilt < 2000) {
    score -= 3;
    findings.push("Your home's age may mean some systems are nearing replacement — check that your dwelling coverage reflects current rebuild costs.");
  }

  // Dwelling coverage check
  if (input.dwellingCoverage && input.dwellingCoverage < 200000) {
    score -= 8;
    findings.push("Your dwelling coverage may be below current rebuild costs in most markets.");
  }

  // State-specific risks
  const highWindStates = ["FL", "TX", "LA", "SC", "NC", "GA", "AL", "MS", "OK"];
  if (highWindStates.includes(input.state)) {
    score -= 5;
    findings.push(`${input.state} is a high wind/hail risk state — make sure you understand your wind/hail deductible (it's often a separate, higher percentage).`);
  }

  // Clamp score
  score = Math.max(20, Math.min(100, score));

  const grade =
    score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : "F";

  if (findings.length === 0) {
    findings.push("Based on your answers, your coverage appears reasonable — but only a full policy review can confirm.");
  }

  const summary =
    score >= 80
      ? "Based on your answers, your coverage looks solid. Upload your full policy for a detailed analysis."
      : score >= 60
        ? "We spotted some potential concerns. Upload your policy for a complete AI-powered breakdown."
        : "Your answers suggest some significant coverage gaps. We strongly recommend uploading your full policy for a detailed review.";

  return { score, grade, findings, summary };
}
