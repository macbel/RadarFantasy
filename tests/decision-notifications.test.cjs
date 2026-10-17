const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app.js', 'utf8');
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const values = new Map();
let attempts = 0;
const context = { Date, Number, String, Math, Notification: { permission: 'granted' }, navigator: {},
  state: { preferences: { notifications: true } }, platformUserCanAccess: () => true,
  decisionContextKey: () => 'user:league', notificationPolicy: () => ({minimum:82,groupMinutes:0}), notificationIsQuiet: () => false,
  readJsonStorage: (key, fallback) => values.get(key) ?? fallback,
  writeJsonStorage: (key, value) => values.set(key,value), assetUrl: (value) => value,
  window: { Capacitor: { Plugins: { LocalNotifications: {schedule: async () => { attempts++; throw new Error('device rejected'); }} } } } };
vm.createContext(context);
vm.runInContext(extract('const notificationIdFrom =', 'const notifyDailyPlanIfNeeded =').replaceAll('const ', 'var '), context);
(async () => {
  assert.equal(await vm.runInContext('showDecisionNotification("title","body","tag")', context), false);
  assert.equal(values.size, 0, 'Failed delivery must not record successful delivery time');
  context.window.Capacitor.Plugins.LocalNotifications.schedule = async () => { attempts++; };
  assert.equal(await vm.runInContext('showDecisionNotification("title","body","tag")', context), true);
  assert.equal(values.size, 1);
  context.notificationIsQuiet = () => true;
  assert.equal(await vm.runInContext('showDecisionNotification("title","body","tag")', context), false);
  assert.equal(attempts, 2, 'Quiet hours must block native delivery');
  context.notificationIsQuiet = () => false;
  context.notificationPolicy = () => ({ minimum:100,groupMinutes:0 });
  assert.equal(await vm.runInContext('showDecisionNotification("title","body","tag","favorites",82)', context), false);
  context.notificationPolicy = () => ({ minimum:82,groupMinutes:30 });
  assert.equal(await vm.runInContext('showDecisionNotification("title","body","tag")', context), false);
  context.state.favorites = [{ id: 'p1' }, { id: 'p2' }];
  context.favoritePlayerKey = (player) => player.id;
  vm.runInContext(extract('const flushFavoriteNotificationQueue =', 'const processFavoriteWatchTransitions ='), context);
  let deliveries = [];
  context.stubDelivery = async (...args) => { deliveries.push(args); return false; };
  vm.runInContext('showDecisionNotification = stubDelivery', context);
  const current = { p1: { inMarket: true, sellerType: 'free', sellerName: '', salePrice: 10 }, p2: { clauseAvailable: true, clause: 20 } };
  const alerts = [{ id: 'one', playerKey: 'p1', playerName: 'Uno', kind: 'market', message: 'En venta' }, { id: 'two', playerKey: 'p2', playerName: 'Dos', kind: 'clause', message: 'Disponible' }];
  context.newAlerts = alerts; context.currentPlayers = current; context.now = 100000000;
  await vm.runInContext('flushFavoriteNotificationQueue(newAlerts,currentPlayers,now)', context);
  assert.equal(deliveries.length, 1, 'Several favorite transitions must produce one grouped notification');
  const queueKey = 'radar-fantasy.favorite-notification-queue.v1.user:league';
  assert.equal(values.get(queueKey).length, 2, 'Silenced or failed favorites must stay pending');
  context.stubDelivery = async (...args) => { deliveries.push(args); return true; };
  vm.runInContext('showDecisionNotification = stubDelivery', context);
  await vm.runInContext('flushFavoriteNotificationQueue([],currentPlayers,now+1000)', context);
  assert.equal(values.get(queueKey).length, 0, 'Successful retry must remove delivered favorites');
  context.stubDelivery = async () => false;
  vm.runInContext('showDecisionNotification = stubDelivery', context);
  await vm.runInContext('flushFavoriteNotificationQueue(newAlerts,currentPlayers,now)', context);
  context.currentPlayers.p1.inMarket = false;
  await vm.runInContext('flushFavoriteNotificationQueue([],currentPlayers,now+1000)', context);
  assert.equal(values.get(queueKey).length, 1, 'A player no longer in market must not trigger an old notification');
  await vm.runInContext('flushFavoriteNotificationQueue([],currentPlayers,now+7*3600000)', context);
  assert.equal(values.get(queueKey).length, 0, 'Pending notifications must expire after their six-hour lifetime');
  console.log('Decision notifications: delivery, quiet hours, priority, grouping, favorite retries, staleness and TTL passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
