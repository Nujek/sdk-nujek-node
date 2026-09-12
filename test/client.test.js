import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NujekClient, parseChatMessageWebhook, verifyWebhookSignature } from '../src/index.js';

test('creates HMAC signed request', async () => {
  let request;
  const client = new NujekClient({ baseUrl: 'https://example.com', apiKey: 'key', apiSecret: 'secret', clock: () => 1700000000000, nonce: () => 'nonce', fetchImpl: async (url, options) => { request = { url, options }; return new Response('{"data":{"uuid":"u"}}', { status: 200 }); } });
  await client.register({ name: 'Budi', email: 'budi@example.com', phone: '081234567890' });
  const hash = crypto.createHash('sha256').update(JSON.stringify({ name: 'Budi', email: 'budi@example.com', phone: '081234567890' })).digest('hex');
  const canonical = ['1700000000', 'nonce', 'POST', '/api/client/register', hash].join('\n');
  assert.equal(request.options.headers['X-Signature'], crypto.createHmac('sha256', 'secret').update(canonical).digest('hex'));
});

function captureClient(responseBody, capture) {
  return new NujekClient({
    baseUrl: 'https://example.com',
    apiKey: 'key',
    apiSecret: 'secret',
    clock: () => 1700000000000,
    nonce: () => 'nonce',
    fetchImpl: async (url, options) => {
      capture.url = url;
      capture.options = options;
      return new Response(JSON.stringify(responseBody), { status: 200 });
    },
  });
}

test('lists customer-driver chat messages with pagination', async () => {
  const capture = {};
  const client = captureClient({ data: { items: [{ id: 50, sender_role: 'driver', message: 'otw' }], total_items: 1 } }, capture);

  const response = await client.listChatMessages(' order-uuid ', { page: 2, limit: 25 });

  assert.equal(capture.options.method, 'GET');
  assert.equal(capture.url.pathname, '/api/client/orders/order-uuid/chat/customer_driver/messages');
  assert.equal(capture.url.search, '?page=2&limit=25');
  assert.equal(response.data.items[0].sender_role, 'driver');
  assert.ok(capture.options.headers['X-Signature']);
});

test('sends a customer-driver chat message', async () => {
  const capture = {};
  const client = captureClient({ data: { id: 51, message: 'Driver, mohon ke pickup' } }, capture);
  const payload = { message: 'Driver, mohon ke pickup', message_type: 'text' };

  const response = await client.sendChatMessage('order-uuid', payload);

  assert.equal(capture.options.method, 'POST');
  assert.equal(capture.url.pathname, '/api/client/orders/order-uuid/chat/customer_driver/messages');
  assert.deepEqual(JSON.parse(capture.options.body), payload);
  assert.equal(response.data.id, 51);
});

test('validates chat input before sending a request', async () => {
  const client = captureClient({}, {});
  assert.throws(() => client.sendChatMessage('', { message: 'hello' }), /order UUID wajib diisi/);
  assert.throws(() => client.sendChatMessage('order-uuid', { message: '  ' }), /pesan chat wajib diisi/);
  assert.throws(() => client.listChatMessages('order-uuid', { page: 0 }), /page harus berupa bilangan bulat/);
});

test('verifies and parses chat.message webhook', () => {
  const rawBody = Buffer.from(JSON.stringify({
    event: 'chat.message',
    occurred_at: '2026-09-10T14:37:06Z',
    data: { order_uuid: 'order-uuid', conversation_type: 'customer_driver', message_id: 50, sender_role: 'driver' },
  }));
  const webhookSecret = 'webhook-secret';
  const timestamp = '1789051026';
  const deliveryId = '3e1a6e70-3602-4a57-a092-078b2d8f22a1';
  const signature = crypto.createHmac('sha256', webhookSecret)
    .update(`${timestamp}\n${deliveryId}\n`)
    .update(rawBody)
    .digest('hex');

  assert.equal(verifyWebhookSignature({ webhookSecret, timestamp, deliveryId, rawBody, signature }), true);
  assert.equal(verifyWebhookSignature({ webhookSecret, timestamp, deliveryId, rawBody: Buffer.from('tampered'), signature }), false);
  assert.equal(parseChatMessageWebhook(rawBody).data.message_id, 50);
  assert.throws(() => parseChatMessageWebhook('{"event":"order.updated"}'), /bukan chat.message/);
});
