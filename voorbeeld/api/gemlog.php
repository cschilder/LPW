<?php
// Gemlog-generator: schrijft berichten als gemtext naar publiek/gemlog/ en houdt een
// index.gmi bij in het abonnementsformaat ("=> bestand JJJJ-MM-DD titel") dat Gemini-clients
// (Lagrange, Amfora) en aggregators (Antenna) begrijpen, plus een Atom-feed.
// Upload de map naar je capsule (of laat je Gemini-server er direct naar wijzen).
require __DIR__ . '/_lib.php';
require __DIR__ . '/_blog.php';
bootstrap();

$dir = publiek_dir('gemlog');
blog_common('gemlog', $dir, function (array $d) use ($dir) {
    $title = $d['title'] ?: 'Mijn gemlog';
    foreach ($d['posts'] as $p) {
        $g = "# {$p['title']}\n\n{$p['body']}\n\n"
           . ($p['tags'] ? 'Tags: ' . implode(', ', $p['tags']) . "\n\n" : '')
           . "=> index.gmi ← Terug naar $title\n";
        file_put_contents("$dir/{$p['slug']}.gmi", $g, LOCK_EX);
    }
    $idx = "# $title\n" . ($d['description'] ? "\n{$d['description']}\n" : '') . "\n## Berichten\n\n";
    foreach ($d['posts'] as $p) {
        $idx .= "=> {$p['slug']}.gmi {$p['date']} {$p['title']}\n";
    }
    $idx .= "\n=> atom.xml Atom-feed\n";
    file_put_contents("$dir/index.gmi", $idx, LOCK_EX);
    // Atom-feed (met http(s)-links naar de .gmi-bestanden op deze server)
    $base = publiek_url('gemlog');
    $x = fn($s) => htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    $atom = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<feed xmlns=\"http://www.w3.org/2005/Atom\">\n"
          . "  <title>{$x($title)}</title>\n  <id>{$x($base)}/</id>\n  <link href=\"{$x($base)}/index.gmi\"/>\n"
          . '  <updated>' . date(DATE_ATOM) . "</updated>\n";
    foreach (array_slice($d['posts'], 0, 30) as $p) {
        $atom .= "  <entry>\n    <title>{$x($p['title'])}</title>\n    <link href=\"{$x($base)}/{$p['slug']}.gmi\"/>\n"
               . "    <id>{$x($base)}/{$p['slug']}.gmi</id>\n    <updated>{$p['created']}</updated>\n  </entry>\n";
    }
    file_put_contents("$dir/atom.xml", $atom . "</feed>\n", LOCK_EX);
});
