<?php
/**
 * Static check of gtag snippet in plugin source (no WP/DB required).
 * Run: php verify-gtag-output.php
 */
$file = __DIR__ . '/bv-ga4-tracking.php';
$src = file_get_contents($file);

$must = [
    'Google tag (gtag.js)' => strpos($src, '<!-- Google tag (gtag.js) -->') !== false,
    'gtag_src URL' => strpos($src, 'googletagmanager.com/gtag/js?id=') !== false,
    'script with esc_attr($gtag_src)' => strpos($src, 'esc_attr($gtag_src)') !== false,
    'async' => strpos($src, 'async></script>') !== false,
    'dataLayer' => strpos($src, 'window.dataLayer = window.dataLayer || [];') !== false,
    'gtag stub' => strpos($src, 'window.gtag = window.gtag || function(){dataLayer.push(arguments);};') !== false,
    'gtag(\'js\'' => strpos($src, "gtag('js', new Date());") !== false,
    'gtag(\'config\'' => strpos($src, "gtag('config',") !== false,
    'send_page_view' => strpos($src, "'send_page_view': true") !== false,
];

$mustNot = [
    'data-src' => strpos($src, 'data-src') === false,
    'bv-gtag-loader' => strpos($src, 'bv-gtag-loader') === false,
    'gtag(\'consent\'' => strpos($src, "gtag('consent'") === false,
    'get_consent_mode_default' => strpos($src, 'get_consent_mode_default') === false,
];

$ok = true;
foreach ($must as $name => $pass) {
    if (!$pass) {
        echo "FAIL (must have): $name\n";
        $ok = false;
    }
}
foreach ($mustNot as $name => $pass) {
    if (!$pass) {
        echo "FAIL (must not have): $name\n";
        $ok = false;
    }
}
// Event logic (format_product_for_ga4, events array)
$mustEvents = [
    'format_product_for_ga4' => strpos($src, 'function format_product_for_ga4') !== false,
    'events array' => strpos($src, "'events' => array()") !== false || strpos($src, "'events' => array(") !== false,
    'view_item' => strpos($src, "'name' => 'view_item'") !== false,
    'view_item_list' => strpos($src, "'name' => 'view_item_list'") !== false,
    'begin_checkout' => strpos($src, "'name' => 'begin_checkout'") !== false,
];
foreach ($mustEvents as $name => $pass) {
    if (!$pass) {
        echo "FAIL (event logic): $name\n";
        $ok = false;
    }
}

if ($ok) {
    echo "PASS: gtag snippet is standard (no delay, no consent).\n";
    echo "PASS: event logic (format_product_for_ga4, view_item, view_item_list, begin_checkout) present.\n";
    exit(0);
}
exit(1);
