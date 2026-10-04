<?php
// Veilige HTTP(S)-GET voor bruggen die webbestanden ophalen (twtxt-feeds e.d.).
// Zelfde SSRF-regels als de socketbruggen: alleen publieke IP's, poort 80/443,
// verbinden met het gecontroleerde IP, max. 3 redirects (elk opnieuw gecontroleerd).
function http_get(string $proto, string $url, int $max = 0): array
{
    $max = $max ?: (int) cfg('max_bytes');
    for ($hop = 0; $hop <= 3; $hop++) {
        $p = parse_url($url);
        if (!$p || !in_array($p['scheme'] ?? '', ['http', 'https'], true) || empty($p['host'])) {
            fail("Ongeldige URL: $url");
        }
        $port = (int) ($p['port'] ?? ($p['scheme'] === 'https' ? 443 : 80));
        $ip = guard($proto, $p['host'], $port, [80, 443, 8080]);
        $h = curl_init($url);
        $body = '';
        curl_setopt_array($h, [
            CURLOPT_RESOLVE => ["{$p['host']}:$port:$ip"], CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_TIMEOUT => (int) ceil((float) cfg('timeout')),
            CURLOPT_SSL_VERIFYPEER => (bool) cfg('tls_verify'), CURLOPT_SSL_VERIFYHOST => cfg('tls_verify') ? 2 : 0,
            CURLOPT_USERAGENT => 'LPW-demo/1.0 (+https://github.com/cschilder/LPW)', CURLOPT_ENCODING => '',
            CURLOPT_WRITEFUNCTION => function ($ch, $d) use (&$body, $max) {
                $body .= $d;
                return strlen($body) > $max ? 0 : strlen($d);
            },
        ]);
        curl_exec($h);
        $code = curl_getinfo($h, CURLINFO_HTTP_CODE);
        $loc = curl_getinfo($h, CURLINFO_REDIRECT_URL);
        $err = curl_error($h);
        trace('in', "HTTP GET", "$url → " . ($code ?: $err) . ($loc ? " → $loc" : '') . ' · ' . strlen($body) . ' bytes');
        if ($code >= 300 && $code < 400 && $loc) {
            $url = $loc;
            continue;
        }
        if (!$code) {
            fail("Ophalen mislukt: $err", 502);
        }
        return [$code, $body, $url];
    }
    fail('Te veel redirects', 502);
}
