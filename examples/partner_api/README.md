# Node.js Partner API Example

Salin `.env.example` menjadi `.env`, isi credential client, lalu jalankan dari root SDK:

```bash
cp examples/partner_api/.env.example examples/partner_api/.env
npm run example
```

Server berjalan di `http://localhost:8088` (atau `EXAMPLE_PORT`). Credential hanya dibaca dari `.env`; Postman tidak perlu mengirim API key.

Endpoint Postman:

| Method | URL | Body |
| --- | --- | --- |
| POST | `/register` | `{ "name": "Budi", "email": "budi@example.com", "phone": "081234567890" }` |
| GET | `/pricing?service_id=1&sub_service_id=1&regency_id=7171&distance_km=5.5` | - |
| POST | `/routing` | `{ "mode": "motorcycle", "routes": [{ "latitude": -7.25, "longitude": 112.76 }, { "latitude": -7.26, "longitude": 112.78 }] }` |
| POST | `/orders` | Body order Partner API lengkap |
| GET | `/orders?page=1&limit=10&status=ACCEPTED` | - |
| GET | `/orders/{order_uuid}` | - |
| POST | `/orders/{order_uuid}/cancel` | `{ "reason": "Customer membatalkan order" }` |
| POST | `/orders/{order_uuid}/review-driver` | `{ "rating": 5, "comment": "Pelayanan baik" }` |
| POST | `/orders/{order_uuid}/chat/messages` | `{ "message": "Driver, mohon ke pickup" }` |
| GET | `/orders/{order_uuid}/chat/messages?page=1&limit=50` | - |

Alias `/orders/{order_uuid}/chat/message` (singular) juga diterima oleh example.

Semua request ke server upstream ditandatangani SDK secara otomatis.

SDK juga mengekspor `verifyWebhookSignature` dan `parseChatMessageWebhook` untuk
memverifikasi serta membaca balasan driver melalui webhook `chat.message`.
