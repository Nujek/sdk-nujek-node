import crypto from 'node:crypto';

export const WEBHOOK_EVENTS = Object.freeze({
  ORDER_CREATED: 'order.created',
  DRIVER_ACCEPTED: 'driver.accepted',
  DRIVER_REJECTED: 'driver.rejected',
  DRIVER_CANCELLED: 'driver.cancelled',
  DRIVER_ARRIVED: 'driver.arrived',
  DRIVER_PICKED_UP: 'driver.picked_up',
  DRIVER_TIMEOUT: 'driver.timeout',
  ORDER_FINISHED: 'order.finished',
  ORDER_FINISHED_BY_ADMIN: 'order.finished_by_admin',
  ORDER_CANCELLED_BY_ADMIN: 'order.cancelled_by_admin',
  ORDER_CANCELLED_BY_USER: 'order.cancelled_by_user',
  ORDER_DRIVER_CHANGED: 'order.driver_changed',
  ORDER_TIMEOUT: 'order.timeout',
  CHAT_MESSAGE: 'chat.message',
  ORDER_SOS_CREATED: 'order.sos_created',
  USER_CLIENT_REVOKED: 'user_client_revoked',
});

export const CHAT_MESSAGE_EVENT = WEBHOOK_EVENTS.CHAT_MESSAGE;
export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

const knownWebhookEvents = new Set(Object.values(WEBHOOK_EVENTS));

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

/**
 * Verify signature and reject stale webhook requests. Persist deliveryId after
 * accepting a request to avoid processing a retried delivery more than once.
 */
export function verifyWebhook({
  webhookSecret,
  timestamp,
  deliveryId,
  rawBody,
  signature,
  toleranceSeconds = DEFAULT_WEBHOOK_TOLERANCE_SECONDS,
  now = Date.now(),
}) {
  if (!verifyWebhookSignature({ webhookSecret, timestamp, deliveryId, rawBody, signature })) return false;
  const timestampSeconds = Number(timestamp);
  const nowMilliseconds = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isSafeInteger(timestampSeconds) || !Number.isFinite(nowMilliseconds)) return false;
  if (!Number.isFinite(toleranceSeconds) || toleranceSeconds <= 0) return false;
  return Math.abs((nowMilliseconds / 1000) - timestampSeconds) <= toleranceSeconds;
}

// Unknown event names remain parseable for forward compatibility.
export function parseWebhook(rawBody) {
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const event = JSON.parse(body);
  if (!event || typeof event !== 'object' || !event.event || !event.occurred_at || event.data === undefined || event.data === null) {
    throw new Error('envelope webhook tidak lengkap');
  }
  return event;
}

export function isKnownWebhookEvent(event) {
  return knownWebhookEvents.has(event);
}

export function parseChatMessageWebhook(rawBody) {
  const event = parseWebhook(rawBody);
  if (event?.event !== CHAT_MESSAGE_EVENT) throw new Error('event webhook bukan chat.message');
  return event;
}
