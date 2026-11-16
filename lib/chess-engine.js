const crypto = require('node:crypto');
const STATUSES = new Set(['Title Challenger', 'Defending Champion', 'Returning Player', 'First-Time Player']);
const fail = message => { const error = new Error(message); error.status = 400; throw error; };
function clock(now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = type => Number(date.find(p => p.type === type).value);
  return { year: part('year'), closed: part('month') > 7 };
}
function initial() {
  return { version: 1, champions: [{ year: 2026, name: 'Marvelous' }, { year: 2025, name: 'Ify' }, { year: 2024, name: 'Ify' }], seasons: {} };
}
function season(year, completed) {
  return { year, revision: 0, phase: completed ? 'finished' : 'registration', players: [], matches: [], winner: null };
}
function pairs(ids, round) {
  const matches = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const flip = (i + j + round) % 2;
    const id = crypto.createHash('sha256').update(JSON.stringify([round, ids[i], ids[j]])).digest('hex').slice(0, 24);
    matches.push({ id, white: ids[flip ? j : i], black: ids[flip ? i : j], round, result: null });
  }
  return matches;
}
function standings(s, round = 0, ids = s.players.map(p => p.id)) {
  return ids.map(id => {
    const player = s.players.find(p => p.id === id);
    const row = { id, name: player.name, status: player.status, points: 0, played: 0, wins: 0, draws: 0, losses: 0 };
    for (const m of s.matches.filter(m => m.round === round && m.result !== null && (m.white === id || m.black === id))) {
      row.played++;
      if (m.result === 'draw') { row.points++; row.draws++; }
      else if ((m.result === 'white') === (m.white === id)) { row.points += 3; row.wins++; }
      else row.losses++;
    }
    return row;
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
function advance(s) {
  if (s.phase === 'finished' || s.phase === 'registration' || !s.matches.length || s.matches.some(m => m.result === null)) return;
  const round = Math.max(...s.matches.map(m => m.round));
  const games = s.matches.filter(m => m.round === round);
  const ids = [...new Set(games.flatMap(m => [m.white, m.black]))];
  const rows = standings(s, round, ids);
  const tied = rows.filter(p => p.points === rows[0].points).map(p => p.id);
  if (tied.length === 1) { s.phase = 'ready'; s.winner = tied[0]; }
  else { s.phase = 'playoff'; s.matches.push(...pairs(tied, round + 1)); }
}
function current(state, now = new Date()) {
  const { year, closed } = clock(now);
  if (!state.seasons[year]) state.seasons[year] = season(year, state.champions.some(c => c.year === year));
  const s = state.seasons[year];
  if (closed && s.phase === 'registration') { s.phase = 'league'; s.matches = pairs(s.players.map(p => p.id), 0); }
  return s;
}
function view(state, now) {
  const s = current(state, now);
  return { ...s, registrationOpen: s.phase === 'registration', leaderboard: standings(s), champions: [...state.champions].sort((a, b) => b.year - a.year) };
}
function apply(state, body, organizer, now = new Date()) {
  const s = current(state, now);
  if (body.action === 'register') {
    if (s.phase !== 'registration') fail('Registration is closed. Registration closes July 31st.');
    const name = String(body.name || '').trim().replace(/\s+/g, ' ');
    if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) fail('Enter a name or nickname of 1 to 80 characters.');
    if (!STATUSES.has(body.status)) fail('Choose a listed player status.');
    if (s.players.length >= 300) fail('The roster is full. Please contact an organizer.');
    if (s.players.some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())) fail('That name is already registered. Use a different nickname if needed.');
    s.players.push({ id: crypto.randomUUID(), name, status: body.status });
  } else {
    if (!organizer) { const e = new Error('Please sign in as an organizer.'); e.status = 401; throw e; }
    if (Number(body.year) !== s.year || Number(body.revision) !== s.revision) { const e = new Error('The tournament changed. Refresh and try again.'); e.status = 409; throw e; }
    if (body.action === 'result') {
      if (!['league', 'playoff', 'ready'].includes(s.phase)) fail('Results cannot be entered now.');
      const m = s.matches.find(m => m.id === body.matchId);
      if (!m || !['white', 'black', 'draw', null].includes(body.result)) fail('Choose a listed match and result.');
      // Correcting an earlier round invalidates all dependent playoff rounds.
      const downstream = s.matches.some(game => game.round > m.round);
      if (downstream && body.confirmReset !== true) fail('Confirm that correcting this result will clear later playoff games.');
      s.matches = s.matches.filter(game => game.round <= m.round);
      m.result = body.result; s.winner = null; s.phase = m.round ? 'playoff' : 'league';
      advance(s);
    } else if (body.action === 'finish') {
      if (s.phase !== 'ready' || !s.winner || s.matches.some(m => m.result === null)) fail('Complete every match and resolve all ties before finishing.');
      const winner = s.players.find(p => p.id === s.winner);
      state.champions = state.champions.filter(c => c.year !== s.year).concat([{ year: s.year, name: winner.name }]);
      s.phase = 'finished'; s.finishedAt = now.toISOString();
    } else fail('Unknown tournament action.');
  }
  s.revision++;
  return view(state, now);
}
module.exports = { clock, initial, season, current, view, apply, standings };
