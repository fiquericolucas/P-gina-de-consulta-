export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  return res.status(200).json({
    ok: true,
    service: 'Verifica+',
    mode: 'prototype',
    liveLookupsEnabled: false,
    paymentsEnabled: false,
    integrations: {
      tinder: 'unavailable',
      badoo: 'unavailable',
      bumble: 'unavailable',
      innerCircle: 'unavailable'
    },
    message: 'Health check only. No account lookup or payment is performed.',
    timestamp: new Date().toISOString()
  });
}
