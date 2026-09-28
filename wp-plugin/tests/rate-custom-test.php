<?php
/**
 * تستِ اتصال‌ها و منابعِ نرخِ سفارشی — اعتبارسنجی، رمزنگاریِ کلید،
 * راهنمای مسیر.
 *
 * چیزی که این‌جا تست *نمی‌شود*: درخواستِ واقعی به API
 * (‎wp_safe_remote_get‎) — آن روی نصبِ واقعی با دکمه‌ی «آزمایش»
 * دیده می‌شود.
 *
 * اجرا:  php wp-plugin/tests/rate-custom-test.php
 *        php -d extension=sodium wp-plugin/tests/rate-custom-test.php
 */

define('ABSPATH', __DIR__);
define('PHOENIX_BRIDGE_VERSION', 'test');

function add_action() {}
function add_filter() {}
function apply_filters($t, $v) { return $v; }
function sanitize_key($k) { return preg_replace('/[^a-z0-9_\-]/', '', strtolower((string) $k)); }
function sanitize_text_field($s) { return trim(strip_tags((string) $s)); }
function wp_salt($scheme) { return $GLOBALS['fake_salt']; }
/* مثلِ وردپرس: آدرسِ داخلی و خصوصی رد */
function wp_http_validate_url($u) {
    $host = parse_url($u, PHP_URL_HOST);
    if (!$host || preg_match('/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/', $host)) {
        return false;
    }
    return $u;
}
function phoenix_setting($k, $f = null) { return $GLOBALS['fake_settings'][$k] ?? $f; }

$GLOBALS['fake_salt'] = 'salt-one';
$GLOBALS['fake_settings'] = array();

require_once __DIR__ . '/../phoenix-bridge/includes/connections.php';
require_once __DIR__ . '/../phoenix-bridge/includes/rate-sources.php';
require_once __DIR__ . '/../phoenix-bridge/includes/rate-custom.php';

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;
function is_same($label, $got, $want) {
    if ($got === $want) { $GLOBALS['pass']++; printf("  ok    %s\n", $label); return; }
    $GLOBALS['fail']++;
    printf("  FAIL  %s\n        got  %s\n        want %s\n", $label,
        json_encode($got, JSON_UNESCAPED_UNICODE), json_encode($want, JSON_UNESCAPED_UNICODE));
}
function section($t) { echo "\n== {$t} ==\n"; }

function src(array $over = array()) {
    return array_merge(array('label' => 'صرافیِ من', 'url' => 'https://api.example.com/v1/usdt',
        'path' => 'data.price', 'unit' => 'toman', 'conn' => ''), $over);
}
function err_of(array $in, $field, array $conns = array()) {
    $r = phoenix_source_clean($in, $conns);
    return isset($r['errors'][$field]) ? true : ($r['ok'] ? 'ok' : array_keys($r['errors']));
}
function conn_err(array $in, $field, $has_key = false) {
    $r = phoenix_conn_clean($in, $has_key);
    return isset($r['errors'][$field]) ? true : ($r['ok'] ? 'ok' : array_keys($r['errors']));
}

/* ============================================================ */
section('منبعِ نرخ — اعتبارسنجی');

is_same('منبعِ درست پذیرفته می‌شود', phoenix_source_clean(src())['ok'], true);
is_same('بی‌اسم رد',                  err_of(src(array('label' => ' ')), 'label'), true);
is_same('http بی‌رمز رد',             err_of(src(array('url' => 'http://api.example.com/x')), 'url'), true);
is_same('localhost رد (SSRF)',        err_of(src(array('url' => 'https://localhost/x')), 'url'), true);
is_same('۱۲۷.۰.۰.۱ رد (SSRF)',        err_of(src(array('url' => 'https://127.0.0.1:8080/x')), 'url'), true);
is_same('۱۹۲.۱۶۸ رد (SSRF)',          err_of(src(array('url' => 'https://192.168.1.1/admin')), 'url'), true);
is_same('متادیتای ابر رد (SSRF)',     err_of(src(array('url' => 'https://169.254.169.254/latest')), 'url'), true);
is_same('نقلِ‌قول در نشانی رد',       err_of(src(array('url' => 'https://api.example.com/"x')), 'url'), true);
is_same('javascript: رد',             err_of(src(array('url' => 'javascript:alert(1)')), 'url'), true);

is_same('مسیرِ خالی رد',               err_of(src(array('path' => '')), 'path'), true);
is_same('مسیر با فاصله رد',            err_of(src(array('path' => 'data price')), 'path'), true);
is_same('[] بی‌کلید=مقدار رد',         err_of(src(array('path' => 'markets.[].price')), 'path'), true);
is_same('نقطه‌ی دوتایی رد',            err_of(src(array('path' => 'data..price')), 'path'), true);
is_same('[] با کلید=مقدار پذیرفته',    phoenix_source_clean(src(array('path' => 'markets.[].symbol=USDTIRT.price')))['ok'], true);

is_same('بی‌واحد رد — پیش‌فرض ندارد',  err_of(src(array('unit' => '')), 'unit'), true);
is_same('دلار برای نرخِ تتر رد',       err_of(src(array('unit' => 'usd')), 'unit'), true);

is_same('اتصالِ ناموجود رد',            err_of(src(array('conn' => 'k_000000')), 'conn', array('k_111111')), true);
is_same('اتصالِ موجود پذیرفته',         phoenix_source_clean(src(array('conn' => 'k_111111')), array('k_111111'))['data']['conn'], 'k_111111');

/* ============================================================ */
section('اتصال — کلید و هدر');

is_same('اتصالِ تازه بی‌کلید رد',       conn_err(array('label' => 'x', 'auth' => 'bearer'), 'key'), true);
is_same('ویرایش بی‌کلیدِ تازه → همان قبلی (null)',
    phoenix_conn_clean(array('label' => 'x', 'auth' => 'bearer'), true)['data']['key'], null);
is_same('کلید با شکستِ خط رد (تزریقِ هدر)',
    conn_err(array('label' => 'x', 'key' => "abc\r\nX-Evil: 1"), 'key'), true);
is_same('هدرِ دلخواه بی‌نام رد',        conn_err(array('label' => 'x', 'auth' => 'header', 'key' => 'k'), 'header'), true);
is_same('نامِ هدر با فاصله رد',         conn_err(array('label' => 'x', 'auth' => 'header', 'header' => 'X Key', 'key' => 'k'), 'header'), true);
is_same('هدرِ Host رد',                 conn_err(array('label' => 'x', 'auth' => 'header', 'header' => 'Host', 'key' => 'k'), 'header'), true);
is_same('هدرِ cookie (کوچک) رد',        conn_err(array('label' => 'x', 'auth' => 'header', 'header' => 'cookie', 'key' => 'k'), 'header'), true);
is_same('X-API-Key پذیرفته',            phoenix_conn_clean(array('label' => 'x', 'auth' => 'header', 'header' => 'X-API-Key', 'key' => 'k'))['data']['header'], 'X-API-Key');
is_same('روشِ ناشناخته → bearer',       phoenix_conn_clean(array('label' => 'x', 'auth' => 'basic', 'key' => 'k'))['data']['auth'], 'bearer');

is_same('هدرِ bearer',  phoenix_conn_headers(array('auth' => 'bearer', 'header' => '', 'key' => 'abc')), array('Authorization' => 'Bearer abc'));
is_same('هدرِ دلخواه',  phoenix_conn_headers(array('auth' => 'header', 'header' => 'X-Key', 'key' => 'abc')), array('X-Key' => 'abc'));
is_same('بی‌اتصال بی‌هدر', phoenix_conn_headers(null), array());

/* ============================================================ */
section('رمزنگاری');

is_same('این PHP روشی برای رمزنگاری دارد', phoenix_secret_method() !== '', true);
echo '        روش: ' . phoenix_secret_method() . "\n";

foreach (array('sodium', 'openssl') as $m) {
    if (($m === 'sodium' && !function_exists('sodium_crypto_secretbox')) || ($m === 'openssl' && !function_exists('openssl_encrypt'))) {
        echo "        ($m در این PHP نیست — رد شد)\n";
        continue;
    }
    $e = phoenix_secret_encrypt('key-' . $m, $m);
    is_same("$m: برمی‌گردد", phoenix_secret_decrypt($e), 'key-' . $m);
    $bad = substr($e, 0, 10) . (substr($e, 10, 1) === 'A' ? 'B' : 'A') . substr($e, 11);
    is_same("$m: دستکاری‌شده باز نمی‌شود", phoenix_secret_decrypt($bad), null);
}

$enc = phoenix_secret_encrypt('sk-live-123');
is_same('رمزشده متنِ خام را ندارد',     strpos($enc, 'sk-live') === false, true);
is_same('برمی‌گردد',                    phoenix_secret_decrypt($enc), 'sk-live-123');
is_same('هر بار رمزِ متفاوت (nonce)',   phoenix_secret_encrypt('x') !== phoenix_secret_encrypt('x'), true);
is_same('بی‌پیشوند باز نمی‌شود',          phoenix_secret_decrypt('sk-live-123'), null);
is_same('خالی باز نمی‌شود',               phoenix_secret_decrypt(''), null);

$GLOBALS['fake_salt'] = 'salt-two';
is_same('با نمکِ عوض‌شده باز نمی‌شود',   phoenix_secret_decrypt($enc), null);
$GLOBALS['fake_salt'] = 'salt-one';

/* ============================================================ */
section('انبار و تاریخچه');

$GLOBALS['fake_settings']['connections'] = array(
    'k_a1b2c3' => array('label' => 'تأمین‌کننده الف', 'auth' => 'bearer', 'header' => '', 'key_enc' => phoenix_secret_encrypt('k1')),
    'k_d4e5f6' => array('label' => 'کلیدِ خراب', 'auth' => 'header', 'header' => 'X-Key', 'key_enc' => 'v2:bm9wZQ=='),
);
$GLOBALS['fake_settings']['custom_sources'] = array(
    'p_000001' => array('label' => 'با اتصالِ سالم', 'url' => 'https://api.example.com/a', 'path' => 'p', 'unit' => 'toman', 'conn' => 'k_a1b2c3'),
    'p_000002' => array('label' => 'با اتصالِ خراب', 'url' => 'https://api.example.com/b', 'path' => 'p', 'unit' => 'rial', 'conn' => 'k_d4e5f6'),
    'p_000003' => array('label' => 'اتصالِ حذف‌شده', 'url' => 'https://api.example.com/c', 'path' => 'p', 'unit' => 'toman', 'conn' => 'k_999999'),
    'p_000004' => array('label' => 'بی‌کلید', 'url' => 'https://api.example.com/d', 'path' => 'p', 'unit' => 'toman', 'conn' => ''),
);
is_same('اتصالِ سالم باز می‌شود',        phoenix_conn_runtime('k_a1b2c3')['key'] ?? null, 'k1');
is_same('اتصالِ خراب null',              phoenix_conn_runtime('k_d4e5f6'), null);
is_same('وضعیتِ کلید: ok',               phoenix_conn_key_state($GLOBALS['fake_settings']['connections']['k_a1b2c3']), 'ok');
is_same('وضعیتِ کلید: broken',           phoenix_conn_key_state($GLOBALS['fake_settings']['connections']['k_d4e5f6']), 'broken');

$rt = phoenix_custom_sources_runtime();
is_same('منبعِ با اتصالِ سالم می‌ماند',    isset($rt['p_000001']), true);
is_same('منبعِ با اتصالِ خراب کنار می‌رود', isset($rt['p_000002']), false);
is_same('منبعِ با اتصالِ حذف‌شده کنار می‌رود', isset($rt['p_000003']), false);
is_same('منبعِ بی‌کلید می‌ماند، بدونِ اتصال',
    isset($rt['p_000004']) && array_key_exists('conn', $rt['p_000004']) && $rt['p_000004']['conn'] === null, true);

$merged = phoenix_rate_sources();
is_same('منبعِ پنل در فهرستِ نرخ هست',     $merged['p_000001']['origin'] ?? null, 'panel');
is_same('کلید از اتصال به منبع می‌رسد',    $merged['p_000001']['conn']['key'] ?? null, 'k1');
is_same('منابعِ داخلی دست‌نخورده',           $merged['nobitex']['origin'] ?? null, 'builtin');

$red = phoenix_audit_redact('connections', $GLOBALS['fake_settings']['connections']);
is_same('تاریخچه متنِ رمزشده را نمی‌بیند',   $red['k_a1b2c3']['key_enc'], '••••');
is_same('تنظیماتِ دیگر دست‌نخورده',           phoenix_audit_redact('margin', array('key_enc' => 'x')), array('key_enc' => 'x'));

/* ============================================================ */
section('راهنمای مسیر');

$data = array('data' => array('symbol' => 'USDTTMN', 'stats' => array('last' => '226,300'), 'price' => 226300),
              'markets' => array(array('symbol' => 'USDTIRT', 'price' => '2263000'), array('symbol' => 'BTC', 'price' => '1')));
is_same('مسیرِ درست عدد می‌دهد',             phoenix_rate_dig($data, 'data.stats.last'), '226,300');
is_same('مسیرِ اشتباه: کلیدهای همان سطح',     phoenix_rate_dig_hint($data, 'data.cost'), array('symbol', 'stats', 'price'));
is_same('از ریشه: کلیدهای ریشه',             phoenix_rate_dig_hint($data, 'result.x'), array('data', 'markets'));
is_same('فهرست: کلیدهای عضوِ اول',          phoenix_rate_dig_hint($data, 'markets.cost'), array('symbol', 'price'));
is_same('[] با مقدارِ نبوده: کلیدهای عضو',   phoenix_rate_dig_hint($data, 'markets.[].symbol=ETH.price'), array('symbol', 'price'));
is_same('کلیدِ مخرب پاک می‌شود',             phoenix_rate_dig_hint(array('<img onerror=x>' => 1), 'a'), array('imgonerror=x'));

printf("\n%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] ? 1 : 0);
