<?php
// Finger-brug (RFC 1288): stuurt "[/W ]<gebruiker>\r\n" naar TCP-poort 79.
require __DIR__ . '/_lib.php';
bootstrap();

$host = str_arg('host', '', 253);
$user = one_line(str_arg('user', '', 128));
$verbose = (bool) arg('verbose', false);
if (!preg_match('/^[A-Za-z0-9._@+-]*$/', $user)) {
    fail('Ongeldige gebruikersnaam');
}
$ip = guard('finger', $host, 79, [79]);
[$raw, $meta] = tcp_request($host, $ip, 79, ($verbose ? '/W ' : '') . $user . "\r\n");
$text = str_replace("\r\n", "\n", utf8($raw));
// velden herkennen ("Login: x    Name: y")
$parts = preg_split('/^(?:Plan|Project):\s*$/mi', $text, 2);
$plan = isset($parts[1]) ? trim($parts[1]) : '';
$fields = [];
foreach (explode("\n", $parts[0]) as $line) {
    if (preg_match_all('/([A-Z][A-Za-z ]{1,20}):\s+(.+?)(?=\s{2,}[A-Z][A-Za-z ]{1,20}:|$)/', $line, $mm, PREG_SET_ORDER)) {
        foreach ($mm as $f) {
            if (count($fields) < 20) {
                $fields[] = [trim($f[1]), trim($f[2])];
            }
        }
    }
}
out(['query' => $user . '@' . $host, 'text' => $text, 'fields' => $fields, 'plan' => $plan, 'conn' => $meta]);
