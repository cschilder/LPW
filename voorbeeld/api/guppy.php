<?php
// Guppy-brug (Gemini-achtig over UDP, poort 6775).
//   verzoek:   "guppy://host/pad[?invoer]\r\n"
//   antwoord:  eerste pakket "<seq> <mime>\r\n<data>", daarna "<seq+1>\r\n<data>", …,
//              einde = "<seq+n>\r\n" zonder data. Elk pakket bevestigen met "<seq>\r\n".
//   status:    "1 <prompt>" invoer, "3 <url>" redirect, "4 <fout>" fout.
// Pakketten kunnen dubbel of in een andere volgorde aankomen; de brug sorteert en ontdubbelt.
require __DIR__ . '/_lib.php';
bootstrap();

$url = one_line(trim(str_arg('url', '', 1024)));
$p = parse_url($url);
if (!$p || ($p['scheme'] ?? '') !== 'guppy' || empty($p['host'])) {
    fail('Verwacht een guppy://-URL');
}
$host = $p['host'];
$port = (int) ($p['port'] ?? 6775);
$ip = guard('guppy', $host, $port, [6775]);
$s = udp_open($ip, $port);

$request = $url . "\r\n";
$chunks = [];            // seq => data
$first = null; $mime = ''; $end = null; $status = null;
$retries = 0; $packets = 0; $dups = 0;
fwrite($s, $request);
trace('out', 'REQUEST', visible($request));
$deadline = microtime(true) + (float) cfg('timeout');

while (microtime(true) < $deadline) {
    $d = udp_recv($s, 1.5);
    if ($d === null) {
        if ($first === null && $retries < 3) {       // verzoek kwijtgeraakt? opnieuw
            fwrite($s, $request);
            $retries++;
            trace('out', 'RETRY', "verzoek opnieuw verstuurd ($retries)");
            continue;
        }
        if ($end !== null) {
            break;
        }
        continue;
    }
    $packets++;
    $nl = strpos($d, "\r\n");
    if ($nl === false) {
        continue;
    }
    $head = substr($d, 0, $nl);
    $data = substr($d, $nl + 2);
    if ($first === null && preg_match('/^([134]) (.*)$/', $head, $m)) {
        $status = ['code' => (int) $m[1], 'meta' => $m[2]];
        trace('in', 'STATUS', $head);
        break;
    }
    if (!preg_match('/^(\d+)(?: (.*))?$/', $head, $m)) {
        continue;
    }
    $seq = (int) $m[1];
    fwrite($s, "$seq\r\n");                                 // bevestigen (ook duplicaten)
    if (isset($chunks[$seq]) || $seq === $end) {
        $dups++;
        continue;
    }
    if ($first === null && isset($m[2])) {
        $first = $seq;
        $mime = $m[2];
    }
    if ($data === '' && !isset($m[2])) {
        $end = $seq;
        trace('in', "PKT $seq", "einde-van-bestand · ack $seq");
    } else {
        $chunks[$seq] = $data;
        trace('in', "PKT $seq", ($seq === $first ? "mime=$mime · " : '') . strlen($data) . " bytes · ack $seq");
    }
    if ($end !== null && $first !== null && count($chunks) >= $end - $first) {
        break;
    }
}
fclose($s);

if ($status) {
    out(['status' => $status['code'], 'meta' => $status['meta'], 'url' => $url, 'packets' => $packets]);
}
if ($first === null) {
    fail('Geen antwoord van de Guppy-server (UDP-pakketten verloren of poort dicht)', 504);
}
ksort($chunks);
$body = implode('', $chunks);
$complete = $end !== null && count($chunks) === $end - $first;
out(['status' => 2, 'mime' => $mime, 'body' => utf8($body), 'url' => $url,
     'packets' => $packets, 'duplicates' => $dups, 'retries' => $retries, 'complete' => $complete,
     'seq_first' => $first, 'seq_end' => $end]);
