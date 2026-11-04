export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const wiapyConfigured = Boolean(process.env.WIAPY_WEBHOOK_TOKEN);
  const utmifyConfigured = Boolean(process.env.UTMIFY_API_TOKEN);
  return res.status(200).json({
    ok: true,
    service: 'Verifica+',
    mode: 'prototype',
    liveLookupsEnabled: false,
    paymentsEnabled: false,
    paymentWebhookReady: wiapyConfigured && utmifyConfigured,
    integrations: {
      wiapyWebhookConfigured: wiapyConfigured,
      utmifyConfigured,
      googleIdentityVerification: Boolean(process.env.GOOGLE_CLIENT_ID),
      tinder: 'unavailable',
      badoo: 'unavailable',
      bumble: 'unavailable',
      innerCircle: 'unavailable'
    },
    message: 'Health check only. A payment webhook is not a checkout and does not activate account lookups.',
    timestamp: new Date().toISOString()
  });
}
