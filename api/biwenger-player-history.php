<?php
declare(strict_types=1);

const BIWENGER_PLAYER_HISTORY_SCHEMA = 'biwenger-player-history-v1';

function biwenger_history_event_minute(array $event): array
{
    $raw = $event['metadata'] ?? null;
    $label = is_scalar($raw) ? trim((string)$raw) : '';
    if (!preg_match('/^(\d{1,3})(?:\+(\d{1,2}))?$/', $label, $parts)) return [null, null];
    $minute = (int)$parts[1] + (int)($parts[2] ?? 0);
    if (isset($parts[2])) return [$minute, $label];
    if (($event['period'] ?? '') === 'firstTime' && $minute > 45) $label = '45+' . ($minute - 45);
    if (($event['period'] ?? '') === 'secondTime' && $minute > 90) $label = '90+' . ($minute - 90);
    return [$minute, $label];
}

function biwenger_history_parse(array $data, string $competition, string $season, int $playerId, int $scoreId): array
{
    if ((int)($data['id'] ?? 0) !== $playerId) throw new RuntimeException('La identidad del jugador no coincide');
    if ((string)($data['competition']['slug'] ?? '') !== $competition) throw new RuntimeException('La competición del jugador no coincide');
    $selected = null;
    foreach ((array)($data['seasons'] ?? []) as $candidate) {
        if (!is_array($candidate) || (string)($candidate['competition']['slug'] ?? $competition) !== $competition) continue;
        if ((string)($candidate['id'] ?? '') === $season || ($season === '' && !empty($candidate['selected']))) { $selected = $candidate; break; }
    }
    if ($selected === null) throw new RuntimeException('La temporada del jugador no coincide');
    $season = (string)$selected['id'];
    $matches = [];
    foreach ((array)($data['reports'] ?? []) as $report) {
        if (!is_array($report) || !is_array($report['match'] ?? null)) continue;
        $match = $report['match'];
        $matchId = (int)($match['id'] ?? 0);
        if ($matchId <= 0 || strtolower((string)($match['status'] ?? '')) !== 'finished') continue;
        $timestamp = (int)($match['date'] ?? 0);
        if ($timestamp >= 1000000000000) $timestamp = (int)floor($timestamp / 1000);
        if ($timestamp <= 0) continue;
        $points = $report['points'] ?? null;
        $score = is_array($points) ? ($points[(string)$scoreId] ?? null) : null;
        $score = is_numeric($score) ? (float)$score : null;
        $events = is_array($report['events'] ?? null) ? $report['events'] : null;
        $goals = 0; $assists = 0; $minuteIn = null; $minuteOut = null; $dismissalMinute = null; $minuteInLabel = null; $minuteOutLabel = null; $dismissalLabel = null;
        $participationEvent = false;
        foreach ($events ?? [] as $event) {
            if (!is_array($event)) continue;
            $type = (int)($event['type'] ?? 0);
            if (in_array($type, [1, 2, 3, 4, 5], true)) $participationEvent = true;
            if ($type === 1 || $type === 2) $goals++;
            if ($type === 3) $assists++;
            [$minute, $label] = biwenger_history_event_minute($event);
            if ($type === 5 && $minute !== null) { $minuteIn = $minute; $minuteInLabel = $label; }
            if ($type === 4 && $minute !== null) { $minuteOut = $minute; $minuteOutLabel = $label; }
            if (in_array($type, [7, 8], true) && $minute !== null) { $dismissalMinute = $minute; $dismissalLabel = $label; }
        }
        $played = $score !== null || $participationEvent;
        $home = $match['home'] ?? [];
        $away = $match['away'] ?? [];
        $isHome = $report['home'] ?? null;
        if (!is_bool($isHome)) continue;
        $opponent = $isHome ? $away : $home;
        $starter = $played ? ($minuteIn !== null ? false : true) : null;
        $endMinute = $minuteOut ?? $dismissalMinute;
        $minutes = !$played ? null : ($endMinute !== null ? max(0, $endMinute - ($minuteIn ?? 0)) : ($minuteIn !== null ? max(0, 90 - $minuteIn) : 90));
        $key = 'biwenger:' . $competition . ':' . $season . ':' . $matchId;
        $matches[$key] = [
            'provider' => 'biwenger', 'matchKey' => $key, 'eventId' => $matchId,
            'competition' => $competition, 'seasonId' => $season, 'seasonName' => (string)($selected['name'] ?? ''),
            'historyScope' => 'current-season', 'round' => (string)($match['round']['name'] ?? ''),
            'timestamp' => $timestamp, 'date' => gmdate('Y-m-d', $timestamp), 'status' => 'finished',
            'homeTeam' => (string)($home['name'] ?? ''), 'awayTeam' => (string)($away['name'] ?? ''),
            'opponent' => (string)($opponent['name'] ?? ''), 'home' => $isHome,
            'played' => $played, 'points' => ['biwenger' => $score], 'scoreSystemId' => $scoreId,
            'scoreSystem' => biwenger_score_name($scoreId),
            'scoreProvenance' => $score !== null ? 'official-exact' : 'official-pending', 'scoreScope' => 'match',
            'goals' => $played && $events !== null ? $goals : null, 'assists' => $played && $events !== null ? $assists : null,
            'starter' => $starter, 'minuteIn' => $minuteIn, 'minuteOut' => $minuteOut,
            'minuteInLabel' => $minuteInLabel, 'minuteOutLabel' => $minuteOutLabel,
            'dismissalMinute' => $dismissalMinute, 'dismissalLabel' => $dismissalLabel,
            'minutes' => $minutes, 'minutesSource' => 'derived-regulation',
            'fieldProvenance' => ['points' => 'biwenger-report', 'goals' => $events !== null ? 'biwenger-events' : null,
                'assists' => $events !== null ? 'biwenger-events' : null, 'minutes' => 'derived-regulation'],
            'events' => $events
        ];
    }
    uasort($matches, static fn($a, $b) => $b['timestamp'] <=> $a['timestamp']);
    return ['provider' => 'biwenger', 'schema' => BIWENGER_PLAYER_HISTORY_SCHEMA, 'competition' => $competition,
        'seasonId' => $season, 'scoreId' => $scoreId, 'recentMatches' => array_slice(array_values($matches), 0, 5)];
}

function biwenger_player_history(string $competition, string $season, int $playerId, int $scoreId, int $timeout, array $headers, bool $strictTls, string $dbDir): array
{
    if (!preg_match('/^[a-z0-9-]+$/', $competition) || $playerId <= 0 || $scoreId <= 0 || ($season !== '' && !preg_match('/^[a-zA-Z0-9_-]+$/', $season))) throw new RuntimeException('Contexto Biwenger inválido');
    $cachePath = $dbDir . DIRECTORY_SEPARATOR . BIWENGER_PLAYER_HISTORY_SCHEMA . '-' . hash('sha256', implode(':', [$competition, $season, $playerId, $scoreId])) . '.json';
    $cached = is_file($cachePath) ? json_decode((string)file_get_contents($cachePath), true) : null;
    $now = time();
    if (is_array($cached) && ($cached['expiresAt'] ?? 0) > $now) {
        if (isset($cached['error'])) throw new RuntimeException((string)$cached['error']);
        return $cached['payload'];
    }
    try {
        $fields = '*,team,fitness,reports(points,home,events,status(status,statusInfo),match(*,round,home,away),star),competition,seasons';
        $url = 'https://cf.biwenger.com/api/v2/players/' . rawurlencode($competition) . '/' . $playerId
            . '?lang=es' . ($season !== '' ? '&season=' . rawurlencode($season) : '') . '&fields=' . rawurlencode($fields);
        $response = http_get_json($url, $timeout, $headers, $strictTls);
        $data = $response['data'] ?? null;
        if (!is_array($data)) throw new RuntimeException('Biwenger no devolvió el jugador');
        $payload = biwenger_history_parse($data, $competition, $season, $playerId, $scoreId);
        $ttl = 600;
        if (!is_dir($dbDir)) mkdir($dbDir, 0775, true);
        file_put_contents($cachePath, json_encode(['expiresAt' => $now + $ttl, 'payload' => $payload], JSON_UNESCAPED_UNICODE));
        return $payload;
    } catch (Throwable $error) {
        if (is_array($cached) && isset($cached['payload']) && ($cached['expiresAt'] ?? 0) > $now - 3600) return $cached['payload'] + ['stale' => true];
        if (!is_dir($dbDir)) mkdir($dbDir, 0775, true);
        file_put_contents($cachePath, json_encode(['expiresAt' => $now + 45, 'error' => $error->getMessage()], JSON_UNESCAPED_UNICODE));
        throw $error;
    }
}
