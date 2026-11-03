export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Método não permitido.' });
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ ok: false, code: 'GOOGLE_NOT_CONFIGURED', message: 'Autenticação Google ainda não configurada.' });
  const credential = req.body?.credential;
  if (typeof credential !== 'string' || credential.length < 100 || credential.length > 10000) {
    return res.status(400).json({ ok: false, message: 'Credencial inválida.' });
  }
  try {
    const response = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential), { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!response.ok) return res.status(401).json({ ok: false, message: 'A autenticação Google não foi validada.' });
    const claims = await response.json();
    const now = Math.floor(Date.now() / 1000);
    if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) ||
        claims.aud !== clientId || !claims.sub || !claims.email ||
        claims.email_verified !== 'true' || !Number.isFinite(Number(claims.exp)) ||
        Number(claims.exp) <= now) {
      return res.status(401).json({ ok: false, message: 'Credencial Google inválida, expirada ou sem e-mail verificado.' });
    }
    const email = String(claims.email).trim().toLowerCase();
    const gmail = email.endsWith('@gmail.com');
    const workspace = typeof claims.hd === 'string' && claims.hd.length > 0;
    return res.status(200).json({
      ok: true,
      status: 'google_identity_verified',
      email,
      emailOwnership: (gmail || workspace) ? 'authoritative' : 'additional_verification_required',
      verifiedAt: new Date().toISOString(),
      message: 'Identidade Google validada. Isso não verifica cadastro em plataformas de relacionamento.'
    });
  } catch {
    return res.status(502).json({ ok: false, message: 'Não foi possível validar a credencial com o Google.' });
  }
}
