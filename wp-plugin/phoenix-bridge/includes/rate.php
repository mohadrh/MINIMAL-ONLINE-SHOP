<?php
/**
 * نرخِ دلار — اندپوینتِ عمومی.
 *
 * ⚠ چرا از سرور و نه مستقیم از مرورگر.
 *
 * سایتِ جلویی استاتیک است و می‌توانست خودش نرخ را بگیرد؛ سه دلیل
 * نگذاشت:
 *
 *   ۱ کلیدِ API. سرویس‌های نرخِ بازارِ آزاد کلید می‌خواهند و کلیدی
 *     که در جاوااسکریپتِ صفحه باشد، کلیدِ عمومی است. هر کسی
 *     برمی‌داردش و سهمیه‌ی ما را خرج می‌کند.
 *
 *   ۲ CORS. بیشترشان از مرورگر جواب نمی‌دهند.
 *
 *   ۳ حجمِ درخواست. هر بازدیدکننده یک درخواست به سرویس یعنی
 *     سهمیه‌ی روزانه تا ظهر تمام است. این‌جا ده دقیقه کش می‌شود،
 *     پس هر ده دقیقه یک درخواست می‌رود بیرون — نه هر بازدید.
 *
 * ⚠ اگر منبع جواب ندهد، نرخِ آخرین بارِ موفق برمی‌گردد.
 *
 * صفحه‌ی محصول نباید به‌خاطر نرسیدنِ نرخ خالی بماند. نرخِ کمی
 * کهنه با تاریخش بهتر از قیمتِ نداشتن است — و پاسخ می‌گوید نرخ
 * برای کِی است تا خودِ سایت تصمیم بگیرد نشانش بدهد یا نه.
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_RATE_CACHE = 'phoenix_usd_rate';
const PHOENIX_RATE_LAST  = 'phoenix_usd_rate_last';
const PHOENIX_RATE_TTL   = 600; // ده دقیقه

add_action('rest_api_init', 'phoenix_rate_routes');

function phoenix_rate_routes()
{
    register_rest_route('phoenix/v1', '/rate', array(
        'methods'             => 'GET',
        'callback'            => 'phoenix_rate_get',
        'permission_callback' => '__return_true', // عمومی و فقط‌خواندنی
    ));
}

/**
 * تنظیمات در wp-config.php:
 *
 *   define('PHOENIX_RATE_URL', 'https://…');   نشانیِ سرویس
 *   define('PHOENIX_RATE_PATH', 'usd.sell');   مسیرِ عدد در JSON
 *   define('PHOENIX_RATE_KEY', '…');           کلید، اگر لازم بود
 *   define('PHOENIX_RATE_UNIT', 'rial');       واحدِ خروجیِ سرویس
 *
 * هیچ‌کدام در کد نیست: سرویسِ نرخ عوض می‌شود و افزونه نباید
 * برای عوض شدنِ یک نشانی دوباره منتشر شود.
 */
function phoenix_rate_get()
{
    $cached = get_transient(PHOENIX_RATE_CACHE);
    if (is_array($cached)) {
        return rest_ensure_response($cached);
    }

    $fresh = phoenix_rate_fetch();

    if ($fresh !== null) {
        $out = array(
            'rate'   => $fresh,
            'at'     => gmdate('c'),
            'stale'  => false,
        );
        set_transient(PHOENIX_RATE_CACHE, $out, PHOENIX_RATE_TTL);
        /* بدون انقضا — پشتوانه‌ی روزی که منبع نباشد */
        update_option(PHOENIX_RATE_LAST, $out, false);
        return rest_ensure_response($out);
    }

    $last = get_option(PHOENIX_RATE_LAST);
    if (is_array($last) && isset($last['rate'])) {
        $last['stale'] = true;
        return rest_ensure_response($last);
    }

    /* هیچ‌وقت نرخی نگرفته‌ایم. خطا نمی‌دهیم — سایت خودش
       نرخِ پیش‌فرضش را دارد و باید بفهمد این‌جا چیزی نیست. */
    return rest_ensure_response(array(
        'rate'  => null,
        'at'    => null,
        'stale' => true,
    ));
}

/** @return int|null تومان، یا null اگر نشد */
function phoenix_rate_fetch()
{
    if (!defined('PHOENIX_RATE_URL') || PHOENIX_RATE_URL === '') {
        return null;
    }

    $url  = PHOENIX_RATE_URL;
    $args = array('timeout' => 8);

    if (defined('PHOENIX_RATE_KEY') && PHOENIX_RATE_KEY !== '') {
        $args['headers'] = array('Authorization' => 'Bearer ' . PHOENIX_RATE_KEY);
    }

    $res = wp_remote_get($url, $args);
    if (is_wp_error($res) || wp_remote_retrieve_response_code($res) !== 200) {
        return null;
    }

    $data = json_decode(wp_remote_retrieve_body($res), true);
    if (!is_array($data)) {
        return null;
    }

    $path = defined('PHOENIX_RATE_PATH') ? PHOENIX_RATE_PATH : 'rate';
    $node = $data;
    foreach (explode('.', $path) as $key) {
        if (!is_array($node) || !array_key_exists($key, $node)) {
            return null;
        }
        $node = $node[$key];
    }

    /* ⚠ عدد ممکن است رشته‌ی جداشده با کاما باشد («۱۱۲,۵۰۰»). */
    $value = (float) str_replace(array(',', '٬', ' '), '', (string) $node);
    if ($value <= 0) {
        return null;
    }

    /* بیشترِ سرویس‌های ایرانی ریال می‌دهند نه تومان */
    $unit = defined('PHOENIX_RATE_UNIT') ? PHOENIX_RATE_UNIT : 'toman';
    if ($unit === 'rial') {
        $value = $value / 10;
    }

    /* ⚠ محدوده‌ی معقول.
       اگر سرویس روزی ساختار پاسخش را عوض کند، ممکن است عددی
       بی‌ربط برگردد — و قیمتِ کلِ فروشگاه به آن گره خورده.
       بیرونِ این بازه یعنی چیزی درست نیست؛ نرخِ قبلی می‌ماند. */
    if ($value < 10000 || $value > 10000000) {
        return null;
    }

    return (int) round($value);
}
