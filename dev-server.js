const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 5173);
const host = process.env.FMS_HOST || "127.0.0.1";
const publicOrigin = String(process.env.FMS_PUBLIC_ORIGIN || "").replace(/\/+$/, "");
const allowedOrigins = String(process.env.FMS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const sourceTimeoutMs = 9000;
const sourceCacheMs = 1000 * 60 * 20;
const playerCacheMs = 1000 * 60 * 60 * 24;
const sourceCriteriaVersion = 7;
const sourceCache = new Map();
const dbDir = path.join(root, ".fantasy-db");
const assetsDir = path.join(dbDir, "assets");
const playerDbPath = path.join(dbDir, "players.json");
const leaguesDbPath = path.join(dbDir, "leagues.json");
let playerDb = { version: 1, players: {}, updatedAt: null };
let leaguesDb = { version: 1, activeLeagueId: null, leagues: {} };

const types = {
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

const sourceHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FantasyMarketScout/1.0",
  "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
};

const loadPlayerDb = () => {
  try {
    if (!fs.existsSync(playerDbPath)) return;
    const parsed = JSON.parse(fs.readFileSync(playerDbPath, "utf8"));
    if (parsed && typeof parsed === "object" && parsed.players) {
      playerDb = {
        version: parsed.version || 1,
        players: parsed.players || {},
        updatedAt: parsed.updatedAt || null
      };
    }
  } catch (error) {
    console.warn(`No se pudo leer la base local: ${error.message}`);
  }
};

const savePlayerDb = () => {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    playerDb.updatedAt = new Date().toISOString();
    fs.writeFileSync(playerDbPath, JSON.stringify(playerDb, null, 2), "utf8");
  } catch (error) {
    console.warn(`No se pudo guardar la base local: ${error.message}`);
  }
};

const loadLeaguesDb = () => {
  try {
    if (!fs.existsSync(leaguesDbPath)) return;
    const parsed = JSON.parse(fs.readFileSync(leaguesDbPath, "utf8"));
    if (parsed && typeof parsed === "object" && parsed.leagues) {
      leaguesDb = {
        version: parsed.version || 1,
        activeLeagueId: parsed.activeLeagueId || null,
        leagues: parsed.leagues || {}
      };
    }
  } catch (error) {
    console.warn(`No se pudo leer la base local de ligas: ${error.message}`);
  }
};

const saveLeaguesDb = () => {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(leaguesDbPath, JSON.stringify(leaguesDb, null, 2), "utf8");
  } catch (error) {
    console.warn(`No se pudo guardar la base local de ligas: ${error.message}`);
  }
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const normalizeText = (text) =>
  String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const slugify = (text) =>
  normalizeText(text)
    .replace(/\band\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cacheKeyForPlayer = (player, competition) => {
  const nameKey = searchOverrides.get(normalizeText(player.name)) || player.name;
  return `${competition}:${slugify(nameKey)}:${mapPosition(player.position || "")}`;
};

const stripHtml = (html) =>
  String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(",", ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : null;
};

const average = (values) => {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
};

const readRequestBody = (req) => new Promise((resolve, reject) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 2500000) {
      reject(new Error("Body too large"));
      req.destroy();
    }
  });
  req.on("end", () => resolve(body));
  req.on("error", reject);
});

const corsOriginFor = (req) => {
  const origin = String(req.headers.origin || "").replace(/\/+$/, "");
  if (!origin) return allowedOrigins[0] || "*";
  if (!allowedOrigins.length) return "*";
  return allowedOrigins.includes(origin) ? origin : null;
};

const buildCorsHeaders = (req, extra = {}) => {
  const origin = corsOriginFor(req);
  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-FMS-Device-Key"
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    if (origin !== "*") headers.Vary = "Origin";
  }
  return { ...headers, ...extra };
};

const sendJson = (req, res, status, payload) => {
  res.writeHead(status, buildCorsHeaders(req, {
    "Content-Type": "application/json;charset=utf-8",
    "Cache-Control": "no-store"
  }));
  res.end(JSON.stringify(payload));
};

const createLeagueId = () => `league-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const sanitizePlayerForLeague = (player) => {
  const allowed = [
    "id", "name", "team", "clubTeam", "baseTeam", "nationalTeam", "position", "price",
    "starter", "form", "asScore", "sofascore", "stats", "valueTrend", "risk",
    "riskReasons", "sourceStatus", "dataConfidence", "sources", "note",
    "competitionScope", "health", "sourceLinks", "sourceSummary", "media",
    "referenceValue", "competitionProfiles", "contextLabel", "criteriaVersion",
    "biwengerValue", "biwengerDiff", "biwengerPlayerId", "marketOwnerId", "salePrice",
    "bidAmount", "bidCount", "bidStatus", "hasBid", "myBidAmount", "myBidStatus",
    "rivalBids", "rivalBidCount", "highestRivalBid", "rivalBidVisibility",
    "label", "recommendation", "maxBid", "systemScore", "squadFitScore", "overBudget"
  ];
  return allowed.reduce((copy, key) => {
    if (player && player[key] !== undefined) copy[key] = player[key];
    return copy;
  }, {});
};

const sanitizeLeaguePayload = (payload = {}) => ({
  competition: payload.competition === "worldcup" ? "worldcup" : "club",
  scoring: ["mixed", "as", "sofascore", "stats"].includes(payload.scoring) ? payload.scoring : "mixed",
  marketPlayers: Array.isArray(payload.marketPlayers)
    ? payload.marketPlayers.slice(0, 80).map(sanitizePlayerForLeague)
    : [],
  teamPlayers: Array.isArray(payload.teamPlayers)
    ? payload.teamPlayers.slice(0, 80).map(sanitizePlayerForLeague)
    : [],
  finance: payload.finance && typeof payload.finance === "object" ? payload.finance : {}
});

const leagueListPayload = () => ({
  activeLeagueId: leaguesDb.activeLeagueId,
  leagues: Object.values(leaguesDb.leagues)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "es"))
});

const ensureDefaultLeague = () => {
  if (Object.keys(leaguesDb.leagues).length) return;
  const now = new Date().toISOString();
  const id = createLeagueId();
  leaguesDb.leagues[id] = {
    id,
    name: "Mi liga",
    createdAt: now,
    updatedAt: now,
    competition: "club",
    scoring: "mixed",
    marketPlayers: [],
    teamPlayers: []
  };
  leaguesDb.activeLeagueId = id;
  saveLeaguesDb();
};

const handleLeagues = async (req, res, requestUrl) => {
  try {
    ensureDefaultLeague();

    if (requestUrl.pathname === "/api/leagues" && req.method === "GET") {
      sendJson(req, res, 200, leagueListPayload());
      return;
    }

    if (requestUrl.pathname === "/api/leagues" && req.method === "POST") {
      const raw = await readRequestBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      const name = String(payload.name || "").trim().slice(0, 60) || "Nueva liga";
      const now = new Date().toISOString();
      const id = createLeagueId();
      leaguesDb.leagues[id] = {
        id,
        name,
        createdAt: now,
        updatedAt: now,
        competition: payload.competition === "worldcup" ? "worldcup" : "club",
        scoring: ["mixed", "as", "sofascore", "stats"].includes(payload.scoring) ? payload.scoring : "mixed",
        marketPlayers: [],
        teamPlayers: []
      };
      leaguesDb.activeLeagueId = id;
      saveLeaguesDb();
      sendJson(req, res, 201, leagueListPayload());
      return;
    }

    if (requestUrl.pathname === "/api/leagues/select" && req.method === "POST") {
      const raw = await readRequestBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      if (!payload.leagueId || !leaguesDb.leagues[payload.leagueId]) {
        sendJson(req, res, 404, { error: "Liga no encontrada" });
        return;
      }
      leaguesDb.activeLeagueId = payload.leagueId;
      saveLeaguesDb();
      sendJson(req, res, 200, leagueListPayload());
      return;
    }

    if (requestUrl.pathname === "/api/leagues/save" && req.method === "POST") {
      const raw = await readRequestBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      const leagueId = payload.leagueId || leaguesDb.activeLeagueId;
      const league = leaguesDb.leagues[leagueId];
      if (!league) {
        sendJson(req, res, 404, { error: "Liga no encontrada" });
        return;
      }
      const sanitized = sanitizeLeaguePayload(payload);
      leaguesDb.leagues[leagueId] = {
        ...league,
        ...sanitized,
        updatedAt: new Date().toISOString()
      };
      leaguesDb.activeLeagueId = leagueId;
      saveLeaguesDb();
      sendJson(req, res, 200, leagueListPayload());
      return;
    }

    sendJson(req, res, 404, { error: "Endpoint de liga no encontrado" });
  } catch (error) {
    sendJson(req, res, 500, { error: error.message || "No se pudo operar con ligas" });
  }
};

const getCached = (url) => {
  const cached = sourceCache.get(url);
  if (!cached || Date.now() - cached.createdAt > sourceCacheMs) return null;
  return cached.value;
};

const setCached = (url, value) => {
  sourceCache.set(url, { createdAt: Date.now(), value });
  return value;
};

const sourceGetText = (url) => {
  const cached = getCached(url);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      path: `${parsed.pathname}${parsed.search}`,
      method: "GET",
      headers: sourceHeaders,
      timeout: sourceTimeoutMs,
      // Some local Windows Node installs do not use the system CA store.
      rejectUnauthorized: process.env.FMS_STRICT_TLS === "1"
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Source HTTP ${response.statusCode}`));
          return;
        }
        resolve(setCached(url, body));
      });
    });

    req.on("timeout", () => req.destroy(new Error("Source timeout")));
    req.on("error", reject);
    req.end();
  });
};

const sourceGetJson = async (url) => JSON.parse(await sourceGetText(url));

const sourceGetBuffer = (url) => new Promise((resolve, reject) => {
  const parsed = new URL(url);
  const req = https.request({
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    path: `${parsed.pathname}${parsed.search}`,
    method: "GET",
    headers: sourceHeaders,
    timeout: sourceTimeoutMs,
    rejectUnauthorized: process.env.FMS_STRICT_TLS === "1"
  }, (response) => {
    const chunks = [];
    response.on("data", (chunk) => chunks.push(chunk));
    response.on("end", () => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`Source HTTP ${response.statusCode}`));
        return;
      }
      resolve({
        buffer: Buffer.concat(chunks),
        contentType: response.headers["content-type"] || "application/octet-stream"
      });
    });
  });

  req.on("timeout", () => req.destroy(new Error("Source timeout")));
  req.on("error", reject);
  req.end();
});

const extensionFromContentType = (contentType) => {
  if (/webp/i.test(contentType)) return ".webp";
  if (/png/i.test(contentType)) return ".png";
  if (/jpe?g/i.test(contentType)) return ".jpg";
  if (/svg/i.test(contentType)) return ".svg";
  return ".bin";
};

const cacheRemoteAsset = async (url, key) => {
  if (!url || !key) return null;
  fs.mkdirSync(assetsDir, { recursive: true });

  const existing = fs.readdirSync(assetsDir).find((name) => name.startsWith(`${key}.`));
  if (existing) {
    return `/media-db/${existing}`;
  }

  const { buffer, contentType } = await sourceGetBuffer(url);
  if (!buffer.length || buffer.length > 500000) return null;
  const extension = extensionFromContentType(contentType);
  const fileName = `${key}${extension}`;
  fs.writeFileSync(path.join(assetsDir, fileName), buffer);
  return `/media-db/${fileName}`;
};

const buildMedia = async (sourcePlayer, detailPlayer, metrics, competition) => {
  const playerId = sourcePlayer.id;
  const clubTeamId = detailPlayer.team?.id || sourcePlayer.team?.id;
  const nationalTeamId = metrics.nationalTeamId;
  const countryAlpha2 = (detailPlayer.country?.alpha2 || sourcePlayer.country?.alpha2 || "").toLowerCase();
  const emblemTeamId = competition === "worldcup" ? (nationalTeamId || clubTeamId) : clubTeamId;
  const emblemRemoteUrl = emblemTeamId
    ? `https://api.sofascore.app/api/v1/team/${emblemTeamId}/image`
    : countryAlpha2
      ? `https://flagcdn.com/w80/${countryAlpha2}.png`
      : null;

  const [playerImage, emblemImage] = await Promise.all([
    cacheRemoteAsset(`https://api.sofascore.app/api/v1/player/${playerId}/image`, `player-${playerId}`).catch(() => null),
    cacheRemoteAsset(emblemRemoteUrl, `${competition === "worldcup" ? "nation" : "team"}-${emblemTeamId || countryAlpha2}`).catch(() => null)
  ]);

  return {
    playerImage,
    emblemImage,
    emblemKind: competition === "worldcup" ? "selection" : "club",
    emblemSourceId: emblemTeamId || countryAlpha2 || null
  };
};

const mapPosition = (position) => {
  const value = String(position || "").toUpperCase();
  if (value === "G" || value === "POR") return "POR";
  if (value === "D" || value === "DF") return "DF";
  if (value === "M" || value === "MC") return "MC";
  if (value === "F" || value === "DL") return "DL";
  return "MC";
};

const positionMatches = (requested, candidate) => {
  if (!requested || !candidate) return 0;
  return mapPosition(requested) === mapPosition(candidate) ? 1 : -1;
};

const searchOverrides = new Map([
  ["trafford", "James Trafford"],
  ["brown", "Archie Brown"],
  ["christie", "Ryan Christie"],
  ["lafont", "Alban Lafont"],
  ["j quinones", "Julian Quinones"],
  ["s tounekti", "Sebastian Tounekti"],
  ["k alizhonov", "Khozhiakbar Alizhonov"],
  ["fernandez pardo", "Matias Fernandez-Pardo"]
]);

const getPlayerCache = (player, competition) => {
  const key = cacheKeyForPlayer(player, competition);
  const entry = playerDb.players[key];
  if (!entry?.data || !entry.fetchedAt) return null;
  if (!entry.data.media?.playerImage || !entry.data.media?.emblemImage) return null;
  if (!entry.data.health?.status) return null;
  if (entry.data.criteriaVersion !== sourceCriteriaVersion) return null;
  const ageMs = Date.now() - Date.parse(entry.fetchedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > playerCacheMs) return null;
  return {
    key,
    ageMs,
    data: {
      ...entry.data,
      clientId: player.id,
      originalName: player.name,
      cacheStatus: "hit",
      cachedAt: entry.fetchedAt
    }
  };
};

const setPlayerCache = (player, competition, data) => {
  const key = cacheKeyForPlayer(player, competition);
  playerDb.players[key] = {
    fetchedAt: new Date().toISOString(),
    lookup: {
      name: player.name,
      position: player.position || null,
      team: player.team || null,
      competition
    },
    data: {
      ...data,
      clientId: undefined,
      cacheStatus: undefined,
      cachedAt: undefined
    }
  };
  return key;
};

const sourceStatusPayload = () => {
  const entries = Object.values(playerDb.players);
  const fresh = entries.filter((entry) => {
    const ageMs = Date.now() - Date.parse(entry.fetchedAt || "");
    return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= playerCacheMs;
  });
  return {
    path: playerDbPath,
    totalPlayers: entries.length,
    freshPlayers: fresh.length,
    updatedAt: playerDb.updatedAt,
    ttlHours: Math.round(playerCacheMs / (1000 * 60 * 60))
  };
};

const scoreCandidate = (candidate, originalPlayer, resultScore) => {
  const query = normalizeText(originalPlayer.name);
  const fullName = normalizeText(candidate.name);
  const shortName = normalizeText(candidate.shortName);
  const requestedTeam = normalizeText(originalPlayer.team);
  const candidateTeam = normalizeText(candidate.team?.name);
  const queryTokens = query.split(" ").filter(Boolean);
  const fullTokens = fullName.split(" ").filter(Boolean);
  let score = 0;

  if (fullName === query) score += 90;
  if (shortName === query) score += 76;
  if (fullName.includes(query) || query.includes(fullName)) score += 48;
  if (queryTokens.length === 1 && fullTokens.includes(query)) score += 42;

  const tokenOverlap = queryTokens.filter((token) => fullTokens.includes(token)).length;
  score += tokenOverlap * 20;

  const posMatch = positionMatches(originalPlayer.position, candidate.position);
  score += posMatch === 1 ? 22 : posMatch === -1 ? -24 : 0;

  if (requestedTeam && candidateTeam && (candidateTeam.includes(requestedTeam) || requestedTeam.includes(candidateTeam))) {
    score += 16;
  }

  if (candidate.retired) score -= 55;
  if (candidate.team?.name === "No team") score -= 25;
  if (candidate.team?.sport?.slug === "football" || candidate.team?.sport?.id === 1) score += 35;

  score += Math.min(18, Math.log10((candidate.userCount || 1) + 1) * 4);
  score += Math.min(14, Math.log10((resultScore || 1) + 1) * 2);

  return Math.round(score);
};

const findSofascorePlayer = async (player) => {
  const originalName = normalizeText(player.name);
  const query = searchOverrides.get(originalName) || player.name;
  const url = `https://www.sofascore.com/api/v1/search/all?q=${encodeURIComponent(query)}&page=0`;
  const data = await sourceGetJson(url);
  const candidates = (data.results || [])
    .filter((result) => result.type === "player" && result.entity)
    .filter((result) => result.entity.team?.sport?.slug === "football" || result.entity.team?.sport?.id === 1)
    .map((result) => ({
      ...result.entity,
      matchScore: scoreCandidate(result.entity, player, result.score)
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  const best = candidates[0];
  if (!best || best.matchScore < 45) return null;
  return best;
};

const footballFantasyUrlFor = (name) => {
  const slug = slugify(name);
  return slug ? `https://www.futbolfantasy.com/jugadores/${slug}` : null;
};

const futbolFantasyWorldcupTeamUrlFor = (team) => {
  const slugOverrides = new Map([
    ["noruega", "noruega"],
    ["norway", "noruega"],
    ["inglaterra", "inglaterra"],
    ["england", "inglaterra"],
    ["bosnia y herzegovina", "bosnia-y-herzegovina"],
    ["bosnia and herzegovina", "bosnia-y-herzegovina"],
    ["bosnia herzegovina", "bosnia-y-herzegovina"],
    ["haiti", "haiti"],
    ["irak", "irak"],
    ["iraq", "irak"],
    ["colombia", "colombia"],
    ["uzbekistan", "uzbekistan"],
    ["paises bajos", "paises-bajos"],
    ["netherlands", "paises-bajos"],
    ["croacia", "croacia"],
    ["croatia", "croacia"],
    ["escocia", "escocia"],
    ["scotland", "escocia"],
    ["mexico", "mexico"],
    ["qatar", "qatar"],
    ["portugal", "portugal"],
    ["suecia", "suecia"],
    ["sweden", "suecia"],
    ["belgica", "belgica"],
    ["belgium", "belgica"],
    ["rd congo", "rd-congo"],
    ["dr congo", "rd-congo"],
    ["democratic republic of congo", "rd-congo"],
    ["tunez", "tunez"]
    ,["tunisia", "tunez"]
  ]);
  const key = normalizeText(team);
  const slug = slugOverrides.get(key) || slugify(team);
  return slug ? `https://www.futbolfantasy.com/world-cup/equipos/${slug}` : null;
};

const parseTeamLineupProbability = (html, playerName) => {
  const playerSlug = slugify(playerName);
  if (!playerSlug) return null;

  const slugPattern = new RegExp(`/jugadores/${escapeRegExp(playerSlug)}(?:/world-cup-2026)?`, "gi");
  const matches = Array.from(html.matchAll(slugPattern));
  if (!matches.length) return null;

  for (const match of matches) {
    const start = Math.max(0, match.index - 1200);
    const end = Math.min(html.length, match.index + 9000);
    const block = html.slice(start, end);
    const directProbability = block.match(/data-probabilidad="(\d+)%"/i);
    if (directProbability) {
      return Number(directProbability[1]);
    }

    const probabilities = Array.from(block.matchAll(/prob-\d+[^>]*>\s*(\d+)%/gi))
      .map((item) => Number(item[1]))
      .filter((value) => Number.isFinite(value));

    if (probabilities.length) {
      return probabilities[probabilities.length - 1];
    }
  }

  return null;
};

const parseFutbolFantasyValueSignals = (html, competition) => {
  const suffix = competition === "worldcup" ? "biwenger-mundial" : "biwenger";
  const valueMatch = html.match(new RegExp(`data-valor-${suffix}="([^"]+)"`, "i"));
  const diffMatch = html.match(new RegExp(`data-valor-diff-${suffix}="([^"]+)"`, "i"));
  return {
    biwengerValue: valueMatch ? parseNumber(valueMatch[1]) : null,
    biwengerDiff: diffMatch ? parseNumber(diffMatch[1]) : null
  };
};

const parseTeamLineupSignals = (html, playerName, competition) => {
  const playerSlug = slugify(playerName);
  if (!playerSlug) return null;

  const slugPattern = new RegExp(`/jugadores/${escapeRegExp(playerSlug)}(?:/world-cup-2026)?`, "gi");
  const matches = Array.from(html.matchAll(slugPattern));
  if (!matches.length) return null;

  for (const match of matches) {
    const start = Math.max(0, match.index - 1200);
    const end = Math.min(html.length, match.index + 9000);
    const block = html.slice(start, end);
    const probability = parseTeamLineupProbability(block, playerName);
    const values = parseFutbolFantasyValueSignals(block, competition);
    if (Number.isFinite(probability) || Number.isFinite(values.biwengerValue) || Number.isFinite(values.biwengerDiff)) {
      return {
        probability,
        ...values
      };
    }
  }

  return null;
};

const parseFutbolFantasyProfile = (html, competition = "club") => {
  const text = stripHtml(html);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "";
  if (/404|no encontrado|not found/i.test(title)) return null;
  const cleanTitle = stripHtml(title);

  const starts = text.match(/Titularidades\s+(\d+)\s*\/\s*(\d+)\s*\(([\d.,]+)%\)/i);
  const minutes = text.match(/Total minutos\s+(\d+)'?\s*\(([\d.,]+)%\)/i);
  const lastThree = text.match(/Media de minutos ultimos 3 partidos jugados:\s*([\d.,]+)'/i)
    || normalizeText(text).match(/media de minutos ultimos 3 partidos jugados:\s*([\d.,]+)/i);
  const nextProbability = html.match(/Titular J\d+[\s\S]{0,900}?class="[^"]*prob-\d+[^"]*"[^>]*>\s*(\d+)%/i)
    || html.match(/Titular J\d+[\s\S]{0,900}?(\d+)%/i);
  const position = html.match(/position-box\s+([a-z]+)[\s\S]{0,80}?>([^<]+)</i);
  const currentHealth = parseFutbolFantasyHealth(html);
  const valueSignals = parseFutbolFantasyValueSignals(html, competition);
  const unavailable = currentHealth.status === "injured"
    || currentHealth.status === "doubtful"
    || currentHealth.status === "suspended";
  const calledUp = /Convocado con/i.test(text);

  return {
    title: cleanTitle,
    urlFound: true,
    competitionText: cleanTitle,
    isSelectionContext: /world cup|mundial|selecci[oó]n|selecciones|eurocopa|copa am[eé]rica|africa cup|asian cup/i.test(cleanTitle),
    seasonStarts: starts ? Number(starts[1]) : null,
    seasonMatches: starts ? Number(starts[2]) : null,
    seasonStartRate: starts ? parseNumber(starts[3]) : null,
    seasonMinutesRate: minutes ? parseNumber(minutes[2]) : null,
    lastThreeMinutes: lastThree ? parseNumber(lastThree[1]) : null,
    nextStarterProbability: nextProbability ? Number(nextProbability[1]) : null,
    biwengerValue: valueSignals.biwengerValue,
    biwengerDiff: valueSignals.biwengerDiff,
    fantasyPosition: position ? position[2].trim() : null,
    unavailable,
    health: currentHealth,
    calledUp
  };
};

const parseFutbolFantasyHealth = (html) => {
  const health = {
    status: "available",
    label: "Disponible",
    detail: null,
    expectedReturn: null,
    medicalUrl: null,
    injuryRisk: null
  };

  const currentBlock = html.match(/<div class="border rounded w-100 text-center py-1 lesionados">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i)?.[0]
    || html.match(/<div class="elemento[^"]* lesionado[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i)?.[0]
    || "";
  const currentText = stripHtml(currentBlock);
  const medicalUrl = currentBlock.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*lesion link/i)?.[1]
    || html.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*lesion link/i)?.[1]
    || null;
  const risk = html.match(/Riesgo de lesión\s*([^"<]+)/i)?.[1]?.trim()
    || html.match(/riesgo-lesion-(\d+)/i)?.[1]
    || null;

  if (currentText) {
    const detail = currentBlock.match(/<span class="lesion[^"]*">([\s\S]*?)<\/span>/i)?.[1];
    const returnMatch = currentText.match(/(Baja hasta[^.]+|Duda hasta[^.]+|Pendiente de evolución|Pendiente de evolucion|Sin fecha de regreso|Regreso previsto[^.]+)/i);
    const normalized = normalizeText(currentText);
    health.detail = detail ? stripHtml(detail) : currentText;
    health.expectedReturn = returnMatch ? returnMatch[1].trim() : null;
    health.medicalUrl = medicalUrl;

    if (/sancionad|suspension|sancion/.test(normalized)) {
      health.status = "suspended";
      health.label = "Sancionado";
    } else if (/baja|lesion|lesionado|rotura|fractura|isquiotibial|femoral/.test(normalized)) {
      health.status = "injured";
      health.label = "Lesionado";
    } else if (/duda|tocado|molestia|pendiente de evolucion/.test(normalized)) {
      health.status = "doubtful";
      health.label = "Duda";
    }
  } else if (/Disponible para competir/i.test(html)) {
    health.status = "available";
    health.label = "Disponible";
  }

  health.injuryRisk = risk;
  return health;
};

const getFutbolFantasyProfile = async (sourcePlayer, originalPlayer, competition) => {
  let profileResult = null;
  const names = Array.from(new Set([sourcePlayer.name, originalPlayer.name].filter(Boolean)));
  for (const name of names) {
    const baseUrl = footballFantasyUrlFor(name);
    if (!baseUrl) continue;
    const urls = competition === "worldcup"
      ? [`${baseUrl}/world-cup-2026`, baseUrl]
      : [baseUrl];

    for (const url of urls) {
      try {
        const html = await sourceGetText(url);
        const profile = parseFutbolFantasyProfile(html, competition);
        if (profile?.urlFound) {
          profileResult = { ...profile, url };
          break;
        }
      } catch (error) {
        // Not every player/competition has a FutbolFantasy profile.
      }
    }
    if (profileResult) break;
  }

  if (competition === "worldcup") {
    const teamUrl = futbolFantasyWorldcupTeamUrlFor(originalPlayer.nationalTeam || originalPlayer.team || profileResult?.team);
    if (teamUrl) {
      try {
        const teamHtml = await sourceGetText(teamUrl);
        const teamSignals = names
          .map((name) => parseTeamLineupSignals(teamHtml, name, competition))
          .find((signals) =>
            signals
            && (
              Number.isFinite(signals.probability)
              || Number.isFinite(signals.biwengerValue)
              || Number.isFinite(signals.biwengerDiff)
            )
          );
        if (teamSignals) {
          profileResult = {
            ...(profileResult || {
              urlFound: true,
              competitionText: "FutbolFantasy - once probable seleccion",
              isSelectionContext: true,
              seasonStartRate: null,
              seasonMatches: 0,
              seasonMinutesRate: null,
              lastThreeMinutes: null,
              unavailable: false,
              calledUp: true,
              health: {
                status: "unknown",
                label: "Sin dato",
                detail: null,
                expectedReturn: null,
                medicalUrl: null,
                injuryRisk: null
              }
            }),
            isSelectionContext: true,
            nextStarterProbability: Number.isFinite(teamSignals.probability)
              ? teamSignals.probability
              : profileResult?.nextStarterProbability ?? null,
            biwengerValue: Number.isFinite(teamSignals.biwengerValue)
              ? teamSignals.biwengerValue
              : profileResult?.biwengerValue ?? null,
            biwengerDiff: Number.isFinite(teamSignals.biwengerDiff)
              ? teamSignals.biwengerDiff
              : profileResult?.biwengerDiff ?? null,
            teamLineupProbability: Number.isFinite(teamSignals.probability) ? teamSignals.probability : null,
            teamLineupUrl: teamUrl
          };
        }
      } catch (error) {
        // The team page is an extra signal; failing here should not discard the profile.
      }
    }
  }
  return profileResult;
};

const getTeamById = (event, id) => {
  if (!id) return null;
  if (event.homeTeam?.id === id) return event.homeTeam;
  if (event.awayTeam?.id === id) return event.awayTeam;
  return null;
};

const eventIsNational = (event) =>
  Boolean(event.homeTeam?.national || event.awayTeam?.national)
  || /world cup|uefa|conmebol|concacaf|caf|afc|international|friendly|copa america|euro/i.test(
    `${event.tournament?.name || ""} ${event.tournament?.uniqueTournament?.name || ""}`
  );

const ratingToScore = (rating) => {
  if (!Number.isFinite(rating)) return 58;
  return clamp(((rating - 5.8) / 2.2) * 55 + 42, 35, 96);
};

const buildMetrics = (eventsData, detailPlayer, competition) => {
  const events = (eventsData.events || [])
    .slice()
    .sort((a, b) => (a.startTimestamp || 0) - (b.startTimestamp || 0));

  const rows = events.map((event) => {
    const key = String(event.id);
    const stats = eventsData.statisticsMap?.[key] || {};
    const incidents = eventsData.incidentsMap?.[key] || {};
    const playedForId = eventsData.playedForTeamMap?.[key];
    const playedTeam = getTeamById(event, playedForId);
    const minutes = parseNumber(stats.minutesPlayed) || 0;
    const rating = parseNumber(stats.rating);
    return {
      event,
      stats,
      incidents,
      playedForId,
      playedTeam,
      isNational: eventIsNational(event) || Boolean(playedTeam?.national),
      onBench: eventsData.onBenchMap?.[key] === true,
      minutes,
      rating
    };
  });

  const clubTeamId = detailPlayer.team?.id;
  const clubRows = rows.filter((row) => {
    if (row.isNational) return false;
    if (!clubTeamId) return row.minutes > 0 || row.onBench;
    return row.playedForId === clubTeamId || row.minutes > 0 || row.onBench;
  });

  const nationalRows = rows.filter((row) =>
    row.isNational && (row.minutes > 0 || row.onBench || row.playedForId)
  );
  const latestNationalTeam = nationalRows
    .slice()
    .reverse()
    .map((row) => row.playedTeam)
    .find(Boolean);

  const preferred = competition === "worldcup" && nationalRows.length >= 2 ? nationalRows : clubRows;
  const usingNationalSample = competition === "worldcup" && nationalRows.length >= 2;
  const sample = preferred.slice(-10);
  const played = sample.filter((row) => row.minutes > 0);
  const ratings = played.map((row) => row.rating).filter((rating) => Number.isFinite(rating));
  const avgRating = average(ratings);
  const startCount = sample.filter((row) => row.minutes >= 60).length;
  const completeCount = sample.filter((row) => row.minutes >= 85).length;
  const benchCount = sample.filter((row) => row.onBench).length;
  const minuteShare = sample.length ? clamp(sample.reduce((sum, row) => sum + row.minutes, 0) / (sample.length * 90), 0, 1) : 0;
  const appearanceRate = sample.length ? played.length / sample.length : 0;
  const startRate = sample.length ? startCount / sample.length : 0;
  const contributionCount = sample.reduce((sum, row) => (
    sum + (row.incidents.goals || 0) + (row.incidents.assists || 0) + (row.incidents.goalAssist || 0)
  ), 0);

  const starter = clamp((startRate * 55 + minuteShare * 35 + appearanceRate * 10));
  const ratingScore = ratingToScore(avgRating);
  const recentRows = sample.slice(-5);
  const recentMinuteShare = recentRows.length
    ? clamp(recentRows.reduce((sum, row) => sum + row.minutes, 0) / (recentRows.length * 90), 0, 1)
    : minuteShare;
  const form = clamp(ratingScore * 0.66 + starter * 0.17 + recentMinuteShare * 17 + Math.min(8, contributionCount * 3));
  const sofascore = clamp(ratingScore * 0.78 + starter * 0.16 + Math.min(8, contributionCount * 2));
  const statsScore = clamp(ratingScore * 0.54 + starter * 0.24 + recentMinuteShare * 14 + Math.min(12, contributionCount * 4));
  const asScore = clamp(ratingScore * 0.55 + starter * 0.25 + form * 0.2);

  return {
    sample,
    sampleSize: sample.length,
    usingNationalSample,
    hasNationalSample: nationalRows.length >= 2,
    starter,
    form,
    sofascore,
    stats: statsScore,
    asScore,
    avgRating,
    startCount,
    completeCount,
    benchCount,
    playedCount: played.length,
    contributionCount,
    minuteShare,
    recentMinuteShare,
    nationalTeamId: latestNationalTeam?.id || null,
    nationalTeamName: latestNationalTeam?.name || null,
    clubTeamId
  };
};

const mergeFantasySignals = (metrics, fantasyProfile, competition) => {
  if (!fantasyProfile) return metrics;
  let starter = metrics.starter;
  let form = metrics.form;
  const alignedFantasyContext = competition !== "worldcup" || fantasyProfile.isSelectionContext;

  if (Number.isFinite(fantasyProfile.seasonStartRate) && alignedFantasyContext) {
    starter = starter * 0.8 + fantasyProfile.seasonStartRate * 0.2;
  }
  if (Number.isFinite(fantasyProfile.nextStarterProbability) && alignedFantasyContext) {
    const nextStarterWeight = competition === "worldcup" ? 0.85 : 0.62;
    starter = starter * (1 - nextStarterWeight) + fantasyProfile.nextStarterProbability * nextStarterWeight;
    if (fantasyProfile.nextStarterProbability >= 80) {
      starter = Math.max(starter, fantasyProfile.nextStarterProbability - 6);
    } else if (fantasyProfile.nextStarterProbability <= 20) {
      starter = Math.min(starter, fantasyProfile.nextStarterProbability + 8);
    }
  } else if (competition === "worldcup" && !alignedFantasyContext) {
    starter = Math.min(starter, 58);
  }
  if (Number.isFinite(fantasyProfile.lastThreeMinutes)) {
    form = form * 0.84 + clamp((fantasyProfile.lastThreeMinutes / 90) * 100, 0, 100) * 0.16;
  }
  if (Number.isFinite(fantasyProfile.seasonMinutesRate)) {
    form = form * 0.88 + fantasyProfile.seasonMinutesRate * 0.12;
  }

  return {
    ...metrics,
    starter: clamp(starter),
    form: clamp(form),
    asScore: clamp(metrics.asScore * 0.82 + starter * 0.18),
    stats: clamp(metrics.stats * 0.88 + form * 0.12),
    fantasyContextAligned: alignedFantasyContext,
    hasFantasyStarterPrediction: Number.isFinite(fantasyProfile.nextStarterProbability) && alignedFantasyContext
  };
};

const riskFromSignals = (metrics, fantasyProfile, competition) => {
  let points = 0;
  const reasons = [];

  if (metrics.sampleSize < 4) {
    points += 18;
    reasons.push("Muestra reciente corta en fuentes");
  }
  if (metrics.starter < 45) {
    points += 24;
    reasons.push(`Titularidad baja en muestra reciente (${Math.round(metrics.starter)}%)`);
  } else if (metrics.starter < 68) {
    points += 11;
    reasons.push(`Titularidad no totalmente consolidada (${Math.round(metrics.starter)}%)`);
  } else {
    reasons.push(`Rol solido: ${metrics.startCount}/${metrics.sampleSize} partidos recientes como titular o con muchos minutos`);
  }

  if (metrics.benchCount >= Math.max(2, Math.ceil(metrics.sampleSize * 0.35))) {
    points += 12;
    reasons.push(`Ha sido suplente/banquillo en ${metrics.benchCount} de los ultimos ${metrics.sampleSize}`);
  }
  if (metrics.hasFantasyStarterPrediction && Number.isFinite(fantasyProfile?.nextStarterProbability)) {
    if (fantasyProfile.nextStarterProbability <= 10) {
      points += 34;
      reasons.push(`FutbolFantasy solo le da ${fantasyProfile.nextStarterProbability}% de titularidad`);
    } else if (fantasyProfile.nextStarterProbability <= 30) {
      points += 18;
      reasons.push(`FutbolFantasy le da baja probabilidad de titularidad (${fantasyProfile.nextStarterProbability}%)`);
    }
  }
  if (Number.isFinite(metrics.avgRating)) {
    reasons.push(`Media SofaScore reciente ${metrics.avgRating.toFixed(2)}`);
    if (metrics.avgRating < 6.45) points += 9;
  }
  if (fantasyProfile?.unavailable) {
    const health = fantasyProfile.health || {};
    if (health.status === "injured" || health.status === "suspended") {
      points += 36;
    } else {
      points += 18;
    }
    reasons.push(`${health.label || "Incidencia"} en FutbolFantasy${health.expectedReturn ? `: ${health.expectedReturn}` : ""}`);
  }
  if (competition === "worldcup" && !metrics.usingNationalSample) {
    points += 12;
    reasons.push("Sin muestra suficiente reciente con seleccion; se extrapola desde club");
  }
  if (
    fantasyProfile?.seasonStartRate !== null
    && fantasyProfile?.seasonStartRate !== undefined
    && fantasyProfile?.seasonMatches > 0
  ) {
    if (competition === "worldcup" && !metrics.fantasyContextAligned) {
      points += 10;
      reasons.push("FutbolFantasy no ofrece titularidad de seleccion; no se usa su historico de club para subir la nota");
    } else {
      reasons.push(`FutbolFantasy: titularidades ${fantasyProfile.seasonStarts}/${fantasyProfile.seasonMatches} (${fantasyProfile.seasonStartRate}%)`);
    }
  }

  return {
    risk: points >= 30 ? "high" : points >= 14 ? "medium" : "low",
    riskReasons: reasons.slice(0, 5)
  };
};

const confidenceFromSignals = (matchScore, metrics, fantasyProfile, competition) => {
  let confidence = 48;
  confidence += clamp(matchScore - 45, 0, 45) * 0.32;
  confidence += Math.min(16, metrics.sampleSize * 1.8);
  if (metrics.avgRating) confidence += 7;
  if (fantasyProfile) confidence += 10;
  if (competition === "worldcup" && !metrics.usingNationalSample) confidence -= 12;
  if (competition === "worldcup" && fantasyProfile && !metrics.fantasyContextAligned && !metrics.hasFantasyStarterPrediction) confidence -= 12;
  if (metrics.sampleSize < 4) confidence -= 8;
  return Math.round(clamp(confidence, 35, 92));
};

const trendFromSignals = (metrics, originalPlayer, sourcePlayer) => {
  let trend = 0;
  trend += (metrics.form - 62) * 0.12;
  trend += (metrics.starter - 60) * 0.06;
  trend += Math.min(6, Math.log10((sourcePlayer.userCount || 1) + 1) - 2);
  if (originalPlayer.price && originalPlayer.price < 1000000 && metrics.starter > 60) trend += 2;
  return Math.round(clamp(trend, -8, 12));
};

const enrichPlayer = async (originalPlayer, competition) => {
  try {
    const sourcePlayer = await findSofascorePlayer(originalPlayer);
    if (!sourcePlayer) {
      return {
        clientId: originalPlayer.id,
        sourceStatus: "manual",
        error: "Sin coincidencia fiable en SofaScore"
      };
    }

    const detailData = await sourceGetJson(`https://www.sofascore.com/api/v1/player/${sourcePlayer.id}`);
    const detailPlayer = detailData.player || sourcePlayer;
    const eventsData = await sourceGetJson(`https://www.sofascore.com/api/v1/player/${sourcePlayer.id}/events/last/0`);
    const fantasyProfile = await getFutbolFantasyProfile(detailPlayer, originalPlayer, competition);
    const rawMetrics = buildMetrics(eventsData, detailPlayer, competition);
    const metrics = mergeFantasySignals(rawMetrics, fantasyProfile, competition);
    const media = await buildMedia(sourcePlayer, detailPlayer, metrics, competition);
    const risk = riskFromSignals(metrics, fantasyProfile, competition);
    const confidence = confidenceFromSignals(sourcePlayer.matchScore, metrics, fantasyProfile, competition);
    const countryName = detailPlayer.country?.name || sourcePlayer.country?.name || originalPlayer.nationalTeam;
    const clubName = detailPlayer.team?.shortName || detailPlayer.team?.name || sourcePlayer.team?.name || originalPlayer.team;
    const contextTeam = competition === "worldcup" ? (metrics.nationalTeamName || countryName || originalPlayer.team) : clubName;
    const position = mapPosition(detailPlayer.position || sourcePlayer.position || originalPlayer.position);
    const sources = [
      `SofaScore (${metrics.sampleSize} partidos)`,
      fantasyProfile ? "FutbolFantasy" : null
    ].filter(Boolean);
    const referenceValue = detailPlayer.proposedMarketValueRaw?.value
      || detailPlayer.proposedMarketValue
      || sourcePlayer.proposedMarketValueRaw?.value
      || null;

    return {
      clientId: originalPlayer.id,
      sourceStatus: "live",
      sourcePlayerId: sourcePlayer.id,
      sourceMatchScore: sourcePlayer.matchScore,
      criteriaVersion: sourceCriteriaVersion,
      competitionScope: competition,
      name: detailPlayer.name || sourcePlayer.name || originalPlayer.name,
      originalName: originalPlayer.name,
      team: contextTeam,
      clubTeam: clubName,
      baseTeam: clubName,
      nationalTeam: countryName,
      clubTeamId: metrics.clubTeamId || detailPlayer.team?.id || sourcePlayer.team?.id || null,
      nationalTeamId: metrics.nationalTeamId || null,
      position,
      starter: Math.round(metrics.starter),
      form: Math.round(metrics.form),
      asScore: Math.round(metrics.asScore),
      sofascore: Math.round(metrics.sofascore),
      stats: Math.round(metrics.stats),
      valueTrend: trendFromSignals(metrics, originalPlayer, sourcePlayer),
      risk: risk.risk,
      riskReasons: risk.riskReasons,
      dataConfidence: confidence,
      sources,
      media,
      health: fantasyProfile?.health || {
        status: "unknown",
        label: "Sin dato",
        detail: null,
        expectedReturn: null,
        medicalUrl: null,
        injuryRisk: null
      },
      sourceLinks: {
        sofascore: `https://www.sofascore.com/player/${detailPlayer.slug || sourcePlayer.slug}/${sourcePlayer.id}`,
        futbolFantasy: fantasyProfile?.url || null,
        jornadaPerfecta: `https://www.jornadaperfecta.com/?s=${encodeURIComponent(detailPlayer.name || sourcePlayer.name || originalPlayer.name)}`
      },
      referenceValue,
      biwengerValue: fantasyProfile?.biwengerValue ?? referenceValue,
      biwengerDiff: fantasyProfile?.biwengerDiff ?? null,
      note: competition === "worldcup" && !metrics.usingNationalSample
        ? `Valoracion con fuentes reales, pero conservadora: no hay suficientes partidos recientes de seleccion y se extrapola desde ${clubName}.`
        : `Valoracion recalculada con fuentes reales: minutos, banquillo, rating SofaScore${fantasyProfile ? " y senales FutbolFantasy" : ""}.`,
      sourceSummary: {
        avgRating: metrics.avgRating ? Number(metrics.avgRating.toFixed(2)) : null,
        sampleSize: metrics.sampleSize,
        starts: metrics.startCount,
        played: metrics.playedCount,
        bench: metrics.benchCount,
        complete: metrics.completeCount,
        usingNationalSample: metrics.usingNationalSample,
        fantasy: fantasyProfile
          ? {
            competitionText: fantasyProfile.competitionText,
            isSelectionContext: fantasyProfile.isSelectionContext,
            usedForStarter: metrics.fantasyContextAligned || metrics.hasFantasyStarterPrediction,
            seasonStartRate: fantasyProfile.seasonStartRate,
            seasonMatches: fantasyProfile.seasonMatches,
            nextStarterProbability: fantasyProfile.nextStarterProbability,
            biwengerValue: fantasyProfile.biwengerValue ?? null,
            biwengerDiff: fantasyProfile.biwengerDiff ?? null,
            teamLineupProbability: fantasyProfile.teamLineupProbability ?? null,
            teamLineupUrl: fantasyProfile.teamLineupUrl || null,
            calledUp: fantasyProfile.calledUp,
            health: fantasyProfile.health
          }
          : null
      }
    };
  } catch (error) {
    return {
      clientId: originalPlayer.id,
      sourceStatus: "manual",
      error: error.message || "No se pudo enriquecer"
    };
  }
};

const enrichPlayerWithCache = async (originalPlayer, competition, forceRefresh) => {
  if (!forceRefresh) {
    const cached = getPlayerCache(originalPlayer, competition);
    if (cached) return cached.data;
  }

  const enriched = await enrichPlayer(originalPlayer, competition);
  const fetchedAt = new Date().toISOString();
  const result = {
    ...enriched,
    cacheStatus: forceRefresh ? "refresh" : "miss",
    fetchedAt
  };

  if (result.sourceStatus === "live") {
    setPlayerCache(originalPlayer, competition, result);
  }

  return result;
};

const mapLimit = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
};

const handleEnrich = async (req, res) => {
  try {
    const raw = await readRequestBody(req);
    const payload = raw ? JSON.parse(raw) : {};
    const players = Array.isArray(payload.players) ? payload.players.slice(0, 40) : [];
    const competition = payload.competition === "worldcup" ? "worldcup" : "club";
    const forceRefresh = payload.forceRefresh === true;

    if (!players.length) {
      sendJson(req, res, 400, { error: "No players received" });
      return;
    }

    const enriched = await mapLimit(players, 4, (player) => enrichPlayerWithCache(player, competition, forceRefresh));
    savePlayerDb();
    const liveCount = enriched.filter((player) => player.sourceStatus === "live").length;
    const cacheHits = enriched.filter((player) => player.cacheStatus === "hit").length;
    const refreshed = enriched.filter((player) => player.cacheStatus === "refresh" || player.cacheStatus === "miss").length;
    sendJson(req, res, 200, {
      generatedAt: new Date().toISOString(),
      sourceNotes: [
        "SofaScore: busqueda, ficha y ultimos partidos",
        "FutbolFantasy: perfil fantasy cuando existe",
        "Base local: resultados vigentes durante 24 horas salvo actualizacion manual"
      ],
      liveCount,
      cacheHits,
      refreshed,
      cache: sourceStatusPayload(),
      enriched
    });
  } catch (error) {
    sendJson(req, res, 500, { error: error.message || "Source enrichment failed" });
  }
};

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${host}:${port}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, buildCorsHeaders(req, {
      "Access-Control-Max-Age": "86400"
    }));
    res.end();
    return;
  }

  if (requestUrl.pathname === "/api/enrich" && req.method === "POST") {
    handleEnrich(req, res);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/leagues")) {
    handleLeagues(req, res, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/api/source-status" && req.method === "GET") {
    sendJson(req, res, 200, sourceStatusPayload());
    return;
  }

  if (requestUrl.pathname === "/healthz" && req.method === "GET") {
    sendJson(req, res, 200, {
      ok: true,
      uptimeSeconds: Math.round(process.uptime()),
      criteriaVersion: sourceCriteriaVersion,
      publicOrigin: publicOrigin || null
    });
    return;
  }

  if (requestUrl.pathname.startsWith("/media-db/") && req.method === "GET") {
    const assetName = decodeURIComponent(requestUrl.pathname.replace("/media-db/", ""));
    const assetPath = path.resolve(assetsDir, assetName);
    if (!assetPath.startsWith(assetsDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(assetPath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(assetPath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
        ...buildCorsHeaders(req)
      });
      res.end(data);
    });
    return;
  }

  const relativePath = requestUrl.pathname === "/" ? "index.html" : decodeURIComponent(requestUrl.pathname.slice(1));
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      ...buildCorsHeaders(req)
    });
    res.end(data);
  });
});

loadPlayerDb();
loadLeaguesDb();
ensureDefaultLeague();

server.listen(port, host, () => {
  console.log(`Radar Fantasy listo en http://${host}:${port}/index.html`);
  if (publicOrigin) console.log(`Origen publico API: ${publicOrigin}`);
  console.log(`Base local de fuentes: ${playerDbPath}`);
  console.log(`Base local de ligas: ${leaguesDbPath}`);
});
