<?php
// Phlog-generator (Gopher-blog): platte tekst op 70 kolommen in publiek/phlog/ + een
// gophermap met relatieve selectors (begrepen door gophernicus, pygopherd, Geomyidae…).
require __DIR__ . '/_lib.php';
require __DIR__ . '/_blog.php';
bootstrap();

$dir = publiek_dir('phlog');
blog_common('phlog', $dir, function (array $d) use ($dir) {
    $title = $d['title'] ?: 'Mijn phlog';
    foreach ($d['posts'] as $p) {
        $head = "{$p['title']}\n" . str_repeat('=', min(70, mb_strlen($p['title']))) . "\n{$p['date']}"
              . ($p['author'] ? " — {$p['author']}" : '') . "\n\n";
        $paras = preg_split("/\n{2,}/", trim($p['body']));
        $txt = implode("\n\n", array_map(fn($par) => wordwrap(preg_replace('/\s*\n\s*/', ' ', $par), 70, "\n", true), $paras));
        file_put_contents("$dir/{$p['slug']}.txt", $head . $txt . "\n", LOCK_EX);
    }
    $info = fn($s) => "i$s\tfake\t(NULL)\t0\r\n";
    $map = $info($title) . $info(str_repeat('-', min(70, mb_strlen($title))));
    if ($d['description']) {
        foreach (explode("\n", wordwrap($d['description'], 68)) as $l) {
            $map .= $info($l);
        }
    }
    $map .= $info('');
    foreach ($d['posts'] as $p) {
        $map .= "0{$p['date']} {$p['title']}\t{$p['slug']}.txt\r\n";
    }
    file_put_contents("$dir/gophermap", $map, LOCK_EX);
});
