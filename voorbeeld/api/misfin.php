<?php
// Misfin-brug (Misfin B: Gemini-achtige mail over TLS, poort 1958).
// action=identity → maakt een zelfondertekend clientcertificaat (CN = naam, UID = mailbox,
//                   SAN = host) dat je identiteit/afzenderadres vormt.
// action=send     → "misfin://<mailbox>@<host> <bericht>\r\n" (max. 2048 bytes) met dat certificaat.
//                   Antwoord "20 <vingerafdruk>" = afgeleverd.
require __DIR__ . '/_lib.php';
bootstrap();

$action = str_arg('action', 'send', 20);

if ($action === 'identity') {
    $mailbox = str_arg('mailbox', '', 64);
    $host = str_arg('host', '', 253);
    $name = one_line(str_arg('name', '', 100));
    if (!preg_match('/^[a-z0-9._-]{1,64}$/i', $mailbox) || !preg_match('/^[a-z0-9.-]{1,253}$/i', $host)) {
        fail('Mailbox of host ongeldig');
    }
    $cnf = tempnam(sys_get_temp_dir(), 'lpwmf');
    file_put_contents($cnf, "[req]\ndistinguished_name=dn\n[dn]\n[v3]\nsubjectAltName=DNS:$host\nbasicConstraints=CA:FALSE\n");
    $opts = ['config' => $cnf, 'digest_alg' => 'sha256', 'x509_extensions' => 'v3', 'private_key_type' => OPENSSL_KEYTYPE_RSA, 'private_key_bits' => 2048];
    $key = openssl_pkey_new($opts);
    $dn = ['commonName' => $name !== '' ? $name : $mailbox, 'UID' => $mailbox];
    $csr = openssl_csr_new($dn, $key, $opts);
    $x509 = openssl_csr_sign($csr, null, $key, 3650, $opts, random_int(1, PHP_INT_MAX));
    @unlink($cnf);
    if (!$x509) {
        fail('Certificaat maken mislukt: ' . openssl_error_string(), 500);
    }
    openssl_x509_export($x509, $certPem);
    openssl_pkey_export($key, $keyPem, null, ['config' => sys_get_temp_dir()]);
    trace('out', 'IDENTITEIT', "CN=" . $dn['commonName'] . " UID=$mailbox SAN=DNS:$host (RSA-2048, 10 jaar)");
    out(['address' => "$mailbox@$host", 'cert' => $certPem, 'key' => $keyPem,
         'sha256' => openssl_x509_fingerprint($x509, 'sha256')]);
}

// ---- versturen
$to = str_arg('to', '', 320);
$message = str_arg('message', '', 2048);
$cert = str_arg('cert', '', 8192);
$key = str_arg('key', '', 8192);
if (!preg_match('/^([a-z0-9._-]+)@([a-z0-9.-]+)(?::(\d+))?$/i', $to, $m)) {
    fail('Ontvanger moet de vorm mailbox@host hebben');
}
if (!str_contains($cert, 'BEGIN CERTIFICATE') || !str_contains($key, 'PRIVATE KEY')) {
    fail('Maak eerst een identiteit (certificaat) aan');
}
$host = $m[2];
$port = (int) ($m[3] ?? 1958);
$req = "misfin://{$m[1]}@$host $message\r\n";
if (strlen($req) > 2048) {
    fail('Misfin(B) staat maximaal 2048 bytes per verzoek toe (' . strlen($req) . ' nu)');
}
$ip = guard('misfin', $host, $port, [1958]);
$cf = tempnam(sys_get_temp_dir(), 'lpwc');
$kf = tempnam(sys_get_temp_dir(), 'lpwk');
chmod($kf, 0600);
file_put_contents($cf, $cert);
file_put_contents($kf, $key);
try {
    [$s, $meta] = tcp_open($host, $ip, $port, true, ['cert' => $cf, 'key' => $kf]);
    fwrite($s, $req);
    trace('out', 'SEND', visible($req));
    $line = rtrim(read_line($s, 1100), "\r\n");
    trace('in', 'RESPONSE', $line);
    fclose($s);
} finally {
    @unlink($cf);
    @unlink($kf);
}
if (!preg_match('/^(\d\d) ?(.*)$/', $line, $mm)) {
    fail("Ongeldig antwoord: \"$line\"", 502);
}
out(['status' => (int) $mm[1], 'meta' => $mm[2], 'bytes' => strlen($req), 'conn' => $meta]);
