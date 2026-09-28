<?php
/**
 * تستِ قضاوت‌های داشبورد — بدونِ وردپرس.
 *
 * آنچه تست می‌شود: امتیازِ سلامت، هشدارها، پیشنهادها، و جمله‌ی
 * خلاصه. همه تابعِ خالص‌اند و یک آرایه‌ی وضعیت می‌گیرند.
 *
 * ⚠ چرا این بخش تست دارد و نه فقط نگاه
 *
 * هشدارِ بی‌جا بدتر از نبودنِ هشدار است: پنلی که همیشه یک
 * نوارِ زرد دارد، همان نوار را نامرئی می‌کند و روزی که واقعاً
 * چیزی خراب است کسی نمی‌بیندش. پس هم «وقتی باید بیاید، می‌آید»
 * تست می‌شود و هم «وقتی نباید، نمی‌آید».
 *
 *   php wp-plugin/tests/dashboard-test.php
 */

define('ABSPATH', __DIR__);
function add_action() {}

require_once __DIR__ . '/../phoenix-bridge/includes/api/dashboard.php';

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;

function is_same($label, $got, $want) {
    if ($got === $want) {
        $GLOBALS['pass']++;
        printf("  ok    %-62s %s\n", $label, is_scalar($got) ? var_export($got, true) : '…');
        return;
    }
    $GLOBALS['fail']++;
    printf("  FAIL  %-62s got %s, want %s\n", $label, var_export($got, true), var_export($want, true));
}

function section($t) { echo "\n== {$t} ==\n"; }

/** وضعیتِ کاملاً سالم — هر تست فقط همان چیزی را خراب می‌کند که می‌سنجد */
function healthy(array $patch = array()) {
    $s = array(
        'rate'        => array('value' => 226500, 'at' => '2026-09-27T10:00:00Z', 'stale' => false,
                               'source' => 'wallex', 'why' => '', 'manual' => false, 'manual_until' => 0),
        'sources'     => array('total' => 4, 'read' => 4, 'ok' => 4, 'dead' => array(), 'min' => 2),
        'engine'      => array('on' => true, 'running' => false, 'scanned' => 0, 'last_at' => null),
        'products'    => array('total' => 36, 'engine' => 36, 'missing' => 0),
        'discounts'   => array('live' => 0),
        'queue'       => array('pending' => 0, 'done' => 12, 'failed' => 0, 'cancelled' => 0),
        'auto_fulfil' => false,
        'real_cron'   => true,
    );
    return array_replace_recursive($s, $patch);
}

function levels(array $alerts) {
    return array_map(function ($a) { return $a['level']; }, $alerts);
}

function titles(array $alerts) {
    return array_map(function ($a) { return $a['title']; }, $alerts);
}

/* ============================================================ */
section('حالتِ سالم');

$s = healthy();
$h = phoenix_dash_health($s);
is_same('امتیاز ۱۰۰',                        $h['score'], 100);
is_same('هیچ کسری',                          count($h['parts']), 0);
is_same('هیچ هشداری — نوارِ زردِ همیشگی نه', count(phoenix_dash_alerts($s)), 0);
is_same('هیچ پیشنهادی',                      count(phoenix_dash_suggestions($s)), 0);
is_same('خلاصه می‌گوید سالم است',            strpos(phoenix_dash_summary($s, $h), 'همه‌چیز سالم است') === 0, true);

/* ============================================================ */
section('موتورِ خاموش');

/* خاموش بودن تصمیم است نه خرابی — کسر ندارد */
$s = healthy(array('engine' => array('on' => false), 'products' => array('engine' => 0, 'missing' => 36)));
$h = phoenix_dash_health($s);
is_same('موتورِ خاموش کسرِ امتیاز ندارد',                     $h['score'], 100);
is_same('بدونِ محصولِ دارای هزینه، هشداری هم نیست',          count(phoenix_dash_alerts($s)), 0);
is_same('خلاصه می‌گوید قیمت‌ها دستی‌اند',                     strpos(phoenix_dash_summary($s, $h), 'موتورِ قیمت خاموش') !== false, true);

$s = healthy(array('engine' => array('on' => false), 'products' => array('engine' => 12, 'missing' => 24)));
$a = phoenix_dash_alerts($s);
is_same('موتورِ خاموش با ۱۲ محصولِ دارای هزینه → یک هشدار', count($a), 1);
is_same('سطحش متوسط است',                                   $a[0]['level'], 'medium');
is_same('کنشش روشن کردن است',                               $a[0]['action']['do'], 'engine-on');

/* ============================================================ */
section('نرخ');

$s = healthy(array('rate' => array('value' => 0, 'stale' => true, 'at' => null)));
$h = phoenix_dash_health($s);
is_same('بدونِ نرخ → ۶۰',                   $h['score'], 60);
$a = phoenix_dash_alerts($s);
is_same('هشدارِ اول سطحِ بالاست',          $a[0]['level'], 'high');
is_same('کنشش گرفتنِ نرخ است',             $a[0]['action']['do'], 'rate-refresh');
is_same('«کهنه» جدا هشدار نمی‌دهد (تکرار)', in_array('نرخ کهنه است', titles($a), true), false);
is_same('خلاصه از نبودِ نرخ می‌گوید',      strpos(phoenix_dash_summary($s, $h), 'هنوز هیچ نرخی') === 0, true);

$s = healthy(array('rate' => array('stale' => true)));
is_same('نرخِ کهنه → ۸۵', phoenix_dash_health($s)['score'], 85);
is_same('هشدارِ متوسط',   levels(phoenix_dash_alerts($s)), array('medium'));

/* ============================================================ */
section('منابع');

$s = healthy(array('sources' => array('ok' => 1, 'dead' => array('نوبیتکس', 'والکس', 'بیت‌پین'))));
$h = phoenix_dash_health($s);
is_same('زیرِ حداقل (−۲۰) + سه منبعِ خوابیده (−۱۵)', $h['score'], 65);
$a = phoenix_dash_alerts($s);
is_same('اول «نرخ عوض نمی‌شود» (بالا)',             $a[0]['title'], 'نرخ عوض نمی‌شود');
is_same('بعد «منبعی جواب نمی‌دهد» (متوسط)',         $a[1]['title'], 'منبعی جواب نمی‌دهد');
is_same('نامِ منابعِ خوابیده در متن هست',           strpos($a[1]['text'], 'والکس') !== false, true);

$s = healthy(array('sources' => array('dead' => array('a', 'b', 'c', 'd', 'e'), 'ok' => 4, 'total' => 9)));
is_same('کسرِ منابعِ خوابیده سقف دارد (−۱۵ نه −۲۵)', phoenix_dash_health($s)['score'], 85);

/* هیچ منبعی تعریف نشده — «زیرِ حداقل» معنا ندارد، نبودِ نرخ کافی است */
$s = healthy(array('sources' => array('total' => 0, 'ok' => 0), 'rate' => array('value' => 0)));
is_same('بدونِ منبع: فقط کسرِ نبودِ نرخ', phoenix_dash_health($s)['score'], 60);

/* ⚠ نصبِ تازه: منابع تعریف شده‌اند ولی هنوز هیچ‌کدام خوانده نشده.
   «۰ منبعِ سالم» این‌جا دروغ است — امتحان نشده‌اند. فقط هشدارِ
   «نرخ نداریم» باید بیاید، با کنشِ «همین حالا بگیر». */
$s = healthy(array(
    'sources' => array('read' => 0, 'ok' => 0),
    'rate'    => array('value' => 0, 'stale' => true, 'at' => null),
    'engine'  => array('on' => false),
    'products'=> array('engine' => 0, 'missing' => 36),
));
is_same('نصبِ تازه: فقط کسرِ نبودِ نرخ',              phoenix_dash_health($s)['score'], 60);
is_same('نصبِ تازه: فقط یک هشدار',                    count(phoenix_dash_alerts($s)), 1);
is_same('نصبِ تازه: «زیرِ حداقل» نمی‌گوید',            in_array('نرخ عوض نمی‌شود', titles(phoenix_dash_alerts($s)), true), false);

/* و بعد از اولین دور که واقعاً جواب ندادند، می‌گوید */
$s = healthy(array('sources' => array('read' => 4, 'ok' => 0, 'dead' => array('a', 'b', 'c', 'd'))));
is_same('بعد از خواندن و شکست: «زیرِ حداقل» می‌آید', in_array('نرخ عوض نمی‌شود', titles(phoenix_dash_alerts($s)), true), true);

/* ============================================================ */
section('صفِ تحویل');

$s = healthy(array('queue' => array('failed' => 3)));
is_same('سه کارِ ناموفق: کسر سقف دارد (−۲۰ نه −۳۰)', phoenix_dash_health($s)['score'], 80);
$a = phoenix_dash_alerts($s);
is_same('هشدارِ بالا',                              $a[0]['level'], 'high');
is_same('کنش: رفتن به صف',                          $a[0]['action']['go'], 'queue');

/* ============================================================ */
section('قیمتِ نگه‌داشته‌شده');

$a = phoenix_dash_alerts(healthy(array('products' => array('held' => 2))));
is_same('قیمتِ نگه‌داشته هشدارِ بالا دارد',        $a[0]['level'], 'high');
is_same('کنش: رفتن به منابعِ قیمت',                 $a[0]['action']['go'], 'rate');
is_same('بدونِ نگه‌داشته، هشداری نیست',             count(phoenix_dash_alerts(healthy())), 0);

/* ============================================================ */
section('نرخِ دستی');

$s = healthy(array('rate' => array('manual' => true, 'manual_until' => 0)));
is_same('بدونِ انقضا: −۵',           phoenix_dash_health($s)['score'], 95);
is_same('بدونِ انقضا: هشدارِ متوسط', levels(phoenix_dash_alerts($s)), array('medium'));

$s = healthy(array('rate' => array('manual' => true, 'manual_until' => 1893456000)));
is_same('با انقضا: کسر ندارد',       phoenix_dash_health($s)['score'], 100);
is_same('با انقضا: فقط اطلاعِ کم',   levels(phoenix_dash_alerts($s)), array('low'));

/* ============================================================ */
section('ترتیب و کف');

$s = healthy(array(
    'rate'     => array('manual' => true, 'manual_until' => 1893456000, 'stale' => true),
    'queue'    => array('failed' => 1),
    'engine'   => array('on' => false),
    'products' => array('engine' => 5),
));
is_same('مرتب: بالا، متوسط، متوسط، کم', levels(phoenix_dash_alerts($s)), array('high', 'medium', 'medium', 'low'));

$s = healthy(array(
    'rate'    => array('value' => 0, 'manual' => true, 'manual_until' => 0),
    'sources' => array('ok' => 0, 'dead' => array('a', 'b', 'c', 'd')),
    'queue'   => array('failed' => 9),
));
is_same('همه‌چیز خراب: امتیاز منفی نمی‌شود', phoenix_dash_health($s)['score'], 0);

$s = healthy(array('queue' => array('failed' => 1), 'rate' => array('stale' => true)));
$h = phoenix_dash_health($s);
is_same('خلاصه بدترین مشکل را می‌گوید (−۱۵ کهنگی از −۱۰ صف بدتر است)',
    phoenix_dash_summary($s, $h), 'مهم‌ترین مشکلِ الان: نرخ کهنه است.');

/* ============================================================ */
section('پیشنهادها');

$s = healthy(array('products' => array('engine' => 12, 'missing' => 24)));
$g = phoenix_dash_suggestions($s);
is_same('محصولاتِ بی‌هزینه → یک پیشنهاد',      count($g), 1);
is_same('کنشش رفتن به محصولات است',           $g[0]['action']['go'], 'products');

$s = healthy(array('real_cron' => false));
$g = phoenix_dash_suggestions($s);
is_same('کرونِ واقعی نیست → پیشنهاد',          count($g), 1);
is_same('لینکِ راهنما https است',              strpos($g[0]['action']['href'], 'https://') === 0, true);

$s = healthy(array('products' => array('total' => 0, 'engine' => 0, 'missing' => 0)));
is_same('فروشگاهِ بی‌محصول: پیشنهادِ بی‌معنا نمی‌دهد', count(phoenix_dash_suggestions($s)), 0);

/* ============================================================ */
section('رقمِ فارسی');

/* ⚠ ‎sprintf('%d')‎ رقمِ لاتین می‌دهد؛ اولین نسخه‌ی خلاصه
   می‌گفت «2 کارِ تحویل ناموفق». بدترین حالت ساخته می‌شود تا
   همه‌ی جمله‌ها تولید شوند، و هیچ‌کدام نباید رقمِ لاتین داشته
   باشد. */
$s = healthy(array(
    'rate'      => array('stale' => true, 'manual' => true, 'manual_until' => 0),
    'sources'   => array('ok' => 1, 'dead' => array('a', 'b', 'c')),
    'queue'     => array('failed' => 2),
    'engine'    => array('on' => false),
    'products'  => array('engine' => 12, 'missing' => 24),
    'real_cron' => false,
));
$h = phoenix_dash_health($s);
$texts = array(phoenix_dash_summary($s, $h));
foreach ($h['parts'] as $p) { $texts[] = $p['label']; }
foreach (phoenix_dash_alerts($s) as $a) { $texts[] = $a['title']; $texts[] = $a['text']; }
foreach (phoenix_dash_suggestions($s) as $g) { $texts[] = $g['text']; }
$latin = array_values(array_filter($texts, function ($x) { return preg_match('/[0-9]/', $x); }));
is_same('هیچ رقمِ لاتینی در جمله‌های داشبورد', $latin, array());

/* ============================================================ */

printf("\n%s\n", str_repeat('-', 72));
printf("%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] > 0 ? 1 : 0);
