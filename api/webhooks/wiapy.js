import { timingSafeEqual } from 'node:crypto';

const UTMIFY_URL = 'https://api.utmify.com.br/api-credentials/orders';

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function utc(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
function mapStatus(status) {
  return ({
    unpaid: 'waiting_payment',
    paid: 'paid',
    credit_card_declined: 'refused',
    refunded: 'refunded',
    chargedback: 'chargedback'
  })[status] || null;
}
function tracking(value = {}) {
  return {
    src: value.src || null,
    sck: value.sck || null,
    utm_source: value.utm_source || null,
    utm_campaign: value.utm_campaign || null,
    utm_medium: value.utm_medium || null,
    utm_content: value.utm_content || null,
    utm_term: value.utm_term || null
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const webhookToken = process.env.WIAPY_WEBHOOK_TOKEN;
  const utmifyToken = process.env.UTMIFY_API_TOKEN;
  if (!webhookToken || !utmifyToken) {
    return res.status(503).json({ ok: false, code: 'PAYMENT_INTEGRATION_NOT_CONFIGURED' });
  }
  const authorization = req.headers.authorization || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
  if (!safeEqual(supplied, webhookToken)) {
    return res.status(401).json({ ok: false, code: 'UNAUTHORIZED' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const payment = body.payment;
  if (!payment || typeof payment !== 'object' || !payment.id || !payment.status) {
    // Abandoned-cart notifications have payment: null and are not sales.
    return res.status(202).json({ ok: true, ignored: true, reason: 'NO_PAYMENT_EVENT' });
  }
  const status = mapStatus(payment.status);
  if (!status) {
    return res.status(202).json({ ok: true, ignored: true, reason: 'UNMAPPED_PAYMENT_STATUS' });
  }

  const createdAt = utc(payment.dt_create);
  if (!createdAt) return res.status(400).json({ ok: false, code: 'INVALID_CREATED_AT' });
  const amount = Number(payment.amount);
  const fee = Number(payment.fee || 0);
  if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(fee) || fee < 0 || fee > amount) {
    return res.status(400).json({ ok: false, code: 'INVALID_PAYMENT_AMOUNT' });
  }

  const customer = body.customer || {};
  const checkout = body.checkout || {};
  const trackingData = body.tracking || {};
  const items = Array.isArray(body.products) ? body.products : [];
  const products = items.length ? items.map((item, index) => ({
    id: String(item.id || checkout.id || 'verificap-consulta'),
    name: String(item.title || checkout.title || 'Verifica+ — produto digital'),
    planId: null,
    planName: null,
    quantity: 1,
    priceInCents: index === 0 ? amount : 0
  })) : [{
    id: String(checkout.id || 'verificap-consulta'),
    name: String(checkout.title || 'Verifica+ — produto digital'),
    planId: null,
    planName: null,
    quantity: 1,
    priceInCents: amount
  }];

  const payload = {
    orderId: String(payment.id),
    platform: 'Wiapy',
    paymentMethod: ({ pix: 'pix', credit_card: 'credit_card', boleto: 'boleto' })[payment.payment_method] || 'free_price',
    status,
    createdAt,
    approvedDate: status === 'paid' ? utc(payment.dt_update) || new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
    refundedAt: ['refunded', 'chargedback'].includes(status) ? utc(payment.dt_update) : null,
    customer: {
      name: String(customer.name || 'Comprador'),
      email: String(customer.email || 'nao-informado@example.invalid'),
      phone: customer.mobile_phone ? String(customer.mobile_phone).replace(/\\D/g, '') : null,
      document: customer.document ? String(customer.document).replace(/\\D/g, '') : null,
      country: 'BR',
      ...(trackingData.ip ? { ip: String(trackingData.ip) } : {})
    },
    products,
    trackingParameters: tracking(trackingData),
    commission: {
      totalPriceInCents: amount,
      gatewayFeeInCents: fee,
      userCommissionInCents: amount - fee,
      currency: 'BRL'
    },
    isTest: false
  };

  try {
    const response = await fetch(UTMIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-token': utmifyToken },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      return res.status(502).json({ ok: false, code: 'UTMIFY_REJECTED_EVENT', upstreamStatus: response.status });
    }
    return res.status(200).json({ ok: true, forwarded: true, orderId: payload.orderId, status });
  } catch {
    return res.status(502).json({ ok: false, code: 'UTMIFY_UNAVAILABLE' });
  }
}
