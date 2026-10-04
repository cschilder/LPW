<?php
// MQTT-SN-brug (MQTT-SN 1.2, binair over UDP) — praat met een MQTT-SN-gateway.
//   action=publish   → CONNECT, REGISTER, PUBLISH (QoS 0/1) ×n, DISCONNECT
//   action=qosm1     → PUBLISH met QoS -1: zonder verbinding, voorgedefinieerd topic-ID
//   action=subscribe → CONNECT, SUBSCRIBE, berichten ontvangen (REGISTER + PUBLISH van de
//                      gateway, met PUBACK/REGACK), DISCONNECT
require __DIR__ . '/_lib.php';
bootstrap();

const SN = [0x04 => 'CONNECT', 0x05 => 'CONNACK', 0x0a => 'REGISTER', 0x0b => 'REGACK', 0x0c => 'PUBLISH',
    0x0d => 'PUBACK', 0x12 => 'SUBSCRIBE', 0x13 => 'SUBACK', 0x16 => 'PINGREQ', 0x17 => 'PINGRESP', 0x18 => 'DISCONNECT'];
const RC = [0 => 'geaccepteerd', 1 => 'afgewezen: congestie', 2 => 'afgewezen: ongeldig topic-ID', 3 => 'afgewezen: niet ondersteund'];

function sn_pkt(int $type, string $body): string
{
    $len = strlen($body) + 2;
    return ($len > 255 ? "\x01" . pack('n', $len + 2) : chr($len)) . chr($type) . $body;
}
function sn_parse(string $d): array
{
    $off = 0;
    $len = ord($d[0]);
    if ($len === 1) {
        $len = unpack('n', substr($d, 1, 2))[1];
        $off = 2;
    }
    return ['type' => ord($d[$off + 1]), 'body' => substr($d, $off + 2)];
}
function sn_send($s, int $type, string $body, string $note = ''): void
{
    $p = sn_pkt($type, $body);
    fwrite($s, $p);
    trace('out', SN[$type], ($note ? "$note\n" : '') . 'hex: ' . hexdump($p, 64));
}
/** Wacht op een pakket van een bepaald type (andere worden gelogd en eventueel afgehandeld). */
function sn_expect($s, array $types, float $timeout, ?callable $other = null): ?array
{
    $end = microtime(true) + $timeout;
    while (($left = $end - microtime(true)) > 0) {
        $d = udp_recv($s, $left);
        if ($d === null) {
            return null;
        }
        $p = sn_parse($d);
        trace('in', SN[$p['type']] ?? sprintf('0x%02x', $p['type']), 'hex: ' . hexdump($d, 64));
        if (in_array($p['type'], $types, true)) {
            return $p;
        }
        if ($other) {
            $other($p);
        }
    }
    return null;
}

$action = str_arg('action', 'publish', 20);
$host = str_arg('host', '', 253);
$port = (int) arg('port', 1884);
$clientId = preg_replace('/[^A-Za-z0-9_-]/', '', str_arg('clientId', 'lpw-sensor', 23)) ?: 'lpw-sensor';
$topic = one_line(str_arg('topic', 'lpw/sensor/temperatuur', 200));
$qos = max(0, min(1, (int) arg('qos', 1)));
$ip = guard('mqttsn', $host, $port, [1883, 1884, 1885, 10000]);
$s = udp_open($ip, $port);
$msgId = 1;
$result = ['steps' => []];
$step = function (string $what, string $res) use (&$result) { $result['steps'][] = [$what, $res]; };

if ($action === 'qosm1') {
    $tid = max(1, min(0xffff, (int) arg('topicId', 1)));
    $data = str_arg('message', '21.5', 200);
    sn_send($s, 0x0c, chr(0x60 | 0x01) . pack('nn', $tid, 0) . $data, "QoS -1 · voorgedefinieerd topic-ID $tid · geen CONNECT nodig");
    $step("PUBLISH QoS -1 → topic-ID $tid", 'verstuurd (er komt bewust géén bevestiging)');
    fclose($s);
    out($result);
}

// ---- CONNECT
$duration = 60;
sn_send($s, 0x04, chr(0x04) . chr(0x01) . pack('n', $duration) . $clientId, "client-ID \"$clientId\" · clean session · keep-alive {$duration}s");
$ack = sn_expect($s, [0x05], (float) cfg('timeout'));
if (!$ack) {
    fail('Geen CONNACK — draait er een MQTT-SN-gateway op dit adres?', 504);
}
$rc = ord($ack['body'][0]);
$step('CONNECT', "CONNACK: " . (RC[$rc] ?? "code $rc"));
if ($rc !== 0) {
    fail('Gateway weigerde de verbinding: ' . (RC[$rc] ?? $rc), 502);
}

if ($action === 'publish') {
    // ---- REGISTER: topicnaam → kort topic-ID (bespaart bytes in elk PUBLISH)
    sn_send($s, 0x0a, pack('nn', 0, $msgId) . $topic, "\"$topic\" registreren");
    $reg = sn_expect($s, [0x0b], 5.0);
    if (!$reg) {
        fail('Geen REGACK ontvangen', 504);
    }
    $tid = unpack('n', substr($reg['body'], 0, 2))[1];
    $step("REGISTER \"$topic\"", "REGACK: topic-ID $tid · " . (RC[ord($reg['body'][4])] ?? '?'));
    $msgs = arg('messages', [str_arg('message', '21.5', 200)]);
    foreach (array_slice(is_array($msgs) ? $msgs : [$msgs], 0, 10) as $data) {
        $data = (string) $data;
        $msgId++;
        $flags = $qos << 5;
        sn_send($s, 0x0c, chr($flags) . pack('nn', $tid, $msgId) . $data, "QoS $qos · topic-ID $tid · " . strlen($data) . ' bytes data');
        if ($qos === 1) {
            $pa = sn_expect($s, [0x0d], 5.0);
            $step("PUBLISH \"$data\"", $pa ? 'PUBACK: ' . (RC[ord($pa['body'][4])] ?? '?') : 'geen PUBACK');
        } else {
            $step("PUBLISH \"$data\"", 'QoS 0 — geen bevestiging');
        }
    }
    $result['topicId'] = $tid;
    $result['overhead'] = ['mqttsn' => 7, 'mqtt' => 4 + strlen($topic)];
}

if ($action === 'subscribe') {
    $wait = max(1, min(8, (float) arg('wait', 4)));
    $msgId++;
    sn_send($s, 0x12, chr($qos << 5) . pack('n', $msgId) . $topic, "\"$topic\" (QoS $qos)");
    $topics = [];
    $sub = sn_expect($s, [0x13], 5.0, function ($p) use (&$topics, $s) {
        if ($p['type'] === 0x0a) {
            $id = unpack('n', substr($p['body'], 0, 2))[1];
            $topics[$id] = substr($p['body'], 4);
            sn_send($s, 0x0b, substr($p['body'], 0, 4) . "\0", "topic-ID $id = \"{$topics[$id]}\"");
        }
    });
    if (!$sub) {
        fail('Geen SUBACK ontvangen', 504);
    }
    $subTid = unpack('n', substr($sub['body'], 1, 2))[1];
    if ($subTid > 0) {
        $topics[$subTid] = $topic;          // gateway koppelde deze naam aan dit topic-ID
    }
    $step("SUBSCRIBE \"$topic\"", 'SUBACK: ' . (RC[ord($sub['body'][5])] ?? '?') . " · topic-ID $subTid");
    $received = [];
    $end = microtime(true) + $wait;
    while (($left = $end - microtime(true)) > 0) {
        $p = sn_expect($s, [0x0c, 0x0a], $left);
        if (!$p) {
            break;
        }
        if ($p['type'] === 0x0a) {
            $id = unpack('n', substr($p['body'], 0, 2))[1];
            $topics[$id] = substr($p['body'], 4);
            sn_send($s, 0x0b, substr($p['body'], 0, 4) . "\0", "topic-ID $id = \"{$topics[$id]}\"");
            continue;
        }
        $id = unpack('n', substr($p['body'], 1, 2))[1];
        $received[] = ['topicId' => $id, 'topic' => $topics[$id] ?? "#$id", 'data' => utf8(substr($p['body'], 5))];
    }
    $step("Wachten ({$wait}s)", count($received) . ' bericht(en) ontvangen');
    $result['received'] = $received;
}

// ---- DISCONNECT
sn_send($s, 0x18, '', 'sessie netjes afsluiten');
sn_expect($s, [0x18], 2.0);
$step('DISCONNECT', 'afgesloten');
fclose($s);
out($result);
