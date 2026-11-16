const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../lib/chess-engine');
const january = new Date('2027-01-01T10:00:00Z');
const august = new Date('2027-08-01T00:00:00Z');
function register(state, name) { return engine.apply(state, { action: 'register', name, status: 'Title Challenger' }, false, january); }
function result(state, match, outcome, extra = {}) { const s = engine.current(state, august); return engine.apply(state, { action: 'result', matchId: match.id, result: outcome, year: s.year, revision: s.revision, ...extra }, true, august); }
test('Vienna deadline and January reset preserve history and start at zero', () => {
  const state = engine.initial();
  assert.equal(engine.view(state, new Date('2026-11-16')).phase, 'finished');
  register(state, 'A'); register(state, 'B');
  assert.equal(engine.view(state, new Date('2027-07-31T21:59:59Z')).registrationOpen, true);
  const closed = engine.view(state, new Date('2027-07-31T22:00:00Z'));
  assert.equal(closed.registrationOpen, false); assert.equal(closed.matches.length, 1);
  assert.throws(() => engine.apply(state, { action: 'register', name: 'C', status: 'Title Challenger' }, false, august), /closed/);
  assert.equal(closed.leaderboard[0].points, 0);
  const next = engine.view(state, new Date('2027-12-31T23:00:00Z'));
  assert.equal(next.year, 2028); assert.equal(next.players.length, 0); assert.equal(next.registrationOpen, true);
  assert.equal(state.seasons[2027].players.length, 2); assert.equal(next.champions[0].name, 'Marvelous');
});
test('duplicate names, invalid status, organizer permission and stale results are rejected', () => {
  const state = engine.initial(); register(state, 'Alice'); register(state, 'Bob');
  assert.throws(() => register(state, ' alice '), /already registered/);
  assert.throws(() => engine.apply(state, { action: 'register', name: 'C', status: 'Invalid' }, false, january), /status/);
  const s = engine.current(state, august), m = s.matches[0];
  const body = { action: 'result', year: 2027, revision: s.revision, matchId: m.id, result: 'white' };
  assert.throws(() => engine.apply(state, body, false, august), /sign in/);
  engine.apply(state, body, true, august);
  assert.throws(() => engine.apply(state, body, true, august), /changed/);
});
test('round robin has unique stable pairings, win/draw scoring, and cannot finish early', () => {
  const state = engine.initial(); ['A', 'B', 'C', 'D'].forEach(n => register(state, n));
  const copy = JSON.parse(JSON.stringify(state));
  const s = engine.current(state, august);
  assert.equal(s.matches.length, 6); assert.deepEqual(s.matches, engine.current(copy, august).matches);
  assert.equal(new Set(s.matches.map(m => [m.white, m.black].sort().join(':'))).size, 6);
  assert.throws(() => engine.apply(state, { action: 'finish', year: s.year, revision: s.revision }, true, august), /Complete/);
  result(state, s.matches[0], 'white'); result(state, s.matches[1], 'draw');
  assert.equal(engine.standings(s).reduce((n, p) => n + p.points, 0), 5);
});
test('two-way drawn playoffs repeat, corrections reset dependent games, champion is locked', () => {
  const state = engine.initial(); register(state, 'A'); register(state, 'B');
  const s = engine.current(state, august), league = s.matches[0];
  result(state, league, 'draw'); assert.equal(s.phase, 'playoff');
  result(state, s.matches[1], 'draw'); assert.equal(s.matches.length, 3);
  assert.throws(() => result(state, league, 'white'), /Confirm/);
  result(state, league, 'draw', { confirmReset: true }); assert.equal(s.matches.length, 2);
  const final = s.matches[1]; result(state, final, 'black'); assert.equal(s.phase, 'ready');
  const name = s.players.find(p => p.id === s.winner).name;
  const view = engine.apply(state, { action: 'finish', year: s.year, revision: s.revision }, true, august);
  assert.equal(view.champions[0].name, name); assert.equal(view.champions[0].year, 2027);
  assert.equal(view.champions[1].name, 'Marvelous');
  assert.throws(() => result(state, league, 'white', { confirmReset: true }), /cannot/);
});
test('three tied leaders get a mini-league, and another tie produces further games', () => {
  const state = engine.initial(); ['A', 'B', 'C'].forEach(n => register(state, n));
  const s = engine.current(state, august);
  for (const m of [...s.matches]) result(state, m, 'draw');
  assert.equal(s.phase, 'playoff'); assert.equal(s.matches.filter(m => m.round === 1).length, 3);
  for (const m of s.matches.filter(m => m.round === 1)) result(state, m, 'draw');
  assert.equal(s.matches.filter(m => m.round === 2).length, 3);
  const winner = s.players[0].id;
  for (const m of s.matches.filter(m => m.round === 2)) result(state, m, m.white === winner ? 'white' : m.black === winner ? 'black' : 'draw');
  assert.equal(s.winner, winner); assert.equal(s.phase, 'ready');
});
test('API enforces origin/session and retries concurrent registrations without losing players', async () => {
  const original = global.fetch;
  const previous = { ...process.env };
  process.env.SERMON_ADMIN_PASSWORD = 'test-password-123456';
  process.env.SERMON_SESSION_SECRET = 'test-secret-abcdefghijklmnopqrstuvwxyz';
  process.env.SERMON_GITHUB_OWNER = 'test'; process.env.SERMON_GITHUB_REPO = 'site'; process.env.SERMON_GITHUB_TOKEN = 'fake';
  let saved = null, sha = '0', conflict = true;
  global.fetch = async (url, options) => {
    const reply = (status, data) => ({ ok: status < 300, status, json: async () => data });
    if (options.method === 'GET') {
      if (!String(url).includes('chess-tournament.json') || !saved) return reply(404, {});
      return reply(200, { sha, content: Buffer.from(JSON.stringify(saved)).toString('base64') });
    }
    const body = JSON.parse(options.body);
    if (conflict) { conflict = false; saved = engine.initial(); engine.apply(saved, { action: 'register', name: 'Other player', status: 'Title Challenger' }, false, new Date('2028-02-01')); sha = '1'; return reply(409, {}); }
    assert.equal(body.sha, sha); saved = JSON.parse(Buffer.from(body.content, 'base64').toString()); sha = '2'; return reply(200, {});
  };
  const handler = require('../api/chess-roster');
  const invoke = async (body, headers = {}) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(text) { this.data = JSON.parse(text); } };
    await handler({ method: body ? 'POST' : 'GET', body, headers: { host: 'site.test', origin: 'https://site.test', ...headers } }, res); return res;
  };
  const RealDate = global.Date;
  try {
    // Exercise registration in a future open season without touching real data.
    global.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ['2028-02-01T12:00:00Z'])); } static now() { return new RealDate('2028-02-01T12:00:00Z').getTime(); } };
    assert.equal((await invoke({ action: 'result' })).statusCode, 401);
    assert.equal((await invoke({ action: 'register' }, { origin: 'https://evil.test' })).statusCode, 403);
    const login = await invoke({ action: 'login', password: 'test-password-123456' }); assert.equal(login.statusCode, 200);
    const cookie = login.headers['Set-Cookie'].split(';')[0]; assert.match(cookie, /bol_chess_session=/);
    const registration = await invoke({ action: 'register', name: 'New player', status: 'Title Challenger' });
    assert.equal(registration.statusCode, 200); assert.equal(registration.data.players.length, 2);
    const shared = await invoke(null, { cookie }); assert.equal(shared.data.authenticated, true); assert.equal(shared.data.players.length, 2);
    assert.equal((await invoke(null, { cookie: cookie + 'x' })).data.authenticated, false);
  } finally { global.Date = RealDate; global.fetch = original; for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key]; Object.assign(process.env, previous); }
});
