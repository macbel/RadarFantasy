<?php
declare(strict_types=1);

$source = str_replace("\r\n", "\n", file_get_contents(__DIR__ . '/../api/index.php'));
foreach (['normalize_text', 'slugify', 'fixture_competition_family', 'identity_name_score', 'fixture_payload_usable', 'biwenger_fixture_session_context', 'fixture_cache_key', 'fixture_upcoming_team_count', 'merge_fixture_payloads', 'filter_fixture_payload_to_competition', 'decorate_fixture_competition_state', 'fast_current_fixtures', 'biwenger_path_value', 'biwenger_player_round_goals', 'merge_recent_detail_payloads'] as $name) {
    $start = strpos($source, "function $name(");
    if ($start === false) throw new RuntimeException("Missing production function $name");
    $end = $name === 'merge_recent_detail_payloads'
        ? strpos($source, "\nsend_json(404", $start + 1)
        : strpos($source, "\nfunction ", $start + 1);
    if ($end === false) throw new RuntimeException("Cannot isolate production function $name");
    eval(substr($source, $start, $end - $start));
}

function check(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }

$time = time() + 86400;
$event = static fn(string $home, string $away, string $id, int $at) => [
    'id' => $id, 'competition' => 'LaLiga', 'timestamp' => $at, 'status' => 'notstarted',
    'home' => ['name' => $home], 'away' => ['name' => $away]
];
$first = ['competition' => 'LaLiga', 'seasonName' => '2026/27', 'events' => [$event('FC Barcelona', 'Real Madrid', 'fee-1', $time)]];
$session = ['competition' => 'LaLiga'];
$catalogSession = ['leagueId' => 17, 'competition' => 'LaLiga', 'availableLeagues' => [
    ['id' => 17, 'competition' => 'la-liga'], ['id' => 29, 'competition' => 'bundesliga']
]];
check(biwenger_fixture_session_context($catalogSession)['competition'] === 'la-liga', 'Exact league ID must set fixture competition');
$catalogSession['leagueId'] = 29;
$catalogSession['competition'] = 'Bundesliga';
check(biwenger_fixture_session_context($catalogSession)['competition'] === 'bundesliga', 'Second exact league ID must select Bundesliga');
$catalogSession['leagueId'] = 17;
try { biwenger_fixture_session_context($catalogSession); throw new RuntimeException('Stale Bundesliga session accepted for LaLiga'); }
catch (RuntimeException $error) { check(str_contains($error->getMessage(), 'otra competicion'), 'Contradictory session must be rejected'); }
$catalogSession['competition'] = '';
$catalogSession['availableLeagues'][0]['competition'] = '';
try { biwenger_fixture_session_context($catalogSession); throw new RuntimeException('Unknown competition accepted'); }
catch (RuntimeException $error) { check(str_contains($error->getMessage(), 'no ha identificado'), 'Missing exact metadata must be rejected'); }
$valid = ['ok' => true] + $first;
check(fixture_payload_usable($valid, $session), 'Future event must be usable');
$past = $valid;
$past['events'][0]['timestamp'] = time() - 86400;
check(!fixture_payload_usable($past, $session), 'Past-only 200 must trigger fallback');
check(!fixture_payload_usable(['ok' => true, 'competition' => 'LaLiga', 'events' => []], $session), 'Empty 200 must trigger fallback');
check(!fixture_payload_usable(['ok' => true, 'competition' => 'Premier League', 'events' => $valid['events']], $session), 'Wrong competition must trigger fallback');
check(!fixture_payload_usable(['ok' => true, 'competition' => 'LaLiga', 'seasonName' => '2020/21', 'events' => $valid['events']], $session), 'Old season must trigger fallback');
check(str_starts_with(fixture_cache_key('espn', $session), 'espn-v10-'), 'Provider and version must scope cache');
$other = ['competition' => 'La Liga', 'seasonName' => '2026/27', 'events' => [
    $event('Barcelona', 'Real Madrid', 'sofa-1', $time + 900),
    $event('Betis', 'Sevilla', 'sofa-2', $time + 2000),
    $event('Osasuna', 'Valencia', 'sofa-3', $time + 2500)
]];
$merged = merge_fixture_payloads($first, $other);
check(count($merged['events']) === 3, 'Alias/date pair must dedupe providers');
check($merged['providerCoverage']['primaryTeams'] === 2 && $merged['providerCoverage']['secondaryTeams'] === 6, 'Partial provider coverage must be measured');
$teams = ['Alavés', 'Athletic', 'Atlético', 'Barcelona', 'Betis', 'Celta', 'Elche', 'Espanyol', 'Getafe', 'Girona', 'Levante', 'Mallorca', 'Osasuna', 'Oviedo', 'Rayo', 'Real Madrid', 'Real Sociedad', 'Sevilla', 'Valencia', 'Villarreal'];
$fullEvents = [];
for ($index = 0; $index < 9; $index++) $fullEvents[] = $event($teams[$index * 2], $teams[$index * 2 + 1], 'sofa-' . $index, $time + $index * 3600);
$partial = ['competition' => 'LaLiga', 'seasonName' => '2026/27', 'events' => [$event($teams[0], $teams[1], 'fee-1', $time)]];
$wide = ['competition' => 'LaLiga', 'seasonName' => '2026/27', 'events' => $fullEvents];
$wideMerged = merge_fixture_payloads($partial, $wide);
check(count($wideMerged['events']) === 9, 'A 2/20 window must be replaced by the 18/20 season schedule');
check($wideMerged['providerCoverage']['primaryTeams'] === 2 && $wideMerged['providerCoverage']['secondaryTeams'] === 18 && $wideMerged['providerCoverage']['mergedTeams'] === 18, 'Coverage must reflect the wider schedule');
check(fixture_upcoming_team_count($partial) === 2 && fixture_upcoming_team_count($wideMerged) === 18, 'Backend must detect partial LaLiga coverage for fallback');
check(count(merge_fixture_payloads($first, ['competition' => 'Premier League', 'events' => $other['events']])['events']) === 1, 'Competition must not leak');
check(count(merge_fixture_payloads($first, ['competition' => 'LaLiga', 'seasonName' => '2025/26', 'events' => $other['events']])['events']) === 1, 'Season must not leak');
$cancelled = $event('Athletic', 'Getafe', 'x', $time);
$cancelled['status'] = 'postponed';
check(count(merge_fixture_payloads($first, ['competition' => 'LaLiga', 'events' => [$cancelled]])['events']) === 1, 'Postponed event must not survive');

$providerRows = [];
function test_fixture_source(string $name): array {
    global $providerRows;
    if (!isset($providerRows[$name])) throw new RuntimeException('unavailable');
    return $providerRows[$name];
}
function sofascore_current_fixtures(): array { return test_fixture_source('sofascore'); }
function api_football_current_fixtures(): array { return test_fixture_source('api-football'); }
function espn_current_fixtures(): array { return test_fixture_source('espn'); }
function thesportsdb_current_fixtures(): array { return test_fixture_source('thesportsdb'); }
function resultados_futbol_calendar_fixtures(): array { return test_fixture_source('resultados-futbol'); }
function feeberse_current_fixtures(): array { return test_fixture_source('feeberse'); }
$providerRows = ['sofascore' => $past, 'espn' => $valid];
$resolved = fast_current_fixtures($session, 1, [], true, sys_get_temp_dir());
check(str_contains($resolved['sourceStrategy'], 'espn') && !str_contains($resolved['sourceStrategy'], 'sofascore'), 'Past-only first provider must fall back');
$providerRows = ['sofascore' => ['ok' => true, 'competition' => 'LaLiga', 'events' => []], 'espn' => $valid];
check(str_contains(fast_current_fixtures($session, 1, [], true, sys_get_temp_dir())['sourceStrategy'], 'espn'), 'Empty 200 must fall back');
$providerRows = ['sofascore' => ['ok' => true, 'competition' => 'Premier League', 'events' => $valid['events']], 'espn' => $valid];
check(str_contains(fast_current_fixtures($session, 1, [], true, sys_get_temp_dir())['sourceStrategy'], 'espn'), 'Wrong competition must fall back');
$providerRows = ['sofascore' => $valid, 'espn' => ['ok' => true] + $other];
check(count(fast_current_fixtures($session, 1, [], true, sys_get_temp_dir())['events']) === 3, 'Compatible partial calendars must merge');
$providerRows = ['sofascore' => $past];
try { fast_current_fixtures($session, 1, [], true, sys_get_temp_dir()); throw new RuntimeException('No-upcoming fixtures were accepted'); }
catch (RuntimeException $error) { check(str_contains($error->getMessage(), 'proximos partidos'), 'All-past providers must yield a diagnostic error'); }

$details = merge_recent_detail_payloads([
    ['provider' => 'feeberse', 'recentMatches' => [['date' => '2026-09-20', 'opponent' => 'Real Madrid', 'goals' => null]]],
    ['provider' => 'api-football', 'recentMatches' => [['date' => '2026-09-20', 'opponent' => 'Real Madrid', 'goals' => 2]]]
]);
check($details['recentMatches'][0]['goals'] === 2, 'Goals must merge by match identity');
$unmatched = merge_recent_detail_payloads([
    ['provider' => 'biwenger', 'recentMatches' => [['points' => ['biwenger' => 0], 'goals' => null]]],
    ['provider' => 'api-football', 'recentMatches' => [['date' => '2026-09-20', 'opponent' => 'Real Madrid', 'goals' => 2]]]
]);
check(count($unmatched['recentMatches']) === 2
    && ($unmatched['recentMatches'][1]['goals'] ?? null) === null,
    'Undated fitness must not acquire external goals');
check(biwenger_player_round_goals([]) === null && biwenger_player_round_goals(['goals' => 0]) === 0,
    'Historical goals must distinguish absent field from confirmed zero');
$collidingIds = merge_recent_detail_payloads([
    ['provider' => 'feeberse', 'recentMatches' => [['provider' => 'feeberse', 'eventId' => 7, 'date' => '2026-09-20', 'opponent' => 'Betis', 'goals' => null]]],
    ['provider' => 'api-football', 'recentMatches' => [['provider' => 'api-football', 'eventId' => 7, 'date' => '2026-09-20', 'opponent' => 'Sevilla', 'goals' => 1]]]
]);
check(count($collidingIds['recentMatches']) === 2, 'Raw event IDs from separate providers must not join different matches');
echo "Backend fixture/recent identity tests passed\n";
