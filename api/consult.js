export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Vary', 'Content-Type');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Método não permitido.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const method = body.method;
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
  if (body.consent !== true) {
    return res.status(400).json({ ok: false, code: 'CONSENT_REQUIRED', status: 'not_confirmed', message: 'É necessário confirmar que você é titular do contato ou possui autorização válida.' });
  }
  if (!['phone', 'email'].includes(method) || !identifier || identifier.length > 254) {
    return res.status(400).json({ ok: false, code: 'INVALID_INPUT', status: 'not_confirmed', message: 'Informe um telefone ou e-mail válido.' });
  }

  if (method === 'email') {
    const email = identifier.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ ok: false, code: 'INVALID_EMAIL', status: 'not_confirmed', message: 'O formato do e-mail é inválido.' });
    }
  } else {
    const digits = identifier.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
      return res.status(400).json({ ok: false, code: 'INVALID_PHONE', status: 'not_confirmed', message: 'Informe um telefone com DDD e formato válido.' });
    }
  }

  // Generic consultation contract only. No dating platform has granted an API
  // integration yet, so do not forward, log, persist, or infer anything about
  // the supplied identifier. A future provider adapter must be official,
  // contractually authorized, consent-based, and independently validated.
  return res.status(503).json({
    ok: false,
    code: 'PROVIDERS_NOT_CONFIGURED',
    status: 'not_confirmed',
    method,
    providers: {
      tinder: 'not_connected',
      badoo: 'not_connected',
      bumble: 'not_connected',
      innerCircle: 'not_connected'
    },
    message: 'A consulta ainda não está disponível: nenhuma plataforma autorizou ou conectou sua API. Nenhum cadastro foi consultado. Tente novamente quando as integrações oficiais estiverem ativas.'
  });
}
