(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let state = null, busy = false;
  function el(tag, text, cls) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; }
  function message(text, error = false) { $('tournament-message').textContent = text; $('tournament-message').style.color = error ? 'var(--danger)' : 'var(--success)'; }
  async function request(body) {
    const response = await fetch('/api/chess-roster', body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Tournament could not be loaded.');
    return data;
  }
  function render() {
    $('chess-year').textContent = state.year;
    const open = state.registrationOpen;
    $('chess-signup').hidden = !open;
    $('registration-state').textContent = open ? 'Sign up for this August’s tournament.' : state.phase === 'finished' ? 'This year’s tournament is complete. Registration opens January 1st.' : 'Registration is closed. Matches take place in August.';
    $('roster-list').replaceChildren();
    if (!state.players.length) $('roster-list').append(el('li', 'No players have signed up yet—be the first to join!'));
    state.players.forEach(p => { const row = el('li'); row.append(el('strong', p.name), el('span', p.status, 'muted')); $('roster-list').append(row); });
    const labels = { registration: 'Registration open', league: 'Round-robin league', playoff: 'Tie playoff in progress', ready: 'All games complete. Awaiting organizer confirmation.', finished: 'Tournament complete' };
    $('tournament-state').textContent = state.year + ' · ' + labels[state.phase];
    if (state.phase === 'league' && state.players.length < 2) $('tournament-state').textContent += ' · At least two registered players are needed to play.';
    $('chess-leaderboard').replaceChildren();
    state.leaderboard.forEach(p => { const row = el('tr'); [p.name, p.played, p.wins, p.draws, p.losses, p.points].forEach(value => row.append(el('td', value))); $('chess-leaderboard').append(row); });
    if (!state.players.length) { const cell = el('td', 'No players yet.'); cell.colSpan = 6; const row = el('tr'); row.append(cell); $('chess-leaderboard').append(row); }
    $('chess-login').hidden = state.authenticated;
    $('chess-controls').hidden = !state.authenticated;
    $('chess-finish').hidden = state.phase !== 'ready';
    const names = Object.fromEntries(state.players.map(p => [p.id, p.name]));
    $('chess-matches').replaceChildren();
    if (!state.matches.length) $('chess-matches').append(el('p', state.registrationOpen ? 'Matchups appear after registration closes.' : 'No matches scheduled.', 'muted'));
    let lastRound = -1;
    state.matches.forEach(m => {
      if (lastRound !== m.round) { $('chess-matches').append(el('h4', m.round ? 'Playoff ' + m.round : 'League games')); lastRound = m.round; }
      const row = el('div', undefined, 'chess-match');
      row.append(el('span', names[m.white] + ' (White) vs ' + names[m.black] + ' (Black)'));
      const resultLabel = m.result === 'draw' ? 'Draw · 1 point each' : m.result ? names[m[m.result]] + ' wins · 3 points' : 'Awaiting result';
      row.append(el('strong', resultLabel));
      if (state.authenticated && ['league', 'playoff', 'ready'].includes(state.phase)) {
        const select = el('select'); select.setAttribute('aria-label', 'Result: ' + names[m.white] + ' vs ' + names[m.black]);
        [['', 'Awaiting result'], ['white', names[m.white] + ' wins'], ['black', names[m.black] + ' wins'], ['draw', 'Draw']].forEach(([value, text]) => { const option = el('option', text); option.value = value; select.append(option); });
        select.value = m.result || ''; select.disabled = busy;
        select.addEventListener('change', async () => {
          const downstream = state.matches.some(game => game.round > m.round);
          if (downstream && !window.confirm('Correct this result? All later playoff games and their results will be cleared.')) { select.value = m.result || ''; return; }
          await mutate({ action: 'result', matchId: m.id, result: select.value || null, confirmReset: downstream }, 'Result saved.');
        }); row.append(select);
      }
      $('chess-matches').append(row);
    });
    const champions = state.champions;
    if (champions.length) {
      $('champion-spotlight').replaceChildren(el('div', 'Reigning ' + champions[0].year + ' Champion', 'eyebrow'), el('h2', champions[0].name));
      $('champion-history').replaceChildren();
      champions.forEach((c, index) => { const row = el('div', undefined, 'champion-row'); row.append(el('span', c.year, 'year-tag' + (index ? '' : ' current')), el('strong', c.name), el('small', Number(c.year) === 2024 ? 'Inaugural Champ' : index ? 'August ' + c.year : 'Current Champ')); $('champion-history').append(row); });
    }
  }
  function disable(value) {
    document.querySelectorAll('#chess-signup button, #chess-login button, #chess-controls button, #chess-matches select').forEach(node => { node.disabled = value; });
  }
  async function mutate(body, success) {
    if (busy) return;
    busy = true; disable(true); message('Saving…');
    try {
      const data = await request({ ...body, year: state.year, revision: state.revision });
      if (body.action === 'login' || body.action === 'logout') state = await request(); else state = data;
      message(success); if (body.action === 'register') $('chess-signup').reset();
      if (body.action === 'login') $('chess-password').value = '';
    } catch (error) {
      message(error.message, true);
      try { state = await request(); } catch { /* Keep visible data with the error message. */ }
    } finally { busy = false; disable(false); if (state) render(); }
  }
  $('chess-signup').addEventListener('submit', event => { event.preventDefault(); if (state) mutate({ action: 'register', name: $('player-name').value, status: $('player-level').value }, 'You’re on the roster!'); });
  $('chess-login').addEventListener('submit', event => { event.preventDefault(); if (state) mutate({ action: 'login', password: $('chess-password').value }, 'Signed in as organizer.'); });
  $('chess-logout').addEventListener('click', () => mutate({ action: 'logout' }, 'Signed out.'));
  $('chess-finish').addEventListener('click', () => {
    const winner = state.players.find(p => p.id === state.winner);
    if (winner && window.confirm('Finish this tournament and crown ' + winner.name + '? Results will be locked.')) mutate({ action: 'finish' }, 'Champion added to the Hall of Champions!');
  });
  async function refresh() {
    if (busy) return;
    try { const data = await request(); if (!busy) { state = data; render(); } }
    catch (error) { message(error.message, true); $('registration-state').textContent = 'Registration could not be loaded. Please refresh to try again.'; }
  }
  // Keep data fresh without interrupting result selection or a form being filled in.
  setInterval(() => { if (document.visibilityState === 'visible' && !document.activeElement.closest('form, #chess-matches')) refresh(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
  $('chess-signup').hidden = true;
  refresh();
})();
