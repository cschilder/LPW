<?php
// Kopieer naar config.php (die wordt NIET ingecheckt) en pas aan.
//   cp config.example.php config.php
//
// Beheerwachtwoord (voor publiceren in twtxt/gemlog/phlog/bashblog) instellen:
//   php -r 'echo password_hash("JOUW-WACHTWOORD", PASSWORD_DEFAULT), PHP_EOL;'
// en plak de uitkomst hieronder bij admin_hash.
return [
    'admin_hash'   => '',          // bijv. '$2y$10$....'
    'public_url'   => '',          // leeg = automatisch; of 'https://jouwdomein.nl/voorbeeld/publiek'
    'rate_per_min' => 60,
    'timeout'      => 8.0,

    // Alleen voor lokaal ontwikkelen/testen tegen eigen servers op 127.0.0.1/LAN.
    // Op Strato ALTIJD false laten (anders is de brug een open proxy naar je netwerk).
    'allow_private' => false,
    'tls_verify'    => true,

    // Extra poorten per protocol toestaan, bijv. ['gopher' => [7070], 'gemini' => [1966]]
    'extra_ports'  => [],
];
