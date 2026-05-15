/**
 * Cloudflare Worker: Slack @mention + file upload handler
 *
 * Flow:
 * 1. User @mentions bot in Slack with JD + resume PDFs
 * 2. Worker receives app_mention event
 * 3. Downloads files from Slack (requires Bot Token)
 * 4. Extracts text from PDFs
 * 5. Scores candidates against appropriate rubric
 * 6. Posts Tier 1 candidates back to Slack thread
 */

import { Router } from 'itty-router';
import { verifySlackRequest, downloadSlackFile, postSlackMessage } from './lib/slack';
import { extractTextFromFile } from './lib/pdf';
import { scoreCandidate, parsePMMRubric } from './lib/scoring';
import { formatAndPostResults } from './lib/results';

interface Env {
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
}

interface SlackFile {
  id: string;
  name: string;
  title: string;
  mimetype: string;
  url_private: string;
  url_private_download: string;
}

interface AppMentionEvent {
  type: 'app_mention';
  user: string;
  channel: string;
  text: string;
  ts: string;
  thread_ts?: string;
  files?: SlackFile[];
}

interface SlackEvent {
  type: 'url_verification' | 'event_callback';
  challenge?: string;
  event?: AppMentionEvent;
}

const router = Router();

// POST /slack/events - Slack event subscription
router.post('/slack/events', async (req: Request, env: Env) => {
  try {
    const signature = req.headers.get('X-Slack-Request-Timestamp') || '';
    const requestSignature = req.headers.get('X-Slack-Signature') || '';
    const body = await req.text();

    // Verify Slack request authenticity
    if (!verifySlackRequest(env.SLACK_SIGNING_SECRET, signature, requestSignature, body)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const bodyJson = JSON.parse(body) as SlackEvent;

    // Slack URL verification challenge (on first setup)
    if (bodyJson.type === 'url_verification') {
      return new Response(bodyJson.challenge);
    }

    // Handle events
    if (bodyJson.type === 'event_callback' && bodyJson.event) {
      const event = bodyJson.event as AppMentionEvent;

      if (event.type === 'app_mention') {
        await handleAppMention(event, env);
      }
    }

    return new Response('OK');
  } catch (error) {
    console.error('Error in /slack/events:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
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
 * Expected flow:
 * 1. User @mentions bot + attaches JD (first file) + resumes (remaining files)
 * 2. Worker downloads all files
 * 3. Extracts text from each
 * 4. Uses JD to determine role + find rubric
 * 5. Scores each resume against rubric
 * 6. Posts Tier 1 candidates to thread
 */
async function handleAppMention(event: AppMentionEvent, env: Env): Promise<void> {
  const { channel, thread_ts, ts, files, text } = event;

  try {
    // Step 1: Check if files were attached
    if (!files || files.length < 2) {
      await postSlackMessage(
        env.SLACK_BOT_TOKEN,
        channel,
        ':warning: Please attach at least 2 files: JD (first) + resumes (remaining).',
        thread_ts || ts
      );
      return;
    }

    // Step 2: Download all files
    await postSlackMessage(
      env.SLACK_BOT_TOKEN,
      channel,
      ':hourglass_flowing_sand: Downloading files...',
      thread_ts || ts
    );

    const downloadedFiles = await Promise.all(
      files.map(async (file) => {
        const content = await downloadSlackFile(file.url_private, env.SLACK_BOT_TOKEN);
        return { name: file.name, content };
      })
    );

    // Step 3: Extract text from each file
    await postSlackMessage(
      env.SLACK_BOT_TOKEN,
      channel,
      ':page_facing_up: Extracting text from files...',
      thread_ts || ts
    );

    const [jdFile, ...resumeFiles] = downloadedFiles;

    const jdText = await extractTextFromFile(jdFile.content, jdFile.name);
    const resumeTexts = await Promise.all(
      resumeFiles.map(async (file) => ({
        name: file.name.replace(/\.[^.]+$/, ''), // Remove extension
        text: await extractTextFromFile(file.content, file.name),
      }))
    );

    // Step 4: Determine role from JD and load rubric
    // For now, assume PMM role (can extend to detect role from JD text)
    const rubric = parsePMMRubric();

    // Step 5: Score candidates
    await postSlackMessage(
      env.SLACK_BOT_TOKEN,
      channel,
      `:bar_chart: Scoring ${resumeTexts.length} candidates against ${rubric.role} rubric...`,
      thread_ts || ts
    );

    const scoredCandidates = resumeTexts.map((resume) => scoreCandidate(resume.name, resume.text, rubric));

    // Step 6: Post results
    await postSlackMessage(
      env.SLACK_BOT_TOKEN,
      channel,
      `:tada: *Evaluation Complete*\n${scoredCandidates.length} candidates scored.`,
      thread_ts || ts
    );

    await formatAndPostResults(scoredCandidates, env.SLACK_BOT_TOKEN, channel, thread_ts || ts);
  } catch (error) {
    console.error('Error processing @mention:', error);
    await postSlackMessage(
      env.SLACK_BOT_TOKEN,
      channel,
      `:x: Error processing files: ${error instanceof Error ? error.message : String(error)}`,
      thread_ts || ts
    );
  }
}

export default {
  fetch: (req: Request, env: Env) => router.handle(req, env),
};
