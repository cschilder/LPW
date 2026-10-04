<?php
// LwM2M-brug (OMA LwM2M 1.1 registratie-interface over CoAP/UDP).
//   register   → POST /rd?ep=<naam>&lt=<sec>&lwm2m=1.1&b=U  (link-format met objecten)
//                server antwoordt 2.01 Created + Location-Path rd/<id>
//   update     → POST /rd/<id>[?lt=…]
//   deregister → DELETE /rd/<id>
// Standaardserver: de publieke Eclipse Leshan-sandbox (leshan.eclipseprojects.io:5683).
require __DIR__ . '/_lib.php';
require __DIR__ . '/_coap.php';
bootstrap();

$action = str_arg('action', 'register', 20);
$host = str_arg('host', 'leshan.eclipseprojects.io', 253);
$port = (int) arg('port', 5683);
$ip = guard('lwm2m', $host, $port, [5683, 5684]);
$hostOpt = filter_var($host, FILTER_VALIDATE_IP) ? [] : [[3, $host]];

if ($action === 'register') {
    $ep = str_arg('endpoint', '', 64);
    $lt = max(30, min(86400, (int) arg('lifetime', 300)));
    if (!preg_match('/^[A-Za-z0-9._:-]{1,64}$/', $ep)) {
        fail('Ongeldige endpointnaam');
    }
    $objects = arg('objects', ['1/0', '3/0', '3303/0']);
    if (!is_array($objects)) {
        fail('objects moet een lijst zijn');
    }
    $links = ['</>;rt="oma.lwm2m";ct=11543'];
    foreach ($objects as $o) {
        if (!preg_match('#^\d{1,5}(/\d{1,5})?$#', (string) $o)) {
            fail("Ongeldig object: $o");
        }
        $links[] = "</$o>";
    }
    $payload = implode(',', $links);
    $opts = array_merge($hostOpt, [[11, 'rd'], [12, coap_uint(40)],
        [15, "ep=$ep"], [15, "lt=$lt"], [15, 'lwm2m=1.1'], [15, 'b=U']]);
    $m = coap_exchange($ip, $port, 2, $opts, $payload);
    $loc = [];
    foreach ($m['options'] as [$n, $v]) {
        if ($n === 8) {
            $loc[] = $v;
        }
    }
    out(['action' => 'register', 'response' => coap_result($m), 'location' => '/' . implode('/', $loc),
         'payload' => $payload, 'endpoint' => $ep, 'lifetime' => $lt]);
}

$location = str_arg('location', '', 200);
if (!preg_match('#^/rd/[A-Za-z0-9_-]+$#', $location)) {
    fail('Geen geldige registratielocatie (eerst registreren)');
}
$opts = $hostOpt;
foreach (explode('/', trim($location, '/')) as $seg) {
    $opts[] = [11, $seg];
}
if ($action === 'update') {
    $m = coap_exchange($ip, $port, 2, $opts);
} elseif ($action === 'deregister') {
    $m = coap_exchange($ip, $port, 4, $opts);
} else {
    fail('Onbekende actie');
}
out(['action' => $action, 'response' => coap_result($m), 'location' => $location]);
