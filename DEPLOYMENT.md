# Deployment Guide: Cloudflare Workers + Slack Integration

## Prerequisites

- Cloudflare account with Workers enabled
- `wrangler` CLI installed (`npm install -g @cloudflare/wrangler`)
- Slack app with Bot Token and Signing Secret
- A custom domain or Cloudflare Workers route

---

## Step 1: Set Up Local Environment

```bash
# Clone repo and install dependencies
git clone https://github.com/nicoleelisabeth7/recruiting-agent.git
cd recruiting-agent
npm install
```

---

## Step 2: Add Secrets to Wrangler

Add your Slack Bot Token and Signing Secret as Wrangler secrets (never commit these):

```bash
# Bot Token (from Slack app OAuth & Permissions)
wrangler secret put SLACK_BOT_TOKEN
# Paste your xoxb-... token when prompted

# Signing Secret (from Slack app Basic Information > App Credentials)
wrangler secret put SLACK_SIGNING_SECRET
# Paste your signing secret when prompted
```

Secrets are stored securely in Cloudflare Workers, never exposed locally or committed to git.

---

## Step 3: Update Slack App Event Subscriptions

1. Go to your Slack app settings → **Event Subscriptions**
2. Enable Event Subscriptions
3. Set **Request URL** to your Cloudflare Workers URL:
   - **Format:** `https://{worker-name}.{subdomain}.workers.dev/slack/events`
   - **Example:** `https://recruiting-agent.nicoleelisabeth7.workers.dev/slack/events`
4. Slack will POST a challenge; Workers will respond automatically ✓
5. Under **Subscribe to bot events**, add:
   - `app_mention`
   - `file_shared`
6. Save changes

---

## Step 4: Deploy to Cloudflare

### Development (local testing)

```bash
# Start local development server
wrangler dev

# Worker will run on http://localhost:8787
# You can test the /health endpoint:
# curl http://localhost:8787/health
```

### Production (deploy)

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# Output will show your production URL
```

---

## Step 5: Configure Cloudflare Route (Optional)

If you want a custom domain (e.g., `recruiting-agent.fairmarkit.com`):

1. In Cloudflare Dashboard → **Workers Routes**
2. Add route: `recruiting-agent.fairmarkit.com/*` → Select Worker
3. DNS must be pointed to Cloudflare for the domain

---

## Step 6: Test Slack Integration

1. In your Slack workspace, go to **#candidate-review** channel (or any channel)
2. Type: `@recruiting-agent` + attach a PDF (JD or resume)
3. Worker should:
   - Receive the @mention event
   - Download the file
   - Process it (when PDF parsing is fully integrated)
   - Post results back

---

## Environment Variables

Available in `wrangler.toml`:

```toml
[env.production]
vars = { LOG_LEVEL = "info" }

[env.development]
vars = { LOG_LEVEL = "debug" }
```

Access in code:
```typescript
const logLevel = env.LOG_LEVEL;
```

---

## Troubleshooting

### "Slack request signature verification failed"
- Verify SLACK_SIGNING_SECRET is set correctly
- Check that request timestamp is within 5 minutes

### "Failed to download file"
- Confirm Bot Token is correct and has `files:read` scope
- Check file URL is not expired (Slack tokens expire after ~12h for downloads)

### Worker returns 404
- Confirm Request URL in Slack Event Subscriptions matches your worker domain
- Check that `/slack/events` route is defined in `wrangler.toml`

### PDFs not parsing
- PDF parsing requires additional dependencies (pdf-parse, or streaming to external service)
- See next section for implementation

---

## Next: PDF Extraction & Scoring Integration

Current worker skeleton handles:
- ✅ Slack event verification
- ✅ File download
- ⏳ PDF text extraction (needs implementation)
- ⏳ Scoring logic invocation (needs integration with claude.md)
- ⏳ Tier 1 results posting (ready once scoring is integrated)

**To add:**
1. PDF text extraction (use `pdf-parse` or stream to external service)
2. Import scoring logic from `prompts/pmm_scoring_rubric.md`
3. Invoke candidate evaluation
4. Format and post Tier 1 results

---

## Monitoring & Logs

View Worker logs in Cloudflare Dashboard:
1. Workers → Your Worker → **Logs**
2. Or use: `wrangler tail` (streams logs in real-time)

```bash
wrangler tail
```

---

## Security Notes

- **Never commit secrets** (Bot Token, Signing Secret) to git
- Secrets are stored in Cloudflare Workers environment, not in code
- File downloads via Slack API are encrypted in transit (HTTPS)
- Slack request signatures verified on every event to prevent spoofing
- Candidate scoring is deterministic (no external API calls, uses rubric dimensions)

---

Questions? Check Slack app docs: https://api.slack.com/apps
