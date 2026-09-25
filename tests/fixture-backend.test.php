<?php
declare(strict_types=1);

$source = str_replace("\r\n", "\n", file_get_contents(__DIR__ . '/../api/index.php'));
foreach (['normalize_text', 'fixture_competition_family', 'identity_name_score', 'merge_fixture_payloads', 'merge_recent_detail_payloads'] as $name) {
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
check(count(merge_fixture_payloads($first, ['competition' => 'Premier League', 'events' => $other['events']])['events']) === 1, 'Competition must not leak');
check(count(merge_fixture_payloads($first, ['competition' => 'LaLiga', 'seasonName' => '2025/26', 'events' => $other['events']])['events']) === 1, 'Season must not leak');
$cancelled = $event('Athletic', 'Getafe', 'x', $time);
$cancelled['status'] = 'postponed';
check(count(merge_fixture_payloads($first, ['competition' => 'LaLiga', 'events' => [$cancelled]])['events']) === 1, 'Postponed event must not survive');

$details = merge_recent_detail_payloads([
    ['provider' => 'feeberse', 'recentMatches' => [['date' => '2026-09-20', 'opponent' => 'Real Madrid', 'goals' => null]]],
    ['provider' => 'api-football', 'recentMatches' => [['date' => '2026-09-20', 'opponent' => 'Real Madrid', 'goals' => 2]]]
]);
check($details['recentMatches'][0]['goals'] === 2, 'Goals must merge by match identity');
$unmatched = merge_recent_detail_payloads([
    ['provider' => 'biwenger', 'recentMatches' => [['points' => ['biwenger' => 0], 'goals' => null]]],
    ['provider' => 'api-football', 'recentMatches' => [['date' => '2026-09-20', 'opponent' => 'Real Madrid', 'goals' => 2]]]
]);
check($unmatched['recentMatches'][0]['goals'] === null, 'Undated fitness must not acquire external goals');
echo "Backend fixture/recent identity tests passed\n";
