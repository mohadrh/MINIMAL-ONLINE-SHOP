<?php
/**
 * APIِ مشتری — ‎/wp-json/phoenix-account/v1/…‎
 *
 * ============================================================
 * ⚠ این‌جا هر کسی روی اینترنت درخواست می‌فرستد. سه قاعده:
 *
 *   ۱ هر مسیرِ حساب از ‎phoenix_acc_permission‎ رد می‌شود — نشست
 *     معتبر، وگرنه ۴۰۱. شماره از نشست می‌آید، نه از بدنه‌ی درخواست.
 *   ۲ سقفِ درخواست برای هر IP، و برای ساختِ نشست سقفِ تنگ‌تر.
 *   ۳ ‎no-store‎ روی هر پاسخ: داده‌ی شخصی در کشِ CDN نمی‌ماند.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_ACC_NS = 'phoenix-account/v1';

add_action('rest_api_init', 'phoenix_acc_customer_routes');
function phoenix_acc_customer_routes() {
    phoenix_acc_route('/session', 'POST', 'phoenix_acc_api_session_create', false);
    phoenix_acc_route('/session', 'GET', 'phoenix_acc_api_session_get');
    phoenix_acc_route('/session', 'DELETE', 'phoenix_acc_api_session_delete');
    phoenix_acc_route('/sessions', 'GET', 'phoenix_acc_api_sessions');
    phoenix_acc_route('/sessions/(?P<id>\d+)', 'DELETE', 'phoenix_acc_api_session_revoke');
    phoenix_acc_route('/sessions/others', 'POST', 'phoenix_acc_api_sessions_others');
    phoenix_acc_route('/me', 'GET', 'phoenix_acc_api_me');
}

function phoenix_acc_route($path, $method, $cb, $auth = true) {
    register_rest_route(PHOENIX_ACC_NS, $path, array(
        'methods'             => $method,
        'callback'            => $cb,
        'permission_callback' => $auth ? 'phoenix_acc_permission' : 'phoenix_acc_permission_public',
    ));
}

/* ============================================================
   نگهبان
   ============================================================ */

/** سقفِ IP — ۱۲۰ درخواست در دقیقه برای کلِ API حساب */
function phoenix_acc_rate_limit($bucket, $max, $window) {
    $ip  = function_exists('phoenix_client_ip') ? phoenix_client_ip() : (isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '');
    $key = 'phoenix_acc_rl_' . $bucket . '_' . md5($ip . '|' . floor(time() / $window));
    $n   = (int) get_transient($key);
    if ($n >= $max) {
        return new WP_Error('phoenix_acc_busy', 'درخواست‌ها زیاد است. کمی صبر کن.', array('status' => 429));
    }
    set_transient($key, $n + 1, $window);
    return null;
}

function phoenix_acc_permission_public(WP_REST_Request $r) {
    $e = phoenix_acc_rate_limit('all', 120, 60);
    return $e ? $e : true;
}

function phoenix_acc_permission(WP_REST_Request $r) {
    if ($e = phoenix_acc_rate_limit('all', 120, 60)) {
        return $e;
    }
    $row = phoenix_acc_session_row((string) $r->get_header(PHOENIX_ACC_HEADER));
    if (!$row) {
        return new WP_Error('phoenix_acc_auth', 'نشستت تمام شده. دوباره وارد شو.', array('status' => 401));
    }
    $GLOBALS['phoenix_acc_session'] = $row;
    return true;
}

/** شماره‌ی مشتریِ همین درخواست — فقط بعد از ‎phoenix_acc_permission‎ */
function phoenix_acc_phone() {
    return isset($GLOBALS['phoenix_acc_session']->phone) ? (string) $GLOBALS['phoenix_acc_session']->phone : '';
}

add_filter('rest_post_dispatch', 'phoenix_acc_nocache', 10, 3);
function phoenix_acc_nocache($response, $server, $request) {
    if (strpos($request->get_route(), '/' . PHOENIX_ACC_NS . '/') === 0 && $response instanceof WP_REST_Response) {
        $response->header('Cache-Control', 'no-store, private');
    }
    return $response;
}

/* ============================================================
   نشست
   ============================================================ */

/**
 * ژتونِ ورودِ Bridge (بعد از کدِ پیامکی) → نشستِ بلند.
 *
 * ⚠ هر ژتون فقط یک بار. ژتونِ Bridge پانزده دقیقه معتبر است؛ بدونِ
 * این، کسی که یک بار دیدش (مثلاً از گزارشِ خطای مرورگر) تا پانزده
 * دقیقه می‌توانست نشستِ تازه بسازد.
 */
function phoenix_acc_api_session_create(WP_REST_Request $r) {
    if ($e = phoenix_acc_rate_limit('session', 20, HOUR_IN_SECONDS)) {
        return $e;
    }
    $body  = (array) $r->get_json_params();
    $token = isset($body['token']) ? (string) $body['token'] : '';
    $phone = function_exists('phoenix_token_phone') ? phoenix_token_phone($token) : '';
    if ($phone === '') {
        return new WP_Error('phoenix_acc_token', 'تأیید منقضی شده. کدِ تازه بگیر.', array('status' => 401));
    }
    $used = 'phoenix_acc_used_' . hash('sha256', $token);
    if (get_transient($used)) {
        return new WP_Error('phoenix_acc_token', 'این تأیید قبلاً استفاده شده. کدِ تازه بگیر.', array('status' => 401));
    }
    set_transient($used, 1, 20 * MINUTE_IN_SECONDS);

    $s = phoenix_acc_session_create($phone, (string) $r->get_header('user_agent'));
    return rest_ensure_response(array(
        'token'   => $s['token'],
        'expires' => gmdate('c', $s['expires']),
        'phone'   => $phone,
    ));
}

function phoenix_acc_api_session_get(WP_REST_Request $r) {
    $row = $GLOBALS['phoenix_acc_session'];
    return rest_ensure_response(array(
        'phone'   => (string) $row->phone,
        'created' => gmdate('c', strtotime($row->created_at . ' UTC')),
        'expires' => gmdate('c', strtotime($row->expires_at . ' UTC')),
    ));
}

function phoenix_acc_api_session_delete(WP_REST_Request $r) {
    phoenix_acc_session_revoke(phoenix_acc_phone(), (int) $GLOBALS['phoenix_acc_session']->id);
    return rest_ensure_response(array('ok' => true));
}

function phoenix_acc_api_sessions(WP_REST_Request $r) {
    $current = (int) $GLOBALS['phoenix_acc_session']->id;
    $out = array();
    foreach (phoenix_acc_sessions_of(phoenix_acc_phone()) as $s) {
        $out[] = array(
            'id'        => (int) $s->id,
            'device'    => phoenix_acc_ua_label($s->ua),
            'created'   => gmdate('c', strtotime($s->created_at . ' UTC')),
            'last_seen' => gmdate('c', strtotime($s->last_seen . ' UTC')),
            'current'   => (int) $s->id === $current,
        );
    }
    return rest_ensure_response($out);
}

function phoenix_acc_api_session_revoke(WP_REST_Request $r) {
    if (!phoenix_acc_session_revoke(phoenix_acc_phone(), (int) $r['id'])) {
        return new WP_Error('phoenix_acc_nf', 'این نشست پیدا نشد.', array('status' => 404));
    }
    return rest_ensure_response(array('ok' => true));
}

function phoenix_acc_api_sessions_others(WP_REST_Request $r) {
    $n = phoenix_acc_session_revoke_others(phoenix_acc_phone(), (int) $GLOBALS['phoenix_acc_session']->id);
    return rest_ensure_response(array('ok' => true, 'revoked' => $n));
}

/* ============================================================
   پروفایل
   ============================================================ */

/**
 * نام و ایمیل از کاربرِ ووکامرسی که با همین شماره ساخته شده، وگرنه از
 * آخرین سفارش. (ویرایشِ پروفایل در مرحله‌ی ۳.)
 */
function phoenix_acc_api_me(WP_REST_Request $r) {
    $phone = phoenix_acc_phone();
    $name  = '';
    $email = '';

    $uid = function_exists('phoenix_customer_id_for_phone') ? phoenix_customer_id_for_phone($phone) : 0;
    if ($uid) {
        $u = get_userdata($uid);
        if ($u) {
            $name  = trim($u->first_name . ' ' . $u->last_name);
            $email = (string) $u->user_email;
        }
    }
    if ($name === '' && function_exists('wc_get_orders')) {
        $last = wc_get_orders(array('billing_phone' => $phone, 'limit' => 1, 'orderby' => 'date', 'order' => 'DESC'));
        if ($last) {
            $name  = trim($last[0]->get_billing_first_name() . ' ' . $last[0]->get_billing_last_name());
            $email = $email !== '' ? $email : (string) $last[0]->get_billing_email();
        }
    }
    return rest_ensure_response(array('phone' => $phone, 'name' => $name, 'email' => $email));
}
