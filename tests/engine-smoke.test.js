const fs = require("fs");
const vm = require("vm");

const storageMemory = new Map();
const context = {
  console,
  window: {
    localStorage: {
      getItem: (key) => storageMemory.has(key) ? storageMemory.get(key) : null,
      setItem: (key, value) => storageMemory.set(key, String(value)),
      removeItem: (key) => storageMemory.delete(key)
    }
  }
};

vm.createContext(context);
vm.runInContext(fs.readFileSync("data.js", "utf8"), context);

const appCode = fs.readFileSync("app.js", "utf8").replace(
  /\ninit\(\);\s*$/,
  `
const sample = [
  "Oihan Sancet - Athletic - MC - 12.300.000",
  "Ante Budimir - Osasuna - DL - 9.800.000",
  "Pepelu - Valencia - MC - 5.900.000"
].join("\\n");

if (parseCurrencyInput("5.500.000 €") !== 5500000
  || parseCurrencyInput("5,5 M") !== 5500000
  || parseCurrencyInput("750 mil") !== 750000) {
  throw new Error("Currency input parsing changed sale amounts");
}

state.players = parseMarketText(sample);
const favoriteSample = hydrateImportedPlayers([{
  id: "favorite-sample",
  biwengerPlayerId: 9876,
  name: "Jugador seguido",
  team: "Equipo A",
  position: "DL",
  price: 5000000,
  watchStatus: { inMarket: true, marketSellerType: "rival", marketOwnerName: "Rival A", salePrice: 5500000, clauseAvailable: true, clause: 9000000 }
}])[0];
state.favorites = [favoriteStoredPlayer(favoriteSample)];
const favoriteStatus = favoriteWatchStatus(favoriteSample);
if (favoritePlayerKey(favoriteSample) !== "biwenger:9876" || !favoriteStatus.inMarket || !favoriteStatus.clauseAvailable || favoriteStatus.sellerName !== "Rival A") {
  throw new Error("Favorite identity or Biwenger market/clause status normalization failed");
}
if (!renderFavoriteButton(favoriteSample).includes("Quitar de favoritos")) {
  throw new Error("Favorite players must render an active star control");
}
state.favorites = [];
const analyzed = state.players
  .map((player) => analyzePlayer(player, state.players))
  .sort((a, b) => b.recommendation - a.recommendation);

if (analyzed.length !== 3) {
  throw new Error("Expected 3 analyzed players");
}

if (!analyzed.every((player) => Number.isInteger(player.recommendation))) {
  throw new Error("Recommendation score must be an integer");
}

if (!analyzed[0].name || analyzed[0].recommendation < analyzed[2].recommendation) {
  throw new Error("Players are not ranked correctly");
}

const previousMaximumBid = state.finance.maximumBid;
const previousOperations = state.biwengerOperations;
state.finance.maximumBid = 6000000;
state.biwengerOperations = { offers: [] };
const budgetPlayers = hydrateImportedPlayers([
  {
    id: "expensive-star",
    name: "Estrella cara",
    team: "Francia",
    position: "DL",
    price: 25000000,
    biwengerValue: 25000000,
    starter: 96,
    form: 94,
    asScore: 94,
    sofascore: 94,
    stats: 94,
    risk: "low",
    sourceStatus: "live",
    dataConfidence: 94,
    sourceSummary: {
      recentMatches: [
        { provider: "biwenger", points: { biwenger: 10, mixed: 10 }, minutes: 90 },
        { provider: "biwenger", points: { biwenger: 8, mixed: 8 }, minutes: 88 },
        { provider: "biwenger", points: { biwenger: 9, mixed: 9 }, minutes: 90 }
      ]
    }
  },
  {
    id: "affordable-fit",
    name: "Pujable util",
    team: "Francia",
    position: "MC",
    price: 4500000,
    biwengerValue: 4500000,
    starter: 70,
    form: 68,
    asScore: 68,
    sofascore: 68,
    stats: 68,
    risk: "low",
    sourceStatus: "live",
    dataConfidence: 82,
    sourceSummary: {
      recentMatches: [
        { provider: "biwenger", points: { biwenger: 5, mixed: 5 }, minutes: 72 },
        { provider: "biwenger", points: { biwenger: 6, mixed: 6 }, minutes: 90 },
        { provider: "biwenger", points: { biwenger: 4, mixed: 4 }, minutes: 66 }
      ]
    }
  }
]);
const budgetAnalyzed = budgetPlayers
  .map((player) => analyzePlayer(player, budgetPlayers))
  .sort((a, b) => b.recommendation - a.recommendation);
const expensiveStar = budgetAnalyzed.find((player) => player.id === "expensive-star");
const affordableFit = budgetAnalyzed.find((player) => player.id === "affordable-fit");
if (!expensiveStar?.exceedsMaximumBid || expensiveStar.recommendation > 44) {
  throw new Error("Maximum bid cap did not demote unaffordable player: " + JSON.stringify(expensiveStar));
}
if (!affordableFit || budgetAnalyzed[0].id !== "affordable-fit") {
  throw new Error("Affordable player should outrank unaffordable player: " + JSON.stringify(budgetAnalyzed));
}
state.finance.maximumBid = previousMaximumBid;
state.biwengerOperations = previousOperations;

const noMinutesPlayers = hydrateImportedPlayers([
  {
    id: "no-minutes-forward",
    name: "Delantero sin minutos",
    team: "Equipo prueba",
    position: "DL",
    price: 4300000,
    starter: 59,
    form: 95,
    asScore: 80,
    sofascore: 80,
    stats: 80,
    risk: "low",
    sourceStatus: "live",
    dataConfidence: 90,
    sourceSummary: {
      recentMatches: [
        { provider: "biwenger", points: { biwenger: 0, mixed: 0 }, minutes: 0 },
        { provider: "biwenger", points: { biwenger: 0, mixed: 0 }, minutes: 0 },
        { provider: "biwenger", points: { biwenger: 0, mixed: 0 }, minutes: 0 }
      ]
    }
  }
]);
const noMinutesAnalyzed = analyzePlayer(noMinutesPlayers[0], noMinutesPlayers);
if (!noMinutesAnalyzed.recentForm.noRecentMinutes || noMinutesAnalyzed.marketDecision.type !== "avoid") {
  throw new Error("A player without recent minutes must be excluded regardless of form weight: " + JSON.stringify(noMinutesAnalyzed));
}
if (marketTopCandidates([noMinutesAnalyzed]).length !== 0) {
  throw new Error("Players marked avoid or without minutes must never enter the Top 5");
}
const decisionOrdered = [
  { id: "avoid-high", recommendation: 95, marketDecision: { type: "avoid" }, recentForm: {} },
  { id: "limited-low", recommendation: 60, marketDecision: { type: "limited" }, recentForm: {} }
].sort(compareMarketRecommendations);
if (decisionOrdered[0].id !== "limited-low") {
  throw new Error("Final market decision must take priority over raw score");
}

const previousFixtureCompetition = state.competition;
const previousLeagueFixtures = state.leagueFixtures;

if (!isBiwengerStaleEntityError(new Error("Biwenger no ha aceptado la peticion privada (HTTP 404): Entity not found"))
  || isBiwengerAuthenticationError(new Error("Biwenger no ha aceptado la peticion privada (HTTP 404): Entity not found"))
  || !isBiwengerAuthenticationError(new Error("Biwenger no ha aceptado la peticion privada (HTTP 401)"))
  || !isBiwengerRateLimitError(new Error("Biwenger no ha aceptado la peticion privada (HTTP 429): Too Many Requests"))) {
  throw new Error("Biwenger errors must distinguish expired entities from expired authentication");
}

const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;
state.competition = "worldcup";
state.leagueFixtures = {
  events: [{
    id: "usa-next",
    timestamp: futureTimestamp,
    home: { name: "USA" },
    away: { name: "Bosnia & Herzegovina" }
  }]
};
const usaMatch = nextMatchForPlayer({ team: "Estados Unidos" });
if (!usaMatch || usaMatch.opponent?.name !== "Bosnia & Herzegovina") {
  throw new Error("National-team aliases must link Estados Unidos with USA fixtures");
}
const worldCupAliasPairs = [
  ["Jordania", "Jordan"],
  ["Nueva Zelanda", "New Zealand"],
  ["Arabia Saudita", "Saudi Arabia"],
  ["Sudáfrica", "South Africa"],
  ["Turquía", "Türkiye"],
  ["Chequia", "Czechia"],
  ["Curazao", "Curaçao"],
  ["Costa de Marfil", "Côte d'Ivoire"],
  ["Egipto", "Egypt"],
  ["Suiza", "Switzerland"],
  ["Congo (RDC)", "DR Congo"]
];
if (worldCupAliasPairs.some(([biwengerName, fixtureName]) => teamNameMatchScore(biwengerName, fixtureName) < 88)) {
  throw new Error("World Cup team translations must match SofaScore fixture names: " + JSON.stringify(worldCupAliasPairs));
}
if (!fixtureDataNeedsRefresh({ schemaVersion: 3, fetchedAtTs: Math.floor(Date.now() / 1000), events: state.leagueFixtures.events })
  || fixtureDataNeedsRefresh({ schemaVersion: 4, fetchedAtTs: Math.floor(Date.now() / 1000), events: state.leagueFixtures.events })) {
  throw new Error("Fixture cache freshness must invalidate old schemas without refetching a current complete snapshot");
}

state.leagueFixtures.eliminatedTeams = ["Japón"];
const eliminatedMaeda = marketIntelligenceForPlayer({
  name: "Maeda",
  team: "Japan",
  position: "DL",
  starter: 90,
  form: 90,
  price: 5000000,
  health: { status: "available" }
}, 90, 90, 90);
if (!eliminatedMaeda.noNextMatch || !eliminatedMaeda.contextualReasons.some((reason) => reason.includes("eliminada"))) {
  throw new Error("An explicitly eliminated national team must never remain a bid candidate: " + JSON.stringify(eliminatedMaeda));
}

state.competition = "club";
state.leagueFixtures = {
  events: [{
    id: "unrelated-next",
    timestamp: futureTimestamp,
    home: { name: "Equipo ajeno A" },
    away: { name: "Equipo ajeno B" }
  }]
};
const unmatchedFixturePlayers = hydrateImportedPlayers([{
  id: "strong-unmatched-fixture",
  name: "Titular sin enlace",
  team: "Equipo fuerte",
  position: "MC",
  price: 3000000,
  starter: 90,
  form: 88,
  asScore: 86,
  sofascore: 87,
  stats: 86,
  risk: "low",
  sourceStatus: "live",
  dataConfidence: 88,
  sourceSummary: {
    recentMatches: [
      { provider: "biwenger", points: { biwenger: 8, mixed: 8 }, minutes: 90 },
      { provider: "biwenger", points: { biwenger: 7, mixed: 7 }, minutes: 85 },
      { provider: "biwenger", points: { biwenger: 9, mixed: 9 }, minutes: 90 }
    ]
  }
}]);
const strongUnmatched = analyzePlayer(unmatchedFixturePlayers[0], unmatchedFixturePlayers);
if (strongUnmatched.marketIntelligence.noNextMatch || !strongUnmatched.marketIntelligence.fixtureUnresolved || strongUnmatched.marketDecision.type === "avoid") {
  throw new Error("A fixture matching failure must not become an automatic no-match rejection: " + JSON.stringify(strongUnmatched));
}
state.competition = previousFixtureCompetition;
state.leagueFixtures = previousLeagueFixtures;

const ocrSample = [
  "Mercado",
  "Oihan Sancet",
  "Athletic",
  "12.300.000 €",
  "Comprar",
  "Pepelu",
  "Valencia",
  "5.900.000 €"
].join("\\n");

const ocrPlayers = parseMarketText(ocrSample);
if (ocrPlayers.length !== 2) {
  throw new Error(\`Expected 2 OCR players, got \${ocrPlayers.length}\`);
}

if (ocrPlayers[0].name !== "Oihan Sancet" || ocrPlayers[0].price !== 12300000) {
  throw new Error("OCR-style player reconstruction failed");
}

state.competition = "worldcup";
const worldcupPlayers = state.players
  .map((player) => playerForCompetition(player))
  .map((player, index, players) => analyzePlayer(player, players))
  .sort((a, b) => b.recommendation - a.recommendation);

const worldcupSancet = worldcupPlayers.find((player) => player.name === "Oihan Sancet");
if (!worldcupSancet || worldcupSancet.team !== "Espana") {
  throw new Error("World Cup context did not switch player to national team");
}

if (worldcupSancet.starter >= 86) {
  throw new Error("World Cup context did not adjust starter probability");
}

const dirtyWorldcupSample = [
  "James Trafford - England - POR - 2230000",
  "Ørjan Nyland Norway Sin seleccion - Sin seleccion - POR - 1760000",
  "Nikola Vasilj Bosnia & Herzegovina - Sin seleccion - POR - 1430000",
  "Archie Brown - Fenerbahçe - DF - 2610000",
  "Gaël Kakuta DR Congo Sin seleccion - Sin seleccion - MC - 840000"
].join("\\n");

const dirtyWorldcupPlayers = parseMarketText(dirtyWorldcupSample);
const nyland = dirtyWorldcupPlayers.find((player) => player.name.includes("Nyland"));
if (!nyland || nyland.team !== "Noruega" || /sin seleccion/i.test(nyland.name)) {
  throw new Error("Dirty World Cup OCR cleanup failed for Nyland: " + JSON.stringify(nyland));
}

const archieBrown = dirtyWorldcupPlayers.find((player) => player.name === "Archie Brown");
if (!archieBrown || archieBrown.team !== "Sin seleccion") {
  throw new Error("World Cup club segment should not become selection: " + JSON.stringify(archieBrown));
}

const kakuta = dirtyWorldcupPlayers.find((player) => player.name.includes("Kakuta"));
if (!kakuta || kakuta.team !== "RD Congo") {
  throw new Error("DR Congo alias was not detected: " + JSON.stringify(kakuta));
}

if (detectBiwengerPosterKind("PLANTILLA LA MANDARINA MECANICA MUNDIAL") !== "squad") {
  throw new Error("Squad poster header was not detected");
}

if (detectCompetitionFromOcrText("PLANTILLA MUNDIAL LUCENTINO") !== "worldcup") {
  throw new Error("World Cup squad header was not detected");
}

const biwengerCardSamples = [
  ["Trafford 0 2.230.000 €", "", "POR", "Trafford", 2230000],
  ["Nikola Vasilj 0 1.430.00", "", "POR", "Nikola Vasilj", 1430000],
  ["JalalHassan 0 190.000 €", "", "POR", "Jalal Hassan", 190000],
  ["Min-jaeKim 0 3.330.000 €", "", "DF", "Min-jae Kim", 3330000],
  ["ozbeh Cheshmi 0 J 370.000 €", "", "MC", "Roozbeh Cheshmi", 370000],
  ["Rafaelledao 0 13.720.000 €", "", "DL", "Rafael Leao", 13720000],
  ["S.Tounekti 0 550.000 €", "", "DL", "Sebastian Tounekti", 550000]
];

for (const [text, priceText, position, expectedName, expectedPrice] of biwengerCardSamples) {
  const parsed = parseBiwengerCardOcr(text, priceText, position);
  if (!parsed || parsed.name !== expectedName || parsed.price !== expectedPrice) {
    throw new Error(\`Bad Biwenger card parse for "\${text}": \${JSON.stringify(parsed)}\`);
  }
}

const squadCardSamples = [
  ["Maignan 0 5.570.000 â‚¬", "", "POR", "Maignan", 5570000],
  ["Meshaal Barsham 0 360.000 â‚¬", "", "POR", "Meshaal Barsham", 360000],
  ["Otamendi 0 3.890.000 â‚¬", "", "DF", "Otamendi", 3890000],
  ["Mudau 0 550.000 â‚¬", "", "DF", "Mudau", 550000],
  ["Jordan Ayew 0 1.380.000 â‚¬", "", "DL", "Jordan Ayew", 1380000]
];

for (const [text, priceText, position, expectedName, expectedPrice] of squadCardSamples) {
  const parsed = parseBiwengerCardOcr(text, priceText, position, { requirePrice: true });
  if (!parsed || parsed.name !== expectedName || parsed.price !== expectedPrice) {
    throw new Error("Bad squad card parse: " + JSON.stringify(parsed));
  }
}

if (parseBiwengerCardOcr("Hugo Broos", "", "ENT", { requirePrice: true })) {
  throw new Error("Coach card without price should not be accepted as player");
}

const maignanWithoutPrice = parseBiwengerCardOcr("Maignan 0", "", "POR", { requireTrustedName: true });
if (!maignanWithoutPrice || maignanWithoutPrice.name !== "Maignan" || maignanWithoutPrice.position !== "POR") {
  throw new Error("Trusted squad player should be accepted even if price OCR fails");
}

if (parseBiwengerCardOcr("PLANTILLA o", "", "MC", { requireTrustedName: true })) {
  throw new Error("Generic squad OCR garbage should not be accepted as trusted player");
}

const importedTeamPlayer = {
  ...state.players[0],
  id: "biwenger-team-99",
  biwengerPlayerId: 99,
  media: { playerImage: "https://example.com/player.png", emblemImage: "https://example.com/team.png" },
  sourceLinks: { futbolFantasy: "https://example.com/profile" }
};
const savedTeam = mergeTeamPlayerEdits(parseMarketText("Oihan Sancet - Athletic - MC - 12.300.000"), [importedTeamPlayer]);
if (savedTeam[0].biwengerPlayerId !== 99 || !savedTeam[0].media.playerImage || !savedTeam[0].sourceLinks.futbolFantasy) {
  throw new Error("Saving team must preserve imported player identity, media and source data");
}

const marketOwnerPlayer = hydrateImportedPlayers([{
  id: "market-owner-test",
  biwengerPlayerId: 77,
  marketOwnerId: 42,
  name: "Jugador rival",
  team: "Equipo rival",
  position: "MC",
  price: 1000000
}])[0];
if (marketOwnerPlayer.marketOwnerId !== 42) {
  throw new Error("Market seller identity must survive hydration so bids reach the correct rival");
}

const nowSeconds = Math.floor(Date.now() / 1000);
state.players = hydrateImportedPlayers([{
  id: "market-current-501",
  biwengerPlayerId: 501,
  marketOwnerId: 42,
  name: "Jugador actual",
  team: "Equipo rival",
  position: "MC",
  price: 1000000
}, {
  id: "market-stale-502",
  biwengerPlayerId: 502,
  marketOwnerId: 43,
  name: "Samu Costa",
  team: "Mallorca",
  position: "MC",
  price: 2000000
}]);
state.teamPlayers = hydrateImportedPlayers([{
  id: "team-owned-503",
  biwengerPlayerId: 503,
  name: "Jugador propio",
  team: "Mi equipo",
  position: "DF",
  price: 1500000
}]);
const safeOwnOffers = activeOwnBidOffers([
  { offerId: 10, playerId: 502, playerName: "Samu Costa", amount: 2100000, isMine: true, isIncoming: false, status: "waiting", source: "outgoing", expiresTs: nowSeconds - 60 },
  { offerId: 20, playerId: 501, playerName: "Jugador actual", amount: 1000000, isMine: true, isIncoming: false, status: "waiting", source: "user", timestampTs: nowSeconds },
  { offerId: 21, playerId: 501, playerName: "Jugador actual", amount: 1200000, isMine: true, isIncoming: false, status: "waiting", source: "outgoing", timestampTs: nowSeconds },
  { offerId: 22, playerId: 503, playerName: "Jugador propio", amount: 900000, isMine: true, isIncoming: false, status: "waiting", source: "outgoing", timestampTs: nowSeconds },
  { offerId: 23, playerId: 504, playerName: "Jugador Brasil", amount: 1400000, isMine: true, isIncoming: false, status: "waiting", source: "outgoing", isAuthoritativeOutgoing: true, timestampTs: nowSeconds },
  { offerId: 24, playerId: 505, playerName: "Puja ya resuelta", amount: 1800000, isMine: true, isIncoming: false, status: "processed", source: "outgoing", isAuthoritativeOutgoing: true, timestampTs: nowSeconds }
]);
if (safeOwnOffers.length !== 2
  || !safeOwnOffers.some((offer) => offer.playerId === 501 && offer.amount === 1200000)
  || !safeOwnOffers.some((offer) => offer.playerId === 504 && offer.amount === 1400000)) {
  throw new Error("Own bid filter must drop expired, owned-player and duplicate stale offers: " + JSON.stringify(safeOwnOffers));
}

const safeIncomingOffers = activeIncomingOffers([
  { offerId: 30, playerId: 503, fromId: 88, toId: 77, amount: 1000000, isIncoming: true, status: "waiting", timestampTs: nowSeconds - 10 },
  { offerId: 31, playerId: 503, fromId: 88, toId: 77, amount: 1100000, isIncoming: true, status: "waiting", timestampTs: nowSeconds },
  { offerId: 32, playerId: 503, fromId: 89, toId: 77, amount: 1200000, isIncoming: true, status: "waiting", timestampTs: nowSeconds }
]);
if (safeIncomingOffers.length !== 2 || !safeIncomingOffers.some((offer) => offer.offerId === 31)) {
  throw new Error("Incoming offers must be deduplicated by player and bidder: " + JSON.stringify(safeIncomingOffers));
}
if (roundBidAmount(1000001) !== 1010000) {
  throw new Error("Bid rounding must never reduce the current minimum amount");
}
if (teamPlayerBiwengerValue({ biwengerPlayerId: 1, price: 9000000, biwengerValue: 1000000 }) !== 1000000) {
  throw new Error("Sale suggestions must use the official player value, not a stale listing price");
}
if (saleListingPrice({ price: 79348870, value: 12150000, priceSource: "amount" }) !== 12150000
  || saleListingPrice({ price: 13500000, value: 12150000, priceSource: "price" }) !== 13500000) {
  throw new Error("Sale listings must reject legacy amount-derived prices while preserving official prices");
}

state.finance.balance = -4000000;
state.teamPlayers = hydrateImportedPlayers([
  {
    id: "team-hot-sale-1",
    biwengerPlayerId: 901,
    name: "Jugador en racha",
    team: "Mi equipo",
    position: "DL",
    price: 11150000,
    biwengerValue: 11150000,
    starter: 84,
    form: 88,
    asScore: 84,
    sofascore: 86,
    stats: 84,
    risk: "low",
    sourceStatus: "live",
    dataConfidence: 88,
    sourceSummary: {
      recentMatches: [
        { provider: "biwenger", points: { biwenger: 8, mixed: 8 }, minutes: 83 },
        { provider: "biwenger", points: { biwenger: 9, mixed: 9 }, minutes: 90 },
        { provider: "biwenger", points: { biwenger: 7, mixed: 7 }, minutes: 76 }
      ]
    }
  },
  { id: "team-sale-dl-2", biwengerPlayerId: 902, name: "Delantero suplente 1", team: "Mi equipo", position: "DL", price: 1800000, biwengerValue: 1800000, starter: 24, form: 30, sourceStatus: "live", sourceSummary: { recentMatches: [{ provider: "biwenger", points: { biwenger: 0, mixed: 0 } }, { provider: "biwenger", points: { biwenger: 0, mixed: 0 } }, { provider: "biwenger", points: { biwenger: 0, mixed: 0 } }] } },
  { id: "team-sale-dl-3", biwengerPlayerId: 903, name: "Delantero suplente 2", team: "Mi equipo", position: "DL", price: 1700000, biwengerValue: 1700000, starter: 22, form: 28, sourceStatus: "live", sourceSummary: { recentMatches: [{ provider: "biwenger", points: { biwenger: 0, mixed: 0 } }, { provider: "biwenger", points: { biwenger: 0, mixed: 0 } }, { provider: "biwenger", points: { biwenger: 0, mixed: 0 } }] } },
  { id: "team-sale-dl-4", biwengerPlayerId: 904, name: "Delantero suplente 3", team: "Mi equipo", position: "DL", price: 1600000, biwengerValue: 1600000, starter: 20, form: 26, sourceStatus: "live", sourceSummary: { recentMatches: [{ provider: "biwenger", points: { biwenger: 0, mixed: 0 } }, { provider: "biwenger", points: { biwenger: 0, mixed: 0 } }, { provider: "biwenger", points: { biwenger: 0, mixed: 0 } }] } },
  { id: "team-sale-dl-5", biwengerPlayerId: 905, name: "Delantero suplente 4", team: "Mi equipo", position: "DL", price: 1500000, biwengerValue: 1500000, starter: 18, form: 24, sourceStatus: "live", sourceSummary: { recentMatches: [{ provider: "biwenger", points: { biwenger: 0, mixed: 0 } }, { provider: "biwenger", points: { biwenger: 0, mixed: 0 } }, { provider: "biwenger", points: { biwenger: 0, mixed: 0 } }] } }
]);
const saleRows = assistantSaleRows();
if (saleRows.some((row) => row.player.name === "Jugador en racha")) {
  throw new Error("Hot streak player should not be recommended for sale: " + JSON.stringify(saleRows));
}
const hotSale = saleUrgencyForPlayer(assistantTeamPlayers().find((player) => player.name === "Jugador en racha"));
if (hotSale.action !== "Mantener" || hotSale.suggestedPrice < hotSale.value) {
  throw new Error("Hot streak sale advice should protect player and keep sale price above market value: " + JSON.stringify(hotSale));
}
const urgentSale = saleUrgencyForPlayer({
  id: "urgent-sale-price",
  name: "Venta urgente",
  team: "Mi equipo",
  position: "MC",
  price: 5555000,
  biwengerValue: 5555000,
  lineupScore: 35,
  recommendation: 35,
  health: { status: "injured" },
  sourceSummary: {
    recentMatches: [
      { provider: "biwenger", points: { biwenger: 0, mixed: 0 } },
      { provider: "biwenger", points: { biwenger: 0, mixed: 0 } },
      { provider: "biwenger", points: { biwenger: 0, mixed: 0 } }
    ]
  }
});
if (urgentSale.action === "Mantener" || urgentSale.suggestedPrice < urgentSale.value) {
  throw new Error("Urgent sale price must not go below market value: " + JSON.stringify(urgentSale));
}

state.editableLineup = { formationName: "4-4-2", playerIds: ["alert-injured"] };
state.teamPlayers = hydrateImportedPlayers([
  { id: "alert-injured", name: "Lesionado titular", team: "Espana", position: "DF", health: { status: "injured", detail: "Baja muscular" } },
  { id: "alert-suspended", name: "Sancionado", team: "Espana", position: "MC", health: { status: "suspended", detail: "Acumulacion de tarjetas" } },
  { id: "alert-doubtful", name: "Jugador duda", team: "Espana", position: "DL", health: { status: "doubtful" } },
  { id: "alert-bench", name: "Suplente confirmado", team: "Espana", position: "MC", sourceSummary: { fantasy: { lineupStatus: "bench" } } },
  { id: "alert-low-estimate", name: "Titularidad baja estimada", team: "Espana", position: "MC", starter: 5 }
]);
state.teamDepartures = hydrateImportedPlayers([
  { id: "alert-departed", biwengerPlayerId: 99001, name: "Fuera de competicion", team: "Espana", position: "DF", outOfCompetition: true, activeInCompetition: false }
]);
const teamAlerts = buildTeamAlerts();
if (teamAlerts.length !== 5 || teamAlerts[0].player.id !== "alert-injured" || !teamAlerts[0].inLineup) {
  throw new Error("Team alert priority or incident detection failed: " + JSON.stringify(teamAlerts));
}
if (!teamAlerts.some((alert) => alert.player.id === "alert-departed" && alert.kind === "outside")) {
  throw new Error("Departed player must remain visible as an out-of-competition alert");
}
if (teamAlerts.some((alert) => alert.player.id === "alert-low-estimate")) {
  throw new Error("Low estimated starter probability must not become a confirmed team alert");
}

state.competition = "club";
state.activeLeagueId = "daily-plan-test";
state.finance = { balance: 10000000, teamValue: 25000000, maximumBid: 6000000, activeBids: 0, bidTotal: 0 };
state.biwengerOperations = { offers: [], sales: [], finance: { balance: 10000000, maximumBid: 6000000 } };
state.teamPlayers = [];
state.teamDepartures = [];
state.editableLineup = null;
state.players = hydrateImportedPlayers([
  { id: "daily-star-1", biwengerPlayerId: 2001, name: "Objetivo uno", team: "Equipo A", position: "DF", price: 2200000, starter: 94, form: 90, asScore: 88, sofascore: 89, stats: 88, risk: "low", sourceStatus: "live", dataConfidence: 90, sourceSummary: { recentMatches: [{ provider: "biwenger", points: { biwenger: 8, mixed: 8 } }, { provider: "biwenger", points: { biwenger: 9, mixed: 9 } }] } },
  { id: "daily-star-2", biwengerPlayerId: 2002, name: "Objetivo dos", team: "Equipo B", position: "MC", price: 2800000, starter: 90, form: 86, asScore: 86, sofascore: 87, stats: 86, risk: "low", sourceStatus: "live", dataConfidence: 86, sourceSummary: { recentMatches: [{ provider: "biwenger", points: { biwenger: 7, mixed: 7 } }, { provider: "biwenger", points: { biwenger: 8, mixed: 8 } }] } }
]);
const conservativePlan = dailyScenarioSnapshot("conservative");
const aggressivePlan = dailyScenarioSnapshot("aggressive");
if (conservativePlan.bids.length > aggressivePlan.bids.length || aggressivePlan.bids.meta.used > state.finance.maximumBid) {
  throw new Error("Daily plan scenarios must respect risk ordering and maximum bid budget");
}
recordDailyActionFeedback({ id: "bid:2001", type: "bid", player: state.players[0] }, true);
if (learnedDecisionAdjustment(state.players[0], "bid") <= 0) {
  throw new Error("Useful daily-plan feedback should create a bounded positive adjustment");
}

const requiredFormations = ["3-3-4", "3-6-1", "4-2-4", "4-6-0", "5-2-3"];
if (requiredFormations.some((name) => !FORMATIONS.some((formation) => formation.name === name))) {
  throw new Error("All official Biwenger extra formations must be selectable: " + JSON.stringify(FORMATIONS));
}

if (compareAppVersions("3.2.0", "3.1.9") !== 1 || compareAppVersions("3.2", "3.2.0") !== 0 || compareAppVersions("3.1.9", "3.2.0") !== -1) {
  throw new Error("Mobile release version comparison is not reliable");
}

state.biwenger = { ...state.biwenger, connected: true, userId: 77, rewardSettings: {} };
state.liveRound = {
  teams: [{
    userId: 77,
    isMe: true,
    points: 50,
    pointsReliable: true,
    provisionalRank: 2,
    players: [{ roundGoals: 2, isIdeal: true, isGameMvp: true }, { roundGoals: 1 }]
  }],
  rewardSettings: {
    available: true,
    fixed: 100000,
    pointValue: 10000,
    goal: 50000,
    idealLineup: 25000,
    gameMvp: 40000,
    roundRank2: 200000,
    leagueRank1: 300000
  },
  officialReward: { available: false, amount: 0 }
};
state.leagueOverview = { standings: [{ userId: 77, isMe: true, position: 1 }] };
const rewardEstimate = estimatedRoundReward();
if (rewardEstimate.amount !== 1315000 || rewardEstimate.source !== "Ajustes de liga Biwenger") {
  throw new Error("Round reward must combine the explicit Biwenger fields without guessing unrelated amounts: " + JSON.stringify(rewardEstimate));
}
const pitchHtml = renderLineupPitch({ POR: [{ id: "p1", biwengerPlayerId: 1, name: "Portero", position: "POR", roundPoints: 7, media: {} }], DF: [], MC: [], DL: [] });
if (!pitchHtml.includes("Puntos en la ultima jornada cerrada") || pitchHtml.includes("scoring-badge")) {
  throw new Error("Pitch cards must show only the round score circle, without accumulated points below");
}

console.log(JSON.stringify({
  players: analyzed.length,
  ocrPlayers: ocrPlayers.length,
  biwengerCards: biwengerCardSamples.length,
  worldcupBest: worldcupPlayers[0].name,
  best: analyzed[0].name,
  score: analyzed[0].recommendation
}));
`
);

vm.runInContext(appCode, context);
