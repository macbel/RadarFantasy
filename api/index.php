<?php
declare(strict_types=1);
session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 30,
    'path' => '/',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'None' : 'Lax'
]);
session_start();

$root = dirname(__DIR__);
$dbDir = $root . DIRECTORY_SEPARATOR . '.fantasy-db';
$assetsDir = __DIR__ . DIRECTORY_SEPARATOR . 'media-db';
$playerDbPath = $dbDir . DIRECTORY_SEPARATOR . 'players.php.json';
$leaguesDbPath = $dbDir . DIRECTORY_SEPARATOR . 'leagues.php.json';
$biwengerSessionsPath = $dbDir . DIRECTORY_SEPARATOR . 'biwenger-sessions.json';
$futbolFantasySessionsPath = $dbDir . DIRECTORY_SEPARATOR . 'futbolfantasy-sessions.json';
$futbolFantasyCooldownPath = $dbDir . DIRECTORY_SEPARATOR . 'futbolfantasy-login-cooldown.json';
$biwengerVersionPath = $dbDir . DIRECTORY_SEPARATOR . 'biwenger-version.json';
$biwengerRateLimitPath = $dbDir . DIRECTORY_SEPARATOR . 'biwenger-rate-limit.json';
$sofaDiagnosticsPath = $dbDir . DIRECTORY_SEPARATOR . 'sofascore-status.json';
$apiSportsKeyPath = $dbDir . DIRECTORY_SEPARATOR . 'api-sports.key';
$scorebatKeyPath = $dbDir . DIRECTORY_SEPARATOR . 'scorebat.key';
$sourceCacheMs = 1000 * 60 * 20;
$playerCacheMs = 1000 * 60 * 60 * 24;
$sourceCriteriaVersion = 11;
$sourceTimeoutSeconds = 7;
$strictTls = env_bool('FMS_STRICT_TLS', false);
$sourceHeaders = [
    'User-Agent: Mozilla/5.0 FantasyMarketScoutPHP/1.0',
    'Accept: application/json,text/html;q=0.9,*/*;q=0.8',
    'Accept-Language: es-ES,es;q=0.9,en;q=0.8'
];
$biwengerHtmlHeaders = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language: es-ES,es;q=0.9,en;q=0.8'
];
$biwengerJsonHeaders = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Accept: application/json, text/plain, */*',
    'Accept-Language: es-ES,es;q=0.9,en;q=0.8',
    'Content-Type: application/json;charset=UTF-8',
    'Origin: https://biwenger.as.com',
    'Referer: https://biwenger.as.com/'
];
$futbolFantasyHeaders = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language: es-ES,es;q=0.9,en;q=0.8',
    'Origin: https://www.futbolfantasy.com',
    'Referer: https://www.futbolfantasy.com/login'
];

$nationalTeamSlugOverrides = [
    'noruega' => 'noruega',
    'norway' => 'noruega',
    'inglaterra' => 'inglaterra',
    'england' => 'inglaterra',
    'bosnia y herzegovina' => 'bosnia-y-herzegovina',
    'bosnia and herzegovina' => 'bosnia-y-herzegovina',
    'bosnia herzegovina' => 'bosnia-y-herzegovina',
    'haiti' => 'haiti',
    'irak' => 'irak',
    'iraq' => 'irak',
    'colombia' => 'colombia',
    'uzbekistan' => 'uzbekistan',
    'paises bajos' => 'paises-bajos',
    'netherlands' => 'paises-bajos',
    'croacia' => 'croacia',
    'croatia' => 'croacia',
    'escocia' => 'escocia',
    'scotland' => 'escocia',
    'mexico' => 'mexico',
    'qatar' => 'qatar',
    'portugal' => 'portugal',
    'suecia' => 'suecia',
    'sweden' => 'suecia',
    'belgica' => 'belgica',
    'belgium' => 'belgica',
    'rd congo' => 'rd-congo',
    'dr congo' => 'rd-congo',
    'democratic republic of congo' => 'rd-congo',
    'tunez' => 'tunez',
    'tunisia' => 'tunez'
];

$nationalTeamAlpha2 = [
    'argentina' => 'ar',
    'australia' => 'au',
    'austria' => 'at',
    'belgica' => 'be',
    'belgium' => 'be',
    'bosnia y herzegovina' => 'ba',
    'bosnia-herzegovina' => 'ba',
    'bosnia and herzegovina' => 'ba',
    'brasil' => 'br',
    'brazil' => 'br',
    'cabo verde' => 'cv',
    'canada' => 'ca',
    'catar' => 'qa',
    'qatar' => 'qa',
    'colombia' => 'co',
    'corea del sur' => 'kr',
    'croacia' => 'hr',
    'curazao' => 'cw',
    'ecuador' => 'ec',
    'egipto' => 'eg',
    'escocia' => 'gb-sct',
    'scotland' => 'gb-sct',
    'espana' => 'es',
    'spain' => 'es',
    'estados unidos' => 'us',
    'francia' => 'fr',
    'france' => 'fr',
    'ghana' => 'gh',
    'haiti' => 'ht',
    'holanda' => 'nl',
    'inglaterra' => 'gb-eng',
    'england' => 'gb-eng',
    'irak' => 'iq',
    'iraq' => 'iq',
    'iran' => 'ir',
    'japon' => 'jp',
    'jordania' => 'jo',
    'marrruecos' => 'ma',
    'marruecos' => 'ma',
    'mexico' => 'mx',
    'noruega' => 'no',
    'norway' => 'no',
    'nueva zelanda' => 'nz',
    'panama' => 'pa',
    'paraguay' => 'py',
    'paises bajos' => 'nl',
    'netherlands' => 'nl',
    'portugal' => 'pt',
    'rd congo' => 'cd',
    'dr congo' => 'cd',
    'rep checa' => 'cz',
    'republica checa' => 'cz',
    'senegal' => 'sn',
    'sudafrica' => 'za',
    'suecia' => 'se',
    'sweden' => 'se',
    'suiza' => 'ch',
    'tunez' => 'tn',
    'tunisia' => 'tn',
    'turquia' => 'tr',
    'uruguay' => 'uy',
    'uzbekistan' => 'uz'
];

$searchOverrides = [
    'elanga' => 'anthony elanga',
    'j quinones' => 'julian quinones',
    's tounekti' => 'sebastian tounekti',
    'j quinonez' => 'julian quinones',
    'julia quinonez' => 'julian quinones',
    'fernandez pardo' => 'matias fernandez pardo',
    'kakuta' => 'gael kakuta',
    'roozbeh cheshmi' => 'roozbeh cheshmi',
    'jassem abdulsallam' => 'jassem abdulsallam',
    'jeremy arevalo' => 'jeremy arevalo'
];

$playerDb = read_json_file($playerDbPath, ['version' => 1, 'players' => [], 'identities' => [], 'updatedAt' => null]);
$playerDb['identities'] = isset($playerDb['identities']) && is_array($playerDb['identities']) ? $playerDb['identities'] : [];
$leaguesDb = read_json_file($leaguesDbPath, ['version' => 1, 'activeLeagueId' => null, 'leagues' => []]);
$biwengerSessionsDb = read_json_file($biwengerSessionsPath, ['version' => 1, 'sessions' => []]);
$futbolFantasySessionsDb = read_json_file($futbolFantasySessionsPath, ['version' => 1, 'sessions' => []]);
ensure_directory($dbDir);
ensure_directory($assetsDir);
ensure_default_league($leaguesDb, $leaguesDbPath);
restore_biwenger_device_session($biwengerSessionsDb);
restore_futbol_fantasy_device_session($futbolFantasySessionsDb);

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($requestMethod === 'OPTIONS') {
    send_empty(204);
}

$route = request_path();

if ($route === '/source-status' && $requestMethod === 'GET') {
    $status = source_status_payload($playerDb, $playerCacheMs, $sourceCriteriaVersion);
    $status['sofascore'] = sofascore_diagnostic_payload($sofaDiagnosticsPath);
    send_json(200, $status);
}

if ($route === '/healthz' && $requestMethod === 'GET') {
    send_json(200, [
        'ok' => true,
        'criteriaVersion' => $sourceCriteriaVersion,
        'apiBase' => api_base_url(),
        'apiFootballConfigured' => api_football_key() !== '',
        'scorebatConfigured' => scorebat_token() !== ''
    ]);
}

if ($route === '/fixtures' && $requestMethod === 'GET') {
    $competition = trim((string)($_GET['competition'] ?? 'world-cup'));
    $fixtureSession = [
        'competition' => $competition,
        'leagueName' => preg_match('/world|mundial|selecc|copa del mundo/i', $competition) ? 'World Cup' : $competition
    ];
    session_write_close();
    try {
        send_json(200, fast_current_fixtures($fixtureSession, $sourceTimeoutSeconds, $sourceHeaders, $strictTls, $dbDir));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo cargar el calendario']);
    }
}

if ($route === '/player-catalog' && $requestMethod === 'GET') {
    $competition = trim((string)($_GET['competition'] ?? 'la-liga'));
    $scoreId = max(1, (int)($_GET['score'] ?? 2));
    try {
        send_json(200, biwenger_public_catalog_payload($competition, $scoreId, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls, $dbDir));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo cargar el catalogo publico de Biwenger']);
    }
}

if ($route === '/biwenger/status' && $requestMethod === 'GET') {
    if (!empty($_SESSION['biwenger']['token'])
        && (empty($_SESSION['biwenger']['scoreId'])
            || empty($_SESSION['biwenger']['leagueIcon'])
            || empty($_SESSION['biwenger']['availableLeagues']))) {
        try {
            $freshSession = biwenger_build_session(
                (string)$_SESSION['biwenger']['token'],
                (string)($_SESSION['biwenger']['xVersion'] ?? ''),
                (string)($_SESSION['biwenger']['leagueName'] ?? ''),
                $sourceTimeoutSeconds,
                $biwengerJsonHeaders,
                $strictTls
            );
            $_SESSION['biwenger'] = array_merge($_SESSION['biwenger'], $freshSession);
            persist_biwenger_device_session($biwengerSessionsDb, $biwengerSessionsPath, $_SESSION['biwenger']);
        } catch (Throwable $error) {
            // Keep the remembered session usable even if the score system cannot be refreshed.
        }
    }
    if (!empty($_SESSION['biwenger']['token']) && ($_GET['refreshCredits'] ?? '') === '1') {
        try {
            $creditsResponse = biwenger_private_get_json(
                'https://biwenger.as.com/api/v2/account/credits',
                $_SESSION['biwenger'],
                min($sourceTimeoutSeconds, 5),
                $biwengerJsonHeaders,
                $strictTls
            );
            $creditsValue = $creditsResponse['data'] ?? $creditsResponse['credits'] ?? $creditsResponse;
            if (is_numeric($creditsValue)) $_SESSION['biwenger']['credits'] = (int)$creditsValue;
        } catch (Throwable $error) {
            // Credits are informative; a temporary failure must not disconnect the league.
        }
    }
    $sessionState = biwenger_session_state($_SESSION['biwenger'] ?? []);
    send_json(200, $sessionState);
}

if ($route === '/biwenger/login' && $requestMethod === 'POST') {
    $payload = read_json_body();
    $email = trim((string)($payload['email'] ?? ''));
    $password = (string)($payload['password'] ?? '');
    $preferredLeagueName = trim((string)($payload['preferredLeagueName'] ?? ''));
    if ($email === '' || $password === '') {
        send_json(400, ['error' => 'Email y contrasena requeridos']);
    }

    try {
        $version = resolve_biwenger_version($biwengerVersionPath, $sourceTimeoutSeconds, $biwengerHtmlHeaders, $strictTls);
        $token = biwenger_login($email, $password, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls);
        $sessionState = biwenger_build_session($token, $version, $preferredLeagueName, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls, $preferredLeagueName !== '');
        $_SESSION['biwenger'] = $sessionState;
        persist_biwenger_device_session($biwengerSessionsDb, $biwengerSessionsPath, $sessionState);
        send_json(200, biwenger_session_state($sessionState));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo conectar con Biwenger']);
    }
}

if ($route === '/biwenger/switch-league' && $requestMethod === 'POST') {
    $currentSession = require_biwenger_session();
    $payload = read_json_body();
    $preferredLeagueName = trim((string)($payload['preferredLeagueName'] ?? ''));
    $preferredLeagueId = (int)($payload['preferredLeagueId'] ?? 0);
    if ($preferredLeagueName === '' && $preferredLeagueId <= 0) {
        send_json(400, ['error' => 'Liga requerida']);
    }
    try {
        $sessionState = biwenger_build_session(
            (string)$currentSession['token'],
            (string)($currentSession['xVersion'] ?? ''),
            $preferredLeagueName,
            $sourceTimeoutSeconds,
            $biwengerJsonHeaders,
            $strictTls,
            true,
            $preferredLeagueId
        );
        $_SESSION['biwenger'] = array_merge($currentSession, $sessionState);
        persist_biwenger_device_session($biwengerSessionsDb, $biwengerSessionsPath, $_SESSION['biwenger']);
        send_json(200, biwenger_session_state($_SESSION['biwenger']));
    } catch (Throwable $error) {
        send_json(404, ['error' => $error->getMessage() ?: 'No se encontro una liga coincidente en Biwenger']);
    }
}

if ($route === '/biwenger/logout' && $requestMethod === 'POST') {
    unset($_SESSION['biwenger']);
    forget_biwenger_device_session($biwengerSessionsDb, $biwengerSessionsPath);
    send_json(200, ['ok' => true, 'connected' => false]);
}

if ($route === '/futbolfantasy/status' && $requestMethod === 'GET') {
    send_json(200, futbol_fantasy_session_state($_SESSION['futbolFantasy'] ?? [], $futbolFantasyCooldownPath));
}

if ($route === '/futbolfantasy/login' && $requestMethod === 'POST') {
    $payload = read_json_body();
    $email = trim((string)($payload['email'] ?? ''));
    $password = (string)($payload['password'] ?? '');
    if ($email === '' || $password === '') {
        send_json(400, ['error' => 'Email y contrasena requeridos']);
    }
    try {
        $sessionState = futbol_fantasy_login_session(
            $email,
            $password,
            $dbDir,
            $futbolFantasyCooldownPath,
            max($sourceTimeoutSeconds, 12),
            $futbolFantasyHeaders,
            $strictTls
        );
        $_SESSION['futbolFantasy'] = $sessionState;
        persist_futbol_fantasy_device_session($futbolFantasySessionsDb, $futbolFantasySessionsPath, $sessionState);
        send_json(200, futbol_fantasy_session_state($sessionState, $futbolFantasyCooldownPath));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo conectar con Futbol Fantasy']);
    }
}

if ($route === '/futbolfantasy/session-cookie' && $requestMethod === 'POST') {
    $payload = read_json_body();
    $cookie = trim((string)($payload['cookie'] ?? ''));
    if ($cookie === '') {
        send_json(400, ['error' => 'Cookie de Futbol Fantasy requerida']);
    }
    try {
        $sessionState = futbol_fantasy_session_from_cookie(
            $cookie,
            $dbDir,
            (string)($payload['competition'] ?? ($_SESSION['biwenger']['competition'] ?? '')),
            max($sourceTimeoutSeconds, 12),
            $futbolFantasyHeaders,
            $strictTls
        );
        $_SESSION['futbolFantasy'] = $sessionState;
        persist_futbol_fantasy_device_session($futbolFantasySessionsDb, $futbolFantasySessionsPath, $sessionState);
        send_json(200, futbol_fantasy_session_state($sessionState, $futbolFantasyCooldownPath));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo validar la cookie de Futbol Fantasy']);
    }
}

if ($route === '/futbolfantasy/logout' && $requestMethod === 'POST') {
    $sessionState = $_SESSION['futbolFantasy'] ?? [];
    futbol_fantasy_delete_cookie($sessionState, $dbDir);
    unset($_SESSION['futbolFantasy']);
    forget_futbol_fantasy_device_session($futbolFantasySessionsDb, $futbolFantasySessionsPath);
    send_json(200, ['ok' => true, 'connected' => false]);
}

if ($route === '/futbolfantasy/sync-team' && $requestMethod === 'POST') {
    $sessionState = require_futbol_fantasy_session();
    $payload = read_json_body();
    $players = array_values(array_filter((array)($payload['players'] ?? []), 'is_array'));
    if (!$players) {
        send_json(400, ['error' => 'No hay jugadores para enviar a Futbol Fantasy']);
    }
    try {
        $sync = futbol_fantasy_prepare_tracking_team(
            $sessionState,
            $players,
            (string)($payload['competition'] ?? ($_SESSION['biwenger']['competition'] ?? '')),
            max($sourceTimeoutSeconds, 12),
            $futbolFantasyHeaders,
            $strictTls,
            $dbDir
        );
        $_SESSION['futbolFantasy'] = array_merge($sessionState, [
            'trackingUrl' => $sync['trackingUrl'] ?? futbol_fantasy_tracking_url((string)($payload['competition'] ?? '')),
            'lastTeamPlayers' => $sync['players'] ?? $players,
            'lastTeamSyncedAt' => gmdate('c')
        ]);
        persist_futbol_fantasy_device_session($futbolFantasySessionsDb, $futbolFantasySessionsPath, $_SESSION['futbolFantasy']);
        send_json(200, array_merge(futbol_fantasy_session_state($_SESSION['futbolFantasy'], $futbolFantasyCooldownPath), $sync));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo preparar el equipo en Futbol Fantasy']);
    }
}

if ($route === '/biwenger/import' && $requestMethod === 'POST') {
    $payload = read_json_body();
    $kind = ($payload['kind'] ?? '') === 'team' ? 'team' : 'market';
    $sessionState = $_SESSION['biwenger'] ?? null;
    if (!$sessionState || empty($sessionState['token'])) {
        send_json(401, ['error' => 'No hay una sesion de Biwenger abierta']);
    }
    try {
        $knownTeamPlayers = $kind === 'team'
            ? array_values(array_filter(array_slice((array)($payload['knownTeamPlayers'] ?? []), 0, 80), 'is_array'))
            : [];
        $import = biwenger_import_players($sessionState, $kind, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls, $knownTeamPlayers);
        $_SESSION['biwenger'] = array_merge($sessionState, [
            'syncedAt' => gmdate('c'),
            'competition' => $import['competition'] ?? ($sessionState['competition'] ?? ''),
            'leagueName' => $import['leagueName'] ?? ($sessionState['leagueName'] ?? ''),
            'balance' => $import['finance']['balance'] ?? ($sessionState['balance'] ?? null),
            'teamValue' => $import['finance']['teamValue'] ?? ($sessionState['teamValue'] ?? null),
            'maximumBid' => $import['finance']['maximumBid'] ?? ($sessionState['maximumBid'] ?? null)
        ]);
        persist_biwenger_device_session($biwengerSessionsDb, $biwengerSessionsPath, $_SESSION['biwenger']);
        send_json(200, $import);
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo importar desde Biwenger']);
    }
}

if ($route === '/biwenger/watchlist' && $requestMethod === 'GET') {
    $sessionState = require_biwenger_session();
    try {
        send_json(200, biwenger_watchlist_catalog($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo cargar el catalogo para favoritos']);
    }
}

if ($route === '/biwenger/bid' && $requestMethod === 'POST') {
    $sessionState = require_biwenger_session();
    $payload = read_json_body();
    $playerId = (int)($payload['playerId'] ?? 0);
    $amount = (int)($payload['amount'] ?? 0);
    $toUserId = (int)($payload['toUserId'] ?? 0);
    if ($playerId <= 0 || $amount <= 0) {
        send_json(400, ['error' => 'Jugador e importe de puja requeridos']);
    }
    try {
        $marketContext = biwenger_market_player_context($sessionState, $playerId, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls);
        if ($toUserId <= 0) $toUserId = (int)($marketContext['ownerId'] ?? 0);
        $minimumAmount = (int)($marketContext['minimumAmount'] ?? 0);
        if ($minimumAmount > 0 && $amount < $minimumAmount) {
            send_json(409, ['error' => 'La puja minima actual es ' . number_format($minimumAmount, 0, ',', '.') . ' €. Actualiza el mercado antes de ejecutar el plan.']);
        }
        $offerPayload = ['amount' => $amount, 'requestedPlayers' => [$playerId], 'type' => 'purchase'];
        if ($toUserId > 0) $offerPayload['to'] = $toUserId;
        $result = biwenger_private_request_json(
            'POST',
            'https://biwenger.as.com/api/v2/offers/',
            $sessionState,
            $sourceTimeoutSeconds,
            $biwengerJsonHeaders,
            $strictTls,
            $offerPayload
        );
        $operations = biwenger_operations_center($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls);
        $createdOfferId = (int)($result['data']['id'] ?? $result['id'] ?? 0);
        $confirmed = false;
        foreach ((array)($operations['offers'] ?? []) as $offer) {
            if (!is_array($offer) || empty($offer['isMine'])) continue;
            if (($createdOfferId > 0 && (int)($offer['offerId'] ?? 0) === $createdOfferId)
                || ((int)($offer['playerId'] ?? 0) === $playerId && (int)($offer['amount'] ?? 0) === $amount)) {
                $confirmed = true;
                break;
            }
        }
        $import = biwenger_import_players($sessionState, 'market', $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls);
        $_SESSION['biwenger'] = array_merge($sessionState, [
            'syncedAt' => gmdate('c'),
            'balance' => $import['finance']['balance'] ?? ($sessionState['balance'] ?? null),
            'maximumBid' => $import['finance']['maximumBid'] ?? ($sessionState['maximumBid'] ?? null)
        ]);
        persist_biwenger_device_session($biwengerSessionsDb, $biwengerSessionsPath, $_SESSION['biwenger']);
        send_json(200, [
            'ok' => true,
            'confirmed' => $confirmed,
            'offer' => $result['data'] ?? $result,
            'market' => $import,
            'operations' => $operations
        ]);
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'Biwenger no ha aceptado la puja']);
    }
}

if ($route === '/biwenger/bid-update' && $requestMethod === 'POST') {
    $sessionState = require_biwenger_session();
    $payload = read_json_body();
    $offerId = (int)($payload['offerId'] ?? 0);
    $playerId = (int)($payload['playerId'] ?? 0);
    $amount = (int)($payload['amount'] ?? 0);
    $toUserId = (int)($payload['toUserId'] ?? 0);
    if ($offerId <= 0 || $playerId <= 0 || $amount <= 0) {
        send_json(400, ['error' => 'Oferta, jugador e importe requeridos']);
    }
    try {
        $marketContext = biwenger_market_player_context($sessionState, $playerId, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls);
        if ($toUserId <= 0) $toUserId = (int)($marketContext['ownerId'] ?? 0);
        $minimumAmount = (int)($marketContext['minimumAmount'] ?? 0);
        if ($minimumAmount > 0 && $amount < $minimumAmount) {
            send_json(409, ['error' => 'La puja minima actual es ' . number_format($minimumAmount, 0, ',', '.') . ' €. Actualiza el mercado antes de modificarla.']);
        }
        $offerPayload = ['amount' => $amount, 'requestedPlayers' => [$playerId], 'type' => 'purchase'];
        if ($toUserId > 0) $offerPayload['to'] = $toUserId;
        biwenger_private_request_json(
            'PUT',
            'https://biwenger.as.com/api/v2/offers/' . $offerId,
            $sessionState,
            $sourceTimeoutSeconds,
            $biwengerJsonHeaders,
            $strictTls,
            $offerPayload
        );
        send_json(200, ['ok' => true, 'operations' => biwenger_operations_center($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls)]);
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo modificar la puja']);
    }
}

if ($route === '/biwenger/bid-cancel' && $requestMethod === 'POST') {
    $sessionState = require_biwenger_session();
    $offerId = (int)(read_json_body()['offerId'] ?? 0);
    if ($offerId <= 0) send_json(400, ['error' => 'Oferta no valida']);
    try {
        biwenger_private_request_json('DELETE', 'https://biwenger.as.com/api/v2/offers/' . $offerId, $sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls);
        send_json(200, ['ok' => true, 'operations' => biwenger_operations_center($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls)]);
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo cancelar la puja']);
    }
}

if ($route === '/biwenger/offer-status' && $requestMethod === 'POST') {
    $sessionState = require_biwenger_session();
    $payload = read_json_body();
    $offerId = (int)($payload['offerId'] ?? 0);
    $playerId = (int)($payload['playerId'] ?? 0);
    $fromId = (int)($payload['fromId'] ?? 0);
    $amount = biwenger_money_int($payload['amount'] ?? 0);
    $status = (string)($payload['status'] ?? '');
    if ($offerId <= 0 || !in_array($status, ['accepted', 'rejected'], true)) {
        send_json(400, ['error' => 'Oferta o estado no validos']);
    }
    try {
        $currentOperations = biwenger_operations_center($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls);
        $currentOffer = null;
        foreach ((array)($currentOperations['offers'] ?? []) as $candidate) {
            if (!is_array($candidate) || empty($candidate['isIncoming'])) continue;
            if ((int)($candidate['offerId'] ?? 0) === $offerId) {
                $currentOffer = $candidate;
                break;
            }
            if ($playerId > 0 && (int)($candidate['playerId'] ?? 0) !== $playerId) continue;
            if ($fromId > 0 && (int)($candidate['fromId'] ?? 0) !== $fromId) continue;
            if ($amount > 0 && (int)($candidate['amount'] ?? 0) !== $amount) continue;
            if ($playerId > 0) $currentOffer = $candidate;
        }
        if (!$currentOffer || (int)($currentOffer['offerId'] ?? 0) <= 0) {
            send_json(409, ['error' => 'La oferta ya no esta activa en Biwenger. Se ha actualizado el centro de operaciones.', 'operations' => $currentOperations]);
        }
        $offerId = (int)$currentOffer['offerId'];
        biwenger_private_request_json('PUT', 'https://biwenger.as.com/api/v2/offers/' . $offerId, $sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls, ['status' => $status]);
        send_json(200, ['ok' => true, 'operations' => biwenger_operations_center($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls)]);
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo responder a la oferta']);
    }
}

if ($route === '/biwenger/operations' && $requestMethod === 'GET') {
    $sessionState = require_biwenger_session();
    session_write_close();
    try {
        send_json(200, biwenger_operations_center($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo cargar el centro operativo']);
    }
}

if ($route === '/biwenger/sale' && $requestMethod === 'POST') {
    $sessionState = require_biwenger_session();
    $payload = read_json_body();
    $playerId = (int)($payload['playerId'] ?? 0);
    $price = biwenger_money_int($payload['price'] ?? 0);
    if ($playerId <= 0 || $price <= 0) send_json(400, ['error' => 'Jugador y precio de venta requeridos']);
    try {
        biwenger_private_request_json('POST', 'https://biwenger.as.com/api/v2/market', $sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls, [
            'type' => 'sell', 'player' => $playerId, 'price' => $price, 'rejectOffers' => true
        ]);
        send_json(200, ['ok' => true, 'operations' => biwenger_operations_center($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls)]);
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo poner el jugador a la venta']);
    }
}

if ($route === '/biwenger/sale-remove' && $requestMethod === 'POST') {
    $sessionState = require_biwenger_session();
    $playerId = (int)(read_json_body()['playerId'] ?? 0);
    if ($playerId <= 0) send_json(400, ['error' => 'Jugador no valido']);
    try {
        biwenger_private_request_json('DELETE', 'https://biwenger.as.com/api/v2/market?player=' . $playerId, $sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls);
        send_json(200, ['ok' => true, 'operations' => biwenger_operations_center($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls)]);
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo retirar la venta']);
    }
}

if ($route === '/biwenger/sales-renew' && $requestMethod === 'POST') {
    $sessionState = require_biwenger_session();
    try {
        biwenger_private_request_json('POST', 'https://biwenger.as.com/api/v2/market', $sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls, ['type' => 'renew']);
        send_json(200, ['ok' => true, 'operations' => biwenger_operations_center($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls)]);
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudieron renovar las ventas']);
    }
}

if ($route === '/biwenger/lineup' && $requestMethod === 'POST') {
    $sessionState = require_biwenger_session();
    $payload = read_json_body();
    $type = trim((string)($payload['type'] ?? ''));
    $players = array_values(array_filter(array_map('intval', (array)($payload['playersID'] ?? [])), static fn($id) => $id > 0));
    $captain = (int)($payload['captain'] ?? 0);
    $striker = (int)($payload['striker'] ?? 0);
    if ($type === '' || count($players) < 11) send_json(400, ['error' => 'Alineacion incompleta o sin formacion']);
    if ($captain > 0 && $captain === $striker) send_json(400, ['error' => 'El capitan y el ariete deben ser jugadores distintos']);
    $lineup = ['type' => $type, 'playersID' => $players];
    if ($captain > 0 && in_array($captain, $players, true)) $lineup['captain'] = $captain;
    if ($striker > 0 && in_array($striker, $players, true)) $lineup['striker'] = $striker;
    try {
        $result = biwenger_private_request_json('PUT', 'https://biwenger.as.com/api/v2/user', $sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls, [
            'lineup' => $lineup
        ]);
        send_json(200, ['ok' => true, 'lineup' => $result['data'] ?? $result]);
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo enviar la alineacion']);
    }
}

if ($route === '/biwenger/clause' && $requestMethod === 'POST') {
    $sessionState = require_biwenger_session();
    $payload = read_json_body();
    $playerId = (int)($payload['playerId'] ?? 0);
    $ownerId = (int)($payload['ownerId'] ?? 0);
    $amount = (int)($payload['amount'] ?? 0);
    if ($playerId <= 0 || $ownerId <= 0 || $amount <= 0) send_json(400, ['error' => 'Jugador, propietario y clausula requeridos']);
    try {
        $result = biwenger_private_request_json('POST', 'https://biwenger.as.com/api/v2/offers/', $sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls, [
            'amount' => $amount, 'requestedPlayers' => [$playerId], 'to' => $ownerId, 'type' => 'clause'
        ]);
        send_json(200, ['ok' => true, 'offer' => $result['data'] ?? $result]);
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'La liga no permite pagar esta clausula']);
    }
}

if ($route === '/biwenger/bid-count' && $requestMethod === 'POST') {
    $sessionState = require_biwenger_session();
    $payload = read_json_body();
    $playerId = (int)($payload['playerId'] ?? 0);
    $ownerId = (int)($payload['ownerId'] ?? 0);
    if ($playerId <= 0) send_json(400, ['error' => 'Jugador requerido']);
    if (empty($sessionState['bidCountFree']) && empty($payload['confirmedCreditCost'])) {
        send_json(402, [
            'error' => 'Consultar este contador cuesta 1 moneda Biwenger en cuentas o ligas sin acceso incluido',
            'requiresConfirmation' => true,
            'costCredits' => 1
        ]);
    }
    try {
        $detail = biwenger_visible_bid_count_detail($sessionState, $playerId, $ownerId, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls);
        $count = $detail['count'];
        if ($count === null) $count = 0;
        $ownOffers = [];
        try {
            $userOffersResponse = biwenger_private_get_json(
                'https://biwenger.as.com/api/v2/user?fields=offers',
                $sessionState,
                min($sourceTimeoutSeconds, 5),
                $biwengerJsonHeaders,
                $strictTls
            );
            $userOffersData = is_array($userOffersResponse['data'] ?? null) ? $userOffersResponse['data'] : $userOffersResponse;
            biwenger_collect_offer_entries((array)($userOffersData['offers'] ?? $userOffersData), $ownOffers, 'own-check');
        } catch (Throwable $offersError) {
        }
        $ownBidMap = biwenger_offer_map($ownOffers, (int)($sessionState['userId'] ?? 0));
        $hasOwnBid = !empty($ownBidMap[$playerId]['hasBid']);
        send_json(200, [
            'ok' => true,
            'count' => $count,
            'rivalCount' => max(0, $count - ($hasOwnBid ? 1 : 0)),
            'hasOwnBid' => $hasOwnBid,
            'source' => $detail['source']
        ]);
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'La liga oculta el numero de pujas']);
    }
}

function biwenger_market_owner_id(array $session, int $playerId, int $timeoutSeconds, array $headers, bool $strictTls): int
{
    $context = biwenger_market_player_context($session, $playerId, $timeoutSeconds, $headers, $strictTls);
    return (int)($context['ownerId'] ?? 0);
}

function biwenger_market_player_context(array $session, int $playerId, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $response = biwenger_private_get_json('https://biwenger.as.com/api/v2/market', $session, $timeoutSeconds, $headers, $strictTls);
    $data = is_array($response['data'] ?? null) ? $response['data'] : [];
    foreach (biwenger_market_entries($data) as $sale) {
        if (!is_array($sale)) continue;
        $salePlayerId = (int)($sale['player']['id'] ?? $sale['playerID'] ?? 0);
        if ($salePlayerId === $playerId) {
            $player = is_array($sale['player'] ?? null) ? $sale['player'] : [];
            return [
                'found' => true,
                'ownerId' => (int)($sale['user']['id'] ?? $sale['userID'] ?? 0),
                'minimumAmount' => biwenger_sale_price($sale)
                    ?: biwenger_money_int($player['price'] ?? $player['fantasyPrice'] ?? 0)
            ];
        }
    }
    return ['found' => false, 'ownerId' => 0, 'minimumAmount' => 0];
}

if ($route === '/biwenger/league' && $requestMethod === 'GET') {
    $sessionState = require_biwenger_session();
    session_write_close();
    try {
        send_json(200, biwenger_league_overview($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo leer la clasificacion']);
    }
}

if ($route === '/biwenger/fixtures' && $requestMethod === 'GET') {
    $sessionState = require_biwenger_session();
    session_write_close();
    try {
        send_json(200, fast_current_fixtures($sessionState, $sourceTimeoutSeconds, $sourceHeaders, $strictTls, $dbDir));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo cargar el calendario']);
    }
}

if ($route === '/biwenger/live-round' && $requestMethod === 'GET') {
    $sessionState = require_biwenger_session();
    session_write_close();
    try {
        send_json(200, biwenger_live_round($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo leer la jornada fantasy']);
    }
}

if ($route === '/biwenger/live-round-debug' && $requestMethod === 'GET') {
    $sessionState = require_biwenger_session();
    try {
        send_json(200, biwenger_live_round_debug($sessionState, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo depurar la jornada fantasy']);
    }
}

if ($route === '/biwenger/rival-team' && $requestMethod === 'POST') {
    $sessionState = require_biwenger_session();
    $payload = read_json_body();
    $rivalUserId = (int)($payload['userId'] ?? 0);
    if ($rivalUserId <= 0) send_json(400, ['error' => 'Rival no valido']);
    try {
        send_json(200, biwenger_rival_team($sessionState, $rivalUserId, $sourceTimeoutSeconds, $biwengerJsonHeaders, $strictTls));
    } catch (Throwable $error) {
        send_json(502, ['error' => $error->getMessage() ?: 'No se pudo leer la plantilla rival']);
    }
}

if ($route === '/leagues' && $requestMethod === 'GET') {
    send_json(200, league_list_payload($leaguesDb));
}

if ($route === '/leagues' && $requestMethod === 'POST') {
    $payload = read_json_body();
    $name = trim((string)($payload['name'] ?? ''));
    $name = $name !== '' ? mb_substr($name, 0, 60) : 'Nueva liga';
    $now = gmdate('c');
    $id = create_league_id();
    $leaguesDb['leagues'][$id] = [
        'id' => $id,
        'name' => $name,
        'createdAt' => $now,
        'updatedAt' => $now,
        'competition' => ($payload['competition'] ?? '') === 'worldcup' ? 'worldcup' : 'club',
        'fantasyProvider' => sanitize_fantasy_provider($payload['fantasyProvider'] ?? 'local'),
        'scoring' => sanitize_scoring($payload['scoring'] ?? 'mixed'),
        'marketPlayers' => [],
        'teamPlayers' => [],
        'finance' => sanitize_finance_payload([]),
        'weights' => sanitize_weights_payload($payload['weights'] ?? []),
        'filters' => sanitize_filters_payload($payload['filters'] ?? []),
        'preferences' => sanitize_preferences_payload($payload['preferences'] ?? [])
    ];
    $leaguesDb['activeLeagueId'] = $id;
    write_json_file($leaguesDbPath, $leaguesDb);
    send_json(201, league_list_payload($leaguesDb));
}

if ($route === '/leagues/select' && $requestMethod === 'POST') {
    $payload = read_json_body();
    $leagueId = (string)($payload['leagueId'] ?? '');
    if ($leagueId === '' || !isset($leaguesDb['leagues'][$leagueId])) {
        send_json(404, ['error' => 'Liga no encontrada']);
    }
    $leaguesDb['activeLeagueId'] = $leagueId;
    write_json_file($leaguesDbPath, $leaguesDb);
    send_json(200, league_list_payload($leaguesDb));
}

if ($route === '/leagues/delete' && $requestMethod === 'POST') {
    $payload = read_json_body();
    $leagueId = (string)($payload['leagueId'] ?? '');
    if ($leagueId === '' || !isset($leaguesDb['leagues'][$leagueId])) {
        send_json(404, ['error' => 'Liga no encontrada']);
    }
    unset($leaguesDb['leagues'][$leagueId]);
    if (!$leaguesDb['leagues']) {
        ensure_default_league($leaguesDb, $leaguesDbPath);
    } else {
        if (($leaguesDb['activeLeagueId'] ?? null) === $leagueId) {
            $remainingIds = array_keys($leaguesDb['leagues']);
            $leaguesDb['activeLeagueId'] = $remainingIds[0] ?? null;
        }
        write_json_file($leaguesDbPath, $leaguesDb);
    }
    send_json(200, league_list_payload($leaguesDb));
}

if ($route === '/leagues/save' && $requestMethod === 'POST') {
    $payload = read_json_body();
    $leagueId = (string)($payload['leagueId'] ?? ($leaguesDb['activeLeagueId'] ?? ''));
    if ($leagueId === '') {
        send_json(400, ['error' => 'Liga no valida']);
    }
    if (!isset($leaguesDb['leagues'][$leagueId])) {
        $now = gmdate('c');
        $leaguesDb['leagues'][$leagueId] = [
            'id' => $leagueId,
            'name' => trim((string)($payload['name'] ?? 'Mi liga')) ?: 'Mi liga',
            'createdAt' => $now,
            'updatedAt' => $now,
            'competition' => 'club',
            'fantasyProvider' => 'local',
            'scoring' => 'mixed',
            'marketPlayers' => [],
            'teamPlayers' => [],
            'finance' => sanitize_finance_payload([]),
            'weights' => sanitize_weights_payload([]),
            'filters' => sanitize_filters_payload([]),
            'preferences' => sanitize_preferences_payload([])
        ];
    }
    $existing = $leaguesDb['leagues'][$leagueId];
    $sanitized = sanitize_league_payload($payload);
    $leaguesDb['leagues'][$leagueId] = array_merge($existing, $sanitized, [
        'updatedAt' => gmdate('c')
    ]);
    $leaguesDb['activeLeagueId'] = $leagueId;
    write_json_file($leaguesDbPath, $leaguesDb);
    send_json(200, league_list_payload($leaguesDb));
}

if ($route === '/enrich' && $requestMethod === 'POST') {
    $payload = read_json_body();
    $players = isset($payload['players']) && is_array($payload['players']) ? array_slice($payload['players'], 0, 40) : [];
    if (!$players) {
        send_json(400, ['error' => 'No players received']);
    }

    $competition = ($payload['competition'] ?? '') === 'worldcup' ? 'worldcup' : 'club';
    $forceRefresh = ($payload['forceRefresh'] ?? false) === true;
    $enriched = [];
    $cacheHits = 0;
    $refreshed = 0;
    session_write_close();

    foreach ($players as $player) {
        $result = enrich_player_with_cache(
            $player,
            $competition,
            $forceRefresh,
            $playerDb,
            $playerCacheMs,
            $sourceCriteriaVersion,
            $sourceTimeoutSeconds,
            $sourceHeaders,
            $strictTls,
            $assetsDir,
            $nationalTeamSlugOverrides,
            $searchOverrides,
            $nationalTeamAlpha2
        );
        $enriched[] = $result;
        if (($result['cacheStatus'] ?? '') === 'hit') {
            $cacheHits += 1;
        } else {
            $refreshed += 1;
        }
    }

    $playerDb['updatedAt'] = gmdate('c');
    write_json_file($playerDbPath, $playerDb);
    $liveCount = count(array_filter($enriched, static function ($player) {
        return ($player['sourceStatus'] ?? '') === 'live';
    }));

    send_json(200, [
        'generatedAt' => gmdate('c'),
        'sourceNotes' => [
            'Identidad: consenso estricto SoccerWiki + Transfermarkt por nombre, posicion y equipo/seleccion',
            'Biwenger: puntos fantasy reales, mercado, plantilla y valores',
            'API-Football: calendario, fotos, escudos, lesiones, minutos y sustituciones bajo demanda',
            'SofaScore: fuente opcional; si devuelve 403 no bloquea la valoracion',
            'FutbolFantasy: perfil fantasy y Seguimiento como fuente de minutos/sustituciones cuando hay sesion',
            'Base local PHP: resultados vigentes durante 24 horas salvo actualizacion manual'
        ],
        'liveCount' => $liveCount,
        'cacheHits' => $cacheHits,
        'refreshed' => $refreshed,
        'cache' => source_status_payload($playerDb, $playerCacheMs, $sourceCriteriaVersion),
        'enriched' => $enriched
    ]);
}

if ($route === '/identity/resolve' && $requestMethod === 'POST') {
    $payload = read_json_body();
    $player = isset($payload['player']) && is_array($payload['player']) ? $payload['player'] : $payload;
    if (trim((string)($player['name'] ?? '')) === '') {
        send_json(400, ['error' => 'Player name required']);
    }
    $competition = ($payload['competition'] ?? '') === 'worldcup' ? 'worldcup' : 'club';
    $identity = resolve_canonical_identity($player, $competition, $sourceTimeoutSeconds, $sourceHeaders, $strictTls);
    send_json(200, [
        'matched' => $identity !== null,
        'competition' => $competition,
        'input' => $player,
        'identity' => $identity
    ]);
}

if ($route === '/player/recent-details' && $requestMethod === 'POST') {
    $payload = read_json_body();
    $player = isset($payload['player']) && is_array($payload['player']) ? $payload['player'] : [];
    if (trim((string)($player['name'] ?? '')) === '') {
        send_json(400, ['error' => 'Jugador requerido']);
    }
    $sessionState = $_SESSION['biwenger'] ?? [];
    $competition = (string)($payload['competition'] ?? $sessionState['competition'] ?? '');
    if ($competition !== '') $sessionState['competition'] = $competition;
    $errors = [];
    try {
        $ffDetails = futbol_fantasy_player_recent_details(
            $player,
            $_SESSION['futbolFantasy'] ?? [],
            $competition,
            max($sourceTimeoutSeconds, 12),
            $futbolFantasyHeaders,
            $strictTls,
            $dbDir
        );
        if (!empty($ffDetails['recentMatches'])) {
            send_json(200, array_merge(['ok' => true], $ffDetails));
        }
    } catch (Throwable $error) {
        $errors[] = 'FutbolFantasy: ' . ($error->getMessage() ?: 'sin datos');
    }
    try {
        $details = api_football_player_recent_details(
            $player,
            $sessionState,
            max($sourceTimeoutSeconds, 12),
            $sourceHeaders,
            $strictTls,
            $dbDir
        );
        send_json(200, array_merge(['ok' => true], $details));
    } catch (Throwable $error) {
        $errors[] = 'API-Football: ' . ($error->getMessage() ?: 'sin datos');
        send_json(502, [
            'ok' => false,
            'provider' => 'cascade',
            'error' => $errors ? implode(' | ', $errors) : 'No se pudieron cargar minutos recientes'
        ]);
    }
}

send_json(404, ['error' => 'Endpoint no encontrado']);

function request_path(): string
{
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php')), '/');
    if ($scriptDir !== '' && $scriptDir !== '/' && strpos($uriPath, $scriptDir) === 0) {
        $uriPath = substr($uriPath, strlen($scriptDir));
    }
    return $uriPath === '' ? '/' : $uriPath;
}

function send_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    apply_cors_headers();
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function send_empty(int $status): void
{
    http_response_code($status);
    apply_cors_headers();
    exit;
}

function apply_cors_headers(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = array_values(array_filter(array_map('trim', explode(',', (string)getenv('FMS_ALLOWED_ORIGINS')))));
    if ($origin !== '') {
        if ($allowed) {
            if (in_array(rtrim($origin, '/'), array_map(static function ($item) {
                return rtrim($item, '/');
            }, $allowed), true)) {
                header('Access-Control-Allow-Origin: ' . $origin);
                header('Vary: Origin');
                header('Access-Control-Allow-Credentials: true');
            }
        } else {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Credentials: true');
        }
    } else {
        header('Access-Control-Allow-Origin: *');
    }
    header('Access-Control-Allow-Methods: GET,POST,OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-FMS-Device-Key');
}

function biwenger_device_key(): string
{
    $key = trim((string)($_SERVER['HTTP_X_FMS_DEVICE_KEY'] ?? ''));
    return preg_match('/^[a-zA-Z0-9_-]{24,160}$/', $key) ? hash('sha256', $key) : '';
}

function restore_biwenger_device_session(array $db): void
{
    if (!empty($_SESSION['biwenger']['token'])) return;
    $key = biwenger_device_key();
    $saved = $key !== '' ? ($db['sessions'][$key] ?? null) : null;
    if (is_array($saved) && !empty($saved['token'])) {
        $_SESSION['biwenger'] = $saved;
    }
}

function persist_biwenger_device_session(array &$db, string $path, array $session): void
{
    $key = biwenger_device_key();
    if ($key === '' || empty($session['token'])) return;
    $session['rememberedAt'] = gmdate('c');
    $db['sessions'][$key] = $session;
    write_json_file($path, $db);
}

function forget_biwenger_device_session(array &$db, string $path): void
{
    $key = biwenger_device_key();
    if ($key === '' || !isset($db['sessions'][$key])) return;
    unset($db['sessions'][$key]);
    write_json_file($path, $db);
}

function require_biwenger_session(): array
{
    $session = $_SESSION['biwenger'] ?? null;
    if (!is_array($session) || empty($session['token'])) {
        send_json(401, ['error' => 'No hay una sesion de Biwenger abierta']);
    }
    return $session;
}

function biwenger_session_state(array $session): array
{
    return [
        'connected' => !empty($session['token']) && !empty($session['leagueId']) && !empty($session['userId']),
        'userId' => $session['userId'] ?? null,
        'userName' => $session['userName'] ?? '',
        'leagueId' => $session['leagueId'] ?? null,
        'leagueName' => $session['leagueName'] ?? '',
        'leagueIcon' => $session['leagueIcon'] ?? null,
        'leagueCover' => $session['leagueCover'] ?? null,
        'availableLeagues' => array_values((array)($session['availableLeagues'] ?? [])),
        'competition' => $session['competition'] ?? '',
        'scoreId' => $session['scoreId'] ?? null,
        'balance' => $session['balance'] ?? null,
        'teamValue' => $session['teamValue'] ?? null,
        'maximumBid' => $session['maximumBid'] ?? null,
        'credits' => $session['credits'] ?? null,
        'rewardSettings' => is_array($session['rewardSettings'] ?? null) ? $session['rewardSettings'] : [],
        'bidCountFree' => !empty($session['bidCountFree']),
        'xVersion' => $session['xVersion'] ?? '',
        'syncedAt' => $session['syncedAt'] ?? null
    ];
}

function restore_futbol_fantasy_device_session(array $db): void
{
    if (!empty($_SESSION['futbolFantasy']['token'])) return;
    $key = biwenger_device_key();
    $saved = $key !== '' ? ($db['sessions'][$key] ?? null) : null;
    if (is_array($saved) && !empty($saved['token'])) {
        $_SESSION['futbolFantasy'] = $saved;
    }
}

function persist_futbol_fantasy_device_session(array &$db, string $path, array $session): void
{
    $key = biwenger_device_key();
    if ($key === '' || empty($session['token'])) return;
    $session['rememberedAt'] = gmdate('c');
    $db['sessions'][$key] = $session;
    write_json_file($path, $db);
}

function forget_futbol_fantasy_device_session(array &$db, string $path): void
{
    $key = biwenger_device_key();
    if ($key === '' || !isset($db['sessions'][$key])) return;
    unset($db['sessions'][$key]);
    write_json_file($path, $db);
}

function require_futbol_fantasy_session(): array
{
    $session = $_SESSION['futbolFantasy'] ?? null;
    if (!is_array($session) || empty($session['token'])) {
        send_json(401, ['error' => 'No hay una sesion de Futbol Fantasy abierta']);
    }
    return $session;
}

function futbol_fantasy_login_cooldown(string $path): array
{
    $state = read_json_file($path, []);
    $untilTs = (int)($state['untilTs'] ?? 0);
    return [
        'active' => $untilTs > time(),
        'untilTs' => $untilTs,
        'until' => $untilTs > 0 ? gmdate('c', $untilTs) : null,
        'reason' => (string)($state['reason'] ?? '')
    ];
}

function futbol_fantasy_set_login_cooldown(string $path, int $seconds, string $reason): array
{
    $state = [
        'untilTs' => time() + max(60, $seconds),
        'reason' => $reason,
        'savedAt' => gmdate('c')
    ];
    write_json_file($path, $state);
    return futbol_fantasy_login_cooldown($path);
}

function futbol_fantasy_clear_login_cooldown(string $path): void
{
    if (is_file($path)) @unlink($path);
}

function futbol_fantasy_session_state(array $session, string $cooldownPath = ''): array
{
    $cooldown = $cooldownPath !== '' ? futbol_fantasy_login_cooldown($cooldownPath) : ['active' => false, 'until' => null, 'reason' => ''];
    return [
        'connected' => !empty($session['token']),
        'userName' => $session['userName'] ?? '',
        'authMode' => $session['authMode'] ?? '',
        'trackingUrl' => $session['trackingUrl'] ?? 'https://www.futbolfantasy.com/seguimiento',
        'loginBlocked' => (bool)$cooldown['active'],
        'loginBlockedUntil' => $cooldown['active'] ? $cooldown['until'] : null,
        'loginBlockedReason' => $cooldown['active'] ? $cooldown['reason'] : '',
        'lastTeamSyncedAt' => $session['lastTeamSyncedAt'] ?? null,
        'syncedAt' => $session['syncedAt'] ?? null
    ];
}

function futbol_fantasy_cookie_file_for_device(string $dbDir): string
{
    $key = biwenger_device_key();
    if ($key === '') $key = hash('sha256', session_id() ?: uniqid('ff', true));
    return $dbDir . DIRECTORY_SEPARATOR . 'ff-cookie-' . preg_replace('/[^a-f0-9]/i', '', $key) . '.txt';
}

function futbol_fantasy_cookie_file(array $session, string $dbDir): string
{
    $name = (string)($session['cookieFile'] ?? '');
    if ($name !== '' && basename($name) === $name && preg_match('/^ff-cookie-[a-f0-9]+\.txt$/i', $name)) {
        return $dbDir . DIRECTORY_SEPARATOR . $name;
    }
    return futbol_fantasy_cookie_file_for_device($dbDir);
}

function futbol_fantasy_delete_cookie(array $session, string $dbDir): void
{
    $path = futbol_fantasy_cookie_file($session, $dbDir);
    if (is_file($path)) @unlink($path);
}

function futbol_fantasy_tracking_url(string $competition = ''): string
{
    $normalized = normalize_text($competition);
    if (preg_match('/world|mundial|copa del mundo/', $normalized)) {
        return 'https://www.futbolfantasy.com/seguimiento/world-cup/1';
    }
    if (preg_match('/laliga|la liga|primera|espana/', $normalized)) {
        return 'https://www.futbolfantasy.com/seguimiento/laliga/9';
    }
    return 'https://www.futbolfantasy.com/seguimiento';
}

function futbol_fantasy_request(string $method, string $url, string $cookieFile, int $timeoutSeconds, array $headers, bool $strictTls, ?string $body = null): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('cURL es necesario para mantener sesion en Futbol Fantasy');
    }
    ensure_directory(dirname($cookieFile));
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => $timeoutSeconds,
        CURLOPT_CONNECTTIMEOUT => $timeoutSeconds,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_SSL_VERIFYPEER => $strictTls,
        CURLOPT_SSL_VERIFYHOST => $strictTls ? 2 : 0,
        CURLOPT_COOKIEJAR => $cookieFile,
        CURLOPT_COOKIEFILE => $cookieFile,
        CURLOPT_HEADER => false
    ]);
    if ($method !== 'GET' && $body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $responseBody = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $effectiveUrl = (string)curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    $contentType = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($responseBody === false) {
        throw new RuntimeException($error !== '' ? $error : 'Error HTTP remoto');
    }
    return [
        'status' => $status,
        'effectiveUrl' => $effectiveUrl,
        'contentType' => $contentType,
        'body' => (string)$responseBody
    ];
}

function futbol_fantasy_login_session(string $email, string $password, string $dbDir, string $cooldownPath, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $cooldown = futbol_fantasy_login_cooldown($cooldownPath);
    if (!empty($cooldown['active'])) {
        throw new RuntimeException('Futbol Fantasy esta limitando logins automaticos desde este servidor. Reintenta despues de ' . date('H:i', (int)$cooldown['untilTs']) . ' o usa las fuentes publicas mientras tanto.');
    }
    $cookieFile = futbol_fantasy_cookie_file_for_device($dbDir);
    if (is_file($cookieFile)) @unlink($cookieFile);
    $login = futbol_fantasy_request('GET', 'https://www.futbolfantasy.com/login', $cookieFile, $timeoutSeconds, $headers, $strictTls);
    if ($login['status'] < 200 || $login['status'] >= 400) {
        if ((int)$login['status'] === 429) {
            futbol_fantasy_set_login_cooldown($cooldownPath, 30 * 60, 'HTTP 429 en formulario de login');
            throw new RuntimeException('Futbol Fantasy esta limitando logins automaticos desde este servidor (HTTP 429). Pauso nuevos intentos 30 minutos para no agravar el bloqueo.');
        }
        throw new RuntimeException('Futbol Fantasy no ha cargado el formulario de login (HTTP ' . $login['status'] . ')');
    }
    if (!preg_match('/name=["\']_token["\'][^>]*value=["\']([^"\']+)["\']/i', $login['body'], $tokenMatch)) {
        throw new RuntimeException('Futbol Fantasy no ha devuelto token de sesion');
    }
    $form = http_build_query([
        '_token' => html_entity_decode($tokenMatch[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'),
        'redirect' => 'dashboard',
        'email' => $email,
        'password' => $password,
        'remember' => 'on'
    ], '', '&');
    $postHeaders = array_values(array_filter($headers, static fn($header) => stripos($header, 'Content-Type:') !== 0));
    $postHeaders[] = 'Content-Type: application/x-www-form-urlencoded';
    $postHeaders[] = 'Referer: https://www.futbolfantasy.com/login';
    $result = futbol_fantasy_request('POST', 'https://www.futbolfantasy.com/login', $cookieFile, $timeoutSeconds, $postHeaders, $strictTls, $form);
    $trackingUrl = futbol_fantasy_tracking_url((string)($_SESSION['biwenger']['competition'] ?? ''));
    $tracking = futbol_fantasy_request('GET', $trackingUrl, $cookieFile, $timeoutSeconds, $headers, $strictTls);
    $loginStillVisible = preg_match('/id=["\']email_address["\']|name=["\']password["\']/i', $tracking['body'] . $result['body']);
    if ((int)$result['status'] === 429 || (int)$tracking['status'] === 429) {
        futbol_fantasy_set_login_cooldown($cooldownPath, 30 * 60, 'HTTP 429 despues de enviar login');
        throw new RuntimeException('Futbol Fantasy ha limitado el login automatico (HTTP 429). Pauso nuevos intentos 30 minutos.');
    }
    if ($result['status'] >= 400 || $tracking['status'] >= 400 || $loginStillVisible) {
        throw new RuntimeException('Futbol Fantasy bloquea el login automatico con email/contrasena. Inicia sesion en FutbolFantasy desde tu navegador, copia la cabecera Cookie y usa el boton "Usar cookie" en Ajustes.');
    }
    futbol_fantasy_clear_login_cooldown($cooldownPath);
    return [
        'token' => 'cookie-session',
        'userName' => $email,
        'cookieFile' => basename($cookieFile),
        'trackingUrl' => $trackingUrl,
        'syncedAt' => gmdate('c')
    ];
}

function futbol_fantasy_session_from_cookie(string $cookieHeader, string $dbDir, string $competition, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $cookies = futbol_fantasy_parse_cookie_header($cookieHeader);
    if (!$cookies) {
        throw new RuntimeException('No he encontrado cookies validas en el texto pegado');
    }
    $cookieFile = futbol_fantasy_cookie_file_for_device($dbDir);
    futbol_fantasy_write_cookie_jar($cookieFile, $cookies);
    $trackingUrl = futbol_fantasy_tracking_url($competition);
    $tracking = futbol_fantasy_request('GET', $trackingUrl, $cookieFile, $timeoutSeconds, $headers, $strictTls);
    if ((int)$tracking['status'] === 429) {
        throw new RuntimeException('Futbol Fantasy tambien limita esta sesion al validar Seguimiento (HTTP 429)');
    }
    if ($tracking['status'] < 200 || $tracking['status'] >= 400) {
        throw new RuntimeException('Futbol Fantasy no ha abierto Seguimiento con esa cookie (HTTP ' . $tracking['status'] . ')');
    }
    if (preg_match('/id=["\']email_address["\']|name=["\']password["\']/i', $tracking['body'])) {
        throw new RuntimeException('La cookie no mantiene una sesion iniciada en Futbol Fantasy. Inicia sesion en FF y copia de nuevo la cabecera Cookie.');
    }
    return [
        'token' => 'cookie-session',
        'authMode' => 'manual-cookie',
        'userName' => 'Sesion FF',
        'cookieFile' => basename($cookieFile),
        'trackingUrl' => $trackingUrl,
        'syncedAt' => gmdate('c')
    ];
}

function futbol_fantasy_parse_cookie_header(string $cookieHeader): array
{
    $text = trim(preg_replace('/^\s*cookie\s*:\s*/i', '', $cookieHeader));
    $text = str_replace(["\r", "\n"], '; ', $text);
    $cookies = [];
    foreach (preg_split('/;\s*/', $text) as $part) {
        if ($part === '' || strpos($part, '=') === false) continue;
        [$name, $value] = array_map('trim', explode('=', $part, 2));
        if ($name === '' || !preg_match('/^[A-Za-z0-9_.-]+$/', $name)) continue;
        if (in_array(strtolower($name), ['path', 'domain', 'expires', 'max-age', 'samesite', 'secure', 'httponly'], true)) continue;
        $cookies[$name] = $value;
    }
    return $cookies;
}

function futbol_fantasy_write_cookie_jar(string $cookieFile, array $cookies): void
{
    ensure_directory(dirname($cookieFile));
    $expires = (string)(time() + 60 * 60 * 24 * 30);
    $lines = ["# Netscape HTTP Cookie File"];
    foreach ($cookies as $name => $value) {
        $safeValue = str_replace(["\r", "\n", "\t"], '', (string)$value);
        $lines[] = implode("\t", ['.futbolfantasy.com', 'TRUE', '/', 'TRUE', $expires, $name, $safeValue]);
    }
    file_put_contents($cookieFile, implode("\n", $lines) . "\n", LOCK_EX);
}

function futbol_fantasy_prepare_tracking_team(array $session, array $players, string $competition, int $timeoutSeconds, array $headers, bool $strictTls, string $dbDir): array
{
    $cookieFile = futbol_fantasy_cookie_file($session, $dbDir);
    $trackingUrl = futbol_fantasy_tracking_url($competition);
    $response = futbol_fantasy_request('GET', $trackingUrl, $cookieFile, $timeoutSeconds, $headers, $strictTls);
    if ($response['status'] < 200 || $response['status'] >= 400) {
        throw new RuntimeException('Futbol Fantasy no ha abierto Seguimiento (HTTP ' . $response['status'] . ')');
    }
    $cleanPlayers = array_map(static function ($player) {
        return [
            'name' => trim((string)($player['name'] ?? '')),
            'team' => trim((string)($player['team'] ?? '')),
            'position' => map_position((string)($player['position'] ?? '')),
            'biwengerPlayerId' => (int)($player['biwengerPlayerId'] ?? 0)
        ];
    }, $players);
    $cleanPlayers = array_values(array_filter($cleanPlayers, static fn($player) => $player['name'] !== ''));
    $cacheKey = biwenger_device_key() ?: hash('sha256', session_id() ?: 'ff-team');
    write_json_file($dbDir . DIRECTORY_SEPARATOR . 'futbolfantasy-last-team-' . preg_replace('/[^a-f0-9]/i', '', $cacheKey) . '.json', [
        'trackingUrl' => $trackingUrl,
        'players' => $cleanPlayers,
        'savedAt' => gmdate('c')
    ]);
    return [
        'ok' => true,
        'trackingUrl' => $trackingUrl,
        'players' => $cleanPlayers,
        'message' => 'Equipo preparado para Futbol Fantasy. La lectura de minutos usara Seguimiento; si FF exige confirmacion, abre Seguimiento y valida la plantilla alli.'
    ];
}

function futbol_fantasy_player_recent_details(array $player, array $session, string $competition, int $timeoutSeconds, array $headers, bool $strictTls, string $dbDir): array
{
    if (empty($session['token'])) throw new RuntimeException('FutbolFantasy no conectado');
    $playerName = trim((string)($player['name'] ?? ''));
    if ($playerName === '') throw new RuntimeException('Jugador requerido');
    $cacheKey = slugify('ff-recent-' . $competition . '-' . $playerName . '-' . (string)($player['team'] ?? ''));
    $cachePath = $dbDir . DIRECTORY_SEPARATOR . $cacheKey . '.json';
    $cached = read_json_file($cachePath, []);
    if (!empty($cached['fetchedAtTs']) && (int)$cached['fetchedAtTs'] > time() - 21600 && !empty($cached['recentMatches'])) {
        $cached['cacheStatus'] = 'hit-futbolfantasy-recent';
        return $cached;
    }
    $cookieFile = futbol_fantasy_cookie_file($session, $dbDir);
    $trackingUrl = (string)($session['trackingUrl'] ?? futbol_fantasy_tracking_url($competition));
    $response = futbol_fantasy_request('GET', $trackingUrl, $cookieFile, $timeoutSeconds, $headers, $strictTls);
    if ($response['status'] < 200 || $response['status'] >= 400) {
        throw new RuntimeException('FutbolFantasy Seguimiento HTTP ' . $response['status']);
    }
    if (preg_match('/id=["\']email_address["\']|name=["\']password["\']/i', $response['body'])) {
        throw new RuntimeException('FutbolFantasy requiere iniciar sesion de nuevo');
    }
    $row = futbol_fantasy_player_context($response['body'], $playerName);
    if ($row === '') throw new RuntimeException('FutbolFantasy no muestra datos de ' . $playerName . ' en Seguimiento');
    $details = futbol_fantasy_parse_minutes_row($row, $playerName, $trackingUrl);
    if (!$details) throw new RuntimeException('FutbolFantasy no expone minutos reconocibles para ' . $playerName);
    $result = [
        'provider' => 'futbolfantasy',
        'recentMatches' => [$details],
        'sourceUrl' => $trackingUrl,
        'fetchedAtTs' => time(),
        'cacheStatus' => 'futbolfantasy-recent'
    ];
    write_json_file($cachePath, $result);
    return $result;
}

function futbol_fantasy_player_context(string $html, string $playerName): string
{
    $blocks = [];
    if (preg_match_all('~<tr\b[^>]*>.*?</tr>~is', $html, $matches)) {
        $blocks = array_merge($blocks, $matches[0]);
    }
    if (preg_match_all('~<div\b[^>]*(?:player|jugador|fila|row)[^>]*>.*?</div>~is', $html, $divs)) {
        $blocks = array_merge($blocks, $divs[0]);
    }
    foreach ($blocks as $block) {
        $text = futbol_fantasy_plain_text($block);
        if (identity_name_score($text, $playerName) >= 64 || strpos(normalize_text($text), normalize_text($playerName)) !== false) {
            return $block;
        }
    }
    return '';
}

function futbol_fantasy_parse_minutes_row(string $row, string $playerName, string $trackingUrl): ?array
{
    $text = futbol_fantasy_plain_text($row);
    $minutes = futbol_fantasy_extract_int($row, $text, ['data-min', 'data-minutos', 'minutos', 'min']);
    $inMinute = futbol_fantasy_extract_int($row, $text, ['data-ent', 'data-entrada', 'entrada', 'ent']);
    $outMinute = futbol_fantasy_extract_int($row, $text, ['data-sal', 'data-salida', 'salida', 'sal']);
    if ($minutes === null && $inMinute === null && $outMinute === null) return null;
    $played = ($minutes !== null && $minutes > 0) || $inMinute !== null || $outMinute !== null;
    return [
        'provider' => 'futbolfantasy',
        'title' => 'Futbol Fantasy Seguimiento',
        'fixture' => 'Seguimiento Fantasy',
        'opponent' => '',
        'played' => $played,
        'starter' => $inMinute === null && ($minutes === null || $minutes >= 45),
        'minutes' => $minutes,
        'minuteIn' => $inMinute,
        'minuteOut' => $outMinute,
        'minuteInLabel' => $inMinute !== null ? (string)$inMinute : null,
        'minuteOutLabel' => $outMinute !== null ? (string)$outMinute : null,
        'lineupInMinute' => $inMinute,
        'substitutionOutMinute' => $outMinute,
        'points' => [],
        'sourceUrl' => $trackingUrl,
        'rawText' => substr($text, 0, 360),
        'label' => $playerName
    ];
}

function futbol_fantasy_extract_int(string $html, string $text, array $labels): ?int
{
    foreach ($labels as $label) {
        $attr = preg_quote($label, '/');
        if (preg_match('/' . $attr . '=["\']?(\d{1,3})/i', $html, $match)) {
            return (int)$match[1];
        }
    }
    foreach ($labels as $label) {
        $word = preg_quote(str_replace('data-', '', $label), '/');
        if (preg_match('/\b' . $word . '\.?\s*[:\-]?\s*(\d{1,3})\b/iu', $text, $match)) {
            return (int)$match[1];
        }
    }
    return null;
}

function futbol_fantasy_plain_text(string $html): string
{
    $html = preg_replace('/<(?:br|\/td|\/th|\/div|\/span)\b[^>]*>/i', ' ', $html);
    $text = html_entity_decode(strip_tags((string)$html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim(preg_replace('/\s+/u', ' ', $text));
}

function resolve_biwenger_version(string $cachePath, int $timeoutSeconds, array $headers, bool $strictTls): string
{
    $cached = read_json_file($cachePath, []);
    $freshUntil = (int)($cached['fetchedAtTs'] ?? 0) + 60 * 60 * 12;
    if (!empty($cached['version']) && $freshUntil > time()) {
        return (string)$cached['version'];
    }

    $html = http_get_text('https://biwenger.as.com/', $timeoutSeconds, $headers, $strictTls);
    if (!preg_match('~/app/v(\d+)~', $html, $match)) {
        $fallback = (string)(getenv('FMS_BIWENGER_VERSION') ?: '630');
        write_json_file($cachePath, ['version' => $fallback, 'fetchedAtTs' => time(), 'source' => 'fallback']);
        return $fallback;
    }

    $version = (string)$match[1];
    write_json_file($cachePath, ['version' => $version, 'fetchedAtTs' => time(), 'source' => 'biwenger-home']);
    return $version;
}

function biwenger_login(string $email, string $password, int $timeoutSeconds, array $headers, bool $strictTls): string
{
    $response = http_request(
        'POST',
        'https://biwenger.as.com/api/v2/auth/login',
        $timeoutSeconds,
        $headers,
        $strictTls,
        json_encode(['email' => $email, 'password' => $password], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
    $json = $response['json'];
    $token = (string)($json['token'] ?? $json['data']['token'] ?? '');
    if ($response['status'] < 200 || $response['status'] >= 300 || $token === '') {
        $message = (string)($json['error'] ?? $json['message'] ?? 'Login rechazado por Biwenger');
        throw new RuntimeException($message);
    }
    return $token;
}

function biwenger_build_session(string $token, string $version, string $preferredLeagueName, int $timeoutSeconds, array $headers, bool $strictTls, bool $requirePreferredMatch = false, int $preferredLeagueId = 0): array
{
    $account = biwenger_fetch_account($token, $version, $timeoutSeconds, $headers, $strictTls);
    $data = $account['data'] ?? [];
    $accountLeagues = (array)($data['leagues'] ?? []);
    $league = biwenger_pick_league($accountLeagues, $preferredLeagueName, $preferredLeagueId);
    $user = is_array($league['user'] ?? null) ? $league['user'] : [];

    if ($requirePreferredMatch && $preferredLeagueId > 0 && (int)($league['id'] ?? 0) !== $preferredLeagueId) {
        throw new RuntimeException('No existe en Biwenger la liga vinculada con ID ' . $preferredLeagueId);
    }
    if ($requirePreferredMatch && $preferredLeagueId <= 0 && !biwenger_league_name_matches((string)($league['name'] ?? ''), $preferredLeagueName)) {
        throw new RuntimeException('No existe en Biwenger una liga que coincida con "' . $preferredLeagueName . '"');
    }
    if (empty($league['id']) || empty($user['id'])) {
        throw new RuntimeException($preferredLeagueName !== ''
            ? 'No he encontrado en Biwenger una liga que coincida con el nombre de tu liga en la app'
            : 'Biwenger no ha devuelto una liga util para esta cuenta');
    }

    $leagueIcon = biwenger_entity_media($league, ['icon', 'logo', 'badge', 'shield', 'avatar', 'photo', 'image'])
        ?: biwenger_league_icon_fallback((int)($league['id'] ?? 0));
    $leagueCover = biwenger_entity_media($league, ['cover', 'background', 'backgroundImage', 'header', 'banner', 'wallpaper']) ?: $leagueIcon;
    $availableLeagues = array_values(array_filter(array_map(static function ($entry) {
        if (!is_array($entry) || empty($entry['id'])) return null;
        $icon = biwenger_entity_media($entry, ['icon', 'logo', 'badge', 'shield', 'avatar', 'photo', 'image'])
            ?: biwenger_league_icon_fallback((int)($entry['id'] ?? 0));
        return [
            'id' => (int)$entry['id'],
            'name' => (string)($entry['name'] ?? ''),
            'icon' => $icon,
            'cover' => biwenger_entity_media($entry, ['cover', 'background', 'backgroundImage', 'header', 'banner', 'wallpaper']) ?: $icon
        ];
    }, $accountLeagues)));
    return [
        'token' => $token,
        'xVersion' => $version,
        'leagueId' => (int)$league['id'],
        'leagueName' => (string)($league['name'] ?? ''),
        'leagueIcon' => $leagueIcon,
        'leagueCover' => $leagueCover,
        'availableLeagues' => $availableLeagues,
        'userId' => (int)$user['id'],
        'userName' => (string)($user['name'] ?? ''),
        'competition' => biwenger_competition_value($league['competition'] ?? ''),
        'scoreId' => max(1, (int)($league['scoreID'] ?? $league['scoreId'] ?? $league['score']['id'] ?? 2)),
        'balance' => isset($user['balance']) ? (int)$user['balance'] : null,
        'credits' => biwenger_first_numeric_value($data, ['credits', 'account.credits', 'user.credits', 'coins']),
        'rewardSettings' => biwenger_reward_settings_from_node((array)($league['settings'] ?? $league)),
        'bidCountFree' => !empty($user['isPremium']) || in_array(strtolower((string)($league['type'] ?? '')), ['premium', 'ultra'], true),
        'syncedAt' => gmdate('c')
    ];
}

function biwenger_first_numeric_value(array $node, array $paths): ?int
{
    foreach ($paths as $path) {
        $value = biwenger_path_value($node, $path);
        if (is_numeric($value)) return (int)$value;
    }
    return null;
}

function biwenger_reward_position_amounts($value): array
{
    $result = [1 => 0, 2 => 0, 3 => 0];
    if (!is_array($value)) return $result;
    $keys = array_keys($value);
    $isList = $value === [] || $keys === range(0, count($value) - 1);
    foreach ($value as $key => $entry) {
        if (is_array($entry)) {
            $position = (int)($entry['position'] ?? $entry['rank'] ?? $entry['from'] ?? ($isList ? ((int)$key + 1) : (is_numeric($key) ? $key : 0)));
            $amount = biwenger_money_int($entry['amount'] ?? $entry['value'] ?? $entry['money'] ?? $entry['bonus'] ?? 0);
        } else {
            $position = $isList ? ((int)$key + 1) : (is_numeric($key) ? (int)$key : 0);
            $amount = biwenger_money_int($entry);
        }
        if ($position >= 1 && $position <= 3) $result[$position] = $amount;
    }
    return $result;
}

function biwenger_reward_settings_from_node(array $node): array
{
    $round = biwenger_reward_position_amounts($node['bonusRoundPosition'] ?? []);
    $league = biwenger_reward_position_amounts($node['bonusLeaguePosition'] ?? []);
    return [
        'available' => (bool)array_intersect([
            'bonusFixed', 'bonusPoint', 'bonusGoal', 'bonusIdealLineup', 'bonusGameMVP',
            'bonusRoundPosition', 'bonusLeaguePosition'
        ], array_keys($node)),
        'fixed' => biwenger_money_int($node['bonusFixed'] ?? 0),
        'pointValue' => biwenger_money_int($node['bonusPoint'] ?? 0),
        'goal' => biwenger_money_int($node['bonusGoal'] ?? 0),
        'idealLineup' => biwenger_money_int($node['bonusIdealLineup'] ?? 0),
        'gameMvp' => biwenger_money_int($node['bonusGameMVP'] ?? 0),
        'roundRank1' => $round[1],
        'roundRank2' => $round[2],
        'roundRank3' => $round[3],
        'leagueRank1' => $league[1],
        'leagueRank2' => $league[2],
        'leagueRank3' => $league[3],
        'source' => 'Biwenger: ajustes de liga'
    ];
}

function biwenger_league_name_matches(string $leagueName, string $preferredLeagueName): bool
{
    $league = normalize_text($leagueName);
    $preferred = normalize_text($preferredLeagueName);
    return $league !== '' && $preferred !== ''
        && ($league === $preferred || strpos($league, $preferred) !== false || strpos($preferred, $league) !== false);
}

function biwenger_fetch_account(string $token, string $version, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $variants = [$version];
    if ($version !== '') $variants[] = 'v' . $version;
    $variants[] = '';
    $variants = array_values(array_unique($variants));
    foreach ($variants as $candidateVersion) {
        $response = http_request(
            'GET',
            'https://biwenger.as.com/api/v2/account',
            $timeoutSeconds,
            biwenger_auth_headers($token, 0, 0, $candidateVersion, $headers, false),
            $strictTls
        );
        if ($response['status'] >= 200 && $response['status'] < 300) {
            return is_array($response['json']) ? $response['json'] : ['ok' => true];
        }
    }
    throw new RuntimeException('No se pudo leer la cuenta y ligas de Biwenger');
}

function biwenger_pick_league(array $leagues, string $preferredLeagueName, int $preferredLeagueId = 0): array
{
    if (!$leagues) return [];
    if ($preferredLeagueId > 0) {
        foreach ($leagues as $league) {
            if ((int)($league['id'] ?? 0) === $preferredLeagueId) return $league;
        }
    }
    if ($preferredLeagueName !== '') {
        $preferred = normalize_text($preferredLeagueName);
        foreach ($leagues as $league) {
            if (normalize_text((string)($league['name'] ?? '')) === $preferred) {
                return $league;
            }
        }
        foreach ($leagues as $league) {
            $name = normalize_text((string)($league['name'] ?? ''));
            if ($name !== '' && (strpos($name, $preferred) !== false || strpos($preferred, $name) !== false)) {
                return $league;
            }
        }
    }
    return $leagues[0];
}

function biwenger_competition_value($competition): string
{
    if (is_array($competition)) {
        return (string)($competition['slug'] ?? $competition['id'] ?? $competition['name'] ?? '');
    }
    return trim((string)$competition);
}

function biwenger_import_players(array $session, string $kind, int $timeoutSeconds, array $headers, bool $strictTls, array $knownTeamPlayers = []): array
{
    $leagueId = (int)($session['leagueId'] ?? 0);
    $userId = (int)($session['userId'] ?? 0);
    if ($leagueId <= 0 || $userId <= 0 || empty($session['token'])) {
        throw new RuntimeException('Sesion Biwenger incompleta');
    }

    $competition = (string)($session['competition'] ?? '');
    $catalog = biwenger_fetch_competition_catalog($competition, $timeoutSeconds, $headers, $strictTls, (int)($session['scoreId'] ?? 2));

    $finance = [
        'balance' => isset($session['balance']) ? (int)$session['balance'] : null,
        'teamValue' => isset($session['teamValue']) ? (int)$session['teamValue'] : null,
        'maximumBid' => isset($session['maximumBid']) ? (int)$session['maximumBid'] : null,
        'activeBids' => 0,
        'bidTotal' => 0
    ];

    $departedPlayers = [];
    $lineupPayload = null;
    if ($kind === 'team') {
        try {
            $response = biwenger_private_get_json(
                'https://biwenger.as.com/api/v2/user?fields=*,lineup(type,playersID),players(*,fitness,team,owner),market(*,-userID),offers,-trophies',
                $session,
                $timeoutSeconds,
                $headers,
                $strictTls
            );
        } catch (Throwable $error) {
            $response = biwenger_private_get_json(
                'https://biwenger.as.com/api/v2/user/' . $userId . '?fields=*,account(id),players(id,owner),lineups(round,points,count,position),league(id,name,competition,mode,scoreID),market,seasons,offers,lastPositions',
                $session,
                $timeoutSeconds,
                $headers,
                $strictTls
            );
        }
        $players = [];
        $userData = is_array($response['data'] ?? null) ? $response['data'] : [];
        if (is_array($userData['user'] ?? null)) {
            $userData = array_merge($userData, $userData['user']);
        }
        if (empty($userData['players'])) {
            $fallbackResponse = biwenger_private_get_json(
                'https://biwenger.as.com/api/v2/user/' . $userId . '?fields=*,account(id),players(id,owner),lineups(round,points,count,position),league(id,name,competition,mode,scoreID),market,seasons,offers,lastPositions',
                $session,
                $timeoutSeconds,
                $headers,
                $strictTls
            );
            $fallbackData = is_array($fallbackResponse['data'] ?? null) ? $fallbackResponse['data'] : [];
            if (is_array($fallbackData['user'] ?? null)) {
                $fallbackData = array_merge($fallbackData, $fallbackData['user']);
            }
            if (!empty($fallbackData['players'])) $userData = $fallbackData;
        }
        foreach ((array)($userData['players'] ?? []) as $entry) {
            if (!is_array($entry)) continue;
            $playerId = (int)($entry['id'] ?? 0);
            $catalogEntry = is_array($catalog['playersById'][$playerId] ?? null) ? $catalog['playersById'][$playerId] : [];
            $merged = array_merge($catalogEntry, $entry);
            $players[] = biwenger_normalize_player($merged, $catalog, $competition, true);
        }
        $currentPlayerIds = array_fill_keys(array_values(array_filter(array_map(static function ($player) {
            return (int)($player['biwengerPlayerId'] ?? $player['id'] ?? 0);
        }, $players))), true);
        foreach ($knownTeamPlayers as $knownPlayer) {
            $knownId = (int)($knownPlayer['biwengerPlayerId'] ?? $knownPlayer['id'] ?? 0);
            if ($knownId <= 0 || isset($currentPlayerIds[$knownId]) || isset($catalog['playersById'][$knownId])) continue;
            $departedPlayers[] = [
                'id' => $knownPlayer['id'] ?? ('departed-' . $knownId),
                'biwengerPlayerId' => $knownId,
                'name' => (string)($knownPlayer['name'] ?? 'Jugador'),
                'team' => (string)($knownPlayer['team'] ?? ''),
                'position' => (string)($knownPlayer['biwengerPosition'] ?? $knownPlayer['position'] ?? 'MC'),
                'biwengerPosition' => (string)($knownPlayer['biwengerPosition'] ?? $knownPlayer['position'] ?? 'MC'),
                'price' => (int)($knownPlayer['price'] ?? 0),
                'competitionPoints' => (int)($knownPlayer['competitionPoints'] ?? 0),
                'media' => is_array($knownPlayer['media'] ?? null) ? $knownPlayer['media'] : [],
                'sourceLinks' => is_array($knownPlayer['sourceLinks'] ?? null) ? $knownPlayer['sourceLinks'] : [],
                'sourceSummary' => is_array($knownPlayer['sourceSummary'] ?? null) ? $knownPlayer['sourceSummary'] : [],
                'outOfCompetition' => true,
                'activeInCompetition' => false,
                'statusText' => 'Biwenger confirma que el jugador ya no figura en el catalogo de esta competicion'
            ];
        }
        $finance['balance'] = isset($userData['balance']) ? (int)$userData['balance'] : $finance['balance'];
        $finance['teamValue'] = array_sum(array_map(static function ($player) {
            return (int)($player['biwengerValue'] ?? $player['price'] ?? 0);
        }, $players));
        $offerMap = biwenger_offer_map((array)($userData['offers'] ?? []), $userId);
        $finance['activeBids'] = count(array_filter($offerMap, static function ($offer) {
            return !empty($offer['hasBid']);
        }));
        $finance['bidTotal'] = array_sum(array_column($offerMap, 'myBidAmount'));
        $activeLineup = biwenger_pick_active_lineup($userData);
        if ($activeLineup) {
            $lineupIds = array_map('intval', array_keys(biwenger_lineup_player_ids($userData)));
            $lineupPayload = [
                'type' => (string)($activeLineup['type'] ?? $activeLineup['formation'] ?? ''),
                'playersID' => array_values(array_filter($lineupIds, static fn($id) => $id > 0)),
                'captain' => biwenger_lineup_role_id($userData, 'captain'),
                'striker' => biwenger_lineup_role_id($userData, 'striker')
            ];
        }
    } else {
        $response = biwenger_private_get_json(
            'https://biwenger.as.com/api/v2/market',
            $session,
            $timeoutSeconds,
            $headers,
            $strictTls
        );
        $marketData = is_array($response['data'] ?? null) ? $response['data'] : [];
        $offerMap = [];
        try {
            $userOffersResponse = biwenger_private_get_json(
                'https://biwenger.as.com/api/v2/user?fields=*,market(*,-userID),offers',
                $session,
                $timeoutSeconds,
                $headers,
                $strictTls
            );
            $userOffersData = is_array($userOffersResponse['data'] ?? null) ? $userOffersResponse['data'] : $userOffersResponse;
            $outgoingOffers = [];
            biwenger_collect_offer_entries((array)($userOffersData['offers'] ?? $userOffersData), $outgoingOffers, 'outgoing');
            $offerMap = biwenger_offer_map($outgoingOffers, $userId);
        } catch (Throwable $error) {
            // The market remains usable even when outgoing offers are not exposed.
        }
        $players = [];
        foreach (biwenger_market_entries($marketData) as $sale) {
            if (!is_array($sale)) continue;
            $saleOwner = biwenger_sale_owner_payload($sale);
            if ((int)($saleOwner['id'] ?? 0) === $userId) continue;
            $entry = biwenger_sale_with_catalog($sale, $catalog);
            if (!$entry) continue;
            $playerId = (int)($entry['id'] ?? 0);
            $sale['bidInfo'] = $offerMap[$playerId] ?? [];
            $visibleBidDetail = biwenger_extract_sale_bid_count_detail($sale);
            $visibleBidCount = $visibleBidDetail['count'];
            if ($visibleBidCount !== null) {
                $sale['bidInfo']['rivalBidCount'] = max(0, $visibleBidCount - (!empty($sale['bidInfo']['hasBid']) ? 1 : 0));
                $sale['bidInfo']['bidCount'] = $visibleBidCount;
                $sale['bidInfo']['bidCountSource'] = $visibleBidDetail['source'];
                $sale['bidInfo']['rivalBidVisibility'] = 'count';
            }
            $players[] = biwenger_normalize_player($entry, $catalog, $competition, false, $sale);
        }
        $status = is_array($marketData['status'] ?? null) ? $marketData['status'] : [];
        $finance['balance'] = isset($status['balance']) ? (int)$status['balance'] : $finance['balance'];
        $finance['maximumBid'] = isset($status['maximumBid']) ? (int)$status['maximumBid'] : $finance['maximumBid'];
        $finance['activeBids'] = count(array_filter($offerMap, static function ($offer) {
            return !empty($offer['hasBid']);
        }));
        $finance['bidTotal'] = array_sum(array_column($offerMap, 'myBidAmount'));
    }

    return [
        'ok' => true,
        'kind' => $kind,
        'leagueName' => (string)($session['leagueName'] ?? ''),
        'competition' => $competition,
        'importedAt' => gmdate('c'),
        'finance' => $finance,
        'players' => array_values(array_filter($players)),
        'departedPlayers' => $kind === 'team' ? $departedPlayers : [],
        'lineup' => $kind === 'team' ? $lineupPayload : null
    ];
}

function biwenger_market_entries(array $market): array
{
    $entries = [];
    foreach (['sales' => 'sale', 'loans' => 'loan', 'auctions' => 'auction'] as $key => $type) {
        foreach ((array)($market[$key] ?? []) as $entry) {
            if (!is_array($entry)) continue;
            $entry['_marketType'] = $type;
            $entries[] = $entry;
        }
    }
    return $entries;
}

function biwenger_fetch_competition_catalog(string $competition, int $timeoutSeconds, array $headers, bool $strictTls, int $scoreId = 2): array
{
    $slug = biwenger_competition_slug($competition);
    $url = 'https://cf.biwenger.com/api/v2/competitions/' . rawurlencode($slug) . '/data?lang=es&score=' . max(1, $scoreId);
    $response = http_request('GET', $url, $timeoutSeconds, $headers, $strictTls);
    if ($response['status'] < 200 || $response['status'] >= 300) {
        throw new RuntimeException('No se pudo descargar el catalogo publico de jugadores de Biwenger');
    }
    $data = $response['json']['data'] ?? [];
    $playersById = [];
    foreach ((array)($data['players'] ?? []) as $player) {
        if (!is_array($player)) continue;
        $playerId = (int)($player['id'] ?? 0);
        if ($playerId > 0) {
            $playersById[$playerId] = $player;
        }
    }
    $teamsById = [];
    foreach ((array)($data['teams'] ?? []) as $team) {
        if (!is_array($team)) continue;
        $teamId = (int)($team['id'] ?? 0);
        if ($teamId > 0) {
            $teamsById[$teamId] = $team;
        }
    }
    return [
        'competition' => $slug,
        'playersById' => $playersById,
        'teamsById' => $teamsById
    ];
}

function biwenger_public_competition_slug(string $competition): string
{
    $normalized = normalize_text($competition);
    if ($normalized === '' || in_array($normalized, ['club', 'laliga', 'la liga', 'primera division'], true)) return 'la-liga';
    if (preg_match('/world|mundial|copa del mundo|selecciones/', $normalized)) return 'world-cup';
    return biwenger_competition_slug($competition);
}

function biwenger_public_catalog_payload(string $competition, int $scoreId, int $timeoutSeconds, array $headers, bool $strictTls, string $dbDir): array
{
    $slug = biwenger_public_competition_slug($competition);
    $cachePath = $dbDir . DIRECTORY_SEPARATOR . 'biwenger-catalog-' . slugify($slug) . '-score-' . $scoreId . '.json';
    $cached = read_json_file($cachePath, []);
    if (!empty($cached['fetchedAtTs']) && (int)$cached['fetchedAtTs'] > time() - 3600 && !empty($cached['players'])) {
        $cached['cacheStatus'] = 'hit';
        return $cached;
    }
    $catalog = biwenger_fetch_competition_catalog($slug, $timeoutSeconds, $headers, $strictTls, $scoreId);
    $players = [];
    foreach ($catalog['playersById'] as $entry) {
        if (!is_array($entry)) continue;
        $player = biwenger_normalize_player($entry, $catalog, $slug, false);
        $players[] = [
            'id' => $player['id'],
            'biwengerPlayerId' => $player['biwengerPlayerId'],
            'name' => $player['name'],
            'team' => $player['team'],
            'nationalTeam' => $player['nationalTeam'],
            'clubTeam' => $player['clubTeam'],
            'position' => $player['position'],
            'biwengerPosition' => $player['biwengerPosition'],
            'price' => $player['price'],
            'biwengerValue' => $player['biwengerValue'],
            'competitionPoints' => $player['competitionPoints'],
            'media' => $player['media'],
            'sourceLinks' => $player['sourceLinks'],
            'competitionScope' => $player['competitionScope']
        ];
    }
    usort($players, static fn($left, $right) => strcasecmp((string)($left['name'] ?? ''), (string)($right['name'] ?? '')));
    $result = [
        'ok' => true,
        'competition' => $slug,
        'players' => $players,
        'fetchedAtTs' => time(),
        'cacheStatus' => 'refresh',
        'source' => 'Biwenger catalogo publico'
    ];
    write_json_file($cachePath, $result);
    return $result;
}

function biwenger_watchlist_catalog(array $session, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $competition = (string)($session['competition'] ?? '');
    $catalog = biwenger_fetch_competition_catalog($competition, $timeoutSeconds, $headers, $strictTls, (int)($session['scoreId'] ?? 2));
    $marketById = [];
    $marketDataAvailable = false;
    try {
        $market = biwenger_import_players($session, 'market', $timeoutSeconds, $headers, $strictTls);
        $marketDataAvailable = true;
        foreach ((array)($market['players'] ?? []) as $player) {
            $playerId = (int)($player['biwengerPlayerId'] ?? 0);
            if ($playerId > 0) $marketById[$playerId] = $player;
        }
    } catch (Throwable $error) {
        // The searchable catalog remains useful if the private market is temporarily unavailable.
    }

    $clauses = [];
    $clauseDataAvailable = false;
    try {
        $clauseResponse = biwenger_private_get_json('https://biwenger.as.com/api/v2/owners/league/clause', $session, $timeoutSeconds, $headers, $strictTls);
        $clauseData = is_array($clauseResponse['data'] ?? null) ? $clauseResponse['data'] : $clauseResponse;
        biwenger_collect_clause_entries((array)$clauseData, $clauses);
        $clauseDataAvailable = true;
    } catch (Throwable $error) {
        try {
            $ownerResponse = biwenger_private_get_json('https://biwenger.as.com/api/v2/owners/league', $session, $timeoutSeconds, $headers, $strictTls);
            $ownerData = is_array($ownerResponse['data'] ?? null) ? $ownerResponse['data'] : $ownerResponse;
            biwenger_collect_clause_entries((array)$ownerData, $clauses);
            $clauseDataAvailable = true;
        } catch (Throwable $fallbackError) {
            // Some leagues disable or hide clauses.
        }
    }

    $players = [];
    foreach ($catalog['playersById'] as $playerId => $entry) {
        $normalized = biwenger_normalize_player((array)$entry, $catalog, $competition, false);
        $marketPlayer = $marketById[(int)$playerId] ?? null;
        if (is_array($marketPlayer)) {
            $normalized = array_merge($normalized, $marketPlayer);
        }
        $clause = isset($clauses[(int)$playerId]) ? (int)$clauses[(int)$playerId] : 0;
        $normalized['watchStatus'] = [
            'inMarket' => is_array($marketPlayer),
            'marketSellerType' => (string)($marketPlayer['marketSellerType'] ?? ''),
            'marketOwnerId' => (int)($marketPlayer['marketOwnerId'] ?? 0),
            'marketOwnerName' => (string)($marketPlayer['marketOwnerName'] ?? ''),
            'salePrice' => isset($marketPlayer['salePrice']) ? (int)$marketPlayer['salePrice'] : null,
            'clauseAvailable' => $clause > 0,
            'clause' => $clause > 0 ? $clause : null
        ];
        $players[] = $normalized;
    }
    usort($players, static fn($left, $right) => strcasecmp((string)($left['name'] ?? ''), (string)($right['name'] ?? '')));
    return [
        'ok' => true,
        'competition' => $competition,
        'updatedAt' => gmdate('c'),
        'marketDataAvailable' => $marketDataAvailable,
        'clauseDataAvailable' => $clauseDataAvailable,
        'players' => $players
    ];
}

function biwenger_competition_slug(string $competition): string
{
    $value = trim($competition);
    if ($value !== '') return $value;
    return 'la-liga';
}

function biwenger_auth_headers(string $token, int $leagueId, int $userId, string $version, array $headers, bool $includeLeagueHeaders = true): array
{
    $merged = $headers;
    $merged[] = 'Authorization: Bearer ' . $token;
    $merged[] = 'x-lang: es';
    if ($includeLeagueHeaders) {
        if ($leagueId > 0) $merged[] = 'x-league: ' . $leagueId;
        if ($userId > 0) $merged[] = 'x-user: ' . $userId;
    }
    if ($version !== '') $merged[] = 'x-version: ' . $version;
    return $merged;
}

function biwenger_private_get_json(string $url, array $session, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    return biwenger_private_request_json('GET', $url, $session, $timeoutSeconds, $headers, $strictTls);
}

function biwenger_private_request_json(string $method, string $url, array $session, int $timeoutSeconds, array $headers, bool $strictTls, ?array $payload = null): array
{
    global $biwengerRateLimitPath;
    $rateLimit = read_json_file($biwengerRateLimitPath, []);
    $blockedUntil = (int)($rateLimit['blockedUntil'] ?? 0);
    if ($blockedUntil > time()) {
        throw new RuntimeException('Biwenger esta limitando temporalmente las consultas (HTTP 429). Espera ' . max(1, $blockedUntil - time()) . ' segundos antes de actualizar de nuevo.');
    }
    $leagueId = (int)($session['leagueId'] ?? 0);
    $userId = (int)($session['userId'] ?? 0);
    $token = (string)($session['token'] ?? '');
    $version = (string)($session['xVersion'] ?? '');
    $variants = [$version];
    if ($version !== '') $variants[] = 'v' . $version;
    $variants[] = '';
    $variants = array_values(array_unique($variants));
    $lastStatus = 0;
    $lastMessage = '';
    $readAttempts = strtoupper($method) === 'GET' ? 2 : 1;
    for ($attempt = 0; $attempt < $readAttempts; $attempt++) {
        foreach ($variants as $candidateVersion) {
            $response = http_request(
                $method,
                $url,
                $timeoutSeconds,
                biwenger_auth_headers($token, $leagueId, $userId, $candidateVersion, $headers),
                $strictTls,
                $payload === null ? null : json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            );
            if ($response['status'] >= 200 && $response['status'] < 300 && is_array($response['json'])) {
                return $response['json'];
            }
            $lastStatus = (int)$response['status'];
            $lastMessage = (string)($response['json']['error'] ?? $response['json']['message'] ?? '');
            if ($lastStatus === 429) {
                write_json_file($biwengerRateLimitPath, ['blockedUntil' => time() + 12, 'updatedAt' => gmdate('c')]);
                break;
            }
            if ($lastStatus === 404 && preg_match('/entity not found|entidad no encontrada/i', $lastMessage)) break;
        }
        if ($lastStatus === 429) break;
        if ($lastStatus === 404 && preg_match('/entity not found|entidad no encontrada/i', $lastMessage)) break;
        if ($attempt + 1 < $readAttempts && in_array($lastStatus, [404, 502, 503, 504], true)) {
            usleep(220000);
            continue;
        }
        break;
    }
    throw new RuntimeException('Biwenger no ha aceptado la peticion privada'
        . ($lastStatus > 0 ? ' (HTTP ' . $lastStatus . ')' : '')
        . ($lastMessage !== '' ? ': ' . $lastMessage : ''));
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function read_json_file(string $path, array $fallback): array
{
    if (!is_file($path)) {
        return $fallback;
    }
    $raw = @file_get_contents($path);
    if ($raw === false) {
        return $fallback;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function write_json_file(string $path, array $payload): void
{
    ensure_directory(dirname($path));
    file_put_contents($path, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

function ensure_directory(string $path): void
{
    if (!is_dir($path)) {
        mkdir($path, 0775, true);
    }
}

function env_bool(string $key, bool $default): bool
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }
    return in_array(strtolower((string)$value), ['1', 'true', 'yes', 'on'], true);
}

function api_base_url(): string
{
    $forced = rtrim((string)getenv('FMS_PUBLIC_ORIGIN'), '/');
    if ($forced !== '') {
        return $forced;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php')), '/');
    return $scheme . '://' . $host . ($scriptDir === '' ? '' : $scriptDir);
}

function source_status_payload(array $playerDb, int $playerCacheMs, int $criteriaVersion): array
{
    $now = (int)round(microtime(true) * 1000);
    $players = $playerDb['players'] ?? [];
    $fresh = 0;
    foreach ($players as $entry) {
        if (!is_array($entry)) {
            continue;
        }
        $fetchedAt = isset($entry['fetchedAt']) ? strtotime((string)$entry['fetchedAt']) : false;
        $entryVersion = (int)($entry['data']['criteriaVersion'] ?? 0);
        if ($fetchedAt && (($now - ($fetchedAt * 1000)) < $playerCacheMs) && $entryVersion === $criteriaVersion) {
            $fresh += 1;
        }
    }
    return [
        'totalPlayers' => count($players),
        'freshPlayers' => $fresh,
        'ttlHours' => (int)round($playerCacheMs / 3600000),
        'apiFootball' => api_football_status_payload()
    ];
}

function api_football_key(): string
{
    global $apiSportsKeyPath;
    $envKey = trim((string)getenv('FMS_APISPORTS_KEY'));
    if ($envKey !== '') return $envKey;
    if (is_file($apiSportsKeyPath)) {
        $fileKey = trim((string)@file_get_contents($apiSportsKeyPath));
        if ($fileKey !== '') return $fileKey;
    }
    return '';
}

function api_football_status_payload(): array
{
    $key = api_football_key();
    return [
        'configured' => $key !== '',
        'provider' => 'api-football',
        'baseUrl' => 'https://v3.football.api-sports.io'
    ];
}

function sofascore_diagnostic_payload(string $path): array
{
    $saved = read_json_file($path, []);
    $checkedAt = (string)($saved['checkedAt'] ?? '');
    $blocked = !empty($saved['blocked']) && $checkedAt !== '' && strtotime($checkedAt) >= (time() - 21600);
    return [
        'available' => !$blocked,
        'blocked' => $blocked,
        'reason' => $blocked ? 'Varnish challenge 403' : ($saved['reason'] ?? 'Sin bloqueo reciente detectado'),
        'checkedAt' => $checkedAt !== '' ? $checkedAt : null,
        'fallback' => 'Biwenger + FutbolFantasy + API-Football + SoccerWiki/Transfermarkt'
    ];
}

function sofascore_is_blocked(): bool
{
    global $sofaDiagnosticsPath;
    return !empty(sofascore_diagnostic_payload($sofaDiagnosticsPath)['blocked']);
}

function mark_sofascore_blocked(string $reason): void
{
    global $sofaDiagnosticsPath;
    write_json_file($sofaDiagnosticsPath, [
        'blocked' => true,
        'reason' => $reason,
        'checkedAt' => gmdate('c')
    ]);
}

function ensure_default_league(array &$leaguesDb, string $path): void
{
    if (!empty($leaguesDb['leagues'])) {
        return;
    }
    $now = gmdate('c');
    $id = create_league_id();
    $leaguesDb['leagues'][$id] = [
        'id' => $id,
        'name' => 'Mi liga',
        'createdAt' => $now,
        'updatedAt' => $now,
        'competition' => 'club',
        'fantasyProvider' => 'local',
        'scoring' => 'mixed',
        'marketPlayers' => [],
        'teamPlayers' => [],
        'finance' => sanitize_finance_payload([]),
        'weights' => sanitize_weights_payload([]),
        'filters' => sanitize_filters_payload([]),
        'preferences' => sanitize_preferences_payload([])
    ];
    $leaguesDb['activeLeagueId'] = $id;
    write_json_file($path, $leaguesDb);
}

function create_league_id(): string
{
    return 'league-' . base_convert((string)time(), 10, 36) . '-' . substr(md5((string)microtime(true) . mt_rand()), 0, 6);
}

function league_list_payload(array $leaguesDb): array
{
    $leagues = array_values($leaguesDb['leagues'] ?? []);
    usort($leagues, static function ($left, $right) {
        return strcasecmp((string)($left['name'] ?? ''), (string)($right['name'] ?? ''));
    });
    return [
        'activeLeagueId' => $leaguesDb['activeLeagueId'] ?? null,
        'leagues' => $leagues
    ];
}

function sanitize_scoring($value): string
{
    $allowed = ['mixed', 'as', 'sofascore', 'stats'];
    return in_array((string)$value, $allowed, true) ? (string)$value : 'mixed';
}

function sanitize_fantasy_provider($value): string
{
    $provider = strtolower(trim((string)$value));
    return in_array($provider, ['biwenger', 'laliga', 'mister', 'local'], true) ? $provider : 'local';
}

function sanitize_editable_lineup($value): ?array
{
    if (!is_array($value)) return null;
    $allowedFormations = ['4-3-3', '4-4-2', '3-5-2', '3-4-3', '5-3-2', '5-4-1'];
    $formationName = (string)($value['formationName'] ?? '');
    if (!in_array($formationName, $allowedFormations, true)) return null;
    $playerIds = array_values(array_unique(array_filter(array_map(static function ($id) {
        $value = trim((string)$id);
        return $value !== '' ? $value : null;
    }, array_slice((array)($value['playerIds'] ?? []), 0, 11)))));
    $captainId = trim((string)($value['captainId'] ?? ''));
    $strikerId = trim((string)($value['strikerId'] ?? ''));
    return [
        'formationName' => $formationName,
        'playerIds' => $playerIds,
        'captainId' => in_array($captainId, $playerIds, true) ? $captainId : null,
        'strikerId' => in_array($strikerId, $playerIds, true) ? $strikerId : null
    ];
}

function sanitize_league_payload(array $payload): array
{
    $sanitizePlayers = static function ($players): array {
        $allowed = [
            'id', 'name', 'team', 'clubTeam', 'baseTeam', 'nationalTeam', 'position', 'biwengerPosition', 'price',
            'starter', 'form', 'asScore', 'sofascore', 'stats', 'valueTrend', 'risk',
            'riskReasons', 'sourceStatus', 'dataConfidence', 'sources', 'note',
            'statusText', 'outOfCompetition', 'activeInCompetition',
            'competitionScope', 'health', 'sourceLinks', 'sourceSummary', 'media',
            'referenceValue', 'competitionProfiles', 'contextLabel', 'criteriaVersion',
            'biwengerValue', 'biwengerDiff', 'label', 'recommendation', 'maxBid', 'systemScore',
            'squadFitScore', 'overBudget', 'salePrice', 'bidAmount', 'bidCount', 'bidStatus',
            'hasBid', 'biwengerPlayerId', 'marketOwnerId', 'marketOwnerName', 'marketSellerType', 'marketSellerLabel',
            'myBidAmount', 'myBidStatus', 'offerId', 'rivalBids',
            'rivalBidCount', 'highestRivalBid', 'rivalBidVisibility', 'bidCountSource', 'competitionPoints'
        ];
        $result = [];
        if (!is_array($players)) {
            return $result;
        }
        foreach (array_slice($players, 0, 80) as $player) {
            if (!is_array($player)) {
                continue;
            }
            $copy = [];
            foreach ($allowed as $key) {
                if (array_key_exists($key, $player)) {
                    $copy[$key] = $player[$key];
                }
            }
            $result[] = $copy;
        }
        return $result;
    };

    return [
        'competition' => ($payload['competition'] ?? '') === 'worldcup' ? 'worldcup' : 'club',
        'fantasyProvider' => sanitize_fantasy_provider($payload['fantasyProvider'] ?? 'local'),
        'scoring' => sanitize_scoring($payload['scoring'] ?? 'mixed'),
        'marketPlayers' => $sanitizePlayers($payload['marketPlayers'] ?? []),
        'teamPlayers' => $sanitizePlayers($payload['teamPlayers'] ?? []),
        'teamDepartures' => $sanitizePlayers($payload['teamDepartures'] ?? []),
        'finance' => sanitize_finance_payload($payload['finance'] ?? []),
        'weights' => sanitize_weights_payload($payload['weights'] ?? []),
        'filters' => sanitize_filters_payload($payload['filters'] ?? []),
        'preferences' => sanitize_preferences_payload($payload['preferences'] ?? []),
        'icon' => sanitize_media_url($payload['icon'] ?? null),
        'cover' => sanitize_media_url($payload['cover'] ?? null),
        'biwengerLeagueId' => isset($payload['biwengerLeagueId']) ? (int)$payload['biwengerLeagueId'] : null,
        'editableLineup' => sanitize_editable_lineup($payload['editableLineup'] ?? null),
        'favorites' => $sanitizePlayers(array_slice((array)($payload['favorites'] ?? []), 0, 100))
    ];
}

function sanitize_media_url($value): ?string
{
    return is_string($value) ? biwenger_normalize_media_url($value) : null;
}

function sanitize_weights_payload($weights): array
{
    $weights = is_array($weights) ? $weights : [];
    $defaults = ['starter' => 35, 'system' => 25, 'price' => 20, 'form' => 15, 'fit' => 15];
    foreach ($defaults as $key => $default) {
        $value = isset($weights[$key]) ? (int)$weights[$key] : $default;
        $defaults[$key] = max(0, min(60, $value));
    }
    return $defaults;
}

function sanitize_filters_payload($filters): array
{
    $filters = is_array($filters) ? $filters : [];
    $position = (string)($filters['position'] ?? 'all');
    if (!in_array($position, ['all', 'POR', 'DF', 'MC', 'DL', 'ENT'], true)) $position = 'all';
    $budget = isset($filters['budget']) && is_numeric($filters['budget']) && (int)$filters['budget'] > 0
        ? (int)$filters['budget']
        : null;
    return ['position' => $position, 'budget' => $budget];
}

function sanitize_preferences_payload($preferences): array
{
    $preferences = is_array($preferences) ? $preferences : [];
    $rewards = isset($preferences['rewards']) && is_array($preferences['rewards']) ? $preferences['rewards'] : [];
    $money = static function ($value): int {
        if (!is_numeric($value)) return 0;
        return max(0, (int)round((float)$value));
    };
    return [
        'strictBudget' => !array_key_exists('strictBudget', $preferences) || !empty($preferences['strictBudget']),
        'riskAverse' => !empty($preferences['riskAverse']),
        'investmentMode' => !empty($preferences['investmentMode']),
        'startupSync' => !array_key_exists('startupSync', $preferences) || !empty($preferences['startupSync']),
        'autoSync' => !array_key_exists('autoSync', $preferences) || !empty($preferences['autoSync']),
        'notifications' => !empty($preferences['notifications']),
        'planMode' => in_array((string)($preferences['planMode'] ?? 'balanced'), ['conservative', 'balanced', 'aggressive'], true)
            ? (string)$preferences['planMode']
            : 'balanced',
        'rewards' => [
            'pointValue' => $money($rewards['pointValue'] ?? 0),
            'fixed' => $money($rewards['fixed'] ?? 0),
            'goal' => $money($rewards['goal'] ?? 0),
            'idealLineup' => $money($rewards['idealLineup'] ?? 0),
            'gameMvp' => $money($rewards['gameMvp'] ?? 0),
            'roundRank1' => $money($rewards['roundRank1'] ?? $rewards['rank1'] ?? 0),
            'roundRank2' => $money($rewards['roundRank2'] ?? $rewards['rank2'] ?? 0),
            'roundRank3' => $money($rewards['roundRank3'] ?? $rewards['rank3'] ?? 0),
            'leagueRank1' => $money($rewards['leagueRank1'] ?? 0),
            'leagueRank2' => $money($rewards['leagueRank2'] ?? 0),
            'leagueRank3' => $money($rewards['leagueRank3'] ?? 0)
        ]
    ];
}

function sanitize_finance_payload($finance): array
{
    $finance = is_array($finance) ? $finance : [];
    return [
        'balance' => isset($finance['balance']) ? (int)$finance['balance'] : null,
        'teamValue' => isset($finance['teamValue']) ? (int)$finance['teamValue'] : null,
        'maximumBid' => isset($finance['maximumBid']) ? (int)$finance['maximumBid'] : null,
        'activeBids' => isset($finance['activeBids']) ? (int)$finance['activeBids'] : 0,
        'bidTotal' => isset($finance['bidTotal']) ? (int)$finance['bidTotal'] : 0,
        'updatedAt' => (string)($finance['updatedAt'] ?? '')
    ];
}

function fantasy_summary_has_useful_signals(array $player): bool
{
    $fantasy = $player['sourceSummary']['fantasy'] ?? null;
    if (!is_array($fantasy)) return false;
    foreach (['nextStarterProbability', 'seasonStartRate', 'teamLineupProbability', 'seasonMinutesRate', 'lastThreeMinutes'] as $key) {
        if (array_key_exists($key, $fantasy) && $fantasy[$key] !== null && $fantasy[$key] !== '' && is_numeric($fantasy[$key])) {
            return true;
        }
    }
    foreach ((array)($fantasy['points'] ?? []) as $value) {
        if ($value !== null && $value !== '' && is_numeric($value)) return true;
    }
    return !empty($fantasy['usedForStarter']) || !empty($fantasy['calledUp']);
}

function enrich_player_with_cache(
    array $player,
    string $competition,
    bool $forceRefresh,
    array &$playerDb,
    int $playerCacheMs,
    int $criteriaVersion,
    int $timeoutSeconds,
    array $headers,
    bool $strictTls,
    string $assetsDir,
    array $teamSlugOverrides,
    array $searchOverrides,
    array $nationalTeamAlpha2
): array {
    $cacheKey = cache_key_for_player($player, $competition, $searchOverrides);
    $existingCacheEntry = isset($playerDb['players'][$cacheKey]) && is_array($playerDb['players'][$cacheKey])
        ? $playerDb['players'][$cacheKey]
        : null;
    $identityKey = $competition . ':' . slugify((string)($player['name'] ?? '')) . ':' . map_position((string)($player['position'] ?? ''));
    $lockedIdentity = $playerDb['identities'][$identityKey] ?? null;
    if (is_array($lockedIdentity) && (int)($lockedIdentity['score'] ?? 0) >= 105) {
        $player['name'] = $lockedIdentity['name'] ?? ($player['name'] ?? null);
        $player['position'] = $lockedIdentity['position'] ?? ($player['position'] ?? null);
        $player['clubTeam'] = $lockedIdentity['clubTeam'] ?? ($player['clubTeam'] ?? null);
        $player['nationalTeam'] = $lockedIdentity['nationalTeam'] ?? ($player['nationalTeam'] ?? null);
        $player['team'] = $competition === 'worldcup'
            ? ($lockedIdentity['nationalTeam'] ?? ($player['team'] ?? null))
            : ($lockedIdentity['clubTeam'] ?? ($player['team'] ?? null));
    }
    if (!$forceRefresh && $existingCacheEntry) {
      $entry = $existingCacheEntry;
      $fetchedAt = isset($entry['fetchedAt']) ? strtotime((string)$entry['fetchedAt']) : false;
      $entryVersion = (int)($entry['data']['criteriaVersion'] ?? 0);
      if ($fetchedAt && ((time() - $fetchedAt) * 1000) < $playerCacheMs && $entryVersion === $criteriaVersion) {
          $entry['data']['cacheStatus'] = 'hit';
          return $entry['data'];
      }
    }

    $enriched = enrich_player(
        $player,
        $competition,
        $criteriaVersion,
        $timeoutSeconds,
        $headers,
        $strictTls,
        $assetsDir,
        $teamSlugOverrides,
        $searchOverrides,
        $nationalTeamAlpha2
    );
    if (
        $forceRefresh
        && is_array($existingCacheEntry)
        && isset($existingCacheEntry['data'])
        && is_array($existingCacheEntry['data'])
        && ($existingCacheEntry['data']['sourceStatus'] ?? '') === 'live'
        && fantasy_summary_has_useful_signals($existingCacheEntry['data'])
        && !fantasy_summary_has_useful_signals($enriched)
    ) {
        $preserved = $existingCacheEntry['data'];
        $preserved['cacheStatus'] = 'kept-richer-cache';
        $preserved['fetchedAt'] = gmdate('c');
        $preserved['riskReasons'] = array_values(array_unique(array_merge(
            (array)($preserved['riskReasons'] ?? []),
            ['Se conserva cache previa con FutbolFantasy porque el refresco no devolvio FF util']
        )));
        $playerDb['players'][$cacheKey] = [
            'fetchedAt' => $preserved['fetchedAt'],
            'data' => $preserved
        ];
        return $preserved;
    }
    $enriched['cacheStatus'] = $forceRefresh ? 'refresh' : 'miss';
    $enriched['fetchedAt'] = gmdate('c');
    if (($enriched['sourceStatus'] ?? '') === 'live') {
        $playerDb['players'][$cacheKey] = [
            'fetchedAt' => $enriched['fetchedAt'],
            'data' => $enriched
        ];
        $identity = $enriched['sourceSummary']['identity'] ?? null;
        if (is_array($identity) && (int)($identity['score'] ?? 0) >= 105) {
            $playerDb['identities'][$identityKey] = [
                'name' => $enriched['name'] ?? ($player['name'] ?? null),
                'position' => $enriched['position'] ?? ($player['position'] ?? null),
                'clubTeam' => $enriched['clubTeam'] ?? null,
                'nationalTeam' => $enriched['nationalTeam'] ?? null,
                'provider' => $identity['provider'] ?? null,
                'providerId' => $identity['providerId'] ?? null,
                'confirmedBy' => $identity['confirmedBy'] ?? [],
                'score' => $identity['score'],
                'updatedAt' => gmdate('c')
            ];
        }
    }
    return $enriched;
}

function cache_key_for_player(array $player, string $competition, array $searchOverrides): string
{
    $normalized = normalize_text((string)($player['name'] ?? ''));
    $name = $searchOverrides[$normalized] ?? ($player['name'] ?? '');
    return $competition . ':' . slugify((string)$name) . ':' . map_position((string)($player['position'] ?? ''));
}

function normalize_text(string $text): string
{
    $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
    if ($converted !== false) {
        $text = $converted;
    }
    $text = strtolower($text);
    $text = str_replace('&amp;', 'and', $text);
    $text = preg_replace('/[^a-z0-9\s-]/', ' ', $text) ?? $text;
    $text = preg_replace('/\s+/', ' ', $text) ?? $text;
    return trim($text);
}

function slugify(string $text): string
{
    $text = normalize_text($text);
    $text = str_replace('and', '', $text);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text) ?? $text;
    return trim($text, '-');
}

function selection_alpha2(string $teamName, array $alpha2Map): ?string
{
    $key = normalize_text($teamName);
    return $alpha2Map[$key] ?? null;
}

function clamp(float $value, float $min = 0, float $max = 100): float
{
    return max($min, min($max, $value));
}

function parse_number($value): ?float
{
    if ($value === null || $value === '') {
        return null;
    }
    $value = str_replace(',', '.', (string)$value);
    $value = preg_replace('/[^0-9.\-]/', '', $value) ?? '';
    return is_numeric($value) ? (float)$value : null;
}

function biwenger_money_int($value): int
{
    if (is_int($value) || is_float($value)) return max(0, (int)round($value));
    $raw = strtolower(trim((string)$value));
    if ($raw === '') return 0;
    $multiplier = preg_match('/\b(m|mill(?:on|ones)?)\b/u', $raw)
        ? 1000000
        : (preg_match('/\b(k|mil)\b/u', $raw) ? 1000 : 1);
    if ($multiplier > 1) {
        $number = preg_replace('/[^0-9,.\-]/', '', $raw) ?? '';
        $number = preg_replace('/\.(?=\d{3}(?:\D|$))/', '', $number) ?? $number;
        $number = str_replace(',', '.', $number);
        return is_numeric($number) ? max(0, (int)round((float)$number * $multiplier)) : 0;
    }
    $digits = preg_replace('/[^0-9\-]/', '', $raw) ?? '';
    return is_numeric($digits) ? max(0, (int)$digits) : 0;
}

function biwenger_sale_price(array $sale): int
{
    foreach (['price', 'salePrice', 'ownerPrice', 'askingPrice', 'listingPrice'] as $key) {
        if (!array_key_exists($key, $sale)) continue;
        $price = biwenger_money_int($sale[$key]);
        if ($price > 0) return $price;
    }
    return 0;
}

function biwenger_sale_price_source(array $sale): string
{
    foreach (['price', 'salePrice', 'ownerPrice', 'askingPrice', 'listingPrice'] as $key) {
        if (array_key_exists($key, $sale) && biwenger_money_int($sale[$key]) > 0) return $key;
    }
    return 'unknown';
}

function average(array $values): ?float
{
    $clean = array_values(array_filter($values, static function ($value) {
        return is_numeric($value);
    }));
    if (!$clean) {
        return null;
    }
    return array_sum($clean) / count($clean);
}

function strip_html_text(string $html): string
{
    $html = preg_replace('/<script[\s\S]*?<\/script>/i', ' ', $html) ?? $html;
    $html = preg_replace('/<style[\s\S]*?<\/style>/i', ' ', $html) ?? $html;
    $html = strip_tags($html);
    $html = str_replace(['&nbsp;', '&amp;'], [' ', '&'], $html);
    $html = preg_replace('/\s+/', ' ', $html) ?? $html;
    return trim($html);
}

function map_position(string $value): string
{
    $value = strtoupper(trim($value));
    if ($value === 'G' || $value === 'POR') return 'POR';
    if ($value === 'D' || $value === 'DF') return 'DF';
    if ($value === 'M' || $value === 'MC') return 'MC';
    if ($value === 'F' || $value === 'DL') return 'DL';
    if ($value === 'C' || $value === 'COACH' || $value === 'ENT' || $value === 'ENTRENADOR') return 'ENT';
    return 'MC';
}

function position_matches(string $requested, string $candidate): int
{
    $left = map_position($requested);
    $right = map_position($candidate);
    if ($left === $right) return 1;
    if (($left === 'DL' && $right === 'MC') || ($left === 'MC' && $right === 'DL')) return 0;
    return -1;
}

function meaningful_team_name(string $team): bool
{
    $team = normalize_text($team);
    return $team !== ''
        && $team !== 'sin seleccion'
        && $team !== 'sin equipo'
        && $team !== 'seleccion por identificar';
}

function external_position(string $value): string
{
    $value = strtoupper(trim($value));
    if (preg_match('/\b(GK|GOALKEEPER|KEEPER|PORTERO)\b/', $value)) return 'POR';
    if (preg_match('/\b(DEF|DEFENDER|DEFENCE|D)\b/', $value)) return 'DF';
    if (preg_match('/\b(MID|MIDFIELD|MIDFIELDER|DM|AM|M)\b/', $value)) return 'MC';
    if (preg_match('/\b(FORWARD|STRIKER|ATTACK|ATTACKER|FW|F)\b/', $value)) return 'DL';
    if (preg_match('/\b(COACH|MANAGER|ENTRENADOR|ENT)\b/', $value)) return 'ENT';
    return map_position($value);
}

function identity_candidate_score(array $candidate, array $originalPlayer, string $competition): int
{
    $query = normalize_text((string)($originalPlayer['name'] ?? ''));
    $name = normalize_text((string)($candidate['name'] ?? ''));
    if ($query === '' || $name === '') return -100;

    $score = 0;
    if ($name === $query) {
        $score += 90;
    } elseif (strpos($name, $query) !== false || strpos($query, $name) !== false) {
        $score += 52;
    }
    $queryTokens = array_values(array_filter(explode(' ', $query)));
    $nameTokens = array_values(array_filter(explode(' ', $name)));
    $score += count(array_intersect($queryTokens, $nameTokens)) * 18;

    $requestedPosition = map_position((string)($originalPlayer['position'] ?? ''));
    $candidatePosition = external_position((string)($candidate['position'] ?? ''));
    if ($requestedPosition === $candidatePosition) {
        $score += 42;
    } elseif (position_matches($requestedPosition, $candidatePosition) === -1) {
        $score -= 110;
    } else {
        $score -= 18;
    }

    $requestedTeam = normalize_text((string)($originalPlayer['nationalTeam'] ?? ($originalPlayer['team'] ?? '')));
    $candidateContext = normalize_text(
        (string)($competition === 'worldcup'
            ? ($candidate['nationalTeam'] ?? '')
            : ($candidate['clubTeam'] ?? ''))
    );
    if (meaningful_team_name($requestedTeam) && $candidateContext !== '') {
        if (strpos($candidateContext, $requestedTeam) !== false || strpos($requestedTeam, $candidateContext) !== false) {
            $score += 55;
        } else {
            $score -= $competition === 'worldcup' ? 75 : 28;
        }
    }

    if (!empty($candidate['imageUrl']) && strpos((string)$candidate['imageUrl'], 'missing_player') === false && strpos((string)$candidate['imageUrl'], 'default.jpg') === false) {
        $score += 4;
    }
    return $score;
}

function absolute_source_url(string $url, string $base): string
{
    if ($url === '') return '';
    if (preg_match('#^https?://#i', $url)) return $url;
    return rtrim($base, '/') . '/' . ltrim($url, '/');
}

function parse_soccerwiki_profile(string $html, string $profileUrl): ?array
{
    preg_match('/<h1[^>]*>\s*([^<]+)\s*<\/h1>/i', $html, $heading);
    preg_match('/Full Name:<\/span>\s*([^<]+)/i', $html, $fullName);
    preg_match('/Position:<\/span>\s*<span[^>]*title="([^"]+)"/i', $html, $position);
    preg_match('/Nation:<\/span>[\s\S]{0,500}?countryId=([^"&]+)[^>]*>[\s\S]{0,300}?class="text-underline[^"]*"[^>]*>([^<]+)<\/a>/i', $html, $nation);
    preg_match('/Club:<\/span>\s*<a[^>]*>([^<]+)<\/a>/i', $html, $club);
    preg_match('/class="player-img[\s\S]{0,500}?data-src="([^"]+)"/i', $html, $image);
    preg_match('/player\.php\?pid=(\d+)/i', $profileUrl, $id);

    $name = trim(strip_html_text($heading[1] ?? ($fullName[1] ?? '')));
    if ($name === '') return null;
    return [
        'provider' => 'SoccerWiki',
        'providerId' => $id[1] ?? null,
        'name' => $name,
        'fullName' => trim(strip_html_text($fullName[1] ?? $name)),
        'position' => external_position((string)($position[1] ?? '')),
        'nationalTeam' => trim(strip_html_text($nation[2] ?? '')),
        'countryCode' => strtolower((string)($nation[1] ?? '')),
        'clubTeam' => trim(strip_html_text($club[1] ?? '')),
        'imageUrl' => absolute_source_url((string)($image[1] ?? ''), 'https://en.soccerwiki.org'),
        'profileUrl' => $profileUrl
    ];
}

function find_soccerwiki_identity(array $player, string $competition, int $timeoutSeconds, array $headers, bool $strictTls): ?array
{
    $query = trim((string)($player['name'] ?? ''));
    if ($query === '') return null;
    $searchUrl = 'https://en.soccerwiki.org/search.php?q=' . rawurlencode($query);
    $html = http_get_text($searchUrl, $timeoutSeconds, $headers, $strictTls);
    preg_match_all('/<tr[^>]*>[\s\S]*?<\/tr>/i', $html, $rows);
    $profileUrls = [];
    foreach ($rows[0] ?? [] as $row) {
        if (!preg_match('/href="\/player\.php\?pid=(\d+)"[^>]*>([^<]+)<\/a>/i', $row, $playerLink)) continue;
        $rowName = trim(strip_html_text($playerLink[2]));
        $nameScore = identity_candidate_score([
            'name' => $rowName,
            'position' => preg_match('/title="([^"]+)"[^>]*>[^<]*(?:Gk|D|M|AM|DM|F)/i', $row, $rowPosition) ? $rowPosition[1] : ''
        ], $player, $competition);
        if ($nameScore < 20) continue;
        $profileUrls[] = 'https://en.soccerwiki.org/player.php?pid=' . $playerLink[1];
        if (count($profileUrls) >= 4) break;
    }

    $candidates = [];
    foreach (array_unique($profileUrls) as $profileUrl) {
        try {
            $candidate = parse_soccerwiki_profile(http_get_text($profileUrl, $timeoutSeconds, $headers, $strictTls), $profileUrl);
            if (!$candidate) continue;
            $candidate['identityScore'] = identity_candidate_score($candidate, $player, $competition);
            $candidates[] = $candidate;
        } catch (Throwable $error) {
            continue;
        }
    }
    usort($candidates, static function ($left, $right) {
        return (int)($right['identityScore'] ?? 0) <=> (int)($left['identityScore'] ?? 0);
    });
    $best = $candidates[0] ?? null;
    return $best && (int)($best['identityScore'] ?? 0) >= 105 ? $best : null;
}

function find_transfermarkt_identity(array $player, string $competition, int $timeoutSeconds, array $headers, bool $strictTls): ?array
{
    $query = trim((string)($player['name'] ?? ''));
    if ($query === '') return null;
    $url = 'https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=' . rawurlencode($query);
    $html = http_get_text($url, $timeoutSeconds, $headers, $strictTls);
    $rows = preg_split('/<tr class="(?:odd|even)">/i', $html) ?: [];
    $candidates = [];
    foreach (array_slice($rows, 1) as $row) {
        if (!preg_match('/href="([^"]*\/profil\/spieler\/(\d+))"[^>]*>([^<]+)<\/a>/i', $row, $profile)) continue;
        preg_match('/<td class="zentriert">\s*([^<]+)\s*<\/td>/i', $row, $position);
        preg_match('/<tr><td><a title="([^"]+)"[^>]*>[\s\S]*?tiny_wappen/i', $row, $club);
        preg_match('/(?:title|alt)="([^"]+)"[^>]*class="flaggenrahmen"/i', $row, $nation);
        preg_match('/<img src="([^"]+)"[^>]*title="' . preg_quote(trim(strip_html_text($profile[3])), '/') . '"/i', $row, $image);
        $candidate = [
            'provider' => 'Transfermarkt',
            'providerId' => $profile[2],
            'name' => trim(strip_html_text($profile[3])),
            'position' => external_position((string)($position[1] ?? '')),
            'nationalTeam' => trim(strip_html_text($nation[1] ?? '')),
            'clubTeam' => trim(strip_html_text($club[1] ?? '')),
            'imageUrl' => (string)($image[1] ?? ''),
            'profileUrl' => absolute_source_url($profile[1], 'https://www.transfermarkt.com')
        ];
        $candidate['identityScore'] = identity_candidate_score($candidate, $player, $competition);
        $candidates[] = $candidate;
    }
    usort($candidates, static function ($left, $right) {
        return (int)($right['identityScore'] ?? 0) <=> (int)($left['identityScore'] ?? 0);
    });
    $best = $candidates[0] ?? null;
    return $best && (int)($best['identityScore'] ?? 0) >= 105 ? $best : null;
}

function resolve_canonical_identity(array $player, string $competition, int $timeoutSeconds, array $headers, bool $strictTls): ?array
{
    $candidates = [];
    try {
        $soccerWiki = find_soccerwiki_identity($player, $competition, $timeoutSeconds, $headers, $strictTls);
        if ($soccerWiki) {
            $candidates[] = $soccerWiki;
            $hasUsefulImage = !empty($soccerWiki['imageUrl'])
                && strpos((string)$soccerWiki['imageUrl'], 'missing_player') === false;
            if ((int)($soccerWiki['identityScore'] ?? 0) >= 160 && $hasUsefulImage) {
                $soccerWiki['confirmedBy'] = ['SoccerWiki'];
                $soccerWiki['providerUrls'] = ['SoccerWiki' => $soccerWiki['profileUrl'] ?? null];
                return $soccerWiki;
            }
        }
    } catch (Throwable $error) {
        // Continue with the next identity provider.
    }
    try {
        $transfermarkt = find_transfermarkt_identity($player, $competition, $timeoutSeconds, $headers, $strictTls);
        if ($transfermarkt) $candidates[] = $transfermarkt;
    } catch (Throwable $error) {
        // Identity resolution remains usable if one provider is unavailable.
    }
    if (!$candidates) return null;

    $providerUrls = [];
    foreach ($candidates as $candidate) {
        if (!empty($candidate['provider']) && !empty($candidate['profileUrl'])) {
            $providerUrls[$candidate['provider']] = $candidate['profileUrl'];
        }
    }
    foreach ($candidates as &$candidate) {
        $candidate['confirmedBy'] = [$candidate['provider']];
        $candidate['providerUrls'] = $providerUrls;
        foreach ($candidates as $other) {
            if ($candidate['provider'] === $other['provider']) continue;
            $sameName = normalize_text((string)$candidate['name']) === normalize_text((string)$other['name']);
            $samePosition = external_position((string)$candidate['position']) === external_position((string)$other['position']);
            $sameNation = normalize_text((string)($candidate['nationalTeam'] ?? '')) === normalize_text((string)($other['nationalTeam'] ?? ''));
            if ($sameName && $samePosition && $sameNation) {
                $candidate['identityScore'] += 45;
                $candidate['confirmedBy'][] = $other['provider'];
                if (empty($candidate['imageUrl']) || strpos((string)$candidate['imageUrl'], 'missing_player') !== false) {
                    $candidate['imageUrl'] = $other['imageUrl'] ?? $candidate['imageUrl'];
                }
            }
        }
    }
    unset($candidate);
    usort($candidates, static function ($left, $right) {
        return (int)($right['identityScore'] ?? 0) <=> (int)($left['identityScore'] ?? 0);
    });
    return $candidates[0] ?? null;
}

function biwenger_sale_with_catalog(array $sale, array $catalog): ?array
{
    $playerId = (int)($sale['player']['id'] ?? $sale['playerID'] ?? 0);
    if ($playerId <= 0) return null;
    $catalogPlayer = $catalog['playersById'][$playerId] ?? null;
    $salePrice = biwenger_sale_price($sale);
    $ownerPayload = biwenger_sale_owner_payload($sale);
    if (is_array($catalogPlayer)) {
        return array_merge($catalogPlayer, [
            'ownerPrice' => $salePrice ?: null,
            'marketOwnerId' => $ownerPayload['id'],
            'marketOwnerName' => $ownerPayload['name'],
            'marketSellerType' => $ownerPayload['type'],
            'marketSellerLabel' => $ownerPayload['label']
        ]);
    }
    return [
        'id' => $playerId,
        'price' => $salePrice ?: null,
        'marketOwnerId' => $ownerPayload['id'],
        'marketOwnerName' => $ownerPayload['name'],
        'marketSellerType' => $ownerPayload['type'],
        'marketSellerLabel' => $ownerPayload['label']
    ];
}

function biwenger_sale_owner_payload(array $sale): array
{
    $user = is_array($sale['user'] ?? null) ? $sale['user'] : [];
    $ownerId = (int)($user['id'] ?? $sale['userID'] ?? $sale['userId'] ?? $sale['ownerID'] ?? $sale['ownerId'] ?? 0);
    $ownerName = biwenger_entity_name($user, (string)($sale['userName'] ?? $sale['ownerName'] ?? $sale['sellerName'] ?? ''));
    $normalizedName = normalize_text($ownerName);
    $isSystemMarket = $ownerId <= 0 || $ownerName === '' || preg_match('/biwenger|mercado|market|sistema|computer/', $normalizedName);
    $type = $isSystemMarket ? 'free' : 'rival';
    if ($ownerName === '') $ownerName = $type === 'free' ? 'Biwenger' : 'Rival';
    return [
        'id' => $ownerId,
        'name' => $ownerName,
        'type' => $type,
        'label' => $type === 'free' ? 'Libre' : 'Vende ' . $ownerName
    ];
}

function biwenger_league_overview(array $session, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $rows = biwenger_league_users($session, $timeoutSeconds, $headers, $strictTls);
    $standingsSource = $rows ? 'league-users' : 'rounds-league';
    $candidates = [];
    try {
        $response = biwenger_private_get_json('https://biwenger.as.com/api/v2/rounds/league', $session, $timeoutSeconds, $headers, $strictTls);
        $data = is_array($response['data'] ?? null) ? $response['data'] : $response;
        biwenger_collect_standing_entries($data, $candidates);
    } catch (Throwable $error) {
        // League users are still enough when the round endpoint is unavailable.
    }
    if (!$rows && !$candidates) {
        try {
            $leagueResponse = biwenger_private_get_json(
                'https://biwenger.as.com/api/v2/league/' . (int)($session['leagueId'] ?? 0) . '?fields=*,users(*,lastPositions)',
                $session,
                $timeoutSeconds,
                $headers,
                $strictTls
            );
            $leagueData = is_array($leagueResponse['data'] ?? null) ? $leagueResponse['data'] : $leagueResponse;
            biwenger_collect_standing_entries($leagueData, $candidates);
        } catch (Throwable $error) {
            // Some league modes only expose the rounds endpoint.
        }
    }
    if (!$rows) {
        $fallbackPosition = 0;
        $seenUsers = [];
        foreach ($candidates as $entry) {
            if (!is_array($entry)) continue;
            $user = is_array($entry['user'] ?? null) ? $entry['user'] : $entry;
            $userId = (int)($user['id'] ?? $entry['userID'] ?? $entry['userId'] ?? 0);
            if ($userId <= 0 || isset($seenUsers[$userId])) continue;
            $seenUsers[$userId] = true;
            $fallbackPosition += 1;
            $finance = biwenger_finance_snapshot(array_merge($entry, $user));
            $icon = biwenger_user_icon($user, $entry, $userId);
            $rows[] = [
                'position' => biwenger_standing_position($entry, $fallbackPosition),
                'userId' => $userId,
                'name' => (string)($user['name'] ?? $entry['name'] ?? 'Rival'),
                'icon' => $icon,
                'avatar' => $icon,
                'points' => biwenger_standing_points($entry, $user),
                'teamValue' => $finance['teamValue'] ?? (isset($entry['teamValue']) ? (int)$entry['teamValue'] : null),
                'cash' => $finance['cash'] ?? null,
                'maximumBid' => $finance['maximumBid'] ?? null,
                'dailyIncrease' => $finance['dailyIncrease'] ?? null,
                'lastAccess' => $finance['lastAccess'] ?? null,
                'finance' => $finance,
                'isMe' => $userId === (int)($session['userId'] ?? 0)
            ];
        }
    } else if ($candidates) {
        $iconsByUser = [];
        foreach ($candidates as $entry) {
            if (!is_array($entry)) continue;
            $user = is_array($entry['user'] ?? null) ? $entry['user'] : $entry;
            $userId = (int)($user['id'] ?? $entry['userID'] ?? $entry['userId'] ?? 0);
            if ($userId <= 0) continue;
            $icon = biwenger_user_icon($user, $entry, $userId);
            if ($icon) $iconsByUser[$userId] = $icon;
        }
        foreach ($rows as &$row) {
            $userId = (int)($row['userId'] ?? 0);
            if (empty($row['icon']) && isset($iconsByUser[$userId])) {
                $row['icon'] = $iconsByUser[$userId];
                $row['avatar'] = $iconsByUser[$userId];
            }
        }
        unset($row);
    }
    $rows = biwenger_sort_standings_rows($rows);
    return [
        'ok' => true,
        'leagueName' => (string)($session['leagueName'] ?? ''),
        'leagueIcon' => $session['leagueIcon'] ?? null,
        'leagueCover' => $session['leagueCover'] ?? null,
        'standingsSource' => $standingsSource,
        'standings' => $rows,
        'rivals' => array_values(array_filter($rows, static function ($row) {
            return empty($row['isMe']);
        })),
        'updatedAt' => gmdate('c')
    ];
}

function biwenger_league_users(array $session, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $leagueId = (int)($session['leagueId'] ?? 0);
    if ($leagueId <= 0) return [];
    $candidates = [];
    $urls = [
        'https://biwenger.as.com/api/v2/league/' . $leagueId . '?fields=*,users(*,id,name,icon,avatar,photo,image,account(*),lastPositions,points,score)',
        'https://biwenger.as.com/api/v2/owners/league',
        'https://biwenger.as.com/api/v2/league/' . $leagueId
    ];
    foreach ($urls as $url) {
        try {
            $response = biwenger_private_get_json($url, $session, $timeoutSeconds, $headers, $strictTls);
            $data = is_array($response['data'] ?? null) ? $response['data'] : $response;
            $rankingCandidates = [];
            $userCandidates = [];
            biwenger_collect_standing_entries((array)$data, $rankingCandidates);
            biwenger_collect_league_user_entries((array)$data, $userCandidates);
            $candidates = array_merge($candidates, $rankingCandidates, $userCandidates);
            if ($candidates) break;
        } catch (Throwable $error) {
            continue;
        }
    }
    $rows = [];
    $fallbackPosition = 0;
    $seenUsers = [];
    foreach ($candidates as $entry) {
        if (!is_array($entry)) continue;
        $user = is_array($entry['user'] ?? null) ? $entry['user'] : $entry;
        $userId = (int)($user['id'] ?? $entry['userID'] ?? $entry['userId'] ?? 0);
        if ($userId <= 0 || isset($seenUsers[$userId])) continue;
        $seenUsers[$userId] = true;
        $fallbackPosition += 1;
        $finance = biwenger_finance_snapshot(array_merge($entry, $user));
        $icon = biwenger_user_icon($user, $entry, $userId);
        $rows[] = [
            'position' => biwenger_standing_position($entry, $fallbackPosition),
            'userId' => $userId,
            'name' => (string)($user['name'] ?? $entry['name'] ?? 'Rival'),
            'icon' => $icon,
            'avatar' => $icon,
            'points' => biwenger_standing_points($entry, $user),
            'teamValue' => $finance['teamValue'] ?? (isset($entry['teamValue']) ? (int)$entry['teamValue'] : null),
            'cash' => $finance['cash'] ?? null,
            'maximumBid' => $finance['maximumBid'] ?? null,
            'dailyIncrease' => $finance['dailyIncrease'] ?? null,
            'lastAccess' => $finance['lastAccess'] ?? null,
            'finance' => $finance,
            'isMe' => $userId === (int)($session['userId'] ?? 0)
        ];
    }
    return biwenger_sort_standings_rows($rows);
}

function biwenger_collect_league_user_entries(array $node, array &$rows, int $depth = 0, $keyHint = null, string $parentKey = ''): void
{
    if ($depth > 7) return;
    $normalizedParent = normalize_text($parentKey);
    $insideUserCollection = in_array($normalizedParent, ['users', 'owners', 'members', 'accounts'], true);
    $hasNestedUser = is_array($node['user'] ?? null);
    $user = $hasNestedUser ? $node['user'] : $node;
    $hintedUserId = is_numeric($keyHint) && array_key_exists('name', $node) ? (int)$keyHint : 0;
    $account = is_array($user['account'] ?? null) ? $user['account'] : (is_array($node['account'] ?? null) ? $node['account'] : []);
    $userId = (int)(($user['id'] ?? null)
        ?? ($node['userID'] ?? null)
        ?? ($node['userId'] ?? null)
        ?? ($account['id'] ?? null)
        ?? $hintedUserId);
    $name = trim((string)(($user['name'] ?? null)
        ?? ($node['name'] ?? null)
        ?? ($node['teamName'] ?? null)
        ?? ($node['nick'] ?? null)
        ?? ''));
    $looksLikeLeagueUser = $userId > 0 && $name !== '' && (
        $insideUserCollection
        || $hasNestedUser
        || array_key_exists('lastPositions', $node)
        || array_key_exists('points', $node)
        || array_key_exists('score', $node)
        || array_key_exists('lineups', $node)
        || array_key_exists('marketTransactions', $node)
    );
    if ($looksLikeLeagueUser) {
        if (!isset($node['userID']) && !isset($node['userId']) && !isset($node['user']['id'])) {
            $node['userID'] = $userId;
        }
        if (!isset($node['name']) && $name !== '') {
            $node['name'] = $name;
        }
        $rows[] = $node;
        return;
    }
    foreach ($node as $key => $child) {
        if (!is_array($child)) continue;
        $childParentKey = is_numeric($key) && $insideUserCollection ? $parentKey : (string)$key;
        biwenger_collect_league_user_entries($child, $rows, $depth + 1, $key, $childParentKey);
    }
}

function biwenger_sort_standings_rows(array $rows): array
{
    usort($rows, static function ($a, $b) {
        $pointsDiff = (int)($b['points'] ?? 0) <=> (int)($a['points'] ?? 0);
        if ($pointsDiff !== 0) return $pointsDiff;
        $positionDiff = (int)($a['position'] ?? PHP_INT_MAX) <=> (int)($b['position'] ?? PHP_INT_MAX);
        if ($positionDiff !== 0) return $positionDiff;
        $valueDiff = (int)($b['teamValue'] ?? 0) <=> (int)($a['teamValue'] ?? 0);
        if ($valueDiff !== 0) return $valueDiff;
        return strcasecmp((string)($a['name'] ?? ''), (string)($b['name'] ?? ''));
    });
    foreach ($rows as $index => &$row) {
        $row['officialPosition'] = isset($row['position']) ? (int)$row['position'] : null;
        $row['position'] = $index + 1;
    }
    unset($row);
    return $rows;
}

function biwenger_collect_standing_entries(array $node, array &$rows, int $depth = 0, $keyHint = null): void
{
    if ($depth > 6) return;
    $hasNestedUser = is_array($node['user'] ?? null);
    $user = $hasNestedUser ? $node['user'] : $node;
    $hintedUserId = is_numeric($keyHint) && array_key_exists('name', $node) ? (int)$keyHint : 0;
    $hasUserId = (int)($user['id'] ?? $node['userID'] ?? $node['userId'] ?? $hintedUserId) > 0;
    $hasUserShape = $hasNestedUser
        || array_key_exists('userID', $node)
        || array_key_exists('userId', $node)
        || $hintedUserId > 0
        || (array_key_exists('name', $node) && (
            array_key_exists('position', $node)
            || array_key_exists('rank', $node)
            || array_key_exists('lastPositions', $node)
        ));
    $hasRankingSignal = array_key_exists('points', $node)
        || array_key_exists('score', $node)
        || array_key_exists('position', $node)
        || array_key_exists('rank', $node);
    if ($hasUserId && $hasUserShape && $hasRankingSignal) {
        if (!isset($node['userID']) && !isset($node['userId']) && !isset($node['user']['id']) && $hintedUserId > 0) {
            $node['userID'] = $hintedUserId;
        }
        $rows[] = $node;
        return;
    }
    foreach ($node as $key => $child) {
        if (!is_array($child)) continue;
        biwenger_collect_standing_entries($child, $rows, $depth + 1, $key);
    }
}

function biwenger_standing_position(array $entry, int $fallback): int
{
    foreach (['position', 'rank', 'lastPosition'] as $key) {
        if (isset($entry[$key]) && is_numeric($entry[$key])) return (int)$entry[$key];
    }
    $lastPositions = array_values(array_filter((array)($entry['lastPositions'] ?? []), 'is_numeric'));
    return $lastPositions ? (int)end($lastPositions) : $fallback;
}

function biwenger_standing_points(array $entry, array $user): int
{
    $value = $entry['points'] ?? $entry['score'] ?? $entry['total'] ?? $user['points'] ?? 0;
    if (is_array($value)) {
        return (int)array_sum(array_filter($value, 'is_numeric'));
    }
    return is_numeric($value) ? (int)$value : 0;
}

function biwenger_signed_money_int($value): int
{
    if (is_int($value) || is_float($value)) return (int)round($value);
    $raw = strtolower(trim((string)$value));
    if ($raw === '') return 0;
    $multiplier = preg_match('/\b(m|mill(?:on|ones)?)\b/u', $raw)
        ? 1000000
        : (preg_match('/\b(k|mil)\b/u', $raw) ? 1000 : 1);
    if ($multiplier > 1) {
        $number = preg_replace('/[^0-9,.\-]/', '', $raw) ?? '';
        $number = preg_replace('/\.(?=\d{3}(?:\D|$))/', '', $number) ?? $number;
        $number = str_replace(',', '.', $number);
        return is_numeric($number) ? (int)round((float)$number * $multiplier) : 0;
    }
    $digits = preg_replace('/[^0-9\-]/', '', $raw) ?? '';
    return is_numeric($digits) ? (int)$digits : 0;
}

function biwenger_path_value(array $node, string $path)
{
    $current = $node;
    foreach (explode('.', $path) as $segment) {
        if (!is_array($current) || !array_key_exists($segment, $current)) return null;
        $current = $current[$segment];
    }
    return $current;
}

function biwenger_first_money_path(array $node, array $paths, bool $signed = false): ?int
{
    foreach ($paths as $path) {
        $value = biwenger_path_value($node, $path);
        if ($value === null || $value === '') continue;
        if (!is_scalar($value)) continue;
        $money = $signed ? biwenger_signed_money_int($value) : biwenger_money_int($value);
        if ($money !== 0 || is_numeric($value) || preg_match('/^-/', (string)$value)) return $money;
    }
    return null;
}

function biwenger_reward_amount_from_value($value): ?int
{
    if ($value === null || $value === '') return null;
    if (is_scalar($value)) {
        $money = biwenger_money_int($value);
        return $money > 0 ? $money : null;
    }
    if (!is_array($value)) return null;
    foreach (['total', 'amount', 'money', 'cash', 'reward', 'rewards', 'prize', 'bonus', 'income', 'earnings', 'value'] as $key) {
        if (!array_key_exists($key, $value) || is_array($value[$key])) continue;
        $money = biwenger_money_int($value[$key]);
        if ($money > 0) return $money;
    }
    $sum = 0;
    $count = 0;
    foreach ($value as $key => $child) {
        if (!is_numeric($key) && !preg_match('/reward|recomp|premio|prize|bonus|income|earning|amount|money|cash|total/i', (string)$key)) continue;
        $amount = biwenger_reward_amount_from_value($child);
        if ($amount !== null && $amount > 0) {
            $sum += $amount;
            $count++;
        }
    }
    return $count > 0 ? $sum : null;
}

function biwenger_reward_path_is_blocked(string $path): bool
{
    $normalized = strtolower($path);
    return (bool)preg_match(
        '/player|players|market|price|clause|bid|offer|sale|transfer|wallet|balance|budget|funds|maximumbid|maxbid|teamvalue|squadvalue|playersvalue|lineup\.players|playersid|pointvalue|marketvalue/i',
        $normalized
    );
}

function biwenger_collect_round_reward_candidates($node, array &$candidates, string $source, string $path, int $userId, int $depth = 0, bool $userMatched = false): void
{
    if ($depth > 8 || !is_array($node)) return;
    $nodeUserId = biwenger_entity_id_path($node, ['user', 'user.id', 'userID', 'userId', 'owner', 'owner.id']);
    $localUserMatched = $userMatched || ($userId > 0 && $nodeUserId === $userId);
    foreach ($node as $key => $child) {
        $keyText = (string)$key;
        $childPath = $path === '' ? $keyText : $path . '.' . $keyText;
        if (biwenger_reward_path_is_blocked($childPath)) {
            if (is_array($child) && preg_match('/user|owner/i', $keyText)) {
                biwenger_collect_round_reward_candidates($child, $candidates, $source, $childPath, $userId, $depth + 1, $localUserMatched);
            }
            continue;
        }
        $strictRewardish = preg_match('/reward|recomp|premio|prize|bonus|premium|income|earning|payout/i', $keyText);
        $moneyInRoundContext = preg_match('/cash|money/i', $keyText)
            && preg_match('/currentround|round|jornada|reward|recomp|premio|prize|bonus|income|earning/i', $childPath);
        $rewardish = $strictRewardish || $moneyInRoundContext;
        if ($rewardish) {
            $amount = biwenger_reward_amount_from_value($child);
            if ($amount !== null && $amount > 0) {
                $score = 20;
                if (preg_match('/currentround|active|round|jornada/i', $childPath)) $score += 20;
                if (preg_match('/reward|recomp|premio|prize|bonus|income|earning/i', $childPath)) $score += 20;
                if (preg_match('/total|amount|money|cash/i', $childPath)) $score += 8;
                if ($localUserMatched) $score += 16;
                if ($source === 'ownData' || $source === 'ownEntry') $score += 10;
                $candidates[] = [
                    'amount' => $amount,
                    'path' => trim($source . '.' . $childPath, '.'),
                    'score' => $score,
                    'confidence' => $score >= 64 ? 'alta' : 'media'
                ];
            }
        }
        if (is_array($child)) {
            biwenger_collect_round_reward_candidates($child, $candidates, $source, $childPath, $userId, $depth + 1, $localUserMatched);
        }
    }
}

function biwenger_extract_live_round_reward(array $sources, int $userId): array
{
    $directPaths = [
        'currentRound.rewards.total', 'currentRound.reward.total', 'currentRound.prizes.total',
        'currentRound.bonuses.total', 'currentRound.income.total', 'currentRound.earnings.total',
        'currentRound.totalReward', 'currentRound.rewardTotal', 'currentRound.totalRewards',
        'lineup.rewards.total', 'lineup.reward.total', 'lineup.income.total',
        'round.reward.total', 'round.rewards.total', 'round.income.total',
        'rewardTotal', 'totalReward', 'totalRewards', 'roundRewardTotal', 'roundIncomeTotal'
    ];
    $candidates = [];
    foreach ($sources as $source => $node) {
        if (!is_array($node) || !$node) continue;
        foreach ($directPaths as $path) {
            if (biwenger_reward_path_is_blocked($path)) continue;
            $value = biwenger_path_value($node, $path);
            $amount = biwenger_reward_amount_from_value($value);
            if ($amount !== null && $amount > 0) {
                $score = 76 + (($source === 'ownData' || $source === 'ownEntry') ? 10 : 0);
                if (preg_match('/currentRound|round|lineup/i', $path)) $score += 18;
                if (preg_match('/total|rewardTotal|totalReward|totalRewards/i', $path)) $score += 8;
                $candidates[] = [
                    'amount' => $amount,
                    'path' => $source . '.' . $path,
                    'score' => $score,
                    'confidence' => 'directa'
                ];
            }
        }
    }
    if (!$candidates) {
        return [
            'available' => false,
            'amount' => 0,
            'source' => 'Biwenger',
            'confidence' => 'sin-dato',
            'path' => '',
            'label' => 'Biwenger no expone el total a cobrar en esta respuesta'
        ];
    }
    usort($candidates, static function ($a, $b) {
        if ((int)$a['score'] !== (int)$b['score']) return (int)$b['score'] <=> (int)$a['score'];
        return (int)$b['amount'] <=> (int)$a['amount'];
    });
    $best = $candidates[0];
    return [
        'available' => true,
        'amount' => (int)$best['amount'],
        'source' => 'Biwenger',
        'confidence' => (string)$best['confidence'],
        'path' => (string)$best['path'],
        'label' => 'Total a cobrar detectado en Biwenger',
        'candidates' => array_slice(array_map(static function ($candidate) {
            return [
                'amount' => (int)$candidate['amount'],
                'path' => (string)$candidate['path'],
                'confidence' => (string)$candidate['confidence']
            ];
        }, $candidates), 0, 5)
    ];
}

function biwenger_first_value_path(array $node, array $paths)
{
    foreach ($paths as $path) {
        $value = biwenger_path_value($node, $path);
        if ($value !== null && $value !== '') return $value;
    }
    return null;
}

function biwenger_dateish($value): ?string
{
    if ($value === null || $value === '') return null;
    if (is_numeric($value)) {
        $timestamp = (int)$value;
        if ($timestamp > 100000000000) $timestamp = (int)round($timestamp / 1000);
        return gmdate('c', $timestamp);
    }
    $timestamp = strtotime((string)$value);
    return $timestamp ? gmdate('c', $timestamp) : (string)$value;
}

function biwenger_finance_snapshot(array $data, array $players = []): array
{
    $teamValue = biwenger_first_money_path($data, [
        'teamValue', 'squadValue', 'playersValue', 'teamPrice', 'team.price', 'team.value',
        'marketValue', 'fantasyValue'
    ]);
    if ($teamValue === null && $players) {
        $teamValue = array_sum(array_map(static function ($player) {
            return (int)($player['biwengerValue'] ?? $player['price'] ?? 0);
        }, $players));
    }
    $cash = biwenger_first_money_path($data, [
        'cash', 'balance', 'money', 'budget', 'funds', 'wallet', 'accountBalance',
        'account.balance', 'account.money', 'finance.balance', 'finance.cash', 'user.cash',
        'user.balance', 'user.money'
    ], true);
    $maximumBid = biwenger_first_money_path($data, [
        'maximumBid', 'maxBid', 'maxOffer', 'bidBudget', 'availableBid', 'maximumOffer',
        'maxAllowedBid', 'limits.maximumBid', 'finance.maximumBid', 'user.maximumBid'
    ]);
    $dailyIncrease = biwenger_first_money_path($data, [
        'dailyIncrease', 'dailyInc', 'dailyValueIncrease', 'dailyPriceIncrease',
        'teamValueIncrement', 'teamPriceIncrement', 'marketValueChange', 'valueIncrement',
        'priceIncrement', 'finance.dailyIncrease'
    ], true);
    $lastAccess = biwenger_dateish(biwenger_first_value_path($data, [
        'lastAccess', 'lastLogin', 'lastConnection', 'lastOnline', 'lastSeen',
        'accessedAt', 'loginAt', 'updatedAt', 'user.lastAccess', 'user.lastLogin'
    ]));
    return [
        'cash' => $cash,
        'maximumBid' => $maximumBid,
        'teamValue' => $teamValue,
        'dailyIncrease' => $dailyIncrease,
        'lastAccess' => $lastAccess
    ];
}

function biwenger_entity_id_path(array $entry, array $paths): int
{
    foreach ($paths as $path) {
        $value = biwenger_path_value($entry, $path);
        if (is_array($value)) $value = $value['id'] ?? $value['userID'] ?? $value['userId'] ?? null;
        if (is_numeric($value)) return (int)$value;
    }
    return 0;
}

function biwenger_player_id_from_transfer(array $entry): int
{
    return biwenger_entity_id_path($entry, ['player', 'player.id', 'playerID', 'playerId', 'asset.id']);
}

function biwenger_player_name_from_transfer(array $entry, array $catalog): string
{
    $name = biwenger_first_value_path($entry, ['player.name', 'playerName', 'name', 'asset.name']);
    if (is_string($name) && $name !== '') return $name;
    $playerId = biwenger_player_id_from_transfer($entry);
    return (string)($catalog['playersById'][$playerId]['name'] ?? 'Jugador');
}

function biwenger_collect_transfer_entries(array $node, array &$entries, int $depth = 0, string $keyHint = ''): void
{
    if ($depth > 8) return;
    $hasAmount = isset($node['amount']) || isset($node['price']) || isset($node['money']) || isset($node['cash'])
        || isset($node['value']) || isset($node['bid']) || isset($node['cost']);
    $hasPlayer = isset($node['player']) || isset($node['playerID']) || isset($node['playerId']) || isset($node['asset']);
    $hasParties = isset($node['buyer']) || isset($node['seller']) || isset($node['from']) || isset($node['to'])
        || isset($node['buyerID']) || isset($node['sellerID']) || isset($node['fromID']) || isset($node['toID']);
    $looksLikeTransfer = $hasAmount && $hasPlayer && (
        $hasParties
        || isset($node['type'])
        || preg_match('/transaction|transfer|trade|history|market/i', $keyHint)
    );
    if ($looksLikeTransfer) {
        $node['_source'] = $keyHint;
        $entries[] = $node;
        return;
    }
    foreach ($node as $key => $child) {
        if (is_array($child)) biwenger_collect_transfer_entries($child, $entries, $depth + 1, $keyHint . ':' . (string)$key);
    }
}

function biwenger_trade_summary(array $data, int $userId, array $catalog): array
{
    $entries = [];
    foreach (['marketTransactions', 'transactions', 'transfers', 'tradeHistory', 'history', 'marketHistory'] as $key) {
        if (is_array($data[$key] ?? null)) biwenger_collect_transfer_entries($data[$key], $entries, 0, $key);
    }
    $rows = [];
    $seen = [];
    $boughtTotal = 0;
    $soldTotal = 0;
    $maxOverbid = null;
    foreach ($entries as $entry) {
        if (!is_array($entry)) continue;
        $amount = biwenger_first_money_path($entry, ['amount', 'price', 'money', 'cash', 'bid', 'cost', 'value']);
        if ($amount === null || $amount <= 0) continue;
        $playerId = biwenger_player_id_from_transfer($entry);
        $playerName = biwenger_player_name_from_transfer($entry, $catalog);
        $buyerId = biwenger_entity_id_path($entry, ['buyer', 'buyer.id', 'buyerID', 'buyerId', 'to', 'to.id', 'toID', 'toId']);
        $sellerId = biwenger_entity_id_path($entry, ['seller', 'seller.id', 'sellerID', 'sellerId', 'from', 'from.id', 'fromID', 'fromId']);
        $type = strtolower((string)($entry['type'] ?? $entry['operation'] ?? $entry['action'] ?? $entry['_source'] ?? ''));
        $direction = '';
        if ($buyerId === $userId) $direction = 'buy';
        if ($sellerId === $userId) $direction = 'sell';
        if ($direction === '' && preg_match('/buy|bought|purchase|fich|compra/', $type)) $direction = 'buy';
        if ($direction === '' && preg_match('/sell|sold|venta|vende/', $type)) $direction = 'sell';
        if ($direction === '') continue;
        $marketValue = biwenger_first_money_path($entry, ['marketValue', 'player.price', 'player.fantasyPrice', 'asset.price']);
        if ($marketValue === null && $playerId > 0) {
            $marketValue = biwenger_money_int($catalog['playersById'][$playerId]['price'] ?? 0);
        }
        $overbid = $marketValue !== null && $marketValue > 0 ? $amount - $marketValue : null;
        if ($overbid !== null) $maxOverbid = $maxOverbid === null ? $overbid : max($maxOverbid, $overbid);
        if ($direction === 'buy') $boughtTotal += $amount;
        if ($direction === 'sell') $soldTotal += $amount;
        $dedupeKey = (string)($entry['id'] ?? '') . '|' . $direction . '|' . $playerId . '|' . $amount . '|' . (string)($entry['date'] ?? $entry['createdAt'] ?? '');
        if (isset($seen[$dedupeKey])) continue;
        $seen[$dedupeKey] = true;
        $rows[] = [
            'id' => (string)($entry['id'] ?? $dedupeKey),
            'direction' => $direction,
            'playerId' => $playerId ?: null,
            'playerName' => $playerName,
            'amount' => $amount,
            'marketValue' => $marketValue,
            'overbid' => $overbid,
            'date' => biwenger_dateish($entry['date'] ?? $entry['createdAt'] ?? $entry['time'] ?? null)
        ];
    }
    return [
        'activityCount' => count($rows),
        'boughtCount' => count(array_filter($rows, static fn($row) => $row['direction'] === 'buy')),
        'soldCount' => count(array_filter($rows, static fn($row) => $row['direction'] === 'sell')),
        'boughtTotal' => $boughtTotal,
        'soldTotal' => $soldTotal,
        'netBalance' => $soldTotal - $boughtTotal,
        'maxOverbid' => $maxOverbid,
        'transactions' => array_slice($rows, 0, 8)
    ];
}

function biwenger_rival_team(array $session, int $rivalUserId, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $response = biwenger_private_get_json(
        'https://biwenger.as.com/api/v2/user/' . $rivalUserId . '?fields=*,players(*,fitness,team,owner),lineup(type,playersID),lastPositions,marketTransactions',
        $session,
        $timeoutSeconds,
        $headers,
        $strictTls
    );
    $data = is_array($response['data'] ?? null) ? $response['data'] : $response;
    if (is_array($data['user'] ?? null)) $data = array_merge($data, $data['user']);
    $catalog = biwenger_fetch_competition_catalog((string)($session['competition'] ?? ''), $timeoutSeconds, $headers, $strictTls, (int)($session['scoreId'] ?? 2));
    $players = [];
    foreach ((array)($data['players'] ?? []) as $entry) {
        $entryData = is_array($entry) ? $entry : ['id' => (int)$entry];
        $playerId = (int)($entryData['id'] ?? 0);
        if ($playerId <= 0) continue;
        $merged = array_merge((array)($catalog['playersById'][$playerId] ?? []), $entryData);
        $players[] = biwenger_normalize_player($merged, $catalog, (string)($session['competition'] ?? ''), true);
    }
    $clauses = [];
    try {
        $clauseResponse = biwenger_private_get_json('https://biwenger.as.com/api/v2/owners/league/clause', $session, $timeoutSeconds, $headers, $strictTls);
        $clauseData = is_array($clauseResponse['data'] ?? null) ? $clauseResponse['data'] : $clauseResponse;
        biwenger_collect_clause_entries($clauseData, $clauses);
    } catch (Throwable $error) {
        try {
            $ownerResponse = biwenger_private_get_json('https://biwenger.as.com/api/v2/owners/league', $session, $timeoutSeconds, $headers, $strictTls);
            $ownerData = is_array($ownerResponse['data'] ?? null) ? $ownerResponse['data'] : $ownerResponse;
            biwenger_collect_clause_entries($ownerData, $clauses);
        } catch (Throwable $fallbackError) {
            // Clauses can be disabled or hidden by league settings.
        }
    }
    foreach ($players as &$player) {
        $playerId = (int)($player['biwengerPlayerId'] ?? 0);
        if (isset($clauses[$playerId])) {
            $player['clause'] = $clauses[$playerId];
        }
        $player['ownerId'] = $rivalUserId;
    }
    unset($player);
    $finance = biwenger_finance_snapshot($data, $players);
    $tradeSummary = biwenger_trade_summary($data, $rivalUserId, $catalog);
    return [
        'ok' => true,
        'userId' => $rivalUserId,
        'name' => (string)($data['name'] ?? 'Rival'),
        'teamValue' => $finance['teamValue'] ?? array_sum(array_column($players, 'biwengerValue')),
        'finance' => $finance,
        'tradeSummary' => $tradeSummary,
        'sourceDiagnostics' => [
            'apiFootball' => api_football_status_payload()
        ],
        'players' => $players
    ];
}

function biwenger_live_round(array $session, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $roundResponse = biwenger_private_get_json('https://biwenger.as.com/api/v2/rounds/league', $session, $timeoutSeconds, $headers, $strictTls);
    $roundData = is_array($roundResponse['data'] ?? null) ? $roundResponse['data'] : $roundResponse;
    $roundEntries = [];
    biwenger_collect_live_round_entries((array)$roundData, $roundEntries);
    $overview = biwenger_league_overview($session, $timeoutSeconds, $headers, $strictTls);
    $standings = (array)($overview['standings'] ?? []);
    if (!$standings) $standings = biwenger_league_users($session, $timeoutSeconds, $headers, $strictTls);
    $catalog = biwenger_fetch_competition_catalog((string)($session['competition'] ?? ''), $timeoutSeconds, $headers, $strictTls, (int)($session['scoreId'] ?? 2));
    $entriesByUser = [];
    foreach ($roundEntries as $entry) {
        $user = is_array($entry['user'] ?? null) ? $entry['user'] : $entry;
        $userId = (int)($user['id'] ?? $entry['userID'] ?? $entry['userId'] ?? 0);
        if ($userId <= 0) continue;
        $score = biwenger_live_round_entry_score($entry);
        if (!isset($entriesByUser[$userId]) || $score > $entriesByUser[$userId]['score']) {
            $entriesByUser[$userId] = ['score' => $score, 'entry' => $entry];
        }
    }
    $ownUserId = (int)($session['userId'] ?? 0);
    $ownData = [];
    try {
        $ownResponse = biwenger_private_get_json(
            'https://biwenger.as.com/api/v2/user?fields=*,players(*,fitness,team,owner),lineup(*),lineups(*),rounds(*),currentRound(*)',
            $session,
            $timeoutSeconds,
            $headers,
            $strictTls
        );
        $ownData = is_array($ownResponse['data'] ?? null) ? $ownResponse['data'] : $ownResponse;
        if (is_array($ownData['user'] ?? null)) $ownData = array_merge($ownData, $ownData['user']);
        if ($ownUserId > 0) {
            $roundEntry = (array)($entriesByUser[$ownUserId]['entry'] ?? []);
            // The round endpoint is authoritative for the last scored lineup. Keep the
            // complete user payload nested for player metadata, but never let an older
            // profile lineup overwrite the round that Biwenger has just closed.
            $entriesByUser[$ownUserId] = ['score' => 9999, 'entry' => array_merge(
                $ownData,
                $roundEntry,
                ['_ownData' => $ownData, '_roundEntry' => $roundEntry]
            )];
        }
    } catch (Throwable $error) {
        // The league-round payload can still expose the current user's score.
    }
    $ownEntry = $ownUserId > 0 ? (array)($entriesByUser[$ownUserId]['entry'] ?? []) : [];
    $selectedRound = biwenger_lineup_round_number(biwenger_pick_latest_scored_lineup($ownEntry));
    $officialReward = biwenger_extract_live_round_reward([
        'ownData' => $ownData,
        'ownEntry' => $ownEntry,
        'roundsLeague' => (array)$roundData,
        'leagueOverview' => (array)$overview
    ], $ownUserId);
    $rewardSettings = is_array($session['rewardSettings'] ?? null) ? $session['rewardSettings'] : [];
    if (empty($rewardSettings['available'])) {
        try {
            $leagueResponse = biwenger_private_get_json(
                'https://biwenger.as.com/api/v2/league/' . (int)($session['leagueId'] ?? 0) . '?fields=*,settings',
                $session,
                $timeoutSeconds,
                $headers,
                $strictTls
            );
            $leagueData = is_array($leagueResponse['data'] ?? null) ? $leagueResponse['data'] : $leagueResponse;
            $rewardSettings = biwenger_reward_settings_from_node((array)($leagueData['settings'] ?? $leagueData['league']['settings'] ?? []));
        } catch (Throwable $error) {
            // Manual settings remain available in the client when the league hides its configuration.
        }
    }
    $teams = [];
    foreach ($standings as $standing) {
        $userId = (int)($standing['userId'] ?? 0);
        if ($userId <= 0) continue;
        $data = (array)($entriesByUser[$userId]['entry'] ?? []);
        $lineupIds = biwenger_lineup_player_ids($data);
        $lineupPoints = biwenger_lineup_player_points($data);
        $captainId = biwenger_lineup_role_id($data, 'captain');
        $strikerId = biwenger_lineup_role_id($data, 'striker');
        $playersById = [];
        biwenger_collect_player_entries($data, $playersById);
        $players = [];
        foreach (array_keys($lineupIds + $lineupPoints) as $playerId) {
            $playerId = (int)$playerId;
            if ($playerId <= 0) continue;
            $merged = array_merge((array)($catalog['playersById'][$playerId] ?? []), (array)($playersById[$playerId] ?? []));
            if (!$merged) continue;
            $player = biwenger_normalize_player($merged, $catalog, (string)($session['competition'] ?? ''), true);
            $player['roundPoints'] = (float)($lineupPoints[$playerId] ?? 0);
            $player['isCaptain'] = $playerId === $captainId;
            $player['isStriker'] = $playerId === $strikerId;
            $player['roundGoals'] = biwenger_player_round_goals($merged);
            $player['isIdeal'] = biwenger_player_is_ideal($merged);
            $player['isGameMvp'] = biwenger_player_is_game_mvp($merged);
            $players[] = $player;
        }
        $pointSnapshot = biwenger_extract_live_round_points($data);
        $teams[] = [
            'userId' => $userId,
            'name' => (string)($standing['name'] ?? $data['name'] ?? 'Equipo'),
            'isMe' => !empty($standing['isMe']),
            'points' => $pointSnapshot['points'],
            'pointsReliable' => $pointSnapshot['reliable'],
            'captainId' => $captainId,
            'strikerId' => $strikerId,
            'players' => $players,
            'lineupVisible' => !empty($players),
            'lineupImageUrl' => 'https://cf.biwenger.com/draw/roundLineup.jpg?user=' . $userId . '&lang=es&mode=widget&bg=06282a',
            'visibilityMessage' => $players
                ? ''
                : 'Biwenger no expone este once como datos; se muestra el grafico oficial de la jornada.'
        ];
    }
    usort($teams, static function ($a, $b) {
        $aReliable = !empty($a['pointsReliable']);
        $bReliable = !empty($b['pointsReliable']);
        if ($aReliable !== $bReliable) return $aReliable ? -1 : 1;
        return (int)($b['points'] ?? PHP_INT_MIN) <=> (int)($a['points'] ?? PHP_INT_MIN);
    });
    foreach ($teams as $index => &$team) $team['provisionalRank'] = $index + 1;
    unset($team);
    $reliableTeams = count(array_filter($teams, static fn($team) => !empty($team['pointsReliable'])));
    return [
        'ok' => true,
        'teams' => $teams,
        'roundEntriesFound' => count($roundEntries),
        'lineupsVisible' => count(array_filter($teams, static fn($team) => !empty($team['lineupVisible']))),
        'reliablePointsTeams' => $reliableTeams,
        'hasReliablePoints' => $reliableTeams > 0,
        'officialReward' => $officialReward,
        'roundReward' => $officialReward,
        'rewardSettings' => $rewardSettings,
        'round' => $selectedRound > 0 ? $selectedRound : null,
        'standingsImageUrl' => 'https://cf.biwenger.com/draw/standings.jpg?league=' . (int)($session['leagueId'] ?? 0) . '&round=' . ($selectedRound > 0 ? $selectedRound : 'active'),
        'updatedAt' => gmdate('c')
    ];
}

function biwenger_player_round_goals(array $player): int
{
    foreach (['roundGoals', 'goals', 'stats.goals', 'statistics.goals', 'currentRound.goals'] as $path) {
        $value = biwenger_path_value($player, $path);
        if (is_numeric($value)) return max(0, (int)$value);
        if (is_array($value) && is_numeric($value['total'] ?? null)) return max(0, (int)$value['total']);
    }
    return 0;
}

function biwenger_player_is_ideal(array $player): bool
{
    foreach (['isIdeal', 'ideal', 'idealLineup', 'inIdealLineup', 'roundIdeal'] as $key) {
        if (!empty($player[$key])) return true;
    }
    return false;
}

function biwenger_player_is_game_mvp(array $player): bool
{
    foreach (['mvp', 'isMvp', 'isMVP', 'gameMVP', 'isGameMVP', 'currentRound.mvp'] as $path) {
        if (!empty(biwenger_path_value($player, $path))) return true;
    }
    return false;
}

function biwenger_live_round_debug(array $session, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $response = biwenger_private_get_json('https://biwenger.as.com/api/v2/rounds/league', $session, $timeoutSeconds, $headers, $strictTls);
    $data = is_array($response['data'] ?? null) ? $response['data'] : $response;
    $entries = [];
    biwenger_collect_live_round_entries((array)$data, $entries);
    $ownUserId = (int)($session['userId'] ?? 0);
    $ownResponse = [];
    try {
        $ownRaw = biwenger_private_get_json(
            'https://biwenger.as.com/api/v2/user?fields=*,players(*,fitness,team,owner),lineup(*),lineups(*),rounds(*),currentRound(*)',
            $session,
            $timeoutSeconds,
            $headers,
            $strictTls
        );
        $ownResponse = is_array($ownRaw['data'] ?? null) ? $ownRaw['data'] : $ownRaw;
        if (is_array($ownResponse['user'] ?? null)) $ownResponse = array_merge($ownResponse, $ownResponse['user']);
    } catch (Throwable $error) {
        $ownResponse = ['debugError' => $error->getMessage()];
    }
    return [
        'ok' => true,
        'roundEntryCount' => count($entries),
        'officialReward' => biwenger_extract_live_round_reward([
            'ownData' => (array)$ownResponse,
            'roundsLeague' => (array)$data
        ], $ownUserId),
        'sample' => array_slice($entries, 0, 3)
    ];
}

function biwenger_collect_live_round_entries(array $node, array &$entries, int $depth = 0, $keyHint = null, string $path = ''): void
{
    if ($depth > 9) return;
    $user = is_array($node['user'] ?? null) ? $node['user'] : $node;
    $hintedUserId = is_numeric($keyHint) && array_key_exists('name', $node) ? (int)$keyHint : 0;
    $userId = (int)($user['id'] ?? $node['userID'] ?? $node['userId'] ?? $hintedUserId);
    $hasRoundSignal = biwenger_live_round_entry_score($node) > 0;
    $pathNorm = normalize_text($path);
    $isPlayerBranch = preg_match('/player|jugador|team|equipo|home|away/', $pathNorm);
    $hasUserShape = is_array($node['user'] ?? null)
        || array_key_exists('userID', $node)
        || array_key_exists('userId', $node)
        || ($hintedUserId > 0 && !$isPlayerBranch);
    if ($userId > 0 && $hasRoundSignal && $hasUserShape && !$isPlayerBranch) {
        if (!isset($node['userID']) && !isset($node['userId']) && !isset($node['user']['id']) && $hintedUserId > 0) {
            $node['userID'] = $hintedUserId;
        }
        $entries[] = $node;
    }
    foreach ($node as $key => $child) {
        if (is_array($child)) biwenger_collect_live_round_entries($child, $entries, $depth + 1, $key, $path . '/' . (string)$key);
    }
}

function biwenger_live_round_entry_score(array $entry): int
{
    $score = biwenger_lineup_payload_score($entry);
    foreach (['lineup', 'lineups', 'currentRound', 'rounds', 'playersID', 'playersPoints', 'pointsByPlayer'] as $key) {
        if (!empty($entry[$key])) $score += 25;
    }
    foreach (['points', 'score', 'currentPoints', 'roundPoints'] as $key) {
        if (isset($entry[$key]) && is_numeric($entry[$key])) $score += 5;
    }
    return $score;
}

function biwenger_extract_live_round_points(array $data): array
{
    if (!$data) return ['points' => null, 'reliable' => false];
    $lineupPoints = biwenger_lineup_player_points($data);
    if ($lineupPoints) {
        return [
            'points' => (int)round(array_sum($lineupPoints)),
            'reliable' => true
        ];
    }
    $lineup = biwenger_pick_latest_scored_lineup($data);
    foreach (['points', 'score', 'currentPoints', 'roundPoints'] as $key) {
        if (isset($lineup[$key]) && is_numeric($lineup[$key])) {
            return ['points' => (int)$lineup[$key], 'reliable' => true];
        }
    }
    foreach (['currentRound', 'lineup'] as $key) {
        if (!empty($data[$key]) && is_array($data[$key])) {
            foreach (['points', 'score', 'currentPoints', 'roundPoints'] as $scoreKey) {
                if (isset($data[$key][$scoreKey]) && is_numeric($data[$key][$scoreKey])) {
                    return ['points' => (int)$data[$key][$scoreKey], 'reliable' => true];
                }
            }
        }
    }
    return ['points' => null, 'reliable' => false];
}

function biwenger_collect_player_entries(array $node, array &$players, int $depth = 0): void
{
    if ($depth > 8) return;
    foreach ((array)($node['players'] ?? []) as $entry) {
        if (!is_array($entry)) continue;
        $id = (int)($entry['id'] ?? $entry['playerID'] ?? $entry['playerId'] ?? 0);
        if ($id > 0) $players[$id] = array_merge((array)($players[$id] ?? []), $entry);
    }
    foreach ($node as $child) {
        if (is_array($child)) biwenger_collect_player_entries($child, $players, $depth + 1);
    }
}

function biwenger_current_fixtures(array $session, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $response = biwenger_private_get_json('https://biwenger.as.com/api/v2/rounds/league', $session, $timeoutSeconds, $headers, $strictTls);
    $data = is_array($response['data'] ?? null) ? $response['data'] : $response;
    $events = [];
    biwenger_collect_fixture_entries((array)$data, $events);
    if (!$events) throw new RuntimeException('la liga no expone calendario');
    usort($events, static fn($a, $b) => $a['timestamp'] <=> $b['timestamp']);
    return [
        'ok' => true,
        'competition' => (string)(($session['competition'] ?? '') ?: ($session['leagueName'] ?? 'Biwenger')),
        'round' => 'actual',
        'events' => $events,
        'cacheStatus' => 'biwenger'
    ];
}

function biwenger_collect_fixture_entries(array $node, array &$events, int $depth = 0): void
{
    if ($depth > 8) return;
    $home = is_array($node['home'] ?? null) ? $node['home'] : (is_array($node['homeTeam'] ?? null) ? $node['homeTeam'] : []);
    $away = is_array($node['away'] ?? null) ? $node['away'] : (is_array($node['awayTeam'] ?? null) ? $node['awayTeam'] : []);
    if ($home && $away && (!empty($home['name']) || !empty($away['name']))) {
        $homeScore = $node['homeScore'] ?? $node['scoreHome'] ?? null;
        $awayScore = $node['awayScore'] ?? $node['scoreAway'] ?? null;
        $timestamp = (int)($node['timestamp'] ?? $node['startTimestamp'] ?? $node['date'] ?? 0);
        if ($timestamp > 20000000000) $timestamp = (int)round($timestamp / 1000);
        $events[] = [
            'id' => (int)($node['id'] ?? count($events) + 1),
            'timestamp' => $timestamp ?: time(),
            'status' => (string)($node['status'] ?? 'notstarted'),
            'statusText' => (string)($node['statusText'] ?? ''),
            'home' => ['name' => (string)($home['name'] ?? 'Local'), 'image' => biwenger_entity_media($home, ['shield', 'badge', 'logo', 'image', 'flag'])],
            'away' => ['name' => (string)($away['name'] ?? 'Visitante'), 'image' => biwenger_entity_media($away, ['shield', 'badge', 'logo', 'image', 'flag'])],
            'homeScore' => is_numeric($homeScore) ? (int)$homeScore : null,
            'awayScore' => is_numeric($awayScore) ? (int)$awayScore : null,
            'sofascoreUrl' => null
        ];
        return;
    }
    foreach ($node as $child) if (is_array($child)) biwenger_collect_fixture_entries($child, $events, $depth + 1);
}

function biwenger_lineup_player_ids(array $data): array
{
    $ids = [];
    $lineup = biwenger_pick_latest_scored_lineup($data);
    biwenger_collect_lineup_ids($lineup, $ids);
    return $ids;
}

function biwenger_lineup_player_points(array $data): array
{
    $points = [];
    $lineup = biwenger_pick_latest_scored_lineup($data);
    biwenger_collect_lineup_points($lineup, $points);
    return $points;
}

function biwenger_lineup_role_id(array $data, string $role): int
{
    $lineup = biwenger_pick_latest_scored_lineup($data);
    $value = $lineup[$role] ?? $data[$role] ?? null;
    if (is_array($value)) return (int)($value['id'] ?? $value['playerID'] ?? $value['playerId'] ?? 0);
    return is_numeric($value) ? (int)$value : 0;
}

function biwenger_current_round_points(array $data, int $fallback): int
{
    $lineup = biwenger_pick_latest_scored_lineup($data);
    foreach (['points', 'score', 'currentPoints', 'roundPoints'] as $key) {
        if (isset($lineup[$key]) && is_numeric($lineup[$key])) return (int)$lineup[$key];
    }
    $lineupPoints = biwenger_lineup_player_points($data);
    if ($lineupPoints) return (int)round(array_sum($lineupPoints));
    return $fallback;
}

function biwenger_pick_active_lineup(array $data): array
{
    $candidates = [];
    foreach (['lineup', 'currentRound'] as $key) {
        if (is_array($data[$key] ?? null)) $candidates[] = $data[$key];
    }
    foreach (['lineups', 'rounds'] as $key) {
        foreach (array_values(array_filter((array)($data[$key] ?? []), 'is_array')) as $entry) {
            $candidates[] = $entry;
        }
    }
    if (!$candidates) return [];
    usort($candidates, static function ($left, $right) {
        return biwenger_lineup_payload_score($right) <=> biwenger_lineup_payload_score($left);
    });
    return $candidates[0] ?? [];
}

function biwenger_pick_latest_scored_lineup(array $data): array
{
    $candidates = [];
    foreach (['currentRound', 'lineup'] as $key) {
        if (is_array($data[$key] ?? null)) $candidates[] = $data[$key];
    }
    foreach (['lineups', 'rounds'] as $key) {
        foreach (array_values(array_filter((array)($data[$key] ?? []), 'is_array')) as $entry) {
            $candidates[] = $entry;
        }
    }
    if (is_array($data['_roundEntry'] ?? null)) $candidates[] = $data['_roundEntry'];
    if (!$candidates) return [];

    $scored = array_values(array_filter($candidates, 'biwenger_lineup_has_score_data'));
    if ($scored) $candidates = $scored;
    usort($candidates, static function ($left, $right) {
        $roundDiff = biwenger_lineup_round_number($right) <=> biwenger_lineup_round_number($left);
        if ($roundDiff !== 0) return $roundDiff;
        $timeDiff = biwenger_lineup_timestamp($right) <=> biwenger_lineup_timestamp($left);
        if ($timeDiff !== 0) return $timeDiff;
        return biwenger_lineup_payload_score($right) <=> biwenger_lineup_payload_score($left);
    });
    return $candidates[0] ?? [];
}

function biwenger_lineup_has_score_data(array $lineup): bool
{
    $status = normalize_text((string)($lineup['status'] ?? $lineup['state'] ?? ''));
    if (preg_match('/finish|finished|closed|complete|completed|processed|final|cerrad|terminad/', $status)) return true;
    $points = [];
    biwenger_collect_lineup_points($lineup, $points);
    if ($points) return true;
    foreach (['points', 'score', 'currentPoints', 'roundPoints'] as $key) {
        if (!isset($lineup[$key]) || !is_numeric($lineup[$key])) continue;
        if ((float)$lineup[$key] !== 0.0 || (int)($lineup['count'] ?? $lineup['played'] ?? 0) > 0) return true;
    }
    return false;
}

function biwenger_lineup_round_number(array $lineup): int
{
    foreach (['round', 'roundID', 'roundId', 'matchday', 'week', 'number'] as $key) {
        $value = $lineup[$key] ?? null;
        if (is_numeric($value)) return (int)$value;
        if (is_array($value)) {
            foreach (['id', 'number', 'round', 'matchday'] as $nestedKey) {
                if (is_numeric($value[$nestedKey] ?? null)) return (int)$value[$nestedKey];
            }
        }
    }
    return 0;
}

function biwenger_lineup_timestamp(array $lineup): int
{
    foreach (['updated', 'updatedAt', 'date', 'end', 'endDate', 'timestamp', 'created', 'createdAt'] as $key) {
        $timestamp = biwenger_timestamp_seconds($lineup[$key] ?? null);
        if ($timestamp > 0) return $timestamp;
    }
    return 0;
}

function biwenger_lineup_payload_score(array $lineup): int
{
    $score = 0;
    foreach (['points', 'score', 'currentPoints', 'roundPoints'] as $key) {
        if (isset($lineup[$key]) && is_numeric($lineup[$key])) $score += 30;
    }
    foreach (['playersID', 'playersId', 'playersIDs', 'startersID', 'starterIds', 'eleven'] as $key) {
        if (!empty($lineup[$key]) && is_array($lineup[$key])) $score += 20;
    }
    if (!empty($lineup['players']) && is_array($lineup['players'])) $score += 25;
    if (!empty($lineup['formation']) || !empty($lineup['type'])) $score += 10;
    return $score;
}

function biwenger_collect_lineup_ids(array $node, array &$ids, string $path = '', int $depth = 0): void
{
    if ($depth > 7 || !$node) return;
    $pathNorm = normalize_text($path);
    if (preg_match('/bench|banquillo|reserve|substitut|suplente/', $pathNorm)) return;

    foreach (['playersID', 'playersId', 'playersIDs', 'startersID', 'starterIds', 'eleven'] as $key) {
        foreach ((array)($node[$key] ?? []) as $value) {
            $id = is_array($value) ? (int)($value['id'] ?? 0) : (int)$value;
            if ($id > 0) $ids[$id] = true;
        }
    }
    foreach ((array)($node['players'] ?? []) as $entry) {
        if (!is_array($entry)) {
            $id = (int)$entry;
            if ($id > 0) $ids[$id] = true;
            continue;
        }
        $isBench = !empty($entry['bench']) || !empty($entry['isBench']) || !empty($entry['substitute']) || !empty($entry['isSubstitute']);
        $isStarter = array_key_exists('starter', $entry) ? !empty($entry['starter']) : (array_key_exists('isStarter', $entry) ? !empty($entry['isStarter']) : !$isBench);
        $id = (int)($entry['id'] ?? $entry['playerID'] ?? $entry['playerId'] ?? 0);
        if ($id > 0 && $isStarter) $ids[$id] = true;
    }
    foreach ($node as $key => $child) {
        if (!is_array($child)) continue;
        biwenger_collect_lineup_ids($child, $ids, $path . '/' . (string)$key, $depth + 1);
    }
}

function biwenger_collect_lineup_points(array $node, array &$points, string $path = '', int $depth = 0): void
{
    if ($depth > 7 || !$node) return;
    $pathNorm = normalize_text($path);
    if (preg_match('/bench|banquillo|reserve|substitut|suplente/', $pathNorm)) return;

    foreach ((array)($node['players'] ?? []) as $entry) {
        if (!is_array($entry)) continue;
        $id = (int)($entry['id'] ?? $entry['playerID'] ?? $entry['playerId'] ?? 0);
        if ($id <= 0) continue;
        $value = $entry['points'] ?? $entry['score'] ?? $entry['currentPoints'] ?? $entry['roundPoints'] ?? null;
        if (is_numeric($value)) $points[$id] = (float)$value;
    }
    $ids = array_values(array_filter((array)($node['playersID'] ?? $node['playersId'] ?? $node['playersIDs'] ?? $node['startersID'] ?? $node['starterIds'] ?? []), 'is_numeric'));
    $rawPoints = array_values(array_filter((array)($node['pointsByPlayer'] ?? $node['playersPoints'] ?? $node['scoresByPlayer'] ?? $node['currentPointsByPlayer'] ?? []), 'is_numeric'));
    foreach ($ids as $index => $id) {
        if (!isset($points[(int)$id]) && isset($rawPoints[$index])) $points[(int)$id] = (float)$rawPoints[$index];
    }
    foreach ($node as $key => $child) {
        if (!is_array($child)) continue;
        biwenger_collect_lineup_points($child, $points, $path . '/' . (string)$key, $depth + 1);
    }
}

function sofascore_current_fixtures(array $session, int $timeoutSeconds, array $headers, bool $strictTls, string $dbDir): array
{
    $competition = trim((string)($session['competition'] ?? ''));
    $leagueName = trim((string)($session['leagueName'] ?? ''));
    $cachePath = $dbDir . DIRECTORY_SEPARATOR . 'fixtures-v3-' . slugify($competition ?: $leagueName) . '.json';
    $cached = read_json_file($cachePath, []);
    if (!empty($cached['fetchedAtTs']) && (int)$cached['fetchedAtTs'] > time() - 1800 && !empty($cached['events'])) {
        $cached['cacheStatus'] = 'hit';
        return $cached;
    }

    $fixtureQueries = fixture_competition_queries($session);
    $query = trim((string)($fixtureQueries[0] ?? str_replace(['-', '_'], ' ', $competition ?: $leagueName)));
    $search = sofascore_api_json('/search/all?q=' . rawurlencode($query) . '&page=0', $timeoutSeconds, $headers, $strictTls);
    $results = (array)($search['results'] ?? []);
    $tournaments = [];
    foreach ($results as $result) {
        if (!is_array($result)) continue;
        $entity = is_array($result['entity'] ?? null) ? $result['entity'] : $result;
        $unique = is_array($entity['uniqueTournament'] ?? null) ? $entity['uniqueTournament'] : $entity;
        $id = (int)($unique['id'] ?? 0);
        if ($id <= 0) continue;
        $name = (string)($unique['name'] ?? $entity['name'] ?? '');
        $score = identity_name_score($name, $query);
        if ($score > 0) $tournaments[] = ['id' => $id, 'name' => $name, 'slug' => (string)($unique['slug'] ?? slugify($name)), 'score' => $score];
    }
    usort($tournaments, static fn($a, $b) => $b['score'] <=> $a['score']);
    $tournament = $tournaments[0] ?? null;
    if (!$tournament) throw new RuntimeException('SofaScore no ha encontrado la competicion activa: ' . ($competition ?: $leagueName));

    $seasonId = 0;
    try {
        $seasonPayload = sofascore_api_json('/unique-tournament/' . $tournament['id'] . '/seasons', $timeoutSeconds, $headers, $strictTls);
        $seasons = array_values(array_filter((array)($seasonPayload['seasons'] ?? []), 'is_array'));
        $currentYear = (int)date('Y');
        usort($seasons, static function ($left, $right) use ($currentYear) {
            $leftYear = (int)preg_replace('/\D.*$/', '', (string)($left['year'] ?? $left['name'] ?? 0));
            $rightYear = (int)preg_replace('/\D.*$/', '', (string)($right['year'] ?? $right['name'] ?? 0));
            $leftDistance = $leftYear > 0 ? abs($currentYear - $leftYear) : 999;
            $rightDistance = $rightYear > 0 ? abs($currentYear - $rightYear) : 999;
            return $leftDistance <=> $rightDistance ?: $rightYear <=> $leftYear;
        });
        $seasonId = (int)($seasons[0]['id'] ?? 0);
    } catch (Throwable $error) {
        $seasonId = 0;
    }

    $eventRows = [];
    foreach (['last', 'next'] as $direction) {
        for ($page = 0; $page < 6; $page++) {
            try {
                $path = $seasonId > 0
                    ? '/unique-tournament/' . $tournament['id'] . '/season/' . $seasonId . '/events/' . $direction . '/' . $page
                    : '/unique-tournament/' . $tournament['id'] . '/events/' . $direction . '/' . $page;
                $payload = sofascore_api_json($path, $timeoutSeconds, $headers, $strictTls);
                $pageEvents = array_values(array_filter((array)($payload['events'] ?? []), 'is_array'));
                foreach ($pageEvents as $event) {
                    if (!empty($event['id'])) $eventRows[(int)$event['id']] = $event;
                }
                if (!$pageEvents || empty($payload['hasNextPage'])) break;
            } catch (Throwable $error) {
                break;
            }
        }
    }
    if (!$eventRows) throw new RuntimeException('SofaScore no ha devuelto partidos para esta competicion');

    $now = time();
    $relevantRows = array_values(array_filter($eventRows, static function ($event) use ($now) {
        $timestamp = (int)($event['startTimestamp'] ?? 0);
        return $timestamp > 0 && $timestamp >= $now - (10 * 86400) && $timestamp <= $now + (45 * 86400);
    }));
    if (!$relevantRows) $relevantRows = array_values($eventRows);
    $roundNames = array_values(array_unique(array_filter(array_map(static function ($event) {
        return (string)($event['roundInfo']['round'] ?? $event['roundInfo']['name'] ?? '');
    }, $relevantRows))));
    $round = implode(', ', array_slice($roundNames, 0, 4)) ?: 'actual';
    $events = array_values(array_map(static function ($event) use ($tournament) {
        $home = (array)($event['homeTeam'] ?? []);
        $away = (array)($event['awayTeam'] ?? []);
        $homeScore = $event['homeScore']['current'] ?? $event['homeScore']['normaltime'] ?? null;
        $awayScore = $event['awayScore']['current'] ?? $event['awayScore']['normaltime'] ?? null;
        $eventId = (int)($event['id'] ?? 0);
        return [
            'id' => $eventId,
            'timestamp' => (int)($event['startTimestamp'] ?? 0),
            'status' => (string)($event['status']['type'] ?? 'notstarted'),
            'statusText' => (string)($event['status']['description'] ?? ''),
            'home' => ['name' => (string)($home['name'] ?? 'Local'), 'image' => !empty($home['id']) ? 'https://api.sofascore.app/api/v1/team/' . (int)$home['id'] . '/image' : null],
            'away' => ['name' => (string)($away['name'] ?? 'Visitante'), 'image' => !empty($away['id']) ? 'https://api.sofascore.app/api/v1/team/' . (int)$away['id'] . '/image' : null],
            'homeScore' => is_numeric($homeScore) ? (int)$homeScore : null,
            'awayScore' => is_numeric($awayScore) ? (int)$awayScore : null,
            'sofascoreUrl' => $eventId > 0
                ? 'https://www.sofascore.com/football/match/' . slugify((string)($home['name'] ?? 'home') . '-' . (string)($away['name'] ?? 'away')) . '#id:' . $eventId
                : null,
            'round' => (string)($event['roundInfo']['round'] ?? $event['roundInfo']['name'] ?? '')
        ];
    }, $relevantRows));
    usort($events, static fn($a, $b) => $a['timestamp'] <=> $b['timestamp']);
    $result = [
        'ok' => true,
        'competition' => $tournament['name'],
        'round' => $round,
        'events' => $events,
        'fetchedAtTs' => time(),
        'cacheStatus' => 'refresh'
    ];
    write_json_file($cachePath, $result);
    return $result;
}

function sofascore_api_json(string $path, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $lastError = null;
    $sofascoreHeaders = [
        'Accept: application/json, text/plain, */*',
        'Accept-Language: es-ES,es;q=0.9,en;q=0.7',
        'Origin: https://www.sofascore.com',
        'Referer: https://www.sofascore.com/',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
    ];
    foreach (['https://api.sofascore.com/api/v1', 'https://www.sofascore.com/api/v1'] as $base) {
        try {
            return http_get_json($base . '/' . ltrim($path, '/'), $timeoutSeconds, $sofascoreHeaders, $strictTls);
        } catch (Throwable $error) {
            $lastError = $error;
        }
    }
    throw new RuntimeException($lastError ? $lastError->getMessage() : 'SofaScore no disponible');
}

function resultados_futbol_current_fixtures(array $session, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $events = [];
    $html = http_get_text('https://www.resultados-futbol.com/livescore', max($timeoutSeconds, 15), $headers, $strictTls);
    preg_match_all(
        '~<tr[^>]*>[\s\S]*?<td class="time"[^>]*>[\s\S]*?<div class="chk_hour"[^>]*>([^<]+)</div>[\s\S]*?</td>[\s\S]*?<td class="timer">([\s\S]*?)</td>[\s\S]*?<td class="team-home">([\s\S]*?)</td>[\s\S]*?<td class="score[^"]*">([\s\S]*?)</td>[\s\S]*?<td class="team-away">([\s\S]*?)</td>[\s\S]*?</tr>~i',
        $html,
        $rows,
        PREG_SET_ORDER | PREG_OFFSET_CAPTURE
    );
    $queries = fixture_competition_queries($session);
    $matchedCompetitionEvents = [];
    $madridTz = new DateTimeZone('Europe/Madrid');
    $todayMadrid = new DateTimeImmutable('now', $madridTz);
    foreach ($rows as $row) {
        $hour = trim(strip_tags((string)($row[1][0] ?? '')));
        $timer = trim(preg_replace('/\s+/u', ' ', strip_tags((string)($row[2][0] ?? ''))));
        $homeHtml = (string)($row[3][0] ?? '');
        $scoreHtml = (string)($row[4][0] ?? '');
        $awayHtml = (string)($row[5][0] ?? '');
        $rowOffset = (int)($row[0][1] ?? 0);
        $context = substr($html, max(0, $rowOffset - 4000), 4000);
        preg_match_all('~href="/competicion/[^"]+">([^<]+)</a>~i', $context, $competitionMatches);
        $competitionLabel = trim((string)end($competitionMatches[1]));
        preg_match('~href="([^"]+/partido/[^"]+|/partido/[^"]+)"~i', $scoreHtml, $detailMatch);
        preg_match('~itemprop="name"[^>]*>([^<]+)<~i', $homeHtml, $homeNameMatch);
        preg_match('~itemprop="name"[^>]*>([^<]+)<~i', $awayHtml, $awayNameMatch);
        preg_match('~src="([^"]+)"~i', $homeHtml, $homeImgMatch);
        preg_match('~src="([^"]+)"~i', $awayHtml, $awayImgMatch);
        preg_match('~(\d+)\s*-\s*(\d+)~', strip_tags($scoreHtml), $scoreMatch);
        $date = preg_match('/^\d{1,2}:\d{2}$/', $hour)
            ? DateTimeImmutable::createFromFormat('Y-m-d H:i', $todayMadrid->format('Y-m-d') . ' ' . $hour, $madridTz)
            : $todayMadrid->setTime(12, 0);
        $event = [
            'id' => md5($todayMadrid->format('Ymd') . ($homeNameMatch[1] ?? '') . ($awayNameMatch[1] ?? '') . $hour),
            'timestamp' => $date ? $date->getTimestamp() : time(),
            'status' => $scoreMatch ? 'finished' : 'notstarted',
            'statusText' => $timer !== '' ? $timer : ($scoreMatch ? 'Finalizado' : 'Proximo'),
            'competitionLabel' => $competitionLabel,
            'home' => ['name' => trim((string)($homeNameMatch[1] ?? 'Local')), 'image' => !empty($homeImgMatch[1]) ? html_entity_decode((string)$homeImgMatch[1], ENT_QUOTES) : null],
            'away' => ['name' => trim((string)($awayNameMatch[1] ?? 'Visitante')), 'image' => !empty($awayImgMatch[1]) ? html_entity_decode((string)$awayImgMatch[1], ENT_QUOTES) : null],
            'homeScore' => isset($scoreMatch[1]) ? (int)$scoreMatch[1] : null,
            'awayScore' => isset($scoreMatch[2]) ? (int)$scoreMatch[2] : null,
            'sofascoreUrl' => null,
            'detailUrl' => !empty($detailMatch[1]) ? 'https://www.resultados-futbol.com' . preg_replace('~^https?://[^/]+~i', '', (string)$detailMatch[1]) : null
        ];
        $events[] = $event;
        if ($competitionLabel !== '' && fixture_competition_match_score($competitionLabel, $queries) >= 55) {
            $matchedCompetitionEvents[] = $event;
        }
    }
    if (!$events) throw new RuntimeException('Resultados-Futbol no ha devuelto partidos reconocibles');
    $events = $matchedCompetitionEvents ?: $events;
    usort($events, static fn($a, $b) => $a['timestamp'] <=> $b['timestamp']);
    return [
        'ok' => true,
        'competition' => (string)(($session['competition'] ?? '') ?: ($session['leagueName'] ?? 'Partidos')),
        'round' => 'actual',
        'events' => array_values(array_map(static function ($event) {
            unset($event['competitionLabel']);
            return $event;
        }, array_slice($events, 0, 40))),
        'cacheStatus' => 'resultados-futbol'
    ];
}

function resultados_futbol_calendar_fixtures(array $session, int $timeoutSeconds, array $headers, bool $strictTls, string $dbDir): array
{
    $competition = (string)(($session['competition'] ?? '') ?: ($session['leagueName'] ?? 'partidos'));
    $cachePath = $dbDir . DIRECTORY_SEPARATOR . 'calendar-v2-' . slugify($competition) . '.json';
    $cached = read_json_file($cachePath, []);
    if (!empty($cached['fetchedAtTs']) && (int)$cached['fetchedAtTs'] > time() - 900 && !empty($cached['events'])) {
        $cached['cacheStatus'] = 'hit-resultados-calendar';
        return $cached;
    }
    $urls = resultados_futbol_calendar_urls($session);
    if (!$urls) throw new RuntimeException('competicion sin calendario conocido');
    $events = [];
    $errors = [];
    $pages = http_get_text_many($urls, max($timeoutSeconds, 12), $headers, $strictTls);
    foreach ($urls as $url) {
        try {
            if (!isset($pages[$url]) || !is_string($pages[$url])) throw new RuntimeException('calendario no disponible');
            $html = $pages[$url];
            foreach (resultados_futbol_parse_calendar_html($html, $url) as $event) {
                $key = normalize_text((string)$event['home']['name']) . '|' . normalize_text((string)$event['away']['name']) . '|' . gmdate('Ymd', (int)$event['timestamp']);
                $events[$key] = $event;
            }
        } catch (Throwable $error) {
            $errors[] = $error->getMessage();
        }
    }
    if (!$events) throw new RuntimeException('Resultados-Futbol no ha devuelto el calendario' . ($errors ? ': ' . $errors[0] : ''));
    $events = array_values($events);
    usort($events, static fn($a, $b) => $a['timestamp'] <=> $b['timestamp']);
    $result = [
        'ok' => true,
        'competition' => $competition,
        'round' => 'calendario',
        'events' => $events,
        'fetchedAtTs' => time(),
        'cacheStatus' => 'resultados-calendar'
    ];
    write_json_file($cachePath, $result);
    return $result;
}

function resultados_futbol_calendar_urls(array $session): array
{
    $competition = normalize_text((string)($session['competition'] ?? ''));
    if (preg_match('/world|mundial|selecc|copa del mundo/', $competition)) {
        return ['https://www.resultados-futbol.com/competicion/mundial2026'];
    }
    $known = [
        '/laliga|la liga|primera|ea sports/' => 'https://www.resultados-futbol.com/competicion/primera/calendario',
        '/premier/' => 'https://www.resultados-futbol.com/competicion/premier/calendario',
        '/bundesliga/' => 'https://www.resultados-futbol.com/competicion/bundesliga/calendario',
        '/serie a/' => 'https://www.resultados-futbol.com/competicion/serie_a/calendario',
        '/ligue 1|ligue-1/' => 'https://www.resultados-futbol.com/competicion/ligue_1/calendario',
        '/champions/' => 'https://www.resultados-futbol.com/competicion/champions/calendario'
    ];
    foreach ($known as $pattern => $url) {
        if (preg_match($pattern, $competition)) return [$url];
    }
    return [];
}

function fast_current_fixtures(array $session, int $timeoutSeconds, array $headers, bool $strictTls, string $dbDir): array
{
    $startedAt = microtime(true);
    $fixtures = resultados_futbol_calendar_fixtures($session, min($timeoutSeconds, 7), $headers, $strictTls, $dbDir);
    $fixtures = decorate_fixture_competition_state($fixtures, $session);
    $fixtures['schemaVersion'] = 4;
    $fixtures['fetchedAtTs'] = (int)($fixtures['fetchedAtTs'] ?? time());
    $fixtures['sourceStrategy'] = 'fast-primary-cache';
    $fixtures['durationMs'] = (int)round((microtime(true) - $startedAt) * 1000);
    return $fixtures;
}

function decorate_fixture_competition_state(array $fixtures, array $session): array
{
    $competition = normalize_text((string)(($session['competition'] ?? '') ?: ($session['leagueName'] ?? '')));
    $isKnockout = preg_match('/world|mundial|selecc|copa del mundo/', $competition) === 1;
    $now = time() - 10800;
    $active = [];
    $eliminated = [];
    foreach ((array)($fixtures['events'] ?? []) as $event) {
        if (!is_array($event)) continue;
        $home = trim((string)($event['home']['name'] ?? ''));
        $away = trim((string)($event['away']['name'] ?? ''));
        $timestamp = (int)($event['timestamp'] ?? 0);
        $finished = (string)($event['status'] ?? '') === 'finished';
        if (!$finished && $timestamp >= $now) {
            if ($home !== '') $active[normalize_text($home)] = $home;
            if ($away !== '') $active[normalize_text($away)] = $away;
        }
        if ($isKnockout && $finished && is_numeric($event['homeScore'] ?? null) && is_numeric($event['awayScore'] ?? null)) {
            $homeScore = (int)$event['homeScore'];
            $awayScore = (int)$event['awayScore'];
            if ($homeScore !== $awayScore) {
                $loser = $homeScore < $awayScore ? $home : $away;
                if ($loser !== '') $eliminated[normalize_text($loser)] = $loser;
            }
        }
    }
    foreach (array_keys($active) as $team) unset($eliminated[$team]);
    $fixtures['tournamentStage'] = $isKnockout ? 'knockout' : 'league';
    $fixtures['activeTeams'] = array_values($active);
    $fixtures['eliminatedTeams'] = array_values($eliminated);
    return $fixtures;
}

function resultados_futbol_parse_calendar_html(string $html, string $sourceUrl): array
{
    preg_match_all('~<tr[^>]*class="[^"]*vevent[^"]*"[^>]*>([\s\S]*?)</tr>~i', $html, $matches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE);
    $events = [];
    $madridTz = new DateTimeZone('Europe/Madrid');
    foreach ($matches as $match) {
        $row = (string)($match[1][0] ?? '');
        $offset = (int)($match[0][1] ?? 0);
        preg_match('~class="summary[^"]*"[^>]*title="([^"]+)"~i', $row, $summaryMatch);
        preg_match('~class="dtstart[^"]*"[^>]*title="([^"]+)"~i', $row, $dateMatch);
        preg_match('~class="url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)</a>~i', $row, $detailMatch);
        preg_match('~<td class="equipo1">([\s\S]*?)</td>~i', $row, $homeMatch);
        preg_match('~<td class="equipo2">([\s\S]*?)</td>~i', $row, $awayMatch);
        preg_match('~title="([^"]+)"~i', (string)($homeMatch[1] ?? ''), $homeNameMatch);
        preg_match('~title="([^"]+)"~i', (string)($awayMatch[1] ?? ''), $awayNameMatch);
        preg_match('~src="([^"]+)"~i', (string)($homeMatch[1] ?? ''), $homeImgMatch);
        preg_match('~src="([^"]+)"~i', (string)($awayMatch[1] ?? ''), $awayImgMatch);
        preg_match('~(\d+)\s*-\s*(\d+)~', strip_tags((string)($detailMatch[2] ?? '')), $scoreMatch);
        $summary = html_entity_decode((string)($summaryMatch[1] ?? ''), ENT_QUOTES);
        $homeName = html_entity_decode((string)($homeNameMatch[1] ?? ''), ENT_QUOTES);
        $awayName = html_entity_decode((string)($awayNameMatch[1] ?? ''), ENT_QUOTES);
        if (($homeName === '' || $awayName === '') && str_contains($summary, ' - ')) {
            [$homeName, $awayName] = array_map('trim', explode(' - ', $summary, 2));
        }
        $rawDate = (string)($dateMatch[1] ?? '');
        $date = DateTimeImmutable::createFromFormat('Y-m-d\\TH:i:s', $rawDate, $madridTz)
            ?: DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $rawDate, $madridTz);
        if (!$date || $homeName === '' || $awayName === '') continue;
        $context = substr($html, max(0, $offset - 5000), 5000);
        preg_match_all('~<span class="titlebox">([^<]+)</span>~i', $context, $roundMatches);
        $round = trim(html_entity_decode((string)(end($roundMatches[1]) ?: 'Jornada'), ENT_QUOTES));
        $events[] = [
            'id' => md5($sourceUrl . $summary . $date->format('c')),
            'timestamp' => $date->getTimestamp(),
            'round' => $round,
            'status' => $scoreMatch ? 'finished' : 'notstarted',
            'statusText' => $scoreMatch ? 'Finalizado' : 'Proximo',
            'home' => ['name' => $homeName, 'image' => !empty($homeImgMatch[1]) ? html_entity_decode($homeImgMatch[1], ENT_QUOTES) : null],
            'away' => ['name' => $awayName, 'image' => !empty($awayImgMatch[1]) ? html_entity_decode($awayImgMatch[1], ENT_QUOTES) : null],
            'homeScore' => isset($scoreMatch[1]) ? (int)$scoreMatch[1] : null,
            'awayScore' => isset($scoreMatch[2]) ? (int)$scoreMatch[2] : null,
            'sofascoreUrl' => null,
            'detailUrl' => !empty($detailMatch[1]) ? 'https://www.resultados-futbol.com' . preg_replace('~^https?://[^/]+~i', '', (string)$detailMatch[1]) : null
        ];
    }
    return $events;
}

function thesportsdb_current_fixtures(array $session, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $queries = fixture_competition_queries($session);
    if (!$queries) throw new RuntimeException('sin nombre de liga');
    $league = thesportsdb_known_league($session);
    if (!$league) {
        $allLeagues = http_get_json('https://www.thesportsdb.com/api/v1/json/123/all_leagues.php', $timeoutSeconds, $headers, $strictTls);
        $leagues = [];
        foreach ((array)($allLeagues['leagues'] ?? []) as $candidateLeague) {
            if (!is_array($candidateLeague)) continue;
            if (strcasecmp((string)($candidateLeague['strSport'] ?? ''), 'Soccer') !== 0) continue;
            $name = (string)($candidateLeague['strLeague'] ?? '');
            $score = 0;
            foreach ($queries as $query) $score = max($score, identity_name_score($name, $query));
            if ($score > 40) $leagues[] = ['id' => (int)($candidateLeague['idLeague'] ?? 0), 'name' => $name, 'score' => $score];
        }
        usort($leagues, static fn($a, $b) => $b['score'] <=> $a['score']);
        $league = $leagues[0] ?? null;
    }
    if (!$league || empty($league['id'])) throw new RuntimeException('competicion no encontrada');
    $next = http_get_json('https://www.thesportsdb.com/api/v1/json/123/eventsnextleague.php?id=' . (int)$league['id'], $timeoutSeconds, $headers, $strictTls);
    $prev = http_get_json('https://www.thesportsdb.com/api/v1/json/123/eventspastleague.php?id=' . (int)$league['id'], $timeoutSeconds, $headers, $strictTls);
    $rows = [];
    foreach (array_merge((array)($prev['events'] ?? []), (array)($next['events'] ?? [])) as $event) {
        if (!is_array($event)) continue;
        $id = (int)($event['idEvent'] ?? 0);
        if ($id <= 0) continue;
        $rows[$id] = [
            'id' => $id,
            'timestamp' => thesportsdb_event_timestamp($event),
            'status' => (string)($event['strStatus'] ?? 'notstarted'),
            'statusText' => (string)($event['strStatus'] ?? ''),
            'home' => ['name' => (string)($event['strHomeTeam'] ?? 'Local'), 'image' => $event['strHomeTeamBadge'] ?? null],
            'away' => ['name' => (string)($event['strAwayTeam'] ?? 'Visitante'), 'image' => $event['strAwayTeamBadge'] ?? null],
            'homeScore' => is_numeric($event['intHomeScore'] ?? null) ? (int)$event['intHomeScore'] : null,
            'awayScore' => is_numeric($event['intAwayScore'] ?? null) ? (int)$event['intAwayScore'] : null,
            'sofascoreUrl' => null,
            'detailUrl' => !empty($event['strVideo']) ? (string)$event['strVideo'] : null
        ];
    }
    if (!$rows) throw new RuntimeException('sin eventos para la liga encontrada');
    usort($rows, static fn($a, $b) => $a['timestamp'] <=> $b['timestamp']);
    return ['ok' => true, 'competition' => $league['name'], 'round' => 'actual', 'events' => array_values($rows), 'cacheStatus' => 'thesportsdb'];
}

function api_football_current_fixtures(array $session, int $timeoutSeconds, array $headers, bool $strictTls, string $dbDir): array
{
    $key = api_football_key();
    if ($key === '') throw new RuntimeException('API-Football no configurada');
    $competition = trim((string)(($session['competition'] ?? '') ?: ($session['leagueName'] ?? 'football')));
    $cachePath = $dbDir . DIRECTORY_SEPARATOR . 'api-football-fixtures-' . slugify($competition) . '.json';
    $cached = read_json_file($cachePath, []);
    if (!empty($cached['fetchedAtTs']) && (int)$cached['fetchedAtTs'] > time() - 3600 && !empty($cached['events'])) {
        $cached['cacheStatus'] = 'hit-api-football';
        return $cached;
    }
    $league = api_football_known_league($session);
    if (!$league) {
        $search = api_football_get_json('/leagues', ['search' => api_football_search_query($session)], $timeoutSeconds, $headers, $strictTls);
        $candidates = [];
        foreach ((array)($search['response'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $name = (string)($row['league']['name'] ?? '');
            $score = identity_name_score($name, api_football_search_query($session));
            if ($score > 35) {
                $seasons = array_values(array_filter((array)($row['seasons'] ?? []), 'is_array'));
                usort($seasons, static fn($a, $b) => (int)($b['year'] ?? 0) <=> (int)($a['year'] ?? 0));
                $season = $seasons[0] ?? [];
                foreach ($seasons as $candidateSeason) {
                    if (!empty($candidateSeason['current'])) {
                        $season = $candidateSeason;
                        break;
                    }
                }
                $candidates[] = [
                    'id' => (int)($row['league']['id'] ?? 0),
                    'name' => $name,
                    'season' => (int)($season['year'] ?? 0),
                    'score' => $score
                ];
            }
        }
        usort($candidates, static fn($a, $b) => $b['score'] <=> $a['score']);
        $league = $candidates[0] ?? null;
    }
    if (!$league || empty($league['id']) || empty($league['season'])) throw new RuntimeException('API-Football no encuentra la competicion');
    $today = new DateTimeImmutable('now', new DateTimeZone('Europe/Madrid'));
    $query = [
        'league' => (int)$league['id'],
        'season' => (int)$league['season'],
        'from' => $today->modify('-1 day')->format('Y-m-d'),
        'to' => $today->modify('+21 days')->format('Y-m-d'),
        'timezone' => 'Europe/Madrid'
    ];
    $payload = api_football_get_json('/fixtures', $query, max($timeoutSeconds, 12), $headers, $strictTls);
    $rows = [];
    foreach ((array)($payload['response'] ?? []) as $event) {
        if (!is_array($event)) continue;
        $fixture = (array)($event['fixture'] ?? []);
        $teams = (array)($event['teams'] ?? []);
        $leagueInfo = (array)($event['league'] ?? []);
        $goals = (array)($event['goals'] ?? []);
        $timestamp = (int)($fixture['timestamp'] ?? 0);
        if ($timestamp <= 0) continue;
        $rows[] = [
            'id' => (int)($fixture['id'] ?? 0),
            'timestamp' => $timestamp,
            'round' => (string)($leagueInfo['round'] ?? 'Jornada'),
            'status' => (string)($fixture['status']['short'] ?? 'NS'),
            'statusText' => (string)($fixture['status']['long'] ?? $fixture['status']['short'] ?? 'Proximo'),
            'home' => [
                'name' => (string)($teams['home']['name'] ?? 'Local'),
                'image' => (string)($teams['home']['logo'] ?? '')
            ],
            'away' => [
                'name' => (string)($teams['away']['name'] ?? 'Visitante'),
                'image' => (string)($teams['away']['logo'] ?? '')
            ],
            'homeScore' => is_numeric($goals['home'] ?? null) ? (int)$goals['home'] : null,
            'awayScore' => is_numeric($goals['away'] ?? null) ? (int)$goals['away'] : null,
            'detailUrl' => !empty($fixture['id']) ? 'https://www.api-football.com/live-score/' . (int)$fixture['id'] : null
        ];
    }
    if (!$rows) throw new RuntimeException('API-Football no ha devuelto partidos');
    usort($rows, static fn($a, $b) => $a['timestamp'] <=> $b['timestamp']);
    $result = [
        'ok' => true,
        'competition' => (string)($league['name'] ?? $competition),
        'round' => 'actual',
        'events' => $rows,
        'fetchedAtTs' => time(),
        'cacheStatus' => 'api-football'
    ];
    write_json_file($cachePath, $result);
    return $result;
}

function api_football_known_league(array $session): ?array
{
    $competition = normalize_text((string)($session['competition'] ?? ''));
    if ($competition === '') return null;
    $known = [
        '/world|mundial|selecc|copa del mundo/' => ['id' => 1, 'name' => 'World Cup', 'season' => 2026],
        '/laliga|la liga|primera|ea sports/' => ['id' => 140, 'name' => 'La Liga', 'season' => 2025],
        '/premier/' => ['id' => 39, 'name' => 'Premier League', 'season' => 2025],
        '/bundesliga/' => ['id' => 78, 'name' => 'Bundesliga', 'season' => 2025],
        '/serie a/' => ['id' => 135, 'name' => 'Serie A', 'season' => 2025],
        '/ligue 1|ligue-1/' => ['id' => 61, 'name' => 'Ligue 1', 'season' => 2025],
        '/champions/' => ['id' => 2, 'name' => 'UEFA Champions League', 'season' => 2025]
    ];
    foreach ($known as $pattern => $league) {
        if (preg_match($pattern, $competition)) return $league;
    }
    return null;
}

function api_football_search_query(array $session): string
{
    $queries = fixture_competition_queries($session);
    return (string)($queries[0] ?? ($session['competition'] ?? $session['leagueName'] ?? 'football'));
}

function api_football_get_json(string $path, array $query, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $key = api_football_key();
    if ($key === '') throw new RuntimeException('API-Football no configurada');
    $url = 'https://v3.football.api-sports.io' . $path;
    if ($query) $url .= '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    $apiHeaders = $headers;
    $apiHeaders[] = 'x-apisports-key: ' . $key;
    $apiHeaders[] = 'Accept: application/json';
    $response = http_request('GET', $url, $timeoutSeconds, $apiHeaders, $strictTls);
    if ($response['status'] === 429) throw new RuntimeException('API-Football ha alcanzado su limite (429)');
    if ($response['status'] < 200 || $response['status'] >= 300 || !is_array($response['json'])) {
        $message = (string)($response['json']['errors']['requests'] ?? $response['json']['message'] ?? ('HTTP ' . $response['status']));
        throw new RuntimeException($message);
    }
    return $response['json'];
}

function api_football_player_recent_details(array $player, array $session, int $timeoutSeconds, array $headers, bool $strictTls, string $dbDir): array
{
    if (api_football_key() === '') throw new RuntimeException('API-Football no configurada');
    $competition = trim((string)(($session['competition'] ?? '') ?: ($player['competition'] ?? 'football')));
    $cacheKey = slugify($competition . '-' . (string)($player['name'] ?? '') . '-' . (string)($player['team'] ?? $player['clubTeam'] ?? $player['nationalTeam'] ?? ''));
    $cachePath = $dbDir . DIRECTORY_SEPARATOR . 'api-football-player-recent-' . $cacheKey . '.json';
    $cached = read_json_file($cachePath, []);
    if (!empty($cached['fetchedAtTs']) && (int)$cached['fetchedAtTs'] > time() - 21600 && !empty($cached['recentMatches'])) {
        $cached['cacheStatus'] = 'hit-api-football-player';
        return $cached;
    }

    $league = api_football_known_league($session);
    if (!$league) throw new RuntimeException('API-Football no tiene competicion mapeada para ' . ($competition ?: 'esta liga'));
    $candidate = api_football_find_player($player, $league, $timeoutSeconds, $headers, $strictTls);
    if (!$candidate) throw new RuntimeException('API-Football no encuentra una coincidencia fiable para ' . (string)($player['name'] ?? 'jugador'));

    $apiPlayer = (array)($candidate['player'] ?? []);
    $statistics = array_values(array_filter((array)($candidate['statistics'] ?? []), 'is_array'));
    $stat = (array)($statistics[0] ?? []);
    $team = (array)($stat['team'] ?? []);
    $teamId = (int)($team['id'] ?? 0);
    $playerId = (int)($apiPlayer['id'] ?? 0);
    if ($teamId <= 0 || $playerId <= 0) throw new RuntimeException('API-Football no ha devuelto equipo/jugador valido');

    $fixturesPayload = api_football_get_json('/fixtures', [
        'team' => $teamId,
        'league' => (int)$league['id'],
        'season' => (int)$league['season'],
        'last' => 8,
        'timezone' => 'Europe/Madrid'
    ], $timeoutSeconds, $headers, $strictTls);
    $fixtures = array_values(array_filter((array)($fixturesPayload['response'] ?? []), 'is_array'));
    usort($fixtures, static fn($a, $b) => (int)($a['fixture']['timestamp'] ?? 0) <=> (int)($b['fixture']['timestamp'] ?? 0));
    $fixtures = array_slice($fixtures, -5);

    $recentMatches = [];
    foreach ($fixtures as $fixtureRow) {
        $summary = api_football_recent_match_from_fixture($fixtureRow, $playerId, $teamId, $timeoutSeconds, $headers, $strictTls, $dbDir);
        if ($summary) $recentMatches[] = $summary;
    }
    if (!$recentMatches) throw new RuntimeException('API-Football no devuelve partidos recientes con estadisticas del jugador');

    $health = api_football_player_health($playerId, $league, $timeoutSeconds, $headers, $strictTls);
    $result = [
        'provider' => 'api-football',
        'apiFootball' => [
            'playerId' => $playerId,
            'teamId' => $teamId,
            'leagueId' => (int)$league['id'],
            'season' => (int)$league['season'],
            'matchScore' => (int)($candidate['matchScore'] ?? 0)
        ],
        'media' => [
            'playerImage' => (string)($apiPlayer['photo'] ?? ''),
            'emblemImage' => (string)($team['logo'] ?? ''),
            'emblemKind' => preg_match('/world|mundial|selecc|copa del mundo/i', $competition) ? 'selection' : 'club'
        ],
        'health' => $health,
        'recentMatches' => $recentMatches,
        'fetchedAtTs' => time(),
        'cacheStatus' => 'api-football-player'
    ];
    write_json_file($cachePath, $result);
    return $result;
}

function api_football_find_player(array $player, array $league, int $timeoutSeconds, array $headers, bool $strictTls): ?array
{
    $query = trim((string)($player['name'] ?? ''));
    if ($query === '') return null;
    $payload = api_football_get_json('/players', [
        'league' => (int)$league['id'],
        'season' => (int)$league['season'],
        'search' => $query
    ], $timeoutSeconds, $headers, $strictTls);
    $teamQuery = normalize_text((string)($player['team'] ?? $player['clubTeam'] ?? $player['nationalTeam'] ?? ''));
    $positionQuery = map_position((string)($player['position'] ?? ''));
    $candidates = [];
    foreach ((array)($payload['response'] ?? []) as $row) {
        if (!is_array($row)) continue;
        $apiPlayer = (array)($row['player'] ?? []);
        $stats = array_values(array_filter((array)($row['statistics'] ?? []), 'is_array'));
        $stat = (array)($stats[0] ?? []);
        $team = (array)($stat['team'] ?? []);
        $games = (array)($stat['games'] ?? []);
        $name = (string)($apiPlayer['name'] ?? '');
        $score = identity_name_score($name, $query);
        $teamName = normalize_text((string)($team['name'] ?? ''));
        if ($teamQuery !== '' && $teamName !== '') $score += (int)round(identity_name_score($teamName, $teamQuery) * 0.28);
        $position = map_position((string)($games['position'] ?? $player['position'] ?? ''));
        if ($positionQuery !== 'MC' || !empty($player['position'])) {
            $match = position_matches($positionQuery, $position);
            $score += $match === 1 ? 12 : ($match === -1 ? -16 : 0);
        }
        if (!empty($apiPlayer['injured'])) $score -= 4;
        if ((int)($apiPlayer['id'] ?? 0) > 0 && (int)($team['id'] ?? 0) > 0) {
            $row['matchScore'] = $score;
            $candidates[] = $row;
        }
    }
    usort($candidates, static fn($a, $b) => (int)($b['matchScore'] ?? 0) <=> (int)($a['matchScore'] ?? 0));
    $best = $candidates[0] ?? null;
    return $best && (int)($best['matchScore'] ?? 0) >= 58 ? $best : null;
}

function api_football_recent_match_from_fixture(array $fixtureRow, int $playerId, int $teamId, int $timeoutSeconds, array $headers, bool $strictTls, string $dbDir): ?array
{
    $fixture = (array)($fixtureRow['fixture'] ?? []);
    $fixtureId = (int)($fixture['id'] ?? 0);
    if ($fixtureId <= 0) return null;
    $playersPayload = api_football_get_json('/fixtures/players', [
        'fixture' => $fixtureId,
        'team' => $teamId
    ], $timeoutSeconds, $headers, $strictTls);
    $playerStat = null;
    foreach ((array)($playersPayload['response'] ?? []) as $teamRow) {
        foreach ((array)($teamRow['players'] ?? []) as $entry) {
            if ((int)($entry['player']['id'] ?? 0) === $playerId) {
                $playerStat = $entry;
                break 2;
            }
        }
    }
    if (!is_array($playerStat)) return null;
    $statRows = array_values(array_filter((array)($playerStat['statistics'] ?? []), 'is_array'));
    $stat = (array)($statRows[0] ?? []);
    $games = (array)($stat['games'] ?? []);
    $minutes = isset($games['minutes']) && is_numeric($games['minutes']) ? (int)$games['minutes'] : 0;
    $lineupStatus = api_football_lineup_status($fixtureId, $playerId, $teamId, $timeoutSeconds, $headers, $strictTls, $dbDir);
    $substitute = $lineupStatus['known'] ? (bool)$lineupStatus['substitute'] : !empty($games['substitute']);
    $starter = $lineupStatus['known'] ? (bool)$lineupStatus['starter'] : (!$substitute && $minutes > 0);
    $rating = isset($games['rating']) && is_numeric($games['rating']) ? (float)$games['rating'] : null;
    $window = api_football_substitution_window($fixtureId, $playerId, $substitute, $minutes, $timeoutSeconds, $headers, $strictTls, $dbDir);
    $minuteIn = $window['minuteIn'];
    $minuteOut = $window['minuteOut'];

    $teams = (array)($fixtureRow['teams'] ?? []);
    $home = (array)($teams['home'] ?? []);
    $away = (array)($teams['away'] ?? []);
    $isHome = (int)($home['id'] ?? 0) === $teamId;
    $opponent = $isHome ? (string)($away['name'] ?? '') : (string)($home['name'] ?? '');
    return [
        'provider' => 'api-football',
        'eventId' => $fixtureId,
        'date' => !empty($fixture['date']) ? substr((string)$fixture['date'], 0, 10) : null,
        'opponent' => $opponent !== '' ? $opponent : null,
        'minutes' => $minutes,
        'minuteIn' => $minuteIn,
        'minuteOut' => $minuteOut,
        'minuteInLabel' => $window['minuteInLabel'],
        'minuteOutLabel' => $window['minuteOutLabel'],
        'minutesSource' => $window['source'],
        'starter' => $starter,
        'lineupSource' => $lineupStatus['source'],
        'played' => $minutes > 0,
        'rating' => $rating !== null ? round($rating, 2) : null,
        'points' => api_football_points_from_statistics($stat, $minutes, $rating)
    ];
}

function api_football_lineup_status(int $fixtureId, int $playerId, int $teamId, int $timeoutSeconds, array $headers, bool $strictTls, string $dbDir): array
{
    try {
        $payload = api_football_fixture_resource('lineups', $fixtureId, $timeoutSeconds, $headers, $strictTls, $dbDir);
    } catch (Throwable $error) {
        return ['known' => false, 'starter' => false, 'substitute' => false, 'source' => 'unavailable'];
    }
    foreach ((array)($payload['response'] ?? []) as $teamRow) {
        if (!is_array($teamRow)) continue;
        $team = (array)($teamRow['team'] ?? []);
        if ($teamId > 0 && (int)($team['id'] ?? 0) > 0 && (int)($team['id'] ?? 0) !== $teamId) continue;
        foreach ((array)($teamRow['startXI'] ?? []) as $entry) {
            if ((int)($entry['player']['id'] ?? 0) === $playerId) {
                return ['known' => true, 'starter' => true, 'substitute' => false, 'source' => 'api-football-lineups'];
            }
        }
        foreach ((array)($teamRow['substitutes'] ?? []) as $entry) {
            if ((int)($entry['player']['id'] ?? 0) === $playerId) {
                return ['known' => true, 'starter' => false, 'substitute' => true, 'source' => 'api-football-lineups'];
            }
        }
    }
    return ['known' => false, 'starter' => false, 'substitute' => false, 'source' => 'api-football-players'];
}

function api_football_fixture_resource(string $resource, int $fixtureId, int $timeoutSeconds, array $headers, bool $strictTls, string $dbDir): array
{
    $allowed = ['events', 'lineups'];
    if (!in_array($resource, $allowed, true)) throw new RuntimeException('Recurso API-Football no permitido');
    $cachePath = $dbDir . DIRECTORY_SEPARATOR . 'api-football-fixture-' . $resource . '-' . $fixtureId . '.json';
    $cached = read_json_file($cachePath, []);
    if (!empty($cached['fetchedAtTs']) && (int)$cached['fetchedAtTs'] > time() - 21600 && isset($cached['response'])) {
        return $cached;
    }
    $payload = api_football_get_json('/fixtures/' . $resource, ['fixture' => $fixtureId], $timeoutSeconds, $headers, $strictTls);
    $payload['fetchedAtTs'] = time();
    write_json_file($cachePath, $payload);
    return $payload;
}

function api_football_substitution_window(int $fixtureId, int $playerId, bool $substitute, int $minutes, int $timeoutSeconds, array $headers, bool $strictTls, string $dbDir): array
{
    $minuteIn = null;
    $minuteOut = null;
    $minuteInLabel = null;
    $minuteOutLabel = null;
    $source = 'api-football-events';
    try {
        $eventsPayload = api_football_fixture_resource('events', $fixtureId, $timeoutSeconds, $headers, $strictTls, $dbDir);
    } catch (Throwable $error) {
        $eventsPayload = ['response' => []];
        $source = 'estimated';
    }
    $events = [];
    foreach ((array)($eventsPayload['response'] ?? []) as $event) {
        if (!is_array($event)) continue;
        $type = normalize_text((string)($event['type'] ?? ''));
        $detail = normalize_text((string)($event['detail'] ?? ''));
        if (strpos($type . ' ' . $detail, 'subst') === false && strpos($type . ' ' . $detail, 'cambio') === false) continue;
        $elapsed = isset($event['time']['elapsed']) && is_numeric($event['time']['elapsed']) ? (int)$event['time']['elapsed'] : null;
        if ($elapsed === null) continue;
        $extra = isset($event['time']['extra']) && is_numeric($event['time']['extra']) ? (int)$event['time']['extra'] : 0;
        $mainId = (int)($event['player']['id'] ?? 0);
        $assistId = (int)($event['assist']['id'] ?? 0);
        if ($mainId !== $playerId && $assistId !== $playerId) continue;
        $events[] = [
            'elapsed' => $elapsed,
            'extra' => $extra,
            'sort' => $elapsed * 100 + $extra,
            'label' => api_football_minute_label($elapsed, $extra),
            'mainId' => $mainId,
            'assistId' => $assistId
        ];
    }
    usort($events, static fn($a, $b) => $a['sort'] <=> $b['sort']);
    foreach ($events as $event) {
        $isIncoming = $event['assistId'] === $playerId;
        $isOutgoing = $event['mainId'] === $playerId;
        if ($isIncoming && $minuteIn === null) {
            $minuteIn = $event['elapsed'];
            $minuteInLabel = $event['label'];
            continue;
        }
        if ($isOutgoing && $minuteOut === null) {
            $minuteOut = $event['elapsed'];
            $minuteOutLabel = $event['label'];
            continue;
        }
        if ($substitute && $minuteIn === null) {
            $minuteIn = $event['elapsed'];
            $minuteInLabel = $event['label'];
        } elseif ($minuteOut === null) {
            $minuteOut = $event['elapsed'];
            $minuteOutLabel = $event['label'];
        }
    }
    if ($minutes > 0 && $substitute && $minuteIn === null) {
        $minuteIn = max(1, 90 - $minutes);
        $minuteInLabel = (string)$minuteIn;
        $source = 'estimated';
    }
    if ($minutes > 0 && !$substitute && $minutes < 85 && $minuteOut === null) {
        $minuteOut = $minutes;
        $minuteOutLabel = (string)$minuteOut;
        $source = 'estimated';
    }
    return [
        'minuteIn' => $minuteIn,
        'minuteOut' => $minuteOut,
        'minuteInLabel' => $minuteInLabel,
        'minuteOutLabel' => $minuteOutLabel,
        'source' => $source
    ];
}

function api_football_minute_label(int $elapsed, int $extra = 0): string
{
    return $extra > 0 ? ($elapsed . '+' . $extra) : (string)$elapsed;
}

function api_football_points_from_statistics(array $stat, int $minutes, ?float $rating): array
{
    if ($minutes <= 0) return ['apiFootball' => 0, 'mixed' => 0, 'as' => 0, 'sofascore' => 0, 'stats' => 0];
    $goals = (int)($stat['goals']['total'] ?? 0);
    $assists = (int)($stat['goals']['assists'] ?? 0);
    $cards = (int)($stat['cards']['yellow'] ?? 0) + (int)($stat['cards']['red'] ?? 0) * 3;
    $base = $minutes >= 60 ? 3 : ($minutes >= 30 ? 2 : 1);
    $score = (int)round($base + (($rating ?? 6.0) - 6.0) * 4 + $goals * 3 + $assists * 2 - $cards);
    $score = max(-4, min(18, $score));
    return ['apiFootball' => $score, 'mixed' => $score, 'as' => $score, 'sofascore' => $score, 'stats' => $score];
}

function api_football_player_health(int $playerId, array $league, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    try {
        $payload = api_football_get_json('/injuries', [
            'player' => $playerId,
            'league' => (int)$league['id'],
            'season' => (int)$league['season']
        ], $timeoutSeconds, $headers, $strictTls);
    } catch (Throwable $error) {
        return ['status' => 'unknown', 'label' => 'Sin dato', 'detail' => null, 'expectedReturn' => null, 'medicalUrl' => null, 'injuryRisk' => null];
    }
    $rows = array_values(array_filter((array)($payload['response'] ?? []), 'is_array'));
    if (!$rows) return ['status' => 'unknown', 'label' => 'Sin dato', 'detail' => null, 'expectedReturn' => null, 'medicalUrl' => null, 'injuryRisk' => null];
    $row = $rows[0];
    $reason = (string)($row['player']['reason'] ?? $row['reason'] ?? 'Incidencia');
    return [
        'status' => preg_match('/suspend|sanction|card/i', $reason) ? 'suspended' : 'injured',
        'label' => preg_match('/suspend|sanction|card/i', $reason) ? 'Sancionado' : 'Lesionado',
        'detail' => $reason,
        'expectedReturn' => (string)($row['fixture']['date'] ?? ''),
        'medicalUrl' => null,
        'injuryRisk' => 'API-Football'
    ];
}

function thesportsdb_known_league(array $session): ?array
{
    $competition = normalize_text((string)($session['competition'] ?? ''));
    if ($competition === '') return null;
    $known = [
        '/world|mundial|selecc|copa del mundo/' => ['id' => 4429, 'name' => 'FIFA World Cup'],
        '/laliga|la liga|primera|ea sports/' => ['id' => 4335, 'name' => 'Spanish La Liga'],
        '/premier/' => ['id' => 4328, 'name' => 'English Premier League'],
        '/bundesliga/' => ['id' => 4331, 'name' => 'German Bundesliga'],
        '/serie a/' => ['id' => 4332, 'name' => 'Italian Serie A'],
        '/ligue 1|ligue-1/' => ['id' => 4334, 'name' => 'French Ligue 1'],
        '/champions/' => ['id' => 4480, 'name' => 'UEFA Champions League']
    ];
    foreach ($known as $pattern => $league) {
        if (preg_match($pattern, $competition)) return $league;
    }
    return null;
}

function fixture_competition_queries(array $session): array
{
    $competitionRaw = trim((string)($session['competition'] ?? ''));
    $competition = normalize_text($competitionRaw);
    $leagueName = trim((string)($session['leagueName'] ?? ''));
    $queries = [];
    if ($competition !== '') {
        if (preg_match('/world|mundial|selecc|copa del mundo/', $competition)) {
            $queries[] = 'FIFA World Cup';
            $queries[] = 'World Cup';
        } elseif (preg_match('/laliga|la liga|primera|ea sports/', $competition)) {
            $queries[] = 'Spanish La Liga';
            $queries[] = 'La Liga';
            $queries[] = 'LaLiga';
        } elseif (preg_match('/premier/', $competition)) {
            $queries[] = 'Premier League';
        } elseif (preg_match('/champions/', $competition)) {
            $queries[] = 'UEFA Champions League';
        } elseif (preg_match('/europa league/', $competition)) {
            $queries[] = 'UEFA Europa League';
        } elseif (preg_match('/conference/', $competition)) {
            $queries[] = 'UEFA Europa Conference League';
        } elseif (preg_match('/bundesliga/', $competition)) {
            $queries[] = 'German Bundesliga';
            $queries[] = 'Bundesliga';
        } elseif (preg_match('/serie a/', $competition)) {
            $queries[] = 'Italian Serie A';
            $queries[] = 'Serie A';
        } elseif (preg_match('/ligue 1|ligue-1/', $competition)) {
            $queries[] = 'French Ligue 1';
            $queries[] = 'Ligue 1';
        } elseif (preg_match('/eredivisie/', $competition)) {
            $queries[] = 'Dutch Eredivisie';
            $queries[] = 'Eredivisie';
        } elseif (preg_match('/copa del rey/', $competition)) {
            $queries[] = 'Copa del Rey';
        } elseif (preg_match('/supercopa/', $competition)) {
            $queries[] = 'Supercopa de Espana';
        }
        $queries[] = $competitionRaw;
    }
    if (!$queries && $leagueName !== '') {
        $queries[] = preg_replace('/\s*[-·].*$/u', '', $leagueName) ?: $leagueName;
        $queries[] = $leagueName;
    }
    $queries = array_values(array_unique(array_filter(array_map('trim', $queries))));
    return $queries;
}

function fixture_competition_match_score(string $competitionLabel, array $queries): int
{
    $label = normalize_text($competitionLabel);
    if ($label !== '') {
        foreach ($queries as $query) {
            $queryNorm = normalize_text($query);
            if ($queryNorm === '') continue;
            if (preg_match('/world|mundial/', $queryNorm) && preg_match('/mundial|world/', $label)) return 100;
            if (preg_match('/laliga|la liga|primera/', $queryNorm) && preg_match('/liga|primera/', $label)) return 100;
            if (preg_match('/champions/', $queryNorm) && preg_match('/champions/', $label)) return 100;
            if (preg_match('/premier/', $queryNorm) && preg_match('/premier/', $label)) return 100;
            if (preg_match('/bundesliga/', $queryNorm) && preg_match('/bundesliga/', $label)) return 100;
            if (preg_match('/serie a/', $queryNorm) && preg_match('/serie a/', $label)) return 100;
            if (preg_match('/ligue 1/', $queryNorm) && preg_match('/ligue 1/', $label)) return 100;
        }
    }
    $best = 0;
    foreach ($queries as $query) {
        $best = max($best, identity_name_score($competitionLabel, $query));
    }
    return $best;
}

function thesportsdb_event_timestamp(array $event): int
{
    $date = trim((string)($event['dateEvent'] ?? ''));
    if ($date === '') return time();
    $time = trim((string)($event['strTime'] ?? '12:00:00'));
    $utc = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $date . ' ' . $time, new DateTimeZone('UTC'));
    if (!$utc) {
        $utc = DateTimeImmutable::createFromFormat('Y-m-d H:i', $date . ' ' . preg_replace('/:\d{2}$/', '', $time), new DateTimeZone('UTC'));
    }
    return $utc ? $utc->getTimestamp() : strtotime($date . ' ' . $time);
}

function merge_fixture_payloads(array $primary, array $fallback): array
{
    $merged = [];
    foreach (array_merge((array)($primary['events'] ?? []), (array)($fallback['events'] ?? [])) as $event) {
        if (!is_array($event)) continue;
        $home = normalize_text((string)($event['home']['name'] ?? ''));
        $away = normalize_text((string)($event['away']['name'] ?? ''));
        $timestamp = (int)($event['timestamp'] ?? 0);
        $bucket = $timestamp > 0 ? gmdate('YmdHi', $timestamp) : '0';
        $key = $home . '|' . $away . '|' . $bucket;
        if (!isset($merged[$key])) {
            $merged[$key] = $event;
            continue;
        }
        $existing = $merged[$key];
        $merged[$key] = [
            'id' => $existing['id'] ?? $event['id'] ?? $key,
            'timestamp' => (int)($existing['timestamp'] ?? $event['timestamp'] ?? time()),
            'status' => (string)($existing['status'] ?? $event['status'] ?? 'notstarted'),
            'statusText' => (string)(($existing['statusText'] ?? '') !== '' ? $existing['statusText'] : ($event['statusText'] ?? '')),
            'home' => [
                'name' => (string)($existing['home']['name'] ?? $event['home']['name'] ?? 'Local'),
                'image' => $existing['home']['image'] ?? $event['home']['image'] ?? null
            ],
            'away' => [
                'name' => (string)($existing['away']['name'] ?? $event['away']['name'] ?? 'Visitante'),
                'image' => $existing['away']['image'] ?? $event['away']['image'] ?? null
            ],
            'homeScore' => $existing['homeScore'] ?? $event['homeScore'] ?? null,
            'awayScore' => $existing['awayScore'] ?? $event['awayScore'] ?? null,
            'sofascoreUrl' => $existing['sofascoreUrl'] ?? $event['sofascoreUrl'] ?? null,
            'detailUrl' => $existing['detailUrl'] ?? $event['detailUrl'] ?? null,
            'videoUrl' => $existing['videoUrl'] ?? $event['videoUrl'] ?? null,
            'round' => $existing['round'] ?? $event['round'] ?? null
        ];
    }
    $events = array_values($merged);
    usort($events, static fn($a, $b) => (int)($a['timestamp'] ?? 0) <=> (int)($b['timestamp'] ?? 0));
    return [
        'ok' => true,
        'competition' => (string)($primary['competition'] ?? $fallback['competition'] ?? ''),
        'round' => (string)($primary['round'] ?? $fallback['round'] ?? 'actual'),
        'events' => $events,
        'cacheStatus' => (string)($primary['cacheStatus'] ?? 'merged') . '+merge'
    ];
}

function scorebat_attach_highlights(array $fixtures, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $token = scorebat_token();
    if ($token === '') {
        $fixtures['scorebatStatus'] = 'disabled-no-token';
        return $fixtures;
    }
    try {
        $payload = http_get_json('https://www.scorebat.com/video-api/v3/free-feed/?token=' . rawurlencode($token), $timeoutSeconds, $headers, $strictTls);
        $videos = (array)($payload['response'] ?? []);
        foreach ($fixtures['events'] as &$event) {
            foreach ($videos as $video) {
                if (!is_array($video)) continue;
                if (scorebat_video_matches_fixture($video, $event)) {
                    $embedUrl = scorebat_extract_embed_url($video);
                    $pageUrl = (string)($video['matchviewUrl'] ?? $video['competitionUrl'] ?? '');
                    $event['videoEmbedUrl'] = $embedUrl;
                    $event['videoUrl'] = $embedUrl !== '' ? $embedUrl : $pageUrl;
                    $event['videoPageUrl'] = $pageUrl;
                    $event['videoTitle'] = (string)($video['title'] ?? '');
                    break;
                }
            }
        }
        unset($event);
        $fixtures['scorebatStatus'] = 'ready';
    } catch (Throwable $error) {
        $fixtures['scorebatStatus'] = 'error: ' . $error->getMessage();
    }
    return $fixtures;
}

function scorebat_extract_embed_url(array $video): string
{
    foreach (['embedUrl', 'embedURL'] as $key) {
        if (!empty($video[$key]) && is_string($video[$key])) return (string)$video[$key];
    }
    foreach ([$video['embed'] ?? null, $video['videos'][0]['embed'] ?? null] as $embedHtml) {
        if (!is_string($embedHtml) || $embedHtml === '') continue;
        if (preg_match('~src=["\']([^"\']+)["\']~i', $embedHtml, $match)) {
            return html_entity_decode((string)$match[1], ENT_QUOTES);
        }
    }
    if (!empty($video['videos']) && is_array($video['videos'])) {
        foreach ($video['videos'] as $clip) {
            if (!is_array($clip)) continue;
            if (!empty($clip['embedUrl']) && is_string($clip['embedUrl'])) return (string)$clip['embedUrl'];
            if (!empty($clip['embed']) && is_string($clip['embed']) && preg_match('~src=["\']([^"\']+)["\']~i', $clip['embed'], $match)) {
                return html_entity_decode((string)$match[1], ENT_QUOTES);
            }
        }
    }
    return '';
}

function scorebat_token(): string
{
    global $scorebatKeyPath;
    $envKey = trim((string)getenv('FMS_SCOREBAT_TOKEN'));
    if ($envKey !== '') return $envKey;
    if (is_file($scorebatKeyPath)) {
        $fileKey = trim((string)@file_get_contents($scorebatKeyPath));
        if ($fileKey !== '') return $fileKey;
    }
    return '';
}

function scorebat_team_name(string $name): string
{
    $normalized = normalize_text($name);
    $aliases = [
        'alemania' => 'germany',
        'belgica' => 'belgium',
        'brasil' => 'brazil',
        'corea del sur' => 'south korea',
        'costa de marfil' => 'ivory coast',
        'curazao' => 'curacao',
        'egipto' => 'egypt',
        'espana' => 'spain',
        'estados unidos' => 'usa',
        'francia' => 'france',
        'inglaterra' => 'england',
        'japon' => 'japan',
        'nueva zelanda' => 'new zealand',
        'paises bajos' => 'netherlands',
        'portugal' => 'portugal',
        'tunez' => 'tunisia'
    ];
    return $aliases[$normalized] ?? $normalized;
}

function scorebat_video_matches_fixture(array $video, array $event): bool
{
    $title = (string)($video['title'] ?? '');
    $parts = preg_split('/\s+-\s+/', $title, 2) ?: [];
    if (count($parts) < 2) return false;
    $home = scorebat_team_name((string)($event['home']['name'] ?? ''));
    $away = scorebat_team_name((string)($event['away']['name'] ?? ''));
    $videoHome = scorebat_team_name((string)$parts[0]);
    $videoAway = scorebat_team_name((string)$parts[1]);
    if ($home === '' || $away === '') return false;
    $direct = identity_name_score($videoHome, $home) >= 70 && identity_name_score($videoAway, $away) >= 70;
    $reverse = identity_name_score($videoHome, $away) >= 70 && identity_name_score($videoAway, $home) >= 70;
    return $direct || $reverse;
}

function identity_name_score(string $candidate, string $query): int
{
    $candidate = normalize_text($candidate);
    $query = normalize_text($query);
    if ($candidate === '' || $query === '') return 0;
    if ($candidate === $query) return 100;
    if (strpos($candidate, $query) !== false || strpos($query, $candidate) !== false) return 75;
    similar_text($candidate, $query, $percent);
    return (int)round($percent);
}

function biwenger_collect_clause_entries(array $node, array &$clauses, int $depth = 0): void
{
    if ($depth > 7) return;
    $playerValue = $node['player'] ?? null;
    $playerId = is_array($playerValue) ? (int)($playerValue['id'] ?? 0) : (int)($node['playerID'] ?? $node['playerId'] ?? (is_numeric($playerValue) ? $playerValue : 0));
    $amount = $node['clause'] ?? $node['amount'] ?? $node['price'] ?? null;
    if ($playerId > 0 && is_numeric($amount) && (int)$amount > 0) {
        $clauses[$playerId] = (int)$amount;
    }
    foreach ($node as $child) {
        if (is_array($child)) biwenger_collect_clause_entries($child, $clauses, $depth + 1);
    }
}

function biwenger_offer_player_ids(array $offer, int $inheritedPlayerId = 0): array
{
    $ids = [];
    $append = static function ($value) use (&$ids): void {
        if (is_numeric($value)) {
            $id = (int)$value;
            if ($id > 0) $ids[$id] = true;
            return;
        }
        if (!is_array($value)) return;
        foreach (['id', 'playerID', 'playerId', 'player_id'] as $idKey) {
            if (isset($value[$idKey]) && is_numeric($value[$idKey])) {
                $id = (int)$value[$idKey];
                if ($id > 0) $ids[$id] = true;
                return;
            }
        }
        foreach ($value as $key => $item) {
            if (is_numeric($key) && !is_array($item) && !is_numeric($item)) {
                $id = (int)$key;
                if ($id > 0) $ids[$id] = true;
                continue;
            }
            if (is_numeric($item)) {
                $id = (int)$item;
                if ($id > 0) $ids[$id] = true;
                continue;
            }
            if (is_array($item)) {
                foreach (['id', 'playerID', 'playerId', 'player_id'] as $idKey) {
                    if (!isset($item[$idKey]) || !is_numeric($item[$idKey])) continue;
                    $id = (int)$item[$idKey];
                    if ($id > 0) $ids[$id] = true;
                    break;
                }
            }
        }
    };
    foreach ([
        'requestedPlayers', 'requestedPlayerIDs', 'requestedPlayerIds',
        'offeredPlayers', 'offeredPlayerIDs', 'offeredPlayerIds', 'players',
        'player', 'requestedPlayer', 'offeredPlayer',
        'playerID', 'playerId', 'player_id',
        'requestedPlayerID', 'requestedPlayerId', 'offeredPlayerID', 'offeredPlayerId'
    ] as $key) {
        if (array_key_exists($key, $offer)) $append($offer[$key]);
    }
    if (!$ids && $inheritedPlayerId > 0) $ids[$inheritedPlayerId] = true;
    return array_map('intval', array_keys($ids));
}

function biwenger_collect_offer_entries(array $node, array &$offers, string $source, int $depth = 0, int $inheritedPlayerId = 0): void
{
    if ($depth > 10) return;
    $hasParties = isset($node['from']) || isset($node['to']) || isset($node['fromID']) || isset($node['fromId'])
        || isset($node['toID']) || isset($node['toId']) || isset($node['userID']) || isset($node['userId'])
        || isset($node['ownerID']) || isset($node['ownerId']) || isset($node['buyerID']) || isset($node['buyerId'])
        || isset($node['sellerID']) || isset($node['sellerId']) || isset($node['bidderID']) || isset($node['bidderId']);
    $hasPlayers = !empty(biwenger_offer_player_ids($node, $inheritedPlayerId));
    $hasMoney = isset($node['amount']) || isset($node['price']) || isset($node['money']) || isset($node['cash'])
        || isset($node['offeredMoney']) || isset($node['requestedMoney']) || isset($node['offeredAmount'])
        || isset($node['requestedAmount']) || isset($node['bid']);
    $hasOfferShape = (isset($node['id']) || ($inheritedPlayerId > 0 && preg_match('/offer|bid|puja/i', $source)))
        && $hasMoney
        && ($hasPlayers || $hasParties || $inheritedPlayerId > 0)
        && ($hasParties || isset($node['type']) || isset($node['status'])
            || ($inheritedPlayerId > 0 && preg_match('/offer|bid|puja/i', $source)));
    if ($hasOfferShape) {
        if (!$hasPlayers && $inheritedPlayerId > 0) $node['requestedPlayerIDs'] = [$inheritedPlayerId];
        $node['_source'] = $source;
        if (preg_match('/incoming|received|recib/i', $source)) $node['_direction'] = 'incoming';
        if (preg_match('/outgoing|sent|enviad/i', $source)) $node['_direction'] = 'outgoing';
        $offers[] = $node;
        return;
    }
    foreach ($node as $key => $child) {
        if (is_array($child)) {
            if (!isset($child['id']) && is_numeric($key)) $child['id'] = (int)$key;
            $nextPlayerId = $inheritedPlayerId;
            if (preg_match('/(?:^|:)players?$/i', $source) && is_numeric($key) && isset($child['id']) && is_numeric($child['id'])) {
                $nextPlayerId = (int)$child['id'];
            }
            biwenger_collect_offer_entries($child, $offers, $source . ':' . (string)$key, $depth + 1, $nextPlayerId);
        }
    }
}

function biwenger_timestamp_seconds($value): int
{
    if ($value === null || $value === '') return 0;
    if (is_string($value) && !is_numeric($value)) {
        $parsed = strtotime($value);
        return $parsed === false ? 0 : (int)$parsed;
    }
    if (!is_numeric($value)) return 0;
    $timestamp = (int)$value;
    if ($timestamp > 100000000000) return (int)floor($timestamp / 1000);
    return $timestamp;
}

function biwenger_offer_expiry_ts(array $offer): int
{
    foreach (['until', 'expires', 'expiresAt', 'expireAt', 'expiration', 'expirationDate', 'validUntil', 'validUntilDate'] as $key) {
        $timestamp = biwenger_timestamp_seconds($offer[$key] ?? null);
        if ($timestamp > 0) return $timestamp;
    }
    return 0;
}

function biwenger_offer_timestamp_ts(array $offer): int
{
    foreach (['updated', 'updatedAt', 'updateDate', 'created', 'createdAt', 'date', 'time', 'timestamp'] as $key) {
        $timestamp = biwenger_timestamp_seconds($offer[$key] ?? null);
        if ($timestamp > 0) return $timestamp;
    }
    return 0;
}

function biwenger_offer_is_active(array $offer): bool
{
    $status = strtolower(trim((string)($offer['status'] ?? '')));
    if ($status !== 'waiting') return false;
    $until = biwenger_offer_expiry_ts($offer);
    if ($until > 0 && $until < time()) return false;
    $timestamp = biwenger_offer_timestamp_ts($offer);
    if ($timestamp > 0 && $timestamp < time() - 3 * 24 * 60 * 60) return false;
    return true;
}

function biwenger_normalized_offer_rank(array $offer): int
{
    $source = strtolower((string)($offer['source'] ?? ''));
    $sourceScore = preg_match('/own-check|outgoing|sent/', $source)
        ? 3000000000000
        : (preg_match('/owner|user/', $source) ? 2000000000000 : 1000000000000);
    return $sourceScore
        + max(0, (int)($offer['expiresTs'] ?? 0)) * 1000
        + max(0, (int)($offer['timestampTs'] ?? 0))
        + max(0, (int)($offer['offerId'] ?? 0));
}

function biwenger_extract_sale_bid_count(array $sale): ?int
{
    $detail = biwenger_extract_sale_bid_count_detail($sale);
    return $detail['count'];
}

function biwenger_extract_sale_bid_count_detail(array $sale, string $path = 'sale', int $depth = 0): array
{
    $keys = array_keys($sale);
    if ($sale && $keys === range(0, count($sale) - 1)) {
        return ['count' => count($sale), 'source' => $path . '[]'];
    }
    $directKeys = [
        'bidCount', 'bidsCount', 'offerCount', 'offersCount', 'totalBids', 'totalOffers',
        'numberOfBids', 'numberOfOffers', 'numBids', 'numOffers', 'bidsNumber',
        'offersNumber', 'counter', 'count', 'total'
    ];
    foreach ($directKeys as $key) {
        if (array_key_exists($key, $sale) && is_numeric($sale[$key])) {
            return ['count' => max(0, (int)$sale[$key]), 'source' => $path . '.' . $key];
        }
    }
    foreach (['bids', 'offers', 'bidOffers', 'marketBids'] as $key) {
        if (is_array($sale[$key] ?? null)) {
            return ['count' => count($sale[$key]), 'source' => $path . '.' . $key . '[]'];
        }
    }
    if ($depth >= 5) return ['count' => null, 'source' => null];
    foreach ($sale as $key => $value) {
        if (!is_array($value)) continue;
        $normalizedKey = strtolower((string)$key);
        if (!preg_match('/bid|offer|puja|market|sale|status|summary|meta|count|total/', $normalizedKey)) continue;
        $nested = biwenger_extract_sale_bid_count_detail($value, $path . '.' . (string)$key, $depth + 1);
        if ($nested['count'] !== null) return $nested;
    }
    return ['count' => null, 'source' => null];
}

function biwenger_visible_bid_count(array $session, int $playerId, int $ownerId, int $timeoutSeconds, array $headers, bool $strictTls): ?int
{
    $detail = biwenger_visible_bid_count_detail($session, $playerId, $ownerId, $timeoutSeconds, $headers, $strictTls);
    return $detail['count'];
}

function biwenger_visible_bid_count_detail(array $session, int $playerId, int $ownerId, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    if ($playerId <= 0) return ['count' => null, 'source' => null, 'error' => 'Jugador no valido'];
    $payload = ['player' => $playerId];
    if ($ownerId > 0) $payload['user'] = $ownerId;
    $requests = [
        ['POST', 'https://biwenger.as.com/api/v2/market/bids', $payload]
    ];
    $lastError = null;
    foreach ($requests as $request) {
        [$method, $url, $payload] = $request;
        try {
            $result = biwenger_private_request_json(
                $method,
                $url,
                $session,
                min($timeoutSeconds, 5),
                $headers,
                $strictTls,
                $payload
            );
            $data = is_array($result['data'] ?? null) ? $result['data'] : $result;
            if (is_numeric($data)) {
                return ['count' => max(0, (int)$data), 'source' => strtolower($method) . ':numeric', 'error' => null];
            }
            if (is_array($data)) {
                $detail = biwenger_extract_sale_bid_count_detail($data, strtolower($method) . ':market/bids');
                if ($detail['count'] !== null) return $detail + ['error' => null];
            }
        } catch (Throwable $error) {
            $lastError = $error->getMessage();
        }
    }
    return ['count' => null, 'source' => null, 'error' => $lastError];
}

function biwenger_collect_own_market_offers(array $market, array &$offers): void
{
    foreach (biwenger_market_entries($market) as $sale) {
        if (!is_array($sale)) continue;
        $playerEntry = is_array($sale['player'] ?? null) ? $sale['player'] : ['id' => (int)($sale['playerID'] ?? 0)];
        $playerId = (int)($playerEntry['id'] ?? $sale['playerID'] ?? 0);
        $ownerId = (int)($sale['user']['id'] ?? $sale['userID'] ?? 0);
        if ($playerId <= 0 || $ownerId <= 0) continue;
        foreach ($sale as $key => $value) {
            if (!preg_match('/offer|bid|puja/i', (string)$key)) continue;
            if (is_numeric($value) && (int)$value > 1 && !preg_match('/count|total|number|status/i', (string)$key)) {
                $offers[] = [
                    'id' => 0,
                    'amount' => (int)$value,
                    'requestedPlayerIDs' => [$playerId],
                    'to' => $ownerId,
                    '_direction' => 'outgoing',
                    '_source' => 'market-sale:' . (string)$key,
                    '_marketPlayer' => $playerEntry
                ];
                continue;
            }
            if (!is_array($value)) continue;
            $candidates = [];
            biwenger_collect_offer_entries($value, $candidates, 'market-sale:' . (string)$key, 0, $playerId);
            foreach ($candidates as $candidate) {
                if (!is_array($candidate)) continue;
                $candidate['_direction'] = 'outgoing';
                $candidate['_source'] = 'market-sale:' . (string)$key;
                $candidate['to'] = $candidate['to'] ?? $ownerId;
                $candidate['requestedPlayerIDs'] = $candidate['requestedPlayerIDs'] ?? [$playerId];
                $candidate['_marketPlayer'] = $playerEntry;
                $offers[] = $candidate;
            }
        }
    }
}

function biwenger_entity_name($value, string $fallback = ''): string
{
    if (is_array($value)) return (string)($value['name'] ?? $fallback);
    return is_string($value) ? $value : $fallback;
}

function biwenger_entity_id($value, int $fallback = 0): int
{
    if (is_array($value)) return (int)($value['id'] ?? $value['userID'] ?? $value['userId'] ?? $fallback);
    return $fallback;
}

function biwenger_is_market_actor(string $name, int $id = 0): bool
{
    $normalized = normalize_text($name);
    if ($normalized === '') return true;
    return (bool)preg_match('/biwenger|mercado|market|sistema|computer/', $normalized);
}

function biwenger_activity_actor_payload($value, string $fallbackName = '', int $fallbackId = 0): array
{
    $entity = is_array($value) ? $value : [];
    $name = biwenger_entity_name($value, $fallbackName);
    $id = biwenger_entity_id($value, $fallbackId);
    $icon = $entity ? biwenger_user_icon($entity, [], $id) : biwenger_default_user_icon();
    return [
        'id' => $id,
        'userId' => $id,
        'name' => $name,
        'icon' => $icon,
        'isMarket' => biwenger_is_market_actor($name, $id)
    ];
}

function biwenger_activity_player_payload(int $playerId, array $entry, array $catalog): array
{
    $player = (array)($catalog['playersById'][$playerId] ?? []);
    $playerValue = is_array($entry['player'] ?? null) ? (array)$entry['player'] : [];
    $player = array_merge($player, $playerValue);
    $teamId = (int)($player['teamID'] ?? ($player['team']['id'] ?? 0));
    $team = is_array($player['team'] ?? null) ? $player['team'] : (($catalog['teamsById'][$teamId] ?? null) ?: []);
    $teamName = (string)($team['name'] ?? $player['teamName'] ?? '');
    $playerImage = biwenger_media_url($player, ['photo', 'image', 'avatar', 'picture', 'img', 'portrait', 'iconHero', 'icon'])
        ?? ($playerId > 0 ? 'https://cdn.biwenger.com/i/p/' . $playerId . '.png' : null);
    $teamImage = biwenger_media_url($team, ['shield', 'badge', 'logo', 'image', 'flag', 'crest', 'photo', 'icon'])
        ?? ($teamId > 0 ? 'https://cdn.biwenger.com/i/t/' . $teamId . '.png' : null);
    $fitness = array_values(array_filter((array)($player['fitness'] ?? []), 'is_numeric'));
    $points = (int)($player['points'] ?? 0);
    $position = biwenger_position((int)($player['position'] ?? 3));
    return [
        'id' => $playerId,
        'biwengerPlayerId' => $playerId,
        'name' => (string)($player['name'] ?? $entry['playerName'] ?? 'Jugador'),
        'team' => $teamName,
        'position' => $position,
        'price' => biwenger_money_int($player['price'] ?? $entry['amount'] ?? $entry['price'] ?? 0),
        'biwengerValue' => biwenger_money_int($player['price'] ?? 0),
        'competitionPoints' => $points,
        'points' => $points,
        'media' => [
            'playerImage' => $playerImage,
            'emblemImage' => $teamImage,
            'emblemKind' => 'club'
        ],
        'sourceSummary' => [
            'recentMatches' => biwenger_recent_matches_from_fitness($fitness)
        ]
    ];
}

function biwenger_activity_message(string $type, string $playerName, array $fromActor, array $toActor, int $amount): array
{
    $money = $amount > 0 ? ' por ' . number_format($amount, 0, ',', '.') . ' €' : '';
    $from = trim((string)($fromActor['name'] ?? ''));
    $to = trim((string)($toActor['name'] ?? ''));
    $fromIsMarket = !empty($fromActor['isMarket']);
    $toIsMarket = !empty($toActor['isMarket']);
    if ($type === 'market') {
        $seller = !$fromIsMarket && $from !== '' ? $from : (!$toIsMarket && $to !== '' ? $to : 'Un usuario');
        return ['direction' => 'listed', 'message' => $seller . ' ha puesto a ' . $playerName . ' en venta' . $money];
    }
    if ($type === 'clause') {
        $buyer = !$toIsMarket && $to !== '' ? $to : 'Un rival';
        return ['direction' => 'clause', 'message' => $buyer . ' ha pagado la cláusula de ' . $playerName . $money];
    }
    if (!$fromIsMarket && $from !== '' && $toIsMarket) {
        return ['direction' => 'sold-to-market', 'message' => $from . ' ha vendido a ' . $playerName . ' al mercado' . $money];
    }
    if ($fromIsMarket && !$toIsMarket && $to !== '') {
        return ['direction' => 'bought-from-market', 'message' => $to . ' ha fichado a ' . $playerName . ' del mercado' . $money];
    }
    if (!$fromIsMarket && !$toIsMarket && $from !== '' && $to !== '') {
        return ['direction' => 'transfer', 'message' => $to . ' ha fichado a ' . $playerName . ' de ' . $from . $money];
    }
    if ($to !== '') {
        return ['direction' => 'bought', 'message' => $to . ' ha fichado a ' . $playerName . $money];
    }
    if ($from !== '') {
        return ['direction' => 'sold', 'message' => $from . ' ha vendido a ' . $playerName . $money];
    }
    return ['direction' => $type !== '' ? $type : 'activity', 'message' => 'Movimiento de mercado: ' . $playerName . $money];
}

function biwenger_activity_rows(array $board, array $catalog): array
{
    $rows = [];
    foreach ($board as $day) {
        if (!is_array($day)) continue;
        $date = $day['date'] ?? null;
        $content = is_array($day['content'] ?? null) ? $day['content'] : [$day];
        foreach ($content as $entry) {
            if (!is_array($entry)) continue;
            $playerValue = $entry['player'] ?? null;
            $playerId = is_array($playerValue)
                ? (int)($playerValue['id'] ?? 0)
                : (int)($entry['playerID'] ?? (is_numeric($playerValue) ? $playerValue : 0));
            $player = (array)($catalog['playersById'][$playerId] ?? []);
            $type = strtolower((string)($entry['type'] ?? 'transfer'));
            $fromValue = $entry['from'] ?? ($entry['seller'] ?? null);
            $toValue = $entry['to'] ?? ($entry['buyer'] ?? ($entry['user'] ?? null));
            $fromActor = biwenger_activity_actor_payload(
                $fromValue,
                (string)($entry['fromName'] ?? $entry['sellerName'] ?? ''),
                (int)($entry['fromID'] ?? $entry['fromId'] ?? $entry['sellerID'] ?? $entry['sellerId'] ?? 0)
            );
            $toActor = biwenger_activity_actor_payload(
                $toValue,
                (string)($entry['toName'] ?? $entry['buyerName'] ?? $entry['userName'] ?? ''),
                (int)($entry['toID'] ?? $entry['toId'] ?? $entry['buyerID'] ?? $entry['buyerId'] ?? $entry['userID'] ?? $entry['userId'] ?? 0)
            );
            $from = (string)($fromActor['name'] ?? '');
            $to = (string)($toActor['name'] ?? '');
            $amount = (int)($entry['amount'] ?? $entry['price'] ?? 0);
            $playerName = (string)($player['name'] ?? $entry['playerName'] ?? 'Jugador');
            $exactMessage = trim((string)($entry['text'] ?? $entry['message'] ?? $entry['title'] ?? ''));
            if (mb_strlen($exactMessage) > 12) {
                $message = $exactMessage;
            } elseif ($type === 'market') {
                $message = ($to !== '' ? $to . ' pone a ' : '') . $playerName . ' en el mercado' . ($amount > 0 ? ' por ' . number_format($amount, 0, ',', '.') . ' €' : '');
            } elseif ($type === 'clause') {
                $message = ($to !== '' ? $to : 'Un rival') . ' ha pagado la clausula de ' . $playerName . ($amount > 0 ? ' por ' . number_format($amount, 0, ',', '.') . ' €' : '');
            } elseif ($type === 'transfer' || $type === 'purchase') {
                $message = trim(($to !== '' ? $to : 'Un usuario') . ' ficha a ' . $playerName . ($from !== '' ? ' de ' . $from : '') . ($amount > 0 ? ' por ' . number_format($amount, 0, ',', '.') . ' €' : ''));
            } else {
                $message = (string)($entry['text'] ?? $entry['message'] ?? $entry['title'] ?? ucfirst($type) . ': ' . $playerName);
            }
            $interpreted = biwenger_activity_message($type, $playerName, $fromActor, $toActor, $amount);
            $direction = (string)($interpreted['direction'] ?? $type);
            if (in_array($type, ['market', 'clause', 'transfer', 'purchase'], true)) {
                $message = (string)$interpreted['message'];
            }
            $actor = !empty($toActor['isMarket']) && empty($fromActor['isMarket']) ? $fromActor : $toActor;
            $rows[] = [
                'type' => $type,
                'direction' => $direction,
                'date' => $date,
                'message' => $message,
                'playerId' => $playerId,
                'playerName' => $playerName,
                'amount' => $amount,
                'from' => $fromActor,
                'to' => $toActor,
                'actor' => $actor,
                'player' => biwenger_activity_player_payload($playerId, $entry, $catalog)
            ];
        }
    }
    return array_slice($rows, 0, 40);
}

function biwenger_operations_center(array $session, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $userId = (int)($session['userId'] ?? 0);
    $marketResponse = biwenger_private_get_json('https://biwenger.as.com/api/v2/market', $session, $timeoutSeconds, $headers, $strictTls);
    $market = is_array($marketResponse['data'] ?? null) ? $marketResponse['data'] : $marketResponse;
    $offers = [];
    $ownedPlayerIds = [];
    try {
        $ownerResponse = biwenger_private_get_json(
            'https://biwenger.as.com/api/v2/user/' . $userId . '?fields=id,players(id),offers(*)',
            $session,
            $timeoutSeconds,
            $headers,
            $strictTls
        );
        $ownerData = is_array($ownerResponse['data'] ?? null) ? $ownerResponse['data'] : $ownerResponse;
        if (is_array($ownerData['user'] ?? null)) $ownerData = array_merge($ownerData, $ownerData['user']);
        foreach ((array)($ownerData['players'] ?? []) as $ownedPlayer) {
            $ownedId = is_array($ownedPlayer) ? (int)($ownedPlayer['id'] ?? 0) : (int)$ownedPlayer;
            if ($ownedId > 0) $ownedPlayerIds[$ownedId] = true;
        }
        biwenger_collect_offer_entries((array)$ownerData, $offers, 'owner');
    } catch (Throwable $error) {
        // Continue with the other offer endpoints.
    }
    $offerSources = [];
    $offerUrls = [
        'https://biwenger.as.com/api/v2/user?fields=*,market(*,-userID),offers(*),-trophies',
        'https://biwenger.as.com/api/v2/user?fields=*,market(*,-userID),offers,-trophies',
        'https://biwenger.as.com/api/v2/user/' . $userId . '?fields=*,market,offers(*)',
        'https://biwenger.as.com/api/v2/user/' . $userId . '?fields=*,market,offers',
        'https://biwenger.as.com/api/v2/offers'
    ];
    foreach ($offerUrls as $offerUrl) {
        try {
            $userResponse = biwenger_private_get_json($offerUrl, $session, $timeoutSeconds, $headers, $strictTls);
            $userData = is_array($userResponse['data'] ?? null) ? $userResponse['data'] : $userResponse;
            $rootUser = is_array($userData['user'] ?? null) ? array_merge($userData, $userData['user']) : $userData;
            foreach ((array)($rootUser['players'] ?? []) as $ownedPlayer) {
                $ownedId = is_array($ownedPlayer) ? (int)($ownedPlayer['id'] ?? 0) : (int)$ownedPlayer;
                if ($ownedId > 0) $ownedPlayerIds[$ownedId] = true;
            }
            $candidateOffers = [];
            // Biwenger may return offers at root or split into received/sent collections.
            $candidateSource = preg_match('~/offers/?$~', $offerUrl) ? 'outgoing' : 'user';
            biwenger_collect_offer_entries((array)$userData, $candidateOffers, $candidateSource);
            $candidateOffers = array_values(array_filter($candidateOffers, static fn($offer) => is_array($offer)));
            if ($candidateOffers) {
                $offers = array_merge($offers, $candidateOffers);
                $offerSources[] = $offerUrl;
            }
        } catch (Throwable $error) {
            continue;
        }
    }
    biwenger_collect_offer_entries((array)($market['offers'] ?? []), $offers, 'market');
    biwenger_collect_own_market_offers($market, $offers);

    $catalog = biwenger_fetch_competition_catalog((string)($session['competition'] ?? ''), $timeoutSeconds, $headers, $strictTls, (int)($session['scoreId'] ?? 2));
    $marketOwners = [];
    foreach (biwenger_market_entries($market) as $sale) {
        if (!is_array($sale)) continue;
        $salePlayerId = (int)($sale['player']['id'] ?? $sale['playerID'] ?? 0);
        $saleOwnerId = (int)($sale['user']['id'] ?? $sale['userID'] ?? 0);
        if ($salePlayerId > 0) $marketOwners[$salePlayerId] = $saleOwnerId;
    }
    $normalizedOffers = [];
    $seenOffers = [];
    foreach ($offers as $offer) {
        if (!is_array($offer) || !biwenger_offer_is_active($offer)) continue;
        $playerIds = biwenger_offer_player_ids($offer);
        $playerId = (int)($playerIds[0] ?? 0);
        $marketPlayer = is_array($offer['_marketPlayer'] ?? null) ? $offer['_marketPlayer'] : [];
        $catalogPlayer = array_merge($marketPlayer, (array)($catalog['playersById'][$playerId] ?? []));
        $normalizedPlayer = $playerId > 0
            ? biwenger_normalize_player($catalogPlayer ?: ['id' => $playerId], $catalog, (string)($session['competition'] ?? ''), false)
            : [];
        $fromValue = $offer['from'] ?? $offer['buyer'] ?? $offer['bidder'] ?? null;
        $toValue = $offer['to'] ?? $offer['owner'] ?? $offer['seller'] ?? null;
        $from = is_array($fromValue) ? $fromValue : [];
        $to = is_array($toValue) ? $toValue : [];
        $fromId = (int)($from['id'] ?? $offer['fromID'] ?? $offer['fromId'] ?? (is_numeric($fromValue) ? $fromValue : 0));
        $toId = (int)($to['id'] ?? $offer['toID'] ?? $offer['toId'] ?? (is_numeric($toValue) ? $toValue : 0));
        $direction = strtolower((string)($offer['direction'] ?? $offer['_direction'] ?? ''));
        $genericUserId = (int)($offer['userID'] ?? $offer['userId'] ?? 0);
        $ownerId = (int)($offer['ownerID'] ?? $offer['ownerId'] ?? $offer['sellerID'] ?? $offer['sellerId'] ?? 0);
        $buyerId = (int)($offer['buyerID'] ?? $offer['buyerId'] ?? $offer['bidderID'] ?? $offer['bidderId'] ?? 0);
        $source = (string)($offer['_source'] ?? '');
        if ($fromId <= 0) $fromId = $buyerId ?: ($direction === 'outgoing' ? $userId : $genericUserId);
        if ($toId <= 0) $toId = $ownerId ?: ($direction === 'incoming' ? $userId : 0);
        if ($toId <= 0 && $playerId > 0 && isset($marketOwners[$playerId])) $toId = (int)$marketOwners[$playerId];
        if ($fromId <= 0 && $toId === $userId && $genericUserId > 0) $fromId = $genericUserId;
        if ($toId <= 0 && $fromId === $userId && $genericUserId > 0 && $genericUserId !== $userId) $toId = $genericUserId;
        // Free-agent bids target Biwenger's system market and legitimately have toId=0.
        $isMine = $fromId === $userId && $toId !== $userId;
        $isIncoming = $toId === $userId && $fromId > 0 && $fromId !== $userId;
        if (!$isMine && !$isIncoming && $playerId > 0) {
            if (isset($ownedPlayerIds[$playerId])) {
                $isIncoming = true;
                $toId = $userId;
            } elseif (strpos($direction, 'outgoing') !== false || strpos($direction, 'sent') !== false) {
                $isMine = true;
                $fromId = $userId;
            } elseif (preg_match('/(^|:)outgoing|sent|own-check/i', $source)) {
                $isMine = true;
                $fromId = $userId;
            }
        }
        if (!$isMine && !$isIncoming) continue;
        $offerId = (int)($offer['id'] ?? 0);
        $offerAmount = biwenger_money_int($offer['amount'] ?? $offer['offeredAmount'] ?? $offer['requestedAmount'] ?? $offer['offeredMoney'] ?? $offer['requestedMoney'] ?? $offer['money'] ?? $offer['cash'] ?? $offer['bid'] ?? $offer['price'] ?? 0);
        $expiresTs = biwenger_offer_expiry_ts($offer);
        $timestampTs = biwenger_offer_timestamp_ts($offer);
        $dedupeKey = implode(':', [$playerId, $fromId, $toId, $offerAmount, (string)($offer['type'] ?? 'purchase')]);
        if (isset($seenOffers[$dedupeKey])) continue;
        $seenOffers[$dedupeKey] = true;
        $offerPlayerName = biwenger_entity_name($offer['player'] ?? null, 'Jugador');
        $normalizedOffers[] = [
            'offerId' => $offerId,
            'playerId' => $playerId,
            'playerName' => (string)($catalogPlayer['name'] ?? $offerPlayerName),
            'playerValue' => (int)($catalogPlayer['price'] ?? $catalogPlayer['fantasyPrice'] ?? 0),
            'media' => $normalizedPlayer['media'] ?? [],
            'sourceLinks' => $normalizedPlayer['sourceLinks'] ?? [],
            'position' => $normalizedPlayer['position'] ?? null,
            'points' => (int)($catalogPlayer['points'] ?? 0),
            'amount' => $offerAmount,
            'status' => (string)($offer['status'] ?? 'pending'),
            'type' => (string)($offer['type'] ?? 'purchase'),
            'source' => $source,
            'expiresTs' => $expiresTs,
            'timestampTs' => $timestampTs,
            'fromId' => $fromId,
            'fromName' => (string)($from['name'] ?? $offer['fromName'] ?? $offer['buyerName'] ?? $offer['bidderName'] ?? ''),
            'toId' => $toId,
            'toName' => (string)($to['name'] ?? $offer['toName'] ?? $offer['ownerName'] ?? $offer['sellerName'] ?? ''),
            'isMine' => $isMine,
            'isIncoming' => $isIncoming,
            'isCurrentMarket' => isset($marketOwners[$playerId]),
            'isAuthoritativeOutgoing' => (bool)preg_match('/(^|:)outgoing(?:$|:)|sent|own-check/i', $source)
        ];
    }
    $currentMarketPlayerIds = array_fill_keys(array_map('intval', array_keys($marketOwners)), true);
    $discardedOwnBidCandidates = 0;
    $normalizedOffers = array_values(array_filter($normalizedOffers, static function ($offer) use ($currentMarketPlayerIds, $ownedPlayerIds, &$discardedOwnBidCandidates) {
        if (empty($offer['isMine'])) return true;
        $type = strtolower((string)($offer['type'] ?? 'purchase'));
        $playerId = (int)($offer['playerId'] ?? 0);
        $amount = (int)($offer['amount'] ?? 0);
        $valid = $playerId > 0 && $amount > 0 && !isset($ownedPlayerIds[$playerId]);
        if ($valid && preg_match('/sell|sale|venta/', $type) && !preg_match('/purchase|buy|bid|puja/', $type)) $valid = false;
        if ($valid && isset($currentMarketPlayerIds[$playerId])) return true;

        // The dedicated /offers endpoint is the authoritative source for outgoing bids.
        // Keep it even if the market payload and player list are momentarily out of sync.
        if ($valid && !empty($offer['isAuthoritativeOutgoing']) && (int)($offer['offerId'] ?? 0) > 0) return true;
        $discardedOwnBidCandidates++;
        return false;
    }));
    $stableOffers = [];
    $bestIncomingOfferByParty = [];
    $bestOwnOfferByPlayer = [];
    foreach ($normalizedOffers as $offer) {
        if (empty($offer['isMine'])) {
            if (!empty($offer['isIncoming'])) {
                $incomingKey = implode(':', [
                    (int)($offer['playerId'] ?? 0),
                    (int)($offer['fromId'] ?? 0),
                    (int)($offer['toId'] ?? 0)
                ]);
                $previous = $bestIncomingOfferByParty[$incomingKey] ?? null;
                if ($previous === null || biwenger_normalized_offer_rank($offer) > biwenger_normalized_offer_rank($previous)) {
                    $bestIncomingOfferByParty[$incomingKey] = $offer;
                }
            } else {
                $stableOffers[] = $offer;
            }
            continue;
        }
        $playerId = (int)($offer['playerId'] ?? 0);
        if ($playerId <= 0) continue;
        $previous = $bestOwnOfferByPlayer[$playerId] ?? null;
        if ($previous === null || biwenger_normalized_offer_rank($offer) > biwenger_normalized_offer_rank($previous)) {
            $bestOwnOfferByPlayer[$playerId] = $offer;
        }
    }
    $normalizedOffers = array_values(array_merge(
        $stableOffers,
        array_values($bestIncomingOfferByParty),
        array_values($bestOwnOfferByPlayer)
    ));

    $sales = [];
    $seenSales = [];
    $marketBidCounts = [];
    $marketRivalBidCounts = [];
    $marketBidCountSources = [];
    $ownBidPlayerIds = [];
    foreach ($normalizedOffers as $offer) {
        if (!empty($offer['isMine']) && (int)($offer['playerId'] ?? 0) > 0) {
            $ownBidPlayerIds[(int)$offer['playerId']] = true;
        }
    }
    $queriedBidCounts = 0;
    foreach (biwenger_market_entries($market) as $sale) {
        if (!is_array($sale)) continue;
        $ownerId = (int)($sale['user']['id'] ?? $sale['userID'] ?? 0);
        $entry = biwenger_sale_with_catalog($sale, $catalog);
        if (!$entry) continue;
        $salePlayerId = (int)($entry['id'] ?? 0);
        if ($salePlayerId <= 0 || isset($seenSales[$salePlayerId])) continue;
        $seenSales[$salePlayerId] = true;
        $bidDetail = biwenger_extract_sale_bid_count_detail($sale);
        $bidCount = $bidDetail['count'];
        if ($ownerId !== $userId) {
            if ($bidCount === null && !empty($session['bidCountFree']) && $queriedBidCounts < 40) {
                $bidDetail = biwenger_visible_bid_count_detail($session, $salePlayerId, $ownerId, $timeoutSeconds, $headers, $strictTls);
                $bidCount = $bidDetail['count'];
                $queriedBidCounts++;
            }
            $marketBidCounts[$salePlayerId] = $bidCount === null ? null : max(0, (int)$bidCount);
            $marketRivalBidCounts[$salePlayerId] = $bidCount === null
                ? null
                : max(0, $bidCount - (isset($ownBidPlayerIds[$salePlayerId]) ? 1 : 0));
            $marketBidCountSources[$salePlayerId] = $bidDetail['source'] ?? null;
            continue;
        }
        $player = biwenger_normalize_player($entry, $catalog, (string)($session['competition'] ?? ''), true, $sale);
        $sales[] = [
            'playerId' => (int)($player['biwengerPlayerId'] ?? 0),
            'playerName' => (string)($player['name'] ?? 'Jugador'),
            'price' => biwenger_sale_price($sale),
            'priceSource' => biwenger_sale_price_source($sale),
            'value' => (int)($player['biwengerValue'] ?? 0),
            'media' => $player['media'] ?? [],
            'sourceLinks' => $player['sourceLinks'] ?? [],
            'position' => $player['position'] ?? null,
            'points' => (int)($entry['points'] ?? 0)
        ];
    }

    $activity = [];
    try {
        $boardResponse = biwenger_private_get_json(
            'https://biwenger.as.com/api/v2/league/' . (int)($session['leagueId'] ?? 0) . '/board?type=transfer,market',
            $session,
            $timeoutSeconds,
            $headers,
            $strictTls
        );
        $board = is_array($boardResponse['data'] ?? null) ? $boardResponse['data'] : $boardResponse;
        $activity = biwenger_activity_rows(array_values((array)($board['posts'] ?? $board['board'] ?? $board)), $catalog);
    } catch (Throwable $error) {
        // League activity is optional and depends on league permissions.
    }

    $status = is_array($market['status'] ?? null) ? $market['status'] : [];
    return [
        'ok' => true,
        'offers' => $normalizedOffers,
        'sales' => $sales,
        'activity' => $activity,
        'marketBidCounts' => $marketBidCounts,
        'marketRivalBidCounts' => $marketRivalBidCounts,
        'marketBidCountSources' => $marketBidCountSources,
        'finance' => [
            'balance' => isset($status['balance']) ? (int)$status['balance'] : ($session['balance'] ?? null),
            'maximumBid' => isset($status['maximumBid']) ? (int)$status['maximumBid'] : ($session['maximumBid'] ?? null)
        ],
        'diagnostics' => [
            'rawOfferCandidates' => count($offers),
            'activeOffers' => count($normalizedOffers),
            'ownBids' => count(array_filter($normalizedOffers, static fn($offer) => !empty($offer['isMine']))),
            'receivedOffers' => count(array_filter($normalizedOffers, static fn($offer) => !empty($offer['isIncoming']))),
            'discardedOwnBidCandidates' => $discardedOwnBidCandidates,
            'sales' => count($sales),
            'visibleBidCounts' => count(array_filter($marketBidCounts, static fn($count) => $count !== null)),
            'queriedBidCounts' => $queriedBidCounts,
            'offerSource' => $offerSources[0] ?? 'market'
        ]
    ];
}

function biwenger_offer_map(array $offers, int $userId): array
{
    $mapped = [];
    foreach ($offers as $offer) {
        if (!is_array($offer)) continue;
        if (!biwenger_offer_is_active($offer)) continue;
        $fromValue = $offer['from'] ?? $offer['buyer'] ?? $offer['bidder'] ?? null;
        $toValue = $offer['to'] ?? $offer['owner'] ?? $offer['seller'] ?? null;
        $fromId = (int)((is_array($fromValue) ? ($fromValue['id'] ?? 0) : (is_numeric($fromValue) ? $fromValue : 0)) ?: ($offer['fromID'] ?? $offer['fromId'] ?? $offer['buyerID'] ?? $offer['buyerId'] ?? $offer['bidderID'] ?? $offer['bidderId'] ?? 0));
        $toId = (int)((is_array($toValue) ? ($toValue['id'] ?? 0) : (is_numeric($toValue) ? $toValue : 0)) ?: ($offer['toID'] ?? $offer['toId'] ?? $offer['ownerID'] ?? $offer['ownerId'] ?? $offer['sellerID'] ?? $offer['sellerId'] ?? 0));
        $fromName = (string)((is_array($fromValue) ? ($fromValue['name'] ?? '') : '') ?: ($offer['fromName'] ?? $offer['buyerName'] ?? $offer['bidderName'] ?? ''));
        $direction = strtolower((string)($offer['direction'] ?? $offer['_direction'] ?? ''));
        $playerIds = biwenger_offer_player_ids($offer);
        $amount = (int)($offer['amount'] ?? $offer['price'] ?? 0);
        $status = (string)($offer['status'] ?? 'pending');
        foreach ($playerIds as $playerIdValue) {
            $playerId = is_array($playerIdValue) ? (int)($playerIdValue['id'] ?? 0) : (int)$playerIdValue;
            if ($playerId <= 0) continue;
            $previous = $mapped[$playerId] ?? [
                'myBidAmount' => null, 'myBidStatus' => null, 'offerId' => null,
                'hasBid' => false, 'rivalBids' => [], 'rivalBidCount' => 0,
                'highestRivalBid' => null, 'rivalBidVisibility' => 'hidden'
            ];
            $isOutgoing = $fromId === $userId && ($toId !== $userId || strpos($direction, 'outgoing') !== false || strpos($direction, 'sent') !== false);
            if ($isOutgoing) {
                $previous['myBidAmount'] = max((int)($previous['myBidAmount'] ?? 0), $amount);
                $previous['myBidStatus'] = $status;
                $previous['offerId'] = $offer['id'] ?? $previous['offerId'];
                $previous['hasBid'] = true;
            } elseif ($fromId > 0) {
                $previous['rivalBids'][] = ['userId' => $fromId, 'userName' => $fromName, 'amount' => $amount > 0 ? $amount : null];
                $previous['rivalBidCount'] = count($previous['rivalBids']);
                if ($amount > 0) {
                    $previous['highestRivalBid'] = max((int)($previous['highestRivalBid'] ?? 0), $amount);
                    $previous['rivalBidVisibility'] = 'amounts';
                } else {
                    $previous['rivalBidVisibility'] = 'count';
                }
            }
            $previous['bidAmount'] = $previous['myBidAmount'];
            $previous['bidStatus'] = $previous['myBidStatus'];
            $previous['bidCount'] = ($previous['hasBid'] ? 1 : 0) + $previous['rivalBidCount'];
            $mapped[$playerId] = $previous;
        }
    }
    return $mapped;
}

function biwenger_normalize_player(array $entry, array $catalog, string $competition, bool $owned, ?array $sale = null): array
{
    $playerId = (int)($entry['id'] ?? 0);
    $teamId = (int)($entry['teamID'] ?? ($entry['team']['id'] ?? 0));
    $team = is_array($entry['team'] ?? null) ? $entry['team'] : (($catalog['teamsById'][$teamId] ?? null) ?: []);
    $teamName = (string)($team['name'] ?? $entry['teamName'] ?? '');
    $marketValue = biwenger_money_int($entry['price'] ?? $entry['fantasyPrice'] ?? 0);
    $price = $sale !== null
        ? (biwenger_sale_price($sale) ?: biwenger_money_int($entry['ownerPrice'] ?? $marketValue))
        : biwenger_money_int($entry['ownerPrice'] ?? $marketValue);
    $status = strtolower((string)($entry['status'] ?? 'ok'));
    $statusText = (string)($entry['statusText'] ?? '');
    $valueDiff = (int)($entry['priceIncrement'] ?? 0);
    $playerImage = biwenger_media_url($entry, ['photo', 'image', 'avatar', 'picture', 'img', 'portrait', 'iconHero', 'icon'])
        ?? ($playerId > 0 ? 'https://cdn.biwenger.com/i/p/' . $playerId . '.png' : null);
    $teamImage = biwenger_media_url($team, ['shield', 'badge', 'logo', 'image', 'flag', 'crest', 'photo', 'icon'])
        ?? ($teamId > 0 ? 'https://cdn.biwenger.com/i/t/' . $teamId . '.png' : null);
    $position = biwenger_position((int)($entry['position'] ?? 3));
    $fitness = array_values(array_filter((array)($entry['fitness'] ?? []), 'is_numeric'));
    $fitnessAverage = $fitness ? average($fitness) : null;
    $form = $fitnessAverage !== null ? (int)round(clamp(48 + $fitnessAverage * 5.2, 35, 92)) : 56;
    $starter = $position === 'ENT' ? ($status === 'ok' ? 94 : 62) : 58;
    $points = (int)($entry['points'] ?? 0);
    $played = max(1, (int)($entry['playedHome'] ?? 0) + (int)($entry['playedAway'] ?? 0));
    $pointsScore = $points > 0 ? (int)round(clamp(46 + ($points / $played) * 5.5, 42, 92)) : 55;
    $bidInfo = is_array($sale['bidInfo'] ?? null) ? $sale['bidInfo'] : [];
    $marketOwnerId = (int)($entry['marketOwnerId'] ?? $sale['user']['id'] ?? $sale['userID'] ?? 0);
    $marketOwnerName = (string)($entry['marketOwnerName'] ?? biwenger_entity_name($sale['user'] ?? null, (string)($sale['userName'] ?? $sale['ownerName'] ?? '')));
    $marketSellerType = (string)($entry['marketSellerType'] ?? '');
    if ($marketSellerType === '') {
        $normalizedOwnerName = normalize_text($marketOwnerName);
        $marketSellerType = ($marketOwnerId > 0 && !preg_match('/biwenger|mercado|market|sistema|computer/', $normalizedOwnerName)) ? 'rival' : 'free';
    }
    if ($marketOwnerName === '') $marketOwnerName = $marketSellerType === 'free' ? 'Biwenger' : 'Rival';

    return [
        'id' => 'biwenger-' . ($owned ? 'team' : 'market') . '-' . ($playerId > 0 ? $playerId : uniqid('', false)),
        'biwengerPlayerId' => $playerId,
        'name' => (string)($entry['name'] ?? 'Jugador'),
        'team' => $teamName !== '' ? $teamName : (preg_match('/world|mundial/i', $competition) ? 'Sin seleccion' : 'Sin equipo'),
        'nationalTeam' => preg_match('/world|mundial/i', $competition) ? ($teamName !== '' ? $teamName : null) : null,
        'clubTeam' => preg_match('/world|mundial/i', $competition) ? null : ($teamName !== '' ? $teamName : null),
        'position' => $position,
        'biwengerPosition' => $position,
        'price' => $price,
        'salePrice' => $sale !== null ? $price : null,
        'marketOwnerId' => $marketOwnerId,
        'marketOwnerName' => $marketOwnerName,
        'marketSellerType' => $marketSellerType,
        'marketSellerLabel' => (string)($entry['marketSellerLabel'] ?? ($marketSellerType === 'free' ? 'Libre' : 'Vende ' . $marketOwnerName)),
        'biwengerValue' => $marketValue ?: $price,
        'biwengerDiff' => $valueDiff,
        'bidAmount' => isset($bidInfo['bidAmount']) ? (int)$bidInfo['bidAmount'] : null,
        'bidCount' => (int)($bidInfo['bidCount'] ?? 0),
        'bidStatus' => $bidInfo['bidStatus'] ?? null,
        'hasBid' => !empty($bidInfo['hasBid']),
        'myBidAmount' => isset($bidInfo['myBidAmount']) ? (int)$bidInfo['myBidAmount'] : null,
        'myBidStatus' => $bidInfo['myBidStatus'] ?? null,
        'offerId' => isset($bidInfo['offerId']) ? (int)$bidInfo['offerId'] : null,
        'bidCountSource' => (string)($bidInfo['bidCountSource'] ?? ''),
        'rivalBids' => array_values((array)($bidInfo['rivalBids'] ?? [])),
        'rivalBidCount' => (int)($bidInfo['rivalBidCount'] ?? 0),
        'highestRivalBid' => isset($bidInfo['highestRivalBid']) ? (int)$bidInfo['highestRivalBid'] : null,
        'rivalBidVisibility' => (string)($bidInfo['rivalBidVisibility'] ?? 'hidden'),
        'starter' => $starter,
        'form' => $form,
        'competitionPoints' => $points,
        'asScore' => $pointsScore,
        'sofascore' => $pointsScore,
        'stats' => $pointsScore,
        'valueTrend' => $valueDiff > 0 ? 5 : ($valueDiff < 0 ? -5 : 0),
        'sourceStatus' => 'seed',
        'dataConfidence' => 78,
        'competitionScope' => preg_match('/world|mundial/i', $competition) ? 'worldcup' : 'club',
        'health' => biwenger_health($status, $statusText),
        'media' => [
            'playerImage' => $playerImage,
            'emblemImage' => $teamImage,
            'emblemKind' => preg_match('/world|mundial/i', $competition) ? 'selection' : 'club'
        ],
        'sourceLinks' => [
            'biwenger' => !empty($entry['canonicalURL']) ? (string)$entry['canonicalURL'] : null
        ],
        'risk' => biwenger_risk($status, $statusText),
        'riskReasons' => array_values(array_filter([
            'Base importada desde Biwenger',
            $statusText !== '' ? $statusText : null
        ])),
        'sources' => ['Biwenger directo'],
        'sourceSummary' => [
            'recentMatches' => biwenger_recent_matches_from_fitness($fitness),
            'biwenger' => [
                'status' => $status,
                'statusText' => $statusText,
                'priceIncrement' => $valueDiff,
                'owner' => $owned,
                'points' => $points,
                'fitness' => $fitness,
                'bidAmount' => $bidInfo['bidAmount'] ?? null,
                'bidCount' => $bidInfo['bidCount'] ?? 0,
                'rivalBidCount' => $bidInfo['rivalBidCount'] ?? 0
            ]
        ]
    ];
}

function biwenger_recent_matches_from_fitness(array $fitness): array
{
    $values = array_slice(array_values(array_map(static fn($value) => (float)$value, $fitness)), -5);
    return array_values(array_map(static function ($value, $index) {
        $points = (int)round($value);
        return [
            'provider' => 'biwenger',
            'label' => 'Partido reciente ' . ($index + 1),
            'minutes' => null,
            'played' => $points !== 0,
            'points' => [
                'biwenger' => $points,
                'mixed' => $points,
                'as' => $points,
                'sofascore' => $points,
                'stats' => $points
            ]
        ];
    }, $values, array_keys($values)));
}

function biwenger_position(int $position): string
{
    if ($position === 1) return 'POR';
    if ($position === 2) return 'DF';
    if ($position === 4) return 'DL';
    if ($position === 5) return 'ENT';
    return 'MC';
}

function biwenger_media_url(array $entity, array $keys): ?string
{
    foreach ($keys as $key) {
        $value = $entity[$key] ?? null;
        $url = is_string($value) ? biwenger_normalize_media_url($value) : null;
        if ($url) return $url;
    }
    return null;
}

function biwenger_normalize_media_url(string $value): ?string
{
    $value = trim($value);
    if ($value === '') return null;
    if (preg_match('~^https?://~i', $value)) return $value;
    if (strpos($value, '//') === 0) return 'https:' . $value;
    if ($value[0] === '/') return 'https://cdn.biwenger.com' . $value;
    if (preg_match('~^(?:img|images|media|uploads|assets|i)/[^\s]+$~i', $value)) {
        return 'https://cdn.biwenger.com/' . ltrim($value, '/');
    }
    return null;
}

function biwenger_league_icon_fallback(int $leagueId): ?string
{
    return $leagueId > 0 ? 'https://cdn.biwenger.com/i/l/' . $leagueId . '.png' : null;
}

function biwenger_default_user_icon(): string
{
    return 'https://cdn.biwenger.com/img/user.svg';
}

function biwenger_user_icon(array $user, array $entry = [], int $userId = 0): ?string
{
    $keys = [
        'icon', 'iconUrl', 'logo', 'badge', 'shield', 'avatar', 'avatarUrl',
        'photo', 'photoUrl', 'picture', 'pictureUrl', 'image', 'imageUrl',
        'profileImage', 'profileImageUrl', 'profilePicture', 'profilePictureUrl'
    ];
    return biwenger_entity_media($user, $keys)
        ?: biwenger_entity_media($entry, $keys)
        ?: null;
}

function biwenger_entity_media(array $entity, array $keys, int $depth = 0): ?string
{
    if ($depth > 3) return null;
    foreach ($keys as $key) {
        if (!array_key_exists($key, $entity)) continue;
        $value = $entity[$key];
        $url = is_string($value) ? biwenger_normalize_media_url($value) : null;
        if ($url) return $url;
        if (is_array($value)) {
            foreach (['url', 'src', 'href', 'original', 'large', 'medium'] as $urlKey) {
                $url = $value[$urlKey] ?? null;
                $normalized = is_string($url) ? biwenger_normalize_media_url($url) : null;
                if ($normalized) return $normalized;
            }
        }
    }
    foreach ($entity as $key => $value) {
        if (in_array((string)$key, ['user', 'users', 'members'], true)) continue;
        if (!is_array($value)) continue;
        $found = biwenger_entity_media($value, $keys, $depth + 1);
        if ($found) return $found;
    }
    return null;
}

function biwenger_health(string $status, string $statusText): array
{
    $normalized = normalize_text($status . ' ' . $statusText);
    if (strpos($normalized, 'injur') !== false || strpos($normalized, 'lesion') !== false) {
        return ['status' => 'injured', 'detail' => $statusText];
    }
    if (strpos($normalized, 'doubt') !== false || strpos($normalized, 'duda') !== false) {
        return ['status' => 'doubtful', 'detail' => $statusText];
    }
    if (strpos($normalized, 'suspen') !== false || strpos($normalized, 'sanc') !== false) {
        return ['status' => 'suspended', 'detail' => $statusText];
    }
    return ['status' => $statusText !== '' ? 'unknown' : 'available', 'detail' => $statusText];
}

function biwenger_risk(string $status, string $statusText): string
{
    $health = biwenger_health($status, $statusText);
    if (in_array($health['status'], ['injured', 'suspended'], true)) return 'high';
    if ($health['status'] === 'doubtful') return 'medium';
    return 'low';
}

function http_request(string $method, string $url, int $timeoutSeconds, array $headers, bool $strictTls, ?string $body = null): array
{
    $payload = $body ?? '';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_CONNECTTIMEOUT => $timeoutSeconds,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => $strictTls,
            CURLOPT_SSL_VERIFYHOST => $strictTls ? 2 : 0,
            CURLOPT_HEADER => false
        ]);
        if ($method !== 'GET' && $payload !== '') {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }
        $responseBody = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $contentType = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($responseBody === false) {
            throw new RuntimeException($error !== '' ? $error : 'Error HTTP remoto');
        }
        $json = json_decode((string)$responseBody, true);
        return [
            'status' => $status,
            'contentType' => $contentType,
            'body' => (string)$responseBody,
            'json' => is_array($json) ? $json : []
        ];
    }

    $context = stream_context_create([
        'http' => [
            'method' => $method,
            'timeout' => $timeoutSeconds,
            'ignore_errors' => true,
            'header' => implode("\r\n", $headers),
            'content' => $payload
        ],
        'ssl' => [
            'verify_peer' => $strictTls,
            'verify_peer_name' => $strictTls
        ]
    ]);
    $responseBody = @file_get_contents($url, false, $context);
    if ($responseBody === false) {
        throw new RuntimeException('No se pudo conectar con el origen remoto');
    }
    $status = 0;
    foreach (($http_response_header ?? []) as $headerLine) {
        if (preg_match('~^HTTP/\\S+\\s+(\\d{3})~', $headerLine, $match)) {
            $status = (int)$match[1];
            break;
        }
    }
    $json = json_decode((string)$responseBody, true);
    return [
        'status' => $status,
        'contentType' => '',
        'body' => (string)$responseBody,
        'json' => is_array($json) ? $json : []
    ];
}

function http_get_text(string $url, int $timeoutSeconds, array $headers, bool $strictTls): string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_CONNECTTIMEOUT => $timeoutSeconds,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => $strictTls,
            CURLOPT_SSL_VERIFYHOST => $strictTls ? 2 : 0
        ]);
        $body = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($body === false || $status < 200 || $status >= 300) {
            throw new RuntimeException($error !== '' ? $error : ('Source HTTP ' . $status));
        }
        return (string)$body;
    }

    $context = stream_context_create([
        'http' => [
            'timeout' => $timeoutSeconds,
            'ignore_errors' => true,
            'header' => implode("\r\n", $headers)
        ],
        'ssl' => [
            'verify_peer' => $strictTls,
            'verify_peer_name' => $strictTls
        ]
    ]);
    $body = @file_get_contents($url, false, $context);
    if ($body === false) {
        throw new RuntimeException('No se pudo leer la fuente');
    }
    return $body;
}

function http_get_text_many(array $urls, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $urls = array_values(array_unique(array_filter($urls, 'is_string')));
    if (!$urls) return [];
    if (!function_exists('curl_multi_init')) {
        $result = [];
        foreach ($urls as $url) {
            try {
                $result[$url] = http_get_text($url, $timeoutSeconds, $headers, $strictTls);
            } catch (Throwable $error) {
                $result[$url] = null;
            }
        }
        return $result;
    }
    $multi = curl_multi_init();
    $handles = [];
    foreach ($urls as $url) {
        $handle = curl_init($url);
        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_CONNECTTIMEOUT => $timeoutSeconds,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => $strictTls,
            CURLOPT_SSL_VERIFYHOST => $strictTls ? 2 : 0
        ]);
        curl_multi_add_handle($multi, $handle);
        $handles[$url] = $handle;
    }
    do {
        $status = curl_multi_exec($multi, $active);
        if ($active) curl_multi_select($multi, 1.0);
    } while ($active && $status === CURLM_OK);
    $result = [];
    foreach ($handles as $url => $handle) {
        $code = (int)curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $body = curl_multi_getcontent($handle);
        $result[$url] = $code >= 200 && $code < 300 && is_string($body) ? $body : null;
        curl_multi_remove_handle($multi, $handle);
        curl_close($handle);
    }
    curl_multi_close($multi);
    return $result;
}

function http_get_json(string $url, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $decoded = json_decode(http_get_text($url, $timeoutSeconds, $headers, $strictTls), true);
    return is_array($decoded) ? $decoded : [];
}

function http_get_binary(string $url, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_CONNECTTIMEOUT => $timeoutSeconds,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => $strictTls,
            CURLOPT_SSL_VERIFYHOST => $strictTls ? 2 : 0
        ]);
        $body = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $contentType = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($body === false || $status < 200 || $status >= 300) {
            throw new RuntimeException($error !== '' ? $error : ('Source HTTP ' . $status));
        }
        return ['body' => $body, 'contentType' => $contentType];
    }

    $body = http_get_text($url, $timeoutSeconds, $headers, $strictTls);
    return ['body' => $body, 'contentType' => 'application/octet-stream'];
}

function score_candidate(array $candidate, array $originalPlayer, float $resultScore): int
{
    $fullName = normalize_text((string)($candidate['name'] ?? ''));
    $shortName = normalize_text((string)($candidate['shortName'] ?? ''));
    $query = normalize_text((string)($originalPlayer['name'] ?? ''));
    $requestedTeam = normalize_text((string)($originalPlayer['team'] ?? ''));
    $candidateTeam = normalize_text((string)($candidate['team']['name'] ?? ''));
    $queryTokens = array_values(array_filter(explode(' ', $query)));
    $fullTokens = array_values(array_filter(explode(' ', $fullName)));
    $score = 0.0;

    if ($fullName === $query) $score += 90;
    if ($shortName === $query) $score += 76;
    if (strpos($fullName, $query) !== false || strpos($query, $fullName) !== false) $score += 48;
    if (count($queryTokens) === 1 && in_array($query, $fullTokens, true)) $score += 42;

    $tokenOverlap = count(array_intersect($queryTokens, $fullTokens));
    $score += $tokenOverlap * 20;

    $posMatch = position_matches((string)($originalPlayer['position'] ?? ''), (string)($candidate['position'] ?? ''));
    $score += $posMatch === 1 ? 22 : ($posMatch === -1 ? -24 : 0);

    if ($requestedTeam !== '' && $candidateTeam !== '' && (strpos($candidateTeam, $requestedTeam) !== false || strpos($requestedTeam, $candidateTeam) !== false)) {
        $score += 16;
    }

    if (!empty($candidate['retired'])) $score -= 55;
    if (($candidate['team']['name'] ?? '') === 'No team') $score -= 25;
    if (($candidate['team']['sport']['slug'] ?? '') === 'football' || (int)($candidate['team']['sport']['id'] ?? 0) === 1) $score += 35;

    $userCount = (float)($candidate['userCount'] ?? 1);
    $score += min(18, log10(max(1, $userCount) + 1) * 4);
    $score += min(14, log10(max(1, $resultScore) + 1) * 2);
    return (int)round($score);
}

function find_sofascore_player(array $player, int $timeoutSeconds, array $headers, bool $strictTls, array $searchOverrides): ?array
{
    $originalName = normalize_text((string)($player['name'] ?? ''));
    $query = $searchOverrides[$originalName] ?? ($player['name'] ?? '');
    $url = 'https://www.sofascore.com/api/v1/search/all?q=' . rawurlencode((string)$query) . '&page=0';
    $data = http_get_json($url, $timeoutSeconds, $headers, $strictTls);
    $results = $data['results'] ?? [];
    $candidates = [];
    foreach ($results as $result) {
        if (($result['type'] ?? '') !== 'player' || empty($result['entity']) || !is_array($result['entity'])) {
            continue;
        }
        $entity = $result['entity'];
        if ((($entity['team']['sport']['slug'] ?? '') !== 'football') && ((int)($entity['team']['sport']['id'] ?? 0) !== 1)) {
            continue;
        }
        $entity['matchScore'] = score_candidate($entity, $player, (float)($result['score'] ?? 0));
        $candidates[] = $entity;
    }
    usort($candidates, static function ($left, $right) {
        return (int)($right['matchScore'] ?? 0) <=> (int)($left['matchScore'] ?? 0);
    });
    $best = $candidates[0] ?? null;
    return ($best && (int)($best['matchScore'] ?? 0) >= 45) ? $best : null;
}

function football_fantasy_url_for(string $name): ?string
{
    $slug = slugify($name);
    return $slug !== '' ? 'https://www.futbolfantasy.com/jugadores/' . $slug : null;
}

function futbol_fantasy_worldcup_team_url_for(string $team, array $slugOverrides): ?string
{
    $key = normalize_text($team);
    $slug = $slugOverrides[$key] ?? slugify($team);
    return $slug !== '' ? 'https://www.futbolfantasy.com/world-cup/equipos/' . $slug : null;
}

function futbol_fantasy_player_url_for(string $name, string $competition): ?string
{
    $baseUrl = football_fantasy_url_for($name);
    if ($baseUrl === null) return null;
    return $competition === 'worldcup' ? $baseUrl . '/world-cup-2026' : $baseUrl;
}

function futbol_fantasy_search_url_for(string $name, string $competition, string $team = ''): ?string
{
    $name = trim($name);
    if ($name === '') return null;
    $parts = array_filter([
        'site:futbolfantasy.com/jugadores',
        $name,
        $competition === 'worldcup' ? 'world-cup-2026' : '',
        trim($team)
    ]);
    return 'https://www.google.com/search?q=' . rawurlencode(implode(' ', $parts));
}

function futbol_fantasy_profile_url_from_team_html(string $html, array $names, string $competition): ?string
{
    preg_match_all('/<a\b[^>]*href=["\']([^"\']*\/jugadores\/[^"\']+)["\'][^>]*>([\s\S]*?)<\/a>/i', $html, $links, PREG_SET_ORDER);
    $candidates = [];
    foreach ($links as $link) {
        $href = html_entity_decode((string)($link[1] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if ($href === '') continue;
        if ($competition === 'worldcup' && strpos($href, 'world-cup-2026') === false && !preg_match('/\/world-cup(?:\/|$)/i', $href)) {
            $href = rtrim($href, '/') . '/world-cup-2026';
        }
        $url = absolute_source_url($href, 'https://www.futbolfantasy.com');
        $pathText = str_replace(['-', '/', 'world cup 2026', 'jugadores'], ' ', normalize_text((string)(parse_url($url, PHP_URL_PATH) ?: '')));
        $text = trim(strip_html_text($link[0]) . ' ' . $pathText);
        $score = 0;
        foreach ($names as $name) {
            $name = trim((string)$name);
            if ($name === '') continue;
            $score = max($score, identity_name_score($text, $name));
            $query = normalize_text($name);
            if ($query !== '' && preg_match('/(?:^|\s)' . preg_quote($query, '/') . '(?:\s|$)/', normalize_text($text))) {
                $score = max($score, 84);
            }
        }
        if ($score >= 62) {
            $candidates[] = ['url' => $url, 'score' => $score];
        }
    }
    usort($candidates, static fn($left, $right) => (int)$right['score'] <=> (int)$left['score']);
    return $candidates[0]['url'] ?? null;
}

function parse_futbol_fantasy_points_summary(string $text, int $matches): array
{
    $labels = [
        'as' => ['Biwenger Picas'],
        'stats' => ['Biwenger Stats'],
        'sofascore' => ['Biwenger Sofascore'],
        'mixed' => ['Biwenger AS+Sofascore', 'Biwenger AS Sofascore']
    ];
    $points = [];
    foreach ($labels as $key => $variants) {
        foreach ($variants as $label) {
            $pattern = '/' . preg_quote($label, '/') . '\s+Total de puntos\s+(-?[\d.,]+)/i';
            if (preg_match($pattern, $text, $match)) {
                $value = parse_number($match[1]);
                if ($value !== null) {
                    $points[$key] = $value;
                    break;
                }
            }
        }
    }
    $avg = [];
    if ($matches > 0) {
        foreach ($points as $key => $value) {
            $avg[$key] = round((float)$value / $matches, 2);
        }
    }
    return ['points' => $points, 'avgPoints' => $avg];
}

function parse_futbol_fantasy_value_signals(string $html, string $competition): array
{
    $suffix = $competition === 'worldcup' ? 'biwenger-mundial' : 'biwenger';
    preg_match('/data-valor-' . preg_quote($suffix, '/') . '="([^"]+)"/i', $html, $valueMatch);
    preg_match('/data-valor-diff-' . preg_quote($suffix, '/') . '="([^"]+)"/i', $html, $diffMatch);
    return [
        'biwengerValue' => isset($valueMatch[1]) ? parse_number($valueMatch[1]) : null,
        'biwengerDiff' => isset($diffMatch[1]) ? parse_number($diffMatch[1]) : null
    ];
}

function parse_team_lineup_signals(string $html, string $playerName, string $competition): ?array
{
    $slug = slugify($playerName);
    if ($slug === '') return null;
    $pattern = '/\/jugadores\/' . preg_quote($slug, '/') . '(?:\/world-cup-2026)?/i';
    if (!preg_match_all($pattern, $html, $matches, PREG_OFFSET_CAPTURE)) {
        return null;
    }
    foreach ($matches[0] as $match) {
        $start = max(0, $match[1] - 1200);
        $block = substr($html, $start, 10200);
        preg_match('/data-probabilidad="(\d+)%"/i', $block, $directProbability);
        $probability = isset($directProbability[1]) ? (int)$directProbability[1] : null;
        if ($probability === null && preg_match_all('/prob-\d+[^>]*>\s*(\d+)%/i', $block, $probabilities) && !empty($probabilities[1])) {
            $probability = (int)end($probabilities[1]);
        }
        $values = parse_futbol_fantasy_value_signals($block, $competition);
        if ($probability !== null || $values['biwengerValue'] !== null || $values['biwengerDiff'] !== null) {
            return [
                'probability' => $probability,
                'biwengerValue' => $values['biwengerValue'],
                'biwengerDiff' => $values['biwengerDiff']
            ];
        }
    }
    return null;
}

function parse_futbol_fantasy_health(string $html): array
{
    $health = [
        'status' => 'available',
        'label' => 'Disponible',
        'detail' => null,
        'expectedReturn' => null,
        'medicalUrl' => null,
        'injuryRisk' => null
    ];
    preg_match('/<div class="border rounded w-100 text-center py-1 lesionados">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i', $html, $currentBlockMatch);
    $currentBlock = $currentBlockMatch[0] ?? '';
    if ($currentBlock === '') {
        preg_match('/<div class="elemento[^"]* lesionado[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i', $html, $fallbackBlock);
        $currentBlock = $fallbackBlock[0] ?? '';
    }
    $currentText = strip_html_text($currentBlock);
    preg_match('/<a[^>]+href="([^"]+)"[^>]*class="[^"]*lesion link/i', $currentBlock, $medicalUrlMatch);
    if (empty($medicalUrlMatch[1])) {
        preg_match('/<a[^>]+href="([^"]+)"[^>]*class="[^"]*lesion link/i', $html, $medicalUrlMatch);
    }
    preg_match('/Riesgo de lesi[oó]n\s*([^"<]+)/i', $html, $riskMatch);
    if (empty($riskMatch[1])) {
        preg_match('/riesgo-lesion-(\d+)/i', $html, $riskMatch);
    }

    if ($currentText !== '') {
        preg_match('/<span class="lesion[^"]*">([\s\S]*?)<\/span>/i', $currentBlock, $detailMatch);
        preg_match('/(Baja hasta[^.]+|Duda hasta[^.]+|Pendiente de evoluci[oó]n|Sin fecha de regreso|Regreso previsto[^.]+)/i', $currentText, $returnMatch);
        $normalized = normalize_text($currentText);
        $health['detail'] = !empty($detailMatch[1]) ? strip_html_text($detailMatch[1]) : $currentText;
        $health['expectedReturn'] = $returnMatch[1] ?? null;
        $health['medicalUrl'] = $medicalUrlMatch[1] ?? null;
        if (preg_match('/sancionad|suspension|sancion/', $normalized)) {
            $health['status'] = 'suspended';
            $health['label'] = 'Sancionado';
        } elseif (preg_match('/baja|lesion|lesionado|rotura|fractura|isquiotibial|femoral/', $normalized)) {
            $health['status'] = 'injured';
            $health['label'] = 'Lesionado';
        } elseif (preg_match('/duda|tocado|molestia|pendiente de evolucion/', $normalized)) {
            $health['status'] = 'doubtful';
            $health['label'] = 'Duda';
        }
    }
    $health['injuryRisk'] = $riskMatch[1] ?? null;
    return $health;
}

function parse_futbol_fantasy_profile(string $html, string $competition): ?array
{
    preg_match('/<title>([\s\S]*?)<\/title>/i', $html, $titleMatch);
    $title = $titleMatch[1] ?? '';
    if (preg_match('/404|no encontrado|not found/i', $title)) {
        return null;
    }
    $text = strip_html_text($html);
    preg_match('/Partidos jugados\s+(\d+)/i', $text, $competitionMatches);
    preg_match('/Titularidades\s+(\d+)\s*\/\s*(\d+)\s*\(([\d.,]+)%\)/i', $text, $starts);
    preg_match('/Total minutos\s+(\d+)\'?\s*\(([\d.,]+)%\)/i', $text, $minutes);
    preg_match('/Media de minutos [uú]ltimos 3 partidos jugados:\s*([\d.,]+)/i', $text, $lastThree);
    preg_match('/Titular J\d+[\s\S]{0,900}?class="[^"]*prob-\d+[^"]*"[^>]*>\s*(\d+)%/i', $html, $nextProbability);
    if (empty($nextProbability[1])) {
        preg_match('/Titular J\d+[\s\S]{0,900}?(\d+)%/i', $html, $nextProbability);
    }
    preg_match('/position-box\s+([a-z]+)[\s\S]{0,80}?>([^<]+)</i', $html, $position);
    preg_match('/https:\/\/media\.futbolfantasy\.com\/thumb\/[^"\']+\/uploads\/images\/jugadores\/ficha\/[^"\']+\.(?:png|jpg|jpeg|webp)/i', $html, $playerImage);
    preg_match('/(?:data-src|src)=["\'](?:https?:)?\/\/static\.futbolfantasy\.com\/uploads\/images\/equipos\/escudom\/([0-9]+)\.(?:png|jpg|jpeg|webp)["\'][^>]*alt=["\']([^"\']+)["\']/i', $html, $emblemImage);
    if (empty($emblemImage[0])) {
        preg_match('/alt=["\']([^"\']+)["\'][^>]*(?:data-src|src)=["\'](?:https?:)?\/\/static\.futbolfantasy\.com\/uploads\/images\/equipos\/escudom\/([0-9]+)\.(?:png|jpg|jpeg|webp)["\']/i', $html, $emblemImageAltFirst);
        if (!empty($emblemImageAltFirst[0])) {
            $emblemImage = [
                0 => $emblemImageAltFirst[0],
                1 => $emblemImageAltFirst[2],
                2 => $emblemImageAltFirst[1]
            ];
        }
    }
    $currentHealth = parse_futbol_fantasy_health($html);
    $valueSignals = parse_futbol_fantasy_value_signals($html, $competition);
    $matchesPlayed = isset($competitionMatches[1]) ? (int)$competitionMatches[1] : 0;
    $pointsSummary = parse_futbol_fantasy_points_summary($text, $matchesPlayed);
    $cleanTitle = strip_html_text($title);
    return [
        'title' => $cleanTitle,
        'profileName' => trim(preg_replace('/\s+-\s+Perfil[\s\S]*$/i', '', $cleanTitle) ?? $cleanTitle),
        'urlFound' => true,
        'competitionText' => $cleanTitle,
        'isSelectionContext' => preg_match('/world cup|mundial|selecci[oó]n|selecciones|eurocopa|copa america|africa cup|asian cup/i', $cleanTitle) === 1,
        'seasonStarts' => isset($starts[1]) ? (int)$starts[1] : null,
        'seasonMatches' => isset($starts[2]) ? (int)$starts[2] : 0,
        'competitionMatches' => $matchesPlayed,
        'points' => $pointsSummary['points'],
        'avgPoints' => $pointsSummary['avgPoints'],
        'seasonStartRate' => isset($starts[3]) ? parse_number($starts[3]) : null,
        'seasonMinutesRate' => isset($minutes[2]) ? parse_number($minutes[2]) : null,
        'lastThreeMinutes' => isset($lastThree[1]) ? parse_number($lastThree[1]) : null,
        'nextStarterProbability' => isset($nextProbability[1]) ? (int)$nextProbability[1] : null,
        'biwengerValue' => $valueSignals['biwengerValue'],
        'biwengerDiff' => $valueSignals['biwengerDiff'],
        'fantasyPosition' => $position[2] ?? null,
        'teamName' => $emblemImage[2] ?? null,
        'playerImageUrl' => $playerImage[0] ?? null,
        'emblemImageUrl' => !empty($emblemImage[1]) ? ('https://static.futbolfantasy.com/uploads/images/equipos/escudom/' . $emblemImage[1] . '.png') : null,
        'unavailable' => in_array($currentHealth['status'], ['injured', 'doubtful', 'suspended'], true),
        'calledUp' => preg_match('/Convocado con/i', $text) === 1,
        'health' => $currentHealth
    ];
}

function get_futbol_fantasy_profile(
    array $detailPlayer,
    array $originalPlayer,
    string $competition,
    int $timeoutSeconds,
    array $headers,
    bool $strictTls,
    array $teamSlugOverrides
): ?array {
    $profileResult = null;
    $names = array_values(array_unique(array_filter([
        $detailPlayer['name'] ?? null,
        $originalPlayer['name'] ?? null
    ])));

    foreach ($names as $name) {
        $primaryUrl = futbol_fantasy_player_url_for((string)$name, $competition);
        if ($primaryUrl === null) {
            continue;
        }
        $baseUrl = football_fantasy_url_for((string)$name);
        $urls = array_values(array_unique(array_filter($competition === 'worldcup' ? [$primaryUrl, $baseUrl] : [$primaryUrl])));
        foreach ($urls as $url) {
            try {
                $html = http_get_text($url, $timeoutSeconds, $headers, $strictTls);
                $profile = parse_futbol_fantasy_profile($html, $competition);
                if ($profile && !empty($profile['urlFound'])) {
                    $profile['url'] = $url;
                    $profileResult = $profile;
                    break 2;
                }
            } catch (Throwable $error) {
            }
        }
    }

    if ($competition === 'worldcup') {
        $teamUrl = futbol_fantasy_worldcup_team_url_for((string)($originalPlayer['nationalTeam'] ?? $originalPlayer['team'] ?? ''), $teamSlugOverrides);
        if ($teamUrl) {
            try {
                $teamHtml = http_get_text($teamUrl, $timeoutSeconds, $headers, $strictTls);
                if (!$profileResult) {
                    $profileUrl = futbol_fantasy_profile_url_from_team_html($teamHtml, $names, $competition);
                    if ($profileUrl) {
                        try {
                            $html = http_get_text($profileUrl, $timeoutSeconds, $headers, $strictTls);
                            $profile = parse_futbol_fantasy_profile($html, $competition);
                            if ($profile && !empty($profile['urlFound'])) {
                                $profile['url'] = $profileUrl;
                                $profileResult = $profile;
                            }
                        } catch (Throwable $profileError) {
                        }
                    }
                }
                preg_match('/<title>([\s\S]*?)<\/title>/i', $teamHtml, $teamTitleMatch);
                $teamTitle = strip_html_text($teamTitleMatch[1] ?? '');
                $teamNameFromTitle = trim(preg_replace('/\s*-\s*Mundial[\s\S]*$/i', '', $teamTitle) ?? $teamTitle);
                $teamSignals = null;
                foreach ($names as $name) {
                    $signals = parse_team_lineup_signals($teamHtml, (string)$name, $competition);
                    if ($signals && ($signals['probability'] !== null || $signals['biwengerValue'] !== null || $signals['biwengerDiff'] !== null)) {
                        $teamSignals = $signals;
                        break;
                    }
                }
                if ($teamSignals) {
                    $profileResult = array_merge($profileResult ?? [
                        'urlFound' => true,
                        'competitionText' => 'FutbolFantasy - once probable seleccion',
                        'isSelectionContext' => true,
                        'seasonStartRate' => null,
                        'seasonMatches' => 0,
                        'seasonMinutesRate' => null,
                        'lastThreeMinutes' => null,
                        'unavailable' => false,
                        'calledUp' => true,
                        'health' => [
                            'status' => 'unknown',
                            'label' => 'Sin dato',
                            'detail' => null,
                            'expectedReturn' => null,
                            'medicalUrl' => null,
                            'injuryRisk' => null
                        ],
                        'teamName' => $teamNameFromTitle !== '' ? $teamNameFromTitle : ($originalPlayer['team'] ?? null)
                    ], [
                        'isSelectionContext' => true,
                        'teamName' => $teamNameFromTitle !== '' ? $teamNameFromTitle : ($profileResult['teamName'] ?? ($originalPlayer['team'] ?? null)),
                        'nextStarterProbability' => $teamSignals['probability'] ?? ($profileResult['nextStarterProbability'] ?? null),
                        'biwengerValue' => $teamSignals['biwengerValue'] ?? ($profileResult['biwengerValue'] ?? null),
                        'biwengerDiff' => $teamSignals['biwengerDiff'] ?? ($profileResult['biwengerDiff'] ?? null),
                        'teamLineupProbability' => $teamSignals['probability'] ?? null,
                        'teamLineupUrl' => $teamUrl
                    ]);
                }
            } catch (Throwable $error) {
            }
        }
    }

    return $profileResult;
}

function get_team_by_id(array $event, $id): ?array
{
    if (!$id) return null;
    if (($event['homeTeam']['id'] ?? null) === $id) return $event['homeTeam'];
    if (($event['awayTeam']['id'] ?? null) === $id) return $event['awayTeam'];
    return null;
}

function event_is_national(array $event): bool
{
    if (!empty($event['homeTeam']['national']) || !empty($event['awayTeam']['national'])) return true;
    $blob = ($event['tournament']['name'] ?? '') . ' ' . ($event['tournament']['uniqueTournament']['name'] ?? '');
    return preg_match('/world cup|uefa|conmebol|concacaf|caf|afc|international|friendly|copa america|euro/i', normalize_text($blob)) === 1;
}

function rating_to_score(?float $rating): float
{
    if ($rating === null) return 58.0;
    return clamp((($rating - 5.8) / 2.2) * 55 + 42, 35, 96);
}

function recent_match_points(array $row): array
{
    $minutes = (int)round((float)($row['minutes'] ?? 0));
    $rating = isset($row['rating']) && is_numeric($row['rating']) ? (float)$row['rating'] : null;
    $incidents = is_array($row['incidents'] ?? null) ? $row['incidents'] : [];
    $goals = (int)($incidents['goals'] ?? 0);
    $assists = (int)($incidents['assists'] ?? $incidents['goalAssist'] ?? 0);
    $contributionBonus = $goals * 3 + $assists * 2;
    if ($minutes <= 0) {
        return ['as' => 0, 'sofascore' => 0, 'stats' => 0, 'mixed' => 0];
    }
    $minuteBase = $minutes >= 60 ? 3 : ($minutes >= 30 ? 2 : 1);
    $ratingBase = $rating !== null ? ($rating - 6.0) : -0.3;
    $sofascore = (int)round($minuteBase + ($ratingBase * 4.2) + $contributionBonus);
    $as = (int)round($minuteBase + (($rating !== null ? $rating - 6.1 : -0.4) * 3.2) + $contributionBonus);
    $stats = (int)round($minuteBase + (($rating !== null ? $rating - 6.0 : -0.2) * 3.8) + $contributionBonus + min(2, (int)floor($minutes / 45)));
    return [
        'as' => max(-4, min(16, $as)),
        'sofascore' => max(-4, min(18, $sofascore)),
        'stats' => max(-4, min(18, $stats)),
        'mixed' => (int)round(($as + $sofascore) / 2)
    ];
}

function recent_match_player_id($value): int
{
    if (is_numeric($value)) return (int)$value;
    if (!is_array($value)) return 0;
    return (int)($value['id'] ?? $value['playerID'] ?? $value['playerId'] ?? 0);
}

function recent_match_incident_minute(array $node): ?int
{
    foreach (['time', 'minute', 'minutes', 'matchTime'] as $key) {
        if (isset($node[$key]) && is_numeric($node[$key])) return (int)$node[$key];
    }
    return null;
}

function recent_match_substitution_info($node, int $playerId, ?int &$inMinute, ?int &$outMinute, int $depth = 0): void
{
    if ($playerId <= 0 || $depth > 8 || !is_array($node)) return;
    $minute = recent_match_incident_minute($node);
    $typeBlob = normalize_text((string)($node['incidentType'] ?? $node['type'] ?? $node['incidentClass'] ?? $node['text'] ?? ''));
    $looksLikeSub = strpos($typeBlob, 'substitution') !== false || strpos($typeBlob, 'cambio') !== false;

    foreach (['playerIn', 'playerInId', 'playerInID', 'inPlayer', 'playerOn', 'substituteIn'] as $key) {
        if (array_key_exists($key, $node) && recent_match_player_id($node[$key]) === $playerId && $minute !== null) {
            $inMinute = $inMinute === null ? $minute : min($inMinute, $minute);
        }
    }
    foreach (['playerOut', 'playerOutId', 'playerOutID', 'outPlayer', 'playerOff', 'substituteOut'] as $key) {
        if (array_key_exists($key, $node) && recent_match_player_id($node[$key]) === $playerId && $minute !== null) {
            $outMinute = $outMinute === null ? $minute : min($outMinute, $minute);
        }
    }
    if ($looksLikeSub && $minute !== null) {
        $player = recent_match_player_id($node['player'] ?? $node['playerId'] ?? 0);
        if ($player === $playerId && $outMinute === null) $outMinute = $minute;
    }
    foreach ($node as $child) {
        if (is_array($child)) recent_match_substitution_info($child, $playerId, $inMinute, $outMinute, $depth + 1);
    }
}

function recent_match_summary(array $row): array
{
    $event = is_array($row['event'] ?? null) ? $row['event'] : [];
    $playedTeam = is_array($row['playedTeam'] ?? null) ? $row['playedTeam'] : [];
    $home = is_array($event['homeTeam'] ?? null) ? $event['homeTeam'] : [];
    $away = is_array($event['awayTeam'] ?? null) ? $event['awayTeam'] : [];
    $playedId = (int)($playedTeam['id'] ?? $row['playedForId'] ?? 0);
    $opponent = null;
    if ($playedId > 0) {
        if ((int)($home['id'] ?? 0) === $playedId) $opponent = $away['shortName'] ?? $away['name'] ?? null;
        if ((int)($away['id'] ?? 0) === $playedId) $opponent = $home['shortName'] ?? $home['name'] ?? null;
    }
    $minutes = (int)round((float)($row['minutes'] ?? 0));
    $inMinute = null;
    $outMinute = null;
    recent_match_substitution_info($row['incidents'] ?? [], (int)($row['playerId'] ?? 0), $inMinute, $outMinute);
    if ($minutes > 0 && !empty($row['onBench']) && $inMinute === null) {
        $inMinute = max(1, 90 - $minutes);
    }
    if ($minutes > 0 && empty($row['onBench']) && $minutes < 85 && $outMinute === null) {
        $outMinute = $minutes;
    }
    return [
        'eventId' => $event['id'] ?? null,
        'date' => !empty($event['startTimestamp']) ? gmdate('Y-m-d', (int)$event['startTimestamp']) : null,
        'opponent' => $opponent,
        'minutes' => $minutes,
        'minuteIn' => $inMinute,
        'minuteOut' => $outMinute,
        'played' => $minutes > 0,
        'rating' => isset($row['rating']) && is_numeric($row['rating']) ? round((float)$row['rating'], 2) : null,
        'points' => recent_match_points($row)
    ];
}

function build_metrics(array $eventsData, array $detailPlayer, string $competition): array
{
    $events = $eventsData['events'] ?? [];
    usort($events, static function ($left, $right) {
        return (int)($left['startTimestamp'] ?? 0) <=> (int)($right['startTimestamp'] ?? 0);
    });
    $rows = [];
    foreach ($events as $event) {
        $key = (string)($event['id'] ?? '');
        $stats = $eventsData['statisticsMap'][$key] ?? [];
        $incidents = $eventsData['incidentsMap'][$key] ?? [];
        $playedForId = $eventsData['playedForTeamMap'][$key] ?? null;
        $playedTeam = get_team_by_id($event, $playedForId);
        $minutes = parse_number($stats['minutesPlayed'] ?? null) ?? 0;
        $rating = parse_number($stats['rating'] ?? null);
        $rows[] = [
            'playerId' => (int)($detailPlayer['id'] ?? 0),
            'event' => $event,
            'stats' => $stats,
            'incidents' => $incidents,
            'playedForId' => $playedForId,
            'playedTeam' => $playedTeam,
            'isNational' => event_is_national($event) || !empty($playedTeam['national']),
            'onBench' => ($eventsData['onBenchMap'][$key] ?? false) === true,
            'minutes' => $minutes,
            'rating' => $rating
        ];
    }

    $clubTeamId = $detailPlayer['team']['id'] ?? null;
    $clubRows = array_values(array_filter($rows, static function ($row) use ($clubTeamId) {
        if (!empty($row['isNational'])) return false;
        if (!$clubTeamId) return ($row['minutes'] > 0 || !empty($row['onBench']));
        return ($row['playedForId'] === $clubTeamId) || ($row['minutes'] > 0) || !empty($row['onBench']);
    }));
    $nationalRows = array_values(array_filter($rows, static function ($row) {
        return !empty($row['isNational']) && ($row['minutes'] > 0 || !empty($row['onBench']) || !empty($row['playedForId']));
    }));
    $latestNationalTeam = null;
    for ($i = count($nationalRows) - 1; $i >= 0; $i -= 1) {
        if (!empty($nationalRows[$i]['playedTeam'])) {
            $latestNationalTeam = $nationalRows[$i]['playedTeam'];
            break;
        }
    }

    $preferred = ($competition === 'worldcup' && count($nationalRows) >= 2) ? $nationalRows : $clubRows;
    $usingNationalSample = $competition === 'worldcup' && count($nationalRows) >= 2;
    $sample = array_slice($preferred, -10);
    $played = array_values(array_filter($sample, static function ($row) {
        return ($row['minutes'] ?? 0) > 0;
    }));
    $ratings = array_values(array_filter(array_map(static function ($row) {
        return $row['rating'] ?? null;
    }, $played), 'is_numeric'));
    $avgRating = average($ratings);
    $startCount = count(array_filter($sample, static function ($row) {
        return ($row['minutes'] ?? 0) >= 60;
    }));
    $completeCount = count(array_filter($sample, static function ($row) {
        return ($row['minutes'] ?? 0) >= 85;
    }));
    $benchCount = count(array_filter($sample, static function ($row) {
        return !empty($row['onBench']);
    }));
    $minutesTotal = array_sum(array_map(static function ($row) {
        return (float)($row['minutes'] ?? 0);
    }, $sample));
    $minuteShare = count($sample) ? clamp($minutesTotal / (count($sample) * 90), 0, 1) : 0;
    $appearanceRate = count($sample) ? count($played) / count($sample) : 0;
    $startRate = count($sample) ? $startCount / count($sample) : 0;
    $contributionCount = 0;
    foreach ($sample as $row) {
        $contributionCount += (int)($row['incidents']['goals'] ?? 0);
        $contributionCount += (int)($row['incidents']['assists'] ?? 0);
        $contributionCount += (int)($row['incidents']['goalAssist'] ?? 0);
    }

    $starter = clamp($startRate * 55 + $minuteShare * 35 + $appearanceRate * 10);
    $ratingScore = rating_to_score($avgRating);
    $recentRows = array_slice($sample, -5);
    $recentMinutesTotal = array_sum(array_map(static function ($row) {
        return (float)($row['minutes'] ?? 0);
    }, $recentRows));
    $recentMinuteShare = count($recentRows) ? clamp($recentMinutesTotal / (count($recentRows) * 90), 0, 1) : $minuteShare;
    $form = clamp($ratingScore * 0.66 + $starter * 0.17 + $recentMinuteShare * 17 + min(8, $contributionCount * 3));
    $sofascore = clamp($ratingScore * 0.78 + $starter * 0.16 + min(8, $contributionCount * 2));
    $stats = clamp($ratingScore * 0.54 + $starter * 0.24 + $recentMinuteShare * 14 + min(12, $contributionCount * 4));
    $asScore = clamp($ratingScore * 0.55 + $starter * 0.25 + $form * 0.2);

    return [
        'sampleSize' => count($sample),
        'usingNationalSample' => $usingNationalSample,
        'hasNationalSample' => count($nationalRows) >= 2,
        'starter' => $starter,
        'form' => $form,
        'sofascore' => $sofascore,
        'stats' => $stats,
        'asScore' => $asScore,
        'avgRating' => $avgRating,
        'startCount' => $startCount,
        'completeCount' => $completeCount,
        'benchCount' => $benchCount,
        'playedCount' => count($played),
        'contributionCount' => $contributionCount,
        'minuteShare' => $minuteShare,
        'recentMinuteShare' => $recentMinuteShare,
        'recentMatches' => array_values(array_map('recent_match_summary', $recentRows)),
        'nationalTeamId' => $latestNationalTeam['id'] ?? null,
        'nationalTeamName' => $latestNationalTeam['name'] ?? null,
        'clubTeamId' => $clubTeamId
    ];
}

function merge_fantasy_signals(array $metrics, ?array $fantasyProfile, string $competition): array
{
    if (!$fantasyProfile) return $metrics;
    $starter = $metrics['starter'];
    $form = $metrics['form'];
    $aligned = $competition !== 'worldcup' || !empty($fantasyProfile['isSelectionContext']);

    if (($fantasyProfile['seasonStartRate'] ?? null) !== null && $aligned) {
        $starter = $starter * 0.8 + ((float)$fantasyProfile['seasonStartRate']) * 0.2;
    }
    if (($fantasyProfile['nextStarterProbability'] ?? null) !== null && $aligned) {
        $weight = $competition === 'worldcup' ? 0.85 : 0.62;
        $nextStarter = (float)$fantasyProfile['nextStarterProbability'];
        $starter = $starter * (1 - $weight) + $nextStarter * $weight;
        if ($nextStarter >= 80) {
            $starter = max($starter, $nextStarter - 6);
        } elseif ($nextStarter <= 20) {
            $starter = min($starter, $nextStarter + 8);
        }
    } elseif ($competition === 'worldcup' && !$aligned) {
        $starter = min($starter, 58);
    }
    if (($fantasyProfile['lastThreeMinutes'] ?? null) !== null) {
        $form = $form * 0.84 + clamp((((float)$fantasyProfile['lastThreeMinutes']) / 90) * 100, 0, 100) * 0.16;
    }
    if (($fantasyProfile['seasonMinutesRate'] ?? null) !== null) {
        $form = $form * 0.88 + ((float)$fantasyProfile['seasonMinutesRate']) * 0.12;
    }

    $metrics['starter'] = clamp($starter);
    $metrics['form'] = clamp($form);
    $metrics['asScore'] = clamp($metrics['asScore'] * 0.82 + $starter * 0.18);
    $metrics['stats'] = clamp($metrics['stats'] * 0.88 + $form * 0.12);
    $metrics['fantasyContextAligned'] = $aligned;
    $metrics['hasFantasyStarterPrediction'] = ($fantasyProfile['nextStarterProbability'] ?? null) !== null && $aligned;
    return $metrics;
}

function risk_from_signals(array $metrics, ?array $fantasyProfile, string $competition): array
{
    $points = 0;
    $reasons = [];
    if (($metrics['sampleSize'] ?? 0) < 4) {
        $points += 18;
        $reasons[] = 'Muestra reciente corta en fuentes';
    }
    if (($metrics['starter'] ?? 0) < 45) {
        $points += 24;
        $reasons[] = 'Titularidad baja en muestra reciente (' . round((float)$metrics['starter']) . '%)';
    } elseif (($metrics['starter'] ?? 0) < 68) {
        $points += 11;
        $reasons[] = 'Titularidad no totalmente consolidada (' . round((float)$metrics['starter']) . '%)';
    } else {
        $reasons[] = 'Rol solido: ' . ($metrics['startCount'] ?? 0) . '/' . ($metrics['sampleSize'] ?? 0) . ' partidos recientes como titular o con muchos minutos';
    }
    if (($metrics['benchCount'] ?? 0) >= max(2, (int)ceil(($metrics['sampleSize'] ?? 0) * 0.35))) {
        $points += 12;
        $reasons[] = 'Ha sido suplente/banquillo en ' . ($metrics['benchCount'] ?? 0) . ' de los ultimos ' . ($metrics['sampleSize'] ?? 0);
    }
    if (!empty($metrics['hasFantasyStarterPrediction']) && ($fantasyProfile['nextStarterProbability'] ?? null) !== null) {
        $prob = (int)$fantasyProfile['nextStarterProbability'];
        if ($prob <= 10) {
            $points += 34;
            $reasons[] = 'FutbolFantasy solo le da ' . $prob . '% de titularidad';
        } elseif ($prob <= 30) {
            $points += 18;
            $reasons[] = 'FutbolFantasy le da baja probabilidad de titularidad (' . $prob . '%)';
        }
    }
    if (($metrics['avgRating'] ?? null) !== null) {
        $reasons[] = 'Media SofaScore reciente ' . number_format((float)$metrics['avgRating'], 2, '.', '');
        if ((float)$metrics['avgRating'] < 6.45) {
            $points += 9;
        }
    }
    if (!empty($fantasyProfile['unavailable'])) {
        $health = $fantasyProfile['health'] ?? [];
        $points += in_array($health['status'] ?? '', ['injured', 'suspended'], true) ? 36 : 18;
        $reasons[] = ($health['label'] ?? 'Incidencia') . (!empty($health['expectedReturn']) ? ': ' . $health['expectedReturn'] : '');
    }
    if ($competition === 'worldcup' && empty($metrics['usingNationalSample'])) {
        $points += 12;
        $reasons[] = 'Sin muestra suficiente reciente con seleccion; se extrapola desde club';
    }

    return [
        'risk' => $points >= 30 ? 'high' : ($points >= 14 ? 'medium' : 'low'),
        'riskReasons' => array_slice($reasons, 0, 5)
    ];
}

function confidence_from_signals(int $matchScore, array $metrics, ?array $fantasyProfile, string $competition): int
{
    $confidence = 48.0;
    $confidence += clamp($matchScore - 45, 0, 45) * 0.32;
    $confidence += min(16, ($metrics['sampleSize'] ?? 0) * 1.8);
    if (($metrics['avgRating'] ?? null) !== null) $confidence += 7;
    if ($fantasyProfile) $confidence += 10;
    if ($competition === 'worldcup' && empty($metrics['usingNationalSample'])) $confidence -= 12;
    if ($competition === 'worldcup' && $fantasyProfile && empty($metrics['fantasyContextAligned']) && empty($metrics['hasFantasyStarterPrediction'])) $confidence -= 12;
    if (($metrics['sampleSize'] ?? 0) < 4) $confidence -= 8;
    return (int)round(clamp($confidence, 35, 92));
}

function trend_from_signals(array $metrics, array $originalPlayer, array $sourcePlayer): int
{
    $trend = 0.0;
    $trend += (($metrics['form'] ?? 62) - 62) * 0.12;
    $trend += (($metrics['starter'] ?? 60) - 60) * 0.06;
    $userCount = (float)($sourcePlayer['userCount'] ?? 1);
    $trend += min(6, log10(max(1, $userCount) + 1) - 2);
    if (!empty($originalPlayer['price']) && (float)$originalPlayer['price'] < 1000000 && ($metrics['starter'] ?? 0) > 60) {
        $trend += 2;
    }
    return (int)round(clamp($trend, -8, 12));
}

function cache_remote_asset(string $url, string $key, string $assetsDir, int $timeoutSeconds, array $headers, bool $strictTls): ?string
{
    if ($url === '' || $key === '') {
        return null;
    }
    foreach (glob($assetsDir . DIRECTORY_SEPARATOR . $key . '.*') ?: [] as $existing) {
        return api_base_url() . '/media-db/' . rawurlencode(basename($existing));
    }
    try {
        $download = http_get_binary($url, $timeoutSeconds, $headers, $strictTls);
    } catch (Throwable $error) {
        return null;
    }
    $body = $download['body'] ?? '';
    if ($body === '' || strlen($body) > 500000) {
        return null;
    }
    $contentType = strtolower((string)($download['contentType'] ?? 'application/octet-stream'));
    $extension = '.bin';
    if (strpos($contentType, 'webp') !== false) $extension = '.webp';
    if (strpos($contentType, 'png') !== false) $extension = '.png';
    if (strpos($contentType, 'jpeg') !== false || strpos($contentType, 'jpg') !== false) $extension = '.jpg';
    $fileName = $key . $extension;
    file_put_contents($assetsDir . DIRECTORY_SEPARATOR . $fileName, $body);
    return api_base_url() . '/media-db/' . rawurlencode($fileName);
}

function build_media(array $sourcePlayer, array $detailPlayer, array $metrics, string $competition, string $assetsDir, int $timeoutSeconds, array $headers, bool $strictTls): array
{
    $playerId = (string)($sourcePlayer['id'] ?? '');
    $clubTeamId = $detailPlayer['team']['id'] ?? ($sourcePlayer['team']['id'] ?? null);
    $nationalTeamId = $metrics['nationalTeamId'] ?? null;
    $alpha2 = strtolower((string)($detailPlayer['country']['alpha2'] ?? ($sourcePlayer['country']['alpha2'] ?? '')));
    $emblemTeamId = $competition === 'worldcup' ? ($nationalTeamId ?: $clubTeamId) : $clubTeamId;
    $emblemRemoteUrl = $emblemTeamId
        ? 'https://api.sofascore.app/api/v1/team/' . $emblemTeamId . '/image'
        : ($alpha2 !== '' ? 'https://flagcdn.com/w80/' . $alpha2 . '.png' : null);

    $playerImage = $playerId !== '' ? cache_remote_asset('https://api.sofascore.app/api/v1/player/' . $playerId . '/image', 'player-' . $playerId, $assetsDir, $timeoutSeconds, $headers, $strictTls) : null;
    $emblemImage = $emblemRemoteUrl ? cache_remote_asset($emblemRemoteUrl, ($competition === 'worldcup' ? 'nation-' : 'team-') . ($emblemTeamId ?: $alpha2), $assetsDir, $timeoutSeconds, $headers, $strictTls) : null;

    return [
        'playerImage' => $playerImage,
        'emblemImage' => $emblemImage,
        'emblemKind' => $competition === 'worldcup' ? 'selection' : 'club',
        'emblemSourceId' => $emblemTeamId ?: ($alpha2 !== '' ? $alpha2 : null)
    ];
}

function enrich_player(
    array $originalPlayer,
    string $competition,
    int $criteriaVersion,
    int $timeoutSeconds,
    array $headers,
    bool $strictTls,
    string $assetsDir,
    array $teamSlugOverrides,
    array $searchOverrides,
    array $nationalTeamAlpha2
): array {
    try {
        $sourcePlayer = null;
        if (sofascore_is_blocked()) {
            return enrich_player_from_futbol_fantasy_only(
                $originalPlayer,
                $competition,
                $criteriaVersion,
                $timeoutSeconds,
                $headers,
                $strictTls,
                $teamSlugOverrides,
                $nationalTeamAlpha2,
                $assetsDir
            );
        }
        try {
            $sourcePlayer = find_sofascore_player($originalPlayer, $timeoutSeconds, $headers, $strictTls, $searchOverrides);
        } catch (Throwable $sourceError) {
            if (strpos($sourceError->getMessage(), '403') !== false) {
                mark_sofascore_blocked('Varnish challenge 403');
                return enrich_player_from_futbol_fantasy_only(
                    $originalPlayer,
                    $competition,
                    $criteriaVersion,
                    $timeoutSeconds,
                    $headers,
                    $strictTls,
                    $teamSlugOverrides,
                    $nationalTeamAlpha2,
                    $assetsDir
                );
            }
            throw $sourceError;
        }
        if (!$sourcePlayer) {
            return enrich_player_from_futbol_fantasy_only(
                $originalPlayer,
                $competition,
                $criteriaVersion,
                $timeoutSeconds,
                $headers,
                $strictTls,
                $teamSlugOverrides,
                $nationalTeamAlpha2,
                $assetsDir
            );
        }
        $playerId = (string)($sourcePlayer['id'] ?? '');
        $detailData = http_get_json('https://www.sofascore.com/api/v1/player/' . $playerId, $timeoutSeconds, $headers, $strictTls);
        $detailPlayer = is_array($detailData['player'] ?? null) ? $detailData['player'] : $sourcePlayer;
        $eventsData = http_get_json('https://www.sofascore.com/api/v1/player/' . $playerId . '/events/last/0', $timeoutSeconds, $headers, $strictTls);
        $fantasyProfile = get_futbol_fantasy_profile($detailPlayer, $originalPlayer, $competition, $timeoutSeconds, $headers, $strictTls, $teamSlugOverrides);
        $rawMetrics = build_metrics($eventsData, $detailPlayer, $competition);
        $metrics = merge_fantasy_signals($rawMetrics, $fantasyProfile, $competition);
        $media = build_media($sourcePlayer, $detailPlayer, $metrics, $competition, $assetsDir, $timeoutSeconds, $headers, $strictTls);
        $risk = risk_from_signals($metrics, $fantasyProfile, $competition);
        $confidence = confidence_from_signals((int)($sourcePlayer['matchScore'] ?? 0), $metrics, $fantasyProfile, $competition);
        $countryName = $detailPlayer['country']['name'] ?? ($sourcePlayer['country']['name'] ?? ($originalPlayer['nationalTeam'] ?? null));
        $clubName = $detailPlayer['team']['shortName'] ?? ($detailPlayer['team']['name'] ?? ($sourcePlayer['team']['name'] ?? ($originalPlayer['team'] ?? '')));
        $contextTeam = $competition === 'worldcup' ? ($metrics['nationalTeamName'] ?? $countryName ?? ($originalPlayer['team'] ?? 'Sin seleccion')) : $clubName;
        $position = map_position((string)($detailPlayer['position'] ?? ($sourcePlayer['position'] ?? ($originalPlayer['position'] ?? ''))));
        $sources = array_values(array_filter([
            'SofaScore (' . ($metrics['sampleSize'] ?? 0) . ' partidos)',
            $fantasyProfile ? 'FutbolFantasy' : null
        ]));
        $referenceValue = $detailPlayer['proposedMarketValueRaw']['value'] ?? ($detailPlayer['proposedMarketValue'] ?? ($sourcePlayer['proposedMarketValueRaw']['value'] ?? null));
        $health = $fantasyProfile['health'] ?? [
            'status' => 'unknown',
            'label' => 'Sin dato',
            'detail' => null,
            'expectedReturn' => null,
            'medicalUrl' => null,
            'injuryRisk' => null
        ];

        return [
            'clientId' => $originalPlayer['id'] ?? null,
            'sourceStatus' => 'live',
            'sourcePlayerId' => $sourcePlayer['id'] ?? null,
            'sourceMatchScore' => $sourcePlayer['matchScore'] ?? null,
            'criteriaVersion' => $criteriaVersion,
            'competitionScope' => $competition,
            'name' => $detailPlayer['name'] ?? ($sourcePlayer['name'] ?? ($originalPlayer['name'] ?? 'Jugador')),
            'originalName' => $originalPlayer['name'] ?? null,
            'team' => $contextTeam,
            'clubTeam' => $clubName,
            'baseTeam' => $clubName,
            'nationalTeam' => $countryName,
            'clubTeamId' => $metrics['clubTeamId'] ?? ($detailPlayer['team']['id'] ?? ($sourcePlayer['team']['id'] ?? null)),
            'nationalTeamId' => $metrics['nationalTeamId'] ?? null,
            'position' => $position,
            'starter' => (int)round($metrics['starter'] ?? 58),
            'form' => (int)round($metrics['form'] ?? 58),
            'asScore' => (int)round($metrics['asScore'] ?? 58),
            'sofascore' => (int)round($metrics['sofascore'] ?? 58),
            'stats' => (int)round($metrics['stats'] ?? 58),
            'valueTrend' => trend_from_signals($metrics, $originalPlayer, $sourcePlayer),
            'risk' => $risk['risk'],
            'riskReasons' => $risk['riskReasons'],
            'dataConfidence' => $confidence,
            'sources' => $sources,
            'media' => $media,
            'health' => $health,
            'sourceLinks' => [
                'sofascore' => 'https://www.sofascore.com/player/' . (($detailPlayer['slug'] ?? ($sourcePlayer['slug'] ?? 'player')) ?: 'player') . '/' . $playerId,
                'futbolFantasy' => $fantasyProfile['url'] ?? null,
                'futbolFantasyPublic' => null,
                'futbolFantasySearch' => futbol_fantasy_search_url_for(
                    (string)($fantasyProfile['profileName'] ?? ($detailPlayer['name'] ?? ($sourcePlayer['name'] ?? ($originalPlayer['name'] ?? 'Jugador')))),
                    $competition,
                    (string)$contextTeam
                ),
                'jornadaPerfecta' => 'https://www.jornadaperfecta.com/?s=' . rawurlencode((string)($detailPlayer['name'] ?? ($sourcePlayer['name'] ?? ($originalPlayer['name'] ?? 'Jugador'))))
            ],
            'referenceValue' => $referenceValue,
            'biwengerValue' => $fantasyProfile['biwengerValue'] ?? $referenceValue,
            'biwengerDiff' => $fantasyProfile['biwengerDiff'] ?? null,
            'note' => ($competition === 'worldcup' && empty($metrics['usingNationalSample']))
                ? 'Valoracion con fuentes reales, pero conservadora: no hay suficientes partidos recientes de seleccion y se extrapola desde ' . $clubName . '.'
                : 'Valoracion recalculada con fuentes reales: minutos, banquillo, rating SofaScore' . ($fantasyProfile ? ' y senales FutbolFantasy.' : '.'),
            'sourceSummary' => [
                'avgRating' => ($metrics['avgRating'] ?? null) !== null ? round((float)$metrics['avgRating'], 2) : null,
                'sampleSize' => $metrics['sampleSize'] ?? 0,
                'starts' => $metrics['startCount'] ?? 0,
                'played' => $metrics['playedCount'] ?? 0,
                'bench' => $metrics['benchCount'] ?? 0,
                'complete' => $metrics['completeCount'] ?? 0,
                'recentMatches' => $metrics['recentMatches'] ?? [],
                'usingNationalSample' => !empty($metrics['usingNationalSample']),
                'fantasy' => $fantasyProfile ? [
                    'competitionText' => $fantasyProfile['competitionText'] ?? null,
                    'profileName' => $fantasyProfile['profileName'] ?? null,
                    'isSelectionContext' => !empty($fantasyProfile['isSelectionContext']),
                    'usedForStarter' => !empty($metrics['fantasyContextAligned']) || !empty($metrics['hasFantasyStarterPrediction']),
                    'competitionMatches' => $fantasyProfile['competitionMatches'] ?? null,
                    'points' => $fantasyProfile['points'] ?? [],
                    'avgPoints' => $fantasyProfile['avgPoints'] ?? [],
                    'seasonStartRate' => $fantasyProfile['seasonStartRate'] ?? null,
                    'seasonMatches' => $fantasyProfile['seasonMatches'] ?? 0,
                    'seasonMinutesRate' => $fantasyProfile['seasonMinutesRate'] ?? null,
                    'lastThreeMinutes' => $fantasyProfile['lastThreeMinutes'] ?? null,
                    'nextStarterProbability' => $fantasyProfile['nextStarterProbability'] ?? null,
                    'biwengerValue' => $fantasyProfile['biwengerValue'] ?? null,
                    'biwengerDiff' => $fantasyProfile['biwengerDiff'] ?? null,
                    'teamLineupProbability' => $fantasyProfile['teamLineupProbability'] ?? null,
                    'teamLineupUrl' => $fantasyProfile['teamLineupUrl'] ?? null,
                    'calledUp' => !empty($fantasyProfile['calledUp']),
                    'health' => $fantasyProfile['health'] ?? null
                ] : null
            ]
        ];
    } catch (Throwable $error) {
        if (strpos($error->getMessage(), '403') !== false) {
            mark_sofascore_blocked('Varnish challenge 403');
            return enrich_player_from_futbol_fantasy_only(
                $originalPlayer,
                $competition,
                $criteriaVersion,
                $timeoutSeconds,
                $headers,
                $strictTls,
                $teamSlugOverrides,
                $nationalTeamAlpha2,
                $assetsDir
            );
        }
        return [
            'clientId' => $originalPlayer['id'] ?? null,
            'sourceStatus' => 'manual',
            'error' => $error->getMessage() !== '' ? $error->getMessage() : 'No se pudo enriquecer'
        ];
    }
}

function alternative_starter_estimate(array $player, array $identity, string $competition): array
{
    $position = map_position((string)($identity['position'] ?? ($player['position'] ?? 'MC')));
    $positionBase = ['POR' => 62, 'DF' => 60, 'MC' => 58, 'DL' => 56, 'ENT' => 88][$position] ?? 58;
    $price = max(0, (float)($player['biwengerValue'] ?? $player['price'] ?? 0));
    $priceScore = $price > 0 ? clamp((log10(max(100000, $price)) - 5) / 2.35 * 100, 18, 92) : 48;
    $points = max(0, (float)($player['competitionPoints'] ?? $player['points'] ?? 0));
    $pointsScore = $points > 0 ? clamp(42 + sqrt($points) * 4.8, 42, 92) : 48;
    $form = clamp((float)($player['form'] ?? 55), 25, 92);
    $existing = (float)($player['starter'] ?? 0);
    $hasUsefulExisting = $existing >= 5 && $existing <= 95 && !in_array((int)round($existing), [52, 58], true);
    $starter = $positionBase * 0.28 + $priceScore * 0.34 + $pointsScore * 0.18 + $form * 0.2;
    if ($hasUsefulExisting) $starter = $starter * 0.55 + $existing * 0.45;
    if ($competition === 'worldcup' && !empty($player['sourceSummary']['fantasy']['calledUp'])) $starter += 5;
    $healthStatus = strtolower((string)($player['health']['status'] ?? ''));
    if (in_array($healthStatus, ['injured', 'suspended'], true)) $starter = min($starter, 18);
    elseif ($healthStatus === 'doubtful') $starter = min($starter, 52);
    return [
        'starter' => (int)round(clamp($starter, 8, 94)),
        'method' => 'Biwenger value/points/form + ' . (string)($identity['provider'] ?? 'canonical identity'),
        'priceScore' => (int)round($priceScore),
        'pointsScore' => (int)round($pointsScore)
    ];
}

function enrich_player_from_futbol_fantasy_only(
    array $originalPlayer,
    string $competition,
    int $criteriaVersion,
    int $timeoutSeconds,
    array $headers,
    bool $strictTls,
    array $teamSlugOverrides,
    array $nationalTeamAlpha2,
    string $assetsDir
): array {
    $trustedBiwengerIdentity = !empty($originalPlayer['biwengerPlayerId']);
    $identity = $trustedBiwengerIdentity
        ? [
            'name' => $originalPlayer['name'] ?? null,
            'position' => map_position((string)($originalPlayer['position'] ?? 'MC')),
            'clubTeam' => $competition === 'club' ? ($originalPlayer['team'] ?? null) : ($originalPlayer['clubTeam'] ?? null),
            'nationalTeam' => $competition === 'worldcup' ? ($originalPlayer['team'] ?? null) : ($originalPlayer['nationalTeam'] ?? null),
            'provider' => 'Biwenger',
            'providerId' => (string)$originalPlayer['biwengerPlayerId'],
            'confirmedBy' => ['Biwenger'],
            'identityScore' => 145,
            'imageUrl' => $originalPlayer['media']['playerImage'] ?? null,
            'providerUrls' => [
                'Biwenger' => $originalPlayer['sourceLinks']['biwenger'] ?? null
            ]
        ]
        : resolve_canonical_identity($originalPlayer, $competition, $timeoutSeconds, $headers, $strictTls);
    if (!$identity) {
        return [
            'clientId' => $originalPlayer['id'] ?? null,
            'sourceStatus' => 'manual',
            'criteriaVersion' => $criteriaVersion,
            'error' => 'Identidad no confirmada por Biwenger/SoccerWiki/Transfermarkt; no se consulta FutbolFantasy para evitar homonimos'
        ];
    }
    $resolvedPlayer = $originalPlayer;
    $resolvedPlayer['name'] = $identity['name'] ?? ($originalPlayer['name'] ?? null);
    $resolvedPlayer['position'] = $identity['position'] ?? ($originalPlayer['position'] ?? null);
    $resolvedPlayer['clubTeam'] = $identity['clubTeam'] ?? ($originalPlayer['clubTeam'] ?? null);
    $resolvedPlayer['nationalTeam'] = $identity['nationalTeam'] ?? ($originalPlayer['nationalTeam'] ?? null);
    $resolvedPlayer['team'] = $competition === 'worldcup'
        ? ($identity['nationalTeam'] ?? ($originalPlayer['team'] ?? null))
        : ($identity['clubTeam'] ?? ($originalPlayer['team'] ?? null));
    $profile = get_futbol_fantasy_profile(
        ['name' => $resolvedPlayer['name'] ?? null],
        $resolvedPlayer,
        $competition,
        $timeoutSeconds,
        $headers,
        $strictTls,
        $teamSlugOverrides
    );

    $alternativeStarter = alternative_starter_estimate($originalPlayer, $identity, $competition);
    $usesAlternativeStarter = ($profile['nextStarterProbability'] ?? null) === null
        && ($profile['seasonStartRate'] ?? null) === null;
    $starter = ($profile['nextStarterProbability'] ?? null)
        ?? ($profile['seasonStartRate'] ?? null)
        ?? $alternativeStarter['starter'];
    $starter = (int)round(clamp((float)$starter, 5, 95));
    $seasonMinutes = $profile['seasonMinutesRate'] ?? null;
    $lastThreeMinutes = $profile['lastThreeMinutes'] ?? null;
    $formBase = $seasonMinutes !== null ? (float)$seasonMinutes : ($starter * 0.78);
    if ($lastThreeMinutes !== null) {
        $formBase = $formBase * 0.7 + clamp((((float)$lastThreeMinutes) / 90) * 100, 0, 100) * 0.3;
    }
    $form = (int)round(clamp($formBase, 35, 92));
    $health = ($profile['health'] ?? null) ?? [
        'status' => 'unknown',
        'label' => 'Sin dato',
        'detail' => null,
        'expectedReturn' => null,
        'medicalUrl' => null,
        'injuryRisk' => null
    ];
    $riskPoints = 0;
    $riskReasons = [$profile
        ? 'SofaScore bloqueado; estimacion combinada con FutbolFantasy y datos Biwenger'
        : 'SofaScore y FutbolFantasy sin titularidad; estimacion alternativa con Biwenger e identidad contrastada'];
    if ($starter <= 20) {
        $riskPoints += 24;
        $riskReasons[] = ($profile ? 'Fuentes combinadas' : 'Estimacion alternativa') . ' dan baja probabilidad de titularidad (' . $starter . '%)';
    } elseif ($starter <= 45) {
        $riskPoints += 12;
        $riskReasons[] = 'Titularidad dudosa segun fuentes disponibles (' . $starter . '%)';
    } else {
        $riskReasons[] = 'Fuentes disponibles lo proyectan con ' . $starter . '% de titularidad';
    }
    if (!empty($profile['unavailable'])) {
        $riskPoints += in_array($health['status'] ?? '', ['injured', 'suspended'], true) ? 36 : 18;
        $riskReasons[] = ($health['label'] ?? 'Incidencia') . (!empty($health['expectedReturn']) ? ': ' . $health['expectedReturn'] : '');
    }
    $risk = $riskPoints >= 30 ? 'high' : ($riskPoints >= 14 ? 'medium' : 'low');
    $name = (string)($identity['name'] ?? ($originalPlayer['name'] ?? 'Jugador'));
    $team = (string)($competition === 'worldcup'
        ? ($identity['nationalTeam'] ?? ($profile['teamName'] ?? ($originalPlayer['team'] ?? 'Sin seleccion')))
        : ($identity['clubTeam'] ?? ($profile['teamName'] ?? ($originalPlayer['team'] ?? 'Sin equipo'))));
    $selectionAlpha2 = $competition === 'worldcup' ? selection_alpha2($team, $nationalTeamAlpha2) : null;
    $remotePlayerImage = (string)($identity['imageUrl'] ?? ($profile['playerImageUrl'] ?? ''));
    $remoteEmblemImage = (string)($profile['emblemImageUrl'] ?? ($originalPlayer['media']['emblemImage'] ?? ''));
    if ($competition === 'worldcup' && $selectionAlpha2) {
        $remoteEmblemImage = 'https://flagcdn.com/w80/' . strtolower($selectionAlpha2) . '.png';
    }
    $playerAssetKey = !empty($identity['providerId'])
        ? 'identity-player-' . slugify((string)($identity['provider'] ?? 'source')) . '-' . slugify((string)$identity['providerId'])
        : 'ff-player-v9-' . slugify($name);
    $playerImage = $remotePlayerImage !== ''
        ? cache_remote_asset($remotePlayerImage, $playerAssetKey, $assetsDir, $timeoutSeconds, $headers, $strictTls)
        : null;
    $emblemImage = $remoteEmblemImage !== ''
        ? cache_remote_asset($remoteEmblemImage, 'identity-emblem-v9-' . slugify($team . '-' . $competition), $assetsDir, $timeoutSeconds, $headers, $strictTls)
        : null;
    $referenceValue = $profile['biwengerValue'] ?? ($originalPlayer['price'] ?? null);
    $identityProviders = array_values(array_unique($identity['confirmedBy'] ?? (!empty($identity['provider']) ? [$identity['provider']] : [])));
    $sources = array_values(array_filter(array_merge(
        $identityProviders,
        [$profile ? 'FutbolFantasy' : null, $usesAlternativeStarter ? 'Modelo alternativo Biwenger' : null]
    )));
    $identityConfidence = $identity ? min(92, 58 + count($identityProviders) * 14 + max(0, ((int)($identity['identityScore'] ?? 105) - 105) / 5)) : 0;

    return [
        'clientId' => $originalPlayer['id'] ?? null,
        'sourceStatus' => 'live',
        'sourcePlayerId' => $identity['providerId'] ?? null,
        'sourceMatchScore' => $identity['identityScore'] ?? null,
        'criteriaVersion' => $criteriaVersion,
        'competitionScope' => $competition,
        'name' => $name,
        'originalName' => $name,
        'team' => $team,
        'clubTeam' => $identity['clubTeam'] ?? ($competition === 'club' ? $team : null),
        'baseTeam' => $identity['clubTeam'] ?? ($competition === 'club' ? $team : null),
        'nationalTeam' => $identity['nationalTeam'] ?? ($competition === 'worldcup' ? $team : null),
        'clubTeamId' => null,
        'nationalTeamId' => null,
        'position' => map_position((string)($identity['position'] ?? ($originalPlayer['position'] ?? ($profile['fantasyPosition'] ?? 'MC')))),
        'starter' => $starter,
        'form' => $form,
        'asScore' => (int)round(clamp($starter * 0.56 + $form * 0.44, 35, 95)),
        'sofascore' => (int)round(clamp($starter * 0.52 + $form * 0.48, 35, 95)),
        'stats' => (int)round(clamp($starter * 0.5 + $form * 0.5, 35, 95)),
        'valueTrend' => ($profile['biwengerDiff'] ?? 0) > 0 ? 4 : (($profile['biwengerDiff'] ?? 0) < 0 ? -4 : 0),
        'risk' => $risk,
        'riskReasons' => array_slice($riskReasons, 0, 5),
        'dataConfidence' => (int)round(clamp($profile ? max(68, $identityConfidence) : $identityConfidence, 52, 92)),
        'sources' => $sources,
        'media' => [
            'playerImage' => $playerImage,
            'emblemImage' => $emblemImage,
            'emblemKind' => $competition === 'worldcup' ? 'selection' : 'club',
            'emblemSourceId' => null
        ],
        'health' => $health,
        'sourceLinks' => [
            'sofascore' => null,
            'futbolFantasy' => $profile['url'] ?? null,
            'futbolFantasyPublic' => null,
            'futbolFantasySearch' => futbol_fantasy_search_url_for($profile['profileName'] ?? $name, $competition, $team),
            'jornadaPerfecta' => 'https://www.jornadaperfecta.com/?s=' . rawurlencode($name),
            'biwenger' => $originalPlayer['sourceLinks']['biwenger'] ?? null,
            'soccerWiki' => $identity['providerUrls']['SoccerWiki'] ?? null,
            'transfermarkt' => $identity['providerUrls']['Transfermarkt'] ?? null
        ],
        'referenceValue' => $referenceValue,
        'biwengerValue' => $profile['biwengerValue'] ?? $referenceValue,
        'biwengerDiff' => $profile['biwengerDiff'] ?? null,
        'note' => $profile
            ? 'Identidad validada antes de consultar FutbolFantasy; SofaScore devuelve 403 desde este hosting.'
            : 'Identidad validada, pero sin ficha util en FutbolFantasy. Valoracion conservadora.',
        'sourceSummary' => [
            'identity' => $identity ? [
                'provider' => $identity['provider'] ?? null,
                'providerId' => $identity['providerId'] ?? null,
                'score' => $identity['identityScore'] ?? null,
                'confirmedBy' => $identityProviders,
                'nationalTeam' => $identity['nationalTeam'] ?? null,
                'clubTeam' => $identity['clubTeam'] ?? null,
                'position' => $identity['position'] ?? null
            ] : null,
            'avgRating' => null,
            'sampleSize' => 0,
            'starts' => 0,
            'played' => 0,
            'bench' => 0,
            'complete' => 0,
            'recentMatches' => [],
            'usingNationalSample' => false,
            'alternativeStarter' => $alternativeStarter,
            'fantasy' => $profile ? [
                'competitionText' => $profile['competitionText'] ?? null,
                'profileName' => $profile['profileName'] ?? null,
                'isSelectionContext' => !empty($profile['isSelectionContext']),
                'usedForStarter' => !$usesAlternativeStarter,
                'competitionMatches' => $profile['competitionMatches'] ?? null,
                'points' => $profile['points'] ?? [],
                'avgPoints' => $profile['avgPoints'] ?? [],
                'seasonStartRate' => $profile['seasonStartRate'] ?? null,
                'seasonMatches' => $profile['seasonMatches'] ?? 0,
                'seasonMinutesRate' => $profile['seasonMinutesRate'] ?? null,
                'lastThreeMinutes' => $profile['lastThreeMinutes'] ?? null,
                'nextStarterProbability' => $profile['nextStarterProbability'] ?? null,
                'biwengerValue' => $profile['biwengerValue'] ?? null,
                'biwengerDiff' => $profile['biwengerDiff'] ?? null,
                'teamLineupProbability' => $profile['teamLineupProbability'] ?? null,
                'teamLineupUrl' => $profile['teamLineupUrl'] ?? null,
                'calledUp' => !empty($profile['calledUp']),
                'health' => $health
            ] : null
        ]
    ];
}
