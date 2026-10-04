<?php
// Diagnose: welke uitgaande verbindingen staat deze webhost toe?
// Open https://jouwdomein.nl/voorbeeld/api/diag.php in de browser.
require __DIR__ . '/_lib.php';
bootstrap();

$checks = [
    ['gopher',  'tcp', 'gopher.floodgap.com', 70],
    ['gemini',  'tcp', 'geminiprotocol.net', 1965],
    ['finger',  'tcp', 'happynetbox.com', 79],
    ['spartan', 'tcp', 'mozz.us', 300],
    ['nex',     'tcp', 'nightfall.city', 1900],
    ['misfin',  'tcp', 'misfin.org', 1958],
    ['amqp',    'tcp', 'rabbitmq.com', 5672],
    ['https',   'tcp', 'cloudflare-quic.com', 443],
];
$res = [];
foreach ($checks as [$name, $proto, $host, $port]) {
    $t = microtime(true);
    $s = @stream_socket_client("tcp://$host:$port", $no, $err, 4.0);
    $res[] = ['protocol' => $name, 'doel' => "$host:$port", 'open' => (bool) $s,
              'ms' => (int) round((microtime(true) - $t) * 1000), 'fout' => $s ? '' : $err];
    if ($s) fclose($s);
}
// UDP kan niet "verbonden" worden getest; we testen CoAP met een echte GET.
$udp = @stream_socket_client('udp://coap.me:5683', $no, $err, 3.0);
$udpOk = false;
if ($udp) {
    fwrite($udp, "\x40\x01\x12\x34\xb5hello");   // CON GET /hello
    $r = [$udp]; $w = $e = null;
    $udpOk = @stream_select($r, $w, $e, 3) > 0 && fread($udp, 1500) !== '';
}
$res[] = ['protocol' => 'coap (udp)', 'doel' => 'coap.me:5683', 'open' => $udpOk, 'ms' => 0, 'fout' => $udpOk ? '' : 'geen antwoord'];

out([
    'php' => PHP_VERSION,
    'curl_http2' => function_exists('curl_version') && (curl_version()['features'] & CURL_VERSION_HTTP2) > 0,
    'curl_http3' => function_exists('curl_version') && defined('CURL_VERSION_HTTP3') && (curl_version()['features'] & CURL_VERSION_HTTP3) > 0,
    'openssl' => OPENSSL_VERSION_TEXT,
    'publiek_schrijfbaar' => is_writable(dirname(__DIR__) . '/publiek'),
    'beheer_ingesteld' => cfg('admin_hash') !== '',
    'verbindingen' => $res,
]);
