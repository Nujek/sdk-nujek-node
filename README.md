# Nujek Partner API SDK (Node.js)

Node.js SDK untuk Partner API Nujek. Memerlukan Node.js 18+ karena memakai `fetch` bawaan dan tidak membutuhkan dependency eksternal.

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
```

Setiap request ditandatangani otomatis menggunakan `X-Client-Key`, `X-Timestamp`, `X-Nonce`, dan `X-Signature` HMAC-SHA256. Method mengembalikan envelope API `{ data, message }`; error akan melempar `NujekApiError`.
