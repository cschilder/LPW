<?php
// LPW protocolbruggen — gedeelde bibliotheek.
//
// Elke brug (gopher.php, gemini.php, …) spreekt per HTTP-verzoek het échte protocol
// via een TCP/UDP/TLS-socket en geeft JSON terug aan de browser-app, inclusief een
// "trace" van wat er werkelijk over de draad ging (voor het Logboek).
//
// Omdat dit op een publieke webhost (Strato) draait, is misbruik als open proxy
// afgeschermd: alleen publieke IP-adressen (geen 10/8, 192.168/16, 127/8, …),
// alleen de standaardpoorten van het betreffende protocol, CR/LF-sanering,
// tijdslimieten, groottelimieten en een eenvoudige rate limit per IP.

declare(strict_types=1);

const LPW_VERSION = '1.0';

// ---------------------------------------------------------------- configuratie
function cfg(string $key)
{
    static $c = null;
    if ($c === null) {
        $c = [
            'allow_private' => false,   // alleen lokaal ontwikkelen: ook 127.0.0.1/LAN toestaan
            'tls_verify'    => true,    // TLS-certificaten controleren bij HTTPS (curl)
            'rate_per_min'  => 60,      // max. bruggen-verzoeken per IP per minuut
            'timeout'       => 8.0,     // seconden per verbinding
            'max_bytes'     => 524288,  // max. antwoordgrootte (512 KiB)
            'admin_hash'    => '',      // password_hash() van het beheerwachtwoord (publiceren)
            'extra_ports'   => [],      // bijv. ['gopher' => [7070]]
            'public_url'    => '',      // bijv. https://jouwdomein.nl/voorbeeld/publiek
        ];
        $f = __DIR__ . '/config.php';
        if (is_file($f)) {
            $user = require $f;
            if (is_array($user)) {
                $c = array_merge($c, $user);
            }
        }
    }
    return $c[$key] ?? null;
}

// ---------------------------------------------------------------- in- en uitvoer
$GLOBALS['lpw_trace'] = [];
$GLOBALS['lpw_t0'] = microtime(true);

function trace(string $dir, string $cmd, string $detail = ''): void
{
    if (strlen($detail) > 4000) {
        $detail = substr($detail, 0, 4000) . '…';
    }
    $GLOBALS['lpw_trace'][] = ['dir' => $dir, 'cmd' => $cmd, 'detail' => $detail];
}

function out(array $data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    $data = array_merge(['ok' => true], $data);
    $data['ms'] = (int) round((microtime(true) - $GLOBALS['lpw_t0']) * 1000);
    $data['trace'] = $GLOBALS['lpw_trace'];
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function fail(string $msg, int $code = 400): never
{
    out(['ok' => false, 'error' => $msg], $code);
}

function input(): array
{
    static $in = null;
    if ($in === null) {
        $raw = file_get_contents('php://input') ?: '';
        $json = $raw !== '' ? json_decode($raw, true) : null;
        $in = is_array($json) ? $json : array_merge($_GET, $_POST);
    }
    return $in;
}

function arg(string $key, $default = null)
{
    $in = input();
    return array_key_exists($key, $in) ? $in[$key] : $default;
}

function str_arg(string $key, string $default = '', int $max = 1024): string
{
    $v = arg($key, $default);
    if (!is_scalar($v)) {
        fail("Ongeldige parameter: $key");
    }
    $v = (string) $v;
    if (strlen($v) > $max) {
        fail("Parameter $key is te lang (max. $max)");
    }
    return $v;
}

// Geen regeleinden of NUL in protocolregels (voorkomt injectie van extra commando's)
function one_line(string $s): string
{
    return str_replace(["\r", "\n", "\0"], '', $s);
}

// ---------------------------------------------------------------- bootstrap
function bootstrap(): void
{
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit;
    }
    set_exception_handler(function (Throwable $e) {
        fail('Interne fout: ' . $e->getMessage(), 500);
    });
    set_error_handler(function (int $no, string $str) {
        // fouten van fsockopen e.d. worden als waarschuwing gelogd i.p.v. HTML-output
        trace('err', 'PHP', $str);
        return true;
    });
    rate_limit();
}

function rate_limit(): void
{
    $limit = (int) cfg('rate_per_min');
    if ($limit <= 0) {
        return;
    }
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'cli';
    $file = sys_get_temp_dir() . '/lpw-rl-' . md5($ip . date('YmdHi'));
    $n = is_file($file) ? (int) file_get_contents($file) : 0;
    if ($n >= $limit) {
        fail('Te veel verzoeken; probeer het over een minuut opnieuw.', 429);
    }
    @file_put_contents($file, (string) ($n + 1), LOCK_EX);
}

// ---------------------------------------------------------------- SSRF-bescherming
function ip_allowed(string $ip): bool
{
    if (cfg('allow_private')) {
        return filter_var($ip, FILTER_VALIDATE_IP) !== false;
    }
    return filter_var($ip, FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false
        && !preg_match('/^(0\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|169\.254\.|::ffff:)/', $ip);
}

/**
 * Controleert host + poort en geeft het IP-adres terug waarmee verbonden moet worden.
 * Er wordt met het opgeloste IP verbonden (niet opnieuw de naam), zodat
 * DNS-rebinding geen intern adres kan binnensmokkelen.
 */
function guard(string $proto, string $host, int $port, array $ports): string
{
    $host = strtolower(trim($host, " []"));
    if ($host === '' || strlen($host) > 253 || !preg_match('/^[a-z0-9.:-]+$/', $host)) {
        fail('Ongeldige hostnaam');
    }
    $extra = cfg('extra_ports')[$proto] ?? [];
    if (!in_array($port, array_merge($ports, $extra), true)) {
        fail("Poort $port is niet toegestaan voor $proto (toegestaan: " . implode(', ', array_merge($ports, $extra)) . ')');
    }
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        $ips = [$host];
    } else {
        $ips = gethostbynamel($host) ?: [];
        if (!$ips && function_exists('dns_get_record')) {
            foreach (@dns_get_record($host, DNS_AAAA) ?: [] as $r) {
                $ips[] = $r['ipv6'];
            }
        }
    }
    if (!$ips) {
        fail("Host $host niet gevonden (DNS)");
    }
    foreach ($ips as $ip) {
        if (!ip_allowed($ip)) {
            fail("Adres $ip van $host is niet publiek; verbinden geweigerd.");
        }
    }
    trace('out', 'DNS', "$host → " . implode(', ', $ips));
    return $ips[0];
}

function sock_addr(string $scheme, string $ip, int $port): string
{
    return str_contains($ip, ':') ? "$scheme://[$ip]:$port" : "$scheme://$ip:$port";
}

// ---------------------------------------------------------------- TCP / TLS
/**
 * Opent een TCP- of TLS-verbinding. Geeft [stream, meta] terug.
 * Bij TLS: SNI = hostnaam, certificaat wordt NIET gevalideerd (small-internet-
 * protocollen gebruiken TOFU); de vingerafdruk wordt teruggegeven.
 */
function tcp_open(string $host, string $ip, int $port, bool $tls = false, array $clientCert = []): array
{
    $ctxOpts = [];
    if ($tls) {
        $ctxOpts['ssl'] = [
            'peer_name' => $host,
            'SNI_enabled' => true,
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true,
            'capture_peer_cert' => true,
            'crypto_method' => STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT,
        ];
        if ($clientCert) {
            $ctxOpts['ssl']['local_cert'] = $clientCert['cert'];
            $ctxOpts['ssl']['local_pk'] = $clientCert['key'];
        }
    }
    $ctx = stream_context_create($ctxOpts);
    $t = microtime(true);
    $s = @stream_socket_client(sock_addr($tls ? 'tls' : 'tcp', $ip, $port), $errno, $errstr,
        (float) cfg('timeout'), STREAM_CLIENT_CONNECT, $ctx);
    if (!$s) {
        fail("Verbinding met $host:$port mislukt: " . ($errstr ?: "fout $errno"), 502);
    }
    stream_set_timeout($s, (int) ceil((float) cfg('timeout')));
    $meta = ['connect_ms' => (int) round((microtime(true) - $t) * 1000)];
    trace('out', $tls ? 'TLS CONNECT' : 'TCP CONNECT', "$host:$port ($ip) in {$meta['connect_ms']} ms");
    if ($tls) {
        $params = stream_context_get_params($s);
        $cert = $params['options']['ssl']['peer_certificate'] ?? null;
        $crypto = stream_get_meta_data($s)['crypto'] ?? [];
        if ($cert) {
            $info = openssl_x509_parse($cert) ?: [];
            $meta['cert'] = [
                'sha256' => openssl_x509_fingerprint($cert, 'sha256'),
                'subject' => $info['subject']['CN'] ?? '',
                'issuer' => $info['issuer']['CN'] ?? '',
                'valid_to' => isset($info['validTo_time_t']) ? date('Y-m-d', $info['validTo_time_t']) : '',
                'self_signed' => ($info['subject'] ?? null) == ($info['issuer'] ?? null),
            ];
        }
        $meta['tls'] = ($crypto['protocol'] ?? '') . ' ' . ($crypto['cipher_name'] ?? '');
        trace('in', 'TLS HANDSHAKE', trim($meta['tls']) . (isset($meta['cert']) ? "\ncert CN={$meta['cert']['subject']} sha256={$meta['cert']['sha256']}" : ''));
    }
    return [$s, $meta];
}

/** Leest tot EOF (of max_bytes / timeout). */
function read_all($s): string
{
    $max = (int) cfg('max_bytes');
    $buf = '';
    $deadline = microtime(true) + (float) cfg('timeout');
    while (!feof($s) && strlen($buf) < $max && microtime(true) < $deadline) {
        $chunk = fread($s, 8192);
        if ($chunk === false) {
            break;
        }
        if ($chunk === '') {
            $m = stream_get_meta_data($s);
            if ($m['timed_out']) {
                break;
            }
            usleep(5000);
            continue;
        }
        $buf .= $chunk;
    }
    return $buf;
}

/** Leest één regel tot CRLF (max $max bytes). */
function read_line($s, int $max = 2048): string
{
    $line = fgets($s, $max);
    return $line === false ? '' : $line;
}

/** Eén verzoek → volledig antwoord (gopher, finger, nex, …). */
function tcp_request(string $host, string $ip, int $port, string $request, bool $tls = false): array
{
    [$s, $meta] = tcp_open($host, $ip, $port, $tls);
    fwrite($s, $request);
    trace('out', 'SEND', visible($request));
    $resp = read_all($s);
    fclose($s);
    trace('in', 'RECV', strlen($resp) . " bytes\n" . visible(substr($resp, 0, 1500)));
    $meta['bytes'] = strlen($resp);
    $meta['truncated'] = strlen($resp) >= (int) cfg('max_bytes');
    return [$resp, $meta];
}

// ---------------------------------------------------------------- UDP
function udp_open(string $ip, int $port)
{
    $s = @stream_socket_client(sock_addr('udp', $ip, $port), $errno, $errstr, (float) cfg('timeout'));
    if (!$s) {
        fail("UDP-socket naar $ip:$port mislukt: $errstr", 502);
    }
    stream_set_blocking($s, true);
    return $s;
}

/** Wacht op één datagram (null bij time-out). */
function udp_recv($s, float $timeout, int $max = 65535): ?string
{
    $sec = (int) floor($timeout);
    $usec = (int) (($timeout - $sec) * 1e6);
    $r = [$s];
    $w = $e = null;
    if (@stream_select($r, $w, $e, $sec, $usec) < 1) {
        return null;
    }
    $d = fread($s, $max);
    return ($d === false || $d === '') ? null : $d;
}

// ---------------------------------------------------------------- weergave
/** Maakt bytes leesbaar voor het Logboek: tekst blijft tekst, CR/LF zichtbaar. */
function visible(string $b): string
{
    if (!mb_check_encoding($b, 'UTF-8') || preg_match('/[\x00-\x08\x0e-\x1f]/', $b)) {
        return 'hex: ' . hexdump($b);
    }
    return str_replace(["\r\n", "\r"], ["␍␊\n", '␍'], $b);
}

function hexdump(string $b, int $max = 512): string
{
    $h = bin2hex(substr($b, 0, $max));
    return trim(chunk_split($h, 2, ' ')) . (strlen($b) > $max ? ' …' : '');
}

function utf8(string $b): string
{
    return mb_check_encoding($b, 'UTF-8') ? $b : mb_convert_encoding($b, 'UTF-8', 'ISO-8859-1');
}

// ---------------------------------------------------------------- beheer (publiceren)
function require_admin(): void
{
    $hash = (string) cfg('admin_hash');
    if ($hash === '') {
        fail('Publiceren is uitgeschakeld: stel admin_hash in in api/config.php (zie STRATO.md).', 403);
    }
    $pw = str_arg('admin', '', 200);
    if (!password_verify($pw, $hash)) {
        usleep(400000);
        fail('Onjuist beheerwachtwoord.', 403);
    }
}

function publiek_dir(string $sub = ''): string
{
    $d = dirname(__DIR__) . '/publiek' . ($sub !== '' ? '/' . $sub : '');
    if (!is_dir($d) && !@mkdir($d, 0775, true)) {
        fail("Kan map publiek/$sub niet aanmaken (rechten?)", 500);
    }
    return $d;
}

function publiek_url(string $path = ''): string
{
    $base = rtrim((string) cfg('public_url'), '/');
    if ($base === '') {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $dir = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/voorbeeld/api/x.php')), '/');
        $base = "$scheme://$host$dir/publiek";
    }
    return $base . ($path !== '' ? '/' . ltrim($path, '/') : '');
}

function slug(string $s): string
{
    $s = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s), '-'));
    return substr($s !== '' ? $s : 'bericht', 0, 60);
}
