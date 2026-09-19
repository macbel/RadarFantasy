package com.fantasymarketscout.app;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "LocalData")
public class LocalDataPlugin extends Plugin {
    private static final String KEY_ALIAS = "radar_fantasy_local_data_v1";
    private static final String DEFAULT_SCOPE = "guest";
    private static final int MAX_KEY = 256;
    private static final int MAX_VALUE = 8 * 1024 * 1024;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean destroyed = new AtomicBoolean(false);
    private LocalDatabase database;

    @Override
    public void load() { database = new LocalDatabase(getContext()); }

    @PluginMethod
    public void initialize(PluginCall call) {
        execute(call, () -> {
            database.getReadableDatabase();
            JSObject result = new JSObject();
            result.put("engine", "sqlite");
            result.put("schemaVersion", LocalDatabase.DATABASE_VERSION);
            return result;
        }, "No se pudo abrir la base de datos local.");
    }

    @PluginMethod
    public void getAll(PluginCall call) {
        final String scope = normalizeScope(call.getString("scope", DEFAULT_SCOPE));
        execute(call, () -> {
            JSArray entries = new JSArray();
            try (Cursor cursor = database.getReadableDatabase().query("app_records",
                new String[]{"record_key", "record_value", "revision", "updated_at"},
                "scope = ?", new String[]{scope}, null, null, "record_key ASC")) {
                while (cursor.moveToNext()) {
                    JSObject entry = new JSObject();
                    entry.put("key", cursor.getString(0));
                    entry.put("value", cursor.getString(1));
                    entry.put("revision", cursor.getLong(2));
                    entry.put("updatedAt", cursor.getLong(3));
                    entries.put(entry);
                }
            }
            JSObject result = new JSObject();
            result.put("entries", entries);
            result.put("scope", scope);
            result.put("engine", "sqlite");
            return result;
        }, "No se pudo leer la base de datos local.");
    }

    @PluginMethod
    public void setMany(PluginCall call) {
        final String scope = normalizeScope(call.getString("scope", DEFAULT_SCOPE));
        final JSArray entries = call.getArray("entries", new JSArray());
        execute(call, () -> {
            SQLiteDatabase writable = database.getWritableDatabase();
            int saved = 0;
            boolean committed = false;
            writable.beginTransaction();
            try {
                JSONArray raw = entries == null ? new JSONArray() : entries;
                for (int index = 0; index < raw.length(); index += 1) {
                    JSONObject entry = raw.optJSONObject(index);
                    if (entry == null) continue;
                    String key = normalizeKey(entry.optString("key", ""));
                    long revision = Math.max(0L, entry.optLong("revision", System.currentTimeMillis()));
                    if (entry.optBoolean("remove", false)) {
                        saved += writable.delete("app_records", "scope = ? AND record_key = ?", new String[]{scope, key});
                        continue;
                    }
                    String value = entry.optString("value", "");
                    validateValue(value);
                    try (Cursor existing = writable.query("app_records", new String[]{"revision"}, "scope = ? AND record_key = ?", new String[]{scope, key}, null, null, null, "1")) {
                        if (existing.moveToFirst() && existing.getLong(0) > revision) continue;
                    }
                    ContentValues values = new ContentValues();
                    values.put("scope", scope);
                    values.put("record_key", key);
                    values.put("record_value", value);
                    values.put("revision", revision);
                    values.put("updated_at", System.currentTimeMillis());
                    writable.insertOrThrow("app_records", null, values);
                    saved += 1;
                }
                String migration = call.getString("migration", "");
                if (!migration.isEmpty()) {
                    ContentValues marker = new ContentValues();
                    marker.put("metadata_key", "migration:" + scope + ":" + normalizeKey(migration));
                    marker.put("metadata_value", "1");
                    writable.insertWithOnConflict("metadata", null, marker, SQLiteDatabase.CONFLICT_REPLACE);
                }
                writable.setTransactionSuccessful();
                committed = true;
            } finally { writable.endTransaction(); }
            if (!committed) throw new IllegalStateException("La transacción local no se confirmó");
            JSObject result = new JSObject();
            result.put("saved", saved);
            result.put("scope", scope);
            result.put("engine", "sqlite");
            return result;
        }, "No se pudieron guardar los datos locales.");
    }

    @PluginMethod
    public void remove(PluginCall call) {
        final String scope = normalizeScope(call.getString("scope", DEFAULT_SCOPE));
        final String key = normalizeKey(call.getString("key", ""));
        execute(call, () -> {
            JSObject result = new JSObject();
            result.put("removed", database.getWritableDatabase().delete("app_records", "scope = ? AND record_key = ?", new String[]{scope, key}));
            return result;
        }, "No se pudo borrar el dato local.");
    }

    @PluginMethod
    public void getSecure(PluginCall call) {
        final String scope = normalizeScope(call.getString("scope", DEFAULT_SCOPE));
        final String key = normalizeKey(call.getString("key", ""));
        execute(call, () -> {
            try (Cursor cursor = database.getReadableDatabase().query("secure_records", new String[]{"encrypted_value"},
                "scope = ? AND record_key = ?", new String[]{scope, key}, null, null, null, "1")) {
                JSObject result = new JSObject();
                result.put("value", cursor.moveToFirst() ? decrypt(cursor.getString(0)) : "");
                return result;
            }
        }, "No se pudo leer el almacén seguro.");
    }

    @PluginMethod
    public void setSecure(PluginCall call) {
        final String scope = normalizeScope(call.getString("scope", DEFAULT_SCOPE));
        final String key;
        final String value;
        try {
            key = normalizeKey(call.getString("key", ""));
            value = call.getString("value", "");
            validateValue(value);
        } catch (Exception error) {
            call.reject(error.getMessage(), error);
            return;
        }
        execute(call, () -> {
            ContentValues values = new ContentValues();
            values.put("scope", scope);
            values.put("record_key", key);
            values.put("encrypted_value", encrypt(value));
            values.put("updated_at", System.currentTimeMillis());
            database.getWritableDatabase().insertOrThrow("secure_records", null, values);
            return new JSObject();
        }, "No se pudo escribir en el almacén seguro.");
    }

    @PluginMethod
    public void removeSecure(PluginCall call) {
        final String scope = normalizeScope(call.getString("scope", DEFAULT_SCOPE));
        final String key = normalizeKey(call.getString("key", ""));
        execute(call, () -> {
            JSObject result = new JSObject();
            result.put("removed", database.getWritableDatabase().delete("secure_records", "scope = ? AND record_key = ?", new String[]{scope, key}));
            return result;
        }, "No se pudo borrar el secreto local.");
    }

    private interface Operation { JSObject run() throws Exception; }

    private void execute(PluginCall call, Operation operation, String message) {
        if (destroyed.get()) { call.reject("El almacenamiento local ya se ha cerrado."); return; }
        try {
            executor.execute(() -> {
                if (destroyed.get()) { call.reject("El almacenamiento local ya se ha cerrado."); return; }
                try { call.resolve(operation.run()); }
                catch (Exception error) { call.reject(message, error); }
            });
        } catch (RejectedExecutionException error) { call.reject("El almacenamiento local ya se ha cerrado.", error); }
    }

    private static String normalizeScope(String value) {
        String scope = String.valueOf(value == null ? "" : value).trim();
        if (scope.isEmpty() || scope.length() > MAX_KEY || !scope.matches("[A-Za-z0-9._:-]+")) throw new IllegalArgumentException("Scope local no válido");
        return scope;
    }

    private static String normalizeKey(String value) {
        String key = String.valueOf(value == null ? "" : value).trim();
        if (key.isEmpty() || key.length() > MAX_KEY) throw new IllegalArgumentException("Clave local no válida");
        return key;
    }

    private static void validateValue(String value) {
        if (value == null || value.getBytes(StandardCharsets.UTF_8).length > MAX_VALUE) throw new IllegalArgumentException("Valor local demasiado grande");
    }

    private SecretKey encryptionKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) return ((KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null)).getSecretKey();
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }

    private String encrypt(String plainText) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, encryptionKey());
        byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
        byte[] iv = cipher.getIV();
        ByteBuffer payload = ByteBuffer.allocate(4 + iv.length + encrypted.length).putInt(iv.length).put(iv).put(encrypted);
        return Base64.encodeToString(payload.array(), Base64.NO_WRAP);
    }

    private String decrypt(String encoded) throws Exception {
        byte[] payload = Base64.decode(encoded, Base64.NO_WRAP);
        ByteBuffer buffer = ByteBuffer.wrap(payload);
        int ivLength = buffer.getInt();
        if (ivLength < 12 || ivLength > 32 || buffer.remaining() <= ivLength) throw new IllegalArgumentException("Contenido cifrado no válido");
        byte[] iv = new byte[ivLength];
        buffer.get(iv);
        byte[] encrypted = new byte[buffer.remaining()];
        buffer.get(encrypted);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, encryptionKey(), new GCMParameterSpec(128, iv));
        return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
    }

    @Override
    protected void handleOnDestroy() {
        destroyed.set(true);
        executor.shutdownNow();
        if (database != null) database.close();
    }

    private static final class LocalDatabase extends SQLiteOpenHelper {
        private static final String DATABASE_NAME = "radar-fantasy.db";
        private static final int DATABASE_VERSION = 2;

        LocalDatabase(Context context) { super(context, DATABASE_NAME, null, DATABASE_VERSION); }

        @Override
        public void onCreate(SQLiteDatabase db) {
            db.execSQL("CREATE TABLE metadata (metadata_key TEXT PRIMARY KEY NOT NULL, metadata_value TEXT NOT NULL)");
            db.execSQL("CREATE TABLE app_records (scope TEXT NOT NULL, record_key TEXT NOT NULL, record_value TEXT NOT NULL, revision INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(scope, record_key))");
            db.execSQL("CREATE TABLE secure_records (scope TEXT NOT NULL, record_key TEXT NOT NULL, encrypted_value TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(scope, record_key))");
        }

        @Override
        public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
            if (oldVersion < 2) {
                db.execSQL("ALTER TABLE app_records RENAME TO app_records_legacy");
                db.execSQL("CREATE TABLE app_records (scope TEXT NOT NULL, record_key TEXT NOT NULL, record_value TEXT NOT NULL, revision INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(scope, record_key))");
                db.execSQL("INSERT OR IGNORE INTO app_records(scope, record_key, record_value, revision, updated_at) SELECT 'legacy', record_key, record_value, updated_at, updated_at FROM app_records_legacy");
                db.execSQL("DROP TABLE app_records_legacy");
                db.execSQL("CREATE TABLE metadata (metadata_key TEXT PRIMARY KEY NOT NULL, metadata_value TEXT NOT NULL)");
                db.execSQL("ALTER TABLE secure_records RENAME TO secure_records_legacy");
                db.execSQL("CREATE TABLE secure_records (scope TEXT NOT NULL, record_key TEXT NOT NULL, encrypted_value TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(scope, record_key))");
                db.execSQL("INSERT OR IGNORE INTO secure_records(scope, record_key, encrypted_value, updated_at) SELECT 'legacy', record_key, encrypted_value, updated_at FROM secure_records_legacy");
                db.execSQL("DROP TABLE secure_records_legacy");
            }
        }
    }
}
