<?php
/**
 * سرورِ آزمایشیِ پنل — مسیریابِ ‎php -S‎.
 *
 *   php -S 127.0.0.1:4330 -t wp-plugin wp-plugin/tests/harness/router.php
 *   → http://127.0.0.1:4330/tests/harness/
 *
 * چهار کار:
 *   ‎/__api/…‎        APIِ ساختگی (fake-api.php) — ولی اعتبارسنجی و
 *                    قیمت‌گذاری‌اش همان توابعِ واقعیِ افزونه است
 *   ‎/wp-json/…‎      بک‌اندِ ساختگیِ سایت (fake-shop.php) — ورود و پنلِ مشتری
 *   ‎/products/…‎ ‎/brand/…‎  تصویرهای خودِ سایت از ‎public/‎، تا
 *                    تبِ رسانه و فهرستِ محصولات تصویرِ واقعی ببینند
 *   بقیه             فایلِ ایستا از ‎wp-plugin/‎
 *
 * فقط روی ‎127.0.0.1‎ اجرا می‌شود و داخلِ زیپِ افزونه نمی‌رود.
 */

$uri = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

if (preg_match('#^/(products|brand)/#', $uri)) {
    $pub  = realpath(__DIR__ . '/../../../public');
    $file = realpath($pub . $uri);
    /* ⚠ فقط داخلِ ‎public/‎ — ‎..‎ در نشانی نباید به بیرون برسد */
    if ($pub && $file && strpos($file, $pub . DIRECTORY_SEPARATOR) === 0 && is_file($file)) {
        $types = array('webp' => 'image/webp', 'png' => 'image/png', 'jpg' => 'image/jpeg',
                       'jpeg' => 'image/jpeg', 'svg' => 'image/svg+xml', 'gif' => 'image/gif', 'avif' => 'image/avif');
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        header('Content-Type: ' . (isset($types[$ext]) ? $types[$ext] : 'application/octet-stream'));
        readfile($file);
        return true;
    }
    http_response_code(404);
    return true;
}

if (strpos($uri, '/__api/') === 0) {
    require __DIR__ . '/fake-api.php';
    return true;
}

/* بک‌اندِ ساختگیِ خودِ سایت — ورود و پنلِ مشتری (fake-shop.php) */
if (strpos($uri, '/wp-json/') === 0) {
    require __DIR__ . '/fake-shop.php';
    return true;
}

/* فایلِ ایستا — بدونِ کش، تا اصلاحِ تازه همان لحظه دیده شود */
if (preg_match('/\.(js|css|html)$/', $uri)) {
    header('Cache-Control: no-store');
}
return false;
