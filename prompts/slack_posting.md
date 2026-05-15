# Slack Posting Integration

## Purpose
Post Tier 1 candidates to Slack #candidate-review channel automatically after scoring completes.

## Configuration
- **Webhook URL:** Stored in `config/.slack_config.json` (not exposed)
- **Channel:** #candidate-review
- **Trigger:** After all candidates scored, before generating full evals output

## Integration

After scoring completes:
1. Identify Tier 1 candidates
2. Format each with score, strengths, gaps, contact info
3. POST to Slack webhook
4. Confirm posting in summary

## Security
- Webhook URL stored in `config/.slack_config.json`
- File is in `.gitignore` — never commit
- Do not expose URL in logs or outputs