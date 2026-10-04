<?php
// Bashblog-generator: genereert een statische blog zoals bashblog (cfenollosa/bashblog) dat doet —
// één HTML-pagina per bericht, index.html met de laatste berichten, all_posts.html, tag_<tag>.html
// en feed.rss — in publiek/blog/. Markdown wordt hier server-side (HTML-veilig) omgezet.
require __DIR__ . '/_lib.php';
require __DIR__ . '/_blog.php';
bootstrap();

function nl_date(string $d): string
{
    $m = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    $t = strtotime($d);
    return date('j', $t) . ' ' . $m[(int) date('n', $t) - 1] . ' ' . date('Y', $t);
}

/** Compacte, veilige Markdown → HTML (alle HTML in de bron wordt ge-escaped). */
function md(string $src): string
{
    $h = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    $inline = function (string $s) use ($h) {
        $s = $h($s);
        $codes = [];
        $s = preg_replace_callback('/`([^`]+)`/', function ($m) use (&$codes) {
            $codes[] = "<code>{$m[1]}</code>";
            return "\x01" . (count($codes) - 1) . "\x01";
        }, $s);
        $safe = fn($u) => preg_match('#^(https?://|mailto:|/|\./|\.\./|[a-z0-9._-]+(\.html|/|$))#i', html_entity_decode($u)) ? $u : '#';
        $s = preg_replace_callback('/!\[([^\]]*)\]\(([^)\s]+)\)/', fn($m) => "<img src=\"{$safe($m[2])}\" alt=\"{$m[1]}\">", $s);
        $s = preg_replace_callback('/\[([^\]]+)\]\(([^)\s]+)\)/', fn($m) => "<a href=\"{$safe($m[2])}\">{$m[1]}</a>", $s);
        $s = preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $s);
        $s = preg_replace('/(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\w)/', '<em>$1</em>', $s);
        return preg_replace_callback("/\x01(\d+)\x01/", fn($m) => $codes[(int) $m[1]], $s);
    };
    $lines = explode("\n", str_replace("\r\n", "\n", $src));
    $out = [];
    $para = [];
    $flush = function () use (&$para, &$out, $inline) {
        if ($para) {
            $out[] = '<p>' . $inline(implode(' ', $para)) . '</p>';
            $para = [];
        }
    };
    for ($i = 0; $i < count($lines); $i++) {
        $l = $lines[$i];
        if (preg_match('/^```/', $l)) {
            $flush();
            $buf = [];
            while (++$i < count($lines) && !preg_match('/^```/', $lines[$i])) {
                $buf[] = $lines[$i];
            }
            $out[] = '<pre><code>' . $h(implode("\n", $buf)) . '</code></pre>';
        } elseif (preg_match('/^( {4}|\t)(.*)$/', $l, $m) && !$para) {
            $buf = [$m[2]];
            while ($i + 1 < count($lines) && preg_match('/^( {4}|\t)(.*)$/', $lines[$i + 1], $mm)) {
                $buf[] = $mm[2];
                $i++;
            }
            $out[] = '<pre><code>' . $h(implode("\n", $buf)) . '</code></pre>';
        } elseif (preg_match('/^(#{1,6})\s+(.+)$/', $l, $m)) {
            $flush();
            $n = strlen($m[1]);
            $out[] = "<h$n>" . $inline($m[2]) . "</h$n>";
        } elseif (preg_match('/^\s*([-*+]|\d+\.)\s+(.+)$/', $l, $m)) {
            $flush();
            $tag = ctype_digit($m[1][0]) ? 'ol' : 'ul';
            $items = ['<li>' . $inline($m[2]) . '</li>'];
            while ($i + 1 < count($lines) && preg_match('/^\s*([-*+]|\d+\.)\s+(.+)$/', $lines[$i + 1], $mm)) {
                $items[] = '<li>' . $inline($mm[2]) . '</li>';
                $i++;
            }
            $out[] = "<$tag>" . implode('', $items) . "</$tag>";
        } elseif (preg_match('/^>\s?(.*)$/', $l, $m)) {
            $flush();
            $buf = [$m[1]];
            while ($i + 1 < count($lines) && preg_match('/^>\s?(.*)$/', $lines[$i + 1], $mm)) {
                $buf[] = $mm[1];
                $i++;
            }
            $out[] = '<blockquote><p>' . $inline(implode(' ', $buf)) . '</p></blockquote>';
        } elseif (preg_match('/^(-{3,}|\*{3,})$/', trim($l))) {
            $flush();
            $out[] = '<hr>';
        } elseif (trim($l) === '') {
            $flush();
        } else {
            $para[] = trim($l);
        }
    }
    $flush();
    return implode("\n", $out);
}

$dir = publiek_dir('blog');
blog_common('blog', $dir, function (array $d) use ($dir) {
    $h = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    $title = $d['title'] ?: 'Mijn bashblog';
    $desc = $d['description'] ?: 'Een statische blog, gegenereerd zoals bashblog dat doet.';
    $css = 'body{font-family:Ubuntu,-apple-system,Segoe UI,sans-serif;max-width:46rem;margin:0 auto;padding:1rem;color:#111;line-height:1.6;background:#fff}'
         . 'a{color:#E95420}#title{border-bottom:3px solid #E95420;margin-bottom:1.5rem}#title h1{margin:.2rem 0}#title h1 a{color:#2C001E;text-decoration:none}'
         . '.description{color:#666;margin:0 0 .6rem}.entry{margin-bottom:2.2rem}.entry h3{margin:0}.entry h3 a{color:#2C001E;text-decoration:none}'
         . '.subtitle{color:#888;font-size:.85rem;margin-bottom:.6rem}pre{background:#f5f5f5;padding:.6rem;overflow:auto}code{background:#f5f5f5;padding:0 .2rem}'
         . 'blockquote{border-left:3px solid #E95420;margin-left:0;padding-left:.8rem;color:#555}img{max-width:100%}'
         . '#footer{border-top:1px solid #ddd;margin-top:2rem;padding-top:.6rem;color:#888;font-size:.8rem}.tags a{margin-right:.4rem}';
    $page = function (string $t, string $content) use ($h, $title, $desc, $css) {
        return "<!DOCTYPE html>\n<html lang=\"nl\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
             . "<title>{$h($t)}</title><style>$css</style><link rel=\"alternate\" type=\"application/rss+xml\" title=\"RSS\" href=\"feed.rss\"></head><body>"
             . "<div id=\"title\"><h1><a href=\"index.html\">{$h($title)}</a></h1><p class=\"description\">{$h($desc)}</p></div>\n$content\n"
             . "<div id=\"footer\"><a href=\"all_posts.html\">Alle berichten</a> · <a href=\"feed.rss\">RSS</a> · gegenereerd met de LPW-bashblog-demo</div></body></html>\n";
    };
    $entry = function (array $p, bool $full) use ($h) {
        $tags = $p['tags'] ? '<p class="tags">Tags: ' . implode(' ', array_map(fn($t) => "<a href=\"tag_$t.html\">$t</a>", $p['tags'])) . '</p>' : '';
        return "<div class=\"entry\"><h3><a href=\"{$p['slug']}.html\">{$h($p['title'])}</a></h3>"
             . "<div class=\"subtitle\">" . nl_date($p['date']) . ($p['author'] ? " — {$h($p['author'])}" : '') . '</div>'
             . ($full ? md($p['body']) : '') . "$tags</div>";
    };
    $alltags = [];
    foreach ($d['posts'] as $p) {
        file_put_contents("$dir/{$p['slug']}.html", $page("{$p['title']} — $title", $entry($p, true)), LOCK_EX);
        file_put_contents("$dir/{$p['slug']}.md", "{$p['title']}\n\n{$p['body']}\n\nTags: " . implode(', ', $p['tags']) . "\n", LOCK_EX);
        foreach ($p['tags'] as $t) {
            $alltags[$t][] = $p;
        }
    }
    file_put_contents("$dir/index.html", $page($title, implode("\n", array_map(fn($p) => $entry($p, true), array_slice($d['posts'], 0, 10)))
        ?: '<p>Nog geen berichten.</p>'), LOCK_EX);
    file_put_contents("$dir/all_posts.html", $page("Alle berichten — $title", '<h3>Alle berichten</h3><ul>'
        . implode('', array_map(fn($p) => "<li><a href=\"{$p['slug']}.html\">{$h($p['title'])}</a> — {$p['date']}</li>", $d['posts'])) . '</ul>'), LOCK_EX);
    foreach (glob("$dir/tag_*.html") ?: [] as $f) {
        @unlink($f);
    }
    foreach ($alltags as $t => $ps) {
        file_put_contents("$dir/tag_$t.html", $page("Tag $t — $title", "<h3>Berichten met tag “$t”</h3>" . implode("\n", array_map(fn($p) => $entry($p, true), $ps))), LOCK_EX);
    }
    $base = publiek_url('blog');
    $x = fn($s) => htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    $rss = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<rss version=\"2.0\"><channel><title>{$x($title)}</title><link>{$x($base)}/index.html</link><description>{$x($desc)}</description>\n";
    foreach (array_slice($d['posts'], 0, 20) as $p) {
        $rss .= "<item><title>{$x($p['title'])}</title><link>{$x($base)}/{$p['slug']}.html</link><guid>{$x($base)}/{$p['slug']}.html</guid>"
              . '<pubDate>' . date(DATE_RSS, strtotime($p['created'])) . "</pubDate><description>{$x(md($p['body']))}</description></item>\n";
    }
    file_put_contents("$dir/feed.rss", $rss . "</channel></rss>\n", LOCK_EX);
});
