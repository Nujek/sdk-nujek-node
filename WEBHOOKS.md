# Webhook Partner API

Nujek mengirim request `POST` ke `webhook_url` partner dengan header
`X-Webhook-Id`, `X-Webhook-Timestamp`, dan `X-Webhook-Signature`. Signature adalah
HMAC-SHA256 hex dari `<timestamp>\n<delivery_id>\n<raw_body>` menggunakan webhook
secret. API secret dan webhook secret adalah dua credential yang berbeda.

```js
import {
  WEBHOOK_EVENTS,
  parseWebhook,
  verifyWebhook,
} from '@nujek/sdk';

const chunks = [];
for await (const chunk of req) chunks.push(chunk);
const rawBody = Buffer.concat(chunks);
const deliveryId = req.headers['x-webhook-id'];

const valid = verifyWebhook({
  webhookSecret: process.env.CLIENT_WEBHOOK_SECRET,
  timestamp: req.headers['x-webhook-timestamp'],
  deliveryId,
  rawBody,
  signature: req.headers['x-webhook-signature'],
});
if (!valid) {
  res.writeHead(401).end();
  return;
}

// Tolak jika deliveryId sudah pernah diproses, lalu simpan secara atomik.
const event = parseWebhook(rawBody);
switch (event.event) {
  case WEBHOOK_EVENTS.CHAT_MESSAGE:
    console.log(event.data.message);
    break;
  case WEBHOOK_EVENTS.ORDER_SOS_CREATED:
    console.log(event.data.sos_uuid);
    break;
  default:
    console.log(event.data.order_uuid, event.data.status);
}
res.writeHead(204).end();
```

Secara default `verifyWebhook` menolak timestamp yang berbeda lebih dari lima
menit dari waktu lokal. Gunakan raw body persis seperti yang diterima sebelum
memanggil `JSON.parse`.

## Event yang dikirim

| Event | Field utama pada `data` |
| --- | --- |
| `order.created` | `order_uuid`, `status`, `driver_uuid` |
| `driver.accepted` | `order_uuid`, `status`, `driver_uuid` |
| `driver.rejected` | `order_uuid`, `status`, `driver_uuid` |
| `driver.cancelled` | `order_uuid`, `status`, `driver_uuid` |
| `driver.arrived` | `order_uuid`, `status`, `driver_uuid` |
| `driver.picked_up` | `order_uuid`, `status`, `driver_uuid` |
| `driver.timeout` | `order_uuid`, `status`, `driver_uuid` |
| `order.finished` | `order_uuid`, `status`, `driver_uuid` |
| `order.finished_by_admin` | `order_uuid`, `status`, `driver_uuid` |
| `order.cancelled_by_admin` | `order_uuid`, `status`, `driver_uuid` |
| `order.cancelled_by_user` | `order_uuid`, `status`, `driver_uuid` |
| `order.driver_changed` | `order_uuid`, `status`, `driver_uuid` |
| `order.timeout` | `order_uuid`, `status`, `driver_uuid` |
| `chat.message` | `order_uuid`, `conversation_type`, `message_id`, data pesan |
| `order.sos_created` | `sos_uuid`, `order_uuid`, reporter, kategori dan lokasi |
| `user_client_revoked` | `user_uuid`, `client_uuid` |

`parseWebhook` menerima event baru yang belum dikenal agar receiver tetap
forward-compatible. Gunakan `isKnownWebhookEvent` bila perlu. Balas HTTP `2xx`
setelah event diterima dan simpan `X-Webhook-Id` sebagai idempotency key karena
delivery yang gagal akan dicoba kembali oleh Nujek.
