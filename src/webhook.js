import crypto from 'node:crypto';

export const CHAT_MESSAGE_EVENT = 'chat.message';

/**
 * Verify X-Webhook-Signature using the exact raw request body.
 * timestamp and deliveryId must come from X-Webhook-Timestamp and X-Webhook-Id.
 */
export function verifyWebhookSignature({ webhookSecret, timestamp, deliveryId, rawBody, signature }) {
  if (!webhookSecret || !timestamp || !deliveryId || !signature || rawBody === undefined || rawBody === null) return false;
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody));
  const canonical = Buffer.concat([
    Buffer.from(`${timestamp}\n${deliveryId}\n`),
    body,
  ]);
  const actual = crypto.createHmac('sha256', webhookSecret).update(canonical).digest();
  const expected = Buffer.from(signature, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function parseChatMessageWebhook(rawBody) {
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const event = JSON.parse(body);
  if (event?.event !== CHAT_MESSAGE_EVENT) throw new Error('event webhook bukan chat.message');
  return event;
}
