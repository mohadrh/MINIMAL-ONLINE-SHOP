<?php
/**
 * تستِ «قیمت از چند منبع» — اعتبارسنجی و انتخاب.
 *
 * همان سناریوی کارفرما: یک محصول از سه جا خوانده می‌شود، طبقِ
 * الگو یکی انتخاب می‌شود (مثلاً کمترین)، و بشود دستی هم انتخاب
 * کرد. به‌علاوه‌ی دو محافظ: همه‌ی منابع خراب، و جهشِ بزرگ.
 *
 * اجرا:  php wp-plugin/tests/product-sources-test.php
 */

define('ABSPATH', __DIR__);
define('PHOENIX_BRIDGE_VERSION', 'test');

function add_action() {}
function add_filter() {}
function apply_filters($t, $v) { return $v; }
function sanitize_key($k) { return preg_replace('/[^a-z0-9_\-]/', '', strtolower((string) $k)); }
function sanitize_text_field($s) { return trim(strip_tags((string) $s)); }
function wp_http_validate_url($u) {
    $host = parse_url($u, PHP_URL_HOST);
    return (!$host || preg_match('/^(localhost|127\.|10\.|192\.168\.)/', $host)) ? false : $u;
}
function phoenix_setting($k, $f = null) { return $f; }

require_once __DIR__ . '/../phoenix-bridge/includes/connections.php';
require_once __DIR__ . '/../phoenix-bridge/includes/rate-sources.php';
require_once __DIR__ . '/../phoenix-bridge/includes/rate-custom.php';
require_once __DIR__ . '/../phoenix-bridge/includes/product-sources.php';

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;
function is_same($label, $got, $want) {
    if ($got === $want) { $GLOBALS['pass']++; printf("  ok    %s\n", $label); return; }
    $GLOBALS['fail']++;
    printf("  FAIL  %s\n        got  %s\n        want %s\n", $label,
        json_encode($got, JSON_UNESCAPED_UNICODE), json_encode($want, JSON_UNESCAPED_UNICODE));
}
function section($t) { echo "\n== {$t} ==\n"; }

/** سه تأمین‌کننده، همان مثالِ کارفرما */
function three(array $over = array()) {
    return array_merge(array(
        'list' => array(
            array('id' => 'sa', 'label' => 'تأمین‌کننده الف', 'kind' => 'api', 'url' => 'https://a.example.com/prices',
                  'path' => 'items.[].sku=gpt-1m.price', 'unit' => 'usd', 'conn' => ''),
            array('id' => 'sb', 'label' => 'تأمین‌کننده ب', 'kind' => 'api', 'url' => 'https://b.example.com/p',
                  'path' => 'data.price', 'unit' => 'toman', 'conn' => ''),
            array('id' => 'sc', 'label' => 'قیمتِ تلگرامیِ ج', 'kind' => 'fixed', 'value' => 4700000, 'unit' => 'toman'),
        ),
        'pick' => 'lowest', 'pinned' => '', 'max_jump' => 30,
    ), $over);
}
function clean3(array $over = array()) { return phoenix_psrc_clean(three($over))['data']; }
function ok($v, $unit) { return array('value' => $v, 'unit' => $unit, 'status' => 'ok', 'note' => ''); }
function bad($status = 'net') { return array('value' => null, 'unit' => '', 'status' => $status, 'note' => 'x'); }

$RATE = 226500;

/* ============================================================ */
section('اعتبارسنجی');

$c = phoenix_psrc_clean(three());
is_same('سه منبعِ درست پذیرفته', $c['ok'], true);
is_same('شناسه‌ها می‌مانند (برای «دستی»)', array_column($c['data']['list'], 'id'), array('sa', 'sb', 'sc'));

$c = phoenix_psrc_clean(array('list' => array()));
is_same('بی‌منبع رد', isset($c['errors']['list']), true);

$c = phoenix_psrc_clean(three(array('list' => array(array('id' => 'sa', 'label' => 'x', 'kind' => 'api', 'url' => 'https://a.example.com', 'path' => 'p', 'unit' => 'usd', 'on' => false)))));
is_same('همه خاموش رد', isset($c['errors']['list']), true);

$c = phoenix_psrc_clean(array('list' => array(array('id' => 'sa', 'label' => 'x', 'kind' => 'api', 'url' => 'https://127.0.0.1/p', 'path' => 'p', 'unit' => 'usd'))));
is_same('SSRF در منبعِ محصول هم رد', isset($c['errors']['list.0.url']), true);

$c = phoenix_psrc_clean(array('list' => array(array('id' => 'sa', 'label' => 'x', 'kind' => 'api', 'url' => 'https://a.example.com', 'path' => 'p'))));
is_same('بی‌واحد رد — پیش‌فرض ندارد', isset($c['errors']['list.0.unit']), true);

$c = phoenix_psrc_clean(array('list' => array(array('id' => 'sa', 'label' => 'x', 'kind' => 'fixed', 'value' => 0, 'unit' => 'toman'))));
is_same('عددِ دستیِ صفر رد', isset($c['errors']['list.0.value']), true);

$c = phoenix_psrc_clean(array('list' => array(array('id' => 'sa', 'label' => 'x', 'kind' => 'api', 'url' => 'https://a.example.com', 'path' => 'p', 'unit' => 'usd', 'conn' => 'k_zzzzzz'))), array('k_aaaaaa'));
is_same('اتصالِ ناموجود رد', isset($c['errors']['list.0.conn']), true);

$c = phoenix_psrc_clean(three(array('pick' => 'pinned', 'pinned' => 'nope')));
is_same('«دستی» بدونِ منبعِ معتبر رد', isset($c['errors']['pinned']), true);

$c = phoenix_psrc_clean(three(array('pick' => 'wat')));
is_same('الگوی ناشناخته → کمترین', $c['data']['pick'], 'lowest');

$many = three();
for ($i = 0; $i < 8; $i++) { $many['list'][] = $many['list'][2]; }
$c = phoenix_psrc_clean($many);
is_same('بیش از شش منبع رد', isset($c['errors']['list']), true);
is_same('شناسه‌ی تکراری عوض می‌شود', count(array_unique(array_column($c['data']['list'], 'id'))), 6);

/* ============================================================ */
section('انتخاب — سناریوی کارفرما');

/* الف: ۱۹٫۵ دلار × ۲۲۶٬۵۰۰ = ۴٬۴۱۶٬۷۵۰ | ب: ۴٬۶۰۰٬۰۰۰ | ج: ۴٬۷۰۰٬۰۰۰ */
$res = array('sa' => ok(19.5, 'usd'), 'sb' => ok(4600000, 'toman'), 'sc' => ok(4700000, 'toman'));

$p = phoenix_psrc_pick(clean3(), $res, $RATE);
is_same('کمترین: الف', $p['from'], 'sa');
is_same('کمترین به تومان', $p['toman'], 4416750);
is_same('منبعِ دلاری دلاری می‌ماند (نرخِ تتر اثر کند)', array($p['value'], $p['unit']), array(19.5, 'usd'));
is_same('بدونِ نگه‌داشتن', $p['held'], '');

$p = phoenix_psrc_pick(clean3(array('pick' => 'median')), $res, $RATE);
is_same('میانه: ۴٬۶۰۰٬۰۰۰', array($p['toman'], $p['unit']), array(4600000, 'toman'));

$p = phoenix_psrc_pick(clean3(array('pick' => 'average')), $res, $RATE);
is_same('میانگین', $p['toman'], (int) round((4416750 + 4600000 + 4700000) / 3));

$p = phoenix_psrc_pick(clean3(array('pick' => 'pinned', 'pinned' => 'sc')), $res, $RATE);
is_same('دستی: همیشه ج، حتی اگر گران‌تر', array($p['from'], $p['toman']), array('sc', 4700000));

$p = phoenix_psrc_pick(clean3(array('pick' => 'first')), array('sa' => bad(), 'sb' => ok(4600000, 'toman'), 'sc' => ok(4700000, 'toman')), $RATE);
is_same('اولین پاسخ: الف خراب ← ب', $p['from'], 'sb');

$p = phoenix_psrc_pick(clean3(), array('sa' => bad('path'), 'sb' => ok(4600000, 'toman'), 'sc' => ok(4700000, 'toman')), $RATE);
is_same('کمترین از میانِ سالم‌ها، خراب نادیده', $p['from'], 'sb');

$rial = clean3();
$rial['list'][1]['unit'] = 'rial';
$p = phoenix_psrc_pick($rial, array('sa' => bad(), 'sb' => ok(46000000, 'rial'), 'sc' => ok(4700000, 'toman')), $RATE);
is_same('ریال تقسیم بر ده', array($p['from'], $p['toman']), array('sb', 4600000));

$off = clean3();
$off['list'][0]['on'] = false;
$p = phoenix_psrc_pick($off, $res, $RATE);
is_same('منبعِ خاموش حساب نمی‌شود', $p['from'], 'sb');

/* ============================================================ */
section('محافظ‌ها');

$p = phoenix_psrc_pick(clean3(), array('sa' => bad(), 'sb' => bad('http'), 'sc' => bad()), $RATE);
is_same('همه خراب: انتخابی نیست', $p['ok'], false);
is_same('و دلیل گفته می‌شود', $p['held'] !== '', true);

$p = phoenix_psrc_pick(clean3(), array('sa' => ok(19.5, 'usd'), 'sb' => bad(), 'sc' => bad()), 0);
is_same('نرخِ تتر نیست: منبعِ دلاری قابلِ استفاده نیست', $p['ok'], false);

$p = phoenix_psrc_pick(clean3(array('pick' => 'pinned', 'pinned' => 'sa')), array('sa' => bad(), 'sb' => ok(4600000, 'toman'), 'sc' => ok(1, 'toman')), $RATE);
is_same('دستی و منبعِ انتخابی خراب: به منبعِ دیگر نمی‌پرد', array($p['ok'], $p['held'] !== ''), array(false, true));

/* جهش: قبلی ۴٬۶۰۰٬۰۰۰، تازه ۴۶۰٬۰۰۰ (API سنت داد به‌جای دلار) */
$last = array('value' => 4600000, 'unit' => 'toman');
$p = phoenix_psrc_pick(clean3(), array('sa' => ok(2.03, 'usd'), 'sb' => bad(), 'sc' => bad()), $RATE, $last);
is_same('جهشِ ۹۰٪ نگه داشته می‌شود', $p['held'] !== '', true);
is_same('ولی پیشنهاد برای تأیید می‌ماند', array($p['ok'], $p['from']), array(true, 'sa'));

$p = phoenix_psrc_pick(clean3(), array('sa' => bad(), 'sb' => ok(4900000, 'toman'), 'sc' => bad()), $RATE, $last);
is_same('تغییرِ ۶٪ عادی است', $p['held'], '');

$p = phoenix_psrc_pick(clean3(array('max_jump' => 0)), array('sa' => ok(2.03, 'usd'), 'sb' => bad(), 'sc' => bad()), $RATE, $last);
is_same('سقفِ صفر یعنی محافظ خاموش', $p['held'], '');

/* جهش با مقایسه‌ی تومانی، نه عددِ خام: ۲۰ دلار قبلی و ۴٬۶۰۰٬۰۰۰ تومانِ تازه یکی‌اند */
$p = phoenix_psrc_pick(clean3(), array('sa' => bad(), 'sb' => ok(4600000, 'toman'), 'sc' => bad()), $RATE, array('value' => 20, 'unit' => 'usd'));
is_same('دلار و تومان با هم مقایسه می‌شوند، نه عددِ خام', $p['held'], '');

/* ============================================================ */
section('هزینه برای موتور و پیش‌نمایش');

is_same('دلاری → usd',   phoenix_psrc_cost_of_use(array('value' => 19.5, 'unit' => 'usd')), array('mode' => 'usd', 'usd' => 19.5, 'toman' => 0.0));
is_same('ریالی → تومان', phoenix_psrc_cost_of_use(array('value' => 46000000, 'unit' => 'rial')), array('mode' => 'toman', 'usd' => 0.0, 'toman' => 4600000.0));
is_same('خالی → null',   phoenix_psrc_cost_of_use(null), null);
is_same('واحدِ ناشناخته → null', phoenix_psrc_cost_of_use(array('value' => 5, 'unit' => 'eur')), null);
is_same('پیش‌نمایشِ مرورگر: منفی رد', phoenix_psrc_try_pick(array('value' => -5, 'unit' => 'usd')), null);
is_same('پیش‌نمایشِ مرورگر: رشته رد', phoenix_psrc_try_pick(array('value' => 'x', 'unit' => 'usd')), null);
is_same('پیش‌نمایشِ مرورگر: درست',    phoenix_psrc_try_pick(array('value' => '19.5', 'unit' => 'usd', 'why' => '<b>کمترین</b>')),
    array('value' => 19.5, 'unit' => 'usd', 'why' => 'کمترین'));

/* ============================================================ */
section('سرِ خرید — کهنگی');

$now = strtotime('2026-09-28T12:00:00Z');
is_same('هیچ‌وقت خوانده نشده → کهنه',        phoenix_psrc_is_stale(array(), $now, 10), true);
is_same('وضعیتِ خالی → کهنه',                phoenix_psrc_is_stale(null, $now, 10), true);
is_same('پنج دقیقه پیش، پنجره‌ی ده → تازه',   phoenix_psrc_is_stale(array('at' => '2026-09-28T11:55:00Z'), $now, 10), false);
is_same('یازده دقیقه پیش → کهنه',            phoenix_psrc_is_stale(array('at' => '2026-09-28T11:49:00Z'), $now, 10), true);
is_same('تاریخِ خراب → کهنه',                phoenix_psrc_is_stale(array('at' => 'دیروز'), $now, 10), true);
is_same('پنجره‌ی صفر مثلِ یک دقیقه',          phoenix_psrc_is_stale(array('at' => '2026-09-28T11:59:30Z'), $now, 0), false);

printf("\n%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] ? 1 : 0);
