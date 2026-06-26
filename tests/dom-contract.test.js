const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const js = fs.readFileSync("app.js", "utf8");

const ids = new Set(
  Array.from(html.matchAll(/\sid="([^"]+)"/g)).map((match) => match[1])
);

const queriedIds = Array.from(js.matchAll(/qs\(["']#([a-zA-Z0-9_-]+)["']\)/g))
  .map((match) => match[1])
  .filter((id) => !id.includes("$"));

const missing = queriedIds.filter((id) => !ids.has(id));

if (missing.length) {
  throw new Error(`Missing HTML ids: ${missing.join(", ")}`);
}

console.log(JSON.stringify({
  checkedIds: queriedIds.length,
  status: "ok"
}));
