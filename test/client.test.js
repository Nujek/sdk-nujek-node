import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NujekClient } from '../src/index.js';

test('creates HMAC signed request', async () => {
  let request;
  const client = new NujekClient({ baseUrl: 'https://example.com', apiKey: 'key', apiSecret: 'secret', clock: () => 1700000000000, nonce: () => 'nonce', fetchImpl: async (url, options) => { request = { url, options }; return new Response('{"data":{"uuid":"u"}}', { status: 200 }); } });
  await client.register({ name: 'Budi', email: 'budi@example.com', phone: '081234567890' });
  const hash = crypto.createHash('sha256').update(JSON.stringify({ name: 'Budi', email: 'budi@example.com', phone: '081234567890' })).digest('hex');
  const canonical = ['1700000000', 'nonce', 'POST', '/api/client/register', hash].join('\n');
  assert.equal(request.options.headers['X-Signature'], crypto.createHmac('sha256', 'secret').update(canonical).digest('hex'));
});
