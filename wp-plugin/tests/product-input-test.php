<?php
/**
 * تستِ دروازه‌ی ورودیِ ویرایشگرِ محصول — ‎phoenix_product_clean()‎.
 *
 * ⚠ چرا این تابع جدا تست می‌شود
 *
 * هر چیزی که از پنل به محصول می‌رسد از همین یک تابع رد می‌شود
 * (includes/api/product-input.php). پس هر بدی که این‌جا رد شود —
 * نشانیِ ‎javascript:‎ در تصویر، دو پلنِ هم‌نام، پلنِ دلاری بدونِ
 * قیمتِ تمام‌شده — مستقیم به فروشگاه می‌رسد.
 *
 * چیزی که این‌جا تست *نمی‌شود*: نوشتن در ووکامرس
 * (includes/api/products.php). آن روی نصبِ واقعی دیده می‌شود.
 *
 * اجرا:  php wp-plugin/tests/product-input-test.php
 */

define('ABSPATH', __DIR__);

/* وردپرسِ قلابی — فقط آنچه این مسیر لازم دارد */
function add_action()  {}
function add_filter()  {}
function sanitize_text_field($s) {
    /* مثلِ وردپرس: تگ‌ها — و محتوای ‎script‎/‎style‎ — بیرون، شکستِ خط به فاصله */
    $s = preg_replace('@<(script|style)[^>]*?>.*?</\\1>@si', '', (string) $s);
    $s = strip_tags($s);
    $s = preg_replace('/[\r\n\t ]+/', ' ', $s);
    return trim($s);
}
function sanitize_textarea_field($s) {
    $s = preg_replace('@<(script|style)[^>]*?>.*?</\\1>@si', '', (string) $s);
    return trim(strip_tags($s));
}
function phoenix_margin_defaults() {
    return array('percent' => 18.0, 'fixed' => 0, 'min_profit' => 0,
                 'round_to' => 1000, 'round_mode' => 'up', 'charm' => 0);
}

function phoenix_setting($k, $f = null) { return $f; }
function wp_http_validate_url($u) {
    $host = parse_url($u, PHP_URL_HOST);
    return (!$host || preg_match('/^(localhost|127\.|10\.|192\.168\.)/', $host)) ? false : $u;
}

require_once __DIR__ . '/../phoenix-bridge/includes/pricing.php';
require_once __DIR__ . '/../phoenix-bridge/includes/connections.php';
require_once __DIR__ . '/../phoenix-bridge/includes/rate-custom.php';
require_once __DIR__ . '/../phoenix-bridge/includes/product-sources.php';
require_once __DIR__ . '/../phoenix-bridge/includes/api/product-input.php';

/* ============================================================
   چارچوب
   ============================================================ */

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;

function is_same($label, $got, $want) {
    if ($got === $want) {
        $GLOBALS['pass']++;
        printf("  ok    %s\n", $label);
        return;
    }
    $GLOBALS['fail']++;
    printf("  FAIL  %s\n        got  %s\n        want %s\n", $label,
        json_encode($got, JSON_UNESCAPED_UNICODE), json_encode($want, JSON_UNESCAPED_UNICODE));
}
function section($t) { echo "\n== {$t} ==\n"; }

/** محصولِ حداقلیِ درست — هر تست فقط همان تکه‌ای را عوض می‌کند که می‌آزماید */
function base(array $over = array()) {
    return array_replace_recursive(array(
        'title' => 'کانوا پرو',
        'plans' => array(array('label' => 'یک‌ماهه', 'regular' => 250000)),
    ), $over);
}
function clean(array $in) { return phoenix_product_clean($in); }
function err(array $in, $key) {
    $r = clean($in);
    return isset($r['errors'][$key]) ? true : ($r['ok'] ? 'ok' : array_keys($r['errors']));
}

/* ============================================================
   ۱ پایه
   ============================================================ */

section('پایه');

$r = clean(base());
is_same('محصولِ حداقلی پذیرفته می‌شود', $r['ok'], true);
is_same('وضعیتِ پیش‌فرض پیش‌نویس است', $r['data']['status'], 'draft');
is_same('تنها پلن پیش‌فرض می‌شود', $r['data']['plans'][0]['is_default'], true);
is_same('حالتِ قیمتِ محصول پیش‌فرض دستی', $r['data']['pricing']['mode'], 'manual');
is_same('حالتِ قیمتِ پلن پیش‌فرض «ارث»', $r['data']['plans'][0]['pricing']['mode'], 'inherit');
is_same('حاشیه‌ی اختصاصی نداشتن → null', $r['data']['pricing']['margin'], null);

is_same('عنوانِ خالی رد می‌شود', err(base(array('title' => '   ')), 'title'), true);
is_same('عنوانِ فقط-تگ هم خالی است', err(base(array('title' => '<b></b>')), 'title'), true);
is_same('وضعیتِ ناشناخته → پیش‌نویس', clean(base(array('status' => 'trash')))['data']['status'], 'draft');
is_same('وضعیتِ publish می‌ماند', clean(base(array('status' => 'publish')))['data']['status'], 'publish');

$long = str_repeat('ک', 250);
is_same('عنوانِ بلند به ۲۰۰ نویسه بریده می‌شود', mb_strlen(clean(base(array('title' => $long)))['data']['title']), 200);
is_same('اسکریپت در عنوان پاک می‌شود', clean(base(array('title' => 'الف<script>alert(1)</script>ب')))['data']['title'], 'الفب');
is_same('شکستِ خط در عنوان به فاصله', clean(base(array('title' => "الف\nب")))['data']['title'], 'الف ب');

/* ============================================================
   ۲ پلن‌ها
   ============================================================ */

section('پلن‌ها');

is_same('بدونِ پلن رد می‌شود', err(array('title' => 'x', 'plans' => array()), 'plans'), true);
is_same('پلن‌ها رشته باشند → بدونِ پلن', err(array('title' => 'x', 'plans' => 'abc'), 'plans'), true);

$many = array();
for ($i = 0; $i < 21; $i++) {
    $many[] = array('label' => 'پلن ' . $i, 'regular' => 1000);
}
is_same('بیش از بیست پلن رد می‌شود', err(array('title' => 'x', 'plans' => $many), 'plans'), true);

$dup = array('title' => 'x', 'plans' => array(
    array('label' => 'ماهانه', 'regular' => 1000),
    array('label' => 'ماهانه', 'regular' => 2000),
));
is_same('برچسبِ تکراری رد می‌شود (نه اینکه بی‌صدا عوض شود)', err($dup, 'plans.1.label'), true);
is_same('پلنِ بی‌برچسب رد می‌شود', err(array('title' => 'x', 'plans' => array(array('label' => '', 'regular' => 1))), 'plans.0.label'), true);

is_same('قیمتِ تخفیف ≥ اصلی رد می‌شود',
    err(base(array('plans' => array(array('sale' => 250000)))), 'plans.0.sale'), true);
is_same('قیمتِ تخفیف کمتر پذیرفته می‌شود',
    clean(base(array('plans' => array(array('sale' => 199000)))))['data']['plans'][0]['sale'], 199000);

is_same('پلنِ دستیِ بی‌قیمت رد می‌شود',
    err(array('title' => 'x', 'plans' => array(array('label' => 'a'))), 'plans.0.regular'), true);
is_same('قیمتِ منفی صفر می‌شود و بعد رد',
    err(array('title' => 'x', 'plans' => array(array('label' => 'a', 'regular' => -5))), 'plans.0.regular'), true);
is_same('قیمتِ نجومی به سقف می‌رسد',
    clean(array('title' => 'x', 'plans' => array(array('label' => 'a', 'regular' => 1e15))))['data']['plans'][0]['regular'], 10000000000);

$two = array('title' => 'x', 'plans' => array(
    array('label' => 'a', 'regular' => 1, 'is_default' => true),
    array('label' => 'b', 'regular' => 1, 'is_default' => true),
));
$d = clean($two)['data']['plans'];
is_same('دو پیش‌فرض → فقط اولی', array($d[0]['is_default'], $d[1]['is_default']), array(true, false));

$none = array('title' => 'x', 'plans' => array(
    array('label' => 'a', 'regular' => 1),
    array('label' => 'b', 'regular' => 1, 'is_default' => true),
));
$d = clean($none)['data']['plans'];
is_same('پیش‌فرضِ دوم رعایت می‌شود', array($d[0]['is_default'], $d[1]['is_default']), array(false, true));

is_same('موجودیِ خالی → نامحدود (null)', clean(base(array('plans' => array(array('stock' => '')))))['data']['plans'][0]['stock'], null);
is_same('موجودیِ «۵» → ۵', clean(base(array('plans' => array(array('stock' => '5')))))['data']['plans'][0]['stock'], 5);
is_same('موجودیِ منفی → ۰', clean(base(array('plans' => array(array('stock' => -3)))))['data']['plans'][0]['stock'], 0);
is_same('شناسه‌ی منفی → ۰ (پلنِ تازه)', clean(base(array('plans' => array(array('id' => -7)))))['data']['plans'][0]['id'], 0);

is_same('راهنمای نیمه رد می‌شود',
    err(base(array('plans' => array(array('guide' => array('fit' => 'برای تیم‌ها'))))), 'plans.0.guide'), true);
is_same('راهنمای کامل می‌ماند',
    clean(base(array('plans' => array(array('guide' => array('fit' => 'تیم', 'detail' => 'پنج نفر'))))))['data']['plans'][0]['guide'],
    array('fit' => 'تیم', 'detail' => 'پنج نفر'));
is_same('بدونِ راهنما → null', clean(base())['data']['plans'][0]['guide'], null);

/* ============================================================
   ۳ قیمت‌گذاری — منبعِ قیمت برای هر پلن
   ============================================================ */

section('قیمت‌گذاری');

$usd = array('title' => 'x', 'pricing' => array('mode' => 'usd'), 'plans' => array(array('label' => 'a')));
is_same('محصولِ دلاری بدونِ قیمتِ تمام‌شده رد می‌شود', err($usd, 'plans.0.pricing'), true);

$usd['pricing']['cost_usd'] = 12.5;
$r = clean($usd);
is_same('با قیمتِ تمام‌شده‌ی محصول پذیرفته می‌شود', $r['ok'], true);
is_same('پلنِ دلاری قیمتِ دستی لازم ندارد', isset($r['errors']), false);

$mixed = array('title' => 'x', 'pricing' => array('mode' => 'manual'), 'plans' => array(
    array('label' => 'دستی', 'regular' => 90000),
    array('label' => 'دلاری', 'pricing' => array('mode' => 'usd', 'cost_usd' => 3)),
    array('label' => 'تومانی', 'pricing' => array('mode' => 'toman')),
));
$r = clean($mixed);
is_same('هر پلن منبعِ خودش — تومانیِ بی‌هزینه رد می‌شود', isset($r['errors']['plans.2.pricing']), true);
is_same('… ولی دلاریِ با هزینه‌ی خودش نه', isset($r['errors']['plans.1.pricing']), false);
is_same('… و دستیِ با قیمت هم نه', isset($r['errors']['plans.0.regular']), false);

$inherit = array('title' => 'x', 'pricing' => array('mode' => 'toman', 'cost_toman' => 500000),
    'plans' => array(array('label' => 'a', 'pricing' => array('mode' => 'inherit'))));
is_same('پلنِ «ارث» هزینه‌ی تومانیِ محصول را می‌گیرد', clean($inherit)['ok'], true);

is_same('حالتِ ناشناخته‌ی محصول → دستی',
    clean(base(array('pricing' => array('mode' => 'free'))))['data']['pricing']['mode'], 'manual');
is_same('حالتِ ناشناخته‌ی پلن → ارث',
    clean(base(array('plans' => array(array('pricing' => array('mode' => 'free'))))))['data']['plans'][0]['pricing']['mode'], 'inherit');
is_same('پلن نمی‌تواند «ارث» را به محصول بدهد',
    clean(base(array('pricing' => array('mode' => 'inherit'))))['data']['pricing']['mode'], 'manual');
is_same('قیمتِ دلاری به چهار رقمِ اعشار',
    clean(base(array('pricing' => array('cost_usd' => 1.234567))))['data']['pricing']['cost_usd'], 1.2346);
is_same('قفل بولی می‌شود',
    clean(base(array('pricing' => array('locked' => 'yes'))))['data']['pricing']['locked'], true);

/* ---------- «چند منبع» ---------- */

$src = array('list' => array(
    array('id' => 'sa', 'label' => 'الف', 'kind' => 'api', 'url' => 'https://a.example.com/p', 'path' => 'data.price', 'unit' => 'usd'),
    array('id' => 'sb', 'label' => 'ب', 'kind' => 'fixed', 'value' => 4600000, 'unit' => 'toman'),
), 'pick' => 'lowest');
$r = clean(array('title' => 'x', 'pricing' => array('mode' => 'sources', 'sources' => $src), 'plans' => array(array('label' => 'a'))));
is_same('محصولِ چندمنبعی پذیرفته می‌شود', $r['ok'], true);
is_same('پیکربندیِ منابع می‌ماند', count($r['data']['pricing']['sources']['list']), 2);
is_same('پلنِ چندمنبعی قیمتِ دستی لازم ندارد', isset($r['errors']), false);

$bad = $src;
$bad['list'][0]['url'] = 'https://127.0.0.1/p';
$r = clean(array('title' => 'x', 'pricing' => array('mode' => 'sources', 'sources' => $bad), 'plans' => array(array('label' => 'a'))));
is_same('خطای منبعِ محصول با پیشوندِ درست', isset($r['errors']['pricing.sources.list.0.url']), true);

$r = clean(array('title' => 'x', 'plans' => array(
    array('label' => 'a', 'regular' => 1000),
    array('label' => 'b', 'pricing' => array('mode' => 'sources', 'sources' => $bad)),
)));
is_same('خطای منبعِ پلن با پیشوندِ پلن', isset($r['errors']['plans.1.pricing.sources.list.0.url']), true);

$r = clean(array('title' => 'x', 'pricing' => array('mode' => 'manual', 'sources' => $bad), 'plans' => array(array('label' => 'a', 'regular' => 1))));
is_same('منبعِ خراب وقتی «دستی» است جلوی ذخیره را نمی‌گیرد', $r['ok'], true);
is_same('و دور ریخته می‌شود', $r['data']['pricing']['sources'], null);

/* تک‌پلن: تنظیمِ جدای باقی‌مانده از پلنِ حذف‌شده نادیده */
$r = clean(array('title' => 'x', 'plans' => array(array('label' => 'a', 'regular' => 1000, 'pricing' => array('mode' => 'usd')))));
is_same('تک‌پلن: قیمت‌گذاریِ پلن «ارث» می‌شود', $r['data']['plans'][0]['pricing']['mode'], 'inherit');
is_same('و خطای «دلاریِ بی‌هزینه» نمی‌دهد', $r['ok'], true);

$m = clean(base(array('pricing' => array('margin' => array('percent' => 9999, 'round_mode' => 'sideways')))))['data']['pricing']['margin'];
is_same('حاشیه‌ی اختصاصی به سقف می‌رسد', $m['percent'], 500.0);
is_same('گردکردنِ ناشناخته → بالا', $m['round_mode'], 'up');

/* ============================================================
   ۴ رسانه — ورودی‌ای که در ‎src‎ می‌نشیند
   ============================================================ */

section('رسانه');

function media_err($k, $v) { return err(base(array('media' => array($k => $v))), 'media.' . $k); }
function media_ok($k, $v)  { $r = clean(base(array('media' => array($k => $v)))); return $r['ok'] ? $r['data']['media'][$k] : false; }

is_same('مسیرِ سایت پذیرفته می‌شود', media_ok('thumbnail', '/products/canva/card.webp'), '/products/canva/card.webp');
is_same('https پذیرفته می‌شود', media_ok('logo', 'https://cdn.example.com/a.png'), 'https://cdn.example.com/a.png');
is_same('خالی یعنی «ندارد»', media_ok('cover', ''), '');
is_same('javascript: رد می‌شود', media_err('thumbnail', 'javascript:alert(1)'), true);
is_same('data: رد می‌شود', media_err('logo', 'data:image/svg+xml;base64,PHN2Zz4='), true);
is_same('http بی‌رمز رد می‌شود', media_err('cover', 'http://example.com/a.png'), true);
is_same('../ رد می‌شود', media_err('cutout', '/products/../../wp-config.webp'), true);
is_same('پسوندِ غیرِ تصویر رد می‌شود', media_err('thumbnail', '/products/x.php'), true);
is_same('نقلِ‌قول در https رد می‌شود', media_err('thumbnail', 'https://x.com/a"onerror=alert(1)'), true);
is_same('// بی‌پروتکل رد می‌شود', media_err('thumbnail', '//evil.com/a.png'), true);
is_same('نشانیِ خیلی بلند رد می‌شود', media_err('thumbnail', '/' . str_repeat('a', 400) . '.png'), true);

is_same('رنگ کوچک‌حرف می‌شود', clean(base(array('media' => array('accent' => '#C24A24'))))['data']['media']['accent'], '#c24a24');
is_same('رنگِ نامعتبر رد می‌شود', err(base(array('media' => array('accent' => 'red'))), 'media.accent'), true);
is_same('رنگِ سه‌رقمی رد می‌شود', err(base(array('media' => array('accent' => '#fff'))), 'media.accent'), true);

/* ============================================================
   ۵ فهرست‌ها و محتوا
   ============================================================ */

section('فهرست‌ها و محتوا');

is_same('برچسب‌ها: تگ، خالی و تکراری بیرون',
    clean(base(array('tags' => array('<b>طراحی</b>', 'طراحی', '', 'ابزار'))))['data']['tags'], array('طراحی', 'ابزار'));
is_same('نشان‌ها فقط از فهرستِ مجاز',
    clean(base(array('badges' => array('hot', 'evil', 'new'))))['data']['badges'], array('hot', 'new'));
is_same('نشان‌های غیرِ آرایه → هیچ',
    clean(base(array('badges' => 'hot')))['data']['badges'], array());
is_same('محتوای غیرِ آرایه → خالی',
    clean(base(array('content' => 'x')))['data']['content']['features'], array());

$many = array();
for ($i = 0; $i < 40; $i++) { $many[] = 'ویژگی ' . $i; }
is_same('ویژگی‌ها حداکثر سی', count(clean(base(array('content' => array('features' => $many))))['data']['content']['features']), 30);

$faq = array('content' => array('faq' => array(
    array('q' => '', 'a' => ''),
    array('q' => 'کِی؟', 'a' => 'زود.'),
)));
is_same('ردیفِ خالیِ سوال بی‌صدا حذف', clean(base($faq))['data']['content']['faq'], array(array('q' => 'کِی؟', 'a' => 'زود.')));
is_same('سوالِ بی‌پاسخ رد می‌شود',
    err(base(array('content' => array('faq' => array(array('q' => 'کِی؟', 'a' => ''))))), 'content.faq.0'), true);
is_same('پاسخِ چندخطی شکستِ خط را نگه می‌دارد',
    clean(base(array('content' => array('faq' => array(array('q' => 'q', 'a' => "خط ۱\nخط ۲"))))))['data']['content']['faq'][0]['a'], "خط ۱\nخط ۲");

/* ============================================================
   ۶ تحویل — ورودی‌هایی که از مشتری گرفته می‌شود
   ============================================================ */

section('تحویل');

function inputs(array $rows) { return base(array('delivery' => array('required_inputs' => $rows))); }

is_same('روشِ تحویلِ ناشناخته → دستی',
    clean(base(array('delivery' => array('fulfillment' => 'teleport'))))['data']['delivery']['fulfillment'], 'manual');

$r = clean(inputs(array(array('key' => 'Email', 'label' => 'ایمیل', 'type' => 'email'))));
is_same('کلید کوچک‌حرف می‌شود', $r['data']['delivery']['required_inputs'][0]['key'], 'email');
is_same('نوعِ مجاز می‌ماند', $r['data']['delivery']['required_inputs'][0]['type'], 'email');
is_same('نوعِ ناشناخته → متن',
    clean(inputs(array(array('key' => 'id', 'label' => 'آیدی', 'type' => 'password'))))['data']['delivery']['required_inputs'][0]['type'], 'text');
is_same('کلیدِ عدد-اول رد می‌شود', err(inputs(array(array('key' => '1abc', 'label' => 'x'))), 'delivery.required_inputs.0'), true);
is_same('کلیدِ فاصله‌دار رد می‌شود', err(inputs(array(array('key' => 'my key', 'label' => 'x'))), 'delivery.required_inputs.0'), true);
is_same('کلیدِ فارسی رد می‌شود', err(inputs(array(array('key' => 'ایمیل', 'label' => 'x'))), 'delivery.required_inputs.0'), true);
is_same('ورودیِ بی‌عنوان رد می‌شود', err(inputs(array(array('key' => 'email', 'label' => ''))), 'delivery.required_inputs.0'), true);
is_same('کلیدِ تکراری رد می‌شود', err(inputs(array(
    array('key' => 'email', 'label' => 'a'), array('key' => 'email', 'label' => 'b'))), 'delivery.required_inputs.1'), true);
is_same('ردیفِ کاملاً خالی بی‌صدا حذف', clean(inputs(array(array('key' => '', 'label' => ''))))['ok'], true);

$ten = array();
for ($i = 0; $i < 10; $i++) { $ten[] = array('key' => 'f' . $i, 'label' => 'فیلد ' . $i); }
is_same('ورودی‌ها حداکثر هشت', count(clean(inputs($ten))['data']['delivery']['required_inputs']), 8);

/* ============================================================
   ۷ چند خطا با هم — همه برمی‌گردند، نه فقط اولی
   ============================================================ */

section('چند خطا');

$r = clean(array('title' => '', 'media' => array('logo' => 'javascript:x'), 'plans' => array(
    array('label' => 'a', 'regular' => 0),
)));
is_same('همه‌ی خطاها با هم', array_keys($r['errors']), array('title', 'media.logo', 'plans.0.regular'));

/* ============================================================ */

printf("\n%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] ? 1 : 0);
