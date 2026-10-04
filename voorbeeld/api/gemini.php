<?php
// Gemini-brug: TLS naar poort 1965, stuurt "<URL>\r\n", leest "<status> <meta>\r\n<body>".
// Certificaten worden niet via een CA gecontroleerd (Gemini gebruikt TOFU): de brug
// geeft de SHA-256-vingerafdruk terug en de browser-app onthoudt die per host.
require __DIR__ . '/_lib.php';
bootstrap();

$url = one_line(trim(str_arg('url', '', 1024)));
$p = parse_url($url);
if (!$p || ($p['scheme'] ?? '') !== 'gemini' || empty($p['host'])) {
    fail('Verwacht een gemini://-URL');
}
$host = $p['host'];
$port = (int) ($p['port'] ?? 1965);
$ip = guard('gemini', $host, $port, [1965]);

[$s, $meta] = tcp_open($host, $ip, $port, true);
fwrite($s, $url . "\r\n");
trace('out', 'REQUEST', visible($url . "\r\n"));
$header = rtrim(read_line($s, 1100), "\r\n");
trace('in', 'HEADER', $header);
if (!preg_match('/^(\d)(\d)(?: (.*))?$/', $header, $m)) {
    fclose($s);
    fail("Ongeldige Gemini-header: \"$header\"", 502);
}
$status = (int) ($m[1] . $m[2]);
$metaLine = $m[3] ?? '';
$res = ['status' => $status, 'meta' => $metaLine, 'url' => $url, 'conn' => $meta];

if ($m[1] === '2') {
    $body = read_all($s);
    trace('in', 'BODY', strlen($body) . " bytes\n" . visible(substr($body, 0, 800)));
    $mime = strtolower(trim(explode(';', $metaLine ?: 'text/gemini')[0]));
    $res['mime'] = $mime;
    $res['bytes'] = strlen($body);
    if (str_starts_with($mime, 'text/')) {
        $res['body'] = utf8($body);
    } elseif (str_starts_with($mime, 'image/')) {
        $res['image'] = "data:$mime;base64," . base64_encode($body);
    } else {
        $res['body'] = '';
        $res['binary'] = true;
    }
}
fclose($s);
out($res);
