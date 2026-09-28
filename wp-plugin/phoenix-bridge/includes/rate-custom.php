<?php
/**
 * منابعِ نرخِ تتر که ادمین خودش از پنل اضافه می‌کند.
 *
 * ============================================================
 * ⚠ نشانی را حالا آدم تایپ می‌کند، پس:
 *
 *   SSRF — نشانیِ ‎https://127.0.0.1/…‎ یا شبکه‌ی داخلیِ هاست.
 *   موقعِ ذخیره ‎wp_http_validate_url‎، و موقعِ هر درخواست
 *   ‎wp_safe_remote_get‎ که در ریدایرکت هم رد می‌کند.
 *
 *   کلید در منبع نیست؛ منبع فقط به یک «اتصال» اشاره می‌کند
 *   (connections.php).
 *
 * ⚠ چکِ نشانی و مسیر این‌جا تعریف شده و منابعِ قیمتِ محصول
 *   (product-sources.php) هم از همین‌ها استفاده می‌کنند.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_CUSTOM_SOURCES_MAX = 10;

/* ============================================================
   چک‌های مشترک — خالص
   ============================================================ */

/** @return string خطا، یا '' یعنی درست */
function phoenix_source_url_error($url) {
    if ($url === '') {
        return 'نشانیِ API خالی است.';
    }
    if (stripos($url, 'https://') !== 0) {
        return 'فقط https — عددی که قیمت را تعیین می‌کند نباید روی شبکه قابلِ دستکاری باشد.';
    }
    if (strlen($url) > 500 || preg_match('/[\s"\'<>\\\\]/', $url) || !filter_var($url, FILTER_VALIDATE_URL)) {
        return 'نشانی معتبر نیست.';
    }
    if (function_exists('wp_http_validate_url') && !wp_http_validate_url($url)) {
        return 'این نشانی به شبکه‌ی داخلی یا آدرسِ خصوصی اشاره می‌کند و مجاز نیست.';
    }
    return '';
}

/** @return string خطا، یا '' یعنی درست */
function phoenix_source_path_error($path) {
    if ($path === '') {
        return 'مسیرِ عدد خالی است — مثلاً ‎data.price‎.';
    }
    if (strlen($path) > 200 || !preg_match('/^[A-Za-z0-9_\-.\[\]=:]+$/', $path)) {
        return 'مسیر فقط حرفِ لاتین، عدد، نقطه، ‎_‎ ‎-‎ و ‎[]‎ می‌گیرد.';
    }
    $parts = explode('.', $path);
    foreach ($parts as $i => $p) {
        if ($p === '') {
            return 'مسیر دو نقطه‌ی پشت‌سرهم یا نقطه‌ی اول/آخر دارد.';
        }
        if ($p === '[]' && (!isset($parts[$i + 1]) || strpos($parts[$i + 1], '=') === false)) {
            return 'بعد از ‎[]‎ باید ‎کلید=مقدار‎ بیاید — مثلاً ‎markets.[].symbol=USDTIRT.price‎.';
        }
    }
    return '';
}

/** اتصالِ انتخاب‌شده باید وجود داشته باشد؛ خالی یعنی بدونِ کلید */
function phoenix_source_conn_error($conn, array $known) {
    if ($conn === '') {
        return '';
    }
    return in_array($conn, $known, true) ? '' : 'این اتصال وجود ندارد — شاید حذف شده.';
}

/* ============================================================
   منبعِ نرخ — اعتبارسنجی
   ============================================================ */

/**
 * @param string[] $conns اسلاگِ اتصال‌های موجود
 * @return array{ok:bool, data?:array, errors?:array<string,string>}
 */
function phoenix_source_clean(array $in, array $conns = array()) {
    $err = array();

    $label = phoenix_source_line(isset($in['label']) ? $in['label'] : '', 60);
    if ($label === '') {
        $err['label'] = 'منبع اسم ندارد — همین اسم در فهرست و تاریخچه دیده می‌شود.';
    }

    $url = trim((string) (isset($in['url']) ? $in['url'] : ''));
    if (($e = phoenix_source_url_error($url)) !== '') {
        $err['url'] = $e;
    }

    $path = trim((string) (isset($in['path']) ? $in['path'] : ''));
    if (($e = phoenix_source_path_error($path)) !== '') {
        $err['path'] = $e;
    }

    $unit = isset($in['unit']) ? (string) $in['unit'] : '';
    if (!in_array($unit, array('rial', 'toman'), true)) {
        /* ⚠ پیش‌فرض ندارد، عمداً. اشتباهِ ریال و تومان یعنی قیمتِ
           کلِ فروشگاه ده برابر یا یک‌دهم. */
        $err['unit'] = 'واحد را انتخاب کن: ریال یا تومان.';
    }

    $conn = isset($in['conn']) ? (string) $in['conn'] : '';
    if (($e = phoenix_source_conn_error($conn, $conns)) !== '') {
        $err['conn'] = $e;
    }

    if ($err) {
        return array('ok' => false, 'errors' => $err);
    }
    return array('ok' => true, 'data' => compact('label', 'url', 'path', 'unit', 'conn'));
}

/* ============================================================
   انبار
   ============================================================ */

function phoenix_custom_sources() {
    $all = phoenix_setting('custom_sources', array());
    return is_array($all) ? $all : array();
}

/**
 * برای ‎phoenix_rate_sources()‎.
 *
 * ⚠ منبعی که اتصالش خراب است (کلید باز نمی‌شود یا اتصال حذف شده)
 * کنار می‌رود، نه اینکه بی‌کلید درخواست بفرستد — «۴۰۱» هر ساعت در
 * تاریخچه فقط شلوغی است.
 */
function phoenix_custom_sources_runtime() {
    $out = array();
    foreach (phoenix_custom_sources() as $slug => $row) {
        if (!is_array($row)) {
            continue;
        }
        $conn = null;
        if (!empty($row['conn'])) {
            $conn = phoenix_conn_runtime($row['conn']);
            if ($conn === null) {
                continue;
            }
        }
        $out[$slug] = array(
            'label'  => (string) $row['label'],
            'url'    => (string) $row['url'],
            'path'   => (string) $row['path'],
            'unit'   => (string) $row['unit'],
            'conn'   => $conn,
            'origin' => 'panel',
        );
    }
    return $out;
}

/**
 * @param string|null $slug null یعنی منبعِ تازه
 * @return string|WP_Error
 */
function phoenix_custom_source_save($slug, array $clean) {
    $all = phoenix_custom_sources();

    if ($slug === null) {
        if (count($all) >= PHOENIX_CUSTOM_SOURCES_MAX) {
            return new WP_Error('phoenix_too_many', 'حداکثر ' . PHOENIX_CUSTOM_SOURCES_MAX . ' منبعِ سفارشی.');
        }
        do {
            $slug = 'p_' . bin2hex(random_bytes(3));
        } while (isset($all[$slug]));
    } elseif (!isset($all[$slug])) {
        return new WP_Error('phoenix_not_found', 'این منبع پیدا نشد.');
    }

    $all[$slug] = $clean;
    phoenix_settings_save(array('custom_sources' => $all), 'منبعِ «' . $clean['label'] . '»');
    return $slug;
}

function phoenix_custom_source_delete($slug) {
    $all = phoenix_custom_sources();
    if (!isset($all[$slug])) {
        return false;
    }
    $label = (string) $all[$slug]['label'];
    unset($all[$slug]);

    $flags = (array) phoenix_setting('sources', array());
    unset($flags[$slug]);

    phoenix_settings_save(array('custom_sources' => $all, 'sources' => $flags), 'حذفِ منبعِ «' . $label . '»');
    return true;
}
