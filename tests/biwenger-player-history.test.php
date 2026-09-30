<?php
declare(strict_types=1);

function biwenger_score_name(int $scoreId): string
{
    return 'Sistema ' . $scoreId;
}

require_once dirname(__DIR__) . '/api/biwenger-player-history.php';

function report_fixture(int $id, int $timestamp, ?array $points, ?array $events, bool $home = true): array
{
    return [
        'home' => $home,
        'points' => $points,
        'events' => $events,
        'match' => [
            'id' => $id,
            'date' => $timestamp,
            'status' => 'finished',
            'round' => ['name' => 'Jornada ' . $id],
            'home' => ['name' => 'Equipo local'],
            'away' => ['name' => 'Equipo visitante'],
        ],
    ];
}

$payload = biwenger_history_parse([
    'id' => 9047,
    'competition' => ['slug' => 'la-liga'],
    'seasons' => [['id' => 2027, 'name' => '2026-2027', 'selected' => true]],
    'reports' => [
        report_fixture(101, 1700000000, ['5' => 0], []),
        report_fixture(102, 1700001000, null, null),
        report_fixture(103, 1700002000, ['5' => 12], [
            ['type' => 5, 'period' => 'secondTime', 'metadata' => 54],
            ['type' => 1, 'period' => 'secondTime', 'metadata' => 89],
            ['type' => 3, 'period' => 'secondTime', 'metadata' => 89],
            ['type' => 4, 'period' => 'secondTime', 'metadata' => 90],
        ]),
        report_fixture(104, 1700003000, ['5' => 5], [
            ['type' => 7, 'period' => 'firstTime', 'metadata' => 49],
        ]),
    ],
], 'la-liga', '', 9047, 5);

$matches = $payload['recentMatches'];
if (count($matches) !== 4) throw new RuntimeException('Deben conservarse los cuatro partidos identificados');
if (array_column($matches, 'eventId') !== [104, 103, 102, 101]) throw new RuntimeException('Los partidos no están ordenados por fecha descendente');
if ($matches[2]['played'] !== false || $matches[2]['points']['biwenger'] !== null) throw new RuntimeException('El partido intermedio no jugado debe conservarse como DNP');
if ($matches[3]['played'] !== true || $matches[3]['points']['biwenger'] !== 0.0) throw new RuntimeException('Cero puntos debe seguir siendo participación válida');
if ($matches[1]['goals'] !== 1 || $matches[1]['assists'] !== 1 || $matches[1]['minuteIn'] !== 54 || $matches[1]['minuteOut'] !== 90) {
    throw new RuntimeException('Goles, asistencias y cambios no corresponden al partido exacto');
}
if ($matches[0]['dismissalMinute'] !== 49 || $matches[0]['dismissalLabel'] !== '45+4' || $matches[0]['minuteOut'] !== null) {
    throw new RuntimeException('Una expulsión en descuento no debe convertirse en sustitución');
}

echo "Biwenger exact player history parser passed\n";
