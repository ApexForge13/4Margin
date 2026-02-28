/**
 * Plain-English finding templates for common policy issues.
 * Maps landmine names/categories to homeowner-friendly explanations.
 */

export interface FindingTemplate {
  title: string;
  explanation: string;
  actionRec: string;
}

/**
 * Returns a plain-English finding for a known landmine type,
 * with dynamic values interpolated from analysis data.
 */
export function getPlainEnglishFinding(
  landmine: {
    name: string;
    category?: string;
    severity: string;
    impact: string;
    actionItem?: string;
  },
  context?: {
    dwellingCoverage?: number;
    rebuildEstimate?: number;
    state?: string;
    windHailDeductiblePct?: number;
    homeValue?: number;
    windHailDeductibleDollar?: number;
    liabilityLimit?: number;
    personalPropertyLimit?: number;
    depreciationMethod?: string;
  }
): FindingTemplate | null {
  const name = landmine.name?.toLowerCase() || "";
  const cat = landmine.category?.toLowerCase() || "";
  const st = context?.state || "your state";

  // Wind/Hail Deductible Gap
  if (
    name.includes("wind") ||
    name.includes("hail") ||
    cat.includes("wind") ||
    cat.includes("hail")
  ) {
    if (context?.windHailDeductiblePct && context?.homeValue) {
      const oop = Math.round(
        (context.windHailDeductiblePct / 100) * context.homeValue
      );
      return {
        title: "Wind/Hail Deductible Gap",
        explanation: `Your wind/hail deductible is ${context.windHailDeductiblePct}% of your dwelling coverage. On a $${context.homeValue.toLocaleString()} home, that means you'd owe approximately $${oop.toLocaleString()} out of pocket before insurance pays anything for wind or hail damage. Most homeowners in ${st} don't realize this until they file a claim.`,
        actionRec:
          "Ask your agent about lowering your wind/hail deductible or switching to a flat-dollar deductible.",
      };
    }
    if (context?.windHailDeductibleDollar) {
      return {
        title: "Wind/Hail Deductible Gap",
        explanation: `Your wind/hail deductible is $${context.windHailDeductibleDollar.toLocaleString()}. You'd owe this out of pocket before insurance pays anything for wind or hail damage. Most homeowners in ${st} don't realize this until they file a claim.`,
        actionRec:
          "Ask your agent about lowering your wind/hail deductible.",
      };
    }
  }

  // Dwelling Underinsurance
  if (
    name.includes("dwelling") ||
    name.includes("underinsur") ||
    cat.includes("dwelling")
  ) {
    if (context?.dwellingCoverage && context?.rebuildEstimate) {
      const gap = context.rebuildEstimate - context.dwellingCoverage;
      if (gap > 0) {
        return {
          title: "Dwelling Underinsurance",
          explanation: `Your dwelling coverage is $${context.dwellingCoverage.toLocaleString()}, but the estimated cost to rebuild a home like yours is approximately $${context.rebuildEstimate.toLocaleString()}. That's a gap of $${gap.toLocaleString()}. If your home were destroyed, your policy might not cover the full cost to rebuild.`,
          actionRec:
            "Request a rebuild cost estimate from your agent and adjust your dwelling coverage accordingly.",
        };
      }
    }
  }

  // ACV vs RCV
  if (
    name.includes("acv") ||
    name.includes("actual cash value") ||
    name.includes("depreciat") ||
    cat.includes("depreciation")
  ) {
    return {
      title: "Actual Cash Value (ACV) Depreciation",
      explanation:
        "Your policy pays claims based on Actual Cash Value, which means insurance deducts for depreciation. On a 10-year-old roof, that could mean getting $8,000 on a $15,000 replacement — leaving you to cover the difference. Replacement Cost Value policies pay the full cost to replace, regardless of age.",
      actionRec:
        "Ask about upgrading to Replacement Cost Value (RCV) coverage — it typically costs $50-150 more per year but covers the full replacement.",
    };
  }

  // Flood Exclusion
  if (
    name.includes("flood") ||
    cat.includes("flood")
  ) {
    return {
      title: "Flood Exclusion",
      explanation:
        "Your policy does not include flood coverage. Standard homeowners policies almost never do. If your property is in or near a flood zone, a separate flood policy is typically recommended. FEMA flood maps for your area can show your specific risk level.",
      actionRec:
        "Check your flood zone status at FEMA.gov and consider a separate flood policy if you're in a moderate-to-high risk area.",
    };
  }

  // Liability Limits
  if (
    name.includes("liability") ||
    cat.includes("liability")
  ) {
    const limit = context?.liabilityLimit;
    return {
      title: "Liability Limits",
      explanation: limit
        ? `Your personal liability limit is $${limit.toLocaleString()}. For homeowners with significant assets, most financial advisors recommend at least $500,000 in liability coverage, often supplemented with an umbrella policy.`
        : "Your personal liability coverage may be below recommended levels. Most financial advisors recommend at least $500,000 in liability coverage for homeowners, often supplemented with an umbrella policy.",
      actionRec:
        "Consider increasing your liability limit and adding an umbrella policy for broader protection.",
    };
  }

  // Personal Property
  if (
    name.includes("personal property") ||
    cat.includes("personal_property") ||
    cat.includes("contents")
  ) {
    const limit = context?.personalPropertyLimit;
    return {
      title: "Personal Property Coverage",
      explanation: limit
        ? `Your personal property coverage is $${limit.toLocaleString()}. This covers your belongings (furniture, electronics, clothing, etc.) if they're damaged or stolen. The average American household has approximately $100,000+ in personal property. If your coverage is below this, you may want to consider increasing it.`
        : "Your personal property coverage may not be enough to replace all your belongings. The average American household has approximately $100,000+ in personal property.",
      actionRec:
        "Do a quick home inventory and compare the total to your personal property limit. Consider increasing coverage if there's a gap.",
    };
  }

  // No template match — return null (caller should fall back to raw data)
  return null;
}
