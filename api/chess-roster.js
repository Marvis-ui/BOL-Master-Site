const crypto = require('node:crypto');
const engine = require('../lib/chess-engine');
const COOKIE = 'bol_chess_session';
const HOURS = 8 * 60 * 60;
const equal = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
function originOK(req) {
  try { return new URL(req.headers.origin || req.headers.referer).host === req.headers.host; } catch { return false; }
}
function cookie(value, age) { return `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`; }
function signature(expiry) { return crypto.createHmac('sha256', process.env.SERMON_SESSION_SECRET).update('chess:' + expiry).digest('base64url'); }
function authenticated(req) {
  if ((process.env.SERMON_SESSION_SECRET || '').length < 32) return false;
  const value = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='));
  if (!value) return false;
  const [expiry, sig] = value.slice(COOKIE.length + 1).split('.');
  return Number(expiry) > Date.now() && Number(expiry) <= Date.now() + HOURS * 1000 && equal(sig, signature(expiry));
}
function settings() {
  const owner = process.env.SERMON_GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER || '';
  const repo = process.env.SERMON_GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || '';
  const branch = process.env.SERMON_GITHUB_BRANCH || 'main';
  const token = process.env.SERMON_GITHUB_TOKEN;
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo) || !token) throw new Error('Tournament storage is unavailable. Please try again later.');
  return { url: `https://api.github.com/repos/${owner}/${repo}/contents/`, branch, token };
}
async function call(config, path, method = 'GET', body) {
  const response = await fetch(config.url + path + (method === 'GET' ? '?ref=' + encodeURIComponent(config.branch) : ''), {
    method, cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + config.token, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error('Tournament could not be saved. Refresh and try again.'); error.status = response.status; throw error; }
  return data;
}
async function read(config, path) {
  try {
    const file = await call(config, path);
    return { value: JSON.parse(Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8')), sha: file.sha };
  } catch (error) { if (error.status === 404) return null; throw error; }
}
async function load(config) {
  const saved = await read(config, 'chess-tournament.json');
  if (saved) {
    if (saved.value.version !== 1 || !saved.value.seasons || !Array.isArray(saved.value.champions)) throw new Error('Tournament data could not be loaded.');
    return { state: saved.value, sha: saved.sha };
  }
  const state = engine.initial();
  // The original roster was explicitly for August 2027. Preserve it in that season.
  const legacy = await read(config, 'chess-roster.json');
  if (legacy && Array.isArray(legacy.value) && legacy.value.length) {
    state.seasons[2027] = engine.season(2027, false);
    state.seasons[2027].players = legacy.value.map((p, i) => ({ id: 'legacy-' + i, name: p.name, status: p.status }));
  }
  return { state, sha: null };
}
module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { error: 'Method not allowed.' }); }
  try {
    const organizer = authenticated(req);
    let body = {};
    if (req.method === 'POST') {
      if (!originOK(req)) return send(res, 403, { error: 'This request could not be verified.' });
      if (Number(req.headers['content-length'] || 0) > 4000) return send(res, 413, { error: 'Request too large.' });
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch { return send(res, 400, { error: 'Invalid request.' }); }
      if (!body || Array.isArray(body) || typeof body !== 'object') return send(res, 400, { error: 'Invalid request.' });
      if (JSON.stringify(body).length > 4000) return send(res, 413, { error: 'Request too large.' });
      if (body.action === 'login') {
        const password = process.env.SERMON_ADMIN_PASSWORD || '';
        if (password.length < 16 || (process.env.SERMON_SESSION_SECRET || '').length < 32) return send(res, 503, { error: 'Organizer access is not configured.' });
        if (!equal(body.password || '', password)) return send(res, 401, { error: 'That password was not correct.' });
        const expiry = String(Date.now() + HOURS * 1000);
        res.setHeader('Set-Cookie', cookie(expiry + '.' + signature(expiry), HOURS));
        return send(res, 200, { authenticated: true });
      }
      if (body.action === 'logout') { res.setHeader('Set-Cookie', cookie('', 0)); return send(res, 200, { authenticated: false }); }
      if (!['register', 'result', 'finish'].includes(body.action)) return send(res, 400, { error: 'Unknown tournament action.' });
      if (body.action !== 'register' && !organizer) return send(res, 401, { error: 'Please sign in as an organizer.' });
    }
    const config = settings();
    for (let attempt = 0; attempt < 4; attempt++) {
      const { state, sha } = await load(config);
      const now = new Date();
      if (req.method === 'GET') return send(res, 200, { ...engine.view(state, now), authenticated: organizer });
      const view = engine.apply(state, body, organizer, now);
      const payload = { branch: config.branch, message: `Update ${view.year} chess tournament`, content: Buffer.from(JSON.stringify(state, null, 2) + '\n').toString('base64') };
      if (sha) payload.sha = sha;
      try { await call(config, 'chess-tournament.json', 'PUT', payload); return send(res, 200, { ...view, authenticated: organizer }); }
      catch (error) {
        if ([409, 422].includes(error.status) && attempt < 3) continue;
        throw error;
      }
    }
  } catch (error) {
    const status = [400, 401, 409].includes(error.status) ? error.status : 502;
    send(res, status, { error: status === 502 ? 'Tournament is temporarily unavailable. Please try again.' : error.message });
  }
};
