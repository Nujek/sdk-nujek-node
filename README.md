# Nujek Partner API SDK (Node.js)

Node.js SDK untuk Partner API Nujek. Memerlukan Node.js 18+ karena memakai `fetch` bawaan dan tidak membutuhkan dependency eksternal.

## Instalasi

```bash
npm install github:Nujek/sdk-nujek-node#v0.5.0
```

```js
import { NujekClient } from '@nujek/sdk';
import crypto from 'node:crypto';

const client = new NujekClient({
  baseUrl: process.env.CLIENT_API_BASE_URL,
  apiKey: process.env.CLIENT_API_KEY,
  apiSecret: process.env.CLIENT_API_SECRET,
});

const customer = await client.register({ name: 'Budi', email: 'budi@example.com', phone: '081234567890' });
const price = await client.pricingPreview({ service_id: 1, sub_service_id: 1, regency_id: '7171', distance_km: 5.5 });
const route = await client.routingDistance({ mode: 'motorcycle', routes: [{ latitude: -7.25, longitude: 112.76 }, { latitude: -7.26, longitude: 112.78 }] });
const order = await client.createOrder({ customer_uuid: customer.data.uuid, client_request_id: crypto.randomUUID(), service_id: 1, sub_service_id: 1, payment_method_id: 1, regency_id: '7171', routes: [{ latitude: -7.25, longitude: 112.76 }, { latitude: -7.26, longitude: 112.78 }] });
await client.cancelOrder(order.data.uuid, { reason: 'Customer membatalkan order' });
await client.reviewDriver(order.data.uuid, { rating: 5, comment: 'Pelayanan baik' });
await client.sendOrderChatMessage(order.data.uuid, { message: 'Driver, mohon ke lokasi pickup' });
const messages = await client.getOrderChatMessages(order.data.uuid, { page: 1, limit: 50 });
// Alias yang konsisten dengan SDK Go juga tersedia:
await client.sendChatMessage(order.data.uuid, { message: 'Driver, mohon ke lokasi pickup' });
const chatPage = await client.listChatMessages(order.data.uuid, { page: 1, limit: 50 });
const orders = await client.listOrders({ page: 1, limit: 10, status: 'ACCEPTED' });
const detail = await client.showOrder(order.data.uuid);
```

Setiap request ditandatangani otomatis menggunakan `X-Client-Key`, `X-Timestamp`, `X-Nonce`, dan `X-Signature` HMAC-SHA256. Method mengembalikan envelope API `{ data, message }`; error akan melempar `NujekApiError`.

Chat client menggunakan percakapan `customer_driver`. Pesan client dikirim atas nama customer pemilik order, sedangkan balasan driver akan dikirim ke webhook client sebagai event `chat.message`.

Verifikasi webhook menggunakan raw body sebelum JSON diparsing:

```js
import { parseWebhook, verifyWebhook } from '@nujek/sdk';

const valid = verifyWebhook({
  webhookSecret: process.env.CLIENT_WEBHOOK_SECRET,
  timestamp: req.headers['x-webhook-timestamp'],
  deliveryId: req.headers['x-webhook-id'],
  rawBody,
  signature: req.headers['x-webhook-signature'],
});
if (!valid) throw new Error('Invalid webhook signature');

const event = parseWebhook(rawBody);
```

Konstanta seluruh event, struktur payload, idempotensi, dan contoh receiver
tersedia di [WEBHOOKS.md](./WEBHOOKS.md).
