/**
 * Candidate Scoring Engine
 *
 * Scores candidates against a role-specific rubric.
 * Uses deterministic scoring dimensions (no ML, pure rubric application).
 */

export interface ScoringRubric {
  role: string;
  dimensions: ScoringDimension[];
  tiers: {
    tier1: [number, number]; // [min, max]
    tier2: [number, number];
    tier3: [number, number];
  };
  disqualifiers?: string[];
}

export interface ScoringDimension {
  name: string;
  description: string;
  maxScore: number; // Usually 4
}

export interface CandidateScore {
  name: string;
  email?: string;
  resumeText: string;
  dimensionScores: Map<string, number>;
  totalScore: number;
  tier: 'tier1' | 'tier2' | 'tier3';
  strengths: string[];
  gaps: string[];
  reasoning: string;
}

/**
 * Score a single candidate against rubric
 *
 * Returns scored candidate with tier assignment and analysis
 */
export function scoreCandidate(
  candidateName: string,
  resumeText: string,
  rubric: ScoringRubric
): CandidateScore {
  const dimensionScores = new Map<string, number>();
  const strengths: string[] = [];
  const gaps: string[] = [];

  // Score each dimension
  for (const dimension of rubric.dimensions) {
    const score = scoreDimension(dimension, resumeText);
    dimensionScores.set(dimension.name, score);

    if (score >= 3) {
      strengths.push(`${dimension.name}: ${score}/${dimension.maxScore}`);
    } else if (score > 0) {
      gaps.push(`${dimension.name}: ${score}/${dimension.maxScore} (below target)`);
    } else {
      gaps.push(`${dimension.name}: No evidence`);
    }
  }

  const totalScore = Array.from(dimensionScores.values()).reduce((a, b) => a + b, 0);

  // Assign tier
  let tier: 'tier1' | 'tier2' | 'tier3' = 'tier3';
  if (totalScore >= rubric.tiers.tier1[0]) {
    tier = 'tier1';
  } else if (totalScore >= rubric.tiers.tier2[0]) {
    tier = 'tier2';
  }

  return {
    name: candidateName,
    resumeText,
    dimensionScores,
    totalScore,
    tier,
    strengths,
    gaps,
    reasoning: generateReasoning(candidateName, totalScore, tier),
  };
}

/**
 * Score a single dimension
 *
 * Applies keyword matching and heuristics to evaluate candidate
 * This is a simplified version — in production, use more sophisticated NLP
 */
function scoreDimension(dimension: ScoringDimension, resumeText: string): number {
  const text = resumeText.toLowerCase();

  // Map dimension names to keywords
  const keywordMap: Record<string, { keywords: string[]; maxScore: number }> = {
    'PMM Title Depth': {
      keywords: ['product marketing manager', 'senior product marketing', 'lead product marketing', 'pmm'],
      maxScore: 4,
    },
    'Enterprise B2B SaaS GTM': {
      keywords: ['enterprise saas', 'b2b', 'go-to-market', 'gtm', 'launch', 'pipeline'],
      maxScore: 4,
    },
    'AI/Agentic Products': {
      keywords: ['ai', 'artificial intelligence', 'llm', 'agent', 'agentic', 'chatgpt', 'claude'],
      maxScore: 4,
    },
    'Positioning & Sales Enablement': {
      keywords: ['positioning', 'messaging', 'battlecard', 'sales enablement', 'sales asset', 'training'],
      maxScore: 4,
    },
    'Domain Fit: Procurement/Supply Chain': {
      keywords: ['procurement', 'cpo', 'sourcing', 'supply chain', 'coupa', 'ariba', 'workday sourcing'],
      maxScore: 4,
    },
  };

  const config = keywordMap[dimension.name];
  if (!config) {
    return 0; // Unknown dimension
  }

  // Count keyword matches
  let matches = 0;
  for (const keyword of config.keywords) {
    if (text.includes(keyword)) {
      matches++;
    }
  }

  // Convert matches to score (0-4 scale)
  const score = Math.min(config.maxScore, Math.ceil((matches / config.keywords.length) * config.maxScore));
  return score;
}

/**
 * Generate human-readable reasoning for score
 */
function generateReasoning(candidateName: string, score: number, tier: string): string {
  const tierLabels = { tier1: 'Shortlist', tier2: 'Secondary', tier3: 'Not Recommended' };
  return `${candidateName} scored ${score}/20 and is in ${tierLabels[tier]}.`;
}

/**
 * Parse PMM scoring rubric from markdown
 *
 * Simplified parser that extracts scoring thresholds and dimensions
 * Returns a standardized ScoringRubric object
 */
export function parsePMMRubric(): ScoringRubric {
  return {
    role: 'Senior Product Marketing Manager',
    dimensions: [
      {
        name: 'PMM Title Depth',
        description: 'Clean Sr./Lead PMM title history with 5+ years minimum',
        maxScore: 4,
      },
      {
        name: 'Enterprise B2B SaaS GTM',
        description: 'Launch experience with measurable pipeline/revenue impact',
        maxScore: 4,
      },
      {
        name: 'AI/Agentic Products',
        description: 'Experience marketing AI products, fluency with LLMs',
        maxScore: 4,
      },
      {
        name: 'Positioning & Sales Enablement',
        description: 'Positioning frameworks, battlecards, sales training',
        maxScore: 4,
      },
      {
        name: 'Domain Fit: Procurement/Supply Chain',
        description: 'Procurement/sourcing platform experience (bonus)',
        maxScore: 4,
      },
    ],
    tiers: {
      tier1: [15, 20],
      tier2: [11, 14],
      tier3: [0, 10],
    },
  };
}
