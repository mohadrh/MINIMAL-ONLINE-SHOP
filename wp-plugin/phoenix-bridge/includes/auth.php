<?php
/**
 * ورود با رمز یک‌بارمصرف
 *
 * ============================================================
 * چرا لازم است
 *
 * اندپوینتِ ثبت سفارش عمومی است — باید باشد، چون سایت روی میزبانِ
 * ایستا نشسته و نشستِ وردپرسی ندارد. ولی «عمومی» یعنی هر کسی
 * می‌تواند با شماره‌ی هر کسی سفارش بسازد. محدودیتِ نرخ حجم را
 * می‌بندد، جعلِ هویت را نه.
 *
 * پس پیش از ثبت سفارش، شماره باید ثابت شود: کد به همان شماره
 * می‌رود، و تا کد برنگردد سفارشی ثبت نمی‌شود.
 *
 * ⚠ سه قاعده که در پیاده‌سازی‌های اشتباهِ OTP همیشه شکسته می‌شوند
 * و این‌جا نمی‌شکنند:
 *
 *   ۱ کد هرگز خام ذخیره نمی‌شود. اگر پایگاه داده لو برود، کدهای
 *     فعال نباید خوانده شوند.
 *   ۲ تعداد تلاش محدود است. بدون آن، کدِ شش‌رقمی با یک میلیون
 *     درخواست حدس زده می‌شود.
 *   ۳ مقایسه با hash_equals است نه ==، تا زمانِ پاسخ چیزی لو ندهد.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

define('PHOENIX_OTP_TTL', 2 * MINUTE_IN_SECONDS);
define('PHOENIX_OTP_MAX_TRIES', 5);
define('PHOENIX_TOKEN_TTL', 15 * MINUTE_IN_SECONDS);

add_action('rest_api_init', 'phoenix_register_auth_routes');
function phoenix_register_auth_routes() {
    register_rest_route('phoenix/v1', '/otp/request', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'phoenix_otp_request',
        'permission_callback' => '__return_true',
    ));

    register_rest_route('phoenix/v1', '/otp/verify', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'phoenix_otp_verify',
        'permission_callback' => '__return_true',
    ));
}

/* ============================================================
   درخواست کد
   ============================================================ */

function phoenix_otp_request(WP_REST_Request $request) {
    $body  = $request->get_json_params();
    $phone = phoenix_normalize_phone(isset($body['phone']) ? (string) $body['phone'] : '');

    if ($phone === '') {
        return new WP_Error('phoenix_bad_phone', 'شماره‌ی موبایل معتبر نیست.', array('status' => 400));
    }

    /* دو سقف: یکی روی شماره، یکی روی IP.

       فقط سقفِ شماره یعنی مهاجم با هزار شماره هزار پیامک می‌فرستد
       و هزینه‌ی پیامک را بالا می‌برد. فقط سقفِ IP یعنی با پراکسی
       دور زده می‌شود. هر دو با هم. */
    $phone_key = 'phoenix_otp_n_' . md5($phone);
    $ip_key    = 'phoenix_otp_ip_' . md5(phoenix_client_ip());

    if ((int) get_transient($phone_key) >= 3) {
        return new WP_Error('phoenix_otp_flood', 'برای این شماره زیاد درخواست شد. چند دقیقه صبر کن.', array('status' => 429));
    }
    if ((int) get_transient($ip_key) >= 10) {
        return new WP_Error('phoenix_otp_flood', 'تعداد درخواست‌ها زیاد است.', array('status' => 429));
    }

    /* ⚠ random_int و نه rand.

       rand و mt_rand قابل پیش‌بینی‌اند؛ با دانستنِ چند خروجی
       می‌شود بعدی‌ها را حساب کرد. random_int از منبعِ امنِ
       سیستم می‌گیرد. */
    $code = (string) random_int(100000, 999999);

    set_transient('phoenix_otp_' . md5($phone), array(
        'hash'  => wp_hash_password($code),
        'tries' => 0,
    ), PHOENIX_OTP_TTL);

    set_transient($phone_key, (int) get_transient($phone_key) + 1, 10 * MINUTE_IN_SECONDS);
    set_transient($ip_key, (int) get_transient($ip_key) + 1, HOUR_IN_SECONDS);

    /**
     * ارسال پیامک.
     *
     * سرویس‌دهنده‌ی پیامک این‌جا وصل می‌شود. تا وقتی کسی به این
     * فیلتر وصل نشده، در حالت توسعه کد در لاگ می‌افتد و در حالت
     * تولید هیچ‌جا نمی‌رود — تا کسی تصادفی فکر نکند کار می‌کند.
     *
     * نمونه:
     *   add_filter('phoenix_send_sms', function ($sent, $phone, $text) {
     *       // فراخوانی API کاوه‌نگار / ملی‌پیامک / …
     *       return true;
     *   }, 10, 3);
     */
    $text = 'کد ورود فونیکس شاپ: ' . $code;
    $sent = apply_filters('phoenix_send_sms', false, $phone, $text);

    if (!$sent) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[phoenix] کد یک‌بارمصرف برای ' . $phone . ' = ' . $code);
            return rest_ensure_response(array(
                'ok'      => true,
                'dev_hint'=> 'سرویس پیامک وصل نیست؛ کد در لاگ وردپرس است.',
                'ttl'     => PHOENIX_OTP_TTL,
            ));
        }
        return new WP_Error(
            'phoenix_sms_down',
            'ارسال پیامک ممکن نشد. با پشتیبانی تماس بگیر.',
            array('status' => 503)
        );
    }

    return rest_ensure_response(array('ok' => true, 'ttl' => PHOENIX_OTP_TTL));
}

/* ============================================================
   بررسی کد
   ============================================================ */

function phoenix_otp_verify(WP_REST_Request $request) {
    $body  = $request->get_json_params();
    $phone = phoenix_normalize_phone(isset($body['phone']) ? (string) $body['phone'] : '');
    $code  = isset($body['code']) ? preg_replace('/[^0-9]/', '', (string) $body['code']) : '';

    if ($phone === '' || strlen($code) !== 6) {
        return new WP_Error('phoenix_bad_input', 'شماره یا کد معتبر نیست.', array('status' => 400));
    }

    $key = 'phoenix_otp_' . md5($phone);
    $rec = get_transient($key);

    if (!is_array($rec)) {
        return new WP_Error('phoenix_otp_expired', 'کد منقضی شده. دوباره درخواست بده.', array('status' => 410));
    }

    if ((int) $rec['tries'] >= PHOENIX_OTP_MAX_TRIES) {
        delete_transient($key);
        return new WP_Error('phoenix_otp_locked', 'تعداد تلاش زیاد بود. کد تازه بگیر.', array('status' => 429));
    }

    $rec['tries'] = (int) $rec['tries'] + 1;
    set_transient($key, $rec, PHOENIX_OTP_TTL);

    if (!wp_check_password($code, $rec['hash'])) {
        return new WP_Error('phoenix_otp_wrong', 'کد درست نیست.', array('status' => 401));
    }

    /* کد یک‌بارمصرف است — بعد از موفقیت فوراً می‌سوزد */
    delete_transient($key);

    return rest_ensure_response(array(
        'ok'    => true,
        'token' => phoenix_make_token($phone),
        'ttl'   => PHOENIX_TOKEN_TTL,
    ));
}

/* ============================================================
   ژتون
   ============================================================ */

/**
 * ژتونِ بی‌حالت.
 *
 * ⚠ امضا با نمکِ خودِ وردپرس است.
 *
 * ذخیره‌ی ژتون در پایگاه داده یعنی یک جدولِ تازه و یک کارِ
 * پاک‌سازی. HMAC همان کار را بدون حالت می‌کند: هرکه نمک را
 * نداشته باشد نمی‌تواند ژتون بسازد، و انقضا داخلِ خودِ ژتون است.
 */
function phoenix_make_token($phone) {
    $exp     = time() + PHOENIX_TOKEN_TTL;
    $payload = $phone . '|' . $exp;
    $sig     = hash_hmac('sha256', $payload, wp_salt('auth'));
    return base64_encode($payload . '|' . $sig);
}

/** شماره‌ی داخل ژتون، یا رشته‌ی خالی اگر معتبر نباشد */
function phoenix_token_phone($token) {
    if (!is_string($token) || $token === '') {
        return '';
    }
    $raw = base64_decode($token, true);
    if ($raw === false) {
        return '';
    }
    $parts = explode('|', $raw);
    if (count($parts) !== 3) {
        return '';
    }
    list($phone, $exp, $sig) = $parts;

    if (!ctype_digit($exp) || (int) $exp < time()) {
        return '';
    }

    $expected = hash_hmac('sha256', $phone . '|' . $exp, wp_salt('auth'));
    if (!hash_equals($expected, $sig)) {
        return '';
    }
    return phoenix_normalize_phone($phone);
}
