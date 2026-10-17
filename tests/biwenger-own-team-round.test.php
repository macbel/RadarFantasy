<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/api/biwenger-own-team-round.php';
$session = ['userId' => 22, 'scoreId' => 5];
$round = ['id' => 900, 'name' => 'Jornada 9', 'pointsByPlayer' => [1 => 99]];
function check_round(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
foreach ([0, -3, 42] as $total) {
    $result = biwenger_own_team_round(['id' => 22, 'points' => 1200, 'currentRound' => ['id' => 900, 'points' => $total]], $round, $session);
    check_round($result['total'] === (float)$total && $result['totalReliable'], 'Explicit current-round aggregate must win, including zero and negative');
}
check_round(biwenger_own_team_round(['id' => 22, 'points' => 1200, 'lineup' => ['points' => 42], 'rounds' => [['id' => 899, 'points' => 80]]], $round, $session) === null, 'Season/unidentified/previous round must never masquerade as current');
check_round(biwenger_own_team_round(['id' => 23, 'currentRound' => ['id' => 900, 'points' => 90]], $round, $session) === null, 'Other user must be rejected');
check_round(biwenger_own_team_round(['currentRound' => ['id' => 900, 'scoreId' => 2, 'points' => 90]], $round, $session) === null, 'Other scoring system must be rejected');
check_round(biwenger_own_team_round(['currentRound' => ['id' => 899, 'name' => 'Jornada 9', 'points' => 90]], $round, $session) === null, 'Contradictory round IDs must override a matching name');
$named = biwenger_own_team_round(['rounds' => [['name' => 'J9', 'points' => ['5' => 23, '2' => 99]]]], $round, $session);
check_round($named['total'] === 23.0 && $named['roundId'] === 900, 'Exact ordinal names and scoring-system maps');
$ordinal = biwenger_own_team_round(['lineup' => ['round' => 9, 'points' => 12]], $round, $session);
check_round($ordinal['total'] === 12.0, 'Numeric round ordinal must match exact current round name');
check_round(biwenger_own_team_round(['lineup' => ['round' => 8, 'points' => 80]], $round, $session) === null, 'Previous numeric ordinal must be rejected');
$lineup = ['roundId' => 900, 'playersID' => range(1, 11), 'playersPoints' => [0, -1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'bench' => [['id' => 12, 'points' => 100]]];
$result = biwenger_own_team_round(['lineup' => $lineup], $round, $session);
check_round($result['total'] === 53.0 && $result['known'] === 11 && $result['count'] === 11 && !$result['totalReliable'], 'Eleven-player subtotal excludes bench but cannot guarantee captain bonuses or penalties');
array_pop($lineup['playersPoints']);
$result = biwenger_own_team_round(['lineup' => $lineup], $round, $session);
check_round($result['total'] === 43.0 && !$result['totalReliable'] && $result['known'] === 10, 'Incomplete eleven is explicitly partial');
$result = biwenger_own_team_round(['currentRound' => ['id' => 900, 'players' => [['id' => 1, 'points' => 99]]]], $round, $session);
check_round($result['total'] === null && !$result['totalReliable'] && $result['count'] === 0, 'Unlabelled squad and public player scores cannot fabricate an official total');
echo "Biwenger own current round fixtures passed\n";
