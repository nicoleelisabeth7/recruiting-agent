# Config Directory

Store sensitive configuration files here. **Do not commit to git.**

## Files

### `.slack_config.json` (Template)
```json
{
  "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "channel": "#candidate-review",
  "enabled": true
}
```

**To set up:**
1. Create Slack Incoming Webhook in your app settings
2. Copy webhook URL
3. Create `.slack_config.json` in this directory
4. Add to `.gitignore` (already configured)

## Security

- These files are in `.gitignore`
- Never commit credentials or tokens
- Keep webhook URLs secret
