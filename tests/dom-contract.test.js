const fs = require("fs");

const normalizeEol = (value) => value.replace(/\r\n/g, "\n");
const html = normalizeEol(fs.readFileSync("index.html", "utf8"));
const js = normalizeEol(fs.readFileSync("app.js", "utf8"));
const php = normalizeEol(fs.readFileSync("api/index.php", "utf8"));
const css = normalizeEol(fs.readFileSync("styles.css", "utf8"));
const sw = normalizeEol(fs.readFileSync("sw.js", "utf8"));
const androidUpdater = fs.readFileSync("android/app/src/main/java/com/fantasymarketscout/app/AppUpdaterPlugin.java", "utf8");
const androidManifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");

const ids = new Set(
  Array.from(html.matchAll(/\sid="([^"]+)"/g)).map((match) => match[1])
);

const queriedIds = Array.from(js.matchAll(/qs\(["']#([a-zA-Z0-9_-]+)["']\)/g))
  .map((match) => match[1])
  .filter((id) => !id.includes("$"));

const missing = queriedIds.filter((id) => !ids.has(id));

if (html.indexOf('data-view="team"') > html.indexOf('data-view="market"')) {
  throw new Error("Mi equipo must be the first menu option, followed by Mercado");
}

if (!html.includes('class="nav-item active" type="button" data-view="team"') || !html.includes('class="view active" id="team-view"')) {
  throw new Error("Mi equipo must be the active view when the application opens");
}

if (!css.includes(".top-five-list") || !css.includes("grid-template-columns: repeat(2, minmax(0, 1fr))") || !css.includes(".decision-lanes")) {
  throw new Error("Top-five and decision-center cards must provide a tablet layout");
}

if (missing.length) {
  throw new Error(`Missing HTML ids: ${missing.join(", ")}`);
}

if (!html.includes('id="bid-count-popup"') || !html.includes('id="bid-count-popup-message"')) {
  throw new Error("The rival-bid result popup is missing from the market UI");
}

if (!html.includes('id="data-sync-popup"') || !html.includes('id="cancel-data-sync"') || !js.includes("beginDataSync") || !js.includes("endDataSync") || !js.includes("cancelDataSync")) {
  throw new Error("Long data refreshes must expose a visible global progress popup");
}

if (!js.includes("const batchSize = 12") || !js.includes("deferFollowUp") || !js.includes("activeDataSyncController")) {
  throw new Error("Startup synchronization must avoid duplicate follow-up work and support request cancellation");
}

if (!js.includes("const localPayload = loadLocalLeagues();") || !js.includes("refreshStartupDataInBackground(localPayload)") || !js.includes("await yieldToInterface()")) {
  throw new Error("Startup must paint local data immediately and yield while remote refresh continues in the background");
}

if (!js.includes("skipEnrichment: fastStartup") || !js.includes("refreshDeferredSourcesInBackground") || !js.includes("state.autoSync.deferredSources")) {
  throw new Error("Startup must prioritize core market and team data before deferred source enrichment");
}

if (!js.includes("teamFirst: fastStartup") || js.indexOf('teamImported = await importPart("team")') > js.indexOf('const marketImported = await importPart("market")')) {
  throw new Error("Startup must render the team before waiting for the market import");
}

if (!js.includes("withSilentDataSync") || !js.includes("window.requestAnimationFrame(() => window.requestAnimationFrame(startBackgroundRefresh))")) {
  throw new Error("Automatic startup work must wait for the first paint and stay visually non-blocking");
}

const startupRefreshBlock = js.slice(js.indexOf("const refreshStartupDataInBackground"), js.indexOf("const init = () =>"));
if (startupRefreshBlock.includes("await refreshFutbolFantasyStatus()") || !js.includes("window.setTimeout(() => checkForAppUpdate(), 60 * 1000)")) {
  throw new Error("Secondary services and app update checks must stay outside the essential startup path");
}

if (!js.includes("const activeViewName") || !js.includes("shouldSkipComponentRender") || !js.includes("renderedComponents.has(component)") || !js.includes("renderDailyPlanIfVisible")) {
  throw new Error("Background updates must not rebuild expensive hidden views");
}

if (!js.includes('if (viewName === "team")') || !js.includes('} else if (viewName === "market")') || !js.includes('} else if (viewName === "compare")')) {
  throw new Error("Navigation must render each view lazily when it becomes visible");
}

if (!js.includes("await waitForInterfaceIdle(1500)") || !js.includes('document.addEventListener(eventName, markInterfaceInteraction, { passive: true, capture: true })')) {
  throw new Error("Secondary enrichment must pause while the user is interacting with the interface");
}

const rewardInputBlock = js.slice(js.indexOf("const rewardInputMap"), js.indexOf('bindCurrencyInputs(qs(".reward-config-card"))'));
if (rewardInputBlock.includes("renderBidSaleAssistant") || rewardInputBlock.includes("renderBiwengerOperations") || !js.includes("const marketAnalysisCache = new Map()")) {
  throw new Error("Typing reward settings must not trigger analysis or rebuild operational panels");
}

const initBlock = js.slice(js.indexOf("const init = () =>"), js.indexOf("init();"));
if (initBlock.includes("setInterval") || !startupRefreshBlock.includes("shouldRefreshAtStartup && !hasCachedData")) {
  throw new Error("Cached leagues must not start periodic or startup recalculation");
}

if (!css.includes(".data-sync-popup {") || !css.includes("pointer-events: none") || !css.includes(".data-sync-cancel") || !css.includes("pointer-events: auto")) {
  throw new Error("The background synchronization notice must not intercept application navigation");
}

if (!html.includes('app.js?v=89') || !sw.includes('radar-fantasy-shell-v36')) {
  throw new Error("The non-blocking startup must invalidate the previous cached application shell");
}

if (!html.includes('id="interaction-wait-popup"') || !js.includes("beginInteractionWait") || !css.includes(".interaction-wait-popup")) {
  throw new Error("Slow button and menu interactions must show a lightweight waiting animation");
}

if (!js.includes("biwengerImportSignature") || !js.includes("mercado sin cambios; se omite el resto de la descarga") || !js.includes("60 * 60 * 1000")) {
  throw new Error("Automatic synchronization must stop early when the Biwenger market has not changed and still perform periodic full refreshes");
}

if (!js.includes('checkTeamWhenMarketUnchanged: reason === "startup"')) {
  throw new Error("Startup synchronization must still check the current Biwenger lineup after an unchanged market");
}

if (!js.includes("playerEligibleForNextLineup") || !js.includes("unavailable * 120") || !js.includes("Number(b.lineupEligible) - Number(a.lineupEligible)")) {
  throw new Error("The ideal lineup must prefer available players while still filling formations when alternatives do not exist");
}

if (!js.includes('button.classList.add("action-feedback")') || !css.includes("@keyframes action-button-spin") || !css.includes("button:not(:disabled):active")) {
  throw new Error("Action buttons must provide immediate pressed and execution feedback");
}

if (!html.includes('id="app-update-popup"') || !html.includes('id="check-app-update"') || !js.includes("checkForAppUpdate")) {
  throw new Error("The mobile app must expose automatic update checks and an installation popup");
}

if (!js.includes("AppUpdater") || !js.includes("downloadAndInstall") || !js.includes("appUpdateProgress")) {
  throw new Error("Android updates must be downloaded natively with visible progress before opening the installer");
}

if (!androidUpdater.includes("DownloadManager") || !androidUpdater.includes("FileProvider") || !androidManifest.includes("REQUEST_INSTALL_PACKAGES")) {
  throw new Error("The Android updater must finish a managed APK download before requesting installation");
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

if (!php.includes("/player-catalog") || !php.includes("biwenger_public_catalog_payload") || !js.includes("/api/player-catalog?competition=")) {
  throw new Error("Favorite search must use Biwenger's complete public competition catalog even without a private session");
}

if (!js.includes("ensureExtendedFavoriteCatalog") || !js.includes("favoriteSearchDistance") || !js.includes('state.competition === "worldcup" ? "world-cup" : "la-liga"')) {
  throw new Error("Favorite search must expand beyond the local cache and tolerate small name misspellings");
}

if (!js.includes("LEAGUE_FAVORITES_CACHE_KEY") || !js.includes("favoritesUpdatedAt") || !php.includes("'favoritesUpdatedAt'")) {
  throw new Error("Favorite persistence must be protected with a league-scoped timestamped cache");
}

if (!html.includes('id="startup-sync-enabled"') || !js.includes("preferences.startupSync") || !php.includes("'startupSync'")) {
  throw new Error("Full startup synchronization must be independently configurable");
}

if (!html.includes('id="show-image-upload"') || !html.includes('id="market-manual-entry" hidden') || !html.includes('id="team-manual-entry" hidden') || !js.includes("preferences.showImageUpload") || !php.includes("'showImageUpload'")) {
  throw new Error("Manual market and squad imports must be optional and hidden by default");
}

if (!html.includes('id="show-market-analysis"') || !js.includes("preferences.showMarketAnalysis") || !php.includes("'showMarketAnalysis'")) {
  throw new Error("Market analysis center visibility must be configurable per league");
}

if (!html.includes('id="show-live-round"') || !js.includes("showExperimentalLiveRound") || !php.includes("'showExperimentalLiveRound'")) {
  throw new Error("Experimental live round visibility must be configurable and persisted");
}

if (html.indexOf('id="market-refresh-inline"') > html.indexOf('id="market-manual-entry"')
  || html.indexOf('id="analyze-team"') < html.indexOf('id="team-manual-entry"')) {
  throw new Error("Refresh and team action buttons must stay outside the optional manual-entry frames");
}

if (!html.includes('data-fantasy-settings-tab="biwenger"') || !html.includes('data-fantasy-settings-tab="laliga"') || !html.includes('data-fantasy-settings-tab="mister"')) {
  throw new Error("Settings must separate each fantasy platform into its own section");
}

if (!js.includes("activateFantasySettingsTab") || !js.includes("FANTASY_SETTINGS_TAB_KEY")) {
  throw new Error("Fantasy platform settings tabs must be interactive and remembered");
}

if (!html.includes('id="active-league-provider"') || !js.includes("leagueFantasyProvider") || !php.includes("sanitize_fantasy_provider")) {
  throw new Error("Every saved league must expose and persist its fantasy platform identity");
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

if (!php.includes("if ($route === '/fixtures'") || !php.includes("fast_current_fixtures") || !php.includes("sofascore-primary") || !php.includes("api-football-fallback") || !php.includes("espn-fallback") || !php.includes("thesportsdb-fallback") || !php.includes("resultados-futbol-fallback")) {
  throw new Error("Fixture sync must use SofaScore first with resilient provider fallbacks");
}

if (!js.includes("fixtureUnresolved") || !js.includes("upcomingFixtureCoverage")) {
  throw new Error("An unresolved fixture link must be distinct from a confirmed missing next match");
}

if (!php.includes("$fixtures['schemaVersion'] = 5") || !php.includes("eliminatedTeams") || !js.includes("45 * 60 * 1000")) {
  throw new Error("Old incomplete fixture snapshots must be invalidated after the calendar fix");
}

if (!js.includes("query-player-bid-count") || !js.includes("showBidCountPopup")) {
  throw new Error("Rival bids must be queried from the player list and shown in a popup");
}

if (js.includes('class="ghost-button query-bid-count"')) {
  throw new Error("The old rival-bid query button must not remain in the player detail");
}

if (!js.includes('(max-width: 1360px)') || !css.includes('@media (max-width: 1360px)') || !css.includes('.results-layout .detail-panel') || !css.includes('.table-panel {\n  min-width: 0;')) {
  throw new Error("Tablet and narrow desktop market layouts must open player detail as a modal without reserving a side column");
}

if (!js.includes("isBiwengerAuthenticationError") || !js.includes("isBiwengerStaleEntityError") || !php.includes("$readAttempts = strtoupper($method) === 'GET' ? 2 : 1")) {
  throw new Error("Intermittent Biwenger read failures must be retried without disconnecting valid sessions");
}

if (!js.includes("isBiwengerRateLimitError") || !js.includes("refreshBiwengerOperationalContext") || !php.includes("biwenger-rate-limit.json") || php.includes("[404, 429, 502, 503, 504]")) {
  throw new Error("Biwenger HTTP 429 responses must stop immediate retries and activate a short request cooldown");
}

const salePriceReader = php.match(/function biwenger_sale_price\(array \$sale\): int[\s\S]*?\n}/)?.[0] || "";
if (!salePriceReader.includes("'price'") || salePriceReader.includes("'amount'")) {
  throw new Error("Biwenger sale prices must come from explicit sale-price fields, never the generic offer amount");
}

console.log(JSON.stringify({
  checkedIds: queriedIds.length,
  status: "ok"
}));
