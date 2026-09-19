const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const records = new Map();
const secure = new Map();
const fakePlugin = {
  async initialize() { return { engine: "sqlite", schemaVersion: 2 }; },
  async getAll({ scope }) { return { entries: Array.from(records.get(scope) || [], ([key, value]) => ({ key, value })) }; },
  async setMany({ scope, entries }) {
    const bucket = records.get(scope) || new Map();
    entries.forEach((entry) => entry.remove ? bucket.delete(entry.key) : bucket.set(entry.key, String(entry.value ?? "")));
    records.set(scope, bucket);
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
  console.log(JSON.stringify({ status: "ok", scopes: records.size, backup: "aes-gcm" }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
