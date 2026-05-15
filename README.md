# Recruiting Analysis Agent

Role-agnostic candidate evaluation system. Deploy on Cloudflare Workers.

## Quick Start

1. **Provide a Job Description** → `memory/job_descriptions/{company}_{role}.md`
2. **Create a Scoring Rubric** → `prompts/{role_slug}_scoring_rubric.md` (or use existing)
3. **Upload Resumes** → PDF or text
4. **Agent scores candidates** → Outputs ranked slate to `outputs/`
5. **Tier 1 candidates posted to Slack** → `#candidate-review` channel (if configured)

## File Structure

```
.
├── claude.md                          # Agent instructions (role-agnostic)
├── wrangler.toml                      # Cloudflare Worker config (TBD)
├── src/
│   └── worker.ts                      # Cloudflare Worker entry point (TBD)
├── memory/
│   └── job_descriptions/
│       └── fairmarkit_sr_pmm.md      # Example: Fairmarkit Sr. PMM JD
├── prompts/
│   ├── pmm_scoring_rubric.md         # PMM scoring dimensions
│   ├── slack_posting.md               # Slack integration code
│   └── [other rubrics...]             # Add role-specific rubrics
├── outputs/
│   └── fairmarkit_sr_pmm_2026-05-14_evals.md  # Example evaluation
├── config/
│   └── README.md                      # Config template
└── .gitignore
```

## Example: Fairmarkit Sr. PMM

**Candidates Reviewed:** 9  
**Tier 1:** 2 (Michael Douglas 17/20, Alejandro Rodriguez 16/20)  
**Tier 2:** 2  
**Tier 3:** 5  

**Top Recommendation:** Michael Douglas (AI agent/orchestration expertise, 15 years clean Sr. PMM history)

## Scoring Rubric: PMM Roles

5 dimensions (0–4 each, max 20):
1. **PMM Title Depth** — Clean Sr. PMM tenure (7+ years)
2. **Enterprise B2B SaaS GTM** — Launch experience, revenue impact
3. **AI/Agentic Products** — AI product expertise, LLM fluency
4. **Positioning & Sales Enablement** — Messaging, battlecards, sales training
5. **Domain Fit** — Role-specific (e.g., procurement/sourcing for Fairmarkit)

**Tier Thresholds:**
- **Tier 1:** 15–20 (shortlist)
- **Tier 2:** 11–14 (secondary)
- **Tier 3:** 0–10 (not recommended)

## Slack Integration

**Setup:**
1. Create Slack Incoming Webhook → `#candidate-review` channel
2. Store webhook URL in `config/.slack_config.json` (see example)
3. Enable posting in config

**Automatic:** After scoring, all Tier 1 candidates posted to Slack with:
- Score breakdown
- Key strengths & gaps
- Contact info
- Link to full evaluation

## Adding New Roles

1. **Create JD:** `memory/job_descriptions/{company}_{role_slug}.md`
2. **Create Rubric:** `prompts/{role_slug}_scoring_rubric.md`
   - Define 4–5 dimensions (0–4 scale each)
   - Set tier thresholds (Tier 1, 2, 3)
   - Document disqualifying criteria
3. **Upload resumes** → Agent will find rubric and score automatically

## Deployment

### Cloudflare Workers

**TBD:** Configure `wrangler.toml` and `src/worker.ts` for Cloudflare deployment.

Features:
- @mention bot in Slack
- Upload JD + resumes
- Bot downloads files, scores, posts results
- Serverless, no infrastructure

---

**Questions?** See `claude.md` for full agent instructions.