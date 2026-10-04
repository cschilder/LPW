<?php
// Spartan-brug: "<host> <pad> <lengte>\r\n<data>" over platte TCP (poort 300).
// Antwoord: "2 <mime>" succes, "3 <pad>" redirect, "4 <fout>" clientfout, "5 <fout>" serverfout.
require __DIR__ . '/_lib.php';
bootstrap();

$url = one_line(trim(str_arg('url', '', 1024)));
$data = str_arg('data', '', 10000);
$p = parse_url($url);
if (!$p || ($p['scheme'] ?? '') !== 'spartan' || empty($p['host'])) {
    fail('Verwacht een spartan://-URL');
}
$host = $p['host'];
$port = (int) ($p['port'] ?? 300);
$path = ($p['path'] ?? '') !== '' ? $p['path'] : '/';
if (!empty($p['query']) && $data === '') {
    $data = rawurldecode($p['query']);   // spartan://host/pad?tekst ≙ upload van "tekst"
}
$ip = guard('spartan', $host, $port, [300, 3000]);

[$s, $meta] = tcp_open($host, $ip, $port);
$req = "$host $path " . strlen($data) . "\r\n" . $data;
fwrite($s, $req);
trace('out', 'REQUEST', visible($req));
$header = rtrim(read_line($s, 1100), "\r\n");
trace('in', 'HEADER', $header);
if (!preg_match('/^([2-5]) ?(.*)$/', $header, $m)) {
    fclose($s);
    fail("Ongeldige Spartan-header: \"$header\"", 502);
}
$res = ['status' => (int) $m[1], 'meta' => $m[2], 'url' => "spartan://$host" . ($port !== 300 ? ":$port" : '') . $path, 'conn' => $meta];
if ($m[1] === '2') {
    $body = read_all($s);
    trace('in', 'BODY', strlen($body) . " bytes\n" . visible(substr($body, 0, 800)));
    $res['mime'] = strtolower(trim(explode(';', $m[2] ?: 'text/gemini')[0]));
    $res['body'] = utf8($body);
}
fclose($s);
out($res);
