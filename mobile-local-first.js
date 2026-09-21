(function attachRadarLocalFirst(global) {
  "use strict";

  const SCHEMA_VERSION = 2;
  const MIGRATION_KEY = "legacy-import-v1";
  const MANAGED_KEY = /^(fantasy-market-scout|radar-fantasy)\./;
  const nativePlugin = () => global.Capacitor?.Plugins?.LocalData || null;
  const now = () => Date.now();
  const isManagedKey = (key) => MANAGED_KEY.test(String(key || ""));
  const isAccountKey = (key, scope) => String(key || "").endsWith(`.${scope}`);
  const isLegacyDeviceKey = (key) => [
    "fantasy-market-scout.api-base.v1",
    "fantasy-market-scout.device-key.v1",
    "radar-fantasy.update-check.v1",
    "radar-fantasy.settings-platform.v1",
    "radar-fantasy.theme-mode.v1",
    "radar-fantasy.theme-location.v1"
  ].includes(String(key || ""));
  const clone = (value) => {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  };
  const bytesToBase64 = (bytes) => {
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary);
  };
  const base64ToBytes = (value) => Uint8Array.from(atob(String(value || "")), (char) => char.charCodeAt(0));
  const deriveBackupKey = async (password, salt, iterations) => {
    if (typeof password !== "string" || password.length < 8) throw new Error("Usa una contraseña de respaldo de al menos 8 caracteres.");
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, material,
      { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  };

  const repository = {
    schemaVersion: SCHEMA_VERSION,
    scope: "guest",
    ready: false,
    accountOpen: false,
    migrated: false,
    memory: new Map(),
    knownKeys: new Set(),
    pending: new Map(),
    securePending: new Map(),
    flushPromise: null,
    initializationError: null,

    _legacyEntries() {
      const entries = [];
      try {
        for (let i = 0; i < global.localStorage.length; i += 1) {
          const key = global.localStorage.key(i);
          if (!isManagedKey(key)) continue;
          entries.push({ key, value: global.localStorage.getItem(key) || "" });
        }
      } catch (_) {
        // A quota/private-storage failure is reported through the native write.
      }
      return entries;
    },

    _mirror(entries) {
      try {
        entries.forEach(({ key, value }) => global.localStorage.setItem(key, String(value ?? "")));
      } catch (_) {
        // SQLite remains authoritative in the native runtime.
      }
    },

    async initialize() {
      const plugin = nativePlugin();
      if (!plugin) {
        this.ready = true;
        this.migrated = true;
        return { engine: "web-storage", schemaVersion: SCHEMA_VERSION };
      }
      try {
        if (typeof plugin.initialize === "function") await plugin.initialize({ schemaVersion: SCHEMA_VERSION });
        this.ready = true;
        return { engine: "sqlite", schemaVersion: SCHEMA_VERSION };
      } catch (error) {
        this.initializationError = error;
        this.ready = false;
        throw error;
      }
    },

    async openAccount(userId, { allowLegacyUnscoped = false } = {}) {
      const scope = String(userId || "").trim();
      if (!scope) throw new Error("La cuenta local requiere un identificador estable.");
      if (!this.ready) await this.initialize();
      if (scope !== this.scope) await this.flush();
      this.scope = scope;
      this.accountOpen = false;
      this.memory.clear();
      this.knownKeys.clear();
      this.pending.clear();
      const plugin = nativePlugin();
      if (!plugin) {
        this.migrated = true;
        return { scope, imported: 0, engine: "web-storage" };
      }
      const result = await plugin.getAll({ scope, migration: MIGRATION_KEY, includeLegacy: true });
      const legacySource = Boolean(result?.legacySource);
      const entries = (Array.isArray(result?.entries) ? result.entries : []).filter((entry) => {
        const key = String(entry?.key || "");
        return isManagedKey(key) && (!legacySource || isAccountKey(key, scope) || (allowLegacyUnscoped && isLegacyDeviceKey(key)));
      });
      this.migrated = Boolean(result?.migrated);
      entries.forEach((entry) => {
        const key = String(entry?.key || "");
        this.memory.set(key, String(entry?.value ?? ""));
        this.knownKeys.add(key);
      });
      if (!entries.length && !this.migrated) {
        const legacy = this._legacyEntries().filter((entry) => isAccountKey(entry.key, scope)
          || (allowLegacyUnscoped && isLegacyDeviceKey(entry.key)));
        if (legacy.length) {
          await plugin.setMany({ scope, migration: MIGRATION_KEY, entries: legacy.map((entry) => ({ ...entry, revision: 1 })) });
          legacy.forEach((entry) => {
            this.memory.set(entry.key, String(entry.value ?? ""));
            this.knownKeys.add(entry.key);
          });
          this.migrated = true;
        }
      } else if (entries.length) {
        this.migrated = true;
      }
      this._mirror(Array.from(this.memory, ([key, value]) => ({ key, value })));
      this.accountOpen = true;
      return { scope, imported: entries.length, engine: "sqlite", migrated: this.migrated };
    },

    isAccountOpen() {
      return this.accountOpen;
    },

    get(key, fallback = null) {
      const normalized = String(key || "");
      return this.memory.has(normalized) ? this.memory.get(normalized) : fallback;
    },

    getJSON(key, fallback = null) {
      try {
        const raw = this.get(key, null);
        return raw == null || raw === "" ? fallback : JSON.parse(raw);
      } catch (_) {
        return fallback;
      }
    },

    set(key, value) {
      const normalized = String(key || "");
      if (!isManagedKey(normalized)) throw new Error("La clave local no pertenece al namespace de la aplicación.");
      const stringValue = String(value ?? "");
      this.memory.set(normalized, stringValue);
      this.knownKeys.add(normalized);
      this.pending.set(normalized, { key: normalized, value: stringValue, revision: now() });
      return this.flushSoon();
    },

    setJSON(key, value) {
      return this.set(key, JSON.stringify(value));
    },

    remove(key) {
      const normalized = String(key || "");
      this.memory.delete(normalized);
      this.knownKeys.add(normalized);
      this.pending.set(normalized, { key: normalized, remove: true, revision: now() });
      try { global.localStorage.removeItem(normalized); } catch (_) { /* SQLite remains authoritative. */ }
      return this.flushSoon();
    },

    async flushSoon() {
      if (!this.ready || !nativePlugin()) return false;
      if (this.flushPromise) return this.flushPromise;
      this.flushPromise = new Promise((resolve, reject) => {
        global.setTimeout(() => this._drain().then(resolve, reject), 0);
      }).finally(() => { this.flushPromise = null; });
      return this.flushPromise;
    },

    async flush() {
      const plugin = nativePlugin();
      if (!plugin || !this.ready) return true;
      if (this.flushPromise) return this.flushPromise;
      this.flushPromise = this._drain().finally(() => { this.flushPromise = null; });
      return this.flushPromise;
    },

    async _drain() {
      const plugin = nativePlugin();
      if (!plugin || !this.ready) return true;
      while (this.pending.size) {
        const operations = Array.from(this.pending.values());
        await plugin.setMany({ scope: this.scope, migration: this.migrated ? MIGRATION_KEY : "", entries: operations });
        operations.forEach((entry) => {
          if (this.pending.get(entry.key) === entry) this.pending.delete(entry.key);
        });
      }
      return true;
    },

    async getSecure(key, scope = this.scope) {
      const plugin = nativePlugin();
      if (!plugin) return null;
      const result = await plugin.getSecure({ scope: String(scope || this.scope), key: String(key || "") });
      return result?.value ? JSON.parse(result.value) : null;
    },

    async setSecure(key, value, scope = this.scope) {
      const plugin = nativePlugin();
      if (!plugin) throw new Error("El almacén seguro sólo está disponible en la APK.");
      return plugin.setSecure({ scope: String(scope || this.scope), key: String(key || ""), value: JSON.stringify(value) });
    },

    async removeSecure(key, scope = this.scope) {
      const plugin = nativePlugin();
      if (plugin) await plugin.removeSecure({ scope: String(scope || this.scope), key: String(key || "") });
    },

    async exportAccount() {
      await this.flush();
      return {
        schemaVersion: SCHEMA_VERSION,
        scope: this.scope,
        exportedAt: new Date().toISOString(),
        appVersion: global.RADAR_FANTASY_VERSION || "3.13.1",
        records: Array.from(this.memory, ([key, value]) => ({ key, value }))
      };
    },

    async importAccount(payload, { replace = false } = {}) {
      if (!payload || Number(payload.schemaVersion) > SCHEMA_VERSION || !Array.isArray(payload.records)) {
        throw new Error("El respaldo no es compatible con esta versión.");
      }
      if (String(payload.scope || "") !== this.scope) throw new Error("El respaldo pertenece a otra cuenta local.");
      await this.flush();
      const records = payload.records.filter((entry) => isManagedKey(entry?.key) && typeof entry.value === "string"
        && (isAccountKey(entry.key, this.scope) || isLegacyDeviceKey(entry.key)));
      if (!records.length) throw new Error("El respaldo no contiene datos funcionales.");
      const previous = new Map(this.memory);
      const next = replace ? new Map() : new Map(previous);
      records.forEach((entry) => next.set(entry.key, entry.value));
      const operations = [];
      if (replace) previous.forEach((_, key) => operations.push({ key, remove: true, revision: now() }));
      records.forEach((entry) => operations.push({ key: entry.key, value: entry.value, revision: now() }));
      const plugin = nativePlugin();
      if (plugin) await plugin.setMany({ scope: this.scope, migration: this.migrated ? MIGRATION_KEY : "", entries: operations });
      this.memory = next;
      this.knownKeys = new Set(next.keys());
      if (replace) previous.forEach((_, key) => { try { global.localStorage.removeItem(key); } catch (_) { /* SQLite remains authoritative. */ } });
      this._mirror(Array.from(next, ([key, value]) => ({ key, value })));
      return { imported: records.length, scope: this.scope };
    },

    async exportEncryptedBackup(password) {
      const account = await this.exportAccount();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const iterations = 210000;
      const key = await deriveBackupKey(password, salt, iterations);
      const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key,
        new TextEncoder().encode(JSON.stringify(account)));
      return JSON.stringify({ format: "radar-fantasy-backup", version: 1, kdf: "PBKDF2-SHA256", iterations,
        salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) });
    },

    async importEncryptedBackup(serialized, password, options = {}) {
      if (String(serialized || "").length > 40 * 1024 * 1024) throw new Error("El respaldo supera el tamaño máximo permitido.");
      let envelope;
      try { envelope = JSON.parse(String(serialized || "")); } catch (_) { throw new Error("El archivo de respaldo no es JSON válido."); }
      const iterations = Number(envelope?.iterations || 0);
      if (envelope?.format !== "radar-fantasy-backup" || envelope.version !== 1 || envelope.kdf !== "PBKDF2-SHA256"
        || !Number.isInteger(iterations) || iterations < 100000 || iterations > 500000
        || !envelope.salt || !envelope.iv || !envelope.ciphertext) throw new Error("El respaldo no es compatible o está incompleto.");
      const salt = base64ToBytes(envelope.salt);
      const iv = base64ToBytes(envelope.iv);
      if (salt.length < 16 || salt.length > 64 || iv.length !== 12) throw new Error("Los parámetros criptográficos del respaldo no son válidos.");
      let account;
      try {
        const key = await deriveBackupKey(password, salt, iterations);
        const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, base64ToBytes(envelope.ciphertext));
        account = JSON.parse(new TextDecoder().decode(plaintext));
      } catch (_) { throw new Error("Contraseña incorrecta o respaldo dañado."); }
      return this.importAccount(account, options);
    },

    async previewEncryptedBackup(serialized, password) {
      if (String(serialized || "").length > 40 * 1024 * 1024) throw new Error("El respaldo supera el tamaño máximo permitido.");
      let envelope;
      try { envelope = JSON.parse(String(serialized || "")); } catch (_) { throw new Error("El archivo de respaldo no es JSON válido."); }
      const iterations = Number(envelope?.iterations || 0);
      if (envelope?.format !== "radar-fantasy-backup" || envelope.version !== 1 || envelope.kdf !== "PBKDF2-SHA256"
        || !Number.isInteger(iterations) || iterations < 100000 || iterations > 500000) throw new Error("El respaldo no es compatible.");
      const salt = base64ToBytes(envelope.salt);
      const iv = base64ToBytes(envelope.iv);
      try {
        const key = await deriveBackupKey(password, salt, iterations);
        const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, base64ToBytes(envelope.ciphertext));
        const account = JSON.parse(new TextDecoder().decode(plaintext));
        if (Number(account.schemaVersion) > SCHEMA_VERSION || !Array.isArray(account.records)) throw new Error("schema");
        return { scope: String(account.scope || ""), exportedAt: account.exportedAt || null, records: account.records.length };
      } catch (_) { throw new Error("Contraseña incorrecta o respaldo dañado."); }
    }
  };

  global.RadarLocalFirst = repository;
})(window);
