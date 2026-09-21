const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const records = new Map();
const secure = new Map();
const migrations = new Set();
let holdNextWrite = null;
let failNextWrite = false;
const fakePlugin = {
  async initialize() { return { engine: "sqlite", schemaVersion: 2 }; },
  async getAll({ scope, migration, includeLegacy }) {
    const own = records.get(scope) || new Map();
    const migrated = migration === "legacy-import-v1" && migrations.has(scope);
    const legacySource = own.size === 0 && !migrated && includeLegacy && (records.get("legacy") || new Map()).size > 0;
    const source = legacySource ? records.get("legacy") : own;
    return { entries: Array.from(source || [], ([key, value]) => ({ key, value })), migrated, legacySource };
  },
  async setMany({ scope, entries, migration }) {
    if (holdNextWrite) await holdNextWrite;
    if (failNextWrite) { failNextWrite = false; throw new Error("simulated durable failure"); }
    const bucket = records.get(scope) || new Map();
    entries.forEach((entry) => entry.remove ? bucket.delete(entry.key) : bucket.set(entry.key, String(entry.value ?? "")));
    records.set(scope, bucket);
    if (migration === "legacy-import-v1") migrations.add(scope);
    return { saved: entries.length };
  },
  async getSecure({ scope, key }) { return { value: secure.get(`${scope}:${key}`) || "" }; },
  async setSecure({ scope, key, value }) { secure.set(`${scope}:${key}`, value); },
  async removeSecure({ scope, key }) { secure.delete(`${scope}:${key}`); }
};

const local = new Map();
const context = {
  console,
  crypto: webcrypto,
  TextEncoder,
  TextDecoder,
  setTimeout,
  clearTimeout,
  btoa: (value) => Buffer.from(value, "binary").toString("base64"),
  atob: (value) => Buffer.from(value, "base64").toString("binary")
};
context.window = context;
context.Capacitor = { Plugins: { LocalData: fakePlugin } };
context.localStorage = {
  get length() { return local.size; },
  key(index) { return Array.from(local.keys())[index] || null; },
  getItem(key) { return local.has(key) ? local.get(key) : null; },
  setItem(key, value) { local.set(key, String(value)); },
  removeItem(key) { local.delete(key); }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("mobile-local-first.js", "utf8"), context);
const repo = context.RadarLocalFirst;

(async () => {
  await repo.initialize();
  await repo.openAccount("user-a");
  await repo.setJSON("radar-fantasy.leagues.v1.user-a", { leagues: { a: { id: "a" } } });
  await repo.flush();
  assert.deepEqual(JSON.parse(records.get("user-a").get("radar-fantasy.leagues.v1.user-a")), { leagues: { a: { id: "a" } } });
  await repo.remove("radar-fantasy.leagues.v1.user-a");
  await repo.flush();
  assert.equal(records.get("user-a").has("radar-fantasy.leagues.v1.user-a"), false, "el borrado debe ser durable");
  await repo.openAccount("user-b");
  assert.equal(repo.get("radar-fantasy.leagues.v1.user-a"), null, "las cuentas deben estar aisladas");
  await repo.set("radar-fantasy.sample.user-b", "dato");
  const backup = await repo.exportEncryptedBackup("contraseña-segura");
  await assert.rejects(() => repo.importEncryptedBackup(backup, "incorrecta", { replace: true }));
  assert.equal(repo.get("radar-fantasy.sample.user-b"), "dato", "un backup inválido no muta datos");
  const beforeFailedImport = repo.get("radar-fantasy.sample.user-b");
  failNextWrite = true;
  await assert.rejects(() => repo.importAccount({ schemaVersion: 2, scope: "user-b", records: [{ key: "radar-fantasy.sample.user-b", value: "reemplazo" }] }, { replace: true }));
  assert.equal(repo.get("radar-fantasy.sample.user-b"), beforeFailedImport, "un commit fallido no muta memoria antes de confirmar");
  let releaseWrite;
  holdNextWrite = new Promise((resolve) => { releaseWrite = resolve; });
  const firstWrite = repo.set("radar-fantasy.concurrent.user-b", "primero");
  await new Promise((resolve) => setTimeout(resolve, 5));
  const secondWrite = repo.set("radar-fantasy.concurrent-two.user-b", "segundo");
  releaseWrite();
  holdNextWrite = null;
  await Promise.all([firstWrite, secondWrite]);
  assert.equal(records.get("user-b").get("radar-fantasy.concurrent-two.user-b"), "segundo", "una escritura durante el commit queda durable antes de resolver");
  records.set("legacy", new Map([
    ["radar-fantasy.theme-mode.v1.user-other", "night"],
    ["radar-fantasy.theme-mode.v1", "day"],
    ["fantasy-market-scout.leagues.v1.user-admin", "{\"leagues\":{}}"]
  ]));
  await repo.openAccount("user-admin", { allowLegacyUnscoped: true });
  assert.equal(repo.get("radar-fantasy.theme-mode.v1.user-other"), null, "un registro legado de otra cuenta nunca se importa");
  assert.equal(repo.get("radar-fantasy.theme-mode.v1"), "day", "se conserva sólo la preferencia de dispositivo explícita");
  assert.equal(repo.get("fantasy-market-scout.leagues.v1.user-admin"), "{\"leagues\":{}}", "se recupera el snapshot legado de la propia cuenta");
  console.log(JSON.stringify({ status: "ok", scopes: records.size, backup: "aes-gcm" }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
