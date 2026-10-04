<?php
// HTTP/2-brug: haalt tot 6 HTTPS-URL's tegelijk op via curl_multi.
//   mode=h2  → HTTP/2 met multiplexing: alle verzoeken naar dezelfde host delen één TCP+TLS-verbinding
//   mode=h1  → HTTP/1.1 ter vergelijking (één verzoek per verbinding)
// Per verzoek: onderhandelde versie, nieuwe verbindingen, timing per fase, headers, Alt-Svc.
require __DIR__ . '/_lib.php';
bootstrap();

if (!function_exists('curl_multi_init')) {
    fail('PHP-extensie curl ontbreekt op deze server', 500);
}
$urls = arg('urls', []);
$mode = str_arg('mode', 'h2', 3) === 'h1' ? 'h1' : 'h2';
if (!is_array($urls) || !$urls || count($urls) > 6) {
    fail('Geef 1 tot 6 URL\'s');
}

$mh = curl_multi_init();
$maxConn = max(1, min(6, (int) arg('maxConnections', 1)));
// h2: alles over één verbinding (multiplexing). h1: max. N verbindingen per host;
// met 1 verbinding moeten de verzoeken op elkaar wachten (head-of-line blocking).
curl_multi_setopt($mh, CURLMOPT_PIPELINING, $mode === 'h2' ? CURLPIPE_MULTIPLEX : CURLPIPE_NOTHING);
curl_multi_setopt($mh, CURLMOPT_MAX_HOST_CONNECTIONS, $mode === 'h2' ? 1 : $maxConn);
$handles = [];
$resolved = [];
foreach ($urls as $i => $u) {
    $u = one_line(trim((string) $u));
    $p = parse_url($u);
    if (!$p || ($p['scheme'] ?? '') !== 'https' || empty($p['host'])) {
        fail("Alleen https://-URL's: $u");
    }
    $port = (int) ($p['port'] ?? 443);
    $ip = guard('http2', $p['host'], $port, [443, 8443]);
    $resolved[$p['host'] . ':' . $port] = $p['host'] . ':' . $port . ':' . $ip;
    $h = curl_init($u);
    $hdrs = [];
    $body = 0;
    curl_setopt_array($h, [
        CURLOPT_HTTP_VERSION => $mode === 'h2' ? CURL_HTTP_VERSION_2TLS : CURL_HTTP_VERSION_1_1,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_TIMEOUT => (int) ceil((float) cfg('timeout')) + 4,
        CURLOPT_CONNECTTIMEOUT => (int) ceil((float) cfg('timeout')),
        CURLOPT_SSL_VERIFYPEER => (bool) cfg('tls_verify'),
        CURLOPT_SSL_VERIFYHOST => cfg('tls_verify') ? 2 : 0,
        CURLOPT_USERAGENT => 'LPW-HTTP2-demo/1.0',
        CURLOPT_PIPEWAIT => true,                                 // wacht op multiplexing i.p.v. nieuwe verbinding
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$hdrs) {
            $t = trim($line);
            if ($t !== '') {
                $hdrs[] = $t;
            }
            return strlen($line);
        },
        CURLOPT_WRITEFUNCTION => function ($ch, $data) use (&$body) {
            $body += strlen($data);
            return $body > (int) cfg('max_bytes') ? 0 : strlen($data);   // groottelimiet
        },
    ]);
    $handles[$i] = ['h' => $h, 'url' => $u, 'hdrs' => &$hdrs, 'body' => &$body];
    unset($hdrs, $body);
}
// Gebruik de gecontroleerde IP-adressen (geen tweede DNS-lookup → geen DNS-rebinding)
foreach ($handles as $x) {
    curl_setopt($x['h'], CURLOPT_RESOLVE, array_values($resolved));
    curl_multi_add_handle($mh, $x['h']);
}
trace('out', strtoupper($mode === 'h2' ? 'HTTP/2' : 'HTTP/1.1'), count($handles) . " verzoeken parallel\n" . implode("\n", array_column($handles, 'url')));

$t0 = microtime(true);
do {
    $st = curl_multi_exec($mh, $running);
    if ($running) {
        curl_multi_select($mh, 0.2);
    }
} while ($running && $st === CURLM_OK);
$wall = (int) round((microtime(true) - $t0) * 1000);

$vers = [CURL_HTTP_VERSION_1_0 => '1.0', CURL_HTTP_VERSION_1_1 => '1.1', CURL_HTTP_VERSION_2_0 => '2'];
if (defined('CURL_HTTP_VERSION_3')) {
    $vers[CURL_HTTP_VERSION_3] = '3';
}
$results = [];
$ports = [];
foreach ($handles as $x) {
    $h = $x['h'];
    $info = curl_getinfo($h);
    $err = curl_error($h);
    $ports[$info['local_port'] ?? 0] = true;     // zelfde lokale poort = zelfde TCP-verbinding
    $status = array_shift($x['hdrs']) ?? '';
    $alt = '';
    $headers = [];
    foreach ($x['hdrs'] as $line) {
        [$k, $v] = array_pad(explode(':', $line, 2), 2, '');
        $headers[] = [$k, trim($v)];
        if (strtolower($k) === 'alt-svc') {
            $alt = trim($v);
        }
    }
    $ms = fn($k) => (int) round(($info[$k] ?? 0) * 1000);
    $results[] = [
        'url' => $x['url'], 'error' => $err, 'status' => $info['http_code'], 'statusLine' => $status,
        'version' => $vers[$info['http_version']] ?? (string) $info['http_version'],
        'localPort' => (int) ($info['local_port'] ?? 0), 'ip' => $info['primary_ip'], 'bytes' => $x['body'],
        'timing' => ['dns' => $ms('namelookup_time'), 'tcp' => $ms('connect_time'), 'tls' => $ms('appconnect_time'),
                     'ttfb' => $ms('starttransfer_time'), 'total' => $ms('total_time')],
        'headers' => array_slice($headers, 0, 30), 'altSvc' => $alt,
    ];
    trace('in', $status ?: 'FOUT', $err ?: "{$info['http_code']} · HTTP/" . ($vers[$info['http_version']] ?? '?') . " · lokale poort " . ($info['local_port'] ?? '?') . " · {$ms('total_time')} ms");
    curl_multi_remove_handle($mh, $h);
}
curl_multi_close($mh);
out(['mode' => $mode, 'wall_ms' => $wall, 'connections' => count($ports), 'maxConnections' => $mode === 'h2' ? 1 : $maxConn, 'results' => $results,
     'curl' => curl_version()['version']]);
