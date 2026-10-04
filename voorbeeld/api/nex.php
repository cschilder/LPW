<?php
// Nex-brug: stuurt "<pad>\r\n" over TCP (poort 1900) en leest alles tot de server sluit.
// Geen statuscodes, geen TLS, geen MIME: paden die op "/" eindigen zijn mappen met "=> "-links.
require __DIR__ . '/_lib.php';
bootstrap();

$url = one_line(trim(str_arg('url', '', 1024)));
$p = parse_url($url);
if (!$p || ($p['scheme'] ?? '') !== 'nex' || empty($p['host'])) {
    fail('Verwacht een nex://-URL');
}
$host = $p['host'];
$port = (int) ($p['port'] ?? 1900);
$path = ($p['path'] ?? '') !== '' ? $p['path'] : '/';
$ip = guard('nex', $host, $port, [1900]);
[$raw, $meta] = tcp_request($host, $ip, $port, $path . "\r\n");
out(['url' => "nex://$host" . ($port !== 1900 ? ":$port" : '') . $path, 'dir' => str_ends_with($path, '/'),
     'body' => utf8($raw), 'conn' => $meta]);
