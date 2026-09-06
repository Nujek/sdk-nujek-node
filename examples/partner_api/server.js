import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NujekClient } from '../../src/index.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(directory, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const client = new NujekClient({ baseUrl: process.env.CLIENT_API_BASE_URL, apiKey: process.env.CLIENT_API_KEY, apiSecret: process.env.CLIENT_API_SECRET });
const port = Number(process.env.EXAMPLE_PORT || 8088);

function json(res, status, body) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); }
async function body(req) { let raw = ''; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let result;
    if (req.method === 'POST' && url.pathname === '/register') result = await client.register(await body(req));
    else if (req.method === 'GET' && url.pathname === '/pricing') result = await client.pricingPreview(Object.fromEntries(url.searchParams));
    else if (req.method === 'POST' && url.pathname === '/routing') result = await client.routingDistance(await body(req));
    else if (req.method === 'GET' && url.pathname === '/orders') result = await client.listOrders(Object.fromEntries(url.searchParams));
    else if (req.method === 'POST' && url.pathname === '/orders') result = await client.createOrder(await body(req));
    else {
      const show = url.pathname.match(/^\/orders\/([^/]+)$/);
      const cancel = url.pathname.match(/^\/orders\/([^/]+)\/cancel$/);
      const review = url.pathname.match(/^\/orders\/([^/]+)\/review-driver$/);
      // Terima bentuk singular dan plural untuk kemudahan kompatibilitas Postman.
      const chat = url.pathname.match(/^\/orders\/([^/]+)\/chat\/(?:message|messages)$/);
      if (req.method === 'GET' && show) result = await client.showOrder(show[1]);
      else if (req.method === 'POST' && cancel) result = await client.cancelOrder(cancel[1], await body(req));
      else if (req.method === 'POST' && review) result = await client.reviewDriver(review[1], await body(req));
      else if (chat && req.method === 'POST') result = await client.sendOrderChatMessage(chat[1], await body(req));
      else if (chat && req.method === 'GET') result = await client.getOrderChatMessages(chat[1], Object.fromEntries(url.searchParams));
      else return json(res, 404, { error: 'route not found' });
    }
    json(res, 200, result);
  } catch (error) { json(res, error.status || 500, { error: error.message }); }
}

http.createServer(handler).listen(port, () => console.log(`Partner API example listening on http://localhost:${port}`));
