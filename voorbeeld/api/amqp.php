<?php
// AMQP 0-9-1-brug: een kleine maar echte AMQP-client (frames, SASL PLAIN, kanaal,
// exchange/queue declareren + binden, publiceren met publisher confirms, basic.get + ack).
//   action=info     → verbinden en serverinfo tonen
//   action=publish  → (optioneel declareren) + Basic.Publish, wacht op Basic.Ack van de broker
//   action=get      → Basic.Get (max. 10 berichten) en elk bericht bevestigen
// Werkt met RabbitMQ (ook CloudAMQP), LavinMQ, Qpid enz. Poort 5672 (of 5671 met TLS).
require __DIR__ . '/_lib.php';
bootstrap();

// ---------------------------------------------------------------- codering
function a_short(int $v): string { return pack('n', $v); }
function a_long(int $v): string { return pack('N', $v); }
function a_ll(int $v): string { return pack('J', $v); }
function a_sstr(string $s): string { return chr(strlen($s)) . $s; }
function a_lstr(string $s): string { return pack('N', strlen($s)) . $s; }
function a_table(array $t): string
{
    $b = '';
    foreach ($t as $k => $v) {
        $b .= a_sstr((string) $k);
        if (is_bool($v)) {
            $b .= 't' . ($v ? "\1" : "\0");
        } elseif (is_int($v)) {
            $b .= 'I' . pack('N', $v);
        } elseif (is_array($v)) {
            $b .= 'F' . a_table($v);
        } else {
            $b .= 'S' . a_lstr((string) $v);
        }
    }
    return pack('N', strlen($b)) . $b;
}

// ---------------------------------------------------------------- decodering
final class Rd
{
    public function __construct(public string $b, public int $i = 0) {}
    public function octet(): int { return ord($this->b[$this->i++]); }
    public function short(): int { $v = unpack('n', substr($this->b, $this->i, 2))[1]; $this->i += 2; return $v; }
    public function long(): int { $v = unpack('N', substr($this->b, $this->i, 4))[1]; $this->i += 4; return $v; }
    public function ll(): int { $v = unpack('J', substr($this->b, $this->i, 8))[1]; $this->i += 8; return $v; }
    public function sstr(): string { $n = $this->octet(); $s = substr($this->b, $this->i, $n); $this->i += $n; return $s; }
    public function lstr(): string { $n = $this->long(); $s = substr($this->b, $this->i, $n); $this->i += $n; return $s; }
    public function table(): array
    {
        $end = $this->long() + $this->i;
        $t = [];
        while ($this->i < $end) {
            $k = $this->sstr();
            $t[$k] = $this->field();
        }
        return $t;
    }
    public function field()
    {
        $type = $this->b[$this->i++];
        switch ($type) {
            case 't': return $this->octet() !== 0;
            case 'b': case 'B': return $this->octet();
            case 's': case 'u': return $this->short();
            case 'I': case 'i': return $this->long();
            case 'l': case 'L': case 'T': return $this->ll();
            case 'S': case 'x': return $this->lstr();
            case 'F': return $this->table();
            case 'A':
                $end = $this->long() + $this->i;
                $a = [];
                while ($this->i < $end) {
                    $a[] = $this->field();
                }
                return $a;
            case 'V': return null;
            case 'd': $this->i += 8; return 0.0;
            case 'f': $this->i += 4; return 0.0;
            case 'D': $this->i += 5; return 0;
            default: throw new RuntimeException("Onbekend AMQP-veldtype $type");
        }
    }
}

const AMQP_METHODS = [
    '10.10' => 'Connection.Start', '10.11' => 'Connection.StartOk', '10.30' => 'Connection.Tune',
    '10.31' => 'Connection.TuneOk', '10.40' => 'Connection.Open', '10.41' => 'Connection.OpenOk',
    '10.50' => 'Connection.Close', '10.51' => 'Connection.CloseOk', '20.10' => 'Channel.Open',
    '20.11' => 'Channel.OpenOk', '20.40' => 'Channel.Close', '20.41' => 'Channel.CloseOk',
    '40.10' => 'Exchange.Declare', '40.11' => 'Exchange.DeclareOk', '50.10' => 'Queue.Declare',
    '50.11' => 'Queue.DeclareOk', '50.20' => 'Queue.Bind', '50.21' => 'Queue.BindOk',
    '60.40' => 'Basic.Publish', '60.50' => 'Basic.Return', '60.70' => 'Basic.Get', '60.71' => 'Basic.GetOk',
    '60.72' => 'Basic.GetEmpty', '60.80' => 'Basic.Ack', '60.120' => 'Basic.Nack',
    '85.10' => 'Confirm.Select', '85.11' => 'Confirm.SelectOk',
];

// ---------------------------------------------------------------- verbinding
final class Amqp
{
    public $s;
    public int $frameMax = 131072;
    public array $server = [];

    public function __construct(string $host, string $ip, int $port, bool $tls, string $vhost, string $user, string $pass)
    {
        [$this->s] = tcp_open($host, $ip, $port, $tls);
        fwrite($this->s, "AMQP\x00\x00\x09\x01");
        trace('out', 'PROTOCOL HEADER', 'AMQP 0-9-1  (41 4d 51 50 00 00 09 01)');
        $start = $this->expect(0, '10.10');
        $r = $start['r'];
        $maj = $r->octet();
        $min = $r->octet();
        $props = $r->table();
        $mechs = $r->lstr();
        $this->server = ['product' => $props['product'] ?? '?', 'version' => $props['version'] ?? '?',
            'platform' => $props['platform'] ?? '', 'protocol' => "$maj-$min", 'mechanisms' => $mechs,
            'capabilities' => array_keys(array_filter($props['capabilities'] ?? []))];
        trace('in', 'Connection.Start', "{$this->server['product']} {$this->server['version']} · mechanismen: $mechs");
        if (!in_array('PLAIN', explode(' ', $mechs), true)) {
            fail('Broker ondersteunt geen SASL PLAIN');
        }
        $cp = ['product' => 'LPW AMQP-brug', 'version' => LPW_VERSION, 'platform' => 'PHP ' . PHP_VERSION,
               'capabilities' => ['publisher_confirms' => true, 'basic.nack' => true]];
        $this->method(0, 10, 11, a_table($cp) . a_sstr('PLAIN') . a_lstr("\0$user\0$pass") . a_sstr('en_US'),
            "SASL PLAIN als \"$user\"");
        $tune = $this->expect(0, '10.30')['r'];
        $chMax = $tune->short();
        $this->frameMax = min($tune->long() ?: 131072, 131072);
        $tune->short();
        trace('in', 'Connection.Tune', "channel-max=$chMax frame-max={$this->frameMax}");
        $this->method(0, 10, 31, a_short($chMax ?: 2047) . a_long($this->frameMax) . a_short(0), 'heartbeat uit');
        $this->method(0, 10, 40, a_sstr($vhost) . a_sstr('') . "\0", "vhost \"$vhost\"");
        $this->expect(0, '10.41');
        $this->method(1, 20, 10, a_sstr(''), 'kanaal 1');
        $this->expect(1, '20.11');
    }

    public function frame(int $type, int $ch, string $payload): void
    {
        fwrite($this->s, chr($type) . pack('nN', $ch, strlen($payload)) . $payload . "\xCE");
    }

    public function method(int $ch, int $cls, int $mth, string $args, string $note = ''): void
    {
        $this->frame(1, $ch, pack('nn', $cls, $mth) . $args);
        trace('out', AMQP_METHODS["$cls.$mth"] ?? "$cls.$mth", $note);
    }

    /** Leest één frame. */
    public function read(): array
    {
        $h = $this->exact(7);
        $type = ord($h[0]);
        ['ch' => $ch, 'size' => $size] = unpack('nch/Nsize', substr($h, 1));
        $payload = $this->exact($size);
        if ($this->exact(1) !== "\xCE") {
            fail('Ongeldig AMQP-frame-einde', 502);
        }
        return ['type' => $type, 'ch' => $ch, 'payload' => $payload];
    }

    private function exact(int $n): string
    {
        $b = '';
        while (strlen($b) < $n) {
            $c = fread($this->s, $n - strlen($b));
            if ($c === '' || $c === false) {
                if (feof($this->s) || stream_get_meta_data($this->s)['timed_out']) {
                    fail('Verbinding met de broker verbroken (onjuiste login of vhost?)', 502);
                }
                continue;
            }
            $b .= $c;
        }
        return $b;
    }

    /** Wacht op een methode (heartbeats overslaan, Close netjes afhandelen). */
    public function expect(int $ch, string ...$want): array
    {
        while (true) {
            $f = $this->read();
            if ($f['type'] === 8) {
                continue;
            }
            if ($f['type'] !== 1) {
                continue;
            }
            $r = new Rd($f['payload']);
            $key = $r->short() . '.' . $r->short();
            if ($key === '10.50' || $key === '20.40') {
                $code = $r->short();
                $text = $r->sstr();
                trace('in', AMQP_METHODS[$key], "$code $text");
                $this->method($f['ch'], $key === '10.50' ? 10 : 20, $key === '10.50' ? 51 : 41, '');
                fail("Broker sloot het " . ($key === '10.50' ? 'verbinding' : 'kanaal') . ": $code $text", 502);
            }
            if (in_array($key, $want, true)) {
                if (!in_array($key, ['10.10', '10.30'], true)) {
                    trace('in', AMQP_METHODS[$key] ?? $key);
                }
                return ['key' => $key, 'r' => $r, 'ch' => $f['ch']];
            }
            trace('in', AMQP_METHODS[$key] ?? $key, '(niet verwacht, genegeerd)');
        }
    }

    /** Leest content-header + body-frames na Basic.GetOk / Basic.Return. */
    public function content(): array
    {
        $h = new Rd($this->read()['payload']);
        $h->short();
        $h->short();
        $size = $h->ll();
        $flags = $h->short();
        $props = [];
        $map = [15 => ['content_type', 's'], 14 => ['content_encoding', 's'], 13 => ['headers', 't'],
            12 => ['delivery_mode', 'o'], 11 => ['priority', 'o'], 10 => ['correlation_id', 's'],
            9 => ['reply_to', 's'], 8 => ['expiration', 's'], 7 => ['message_id', 's'], 6 => ['timestamp', 'l'],
            5 => ['type', 's'], 4 => ['user_id', 's'], 3 => ['app_id', 's']];
        foreach ($map as $bit => [$name, $t]) {
            if ($flags & (1 << $bit)) {
                $props[$name] = match ($t) { 's' => $h->sstr(), 't' => $h->table(), 'o' => $h->octet(), 'l' => $h->ll() };
            }
        }
        $body = '';
        while (strlen($body) < $size) {
            $body .= $this->read()['payload'];
        }
        return [$props, $body];
    }

    public function close(): void
    {
        $this->method(0, 10, 50, a_short(200) . a_sstr('Tot ziens') . a_short(0) . a_short(0), '200 normaal afsluiten');
        try {
            $this->expect(0, '10.51');
        } catch (Throwable $e) {
        }
        fclose($this->s);
    }
}

// ---------------------------------------------------------------- acties
$action = str_arg('action', 'info', 20);
$host = str_arg('host', '', 253);
$tls = (bool) arg('tls', false);
$port = (int) arg('port', $tls ? 5671 : 5672);
$vhost = str_arg('vhost', '/', 200);
$user = str_arg('user', 'guest', 200);
$pass = str_arg('pass', 'guest', 200);
$name = fn(string $k, string $def = '') => preg_replace('/[^A-Za-z0-9._:\/*#-]/', '', str_arg($k, $def, 200));   // * en # = topic-wildcards

$ip = guard('amqp', $host, $port, [5672, 5671]);
$c = new Amqp($host, $ip, $port, $tls, $vhost, $user, $pass);
$result = ['server' => $c->server];

if ($action === 'publish' || $action === 'declare') {
    $exchange = $name('exchange', 'lpw.demo');
    $etype = in_array($t = str_arg('exchangeType', 'topic', 10), ['direct', 'topic', 'fanout', 'headers'], true) ? $t : 'topic';
    $queue = $name('queue', '');
    $key = $name('routingKey', 'sensor.woonkamer.temp');
    $bindKey = $name('bindKey', $etype === 'topic' ? 'sensor.#' : $key);
    if ($exchange !== '' && $exchange !== 'amq.topic' && !str_starts_with($exchange, 'amq.')) {
        $c->method(1, 40, 10, a_short(0) . a_sstr($exchange) . a_sstr($etype) . "\x02" . a_table([]),
            "exchange \"$exchange\" ($etype, durable)");
        $c->expect(1, '40.11');
    }
    if ($queue !== '') {
        $c->method(1, 50, 10, a_short(0) . a_sstr($queue) . "\x02" . a_table([]), "queue \"$queue\" (durable)");
        $q = $c->expect(1, '50.11')['r'];
        $q->sstr();
        $result['queue'] = ['name' => $queue, 'messages' => $q->long(), 'consumers' => $q->long()];
        if ($exchange !== '') {
            $c->method(1, 50, 20, a_short(0) . a_sstr($queue) . a_sstr($exchange) . a_sstr($bindKey) . "\0" . a_table([]),
                "\"$queue\" ← \"$exchange\" met binding-key \"$bindKey\"");
            $c->expect(1, '50.21');
        }
    }
}

if ($action === 'publish') {
    $body = str_arg('body', '', 65536);
    $ctype = one_line(str_arg('contentType', 'application/json', 100));
    $persistent = (bool) arg('persistent', true);
    $c->method(1, 85, 10, "\0", 'publisher confirms aan');
    $c->expect(1, '85.11');
    $c->method(1, 60, 40, a_short(0) . a_sstr($exchange) . a_sstr($key) . "\x01", "exchange=\"$exchange\" routing-key=\"$key\" mandatory");
    $flags = (1 << 15) | (1 << 12) | (1 << 6) | (1 << 3);
    $props = a_sstr($ctype) . chr($persistent ? 2 : 1) . a_ll(time()) . a_sstr('lpw-demo');
    $c->frame(2, 1, pack('nn', 60, 0) . a_ll(strlen($body)) . pack('n', $flags) . $props);
    trace('out', 'Content-Header', "body-size=" . strlen($body) . " content-type=$ctype delivery-mode=" . ($persistent ? '2 (persistent)' : '1'));
    foreach (str_split($body === '' ? '' : $body, $c->frameMax - 8) as $chunk) {
        if ($chunk !== '') {
            $c->frame(3, 1, $chunk);
        }
    }
    trace('out', 'Content-Body', visible(substr($body, 0, 500)));
    $m = $c->expect(1, '60.80', '60.120', '60.50');
    if ($m['key'] === '60.50') {
        $code = $m['r']->short();
        $text = $m['r']->sstr();
        trace('in', 'Basic.Return', "$code $text — geen queue gebonden aan deze routing-key");
        $c->content();
        $c->expect(1, '60.80');
        $result['returned'] = "$code $text";
    }
    $result['confirmed'] = $m['key'] !== '60.120';
    $result['published'] = ['exchange' => $exchange, 'routingKey' => $key, 'bytes' => strlen($body)];
}

if ($action === 'get') {
    $queue = $name('queue', 'lpw.metingen');
    $count = max(1, min(10, (int) arg('count', 5)));
    $msgs = [];
    for ($n = 0; $n < $count; $n++) {
        $c->method(1, 60, 70, a_short(0) . a_sstr($queue) . "\0", "queue \"$queue\" (met ack)");
        $m = $c->expect(1, '60.71', '60.72');
        if ($m['key'] === '60.72') {
            break;
        }
        $r = $m['r'];
        $tag = $r->ll();
        $redelivered = $r->octet() !== 0;
        $ex = $r->sstr();
        $rk = $r->sstr();
        $left = $r->long();
        [$props, $body] = $c->content();
        trace('in', 'Content', "tag=$tag rk=$rk\n" . visible(substr($body, 0, 300)));
        $c->method(1, 60, 80, a_ll($tag) . "\0", "delivery-tag $tag bevestigd");
        $msgs[] = ['tag' => $tag, 'exchange' => $ex, 'routingKey' => $rk, 'redelivered' => $redelivered,
                   'remaining' => $left, 'props' => $props, 'body' => utf8($body)];
    }
    $result['messages'] = $msgs;
    $result['queue'] = $queue;
}

$c->close();
out($result);
