const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const js = fs.readFileSync("app.js", "utf8");
const php = fs.readFileSync("api/index.php", "utf8");

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

if (!html.includes('id="bid-count-popup"') || !html.includes('id="bid-count-popup-message"')) {
  throw new Error("The rival-bid result popup is missing from the market UI");
}

if (!html.includes('id="data-sync-popup"') || !js.includes("beginDataSync") || !js.includes("endDataSync")) {
  throw new Error("Long data refreshes must expose a visible global progress popup");
}

if (!html.includes('id="app-update-popup"') || !html.includes('id="check-app-update"') || !js.includes("checkForAppUpdate")) {
  throw new Error("The mobile app must expose automatic update checks and an installation popup");
}

if (!js.includes("nativePreferences") || !js.includes("REMEMBERED_BIWENGER_EMAIL_KEY") || !js.includes("await rememberBiwengerAccount(email)")) {
  throw new Error("A successful Biwenger login must persist its device identity and remembered email natively");
}

if (!js.includes('DEFAULT_MOBILE_API_BASE_URL = "https://alufi.es/fms"')) {
  throw new Error("A clean mobile install must know the production API URL");
}

if (!html.includes('data-view="favorites"') || !html.includes('id="favorite-search-name"') || !html.includes('id="favorite-search-position"')) {
  throw new Error("Favorites must have their own menu with incremental name and position search");
}

if (!js.includes("renderFavoriteButton") || !js.includes("processFavoriteWatchTransitions") || !php.includes("/biwenger/watchlist")) {
  throw new Error("Favorites must be actionable from player lists and backed by real market/clause status checks");
}

if (!php.includes("clauseDataAvailable") || !js.includes("FAVORITE_WATCH_STATE_KEY")) {
  throw new Error("Clause alerts need an authoritative availability signal and a deduplicated transition snapshot");
}

if (!html.includes('id="market-analysis-center"') || !html.includes('data-analysis-tab="plan"') || !html.includes('data-analysis-panel="history"')) {
  throw new Error("The market analysis tools must live in the compact tabbed center");
}

if (!js.includes("activateMarketAnalysisTab") || !js.includes("setMarketAnalysisCollapsed")) {
  throw new Error("The compact analysis center must support tabs and a remembered collapsed state");
}

if (!html.includes('id="market-order-title"') || !js.includes("renderMarketOrderSummary")) {
  throw new Error("The market list must explain when it contains only discarded players");
}

if (!js.includes('"Sin fichajes recomendables"') || !js.includes("const firstCandidate = marketTopCandidates")) {
  throw new Error("An avoided player must not be auto-selected as the best market option");
}

if (!php.includes("/season/' . $seasonId . '/events/") || !php.includes("'SofaScore' => static fn()")) {
  throw new Error("Fixture sync must use SofaScore's season-aware endpoint as a regular source");
}

if (!js.includes("fixtureUnresolved") || !js.includes("upcomingFixtureCoverage")) {
  throw new Error("An unresolved fixture link must be distinct from a confirmed missing next match");
}

if (!php.includes("$fixtures['schemaVersion'] = 2") || !js.includes("fixtureDataNeedsRefresh")) {
  throw new Error("Old incomplete fixture snapshots must be invalidated after the calendar fix");
}

if (!js.includes("query-player-bid-count") || !js.includes("showBidCountPopup")) {
  throw new Error("Rival bids must be queried from the player list and shown in a popup");
}

if (js.includes('class="ghost-button query-bid-count"')) {
  throw new Error("The old rival-bid query button must not remain in the player detail");
}

const salePriceReader = php.match(/function biwenger_sale_price\(array \$sale\): int[\s\S]*?\n}/)?.[0] || "";
if (!salePriceReader.includes("'price'") || salePriceReader.includes("'amount'")) {
  throw new Error("Biwenger sale prices must come from explicit sale-price fields, never the generic offer amount");
}

console.log(JSON.stringify({
  checkedIds: queriedIds.length,
  status: "ok"
}));
