const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "mobile-web");
const entries = [
  "index.html",
  "app.js",
  "data.js",
  "styles.css",
  "manifest.webmanifest",
  "vendor",
  "assets"
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of entries) {
  const source = path.join(root, entry);
  const target = path.join(outDir, entry);
  fs.cpSync(source, target, { recursive: true });
}

const configSource = fs.existsSync(path.join(root, "app-config.js"))
  ? path.join(root, "app-config.js")
  : path.join(root, "app-config.example.js");
fs.copyFileSync(configSource, path.join(outDir, "app-config.js"));

console.log(`Mobile web listo en ${outDir}`);
