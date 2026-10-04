<?php
// CoAP-codec (RFC 7252) + Block2 (RFC 7959) — gedeeld door coap.php en lwm2m.php.

const COAP_TYPES = ['CON', 'NON', 'ACK', 'RST'];
const COAP_OPTS = [
    1 => 'If-Match', 3 => 'Uri-Host', 4 => 'ETag', 5 => 'If-None-Match', 6 => 'Observe',
    7 => 'Uri-Port', 8 => 'Location-Path', 11 => 'Uri-Path', 12 => 'Content-Format',
    14 => 'Max-Age', 15 => 'Uri-Query', 17 => 'Accept', 20 => 'Location-Query',
    23 => 'Block2', 27 => 'Block1', 28 => 'Size2', 35 => 'Proxy-Uri', 60 => 'Size1',
];
const COAP_FORMATS = [
    0 => 'text/plain', 40 => 'application/link-format', 41 => 'application/xml',
    42 => 'application/octet-stream', 47 => 'application/exi', 50 => 'application/json',
    60 => 'application/cbor', 110 => 'application/senml+json', 112 => 'application/senml+cbor',
    11542 => 'application/vnd.oma.lwm2m+tlv', 11543 => 'application/vnd.oma.lwm2m+json',
];
const COAP_METHODS = ['GET' => 1, 'POST' => 2, 'PUT' => 3, 'DELETE' => 4, 'FETCH' => 5];
const COAP_CODES = [
    '2.01' => 'Created', '2.02' => 'Deleted', '2.03' => 'Valid', '2.04' => 'Changed', '2.05' => 'Content',
    '2.31' => 'Continue', '4.00' => 'Bad Request', '4.01' => 'Unauthorized', '4.02' => 'Bad Option',
    '4.03' => 'Forbidden', '4.04' => 'Not Found', '4.05' => 'Method Not Allowed', '4.06' => 'Not Acceptable',
    '4.08' => 'Request Entity Incomplete', '4.12' => 'Precondition Failed', '4.13' => 'Request Entity Too Large',
    '4.15' => 'Unsupported Content-Format', '5.00' => 'Internal Server Error', '5.01' => 'Not Implemented',
    '5.02' => 'Bad Gateway', '5.03' => 'Service Unavailable', '5.04' => 'Gateway Timeout',
];

function coap_uint(int $v): string
{
    if ($v === 0) {
        return '';
    }
    $b = '';
    while ($v > 0) {
        $b = chr($v & 0xff) . $b;
        $v >>= 8;
    }
    return $b;
}

function coap_code_str(int $c): string
{
    return sprintf('%d.%02d', $c >> 5, $c & 0x1f);
}

/** @param array<int, array{0:int,1:string}> $opts lijst van [nummer, waarde] */
function coap_encode(int $type, int $code, int $mid, string $token, array $opts, string $payload = ''): string
{
    usort($opts, fn($a, $b) => $a[0] <=> $b[0]);
    $out = chr(0x40 | ($type << 4) | strlen($token)) . chr($code) . pack('n', $mid) . $token;
    $prev = 0;
    foreach ($opts as [$num, $val]) {
        $delta = $num - $prev;
        $len = strlen($val);
        $nib = function (int $n, string &$ext): int {
            if ($n < 13) {
                return $n;
            }
            if ($n < 269) {
                $ext .= chr($n - 13);
                return 13;
            }
            $ext .= pack('n', $n - 269);
            return 14;
        };
        $extD = $extL = '';
        $d = $nib($delta, $extD);
        $l = $nib($len, $extL);
        $out .= chr(($d << 4) | $l) . $extD . $extL . $val;
        $prev = $num;
    }
    if ($payload !== '') {
        $out .= "\xff" . $payload;
    }
    return $out;
}

function coap_decode(string $b): array
{
    if (strlen($b) < 4) {
        throw new RuntimeException('CoAP-bericht te kort');
    }
    $h = ord($b[0]);
    $tkl = $h & 0x0f;
    $msg = [
        'ver' => $h >> 6, 'type' => COAP_TYPES[($h >> 4) & 3], 'code' => coap_code_str(ord($b[1])),
        'mid' => unpack('n', substr($b, 2, 2))[1], 'token' => bin2hex(substr($b, 4, $tkl)),
        'options' => [], 'payload' => '',
    ];
    $i = 4 + $tkl;
    $num = 0;
    $n = strlen($b);
    while ($i < $n) {
        $byte = ord($b[$i++]);
        if ($byte === 0xff) {
            $msg['payload'] = substr($b, $i);
            break;
        }
        $ext = function (int $v) use ($b, &$i): int {
            if ($v === 13) {
                return ord($b[$i++]) + 13;
            }
            if ($v === 14) {
                $x = unpack('n', substr($b, $i, 2))[1] + 269;
                $i += 2;
                return $x;
            }
            return $v;
        };
        $num += $ext($byte >> 4);
        $len = $ext($byte & 0x0f);
        $val = substr($b, $i, $len);
        $i += $len;
        $msg['options'][] = [$num, $val];
    }
    return $msg;
}

/** Leesbare optie-waarde */
function coap_opt_value(int $num, string $val)
{
    $uint = fn() => $val === '' ? 0 : (int) hexdec(bin2hex($val));
    switch ($num) {
        case 3: case 8: case 11: case 15: case 20: case 35:
            return $val;
        case 12: case 17:
            $f = $uint();
            return COAP_FORMATS[$f] ?? (string) $f;
        case 23: case 27:
            $v = $uint();
            return ['num' => $v >> 4, 'more' => (bool) ($v & 8), 'size' => 1 << (($v & 7) + 4)];
        case 6: case 7: case 14: case 28: case 60:
            return $uint();
        default:
            return bin2hex($val);
    }
}

function coap_describe(array $m): string
{
    $s = "{$m['type']} {$m['code']}" . (isset(COAP_CODES[$m['code']]) ? ' ' . COAP_CODES[$m['code']] : '')
       . " MID={$m['mid']} token=" . ($m['token'] ?: '-');
    foreach ($m['options'] as [$num, $val]) {
        $v = coap_opt_value($num, $val);
        $s .= "\n  " . (COAP_OPTS[$num] ?? "opt$num") . ': ' . (is_array($v) ? "num={$v['num']} M=" . ($v['more'] ? 1 : 0) . " SZX={$v['size']}" : $v);
    }
    if ($m['payload'] !== '') {
        $s .= "\n  payload (" . strlen($m['payload']) . ' B): ' . visible(substr($m['payload'], 0, 300));
    }
    return $s;
}

/** URL → [host, port, opties] */
function coap_url(string $url, int $defPort = 5683): array
{
    $p = parse_url($url);
    if (!$p || ($p['scheme'] ?? '') !== 'coap' || empty($p['host'])) {
        fail('Verwacht een coap://-URL');
    }
    $opts = [];
    foreach (explode('/', trim($p['path'] ?? '', '/')) as $seg) {
        if ($seg !== '') {
            $opts[] = [11, rawurldecode($seg)];
        }
    }
    foreach (explode('&', $p['query'] ?? '') as $q) {
        if ($q !== '') {
            $opts[] = [15, rawurldecode($q)];
        }
    }
    return [$p['host'], (int) ($p['port'] ?? $defPort), $opts];
}

/**
 * Eén verzoek/antwoord: CON met retransmissie (exponentiële back-off), lege ACK +
 * separate response (die we zelf ACK-en), token-matching.
 */
function coap_rr($s, int $code, array $opts, string $payload, string $token, bool $con, int &$packets): array
{
    $mid = random_int(0, 0xffff);
    $req = coap_encode($con ? 0 : 1, $code, $mid, $token, $opts, $payload);
    for ($try = 0; $try < 4; $try++) {
        fwrite($s, $req);
        $packets++;
        trace('out', ($try ? 'RETRANSMIT ' : '') . 'CoAP', coap_describe(coap_decode($req)) . "\n  hex: " . hexdump($req, 64));
        $wait = 2.0 * (2 ** $try);
        $t0 = microtime(true);
        while (microtime(true) - $t0 < $wait) {
            $d = udp_recv($s, max(0.05, $wait - (microtime(true) - $t0)));
            if ($d === null) {
                break;
            }
            $m = coap_decode($d);
            trace('in', 'CoAP', coap_describe($m) . "\n  hex: " . hexdump($d, 64));
            if ($m['type'] === 'ACK' && $m['code'] === '0.00' && $m['mid'] === $mid) {
                $wait = (float) cfg('timeout');     // lege ACK: separate response volgt
                $t0 = microtime(true);
                continue;
            }
            if ($m['type'] === 'RST' && $m['mid'] === $mid) {
                fail('Server antwoordde met RST (bericht geweigerd)', 502);
            }
            if ($m['token'] !== bin2hex($token)) {
                continue;
            }
            if ($m['type'] === 'CON') {
                fwrite($s, coap_encode(2, 0, $m['mid'], '', []));
                trace('out', 'CoAP', "ACK 0.00 MID={$m['mid']} (bevestigt separate response)");
            }
            return $m;
        }
        if (!$con) {
            break;
        }
    }
    fail('Geen CoAP-antwoord (time-out na retransmissies)', 504);
}

function coap_block_opt(array $m, int $num): ?array
{
    foreach ($m['options'] as [$n, $val]) {
        if ($n === $num) {
            return coap_opt_value($num, $val);
        }
    }
    return null;
}

/**
 * Volledige uitwisseling: grote payloads gaan in Block1-stukken (RFC 7959) omhoog,
 * grote antwoorden komen in Block2-stukken binnen en worden samengevoegd.
 */
function coap_exchange(string $ip, int $port, int $code, array $opts, string $payload = '', bool $con = true, int $maxBlocks = 64): array
{
    $s = udp_open($ip, $port);
    $token = random_bytes(4);
    $packets = 0;
    $size = 1024;                         // SZX 6
    // --- Block1: upload in stukken
    if (strlen($payload) > $size) {
        $chunks = str_split($payload, $size);
        foreach ($chunks as $i => $chunk) {
            $more = $i < count($chunks) - 1;
            $o = array_merge($opts, [[27, coap_uint(($i << 4) | ($more ? 8 : 0) | 6)]]);
            if ($i === 0) {
                $o[] = [60, coap_uint(strlen($payload))];          // Size1
            }
            $resp = coap_rr($s, $code, $o, $chunk, $token, $con, $packets);
            if ($more && $resp['code'] !== '2.31') {
                break;                                           // server weigert of rondt af
            }
        }
    } else {
        $resp = coap_rr($s, $code, $opts, $payload, $token, $con, $packets);
    }
    // --- Block2: download in stukken
    $body = $resp['payload'];
    $blocks = 1;
    $b2 = coap_block_opt($resp, 23);
    while ($b2 && $b2['more'] && $blocks < $maxBlocks) {
        $szx = (int) log($b2['size'], 2) - 4;
        $o = array_merge($opts, [[23, coap_uint((($b2['num'] + 1) << 4) | $szx)]]);
        $resp = coap_rr($s, 1, $o, '', $token, $con, $packets);   // vervolgblokken met GET
        $body .= $resp['payload'];
        $blocks++;
        $b2 = coap_block_opt($resp, 23);
    }
    fclose($s);
    $resp['payload'] = $body;
    $resp['blocks'] = $blocks;
    $resp['packets'] = $packets;
    return $resp;
}

/** Antwoord in JSON-vriendelijke vorm */
function coap_result(array $m): array
{
    $opts = [];
    $format = null;
    foreach ($m['options'] as [$num, $val]) {
        $v = coap_opt_value($num, $val);
        $opts[] = ['num' => $num, 'name' => COAP_OPTS[$num] ?? "opt$num", 'value' => $v];
        if ($num === 12) {
            $format = $v;
        }
    }
    $p = $m['payload'];
    $text = mb_check_encoding($p, 'UTF-8') && !preg_match('/[\x00-\x08\x0e-\x1f]/', $p);
    return [
        'type' => $m['type'], 'code' => $m['code'], 'codeName' => COAP_CODES[$m['code']] ?? '',
        'mid' => $m['mid'], 'token' => $m['token'], 'options' => $opts, 'format' => $format,
        'payload' => $text ? $p : '', 'payloadHex' => $text ? '' : hexdump($p, 2048),
        'bytes' => strlen($p), 'blocks' => $m['blocks'] ?? 1, 'packets' => $m['packets'] ?? 1,
    ];
}

/** application/link-format → lijst resources */
function parse_link_format(string $s): array
{
    $out = [];
    foreach (preg_split('/,(?=<)/', trim($s)) as $entry) {
        if (!preg_match('/^<([^>]*)>(.*)$/s', trim($entry), $m)) {
            continue;
        }
        $attrs = [];
        foreach (explode(';', $m[2]) as $a) {
            if ($a === '') {
                continue;
            }
            [$k, $v] = array_pad(explode('=', $a, 2), 2, true);
            $attrs[$k] = is_string($v) ? trim($v, '"') : $v;
        }
        $out[] = ['href' => $m[1], 'attrs' => $attrs];
    }
    return $out;
}
