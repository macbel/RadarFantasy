const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
const java = fs.readFileSync(path.join(root, "android/app/src/main/java/com/fantasymarketscout/app/AppUpdaterPlugin.java"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const script = source.slice(source.indexOf("const readAndroidUpdateManifest ="), source.indexOf("const setDeviceBackupStatus ="));
const valid = { version: "3.13.4", versionCode: 62, packageName: "com.fantasymarketscout.app", apkUrl: "https://alufi.es/fms/Radar-Fantasy-Android-v3.13.4.apk", sha256: "a".repeat(64), size: 1234 };

function client(responses, lastCheck = "0") {
  const calls = [];
  const statuses = [];
  const popups = [];
  const context = {
    APP_VERSION: "3.13.3",
    APP_VERSION_CODE: 61,
    APP_UPDATE_CHECK_KEY: "last",
    ANDROID_UPDATE_MANIFEST_URL: "https://alufi.es/fms/android-update.json",
    LATEST_RELEASE_API_URL: "https://api.github.com/repos/macbel/RadarFantasy/releases/latest",
    appUpdateCheckPromise: null,
    isNativeRuntime: () => true,
    readLocalValue: () => lastCheck,
    writeLocalValue: (_key, value) => { lastCheck = value; },
    setAppUpdateStatus: (...args) => statuses.push(args),
    showAppUpdatePopup: (data) => popups.push(data),
    compareAppVersions: (a, b) => {
      const left = a.split(".").map(Number);
      const right = b.split(".").map(Number);
      for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
      return 0;
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return { ok: response.ok !== false, status: response.status || 200, json: async () => response.data };
    }
  };
  vm.createContext(context);
  vm.runInContext(script.replaceAll("const ", "var "), context);
  return { context, calls, statuses, popups };
}

(async () => {
  const direct = client([{ data: valid }]);
  await direct.context.checkForAppUpdate({ manual: true });
  assert.equal(direct.calls.length, 1);
  assert.equal(direct.calls[0].options.cache, "no-store");
  assert.equal(direct.popups[0].versionCode, 62);

  const fallback = client([
    { ok: false, status: 404 },
    { data: { tag_name: "v3.13.4", html_url: "https://github.com/irrelevant", assets: [{ name: "Radar.apk", browser_download_url: "https://github.com/Radar.apk", size: 1234 }] } }
  ]);
  await fallback.context.checkForAppUpdate({ manual: true });
  assert.equal(fallback.popups[0].url, "https://github.com/Radar.apk");

  const missing = client([
    { ok: false, status: 404 },
    { data: { tag_name: "v3.13.4", html_url: "https://github.com/irrelevant", assets: [] } }
  ]);
  await missing.context.checkForAppUpdate({ manual: true });
  assert.equal(missing.popups.length, 0);
  assert.match(missing.statuses.at(-1)[0], /no tiene un APK/);

  const invalid = client([{ data: { ...valid, sha256: "bad" } }, { ok: false, status: 500 }]);
  await invalid.context.checkForAppUpdate({ manual: true });
  assert.match(invalid.statuses.at(-1)[0], /manifiesto.*inválidos/i);

  const skipped = client([], String(Date.now()));
  await skipped.context.checkForAppUpdate();
  assert.equal(skipped.calls.length, 0);
  skipped.context.fetch = async () => ({ ok: true, json: async () => valid });
  await skipped.context.checkForAppUpdate({ manual: true });
  assert.equal(skipped.popups.length, 1);

  for (const marker of ["expectedSha256", "expectedSize", "getPackageArchiveInfo", "archiveCode <= installedCode", "hasSigningCertificate", "FileProvider.getUriForFile", "startActivity(install)", "DOWNLOAD_TIMEOUT", "PERMISSION_DENIED", "APK_VERIFICATION_FAILED"]) assert.ok(java.includes(marker), marker);
  assert.match(java, /private void openInstaller[\s\S]*?catch \(Exception error\)/);
  assert.match(sw, /android-update\.json/);
  console.log("Android updater contract passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
