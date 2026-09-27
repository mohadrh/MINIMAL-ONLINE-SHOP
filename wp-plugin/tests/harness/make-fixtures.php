<?php
/**
 * داده‌ی آزمایشیِ پنل — از خودِ توابعِ داشبورد.
 *
 * ⚠ پاسخِ دست‌ساز نمی‌نویسیم.
 *
 * اگر داده‌ی صفحه‌ی آزمایشی را دستی بنویسیم، آنچه دیده می‌شود
 * «چیزی است که فکر می‌کنیم سرور می‌فرستد» — و فرقش با چیزی که
 * واقعاً می‌فرستد، همان جایی است که باگ پنهان می‌شود. این‌جا
 * وضعیت‌ها ساخته می‌شوند و از همان ‎phoenix_dash_*‎ی واقعی رد
 * می‌شوند؛ فقط سری و تاریخچه ساختگی‌اند.
 *
 *   php wp-plugin/tests/harness/make-fixtures.php
 */

define('ABSPATH', __DIR__);
function add_action() {}

require_once __DIR__ . '/../../phoenix-bridge/includes/api/dashboard.php';

mt_srand(7);

function series($hours, $base) {
    $out = array();
    $v   = $base;
    $now = strtotime('2026-09-27T12:00:00Z');
    for ($i = $hours; $i >= 0; $i--) {
        $v += mt_rand(-900, 1000);
        $out[] = array('t' => gmdate('c', $now - $i * 3600), 'v' => (int) $v);
    }
    return $out;
}

function state(array $patch) {
    $s = array(
        'rate'        => array('value' => 226500, 'at' => '2026-09-27T11:52:00Z', 'stale' => false,
                               'source' => 'والکس', 'why' => '', 'manual' => false, 'manual_until' => 0),
        'sources'     => array('total' => 4, 'read' => 4, 'ok' => 4, 'dead' => array(), 'min' => 2),
        'engine'      => array('on' => true, 'running' => false, 'scanned' => 0, 'last_at' => '2026-09-27T11:53:10Z'),
        'products'    => array('total' => 36, 'engine' => 36, 'missing' => 0),
        'discounts'   => array('live' => 2),
        'queue'       => array('pending' => 0, 'done' => 57, 'failed' => 0, 'cancelled' => 1),
        'auto_fulfil' => false,
        'real_cron'   => true,
    );
    return array_replace_recursive($s, $patch);
}

function payload(array $s, array $series, array $recent) {
    $health = phoenix_dash_health($s);
    return array(
        'state'       => $s,
        'health'      => $health,
        'summary'     => phoenix_dash_summary($s, $health),
        'alerts'      => phoenix_dash_alerts($s),
        'suggestions' => phoenix_dash_suggestions($s),
        'series'      => $series,
        'recent'      => $recent,
    );
}

$recent = array(
    array('at' => '2026-09-27T11:53:10Z', 'kind' => 'price',    'actor' => 'system', 'subject' => '142',        'before' => '1766000', 'after' => '1799000', 'note' => 'بازنویسیِ دسته‌جمعی'),
    array('at' => '2026-09-27T11:52:00Z', 'kind' => 'rate',     'actor' => 'system', 'subject' => 'refresh',    'before' => '225100',  'after' => '226500',  'note' => 'کمترین از ۴ منبعِ سالم — cron'),
    array('at' => '2026-09-27T09:14:00Z', 'kind' => 'discount', 'actor' => 'mohadrh','subject' => 'coupon:PHX-VIP', 'before' => null,  'after' => '15٪',     'note' => 'کدِ اختصاصی ساخته شد'),
    array('at' => '2026-09-26T21:40:00Z', 'kind' => 'setting',  'actor' => 'mohadrh','subject' => 'engine_on',  'before' => 'false',   'after' => 'true',    'note' => 'از پنل'),
    array('at' => '2026-09-26T21:38:00Z', 'kind' => 'setting',  'actor' => 'mohadrh','subject' => 'margin',     'before' => '{"percent":18}', 'after' => '{"percent":22}', 'note' => 'از پنل'),
    array('at' => '2026-09-26T18:02:00Z', 'kind' => 'queue',    'actor' => 'mohadrh','subject' => 'job:31',     'before' => 'pending', 'after' => 'done',    'note' => 'دستی از پنل'),
);

$fixtures = array(
    /* همه‌چیز سالم */
    'healthy' => payload(state(array()), series(168, 221000), $recent),

    /* روزِ بد: نرخ کهنه، یک منبع خوابیده، دو تحویلِ ناموفق، موتور
       خاموش با محصولاتِ دارای هزینه، کرونِ واقعی راه نیفتاده */
    'trouble' => payload(state(array(
        'rate'     => array('stale' => true, 'at' => '2026-09-27T05:10:00Z'),
        'sources'  => array('ok' => 3, 'dead' => array('رمزینکس')),
        'engine'   => array('on' => false),
        'products' => array('engine' => 12, 'missing' => 24),
        'queue'    => array('pending' => 3, 'failed' => 2),
        'discounts'=> array('live' => 0),
        'real_cron'=> false,
    )), series(168, 224000), $recent),

    /* تازه نصب‌شده: هنوز هیچ نرخ و هیچ تاریخچه‌ای */
    'fresh' => payload(state(array(
        'rate'     => array('value' => 0, 'at' => null, 'stale' => true, 'source' => ''),
        'sources'  => array('read' => 0, 'ok' => 0),
        'engine'   => array('on' => false, 'last_at' => null),
        'products' => array('engine' => 0, 'missing' => 36),
        'queue'    => array('done' => 0, 'cancelled' => 0),
        'discounts'=> array('live' => 0),
        'real_cron'=> false,
    )), array(), array()),
);

$file = __DIR__ . '/fixtures.json';
file_put_contents($file, json_encode($fixtures, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

foreach ($fixtures as $name => $f) {
    printf("  %-8s امتیاز %3d | %d هشدار | %d پیشنهاد | %s\n",
        $name, $f['health']['score'], count($f['alerts']), count($f['suggestions']),
        mb_substr($f['summary'], 0, 48));
}
