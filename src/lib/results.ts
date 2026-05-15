import { scoreCandidate, parsePMMRubric, CandidateScore } from './scoring';
import { postSlackMessage } from './slack';

/**
 * Format scored candidates for Slack posting
 *
 * Returns markdown-formatted message with Tier 1 candidates
 */
export async function formatAndPostResults(
  candidates: CandidateScore[],
  botToken: string,
  channel: string,
  threadTs?: string
): Promise<void> {
  // Filter Tier 1 candidates
  const tier1 = candidates.filter((c) => c.tier === 'tier1').sort((a, b) => b.totalScore - a.totalScore);

  if (tier1.length === 0) {
    await postSlackMessage(
      botToken,
      channel,
      '📊 Evaluation complete. No Tier 1 candidates found in this batch.',
      threadTs
    );
    return;
  }

  // Build message for each Tier 1 candidate
  for (const candidate of tier1) {
    const message = formatCandidateMessage(candidate);
    await postSlackMessage(botToken, channel, message, threadTs);
  }

  // Summary
  const summary = `:bar_chart: *Evaluation Summary*
- Total reviewed: ${candidates.length}
- Tier 1: ${tier1.length}
- Tier 2: ${candidates.filter((c) => c.tier === 'tier2').length}
- Tier 3: ${candidates.filter((c) => c.tier === 'tier3').length}`;

  await postSlackMessage(botToken, channel, summary, threadTs);
}

/**
 * Format single candidate for Slack
 */
function formatCandidateMessage(candidate: CandidateScore): string {
  const scoreTable = Array.from(candidate.dimensionScores.entries())
    .map(([dim, score]) => `• ${dim}: ${score}/4`)
    .join('\n');

  const strengthsList = candidate.strengths.map((s) => `• ${s}`).join('\n');
  const gapsList = candidate.gaps.map((g) => `• ${g}`).join('\n');

  return `
:star: *${candidate.name}* — Score: *${candidate.totalScore}/20*

*Dimension Breakdown:*
${scoreTable}

*Strengths:*
${strengthsList || '(none)'}

*Gaps:*
${gapsList || '(none)'}

_${candidate.reasoning}_
`;
}
