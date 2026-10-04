<?php
// HTTP/3-brug — drie echte metingen:
//  1. Alt-Svc: via HTTPS opvragen of de server HTTP/3 adverteert (h3=":443"; ma=…).
//  2. QUIC-probe: een QUIC long-header-pakket met een gereserveerde versie (0x?a?a?a?a)
//     over UDP. Een QUIC-server MOET antwoorden met Version Negotiation (RFC 9000 §6),
//     met daarin de QUIC-versies die hij spreekt (v1 = RFC 9000, v2 = RFC 9369).
//  3. Echte HTTP/3-request via curl — alleen als de curl op deze host HTTP/3 kan.
require __DIR__ . '/_lib.php';
bootstrap();

$url = one_line(trim(str_arg('url', '', 1024)));
$p = parse_url($url);
if (!$p || ($p['scheme'] ?? '') !== 'https' || empty($p['host'])) {
    fail('Verwacht een https://-URL');
}
$host = $p['host'];
$tcpPort = (int) ($p['port'] ?? 443);
$ip = guard('http3', $host, $tcpPort, [443, 8443]);
$res = ['url' => $url, 'host' => $host];

// ---- 1. Alt-Svc via HTTPS
$h = curl_init($url);
$alt = '';
$ver = '';
curl_setopt_array($h, [
    CURLOPT_NOBODY => true, CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_2TLS, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_TIMEOUT => (int) cfg('timeout'), CURLOPT_SSL_VERIFYPEER => (bool) cfg('tls_verify'),
    CURLOPT_SSL_VERIFYHOST => cfg('tls_verify') ? 2 : 0, CURLOPT_RESOLVE => ["$host:$tcpPort:$ip"],
    CURLOPT_USERAGENT => 'LPW-HTTP3-demo/1.0',
    CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$alt) {
        if (stripos($line, 'alt-svc:') === 0) {
            $alt = trim(substr($line, 8));
        }
        return strlen($line);
    },
]);
curl_exec($h);
$info = curl_getinfo($h);
$res['https'] = ['status' => $info['http_code'], 'version' => $info['http_version'] === CURL_HTTP_VERSION_2_0 ? '2' : '1.1',
                 'error' => curl_error($h), 'altSvc' => $alt];
trace('in', 'HTTPS HEAD', "status {$info['http_code']} · Alt-Svc: " . ($alt ?: '(geen)'));

$h3 = [];
foreach (explode(',', $alt) as $entry) {
    if (preg_match('/^\s*(h3(?:-\d+)?)="([^"]*)"(.*)$/', $entry, $m)) {
        $ma = preg_match('/ma=(\d+)/', $m[3], $mm) ? (int) $mm[1] : 86400;
        $h3[] = ['alpn' => $m[1], 'authority' => $m[2], 'maxAge' => $ma];
    }
}
$res['advertised'] = $h3;

// ---- 2. QUIC Version Negotiation-probe
$udpPort = 443;
foreach ($h3 as $e) {
    if (preg_match('/:(\d+)$/', $e['authority'], $m)) {
        $udpPort = (int) $m[1];
        break;
    }
}
guard('http3', $host, $udpPort, [443, 8443]);
$dcid = random_bytes(8);
$scid = random_bytes(8);
$probe = chr(0xC0 | random_int(0, 15)) . "\x1a\x2a\x3a\x4a" . chr(8) . $dcid . chr(8) . $scid;
$probe = str_pad($probe, 1200, "\0");             // client-Initials moeten ≥ 1200 bytes zijn
$s = udp_open($ip, $udpPort);
$t0 = microtime(true);
fwrite($s, $probe);
trace('out', 'QUIC PROBE', "UDP → $host:$udpPort · long header · versie 0x1a2a3a4a (gereserveerd)\nDCID " . bin2hex($dcid) . " · SCID " . bin2hex($scid) . " · 1200 bytes\nhex: " . hexdump($probe, 24));
$vn = udp_recv($s, 3.0);
$rtt = (int) round((microtime(true) - $t0) * 1000);
fclose($s);

$names = [0x00000001 => 'QUIC v1 (RFC 9000)', 0x6b3343cf => 'QUIC v2 (RFC 9369)', 0x709a50c4 => 'QUIC v2 (draft)',
          0xff00001d => 'draft-29', 0xff00001c => 'draft-28', 0xff00001b => 'draft-27', 0xfaceb002 => 'mvfst (Meta)'];
if ($vn !== null && strlen($vn) >= 7 && (ord($vn[0]) & 0x80) && substr($vn, 1, 4) === "\0\0\0\0") {
    $i = 5;
    $dl = ord($vn[$i++]);
    $rd = substr($vn, $i, $dl);
    $i += $dl;
    $sl = ord($vn[$i++]);
    $rs = substr($vn, $i, $sl);
    $i += $sl;
    $versions = [];
    for (; $i + 4 <= strlen($vn); $i += 4) {
        $v = unpack('N', substr($vn, $i, 4))[1];
        $grease = ($v & 0x0f0f0f0f) === 0x0a0a0a0a;
        $versions[] = ['hex' => sprintf('0x%08x', $v), 'name' => $grease ? 'grease (gereserveerd, genegeerd)' : ($names[$v] ?? 'onbekend')];
    }
    $res['quic'] = ['ok' => true, 'rtt' => $rtt, 'versions' => $versions,
                    'cidEcho' => $rd === $scid && $rs === $dcid, 'bytes' => strlen($vn)];
    trace('in', 'VERSION NEGOTIATION', strlen($vn) . " bytes in $rtt ms · CID's correct omgewisseld: " . ($rd === $scid && $rs === $dcid ? 'ja' : 'nee')
        . "\nversies: " . implode(', ', array_map(fn($v) => "{$v['hex']} {$v['name']}", $versions)) . "\nhex: " . hexdump($vn, 48));
} else {
    $res['quic'] = ['ok' => false, 'rtt' => $rtt, 'reason' => $vn === null ? 'geen UDP-antwoord (geen QUIC of UDP/443 geblokkeerd)' : 'onverwacht antwoord'];
    trace('err', 'QUIC PROBE', $res['quic']['reason']);
}

// ---- 3. Echte HTTP/3-request (alleen als curl het kan)
$canH3 = defined('CURL_VERSION_HTTP3') && (curl_version()['features'] & CURL_VERSION_HTTP3);
$res['curlHttp3'] = (bool) $canH3;
if ($canH3) {
    $h = curl_init($url);
    curl_setopt_array($h, [CURLOPT_NOBODY => true, CURLOPT_HTTP_VERSION => 31 /* CURL_HTTP_VERSION_3ONLY */,
        CURLOPT_TIMEOUT => (int) cfg('timeout'), CURLOPT_RESOLVE => ["$host:$udpPort:$ip"],
        CURLOPT_SSL_VERIFYPEER => (bool) cfg('tls_verify'), CURLOPT_SSL_VERIFYHOST => cfg('tls_verify') ? 2 : 0]);
    curl_exec($h);
    $i3 = curl_getinfo($h);
    $res['h3request'] = ['status' => $i3['http_code'], 'error' => curl_error($h), 'ms' => (int) round($i3['total_time'] * 1000)];
    trace('in', 'HTTP/3 REQUEST', $i3['http_code'] ? "status {$i3['http_code']}" : curl_error($h));
}
out($res);
