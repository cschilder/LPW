<?php
// Gedeelde opslag voor de publicatie-demo's (gemlog, phlog, bashblog).
// Elke blog heeft een map in publiek/ met een posts.json (metadata) + gegenereerde bestanden.
function blog_load(string $dir): array
{
    $f = "$dir/posts.json";
    $j = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
    return is_array($j) ? $j + ['posts' => [], 'title' => '', 'description' => ''] : ['posts' => [], 'title' => '', 'description' => ''];
}

function blog_save(string $dir, array $data): void
{
    usort($data['posts'], fn($a, $b) => strcmp($b['date'] . $b['created'], $a['date'] . $a['created']));
    file_put_contents("$dir/posts.json", json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

/** Uniek bestandsnaam-slug: JJJJ-MM-DD-titel(-2) */
function blog_slug(array $data, string $title): string
{
    $base = date('Y-m-d') . '-' . slug($title);
    $s = $base;
    for ($i = 2; in_array($s, array_column($data['posts'], 'slug'), true); $i++) {
        $s = "$base-$i";
    }
    return $s;
}

function blog_common(string $kind, string $dir, callable $regenerate): void
{
    $action = str_arg('action', 'list', 20);
    $data = blog_load($dir);
    if (in_array($action, ['publish', 'delete', 'settings'], true)) {
        require_admin();
    }
    if ($action === 'settings') {
        $data['title'] = one_line(str_arg('title', '', 100));
        $data['description'] = one_line(str_arg('description', '', 300));
        $regenerate($data);
        blog_save($dir, $data);
        trace('out', 'INSTELLINGEN', "titel \"{$data['title']}\"");
    }
    if ($action === 'publish') {
        $title = trim(one_line(str_arg('title', '', 150)));
        $body = str_replace("\r\n", "\n", str_arg('body', '', 100000));
        if ($title === '' || trim($body) === '') {
            fail('Titel en tekst zijn verplicht');
        }
        $tags = array_values(array_filter(array_map(fn($t) => slug($t), explode(',', str_arg('tags', '', 200)))));
        $slug = blog_slug($data, $title);
        $data['posts'][] = ['slug' => $slug, 'title' => $title, 'date' => date('Y-m-d'), 'created' => date(DATE_ATOM),
                            'tags' => $tags, 'body' => $body, 'author' => one_line(str_arg('author', '', 60))];
        blog_save($dir, $data);
        $data = blog_load($dir);
        $regenerate($data);
        trace('out', 'PUBLICEREN', "$kind: $slug (" . strlen($body) . ' bytes) + index opnieuw gegenereerd');
    }
    if ($action === 'delete') {
        $slug = preg_replace('/[^a-z0-9-]/', '', str_arg('slug', '', 120));
        $data['posts'] = array_values(array_filter($data['posts'], fn($p) => $p['slug'] !== $slug));
        foreach (glob("$dir/$slug.*") ?: [] as $f) {
            @unlink($f);
        }
        blog_save($dir, $data);
        $regenerate($data);
        trace('out', 'VERWIJDERD', $slug);
    }
    $files = [];
    foreach (glob("$dir/*") ?: [] as $f) {
        if (is_file($f) && basename($f) !== 'posts.json') {
            $files[] = ['name' => basename($f), 'bytes' => filesize($f)];
        }
    }
    out(['title' => $data['title'], 'description' => $data['description'], 'baseUrl' => publiek_url($kind) . '/',
         'posts' => array_map(fn($p) => ['slug' => $p['slug'], 'title' => $p['title'], 'date' => $p['date'], 'tags' => $p['tags'],
             'bytes' => strlen($p['body'])], $data['posts']), 'files' => $files]);
}
