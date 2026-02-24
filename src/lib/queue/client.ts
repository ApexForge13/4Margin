/**
 * QStash Background Job Queue
 *
 * Wraps Upstash QStash for durable, retryable background jobs.
 * Falls back to inline execution when QStash is not configured (dev/MVP).
 *
 * In production: QStash publishes an HTTP request to our webhook endpoint.
 * QStash handles retries (3x with exponential backoff) and dead-letter queue.
 */

import { Client } from "@upstash/qstash";

let qstashClient: Client | null = null;

function getQStashClient(): Client | null {
  if (qstashClient) return qstashClient;

  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;

  qstashClient = new Client({ token });
  return qstashClient;
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Returns true if QStash is configured and should be used.
 */
export function isQueueEnabled(): boolean {
  return !!process.env.QSTASH_TOKEN;
}

/**
 * Enqueue a supplement pipeline job.
 *
 * If QStash is configured, publishes to /api/webhooks/qstash/pipeline.
 * Returns { queued: true } if published, { queued: false } if QStash is not set up.
 */
export async function enqueuePipelineJob(payload: {
  supplementId: string;
  claimId: string;
  companyId: string;
}): Promise<{ queued: boolean; messageId?: string }> {
  const client = getQStashClient();
  if (!client) {
    return { queued: false };
  }

  const result = await client.publishJSON({
    url: `${APP_URL}/api/webhooks/qstash/pipeline`,
    body: payload,
    retries: 3,
  });

  console.log(`[queue] Pipeline job enqueued: ${result.messageId}`);
  return { queued: true, messageId: result.messageId };
}
