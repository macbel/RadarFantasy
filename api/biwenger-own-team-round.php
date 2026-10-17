<?php
declare(strict_types=1);

/** Only inspect the authenticated user's round records, never profile/season totals. */
function biwenger_own_team_round(array $own, array $round, array $session): ?array
{
    $userId = (int)($session['userId'] ?? 0);
    $roundId = (string)($round['id'] ?? '');
    $roundName = trim((string)($round['name'] ?? ''));
    if ($userId <= 0 || ($roundId === '' && $roundName === '')) return null;
    if (is_array($own['data'] ?? null)) $own = $own['data'];
    if (is_array($own['user'] ?? null)) $own = array_merge($own, $own['user']);
    if (isset($own['id']) && (int)$own['id'] !== $userId) return null;
    $candidates = [];
    foreach (['currentRound', 'lineup'] as $key) {
        if (is_array($own[$key] ?? null)) $candidates[] = [$own[$key], false, $key];
    }
    foreach (['rounds', 'lineups'] as $key) {
        foreach ((array)($own[$key] ?? []) as $entry) {
            if (is_array($entry)) $candidates[] = [$entry, $key === 'rounds', $key];
        }
    }
    $best = null;
    foreach ($candidates as [$entry, $isRound, $source]) {
        $identity = is_array($entry['round'] ?? null) ? $entry['round'] : [];
        $id = (string)($entry['roundId'] ?? $entry['roundID'] ?? $identity['id'] ?? ($isRound || $source === 'currentRound' ? ($entry['id'] ?? '') : ''));
        $name = trim((string)($entry['roundName'] ?? $identity['name'] ?? ($isRound || $source === 'currentRound' ? ($entry['name'] ?? '') : '')));
        // IDs take precedence when both records expose one. Names may be compared only
        // when an ID is absent, so contradictory IDs cannot silently select another round.
        $sameName = $roundName !== '' && $name === $roundName;
        $ordinal = $entry['roundNumber'] ?? (is_numeric($entry['round'] ?? null) ? $entry['round'] : null);
        if (!$sameName && is_numeric($ordinal) && preg_match('/^(?:Jornada|J)\s*(\d+)$/iu', $roundName, $publicOrdinal)) {
            $sameName = (int)$ordinal > 0 && (int)$ordinal === (int)$publicOrdinal[1];
        }
        if (!$sameName && preg_match('/^(?:Jornada|J)\s*(\d+)$/iu', $roundName, $publicName)
            && preg_match('/^(?:Jornada|J)\s*(\d+)$/iu', $name, $privateName)) {
            $sameName = (int)$publicName[1] === (int)$privateName[1];
        }
        if ($roundId !== '' && $id !== '' ? $id !== $roundId : !$sameName) continue;
        if (isset($entry['userId']) && (int)$entry['userId'] !== $userId) continue;
        if (isset($entry['scoreId']) && (int)$entry['scoreId'] !== (int)($session['scoreId'] ?? 2)) continue;
        $base = ['roundId' => $round['id'] ?? null, 'roundName' => $roundName,
            'scoreId' => (int)($session['scoreId'] ?? 2), 'userId' => $userId,
            'total' => null, 'totalReliable' => false, 'source' => 'biwenger-own-' . $source,
            'known' => 0, 'count' => 0, 'updatedAt' => gmdate('c')];
        // Explicit round aggregates include captain/penalty adjustments. Zero is a valid result.
        foreach ([$entry, is_array($entry['lineup'] ?? null) ? $entry['lineup'] : []] as $aggregate) {
            foreach (['points', 'score', 'roundPoints', 'currentPoints'] as $key) {
                $value = $aggregate[$key] ?? null;
                if (is_array($value)) $value = $value[$base['scoreId']] ?? null;
                if (is_numeric($value)) {
                    return array_merge($base, ['total' => (float)$value, 'totalReliable' => true]);
                }
            }
        }
        $lineup = is_array($entry['lineup'] ?? null) ? $entry['lineup'] : $entry;
        $ids = [];
        foreach (['playersID', 'playersId', 'playersIDs', 'startersID', 'starterIds', 'eleven'] as $key) {
            foreach ((array)($lineup[$key] ?? []) as $player) {
                $pid = (int)(is_array($player) ? ($player['id'] ?? $player['playerID'] ?? 0) : $player);
                if ($pid > 0) $ids[$pid] = true;
            }
        }
        $points = [];
        // Explicit starter flags can identify the official eleven; an unlabelled
        // players collection might instead be the entire squad and is never summed.
        if (!$ids) foreach ((array)($lineup['players'] ?? []) as $player) {
            if (!is_array($player) || (empty($player['starter']) && empty($player['isStarter']))) continue;
            $pid = (int)($player['id'] ?? $player['playerID'] ?? $player['playerId'] ?? 0);
            if ($pid > 0) $ids[$pid] = true;
        }
        foreach ((array)($lineup['players'] ?? []) as $player) {
            if (!is_array($player)) continue;
            if (!empty($player['bench']) || !empty($player['isBench']) || !empty($player['substitute']) || !empty($player['isSubstitute']) || (isset($player['starter']) && !$player['starter']) || (isset($player['isStarter']) && !$player['isStarter'])) continue;
            $pid = (int)($player['id'] ?? $player['playerID'] ?? $player['playerId'] ?? 0);
            if ($pid <= 0) continue;
            if (!$ids) continue; // Do not infer an official eleven from an unlabelled squad.
            $value = $player['points'] ?? $player['roundPoints'] ?? $player['score'] ?? null;
            if (isset($ids[$pid]) && is_numeric($value)) $points[$pid] = (float)$value;
        }
        $raw = $lineup['pointsByPlayer'] ?? $lineup['playersPoints'] ?? [];
        if (is_array($raw)) {
            $list = !$raw || array_keys($raw) === range(0, count($raw) - 1);
            foreach (array_keys($ids) as $index => $pid) {
                $value = $raw[$list ? $index : $pid] ?? null;
                if (is_numeric($value)) $points[$pid] = (float)$value;
            }
        }
        $count = count($ids);
        $known = count($points);
        // Even eleven known player scores omit captain/striker bonuses and penalties.
        // Only an explicit official aggregate above is a reliable team total.
        $result = array_merge($base, ['total' => $known ? array_sum($points) : null,
            'totalReliable' => false, 'known' => $known, 'count' => $count]);
        if ($best === null || $known > $best['known']) $best = $result;
    }
    return $best;
}
