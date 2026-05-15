import * as crypto from 'crypto';

/**
 * Verify Slack request authenticity
 *
 * Slack signs requests with X-Slack-Signature header.
 * We reconstruct the signature and compare.
 *
 * Signature = HMAC-SHA256(signing_secret, v0:timestamp:body)
 */
export function verifySlackRequest(
  signingSecret: string,
  timestamp: string,
  requestSignature: string,
  body: string
): boolean {
  // Slack timestamp must be within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (Math.abs(now - ts) > 300) {
    return false;
  }

  // Reconstruct signature
  const baseString = `v0:${timestamp}:${body}`;
  const computed = `v0=${crypto
    .createHmac('sha256', signingSecret)
    .update(baseString)
    .digest('hex')}`;

  return computed === requestSignature;
}

/**
 * Download file from Slack
 *
 * Requires Bot Token (xoxb-...)
 * Returns file content as ArrayBuffer
 */
export async function downloadSlackFile(
  url: string,
  botToken: string
): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${botToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }

  return response.arrayBuffer();
}

/**
 * Parse multipart form data (for file uploads)
 *
 * Returns object with field names as keys
 */
export async function parseMultipartForm(
  req: Request
): Promise<Map<string, FormDataEntryValue>> {
  const formData = await req.formData();
  return new Map(formData.entries());
}

/**
 * Post message to Slack channel/thread
 *
 * Requires Bot Token (xoxb-...)
 */
export async function postSlackMessage(
  botToken: string,
  channel: string,
  text: string,
  threadTs?: string
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const payload: Record<string, unknown> = {
    channel,
    text,
  };

  if (threadTs) {
    payload.thread_ts = threadTs;
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status}`);
  }

  return response.json();
}
