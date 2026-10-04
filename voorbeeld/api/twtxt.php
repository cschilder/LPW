<?php
// twtxt-brug — decentraal microbloggen met platte tekstbestanden.
//   action=fetch   → twtxt.txt van een URL ophalen en parsen (metadata + twts)
//   action=mine    → je eigen feed (publiek/twtxt.txt) lezen
//   action=publish → een twt aan je eigen feed toevoegen (beheerwachtwoord vereist)
// Formaat: één twt per regel: "<RFC 3339-tijdstempel>\t<tekst>", metadata als "# sleutel = waarde".
require __DIR__ . '/_lib.php';
require __DIR__ . '/_http.php';
bootstrap();

function parse_twtxt(string $text): array
{
    $meta = [];
    $twts = [];
    foreach (preg_split('/\r?\n/', $text) as $line) {
        if (preg_match('/^#\s*([a-z_]+)\s*=\s*(.+)$/i', $line, $m)) {
            $meta[strtolower($m[1])][] = trim($m[2]);
        } elseif (preg_match('/^(\d{4}-\d\d-\d\dT[^\t ]+)\t(.+)$/', $line, $m)) {
            $ts = strtotime($m[1]);
            if ($ts) {
                $twts[] = ['ts' => date(DATE_ATOM, $ts), 'text' => utf8($m[2])];
            }
        }
    }
    usort($twts, fn($a, $b) => strcmp($b['ts'], $a['ts']));
    return [$meta, array_slice($twts, 0, 200)];
}

$action = str_arg('action', 'fetch', 20);
$file = publiek_dir() . '/twtxt.txt';

if ($action === 'fetch') {
    [$code, $body, $final] = http_get('twtxt', one_line(str_arg('url', '', 1024)));
    if ($code !== 200) {
        fail("Feed gaf HTTP $code", 502);
    }
    [$meta, $twts] = parse_twtxt(utf8($body));
    out(['url' => $final, 'nick' => $meta['nick'][0] ?? '', 'meta' => $meta, 'twts' => $twts]);
}

if ($action === 'publish') {
    require_admin();
    $text = trim(one_line(str_arg('text', '', 1000)));
    $nick = preg_replace('/[^a-z0-9_-]/i', '', str_arg('nick', '', 40));
    if ($text === '') {
        fail('Lege twt');
    }
    if (!is_file($file)) {
        $head = "# twtxt-feed gemaakt met de LPW-demo\n# nick = " . ($nick ?: 'lpw') . "\n# url = " . publiek_url('twtxt.txt') . "\n#\n";
        file_put_contents($file, $head, LOCK_EX);
    }
    $line = date('Y-m-d\TH:i:sP') . "\t" . $text . "\n";
    file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
    trace('out', 'APPEND', 'publiek/twtxt.txt ← ' . rtrim($line));
}

// mine (ook na publish)
$body = is_file($file) ? file_get_contents($file) : '';
[$meta, $twts] = parse_twtxt($body);
out(['url' => publiek_url('twtxt.txt'), 'nick' => $meta['nick'][0] ?? '', 'meta' => $meta, 'twts' => $twts, 'exists' => $body !== '']);
