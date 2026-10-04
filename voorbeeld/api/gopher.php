<?php
// Gopher-brug (RFC 1436): stuurt "<selector>[\t<zoekterm>]\r\n" over TCP en
// geeft het menu (geparsed), de tekst of een afbeelding terug.
require __DIR__ . '/_lib.php';
bootstrap();

$host = str_arg('host', '', 253);
$port = (int) arg('port', 70);
$type = str_arg('type', '1', 1);
if ($type === '') {
    $type = '1';
}
$selector = one_line(str_arg('selector', '', 1024));
$query = one_line(str_arg('query', '', 512));

$ip = guard('gopher', $host, $port, [70, 7070, 7071]);
$request = $selector . ($query !== '' ? "\t" . $query : '') . "\r\n";
[$raw, $meta] = tcp_request($host, $ip, $port, $request);

$result = ['type' => $type, 'url' => "gopher://$host" . ($port !== 70 ? ":$port" : '') . "/$type" . $selector, 'meta' => $meta];

if (in_array($type, ['1', '7'], true)) {
    $items = [];
    foreach (preg_split('/\r?\n/', utf8($raw)) as $line) {
        if ($line === '.' ) {
            break;
        }
        if ($line === '') {
            continue;
        }
        $f = explode("\t", substr($line, 1));
        $items[] = [
            't' => $line[0],
            'name' => $f[0] ?? '',
            'sel' => $f[1] ?? '',
            'host' => $f[2] ?? '',
            'port' => (int) ($f[3] ?? 70) ?: 70,
        ];
    }
    $result['items'] = $items;
} elseif (in_array($type, ['g', 'I', 'p'], true)) {
    $mime = (new finfo(FILEINFO_MIME_TYPE))->buffer($raw) ?: 'application/octet-stream';
    if (!str_starts_with($mime, 'image/')) {
        fail("Geen afbeelding ontvangen ($mime)");
    }
    $result['image'] = 'data:' . $mime . ';base64,' . base64_encode($raw);
} else {
    // tekst (type 0, h, en onbekende tekstuele types); afsluitende "." weghalen
    $text = utf8($raw);
    $text = preg_replace("/\r?\n\.\r?\n?$/", "\n", $text);
    $result['text'] = str_replace("\r\n", "\n", $text);
}
out($result);
