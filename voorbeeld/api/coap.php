<?php
// CoAP-brug (RFC 7252): bouwt een binair CoAP-bericht, verstuurt het over UDP (poort 5683)
// en verwerkt ACK's, separate responses en Block2-overdrachten.
require __DIR__ . '/_lib.php';
require __DIR__ . '/_coap.php';
bootstrap();

$url = one_line(trim(str_arg('url', '', 1024)));
$method = strtoupper(str_arg('method', 'GET', 10));
$payload = str_arg('payload', '', 4096);
$format = arg('format', null);
$con = str_arg('type', 'CON', 3) !== 'NON';
if (!isset(COAP_METHODS[$method])) {
    fail('Methode moet GET, POST, PUT, DELETE of FETCH zijn');
}
[$host, $port, $opts] = coap_url($url);
$ip = guard('coap', $host, $port, [5683, 5684]);
if (!filter_var($host, FILTER_VALIDATE_IP)) {
    $opts[] = [3, $host];                 // Uri-Host (virtuele hosting)
}
if ($payload !== '' && $format !== null && $format !== '') {
    $opts[] = [12, coap_uint((int) $format)];
}
$m = coap_exchange($ip, $port, COAP_METHODS[$method], $opts, $payload, $con);
$res = coap_result($m);
if (($res['format'] ?? '') === 'application/link-format') {
    $res['links'] = parse_link_format($res['payload']);
}
out(['url' => $url, 'method' => $method, 'response' => $res]);
