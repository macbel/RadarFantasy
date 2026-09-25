const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const pkg = require(path.join(root, "package.json"));
const gradle = fs.readFileSync(path.join(root, "android", "app", "build.gradle"), "utf8");
const versionCode = Number(gradle.match(/\bversionCode\s+(\d+)/)?.[1]);
const versionName = gradle.match(/\bversionName\s+"([^"]+)"/)?.[1];
if (!Number.isSafeInteger(versionCode) || versionCode <= 0 || versionName !== pkg.version) {
  throw new Error("Las versiones de package.json y Android no coinciden.");
}
const apk = path.resolve(process.argv[2] || path.join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk"));
if (!fs.statSync(apk).isFile()) throw new Error("No se encontró el APK.");
const size = fs.statSync(apk).size;
const sha256 = crypto.createHash("sha256").update(fs.readFileSync(apk)).digest("hex");
const manifest = {
  version: pkg.version,
  versionCode,
  packageName: "com.fantasymarketscout.app",
  apkUrl: `https://alufi.es/fms/Radar-Fantasy-Android-v${pkg.version}.apk`,
  sha256,
  size,
  publishedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(root, "android-update.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
