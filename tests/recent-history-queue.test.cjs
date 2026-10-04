const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app.js', 'utf8');
const queue = source.slice(source.indexOf('const recentPlayerKey ='), source.indexOf('const scanVisibleRecentHistory ='));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scenario(fetcher) {
  let renders = 0;
  const requests = [];
  const state = { activeLeagueId: 'league', auth: { user: { id: 'owner' } }, biwenger: { contextGeneration: 1, scoreId: 2, connected: false }, recentDetailsCache: {} };
  const context = vm.createContext({ state, Date, AbortController, normalize: String,
    activeFixtureContext: () => ({ biwengerLeagueId: 4, exactCompetitionSlug: 'la-liga' }), canUseApi: () => true,
    setTimeout: (fn, ms) => setTimeout(fn, ms === 18000 ? 15 : ms), clearTimeout,
    apiFetch: async (url, options) => { requests.push(JSON.parse(options.body)); return fetcher(options); },
    applyRecentDetailsToPlayer: (p, payload) => { p.sourceSummary = { biwengerHistoryLoaded: true, biwengerHistorySeasonId: payload.seasonId, biwengerHistoryContext: vm.runInContext('recentPlayerKey(player)', context), biwengerHistoryFetchedAt: Date.now() }; },
    rerenderRecentFormForPlayer: () => renders++ });
  vm.runInContext(queue, context);
  const player = { id: 'p', biwengerPlayerId: 9, name: 'Jugador', sourceSummary: { biwengerHistoryLoaded: true, biwengerHistorySeasonId: 'old-season' } };
  context.player = player;
  vm.runInContext('preloadRecentHistory(player)', context);
  await sleep(35);
  return { context, requests, state, player, renders };
}

(async () => {
  const success = await scenario(async () => ({ ok: true, json: async () => ({ ok: true, provider: 'biwenger', seasonId: 'new-season', recentMatches: [] }) }));
  assert.equal(success.requests.length, 1, 'Persisted loaded flag must not suppress refresh');
  assert.equal(success.requests[0].officialOnly, true);
  assert.equal(success.player.sourceSummary.biwengerHistorySeasonId, 'new-season');
  vm.runInContext('preloadRecentHistory(player)', success.context);
  await sleep(5);
  assert.equal(success.requests.length, 1, 'Fresh scoped history must not be requested twice');
  assert.equal(vm.runInContext('recentHistoryRunning', success.context), 0);

  const failed = await scenario(async () => ({ ok: false, json: async () => ({ error: 'Temporalmente no disponible' }) }));
  assert.equal(failed.renders, 1, 'Error must replace loading UI');
  assert.match(Object.values(failed.state.recentDetailsCache)[0].error, /Temporalmente/);
  assert.equal(vm.runInContext('recentHistoryRunning', failed.context), 0);

  const stalled = await scenario(() => new Promise(() => {}));
  assert.equal(stalled.renders, 1, 'Stalled network must end loading UI');
  assert.equal(vm.runInContext('recentHistoryRunning', stalled.context), 0, 'Stalled request must release queue slot');
  assert.match(Object.values(stalled.state.recentDetailsCache)[0].error, /tardado/);
  console.log('Recent history queue refresh, failures and deadline passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
