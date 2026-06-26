const state = {
  players: [],
  teamPlayers: [],
  leagues: [],
  activeLeagueId: null,
  selectedPlayerId: null,
  selectedImageFile: null,
  selectedTeamImageFile: null,
  ocrTarget: "market",
  lastOcrHints: {},
  pendingMobileDetailOpen: false,
  isAnalyzing: false,
  isEnriching: false,
  isAnalyzingTeam: false,
  biwenger: {
    authenticated: false,
    connected: false,
    userId: null,
    leagueName: "",
    leagueId: null,
    leagueIcon: "",
    leagueCover: "",
    availableLeagues: [],
    userName: "",
    competition: "",
    importing: false
  },
  futbolFantasy: {
    connected: false,
    userName: "",
    trackingUrl: "https://www.futbolfantasy.com/seguimiento",
    syncing: false
  },
  finance: {
    balance: null,
    teamValue: null,
    maximumBid: null,
    activeBids: 0,
    bidTotal: 0,
    updatedAt: ""
  },
  leagueOverview: null,
  leagueFixtures: null,
  liveRound: null,
  liveRoundDebug: null,
  liveRoundFetchedAt: 0,
  liveRoundLoading: null,
  selectedLiveRoundUserId: null,
  rivalTeam: null,
  biwengerOperations: null,
  recentDetailsCache: {},
  offerSimulation: {
    selectedOfferIds: []
  },
  recommendedLineup: null,
  editableLineup: null,
  competition: "club",
  scoring: "mixed",
  weights: {
    starter: 35,
    system: 25,
    price: 20,
    form: 15,
    fit: 15
  },
  filters: {
    position: "all",
    budget: null
  },
  preferences: {
    strictBudget: true,
    riskAverse: false,
    investmentMode: false,
    rewards: {
      pointValue: 0,
      rank1: 0,
      rank2: 0,
      rank3: 0,
      mvp: 0
    }
  }
};

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => Array.from(document.querySelectorAll(selector));

const APP_CONFIG = window.APP_CONFIG || {};
const LOCAL_LEAGUES_KEY = "fantasy-market-scout.leagues.v1";
const LOCAL_API_BASE_KEY = "fantasy-market-scout.api-base.v1";
const LOCAL_DEVICE_KEY = "fantasy-market-scout.device-key.v1";
const DECISION_HISTORY_KEY = "fantasy-market-scout.decision-history.v1";
let lastDecisionHistorySignature = "";
const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");
const currentProtocol = window.location?.protocol || "http:";
const canUseRelativeApi = ["http:", "https:"].includes(currentProtocol);
const relativeApiUrl = (path) => {
  if (typeof window === "undefined" || !window.location) return path;
  const cleanPath = `/${String(path || "").replace(/^\/+/, "")}`;
  const pathname = window.location.pathname || "/";
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "";
  const looksLikeFile = /\.[a-z0-9]+$/i.test(lastSegment);
  const baseDir = pathname.endsWith("/")
    ? pathname.replace(/\/+$/, "")
    : looksLikeFile
      ? `/${segments.slice(0, -1).join("/")}`.replace(/\/+$/, "")
      : pathname.replace(/\/+$/, "");
  const appRoot = baseDir && baseDir !== "/" ? baseDir : "";
  return `${window.location.origin}${appRoot}${cleanPath}`;
};
const assetUrl = (path) => {
  if (typeof document === "undefined" || !document.baseURI) return path;
  try {
    return new URL(path, document.baseURI).href;
  } catch (error) {
    return path;
  }
};
const isNativeRuntime = () => Boolean(window.Capacitor?.isNativePlatform?.() || ["capacitor:", "app:"].includes(currentProtocol));
const readStoredApiBase = () => {
  try {
    return trimTrailingSlash(window.localStorage.getItem(LOCAL_API_BASE_KEY) || "");
  } catch (error) {
    return "";
  }
};
const writeStoredApiBase = (value) => {
  try {
    if (value) {
      window.localStorage.setItem(LOCAL_API_BASE_KEY, trimTrailingSlash(value));
    } else {
      window.localStorage.removeItem(LOCAL_API_BASE_KEY);
    }
  } catch (error) {
    // Ignore storage failures; the app can still work with in-memory config.
  }
};
const normalizeApiBase = (value) => {
  const base = trimTrailingSlash(value || "");
  return /\/api$/i.test(base) ? base.replace(/\/api$/i, "") : base;
};
const configuredApiBase = () => trimTrailingSlash(
  normalizeApiBase(readStoredApiBase())
  || normalizeApiBase(isNativeRuntime() ? APP_CONFIG.mobileApiBaseUrl : "")
  || normalizeApiBase(APP_CONFIG.apiBaseUrl)
  || normalizeApiBase(APP_CONFIG.mobileApiBaseUrl)
  || ""
);
const canUseApi = () => Boolean(configuredApiBase()) || canUseRelativeApi;
const apiUrl = (path) => {
  const cleanPath = `/${String(path || "").replace(/^\/+/, "")}`;
  return configuredApiBase() ? `${configuredApiBase()}${cleanPath}` : relativeApiUrl(cleanPath);
};
const deviceKey = (() => {
  try {
    let key = window.localStorage.getItem(LOCAL_DEVICE_KEY);
    if (!key) {
      const bytes = new Uint8Array(24);
      window.crypto.getRandomValues(bytes);
      key = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
      window.localStorage.setItem(LOCAL_DEVICE_KEY, key);
    }
    return key;
  } catch (error) {
    return `device-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }
})();
const apiFetch = (path, options = {}) => fetch(apiUrl(path), {
  credentials: "include",
  ...options,
  headers: {
    "X-FMS-Device-Key": deviceKey,
    ...(options.headers || {})
  }
});
const OCR_ENGINE_OPTIONS = {
  workerPath: assetUrl("vendor/tesseract/worker.min.js"),
  corePath: APP_CONFIG.ocrCoreUrl || "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js",
  langPath: APP_CONFIG.ocrLangPath || "https://tessdata.projectnaptha.com/4.0.0",
  workerBlobURL: false
};
const createClientLeagueId = () => `league-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const isCompactMarketLayout = () => window.matchMedia("(max-width: 720px)").matches;

const apiUnavailableMessage = () => configuredApiBase()
  ? `No se pudo conectar con la API configurada (${configuredApiBase()}).`
  : isNativeRuntime()
    ? "Guardado local activo. Añade la URL publica de tu API en Ajustes para usar fuentes reales."
    : "Esta version web no tiene backend /api disponible. Indica la URL de la API en Ajustes o publica tambien el backend.";

const describeApiError = (status, path = "/api") => {
  if (status === 404) {
    return configuredApiBase()
      ? `La API configurada no expone ${path}.`
      : `Esta web solo esta sirviendo el frontend y falta ${path}.`;
  }
  if (status === 401 || status === 403) {
    return "La API ha rechazado el acceso a las fuentes.";
  }
  if (status >= 500) {
    return "La API de fuentes ha fallado en el servidor.";
  }
  return apiUnavailableMessage();
};

const readLocalLeagueDb = () => {
  try {
    const raw = window.localStorage.getItem(LOCAL_LEAGUES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.leagues) return null;
    return parsed;
  } catch (error) {
    return null;
  }
};

const writeLocalLeagueDb = (db) => {
  try {
    window.localStorage.setItem(LOCAL_LEAGUES_KEY, JSON.stringify(db));
  } catch (error) {
    // Ignore quota or storage errors; the app can still work in memory.
  }
};

const buildLocalLeaguePayload = (db) => ({
  leagues: Object.values(db.leagues || {}).sort((a, b) => {
    const left = Date.parse(b.updatedAt || b.createdAt || 0);
    const right = Date.parse(a.updatedAt || a.createdAt || 0);
    return left - right;
  }),
  activeLeagueId: db.activeLeagueId || null
});

const ensureLocalLeagueDb = () => {
  const existing = readLocalLeagueDb();
  if (existing?.leagues && Object.keys(existing.leagues).length) return existing;
  const now = new Date().toISOString();
  const leagueId = createClientLeagueId();
  const db = {
    version: 1,
    activeLeagueId: leagueId,
    leagues: {
      [leagueId]: {
        id: leagueId,
        name: "Mi liga",
        createdAt: now,
        updatedAt: now,
        competition: state.competition,
        scoring: state.scoring,
        marketPlayers: [],
        teamPlayers: [],
        finance: { ...state.finance },
        weights: { ...state.weights },
        filters: { ...state.filters },
        preferences: { ...state.preferences }
      }
    }
  };
  writeLocalLeagueDb(db);
  return db;
};

const saveLocalLeagueSnapshot = () => {
  if (!state.activeLeagueId) return buildLocalLeaguePayload(ensureLocalLeagueDb());
  const db = ensureLocalLeagueDb();
  const now = new Date().toISOString();
  const existing = db.leagues[state.activeLeagueId] || {
    id: state.activeLeagueId,
    name: activeLeague()?.name || "Mi liga",
    createdAt: now
  };
  const visual = activeLeagueVisual();
  db.leagues[state.activeLeagueId] = {
    ...existing,
    updatedAt: now,
    competition: state.competition,
    scoring: state.scoring,
    marketPlayers: state.players,
    teamPlayers: state.teamPlayers,
    finance: { ...state.finance },
    weights: { ...state.weights },
    filters: { ...state.filters },
    preferences: { ...state.preferences },
    icon: safeRemoteImageUrl(visual.icon) || existing.icon || null,
    cover: safeRemoteImageUrl(visual.cover) || existing.cover || null,
    biwengerLeagueId: activeLeague()?.biwengerLeagueId || existing.biwengerLeagueId || null,
    editableLineup: state.editableLineup,
    leagueFixtures: state.leagueFixtures,
    leagueFixturesSavedAt: state.leagueFixtures ? now : (existing.leagueFixturesSavedAt || null)
  };
  db.activeLeagueId = state.activeLeagueId;
  writeLocalLeagueDb(db);
  return buildLocalLeaguePayload(db);
};

const createLocalLeague = (name) => {
  const db = ensureLocalLeagueDb();
  const now = new Date().toISOString();
  const leagueId = createClientLeagueId();
  db.leagues[leagueId] = {
    id: leagueId,
    name,
    createdAt: now,
    updatedAt: now,
    competition: state.competition,
    scoring: state.scoring,
    marketPlayers: [],
    teamPlayers: [],
    finance: { ...state.finance },
    weights: { ...state.weights },
    filters: { ...state.filters },
    preferences: { ...state.preferences }
  };
  db.activeLeagueId = leagueId;
  writeLocalLeagueDb(db);
  return buildLocalLeaguePayload(db);
};

const selectLocalLeague = (leagueId) => {
  const db = ensureLocalLeagueDb();
  if (!db.leagues[leagueId]) return buildLocalLeaguePayload(db);
  db.activeLeagueId = leagueId;
  writeLocalLeagueDb(db);
  return buildLocalLeaguePayload(db);
};

const deleteLocalLeague = (leagueId) => {
  const db = ensureLocalLeagueDb();
  if (!db.leagues[leagueId]) return buildLocalLeaguePayload(db);
  delete db.leagues[leagueId];
  const remainingIds = Object.keys(db.leagues);
  if (!remainingIds.length) {
    const now = new Date().toISOString();
    const fallbackId = createClientLeagueId();
    db.leagues[fallbackId] = {
      id: fallbackId,
      name: "Mi liga",
      createdAt: now,
      updatedAt: now,
      competition: state.competition,
      scoring: state.scoring,
      marketPlayers: [],
      teamPlayers: [],
      finance: { ...state.finance },
      weights: { ...state.weights },
      filters: { ...state.filters },
      preferences: { ...state.preferences }
    };
    db.activeLeagueId = fallbackId;
  } else if (db.activeLeagueId === leagueId) {
    db.activeLeagueId = remainingIds[0];
  }
  writeLocalLeagueDb(db);
  return buildLocalLeaguePayload(db);
};

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const formatMoney = (value) => {
  if (!Number.isFinite(value) || value <= 0) return "S/D";
  if (value >= 1000000) {
    const millions = value / 1000000;
    return `${millions.toLocaleString("es-ES", { maximumFractionDigits: 1 })} M`;
  }
  return value.toLocaleString("es-ES");
};

const formatFinanceMoney = (value) => Number.isFinite(value)
  ? `${Math.round(value).toLocaleString("es-ES")} €`
  : "S/D";

const numericPreference = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : fallback;
};

const normalizedRewardPreferences = () => {
  const rewards = state.preferences?.rewards || {};
  return {
    pointValue: numericPreference(rewards.pointValue),
    rank1: numericPreference(rewards.rank1),
    rank2: numericPreference(rewards.rank2),
    rank3: numericPreference(rewards.rank3),
    mvp: numericPreference(rewards.mvp)
  };
};

const formatCurrencyInput = (value) => Number.isFinite(Number(value))
  ? `${Math.round(Number(value)).toLocaleString("es-ES")} €`
  : "";

const parseCurrencyInput = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  const multiplier = /\b(m|mill(?:on|ones)?)\b/.test(raw)
    ? 1000000
    : (/\b(k|mil)\b/.test(raw) ? 1000 : 1);
  if (multiplier > 1) {
    const compact = raw
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const parsed = Number.parseFloat(compact);
    return Number.isFinite(parsed) ? Math.round(parsed * multiplier) : 0;
  }
  const digits = raw.replace(/[^\d-]/g, "");
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
};

const moneyAmount = (value) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  return parseCurrencyInput(value);
};

const formatActivityDate = (value) => {
  if (!value) return "";
  const numeric = Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric > 100000000000 ? numeric : numeric * 1000)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-ES");
};

const bindCurrencyInputs = (container = document) => {
  container.querySelectorAll(".currency-input").forEach((input) => {
    input.addEventListener("focus", () => {
      input.value = String(parseCurrencyInput(input.value) || "");
      input.select();
    });
    input.addEventListener("blur", () => {
      input.value = formatCurrencyInput(parseCurrencyInput(input.value));
    });
  });
};

const mergeFinance = (finance = {}) => {
  state.finance = {
    ...state.finance,
    ...Object.fromEntries(Object.entries(finance).filter(([, value]) => value !== undefined)),
    updatedAt: finance.updatedAt || new Date().toISOString()
  };
};

const normalize = (text) =>
  String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizedTeamName = (text) => normalize(text)
  .replace(/\b(fc|cf|club|futbol|football|de|the|seleccion|national|team)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const teamAliasesForMatching = () => ({
  ...(window.TEAM_ALIASES || {}),
  ...(window.NATIONAL_TEAM_ALIASES || {})
});

const canonicalTeamName = (text) => {
  const normalized = normalizedTeamName(text);
  if (!normalized) return "";
  const aliases = teamAliasesForMatching();
  const direct = aliases[normalized];
  if (direct) return normalizedTeamName(direct);
  const entry = Object.entries(aliases).find(([alias, target]) => {
    const aliasKey = normalizedTeamName(alias);
    const targetKey = normalizedTeamName(target);
    return normalized === aliasKey || normalized === targetKey;
  });
  return entry ? normalizedTeamName(entry[1]) : normalized;
};

const teamNamesForFixtureMatching = (player) => {
  const names = [
    player?.team,
    player?.nationalTeam,
    player?.clubTeam,
    player?.baseTeam,
    player?.sourceSummary?.identity?.nationalTeam,
    player?.sourceSummary?.identity?.clubTeam,
    player?.sourceSummary?.fantasy?.teamName,
    player?.sourceSummary?.apiFootball?.teamName,
    player?.sourceSummary?.apiFootball?.nationalTeamName
  ].filter(Boolean);
  const expanded = names.flatMap((name) => {
    const canonical = canonicalTeamName(name);
    const reverseAliases = Object.entries(teamAliasesForMatching())
      .filter(([, target]) => canonicalTeamName(target) === canonical)
      .map(([alias]) => alias);
    return [name, canonical, ...reverseAliases];
  });
  return [...new Set(expanded.map((name) => String(name).trim()).filter(Boolean))];
};

const teamNameMatchScore = (left, right) => {
  const a = canonicalTeamName(left);
  const b = canonicalTeamName(right);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.length >= 5 && b.length >= 5 && (a.includes(b) || b.includes(a))) return 88;
  const aTokens = new Set(a.split(" ").filter((token) => token.length > 2));
  const bTokens = new Set(b.split(" ").filter((token) => token.length > 2));
  const overlap = [...aTokens].filter((token) => bTokens.has(token)).length;
  return overlap ? Math.round((overlap / Math.max(aTokens.size, bTokens.size)) * 75) : 0;
};

const hasUpcomingFixtureEvents = (fixtures = state.leagueFixtures) => {
  const events = fixtures?.events || [];
  const nowSeconds = Date.now() / 1000;
  return Array.isArray(events) && events.some((event) => Number(event.timestamp || 0) >= nowSeconds - (3 * 60 * 60));
};

const nextMatchForPlayer = (player) => {
  const events = state.leagueFixtures?.events || [];
  const nowSeconds = Date.now() / 1000;
  const teamNames = teamNamesForFixtureMatching(player);
  const candidates = events
    .filter((event) => Number(event.timestamp || 0) >= nowSeconds - (3 * 60 * 60))
    .map((event) => {
      const homeName = event.home?.name || "";
      const awayName = event.away?.name || "";
      const homeScore = Math.max(...teamNames.map((name) => teamNameMatchScore(name, homeName)), 0);
      const awayScore = Math.max(...teamNames.map((name) => teamNameMatchScore(name, awayName)), 0);
      const isHome = homeScore >= awayScore;
      return { event, score: Math.max(homeScore, awayScore), isHome };
    })
    .filter((candidate) => candidate.score >= 55)
    .sort((left, right) => Number(left.event.timestamp || 0) - Number(right.event.timestamp || 0));
  if (!candidates.length) return null;
  const { event, isHome } = candidates[0];
  return {
    opponent: isHome ? event.away : event.home,
    isHome,
    timestamp: Number(event.timestamp || 0),
    detailUrl: event.sofascoreUrl || event.detailUrl || null
  };
};

const upcomingMatchesForPlayer = (player, limit = 3) => {
  const events = state.leagueFixtures?.events || [];
  const nowSeconds = Date.now() / 1000;
  const teamNames = teamNamesForFixtureMatching(player);
  return events
    .filter((event) => Number(event.timestamp || 0) >= nowSeconds - (3 * 60 * 60))
    .map((event) => {
      const homeName = event.home?.name || "";
      const awayName = event.away?.name || "";
      const homeScore = Math.max(...teamNames.map((name) => teamNameMatchScore(name, homeName)), 0);
      const awayScore = Math.max(...teamNames.map((name) => teamNameMatchScore(name, awayName)), 0);
      const isHome = homeScore >= awayScore;
      return {
        ...event,
        matchScore: Math.max(homeScore, awayScore),
        isHome,
        opponent: isHome ? event.away : event.home
      };
    })
    .filter((event) => event.matchScore >= 55)
    .sort((left, right) => Number(left.timestamp || 0) - Number(right.timestamp || 0))
    .slice(0, limit);
};

const teamRecentStrength = (teamName) => {
  const events = state.leagueFixtures?.events || [];
  const finished = events.filter((event) => Number.isFinite(event.homeScore) && Number.isFinite(event.awayScore));
  const rows = finished.map((event) => {
    const homeMatch = teamNameMatchScore(teamName, event.home?.name || "");
    const awayMatch = teamNameMatchScore(teamName, event.away?.name || "");
    if (Math.max(homeMatch, awayMatch) < 55) return null;
    const isHome = homeMatch >= awayMatch;
    const goalsFor = Number(isHome ? event.homeScore : event.awayScore);
    const goalsAgainst = Number(isHome ? event.awayScore : event.homeScore);
    return { goalsFor, goalsAgainst, points: goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0 };
  }).filter(Boolean).slice(-5);
  if (!rows.length) return 50;
  const pointsRate = rows.reduce((sum, row) => sum + row.points, 0) / (rows.length * 3);
  const goalDiff = rows.reduce((sum, row) => sum + row.goalsFor - row.goalsAgainst, 0) / rows.length;
  return Math.round(clamp(38 + pointsRate * 42 + goalDiff * 8));
};

const fixtureEaseForPlayer = (player) => {
  const matches = upcomingMatchesForPlayer(player, 3);
  if (!matches.length) return { score: 50, matches: [], label: "calendario sin datos" };
  const weighted = matches.map((match, index) => {
    const opponentStrength = teamRecentStrength(match.opponent?.name || "");
    const homeBonus = match.isHome ? 5 : -3;
    return { ...match, ease: clamp(100 - opponentStrength + homeBonus), weight: [1, 0.72, 0.5][index] || 0.4 };
  });
  const score = Math.round(weighted.reduce((sum, match) => sum + match.ease * match.weight, 0) / weighted.reduce((sum, match) => sum + match.weight, 0));
  return {
    score,
    matches: weighted,
    label: score >= 66 ? "calendario favorable" : score <= 38 ? "calendario exigente" : "calendario neutro"
  };
};

const marketIntelligenceForPlayer = (player, system, price, fit) => {
  const calendar = fixtureEaseForPlayer(player);
  const starterFactor = clamp(Number(player.starter || 0)) / 100;
  const fixturesKnown = Array.isArray(state.leagueFixtures?.events) && state.leagueFixtures.events.length > 0;
  const noNextMatch = fixturesKnown && !calendar.matches.length;
  const healthStatus = player.health?.status || "unknown";
  const availability = healthStatus === "suspended" || noNextMatch
    ? 0.02
    : healthStatus === "injured"
      ? 0.06
      : healthStatus === "doubtful"
        ? 0.62
        : 1;
  const positionBase = ({ POR: 3.8, DF: 4.4, MC: 4.8, DL: 5.1, ENT: 3.2 })[player.position] || 4.4;
  const modelExpectedPoints = (
    starterFactor * availability * (
      positionBase
      + (system - 50) / 18
      + (Number(player.form || 50) - 50) / 24
      + (calendar.score - 50) / 32
    )
  );
  const fantasyAverage = fantasyAveragePointsForScoring(player);
  const expectedPoints = Math.round((Number.isFinite(fantasyAverage)
    ? modelExpectedPoints * 0.56 + fantasyAverage * availability * 0.44
    : modelExpectedPoints) * 10) / 10;
  const priceMillions = Math.max(Number(player.price || 0) / 1_000_000, 0.2);
  const pointsPerMillion = Math.round((expectedPoints / priceMillions) * 100) / 100;
  const valueDiff = Number(player.biwengerDiff ?? player.sourceSummary?.fantasy?.biwengerDiff ?? 0);
  const trendSignal = Number(player.valueTrend || 0);
  const demandSignal = Math.min(18, Number(player.bidCount || player.rivalBidCount || 0) * 5);
  const revaluationScore = Math.round(clamp(
    48
    + Math.max(-24, Math.min(24, trendSignal * 3))
    + Math.max(-18, Math.min(18, valueDiff / Math.max(Number(player.price || 1), 1) * 240))
    + demandSignal
    + (price - 50) * 0.18
  ));
  const matches = calendar.matches;
  const congestionDays = matches.length >= 2 ? (Number(matches[1].timestamp || 0) - Number(matches[0].timestamp || 0)) / 86400 : null;
  let contextualRisk = 0;
  const contextualReasons = [];
  if (congestionDays !== null && congestionDays < 5) {
    contextualRisk += congestionDays < 3.5 ? 12 : 7;
    contextualReasons.push(`dos partidos en ${Math.max(1, Math.round(congestionDays))} días`);
  }
  if (player.starter < 55) {
    contextualRisk += 12;
    contextualReasons.push("titularidad baja");
  }
  if (player.health?.status === "doubtful") {
    contextualRisk += 15;
    contextualReasons.push("estado dudoso");
  }
  if (healthStatus === "suspended") {
    contextualRisk += 55;
    contextualReasons.push("sancionado: no juega el siguiente partido");
  } else if (healthStatus === "injured") {
    contextualRisk += 42;
    contextualReasons.push("lesionado");
  }
  if (noNextMatch) {
    contextualRisk += 38;
    contextualReasons.push("sin partido proximo localizado en la jornada");
  }
  contextualRisk = Math.round(clamp(contextualRisk));

  let role = "Fondo de plantilla";
  if (player.starter >= 72 && expectedPoints >= 5.5 && fit >= 55) role = "Titular inmediato";
  else if (revaluationScore >= 68 && pointsPerMillion >= 0.8) role = "Inversión";
  else if (fit >= 72) role = "Cubre una carencia";
  else if (player.starter >= 60 && expectedPoints >= 4) role = "Refuerzo de rotación";
  if (contextualRisk >= 35 || player.starter < 30 || noNextMatch || healthStatus === "suspended") role = "Evitar por ahora";

  return {
    calendar,
    expectedPoints: Math.max(0, expectedPoints),
    pointsPerMillion: Math.max(0, pointsPerMillion),
    revaluationScore,
    contextualRisk,
    contextualReasons,
    role,
    noNextMatch,
    fixturesKnown
  };
};

const renderNextMatch = (player, compact = false) => {
  const match = nextMatchForPlayer(player);
  if (!match) return `<span class="next-match unavailable">Sin partido localizado</span>`;
  const date = new Date(match.timestamp * 1000);
  const day = date.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Madrid" });
  const time = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  const content = `
    ${match.opponent?.image ? `<img src="${escapeHtml(match.opponent.image)}" alt="" loading="lazy" />` : ""}
    <span><strong>${match.isHome ? "vs" : "@"} ${escapeHtml(match.opponent?.name || "Rival")}</strong><small>${escapeHtml(day)} · ${escapeHtml(time)}</small></span>
  `;
  return match.detailUrl
    ? `<a class="next-match ${compact ? "compact" : ""}" href="${escapeHtml(match.detailUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${content}</a>`
    : `<span class="next-match ${compact ? "compact" : ""}">${content}</span>`;
};

const nextMatchPlainText = (player) => {
  const match = nextMatchForPlayer(player);
  if (!match) return "Sin partido localizado";
  const date = new Date(match.timestamp * 1000);
  const day = date.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Madrid" });
  const time = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  return `${match.isHome ? "vs" : "@"} ${match.opponent?.name || "Rival"} · ${day} ${time}`;
};

const renderMarketSignals = (player) => {
  const intel = player.marketIntelligence;
  const relative = player.marketRelative;
  if (!intel) return "";
  const calendarClass = intel.calendar.score >= 66 ? "positive" : intel.calendar.score <= 38 ? "negative" : "neutral";
  const valueClass = intel.revaluationScore >= 65 ? "positive" : intel.revaluationScore <= 38 ? "negative" : "neutral";
  const relativeClass = relative?.valueScore >= 68 ? "positive" : relative?.valueScore <= 42 ? "negative" : "neutral";
  const scarcityClass = relative?.scarcityScore >= 70 ? "warning" : relative?.scarcityScore <= 38 ? "negative" : "neutral";
  const recent = player.recentForm;
  const recentClass = recent?.hot
    ? "positive"
    : (recent?.noRecentMinutes || recent?.cold || (recent?.score || 50) <= 38)
      ? "negative"
      : (recent?.score || 50) <= 52 ? "warning" : "neutral";
  const recentTitle = recent
    ? `${recent.label} · ${recent.matches ? `${recent.playedCount}/${recent.matches} partidos con minutos` : "sin muestra fiable"}`
    : "";
  return `
    <span class="market-signals">
      <b class="market-signal role">${escapeHtml(intel.role)}</b>
      ${recent ? `<b class="market-signal ${recentClass}" title="${escapeHtml(recentTitle)}">RAC ${recent.score}</b>` : ""}
      <b class="market-signal ${calendarClass}" title="${escapeHtml(intel.calendar.label)}">CAL ${intel.calendar.score}</b>
      <b class="market-signal ${valueClass}" title="Potencial de revalorización">VAL ${intel.revaluationScore}</b>
      <b class="market-signal efficiency" title="Puntos esperados por millón">${intel.pointsPerMillion.toLocaleString("es-ES")} pts/M</b>
      <b class="market-signal confidence" title="Confianza del análisis">${analysisConfidence(player).label}</b>
      ${relative ? `<b class="market-signal ${relativeClass}" title="${escapeHtml(relative.label)}">REL ${relative.valueScore}</b>` : ""}
      ${relative ? `<b class="market-signal ${scarcityClass}" title="${relative.viableCount}/${relative.positionCount} perfiles fiables en ${relative.position}">ESC ${relative.scarcityScore}</b>` : ""}
      ${relative?.cheapTrap ? `<b class="market-signal negative" title="Precio bajo, pero titularidad o retorno esperado insuficiente">TRAMPA</b>` : ""}
    </span>
  `;
};

const renderTopFiveRecommendations = (players) => {
  const target = qs("#market-top-five-list");
  if (!target) return;
  const top = players.slice(0, 5);
  if (!top.length) {
    target.innerHTML = `<p class="muted-empty compact">No hay jugadores que cumplan los filtros.</p>`;
    return;
  }
  target.innerHTML = top.map((player, index) => {
    const fantasyAverage = fantasyAveragePointsForScoring(player);
    const pointsText = Number.isFinite(fantasyAverage)
      ? `${fantasyAverage.toLocaleString("es-ES", { maximumFractionDigits: 1 })} pts/part.`
      : `${playerAccumulatedPoints(player).toLocaleString("es-ES")} pts`;
    const recentText = player.recentForm?.label ? ` · ${player.recentForm.label}` : "";
    return `
      <button class="top-five-card" type="button" data-player-id="${player.id}">
        <span class="top-five-rank">${index + 1}</span>
        ${renderPlayerMedia(player, "sm")}
        <span class="top-five-main">
          <span class="player-name-line"><strong>${escapeHtml(player.name)}</strong>${renderRecentFormDots(player)}</span>
          <small>${renderPositionBadge(player.position)} ${renderScoringBadge(player)} ${escapeHtml(player.team)} · ${player.starter}% titular · ${pointsText}${escapeHtml(recentText)}</small>
          <small>${escapeHtml(nextMatchPlainText(player))}</small>
        </span>
        <span class="top-five-side">
          <b>${player.recommendation}</b>
          <small>${formatMoney(player.price)}</small>
          ${renderDecisionBadge(player, true)}
          ${playerHasOwnBid(player) ? `<i class="bid-badge active">Tu puja ${formatFinanceMoney(playerOwnBidAmount(player))}</i>` : renderMaximumBidBadge(player, true)}
        </span>
      </button>
    `;
  }).join("");
  target.querySelectorAll("[data-player-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPlayerId = button.dataset.playerId;
      state.pendingMobileDetailOpen = isCompactMarketLayout();
      renderTable();
    });
  });
};

const renderMarketDecisionCenter = (players) => {
  const target = qs("#market-decision-lanes");
  if (!target) return;
  if (!players.length) {
    target.innerHTML = `<p class="muted-empty compact">Carga o actualiza el mercado para ver acciones recomendadas.</p>`;
    return;
  }
  const lanes = [
    ["buy", "Fichar", "Prioridad real"],
    ["limited", "Pujar con límite", "Interesantes sin calentarse"],
    ["watch", "Vigilar", "Esperar precio o datos"],
    ["avoid", "Evitar", "Riesgo o no pujables"]
  ];
  target.innerHTML = lanes.map(([type, title, subtitle]) => {
    const lanePlayers = players.filter((player) => player.marketDecision?.type === type).slice(0, 4);
    return `
      <article class="decision-lane ${type}">
        <header>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(subtitle)}</small>
        </header>
        ${lanePlayers.length ? lanePlayers.map((player) => `
          <button class="decision-player" type="button" data-player-id="${player.id}">
            ${renderPlayerMedia(player, "sm")}
            <span>
              <span class="player-name-line"><b>${escapeHtml(player.name)}</b>${renderRecentFormDots(player)}</span>
              <small>${renderPositionBadge(player.position)} ${renderScoringBadge(player)} ${player.recommendation} · ${player.marketDecision.recommendedBid ? formatFinanceMoney(player.marketDecision.recommendedBid) : player.marketDecision.summary}</small>
            </span>
          </button>
        `).join("") : `<p class="muted-empty compact">Sin candidatos.</p>`}
      </article>
    `;
  }).join("");
  target.querySelectorAll("[data-player-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPlayerId = button.dataset.playerId;
      state.pendingMobileDetailOpen = isCompactMarketLayout();
      renderTable();
    });
  });
};

const analysisConfidence = (player) => {
  const reasons = [];
  let score = 18;
  const dataConfidence = Number(player.dataConfidence || 0);
  score += Math.min(22, dataConfidence * 0.22);
  if (player.sourceStatus === "live") {
    score += 18;
    reasons.push("fuentes actualizadas");
  } else if (player.sourceStatus === "seed") {
    score += 8;
    reasons.push("base local");
  } else {
    reasons.push("estimación local");
  }
  if (player.sourceLinks?.futbolFantasy || player.sourceSummary?.fantasy?.teamLineupUrl) {
    score += 14;
    reasons.push("Futbol Fantasy");
  }
  if (Array.isArray(player.sourceSummary?.recentMatches) && player.sourceSummary.recentMatches.length) {
    score += Math.min(14, player.sourceSummary.recentMatches.length * 3);
    reasons.push("racha real");
  }
  if (player.biwengerPlayerId) {
    score += 8;
    reasons.push("Biwenger");
  }
  if (player.photo || player.emblem || player.flag) score += 4;
  if (nextMatchForPlayer(player)) {
    score += 8;
    reasons.push("próximo partido");
  } else if (hasUpcomingFixtureEvents()) {
    score -= 10;
    reasons.push("sin cruce localizado");
  }
  if (player.health?.status && player.health.status !== "unknown") score += 6;
  if (Number(player.bidCount || player.rivalBidCount || 0) > 0 || player.rivalBidVisibility === "count") score += 3;
  const value = Math.round(clamp(score));
  return {
    score: value,
    label: value >= 74 ? "Alta" : value >= 52 ? "Media" : "Baja",
    className: value >= 74 ? "high" : value >= 52 ? "medium" : "low",
    reasons: reasons.slice(0, 4)
  };
};

const renderConfidenceBadge = (player) => {
  const confidence = analysisConfidence(player);
  return `<span class="confidence-badge ${confidence.className}" title="${escapeHtml(confidence.reasons.join(" · ") || "Sin explicación")}">Conf. ${confidence.label}</span>`;
};

const smartBidPlan = (player) => {
  const price = Number(player.price || player.biwengerValue || 0);
  const referenceValue = Number(player.referenceValue || player.biwengerValue || player.sourceSummary?.fantasy?.marketValue || price || 0);
  const maximumBid = Number(state.finance.maximumBid);
  const hasMaximumBid = Number.isFinite(maximumBid) && maximumBid > 0;
  const ownBidAmount = playerOwnBidAmount(player);
  const hasOwnBid = playerHasOwnBid(player);
  const demand = Math.max(0, Number(player.bidCount || 0), Number(player.rivalBidCount || 0));
  const decision = player.marketDecision || {};
  const confidence = analysisConfidence(player);
  const baseRecommended = Number(decision.recommendedBid || 0) || (decision.type === "buy" || decision.type === "limited" ? price : 0);
  const rationalBase = Number(decision.reasonableLimit || player.maxBid || baseRecommended || price || 0);
  const demandBoost = demand > 0 && player.recommendation >= 68 ? Math.min(0.075, demand * 0.0175) : 0;
  const confidenceDiscount = confidence.score < 52 ? 0.05 : confidence.score < 70 ? 0.025 : 0;
  const healthDiscount = player.health?.status === "doubtful" ? 0.045 : ["injured", "suspended"].includes(player.health?.status) ? 0.2 : 0;
  let recommendedBid = roundBidAmount(baseRecommended * (1 - confidenceDiscount - healthDiscount));
  let rationalMax = roundBidAmount(rationalBase * (1 - Math.max(confidenceDiscount * 0.5, healthDiscount * 0.5)));
  let aggressiveBid = roundBidAmount(Math.max(recommendedBid, rationalMax) * (1 + demandBoost));
  if (!recommendedBid && decision.type !== "avoid" && decision.type !== "watch" && price > 0) recommendedBid = price;
  rationalMax = Math.max(rationalMax, recommendedBid);
  aggressiveBid = Math.max(aggressiveBid, rationalMax);
  if (hasMaximumBid && !hasOwnBid) {
    recommendedBid = Math.min(recommendedBid, maximumBid);
    rationalMax = Math.min(rationalMax, maximumBid);
    aggressiveBid = Math.min(aggressiveBid, maximumBid);
  }
  if (decision.type === "avoid") {
    recommendedBid = 0;
    rationalMax = 0;
    aggressiveBid = 0;
  }
  const blocked = !hasOwnBid && hasMaximumBid && price > maximumBid;
  const overReference = recommendedBid && referenceValue ? recommendedBid - referenceValue : null;
  const warning = blocked
    ? `No entra en tu puja máxima: necesitas ${formatFinanceMoney(price - maximumBid)} más.`
    : decision.type === "avoid"
      ? "No comprometer saldo ahora."
      : overReference > Math.max(250000, referenceValue * 0.08)
        ? "La puja recomendada ya supera bastante el valor de referencia."
        : demand > 1
          ? "Hay competencia visible: usa el tope agresivo solo si es objetivo prioritario."
          : "Importe razonable para no romper saldo.";
  return {
    price,
    referenceValue,
    maximumBid: hasMaximumBid ? maximumBid : null,
    recommendedBid,
    rationalMax,
    aggressiveBid,
    overReference,
    demand,
    hasOwnBid,
    ownBidAmount,
    blocked,
    warning
  };
};

const renderSmartBidSummary = (player) => {
  const plan = smartBidPlan(player);
  return `
    <div class="smart-bid-grid">
      <div><span>Puja sugerida</span><strong>${plan.recommendedBid ? formatFinanceMoney(plan.recommendedBid) : "No pujar"}</strong></div>
      <div><span>Tope racional</span><strong>${plan.rationalMax ? formatFinanceMoney(plan.rationalMax) : "S/D"}</strong></div>
      <div><span>Modo agresivo</span><strong>${plan.aggressiveBid ? formatFinanceMoney(plan.aggressiveBid) : "S/D"}</strong></div>
      <div><span>Vs valor ref.</span><strong class="${plan.overReference > 0 ? "negative" : "positive"}">${Number.isFinite(plan.overReference) ? formatSignedMoney(plan.overReference) : "S/D"}</strong></div>
    </div>
    <p class="smart-bid-warning">${escapeHtml(plan.warning)}</p>
  `;
};

const playerDecisionSentence = (player) => {
  const decision = player.marketDecision;
  const plan = smartBidPlan(player);
  const confidence = analysisConfidence(player);
  if (!decision) return "Sin decisión calculada.";
  if (plan.blocked) return `${decision.label}: deportivamente puede interesar, pero hoy no es pujable con tu puja máxima.`;
  if (decision.type === "buy") return `Fichar: prioridad alta, confianza ${confidence.label.toLowerCase()} y tope racional ${formatFinanceMoney(plan.rationalMax)}.`;
  if (decision.type === "limited") return `Pujar con límite: entra si no pasa de ${formatFinanceMoney(plan.rationalMax)}.`;
  if (decision.type === "watch") return `Vigilar: espera mejor precio o datos más fiables antes de pujar.`;
  return `Evitar: ${decision.summary}`;
};

const renderStrategyPlayer = (player, extra = "") => `
  <button class="strategy-player" type="button" data-strategy-player="${escapeHtml(player.id)}">
    ${renderPlayerMedia(player, "sm")}
    <span>
      <span class="player-name-line"><strong>${escapeHtml(player.name)}</strong>${renderRecentFormDots(player)}</span>
      <small class="strategy-player-meta">
        ${renderPositionBadge(player.position)}
        ${renderScoringBadge(player)}
        <span>${player.recommendation} rec. · ${escapeHtml(extra || playerDecisionSentence(player))}</span>
      </small>
    </span>
  </button>
`;

const bindStrategyPlayerLinks = (root) => {
  if (!root) return;
  root.querySelectorAll("[data-strategy-player]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPlayerId = button.dataset.strategyPlayer;
      state.pendingMobileDetailOpen = isCompactMarketLayout();
      renderTable();
    });
  });
};

const opportunityBuckets = (players) => ([
  {
    key: "bargain",
    title: "Gangas reales",
    text: "Precio amable con titularidad y puntos",
    players: players.filter((player) =>
      player.recommendation >= 70
      && player.starter >= 60
      && player.marketRelative?.valueScore >= 62
      && !player.exceedsMaximumBid
      && player.marketDecision?.type !== "avoid"
    )
  },
  {
    key: "starter",
    title: "Titulares infravalorados",
    text: "Probables titulares que no se han disparado",
    players: players.filter((player) =>
      player.starter >= 72
      && player.priceScore >= 52
      && player.marketDecision?.type !== "avoid"
    )
  },
  {
    key: "expensive",
    title: "Caros con mala racha",
    text: "Mucho precio para poco retorno reciente",
    players: players.filter((player) =>
      player.marketRelative?.overpayRisk
      || (player.recentForm?.cold && player.priceScore < 48)
    )
  },
  {
    key: "growth",
    title: "Revalorización probable",
    text: "Subida de valor o demanda de mercado",
    players: players.filter((player) =>
      player.marketIntelligence?.revaluationScore >= 66
      && player.marketDecision?.type !== "avoid"
    )
  },
  {
    key: "avoid",
    title: "No tocar",
    text: "Riesgo, baja, sanción o sin partido",
    players: players.filter((player) => player.marketDecision?.type === "avoid")
  }
]);

const renderOpportunityRadar = (players) => {
  const target = qs("#opportunity-radar");
  if (!target) return;
  if (!players.length) {
    target.innerHTML = `<p class="muted-empty compact">Sin mercado analizado.</p>`;
    return;
  }
  target.innerHTML = opportunityBuckets(players).map((bucket) => {
    const rows = bucket.players.slice(0, 3);
    return `
      <div class="radar-column ${bucket.key}">
        <header><strong>${escapeHtml(bucket.title)}</strong><small>${escapeHtml(bucket.text)}</small></header>
        ${rows.length
          ? rows.map((player) => renderStrategyPlayer(player, `${formatMoney(player.price)} · ${nextMatchPlainText(player)}`)).join("")
          : `<p class="muted-empty compact">Sin candidatos.</p>`}
      </div>
    `;
  }).join("");
  bindStrategyPlayerLinks(target);
};

const marketAlertsForPlayers = (players) => {
  const alerts = [];
  const top = players[0];
  if (top) alerts.push({ type: "top", title: "Mejor oportunidad", text: `${top.name}: ${playerDecisionSentence(top)}`, player: top });
  players.filter((player) => player.exceedsMaximumBid && player.recommendation >= 58).slice(0, 3).forEach((player) => {
    alerts.push({ type: "budget", title: "Fuera de puja máxima", text: `${player.name} supera tu límite por ${formatFinanceMoney(player.maximumBidGap)}.`, player });
  });
  players.filter((player) => Number(player.bidCount || player.rivalBidCount || 0) >= 2).slice(0, 3).forEach((player) => {
    alerts.push({ type: "demand", title: "Mercado caliente", text: `${player.name} tiene ${Number(player.bidCount || player.rivalBidCount || 0)} pujas visibles.`, player });
  });
  players.filter((player) => player.squadFitScore >= 78 && player.marketDecision?.type !== "avoid").slice(0, 3).forEach((player) => {
    alerts.push({ type: "fit", title: "Cubre carencia", text: `${player.name} mejora una posición débil: ${POSITION_NAMES[player.position] || player.position}.`, player });
  });
  players.filter((player) => ["injured", "suspended", "doubtful"].includes(player.health?.status)).slice(0, 4).forEach((player) => {
    alerts.push({ type: "health", title: healthMeta(player).label, text: `${player.name}: ${player.health?.detail || player.marketDecision?.summary || "revisar estado"}.`, player });
  });
  players.filter((player) => player.marketIntelligence?.noNextMatch).slice(0, 3).forEach((player) => {
    alerts.push({ type: "fixture", title: "Sin próximo partido", text: `${player.name} baja mucho porque no localizamos partido inmediato.`, player });
  });
  players.filter((player) => analysisConfidence(player).score < 52 && player.recommendation >= 65).slice(0, 3).forEach((player) => {
    alerts.push({ type: "source", title: "Datos flojos", text: `${player.name} gusta, pero la confianza del análisis es baja.`, player });
  });
  players.filter((player) => Number(player.biwengerDiff ?? player.sourceSummary?.fantasy?.biwengerDiff ?? 0) !== 0)
    .sort((a, b) => Math.abs(Number(b.biwengerDiff ?? b.sourceSummary?.fantasy?.biwengerDiff ?? 0)) - Math.abs(Number(a.biwengerDiff ?? a.sourceSummary?.fantasy?.biwengerDiff ?? 0)))
    .slice(0, 3)
    .forEach((player) => {
      const diff = Number(player.biwengerDiff ?? player.sourceSummary?.fantasy?.biwengerDiff ?? 0);
      alerts.push({ type: diff > 0 ? "rise" : "drop", title: diff > 0 ? "Sube valor" : "Pierde valor", text: `${player.name}: ${formatSignedMoney(diff)} en Biwenger.`, player });
    });
  return alerts.slice(0, 9);
};

const renderMarketAlerts = (players) => {
  const target = qs("#market-alerts");
  if (!target) return;
  const alerts = marketAlertsForPlayers(players);
  if (!alerts.length) {
    target.innerHTML = `<p class="muted-empty compact">Sin alertas relevantes.</p>`;
    return;
  }
  target.innerHTML = alerts.map((alert) => `
    <button class="market-alert ${alert.type}" type="button" data-strategy-player="${escapeHtml(alert.player.id)}">
      <strong>${escapeHtml(alert.title)}</strong>
      <span>${escapeHtml(alert.text)}</span>
    </button>
  `).join("");
  bindStrategyPlayerLinks(target);
};

const teamNeedPositions = () => {
  const counts = teamPositionCounts();
  return Object.entries(SQUAD_TARGETS)
    .map(([position, target]) => ({
      position,
      current: counts[position] || 0,
      target,
      gap: Math.max(0, target - (counts[position] || 0))
    }))
    .filter((item) => item.gap > 0)
    .sort((a, b) => b.gap - a.gap);
};

const rivalMarketPressureSummary = (players) => {
  const rows = (state.leagueOverview?.standings || []).filter((row) => !row.isMe);
  const contested = players
    .filter((player) => Number(player.bidCount || player.rivalBidCount || 0) > 0)
    .sort((a, b) => Number(b.bidCount || b.rivalBidCount || 0) - Number(a.bidCount || a.rivalBidCount || 0));
  const richest = rows
    .map((row) => ({
      ...row,
      liquidity: Number(row.maximumBid ?? row.finance?.maximumBid ?? row.cash ?? row.balance)
    }))
    .filter((row) => Number.isFinite(row.liquidity))
    .sort((a, b) => Number(b.liquidity || 0) - Number(a.liquidity || 0))[0];
  if (!rows.length && !contested.length) {
    return "Actualiza Centro de liga y pujas para estimar presión rival.";
  }
  const parts = [];
  if (contested[0]) {
    parts.push(`${contested[0].name} concentra ${Number(contested[0].bidCount || contested[0].rivalBidCount || 0)} puja${Number(contested[0].bidCount || contested[0].rivalBidCount || 0) === 1 ? "" : "s"}.`);
  }
  if (richest) {
    parts.push(`${richest.name} parece el rival con más margen visible (${formatFinanceMoney(richest.liquidity)}).`);
  } else if (rows.length) {
    parts.push(`${rows.length} rivales cargados; liquidez no expuesta por Biwenger.`);
  }
  return parts.join(" ");
};

const renderMarketPlan = (players) => {
  const target = qs("#market-plan");
  if (!target) return;
  if (!players.length) {
    target.innerHTML = `<p class="muted-empty compact">Carga el mercado para generar una estrategia con tu saldo, equipo y pujas.</p>`;
    return;
  }
  const buy = players.filter((player) => player.marketDecision?.type === "buy" && !player.exceedsMaximumBid).slice(0, 2);
  const limited = players.filter((player) => player.marketDecision?.type === "limited" && !player.exceedsMaximumBid).slice(0, 3);
  const avoid = players.filter((player) => player.marketDecision?.type === "avoid").slice(0, 3);
  const needs = teamNeedPositions().slice(0, 2);
  const incomingOffers = activeIncomingOffers(state.biwengerOperations?.offers || []);
  const balance = Number(state.finance.balance);
  const maximumBid = Number(state.finance.maximumBid);
  const futureBalanceText = Number.isFinite(balance)
    ? `Saldo actual ${formatFinanceMoney(balance)}${Number.isFinite(maximumBid) ? ` · puja máxima ${formatFinanceMoney(maximumBid)}` : ""}`
    : "Conecta Biwenger para usar saldo y puja máxima reales.";
  const negativeAdvice = Number.isFinite(balance) && balance < 0
    ? `Prioridad: salir del negativo. Simula ofertas recibidas antes de fichar; necesitas ${formatFinanceMoney(Math.abs(balance))}.`
    : "Puedes fichar sin perder de vista el saldo futuro y las pujas activas.";
  const needText = needs.length
    ? `Refuerza ${needs.map((item) => `${POSITION_NAMES[item.position] || item.position} (${item.current}/${item.target})`).join(" y ")}.`
    : "Tu plantilla está razonablemente equilibrada por posiciones.";
  const rivalPressure = rivalMarketPressureSummary(players);
  target.innerHTML = `
    <div class="market-plan-summary">
      <div><span>Contexto</span><strong>${escapeHtml(futureBalanceText)}</strong></div>
      <div><span>Plantilla</span><strong>${escapeHtml(needText)}</strong></div>
      <div><span>Disciplina</span><strong>${escapeHtml(negativeAdvice)}</strong></div>
      <div><span>Ofertas</span><strong>${incomingOffers.length ? `${incomingOffers.length} oferta${incomingOffers.length === 1 ? "" : "s"} para simular` : "Sin ofertas recibidas cargadas"}</strong></div>
      <div class="market-plan-rivals"><span>Rivales</span><strong>${escapeHtml(rivalPressure)}</strong></div>
    </div>
    <div class="market-plan-actions">
      ${buy.length ? `<div><strong>Comprar si el precio no se calienta</strong>${buy.map((player) => renderStrategyPlayer(player, `tope ${formatFinanceMoney(smartBidPlan(player).rationalMax)}`)).join("")}</div>` : ""}
      ${limited.length ? `<div><strong>Pujar con límite</strong>${limited.map((player) => renderStrategyPlayer(player, `máx. ${formatFinanceMoney(smartBidPlan(player).rationalMax)}`)).join("")}</div>` : ""}
      ${avoid.length ? `<div><strong>Evitar hoy</strong>${avoid.map((player) => renderStrategyPlayer(player, player.marketDecision?.summary || "riesgo alto")).join("")}</div>` : ""}
    </div>
  `;
  bindStrategyPlayerLinks(target);
};

const assistantMarketPlayers = () => {
  const competitionPlayers = state.players.map(playerForCompetition);
  return competitionPlayers
    .map((player) => analyzePlayer(player, competitionPlayers))
    .filter((player) => !playerIsAlreadyInTeam(player))
    .sort((a, b) => b.recommendation - a.recommendation);
};

const assistantTeamPlayers = () => {
  const roster = state.teamPlayers.map(playerForCompetition);
  return roster
    .map((player) => {
      const analyzed = analyzePlayer(player, roster);
      return { ...analyzed, lineupScore: lineupPlayerScore(analyzed) };
    })
    .sort((a, b) => (POSITION_ORDER[a.position] ?? 99) - (POSITION_ORDER[b.position] ?? 99) || b.lineupScore - a.lineupScore);
};

const activeSaleForPlayer = (player) => {
  const playerId = Number(player?.biwengerPlayerId || player?.playerId || 0);
  if (playerId <= 0) return null;
  return (state.biwengerOperations?.sales || []).find((sale) => Number(sale.playerId || 0) === playerId) || null;
};

const assistantBidBudget = () => {
  const maximumBid = Number(state.finance.maximumBid);
  return Number.isFinite(maximumBid) && maximumBid > 0 ? maximumBid : Infinity;
};

const isIncomingOffer = (offer) => {
  if (!offer || terminalOfferStatuses.has(String(offer.status || "").toLowerCase())) return false;
  if (offer.isIncoming) return moneyAmount(offer.amount) > 0;
  if (offer.isMine) return false;
  const userId = Number(state.biwenger.userId || 0);
  const fromId = Number(offer.fromId || 0);
  const toId = Number(offer.toId || 0);
  if (userId > 0 && toId === userId && fromId !== userId) return moneyAmount(offer.amount) > 0;
  const source = normalize(`${offer.source || ""} ${offer.offerSource || ""} ${offer.direction || ""} ${offer.type || ""}`);
  if (/incoming|received|recib|owner/.test(source) && !/outgoing|sent|own-check/.test(source)) return moneyAmount(offer.amount) > 0;
  const playerId = Number(offer.playerId || 0);
  if (playerId > 0 && teamPlayerByBiwengerId(playerId)) return moneyAmount(offer.amount) > 0;
  return false;
};

const activeIncomingOffers = (offers = state.biwengerOperations?.offers || []) =>
  offers.filter(isIncomingOffer);

const currentLiveRoundOwnTeam = () => {
  const teams = state.liveRound?.teams || [];
  if (!Array.isArray(teams) || !teams.length) return null;
  const userId = Number(state.biwenger.userId || 0);
  if (userId > 0) {
    const byId = teams.find((team) => Number(team.userId || 0) === userId);
    if (byId) return byId;
  }
  const mine = teams.find((team) => team.isMe);
  if (mine) return mine;
  const userName = normalize(state.biwenger.userName || "");
  const leagueName = normalize(activeLeagueName() || "");
  return teams.find((team) => {
    const name = normalize(team.name || "");
    return name && (name === userName || name === leagueName || name.includes(userName) || userName.includes(name));
  }) || null;
};

const estimatedRoundReward = () => {
  const rewards = normalizedRewardPreferences();
  const team = currentLiveRoundOwnTeam();
  const reliablePoints = Number(team?.points);
  const derivedPoints = Array.isArray(team?.players)
    ? team.players.reduce((sum, player) => sum + (Number.isFinite(Number(player.roundPoints)) ? Number(player.roundPoints) : 0), 0)
    : 0;
  const hasReliablePoints = Boolean(team?.pointsReliable && Number.isFinite(reliablePoints));
  const hasDerivedPoints = derivedPoints !== 0;
  const points = hasReliablePoints ? reliablePoints : (hasDerivedPoints ? derivedPoints : (Number.isFinite(reliablePoints) ? reliablePoints : 0));
  const rank = Number(team?.provisionalRank || team?.rank || 0);
  const hasRoundData = Boolean(team && (hasReliablePoints || hasDerivedPoints || Number(points) !== 0));
  const pointsReward = Math.max(0, Math.round((Number.isFinite(points) ? points : 0) * rewards.pointValue));
  const positionReward = !hasRoundData ? 0 : rank === 1
    ? rewards.rank1
    : rank === 2
      ? rewards.rank2
      : rank === 3
        ? rewards.rank3
        : 0;
  const mvpPlayers = Array.isArray(team?.players)
    ? team.players.filter((player) => player.isMvp || player.mvp || player.roundMvp)
    : [];
  const officialReward = state.liveRound?.officialReward || state.liveRound?.roundReward || null;
  const officialAmount = moneyAmount(officialReward?.amount);
  const hasOfficialReward = Boolean(officialReward?.available && Number.isFinite(officialAmount) && officialAmount > 0);
  if (hasOfficialReward) {
    const details = [
      `Biwenger: ${formatFinanceMoney(officialAmount)}`,
      officialReward.confidence ? `confianza ${officialReward.confidence}` : null,
      officialReward.path ? `campo ${officialReward.path}` : null
    ].filter(Boolean);
    return {
      amount: officialAmount,
      pointsReward: 0,
      positionReward: 0,
      mvpReward: 0,
      mvpCount: mvpPlayers.length,
      points: Number.isFinite(points) ? Math.round(points) : 0,
      rank: rank || null,
      configured: true,
      reliable: true,
      official: true,
      hasRoundData: true,
      source: "Recompensa oficial Biwenger",
      teamName: team?.name || "",
      updatedAt: state.liveRound?.updatedAt || "",
      details
    };
  }
  const mvpReward = mvpPlayers.length * rewards.mvp;
  const configured = Object.values(rewards).some((value) => value > 0);
  const source = !state.biwenger.connected
    ? "Conecta Biwenger"
    : !team
      ? "Jornada no cargada"
      : hasReliablePoints
        ? "Puntos confirmados"
        : hasDerivedPoints
          ? "Suma de jugadores"
          : "Sin puntos expuestos";
  return {
    amount: pointsReward + positionReward + mvpReward,
    pointsReward,
    positionReward,
    mvpReward,
    mvpCount: mvpPlayers.length,
    points: Number.isFinite(points) ? Math.round(points) : 0,
    rank: rank || null,
    configured,
    reliable: hasReliablePoints,
    hasRoundData,
    source,
    teamName: team?.name || "",
    updatedAt: state.liveRound?.updatedAt || "",
    details: [
      rewards.pointValue > 0 ? `${Math.round(points)} pts x ${formatFinanceMoney(rewards.pointValue)} = ${formatFinanceMoney(pointsReward)}` : null,
      positionReward > 0 ? `puesto #${rank}: ${formatFinanceMoney(positionReward)}` : null,
      mvpReward > 0 ? `${mvpPlayers.length} MVP x ${formatFinanceMoney(rewards.mvp)} = ${formatFinanceMoney(mvpReward)}` : null,
      configured && !hasRoundData ? "pendiente de puntos de jornada" : null
    ].filter(Boolean)
  };
};

const renderRoundRewardDetail = (reward, options = {}) => {
  const compact = options.compact === true;
  if (!reward.configured) return "Configura premios en Ajustes";
  const base = [
    reward.source,
    reward.points ? `${reward.points} pts` : null,
    reward.rank ? `#${reward.rank}` : null
  ].filter(Boolean).join(" · ");
  const details = reward.details?.length ? reward.details.join(" · ") : base;
  return compact ? base : details;
};

const incomingOfferSummary = (incoming = activeIncomingOffers()) => {
  const balance = Number(state.biwengerOperations?.finance?.balance ?? state.finance.balance);
  const total = incoming.reduce((sum, offer) => sum + moneyAmount(offer.amount), 0);
  return {
    count: incoming.length,
    total,
    balanceAfterAll: Number.isFinite(balance) ? balance + total : null,
    balance
  };
};

const playerCurrentMarketPrice = (player = {}) => [
  player.biwengerValue,
  player.price,
  player.referenceValue,
  player.sourceSummary?.fantasy?.marketValue
].map(Number).find((value) => Number.isFinite(value) && value > 0) || 0;

const assistantBidCandidates = (players = assistantMarketPlayers()) => players
  .map((player) => {
    const plan = smartBidPlan(player);
    const hasOwnBid = playerHasOwnBid(player);
    const currentBid = Number(plan.ownBidAmount || 0);
    const targetAmount = plan.demand >= 2 && player.recommendation >= 76 ? plan.aggressiveBid : plan.recommendedBid;
    const amount = hasOwnBid ? Math.max(currentBid, Math.min(plan.rationalMax || targetAmount, targetAmount || currentBid)) : targetAmount;
    const delta = hasOwnBid ? Math.max(0, amount - currentBid) : amount;
    const recent = player.recentForm || recentFormProfile(player);
    const priority = clamp(
      player.recommendation
      + (player.squadFitScore - 58) * 0.12
      + (recent.score - 50) * 0.1
      + Math.min(8, Number(plan.demand || 0) * 2)
      + (player.marketDecision?.type === "buy" ? 6 : 0)
      - (plan.blocked ? 40 : 0)
      - (player.marketIntelligence?.contextualRisk || 0) * 0.12
    );
    const action = hasOwnBid
      ? (delta > 0 ? "Subir puja" : "Mantener puja")
      : "Pujar";
    const reason = [
      `${player.recommendation}/100 recomendacion`,
      `${player.starter}% titular`,
      recent.label,
      player.marketIntelligence?.role,
      plan.demand ? `${plan.demand} puja(s) visibles` : null,
      player.squadFitScore >= 70 ? "cubre necesidad de plantilla" : null
    ].filter(Boolean).join(" · ");
    return { player, plan, amount, delta, priority: Math.round(priority), action, reason };
  })
  .filter((row) =>
    row.amount > 0
    && row.priority >= 58
    && row.player.marketDecision?.type !== "avoid"
    && (!row.plan.blocked || row.plan.hasOwnBid)
  )
  .sort((a, b) => b.priority - a.priority || b.delta - a.delta);

const assistantBidRows = (players = assistantMarketPlayers()) => {
  const candidates = assistantBidCandidates(players);
  let remaining = assistantBidBudget();
  const selected = [];
  const skippedByBudget = [];
  candidates.forEach((row) => {
    if (selected.length >= 6) return;
    const delta = Math.max(0, Number(row.delta || 0));
    if (delta > 0 && Number.isFinite(remaining) && delta > remaining) {
      skippedByBudget.push(row);
      return;
    }
    selected.push({
      ...row,
      remainingAfter: Number.isFinite(remaining) ? Math.max(0, remaining - delta) : null
    });
    if (delta > 0 && Number.isFinite(remaining)) remaining -= delta;
  });
  selected.meta = {
    budget: assistantBidBudget(),
    used: selected.reduce((sum, row) => sum + Math.max(0, Number(row.delta || 0)), 0),
    remaining: Number.isFinite(remaining) ? Math.max(0, remaining) : null,
    skippedByBudget: skippedByBudget.length
  };
  return selected;
};

const saleUrgencyForPlayer = (player, context = {}) => {
  const counts = teamPositionCounts();
  const target = SQUAD_TARGETS[player.position] || 3;
  const positionCount = counts[player.position] || 0;
  const surplus = Math.max(0, positionCount - target);
  const value = teamPlayerBiwengerValue(player);
  const recent = player.recentForm || recentFormProfile(player);
  const quality = Number(player.lineupScore ?? player.recommendation ?? 50);
  const noNextMatch = Boolean(player.marketIntelligence?.noNextMatch);
  const valueDiff = Number(player.biwengerDiff ?? player.sourceSummary?.fantasy?.biwengerDiff ?? 0);
  const balance = Number.isFinite(Number(context.balanceAfterRoundAndOffers))
    ? Number(context.balanceAfterRoundAndOffers)
    : Number(state.finance.balance);
  const baseBalance = Number.isFinite(Number(context.baseBalance)) ? Number(context.baseBalance) : Number(state.finance.balance);
  const rewardAmount = Math.max(0, Number(context.roundRewardAmount || 0));
  const debtBefore = Number.isFinite(baseBalance) ? Math.max(0, -baseBalance) : 0;
  const debtAfter = Number.isFinite(balance) ? Math.max(0, -balance) : 0;
  const rewardRelief = debtBefore > 0 ? clamp((debtBefore - debtAfter) / debtBefore, 0, 1) : 0;
  const negativePressure = Number.isFinite(balance) && balance < 0 ? Math.round(14 * (1 - rewardRelief * 0.75)) : 0;
  const roundCoversDebt = Number.isFinite(baseBalance) && baseBalance < 0 && Number.isFinite(balance) && balance >= 0 && rewardAmount > 0;
  const roundAlmostCoversDebt = rewardRelief >= 0.55 && rewardAmount > 0;
  const immediateRisk = noNextMatch || player.health?.status === "suspended" || player.health?.status === "injured";
  const protectHotStreak = recent.hot && !immediateRisk;
  let score = 18 + negativePressure;
  score += surplus * 14;
  score += Math.max(0, 72 - quality) * 0.55;
  if (recent.cold) score += 14;
  if (recent.noRecentMinutes) score += 22;
  if (noNextMatch) score += 18;
  if (player.health?.status === "suspended") score += 18;
  else if (player.health?.status === "injured") score += 16;
  else if (player.health?.status === "doubtful") score += 8;
  if (valueDiff < 0) score += Math.min(14, Math.abs(valueDiff) / Math.max(value, 1) * 120);
  if (positionCount <= target && quality >= 72) score -= 18;
  if (recent.hot && quality >= 76) score -= 14;
  if (roundCoversDebt && quality >= 66) score -= 16;
  if (roundCoversDebt && protectHotStreak) score -= 12;
  if (roundAlmostCoversDebt && protectHotStreak) score -= 10;
  if (debtAfter > 0 && value > debtAfter * 2.2 && quality >= 70 && !immediateRisk) score -= 14;
  if (protectHotStreak) score = Math.min(score - 28, 46);
  const multiplier = score >= 74
    ? (negativePressure ? 1 : 1.04)
    : score >= 58
      ? 1.08
      : 1.12;
  const suggestedPrice = roundSaleAmount(Math.max(value, value * multiplier));
  return {
    score: Math.round(clamp(score)),
    value,
    suggestedPrice,
    surplus,
    quality,
    recent,
    action: score >= 70 ? "Vender hoy" : score >= 54 ? "Poner caro" : "Mantener",
    reason: [
      surplus > 0 ? `sobran ${surplus} en ${player.position}` : null,
      `${Math.round(quality)}/100 once`,
      protectHotStreak ? `${recent.label}: proteger` : recent.label,
      noNextMatch ? "sin proximo partido" : null,
      valueDiff < 0 ? `valor ${formatSignedMoney(valueDiff)}` : null,
      roundCoversDebt ? "la jornada cubre el negativo" : null,
      !roundCoversDebt && roundAlmostCoversDebt ? `solo faltan ${formatFinanceMoney(debtAfter)} tras jornada/ofertas` : null,
      negativePressure ? "necesitas liquidez" : null
    ].filter(Boolean).join(" · ")
  };
};

const assistantSaleRows = (players = assistantTeamPlayers(), context = {}) => players
  .map((player) => ({ player, sale: saleUrgencyForPlayer(player, context), existingSale: activeSaleForPlayer(player) }))
  .filter((row) => row.sale.action !== "Mantener" && row.sale.score >= 54 && Number(row.sale.value || 0) > 0)
  .sort((a, b) => b.sale.score - a.sale.score || b.sale.value - a.sale.value)
  .slice(0, 6);

const assistantOfferRows = (incoming, myOffers, futureIncome = 0) => {
  const balance = Number(state.biwengerOperations?.finance?.balance ?? state.finance.balance);
  const committed = myOffers.reduce((sum, offer) => sum + moneyAmount(offer.amount), 0);
  const adjustedBalance = Number.isFinite(balance) ? balance + Number(futureIncome || 0) : balance;
  const targetAmount = Number.isFinite(adjustedBalance) ? Math.max(0, -adjustedBalance, -(adjustedBalance - committed)) : 0;
  const recommended = chooseRecommendedOfferSet(incoming, targetAmount);
  const recommendedIds = new Set(recommended.map(offerIdKey));
  return incoming.map((offer) => {
    const metrics = offerSportCost(offer);
    const value = operationCurrentValue(offer);
    const amount = moneyAmount(offer.amount);
    const overValueRatio = value > 0 ? (amount - value) / value : 0;
    let action = "Valorar";
    if (recommendedIds.has(offerIdKey(offer)) || (metrics.cost <= 42 && overValueRatio >= 0.03)) action = "Aceptar";
    else if (metrics.quality >= 72 && overValueRatio < 0.12) action = "Rechazar";
    else if (metrics.overValue < -Math.max(250000, value * 0.08)) action = "Rechazar";
    const priority = action === "Aceptar" ? 90 - metrics.cost + Math.max(0, overValueRatio * 60) : 55 - metrics.cost * 0.25;
    return {
      offer,
      metrics,
      value,
      amount,
      action,
      priority: Math.round(clamp(priority)),
      reason: [
        `oferta ${formatFinanceMoney(amount)}`,
        `valor ${formatFinanceMoney(value)}`,
        metrics.overValue >= 0 ? `sobre valor ${formatSignedMoney(metrics.overValue)}` : `bajo valor ${formatSignedMoney(metrics.overValue)}`,
        metrics.label,
        recommendedIds.has(offerIdKey(offer)) ? "encaja en simulacion" : null
      ].filter(Boolean).join(" · ")
    };
  }).sort((a, b) => b.priority - a.priority);
};

const assistantPlanSnapshot = () => {
  const operations = state.biwengerOperations || {};
  const offers = operations.offers || [];
  const myOffers = activeOwnBidOffers(offers);
  const incoming = activeIncomingOffers(offers);
  const balance = Number(operations.finance?.balance ?? state.finance.balance);
  const roundReward = estimatedRoundReward();
  const bids = assistantBidRows();
  const offerRows = assistantOfferRows(incoming, myOffers, roundReward.amount);
  const recommendedOfferAmount = offerRows
    .filter((row) => row.action === "Aceptar")
    .reduce((sum, row) => sum + moneyAmount(row.amount), 0);
  const allOfferAmount = incoming.reduce((sum, offer) => sum + moneyAmount(offer.amount), 0);
  const saleContext = {
    baseBalance: balance,
    roundRewardAmount: roundReward.amount,
    balanceAfterRoundAndOffers: Number.isFinite(balance)
      ? balance + roundReward.amount + recommendedOfferAmount
      : null
  };
  const sales = assistantSaleRows(assistantTeamPlayers(), saleContext);
  const salePotential = sales
    .filter((row) => row.sale.action !== "Mantener")
    .reduce((sum, row) => sum + Number(row.sale.suggestedPrice || 0), 0);
  const bidDelta = bids.reduce((sum, row) => sum + Number(row.delta || 0), 0);
  const bidWinCost = bids.reduce((sum, row) => sum + moneyAmount(row.amount), 0);
  const committedNow = myOffers.reduce((sum, offer) => sum + moneyAmount(offer.amount), 0);
  return {
    operations,
    offers,
    myOffers,
    incoming,
    bids,
    sales,
    offerRows,
    roundReward,
    balance,
    committedNow,
    bidDelta,
    bidWinCost,
    allOfferAmount,
    recommendedOfferAmount,
    salePotential,
    balanceAfterAllOffers: Number.isFinite(balance) ? balance + allOfferAmount : null,
    balanceAfterRecommendedOffers: Number.isFinite(balance) ? balance + recommendedOfferAmount : null,
    balanceAfterRound: Number.isFinite(balance) ? balance + roundReward.amount : null,
    balanceAfterRecommendedOffersAndRound: Number.isFinite(balance) ? balance + recommendedOfferAmount + roundReward.amount : null,
    planBalance: Number.isFinite(balance) ? balance - bidWinCost + recommendedOfferAmount + salePotential + roundReward.amount : null,
    projectedWithSales: Number.isFinite(balance) ? balance + recommendedOfferAmount + salePotential + roundReward.amount : null
  };
};

const renderAssistantPlayerRow = (player, meta = "") => {
  const marketPrice = playerCurrentMarketPrice(player);
  return `
    <div class="assistant-player">
      ${renderPlayerMedia(player, "sm")}
      <div>
        <div class="player-name-line"><strong>${escapeHtml(player.name)}</strong>${renderRecentFormDots(player)}</div>
        <div class="assistant-player-meta">
          ${renderPositionBadge(player.position)}
          ${renderScoringBadge(player)}
          ${player.team ? `<span class="assistant-meta-text">${escapeHtml(player.team)}</span>` : ""}
          <span class="assistant-meta-text">Valor ${marketPrice ? formatFinanceMoney(marketPrice) : "S/D"}</span>
          ${meta ? `<span class="assistant-meta-text">${escapeHtml(meta)}</span>` : ""}
        </div>
      </div>
    </div>
  `;
};

const renderBidSaleAssistant = () => {
  const target = qs("#bid-sale-assistant");
  if (!target) return;
  const plan = assistantPlanSnapshot();
  const { bids, sales, offerRows, incoming, myOffers, balance, committedNow, bidDelta, bidWinCost, allOfferAmount, recommendedOfferAmount, salePotential, roundReward } = plan;
  const bidBudgetMeta = bids.meta || {};
  const projected = plan.balanceAfterRecommendedOffers;
  const projectedAllOffers = plan.balanceAfterAllOffers;
  const projectedRound = plan.balanceAfterRound;
  const projectedAllOffersRound = Number.isFinite(projectedAllOffers) ? projectedAllOffers + roundReward.amount : null;
  const projectedWithSales = plan.projectedWithSales;
  const planBalance = plan.planBalance;
  const actionCount = bids.filter((row) => row.action !== "Mantener puja" && Number(row.delta || 0) > 0).length
    + sales.filter((row) => row.sale.action !== "Mantener" && !row.existingSale).length
    + offerRows.filter((row) => row.action === "Aceptar" || row.action === "Rechazar").length;
  const mainAdvice = !state.biwenger.connected
    ? "Conecta Biwenger para que el asistente use saldo, puja maxima y ofertas reales."
    : Number.isFinite(balance) && balance < 0
      ? "Plan defensivo: prioriza ofertas/ventas antes de nuevas pujas."
      : bids.length
        ? "Plan activo: hay margen para atacar el mercado sin perder disciplina."
        : "Plan prudente: no hay fichajes claros con los datos actuales.";
  const bidBudgetText = Number.isFinite(bidBudgetMeta.budget)
    ? `${formatFinanceMoney(bidBudgetMeta.used || 0)} de ${formatFinanceMoney(bidBudgetMeta.budget)}`
    : "Sin límite Biwenger";
  const bidHeaderText = bids.length
    ? `${bidBudgetText}${bidBudgetMeta.skippedByBudget ? ` · ${bidBudgetMeta.skippedByBudget} candidato${bidBudgetMeta.skippedByBudget === 1 ? "" : "s"} fuera por límite` : ""}`
    : "Sin compras claras ahora mismo.";

  target.innerHTML = `
    <div class="assistant-hero">
      <div>
        <p class="eyebrow">Plan de hoy</p>
        <h4>${escapeHtml(mainAdvice)}</h4>
        <div class="assistant-hero-actions">
          <button class="primary-button execute-assistant-plan" type="button" ${!state.biwenger.connected || !actionCount ? "disabled" : ""}>Ejecutar acciones sugeridas</button>
          <small>${actionCount ? `${actionCount} accion${actionCount === 1 ? "" : "es"} listas para revisar` : "Sin acciones ejecutables ahora"}</small>
        </div>
      </div>
      <div class="assistant-metrics">
        <div><span>Saldo</span><strong class="${balance < 0 ? "negative" : "positive"}">${formatFinanceMoney(balance)}</strong></div>
        <div><span>Pujas nuevas / límite</span><strong>${escapeHtml(bidBudgetText)}</strong></div>
        <div><span>Ofertas recibidas</span><strong>${incoming.length} · ${formatFinanceMoney(allOfferAmount)}</strong></div>
        <div><span>Si aceptas todas</span><strong class="${projectedAllOffers < 0 ? "negative" : "positive"}">${formatFinanceMoney(projectedAllOffers)}</strong></div>
        <div><span>Ofertas recomendadas</span><strong class="${projected < 0 ? "negative" : "positive"}">${formatFinanceMoney(projected)}</strong><small>${formatFinanceMoney(recommendedOfferAmount)}</small></div>
        <div><span>Recompensa jornada</span><strong class="${roundReward.amount > 0 ? "positive" : ""}">${formatFinanceMoney(roundReward.amount)}</strong><small>${escapeHtml(renderRoundRewardDetail(roundReward, { compact: true }))}</small></div>
        <div><span>Saldo fin jornada</span><strong class="${projectedRound < 0 ? "negative" : "positive"}">${formatFinanceMoney(projectedRound)}</strong><small>${escapeHtml(roundReward.source)}</small></div>
        <div><span>Ofertas + jornada</span><strong class="${projectedAllOffersRound < 0 ? "negative" : "positive"}">${formatFinanceMoney(projectedAllOffersRound)}</strong></div>
        <div><span>Si ganas pujas</span><strong class="${planBalance < 0 ? "negative" : "positive"}">${formatFinanceMoney(planBalance)}</strong></div>
        <div><span>Con ventas sugeridas</span><strong class="${projectedWithSales < 0 ? "negative" : "positive"}">${formatFinanceMoney(projectedWithSales)}</strong></div>
      </div>
      ${Number.isFinite(planBalance) ? `
        <p class="assistant-plan-summary">
          Plan completo: ${formatFinanceMoney(balance)}
          - ${formatFinanceMoney(bidWinCost)} + ofertas recomendadas ${formatFinanceMoney(recommendedOfferAmount)}
          + ventas ${formatFinanceMoney(salePotential)} + jornada ${formatFinanceMoney(roundReward.amount)}
          = <strong class="${planBalance < 0 ? "negative" : "positive"}">${formatFinanceMoney(planBalance)}</strong>
        </p>
      ` : ""}
      ${roundReward.configured ? `
        <p class="assistant-plan-summary reward-breakdown">
          Premios previstos: <strong class="${roundReward.amount > 0 ? "positive" : ""}">${formatFinanceMoney(roundReward.amount)}</strong>
          · ${escapeHtml(renderRoundRewardDetail(roundReward))}
        </p>
      ` : ""}
    </div>
    <div class="assistant-grid">
      <section class="assistant-card">
        <header><strong>Pujas a realizar</strong><small>${escapeHtml(bidHeaderText)}</small></header>
        ${bids.length ? bids.map((row) => `
          <form class="assistant-action-row assistant-bid-form" data-bid-player-id="${row.player.biwengerPlayerId || ""}" data-bid-owner-id="${row.player.marketOwnerId || ""}" data-minimum-bid="${Math.max(1, row.player.price || 1)}">
            ${renderAssistantPlayerRow(row.player, `${row.priority}/100 prioridad`)}
            <div class="assistant-action-copy">
              <strong>${escapeHtml(row.action)} · ${formatFinanceMoney(row.amount)}</strong>
              <small>${escapeHtml(row.reason)} · tope ${formatFinanceMoney(row.plan.rationalMax)}${row.remainingAfter !== null ? ` · margen restante ${formatFinanceMoney(row.remainingAfter)}` : ""}</small>
            </div>
            <input class="bid-amount-input currency-input" type="text" inputmode="numeric" value="${formatCurrencyInput(row.amount)}" aria-label="Importe recomendado" />
            <button class="primary-button place-bid-button" type="submit" ${!state.biwenger.connected || !row.player.biwengerPlayerId || (!row.plan.hasOwnBid && row.plan.blocked) ? "disabled" : ""}>Enviar</button>
          </form>
        `).join("") : `<p class="muted-empty compact">El asistente no ve una puja que compense riesgo, precio y encaje.</p>`}
      </section>
      <section class="assistant-card">
        <header><strong>Jugadores a vender</strong><small>${sales.length ? "Precio de salida sugerido." : "Plantilla sin ventas urgentes."}</small></header>
        ${sales.length ? sales.map((row) => {
          const listed = Boolean(row.existingSale);
          const activeSalePrice = moneyAmount(row.existingSale?.price || row.sale.suggestedPrice);
          return `
          <form class="assistant-action-row assistant-sale-form ${row.sale.action === "Mantener" ? "muted" : ""} ${listed ? "listed" : ""}" data-player-id="${row.player.biwengerPlayerId || ""}">
            ${renderAssistantPlayerRow(row.player, `${row.sale.score}/100 venta`)}
            <div class="assistant-action-copy">
              <strong>${listed ? "Ya en venta" : escapeHtml(row.sale.action)} · ${formatFinanceMoney(activeSalePrice)}</strong>
              <small>${listed ? `Puesto en venta en Biwenger${row.existingSale?.priceSource ? ` · ${escapeHtml(row.existingSale.priceSource)}` : ""}` : escapeHtml(row.sale.reason || "sin alerta fuerte")}</small>
            </div>
            <input class="operation-amount currency-input" type="text" inputmode="numeric" value="${formatCurrencyInput(activeSalePrice)}" aria-label="Precio de venta sugerido" ${listed ? "disabled" : ""} />
            <button class="${listed ? "primary-button" : "ghost-button"}" type="submit" ${!state.biwenger.connected || !row.player.biwengerPlayerId || row.sale.action === "Mantener" || listed ? "disabled" : ""}>${listed ? "Ya en venta" : "Vender"}</button>
          </form>
        `; }).join("") : `<p class="muted-empty compact">No venderia por vender; no hay candidatos claros con los datos actuales.</p>`}
      </section>
      <section class="assistant-card assistant-card-wide">
        <header><strong>Ofertas recibidas</strong><small>${offerRows.length ? "Decision sugerida segun saldo y coste deportivo." : "Sin ofertas recibidas cargadas."}</small></header>
        ${offerRows.length ? offerRows.map((row) => `
          <div class="assistant-action-row assistant-offer-row ${row.action.toLowerCase()}">
            ${renderOperationIdentity(row.offer)}
            <div class="assistant-action-copy">
              <strong>${escapeHtml(row.action)} · ${formatFinanceMoney(row.amount)}</strong>
              <small>${escapeHtml(row.reason)}</small>
            </div>
            <button class="ghost-button assistant-offer-response" type="button" data-offer-id="${row.offer.offerId}" data-status="accepted" ${!state.biwenger.connected || row.action === "Rechazar" ? "disabled" : ""}>Aceptar</button>
            <button class="danger-button assistant-offer-response" type="button" data-offer-id="${row.offer.offerId}" data-status="rejected" ${!state.biwenger.connected || row.action === "Aceptar" ? "disabled" : ""}>Rechazar</button>
          </div>
        `).join("") : `<p class="muted-empty compact">Cuando Biwenger devuelva ofertas, aqui aparecera la recomendacion exacta.</p>`}
      </section>
    </div>
  `;
  bindCurrencyInputs(target);
  bindAssistantActions(target);
};

const postBiwengerAssistantAction = async (path, payload = {}) => {
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Biwenger no ha aceptado la accion");
  return result;
};

const executeAssistantPlan = async () => {
  if (!state.biwenger.connected) {
    setLeagueOperationStatus("Conecta Biwenger antes de ejecutar acciones del asistente.", "error");
    return;
  }
  const plan = assistantPlanSnapshot();
  const bidActions = plan.bids.filter((row) =>
    row.action !== "Mantener puja"
    && Number(row.delta || 0) > 0
    && moneyAmount(row.amount) > 0
    && Number(row.player?.biwengerPlayerId || 0) > 0
    && (!row.plan.blocked || row.plan.hasOwnBid)
  );
  const saleActions = plan.sales.filter((row) =>
    row.sale.action !== "Mantener"
    && !row.existingSale
    && Number(row.sale.suggestedPrice || 0) > 0
    && Number(row.player?.biwengerPlayerId || 0) > 0
  );
  const offerActions = plan.offerRows.filter((row) =>
    (row.action === "Aceptar" || row.action === "Rechazar")
    && Number(row.offer?.offerId || 0) > 0
  );
  const totalActions = bidActions.length + saleActions.length + offerActions.length;
  if (!totalActions) {
    setLeagueOperationStatus("No hay acciones sugeridas ejecutables en este momento.", "");
    return;
  }
  const bidTotal = bidActions.reduce((sum, row) => sum + moneyAmount(row.amount), 0);
  const saleTotal = saleActions.reduce((sum, row) => sum + Number(row.sale.suggestedPrice || 0), 0);
  const acceptTotal = offerActions
    .filter((row) => row.action === "Aceptar")
    .reduce((sum, row) => sum + moneyAmount(row.amount), 0);
  const rejectCount = offerActions.filter((row) => row.action === "Rechazar").length;
  const warning = [
    "Vas a ejecutar acciones reales en Biwenger.",
    "",
    `${bidActions.length} puja(s) por ${formatFinanceMoney(bidTotal)}.`,
    `${saleActions.length} venta(s) por ${formatFinanceMoney(saleTotal)}.`,
    `${offerActions.filter((row) => row.action === "Aceptar").length} oferta(s) aceptadas por ${formatFinanceMoney(acceptTotal)}.`,
    `${rejectCount} oferta(s) rechazadas.`,
    "",
    `Saldo estimado tras el plan completo: ${formatFinanceMoney(plan.planBalance)}.`,
    "Revisa que estas de acuerdo antes de continuar."
  ].join("\n");
  if (!window.confirm(warning)) {
    setLeagueOperationStatus("Ejecucion del asistente cancelada.", "");
    return;
  }

  const buttons = qsa(".execute-assistant-plan");
  buttons.forEach((button) => {
    button.disabled = true;
    button.textContent = "Ejecutando...";
  });
  const failures = [];
  let completed = 0;
  const runStep = async (label, callback) => {
    setLeagueOperationStatus(`Ejecutando ${completed + 1}/${totalActions}: ${label}...`, "busy");
    try {
      await callback();
      completed += 1;
    } catch (error) {
      failures.push(`${label}: ${error.message || "error"}`);
      completed += 1;
    }
  };

  for (const row of bidActions) {
    await runStep(`puja por ${row.player.name}`, () => postBiwengerAssistantAction("/api/biwenger/bid", {
      playerId: Number(row.player.biwengerPlayerId),
      amount: moneyAmount(row.amount),
      toUserId: Number(row.player.marketOwnerId || 0)
    }));
  }
  for (const row of saleActions) {
    await runStep(`venta de ${row.player.name}`, () => postBiwengerAssistantAction("/api/biwenger/sale", {
      playerId: Number(row.player.biwengerPlayerId),
      price: Number(row.sale.suggestedPrice || 0)
    }));
  }
  for (const row of offerActions) {
    await runStep(`${row.action.toLowerCase()} oferta por ${row.offer.playerName || "jugador"}`, () => postBiwengerAssistantAction("/api/biwenger/offer-status", {
      offerId: Number(row.offer.offerId),
      status: row.action === "Aceptar" ? "accepted" : "rejected"
    }));
  }

  await loadBiwengerOperations(false);
  await refreshBiwengerStatus();
  renderFinance();
  renderTable();
  renderTeam();
  renderBidSaleAssistant();
  await saveActiveLeague();

  buttons.forEach((button) => {
    button.disabled = false;
    button.textContent = "Ejecutar acciones sugeridas";
  });
  if (failures.length) {
    setLeagueOperationStatus(`Plan ejecutado con ${failures.length} incidencia(s): ${failures.slice(0, 3).join(" | ")}`, "error");
  } else {
    setLeagueOperationStatus(`Plan ejecutado: ${totalActions} accion${totalActions === 1 ? "" : "es"} completada${totalActions === 1 ? "" : "s"}.`, "ready");
  }
};

const bindAssistantActions = (target) => {
  target.querySelectorAll(".execute-assistant-plan").forEach((button) => button.addEventListener("click", executeAssistantPlan));
  target.querySelectorAll(".assistant-bid-form").forEach((form) => form.addEventListener("submit", (event) => {
    event.preventDefault();
    placeBiwengerBid(form, { buttonText: "Enviar" });
  }));
  target.querySelectorAll(".assistant-sale-form").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const price = parseCurrencyInput(form.querySelector(".operation-amount").value);
      if (price <= 0) throw new Error("Introduce un precio de venta valido.");
      await biwengerOperation("/api/biwenger/sale", { playerId: Number(form.dataset.playerId), price }, `Jugador puesto a la venta por ${formatFinanceMoney(price)}.`);
      form.classList.add("listed");
      const button = form.querySelector("button[type='submit']");
      if (button) {
        button.textContent = "Ya en venta";
        button.disabled = true;
        button.classList.remove("ghost-button");
        button.classList.add("primary-button");
      }
      const input = form.querySelector(".operation-amount");
      if (input) input.disabled = true;
      await loadBiwengerOperations(false);
    } catch (error) {
      setLeagueOperationStatus(error.message, "error");
    }
  }));
  target.querySelectorAll(".assistant-offer-response").forEach((button) => button.addEventListener("click", async () => {
    try {
      const accepted = button.dataset.status === "accepted";
      await biwengerOperation("/api/biwenger/offer-status", { offerId: Number(button.dataset.offerId), status: button.dataset.status }, accepted ? "Oferta aceptada desde el asistente." : "Oferta rechazada desde el asistente.");
      if (accepted) await refreshBiwengerStatus("Oferta aceptada. Finanzas sincronizadas con Biwenger.");
      await loadBiwengerOperations(false);
    } catch (error) {
      setLeagueOperationStatus(error.message || "No se pudo responder a la oferta.", "error");
    }
  }));
};

const readDecisionHistory = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DECISION_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeDecisionHistory = (items) => {
  try {
    window.localStorage.setItem(DECISION_HISTORY_KEY, JSON.stringify(items.slice(0, 120)));
  } catch (error) {
    // Ignore storage quota issues; the app can keep working without history.
  }
};

const resolveDecisionHistoryPlayer = (row = {}) => {
  const biwengerId = Number(row.id || 0);
  const normalizedName = normalize(row.name || "");
  const current = [...state.players, ...state.teamPlayers].find((player) =>
    (biwengerId > 0 && Number(player.biwengerPlayerId || player.id || 0) === biwengerId)
    || (normalizedName && normalize(player.name || "") === normalizedName)
  );
  return {
    ...(row || {}),
    ...(current || {}),
    id: current?.id || row.id || "",
    biwengerPlayerId: current?.biwengerPlayerId || row.id || null,
    name: current?.name || row.name || "Jugador",
    team: current?.team || row.team || "",
    position: current?.position || row.position || "MC",
    price: current?.price || row.price || 0,
    media: {
      ...(row.media || {}),
      ...(current?.media || {})
    },
    sourceSummary: {
      ...(row.sourceSummary || {}),
      ...(current?.sourceSummary || {})
    },
    sourceLinks: {
      ...(row.sourceLinks || {}),
      ...(current?.sourceLinks || {})
    },
    competitionPoints: current?.competitionPoints ?? row.competitionPoints ?? row.points ?? 0,
    points: current?.points ?? row.points ?? 0,
    recommendation: current?.recommendation ?? row.recommendation ?? 0,
    starter: current?.starter ?? row.starter ?? 0,
    recentForm: current?.recentForm || row.recentForm || recentFormProfile({
      ...row,
      sourceSummary: {
        ...(row.sourceSummary || {}),
        recentMatches: Array.isArray(row.sourceSummary?.recentMatches) ? row.sourceSummary.recentMatches : []
      }
    }),
    marketDecision: current?.marketDecision || row.marketDecision || null
  };
};

const recordDecisionHistory = (players) => {
  if (!players.length) return;
  const signature = [
    state.activeLeagueId || "local",
    state.scoring,
    players.slice(0, 12).map((player) => [
      player.biwengerPlayerId || player.id,
      player.recommendation,
      player.price,
      player.marketDecision?.type,
      playerOwnBidAmount(player) || 0
    ].join(":")).join("|")
  ].join("::");
  if (signature === lastDecisionHistorySignature) return;
  lastDecisionHistorySignature = signature;
  const history = readDecisionHistory();
  history.unshift({
    id: `${Date.now()}-${state.activeLeagueId || "local"}`,
    leagueId: state.activeLeagueId || "local",
    leagueName: activeLeagueName() || state.biwenger.leagueName || "Mi liga",
    scoring: state.scoring,
    createdAt: new Date().toISOString(),
    top: players.slice(0, 8).map((player) => ({
      id: player.biwengerPlayerId || player.id,
      name: player.name,
      team: player.team,
      position: player.position,
      price: player.price,
      biwengerValue: player.biwengerValue,
      competitionPoints: player.competitionPoints,
      points: player.points,
      recommendation: player.recommendation,
      decision: player.marketDecision?.type || "",
      bid: smartBidPlan(player).recommendedBid,
      starter: player.starter,
      confidence: analysisConfidence(player).score,
      media: player.media || {},
      recentForm: player.recentForm || null,
      nextMatch: nextMatchPlainText(player),
      marketDecision: player.marketDecision || null,
      sourceSummary: {
        ...(player.sourceSummary || {}),
        recentMatches: Array.isArray(player.sourceSummary?.recentMatches) ? player.sourceSummary.recentMatches.slice(-5) : []
      },
      sourceLinks: player.sourceLinks || {}
    }))
  });
  writeDecisionHistory(history);
};

const renderDecisionHistoryPanel = () => {
  const target = qs("#decision-history-panel");
  if (!target) return;
  const leagueId = state.activeLeagueId || "local";
  const history = readDecisionHistory().filter((item) => item.leagueId === leagueId).slice(0, 4);
  if (!history.length) {
    target.innerHTML = `<p class="muted-empty compact">Aparecerán las últimas lecturas del mercado.</p>`;
    return;
  }
  target.innerHTML = history.map((item, index) => {
    const previous = history[index + 1];
    const top = item.top?.[0];
    const previousTop = previous?.top?.find((row) => String(row.id) === String(top?.id));
    const delta = previousTop ? Number(top.recommendation || 0) - Number(previousTop.recommendation || 0) : null;
    const date = new Date(item.createdAt);
    const label = Number.isNaN(date.getTime()) ? "" : date.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    const player = top ? resolveDecisionHistoryPlayer(top) : null;
    const currentMarketPlayer = player ? state.players.find((itemPlayer) => itemPlayer.id === player.id) : null;
    const nextMatchMarkup = player ? renderNextMatch(player, true) : "";
    return `
      <div class="history-row history-player-row ${currentMarketPlayer ? "clickable" : ""}" ${currentMarketPlayer ? `data-player-id="${escapeHtml(currentMarketPlayer.id)}"` : ""}>
        <span class="history-date">${escapeHtml(label)}</span>
        ${player ? renderPlayerMedia(player, "sm") : ""}
        <div class="history-player-copy">
          <div class="player-name-line"><strong>${player ? escapeHtml(player.name) : "Sin top"}</strong>${player ? renderRecentFormDots(player) : ""}</div>
          <small class="history-meta">
            ${player ? renderPositionBadge(player.position) : ""}
            ${player ? renderScoringBadge(player) : ""}
            ${player ? `<b>${Number(player.recommendation || top?.recommendation || 0)} rec.</b>` : ""}
            ${top ? `<b>${escapeHtml(top.decision || "decision")}</b>` : ""}
            ${delta === null ? "" : `<b>${delta >= 0 ? "+" : ""}${delta}</b>`}
          </small>
          ${player ? `<small class="history-next-match">${nextMatchMarkup || escapeHtml(top?.nextMatch || "Sin partido localizado")}</small>` : `<small>Sin jugadores</small>`}
        </div>
      </div>
    `;
  }).join("");
  target.querySelectorAll(".history-player-row[data-player-id]").forEach((row) => row.addEventListener("click", () => {
    state.selectedPlayerId = row.dataset.playerId;
    renderTable();
  }));
};

const renderSourceQualityPanel = (players) => {
  const target = qs("#source-quality-panel");
  if (!target) return;
  if (!players.length) {
    target.innerHTML = `<p class="muted-empty compact">Actualiza fuentes para medir cobertura.</p>`;
    return;
  }
  const total = players.length || 1;
  const live = players.filter((player) => player.sourceStatus === "live").length;
  const ff = players.filter((player) => player.sourceLinks?.futbolFantasy || player.sourceSummary?.fantasy?.teamLineupUrl || (player.sources || []).some((source) => /futbolfantasy/i.test(String(source)))).length;
  const recent = players.filter((player) => Array.isArray(player.sourceSummary?.recentMatches) && player.sourceSummary.recentMatches.length).length;
  const fixtures = players.filter((player) => nextMatchForPlayer(player)).length;
  const images = players.filter((player) => player.photo || player.emblem || player.flag).length;
  const health = players.filter((player) => player.health?.status && player.health.status !== "unknown").length;
  const confidenceAverage = players.length
    ? Math.round(players.reduce((sum, player) => sum + analysisConfidence(player).score, 0) / players.length)
    : 0;
  const rows = [
    ["Fuentes live", live, total],
    ["Futbol Fantasy", ff, total],
    ["Racha Biwenger", recent, total],
    ["Próximo partido", fixtures, total],
    ["Fotos/escudos", images, total],
    ["Estado físico", health, total]
  ];
  target.innerHTML = `
    <div class="source-quality-score ${confidenceAverage >= 74 ? "high" : confidenceAverage >= 52 ? "medium" : "low"}">
      <strong>${confidenceAverage}</strong>
      <span>confianza media</span>
    </div>
    <div class="source-quality-grid">
      ${rows.map(([label, value, rowTotal]) => {
        const pct = rowTotal ? Math.round(value / rowTotal * 100) : 0;
        return `<div><span>${escapeHtml(label)}</span><strong>${value}/${rowTotal}</strong><i><b style="width:${pct}%"></b></i></div>`;
      }).join("")}
    </div>
  `;
};

const renderStrategicMarket = (players) => {
  renderMarketPlan(players);
  renderOpportunityRadar(players);
  renderMarketAlerts(players);
  renderSourceQualityPanel(players);
  renderBidSaleAssistant();
  if (players.length && state.filters.position === "all") recordDecisionHistory(players);
  renderDecisionHistoryPanel();
};

const renderDecisionDetail = (player) => {
  const decision = player.marketDecision;
  if (!decision) return "";
  const blocks = [
    ["Impacto deportivo", decision.sporting],
    ["Impacto económico", decision.economy],
    ["Encaje en tu equipo", decision.fit],
    ["Riesgo", decision.risk]
  ];
  return `
    <section class="decision-detail ${decision.className}">
      <header>
        <span>${renderDecisionBadge(player)}</span>
        <div>
          <strong>${escapeHtml(decision.summary)}</strong>
          <small>${decision.reasonableLimit ? `Tope razonable ${formatFinanceMoney(decision.reasonableLimit)}` : "Sin puja recomendada ahora"}</small>
        </div>
      </header>
      <div class="decision-detail-grid">
        ${blocks.map(([title, items]) => `
          <div>
            <span>${escapeHtml(title)}</span>
            ${items.map((item) => `<small>${escapeHtml(item)}</small>`).join("")}
          </div>
        `).join("")}
      </div>
    </section>
  `;
};

const renderUpcomingCalendar = (player) => {
  const matches = player.marketIntelligence?.calendar?.matches || [];
  if (!matches.length) return `<p class="muted-empty compact">No hay próximos partidos suficientes para valorar el calendario.</p>`;
  return `
    <div class="upcoming-calendar">
      ${matches.map((match) => {
        const date = new Date(Number(match.timestamp || 0) * 1000);
        const dateText = date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", timeZone: "Europe/Madrid" });
        const easeClass = match.ease >= 66 ? "positive" : match.ease <= 38 ? "negative" : "neutral";
        return `
          <div class="calendar-match ${easeClass}">
            ${match.opponent?.image ? `<img src="${escapeHtml(match.opponent.image)}" alt="" loading="lazy" />` : ""}
            <span><strong>${match.isHome ? "vs" : "@"} ${escapeHtml(match.opponent?.name || "Rival")}</strong><small>${dateText}</small></span>
            <b title="Facilidad estimada del partido">${Math.round(match.ease)}</b>
          </div>
        `;
      }).join("")}
    </div>
  `;
};

const MARKET_NOISE_PATTERNS = [
  "mercado",
  "mi equipo",
  "alineacion",
  "clasificacion",
  "noticias",
  "comunidad",
  "jugadores",
  "comprar",
  "vender",
  "pujar",
  "oferta",
  "saldo",
  "valor mercado",
  "valor de mercado",
  "clausula",
  "biwenger",
  "buscar",
  "favoritos",
  "puntos",
  "posicion",
  "precio",
  "fin",
  "hoy",
  "ayer",
  "manana",
  "jornada"
];

const COMPETITIONS = {
  club: {
    label: "Liga / clubes",
    teamFallback: "Sin equipo",
    contextLabel: "Club"
  },
  worldcup: {
    label: "Mundial / selecciones",
    teamFallback: "Sin seleccion",
    contextLabel: "Seleccion"
  }
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const SQUAD_TARGETS = {
  POR: 2,
  DF: 5,
  MC: 5,
  DL: 3,
  ENT: 1
};
const POSITION_ORDER = { POR: 0, DF: 1, MC: 2, DL: 3, ENT: 4 };
const POSITION_NAMES = { POR: "Porteros", DF: "Defensas", MC: "Centrocampistas", DL: "Delanteros", ENT: "Entrenadores" };

const FORMATIONS = [
  { name: "4-3-3", slots: { POR: 1, DF: 4, MC: 3, DL: 3 } },
  { name: "4-4-2", slots: { POR: 1, DF: 4, MC: 4, DL: 2 } },
  { name: "3-5-2", slots: { POR: 1, DF: 3, MC: 5, DL: 2 } },
  { name: "3-4-3", slots: { POR: 1, DF: 3, MC: 4, DL: 3 } },
  { name: "5-3-2", slots: { POR: 1, DF: 5, MC: 3, DL: 2 } },
  { name: "5-4-1", slots: { POR: 1, DF: 5, MC: 4, DL: 1 } }
];

const competitionMeta = () => COMPETITIONS[state.competition] || COMPETITIONS.club;

const currentTeamAliases = () => {
  if (state.competition === "worldcup") {
    return {
      ...window.TEAM_ALIASES,
      ...window.NATIONAL_TEAM_ALIASES
    };
  }
  return window.TEAM_ALIASES;
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const nationalAliasEntries = () => Object.entries(window.NATIONAL_TEAM_ALIASES || {})
  .sort((a, b) => b[0].length - a[0].length);

const clubAliasEntries = () => Object.entries(window.TEAM_ALIASES || {})
  .sort((a, b) => b[0].length - a[0].length);

const selectionFromText = (text) => {
  const value = normalize(text);
  const entry = nationalAliasEntries().find(([alias]) => {
    const key = normalize(alias);
    return new RegExp(`(^|\\s)${escapeRegExp(key)}(\\s|$)`).test(value);
  });
  return entry ? entry[1] : null;
};

const isNationalTeamName = (team) => {
  const value = normalize(team);
  if (!value || value === normalize(COMPETITIONS.worldcup.teamFallback)) return false;
  return Object.values(window.NATIONAL_TEAM_ALIASES || {}).some((name) => normalize(name) === value);
};

const applyFantasyStarterCalibration = (player) => {
  if ((player.criteriaVersion || 0) >= 4) return player;
  const fantasy = player.sourceSummary?.fantasy;
  if (!fantasy?.usedForStarter || !Number.isFinite(fantasy.nextStarterProbability)) return player;

  const next = fantasy.nextStarterProbability;
  const nextWeight = state.competition === "worldcup" ? 0.85 : 0.62;
  let starter = (player.starter || 0) * (1 - nextWeight) + next * nextWeight;

  if (next >= 80) {
    starter = Math.max(starter, next - 6);
  } else if (next <= 20) {
    starter = Math.min(starter, next + 8);
  }

  return {
    ...player,
    starter: Math.round(clamp(starter))
  };
};

const playerForCompetition = (player) => {
  if (state.competition !== "worldcup") {
    return applyFantasyStarterCalibration({
      ...player,
      sourceStatus: player.sourceStatus || "seed",
      dataConfidence: player.dataConfidence ?? 62,
      contextLabel: COMPETITIONS.club.contextLabel,
      baseTeam: player.team
    });
  }

  if (player.sourceStatus === "live" && player.competitionScope === "worldcup") {
    return applyFantasyStarterCalibration({
      ...player,
      team: player.nationalTeam || player.team || COMPETITIONS.worldcup.teamFallback,
      baseTeam: player.clubTeam || player.baseTeam || player.team,
      contextLabel: COMPETITIONS.worldcup.contextLabel
    });
  }

  const profile = player.competitionProfiles?.worldcup;
  const fallbackTeam = player.nationalTeam
    || (isNationalTeamName(player.team) ? player.team : null)
    || COMPETITIONS.worldcup.teamFallback;

  if (!profile) {
    const riskReasons = player.riskReasons || [];
    return applyFantasyStarterCalibration({
      ...player,
      team: fallbackTeam,
      baseTeam: player.team,
      starter: Math.max(8, Math.round(player.starter * 0.72)),
      form: Math.max(40, Math.round(player.form * 0.92)),
      asScore: Math.max(40, Math.round(player.asScore * 0.9)),
      sofascore: Math.max(40, Math.round(player.sofascore * 0.9)),
      stats: Math.max(40, Math.round(player.stats * 0.9)),
      valueTrend: Math.min(player.valueTrend || 0, 1),
      risk: player.risk === "low" ? "medium" : player.risk,
      riskReasons: ["Sin rol de seleccion enriquecido", ...riskReasons],
      sources: ["Contexto seleccion", ...(player.sources || [])],
      sourceStatus: player.sourceStatus || "manual",
      dataConfidence: Math.min(player.dataConfidence ?? 40, 45),
      note: "Valoracion conservadora en modo selecciones: falta confirmar convocatoria, rol y once probable.",
      contextLabel: COMPETITIONS.worldcup.contextLabel
    });
  }

  return applyFantasyStarterCalibration({
    ...player,
    ...profile,
    team: profile.team || fallbackTeam,
    baseTeam: player.team,
    price: profile.price || player.price,
    nationalTeam: profile.team || fallbackTeam,
    sourceStatus: profile.sourceStatus || player.sourceStatus || "seed",
    dataConfidence: profile.dataConfidence ?? player.dataConfidence ?? 62,
    contextLabel: COMPETITIONS.worldcup.contextLabel
  });
};

const sourceStatusLabel = (status) => {
  if (status === "live") return "Fuente real";
  if (status === "seed") return "Base local";
  return "Estimado";
};

const hasStaleStarterSignals = (players) => Array.isArray(players) && players.some((player) => {
  const fantasy = player?.sourceSummary?.fantasy;
  return player?.sourceStatus === "live"
    && player?.competitionScope === "worldcup"
    && fantasy?.usedForStarter
    && !Number.isFinite(fantasy?.nextStarterProbability);
});

const riskPenalty = (risk) => {
  if (risk === "high") return 18;
  if (risk === "medium") return 8;
  return 2;
};

const systemScore = (player, scoring) => {
  const base = (() => {
    if (scoring === "as") return player.asScore;
    if (scoring === "sofascore") return player.sofascore;
    if (scoring === "stats") return player.stats;
    return Math.round((player.asScore + player.sofascore) / 2);
  })();
  const fantasySignal = fantasyPointScore(player, scoring);
  return fantasySignal === null ? base : Math.round(clamp(base * 0.68 + fantasySignal * 0.32));
};

const fantasyPointsForScoring = (player, scoring = state.scoring) => {
  const points = player?.sourceSummary?.fantasy?.points;
  if (!points || typeof points !== "object") return null;
  const key = scoring === "mixed" ? "mixed" : scoring;
  const direct = Number(points[key]);
  if (Number.isFinite(direct)) return direct;
  const fallback = Number(points.mixed ?? points.sofascore ?? points.as ?? points.stats);
  return Number.isFinite(fallback) ? fallback : null;
};

const fantasyAveragePointsForScoring = (player, scoring = state.scoring) => {
  const directAverage = player?.sourceSummary?.fantasy?.avgPoints;
  if (directAverage && typeof directAverage === "object") {
    const key = scoring === "mixed" ? "mixed" : scoring;
    const value = Number(directAverage[key]);
    if (Number.isFinite(value)) return value;
  }
  const points = fantasyPointsForScoring(player, scoring);
  const matches = Number(player?.sourceSummary?.fantasy?.competitionMatches || player?.sourceSummary?.fantasy?.matches || 0);
  if (!Number.isFinite(points) || !Number.isFinite(matches) || matches <= 0) return null;
  return points / matches;
};

const fantasyPointScore = (player, scoring = state.scoring) => {
  const average = fantasyAveragePointsForScoring(player, scoring);
  if (!Number.isFinite(average)) return null;
  return Math.round(clamp(44 + average * 5.2, 28, 98));
};

const priceScore = (player, allPlayers) => {
  const prices = allPlayers.map((item) => item.price).filter(Boolean);
  const max = Math.max(...prices, 1);
  const min = Math.min(...prices, max);
  if (!player.price) return 58;
  const relative = 100 - ((player.price - min) / Math.max(max - min, 1)) * 42;
  const production = (player.starter * 0.38 + player.form * 0.24 + player.stats * 0.2 + player.sofascore * 0.18);
  return clamp(relative * 0.48 + production * 0.52 + player.valueTrend);
};

const percentileRank = (values, value) => {
  const clean = values.filter((item) => Number.isFinite(Number(item))).map(Number).sort((a, b) => a - b);
  const numeric = Number(value);
  if (!clean.length || !Number.isFinite(numeric)) return 50;
  if (clean.length === 1) return 50;
  const lower = clean.filter((item) => item < numeric).length;
  const equal = clean.filter((item) => item === numeric).length;
  return Math.round(((lower + equal * 0.5) / clean.length) * 100);
};

const marketRelativeQuality = (player, scoring = state.scoring) => {
  const system = systemScore(player, scoring);
  return clamp(
    Number(player.starter || 0) * 0.48
    + system * 0.28
    + Number(player.form || 50) * 0.16
    + Number(player.dataConfidence || 62) * 0.08
  );
};

const marketRelativeProfile = (player, allPlayers, intelligence, scoring = state.scoring) => {
  const position = player.position || "MC";
  const positionPlayers = allPlayers.filter((item) => (item.position || "MC") === position);
  const target = SQUAD_TARGETS[position] || 4;
  const quality = marketRelativeQuality(player, scoring);
  const price = Number(player.price || player.biwengerValue || 0);
  const priceMillions = Math.max(price / 1_000_000, 0.2);
  const efficiency = quality / priceMillions;
  const comparablePrices = positionPlayers.map((item) => Number(item.price || item.biwengerValue || 0)).filter((value) => value > 0);
  const comparableQualities = positionPlayers.map((item) => marketRelativeQuality(item, scoring));
  const comparableEfficiency = positionPlayers.map((item) => {
    const itemPrice = Math.max(Number(item.price || item.biwengerValue || 0) / 1_000_000, 0.2);
    return marketRelativeQuality(item, scoring) / itemPrice;
  });
  const pricePercentile = percentileRank(comparablePrices, price);
  const qualityPercentile = percentileRank(comparableQualities, quality);
  const efficiencyPercentile = percentileRank(comparableEfficiency, efficiency);
  const isUnavailable = (item) => ["injured", "suspended"].includes(String(item.health?.status || item.status || "").toLowerCase());
  const viablePlayers = positionPlayers.filter((item) => !isUnavailable(item) && Number(item.starter || 0) >= 60 && marketRelativeQuality(item, scoring) >= 58);
  const premiumPlayers = viablePlayers.filter((item) => Number(item.starter || 0) >= 72 && marketRelativeQuality(item, scoring) >= 68);
  const scarcityScore = clamp(
    46
    + Math.max(0, target - viablePlayers.length) * 12
    + Math.max(0, 2 - premiumPlayers.length) * 9
    + Math.max(0, target * 2 - positionPlayers.length) * 3
    - Math.max(0, positionPlayers.length - target * 4) * 3
  );
  const edge = qualityPercentile - pricePercentile;
  const valueScore = clamp(
    50
    + edge * 0.45
    + (efficiencyPercentile - 50) * 0.38
    + (Number(intelligence?.expectedPoints || 0) - 4.5) * 2.2
  );
  const cheapTrap = pricePercentile <= 45 && (
    Number(player.starter || 0) < 45
    || Number(intelligence?.expectedPoints || 0) < 2.8
    || intelligence?.role === "Evitar por ahora"
  );
  const overpayRisk = pricePercentile >= 72 && qualityPercentile <= 58;
  const scarceFit = scarcityScore >= 70 && Number(player.starter || 0) >= 60 && !cheapTrap;
  let label = "Valor neutro";
  if (cheapTrap) label = "Barato con trampa";
  else if (valueScore >= 72 && scarceFit) label = "Oportunidad escasa";
  else if (valueScore >= 72) label = "Valor relativo alto";
  else if (scarceFit) label = "Perfil escaso";
  else if (overpayRisk) label = "Sobreprecio";
  else if (pricePercentile >= 78 && qualityPercentile >= 74) label = "Caro diferencial";
  return {
    position,
    positionCount: positionPlayers.length,
    viableCount: viablePlayers.length,
    premiumCount: premiumPlayers.length,
    target,
    quality: Math.round(quality),
    pricePercentile,
    qualityPercentile,
    efficiencyPercentile,
    valueScore: Math.round(valueScore),
    scarcityScore: Math.round(scarcityScore),
    edge: Math.round(edge),
    cheapTrap,
    overpayRisk,
    scarceFit,
    label
  };
};

const recommendationLabel = (score) => {
  if (score >= 82) return "Fichaje prioritario";
  if (score >= 72) return "Muy recomendable";
  if (score >= 62) return "Interesante";
  if (score >= 52) return "Solo a precio justo";
  return "Evitar sobrepuja";
};

const riskLabel = (risk) => {
  if (risk === "high") return "Alto";
  if (risk === "medium") return "Medio";
  return "Bajo";
};

const initialsFor = (name) => String(name || "?")
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || "")
  .join("") || "?";

const renderPlayerMedia = (player, size = "sm", options = {}) => {
  const media = player.media || {};
  const initials = initialsFor(player.name);
  const teamName = String(player.team || "?");
  const overlayMode = options.overlay || "emblem";
  const playerImg = media.playerImage
    ? `<img class="player-photo-img" src="${escapeHtml(media.playerImage)}" alt="Foto de ${escapeHtml(player.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false" /><span class="player-photo-fallback" hidden>${escapeHtml(initials)}</span>`
    : media.emblemImage
      ? `<img class="player-photo-img proxy" src="${escapeHtml(media.emblemImage)}" alt="Escudo o bandera de ${escapeHtml(teamName)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false" /><span class="player-photo-fallback" hidden>${escapeHtml(initials)}</span>`
      : `<span class="player-photo-fallback">${escapeHtml(initials)}</span>`;
  const points = Number(player.competitionPoints ?? player.points ?? 0).toLocaleString("es-ES");
  const emblem = overlayMode === "points"
    ? `<span class="player-points-badge" title="Puntos totales en Biwenger con el sistema configurado">${escapeHtml(points)}</span>`
    : media.emblemImage
      ? `<img class="player-emblem-img" src="${escapeHtml(media.emblemImage)}" alt="${media.emblemKind === "selection" ? "Bandera o escudo de seleccion" : "Escudo de club"} de ${escapeHtml(teamName)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false" /><span class="player-emblem-fallback" hidden>${escapeHtml(teamName.slice(0, 2).toUpperCase())}</span>`
      : `<span class="player-emblem-fallback">${escapeHtml(teamName.slice(0, 2).toUpperCase())}</span>`;

  return `
    <span class="player-media ${size}">
      <span class="player-photo">${playerImg}</span>
      <span class="player-emblem">${emblem}</span>
    </span>
  `;
};

const healthMeta = (player) => {
  const health = player.health || {};
  if (health.status === "injured") return { className: "injured", mark: "X", label: "Lesionado" };
  if (health.status === "suspended") return { className: "injured", mark: "X", label: "Sancionado" };
  if (health.status === "doubtful") return { className: "doubtful", mark: "?", label: "Duda" };
  if (health.status === "unknown") return { className: "unknown", mark: "-", label: "Sin dato" };
  return { className: "available", mark: "OK", label: "Disponible" };
};

const renderHealthBadge = (player) => {
  const meta = healthMeta(player);
  const health = player.health || {};
  const title = [meta.label, health.detail, health.expectedReturn].filter(Boolean).join(" - ");
  return `<span class="health-badge ${meta.className}" title="${escapeHtml(title)}"><b>${meta.mark}</b><span>${escapeHtml(meta.label)}</span></span>`;
};

const slugifyPublic = (value) => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const futbolFantasySearchUrl = (player) => {
  const queryName = player?.sourceSummary?.fantasy?.profileName || player?.originalName || player?.name || "";
  const query = [
    "site:futbolfantasy.com/jugadores",
    queryName,
    state.competition === "worldcup" ? "world-cup-2026" : "",
    player?.team || ""
  ].filter(Boolean).join(" ");
  return queryName ? `https://www.google.com/search?q=${encodeURIComponent(query)}` : null;
};

const futbolFantasyLinkForPlayer = (player) => {
  const verified = player.sourceLinks?.futbolFantasy;
  if (verified) {
    return { url: verified, label: "FF", title: "Ficha verificada en FutbolFantasy" };
  }
  const teamLineupUrl = player.sourceSummary?.fantasy?.teamLineupUrl;
  if (teamLineupUrl) {
    return { url: teamLineupUrl, label: "FF equipo", title: "Once probable del equipo en FutbolFantasy" };
  }
  const search = player.sourceLinks?.futbolFantasySearch || futbolFantasySearchUrl(player);
  return search ? { url: search, label: "Buscar FF", title: "Buscar ficha en FutbolFantasy" } : null;
};

const playerProfileUrl = (player) =>
  player.sourceLinks?.futbolFantasy
  || player.sourceSummary?.fantasy?.teamLineupUrl
  || player.sourceLinks?.futbolFantasySearch
  || futbolFantasySearchUrl(player)
  || player.sourceLinks?.jornadaPerfecta
  || player.sourceLinks?.biwenger
  || null;

const renderProfileLink = (player) => {
  const futbolFantasy = futbolFantasyLinkForPlayer(player);
  if (futbolFantasy) {
    return `<a class="profile-link" href="${escapeHtml(futbolFantasy.url)}" target="_blank" rel="noopener" title="${escapeHtml(futbolFantasy.title)}">${escapeHtml(futbolFantasy.label)}</a>`;
  }
  const fallback = player.sourceLinks?.jornadaPerfecta || player.sourceLinks?.biwenger || null;
  if (!fallback) return `<span class="profile-link muted">S/D</span>`;
  return `<a class="profile-link" href="${escapeHtml(fallback)}" target="_blank" rel="noopener">${player.sourceLinks?.jornadaPerfecta ? "JP" : "BW"}</a>`;
};

const renderPositionBadge = (position, options = {}) => {
  const value = String(position || "MC").toUpperCase();
  const text = options.text ?? value;
  const title = options.title ? ` title="${escapeHtml(options.title)}"` : "";
  const extraClass = options.className ? ` ${escapeHtml(options.className)}` : "";
  return `<span class="badge position-badge pos-${escapeHtml(value)}${extraClass}"${title}>${escapeHtml(text)}</span>`;
};

const renderPositionIcon = (position, content = "", options = {}) => {
  const value = String(position || "MC").toUpperCase();
  const label = String(content || "").trim();
  const title = options.title ? ` title="${escapeHtml(options.title)}"` : "";
  return `<span class="position-icon pos-${escapeHtml(value)} ${label ? "has-content" : ""}" aria-hidden="true"${title}><span>${label ? escapeHtml(label) : ""}</span></span>`;
};

const scoringLabel = () => ({
  mixed: "AS/Sofa",
  as: "AS",
  sofascore: "SofaScore",
  stats: "Estadisticas"
}[state.scoring] || "Sistema");

const playerAccumulatedPoints = (player, options = {}) => {
  const keys = [
    "competitionPoints",
    "points",
    "totalPoints",
    "seasonPoints",
    options.scoreKey,
    options.fallbackKey
  ].filter(Boolean);
  for (const key of keys) {
    const value = Number(player?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
};

const renderScoringBadge = (player, options = {}) => {
  const points = playerAccumulatedPoints(player, options);
  const title = options.title || "Puntos reales acumulados en Biwenger con el sistema configurado en la liga";
  const extraClass = options.className ? ` ${escapeHtml(options.className)}` : "";
  return `<span class="scoring-badge${extraClass}" title="${escapeHtml(title)}">${points.toLocaleString("es-ES")} pts</span>`;
};

const selectedRecentScore = (match) => {
  const points = match?.points || {};
  const biwenger = Number(points.biwenger);
  if (Number.isFinite(biwenger)) return biwenger;
  const key = state.scoring === "mixed" ? "mixed" : state.scoring;
  const direct = Number(points[key]);
  if (Number.isFinite(direct)) return direct;
  const fallback = Number(points.mixed ?? points.sofascore ?? points.as ?? points.stats);
  return Number.isFinite(fallback) ? fallback : 0;
};

const recentDotClass = (score, played) => {
  if (!played || score === 0) return "zero";
  if (score < 0) return "negative";
  if (score <= 5) return "low";
  if (score <= 9) return "good";
  return "elite";
};

const matchHasMinutes = (match) => match?.minutes !== null
  && match?.minutes !== undefined
  && Number.isFinite(Number(match.minutes));

const recentFormProfile = (player) => {
  const matches = Array.isArray(player?.sourceSummary?.recentMatches)
    ? player.sourceSummary.recentMatches.slice(-5)
    : [];
  const scored = matches.map((match) => {
    const score = selectedRecentScore(match);
    const hasMinutes = matchHasMinutes(match);
    const played = match?.provider === "biwenger" || Number.isFinite(Number(match?.points?.biwenger))
      ? score !== 0
      : (hasMinutes ? Number(match.minutes) > 0 : score !== 0 || Boolean(match?.played));
    return { match, score, played, minutes: hasMinutes ? Number(match.minutes) : null };
  });
  const playedRows = scored.filter((row) => row.played);
  const lastThree = scored.slice(-3);
  const playedCount = playedRows.length;
  const missedCount = scored.length - playedCount;
  const average = playedCount
    ? playedRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / playedCount
    : null;
  const totalAverage = scored.length
    ? scored.reduce((sum, row) => sum + Number(row.played ? row.score : 0), 0) / scored.length
    : null;
  const lastThreePlayed = lastThree.filter((row) => row.played).length;
  const score = scored.length
    ? clamp(
      42
      + (Number.isFinite(average) ? average * 5.6 : -8)
      + (playedCount / scored.length) * 24
      - missedCount * 7
      + (lastThreePlayed - Math.min(3, lastThree.length - lastThreePlayed)) * 4
    )
    : 50;
  const noRecentMinutes = scored.length >= 3 && playedCount === 0;
  const cold = scored.length >= 3 && (lastThreePlayed === 0 || (Number.isFinite(totalAverage) && totalAverage <= 1.2));
  const hot = playedCount >= 3 && Number.isFinite(average) && average >= 6;
  return {
    matches: scored.length,
    playedCount,
    missedCount,
    lastThreePlayed,
    average,
    totalAverage,
    score: Math.round(score),
    noRecentMinutes,
    cold,
    hot,
    label: noRecentMinutes
      ? "sin minutos recientes"
      : cold
        ? "racha fría"
        : hot
          ? "racha fuerte"
          : scored.length ? "racha neutra" : "sin racha fiable"
  };
};

const recentMatchDetail = (match, score, played) => {
  if (!match) return { title: "Sin dato", rows: ["No hay puntuacion disponible para este partido."] };
  const rows = [];
  if (played) {
    rows.push(`${score} pts`);
    if (matchHasMinutes(match)) rows.push(`${Number(match.minutes)} min jugados`);
    if (match.starter === true) rows.push("Titular");
    if (match.starter === false && matchHasMinutes(match)) rows.push("Suplente");
    if (Number.isFinite(Number(match.minuteIn))) rows.push(`↑ Entró en el ${match.minuteInLabel || Number(match.minuteIn)}'`);
    if (Number.isFinite(Number(match.minuteOut))) rows.push(`↓ Salió en el ${match.minuteOutLabel || Number(match.minuteOut)}'`);
    if (match.minutesSource === "estimated") rows.push("Minutos de cambio estimados");
  } else {
    rows.push("No jugó o puntuó 0");
  }
  if (match.opponent) rows.push(`Rival: ${match.opponent}`);
  if (match.date) rows.push(`Fecha: ${match.date}`);
  if (match.provider === "biwenger" || Number.isFinite(Number(match.points?.biwenger))) {
    rows.push("Dato Biwenger de la liga");
  } else if (match.provider === "api-football") {
    rows.push("Fuente: API-Football");
  } else if (match.provider === "futbolfantasy") {
    rows.push("Fuente: FutbolFantasy");
  }
  return {
    title: match.provider === "biwenger" || Number.isFinite(Number(match.points?.biwenger))
      ? "Partido reciente"
      : (match.label || `Último partido ${scoringLabel()}`),
    rows
  };
};

const recentMatchTitle = (detail) => detail.rows.join(" · ");

const renderRecentFormDots = (player) => {
  const matches = Array.isArray(player?.sourceSummary?.recentMatches)
    ? player.sourceSummary.recentMatches.slice(-5)
    : [];
  const padded = [...Array(Math.max(0, 5 - matches.length)).fill(null), ...matches];
  const playerAttrs = `data-recent-player-id="${escapeHtml(player?.id || "")}" data-recent-biwenger-id="${escapeHtml(player?.biwengerPlayerId || "")}" data-recent-player-name="${escapeHtml(player?.name || "")}"`;
  return `
    <span class="recent-form-dots" title="Ultimos 5 partidos segun ${escapeHtml(scoringLabel())}">
      ${padded.map((match, index) => {
        if (!match) return `<span class="recent-dot missing" title="Sin dato" aria-label="Sin dato"></span>`;
        const score = selectedRecentScore(match);
        const isBiwenger = match.provider === "biwenger" || Number.isFinite(Number(match.points?.biwenger));
        const played = isBiwenger ? score !== 0 : Boolean(match.played) && matchHasMinutes(match) && Number(match.minutes) > 0;
        const detail = recentMatchDetail(match, score, played);
        const label = recentMatchTitle(detail);
        const needsHydration = !matchHasMinutes(match) && played;
        return `<span class="recent-dot ${recentDotClass(score, played)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" ${playerAttrs} data-recent-index="${index}" data-recent-needs-hydration="${needsHydration ? "true" : "false"}" data-recent-detail="${escapeHtml(encodeURIComponent(JSON.stringify(detail)))}"></span>`;
      }).join("")}
    </span>
  `;
};

const renderPlayerPerformanceMeta = (player, options = {}) => `
  <span class="player-performance-meta ${options.compact ? "compact" : ""}">
    ${renderScoringBadge(player, options)}
    ${renderRecentFormDots(player)}
  </span>
`;

const compactPoints = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  if (numeric > 999) return "999+";
  return String(Math.round(numeric));
};

const formatSignedMoney = (value) => {
  if (!Number.isFinite(value) || value === 0) return "0 €";
  const sign = value > 0 ? "+" : "-";
  return `${sign} ${Math.abs(Math.round(value)).toLocaleString("es-ES")} €`;
};

const TERMINAL_OWN_BID_STATUSES = new Set(["accepted", "rejected", "cancelled", "canceled", "expired", "completed", "closed"]);

const isTerminalOwnBidStatus = (status) => TERMINAL_OWN_BID_STATUSES.has(String(status || "").toLowerCase());

const marketPlayerByBiwengerId = (playerId) =>
  state.players.find((player) => Number(player.biwengerPlayerId || 0) === Number(playerId || 0)) || null;

const teamPlayerByBiwengerId = (playerId) =>
  state.teamPlayers.find((player) => Number(player.biwengerPlayerId || 0) === Number(playerId || 0)) || null;

const isActiveOwnBidOffer = (offer) => {
  if (!offer?.isMine || offer?.isIncoming) return false;
  if (isTerminalOwnBidStatus(offer.status)) return false;
  if (moneyAmount(offer.amount) <= 0) return false;
  const playerId = Number(offer.playerId || 0);
  if (playerId <= 0) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = Number(offer.expiresTs || offer.untilTs || 0);
  if (Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt < nowSeconds) return false;
  const timestamp = Number(offer.timestampTs || offer.updatedTs || 0);
  if (Number.isFinite(timestamp) && timestamp > 0 && timestamp < nowSeconds - 3 * 24 * 60 * 60) return false;
  const sourceOnly = normalize(`${offer.source || ""} ${offer.offerSource || ""}`);
  const source = normalize(`${sourceOnly} ${offer.type || ""}`);
  const offerId = Number(offer.offerId || offer.id || 0);
  if (offerId <= 0 && !/outgoing|sent|own-check/.test(sourceOnly)) return false;
  if (teamPlayerByBiwengerId(playerId)) return false;
  if (marketPlayerByBiwengerId(playerId)) return true;
  if (/market sale|market-sale|sale|sell|venta|sales/.test(source) && !/bid|puja|purchase|buy|outgoing|sent|own-check/.test(source)) {
    return false;
  }
  if (state.players.length) return false;
  return /bid|puja|purchase|buy|outgoing|sent|own-check|offer/.test(source);
};

const ownBidOfferRank = (offer) => {
  const source = normalize(`${offer?.source || ""} ${offer?.offerSource || ""}`);
  const sourceScore = /own-check|outgoing|sent/.test(source)
    ? 3000000000000
    : (/user|owner/.test(source) ? 2000000000000 : 1000000000000);
  const expires = Number(offer?.expiresTs || offer?.untilTs || 0);
  const timestamp = Number(offer?.timestampTs || offer?.updatedTs || 0);
  const offerId = Number(offer?.offerId || offer?.id || 0);
  return sourceScore
    + Math.max(0, Number.isFinite(expires) ? expires : 0) * 1000
    + Math.max(0, Number.isFinite(timestamp) ? timestamp : 0)
    + Math.max(0, Number.isFinite(offerId) ? offerId : 0) / 1000000;
};

const activeOwnBidOffers = (offers = state.biwengerOperations?.offers || []) => {
  const byPlayer = new Map();
  offers.filter(isActiveOwnBidOffer).forEach((offer) => {
    const playerId = Number(offer.playerId || 0);
    const previous = byPlayer.get(playerId);
    if (!previous || ownBidOfferRank(offer) > ownBidOfferRank(previous)) {
      byPlayer.set(playerId, offer);
    }
  });
  return [...byPlayer.values()];
};

const activeOwnOfferForPlayer = (player) => {
  const offers = state.biwengerOperations?.offers;
  if (!Array.isArray(offers)) return null;
  const playerId = Number(player?.biwengerPlayerId || 0);
  const playerName = normalize(player?.name || "");
  return activeOwnBidOffers(offers).find((offer) => {
    const offerPlayerId = Number(offer.playerId || 0);
    if (playerId > 0 && offerPlayerId > 0) return offerPlayerId === playerId;
    return playerName && normalize(offer.playerName || "") === playerName;
  }) || null;
};

const playerOwnBidAmount = (player) => {
  const activeOffer = activeOwnOfferForPlayer(player);
  if (activeOffer) return moneyAmount(activeOffer.amount);
  if (Array.isArray(state.biwengerOperations?.offers)) return null;
  if (!player?.hasBid && Number(player?.offerId || 0) <= 0) return null;
  const amount = moneyAmount(player?.myBidAmount ?? player?.bidAmount);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const playerHasOwnBid = (player) => {
  const activeOffer = activeOwnOfferForPlayer(player);
  if (activeOffer) return true;
  if (Array.isArray(state.biwengerOperations?.offers)) return false;
  const amount = playerOwnBidAmount(player);
  if (amount === null) return false;
  const status = String(player?.myBidStatus || player?.bidStatus || "").toLowerCase();
  if (isTerminalOwnBidStatus(status)) return false;
  const hasOfferId = Number(player?.offerId || 0) > 0;
  const hasActiveStatus = Boolean(status && !/sin|none|no bid|rechaz|cancel|expir|cerrad|acept/i.test(status));
  if (player?.hasBid && (hasOfferId || hasActiveStatus)) return true;
  if (hasOfferId) return true;
  return false;
};

const renderValueTrend = (player, options = {}) => {
  const compact = options.compact === true;
  const amount = player.biwengerDiff ?? player.sourceSummary?.fantasy?.biwengerDiff ?? null;
  if (!Number.isFinite(amount) || amount === 0) {
    return `<span class="value-trend ${compact ? "compact" : ""} flat" title="Sin cambio reciente en valor Biwenger">${compact ? "BV " : ""}= 0 €</span>`;
  }
  const direction = amount > 0 ? "up" : "down";
  const arrow = amount > 0 ? "↑" : "↓";
  const title = amount > 0 ? "Ganando valor en Biwenger" : "Perdiendo valor en Biwenger";
  return `<span class="value-trend ${compact ? "compact " : ""}${direction}" title="${title}">${compact ? "BV " : ""}${arrow} ${formatSignedMoney(amount)}</span>`;
};

const offerIdKey = (offer) => String(offer.offerId || `${offer.playerId || 0}-${offer.fromId || 0}-${offer.amount || 0}`);

const playerExceedsMaximumBid = (player) => {
  if (playerHasOwnBid(player)) return false;
  const maximumBid = Number(state.finance.maximumBid);
  const price = Number(player.price || player.biwengerValue || 0);
  return Number.isFinite(maximumBid) && maximumBid > 0 && price > maximumBid;
};

const maximumBidGap = (player) => {
  const maximumBid = Number(state.finance.maximumBid);
  const price = Number(player.price || player.biwengerValue || 0);
  return Number.isFinite(maximumBid) ? price - maximumBid : 0;
};

const maximumBidRecommendationCap = (player) => {
  const gap = maximumBidGap(player);
  const price = Number(player.price || player.biwengerValue || 0);
  if (!Number.isFinite(gap) || gap <= 0 || price <= 0) return 100;
  const gapRatio = gap / Math.max(price, 1);
  return Math.round(Math.max(18, 44 - Math.min(26, gapRatio * 78)));
};

const renderMaximumBidBadge = (player, compact = false) => {
  const maximumBid = Number(state.finance.maximumBid);
  if (!Number.isFinite(maximumBid) || maximumBid <= 0) {
    return `<span class="bid-limit-badge muted">${compact ? "Sin techo" : "Puja maxima sin dato"}</span>`;
  }
  if (playerHasOwnBid(player)) {
    return `<span class="bid-limit-badge active" title="Ya tienes una puja activa; el limite se revisa solo si cambias el importe">Ya pujando · ${formatFinanceMoney(maximumBid)}</span>`;
  }
  if (playerExceedsMaximumBid(player)) {
    return `<span class="bid-limit-badge blocked" title="Supera tu puja maxima actual en Biwenger">No pujable · ${formatFinanceMoney(maximumBid)}</span>`;
  }
  const margin = maximumBid - Number(player.price || 0);
  return `<span class="bid-limit-badge available" title="Margen respecto a tu puja maxima">${compact ? "Margen " : "Pujable · margen "}${formatFinanceMoney(margin)}</span>`;
};

const roundBidAmount = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.max(0, Math.round(numeric / 10000) * 10000);
};

const roundSaleAmount = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.max(0, Math.ceil(numeric / 10000) * 10000);
};

const decisionLabels = {
  buy: { label: "Fichar", className: "buy", short: "Fichar" },
  limited: { label: "Pujar con límite", className: "limited", short: "Límite" },
  watch: { label: "Mantener vigilado", className: "watch", short: "Vigilar" },
  avoid: { label: "Evitar", className: "avoid", short: "Evitar" }
};

const marketDecisionForPlayer = (player, score, intelligence, relative, maxBid) => {
  const price = Number(player.price || player.biwengerValue || 0);
  const maximumBid = Number(state.finance.maximumBid);
  const hasMaximumBid = Number.isFinite(maximumBid) && maximumBid > 0;
  const ownBid = playerHasOwnBid(player);
  const recent = player.recentForm || null;
  const unavailableBlocked = player.health?.status === "suspended"
    || player.health?.status === "injured"
    || intelligence.noNextMatch;
  const recentBlocked = Boolean(recent?.noRecentMinutes);
  const maximumBidBlocked = !ownBid && hasMaximumBid && price > maximumBid;
  const hardBlocked = unavailableBlocked || recentBlocked || maximumBidBlocked;
  let type = "watch";
  const reasons = [];

  if (
    hardBlocked
    || score < 50
    || intelligence.role === "Evitar por ahora"
    || relative?.cheapTrap
    || (state.preferences.riskAverse && recent?.cold && score < 62)
  ) {
    type = "avoid";
  } else if (score >= 80 && player.starter >= 68 && intelligence.contextualRisk < 32) {
    type = "buy";
  } else if (score >= 64 || relative?.scarceFit || intelligence.role === "Inversión") {
    type = "limited";
  }
  if (recent?.cold && type === "buy") type = "limited";
  if (recent?.cold && type === "limited" && player.starter < 64) type = "watch";
  if (recent?.hot && type === "watch" && score >= 60 && player.starter >= 58 && intelligence.contextualRisk < 45) {
    type = "limited";
  }

  if (ownBid) {
    const canRecoverOwnBid = !unavailableBlocked && !recentBlocked && !relative?.cheapTrap && score >= 45;
    type = type === "avoid" && canRecoverOwnBid ? "limited" : type;
    reasons.push(`Ya tienes puja activa por ${formatFinanceMoney(playerOwnBidAmount(player))}.`);
  }
  if (!ownBid && hasMaximumBid && price > maximumBid) reasons.push(`No entra en tu puja máxima actual (${formatFinanceMoney(maximumBid)}).`);
  if (player.health?.status === "suspended") reasons.push("Sancionado: no debe ser prioritario.");
  if (player.health?.status === "injured") reasons.push("Lesionado: riesgo alto inmediato.");
  if (player.health?.status === "doubtful") reasons.push("Dudoso: limita la puja.");
  if (intelligence.noNextMatch) reasons.push("Sin próximo partido localizado.");
  if (recent?.noRecentMinutes) reasons.push("No ha jugado en los últimos partidos con datos.");
  else if (recent?.cold) reasons.push(`Racha fría: ${recent.playedCount}/${recent.matches} partidos recientes con minutos.`);
  else if (recent?.hot) reasons.push(`Racha fuerte: media ${recent.average.toLocaleString("es-ES", { maximumFractionDigits: 1 })} pts.`);
  if (player.starter >= 72) reasons.push(`${player.starter}% de titularidad.`);
  else if (player.starter < 45) reasons.push(`Titularidad baja (${player.starter}%).`);
  if (intelligence.expectedPoints >= 6) reasons.push(`${intelligence.expectedPoints.toLocaleString("es-ES")} puntos esperados.`);
  if (relative?.scarceFit) reasons.push(`Escasez en ${relative.position}.`);
  if (relative?.overpayRisk) reasons.push("Precio alto frente a calidad relativa.");
  if (intelligence.revaluationScore >= 68) reasons.push(`Revalorización ${intelligence.revaluationScore}/100.`);
  if (!reasons.length) reasons.push("Perfil equilibrado, conviene controlar importe.");

  let recommendedBid = 0;
  if (type !== "avoid" && price > 0) {
    const demandBoost = Math.min(0.05, Number(player.bidCount || player.rivalBidCount || 0) * 0.012);
    const qualityBoost = clamp((score - 62) / 500, -0.035, 0.07);
    const scarcityBoost = relative?.scarceFit ? 0.025 : 0;
    const riskDiscount = intelligence.contextualRisk / 1400 + (player.health?.status === "doubtful" ? 0.035 : 0);
    const baseMultiplier = type === "buy" ? 1.06 : type === "limited" ? 1.015 : 1;
    recommendedBid = roundBidAmount(price * (baseMultiplier + demandBoost + qualityBoost + scarcityBoost - riskDiscount));
    recommendedBid = Math.max(price, recommendedBid);
  }
  let reasonableLimit = type === "avoid" ? 0 : roundBidAmount(Math.max(price, maxBid || recommendedBid || price));
  if (hasMaximumBid && !ownBid) {
    recommendedBid = Math.min(recommendedBid, maximumBid);
    reasonableLimit = Math.min(reasonableLimit, maximumBid);
  }
  if (type === "watch") recommendedBid = 0;
  if (type === "avoid") {
    recommendedBid = 0;
    reasonableLimit = 0;
  }

  const sporting = [
    `${player.starter}% titular`,
    recent ? `${recent.label} (${recent.score}/100)` : null,
    `${intelligence.expectedPoints.toLocaleString("es-ES")} pts esperados`,
    `${intelligence.calendar.label} (${intelligence.calendar.score}/100)`
  ].filter(Boolean);
  const economy = [
    `Precio ${formatFinanceMoney(price)}`,
    type === "avoid" ? "No pujar ahora" : `Puja recomendada ${formatFinanceMoney(recommendedBid)}`,
    reasonableLimit ? `Tope ${formatFinanceMoney(reasonableLimit)}` : null,
    hasMaximumBid ? `Tu máximo ${formatFinanceMoney(maximumBid)}` : null
  ].filter(Boolean);
  const fit = [
    `${squadFitLabel(player.squadFitScore)} (${player.squadFitScore}/100)`,
    `${POSITION_NAMES[player.position] || player.position}`,
    relative?.scarceFit ? "posición escasa" : null
  ].filter(Boolean);
  const risk = [
    riskLabel(player.risk),
    `${intelligence.contextualRisk}/100 contextual`,
    recent?.cold || recent?.noRecentMinutes ? recent.label : null,
    player.health?.label || healthMeta(player).label,
    relative?.cheapTrap ? "ganga trampa" : null
  ].filter(Boolean);

  return {
    ...decisionLabels[type],
    type,
    recommendedBid,
    reasonableLimit,
    reasons: reasons.slice(0, 4),
    summary: reasons[0] || decisionLabels[type].label,
    sporting,
    economy,
    fit,
    risk
  };
};

const renderDecisionBadge = (player, compact = false) => {
  const decision = player.marketDecision;
  if (!decision) return "";
  const amount = decision.recommendedBid > 0 ? ` · ${formatFinanceMoney(decision.recommendedBid)}` : "";
  return `<span class="decision-badge ${decision.className}" title="${escapeHtml(decision.summary)}">${compact ? decision.short : decision.label}${compact ? "" : amount}</span>`;
};

const positionFromText = (text) => {
  const value = normalize(text);
  if (/\bent\b|entrenador|coach|manager|tecnico/.test(value)) return "ENT";
  if (/\bpor\b|\bpt\b|portero/.test(value)) return "POR";
  if (/\bdf\b|\bdef\b|defensa|central|lateral/.test(value)) return "DF";
  if (/\bmc\b|\bmd\b|\bmi\b|\bmed\b|medio|centro/.test(value)) return "MC";
  if (/\bdl\b|\bdc\b|delantero|extremo|punta/.test(value)) return "DL";
  return null;
};

const parsePrice = (text) => {
  const cleaned = String(text).replace(/\s/g, "");
  const match = cleaned.match(/(\d{1,3}(?:[.,]\d{3}){1,3}|\d+(?:[.,]\d+)?)\s*(m|M)?/);
  if (!match) return null;
  const raw = match[1];
  const hasMillionsSuffix = Boolean(match[2]);
  if (hasMillionsSuffix) {
    return Math.round(Number(raw.replace(",", ".")) * 1000000);
  }
  const digitsOnly = raw.replace(/[.,]/g, "");
  if (digitsOnly.length <= 3) return Number(digitsOnly) * 1000000;
  return Number(digitsOnly);
};

const isPriceLike = (text) => {
  const value = String(text || "");
  return /(?:\u20ac|eur|m\b|[0-9][0-9.,]{4,})/i.test(value) && Boolean(parsePrice(value));
};

const stripPriceText = (text) =>
  String(text || "")
    .replace(/(\d{1,3}(?:[.,]\d{3}){1,3}|\d+(?:[.,]\d+)?)\s*(?:m|M|eur|\u20ac)?/gi, "")
    .replace(/\b(?:eur|euro|euros)\b/gi, "")
    .replace(/\u20ac/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isNoiseLine = (text) => {
  const value = normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) return true;
  if (/^\d+$/.test(value)) return true;
  if (/^(por|pt|df|def|mc|md|mi|med|dl|dc)$/.test(value)) return true;
  if (Object.keys(currentTeamAliases()).some((alias) => value === normalize(alias))) return true;
  return MARKET_NOISE_PATTERNS.some((pattern) => value === pattern || value.includes(pattern));
};

const isLikelyNameLine = (text) => {
  const value = String(text || "").trim();
  const clean = normalize(value);
  if (!/[A-Za-z\u00C0-\u017F]/.test(value)) return false;
  if (isPriceLike(value) || isNoiseLine(value)) return false;
  if (clean.length < 3 || clean.length > 42) return false;
  if ((value.match(/\d/g) || []).length > 2) return false;
  return true;
};

const uniqueLines = (lines) => {
  const seen = new Set();
  return lines.filter((line) => {
    const key = normalize(line).replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const prepareMarketLines = (text) => {
  const rawLines = String(text || "")
    .replace(/\u20ac/g, " EUR ")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const combined = [];
  const usedNameIndexes = new Set();

  rawLines.forEach((line, index) => {
    const known = window.FANTASY_PLAYERS.find((player) => normalize(line).includes(normalize(player.name)));
    if (known && !isPriceLike(line)) {
      const priceLine = rawLines.slice(index + 1, index + 7).find((candidate) => isPriceLike(candidate));
      combined.push(priceLine ? `${known.name} ${priceLine}` : known.name);
      usedNameIndexes.add(index);
      return;
    }

    if (!isPriceLike(line)) return;
    const lineWithoutPrice = stripPriceText(line);
    if (/[A-Za-z\u00C0-\u017F]/.test(lineWithoutPrice) && !isNoiseLine(lineWithoutPrice)) {
      combined.push(line);
      return;
    }

    for (let offset = 1; offset <= 6; offset += 1) {
      const candidateIndex = index - offset;
      if (candidateIndex < 0 || usedNameIndexes.has(candidateIndex)) continue;
      const candidate = rawLines[candidateIndex];
      if (!isLikelyNameLine(candidate)) continue;
      usedNameIndexes.add(candidateIndex);
      combined.push(`${candidate} ${line}`);
      return;
    }
  });

  if (combined.length) return uniqueLines(combined);

  return uniqueLines(
    rawLines.filter((line) => !isNoiseLine(line) && (isLikelyNameLine(line) || isPriceLike(line)))
  );
};

const teamFromText = (text) => {
  if (state.competition === "worldcup") {
    return selectionFromText(text) || competitionMeta().teamFallback;
  }

  const value = normalize(text);
  const entry = clubAliasEntries().find(([alias]) => value.includes(normalize(alias)));
  return entry ? entry[1] : competitionMeta().teamFallback;
};

const findKnowledgeBasePlayer = (name) => {
  const key = normalize(name);
  return window.FANTASY_PLAYERS.find((player) => normalize(player.name) === key)
    || window.FANTASY_PLAYERS.find((player) => normalize(player.name).includes(key) || key.includes(normalize(player.name)));
};

const fallbackPlayer = (line, index) => {
  const price = parsePrice(line);
  const team = teamFromText(line);
  const position = positionFromText(line) || "MC";
  const aliasesPattern = [
    ...Object.keys(window.TEAM_ALIASES || {}),
    ...Object.keys(window.NATIONAL_TEAM_ALIASES || {}),
    ...Object.values(window.NATIONAL_TEAM_ALIASES || {}),
    "sin seleccion"
  ]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const identityText = line
    .replace(/(\d{1,3}(?:[.,]\d{3}){1,3}|\d+(?:[.,]\d+)?)\s*(m|M)?/g, "")
    .replace(/\b(?:eur|euro|euros)\b/gi, "")
    .replace(/\u20ac/g, "")
    .replace(/\b(POR|PT|DF|DEF|MC|MD|MI|MED|DL|DC|ENT|ENTRENADOR)\b/gi, "");
  const identityParts = identityText.split(/\s[-,;|]\s|[,;|]/).map((part) => part.trim()).filter(Boolean);
  const nameSource = state.competition === "worldcup" && identityParts.length > 1
    ? identityParts[0]
    : identityText;
  const name = nameSource
    .replace(aliasesPattern ? new RegExp(aliasesPattern, "gi") : /$^/, "")
    .replace(/\bU\s*\d{1,2}\b/gi, "")
    .replace(/[-,;|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const baseline = {
    POR: { starter: 74, form: 62, asScore: 62, sofascore: 68, stats: 70 },
    DF: { starter: 72, form: 63, asScore: 63, sofascore: 66, stats: 67 },
    MC: { starter: 70, form: 64, asScore: 65, sofascore: 67, stats: 68 },
    DL: { starter: 68, form: 66, asScore: 66, sofascore: 68, stats: 70 },
    ENT: { starter: 92, form: 62, asScore: 62, sofascore: 62, stats: 62 }
  }[position];

  return {
    id: `manual-${index}`,
    name: name || `Jugador ${index + 1}`,
    team,
    position,
    price: price || 0,
    starter: baseline.starter,
    form: baseline.form,
    asScore: baseline.asScore,
    sofascore: baseline.sofascore,
    stats: baseline.stats,
    valueTrend: price && price < 5000000 ? 5 : 1,
    risk: "medium",
    sourceStatus: "manual",
    dataConfidence: 30,
    riskReasons: state.competition === "worldcup"
      ? ["Sin datos enriquecidos de seleccion todavia", "Conviene validar convocatoria, rol y once probable"]
      : ["Sin datos enriquecidos todavia", "Conviene validar noticias y once probable"],
    sources: [state.competition === "worldcup" ? "Entrada manual - seleccion" : "Entrada manual"],
    note: state.competition === "worldcup"
      ? "Jugador detectado desde la entrada. El motor aplica una estimacion conservadora para competicion de selecciones."
      : "Jugador detectado desde la entrada. El motor aplica una estimacion conservadora hasta conectar fuentes externas."
  };
};

const cleanWorldcupPlayerIdentity = (player) => {
  if (state.competition !== "worldcup") return player;

  const detectedSelection = player.nationalTeam
    || selectionFromText(`${player.name || ""} ${player.team || ""}`)
    || (isNationalTeamName(player.team) ? player.team : null)
    || COMPETITIONS.worldcup.teamFallback;
  const removePattern = [
    ...Object.keys(window.NATIONAL_TEAM_ALIASES || {}),
    ...Object.values(window.NATIONAL_TEAM_ALIASES || {}),
    "sin seleccion"
  ]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const cleanedName = String(player.name || "")
    .replace(removePattern ? new RegExp(removePattern, "gi") : /$^/, "")
    .replace(/[-,;|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    ...player,
    name: cleanedName || player.name,
    team: detectedSelection,
    nationalTeam: detectedSelection === COMPETITIONS.worldcup.teamFallback ? player.nationalTeam : detectedSelection
  };
};

const parseMarketText = (text) => {
  const lines = prepareMarketLines(text);

  return lines.map((line, index) => {
    const known = window.FANTASY_PLAYERS.find((player) => normalize(line).includes(normalize(player.name)));
    if (known) {
      const detectedPrice = parsePrice(line);
      return cleanWorldcupPlayerIdentity({
        ...known,
        id: `${normalize(known.name).replace(/\s+/g, "-")}-${index}`,
        price: detectedPrice || known.price
      });
    }

    const parts = line.split(/\s[-,;|]\s|[,;|]/).map((part) => part.trim()).filter(Boolean);
    const possibleName = parts[0] || line;
    const byName = findKnowledgeBasePlayer(possibleName);
    if (byName) {
      const detectedPrice = parsePrice(line);
      return cleanWorldcupPlayerIdentity({
        ...byName,
        id: `${normalize(byName.name).replace(/\s+/g, "-")}-${index}`,
        price: detectedPrice || byName.price
      });
    }

    return cleanWorldcupPlayerIdentity(fallbackPlayer(line, index));
  });
};

const biwengerPlayersToText = (players) => players.map((player) =>
  `${player.name} - ${player.team || competitionMeta().teamFallback} - ${player.position || "MC"} - ${player.price || 0}`
).join("\n");

const hydrateImportedPlayers = (players) => (players || []).map((player, index) => cleanWorldcupPlayerIdentity({
  id: player.id || `biwenger-${index}`,
  biwengerPlayerId: player.biwengerPlayerId || null,
  marketOwnerId: Number(player.marketOwnerId || 0),
  marketOwnerName: player.marketOwnerName || "",
  marketSellerType: player.marketSellerType || (Number(player.marketOwnerId || 0) > 0 ? "rival" : "free"),
  marketSellerLabel: player.marketSellerLabel || "",
  offerId: Number(player.offerId || 0) || null,
  ownerId: Number(player.ownerId || 0) || null,
  clause: Number(player.clause || 0) || null,
  name: player.name,
  team: player.team || competitionMeta().teamFallback,
  nationalTeam: player.nationalTeam || null,
  clubTeam: player.clubTeam || null,
  baseTeam: player.baseTeam || player.team || competitionMeta().teamFallback,
  position: player.biwengerPosition || player.position || "MC",
  biwengerPosition: player.biwengerPosition || player.position || null,
  price: Number(player.price || 0),
  salePrice: Number(player.salePrice || player.price || 0),
  biwengerValue: Number(player.biwengerValue || player.price || 0),
  biwengerDiff: Number(player.biwengerDiff || 0),
  bidAmount: Number.isFinite(player.bidAmount) ? player.bidAmount : null,
  bidCount: Number(player.bidCount || 0),
  bidCountSource: player.bidCountSource || "",
  bidStatus: player.bidStatus || null,
  hasBid: Boolean(player.hasBid),
  myBidAmount: Number.isFinite(player.myBidAmount) ? player.myBidAmount : (Number.isFinite(player.bidAmount) ? player.bidAmount : null),
  myBidStatus: player.myBidStatus || player.bidStatus || null,
  rivalBids: Array.isArray(player.rivalBids) ? player.rivalBids : [],
  rivalBidCount: Number(player.rivalBidCount || 0),
  highestRivalBid: Number.isFinite(player.highestRivalBid) ? player.highestRivalBid : null,
  rivalBidVisibility: player.rivalBidVisibility || "hidden",
  starter: Number.isFinite(player.starter) ? player.starter : 58,
  form: Number.isFinite(player.form) ? player.form : 56,
  asScore: Number.isFinite(player.asScore) ? player.asScore : 55,
  sofascore: Number.isFinite(player.sofascore) ? player.sofascore : 55,
  stats: Number.isFinite(player.stats) ? player.stats : 54,
  competitionPoints: Number(player.competitionPoints || 0),
  status: player.status || "ok",
  statusText: player.statusText || "",
  valueTrend: Number.isFinite(player.valueTrend) ? player.valueTrend : 0,
  sourceStatus: player.sourceStatus || "seed",
  dataConfidence: Number.isFinite(player.dataConfidence) ? player.dataConfidence : 74,
  competitionScope: player.competitionScope || state.competition,
  health: player.health || { status: "unknown" },
  media: player.media || {},
  sourceLinks: player.sourceLinks || {},
  risk: player.risk || "medium",
  riskReasons: player.riskReasons || ["Importado desde Biwenger; pendiente de enriquecer con fuentes fantasy."],
  sources: player.sources || ["Biwenger directo"],
  sourceSummary: player.sourceSummary || {}
}));

const setOcrStatus = (message, mode = "") => {
  const status = qs("#ocr-status");
  status.className = `ocr-status ${mode}`.trim();
  status.querySelector("span:last-child").textContent = message;
};

const setSourceStatus = (message, mode = "") => {
  const status = qs("#source-status");
  if (!status) return;
  status.className = `ocr-status source-status ${mode}`.trim();
  status.querySelector("span:last-child").textContent = message;
};

const setTeamStatus = (message, mode = "") => {
  const status = qs("#team-status");
  if (!status) return;
  status.className = `ocr-status ${mode}`.trim();
  status.querySelector("span:last-child").textContent = message;
};

const setLeagueOperationStatus = (message, mode = "") => {
  const status = qs("#league-operation-status");
  if (!status) return;
  status.className = `ocr-status league-operation-status ${mode}`.trim();
  status.querySelector("span:last-child").textContent = message;
};

const setApiConfigStatus = (message, mode = "") => {
  const status = qs("#api-config-status");
  if (!status) return;
  status.className = `ocr-status ${mode}`.trim();
  status.querySelector("span:last-child").textContent = message;
};

const setBiwengerStatus = (message, mode = "") => {
  const status = qs("#biwenger-status");
  if (!status) return;
  status.className = `ocr-status ${mode}`.trim();
  status.querySelector("span:last-child").textContent = message;
};

const setBiwengerBusy = (busy, label = "Conectar") => {
  state.biwenger.importing = busy;
  const loginButton = qs("#biwenger-login");
  const marketButton = qs("#biwenger-import-market");
  const teamButton = qs("#biwenger-import-team");
  const inlineMarketButton = qs("#market-refresh-inline");
  const inlineTeamButton = qs("#team-refresh-inline");
  const logoutButton = qs("#biwenger-logout");
  const syncButton = qs("#sync-biwenger");
  const leagueSelect = qs("#league-select");
  if (loginButton) {
    loginButton.disabled = busy;
    loginButton.innerHTML = `
      <span class="icon icon-team" aria-hidden="true"></span>
      ${label}
    `;
  }
  [marketButton, teamButton, inlineMarketButton, inlineTeamButton].forEach((button) => {
    if (!button) return;
    button.disabled = busy || !state.biwenger.connected;
  });
  if (logoutButton) logoutButton.disabled = busy || !state.biwenger.authenticated;
  if (syncButton) syncButton.disabled = busy;
  if (leagueSelect) leagueSelect.disabled = busy;
};

const setFutbolFantasyStatus = (message, mode = "") => {
  const status = qs("#ff-status");
  if (!status) return;
  status.className = `ocr-status ${mode}`.trim();
  status.querySelector("span:last-child").textContent = message;
};

const applyFutbolFantasySession = (payload = {}) => {
  state.futbolFantasy.connected = Boolean(payload.connected);
  state.futbolFantasy.userName = payload.userName || "";
  state.futbolFantasy.trackingUrl = payload.trackingUrl || "https://www.futbolfantasy.com/seguimiento";
  state.futbolFantasy.authMode = payload.authMode || "";
  document.body.classList.toggle("ff-connected", state.futbolFantasy.connected);
  const loginButton = qs("#ff-login");
  const cookieButton = qs("#ff-cookie-login");
  const syncButton = qs("#ff-sync-team");
  const openButton = qs("#ff-open-tracking");
  const logoutButton = qs("#ff-logout");
  if (loginButton) loginButton.disabled = state.futbolFantasy.syncing;
  if (cookieButton) cookieButton.disabled = state.futbolFantasy.syncing;
  if (syncButton) syncButton.disabled = state.futbolFantasy.syncing || !state.futbolFantasy.connected || !state.teamPlayers.length;
  if (openButton) openButton.disabled = state.futbolFantasy.syncing;
  if (logoutButton) logoutButton.disabled = state.futbolFantasy.syncing || !state.futbolFantasy.connected;
};

const setFutbolFantasyBusy = (busy, label = "Conectar FF") => {
  state.futbolFantasy.syncing = busy;
  const loginButton = qs("#ff-login");
  const cookieButton = qs("#ff-cookie-login");
  const syncButton = qs("#ff-sync-team");
  const openButton = qs("#ff-open-tracking");
  const logoutButton = qs("#ff-logout");
  if (loginButton) {
    loginButton.disabled = busy;
    loginButton.innerHTML = `
      <span class="icon icon-team" aria-hidden="true"></span>
      ${label}
    `;
  }
  if (cookieButton) cookieButton.disabled = busy;
  if (syncButton) syncButton.disabled = busy || !state.futbolFantasy.connected || !state.teamPlayers.length;
  if (openButton) openButton.disabled = busy;
  if (logoutButton) logoutButton.disabled = busy || !state.futbolFantasy.connected;
};

const syncApiConfigUi = () => {
  const input = qs("#api-base-url");
  if (!input) return;
  input.value = configuredApiBase();
  if (configuredApiBase()) {
    setApiConfigStatus(`API activa: ${configuredApiBase()}`, "ready");
  } else {
    setApiConfigStatus(
      canUseRelativeApi
        ? "Sin configurar. Si esta web no publica /api, indica aqui la URL del backend."
        : "Sin configurar. En movil nativo necesitas una URL publica para las fuentes.",
      ""
    );
  }
};

const reportOcrStatus = (message, mode = "") => {
  if (state.ocrTarget === "team") {
    setTeamStatus(message, mode);
    return;
  }
  setOcrStatus(message, mode);
};

const setLeagueStatus = (message) => {
  const status = qs("#league-status");
  if (status) status.textContent = message;
};

const setAnalyzeBusy = (busy, label = "Recalcular") => {
  state.isAnalyzing = busy;
  const button = qs("#analyze-market");
  button.disabled = busy;
  button.innerHTML = `
    <span class="icon icon-search" aria-hidden="true"></span>
    ${label}
  `;
};

const setSourceBusy = (busy, label = "Actualizar fuentes") => {
  state.isEnriching = busy;
  const button = qs("#refresh-sources");
  if (!button) return;
  button.disabled = busy || !state.players.length;
  button.innerHTML = `
    <span class="icon icon-refresh" aria-hidden="true"></span>
    ${label}
  `;
};

const setTeamBusy = (busy, label = "Guardar equipo") => {
  state.isAnalyzingTeam = busy;
  const button = qs("#analyze-team");
  if (!button) return;
  button.disabled = busy;
  button.innerHTML = `
    <span class="icon icon-search" aria-hidden="true"></span>
    ${label}
  `;
};

const refreshOcrAvailability = () => {
  if (window.Tesseract) {
    setOcrStatus("OCR local disponible como respaldo. La via principal es Biwenger directo.", "ready");
  } else {
    setOcrStatus("OCR no cargado. No pasa nada si entras por Biwenger directo.", "error");
  }
};

const refreshSourceDbStatus = async () => {
  if (!canUseApi()) {
    setSourceStatus(apiUnavailableMessage(), "error");
    return;
  }

  try {
    const response = await apiFetch("/api/source-status");
    if (!response.ok) {
      throw new Error(describeApiError(response.status, "/api/source-status"));
    }
    const status = await response.json();
    const sofaNote = status.sofascore?.blocked
      ? " SofaScore está bloqueando peticiones automáticas (403); se usa FutbolFantasy + identidad Biwenger."
      : "";
    const apiFootballNote = status.apiFootball?.configured
      ? " API-Football activo para minutos y sustituciones."
      : " API-Football no está configurado: faltarán minutos y sustituciones fiables.";
    setSourceStatus(
      status.totalPlayers
        ? `Base local lista: ${status.freshPlayers}/${status.totalPlayers} jugadores frescos (caduca cada ${status.ttlHours} h).${sofaNote}${apiFootballNote}`
        : `Base local lista. Se llenara al analizar el primer mercado.${sofaNote}${apiFootballNote}`,
      status.apiFootball?.configured ? "ready" : "error"
    );
    setApiConfigStatus(`API conectada: ${apiUrl("/api/source-status").replace("/api/source-status", "") || window.location.origin}`, "ready");
  } catch (error) {
    const message = error.message || "No se pudo leer el estado de fuentes.";
    setSourceStatus(message, "error");
    setApiConfigStatus(message, "error");
  }
};

const biwengerCompetitionToLocal = (competition) => {
  const value = normalize(competition);
  if (/(world|mundial|selecc)/.test(value)) return "worldcup";
  return "club";
};

const normalizeRemoteImageUrl = (value, base = "https://cdn.biwenger.com") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return `${base}${raw}`;
  if (/^(img|images|media|uploads|assets|i)\//i.test(raw)) return `${base}/${raw.replace(/^\/+/, "")}`;
  return "";
};

const safeRemoteImageUrl = (value) => normalizeRemoteImageUrl(value);
const biwengerLeagueIconUrl = (leagueId) => {
  const id = Number(leagueId || 0);
  return id > 0 ? `https://cdn.biwenger.com/i/l/${id}.png` : "";
};
const biwengerDefaultUserIconUrl = "https://cdn.biwenger.com/img/user.svg";

const entityIconUrl = (entity = {}) => {
  const direct = safeRemoteImageUrl(
    entity.icon || entity.avatar || entity.avatarUrl || entity.photo || entity.photoUrl
      || entity.image || entity.imageUrl || entity.logo || entity.badge || entity.shield
      || entity.profileImage || entity.profileImageUrl || ""
  );
  if (direct) return direct;
  return Number(entity.userId || 0) > 0 || (Number(entity.id || 0) > 0 && entity.isUser)
    ? biwengerDefaultUserIconUrl
    : "";
};

const renderEntityAvatar = (entity = {}, className = "") => {
  const name = String(entity.name || entity.leagueName || "Liga");
  const icon = entityIconUrl(entity);
  const classes = `entity-avatar ${className}`.trim();
  if (icon) {
    return `<span class="${escapeHtml(classes)}"><img src="${escapeHtml(icon)}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false" /><b hidden>${escapeHtml(initialsFor(name))}</b></span>`;
  }
  return `<span class="${escapeHtml(classes)}"><b>${escapeHtml(initialsFor(name))}</b></span>`;
};

const activeLeagueVisual = () => {
  const leagueName = activeLeagueName() || state.biwenger.leagueName || "Mi liga";
  const localLeague = activeLeague() || {};
  const remoteName = normalize(state.biwenger.leagueName);
  const localName = normalize(leagueName);
  const localBiwengerId = Number(localLeague.biwengerLeagueId || 0);
  const remoteMatches = state.biwenger.connected && Boolean(remoteName) && Boolean(localName)
    && (remoteName === localName || remoteName.includes(localName) || localName.includes(remoteName));
  const visualMatch = (state.biwenger.availableLeagues || []).find((league) => {
    if (localBiwengerId > 0 && Number(league.id || 0) === localBiwengerId) return true;
    const name = normalize(league.name);
    return name && localName && (name === localName || name.includes(localName) || localName.includes(name));
  });
  const fallbackIcon = biwengerLeagueIconUrl(localBiwengerId || visualMatch?.id || (remoteMatches ? state.biwenger.leagueId : 0));
  return {
    name: leagueName,
    icon: safeRemoteImageUrl(visualMatch?.icon || state.leagueOverview?.leagueIcon || localLeague.icon || (remoteMatches ? state.biwenger.leagueIcon : "")) || fallbackIcon,
    cover: safeRemoteImageUrl(visualMatch?.cover || state.leagueOverview?.leagueCover || localLeague.cover || (remoteMatches ? state.biwenger.leagueCover : "")) || fallbackIcon,
    remoteMatches,
    visualMatch
  };
};

const renderLeagueIdentity = () => {
  const visual = activeLeagueVisual();
  const leagueName = visual.name;
  const icon = safeRemoteImageUrl(visual.icon);
  const cover = safeRemoteImageUrl(visual.cover);
  const iconElements = [qs("#active-league-icon"), qs("#league-select-icon")].filter(Boolean);
  iconElements.forEach((iconElement) => {
    iconElement.src = icon || "assets/app-icon.png?v=5";
    iconElement.alt = icon ? `Icono de ${leagueName}` : "";
    iconElement.onerror = () => {
      iconElement.onerror = null;
      iconElement.src = "assets/app-icon.png?v=5";
    };
  });
  const title = qs("#active-league-title");
  const provider = qs("#active-league-provider");
  if (title) title.textContent = leagueName;
  if (provider) provider.textContent = visual.visualMatch || visual.remoteMatches ? "Liga Biwenger" : "Identidad local";
  const topbar = qs(".topbar");
  if (topbar) {
    topbar.style.setProperty("--league-cover", cover ? `url("${cover.replace(/["\\]/g, "\\$&")}")` : "none");
    topbar.classList.toggle("has-league-cover", Boolean(cover));
  }
};

const applyBiwengerSession = (payload) => {
  const boundLeagueId = Number(activeLeague()?.biwengerLeagueId || 0);
  const remoteLeagueId = Number(payload?.leagueId || 0);
  const selectedName = normalize(activeLeagueName());
  const remoteName = normalize(payload?.leagueName || "");
  const contextMatches = boundLeagueId > 0 && remoteLeagueId > 0
    ? boundLeagueId === remoteLeagueId
    : (!selectedName || !remoteName
      || selectedName === remoteName
      || selectedName.includes(remoteName)
      || remoteName.includes(selectedName));
  state.biwenger.authenticated = Boolean(payload?.connected);
  state.biwenger.connected = state.biwenger.authenticated && contextMatches;
  document.body.classList.toggle("biwenger-connected", state.biwenger.connected);
  state.biwenger.userId = Number(payload?.userId || payload?.id || 0) || null;
  state.biwenger.userName = payload?.userName || "";
  state.biwenger.leagueName = payload?.leagueName || "";
  state.biwenger.leagueId = remoteLeagueId || null;
  state.biwenger.leagueIcon = payload?.leagueIcon || "";
  state.biwenger.leagueCover = payload?.leagueCover || "";
  state.biwenger.availableLeagues = Array.isArray(payload?.availableLeagues)
    ? payload.availableLeagues
    : (payload?.connected ? state.biwenger.availableLeagues : []);
  state.biwenger.competition = payload?.competition || "";
  mergeFinance({
    balance: Number.isFinite(payload?.balance) ? payload.balance : state.finance.balance,
    teamValue: Number.isFinite(payload?.teamValue) ? payload.teamValue : state.finance.teamValue,
    maximumBid: Number.isFinite(payload?.maximumBid) ? payload.maximumBid : state.finance.maximumBid
  });
  if (state.biwenger.authenticated && activeLeague()) {
    const visual = activeLeagueVisual();
    const currentLeague = activeLeague();
    if (state.biwenger.connected && remoteLeagueId > 0) currentLeague.biwengerLeagueId = remoteLeagueId;
    if (visual.icon) currentLeague.icon = safeRemoteImageUrl(visual.icon);
    if (visual.cover) currentLeague.cover = safeRemoteImageUrl(visual.cover);
    saveLocalLeagueSnapshot();
  }
  const loginButton = qs("#biwenger-login");
  const marketButton = qs("#biwenger-import-market");
  const teamButton = qs("#biwenger-import-team");
  const inlineMarketButton = qs("#market-refresh-inline");
  const inlineTeamButton = qs("#team-refresh-inline");
  const logoutButton = qs("#biwenger-logout");
  if (loginButton) loginButton.disabled = state.biwenger.importing;
  [marketButton, teamButton, inlineMarketButton, inlineTeamButton].forEach((button) => {
    if (button) button.disabled = state.biwenger.importing || !state.biwenger.connected;
  });
  if (logoutButton) logoutButton.disabled = state.biwenger.importing || !state.biwenger.authenticated;
  renderLeagueIdentity();
};

const refreshBiwengerStatus = async (preferredMessage = "") => {
  if (!canUseApi()) {
    setBiwengerStatus("Necesitas publicar la API PHP para usar la conexion con Biwenger.", "error");
    return;
  }
  try {
    const response = await apiFetch("/api/biwenger/status");
    if (!response.ok) {
      throw new Error(describeApiError(response.status, "/api/biwenger/status"));
    }
    const payload = await response.json();
    applyBiwengerSession(payload);
    if (payload.connected) {
      const localCompetition = biwengerCompetitionToLocal(payload.competition);
      if (localCompetition !== state.competition) {
        state.competition = localCompetition;
        qs("#competition-select").value = state.competition;
      }
      setBiwengerStatus(
        preferredMessage || `Conectado como ${payload.userName || "usuario"} en ${payload.leagueName || "tu liga"}.`,
        "ready"
      );
      if (state.players.length && !hasUpcomingFixtureEvents()) {
        await loadLeagueFixtures(false);
      }
    } else {
      const message = preferredMessage || "Biwenger no conectado. Entra en Ajustes para iniciar sesion y traer mercado/equipo.";
      setBiwengerStatus(message, "");
      if (!state.players.length) setOcrStatus(message, "error");
    }
  } catch (error) {
    setBiwengerStatus(error.message || "No se pudo leer la sesion de Biwenger.", "error");
  }
};

const activeLeague = () => state.leagues.find((league) => league.id === state.activeLeagueId) || null;
const activeLeagueName = () => activeLeague()?.name?.trim() || "";

const applyLeague = (league) => {
  if (!league) return;
  const previousLeagueId = state.activeLeagueId;
  const previousLeagueFixtures = state.leagueFixtures;
  const previousLeagueOverview = state.leagueOverview;
  state.activeLeagueId = league.id;
  state.competition = league.competition || state.competition;
  state.scoring = league.scoring || state.scoring;
  state.weights = { ...state.weights, ...(league.weights || {}) };
  state.filters = { ...state.filters, ...(league.filters || {}) };
  state.preferences = {
    ...state.preferences,
    ...(league.preferences || {}),
    rewards: {
      ...(state.preferences.rewards || {}),
      ...(league.preferences?.rewards || {})
    }
  };
  state.players = Array.isArray(league.marketPlayers)
    ? league.marketPlayers.map(cleanWorldcupPlayerIdentity)
    : [];
  state.teamPlayers = Array.isArray(league.teamPlayers)
    ? league.teamPlayers.map(cleanWorldcupPlayerIdentity)
    : [];
  state.players = removeTeamPlayersFromMarket(state.players, state.teamPlayers);
  state.finance = {
    balance: null,
    teamValue: null,
    maximumBid: null,
    activeBids: 0,
    bidTotal: 0,
    updatedAt: "",
    ...(league.finance || {}),
    activeBids: 0,
    bidTotal: 0
  };
  state.selectedPlayerId = null;
  state.recommendedLineup = null;
  state.editableLineup = league.editableLineup || null;
  state.biwengerOperations = null;
  state.leagueOverview = league.leagueOverview || (previousLeagueId === league.id ? previousLeagueOverview : null);
  state.leagueFixtures = league.leagueFixtures || (previousLeagueId === league.id ? previousLeagueFixtures : null);
  state.liveRound = null;
  state.liveRoundDebug = null;
  state.selectedLiveRoundUserId = null;
  state.rivalTeam = null;
  renderLeagueIdentity();

  qs("#competition-select").value = state.competition;
  qs("#scoring-system").value = state.scoring;
  syncSettingsControls();
  qs("#market-text").value = state.players.map((player) =>
    `${player.name} - ${player.team || ""} - ${player.position || ""} - ${player.price || ""}`.trim()
  ).join("\n");
  qs("#team-text").value = state.teamPlayers.map((player) =>
    `${player.name} - ${player.team || ""} - ${player.position || ""} - ${player.price || ""}`.trim()
  ).join("\n");

  qs("#last-updated").textContent = league.updatedAt
    ? new Date(league.updatedAt).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "Sin mercado cargado";
  setTeamStatus(
    state.teamPlayers.length
      ? `Equipo guardado: ${state.teamPlayers.length} jugadores en ${league.name}.`
      : "Equipo pendiente de cargar para esta liga.",
    state.teamPlayers.length ? "ready" : ""
  );
  renderTable();
  renderTeam();
  renderLineup();
};

const renderLeagueSelector = () => {
  const select = qs("#league-select");
  if (!select) return;
  select.innerHTML = state.leagues.map((league) =>
    `<option value="${league.id}">${escapeHtml(league.name)}</option>`
  ).join("") || `<option value="">Sin ligas guardadas</option>`;
  select.value = state.activeLeagueId || "";
  const deleteButton = qs("#delete-league");
  if (deleteButton) deleteButton.disabled = !state.activeLeagueId;
  renderLeagueIdentity();
};

const applyLeaguePayload = (payload) => {
  state.leagues = payload.leagues || [];
  state.activeLeagueId = payload.activeLeagueId || state.leagues[0]?.id || null;
  renderLeagueSelector();
  applyLeague(activeLeague() || state.leagues[0]);
};

const mergeLeaguePayloads = (localPayload, remotePayload) => {
  const merged = new Map();
  (remotePayload?.leagues || []).forEach((league) => merged.set(league.id, league));
  (localPayload?.leagues || []).forEach((league) => {
    const remote = merged.get(league.id);
    merged.set(league.id, remote ? {
      ...remote,
      ...league,
      marketPlayers: league.marketPlayers?.length ? league.marketPlayers : remote.marketPlayers,
      teamPlayers: league.teamPlayers?.length ? league.teamPlayers : remote.teamPlayers,
      finance: { ...(remote.finance || {}), ...(league.finance || {}) },
      weights: { ...(remote.weights || {}), ...(league.weights || {}) },
      filters: { ...(remote.filters || {}), ...(league.filters || {}) },
      preferences: {
        ...(remote.preferences || {}),
        ...(league.preferences || {}),
        rewards: {
          ...(remote.preferences?.rewards || {}),
          ...(league.preferences?.rewards || {})
        }
      },
      icon: safeRemoteImageUrl(league.icon) || safeRemoteImageUrl(remote.icon) || null,
      cover: safeRemoteImageUrl(league.cover) || safeRemoteImageUrl(remote.cover) || null,
      biwengerLeagueId: league.biwengerLeagueId || remote.biwengerLeagueId || null,
      leagueFixtures: league.leagueFixtures || remote.leagueFixtures || null,
      leagueFixturesSavedAt: league.leagueFixturesSavedAt || remote.leagueFixturesSavedAt || null,
      leagueOverview: league.leagueOverview || remote.leagueOverview || null
    } : league);
  });
  const localActive = localPayload?.activeLeagueId;
  const remoteActive = remotePayload?.activeLeagueId;
  return {
    leagues: Array.from(merged.values()),
    activeLeagueId: localActive && merged.has(localActive)
      ? localActive
      : (remoteActive && merged.has(remoteActive) ? remoteActive : merged.keys().next().value || null)
  };
};

const loadLeagues = async () => {
  const localPayload = buildLocalLeaguePayload(ensureLocalLeagueDb());
  applyLeaguePayload(localPayload);
  setLeagueStatus("Ligas guardadas cargadas. Sincronizando servidor...");
  if (!canUseApi()) {
    setLeagueStatus("Guardado local en este dispositivo.");
    return;
  }

  try {
    const response = await apiFetch("/api/leagues");
    if (!response.ok) throw new Error("No se pudo cargar ligas");
    const payload = await response.json();
    const mergedPayload = mergeLeaguePayloads(localPayload, payload);
    applyLeaguePayload(mergedPayload);
    writeLocalLeagueDb({
      version: 1,
      activeLeagueId: mergedPayload.activeLeagueId,
      leagues: Object.fromEntries(mergedPayload.leagues.map((league) => [league.id, league]))
    });
    setLeagueStatus("Ligas locales y servidor sincronizados.");
    if (state.players.length) enrichCurrentMarket(hasStaleStarterSignals(state.players));
  } catch (error) {
    setLeagueStatus("Sin API remota. Usando ligas guardadas en este dispositivo.");
  }
};

const saveActiveLeague = async () => {
  if (!state.activeLeagueId) return;
  saveLocalLeagueSnapshot();
  if (!canUseApi()) {
    setLeagueStatus(`Guardado en dispositivo: ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`);
    return;
  }
  try {
    const response = await apiFetch("/api/leagues/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leagueId: state.activeLeagueId,
        name: activeLeagueName() || "Mi liga",
        competition: state.competition,
        scoring: state.scoring,
        marketPlayers: state.players,
        teamPlayers: state.teamPlayers,
        finance: state.finance,
        weights: state.weights,
        filters: state.filters,
        preferences: state.preferences,
        icon: activeLeague()?.icon || activeLeagueVisual().icon || null,
        cover: activeLeague()?.cover || activeLeagueVisual().cover || null,
        biwengerLeagueId: activeLeague()?.biwengerLeagueId || null,
        editableLineup: state.editableLineup
      })
    });
    if (!response.ok) throw new Error("No se pudo guardar");
    const payload = await response.json();
    const mergedPayload = mergeLeaguePayloads(buildLocalLeaguePayload(ensureLocalLeagueDb()), payload);
    mergedPayload.activeLeagueId = state.activeLeagueId;
    applyLeaguePayload(mergedPayload);
    writeLocalLeagueDb({
      version: 1,
      activeLeagueId: state.activeLeagueId,
      leagues: Object.fromEntries(state.leagues.map((league) => [league.id, league]))
    });
    setLeagueStatus(`Guardado: ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`);
  } catch (error) {
    setLeagueStatus("Guardado en dispositivo. API remota no disponible.");
  }
};

let leagueSettingsSaveTimer = null;
const persistLeagueSettings = () => {
  saveLocalLeagueSnapshot();
  window.clearTimeout(leagueSettingsSaveTimer);
  leagueSettingsSaveTimer = window.setTimeout(() => {
    saveActiveLeague();
  }, 600);
};

const createLeagueFromInput = async () => {
  const nameInput = qs("#league-name");
  const button = qs("#create-league");
  const name = nameInput?.value.trim() || "";
  if (!name) {
    setLeagueStatus("Escribe un nombre para crear la liga.");
    nameInput?.focus();
    return;
  }

  const localPayload = createLocalLeague(name);
  applyLeaguePayload(localPayload);
  const localLeagueId = state.activeLeagueId;
  if (nameInput) nameInput.value = "";
  setLeagueStatus(`Liga creada en este dispositivo: ${name}.`);

  if (!canUseApi()) return;

  if (button) button.disabled = true;
  try {
    const response = await apiFetch("/api/leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, competition: state.competition, scoring: state.scoring })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `API no disponible para crear ligas (${response.status}).`);
    }
    const payload = await response.json();
    const mergedPayload = mergeLeaguePayloads(buildLocalLeaguePayload(ensureLocalLeagueDb()), payload);
    if (payload.activeLeagueId && payload.activeLeagueId !== localLeagueId) {
      mergedPayload.leagues = (mergedPayload.leagues || []).filter((league) => league.id !== localLeagueId);
    }
    mergedPayload.activeLeagueId = payload.activeLeagueId || state.activeLeagueId || mergedPayload.activeLeagueId;
    applyLeaguePayload(mergedPayload);
    writeLocalLeagueDb({
      version: 1,
      activeLeagueId: state.activeLeagueId,
      leagues: Object.fromEntries(state.leagues.map((league) => [league.id, league]))
    });
    setLeagueStatus(`Liga creada y sincronizada: ${name}.`);
  } catch (error) {
    setLeagueStatus(`Liga creada localmente. No se pudo sincronizar: ${error.message || "API no disponible"}.`);
  } finally {
    if (button) button.disabled = false;
  }
};

const deleteActiveLeague = async () => {
  if (!state.activeLeagueId) return;
  const league = activeLeague();
  const leagueName = league?.name || "esta liga";
  if (!window.confirm(`Se eliminara ${leagueName} de la app. Esta accion no toca tu cuenta de Biwenger. Continuar?`)) {
    return;
  }

  if (!canUseApi()) {
    applyLeaguePayload(deleteLocalLeague(state.activeLeagueId));
    setLeagueStatus(`Liga eliminada en este dispositivo: ${leagueName}.`);
    renderTable();
    renderTeam();
    renderLineup();
    return;
  }

  try {
    const response = await apiFetch("/api/leagues/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId: state.activeLeagueId })
    });
    if (!response.ok) throw new Error("No se pudo eliminar la liga");
    const payload = await response.json();
    const localAfterDelete = deleteLocalLeague(state.activeLeagueId);
    applyLeaguePayload(mergeLeaguePayloads(localAfterDelete, payload));
    writeLocalLeagueDb({
      version: 1,
      activeLeagueId: state.activeLeagueId,
      leagues: Object.fromEntries(state.leagues.map((item) => [item.id, item]))
    });
    setLeagueStatus(`Liga eliminada: ${leagueName}.`);
    renderTable();
    renderTeam();
    renderLineup();
  } catch (error) {
    setLeagueStatus(error.message || "No se pudo eliminar la liga.");
  }
};

const mergeSourceSummaries = (localSummary = {}, sourceSummary = {}) => {
  const localRecent = Array.isArray(localSummary.recentMatches) ? localSummary.recentMatches : [];
  const sourceRecent = Array.isArray(sourceSummary.recentMatches) ? sourceSummary.recentMatches : [];
  const localHasBiwengerRecent = localRecent.some((match) => match?.provider === "biwenger" || Number.isFinite(Number(match?.points?.biwenger)));
  return {
    ...localSummary,
    ...sourceSummary,
    biwenger: { ...(localSummary.biwenger || {}), ...(sourceSummary.biwenger || {}) },
    fantasy: { ...(localSummary.fantasy || {}), ...(sourceSummary.fantasy || {}) },
    identity: sourceSummary.identity || localSummary.identity || null,
    recentMatches: localHasBiwengerRecent ? localRecent : (sourceRecent.length ? sourceRecent : localRecent)
  };
};

const hasUsefulFantasySignals = (summary = {}) => {
  const fantasy = summary?.fantasy;
  if (!fantasy || typeof fantasy !== "object") return false;
  return Boolean(
    Number.isFinite(Number(fantasy.nextStarterProbability))
    || Number.isFinite(Number(fantasy.seasonStartRate))
    || Number.isFinite(Number(fantasy.teamLineupProbability))
    || Number.isFinite(Number(fantasy.seasonMinutesRate))
    || Object.values(fantasy.points || {}).some((value) => Number.isFinite(Number(value)))
    || fantasy.usedForStarter
    || fantasy.calledUp
  );
};

const mergeSourceLinks = (localLinks = {}, sourceLinks = {}) => ({
  ...(localLinks || {}),
  ...Object.fromEntries(Object.entries(sourceLinks || {}).filter(([, value]) => Boolean(value)))
});

const mergePlayerMedia = (localMedia = {}, sourceMedia = {}) => ({
  ...Object.fromEntries(Object.entries(sourceMedia || {}).filter(([, value]) => Boolean(value))),
  ...Object.fromEntries(Object.entries(localMedia || {}).filter(([, value]) => Boolean(value)))
});

const mergeSourcePlayer = (localPlayer, sourcePlayer) => {
  if (!sourcePlayer || sourcePlayer.sourceStatus !== "live") {
    const sourceError = sourcePlayer?.error;
    return sourceError
      ? {
        ...localPlayer,
        riskReasons: Array.from(new Set([...(localPlayer.riskReasons || []), sourceError])),
        sources: Array.from(new Set([...(localPlayer.sources || []), "SofaScore sin coincidencia fiable"]))
      }
      : localPlayer;
  }

  const sourceReasons = sourcePlayer.riskReasons || [];
  const sourceSources = sourcePlayer.sources || [];
  const preserveFantasySignals = hasUsefulFantasySignals(localPlayer.sourceSummary)
    && !hasUsefulFantasySignals(sourcePlayer.sourceSummary);

  const merged = {
    ...localPlayer,
    ...sourcePlayer,
    id: localPlayer.id,
    position: localPlayer.biwengerPosition || sourcePlayer.position || localPlayer.position,
    biwengerPosition: localPlayer.biwengerPosition || null,
    competitionPoints: Number(localPlayer.competitionPoints || 0),
    price: localPlayer.price || sourcePlayer.price || 0,
    salePrice: localPlayer.salePrice || localPlayer.price || 0,
    biwengerPlayerId: localPlayer.biwengerPlayerId || sourcePlayer.biwengerPlayerId || null,
    marketOwnerId: Number(localPlayer.marketOwnerId || 0),
    marketOwnerName: localPlayer.marketOwnerName || sourcePlayer.marketOwnerName || "",
    marketSellerType: localPlayer.marketSellerType || sourcePlayer.marketSellerType || "free",
    marketSellerLabel: localPlayer.marketSellerLabel || sourcePlayer.marketSellerLabel || "",
    offerId: localPlayer.offerId || sourcePlayer.offerId || null,
    biwengerValue: localPlayer.biwengerValue || sourcePlayer.biwengerValue || localPlayer.price || 0,
    biwengerDiff: Number.isFinite(sourcePlayer.biwengerDiff) ? sourcePlayer.biwengerDiff : localPlayer.biwengerDiff,
    bidAmount: localPlayer.bidAmount ?? null,
    bidCount: localPlayer.bidCount || 0,
    bidCountSource: localPlayer.bidCountSource || sourcePlayer.bidCountSource || "",
    bidStatus: localPlayer.bidStatus || null,
    hasBid: Boolean(localPlayer.hasBid),
    myBidAmount: localPlayer.myBidAmount ?? localPlayer.bidAmount ?? null,
    myBidStatus: localPlayer.myBidStatus || localPlayer.bidStatus || null,
    rivalBids: localPlayer.rivalBids || [],
    rivalBidCount: localPlayer.rivalBidCount || 0,
    highestRivalBid: localPlayer.highestRivalBid ?? null,
    rivalBidVisibility: localPlayer.rivalBidVisibility || "hidden",
    originalName: localPlayer.name,
    sources: Array.from(new Set([...(localPlayer.sources || []), ...sourceSources])),
    riskReasons: Array.from(new Set(sourceReasons)),
    sourceLinks: mergeSourceLinks(localPlayer.sourceLinks, sourcePlayer.sourceLinks),
    sourceSummary: mergeSourceSummaries(localPlayer.sourceSummary, sourcePlayer.sourceSummary),
    media: mergePlayerMedia(localPlayer.media, sourcePlayer.media),
    referenceValue: sourcePlayer.referenceValue || null
  };

  if (!preserveFantasySignals) return merged;

  return {
    ...merged,
    starter: localPlayer.starter,
    form: localPlayer.form,
    asScore: localPlayer.asScore,
    sofascore: localPlayer.sofascore,
    stats: localPlayer.stats,
    risk: localPlayer.risk || merged.risk,
    riskReasons: Array.from(new Set([
      ...(localPlayer.riskReasons || []),
      "Se conserva titularidad FutbolFantasy previa: el refresco no devolvio una señal FF mejor"
    ])),
    dataConfidence: Math.max(Number(localPlayer.dataConfidence || 0), Number(merged.dataConfidence || 0)),
    note: localPlayer.note || merged.note,
    sources: Array.from(new Set([...(merged.sources || []), "FutbolFantasy conservado"]))
  };
};

const playerMergeKey = (player) => {
  const biwengerId = Number(player.biwengerPlayerId || 0);
  if (biwengerId > 0) return `bw:${biwengerId}`;
  return `txt:${normalize(player.name)}:${normalize(player.team)}:${player.position || ""}`;
};

const normalizedPlayerName = (player) => normalize(player?.name || "")
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const playerPositionMatches = (left, right) => {
  const leftPosition = String(left?.biwengerPosition || left?.position || "").toUpperCase();
  const rightPosition = String(right?.biwengerPosition || right?.position || "").toUpperCase();
  return !leftPosition || !rightPosition || leftPosition === rightPosition;
};

const meaningfulPlayerTeams = (player) => [player?.team, player?.nationalTeam, player?.clubTeam, player?.baseTeam]
  .filter(Boolean)
  .filter((team) => !/^sin (seleccion|equipo|club)$/i.test(normalize(team)));

const playerTeamMatches = (left, right) => {
  const leftTeams = meaningfulPlayerTeams(left);
  const rightTeams = meaningfulPlayerTeams(right);
  if (!leftTeams.length || !rightTeams.length) return true;
  return leftTeams.some((leftTeam) => rightTeams.some((rightTeam) => teamNameMatchScore(leftTeam, rightTeam) >= 68));
};

const playerIdentityMatches = (left, right) => {
  const leftId = Number(left?.biwengerPlayerId || 0);
  const rightId = Number(right?.biwengerPlayerId || 0);
  if (leftId > 0 && rightId > 0) return leftId === rightId;

  const leftName = normalizedPlayerName(left);
  const rightName = normalizedPlayerName(right);
  if (!leftName || !rightName) return false;
  if (leftName === rightName) return true;
  if (!playerPositionMatches(left, right) || !playerTeamMatches(left, right)) return false;

  const leftLongEnough = leftName.length >= 5;
  const rightLongEnough = rightName.length >= 5;
  if (leftLongEnough && rightLongEnough && (leftName.includes(rightName) || rightName.includes(leftName))) return true;

  const leftTokens = new Set(leftName.split(" ").filter((token) => token.length >= 5));
  const rightTokens = new Set(rightName.split(" ").filter((token) => token.length >= 5));
  return [...leftTokens].some((token) => rightTokens.has(token));
};

const teamPlayerForMarketPlayer = (player, teamPlayers = state.teamPlayers) =>
  (teamPlayers || []).find((teamPlayer) => playerIdentityMatches(player, teamPlayer)) || null;

const playerIsAlreadyInTeam = (player) => Boolean(teamPlayerForMarketPlayer(player));

const removeTeamPlayersFromMarket = (marketPlayers = state.players, teamPlayers = state.teamPlayers) =>
  (marketPlayers || []).filter((player) => !teamPlayerForMarketPlayer(player, teamPlayers));

const mergeFreshBiwengerPlayers = (freshPlayers, previousPlayers = state.players) => {
  const previousByKey = new Map((previousPlayers || []).map((player) => [playerMergeKey(player), player]));
  return freshPlayers.map((fresh) => {
    const previous = previousByKey.get(playerMergeKey(fresh));
    if (!previous) return fresh;
    const previousHasFantasy = hasUsefulFantasySignals(previous.sourceSummary);
    const previousIsLive = previous.sourceStatus === "live";
    const previousHealthKnown = previous.health && !["unknown", ""].includes(String(previous.health.status || ""));
    return {
      ...previous,
      ...fresh,
      media: mergePlayerMedia(previous.media, fresh.media),
      sourceLinks: { ...(fresh.sourceLinks || {}), ...(previous.sourceLinks || {}) },
      sourceSummary: mergeSourceSummaries(previous.sourceSummary, fresh.sourceSummary),
      sourceStatus: previousIsLive ? "live" : (fresh.sourceStatus || previous.sourceStatus),
      dataConfidence: Math.max(Number(previous.dataConfidence || 0), Number(fresh.dataConfidence || 0)),
      starter: previousHasFantasy ? previous.starter : (previous.starter ?? fresh.starter),
      form: previousHasFantasy ? previous.form : (previous.form ?? fresh.form),
      asScore: previousHasFantasy ? previous.asScore : (previous.asScore ?? fresh.asScore),
      sofascore: previousHasFantasy ? previous.sofascore : (previous.sofascore ?? fresh.sofascore),
      stats: previousHasFantasy ? previous.stats : (previous.stats ?? fresh.stats),
      risk: previousIsLive ? previous.risk : (fresh.risk || previous.risk),
      riskReasons: previousIsLive ? previous.riskReasons : (fresh.riskReasons || previous.riskReasons),
      sources: Array.from(new Set([...(previous.sources || []), ...(fresh.sources || [])])),
      health: previousHealthKnown ? previous.health : (fresh.health || previous.health),
      note: previousIsLive ? previous.note : (fresh.note || previous.note)
    };
  });
};

const enrichPlayerList = async (players, forceRefresh = false) => {
  const response = await apiFetch("/api/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      competition: state.competition,
      forceRefresh,
      players: players.map((player) => ({
        id: player.id,
        biwengerPlayerId: player.biwengerPlayerId,
        name: player.name,
        team: player.team,
        clubTeam: player.clubTeam,
        position: player.position,
        price: player.price,
        nationalTeam: player.nationalTeam,
        media: player.media,
        sourceLinks: player.sourceLinks
      }))
    })
  });

  if (!response.ok) {
    throw new Error(describeApiError(response.status, "/api/enrich"));
  }

  const payload = await response.json();
  const sourceById = new Map((payload.enriched || []).map((player) => [player.clientId, player]));
  return {
    payload,
    players: players.map((player) => mergeSourcePlayer(player, sourceById.get(player.id)))
  };
};

const enrichPlayerListBatched = async (players, forceRefresh = false, onProgress = null) => {
  const passthrough = players.filter((player) => player.position === "ENT");
  const candidates = players.filter((player) => player.position !== "ENT");
  const enrichedById = new Map(passthrough.map((player) => [player.id, player]));
  const totals = { cacheHits: 0, refreshed: 0, liveCount: 0, failedBatches: 0, errors: [] };
  const batchSize = 5;

  for (let index = 0; index < candidates.length; index += batchSize) {
    const batch = candidates.slice(index, index + batchSize);
    try {
      const result = await enrichPlayerList(batch, forceRefresh);
      result.players.forEach((player) => enrichedById.set(player.id, player));
      totals.cacheHits += Number(result.payload.cacheHits || 0);
      totals.refreshed += Number(result.payload.refreshed || 0);
      totals.liveCount += Number(result.payload.liveCount || 0);
    } catch (error) {
      totals.failedBatches += 1;
      totals.errors.push(error.message || "Lote sin actualizar");
      batch.forEach((player) => enrichedById.set(player.id, player));
    }
    if (onProgress) onProgress(Math.min(index + batch.length, candidates.length), candidates.length);
  }

  return {
    payload: totals,
    players: players.map((player) => enrichedById.get(player.id) || player)
  };
};

const enrichCurrentMarket = async (forceRefresh = false) => {
  if (!state.players.length || state.isEnriching) return;
  if (!canUseApi()) {
    setSourceStatus(apiUnavailableMessage(), "error");
    return;
  }

  setSourceBusy(true, forceRefresh ? "Actualizando" : "Consultando");
  setSourceStatus(
    forceRefresh
      ? "Actualizando fuentes sin borrar datos buenos previos..."
      : "Consultando base local diaria y fuentes si falta algun dato...",
    "busy"
  );

  try {
    if (forceRefresh && state.biwenger.connected) {
      try {
        setSourceStatus("Releyendo mercado real de Biwenger antes de consultar fuentes...", "busy");
        const importResponse = await apiFetch("/api/biwenger/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "market" })
        });
        const importPayload = await importResponse.json().catch(() => ({}));
        if (importResponse.ok && Array.isArray(importPayload.players) && importPayload.players.length) {
          const freshPlayers = hydrateImportedPlayers(importPayload.players || []);
          state.players = removeTeamPlayersFromMarket(mergeFreshBiwengerPlayers(freshPlayers, state.players), state.teamPlayers);
          mergeFinance(importPayload.finance || {});
          qs("#market-text").value = biwengerPlayersToText(state.players);
          renderFinance();
        } else if (!importResponse.ok) {
          setSourceStatus("No se pudo releer Biwenger; se refrescan fuentes sobre el mercado actual.", "busy");
        }
      } catch (error) {
        setSourceStatus("Biwenger no respondió al releer mercado; se refrescan fuentes sobre el mercado actual.", "busy");
      }
    }

    const { payload, players } = await enrichPlayerListBatched(state.players, forceRefresh, (done, total) => {
      setSourceStatus(`Actualizando fuentes por lotes: ${done}/${total} jugadores...`, "busy");
    });
    state.players = removeTeamPlayersFromMarket(players, state.teamPlayers);
    const liveCount = state.players.filter((player) => player.sourceStatus === "live").length;
    const cacheHits = payload.cacheHits || 0;
    const refreshed = payload.refreshed || 0;
    const failedBatches = payload.failedBatches || 0;

    setSourceStatus(
      liveCount
        ? `Fuentes aplicadas: ${liveCount}/${state.players.length}. Cache: ${cacheHits}; actualizados: ${refreshed}.${failedBatches ? ` ${failedBatches} lote(s) conservan datos anteriores.` : ""}`
        : "No se han encontrado coincidencias fiables; se mantiene estimacion conservadora.",
      liveCount ? "ready" : "error"
    );
    if (forceRefresh && state.biwenger.connected) {
      try {
        await loadLeagueFixtures(false);
      } catch (error) {
        setLeagueOperationStatus("Fuentes actualizadas, pero no se pudo refrescar el calendario.", "error");
      }
    }
    renderTable();
    await saveActiveLeague();
  } catch (error) {
    setSourceStatus(`${error.message || "No se pudieron consultar fuentes"}. Se mantiene estimacion local.`, "error");
  } finally {
    setSourceBusy(false);
  }
};

const biwengerLogin = async () => {
  const email = qs("#biwenger-email")?.value.trim();
  const password = qs("#biwenger-password")?.value || "";
  if (!email || !password) {
    setBiwengerStatus("Necesito email y contrasena para conectar con Biwenger.", "error");
    return;
  }
  setBiwengerBusy(true, "Conectando");
  setBiwengerStatus("Abriendo sesion con Biwenger...", "busy");
  try {
    const response = await apiFetch("/api/biwenger/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        preferredLeagueName: activeLeagueName()
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || describeApiError(response.status, "/api/biwenger/login"));
    }
    applyBiwengerSession(payload);
    if (payload.competition) {
      state.competition = biwengerCompetitionToLocal(payload.competition);
      qs("#competition-select").value = state.competition;
    }
    const passwordInput = qs("#biwenger-password");
    if (passwordInput) passwordInput.value = "";
    await saveActiveLeague();
    setBiwengerStatus(`Sesion conectada: ${payload.userName || "usuario"} en ${payload.leagueName || "tu liga"}.`, "ready");
  } catch (error) {
    setBiwengerStatus(error.message || "No se pudo iniciar sesion en Biwenger.", "error");
  } finally {
    setBiwengerBusy(false);
  }
};

const refreshFutbolFantasyStatus = async () => {
  if (!canUseApi()) {
    setFutbolFantasyStatus("Necesitas publicar la API PHP para conectar Futbol Fantasy.", "error");
    return;
  }
  try {
    const response = await apiFetch("/api/futbolfantasy/status");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || describeApiError(response.status, "/api/futbolfantasy/status"));
    applyFutbolFantasySession(payload);
    if (!payload.connected && payload.loginBlocked) {
      const until = payload.loginBlockedUntil
        ? new Date(payload.loginBlockedUntil).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
        : "";
      setFutbolFantasyStatus(
        `Futbol Fantasy esta limitando el login automatico${until ? ` hasta ${until}` : ""}. Mientras tanto se mantienen fuentes publicas y fallback API-Football.`,
        "error"
      );
      return;
    }
    const modeText = payload.authMode === "manual-cookie" ? "con cookie de sesion" : `como ${payload.userName || "usuario"}`;
    setFutbolFantasyStatus(
      payload.connected
        ? `Futbol Fantasy conectado ${modeText}. Minutos y sustituciones se consultaran ahi primero.`
        : "FF privado no conectado. La app usara fuentes publicas de FutbolFantasy, Biwenger y API-Football; la conexion privada queda como opcion avanzada de escritorio.",
      payload.connected ? "ready" : ""
    );
  } catch (error) {
    setFutbolFantasyStatus(error.message || "No se pudo leer la sesion de Futbol Fantasy.", "error");
  }
};

const futbolFantasyLogin = async () => {
  const email = qs("#ff-email")?.value.trim();
  const password = qs("#ff-password")?.value || "";
  if (!email || !password) {
    setFutbolFantasyStatus("Necesito email y contrasena para conectar con Futbol Fantasy.", "error");
    return;
  }
  setFutbolFantasyBusy(true, "Conectando");
  setFutbolFantasyStatus("Abriendo sesion con Futbol Fantasy...", "busy");
  try {
    const response = await apiFetch("/api/futbolfantasy/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || describeApiError(response.status, "/api/futbolfantasy/login"));
    }
    const passwordInput = qs("#ff-password");
    if (passwordInput) passwordInput.value = "";
    applyFutbolFantasySession(payload);
    setFutbolFantasyStatus(`Futbol Fantasy conectado: ${payload.userName || "usuario"}.`, "ready");
  } catch (error) {
    const message = String(error.message || "");
    setFutbolFantasyStatus(
      /captcha|validacion manual|no ha aceptado la sesion/i.test(message)
        ? "Futbol Fantasy bloquea el login automatico. Inicia sesion en FF desde el navegador, copia la cabecera Cookie y pulsa Usar cookie."
        : (message || "No se pudo iniciar sesion en Futbol Fantasy."),
      "error"
    );
  } finally {
    setFutbolFantasyBusy(false);
  }
};

const futbolFantasyCookieLogin = async () => {
  const cookie = qs("#ff-session-cookie")?.value.trim() || "";
  if (!cookie) {
    setFutbolFantasyStatus("Pega la cookie de sesion de Futbol Fantasy para validarla.", "error");
    return;
  }
  setFutbolFantasyBusy(true, "Validando");
  setFutbolFantasyStatus("Validando cookie de Futbol Fantasy contra Seguimiento...", "busy");
  try {
    const response = await apiFetch("/api/futbolfantasy/session-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookie, competition: state.competition })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || describeApiError(response.status, "/api/futbolfantasy/session-cookie"));
    }
    const cookieInput = qs("#ff-session-cookie");
    if (cookieInput) cookieInput.value = "";
    applyFutbolFantasySession(payload);
    setFutbolFantasyStatus("Futbol Fantasy conectado con cookie de sesion. Seguimiento queda disponible como fuente.", "ready");
  } catch (error) {
    setFutbolFantasyStatus(error.message || "No se pudo validar la cookie de Futbol Fantasy.", "error");
  } finally {
    setFutbolFantasyBusy(false);
  }
};

const futbolFantasyLogout = async () => {
  setFutbolFantasyBusy(true, "Cerrando");
  try {
    const response = await apiFetch("/api/futbolfantasy/logout", { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || describeApiError(response.status, "/api/futbolfantasy/logout"));
    const passwordInput = qs("#ff-password");
    if (passwordInput) passwordInput.value = "";
    applyFutbolFantasySession({ connected: false });
    setFutbolFantasyStatus("Sesion de Futbol Fantasy cerrada.", "ready");
  } catch (error) {
    setFutbolFantasyStatus(error.message || "No se pudo cerrar Futbol Fantasy.", "error");
  } finally {
    setFutbolFantasyBusy(false);
  }
};

const openFutbolFantasyTracking = () => {
  window.open(state.futbolFantasy.trackingUrl || "https://www.futbolfantasy.com/seguimiento", "_blank", "noopener");
};

const syncTeamToFutbolFantasy = async () => {
  if (!state.futbolFantasy.connected) {
    setFutbolFantasyStatus("Conecta Futbol Fantasy desde Ajustes antes de enviar el equipo.", "error");
    return;
  }
  if (!state.teamPlayers.length) {
    setFutbolFantasyStatus("No hay plantilla cargada para enviar a Futbol Fantasy.", "error");
    return;
  }
  setFutbolFantasyBusy(true, "Enviando");
  setFutbolFantasyStatus("Preparando tu plantilla para Seguimiento de Futbol Fantasy...", "busy");
  try {
    const response = await apiFetch("/api/futbolfantasy/sync-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        competition: state.competition,
        scoring: state.scoring,
        players: state.teamPlayers.map((player) => ({
          name: player.name,
          team: player.team,
          position: player.position,
          biwengerPlayerId: player.biwengerPlayerId || null
        }))
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || describeApiError(response.status, "/api/futbolfantasy/sync-team"));
    }
    applyFutbolFantasySession(payload);
    setFutbolFantasyStatus(payload.message || "Equipo enviado/preparado en Futbol Fantasy.", "ready");
  } catch (error) {
    setFutbolFantasyStatus(error.message || "No se pudo preparar el equipo en Futbol Fantasy.", "error");
  } finally {
    setFutbolFantasyBusy(false);
  }
};

const importFromBiwenger = async (kind) => {
  if (!state.biwenger.connected) {
    setBiwengerStatus("Primero conecta tu cuenta de Biwenger.", "error");
    return false;
  }
  const label = kind === "team" ? "Trayendo equipo" : "Trayendo mercado";
  setBiwengerBusy(true, label);
  setBiwengerStatus(kind === "team" ? "Importando tu plantilla real..." : "Importando el mercado real...", "busy");
  try {
    const response = await apiFetch("/api/biwenger/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || describeApiError(response.status, "/api/biwenger/import"));
    }

    const importedPlayers = hydrateImportedPlayers(payload.players || []);
    mergeFinance(payload.finance || {});
    if (payload.competition) {
      state.competition = biwengerCompetitionToLocal(payload.competition);
      qs("#competition-select").value = state.competition;
    }

    if (kind === "team") {
      state.teamPlayers = importedPlayers;
      state.players = removeTeamPlayersFromMarket(state.players, state.teamPlayers);
      state.editableLineup = null;
      qs("#team-text").value = biwengerPlayersToText(importedPlayers);
      qs("#market-text").value = biwengerPlayersToText(state.players);
      renderTeam();
      renderLineup();
      renderTable();
      setTeamStatus(`Plantilla importada desde Biwenger: ${importedPlayers.length} jugadores.`, importedPlayers.length ? "ready" : "error");
      if (importedPlayers.length && canUseApi()) {
        const { players: enriched } = await enrichPlayerListBatched(importedPlayers, false, (done, total) => {
          setTeamStatus(`Enriqueciendo plantilla: ${done}/${total} jugadores...`, "busy");
        });
        state.teamPlayers = enriched;
        state.players = removeTeamPlayersFromMarket(state.players, state.teamPlayers);
        qs("#market-text").value = biwengerPlayersToText(state.players);
        renderTeam();
        renderLineup();
        renderTable();
        setTeamStatus(`Plantilla importada y enriquecida: ${state.teamPlayers.length} jugadores.`, "ready");
      }
    } else {
      state.players = removeTeamPlayersFromMarket(mergeFreshBiwengerPlayers(importedPlayers, state.players), state.teamPlayers);
      state.selectedPlayerId = null;
      qs("#market-text").value = biwengerPlayersToText(state.players);
      qs("#last-updated").textContent = new Date().toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
      renderTable();
      setOcrStatus(`Mercado importado desde Biwenger: ${importedPlayers.length} jugadores.`, importedPlayers.length ? "ready" : "error");
      if (importedPlayers.length) {
        await enrichCurrentMarket(false);
        await loadLeagueFixtures(false);
        await loadBiwengerOperations(false);
      }
    }

    renderFinance();
    await saveActiveLeague();
    await refreshBiwengerStatus(
      kind === "team"
        ? `Equipo importado desde ${payload.leagueName || state.biwenger.leagueName || "Biwenger"}.`
        : `Mercado importado desde ${payload.leagueName || state.biwenger.leagueName || "Biwenger"}.`
    );
    return true;
  } catch (error) {
    const message = error.message || "No se pudo importar desde Biwenger.";
    if (kind === "team") {
      setTeamStatus(message, "error");
    } else {
      setOcrStatus(message, "error");
    }
    setBiwengerStatus(message, "error");
    return false;
  } finally {
    setBiwengerBusy(false);
  }
};

const syncSelectedLeagueWithBiwenger = async () => {
  if (!state.biwenger.authenticated || !activeLeagueName()) return false;
  const leagueName = activeLeagueName();
  setBiwengerBusy(true, "Cambiando liga");
  setBiwengerStatus(`Cambiando a ${leagueName} y actualizando datos...`, "busy");
  setLeagueStatus(`Sincronizando ${leagueName} con Biwenger...`);
  try {
    const response = await apiFetch("/api/biwenger/switch-league", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferredLeagueName: leagueName,
        preferredLeagueId: Number(activeLeague()?.biwengerLeagueId || 0)
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "No se pudo cambiar la liga activa de Biwenger.");
    }
    applyBiwengerSession(payload);
    const marketImported = await importFromBiwenger("market");
    const teamImported = await importFromBiwenger("team");
    await loadBiwengerOperations(false);
    if (!marketImported || !teamImported) {
      throw new Error(`Liga cambiada a ${payload.leagueName || leagueName}, pero no se pudieron actualizar todos sus datos.`);
    }
    const message = `${payload.leagueName || leagueName}: mercado, equipo y operaciones actualizados.`;
    setBiwengerStatus(message, "ready");
    setLeagueStatus(message);
    return true;
  } catch (error) {
    const message = error.message || "No se pudo sincronizar la liga seleccionada con Biwenger.";
    state.biwenger.connected = false;
    document.body.classList.remove("biwenger-connected");
    setBiwengerStatus(message, "error");
    setLeagueStatus(message);
    return false;
  } finally {
    setBiwengerBusy(false);
  }
};

const placeBiwengerBid = async (form, options = {}) => {
  const playerId = Number(form.dataset.bidPlayerId || 0);
  const toUserId = Number(form.dataset.bidOwnerId || 0);
  const amountInput = form.querySelector(".bid-amount-input");
  const amount = parseCurrencyInput(amountInput?.value);
  const minimum = Number(form.dataset.minimumBid || 1);
  const button = options.button || form.querySelector(".place-bid-button");
  const idleText = options.buttonText || "Enviar a Biwenger";
  if (!playerId || amount < minimum) {
    const message = `La puja minima para este jugador es ${formatFinanceMoney(minimum)}.`;
    setOcrStatus(message, "error");
    setLeagueOperationStatus(message, "error");
    amountInput?.focus();
    return;
  }
  const maximumBid = Number(state.finance.maximumBid);
  if (Number.isFinite(maximumBid) && maximumBid > 0 && amount > maximumBid) {
    const message = `Tu puja maxima actual es ${formatFinanceMoney(maximumBid)}. Acepta ofertas, vende jugadores o baja el importe.`;
    setOcrStatus(message, "error");
    setLeagueOperationStatus(message, "error");
    amountInput?.focus();
    return;
  }
  if (button) {
    button.disabled = true;
    button.textContent = "Enviando...";
  }
  setOcrStatus(`Enviando puja de ${formatFinanceMoney(amount)}...`, "busy");
  setLeagueOperationStatus(`Enviando puja de ${formatFinanceMoney(amount)}...`, "busy");
  try {
    const response = await apiFetch("/api/biwenger/bid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, amount, toUserId })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo enviar la puja");
    if (payload.operations) state.biwengerOperations = payload.operations;
    state.players = removeTeamPlayersFromMarket(
      mergeFreshBiwengerPlayers(hydrateImportedPlayers(payload.market?.players || state.players), state.players),
      state.teamPlayers
    );
    mergeFinance(payload.market?.finance || {});
    renderTable();
    await saveActiveLeague();
    await loadBiwengerOperations(false);
    const message = payload.confirmed
      ? `Puja de ${formatFinanceMoney(amount)} enviada y confirmada por Biwenger.`
      : `Biwenger acepto la puja de ${formatFinanceMoney(amount)}, pero aun no aparece en sus ofertas activas. Actualiza el centro en unos segundos.`;
    setBiwengerStatus(message, payload.confirmed ? "ready" : "");
    setOcrStatus(message, payload.confirmed ? "ready" : "");
    setLeagueOperationStatus(message, payload.confirmed ? "ready" : "");
  } catch (error) {
    const message = error.message || "No se pudo enviar la puja.";
    setBiwengerStatus(message, "error");
    setOcrStatus(message, "error");
    setLeagueOperationStatus(message, "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = idleText;
    }
  }
};

const biwengerOperation = async (path, payload = {}, successMessage = "Operacion completada correctamente.") => {
  setLeagueOperationStatus("Procesando operacion en Biwenger...", "busy");
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Biwenger no ha aceptado la operacion");
  if (result.operations) {
    applyBiwengerOperations(result.operations);
  }
  setLeagueOperationStatus(successMessage, "ready");
  return result;
};

const applyBiwengerOperations = (payload) => {
  state.biwengerOperations = payload;
  const activeOffers = activeOwnBidOffers(payload.offers || []);
  const activeOfferMap = new Map(activeOffers.map((offer) => [Number(offer.playerId || 0), offer]));
  mergeFinance({
    ...(payload.finance || {}),
    activeBids: activeOffers.length,
    bidTotal: activeOffers.reduce((sum, offer) => sum + moneyAmount(offer.amount), 0)
  });
  const countMap = payload.marketBidCounts || {};
  const rivalCountMap = payload.marketRivalBidCounts || {};
  const countSourceMap = payload.marketBidCountSources || {};
  state.players = state.players.map((player) => {
    const playerId = Number(player.biwengerPlayerId || 0);
    const count = countMap[playerId];
    const rivalCount = rivalCountMap[playerId];
    const ownOffer = activeOfferMap.get(Number(player.biwengerPlayerId || 0));
    return {
      ...player,
      hasBid: Boolean(ownOffer),
      offerId: ownOffer?.offerId || null,
      myBidAmount: ownOffer ? moneyAmount(ownOffer.amount) : null,
      bidAmount: ownOffer ? moneyAmount(ownOffer.amount) : null,
      bidCount: count === null || count === undefined ? player.bidCount : Number(count || 0),
      bidCountSource: countSourceMap[playerId] || player.bidCountSource || "",
      myBidStatus: ownOffer?.status || null,
      bidStatus: ownOffer?.status || null,
      rivalBidCount: rivalCount === null || rivalCount === undefined
        ? (count === null || count === undefined ? player.rivalBidCount : Math.max(0, Number(count || 0) - (ownOffer ? 1 : 0)))
        : Number(rivalCount || 0),
      rivalBidVisibility: count === null || count === undefined ? player.rivalBidVisibility : "count"
    };
  });
  state.players = removeTeamPlayersFromMarket(state.players, state.teamPlayers);
  renderFinance();
  renderTable();
  renderBiwengerOperations();
};

const operationPlayerData = (entry) => {
  const playerId = Number(entry.playerId || 0);
  const local = [...state.players, ...state.teamPlayers, ...(state.rivalTeam?.players || [])].find((player) => Number(player.biwengerPlayerId || 0) === playerId) || {};
  return {
    ...local,
    name: entry.playerName || local.name || "Jugador",
    position: entry.position || local.position || "MC",
    biwengerPosition: entry.position || local.biwengerPosition || null,
    competitionPoints: Number(entry.points ?? local.competitionPoints ?? 0),
    team: local.team || "",
    price: Number(entry.playerValue ?? entry.value ?? local.biwengerValue ?? local.price ?? 0),
    biwengerValue: Number(entry.playerValue ?? entry.value ?? local.biwengerValue ?? local.price ?? 0),
    media: { ...(entry.media || {}), ...(local.media || {}) },
    sourceLinks: { ...(entry.sourceLinks || {}), ...(local.sourceLinks || {}) },
    sourceSummary: { ...(entry.sourceSummary || {}), ...(local.sourceSummary || {}) }
  };
};

const renderOperationIdentity = (entry) => {
  const player = operationPlayerData(entry);
  const url = playerProfileUrl(player);
  const name = url
    ? `<a class="operation-player-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(player.name)}</a>`
    : `<strong>${escapeHtml(player.name)}</strong>`;
  return `
    <div class="operation-player">
      ${renderPlayerMedia(player, "sm")}
      <div>
        <div class="player-name-line">${name}${renderRecentFormDots(player)}</div>
        <span>${renderPositionBadge(player.position)} ${renderScoringBadge(player)}</span>
      </div>
    </div>
  `;
};

const activityPlayerFromEntry = (entry = {}) => {
  const payload = entry.player || {};
  return operationPlayerData({
    ...payload,
    playerId: entry.playerId || payload.biwengerPlayerId || payload.id,
    playerName: entry.playerName || payload.name,
    playerValue: payload.biwengerValue || payload.price,
    points: payload.competitionPoints ?? payload.points,
    media: payload.media,
    sourceSummary: payload.sourceSummary
  });
};

const renderActivityActor = (actor = {}, label = "") => {
  const name = String(actor.name || "");
  if (!name || actor.isMarket) return "";
  return `<span class="activity-actor">${renderEntityAvatar(actor, "xs")}<b>${escapeHtml(label ? `${label}: ${name}` : name)}</b></span>`;
};

const renderLeagueActivityEntry = (entry = {}) => {
  const player = activityPlayerFromEntry(entry);
  const date = formatActivityDate(entry.date);
  const directionLabel = {
    listed: "Puesto en venta",
    "sold-to-market": "Vendido al mercado",
    "bought-from-market": "Fichaje del mercado",
    transfer: "Traspaso entre rivales",
    clause: "Cláusula",
    bought: "Compra",
    sold: "Venta"
  }[entry.direction] || entry.type || "Actividad";
  return `
    <article class="activity-row activity-${escapeHtml(entry.direction || entry.type || "event")}">
      ${renderPlayerMedia(player, "sm", { overlay: "points" })}
      <div class="activity-main">
        <strong>${escapeHtml(entry.message || "Actividad de liga")}</strong>
        <div class="activity-player-line">
          <span>${renderPositionIcon(player.position)} ${escapeHtml(player.name)}</span>
          ${renderRecentFormDots(player)}
        </div>
        <div class="activity-actors">
          ${renderActivityActor(entry.from, "Sale")}
          ${renderActivityActor(entry.to, "Entra")}
        </div>
      </div>
      <div class="activity-meta">
        <b>${escapeHtml(directionLabel)}</b>
        ${moneyAmount(entry.amount) > 0 ? `<span>${formatFinanceMoney(moneyAmount(entry.amount))}</span>` : ""}
        <small>${escapeHtml(date || "")}</small>
      </div>
    </article>
  `;
};

const teamPlayerBiwengerValue = (player) => Number(
  player.biwengerPlayerId
    ? (player.price || player.biwengerValue || 0)
    : (player.biwengerValue || player.price || 0)
);

const operationCurrentValue = (entry) => {
  const player = operationPlayerData(entry);
  return Number(entry.playerValue || player.biwengerValue || player.price || 0);
};

const renderBidValueComparison = (offer) => {
  const amount = moneyAmount(offer.amount);
  const value = operationCurrentValue(offer);
  const difference = amount - value;
  const differenceLabel = difference > 0
    ? `Sobrepuja ${formatFinanceMoney(difference)}`
    : (difference < 0 ? `Por debajo ${formatFinanceMoney(Math.abs(difference))}` : "Igual al valor");
  return `
    <div class="operation-comparison">
      <span>Tu puja activa</span>
      <strong>${formatFinanceMoney(amount)}</strong>
      <small>Valor actual ${formatFinanceMoney(value)} · <b class="${difference > 0 ? "negative" : "positive"}">${differenceLabel}</b></small>
    </div>
  `;
};

const terminalOfferStatuses = new Set(["accepted", "rejected", "cancelled", "canceled", "expired", "completed", "closed"]);

const operationPlayerQuality = (entry) => {
  const player = operationPlayerData(entry);
  const recommendation = Number(player.recommendation);
  if (Number.isFinite(recommendation) && recommendation > 0) return clamp(recommendation);
  const points = Number(player.competitionPoints ?? player.points ?? 0);
  const starter = Number(player.starter ?? 55);
  const form = Number(player.form ?? 55);
  return clamp(starter * 0.35 + form * 0.2 + Math.min(30, points * 2.1) + Number(player.biwengerValue || player.price || 0) / 1000000);
};

const offerSportCost = (offer) => {
  const player = operationPlayerData(offer);
  const amount = moneyAmount(offer.amount);
  const value = operationCurrentValue(offer);
  const overValue = amount - value;
  const quality = operationPlayerQuality(offer);
  const position = player.position || "MC";
  const positionCount = state.teamPlayers.filter((item) => item.position === position).length;
  const target = SQUAD_TARGETS[position] || 3;
  const scarcityPenalty = positionCount <= target ? 22 : (positionCount === target + 1 ? 10 : 0);
  const availabilityDiscount = ["injured", "suspended"].includes(player.health?.status || player.status) ? 22 : (player.health?.status === "doubtful" ? 10 : 0);
  const pricePremium = clamp(overValue / 180000, -18, 24);
  const amountRelief = clamp(amount / 850000, 0, 22);
  const cost = clamp(quality + scarcityPenalty - availabilityDiscount - pricePremium - amountRelief, 0, 120);
  return {
    cost,
    quality,
    overValue,
    position,
    positionCount,
    scarcityPenalty,
    label: cost <= 35 ? "coste bajo" : cost <= 62 ? "coste medio" : "coste alto"
  };
};

const chooseRecommendedOfferSet = (incoming, targetAmount) => {
  if (!incoming.length || targetAmount <= 0) return [];
  const decorated = incoming.map((offer) => ({ offer, metrics: offerSportCost(offer), amount: moneyAmount(offer.amount) }));
  if (decorated.length <= 14) {
    let best = null;
    const totalMasks = 1 << decorated.length;
    for (let mask = 1; mask < totalMasks; mask += 1) {
      const chosen = [];
      let amount = 0;
      let cost = 0;
      let quality = 0;
      for (let index = 0; index < decorated.length; index += 1) {
        if (!(mask & (1 << index))) continue;
        const item = decorated[index];
        chosen.push(item.offer);
        amount += item.amount;
        cost += item.metrics.cost;
        quality += item.metrics.quality;
      }
      if (amount < targetAmount) continue;
      const excess = amount - targetAmount;
      const rank = cost * 1000000 + excess * 0.002 + chosen.length * 250000 + quality * 1000;
      if (!best || rank < best.rank) best = { chosen, rank };
    }
    if (best) return best.chosen;
  }
  const greedy = decorated
    .sort((a, b) => (a.metrics.cost / Math.max(a.amount, 1)) - (b.metrics.cost / Math.max(b.amount, 1)));
  const chosen = [];
  let amount = 0;
  for (const item of greedy) {
    chosen.push(item.offer);
    amount += item.amount;
    if (amount >= targetAmount) break;
  }
  return amount >= targetAmount ? chosen : [];
};

const renderOfferSimulation = (incoming, myOffers) => {
  if (!incoming.length) return "";
  const validIds = new Set(incoming.map(offerIdKey));
  state.offerSimulation.selectedOfferIds = state.offerSimulation.selectedOfferIds.filter((id) => validIds.has(id));
  const selectedIds = new Set(state.offerSimulation.selectedOfferIds);
  const selectedOffers = incoming.filter((offer) => selectedIds.has(offerIdKey(offer)));
  const selectedAmount = selectedOffers.reduce((sum, offer) => sum + moneyAmount(offer.amount), 0);
  const committed = myOffers.reduce((sum, offer) => sum + moneyAmount(offer.amount), 0);
  const balance = Number(state.biwengerOperations?.finance?.balance ?? state.finance.balance);
  const maximumBid = Number(state.biwengerOperations?.finance?.maximumBid ?? state.finance.maximumBid);
  const simulatedBalance = Number.isFinite(balance) ? balance + selectedAmount : null;
  const simulatedProjected = Number.isFinite(balance) ? balance + selectedAmount - committed : null;
  const simulatedMaximumBid = Number.isFinite(maximumBid) ? maximumBid + selectedAmount : null;
  const incomingSummary = incomingOfferSummary(incoming);
  const roundReward = estimatedRoundReward();
  const simulatedRoundBalance = Number.isFinite(simulatedProjected) ? simulatedProjected + roundReward.amount : null;
  const adjustedBalance = Number.isFinite(balance) ? balance + roundReward.amount : balance;
  const targetAmount = Number.isFinite(adjustedBalance) ? Math.max(0, -adjustedBalance, -(adjustedBalance - committed)) : 0;
  const recommended = chooseRecommendedOfferSet(incoming, targetAmount);
  const recommendedIds = new Set(recommended.map(offerIdKey));
  const recommendedAmount = recommended.reduce((sum, offer) => sum + moneyAmount(offer.amount), 0);
  const selectedCost = selectedOffers.reduce((sum, offer) => sum + offerSportCost(offer).cost, 0);
  const recommendedCost = recommended.reduce((sum, offer) => sum + offerSportCost(offer).cost, 0);
  const recommendationText = targetAmount <= 0
    ? "Con saldo, pujas y jornada estimada no necesitas aceptar ofertas para evitar negativo. Si quieres generar margen, prioriza ofertas por encima de valor y coste deportivo bajo."
    : recommended.length
      ? `Propuesta: aceptar ${recommended.length} oferta${recommended.length === 1 ? "" : "s"} por ${formatFinanceMoney(recommendedAmount)}. Objetivo tras jornada: cubrir ${formatFinanceMoney(targetAmount)} con el menor coste deportivo estimado.`
      : `Ni aceptando las ofertas actuales se cubre el objetivo conservador tras jornada de ${formatFinanceMoney(targetAmount)}.`;

  return `
    <section class="offer-simulator">
      <div class="offer-simulator-header">
        <div>
          <p class="eyebrow">Simulador</p>
          <h4>¿Qué ofertas aceptar?</h4>
        </div>
        <div class="offer-simulator-actions">
          <button class="ghost-button offer-sim-recommend" type="button" ${recommended.length ? "" : "disabled"}>Usar propuesta</button>
          <button class="ghost-button offer-sim-clear" type="button" ${selectedOffers.length ? "" : "disabled"}>Limpiar</button>
        </div>
      </div>
      <div class="operation-metrics offer-simulation-metrics">
        <div><span>Total ofertas</span><strong>${incoming.length} · ${formatFinanceMoney(incomingSummary.total)}</strong></div>
        <div class="${incomingSummary.balanceAfterAll < 0 ? "danger" : ""}"><span>Si aceptas todas</span><strong>${formatFinanceMoney(incomingSummary.balanceAfterAll)}</strong></div>
        <div><span>Seleccionado</span><strong>${formatFinanceMoney(selectedAmount)}</strong></div>
        <div class="${simulatedBalance < 0 ? "danger" : ""}"><span>Saldo simulado</span><strong>${formatFinanceMoney(simulatedBalance)}</strong></div>
        <div class="${simulatedProjected < 0 ? "danger" : ""}"><span>Saldo con pujas</span><strong>${formatFinanceMoney(simulatedProjected)}</strong></div>
        <div class="${simulatedRoundBalance < 0 ? "danger" : ""}"><span>Fin jornada sim.</span><strong>${formatFinanceMoney(simulatedRoundBalance)}</strong><small>${escapeHtml(renderRoundRewardDetail(roundReward, { compact: true }))}</small></div>
        <div><span>Puja max. si aceptas</span><strong>${formatFinanceMoney(simulatedMaximumBid)}</strong><small>Ahora ${formatFinanceMoney(maximumBid)}${selectedAmount > 0 ? ` · +${formatFinanceMoney(selectedAmount)}` : ""}</small></div>
      </div>
      <div class="offer-simulator-advice ${targetAmount > 0 && recommended.length ? "ready" : ""}">
        <strong>${recommendationText}</strong>
        <small>Coste deportivo selección: ${Math.round(selectedCost)} · propuesta: ${Math.round(recommendedCost)} · puja máxima estimada ${formatFinanceMoney(simulatedMaximumBid)}. Es una simulación: no acepta nada en Biwenger hasta que uses los botones de cada oferta.</small>
      </div>
      <div class="offer-simulation-list">
        ${incoming.map((offer) => {
          const id = offerIdKey(offer);
          const metrics = offerSportCost(offer);
          const selected = selectedIds.has(id);
          return `
            <label class="offer-simulation-row ${selected ? "selected" : ""} ${recommendedIds.has(id) ? "recommended" : ""}">
              <input class="offer-sim-checkbox" type="checkbox" value="${escapeHtml(id)}" ${selected ? "checked" : ""} />
              ${renderOperationIdentity(offer)}
              <span class="offer-simulation-copy">
                <small>${formatFinanceMoney(moneyAmount(offer.amount))} · ${metrics.overValue >= 0 ? "sobre valor" : "bajo valor"} ${formatSignedMoney(metrics.overValue)} · ${POSITION_NAMES[metrics.position] || metrics.position} · ${metrics.label}${recommendedIds.has(id) ? " · propuesta" : ""}</small>
              </span>
            </label>
          `;
        }).join("")}
      </div>
    </section>
  `;
};

const renderBiwengerOperations = () => {
  const bidsTarget = qs("#bid-center");
  const salesTarget = qs("#sales-center");
  const activityTarget = qs("#league-activity");
  if (!bidsTarget || !salesTarget || !activityTarget) {
    renderBidSaleAssistant();
    return;
  }
  const operations = state.biwengerOperations || {};
  const offers = operations.offers || [];
  const myOffers = activeOwnBidOffers(offers);
  const incoming = activeIncomingOffers(offers);
  const committed = myOffers.reduce((sum, offer) => sum + moneyAmount(offer.amount), 0);
  const balance = Number(operations.finance?.balance ?? state.finance.balance);
  const future = Number.isFinite(balance) ? balance - committed : null;
  const incomingSummary = incomingOfferSummary(incoming);
  const roundReward = estimatedRoundReward();
  const futureWithRound = Number.isFinite(future) ? future + roundReward.amount : null;
  const futureWithAllOffersAndRound = Number.isFinite(balance)
    ? balance + incomingSummary.total - committed + roundReward.amount
    : null;

  bidsTarget.innerHTML = `
    <div class="operation-metrics">
      <div><span>Saldo actual</span><strong>${formatFinanceMoney(balance)}</strong></div>
      <div><span>Pujado</span><strong>${formatFinanceMoney(committed)}</strong></div>
      <div><span>Ofertas recibidas</span><strong>${incoming.length} · ${formatFinanceMoney(incomingSummary.total)}</strong></div>
      <div class="${incomingSummary.balanceAfterAll < 0 ? "danger" : ""}"><span>Si aceptas todas</span><strong>${formatFinanceMoney(incomingSummary.balanceAfterAll)}</strong></div>
      <div class="${future < 0 ? "danger" : ""}"><span>Saldo si ganas todo</span><strong>${formatFinanceMoney(future)}</strong></div>
      <div><span>Recompensa jornada</span><strong>${formatFinanceMoney(roundReward.amount)}</strong><small>${escapeHtml(renderRoundRewardDetail(roundReward, { compact: true }))}</small></div>
      <div class="${futureWithRound < 0 ? "danger" : ""}"><span>Saldo fin jornada</span><strong>${formatFinanceMoney(futureWithRound)}</strong></div>
      <div class="${futureWithAllOffersAndRound < 0 ? "danger" : ""}"><span>Ofertas + jornada</span><strong>${formatFinanceMoney(futureWithAllOffersAndRound)}</strong><small>Aceptando todas y ganando pujas</small></div>
    </div>
    ${myOffers.length ? myOffers.map((offer) => `
      <form class="operation-row bid-edit-form" data-offer-id="${offer.offerId}" data-player-id="${offer.playerId}" data-owner-id="${offer.toId}">
        ${renderOperationIdentity(offer)}
        ${renderBidValueComparison(offer)}
        <input class="operation-amount currency-input" type="text" inputmode="numeric" value="${formatCurrencyInput(offer.amount)}" aria-label="Importe de puja" />
        ${Number(offer.offerId || 0) > 0
          ? `<button class="ghost-button" type="submit">Actualizar</button><button class="danger-button cancel-bid" type="button">Cancelar</button>`
          : `<span class="operation-readonly-note">Puja detectada. Gestionala desde Biwenger.</span>`}
      </form>
    `).join("") : `<p class="muted-empty">No tienes pujas activas.</p>`}
    ${renderOfferSimulation(incoming, myOffers)}
    ${incoming.length ? `<div class="operations-subheading"><strong>Ofertas recibidas</strong></div>${incoming.map((offer) => `
      <div class="operation-row" data-player-id="${offer.playerId}">
        ${renderOperationIdentity(offer)}
        <div class="operation-comparison">
          <span>${escapeHtml(offer.fromName || "Rival")} ofrece</span>
          <strong>${formatFinanceMoney(moneyAmount(offer.amount))}</strong>
          ${(() => {
            const amount = moneyAmount(offer.amount);
            const value = operationCurrentValue(offer);
            const diff = amount - value;
            return `<small>Valor actual ${formatFinanceMoney(value)} · <b class="${diff >= 0 ? "positive" : "negative"}">${diff > 0 ? `Sobre valor ${formatFinanceMoney(diff)}` : (diff < 0 ? `Bajo valor ${formatFinanceMoney(Math.abs(diff))}` : "Igual al valor")}</b></small>`;
          })()}
        </div>
        <label class="offer-row-sim"><input class="offer-sim-checkbox" type="checkbox" value="${escapeHtml(offerIdKey(offer))}" ${state.offerSimulation.selectedOfferIds.includes(offerIdKey(offer)) ? "checked" : ""} /> Simular</label>
        <button class="ghost-button offer-response" type="button" data-offer-id="${offer.offerId}" data-status="accepted">Aceptar</button>
        <button class="danger-button offer-response" type="button" data-offer-id="${offer.offerId}" data-status="rejected">Rechazar</button>
      </div>
    `).join("")}` : ""}
  `;

  const sales = operations.sales || [];
  const soldIds = new Set(sales.map((sale) => Number(sale.playerId)));
  const availableToSell = state.teamPlayers.filter((player) => Number(player.biwengerPlayerId || 0) > 0 && !soldIds.has(Number(player.biwengerPlayerId)));
  salesTarget.innerHTML = `
    ${sales.length ? sales.map((sale) => `
      <div class="operation-row">
        ${renderOperationIdentity(sale)}
        <div class="operation-comparison" title="Precio solicitado leído de Biwenger (${escapeHtml(sale.priceSource || "price")})"><span>Precio de venta</span><strong>${formatFinanceMoney(sale.price)}</strong><small>Valor ${formatFinanceMoney(sale.value)} · <b class="${sale.price - sale.value >= 0 ? "positive" : "negative"}">${formatSignedMoney(sale.price - sale.value)}</b></small></div>
        <button class="danger-button remove-sale" type="button" data-player-id="${sale.playerId}">Retirar</button>
      </div>
    `).join("") : `<p class="muted-empty">No tienes jugadores puestos a la venta.</p>`}
    ${availableToSell.length ? `
      <div class="operations-subheading"><strong>Poner a la venta</strong></div>
      ${availableToSell.map((player) => {
        const officialValue = teamPlayerBiwengerValue(player);
        return `
        <form class="operation-row sale-form" data-player-id="${player.biwengerPlayerId}">
          ${renderOperationIdentity({ playerId: player.biwengerPlayerId, playerName: player.name, value: officialValue })}
          <div class="operation-value"><span>Valor Biwenger</span><strong>${formatFinanceMoney(officialValue)}</strong></div>
          <input class="operation-amount currency-input" type="text" inputmode="numeric" value="${formatCurrencyInput(officialValue)}" aria-label="Precio de venta" />
          <button class="ghost-button" type="submit">Vender</button>
        </form>
      `; }).join("")}
    ` : ""}
  `;

  const activity = operations.activity || [];
  activityTarget.innerHTML = activity.length
    ? activity.map(renderLeagueActivityEntry).join("")
    : `<p class="muted-empty">Biwenger no expone actividad visible para esta liga.</p>`;
  bindCurrencyInputs(bidsTarget);
  bindCurrencyInputs(salesTarget);

  bidsTarget.querySelectorAll(".bid-edit-form").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const amount = parseCurrencyInput(form.querySelector(".operation-amount").value);
      if (amount <= 0) throw new Error("Introduce un importe de puja valido.");
      await biwengerOperation("/api/biwenger/bid-update", {
        offerId: Number(form.dataset.offerId),
        playerId: Number(form.dataset.playerId),
        toUserId: Number(form.dataset.ownerId),
        amount
      }, `Puja actualizada a ${formatFinanceMoney(amount)}.`);
    } catch (error) { setLeagueOperationStatus(error.message, "error"); }
  }));
  bidsTarget.querySelectorAll(".cancel-bid").forEach((button) => button.addEventListener("click", async () => {
    try { await biwengerOperation("/api/biwenger/bid-cancel", { offerId: Number(button.closest("form").dataset.offerId) }, "Puja cancelada correctamente."); }
    catch (error) { setLeagueOperationStatus(error.message, "error"); }
  }));
  bidsTarget.querySelectorAll(".offer-response").forEach((button) => button.addEventListener("click", async () => {
    try {
      await biwengerOperation("/api/biwenger/offer-status", { offerId: Number(button.dataset.offerId), status: button.dataset.status }, button.dataset.status === "accepted" ? "Oferta aceptada correctamente. Puja maxima y saldo actualizados." : "Oferta rechazada correctamente.");
      if (button.dataset.status === "accepted") {
        await refreshBiwengerStatus("Oferta aceptada. Finanzas sincronizadas con Biwenger.");
        renderFinance();
        renderTable();
      }
    }
    catch (error) { setLeagueOperationStatus(error.message, "error"); }
  }));
  bidsTarget.querySelectorAll(".offer-sim-checkbox").forEach((checkbox) => checkbox.addEventListener("change", () => {
    const selected = new Set(state.offerSimulation.selectedOfferIds);
    if (checkbox.checked) selected.add(checkbox.value);
    else selected.delete(checkbox.value);
    state.offerSimulation.selectedOfferIds = [...selected];
    renderBiwengerOperations();
  }));
  bidsTarget.querySelector(".offer-sim-recommend")?.addEventListener("click", () => {
    const incomingNow = activeIncomingOffers(state.biwengerOperations?.offers || []);
    const myOffersNow = activeOwnBidOffers(state.biwengerOperations?.offers || []);
    const balance = Number(state.biwengerOperations?.finance?.balance ?? state.finance.balance);
    const committed = myOffersNow.reduce((sum, offer) => sum + moneyAmount(offer.amount), 0);
    const reward = estimatedRoundReward().amount;
    const targetAmount = Number.isFinite(balance) ? Math.max(0, -(balance + reward), -(balance + reward - committed)) : 0;
    state.offerSimulation.selectedOfferIds = chooseRecommendedOfferSet(incomingNow, targetAmount).map(offerIdKey);
    renderBiwengerOperations();
  });
  bidsTarget.querySelector(".offer-sim-clear")?.addEventListener("click", () => {
    state.offerSimulation.selectedOfferIds = [];
    renderBiwengerOperations();
  });
  salesTarget.querySelectorAll(".sale-form").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const price = parseCurrencyInput(form.querySelector(".operation-amount").value);
      if (price <= 0) throw new Error("Introduce un precio de venta valido.");
      await biwengerOperation("/api/biwenger/sale", { playerId: Number(form.dataset.playerId), price }, `Jugador puesto a la venta por ${formatFinanceMoney(price)}.`);
    } catch (error) { setLeagueOperationStatus(error.message, "error"); }
  }));
  salesTarget.querySelectorAll(".remove-sale").forEach((button) => button.addEventListener("click", async () => {
    try { await biwengerOperation("/api/biwenger/sale-remove", { playerId: Number(button.dataset.playerId) }, "Jugador retirado del mercado."); }
    catch (error) { setLeagueOperationStatus(error.message, "error"); }
  }));
  renderBidSaleAssistant();
};

const loadBiwengerOperations = async (showFeedback = true) => {
  if (!state.biwenger.connected) return;
  if (showFeedback) setLeagueOperationStatus("Actualizando datos operativos desde Biwenger...", "busy");
  try {
    const response = await apiFetch("/api/biwenger/operations");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo cargar el centro operativo");
    applyBiwengerOperations(payload);
    if (showFeedback) {
      const diagnostics = payload.diagnostics || {};
      const summary = Number.isFinite(diagnostics.ownBids)
        ? ` ${diagnostics.ownBids} pujas propias, ${diagnostics.receivedOffers} ofertas recibidas, ${diagnostics.sales} ventas y ${diagnostics.visibleBidCounts || 0} contadores rivales visibles.`
        : "";
      setLeagueOperationStatus(`Centro operativo actualizado con datos actuales de Biwenger.${summary}`, "ready");
    }
    return payload;
  } catch (error) {
    state.biwengerOperations = {
      ...(state.biwengerOperations || {}),
      offers: [],
      diagnostics: { ...(state.biwengerOperations?.diagnostics || {}), staleCleared: true, error: error.message || "operations-error" }
    };
    renderFinance();
    renderBidSaleAssistant();
    qs("#bid-center").innerHTML = `<p class="muted-empty">${escapeHtml(error.message)}</p>`;
    setLeagueOperationStatus(error.message || "No se pudo actualizar el centro operativo.", "error");
    return null;
  }
};

const biwengerLogout = async () => {
  setBiwengerBusy(true, "Cerrando");
  try {
    await apiFetch("/api/biwenger/logout", { method: "POST" });
    state.biwenger.connected = false;
    state.biwenger.userName = "";
    state.biwenger.leagueName = "";
    state.biwenger.competition = "";
    const passwordInput = qs("#biwenger-password");
    if (passwordInput) passwordInput.value = "";
    applyBiwengerSession({ connected: false });
    setBiwengerStatus("Sesion de Biwenger cerrada.", "ready");
  } catch (error) {
    setBiwengerStatus(error.message || "No se pudo cerrar la sesion de Biwenger.", "error");
  } finally {
    setBiwengerBusy(false);
  }
};

const renderLeagueOverview = () => {
  const standings = qs("#league-standings");
  const summary = qs("#league-standings-summary");
  const rivalSelect = qs("#rival-select");
  if (!standings || !rivalSelect) return;
  const rows = (state.leagueOverview?.standings || [])
    .slice()
    .sort((a, b) =>
      Number(b.points || 0) - Number(a.points || 0)
      || Number(a.position || 999) - Number(b.position || 999)
      || Number(b.teamValue || 0) - Number(a.teamValue || 0)
      || String(a.name || "").localeCompare(String(b.name || ""), "es")
    )
    .map((row, index) => ({ ...row, position: index + 1 }));
  const leader = rows[0] || null;
  const myRow = rows.find((row) => row.isMe) || null;
  const updatedAt = state.leagueOverview?.updatedAt ? formatActivityDate(state.leagueOverview.updatedAt) : "";
  const leagueVisual = activeLeagueVisual();
  if (summary) {
    summary.innerHTML = rows.length ? `
      <div class="league-summary-brand">
        ${renderEntityAvatar({ name: leagueVisual.name, icon: leagueVisual.icon }, "lg")}
        <span>Liga activa</span>
        <strong>${escapeHtml(leagueVisual.name)}</strong>
        <small>${leagueVisual.icon ? "Icono Biwenger" : "Icono local"}</small>
      </div>
      <div>
        <span>Líder</span>
        <strong>${escapeHtml(leader?.name || "S/D")}</strong>
        <small>${Number(leader?.points || 0).toLocaleString("es-ES")} pts</small>
      </div>
      <div class="${myRow ? "is-me" : ""}">
        <span>Tu posición</span>
        <strong>${myRow ? `#${myRow.position}` : "S/D"}</strong>
        <small>${myRow ? `${Number(myRow.points || 0).toLocaleString("es-ES")} pts${leader && !myRow.isMe ? ` · a ${Number(leader.points || 0) - Number(myRow.points || 0)} del líder` : ""}` : "No localizado"}</small>
      </div>
      <div>
        <span>Participantes</span>
        <strong>${rows.length}</strong>
        <small>${updatedAt ? `Actualizado ${updatedAt}` : "Datos Biwenger"}</small>
      </div>
    ` : "";
  }
  standings.innerHTML = rows.length ? rows.map((row) => `
    <button class="standing-row ${row.isMe ? "is-me" : ""}" type="button" data-standing-action="${row.isMe ? "team" : "rival"}" data-rival-id="${row.isMe ? "" : row.userId}">
      <strong class="standing-rank">#${row.position}</strong>
      ${renderEntityAvatar(row, "sm standing-avatar")}
      <span class="standing-main">
        <b>${escapeHtml(row.name)}${row.isMe ? " (tú)" : ""}</b>
        <small>
          ${Number.isFinite(Number(row.teamValue)) && Number(row.teamValue) > 0 ? `Valor ${formatFinanceMoney(Number(row.teamValue))}` : "Valor oculto"}
          ${Number.isFinite(Number(row.cash)) ? ` · Caja ${formatFinanceMoney(Number(row.cash))}` : ""}
          ${Number.isFinite(Number(row.dailyIncrease)) && Number(row.dailyIncrease) !== 0 ? ` · Reval. ${formatFinanceMoney(Number(row.dailyIncrease))}` : ""}
        </small>
      </span>
      <span class="standing-points">
        <b>${Number(row.points || 0).toLocaleString("es-ES")} pts</b>
        <small>${leader && row.userId !== leader.userId ? `-${Math.max(0, Number(leader.points || 0) - Number(row.points || 0)).toLocaleString("es-ES")} pts` : "Líder"}</small>
      </span>
      <span class="standing-action">${row.isMe ? "Tu equipo" : "Ver rival"}</span>
    </button>
  `).join("") : `<p class="muted-empty">Biwenger no ha devuelto una clasificación visible.</p>`;
  rivalSelect.innerHTML = `<option value="">Selecciona un rival</option>${rows.filter((rival) => !rival.isMe).map((rival) =>
    `<option value="${rival.userId}">${escapeHtml(rival.name)}</option>`
  ).join("")}`;
  standings.querySelectorAll("[data-standing-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.standingAction === "team") {
        openView("team");
        if (state.biwenger.connected) loadBiwengerOperations(false);
        return;
      }
      if (!button.dataset.rivalId) return;
      rivalSelect.value = button.dataset.rivalId;
      openLeaguePanel("rivals");
      loadRivalTeam(button.dataset.rivalId);
    });
  });
};

const renderLeagueFixtures = () => {
  const target = qs("#league-fixtures");
  if (!target) return;
  const payload = state.leagueFixtures;
  const events = payload?.events || [];
  if (!events.length) {
    target.innerHTML = `<p class="muted-empty">No hay partidos disponibles para la jornada actual.</p>`;
    return;
  }
  const now = Date.now();
  const visibleEvents = events.filter((event) => Number(event.timestamp || 0) * 1000 >= now - (36 * 60 * 60 * 1000));
  const videoCount = visibleEvents.filter((event) => event.videoUrl || event.videoEmbedUrl).length;
  const groupedEvents = visibleEvents.reduce((groups, event) => {
    const label = event.round || "Jornada actual";
    (groups[label] ||= []).push(event);
    return groups;
  }, {});
  target.innerHTML = `
    <div class="fixtures-heading">
      <strong>${escapeHtml(payload.competition || "Competicion")}</strong>
      <span>${visibleEvents.length} partidos actuales y próximos · ${videoCount} vídeos disponibles</span>
    </div>
    ${Object.entries(groupedEvents).map(([round, roundEvents]) => `
      <section class="fixture-round-group">
        <h4>${escapeHtml(round)}</h4>
        ${roundEvents.map((event) => {
      const date = new Date(Number(event.timestamp || 0) * 1000);
      const dateText = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Madrid" });
      const timeText = Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
      const hasScore = Number.isFinite(event.homeScore) && Number.isFinite(event.awayScore);
      return `
        <article class="fixture-row ${hasScore ? "finished" : ""}">
          <div class="fixture-date"><strong>${escapeHtml(dateText)}</strong><span>${escapeHtml(timeText)}</span></div>
          <div class="fixture-team home"><strong>${escapeHtml(event.home?.name || "Local")}</strong>${event.home?.image ? `<img src="${escapeHtml(event.home.image)}" alt="" loading="lazy" />` : ""}</div>
          <div class="fixture-score">${hasScore ? `<strong>${event.homeScore} - ${event.awayScore}</strong>` : `<strong>${escapeHtml(event.statusText || "Próximo")}</strong>`}</div>
          <div class="fixture-team away">${event.away?.image ? `<img src="${escapeHtml(event.away.image)}" alt="" loading="lazy" />` : ""}<strong>${escapeHtml(event.away?.name || "Visitante")}</strong></div>
          <div class="fixture-actions">
            ${event.sofascoreUrl || event.detailUrl ? `<a class="ghost-button fixture-link" href="${escapeHtml(event.sofascoreUrl || event.detailUrl)}" target="_blank" rel="noopener">${event.sofascoreUrl ? "SofaScore" : "Ver partido"}</a>` : ""}
            ${event.videoEmbedUrl
              ? `<button class="ghost-button fixture-link video play-fixture-video" type="button" data-video-url="${escapeHtml(event.videoEmbedUrl)}" data-video-title="${escapeHtml(event.videoTitle || `${event.home?.name || "Local"} - ${event.away?.name || "Visitante"}`)}">Ver vídeo</button>`
              : (event.videoUrl
                ? `<a class="ghost-button fixture-link video" href="${escapeHtml(event.videoUrl)}" target="_blank" rel="noopener">Ver vídeo</a>`
                : `<button class="ghost-button fixture-link video pending open-videos-view" type="button">Vídeos</button>`)}
          </div>
        </article>
      `;
        }).join("")}
      </section>
    `).join("")}
  `;
  target.querySelectorAll(".play-fixture-video").forEach((button) => button.addEventListener("click", () => {
    openFixtureVideo(button.dataset.videoUrl, button.dataset.videoTitle || "Resumen del partido");
  }));
  target.querySelectorAll(".open-videos-view").forEach((button) => button.addEventListener("click", () => openView("videos")));
};

const openFixtureVideo = (url, title = "Resumen del partido") => {
  if (!url) {
    openView("videos");
    return;
  }
  const modal = qs("#fixture-video-modal");
  const frame = qs("#fixture-video-frame");
  const titleEl = qs("#fixture-video-title");
  const external = qs("#fixture-video-external");
  if (!modal || !frame) {
    window.open(url, "_blank", "noopener");
    return;
  }
  if (titleEl) titleEl.textContent = title || "Resumen del partido";
  frame.src = url;
  if (external) external.href = url;
  modal.hidden = false;
  document.body.classList.add("modal-open");
};

const closeFixtureVideo = () => {
  const modal = qs("#fixture-video-modal");
  const frame = qs("#fixture-video-frame");
  if (frame) frame.src = "about:blank";
  if (modal) modal.hidden = true;
  document.body.classList.remove("modal-open");
};

const initScorebatWidget = () => {
  const frame = qs("#scorebat-worldcup-frame");
  if (!frame) return;
  const fallback = "https://www.scorebat.com/embed/league/fifa-world-cup/?pref=%7B%22nomaxwidth%22%3Atrue%2C%22language%22%3A%22es%22%7D";
  frame.src = APP_CONFIG.scorebatWorldCupEmbedUrl || fallback;
};

const closeRecentFormPopover = () => {
  const popover = qs("#recent-form-popover");
  if (!popover) return;
  popover.hidden = true;
  popover.innerHTML = "";
};

const renderRecentPopoverRow = (row) => {
  const type = row.startsWith("↑") ? "in" : (row.startsWith("↓") ? "out" : "");
  return `<span class="${type ? `sub-minute ${type}` : ""}">${escapeHtml(row)}</span>`;
};

const openRecentFormPopover = (button) => {
  const popover = qs("#recent-form-popover");
  if (!popover) return;
  let detail = null;
  try {
    detail = JSON.parse(decodeURIComponent(button.dataset.recentDetail || ""));
  } catch (error) {
    detail = { title: "Detalle", rows: [button.getAttribute("title") || "Sin dato"] };
  }
  const rect = button.getBoundingClientRect();
  popover.innerHTML = `
    <strong>${escapeHtml(detail.title || "Detalle")}</strong>
    <div>${(detail.rows || []).map(renderRecentPopoverRow).join("")}</div>
  `;
  popover.hidden = false;
  const popoverRect = popover.getBoundingClientRect();
  const left = Math.min(window.innerWidth - popoverRect.width - 10, Math.max(10, rect.left + rect.width / 2 - popoverRect.width / 2));
  const top = Math.min(window.innerHeight - popoverRect.height - 10, Math.max(10, rect.bottom + 10));
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  hydrateRecentFormButton(button);
};

const recentPlayerKey = (player) => `${state.competition}:${player?.biwengerPlayerId || player?.id || normalize(player?.name || "")}`;

const findRecentPlayer = (button) => {
  const clientId = button.dataset.recentPlayerId || "";
  const biwengerId = Number(button.dataset.recentBiwengerId || 0);
  const collections = [state.players, state.teamPlayers, state.rivalTeam?.players || []];
  for (const collection of collections) {
    const found = collection.find((player) => player.id === clientId || (biwengerId > 0 && Number(player.biwengerPlayerId || 0) === biwengerId));
    if (found) return found;
  }
  return null;
};

const mergeRecentMatchArrays = (current = [], fresh = []) => {
  const base = Array.isArray(current) ? current.slice(-5) : [];
  const details = Array.isArray(fresh) ? fresh.slice(-5) : [];
  const length = Math.max(base.length, details.length, 0);
  return Array.from({ length }, (_, index) => {
    const oldMatch = base[base.length - length + index] || {};
    const freshMatch = details[details.length - length + index] || {};
    const points = { ...(freshMatch.points || {}), ...(oldMatch.points || {}) };
    return { ...oldMatch, ...freshMatch, points };
  });
};

const replaceRecentPlayer = (target, recentMatches, payload = {}) => ({
  ...target,
  media: {
    ...(target.media || {}),
    ...Object.fromEntries(Object.entries(payload.media || {}).filter(([, value]) => Boolean(value)))
  },
  health: payload.health?.status && payload.health.status !== "unknown" ? payload.health : target.health,
  sourceSummary: {
    ...(target.sourceSummary || {}),
    recentMatches,
    apiFootball: payload.apiFootball || target.sourceSummary?.apiFootball || null
  },
  sources: Array.from(new Set([...(target.sources || []), "API-Football"]))
});

const applyRecentDetailsToPlayer = (player, payload) => {
  const current = player.sourceSummary?.recentMatches || [];
  const recentMatches = mergeRecentMatchArrays(current, payload.recentMatches || []);
  const matchesPlayer = (item) => item.id === player.id || (player.biwengerPlayerId && Number(item.biwengerPlayerId || 0) === Number(player.biwengerPlayerId));
  state.players = state.players.map((item) => matchesPlayer(item) ? replaceRecentPlayer(item, recentMatches, payload) : item);
  state.teamPlayers = state.teamPlayers.map((item) => matchesPlayer(item) ? replaceRecentPlayer(item, recentMatches, payload) : item);
  if (state.rivalTeam?.players) {
    state.rivalTeam = {
      ...state.rivalTeam,
      players: state.rivalTeam.players.map((item) => matchesPlayer(item) ? replaceRecentPlayer(item, recentMatches, payload) : item)
    };
  }
  player.sourceSummary = { ...(player.sourceSummary || {}), recentMatches, apiFootball: payload.apiFootball || player.sourceSummary?.apiFootball || null };
  return recentMatches;
};

const enrichRivalRecentDetails = async (players, options = {}) => {
  if (!canUseApi() || !state.biwenger.connected || !players.length) {
    return { players, checked: 0, enriched: 0, failed: 0, errors: [] };
  }
  const limit = Number(options.limit || 8);
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const byId = new Map(players.map((player) => [player.id, player]));
  const candidates = [...players]
    .filter((player) => player.position !== "ENT")
    .sort((a, b) =>
      Number(b.competitionPoints || b.points || 0) - Number(a.competitionPoints || a.points || 0)
      || Number(b.biwengerValue || b.price || 0) - Number(a.biwengerValue || a.price || 0)
    )
    .slice(0, limit);
  const result = { checked: candidates.length, enriched: 0, failed: 0, errors: [] };

  for (const [index, player] of candidates.entries()) {
    if (onProgress) onProgress(index + 1, candidates.length, player);
    try {
      const key = recentPlayerKey(player);
      let payload = state.recentDetailsCache[key];
      if (payload && payload.ok === false) throw new Error(payload.error || "Fuentes de minutos no disponibles");
      if (!payload) {
        const response = await apiFetch("/api/player/recent-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competition: state.competition,
            player: {
              id: player.id,
              biwengerPlayerId: player.biwengerPlayerId,
              name: player.name,
              team: player.team,
              clubTeam: player.clubTeam,
              nationalTeam: player.nationalTeam,
              position: player.position
            }
          })
        });
        payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) throw new Error(payload.error || "API-Football sin dato reciente");
        state.recentDetailsCache[key] = payload;
      }
      const current = byId.get(player.id) || player;
      const recentMatches = mergeRecentMatchArrays(current.sourceSummary?.recentMatches || [], payload.recentMatches || []);
      byId.set(player.id, replaceRecentPlayer(current, recentMatches, payload));
      result.enriched += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push(`${player.name}: ${error.message || "sin datos"}`);
      state.recentDetailsCache[recentPlayerKey(player)] = { ok: false, error: error.message || "Fuentes de minutos no disponibles" };
    }
  }

  return {
    ...result,
    players: players.map((player) => byId.get(player.id) || player)
  };
};

const updateRecentButtonDetail = (button, match) => {
  if (!match) return;
  const score = selectedRecentScore(match);
  const isBiwenger = match.provider === "biwenger" || Number.isFinite(Number(match.points?.biwenger));
  const played = isBiwenger ? score !== 0 : Boolean(match.played) && matchHasMinutes(match) && Number(match.minutes) > 0;
  const detail = recentMatchDetail(match, score, played);
  const label = recentMatchTitle(detail);
  button.dataset.recentDetail = encodeURIComponent(JSON.stringify(detail));
  button.dataset.recentNeedsHydration = matchHasMinutes(match) ? "false" : button.dataset.recentNeedsHydration;
  button.title = label;
  button.setAttribute("aria-label", label);
  if (!qs("#recent-form-popover")?.hidden) openRecentFormPopover(button);
};

const hydrateRecentFormButton = async (button) => {
  if (button.dataset.recentNeedsHydration !== "true" || button.dataset.recentHydrated === "true" || button.dataset.recentLoading === "true") return;
  const player = findRecentPlayer(button);
  if (!player) return;
  const key = recentPlayerKey(player);
  button.dataset.recentLoading = "true";
  try {
    let payload = state.recentDetailsCache[key];
    if (payload && payload.ok === false) throw new Error(payload.error || "Fuentes de minutos no disponibles");
    if (!payload) {
      const response = await apiFetch("/api/player/recent-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competition: state.competition,
          player: {
            id: player.id,
            biwengerPlayerId: player.biwengerPlayerId,
            name: player.name,
            team: player.team,
            clubTeam: player.clubTeam,
            nationalTeam: player.nationalTeam,
            position: player.position
          }
        })
      });
      payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Las fuentes de minutos no han devuelto datos");
      state.recentDetailsCache[key] = payload;
    }
    const merged = applyRecentDetailsToPlayer(player, payload);
    const index = Number(button.dataset.recentIndex || 0);
    const padded = [...Array(Math.max(0, 5 - merged.length)).fill(null), ...merged.slice(-5)];
    button.dataset.recentHydrated = "true";
    updateRecentButtonDetail(button, padded[index]);
  } catch (error) {
    state.recentDetailsCache[key] = { ok: false, error: error.message || "Fuentes de minutos no disponibles" };
    button.dataset.recentHydrated = "true";
    let currentDetail = null;
    try {
      currentDetail = JSON.parse(decodeURIComponent(button.dataset.recentDetail || "%7B%7D"));
    } catch (parseError) {
      currentDetail = { title: "Detalle", rows: [] };
    }
    currentDetail.rows = [...(currentDetail.rows || []), "Minutos no disponibles en FutbolFantasy/API-Football"];
    button.dataset.recentDetail = encodeURIComponent(JSON.stringify(currentDetail));
    button.title = recentMatchTitle(currentDetail);
    if (!qs("#recent-form-popover")?.hidden) openRecentFormPopover(button);
  } finally {
    button.dataset.recentLoading = "false";
  }
};

const handleRecentDotInteraction = (event) => {
  const button = event.target.closest?.(".recent-dot");
  if (!button) {
    if (!event.target.closest?.("#recent-form-popover")) closeRecentFormPopover();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (button.classList.contains("missing") && !button.dataset.recentDetail) return;
  openRecentFormPopover(button);
};

const handleRecentDotHover = (event) => {
  const button = event.target.closest?.(".recent-dot");
  if (!button || button.classList.contains("missing")) return;
  openRecentFormPopover(button);
};

const loadLeagueFixtures = async (showFeedback = true) => {
  const target = qs("#league-fixtures");
  if (!state.biwenger.connected) {
    if (target) target.innerHTML = `<p class="muted-empty">Conecta Biwenger para consultar la jornada actual.</p>`;
    return;
  }
  if (showFeedback) setLeagueOperationStatus("Consultando partidos de la jornada...", "busy");
  if (target) target.innerHTML = `<p class="muted-empty">Cargando partidos y resultados...</p>`;
  try {
    const response = await apiFetch("/api/biwenger/fixtures");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo cargar la jornada actual");
    state.leagueFixtures = payload;
    saveLocalLeagueSnapshot();
    renderLeagueFixtures();
    renderTable();
    if (showFeedback) setLeagueOperationStatus(`Jornada ${payload.round || "actual"} actualizada: ${(payload.events || []).length} partidos.`, "ready");
  } catch (error) {
    if (target) target.innerHTML = `<p class="muted-empty">${escapeHtml(error.message || "No se pudo cargar la jornada actual.")}</p>`;
    if (showFeedback) setLeagueOperationStatus(error.message || "No se pudo cargar la jornada actual.", "error");
  }
};

const renderLiveRound = () => {
  const target = qs("#live-round-ranking");
  if (!target) return;
  const teams = state.liveRound?.teams || [];
  if (!teams.length) {
    const debug = state.liveRoundDebug?.teams || [];
    target.innerHTML = `<p class="muted-empty">Biwenger no ha devuelto alineaciones visibles para esta jornada.</p>${debug.length ? `<pre class="debug-panel">${escapeHtml(JSON.stringify(debug, null, 2))}</pre>` : ""}`;
    return;
  }
  const selectedId = state.selectedLiveRoundUserId && teams.some((team) => Number(team.userId) === Number(state.selectedLiveRoundUserId))
    ? Number(state.selectedLiveRoundUserId)
    : Number(teams[0].userId);
  state.selectedLiveRoundUserId = selectedId;
  const selectedTeam = teams.find((team) => Number(team.userId) === selectedId) || teams[0];
  const groups = (selectedTeam.players || []).reduce((result, player) => {
    (result[player.position] ||= []).push(player);
    return result;
  }, {});
  const hasReliablePoints = Boolean(state.liveRound?.hasReliablePoints);
  const liveRoundPointsText = (team, fallback = "Pts no expuestos") => {
    if (team.pointsReliable && Number.isFinite(Number(team.points))) return `${Number(team.points || 0)} pts`;
    const derived = Array.isArray(team.players)
      ? team.players.reduce((sum, player) => sum + (Number.isFinite(Number(player.roundPoints)) ? Number(player.roundPoints) : 0), 0)
      : 0;
    if (derived > 0) return `${Math.round(derived)} pts*`;
    return fallback;
  };
  target.innerHTML = `
    <div class="live-round-layout">
      <div class="live-round-table">
        ${state.liveRound?.standingsImageUrl ? `
          <a class="official-round-link" href="${escapeHtml(state.liveRound.standingsImageUrl)}" target="_blank" rel="noopener">Ver clasificación oficial de la jornada</a>
          ${!hasReliablePoints ? `<img class="official-round-image" src="${escapeHtml(state.liveRound.standingsImageUrl)}" alt="Clasificación oficial de la jornada" loading="lazy" />` : ""}
        ` : ""}
        ${teams.map((team) => `
          <button class="live-round-row ${Number(team.userId) === selectedId ? "selected" : ""} ${team.isMe ? "is-me" : ""}" type="button" data-live-round-user="${team.userId}">
            <span class="live-rank">#${team.provisionalRank}</span>
            <strong>${escapeHtml(team.name)}</strong>
            <b>${liveRoundPointsText(team, "Ver imagen")}</b>
          </button>
        `).join("")}
      </div>
      <article class="live-team-card ${selectedTeam.isMe ? "is-me" : ""}">
        <header><span class="live-rank">#${selectedTeam.provisionalRank}</span><strong>${escapeHtml(selectedTeam.name)}</strong><b>${liveRoundPointsText(selectedTeam, "Pts en imagen")}</b></header>
        ${(selectedTeam.players || []).length
          ? renderLineupPitch(groups, { label: `Alineacion de ${selectedTeam.name}`, scoreKey: "roundPoints" })
          : `<div class="live-lineup-unavailable">
              <strong>Alineación oficial de Biwenger</strong>
              ${selectedTeam.lineupImageUrl ? `<img src="${escapeHtml(selectedTeam.lineupImageUrl)}" alt="Alineación y puntos de ${escapeHtml(selectedTeam.name)}" loading="lazy" />` : ""}
              <span>${escapeHtml(selectedTeam.visibilityMessage || "Biwenger no expone esta alineación durante la jornada en curso.")}</span>
            </div>`}
      </article>
    </div>
  `;
  target.querySelectorAll("[data-live-round-user]").forEach((button) => button.addEventListener("click", () => {
    state.selectedLiveRoundUserId = Number(button.dataset.liveRoundUser || 0);
    renderLiveRound();
  }));
};

const loadLiveRound = async (showFeedback = true) => {
  const target = qs("#live-round-ranking");
  if (!state.biwenger.connected) {
    if (target) target.innerHTML = `<p class="muted-empty">Conecta Biwenger para consultar la jornada fantasy.</p>`;
    return null;
  }
  if (showFeedback) setLeagueOperationStatus("Consultando alineaciones y puntos actuales...", "busy");
  if (target) target.innerHTML = `<p class="muted-empty">Cargando jornada fantasy...</p>`;
  try {
    const response = await apiFetch("/api/biwenger/live-round");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo cargar la jornada fantasy");
    state.liveRound = payload;
    state.liveRoundFetchedAt = Date.now();
    state.selectedLiveRoundUserId = Number((payload.teams || [])[0]?.userId || 0);
    state.liveRoundDebug = null;
    renderLiveRound();
    renderBidSaleAssistant();
    if (state.biwengerOperations) renderBiwengerOperations();
    if (showFeedback) {
      const pointsText = payload.hasReliablePoints
        ? `${payload.reliablePointsTeams || 0} equipos con puntos confirmados`
        : "Biwenger no expone los puntos de rivales en JSON; se muestra la clasificacion oficial";
      setLeagueOperationStatus(`Ranking provisional actualizado: ${(payload.teams || []).length} equipos, ${payload.lineupsVisible || 0} onces visibles, ${pointsText}.`, "ready");
    }
    return payload;
  } catch (error) {
    if (target) target.innerHTML = `<p class="muted-empty">${escapeHtml(error.message)}</p>`;
    if (showFeedback) setLeagueOperationStatus(error.message, "error");
    return null;
  }
};

const ensureLiveRoundForFinance = async (showFeedback = false) => {
  if (!state.biwenger.connected) return null;
  if (state.liveRound && Date.now() - Number(state.liveRoundFetchedAt || 0) < 90 * 1000) return state.liveRound;
  if (state.liveRoundLoading) return state.liveRoundLoading;
  state.liveRoundLoading = loadLiveRound(showFeedback).finally(() => {
    state.liveRoundLoading = null;
  });
  return state.liveRoundLoading;
};

const loadLeagueOverview = async () => {
  const standings = qs("#league-standings");
  if (!state.biwenger.connected) {
    standings.innerHTML = `<p class="muted-empty">Conecta Biwenger para cargar la clasificación.</p>`;
    return;
  }
  setLeagueOperationStatus("Actualizando clasificacion y centro operativo...", "busy");
  standings.innerHTML = `<p class="muted-empty">Cargando clasificación...</p>`;
  try {
    const response = await apiFetch("/api/biwenger/league");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo cargar la clasificación");
    state.leagueOverview = payload;
    if (activeLeague()) {
      const currentLeague = activeLeague();
      if (payload.leagueIcon) currentLeague.icon = safeRemoteImageUrl(payload.leagueIcon);
      if (payload.leagueCover) currentLeague.cover = safeRemoteImageUrl(payload.leagueCover);
      saveLocalLeagueSnapshot();
      renderLeagueIdentity();
    }
    renderLeagueOverview();
    await loadBiwengerOperations();
    setLeagueOperationStatus("Clasificacion y centro operativo actualizados.", "ready");
  } catch (error) {
    standings.innerHTML = `<p class="muted-empty">${escapeHtml(error.message)}</p>`;
    setLeagueOperationStatus(error.message || "No se pudo actualizar la liga.", "error");
  }
};

const loadRivalTeam = async (userId) => {
  const target = qs("#rival-team");
  if (!userId) return;
  setLeagueOperationStatus("Cargando plantilla, puntuaciones y clausulas del rival...", "busy");
  target.innerHTML = `<p class="muted-empty">Cargando plantilla rival...</p>`;
  try {
    const response = await apiFetch("/api/biwenger/rival-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: Number(userId) })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo cargar la plantilla rival");
    let players = hydrateImportedPlayers(payload.players || []);
    const sourceDiagnostics = {
      ...(payload.sourceDiagnostics || {}),
      enrichment: null,
      recent: null,
      warning: null
    };
    if (players.length && canUseApi()) {
      try {
        setLeagueOperationStatus("Enriqueciendo rival con FutbolFantasy y fuentes publicas...", "busy");
        const enriched = await enrichPlayerListBatched(players, false, (done, total) => {
          setLeagueOperationStatus(`Enriqueciendo rival: ${done}/${total} jugadores...`, "busy");
        });
        players = enriched.players;
        sourceDiagnostics.enrichment = enriched.payload;
      } catch (error) {
        sourceDiagnostics.warning = error.message || "No se pudieron aplicar fuentes publicas al rival";
      }
      if (payload.sourceDiagnostics?.apiFootball?.configured !== false) {
        const recent = await enrichRivalRecentDetails(players, {
          limit: 8,
          onProgress: (done, total, player) => {
            setLeagueOperationStatus(`Consultando API-Football para forma rival: ${done}/${total} (${player.name})...`, "busy");
          }
        });
        players = recent.players;
        sourceDiagnostics.recent = {
          checked: recent.checked,
          enriched: recent.enriched,
          failed: recent.failed,
          errors: recent.errors.slice(0, 4)
        };
      }
    }
    players = players.sort((a, b) =>
      (POSITION_ORDER[a.position] ?? 99) - (POSITION_ORDER[b.position] ?? 99) || Number(b.biwengerValue || b.price) - Number(a.biwengerValue || a.price)
    );
    state.rivalTeam = { ...payload, players, sourceDiagnostics };
    const counts = players.reduce((result, player) => {
      result[player.position] = (result[player.position] || 0) + 1;
      return result;
    }, {});
    const weakest = Object.entries(SQUAD_TARGETS)
      .map(([position, targetCount]) => ({ position, gap: targetCount - (counts[position] || 0) }))
      .sort((a, b) => b.gap - a.gap)[0];
    const analysis = buildRivalAnalysis(players, payload.teamValue, weakest, { ...payload, sourceDiagnostics });
    qs("#rival-intelligence").innerHTML = renderRivalAnalysis(analysis);
    target.innerHTML = players.length ? players.map((player) => `
      <div class="mini-player-row rival-player-row">
        ${renderPlayerMedia(player, "sm")}
        <div><div class="player-name-line"><strong>${escapeHtml(player.name)}</strong>${renderRecentFormDots(player)}</div><span>${renderPositionIcon(player.position)} ${renderScoringBadge(player)} ${escapeHtml(player.team)} · ${formatMoney(player.price)}</span></div>
        <div class="mini-player-actions">
          ${Number(player.clause || 0) > 0 ? `<span class="clause-badge">Clausula ${formatFinanceMoney(player.clause)}</span><button class="danger-button pay-clause" type="button" data-player-id="${player.biwengerPlayerId}" data-owner-id="${payload.userId}" data-amount="${player.clause}" data-player-name="${escapeHtml(player.name)}">Pagar clausula</button>` : `<span class="bid-badge muted">Clausula no visible</span>`}
          ${renderProfileLink(player)}
        </div>
      </div>
    `).join("") : `<p class="muted-empty">La plantilla de este rival no es visible.</p>`;
    target.querySelectorAll(".pay-clause").forEach((button) => button.addEventListener("click", async () => {
      const amount = Number(button.dataset.amount || 0);
      const playerName = button.dataset.playerName || "este jugador";
      if (!window.confirm(`Vas a intentar pagar la clausula de ${playerName} por ${formatFinanceMoney(amount)}. Continuar?`)) return;
      try {
        await biwengerOperation("/api/biwenger/clause", {
          playerId: Number(button.dataset.playerId),
          ownerId: Number(button.dataset.ownerId),
          amount
        }, `Clausula de ${playerName} enviada a Biwenger.`);
      } catch (error) {
        setLeagueOperationStatus(error.message || "No se pudo pagar la clausula.", "error");
      }
    }));
    setLeagueOperationStatus(`Plantilla de ${payload.name || "rival"} cargada.`, "ready");
  } catch (error) {
    target.innerHTML = `<p class="muted-empty">${escapeHtml(error.message)}</p>`;
    setLeagueOperationStatus(error.message || "No se pudo cargar el rival.", "error");
  }
};

const buildRivalAnalysis = (players, teamValue, weakest, payload = {}) => {
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));
  const nullableNumber = (value) => (value === null || value === undefined || value === "" ? null : Number(value));
  const finance = payload.finance || {};
  const tradeSummary = payload.tradeSummary || {};
  const normalizedTeamValue = nullableNumber(finance.teamValue ?? teamValue) ?? 0;
  const cash = nullableNumber(finance.cash);
  const maximumBid = nullableNumber(finance.maximumBid);
  const dailyIncrease = nullableNumber(finance.dailyIncrease);
  const healthText = (player) => String(player.health?.status || player.status || player.fitness || "").toLowerCase();
  const available = players.filter((player) => !["injured", "suspended"].includes(healthText(player)));
  const doubtful = players.filter((player) => /doubt|dud|question/i.test(healthText(player))).length;
  const recentScoresOf = (player) => (Array.isArray(player.sourceSummary?.recentMatches) ? player.sourceSummary.recentMatches : [])
    .map((match) => selectedRecentScore(match))
    .filter((value) => Number.isFinite(Number(value)));
  const recentAverageOf = (player) => {
    const scores = recentScoresOf(player);
    return scores.length ? scores.reduce((sum, value) => sum + Number(value), 0) / scores.length : null;
  };
  const scoreOf = (player) => {
    const direct = Number(player.competitionPoints ?? player.points ?? player.score);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const recentAverage = recentAverageOf(player);
    return Number.isFinite(recentAverage) ? Math.round(recentAverage * 5) : 0;
  };
  const formOf = (player) => {
    const direct = Number(player.form ?? player.formScore ?? player.recommendation);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const recentAverage = recentAverageOf(player);
    return Number.isFinite(recentAverage) ? clamp(45 + recentAverage * 6) : 50;
  };
  const starters = [...players].sort((a, b) => scoreOf(b) - scoreOf(a) || Number(b.price || 0) - Number(a.price || 0)).slice(0, 11);
  const totalPoints = players.reduce((sum, player) => sum + scoreOf(player), 0);
  const starterPoints = starters.reduce((sum, player) => sum + scoreOf(player), 0);
  const averageForm = players.length ? players.reduce((sum, player) => sum + formOf(player), 0) / players.length : 0;
  const valueScore = clamp(Math.log10(Math.max(1, normalizedTeamValue)) * 15 - 60);
  const availability = clamp(players.length ? available.length / players.length * 100 - doubtful * 2 : 0);
  const depth = clamp(players.length / 18 * 72 + Math.min(...Object.keys(SQUAD_TARGETS).map((position) => (players.filter((p) => p.position === position).length / SQUAD_TARGETS[position]) * 28)));
  const performance = clamp(players.length ? totalPoints / players.length * 7 : 0);
  const form = clamp(averageForm);
  const liquidity = Number.isFinite(maximumBid) && maximumBid > 0
    ? clamp(Math.log10(maximumBid) * 18 - 78)
    : (Number.isFinite(cash) ? clamp(Math.log10(Math.max(1, Math.abs(cash))) * 16 - 70 + (cash > 0 ? 14 : -18)) : null);
  const marketActivity = clamp(Number(tradeSummary.activityCount || 0) * 14 + (Number.isFinite(dailyIncrease) ? Math.min(22, Math.max(-16, dailyIncrease / 100000)) : 0));
  const tradingEdge = Number.isFinite(Number(tradeSummary.netBalance))
    ? clamp(50 + Number(tradeSummary.netBalance) / 250000)
    : null;
  const sourceDiagnostics = payload.sourceDiagnostics || {};
  const sourceSummary = {
    totalPlayers: players.length,
    livePlayers: players.filter((player) => player.sourceStatus === "live").length,
    apiFootballPlayers: players.filter((player) =>
      player.sourceSummary?.apiFootball
      || (player.sourceSummary?.recentMatches || []).some((match) => match?.provider === "api-football")
    ).length,
    futbolFantasyPlayers: players.filter((player) =>
      player.sourceLinks?.futbolFantasy
      || player.sourceLinks?.futbolFantasyPublic
      || (player.sources || []).some((source) => /futbolfantasy/i.test(String(source)))
    ).length,
    apiFootballConfigured: sourceDiagnostics.apiFootball?.configured ?? null,
    recentChecked: Number(sourceDiagnostics.recent?.checked || 0),
    recentEnriched: Number(sourceDiagnostics.recent?.enriched || 0),
    recentFailed: Number(sourceDiagnostics.recent?.failed || 0),
    warnings: [
      sourceDiagnostics.warning,
      ...(sourceDiagnostics.recent?.errors || [])
    ].filter(Boolean)
  };
  const threat = clamp(
    valueScore * .18
    + availability * .2
    + depth * .14
    + performance * .22
    + form * .13
    + (liquidity ?? 50) * .08
    + marketActivity * .05
  );
  const ownValue = state.teamPlayers.reduce((sum, player) => sum + Number(player.biwengerValue || player.price || 0), 0);
  const valueDiff = normalizedTeamValue - ownValue;
  const strengths = [];
  const risks = [];
  if (availability >= 85) strengths.push("Tiene casi toda la plantilla disponible.");
  if (performance >= 70) strengths.push("Su rendimiento acumulado es alto.");
  if (depth >= 75) strengths.push("Dispone de buena profundidad para cubrir bajas.");
  if (Number.isFinite(maximumBid) && maximumBid > 0) strengths.push(`Puede pujar hasta ${formatFinanceMoney(maximumBid)} si Biwenger expone bien su límite.`);
  if (Number.isFinite(dailyIncrease) && dailyIncrease > 0) strengths.push(`Su plantilla se ha revalorizado ${formatFinanceMoney(dailyIncrease)} en el último tramo visible.`);
  if (Number(tradeSummary.boughtCount || 0) > 2) strengths.push("Está activo fichando: conviene vigilar sus movimientos antes del cierre.");
  if (valueDiff > 0) strengths.push(`Su plantilla vale ${formatFinanceMoney(valueDiff)} más que la tuya.`);
  if (availability < 75) risks.push(`Tiene ${players.length - available.length} bajas o jugadores no disponibles.`);
  if (doubtful) risks.push(`${doubtful} jugador${doubtful === 1 ? "" : "es"} aparece${doubtful === 1 ? "" : "n"} como dudoso${doubtful === 1 ? "" : "s"}.`);
  if (weakest?.gap > 0) risks.push(`Su punto débil probable es ${POSITION_NAMES[weakest.position]}.`);
  if (depth < 60) risks.push("Una baja importante puede afectar mucho a su once.");
  if (Number.isFinite(cash) && cash < 0) risks.push(`Saldo visible negativo: ${formatFinanceMoney(cash)}.`);
  if (Number.isFinite(dailyIncrease) && dailyIncrease < 0) risks.push(`Su equipo pierde valor: ${formatFinanceMoney(dailyIncrease)}.`);
  if (Number(tradeSummary.soldCount || 0) > Number(tradeSummary.boughtCount || 0) + 1) risks.push("Ha vendido más de lo que ha comprado en el historial visible.");
  const verdict = threat >= 80 ? "Rival muy peligroso" : threat >= 65 ? "Rival fuerte" : threat >= 48 ? "Rival competitivo" : "Rival vulnerable";
  return {
    threat,
    availability,
    depth,
    performance,
    form,
    valueScore,
    liquidity,
    marketActivity,
    tradingEdge,
    teamValue: normalizedTeamValue,
    cash: Number.isFinite(cash) ? cash : null,
    maximumBid: Number.isFinite(maximumBid) ? maximumBid : null,
    dailyIncrease: Number.isFinite(dailyIncrease) ? dailyIncrease : null,
    lastAccess: finance.lastAccess || null,
    tradeSummary,
    totalPoints,
    starterPoints,
    verdict,
    strengths,
    sourceSummary,
    risks
  };
};

const renderRivalSourceStatus = (summary = {}) => {
  const total = Number(summary.totalPlayers || 0);
  const apiFootball = summary.apiFootballConfigured === false
    ? "API-Football no configurada"
    : `API-Football ${Number(summary.apiFootballPlayers || 0)}/${total}`;
  const recent = Number(summary.recentChecked || 0) > 0
    ? `forma reciente ${Number(summary.recentEnriched || 0)}/${Number(summary.recentChecked || 0)}`
    : "forma reciente sin consulta";
  const warnings = (summary.warnings || []).slice(0, 2);
  return `
    <div class="rival-source-status">
      <strong>Fuentes deportivas</strong>
      <span>Enriquecidos ${Number(summary.livePlayers || 0)}/${total} · ${apiFootball} · FF ${Number(summary.futbolFantasyPlayers || 0)}/${total} · ${recent}</span>
      ${warnings.length ? `<small>${warnings.map((item) => escapeHtml(item)).join(" · ")}</small>` : ""}
    </div>
  `;
};

const renderRivalAnalysis = (analysis) => `
  <section class="rival-report">
    <div class="rival-verdict">
      <div class="rival-threat-score">${analysis.threat}</div>
      <div><span>Amenaza global</span><strong>${analysis.verdict}</strong><small>Índice explicable, no una predicción inventada</small></div>
    </div>
    ${renderRivalSourceStatus(analysis.sourceSummary)}
    <div class="rival-metrics">
      ${[
        ["Disponibilidad", analysis.availability],
        ["Rendimiento", analysis.performance],
        ["Profundidad", analysis.depth],
        ["Forma", analysis.form],
        ["Valor", analysis.valueScore],
        ["Liquidez", analysis.liquidity],
        ["Mercado", analysis.marketActivity]
      ].map(([label, value]) => {
        const numeric = Number.isFinite(Number(value)) ? Number(value) : null;
        return `<div class="rival-metric"><span>${label}</span><strong>${numeric === null ? "Sin dato" : numeric}</strong><i><b style="width:${numeric === null ? 0 : numeric}%"></b></i></div>`;
      }).join("")}
    </div>
    <div class="rival-facts">
      <div><span>Valor plantilla</span><strong>${formatFinanceMoney(analysis.teamValue)}</strong></div>
      <div><span>Caja visible</span><strong>${analysis.cash === null ? "Oculto" : formatFinanceMoney(analysis.cash)}</strong></div>
      <div><span>Puja max.</span><strong>${analysis.maximumBid === null ? "Oculto" : formatFinanceMoney(analysis.maximumBid)}</strong></div>
      <div><span>Reval. diaria</span><strong>${analysis.dailyIncrease === null ? "Sin dato" : formatFinanceMoney(analysis.dailyIncrease)}</strong></div>
      <div><span>Último acceso</span><strong>${analysis.lastAccess ? formatActivityDate(analysis.lastAccess) : "Oculto"}</strong></div>
      <div><span>Puntos visibles</span><strong>${analysis.totalPoints}</strong></div>
      <div><span>Potencial mejor once</span><strong>${analysis.starterPoints}</strong></div>
      <div><span>Compras / ventas</span><strong>${Number(analysis.tradeSummary?.boughtCount || 0)} / ${Number(analysis.tradeSummary?.soldCount || 0)}</strong></div>
      <div><span>Balance mercado</span><strong>${formatFinanceMoney(Number(analysis.tradeSummary?.netBalance || 0))}</strong></div>
    </div>
    ${Array.isArray(analysis.tradeSummary?.transactions) && analysis.tradeSummary.transactions.length ? `
      <div class="rival-trades">
        <strong>Movimientos visibles</strong>
        ${analysis.tradeSummary.transactions.slice(0, 5).map((trade) => `
          <span>
            ${trade.direction === "buy" ? "Compra" : "Venta"} · ${escapeHtml(trade.playerName || "Jugador")}
            <b>${formatFinanceMoney(moneyAmount(trade.amount))}</b>
            ${Number.isFinite(Number(trade.overbid)) ? `<em>${Number(trade.overbid) >= 0 ? "+" : ""}${formatFinanceMoney(Number(trade.overbid))} vs valor</em>` : ""}
          </span>
        `).join("")}
      </div>
    ` : ""}
    <div class="rival-conclusions">
      <div><strong>Fortalezas</strong><ul>${(analysis.strengths.length ? analysis.strengths : ["No destaca claramente en los indicadores disponibles."]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      <div><strong>Cómo atacarle</strong><ul>${(analysis.risks.length ? analysis.risks : ["Plantilla equilibrada: vigila sus movimientos de mercado."]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    </div>
  </section>
`;

const loadImageElement = (file) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error("No se pudo leer la imagen"));
  img.src = URL.createObjectURL(file);
});

const prepareImageForOcr = async (file) => {
  const img = await loadImageElement(file);
  const maxWidth = 1800;
  const scale = Math.min(2, maxWidth / img.naturalWidth || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const boosted = gray > 156 ? 255 : gray < 92 ? 0 : gray * 1.08;
    data[i] = boosted;
    data[i + 1] = boosted;
    data[i + 2] = boosted;
  }
  ctx.putImageData(image, 0, 0);
  URL.revokeObjectURL(img.src);
  return canvas;
};

const BIWENGER_MARKET_GRID = {
  kind: "market",
  positions: ["POR", "DF", "MC", "DL"],
  rowYs: [0.354, 0.544, 0.734, 0.919],
  colXsByRow: [
    [0.018, 0.118, 0.218, 0.318, 0.425, 0.525],
    [0.018, 0.118, 0.218, 0.318, 0.425, 0.525, 0.635, 0.735],
    [0.018, 0.118, 0.218, 0.318, 0.425, 0.525, 0.635, 0.735],
    [0.018, 0.118, 0.218, 0.318, 0.425, 0.525, 0.635, 0.735]
  ],
  cardW: 0.105,
  cardH: 0.048,
  minCards: 8
};

const BIWENGER_MARKET_GRID_WIDE = {
  kind: "market",
  positions: ["POR", "DF", "MC", "DL"],
  rowYs: [0.354, 0.544, 0.734, 0.919],
  colXsByRow: [
    [0.016, 0.116, 0.216, 0.316, 0.423, 0.523],
    [0.016, 0.116, 0.216, 0.316, 0.423, 0.523, 0.633, 0.733],
    [0.016, 0.116, 0.216, 0.316, 0.423, 0.523, 0.633, 0.733],
    [0.016, 0.116, 0.216, 0.316, 0.423, 0.523, 0.633, 0.733]
  ],
  cardW: 0.112,
  cardH: 0.052,
  minCards: 8
};

const BIWENGER_SQUAD_GRID = {
  kind: "squad",
  positions: ["POR", "DF", "MC", "DL", "ENT"],
  rowYs: [0.354, 0.544, 0.642, 0.734, 0.928],
  colXs: [0.018, 0.118, 0.218, 0.318],
  cardW: 0.13,
  cardH: 0.055,
  priceYOffset: 0.024,
  priceH: 0.032,
  minCards: 2
};

const BIWENGER_SQUAD_GRID_COMPACT = {
  kind: "squad",
  positions: ["POR", "DF", "MC", "DL", "ENT"],
  rowYs: [0.354, 0.544, 0.642, 0.734, 0.928],
  colXs: [0.02, 0.12, 0.22],
  cardW: 0.145,
  cardH: 0.06,
  priceYOffset: 0.024,
  priceH: 0.032,
  minCards: 2
};

const BIWENGER_SQUAD_GRID_TIGHT = {
  kind: "squad",
  positions: ["POR", "DF", "MC", "DL", "ENT"],
  rowYs: [0.352, 0.542, 0.642, 0.734, 0.928],
  colXs: [0.015, 0.115, 0.215],
  cardW: 0.14,
  cardH: 0.058,
  priceYOffset: 0.024,
  priceH: 0.03,
  minCards: 2
};

const OCR_NAME_CORRECTIONS = {
  "adem arous": "Adem Arous",
  "bekhruz karimov": "Bekhruz Karimov",
  "brown": "Brown",
  "christie": "Christie",
  "de arrascaeta": "De Arrascaeta",
  "elanga": "Anthony Elanga",
  "fernandez pardo": "Matias Fernandez-Pardo",
  "fernandezpardo": "Matias Fernandez-Pardo",
  "gravenberch": "Gravenberch",
  "hugo broos": "Hugo Broos",
  "husam abu dahab": "Husam Abu Dahab",
  "pickford": "Pickford",
  "jordan ayew": "Jordan Ayew",
  "jalal hassan": "Jalal Hassan",
  "jalalhassan": "Jalal Hassan",
  "jean duverne": "Jean Duverne",
  "j quinones": "Julian Quinones",
  "jeremy arevalo": "Jeremy Arevalo",
  "jeremy ar evalo": "Jeremy Arevalo",
  "jeremy ar evalo mera": "Jeremy Arevalo",
  "josue duvergigi": "Josue Duverger",
  "josue duverger": "Josue Duverger",
  "k alizhonov": "K. Alizhonov",
  "kakuta": "Gael Kakuta",
  "lafont": "Lafont",
  "luisromo": "Luis Romo",
  "luis romo": "Luis Romo",
  "matthieu epolo": "Matthieu Epolo",
  "matias galarza": "Matias Galarza",
  "mattias svanberg": "Mattias Svanberg",
  "marc guehi": "Marc Guehi",
  "marc pubill": "Marc Pubill",
  "maignan": "Maignan",
  "merih demiral": "Merih Demiral",
  "meshaal barsham": "Meshaal Barsham",
  "min jae kim": "Min-jae Kim",
  "min jaekim": "Min-jae Kim",
  "minjae kim": "Min-jae Kim",
  "nikola vasilj": "Nikola Vasilj",
  "otamendi": "Otamendi",
  "mudau": "Mudau",
  "orjan nyland": "Orjan Nyland",
  "ozbeh cheshmi": "Roozbeh Cheshmi",
  "patrick berg": "Patrick Berg",
  "provod": "Provod",
  "rafaelledao": "Rafael Leao",
  "rafael ledao": "Rafael Leao",
  "rafael leao": "Rafael Leao",
  "ricardo velho": "Ricardo Velho",
  "robin risser": "Robin Risser",
  "roozbeh cheshmi": "Roozbeh Cheshmi",
  "salem al dawsari": "Salem Al-Dawsari",
  "salem al-dawsari": "Salem Al-Dawsari",
  "samba": "Samba",
  "s. tounekti": "Sebastian Tounekti",
  "s tounekti": "Sebastian Tounekti",
  "santiago arias": "Santiago Arias",
  "scally": "Scally",
  "charles pickel": "Charles Pickel",
  "cristiano ronaldo": "Cristiano Ronaldo",
  "du queiroz": "Du Queiroz",
  "gabriel gudmundsson": "Gabriel Gudmundsson",
  "gabriel gudmundsso": "Gabriel Gudmundsson",
  "joao felix": "Joao Felix",
  "lukebakio": "Lukebakio",
  "matheus cunha": "Matheus Cunha",
  "ahmed al-kassar": "Ahmed Al-Kassar",
  "ahmed alkassar": "Ahmed Al-Kassar",
  "akaydin": "Akaydin",
  "brown": "Brown",
  "cesar montes": "Cesar Montes",
  "carl sainte": "Carl Sainte",
  "thiago almada": "Thiago Almada",
  "toni fruk": "Toni Fruk",
  "trafford": "Trafford"
};

const BIWENGER_OCR_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\u00C0\u00C1\u00C2\u00C4\u00C3\u00C5\u00C6\u00C7\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D1\u00D2\u00D3\u00D4\u00D6\u00D5\u00D8\u00D9\u00DA\u00DB\u00DC\u00DD\u00E0\u00E1\u00E2\u00E4\u00E3\u00E5\u00E6\u00E7\u00E8\u00E9\u00EA\u00EB\u00EC\u00ED\u00EE\u00EF\u00F1\u00F2\u00F3\u00F4\u00F6\u00F5\u00F8\u00F9\u00FA\u00FB\u00FC\u00FD0123456789. -\u20ac";

const looksLikeBiwengerPoster = (img) => {
  const ratio = img.naturalWidth / img.naturalHeight;
  return img.naturalWidth >= 1100 && img.naturalHeight >= 700 && ratio > 1.35 && ratio < 1.75;
};

const detectCompetitionFromOcrText = (text) => {
  const value = normalize(text);
  if (/\bmundial\b|\bselecciones\b|\bseleccion\b|world cup|worldcup|copa del mundo/.test(value)) {
    return "worldcup";
  }
  if (/\bliga\b|\bclubes\b|\bprimera\b|\blaliga\b/.test(value)) {
    return "club";
  }
  return null;
};

const detectBiwengerPosterKind = (text) => {
  const value = normalize(text);
  if (/\bplantilla\b|\bmi equipo\b/.test(value)) return "squad";
  if (/\bmercado\b/.test(value)) return "market";
  return null;
};

const applyCompetitionHint = (competition, reason = "OCR") => {
  if (!competition || competition === state.competition) return false;
  state.competition = competition;
  const select = qs("#competition-select");
  if (select) select.value = competition;
  setLeagueStatus(`${reason}: competicion cambiada a ${competitionMeta().label}.`);
  return true;
};

const prepareHeaderTextCrop = (img) => {
  const canvas = document.createElement("canvas");
  const crop = {
    x: Math.round(img.naturalWidth * 0.015),
    y: Math.round(img.naturalHeight * 0.035),
    w: Math.round(img.naturalWidth * 0.58),
    h: Math.round(img.naturalHeight * 0.17)
  };
  const scale = 2.5;
  canvas.width = Math.round(crop.w * scale);
  canvas.height = Math.round(crop.h * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = gray > 128 ? 0 : 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
};

const biwengerGridCrop = (img, grid, row, col) => {
  const colXs = Array.isArray(grid.colXsByRow?.[row]) ? grid.colXsByRow[row] : grid.colXs;
  const cardW = Array.isArray(grid.cardWByRow) ? (grid.cardWByRow[row] || grid.cardW) : grid.cardW;
  const cardH = Array.isArray(grid.cardHByRow) ? (grid.cardHByRow[row] || grid.cardH) : grid.cardH;
  return {
    x: Math.round(img.naturalWidth * colXs[col]),
    y: Math.round(img.naturalHeight * grid.rowYs[row]),
    w: Math.round(img.naturalWidth * cardW),
    h: Math.round(img.naturalHeight * cardH)
  };
};

const detectBiwengerRowCrops = (img, grid, row) => {
  const fallbackColXs = Array.isArray(grid.colXsByRow?.[row]) ? grid.colXsByRow[row] : grid.colXs;
  const fallbackCardW = Array.isArray(grid.cardWByRow) ? (grid.cardWByRow[row] || grid.cardW) : grid.cardW;
  const fallbackCardH = Array.isArray(grid.cardHByRow) ? (grid.cardHByRow[row] || grid.cardH) : grid.cardH;
  const defaultCrops = fallbackColXs.map((_, col) => biwengerGridCrop(img, grid, row, col));

  const scanWidth = img.naturalWidth;
  const scanY = Math.max(0, Math.round(img.naturalHeight * (grid.rowYs[row] - 0.006)));
  const scanH = Math.max(12, Math.round(img.naturalHeight * Math.max(fallbackCardH * 0.52, 0.026)));
  const canvas = document.createElement("canvas");
  canvas.width = scanWidth;
  canvas.height = scanH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, scanY, scanWidth, scanH, 0, 0, scanWidth, scanH);
  const { data } = ctx.getImageData(0, 0, scanWidth, scanH);
  const density = new Array(scanWidth).fill(0);

  for (let x = 0; x < scanWidth; x += 1) {
    let dark = 0;
    for (let y = 0; y < scanH; y += 1) {
      const index = (y * scanWidth + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const brightness = r * 0.299 + g * 0.587 + b * 0.114;
      if (brightness < 88) dark += 1;
    }
    density[x] = dark / scanH;
  }

  const smoothed = density.map((_, x) => {
    let total = 0;
    let count = 0;
    for (let offset = -4; offset <= 4; offset += 1) {
      const sample = density[x + offset];
      if (sample === undefined) continue;
      total += sample;
      count += 1;
    }
    return count ? total / count : 0;
  });

  const minWidth = Math.round(img.naturalWidth * (grid.kind === "squad" ? 0.045 : 0.04));
  const segments = [];
  let start = null;
  for (let x = 0; x < smoothed.length; x += 1) {
    if (smoothed[x] >= 0.28) {
      if (start === null) start = x;
    } else if (start !== null) {
      if (x - start >= minWidth) segments.push([start, x - 1]);
      start = null;
    }
  }
  if (start !== null && smoothed.length - start >= minWidth) {
    segments.push([start, smoothed.length - 1]);
  }

  const filtered = segments.filter(([left]) => left > Math.round(img.naturalWidth * 0.01));
  if (filtered.length < Math.min(defaultCrops.length, grid.kind === "squad" ? 2 : 4)) {
    return defaultCrops;
  }

  return filtered.map(([left, right]) => {
    const width = right - left + 1;
    const padX = Math.round(width * 0.08);
    const x = Math.max(0, left - padX);
    const w = Math.min(img.naturalWidth - x, Math.round(width + padX * 2));
    return {
      x,
      y: Math.round(img.naturalHeight * grid.rowYs[row]),
      w,
      h: Math.round(img.naturalHeight * fallbackCardH)
    };
  });
};

const biwengerPriceCrop = (img, grid, row, col, cropOverride = null) => {
  const crop = cropOverride || biwengerGridCrop(img, grid, row, col);
  return {
    x: crop.x,
    y: crop.y + Math.round(img.naturalHeight * (grid.priceYOffset || 0.025)),
    w: crop.w,
    h: Math.round(img.naturalHeight * (grid.priceH || 0.024))
  };
};

const prepareWhiteTextCrop = (img, crop, scale = 5) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(crop.w * scale);
  canvas.height = Math.round(crop.h * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const isWhiteText = data[i] > 150 && data[i + 1] > 150 && data[i + 2] > 150;
    const value = isWhiteText ? 0 : 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
};

const recognizeBiwengerCrop = async (canvas, whitelist = BIWENGER_OCR_WHITELIST) => {
  const result = await window.Tesseract.recognize(canvas, "eng", {
    ...OCR_ENGINE_OPTIONS,
    tessedit_pageseg_mode: "6",
    tessedit_char_whitelist: whitelist
  });
  return result?.data?.text || "";
};

const parseOcrPriceCandidate = (rawCandidate) => {
  if (!rawCandidate) return null;

  let raw = String(rawCandidate)
    .replace(/[OoUuVv]/g, "0")
    .replace(/[Il]/g, "1")
    .replace(/[\u00a3\u00a2]/g, "\u20ac")
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "");

  if (!raw || !/\d/.test(raw)) return null;

  let digits;
  if (raw.includes(".")) {
    const groups = raw.split(".").filter(Boolean);
    if (groups.length > 1 && groups[groups.length - 1].length === 2) {
      groups[groups.length - 1] += "0";
    }
    digits = groups.join("");
  } else {
    digits = raw.replace(/\D/g, "");
    if (digits.length === 5) digits += "0";
    if (digits.length === 4) digits += "00";
  }

  let price = Number(digits);
  if (!Number.isFinite(price)) return null;

  if (price >= 100000) {
    price = Math.round(price / 10000) * 10000;
  }

  if (price < 50000 || price > 50000000) return null;
  return price;
};

const extractOcrPrice = (...texts) => {
  for (const text of texts) {
    const normalized = String(text || "").replace(/[\u00a3\u00a2]/g, "\u20ac");
    const candidates = normalized.match(/[0-9OoUuVvIl][0-9OoUuVvIl.,\s]{3,}[0-9OoUuVvIl]/g) || [];
    for (const candidate of candidates) {
      const price = parseOcrPriceCandidate(candidate);
      if (price) return price;
    }
  }
  return null;
};

const cleanBiwengerOcrName = (rawText) => {
  let name = String(rawText || "")
    .replace(/\s+/g, " ")
    .split(/\s+(?:0|O|\u00a9|\[0\]|\(0\))\b/)[0];

  name = stripPriceText(name)
    .replace(/[^A-Za-z\u00C0-\u017F.\-\s]/g, " ")
    .replace(/\b(?:AEE|EEE|ACE|CN|VK|PYRE|PD|ZEN|BEN|LJ|Et|cE|pv|rr|JEN|Cc|Eo|EN)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  name = name
    .replace(/([a-z\u00E0-\u00FF])([A-Z\u00C0-\u017F])/g, "$1 $2")
    .replace(/\b([A-Z])\.\s*/g, "$1. ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = name.split(" ").filter(Boolean);
  while (
    tokens.length > 1
    && !/^[A-Z\u00C0-\u017F]\.$/.test(tokens[0])
    && tokens[0].length <= 3
    && !/[a-z\u00E0-\u00FF]/.test(tokens[0])
  ) {
    tokens.shift();
  }

  name = tokens.join(" ").trim();
  const normalizedKey = normalize(name).replace(/[^\w\s.]/g, "").replace(/\s+/g, " ").trim();
  const corrected = OCR_NAME_CORRECTIONS[normalizedKey] || OCR_NAME_CORRECTIONS[normalizedKey.replace(/\./g, "")];
  return corrected || name;
};

const isTrustedOcrPlayerName = (name) => {
  const key = normalize(name).replace(/[^\w\s.]/g, "").replace(/\s+/g, " ").trim();
  if (!key) return false;
  const correctionKeys = Object.keys(OCR_NAME_CORRECTIONS);
  const correctionValues = Object.values(OCR_NAME_CORRECTIONS).map((value) => normalize(value));
  return correctionKeys.includes(key)
    || correctionValues.includes(key)
    || window.FANTASY_PLAYERS.some((player) => normalize(player.name) === key);
};

const parseBiwengerCardOcr = (text, priceText, position, options = {}) => {
  const name = cleanBiwengerOcrName(text);
  const price = extractOcrPrice(text, priceText);

  if (!name || name.length < 3) return null;
  if (options.requirePrice && !price) return null;
  if (options.requireTrustedName && !isTrustedOcrPlayerName(name)) return null;

  return {
    line: `${name} - ${position}${price ? ` - ${price}` : ""}`,
    name,
    position,
    price
  };
};

const scoreBiwengerCardLines = (lines) => lines.reduce((score, line) => {
  const [name = "", position = "", priceText = ""] = String(line).split(/\s+-\s+/);
  const trusted = isTrustedOcrPlayerName(name) ? 3 : 0;
  const priced = parsePrice(priceText) ? 2 : 0;
  const pos = /^(POR|DF|MC|DL|ENT)$/.test(position) ? 1 : 0;
  return score + trusted + priced + pos;
}, 0);

const extractBiwengerCardsFromGrid = async (img, grid, options = {}) => {
  const cards = [];
  let current = 0;
  const rowCrops = grid.positions.map((_, row) => detectBiwengerRowCrops(img, grid, row));
  const total = rowCrops.reduce((sum, crops) => sum + crops.length, 0);

  for (let row = 0; row < grid.positions.length; row += 1) {
    const crops = rowCrops[row];
    for (let col = 0; col < crops.length; col += 1) {
      current += 1;
      reportOcrStatus(`Cartel Biwenger: leyendo tarjeta ${current}/${total}`, "busy");

      const crop = crops[col];
      const cardCanvas = prepareWhiteTextCrop(img, crop, 5);
      const cardText = await recognizeBiwengerCrop(cardCanvas);
      let priceText = "";
      if (!extractOcrPrice(cardText)) {
        const priceCanvas = prepareWhiteTextCrop(img, biwengerPriceCrop(img, grid, row, col, crop), 9);
        priceText = await recognizeBiwengerCrop(priceCanvas, "0123456789.\u20ac ");
      }

      const parsed = parseBiwengerCardOcr(cardText, priceText, grid.positions[row], {
        requirePrice: grid.kind !== "squad",
        requireTrustedName: options.requireTrustedName || grid.kind === "squad"
      });
      if (parsed) cards.push(parsed.line);
    }
  }

  return [...new Set(cards)];
};

const extractBiwengerPosterTextFromImage = async (file) => {
  const img = await loadImageElement(file);
  if (!looksLikeBiwengerPoster(img)) return null;

  let grid = state.ocrTarget === "team" ? BIWENGER_SQUAD_GRID_COMPACT : BIWENGER_MARKET_GRID;
  state.lastOcrHints.posterKind = grid.kind;
  try {
    reportOcrStatus("Cartel Biwenger: leyendo cabecera...", "busy");
    const headerText = await recognizeBiwengerCrop(
      prepareHeaderTextCrop(img),
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\u00C0\u00C1\u00C2\u00C4\u00C3\u00C7\u00C8\u00C9\u00CA\u00CB\u00CD\u00CE\u00D1\u00D3\u00D4\u00D6\u00DA\u00DC\u00E1\u00E9\u00ED\u00F3\u00FA\u00F1 .-"
    );
    state.lastOcrHints.competition = detectCompetitionFromOcrText(headerText);
    state.lastOcrHints.posterKind = detectBiwengerPosterKind(headerText) || state.lastOcrHints.posterKind;
    if (state.lastOcrHints.posterKind === "squad") {
      grid = BIWENGER_SQUAD_GRID_COMPACT;
    }
  } catch (error) {
    state.lastOcrHints.competition = null;
  }

  const grids = grid.kind === "squad"
    ? [BIWENGER_SQUAD_GRID_COMPACT, BIWENGER_SQUAD_GRID_TIGHT, BIWENGER_SQUAD_GRID]
    : [BIWENGER_MARKET_GRID, BIWENGER_MARKET_GRID_WIDE];
  const attempts = [];
  for (const candidateGrid of grids) {
    const strictCards = await extractBiwengerCardsFromGrid(img, candidateGrid, { requireTrustedName: grid.kind === "market" });
    attempts.push({ grid: candidateGrid, cards: strictCards, score: scoreBiwengerCardLines(strictCards), mode: "strict" });
    if (grid.kind !== "market") {
      continue;
    }
    const looseCards = await extractBiwengerCardsFromGrid(img, candidateGrid);
    attempts.push({ grid: candidateGrid, cards: looseCards, score: scoreBiwengerCardLines(looseCards), mode: "loose" });
  }
  attempts.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return right.cards.length - left.cards.length;
  });
  const best = attempts[0];
  if (!best || !best.cards.length) return null;

  if (best.cards.length >= best.grid.minCards) {
    return best.cards.join("\n");
  }

  if (grid.kind === "market" && best.score >= 12 && best.cards.length >= 2) {
    return best.cards.join("\n");
  }

  if (grid.kind === "squad" && best.score >= 10 && best.cards.length >= 2) {
    return best.cards.join("\n");
  }

  return null;
};

const extractTextFromImage = async (file) => {
  if (!window.Tesseract) {
    throw new Error("No se ha podido cargar el motor OCR. Revisa la conexion a internet y recarga la pagina.");
  }

  state.lastOcrHints = {};
  const posterText = await extractBiwengerPosterTextFromImage(file);
  if (posterText) return posterText;
  if (state.lastOcrHints.posterKind === "market") {
    throw new Error("He detectado el cartel del mercado, pero no suficientes tarjetas fiables. Prueba otra vez con la captura completa y nítida.");
  }

  const image = await prepareImageForOcr(file);
  const result = await window.Tesseract.recognize(image, "spa+eng", {
    ...OCR_ENGINE_OPTIONS,
    logger: (message) => {
      if (message.status === "recognizing text") {
        const pct = Math.round((message.progress || 0) * 100);
        reportOcrStatus(`Leyendo captura... ${pct}%`, "busy");
      } else if (message.status) {
        reportOcrStatus(`Preparando OCR: ${message.status}`, "busy");
      }
    }
  });

  const text = result?.data?.text || "";
  state.lastOcrHints.competition = detectCompetitionFromOcrText(text);
  return text;
};

const teamPositionCounts = () => state.teamPlayers
  .map(playerForCompetition)
  .reduce((counts, player) => {
    const position = player.position || "MC";
    counts[position] = (counts[position] || 0) + 1;
    return counts;
  }, { POR: 0, DF: 0, MC: 0, DL: 0, ENT: 0 });

const squadFitScore = (player) => {
  if (!state.teamPlayers.length) return 58;
  const counts = teamPositionCounts();
  const position = player.position || "MC";
  const target = SQUAD_TARGETS[position] || 4;
  const current = counts[position] || 0;
  const deficit = target - current;

  if (deficit >= 3) return 96;
  if (deficit === 2) return 88;
  if (deficit === 1) return 76;
  if (current >= target + 3) return 28;
  if (current >= target + 1) return 42;
  return 58;
};

const squadFitLabel = (score) => {
  if (score >= 85) return "necesidad alta";
  if (score >= 70) return "cubre carencia";
  if (score <= 35) return "posicion saturada";
  if (score <= 45) return "poca prioridad por plantilla";
  return "encaje neutro";
};

const analyzePlayer = (player, allPlayers) => {
  const totalWeight = Object.values(state.weights).reduce((sum, value) => sum + value, 0) || 1;
  const system = systemScore(player, state.scoring);
  const price = priceScore(player, allPlayers);
  const fit = squadFitScore(player);
  const intelligence = marketIntelligenceForPlayer(player, system, price, fit);
  const relative = marketRelativeProfile(player, allPlayers, intelligence, state.scoring);
  const recent = recentFormProfile(player);
  let score = (
    player.starter * state.weights.starter +
    system * state.weights.system +
    price * state.weights.price +
    player.form * state.weights.form +
    fit * state.weights.fit
  ) / totalWeight;

  score -= riskPenalty(player.risk);
  score += (intelligence.calendar.score - 50) * 0.08;
  score += (intelligence.revaluationScore - 50) * 0.035;
  score += Math.min(3.5, intelligence.pointsPerMillion * 1.5);
  score -= intelligence.contextualRisk * 0.12;
  score += (recent.score - 50) * 0.46;
  if (recent.hot) score += recent.average >= 8 ? 10 : 7;
  if (recent.cold) {
    score = Math.min(score - (state.preferences.riskAverse ? 24 : 18), state.preferences.riskAverse ? 44 : 52);
  }
  if (recent.noRecentMinutes) {
    score = Math.min(score - (state.preferences.riskAverse ? 38 : 30), state.preferences.riskAverse ? 24 : 32);
  }
  score += (relative.valueScore - 50) * 0.09;
  score += (relative.scarcityScore - 50) * (player.starter >= 60 ? 0.055 : 0.018);
  if (intelligence.role === "Cubre una carencia") score += 2;
  if (relative.scarceFit) score += 2.5;
  if (relative.valueScore >= 72 && player.starter >= 65) score += 2;
  if (relative.overpayRisk) score -= Math.min(8, Math.max(3, (relative.pricePercentile - relative.qualityPercentile) * 0.1));
  if (relative.cheapTrap) {
    score = Math.min(score - (player.starter < 30 ? 22 : 14), player.starter < 30 ? 38 : 50);
  }

  const fantasyAverage = fantasyAveragePointsForScoring(player);
  if (Number.isFinite(fantasyAverage)) {
    score += (fantasyPointScore(player) - 50) * 0.12;
    if (player.starter >= 72 && fantasyAverage >= 8) score += 6;
    else if (player.starter >= 65 && fantasyAverage >= 6) score += 3.5;
    if (fantasyAverage <= 1 && player.starter < 65) score -= 4;
  }

  if (state.preferences.riskAverse && player.risk !== "low") score -= player.risk === "high" ? 10 : 5;
  if (state.preferences.investmentMode) {
    score += Math.min(9, Math.max(-6, player.valueTrend));
    score += (intelligence.revaluationScore - 50) * 0.12;
  }

  if (player.sourceStatus === "manual") {
    score = Math.min(score, state.competition === "worldcup" ? 56 : 60);
  } else if (player.sourceStatus === "seed") {
    score = Math.min(score, 82);
  } else if (player.sourceStatus === "live" && (player.dataConfidence || 0) < 58) {
    score = Math.min(score, 76);
  }

  if (player.health?.status === "suspended") {
    score = Math.min(score - 42, 24);
  } else if (player.health?.status === "injured") {
    score = Math.min(score - 30, 36);
  } else if (player.health?.status === "doubtful") {
    score = Math.min(score - 12, 66);
  }
  if (intelligence.noNextMatch) {
    score = Math.min(score - 28, 42);
  }

  if (player.sourceStatus === "live" && player.starter < 45) {
    score = Math.min(score, 58);
  } else if (player.sourceStatus === "live" && player.starter < 60) {
    score = Math.min(score, 68);
  }

  const fantasyStarter = player.sourceSummary?.fantasy?.nextStarterProbability;
  const fantasyStarterUsed = player.sourceSummary?.fantasy?.usedForStarter;
  if (fantasyStarterUsed && Number.isFinite(fantasyStarter)) {
    if (fantasyStarter <= 10) {
      score = Math.min(score - 36, 22);
    } else if (fantasyStarter <= 20) {
      score = Math.min(score - 18, 40);
    } else if (fantasyStarter <= 30) {
      score = Math.min(score - 12, 50);
    } else if (fantasyStarter <= 40) {
      score = Math.min(score - 6, 58);
    }
  }

  const budget = state.filters.budget;
  const overBudget = budget && player.price > budget;
  if (overBudget && state.preferences.strictBudget) score -= 18;
  const exceedsMaximumBid = playerExceedsMaximumBid(player);
  const maximumBidCap = exceedsMaximumBid ? maximumBidRecommendationCap(player) : null;
  if (exceedsMaximumBid) {
    const gap = maximumBidGap(player);
    const gapRatio = gap / Math.max(Number(player.price || 1), 1);
    score = Math.min(score - 30 - Math.min(26, gapRatio * 78), maximumBidCap);
  }

  const intelligenceBidAdjustment = clamp(
    (intelligence.calendar.score - 50) / 500
    + (intelligence.revaluationScore - 50) / 600
    + (relative.valueScore - 50) / 650
    + (relative.scarceFit ? 0.025 : 0)
    - (relative.cheapTrap ? 0.07 : 0)
    - intelligence.contextualRisk / 900,
    -0.1,
    0.11
  );
  const maxBidMultiplier = (score >= 82 ? 1.14 : score >= 72 ? 1.08 : score >= 62 ? 1.02 : 0.94) + intelligenceBidAdjustment;
  const maxBid = player.price ? Math.round(player.price * maxBidMultiplier / 100000) * 100000 : 0;
  const decision = marketDecisionForPlayer({ ...player, squadFitScore: Math.round(fit), recentForm: recent }, score, intelligence, relative, maxBid);
  if (decision.type === "avoid") {
    score = Math.min(score, maximumBidCap ?? 48);
  } else if (decision.type === "watch") {
    score = Math.min(score, 68);
  } else if (decision.type === "buy") {
    score += 1.5;
  }

  return {
    ...player,
    systemScore: system,
    priceScore: Math.round(price),
    squadFitScore: Math.round(fit),
    recentForm: recent,
    marketIntelligence: intelligence,
    marketRelative: relative,
    recommendation: Math.round(clamp(score)),
    marketDecision: decision,
    maxBid,
    dataConfidence: player.dataConfidence ?? (player.sourceStatus === "manual" ? 30 : 62),
    label: recommendationLabel(score),
    overBudget,
    exceedsMaximumBid,
    maximumBidGap: exceedsMaximumBid ? maximumBidGap(player) : 0
  };
};

const filteredPlayers = () => {
  const competitionPlayers = state.players.map(playerForCompetition);
  const analyzed = competitionPlayers
    .map((player) => analyzePlayer(player, competitionPlayers))
    .sort((a, b) => b.recommendation - a.recommendation);

  return analyzed.filter((player) => {
    const notInTeam = !playerIsAlreadyInTeam(player);
    const positionOk = state.filters.position === "all" || player.position === state.filters.position;
    const budgetOk = !state.filters.budget || !state.preferences.strictBudget || player.price <= state.filters.budget;
    return notInTeam && positionOk && budgetOk;
  });
};

const syncMarketPositionFilter = () => {
  const value = state.filters.position || "all";
  const select = qs("#position-filter");
  if (select && select.value !== value) select.value = value;
  qsa("[data-market-position]").forEach((button) => {
    const active = button.dataset.marketPosition === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
};

const syncSettingsControls = () => {
  const weightMap = {
    "#weight-start": "starter",
    "#weight-system": "system",
    "#weight-price": "price",
    "#weight-form": "form",
    "#weight-fit": "fit"
  };
  Object.entries(weightMap).forEach(([selector, key]) => {
    const input = qs(selector);
    if (input) input.value = String(state.weights[key]);
  });
  const budget = qs("#budget-filter");
  if (budget) budget.value = state.filters.budget || "";
  const strictBudget = qs("#strict-budget");
  if (strictBudget) strictBudget.checked = Boolean(state.preferences.strictBudget);
  const riskAverse = qs("#risk-averse");
  if (riskAverse) riskAverse.checked = Boolean(state.preferences.riskAverse);
  const investmentMode = qs("#investment-mode");
  if (investmentMode) investmentMode.checked = Boolean(state.preferences.investmentMode);
  const rewards = normalizedRewardPreferences();
  const rewardInputs = {
    "#reward-point-value": rewards.pointValue,
    "#reward-rank-1": rewards.rank1,
    "#reward-rank-2": rewards.rank2,
    "#reward-rank-3": rewards.rank3,
    "#reward-mvp": rewards.mvp
  };
  Object.entries(rewardInputs).forEach(([selector, value]) => {
    const input = qs(selector);
    if (input) input.value = value ? formatCurrencyInput(value) : "";
  });
  updateWeightLabels();
  syncMarketPositionFilter();
};

const updateWeightLabels = () => {
  Object.entries(state.weights).forEach(([key, value]) => {
    const el = qs(`#weight-${key === "starter" ? "start" : key}-value`);
    if (el) el.textContent = `${value}%`;
  });
};

const renderSummary = (players) => {
  qs("#metric-count").textContent = String(players.length);
  qs("#metric-best").textContent = players[0]?.name || "Pendiente";
  const averageValue = players.length
    ? players.reduce((sum, player) => sum + (player.price || 0), 0) / players.length
    : 0;
  qs("#metric-value").textContent = formatMoney(averageValue);
  qs("#metric-risk").textContent = String(players.filter((player) => player.risk === "high").length);
  renderMarketDecisionCenter(players);
  renderTopFiveRecommendations(players);
  renderStrategicMarket(players);
  renderFinance();
};

const renderFinance = () => {
  const authoritativeOffers = Array.isArray(state.biwengerOperations?.offers)
    ? activeOwnBidOffers(state.biwengerOperations.offers)
    : null;
  const ownBids = authoritativeOffers || state.players.filter((player) => playerHasOwnBid(player));
  const activeBids = ownBids.length;
  const bidTotal = authoritativeOffers
    ? authoritativeOffers.reduce((sum, offer) => sum + moneyAmount(offer.amount), 0)
    : ownBids.reduce((sum, player) => sum + Number(playerOwnBidAmount(player) || 0), 0);
  const futureBalance = Number.isFinite(state.finance.balance) ? state.finance.balance - bidTotal : null;
  const teamRevaluation = state.teamPlayers.reduce((sum, player) => {
    const amount = Number(player.biwengerDiff ?? player.sourceSummary?.fantasy?.biwengerDiff);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const values = {
    "#metric-balance": formatFinanceMoney(state.finance.balance),
    "#metric-team-value": formatFinanceMoney(state.finance.teamValue),
    "#metric-maximum-bid": formatFinanceMoney(state.finance.maximumBid),
    "#metric-bids": String(activeBids),
    "#metric-future-balance": formatFinanceMoney(futureBalance),
    "#team-finance-balance": formatFinanceMoney(state.finance.balance),
    "#team-finance-value": formatFinanceMoney(state.finance.teamValue),
    "#team-finance-revaluation": state.teamPlayers.length ? formatSignedMoney(teamRevaluation) : "S/D"
  };
  Object.entries(values).forEach(([selector, value]) => {
    const node = qs(selector);
    if (node) node.textContent = value;
  });
  const teamBalance = qs("#team-finance-balance");
  if (teamBalance) {
    const balance = Number(state.finance.balance);
    teamBalance.classList.toggle("finance-negative", Number.isFinite(balance) && balance < 0);
    teamBalance.classList.toggle("finance-positive", Number.isFinite(balance) && balance >= 0);
  }
  const teamRevaluationEl = qs("#team-finance-revaluation");
  if (teamRevaluationEl) {
    teamRevaluationEl.classList.toggle("finance-negative", teamRevaluation < 0);
    teamRevaluationEl.classList.toggle("finance-positive", teamRevaluation > 0);
  }
  const analysis = qs("#bid-analysis");
  if (analysis) {
    analysis.className = `bid-analysis ${Number.isFinite(futureBalance) && futureBalance < 0 ? "danger" : ""}`.trim();
    analysis.textContent = Number.isFinite(state.finance.balance)
      ? `${activeBids} puja${activeBids === 1 ? "" : "s"} activa${activeBids === 1 ? "" : "s"} · ${formatFinanceMoney(bidTotal)} comprometidos · saldo proyectado ${formatFinanceMoney(futureBalance)}${futureBalance < 0 ? " · Riesgo: quedarías en negativo si ganas todas." : ""}`
      : "Conecta Biwenger para analizar el impacto de tus pujas.";
  }
};

const renderBid = (player) => {
  const amount = playerOwnBidAmount(player);
  if (!playerHasOwnBid(player) || amount === null) {
    return `<span class="bid-badge muted">Sin puja</span>`;
  }
  return `<span class="bid-badge active" title="${escapeHtml(player.myBidStatus || player.bidStatus || "Puja activa")}">${formatFinanceMoney(amount)}</span>`;
};

const renderRivalBids = (player) => {
  const totalVisible = Number(player.bidCount || 0);
  const ownText = playerHasOwnBid(player) ? " · incluye tu puja" : "";
  const sourceText = player.bidCountSource ? ` · ${player.bidCountSource}` : "";
  if (player.rivalBidVisibility === "amounts" && Number.isFinite(player.highestRivalBid)) {
    return `<span class="bid-badge rival" title="${escapeHtml(`${totalVisible || player.rivalBidCount} pujas visibles${ownText}${sourceText}`)}">Máx. ${formatFinanceMoney(player.highestRivalBid)}</span>`;
  }
  if (totalVisible > 0) {
    return `<span class="bid-badge rival" title="${escapeHtml(`${player.rivalBidCount || 0} de rivales${ownText}${sourceText}`)}">${totalVisible} puja${totalVisible === 1 ? "" : "s"}</span>`;
  }
  if (player.rivalBidVisibility === "count") return `<span class="bid-badge muted" title="${sourceText ? escapeHtml(sourceText.slice(3)) : "Contador consultado"}">0 pujas</span>`;
  return `<span class="bid-badge muted" title="Pulsa actualizar pujas para consultar el contador visible de Biwenger">Consultar</span>`;
};

const marketSellerInfo = (player) => {
  const type = player.marketSellerType || (Number(player.marketOwnerId || 0) > 0 ? "rival" : "free");
  const name = String(player.marketOwnerName || "").trim();
  return {
    type,
    name: name || (type === "rival" ? "Rival" : "Biwenger"),
    label: player.marketSellerLabel || (type === "rival" ? `Vende ${name || "Rival"}` : "Libre")
  };
};

const renderMarketSellerBadge = (player, compact = false) => {
  const seller = marketSellerInfo(player);
  if (seller.type === "rival") {
    return `<span class="seller-badge rival" title="Jugador puesto en venta por un rival">${compact ? "" : "Rival · "}${escapeHtml(seller.name)}</span>`;
  }
  return `<span class="seller-badge free" title="Jugador libre del mercado Biwenger">${compact ? "" : "Libre · "}Biwenger</span>`;
};

const renderTable = () => {
  const body = qs("#results-body");
  const cards = qs("#results-cards");
  const players = filteredPlayers();
  syncMarketPositionFilter();
  renderSummary(players);
  renderCompareOptions(players);

  if (!players.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="16">No hay jugadores que cumplan los filtros.</td></tr>`;
    if (cards) {
      cards.innerHTML = `
        <article class="market-card empty">
          <p>No hay jugadores que cumplan los filtros.</p>
        </article>
      `;
    }
    renderEmptyDetail();
    return;
  }

  body.innerHTML = players.map((player) => `
    <tr data-player-id="${player.id}" class="${player.id === state.selectedPlayerId ? "selected" : ""} ${Number(player.bidCount || player.rivalBidCount || 0) > 0 ? "has-rival-bids" : ""} ${marketSellerInfo(player).type === "rival" ? "has-rival-sale" : ""} ${player.exceedsMaximumBid ? "over-maximum-bid" : ""}">
      <td>
        <div class="player-cell">
          ${renderPlayerMedia(player, "sm")}
          <div>
            <div class="player-name-line"><strong>${player.name}</strong>${renderRecentFormDots(player)}</div>
            <span>${player.team} - ${player.contextLabel} - ${player.label} ${renderScoringBadge(player)}</span>
            ${player.exceedsMaximumBid ? `<span class="market-warning">Supera tu puja maxima por ${formatFinanceMoney(player.maximumBidGap)}</span>` : ""}
            ${renderMarketSignals(player)}
          </div>
        </div>
      </td>
      <td>${renderPositionBadge(player.position)}</td>
      <td>${renderNextMatch(player)}</td>
      <td>
        <div class="price-cell">
          <strong>${formatMoney(player.price)}</strong>
          ${renderValueTrend(player)}
        </div>
      </td>
      <td>${renderMarketSellerBadge(player)}</td>
      <td>${renderDecisionBadge(player)}</td>
      <td>${renderMaximumBidBadge(player)}</td>
      <td>${renderBid(player)}</td>
      <td>${renderRivalBids(player)}</td>
      <td>${player.starter}%</td>
      <td>${player.form}%</td>
      <td>${renderHealthBadge(player)}</td>
      <td><span class="risk-badge ${player.risk}">${riskLabel(player.risk)}</span></td>
      <td><span class="data-badge ${player.sourceStatus || "manual"}">${sourceStatusLabel(player.sourceStatus)}</span></td>
      <td>${renderProfileLink(player)}</td>
      <td>
        <div class="score-meter">
          <strong>${player.recommendation}</strong>
          <div class="bar"><span style="--width: ${player.recommendation}%"></span></div>
        </div>
      </td>
    </tr>
  `).join("");

  if (cards) {
    cards.innerHTML = players.map((player) => `
      <article data-player-id="${player.id}" class="market-card ${player.id === state.selectedPlayerId ? "selected" : ""} ${Number(player.bidCount || player.rivalBidCount || 0) > 0 ? "has-rival-bids" : ""} ${marketSellerInfo(player).type === "rival" ? "has-rival-sale" : ""} ${player.exceedsMaximumBid ? "over-maximum-bid" : ""}">
        <div class="market-card-head">
          <div class="player-cell">
            ${renderPlayerMedia(player, "sm")}
            <div>
              <div class="player-name-line"><strong>${player.name}</strong>${renderRecentFormDots(player)}</div>
              <span>${player.team} - ${player.contextLabel} - ${player.label} ${renderScoringBadge(player)}</span>
              ${player.exceedsMaximumBid ? `<span class="market-warning">No pujable con tu puja maxima actual</span>` : ""}
              ${renderMarketSignals(player)}
            </div>
          </div>
          <div class="market-card-score">
            <span class="market-card-score-label">Nota</span>
            <strong>${player.recommendation}</strong>
          </div>
        </div>
        <div class="market-card-grid">
          <div class="market-card-stat">
            <span>Pos.</span>
            <strong>${renderPositionBadge(player.position)}</strong>
          </div>
          <div class="market-card-stat next-match-stat">
            <span>Próximo partido</span>
            <strong>${renderNextMatch(player, true)}</strong>
          </div>
          <div class="market-card-stat">
            <span>Precio</span>
            <strong>${formatMoney(player.price)}</strong>
            ${renderValueTrend(player)}
          </div>
          <div class="market-card-stat">
            <span>Vendedor</span>
            <strong>${renderMarketSellerBadge(player, true)}</strong>
          </div>
          <div class="market-card-stat decision-card-stat">
            <span>Decisión</span>
            <strong>${renderDecisionBadge(player)}</strong>
            <small>${escapeHtml(player.marketDecision.summary)}</small>
          </div>
          <div class="market-card-stat">
            <span>Puja maxima</span>
            <strong>${renderMaximumBidBadge(player, true)}</strong>
          </div>
          <div class="market-card-stat">
            <span>Tu puja</span>
            <strong>${renderBid(player)}</strong>
          </div>
          <div class="market-card-stat">
            <span>Rivales</span>
            <strong>${renderRivalBids(player)}</strong>
          </div>
          <div class="market-card-stat">
            <span>Titular</span>
            <strong>${player.starter}%</strong>
          </div>
          <div class="market-card-stat">
            <span>Forma</span>
            <strong>${player.form}%</strong>
          </div>
          <div class="market-card-stat">
            <span>Puntos esperados</span>
            <strong>${player.marketIntelligence.expectedPoints.toLocaleString("es-ES")} pts</strong>
          </div>
          <div class="market-card-stat">
            <span>Potencial valor</span>
            <strong>${player.marketIntelligence.revaluationScore}/100</strong>
          </div>
          <div class="market-card-stat">
            <span>Valor relativo</span>
            <strong>${player.marketRelative.valueScore}/100</strong>
          </div>
          <div class="market-card-stat">
            <span>Escasez</span>
            <strong>${player.marketRelative.viableCount}/${player.marketRelative.positionCount} fiables</strong>
          </div>
          <div class="market-card-stat">
            <span>Estado</span>
            <strong>${renderHealthBadge(player)}</strong>
          </div>
          <div class="market-card-stat">
            <span>Riesgo</span>
            <strong><span class="risk-badge ${player.risk}">${riskLabel(player.risk)}</span></strong>
          </div>
          <div class="market-card-stat">
            <span>Datos</span>
            <strong><span class="data-badge ${player.sourceStatus || "manual"}">${sourceStatusLabel(player.sourceStatus)}</span></strong>
          </div>
          <div class="market-card-stat">
            <span>Ficha</span>
            <strong>${renderProfileLink(player)}</strong>
          </div>
        </div>
        <div class="market-card-footer">
          <div class="market-card-footer-copy">
            <span class="market-card-label">${player.label}</span>
            <small>Toca para ver el analisis completo</small>
          </div>
          <div class="score-meter">
            <strong>${player.recommendation}</strong>
            <div class="bar"><span style="--width: ${player.recommendation}%"></span></div>
          </div>
        </div>
      </article>
    `).join("");
  }

  [body, cards].filter(Boolean).forEach((container) => {
    container.querySelectorAll("[data-player-id]").forEach((node) => {
      node.addEventListener("click", () => {
        state.selectedPlayerId = node.dataset.playerId;
        state.pendingMobileDetailOpen = isCompactMarketLayout();
        renderTable();
      });
    });
  });

  const shouldOpenMobileDetail = state.pendingMobileDetailOpen;
  state.pendingMobileDetailOpen = false;
  if (!state.selectedPlayerId || !players.some((player) => player.id === state.selectedPlayerId)) {
    state.selectedPlayerId = players[0].id;
    renderDetail(players[0], { openSheet: false });
  } else {
    renderDetail(players.find((player) => player.id === state.selectedPlayerId), { openSheet: shouldOpenMobileDetail });
  }
};

const detailEmptyMarkup = () => `
  <div class="pitch-visual" aria-hidden="true"><span></span><span></span><span></span></div>
  <h3>Selecciona un jugador</h3>
  <p>Veras la lectura de titularidad, encaje por sistema, precio objetivo y argumentos de fichaje.</p>
`;

const buildDetailMarkup = (player) => {
  const sourceSummary = player.sourceSummary || {};
  const health = player.health || {};
  const intelligence = player.marketIntelligence || marketIntelligenceForPlayer(player, player.systemScore || systemScore(player, state.scoring), player.priceScore || 50, player.squadFitScore || squadFitScore(player));
  const relative = player.marketRelative || marketRelativeProfile(player, state.players.map(playerForCompetition), intelligence, state.scoring);
  const recent = player.recentForm || recentFormProfile(player);
  const confidence = analysisConfidence(player);
  const bidPlan = smartBidPlan(player);
  const recentAverage = Number.isFinite(recent.average)
    ? `${recent.average.toLocaleString("es-ES", { maximumFractionDigits: 1 })} pts de media`
    : "sin media fiable";
  const recentCoverage = recent.matches
    ? `${recent.playedCount}/${recent.matches} partidos con minutos`
    : "sin partidos recientes fiables";
  const profileUrl = playerProfileUrl(player);
  const medicalUrl = health.medicalUrl || profileUrl;
  const sourceEvidence = [
    sourceSummary.sampleSize
      ? `Muestra fuente: ${sourceSummary.sampleSize} partidos (${sourceSummary.starts || 0} titularidades, ${sourceSummary.played || 0} con minutos).`
      : null,
    sourceSummary.avgRating ? `Rating medio SofaScore: ${sourceSummary.avgRating}.` : null,
    sourceSummary.fantasy?.seasonStartRate !== null && sourceSummary.fantasy?.seasonStartRate !== undefined && sourceSummary.fantasy?.seasonMatches > 0
      ? `FutbolFantasy temporada: ${sourceSummary.fantasy.seasonStartRate}% titularidades.`
      : null,
    sourceSummary.fantasy?.seasonMinutesRate !== null && sourceSummary.fantasy?.seasonMinutesRate !== undefined
      ? `FutbolFantasy minutos temporada: ${sourceSummary.fantasy.seasonMinutesRate}%.`
      : null,
    sourceSummary.fantasy?.lastThreeMinutes !== null && sourceSummary.fantasy?.lastThreeMinutes !== undefined
      ? `FutbolFantasy media ultimos 3 partidos: ${sourceSummary.fantasy.lastThreeMinutes} minutos.`
      : null,
    Number.isFinite(fantasyAveragePointsForScoring(player))
      ? `FutbolFantasy puntos ${scoringLabel()}: ${fantasyAveragePointsForScoring(player).toLocaleString("es-ES", { maximumFractionDigits: 1 })} por partido.`
      : null,
    sourceSummary.fantasy?.usedForStarter && Number.isFinite(sourceSummary.fantasy?.nextStarterProbability)
      ? `FutbolFantasy proximo once: ${sourceSummary.fantasy.nextStarterProbability}% titular.`
      : null
  ].filter(Boolean);
  const rivalBidDetails = (player.rivalBids || []).map((bid) =>
    `${escapeHtml(bid.userName || "Rival")}: ${Number.isFinite(bid.amount) ? formatFinanceMoney(bid.amount) : "importe oculto"}`
  );
  const argumentsList = [
    `Contexto: ${competitionMeta().label}.`,
    `Calidad de datos: ${sourceStatusLabel(player.sourceStatus)} (${player.dataConfidence || 0}/100); confianza del análisis ${confidence.label} (${confidence.score}/100).`,
    `Titularidad estimada: ${player.starter}%.`,
    `Racha reciente: ${recent.label} (${recent.score}/100), ${recentCoverage}, ${recentAverage}.`,
    `Encaje en ${qs("#scoring-system").selectedOptions[0].textContent}: ${player.systemScore}/100.`,
    `Encaje con tu plantilla: ${player.squadFitScore}/100 (${squadFitLabel(player.squadFitScore)}).`,
    `Rol recomendado: ${intelligence.role}.`,
    `Puntos esperados: ${intelligence.expectedPoints.toLocaleString("es-ES")} (${intelligence.pointsPerMillion.toLocaleString("es-ES")} por millón invertido).`,
    `Próximos partidos: ${intelligence.calendar.label} (${intelligence.calendar.score}/100).`,
    `Potencial de revalorización: ${intelligence.revaluationScore}/100.`,
    `Valor relativo de mercado: ${relative.valueScore}/100 (${relative.label}); precio percentil ${relative.pricePercentile} y calidad percentil ${relative.qualityPercentile} entre ${POSITION_NAMES[relative.position] || relative.position}.`,
    `Escasez de posición: ${relative.scarcityScore}/100; ${relative.viableCount} de ${relative.positionCount} perfiles de ${relative.position} parecen fiables en este mercado.`,
    relative.cheapTrap ? "Alerta de ganga trampa: el precio parece bajo, pero no compensa si la titularidad o puntos esperados no acompañan." : null,
    relative.overpayRisk ? "Riesgo de sobreprecio: está caro para la calidad relativa que ofrece frente a jugadores de su posición." : null,
    intelligence.contextualReasons.length ? `Riesgo contextual: ${intelligence.contextualRisk}/100 por ${intelligence.contextualReasons.join(", ")}.` : `Riesgo contextual: ${intelligence.contextualRisk}/100.`,
    `Precio objetivo: hasta ${formatMoney(player.maxBid)} segun riesgo y puntuacion.`,
    bidPlan.recommendedBid ? `Puja inteligente: sugerida ${formatFinanceMoney(bidPlan.recommendedBid)}, tope racional ${formatFinanceMoney(bidPlan.rationalMax)} y agresiva ${formatFinanceMoney(bidPlan.aggressiveBid)}.` : "Puja inteligente: no comprometer saldo ahora.",
    player.exceedsMaximumBid
      ? `Puja maxima Biwenger: ${formatFinanceMoney(state.finance.maximumBid)}. No puedes pujar salvo que aumentes saldo o vendas por al menos ${formatFinanceMoney(player.maximumBidGap)}.`
      : Number.isFinite(state.finance.maximumBid) && state.finance.maximumBid > 0
        ? `Puja maxima Biwenger: ${formatFinanceMoney(state.finance.maximumBid)}.`
        : null,
    health.status && health.status !== "available" && health.status !== "unknown"
      ? `Estado medico: ${health.label}${health.expectedReturn ? ` (${health.expectedReturn})` : ""}.`
      : null,
    player.note
  ].filter(Boolean);

  return `
    <div class="detail-header">
      <div class="detail-title">
        ${renderPlayerMedia(player, "lg")}
        <div>
          <div class="detail-title-line"><h3>${escapeHtml(player.name)}</h3>${renderRecentFormDots(player)}</div>
          <p>${escapeHtml(player.team)} - ${escapeHtml(player.contextLabel)} - ${renderPositionBadge(player.position)} ${renderScoringBadge(player)}</p>
        </div>
      </div>
      <div class="score-ring" style="--score: ${player.recommendation}">
        <span>${player.recommendation}</span>
      </div>
    </div>
    ${renderDecisionDetail(player)}
    <section class="smart-bid-detail">
      <div class="section-heading compact-heading">
        <div><p class="eyebrow">Puja inteligente</p><h3>${escapeHtml(playerDecisionSentence(player))}</h3></div>
        ${renderConfidenceBadge(player)}
      </div>
      ${renderSmartBidSummary(player)}
    </section>
    <div class="detail-grid">
      <div class="detail-stat"><span>Precio</span><strong>${formatMoney(player.price)}</strong></div>
      <div class="detail-stat"><span>Vendedor</span><strong>${renderMarketSellerBadge(player)}</strong></div>
      <div class="detail-stat"><span>Decisión</span><strong>${renderDecisionBadge(player)}</strong></div>
      <div class="detail-stat"><span>Puja recomendada</span><strong>${player.marketDecision?.recommendedBid ? formatFinanceMoney(player.marketDecision.recommendedBid) : "No pujar"}</strong></div>
      <div class="detail-stat"><span>Tu puja</span><strong>${playerHasOwnBid(player) ? formatFinanceMoney(playerOwnBidAmount(player)) : "Sin puja"}</strong></div>
      <div class="detail-stat"><span>Pujas rivales</span><strong>${renderRivalBids(player)}</strong></div>
      <div class="detail-stat"><span>Oferta max.</span><strong>${formatMoney(player.maxBid)}</strong></div>
      <div class="detail-stat ${player.exceedsMaximumBid ? "danger" : ""}"><span>Puja max. Biwenger</span><strong>${renderMaximumBidBadge(player)}</strong></div>
      <div class="detail-stat"><span>Riesgo</span><strong>${riskLabel(player.risk)}</strong></div>
      <div class="detail-stat ${recent.cold || recent.noRecentMinutes ? "danger" : ""}"><span>Racha reciente</span><strong>${escapeHtml(recent.label)} · ${recent.score}/100</strong></div>
      <div class="detail-stat"><span>Contexto</span><strong>${player.contextLabel}</strong></div>
      <div class="detail-stat"><span>Datos</span><strong>${sourceStatusLabel(player.sourceStatus)}</strong></div>
      <div class="detail-stat"><span>Confianza</span><strong>${confidence.label} · ${confidence.score}/100</strong></div>
      <div class="detail-stat"><span>Estado</span><strong>${healthMeta(player).label}</strong></div>
      <div class="detail-stat"><span>Plantilla</span><strong>${player.squadFitScore}/100</strong></div>
      <div class="detail-stat"><span>Tendencia</span><strong>${player.valueTrend > 0 ? "+" : ""}${player.valueTrend}%</strong></div>
      <div class="detail-stat"><span>Rol sugerido</span><strong>${escapeHtml(intelligence.role)}</strong></div>
      <div class="detail-stat"><span>Puntos esperados</span><strong>${intelligence.expectedPoints.toLocaleString("es-ES")} pts</strong></div>
      <div class="detail-stat"><span>Valor esperado</span><strong>${intelligence.pointsPerMillion.toLocaleString("es-ES")} pts/M</strong></div>
      <div class="detail-stat"><span>Valor relativo</span><strong>${relative.valueScore}/100</strong></div>
      <div class="detail-stat"><span>Escasez posición</span><strong>${relative.scarcityScore}/100</strong></div>
      <div class="detail-stat"><span>Precio pos.</span><strong>P${relative.pricePercentile}</strong></div>
      <div class="detail-stat"><span>Calidad pos.</span><strong>P${relative.qualityPercentile}</strong></div>
      <div class="detail-stat"><span>Calendario</span><strong>${intelligence.calendar.score}/100</strong></div>
      <div class="detail-stat"><span>Revalorización</span><strong>${intelligence.revaluationScore}/100</strong></div>
      <div class="detail-stat"><span>Riesgo contextual</span><strong>${intelligence.contextualRisk}/100</strong></div>
      <div class="detail-stat"><span>Tope racional</span><strong>${bidPlan.rationalMax ? formatFinanceMoney(bidPlan.rationalMax) : "S/D"}</strong></div>
      <div class="detail-stat"><span>Modo agresivo</span><strong>${bidPlan.aggressiveBid ? formatFinanceMoney(bidPlan.aggressiveBid) : "S/D"}</strong></div>
      ${player.referenceValue ? `<div class="detail-stat"><span>Valor ref.</span><strong>${formatMoney(player.referenceValue)}</strong></div>` : ""}
    </div>
    <section class="market-intelligence-detail">
      <div class="section-heading compact-heading">
        <div><p class="eyebrow">Próximas 3 jornadas</p><h3>${escapeHtml(intelligence.calendar.label)}</h3></div>
      </div>
      ${renderUpcomingCalendar(player)}
    </section>
    <form class="bid-form" data-bid-player-id="${player.biwengerPlayerId || ""}" data-bid-owner-id="${player.marketOwnerId || ""}" data-minimum-bid="${Math.max(1, player.price || 1)}">
      <label>
        Nueva puja
        <input class="bid-amount-input currency-input" type="text" inputmode="numeric" value="${formatCurrencyInput(Math.max(player.price || 0, playerOwnBidAmount(player) || 0, player.marketDecision?.recommendedBid || 0))}" />
      </label>
      <button class="primary-button place-bid-button" type="submit" ${!state.biwenger.connected || !player.biwengerPlayerId || player.exceedsMaximumBid ? "disabled" : ""}>${player.exceedsMaximumBid ? "Supera puja maxima" : "Enviar a Biwenger"}</button>
      <button class="ghost-button query-bid-count" type="button" ${!state.biwenger.connected || !player.biwengerPlayerId || !player.marketOwnerId ? "disabled" : ""}>Consultar pujas rivales</button>
      <small>${player.exceedsMaximumBid ? `Tu puja maxima actual es ${formatFinanceMoney(state.finance.maximumBid)} y el precio minimo supera ese limite.` : (player.rivalBidCount ? "Se muestran solo las pujas rivales que Biwenger revela." : "Biwenger puede ocultar las pujas rivales hasta el cierre.")}</small>
    </form>
    ${rivalBidDetails.length ? `<div class="rival-bid-list"><strong>Pujas rivales visibles</strong>${rivalBidDetails.map((bid) => `<span>${bid}</span>`).join("")}</div>` : ""}
    <div class="recommendation-box">
      <strong>${player.label}</strong><br />
      ${player.overBudget ? "Supera tu presupuesto configurado. " : ""}${player.exceedsMaximumBid ? "No es pujable con tu puja maxima actual. " : ""}${buildRecommendationCopy(player)}
    </div>
    <ul class="argument-list">
      ${argumentsList.map((item) => `<li>${item}</li>`).join("")}
      ${health.detail ? `<li>Parte medico: ${escapeHtml(health.detail)}${health.expectedReturn ? ` - ${escapeHtml(health.expectedReturn)}` : ""}.</li>` : ""}
      ${medicalUrl ? `<li>Ficha/parte: <a href="${medicalUrl}" target="_blank" rel="noopener">${health.medicalUrl ? "Parte medico" : (player.sourceLinks?.futbolFantasy ? "FutbolFantasy" : "Jornada Perfecta")}</a>.</li>` : ""}
      ${sourceEvidence.map((item) => `<li>${item}</li>`).join("")}
      <li>${player.sourceStatus === "live" ? "Fuentes usadas" : "Referencias pendientes de conectar"}: ${(player.sources || []).join(", ")}.</li>
      ${(player.riskReasons || []).map((item) => `<li>${item}.</li>`).join("")}
    </ul>
  `;
};

const closeMobileDetail = () => {
  const sheet = qs("#market-detail-sheet");
  if (!sheet) return;
  sheet.hidden = true;
  document.body.classList.remove("sheet-open");
};

const openMobileDetail = () => {
  const sheet = qs("#market-detail-sheet");
  if (!sheet) return;
  sheet.hidden = false;
  document.body.classList.add("sheet-open");
};

const renderEmptyDetail = () => {
  const detail = qs("#player-detail");
  const mobileDetail = qs("#mobile-player-detail");
  if (detail) {
    detail.className = "detail-empty";
    detail.innerHTML = detailEmptyMarkup();
  }
  if (mobileDetail) {
    mobileDetail.className = "detail-empty";
    mobileDetail.innerHTML = detailEmptyMarkup();
  }
  closeMobileDetail();
};

const renderDetail = (player, options = {}) => {
  if (!player) {
    renderEmptyDetail();
    return;
  }

  const markup = buildDetailMarkup(player);
  const detail = qs("#player-detail");
  const mobileDetail = qs("#mobile-player-detail");
  const title = qs("#market-detail-title");
  if (detail) {
    detail.className = "";
    detail.innerHTML = markup;
  }
  if (mobileDetail) {
    mobileDetail.className = "";
    mobileDetail.innerHTML = markup;
  }
  if (title) title.textContent = player.name;
  qsa(".bid-form").forEach((form) => {
    bindCurrencyInputs(form);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      placeBiwengerBid(form);
    });
    form.querySelector(".query-bid-count")?.addEventListener("click", async () => {
      const button = form.querySelector(".query-bid-count");
      button.disabled = true;
      setOcrStatus("Consultando pujas visibles en Biwenger...", "busy");
      try {
        const response = await apiFetch("/api/biwenger/bid-count", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: Number(form.dataset.bidPlayerId),
            ownerId: Number(form.dataset.bidOwnerId)
          })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Biwenger oculta las pujas");
        const totalCount = Math.max(0, Number(payload.count || 0));
        const rivalCount = Number.isFinite(Number(payload.rivalCount))
          ? Math.max(0, Number(payload.rivalCount || 0))
          : Math.max(0, totalCount - (payload.hasOwnBid || playerHasOwnBid(player) ? 1 : 0));
        state.players = state.players.map((item) => item.id === player.id ? {
          ...item,
          bidCount: totalCount,
          bidCountSource: payload.source || item.bidCountSource || "",
          rivalBidCount: rivalCount,
          rivalBidVisibility: "count"
        } : item);
        setOcrStatus(
          totalCount > 0
            ? `${player.name}: ${totalCount} puja(s) visibles${rivalCount !== totalCount ? `, ${rivalCount} de rivales` : ""}.`
            : `${player.name} no tiene pujas visibles ahora mismo.`,
          "ready"
        );
        renderTable();
      } catch (error) {
        setOcrStatus(error.message || "No se pudieron consultar las pujas.", "error");
      } finally {
        button.disabled = false;
      }
    });
  });
  if (options.openSheet && isCompactMarketLayout()) {
    openMobileDetail();
  }
};

const buildRecommendationCopy = (player) => {
  if (player.marketDecision?.type === "buy") {
    return `Accion recomendada: fichar. Puja sugerida ${formatFinanceMoney(player.marketDecision.recommendedBid)} y tope razonable ${formatFinanceMoney(player.marketDecision.reasonableLimit)}. ${player.marketDecision.reasons.join(" ")}`;
  }
  if (player.marketDecision?.type === "limited") {
    return `Accion recomendada: pujar con limite. No pasaría de ${formatFinanceMoney(player.marketDecision.reasonableLimit)}. ${player.marketDecision.reasons.join(" ")}`;
  }
  if (player.marketDecision?.type === "watch") {
    return `Accion recomendada: vigilar. Esperaría a mejor precio o más datos antes de comprometer saldo. ${player.marketDecision.reasons.join(" ")}`;
  }
  if (player.marketDecision?.type === "avoid") {
    return `Accion recomendada: evitar por ahora. ${player.marketDecision.reasons.join(" ")}`;
  }
  if (player.exceedsMaximumBid) {
    return `Necesitas liberar al menos ${formatFinanceMoney(player.maximumBidGap)} para poder pujar. Aunque guste deportivamente, ahora debe bajar en prioridad frente a opciones pujables.`;
  }
  const intelligence = player.marketIntelligence;
  const relative = player.marketRelative;
  if (relative?.cheapTrap) {
    return `Parece barato frente a su posicion, pero es una ganga trampa: titularidad baja o pocos puntos esperados. Solo entraría si buscas especulación muy barata.`;
  }
  if (relative?.overpayRisk && player.recommendation < 72) {
    return `El precio está por encima de su calidad relativa en ${POSITION_NAMES[relative.position] || relative.position}. No sobrepujes salvo necesidad clara de plantilla.`;
  }
  if (intelligence?.role === "Evitar por ahora") {
    return `No conviene pujar ahora: ${intelligence.contextualReasons.join(", ") || "el riesgo supera el retorno esperado"}.`;
  }
  if (relative?.scarceFit && relative.valueScore >= 65) {
    return `Sube en prioridad porque combina buen valor relativo con escasez en ${POSITION_NAMES[relative.position] || relative.position}: hay ${relative.viableCount} perfiles fiables de ${relative.position} en el mercado.`;
  }
  if (intelligence?.role === "Inversión") {
    return `Interesante para invertir: potencial de valor ${intelligence.revaluationScore}/100 y ${intelligence.pointsPerMillion.toLocaleString("es-ES")} puntos esperados por millón.`;
  }
  if (intelligence?.role === "Cubre una carencia") {
    return `Priorízalo para equilibrar tu plantilla; cubre una necesidad y ofrece ${intelligence.expectedPoints.toLocaleString("es-ES")} puntos esperados.`;
  }
  if (player.recommendation >= 82) {
    return `Merece puja decidida como ${String(intelligence?.role || "titular").toLowerCase()} si no rompe tu estructura salarial.`;
  }
  if (player.recommendation >= 72) {
    return "Buena compra si el mercado no se calienta demasiado.";
  }
  if (player.recommendation >= 62) {
    return "Interesante como oportunidad, pero controla la sobrepuja.";
  }
  return "Compra solo si necesitas cubrir posicion o especular barato.";
};

const renderTeam = () => {
  const roster = qs("#team-roster");
  const countsEl = qs("#team-position-counts");
  if (!roster || !countsEl) return;
  renderFinance();
  applyFutbolFantasySession(state.futbolFantasy);
  const incomingOffers = activeIncomingOffers(state.biwengerOperations?.offers || []);

  const counts = teamPositionCounts();
  countsEl.innerHTML = Object.entries(SQUAD_TARGETS).map(([position, target]) => {
    const count = counts[position] || 0;
    const status = count < target ? "need" : count > target + 1 ? "full" : "ok";
    return `
      <div class="position-count ${status} pos-${position}">
        <span>${position}</span>
        <strong>${count}</strong>
        <small>Objetivo ${target}</small>
      </div>
    `;
  }).join("");

  if (!state.teamPlayers.length) {
    roster.innerHTML = `<p class="muted-empty">Carga tu equipo para ajustar las recomendaciones del mercado.</p>`;
    renderBidSaleAssistant();
    return;
  }

  const players = state.teamPlayers
    .map(playerForCompetition)
    .map((player) => analyzePlayer(player, state.teamPlayers.map(playerForCompetition)))
    .sort((a, b) => (POSITION_ORDER[a.position] ?? 99) - (POSITION_ORDER[b.position] ?? 99)
      || Number(b.competitionPoints || b.points || 0) - Number(a.competitionPoints || a.points || 0));

  const incomingByPlayerId = new Map(incomingOffers.map((offer) => [Number(offer.playerId || 0), offer]));
  roster.innerHTML = Object.keys(POSITION_ORDER).map((position) => {
    const group = players.filter((player) => player.position === position);
    if (!group.length) return "";
    return `
      <section class="roster-group">
        <div class="roster-group-header">
          ${renderPositionIcon(position)}
          <strong>${POSITION_NAMES[position]}</strong>
          <span>${group.length}</span>
        </div>
        ${group.map((player) => `
          ${(() => {
            const incomingOffer = incomingByPlayerId.get(Number(player.biwengerPlayerId || 0));
            const hasOffer = Boolean(incomingOffer);
            return `
          <div class="mini-player-row">
        ${renderPlayerMedia(player, "sm")}
            <div>
              <div class="player-name-line"><strong>${escapeHtml(player.name)}</strong>${renderRecentFormDots(player)}</div>
              <span>${renderPositionIcon(player.position, compactPoints(playerAccumulatedPoints(player)), { title: `${playerAccumulatedPoints(player).toLocaleString("es-ES")} puntos Biwenger` })} ${renderScoringBadge(player)} ${escapeHtml(player.team)} · ${player.starter}% titular${hasOffer ? ` · <button class="team-offer-chip" type="button" data-open-offer-player="${player.biwengerPlayerId}">Ver oferta ${formatFinanceMoney(incomingOffer.amount)}</button>` : ""}</span>
            </div>
            <div class="mini-player-actions">
              ${renderValueTrend(player, { compact: true })}
              ${renderHealthBadge(player)}
              ${renderProfileLink(player)}
            </div>
          </div>
        `; })()}
        `).join("")}
      </section>
    `;
  }).join("");
  roster.querySelectorAll("[data-open-offer-player]").forEach((button) => button.addEventListener("click", async () => {
    openView("league");
    openLeaguePanel("bids");
    if (state.biwenger.connected) await loadBiwengerOperations(false);
    const playerId = Number(button.dataset.openOfferPlayer || 0);
    const offerRow = qs(`#bid-center [data-player-id="${playerId}"]`);
    if (offerRow) offerRow.scrollIntoView({ behavior: "smooth", block: "center" });
  }));
  renderBidSaleAssistant();
};

const lineupPlayerScore = (player) => {
  const system = systemScore(player, state.scoring);
  let score = player.starter * 0.48 + system * 0.27 + player.form * 0.25;
  score -= riskPenalty(player.risk) * 0.8;
  const intelligence = player.marketIntelligence || marketIntelligenceForPlayer(player, system, player.priceScore || 50, player.squadFitScore || squadFitScore(player));
  if (player.health?.status === "suspended") score -= 55;
  else if (player.health?.status === "injured") score -= 42;
  if (player.health?.status === "doubtful") score -= 16;
  if (intelligence.noNextMatch) score -= 32;
  const fantasyStarter = player.sourceSummary?.fantasy?.nextStarterProbability;
  if (Number.isFinite(fantasyStarter)) {
    if (fantasyStarter <= 10) score -= 34;
    else if (fantasyStarter <= 30) score -= 10;
  }
  return Math.round(clamp(score));
};

const calculateBestLineup = () => {
  const players = state.teamPlayers.map(playerForCompetition).map((player) => ({
    ...player,
    lineupScore: lineupPlayerScore(player)
  }));
  const byPosition = players.reduce((groups, player) => {
    const position = player.position || "MC";
    groups[position] = groups[position] || [];
    groups[position].push(player);
    return groups;
  }, {});

  Object.values(byPosition).forEach((group) => group.sort((a, b) => b.lineupScore - a.lineupScore));

  return FORMATIONS.map((formation) => {
    const selected = [];
    const missing = [];
    Object.entries(formation.slots).forEach(([position, amount]) => {
      const options = byPosition[position] || [];
      selected.push(...options.slice(0, amount));
      const gap = amount - options.length;
      if (gap > 0) missing.push(`${gap} ${position}`);
    });
    const total = selected.reduce((sum, player) => sum + player.lineupScore, 0);
    const penalty = missing.length * 120;
    return { formation, selected, missing, total, rankingScore: total - penalty };
  }).sort((a, b) => b.rankingScore - a.rankingScore)[0];
};

const editableLineupFromRecommendation = (recommendation = calculateBestLineup()) => {
  if (!recommendation) return null;
  const captain = [...recommendation.selected].sort((a, b) => b.lineupScore - a.lineupScore)[0] || null;
  const striker = [...recommendation.selected]
    .filter((player) => player.position === "DL" && String(player.id) !== String(captain?.id || ""))
    .sort((a, b) => b.lineupScore - a.lineupScore)[0]
    || [...recommendation.selected]
      .filter((player) => String(player.id) !== String(captain?.id || ""))
      .sort((a, b) => b.lineupScore - a.lineupScore)[0]
    || null;
  return {
    formationName: recommendation.formation.name,
    playerIds: recommendation.selected.map((player) => player.id),
    captainId: captain?.id || null,
    strikerId: striker?.id || null
  };
};

const teamPlayersWithLineupScore = () => state.teamPlayers.map(playerForCompetition).map((player) => ({
  ...player,
  lineupScore: lineupPlayerScore(player)
}));

const lineupForFormation = (formationName) => {
  const formation = FORMATIONS.find((item) => item.name === formationName) || FORMATIONS[0];
  const players = teamPlayersWithLineupScore();
  const selected = [];
  Object.entries(formation.slots).forEach(([position, amount]) => {
    selected.push(...players
      .filter((player) => player.position === position)
      .sort((a, b) => b.lineupScore - a.lineupScore)
      .slice(0, amount));
  });
  const captain = [...selected].sort((a, b) => b.lineupScore - a.lineupScore)[0];
  const striker = [...selected]
    .filter((player) => player.position === "DL" && String(player.id) !== String(captain?.id || ""))
    .sort((a, b) => b.lineupScore - a.lineupScore)[0]
    || [...selected].filter((player) => String(player.id) !== String(captain?.id || "")).sort((a, b) => b.lineupScore - a.lineupScore)[0];
  return {
    formationName: formation.name,
    playerIds: selected.map((player) => player.id),
    captainId: captain?.id || null,
    strikerId: striker?.id || null
  };
};

const resolvedEditableLineup = () => {
  const formation = FORMATIONS.find((item) => item.name === state.editableLineup?.formationName) || FORMATIONS[0];
  const players = teamPlayersWithLineupScore();
  const byId = new Map(players.map((player) => [String(player.id), player]));
  const selected = (state.editableLineup?.playerIds || []).map((id) => byId.get(String(id))).filter(Boolean);
  const selectedById = new Map(selected.map((player) => [String(player.id), player]));
  const captain = selectedById.get(String(state.editableLineup?.captainId || "")) || [...selected].sort((a, b) => b.lineupScore - a.lineupScore)[0] || null;
  const strikerCandidate = selectedById.get(String(state.editableLineup?.strikerId || ""));
  const striker = (strikerCandidate && String(strikerCandidate.id) !== String(captain?.id || "") ? strikerCandidate : null)
    || [...selected].filter((player) => player.position === "DL" && String(player.id) !== String(captain?.id || "")).sort((a, b) => b.lineupScore - a.lineupScore)[0]
    || [...selected].filter((player) => String(player.id) !== String(captain?.id || "")).sort((a, b) => b.lineupScore - a.lineupScore)[0]
    || null;
  return { formation, selected, players, captain, striker };
};

const selectIdealLineup = () => {
  state.recommendedLineup = calculateBestLineup();
  state.editableLineup = editableLineupFromRecommendation(state.recommendedLineup);
  renderLineup();
  saveActiveLeague();
  setTeamStatus("Once ideal seleccionado. Puedes cambiar tactica o jugadores antes de enviarlo.", "ready");
};

const distributePitchLine = (players, y) => {
  const count = players.length;
  if (!count) return [];
  return players.map((player, index) => {
    const x = count === 1 ? 50 : 16 + (index * (68 / (count - 1)));
    return { player, x, y };
  });
};

const liveRoundScoreClass = (value) => {
  const score = Number(value || 0);
  if (score <= 0) return score < 0 ? "negative" : "zero";
  if (score <= 5) return "low";
  if (score <= 9) return "good";
  return "elite";
};

const renderLineupPitch = (groups, options = {}) => {
  const scoreKey = options.scoreKey || "competitionPoints";
  const positions = [
    ...distributePitchLine(groups.DL || [], 18),
    ...distributePitchLine(groups.MC || [], 42),
    ...distributePitchLine(groups.DF || [], 66),
    ...distributePitchLine(groups.POR || [], 88)
  ];

  return `
    <div class="football-pitch" aria-label="${escapeHtml(options.label || "Campo con alineacion recomendada")}">
      <div class="pitch-mark center-circle" aria-hidden="true"></div>
      <div class="pitch-mark box top" aria-hidden="true"></div>
      <div class="pitch-mark box bottom" aria-hidden="true"></div>
      <div class="pitch-mark halfway" aria-hidden="true"></div>
      ${positions.map(({ player, x, y }) => `
        <div class="pitch-player ${player.health?.status === "injured" || player.health?.status === "doubtful" ? "alert" : ""}" style="--x: ${x}%; --y: ${y}%">
          ${(player.isCaptain || String(player.id) === String(options.captainId || "")) || (player.isStriker || String(player.id) === String(options.strikerId || "")) ? `
            <span class="pitch-role-badges">
              ${player.isCaptain || String(player.id) === String(options.captainId || "") ? `<b class="pitch-role-badge captain" title="Capitan">C</b>` : ""}
              ${player.isStriker || String(player.id) === String(options.strikerId || "") ? `<b class="pitch-role-badge striker" title="Ariete" aria-label="Ariete">👟</b>` : ""}
            </span>
          ` : ""}
          <b class="pitch-score pitch-score-top ${liveRoundScoreClass(player[scoreKey])}">${Number(player[scoreKey] || 0)} pts</b>
          ${renderPlayerMedia(player, "sm")}
          <strong>${escapeHtml(player.name)}</strong>
          <div class="pitch-player-meta">${renderPositionBadge(player.position)} ${renderScoringBadge(player)}</div>
          ${renderRecentFormDots(player)}
        </div>
      `).join("")}
    </div>
  `;
};

const openView = (viewName) => {
  qsa(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  qsa(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
  if (viewName !== "market") closeMobileDetail();
};

const openLeaguePanel = (panelName) => {
  qsa(".league-tab").forEach((item) => item.classList.toggle("active", item.dataset.leagueTab === panelName));
  qsa(".league-workspace").forEach((panel) => panel.classList.toggle("active", panel.dataset.leaguePanel === panelName));
  if (panelName === "assistant") {
    renderBidSaleAssistant();
    if (state.biwenger.connected && !state.biwengerOperations) loadBiwengerOperations(false);
    if (state.biwenger.connected) {
      ensureLiveRoundForFinance(false).then(() => {
        renderBidSaleAssistant();
      });
    }
  }
  if (panelName === "bids") {
    if (state.biwenger.connected && !state.biwengerOperations) loadBiwengerOperations(false);
    if (state.biwenger.connected) {
      ensureLiveRoundForFinance(false).then(() => {
        renderBiwengerOperations();
      });
    }
  }
  if (panelName === "fixtures" && !state.leagueFixtures) loadLeagueFixtures(false);
  if (panelName === "live-round" && !state.liveRound) loadLiveRound(false);
};

const renderLineup = () => {
  const output = qs("#lineup-output");
  if (!output) return;

  if (!state.teamPlayers.length) {
    output.innerHTML = `<p class="muted-empty">Guarda tu equipo y calcula el once ideal para ver formacion, titulares y alertas.</p>`;
    return;
  }

  const best = calculateBestLineup();
  if (!best) {
    output.innerHTML = `<p class="muted-empty">No hay suficientes datos para calcular alineacion.</p>`;
    return;
  }
  state.recommendedLineup = best;
  if (!state.editableLineup?.formationName || !Array.isArray(state.editableLineup.playerIds)) {
    state.editableLineup = editableLineupFromRecommendation(best);
  }
  const editable = resolvedEditableLineup();
  const groups = editable.selected.reduce((acc, player) => {
    const position = player.position || "MC";
    acc[position] = acc[position] || [];
    acc[position].push(player);
    return acc;
  }, {});
  const recommendedCoach = state.teamPlayers
    .map(playerForCompetition)
    .filter((player) => player.position === "ENT")
    .map((player) => ({ ...player, lineupScore: lineupPlayerScore(player) }))
    .sort((a, b) => b.lineupScore - a.lineupScore)[0] || null;
  const missing = Object.entries(editable.formation.slots)
    .map(([position, amount]) => ({ position, amount, actual: (groups[position] || []).length }))
    .filter((item) => item.actual < item.amount)
    .map((item) => `${item.amount - item.actual} ${item.position}`);
  const total = editable.selected.reduce((sum, player) => sum + player.lineupScore, 0);
  const canSend = editable.selected.length === 11
    && new Set(editable.selected.map((player) => player.id)).size === 11
    && editable.selected.every((player) => Number(player.biwengerPlayerId || 0) > 0);

  output.innerHTML = `
    <div class="lineup-editor-toolbar">
      <label>
        Tactica
        <select id="lineup-formation-select">
          ${FORMATIONS.map((formation) => `<option value="${formation.name}" ${formation.name === editable.formation.name ? "selected" : ""}>${formation.name}</option>`).join("")}
        </select>
      </label>
      <label>
        Capitan
        <select id="lineup-captain-select">
          ${editable.selected.filter((player) => String(player.id) !== String(editable.striker?.id || "")).map((player) => `<option value="${escapeHtml(player.id)}" ${String(player.id) === String(editable.captain?.id || "") ? "selected" : ""}>${escapeHtml(player.name)}</option>`).join("")}
        </select>
      </label>
      <label>
        Ariete
        <select id="lineup-striker-select">
          ${editable.selected.filter((player) => String(player.id) !== String(editable.captain?.id || "")).map((player) => `<option value="${escapeHtml(player.id)}" ${String(player.id) === String(editable.striker?.id || "") ? "selected" : ""}>${escapeHtml(player.name)} · ${player.position}</option>`).join("")}
        </select>
      </label>
      <span>Elige titulares, capitan y ariete antes de enviar.</span>
    </div>
    <div class="lineup-summary">
      <div>
        <span class="eyebrow">Formacion</span>
        <strong>${editable.formation.name}</strong>
      </div>
      <div>
        <span class="eyebrow">Nota once</span>
        <strong>${Math.round(total / Math.max(editable.selected.length, 1))}/100</strong>
      </div>
      <div>
        <span class="eyebrow">Alertas</span>
        <strong>${missing.length ? missing.join(", ") : "Completo"}</strong>
      </div>
      <div>
        <span class="eyebrow">Entrenador</span>
        <strong>${recommendedCoach ? escapeHtml(recommendedCoach.name) : "Sin entrenador"}</strong>
      </div>
    </div>
    <div class="lineup-actions">
      <button class="primary-button send-lineup-biwenger" type="button" ${canSend && state.biwenger.connected ? "" : "disabled"}>
        Enviar once a Biwenger
      </button>
      <span>${canSend ? "Once preparado con identificadores Biwenger." : "Importa la plantilla desde Biwenger para poder enviarlo."}</span>
    </div>
    ${renderLineupPitch(groups, { captainId: editable.captain?.id, strikerId: editable.striker?.id })}
    <div class="lineup-grid editable-lineup-grid">
      ${["POR", "DF", "MC", "DL"].map((position) => `
        <div class="lineup-line">
          ${renderPositionBadge(position)}
          ${(groups[position] || []).map((player) => `
            <label class="lineup-player-select ${player.health?.status === "injured" || player.health?.status === "doubtful" ? "alert" : ""}">
              ${renderPlayerMedia(player, "sm")}
              <span class="lineup-slot-control">
                <select class="lineup-slot-select" data-current-player-id="${escapeHtml(player.id)}" aria-label="Titular ${position}">
                  ${editable.players.filter((candidate) => candidate.position === position).sort((a, b) => b.lineupScore - a.lineupScore).map((candidate) =>
                    `<option value="${escapeHtml(candidate.id)}" ${candidate.id === player.id ? "selected" : ""}>${escapeHtml(candidate.name)} · ${candidate.lineupScore}/100</option>`
                  ).join("")}
                </select>
                ${renderPlayerPerformanceMeta(player, { compact: true })}
              </span>
            </label>
          `).join("")}
        </div>
      `).join("")}
      ${recommendedCoach ? `<div class="lineup-line">${renderPositionBadge("ENT")}<div class="lineup-player">${renderPlayerMedia(recommendedCoach, "sm")}<div><div class="player-name-line"><strong>${escapeHtml(recommendedCoach.name)}</strong>${renderRecentFormDots(recommendedCoach)}</div><span>${renderScoringBadge(recommendedCoach)} Entrenador recomendado</span></div></div></div>` : ""}
    </div>
  `;
  output.querySelector("#lineup-formation-select")?.addEventListener("change", (event) => {
    state.editableLineup = lineupForFormation(event.target.value);
    renderLineup();
    saveActiveLeague();
  });
  output.querySelector("#lineup-captain-select")?.addEventListener("change", (event) => {
    state.editableLineup.captainId = event.target.value;
    renderLineup();
    saveActiveLeague();
  });
  output.querySelector("#lineup-striker-select")?.addEventListener("change", (event) => {
    state.editableLineup.strikerId = event.target.value;
    renderLineup();
    saveActiveLeague();
  });
  output.querySelectorAll(".lineup-slot-select").forEach((select) => select.addEventListener("change", () => {
    const currentId = String(select.dataset.currentPlayerId || "");
    const nextId = String(select.value || "");
    const ids = [...state.editableLineup.playerIds].map(String);
    const currentIndex = ids.indexOf(currentId);
    const duplicateIndex = ids.indexOf(nextId);
    if (currentIndex >= 0) ids[currentIndex] = nextId;
    if (duplicateIndex >= 0 && duplicateIndex !== currentIndex) ids[duplicateIndex] = currentId;
    state.editableLineup.playerIds = ids;
    if (String(state.editableLineup.captainId || "") === currentId) state.editableLineup.captainId = nextId;
    else if (String(state.editableLineup.captainId || "") === nextId && duplicateIndex >= 0) state.editableLineup.captainId = currentId;
    if (String(state.editableLineup.strikerId || "") === currentId) state.editableLineup.strikerId = nextId;
    else if (String(state.editableLineup.strikerId || "") === nextId && duplicateIndex >= 0) state.editableLineup.strikerId = currentId;
    renderLineup();
    saveActiveLeague();
  }));
  output.querySelector(".send-lineup-biwenger")?.addEventListener("click", sendEditableLineup);
};

const sendEditableLineup = async () => {
  const editable = resolvedEditableLineup();
  if (!editable.selected.length) return;
  const button = document.querySelector(".send-lineup-biwenger");
  if (button) button.disabled = true;
  try {
    const response = await apiFetch("/api/biwenger/lineup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: editable.formation.name,
        playersID: editable.selected.map((player) => Number(player.biwengerPlayerId || 0)).filter(Boolean),
        captain: Number(editable.captain?.biwengerPlayerId || 0),
        striker: Number(editable.striker?.biwengerPlayerId || 0)
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo enviar la alineacion");
    setTeamStatus(`Alineacion ${editable.formation.name} enviada con capitan y ariete.`, "ready");
  } catch (error) {
    setTeamStatus(error.message || "No se pudo enviar la alineacion.", "error");
  } finally {
    if (button) button.disabled = false;
  }
};

const renderCompareOptions = (players) => {
  const options = players.map((player) => `<option value="${player.id}">${player.name} - ${player.team} - ${player.recommendation}</option>`).join("");
  qs("#compare-a").innerHTML = options || `<option value="">Sin jugadores</option>`;
  qs("#compare-b").innerHTML = options || `<option value="">Sin jugadores</option>`;
  if (players[1]) qs("#compare-b").value = players[1].id;
};

const runCompare = () => {
  const players = filteredPlayers();
  const a = players.find((player) => player.id === qs("#compare-a").value);
  const b = players.find((player) => player.id === qs("#compare-b").value);
  const output = qs("#compare-output");

  if (!a || !b) {
    output.innerHTML = `<h3>Sin comparacion</h3><p>Analiza un mercado y elige dos jugadores.</p>`;
    return;
  }

  const winner = a.recommendation >= b.recommendation ? a : b;
  const loser = winner.id === a.id ? b : a;
  const gap = Math.abs(a.recommendation - b.recommendation);
  const winnerPlan = smartBidPlan(winner);
  const loserPlan = smartBidPlan(loser);
  const verdict = gap <= 4
    ? "Decisión ajustada: decide por precio final y necesidad de posición."
    : `${winner.name} tiene ventaja clara por recomendación, confianza y retorno esperado.`;

  output.innerHTML = `
    <div class="winner-box">
      <span class="eyebrow">Mejor encaje</span>
      <span class="winner-name">${winner.name}</span>
      <p>${escapeHtml(verdict)} ${winner.name} supera a ${loser.name} por ${gap} puntos. Tope racional: ${formatFinanceMoney(winnerPlan.rationalMax)} frente a ${formatFinanceMoney(loserPlan.rationalMax)}.</p>
    </div>
    <div class="compare-decision-grid">
      ${renderCompareCard(a, winner.id === a.id)}
      ${renderCompareCard(b, winner.id === b.id)}
    </div>
    <div class="compare-matrix">
      ${renderCompareRow("Recomendación", a.recommendation, b.recommendation, "%")}
      ${renderCompareRow("Titularidad", a.starter, b.starter, "%")}
      ${renderCompareRow("Racha", a.recentForm?.score || 0, b.recentForm?.score || 0, "/100")}
      ${renderCompareRow("Calendario", a.marketIntelligence?.calendar?.score || 0, b.marketIntelligence?.calendar?.score || 0, "/100")}
      ${renderCompareRow("Encaje equipo", a.squadFitScore || 0, b.squadFitScore || 0, "/100")}
      ${renderCompareRow("Confianza", analysisConfidence(a).score, analysisConfidence(b).score, "/100")}
    </div>
  `;
};

const renderCompareCard = (player, winner = false) => {
  const plan = smartBidPlan(player);
  const confidence = analysisConfidence(player);
  return `
    <article class="compare-card ${winner ? "winner" : ""}">
      <header>
        ${renderPlayerMedia(player, "sm")}
        <div>
          <div class="player-name-line"><strong>${escapeHtml(player.name)}</strong>${renderRecentFormDots(player)}</div>
          <span>${renderPositionBadge(player.position)} ${renderScoringBadge(player)} ${escapeHtml(player.team)} · ${formatMoney(player.price)}</span>
        </div>
      </header>
      <div class="score-meter">
        <strong>${player.recommendation}</strong>
        <div class="bar"><span style="--width: ${player.recommendation}%"></span></div>
      </div>
      ${renderSmartBidSummary(player)}
      <p>${escapeHtml(playerDecisionSentence(player))}</p>
      <small>${renderConfidenceBadge(player)} ${renderDecisionBadge(player)} ${renderRivalBids(player)}</small>
    </article>
  `;
};

const renderCompareRow = (label, aValue, bValue, suffix = "") => {
  const left = Number(aValue || 0);
  const right = Number(bValue || 0);
  return `
    <div class="compare-row">
      <span>${escapeHtml(label)}</span>
      <strong class="${left >= right ? "positive" : ""}">${left}${suffix}</strong>
      <strong class="${right >= left ? "positive" : ""}">${right}${suffix}</strong>
    </div>
  `;
};

const renderCompareBar = (player) => `
  <label>
    ${player.name} - ${player.team} - ${formatMoney(player.price)}
    <div class="bar"><span style="--width: ${player.recommendation}%"></span></div>
  </label>
`;

const loadDemo = () => {
  const demoLines = state.competition === "worldcup"
    ? [
      "Oihan Sancet - Espana - MC - 12.300.000",
      "Ante Budimir - Croacia - DL - 9.800.000",
      "Take Kubo - Japon - DL - 15.100.000",
      "Raphinha - Brasil - DL - 18.400.000",
      "Pepelu - Espana - MC - 5.900.000",
      "Lucas Boye - Argentina - DL - 4.200.000"
    ]
    : [
      "Oihan Sancet - Athletic - MC - 12.300.000",
      "Ante Budimir - Osasuna - DL - 9.800.000",
      "Pepelu - Valencia - MC - 5.900.000",
      "Dani Vivian - Athletic - DF - 6.200.000",
      "Joan Garcia - Espanyol - POR - 7.300.000",
      "Lucas Boye - Granada - DL - 4.200.000"
    ];

  qs("#market-text").value = demoLines.join("\n");
  analyzeMarket();
};

const analyzeMarket = async () => {
  if (state.isAnalyzing) return;

  state.ocrTarget = "market";
  let inputText = qs("#market-text").value.trim();
  const hasImage = Boolean(state.selectedImageFile);
  setAnalyzeBusy(true, !inputText && hasImage ? "Leyendo foto" : "Analizando");

  try {
    if (!inputText && hasImage) {
      setOcrStatus("Leyendo captura del mercado...", "busy");
      const extractedText = await extractTextFromImage(state.selectedImageFile);
      const changedCompetition = applyCompetitionHint(state.lastOcrHints.competition, "OCR de mercado");
      const preparedLines = prepareMarketLines(extractedText);
      inputText = preparedLines.join("\n");
      qs("#market-text").value = inputText || extractedText.trim();
      setOcrStatus(
        preparedLines.length
          ? `OCR completado: ${preparedLines.length} posibles jugadores detectados.${changedCompetition ? " Detectado modo Mundial." : ""}`
          : "OCR completado, pero no he podido reconstruir jugadores con precio.",
        preparedLines.length ? "ready" : "error"
      );
    } else if (inputText && hasImage) {
      setOcrStatus("Analizando el texto pegado. La captura queda como apoyo visual.", "ready");
    }

    const players = removeTeamPlayersFromMarket(parseMarketText(inputText), state.teamPlayers);
    state.players = players;
    qs("#market-text").value = biwengerPlayersToText(state.players);
    state.selectedPlayerId = null;
    qs("#last-updated").textContent = new Date().toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
    renderTable();
    setSourceBusy(false);
    if (players.length) {
      await enrichCurrentMarket(false);
    } else {
      setSourceStatus("Sin jugadores para consultar fuentes.", "error");
      await saveActiveLeague();
    }
  } catch (error) {
    setOcrStatus(error.message || "No se pudo leer la captura.", "error");
  } finally {
    setAnalyzeBusy(false);
  }
};

const mergeTeamPlayerEdits = (parsedPlayers, existingPlayers) => {
  const existingByName = new Map(existingPlayers.map((player) => [normalize(player.name), player]));
  return parsedPlayers.map((parsed) => {
    const existing = existingByName.get(normalize(parsed.name));
    if (!existing) return parsed;
    return cleanWorldcupPlayerIdentity({
      ...parsed,
      ...existing,
      name: parsed.name || existing.name,
      team: parsed.team && !/sin (seleccion|equipo)/i.test(parsed.team) ? parsed.team : existing.team,
      position: existing.biwengerPosition || parsed.position || existing.position,
      biwengerPosition: existing.biwengerPosition || null,
      price: parsed.price || existing.price,
      id: existing.id,
      biwengerPlayerId: existing.biwengerPlayerId || parsed.biwengerPlayerId || null,
      media: { ...(parsed.media || {}), ...(existing.media || {}) },
      sourceLinks: { ...(parsed.sourceLinks || {}), ...(existing.sourceLinks || {}) },
      sourceSummary: { ...(parsed.sourceSummary || {}), ...(existing.sourceSummary || {}) }
    });
  });
};

const analyzeTeam = async () => {
  if (state.isAnalyzingTeam) return;

  state.ocrTarget = "team";
  let inputText = qs("#team-text").value.trim();
  const hasImage = Boolean(state.selectedTeamImageFile);
  setTeamBusy(true, hasImage ? "Leyendo foto" : "Guardando");

  try {
    if (hasImage) {
      setTeamStatus("Leyendo captura de tu equipo...", "busy");
      const extractedText = await extractTextFromImage(state.selectedTeamImageFile);
      const changedCompetition = applyCompetitionHint(state.lastOcrHints.competition, "OCR de equipo");
      const preparedLines = prepareMarketLines(extractedText);
      inputText = preparedLines.join("\n");
      qs("#team-text").value = inputText || extractedText.trim();
      setTeamStatus(
        preparedLines.length
          ? `OCR completado: ${preparedLines.length} jugadores detectados.${changedCompetition ? " Detectado modo Mundial." : ""}`
          : "OCR completado, pero revisa el texto detectado.",
        preparedLines.length ? "ready" : "error"
      );
    }

    const parsedPlayers = parseMarketText(inputText);
    const players = mergeTeamPlayerEdits(parsedPlayers, state.teamPlayers);
    state.teamPlayers = players;
    state.players = removeTeamPlayersFromMarket(state.players, state.teamPlayers);
    state.editableLineup = null;
    qs("#market-text").value = biwengerPlayersToText(state.players);
    renderTeam();
    renderTable();

    if (players.length && canUseApi()) {
      setTeamStatus("Consultando fuentes para tu plantilla...", "busy");
      const { players: enriched } = await enrichPlayerListBatched(players, false, (done, total) => {
        setTeamStatus(`Consultando fuentes para tu plantilla: ${done}/${total}...`, "busy");
      });
      state.teamPlayers = enriched;
      state.players = removeTeamPlayersFromMarket(state.players, state.teamPlayers);
      qs("#market-text").value = biwengerPlayersToText(state.players);
      setTeamStatus(`Equipo guardado: ${state.teamPlayers.length} jugadores enriquecidos.`, "ready");
    } else if (players.length) {
      setTeamStatus(`Equipo guardado: ${players.length} jugadores.`, "ready");
    } else {
      setTeamStatus("No he detectado jugadores en el equipo.", "error");
    }

    renderTeam();
    renderTable();
    renderLineup();
    await saveActiveLeague();
  } catch (error) {
    setTeamStatus(error.message || "No se pudo leer tu equipo.", "error");
  } finally {
    setTeamBusy(false);
  }
};

const exportCsv = () => {
  const players = filteredPlayers();
  if (!players.length) return;
  const rows = [
    ["Competicion", "Jugador", "Equipo", "Contexto", "Posicion", "Precio", "Tipo vendedor", "Vendedor", "Decision", "Puja recomendada", "Tope razonable", "Puja actual", "Titularidad", "Forma", "Estado", "Lesion", "Tiempo baja", "Riesgo", "Datos", "Confianza", "Recomendacion", "Oferta maxima", "Ficha"],
    ...players.map((player) => [
      competitionMeta().label,
      player.name,
      player.team,
      player.contextLabel,
      player.position,
      player.price,
      marketSellerInfo(player).type === "rival" ? "Rival" : "Libre",
      marketSellerInfo(player).name,
      player.marketDecision?.label || "",
      player.marketDecision?.recommendedBid || "",
      player.marketDecision?.reasonableLimit || "",
      player.bidAmount || "",
      player.starter,
      player.form,
      healthMeta(player).label,
      player.health?.detail || "",
      player.health?.expectedReturn || "",
      riskLabel(player.risk),
      sourceStatusLabel(player.sourceStatus),
      player.dataConfidence,
      player.recommendation,
      player.maxBid,
      playerProfileUrl(player) || ""
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mercado-fantasy-recomendaciones.csv";
  link.click();
  URL.revokeObjectURL(url);
};

const initNavigation = () => {
  qsa(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      openView(button.dataset.view);
      if (button.dataset.view === "league") loadLeagueOverview();
      if (button.dataset.view === "team" && state.biwenger.connected) loadBiwengerOperations(false);
    });
  });
};

const saveApiConfiguration = async (value) => {
  writeStoredApiBase(value);
  syncApiConfigUi();
  await refreshSourceDbStatus();
  if (state.players.length && canUseApi()) {
    await enrichCurrentMarket(hasStaleStarterSignals(state.players));
  }
};

const initEvents = () => {
  qs("#load-demo").addEventListener("click", loadDemo);
  qs("#sync-biwenger").addEventListener("click", () => refreshBiwengerStatus());
  qs("#biwenger-login").addEventListener("click", biwengerLogin);
  qs("#biwenger-import-market").addEventListener("click", () => importFromBiwenger("market"));
  qs("#biwenger-import-team").addEventListener("click", () => importFromBiwenger("team"));
  qs("#market-refresh-inline")?.addEventListener("click", () => importFromBiwenger("market"));
  qs("#team-refresh-inline")?.addEventListener("click", () => importFromBiwenger("team"));
  qs("#biwenger-logout").addEventListener("click", biwengerLogout);
  qs("#ff-login").addEventListener("click", futbolFantasyLogin);
  qs("#ff-cookie-login").addEventListener("click", futbolFantasyCookieLogin);
  qs("#ff-sync-team").addEventListener("click", syncTeamToFutbolFantasy);
  qs("#ff-open-tracking").addEventListener("click", openFutbolFantasyTracking);
  qs("#ff-logout").addEventListener("click", futbolFantasyLogout);
  qs("#refresh-league").addEventListener("click", loadLeagueOverview);
  qs("#refresh-assistant").addEventListener("click", async () => {
    setLeagueOperationStatus("Recalculando asistente diario...", "busy");
    if (state.biwenger.connected) {
      await loadBiwengerOperations(false);
      await ensureLiveRoundForFinance(false);
      await refreshBiwengerStatus("Asistente sincronizado con Biwenger.");
    }
    renderBidSaleAssistant();
    setLeagueOperationStatus("Asistente diario recalculado.", "ready");
  });
  qs("#refresh-fixtures").addEventListener("click", () => loadLeagueFixtures(true));
  qs("#refresh-live-round").addEventListener("click", () => loadLiveRound(true));
  qs("#rival-select").addEventListener("change", (event) => loadRivalTeam(event.target.value));
  qsa(".league-tab").forEach((button) => button.addEventListener("click", () => {
    openLeaguePanel(button.dataset.leagueTab);
  }));
  qs("#renew-sales").addEventListener("click", async () => {
    try { await biwengerOperation("/api/biwenger/sales-renew", {}, "Ventas renovadas correctamente."); }
    catch (error) { setLeagueOperationStatus(error.message, "error"); }
  });
  qs("#delete-league").addEventListener("click", deleteActiveLeague);
  qs("#analyze-market").addEventListener("click", analyzeMarket);
  qs("#clear-input").addEventListener("click", () => {
    qs("#market-text").value = "";
    state.players = [];
    state.selectedPlayerId = null;
    state.selectedImageFile = null;
    qs("#image-upload").value = "";
    qs("#image-preview").hidden = true;
    qs("#last-updated").textContent = "Sin mercado cargado";
    qs("#image-dropzone strong").textContent = "Captura del mercado";
    qs("#image-dropzone p").textContent = "Plan B manual. Si Biwenger directo no esta disponible, prueba aqui.";
    setOcrStatus("Entrada manual vaciada. Puedes importar desde Biwenger o pegar jugadores.", "ready");
    setSourceBusy(false);
    refreshSourceDbStatus();
    renderTable();
    saveActiveLeague();
  });
  qs("#export-csv").addEventListener("click", exportCsv);
  qs("#refresh-market-bids").addEventListener("click", async () => {
    if (!state.biwenger.connected) {
      setOcrStatus("Conecta Biwenger para consultar las pujas visibles del mercado.", "error");
      return;
    }
    const button = qs("#refresh-market-bids");
    button.disabled = true;
    setOcrStatus("Consultando el número de pujas visibles en Biwenger...", "busy");
    try {
      const payload = await loadBiwengerOperations(false);
      if (!payload) throw new Error("Biwenger no ha devuelto los contadores de pujas.");
      const visible = state.players.filter((player) => player.rivalBidVisibility === "count").length;
      const contested = state.players.filter((player) => Number(player.bidCount || player.rivalBidCount || 0) > 0).length;
      setOcrStatus(`Pujas actualizadas: ${contested} jugadores con pujas visibles entre ${visible} contadores consultados.`, "ready");
    } catch (error) {
      setOcrStatus(error.message || "No se pudieron actualizar las pujas.", "error");
    } finally {
      button.disabled = false;
    }
  });
  qs("#run-compare").addEventListener("click", runCompare);
  qs("#refresh-sources").addEventListener("click", () => enrichCurrentMarket(true));
  qs("#analyze-team").addEventListener("click", analyzeTeam);
  qs("#calculate-lineup").addEventListener("click", selectIdealLineup);
  qs("#clear-team").addEventListener("click", () => {
    qs("#team-text").value = "";
    state.teamPlayers = [];
    state.editableLineup = null;
    state.selectedTeamImageFile = null;
    qs("#team-image-upload").value = "";
    qs("#team-image-preview").hidden = true;
    qs("#team-image-dropzone strong").textContent = "Captura de tu equipo";
    qs("#team-image-dropzone p").textContent = "Solo como respaldo manual si no puedes importar la plantilla.";
    setTeamStatus("Equipo vaciado en esta liga.", "ready");
    renderTeam();
    renderTable();
    renderLineup();
    saveActiveLeague();
  });

  qs("#league-select").addEventListener("change", async (event) => {
    if (!event.target.value) return;
    const selectedLeagueId = event.target.value;
    const localSelection = selectLocalLeague(selectedLeagueId);
    applyLeaguePayload(localSelection);
    setLeagueStatus("Liga seleccionada. Sincronizando...");
    if (!canUseApi()) {
      setLeagueStatus("Liga seleccionada en este dispositivo.");
      if (state.players.length) enrichCurrentMarket(hasStaleStarterSignals(state.players));
      return;
    }
    try {
      const response = await apiFetch("/api/leagues/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: selectedLeagueId })
      });
      if (response.ok) {
        const payload = await response.json();
        const merged = mergeLeaguePayloads(buildLocalLeaguePayload(ensureLocalLeagueDb()), payload);
        merged.activeLeagueId = selectedLeagueId;
        applyLeaguePayload(merged);
      }
    } catch (error) {
      // The local selection remains authoritative when the server is unavailable.
    }
    if (state.biwenger.authenticated) {
      await syncSelectedLeagueWithBiwenger();
    } else if (state.players.length) {
      enrichCurrentMarket(hasStaleStarterSignals(state.players));
    }
  });

  qs("#create-league").addEventListener("click", createLeagueFromInput);
  qs("#league-name").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    createLeagueFromInput();
  });

  qs("#competition-select").addEventListener("change", (event) => {
    state.competition = event.target.value;
    state.selectedPlayerId = null;
    renderTable();
    renderTeam();
    renderLineup();
    saveActiveLeague();
    if (state.players.length) enrichCurrentMarket(hasStaleStarterSignals(state.players));
  });

  qs("#scoring-system").addEventListener("change", (event) => {
    state.scoring = event.target.value;
    renderTable();
    renderTeam();
    renderLineup();
    renderBiwengerOperations();
    const rivalId = qs("#rival-select")?.value;
    if (rivalId) loadRivalTeam(rivalId);
    saveActiveLeague();
  });

  const weightMap = {
    "#weight-start": "starter",
    "#weight-system": "system",
    "#weight-price": "price",
    "#weight-form": "form",
    "#weight-fit": "fit"
  };
  Object.entries(weightMap).forEach(([selector, key]) => {
    qs(selector).addEventListener("input", (event) => {
      state.weights[key] = Number(event.target.value);
      updateWeightLabels();
      renderTable();
      renderLineup();
      persistLeagueSettings();
    });
  });

  qs("#position-filter").addEventListener("change", (event) => {
    state.filters.position = event.target.value;
    renderTable();
    persistLeagueSettings();
  });
  qsa("[data-market-position]").forEach((button) => button.addEventListener("click", () => {
    state.filters.position = button.dataset.marketPosition || "all";
    renderTable();
    persistLeagueSettings();
  }));

  qs("#budget-filter").addEventListener("input", (event) => {
    const value = Number(event.target.value);
    state.filters.budget = value > 0 ? value : null;
    renderTable();
    persistLeagueSettings();
  });

  qs("#strict-budget").addEventListener("change", (event) => {
    state.preferences.strictBudget = event.target.checked;
    renderTable();
    persistLeagueSettings();
  });
  qs("#risk-averse").addEventListener("change", (event) => {
    state.preferences.riskAverse = event.target.checked;
    renderTable();
    persistLeagueSettings();
  });
  qs("#investment-mode").addEventListener("change", (event) => {
    state.preferences.investmentMode = event.target.checked;
    renderTable();
    persistLeagueSettings();
  });
  const rewardInputMap = {
    "#reward-point-value": "pointValue",
    "#reward-rank-1": "rank1",
    "#reward-rank-2": "rank2",
    "#reward-rank-3": "rank3",
    "#reward-mvp": "mvp"
  };
  Object.entries(rewardInputMap).forEach(([selector, key]) => {
    const input = qs(selector);
    input?.addEventListener("input", () => {
      state.preferences.rewards = {
        ...(state.preferences.rewards || {}),
        [key]: parseCurrencyInput(input.value)
      };
      renderBidSaleAssistant();
      renderBiwengerOperations();
      persistLeagueSettings();
    });
  });
  bindCurrencyInputs(qs(".reward-config-card"));
  qs("#save-api-config").addEventListener("click", async () => {
    const input = qs("#api-base-url");
    const value = trimTrailingSlash(input.value.trim());
    if (value && !/^https?:\/\//i.test(value)) {
      setApiConfigStatus("La URL debe empezar por http:// o https://", "error");
      return;
    }
    setApiConfigStatus("Probando API...", "busy");
    await saveApiConfiguration(value);
  });
  qs("#clear-api-config").addEventListener("click", async () => {
    qs("#api-base-url").value = "";
    setApiConfigStatus("Volviendo a la API por defecto...", "busy");
    await saveApiConfiguration("");
  });
  qs("#close-market-detail").addEventListener("click", closeMobileDetail);
  qs("#close-market-detail-backdrop").addEventListener("click", closeMobileDetail);
  qs("#close-fixture-video")?.addEventListener("click", closeFixtureVideo);
  qs("#fixture-video-backdrop")?.addEventListener("click", closeFixtureVideo);
  document.addEventListener("click", handleRecentDotInteraction, true);
  document.addEventListener("mouseover", handleRecentDotHover, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeRecentFormPopover();
  });
  window.addEventListener("resize", () => {
    if (!isCompactMarketLayout()) closeMobileDetail();
    closeRecentFormPopover();
  });

  qs("#image-upload").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.selectedImageFile = file;
    const preview = qs("#image-preview");
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    qs("#image-dropzone strong").textContent = file.name;
    qs("#image-dropzone p").textContent = "Captura cargada. Solo se usara como respaldo si no entras por Biwenger directo.";
    setOcrStatus("Captura cargada como respaldo manual.", "ready");
  });

  qs("#team-image-upload").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.selectedTeamImageFile = file;
    state.teamPlayers = [];
    state.editableLineup = null;
    qs("#team-text").value = "";
    renderTeam();
    renderLineup();
    renderTable();
    const preview = qs("#team-image-preview");
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    qs("#team-image-dropzone strong").textContent = file.name;
    qs("#team-image-dropzone p").textContent = "Captura cargada como respaldo manual para la plantilla.";
    setTeamStatus("Captura de equipo cargada como respaldo.", "ready");
  });
};

const init = async () => {
  initNavigation();
  initEvents();
  initScorebatWidget();
  syncApiConfigUi();
  updateWeightLabels();
  refreshOcrAvailability();
  renderTable();
  renderTeam();
  renderLineup();
  setSourceBusy(false);
  refreshSourceDbStatus();
  await loadLeagues();
  await refreshBiwengerStatus();
  await refreshFutbolFantasyStatus();
  if (state.biwenger.authenticated) await syncSelectedLeagueWithBiwenger();
};

init();
