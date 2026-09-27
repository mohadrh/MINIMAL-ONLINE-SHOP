<?php
/**
 * نگهبانِ REST — هر درخواستِ پنلِ نسخه‌ی ۲ از این‌جا رد می‌شود.
 *
 * ============================================================
 * ⚠ سه لایه، و هر سه بدونِ استثنا
 *
 *   ۱ nonce — خودِ وردپرس چکش می‌کند، و این‌جا نتیجه‌اش را
 *     می‌بینیم. درخواستی که با کوکیِ ادمین بیاید ولی nonceِ
 *     ‎wp_rest‎ نداشته باشد، از نظرِ وردپرس «کاربرِ مهمان» است.
 *     یعنی صفحه‌ای در سایتِ دیگر که مرورگرِ ادمینِ لاگین‌شده را
 *     وادار به درخواست کند، این‌جا ‎is_user_logged_in() === false‎
 *     می‌بیند و ۴۰۱ می‌گیرد. این همان سپرِ CSRF است.
 *
 *   ۲ قابلیت — ‎manage_woocommerce‎. لاگین بودن کافی نیست؛ مشتری
 *     هم لاگین است.
 *
 *   ۳ سقفِ نوشتن — شصت نوشتن در دقیقه برای هر کاربر. ادمینِ
 *     واقعی هیچ‌وقت به آن نمی‌رسد؛ اسکریپتی که با نشستِ دزدیده
 *     کار می‌کند، زود می‌رسد.
 *
 * ⚠ و همه‌ی مسیرها از ‎phoenix_api_route‎ ثبت می‌شوند، نه با
 *   ‎register_rest_route‎ی مستقیم.
 *
 * دلیلش همان دلیلِ نسخه‌ی ۱ است: اگر هر مسیر خودش
 * ‎permission_callback‎ بنویسد، روزی یکی‌شان ‎__return_true‎
 * می‌گیرد و آن یک مسیر همان دری است که باز مانده. این‌جا
 * نمی‌شود مسیری بدونِ نگهبان ثبت کرد.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_API_NS          = 'phoenix/v1';
const PHOENIX_API_WRITE_LIMIT = 60; // در دقیقه، برای هر کاربر

/** خواندن: لاگین + قابلیت */
function phoenix_api_can(WP_REST_Request $request) {
    if (!is_user_logged_in()) {
        return new WP_Error(
            'phoenix_auth',
            'نشستِ کاری منقضی شده. صفحه را تازه کن.',
            array('status' => 401)
        );
    }
    if (!current_user_can(PHOENIX_CAP)) {
        return new WP_Error(
            'phoenix_forbidden',
            'اجازه‌ی دسترسی به این بخش را نداری.',
            array('status' => 403)
        );
    }
    return true;
}

/** نوشتن: همان، به‌علاوه‌ی سقفِ دفعات */
function phoenix_api_can_write(WP_REST_Request $request) {
    $ok = phoenix_api_can($request);
    if ($ok !== true) {
        return $ok;
    }

    $key = 'phoenix_api_w_' . get_current_user_id();
    $n   = (int) get_transient($key);
    if ($n >= PHOENIX_API_WRITE_LIMIT) {
        return new WP_Error(
            'phoenix_rate_limited',
            'تعدادِ درخواست‌ها زیاد است. یک دقیقه صبر کن.',
            array('status' => 429)
        );
    }
    set_transient($key, $n + 1, MINUTE_IN_SECONDS);
    return true;
}

/**
 * ثبتِ یک مسیرِ پنل.
 *
 * @param string   $path   بعد از ‎/admin‎، مثل ‎/dashboard‎
 * @param string   $method GET | POST | DELETE
 * @param callable $cb
 * @param array    $args   اسکیمای ورودی — هر ورودی نوع دارد
 */
function phoenix_api_route($path, $method, $cb, array $args = array()) {
    $write = $method !== 'GET';

    /* ⚠ هر ورودی اعتبارسنجی و پاک‌سازیِ پیش‌فرضِ وردپرس را
       می‌گیرد، مگر خودش چیزِ سخت‌گیرانه‌تری داشته باشد.
       بدونِ این، ‎type‎ فقط مستندات است و هیچ‌چیز را رد نمی‌کند. */
    foreach ($args as $name => $spec) {
        if (!isset($spec['validate_callback'])) {
            $args[$name]['validate_callback'] = 'rest_validate_request_arg';
        }
        if (!isset($spec['sanitize_callback'])) {
            $args[$name]['sanitize_callback'] = 'rest_sanitize_request_arg';
        }
    }

    register_rest_route(PHOENIX_API_NS, '/admin' . $path, array(
        'methods'             => $method,
        'callback'            => $cb,
        'permission_callback' => $write ? 'phoenix_api_can_write' : 'phoenix_api_can',
        'args'                => $args,
    ));
}

/**
 * پاسخِ موفق — همیشه یک شکل، تا پنل یک جا بازش کند.
 */
function phoenix_api_ok($data) {
    return rest_ensure_response(array('ok' => true, 'data' => $data));
}

function phoenix_api_fail($code, $message, $status = 400) {
    return new WP_Error($code, $message, array('status' => (int) $status));
}

/**
 * ⚠ پاسخِ پنل هیچ‌وقت کش نمی‌شود.
 *
 * وردپرس برای کاربرِ لاگین‌شده ‎no-cache‎ می‌فرستد، ولی افزونه‌ی
 * کش یا CDN ممکن است نادیده‌اش بگیرد. پاسخی که وضعیتِ موتورِ
 * قیمت را دارد و کش شده، یعنی ادمین موتور را روشن می‌کند و پنل
 * می‌گوید خاموش است.
 */
add_filter('rest_post_dispatch', 'phoenix_api_nocache', 10, 3);
function phoenix_api_nocache($response, $server, $request) {
    if (strpos((string) $request->get_route(), '/' . PHOENIX_API_NS . '/admin') !== 0) {
        return $response;
    }
    if ($response instanceof WP_REST_Response) {
        $response->header('Cache-Control', 'no-store, private');
    }
    return $response;
}
