export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  // Intentionally do not accept, log, or store contact identifiers until a
  // lawful, authorized provider integration and privacy controls are in place.
  return res.status(503).json({
    ok: false,
    code: 'LOOKUP_NOT_CONFIGURED',
    status: 'not_confirmed',
    message: 'Consultas reais ainda não estão habilitadas. Nenhum cadastro foi consultado e nenhum dado foi armazenado.'
  });
}
