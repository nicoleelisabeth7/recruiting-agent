/**
 * Cloudflare Worker: Slack @mention + file upload handler
 *
 * Flow:
 * 1. User @mentions bot in Slack with JD + resume PDFs
 * 2. Worker receives app_mention + file_shared events
 * 3. Downloads files from Slack (requires Bot Token)
 * 4. Extracts text from PDFs
 * 5. Loads JD, finds scoring rubric, scores candidates
 * 6. Posts Tier 1 candidates back to Slack thread
 */

import { Router } from 'itty-router';
import { verifySlackRequest, downloadSlackFile, parseMultipartForm } from './lib/slack';

interface Env {
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
}

const router = Router();

// POST /slack/events - Slack event subscription
router.post('/slack/events', async (req: Request, env: Env) => {
  const signature = req.headers.get('X-Slack-Request-Timestamp') || '';
  const requestSignature = req.headers.get('X-Slack-Signature') || '';

  // Verify Slack request authenticity
  if (!verifySlackRequest(env.SLACK_SIGNING_SECRET, signature, requestSignature, req.body)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json() as SlackEvent;

  // Slack URL verification challenge (on first setup)
  if (body.type === 'url_verification') {
    return new Response(body.challenge);
  }

  // Handle events
  if (body.type === 'event_callback') {
    const event = body.event as SlackEventPayload;

    // @mention bot in channel with files
    if (event.type === 'app_mention') {
      await handleAppMention(event, env);
      return new Response('OK');
    }

    // File uploaded to channel/thread (optional - can parse from message attachments too)
    if (event.type === 'file_shared') {
      // File info is in event.file_id; would need to call files.info to get download URL
      // For simplicity, handle files via message attachments in app_mention
      return new Response('OK');
    }
  }

  return new Response('OK');
});

// GET /health - Health check
router.get('/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

router.all('*', () => new Response('Not Found', { status: 404 }));

/**
 * Handle @mention: user mentions bot with files
 *
 * Expected message format:
 * @recruiting-agent
 * <JD PDF or text>
 * <Resume PDFs>
 *
 * Bot downloads files, parses, scores, posts results
 */
async function handleAppMention(event: SlackEventPayload, env: Env): Promise<void> {
  const { channel, thread_ts, ts, files, text } = event as AppMentionEvent;

  try {
    // Step 1: Extract files from message
    if (!files || files.length === 0) {
      // Post help message
      // TODO: Post "Please upload JD and resumes" message
      return;
    }

    // Step 2: Download files
    const downloadedFiles = await Promise.all(
      files.map((file) => downloadSlackFile(file.url_private, env.SLACK_BOT_TOKEN))
    );

    // Step 3: Parse files
    // - First file is JD (PDF or text)
    // - Remaining files are resumes (PDFs)
    const [jdFile, ...resumeFiles] = downloadedFiles;

    // TODO: Extract text from JD (parse PDF if needed)
    // TODO: Extract text from resumes (parse PDFs)

    // Step 4: Load JD, extract role slug, find rubric
    // TODO: Integrate with claude.md scoring logic

    // Step 5: Score candidates
    // TODO: Score all candidates against rubric

    // Step 6: Post results to thread
    // TODO: Format Tier 1 candidates, post to Slack
  } catch (error) {
    console.error('Error processing @mention:', error);
    // Post error message to thread
    // TODO: Post "Error processing files" to Slack
  }
}

// Slack event types
interface SlackEvent {
  type: 'url_verification' | 'event_callback';
  challenge?: string;
  event?: SlackEventPayload;
}

interface SlackEventPayload {
  type: string;
  user?: string;
  channel?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
  files?: SlackFile[];
}

interface AppMentionEvent extends SlackEventPayload {
  type: 'app_mention';
  channel: string;
  text: string;
  ts: string;
  thread_ts?: string;
  files?: SlackFile[];
}

interface SlackFile {
  id: string;
  name: string;
  title: string;
  mimetype: string;
  url_private: string;
  url_private_download: string;
}

export default {
  fetch: (req: Request, env: Env) => router.handle(req, env),
};
