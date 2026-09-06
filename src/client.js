import crypto from 'node:crypto';

export class NujekApiError extends Error {
  constructor(status, message, code = '', fields = null) {
    super(`client API HTTP ${status}: ${message}`);
    this.name = 'NujekApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export class NujekClient {
  constructor({ baseUrl, apiKey, apiSecret, fetchImpl = globalThis.fetch, clock = () => Date.now(), nonce = () => crypto.randomBytes(16).toString('hex') }) {
    if (!baseUrl?.trim() || !apiKey?.trim() || !apiSecret) throw new Error('client API base URL, key, dan secret wajib diisi');
    if (typeof fetchImpl !== 'function') throw new Error('Node.js 18+ diperlukan atau fetchImpl harus disediakan');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    new URL(this.baseUrl);
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.fetch = fetchImpl;
    this.clock = clock;
    this.nonce = nonce;
  }

  register({ name, email, phone }) { return this.#post('/register', { name, email, phone }); }
  pricingPreview(params = {}) { return this.#request('GET', '/pricing/preview', params); }
  routingDistance(payload) { return this.#post('/routing/distance', payload); }
  createOrder(payload) { return this.#post('/orders', payload); }
  cancelOrder(orderUuid, payload = {}) { return this.#post(`/orders/${encodeURIComponent(orderUuid)}/cancel`, payload); }
  reviewDriver(orderUuid, payload) { return this.#post(`/orders/${encodeURIComponent(orderUuid)}/review-driver`, payload); }
  sendOrderChatMessage(orderUuid, payload) { return this.#post(`/orders/${encodeURIComponent(orderUuid)}/chat/customer_driver/messages`, payload); }
  getOrderChatMessages(orderUuid, { page, limit } = {}) { return this.#request('GET', `/orders/${encodeURIComponent(orderUuid)}/chat/customer_driver/messages`, { page, limit }); }

  async #post(path, payload) { return this.#request('POST', path, undefined, payload); }

  async #request(method, path, query, payload) {
    if (!path.startsWith('/')) throw new Error('path API harus diawali slash');
    const url = new URL(`/api/client${path}`, `${this.baseUrl}/`);
    if (query) for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    const body = method === 'GET' ? '' : JSON.stringify(payload ?? {});
    const timestamp = String(Math.floor(this.clock() / 1000));
    const nonce = await this.nonce();
    const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
    const pathAndQuery = `${url.pathname}${url.search}`;
    const canonical = [timestamp, nonce, method, pathAndQuery, bodyHash].join('\n');
    const signature = crypto.createHmac('sha256', this.apiSecret).update(canonical).digest('hex');
    const response = await this.fetch(url, { method, headers: { 'X-Client-Key': this.apiKey, 'X-Timestamp': timestamp, 'X-Nonce': nonce, 'X-Signature': signature, ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}) }, body: method === 'GET' ? undefined : body });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) {
      const error = data?.error ?? {};
      throw new NujekApiError(response.status, error.message || text || response.statusText, error.code || '', error.fields || null);
    }
    return data;
  }
}
