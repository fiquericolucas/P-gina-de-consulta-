import { createPublicKey, createVerify } from 'node:crypto';

const DISCOVERY_URL = 'https://accounts.google.com/.well-known/openid-configuration';
let jwksCache = { keys: null, expiresAt: 0, uri: null };

function decodePart(part) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

async function getGoogleKeys() {
  const now = Date.now();
  if (jwksCache.keys && jwksCache.expiresAt > now) return jwksCache;
  const discoveryResponse = await fetch(DISCOVERY_URL, { headers: { Accept: 'application/json' } });
  if (!discoveryResponse.ok) throw new Error('Google discovery unavailable');
  const discovery = await discoveryResponse.json();
  if (discovery.issuer !== 'https://accounts.google.com' || typeof discovery.jwks_uri !== 'string') {
    throw new Error('Invalid Google discovery document');
  }
  const keysResponse = await fetch(discovery.jwks_uri, { headers: { Accept: 'application/json' } });
  if (!keysResponse.ok) throw new Error('Google signing keys unavailable');
  const keySet = await keysResponse.json();
  if (!Array.isArray(keySet.keys) || !keySet.keys.length) throw new Error('Google signing keys missing');
  const cacheControl = keysResponse.headers.get('cache-control') || '';
  const maxAge = Number((cacheControl.match(/max-age=(\d+)/i) || [])[1] || 3600);
  jwksCache = { keys: keySet.keys, uri: discovery.jwks_uri, expiresAt: now + Math.min(maxAge, 86400) * 1000 };
  return jwksCache;
}

async function verifyGoogleIdToken(token, clientId) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed ID token');
  const header = decodePart(parts[0]);
  const claims = decodePart(parts[1]);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('Unsupported token signature');
  const keySet = await getGoogleKeys();
  const jwk = keySet.keys.find(key => key.kid === header.kid && key.kty === 'RSA' && (!key.use || key.use === 'sig'));
  if (!jwk) {
    jwksCache.expiresAt = 0;
    throw new Error('Google signing key not found');
  }
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  const verifier = createVerify('RSA-SHA256');
  verifier.update(parts[0] + '.' + parts[1]);
  verifier.end();
  if (!verifier.verify(publicKey, Buffer.from(parts[2], 'base64url'))) throw new Error('Invalid token signature');

  const now = Math.floor(Date.now() / 1000);
  const audienceMatches = claims.aud === clientId || (Array.isArray(claims.aud) && claims.aud.includes(clientId));
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) ||
      !audienceMatches || !claims.sub || !claims.email ||
      !(claims.email_verified === true || claims.email_verified === 'true') ||
      !Number.isFinite(Number(claims.exp)) || Number(claims.exp) <= now ||
      !Number.isFinite(Number(claims.iat)) || Number(claims.iat) > now + 60) {
    throw new Error('Invalid or expired Google ID token claims');
  }
  if (claims.azp && claims.azp !== clientId) throw new Error('Invalid authorized presenter');
  return claims;
}

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
    const claims = await verifyGoogleIdToken(credential, clientId);
    return res.status(200).json({
      ok: true,
      status: 'google_identity_verified',
      email: String(claims.email).trim().toLowerCase(),
      emailOwnership: 'google_verified_claim',
      verifiedAt: new Date().toISOString(),
      message: 'Token de identidade validado pela assinatura e pelas chaves públicas oficiais do Google. Para comprovar acesso atual à caixa postal, use também um código enviado por e-mail. Isso não verifica cadastro em plataformas de relacionamento.'
    });
  } catch {
    return res.status(401).json({ ok: false, message: 'A credencial Google não pôde ser validada. Tente autenticar novamente.' });
  }
}
