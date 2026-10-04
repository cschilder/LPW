<?php
// Titan-brug: uploadt inhoud naar een Titan-server (Gemini-tegenhanger, TLS poort 1965):
//   "titan://host/pad;size=<n>;mime=<type>;token=<token>\r\n" + <n> bytes.
// Het antwoord is een gewone Gemini-header (meestal 30 → de nieuwe gemini://-URL).
require __DIR__ . '/_lib.php';
bootstrap();

$url = one_line(trim(str_arg('url', '', 1024)));
$body = str_arg('body', '', 65536);
$mime = one_line(str_arg('mime', 'text/gemini', 100));
$token = one_line(str_arg('token', '', 200));
$p = parse_url($url);
if (!$p || ($p['scheme'] ?? '') !== 'titan' || empty($p['host'])) {
    fail('Verwacht een titan://-URL');
}
if (!preg_match('#^[a-z]+/[a-z0-9.+-]+$#i', $mime)) {
    fail('Ongeldig MIME-type');
}
$host = $p['host'];
$port = (int) ($p['port'] ?? 1965);
$path = explode(';', $p['path'] ?? '/')[0] ?: '/';
$ip = guard('titan', $host, $port, [1965]);

$req = "titan://$host" . ($port !== 1965 ? ":$port" : '') . $path . ';size=' . strlen($body) . ';mime=' . $mime
     . ($token !== '' ? ';token=' . rawurlencode($token) : '') . "\r\n";
[$s, $meta] = tcp_open($host, $ip, $port, true);
fwrite($s, $req . $body);
trace('out', 'TITAN', visible(preg_replace('/token=[^;\r]+/', 'token=••••', $req)) . "\n+ " . strlen($body) . " bytes inhoud");
$header = rtrim(read_line($s, 1100), "\r\n");
trace('in', 'HEADER', $header);
fclose($s);
if (!preg_match('/^(\d\d) ?(.*)$/', $header, $m)) {
    fail("Ongeldig antwoord: \"$header\"", 502);
}
out(['status' => (int) $m[1], 'meta' => $m[2], 'bytes' => strlen($body), 'conn' => $meta]);
