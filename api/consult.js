const PROVIDER_TIMEOUT_MS = 8000;

function responseMessage(status) {
  if (status === 'match') return 'A fonte autorizada retornou uma correspondência pública. Isso não comprova relacionamento, identidade ou infidelidade; confira a fonte original.';
  if (status === 'no_match') return 'A fonte autorizada não retornou correspondências públicas nesta consulta. Isso não prova que a pessoa não tenha cadastro.';
  return 'Não foi possível concluir a verificação. A fonte autorizada não forneceu um resultado válido.';
}

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
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(identifier.toLowerCase())) {
      return res.status(400).json({ ok: false, code: 'INVALID_EMAIL', status: 'not_confirmed', message: 'O formato do e-mail é inválido.' });
    }
  } else {
    const digits = identifier.replace(/\\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
      return res.status(400).json({ ok: false, code: 'INVALID_PHONE', status: 'not_confirmed', message: 'Informe um telefone com DDD e formato válido.' });
    }
  }

  // Generic adapter: it only calls a provider explicitly configured by the
  // project owner. Never point this at private platform endpoints or services
  // that perform account enumeration. Provider must be official/authorized.
  const providerUrl = process.env.CONSULT_PROVIDER_URL;
  const providerKey = process.env.CONSULT_PROVIDER_API_KEY;

  if (!providerUrl || !providerKey) {
    return res.status(503).json({
      ok: false,
      code: 'PROVIDER_NOT_CONFIGURED',
      status: 'not_confirmed',
      message: 'Não conseguimos encontrar nada cadastrado com esses dados.'
    });
  }

  let endpoint;
  try {
    endpoint = new URL(providerUrl);
    if (endpoint.protocol !== 'https:') throw new Error('HTTPS required');
  } catch {
    return res.status(503).json({ ok: false, code: 'PROVIDER_CONFIGURATION_INVALID', status: 'not_confirmed', message: 'A configuração da fonte de consulta é inválida.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const upstream = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${providerKey}`
      },
      body: JSON.stringify({ method, identifier }),
      signal: controller.signal,
      cache: 'no-store'
    });

    if (!upstream.ok) {
      return res.status(502).json({ ok: false, code: 'PROVIDER_ERROR', status: 'not_confirmed', message: 'A fonte autorizada está indisponível no momento. Nenhum resultado foi confirmado.' });
    }

    const data = await upstream.json();
    const status = ['match', 'no_match', 'inconclusive'].includes(data?.status) ? data.status : 'inconclusive';
    const sources = Array.isArray(data?.sources)
      ? data.sources.filter(item => typeof item === 'string').slice(0, 5)
      : [];

    return res.status(200).json({
      ok: true,
      code: 'CONSULTATION_COMPLETED',
      status,
      sources,
      message: responseMessage(status)
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    return res.status(502).json({
      ok: false,
      code: timedOut ? 'PROVIDER_TIMEOUT' : 'PROVIDER_CONNECTION_ERROR',
      status: 'not_confirmed',
      message: 'Não foi possível concluir a consulta com a fonte autorizada. Tente novamente mais tarde.'
    });
  } finally {
    clearTimeout(timeout);
  }
}
