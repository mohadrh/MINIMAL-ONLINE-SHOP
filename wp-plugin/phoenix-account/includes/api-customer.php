<?php
/**
 * APIِ مشتری — ‎/wp-json/phoenix-account/v1/…‎
 *
 * ============================================================
 * ⚠ این‌جا هر کسی روی اینترنت درخواست می‌فرستد. قاعده‌ها:
 *
 *   ۱ هر مسیرِ حساب از ‎phoenix_acc_permission‎ رد می‌شود — نشست
 *     معتبر، وگرنه ۴۰۱. شماره از نشست می‌آید، نه از بدنه‌ی درخواست.
 *   ۲ سقفِ درخواست برای هر IP؛ برای ورود و بازیابی سقفِ تنگ‌تر، و
 *     قفلِ تلاشِ اشتباه روی خودِ شماره (‎customers.php‎).
 *   ۳ ‎no-store‎ روی هر پاسخ: داده‌ی شخصی در کشِ CDN نمی‌ماند.
 *   ۴ سفارش و تیکتِ دیگران «پیدا نشد» است، نه «مالِ تو نیست».
 *   ۵ رازِ تحویل پوشیده می‌آید؛ بازش فقط با درخواستِ جدا، ثبت‌شده.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_ACC_NS = 'phoenix-account/v1';

add_action('rest_api_init', 'phoenix_acc_customer_routes');
function phoenix_acc_customer_routes() {
    /* ورود و بازیابی — بی‌نشست */
    phoenix_acc_route('/session', 'POST', 'phoenix_acc_api_session_create', false);
    phoenix_acc_route('/login', 'POST', 'phoenix_acc_api_login', false);
    phoenix_acc_route('/password/reset', 'POST', 'phoenix_acc_api_password_reset', false);

    phoenix_acc_route('/session', 'GET', 'phoenix_acc_api_session_get');
    phoenix_acc_route('/session', 'DELETE', 'phoenix_acc_api_session_delete');
    phoenix_acc_route('/sessions', 'GET', 'phoenix_acc_api_sessions');
    phoenix_acc_route('/sessions/(?P<id>\d+)', 'DELETE', 'phoenix_acc_api_session_revoke');
    phoenix_acc_route('/sessions/others', 'POST', 'phoenix_acc_api_sessions_others');

    phoenix_acc_route('/me', 'GET', 'phoenix_acc_api_me');
    phoenix_acc_route('/me', 'POST', 'phoenix_acc_api_me_save');
    phoenix_acc_route('/password', 'POST', 'phoenix_acc_api_password');

    phoenix_acc_route('/orders', 'GET', 'phoenix_acc_api_orders');
    phoenix_acc_route('/orders/(?P<id>\d+)', 'GET', 'phoenix_acc_api_order');
    phoenix_acc_route('/orders/(?P<id>\d+)/reveal', 'POST', 'phoenix_acc_api_order_reveal');
    phoenix_acc_route('/orders/(?P<id>\d+)/inputs', 'POST', 'phoenix_acc_api_order_inputs');
    phoenix_acc_route('/vault', 'GET', 'phoenix_acc_api_vault');
    phoenix_acc_route('/subscriptions', 'GET', 'phoenix_acc_api_subscriptions');

    phoenix_acc_route('/tickets', 'GET', 'phoenix_acc_api_tickets');
    phoenix_acc_route('/tickets', 'POST', 'phoenix_acc_api_ticket_create');
    phoenix_acc_route('/tickets/(?P<id>\d+)', 'GET', 'phoenix_acc_api_ticket');
    phoenix_acc_route('/tickets/(?P<id>\d+)', 'POST', 'phoenix_acc_api_ticket_reply');
    phoenix_acc_route('/tickets/(?P<id>\d+)/close', 'POST', 'phoenix_acc_api_ticket_close');
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

/** سقفِ IP در یک پنجره‌ی زمانی */
function phoenix_acc_rate_limit($bucket, $max, $window) {
    $ip  = function_exists('phoenix_client_ip') ? phoenix_client_ip() : (isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '');
    $key = 'phoenix_acc_rl_' . $bucket . '_' . md5($ip . '|' . floor(time() / $window));
    $n   = (int) get_transient($key);
    if ($n >= $max) {
        return new WP_Error('phoenix_acc_busy', 'تعداد درخواست‌ها زیاد است. لطفاً کمی بعد دوباره تلاش کنید.', array('status' => 429));
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
        return new WP_Error('phoenix_acc_auth', 'نشست شما به پایان رسیده است. لطفاً دوباره وارد شوید.', array('status' => 401));
    }
    $GLOBALS['phoenix_acc_session'] = $row;
    return true;
}

/** شماره‌ی مشتریِ همین درخواست — فقط بعد از ‎phoenix_acc_permission‎ */
function phoenix_acc_phone() {
    return isset($GLOBALS['phoenix_acc_session']->phone) ? (string) $GLOBALS['phoenix_acc_session']->phone : '';
}

function phoenix_acc_session_id() {
    return isset($GLOBALS['phoenix_acc_session']->id) ? (int) $GLOBALS['phoenix_acc_session']->id : 0;
}

add_filter('rest_post_dispatch', 'phoenix_acc_nocache', 10, 3);
function phoenix_acc_nocache($response, $server, $request) {
    if (strpos($request->get_route(), '/' . PHOENIX_ACC_NS . '/') === 0 && $response instanceof WP_REST_Response) {
        $response->header('Cache-Control', 'no-store, private');
    }
    return $response;
}

function phoenix_acc_invalid(array $errors, $msg = 'بعضی فیلدها درست نیستند.') {
    return new WP_Error('phoenix_invalid', $msg, array('status' => 422, 'errors' => $errors));
}

/** حسابِ بسته‌شده توسطِ مدیر — فقط بعد از اثباتِ مالکیت گفته می‌شود */
function phoenix_acc_blocked_error() {
    return new WP_Error('phoenix_acc_blocked', 'این حساب مسدود شده است. لطفاً با پشتیبانی تماس بگیرید.', array('status' => 403));
}

/** ورود: مشتری را ثبت کن و نشستِ بلند بده */
function phoenix_acc_login_ok($phone, WP_REST_Request $r) {
    phoenix_acc_customer_update($phone, array('last_login' => gmdate('Y-m-d H:i:s')));
    $s = phoenix_acc_session_create($phone, (string) $r->get_header('user_agent'));
    $c = phoenix_acc_customer($phone);
    return rest_ensure_response(array(
        'token'        => $s['token'],
        'expires'      => gmdate('c', $s['expires']),
        'phone'        => $phone,
        'has_password' => $c && $c->pass_hash !== '',
    ));
}

/* ============================================================
   ورود
   ============================================================ */

/**
 * ژتونِ ورودِ Bridge (بعد از کدِ پیامکی) → نشستِ بلند.
 */
function phoenix_acc_api_session_create(WP_REST_Request $r) {
    if ($e = phoenix_acc_rate_limit('session', 20, HOUR_IN_SECONDS)) {
        return $e;
    }
    $body  = (array) $r->get_json_params();
    $phone = phoenix_acc_token_consume(isset($body['token']) ? (string) $body['token'] : '');
    if ($phone === '') {
        return new WP_Error('phoenix_acc_token', 'کد تأیید منقضی شده یا قبلاً استفاده شده است. لطفاً کد جدید دریافت کنید.', array('status' => 401));
    }
    $c = phoenix_acc_customer($phone);
    if ($c && (int) $c->blocked) {
        return phoenix_acc_blocked_error();
    }
    /* کدِ پیامکیِ درست یعنی صاحبِ شماره — قفلِ رمز هم باز می‌شود */
    phoenix_acc_fail_clear($phone);
    return phoenix_acc_login_ok($phone, $r);
}

/**
 * ورود با شماره و رمز.
 *
 * ⚠ یک پیام برای «شماره نیست»، «رمز نگذاشته» و «رمز غلط است» — و
 * همان زمانِ پاسخ: برای شماره‌ی بی‌رمز هم یک ‎password_verify‎ روی
 * هشِ ساختگی اجرا می‌شود تا زمان چیزی لو ندهد.
 */
function phoenix_acc_api_login(WP_REST_Request $r) {
    if ($e = phoenix_acc_rate_limit('login', 30, 15 * MINUTE_IN_SECONDS)) {
        return $e;
    }
    $body  = (array) $r->get_json_params();
    $phone = phoenix_normalize_phone(isset($body['phone']) ? (string) $body['phone'] : '');
    $pass  = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';
    if ($phone === '' || $pass === '' || strlen($pass) > 256) {
        return phoenix_acc_invalid(array('phone' => 'لطفاً شماره‌ی موبایل و رمز عبور را وارد کنید.'), 'لطفاً شماره‌ی موبایل و رمز عبور را وارد کنید.');
    }

    $wait = phoenix_acc_locked_for($phone);
    if ($wait > 0) {
        return new WP_Error('phoenix_acc_locked',
            'به دلیل چند تلاش ناموفق، ورود با رمز موقتاً بسته شده است. لطفاً ' . phoenix_acc_fa_minutes($wait) . ' دیگر دوباره تلاش کنید یا با کد پیامکی وارد شوید.',
            array('status' => 429, 'retry' => $wait));
    }

    $c    = phoenix_acc_customer($phone);
    $hash = $c && $c->pass_hash !== '' ? (string) $c->pass_hash : '';
    /* هشِ ساختگی — هر بار همان هزینه، چه حساب باشد چه نه */
    $ok = phoenix_acc_password_check($pass, $hash !== '' ? $hash : phoenix_acc_dummy_hash()) && $hash !== '';

    if (!$ok) {
        phoenix_acc_fail_hit($phone);
        return new WP_Error('phoenix_acc_wrong', 'شماره‌ی موبایل یا رمز عبور درست نیست. اگر هنوز رمز عبور تعیین نکرده‌اید، لطفاً با کد پیامکی وارد شوید.', array('status' => 401));
    }
    if ((int) $c->blocked) {
        return phoenix_acc_blocked_error();
    }
    phoenix_acc_fail_clear($phone);

    /* هزینه‌ی هش بالا رفته؟ همین حالا که رمزِ خام را داریم، تازه‌اش کن */
    if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
        phoenix_acc_customer_update($phone, array('pass_hash' => phoenix_acc_password_hash($pass)));
    }
    return phoenix_acc_login_ok($phone, $r);
}

function phoenix_acc_dummy_hash() {
    static $h = null;
    if ($h === null) {
        $h = get_option('phoenix_acc_dummy_hash');
        if (!is_string($h) || $h === '') {
            $h = phoenix_acc_password_hash(bin2hex(random_bytes(16)));
            update_option('phoenix_acc_dummy_hash', $h, false);
        }
    }
    return $h;
}

function phoenix_acc_fa_minutes($sec) {
    $m = max(1, (int) ceil($sec / 60));
    return strtr((string) $m, array('0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴', '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹')) . ' دقیقه‌ی';
}

/**
 * «رمزم را فراموش کرده‌ام» — کدِ پیامکی (Bridge) + رمزِ تازه.
 *
 * ⚠ بعد از بازیابی همه‌ی نشست‌ها بسته می‌شوند: اگر کسی رمز را دزدیده
 * و وارد شده، با بازیابی بیرون می‌افتد.
 */
function phoenix_acc_api_password_reset(WP_REST_Request $r) {
    if ($e = phoenix_acc_rate_limit('reset', 10, HOUR_IN_SECONDS)) {
        return $e;
    }
    $body = (array) $r->get_json_params();
    $pass = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';
    $tok  = isset($body['token']) ? (string) $body['token'] : '';

    /* اول شکلِ رمز — تا ژتونِ یک‌بارمصرف سرِ رمزِ ضعیف نسوزد */
    $phone_hint = function_exists('phoenix_token_phone') ? phoenix_token_phone($tok) : '';
    if ($phone_hint === '') {
        return new WP_Error('phoenix_acc_token', 'کد تأیید منقضی شده است. لطفاً کد جدید دریافت کنید.', array('status' => 401));
    }
    $problem = phoenix_acc_password_problem($pass, $phone_hint);
    if ($problem !== '') {
        return phoenix_acc_invalid(array('password' => $problem), $problem);
    }
    $phone = phoenix_acc_token_consume($tok);
    if ($phone === '') {
        return new WP_Error('phoenix_acc_token', 'این کد تأیید قبلاً استفاده شده است. لطفاً کد جدید دریافت کنید.', array('status' => 401));
    }
    $c = phoenix_acc_customer($phone);
    if ($c && (int) $c->blocked) {
        return phoenix_acc_blocked_error();
    }
    phoenix_acc_password_set($phone, $pass, 0);
    return phoenix_acc_login_ok($phone, $r);
}

/* ============================================================
   نشست
   ============================================================ */

function phoenix_acc_api_session_get(WP_REST_Request $r) {
    $row = $GLOBALS['phoenix_acc_session'];
    return rest_ensure_response(array(
        'phone'   => (string) $row->phone,
        'created' => gmdate('c', strtotime($row->created_at . ' UTC')),
        'expires' => gmdate('c', strtotime($row->expires_at . ' UTC')),
    ));
}

function phoenix_acc_api_session_delete(WP_REST_Request $r) {
    phoenix_acc_session_revoke(phoenix_acc_phone(), phoenix_acc_session_id());
    return rest_ensure_response(array('ok' => true));
}

function phoenix_acc_api_sessions(WP_REST_Request $r) {
    $current = phoenix_acc_session_id();
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
    $n = phoenix_acc_session_revoke_others(phoenix_acc_phone(), phoenix_acc_session_id());
    return rest_ensure_response(array('ok' => true, 'revoked' => $n));
}

/* ============================================================
   پروفایل و رمز
   ============================================================ */

function phoenix_acc_me_payload($phone) {
    phoenix_acc_customer_ensure($phone);
    $c = phoenix_acc_customer($phone);
    if ($c->name === '' && (int) $c->orders_count === 0 && $c->last_order_at === null) {
        phoenix_acc_customer_refresh($phone); // اولین بار: نام و آمار از سفارش‌های قبلی
        $c = phoenix_acc_customer($phone);
    }
    $tickets = phoenix_acc_tickets_of($phone);
    return array(
        'phone'        => $phone,
        'name'         => (string) $c->name,
        'email'        => (string) $c->email,
        'has_password' => $c->pass_hash !== '',
        'pass_set_at'  => $c->pass_set_at ? gmdate('c', strtotime($c->pass_set_at . ' UTC')) : null,
        'joined'       => gmdate('c', strtotime($c->created_at . ' UTC')),
        'orders_count' => (int) $c->orders_count,
        'paid_total'   => (int) $c->paid_total,
        'open_tickets' => count(array_filter($tickets, function ($t) { return $t['status'] !== 'closed'; })),
        'unread'       => count(array_filter($tickets, function ($t) { return $t['unread']; })),
    );
}

function phoenix_acc_api_me(WP_REST_Request $r) {
    return rest_ensure_response(phoenix_acc_me_payload(phoenix_acc_phone()));
}

function phoenix_acc_api_me_save(WP_REST_Request $r) {
    $body  = (array) $r->get_json_params();
    $name  = phoenix_acc_text($body['name'] ?? '', 100);
    $email = trim((string) ($body['email'] ?? ''));
    $err   = array();
    if (function_exists('mb_strlen') ? mb_strlen($name) < 2 : strlen($name) < 2) {
        $err['name'] = 'لطفاً نام خود را وارد کنید.';
    }
    if ($email !== '' && (strlen($email) > 190 || !is_email($email))) {
        $err['email'] = 'ایمیل واردشده معتبر نیست.';
    }
    if ($err) {
        return phoenix_acc_invalid($err);
    }
    phoenix_acc_customer_update(phoenix_acc_phone(), array('name' => $name, 'email' => $email === '' ? '' : sanitize_email($email)));
    return rest_ensure_response(phoenix_acc_me_payload(phoenix_acc_phone()));
}

/**
 * گذاشتن یا عوض کردنِ رمز از داخلِ حساب.
 *
 * ⚠ نشستِ باز کافی نیست: کسی که گوشیِ بازِ مشتری را برداشته نباید
 * بتواند رمز بگذارد و حساب را برای خودش نگه دارد. یکی از این سه:
 *   رمزِ فعلی · کدِ پیامکیِ تازه (ژتونِ Bridge) · نشستی که همین
 *   حالا (پانزده دقیقه‌ی اخیر) با کد ساخته شده و هنوز رمزی ندارد.
 */
function phoenix_acc_api_password(WP_REST_Request $r) {
    if ($e = phoenix_acc_rate_limit('password', 10, 15 * MINUTE_IN_SECONDS)) {
        return $e;
    }
    $phone = phoenix_acc_phone();
    $body  = (array) $r->get_json_params();
    $pass  = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';
    $cur   = isset($body['current']) && is_string($body['current']) ? $body['current'] : '';
    $tok   = isset($body['token']) ? (string) $body['token'] : '';

    $problem = phoenix_acc_password_problem($pass, $phone);
    if ($problem !== '') {
        return phoenix_acc_invalid(array('password' => $problem), $problem);
    }

    phoenix_acc_customer_ensure($phone);
    $c    = phoenix_acc_customer($phone);
    $has  = $c->pass_hash !== '';
    $sess = $GLOBALS['phoenix_acc_session'];
    $fresh = strtotime($sess->created_at . ' UTC') > time() - 15 * MINUTE_IN_SECONDS;

    if ($tok !== '') {
        $tphone = phoenix_acc_token_consume($tok);
        if ($tphone === '' || !hash_equals($tphone, $phone)) {
            return new WP_Error('phoenix_acc_token', 'کد تأیید منقضی شده است. لطفاً کد جدید دریافت کنید.', array('status' => 401));
        }
    } elseif ($has) {
        if (phoenix_acc_locked_for($phone) > 0) {
            return new WP_Error('phoenix_acc_locked', 'به دلیل چند تلاش ناموفق، لطفاً کمی بعد دوباره تلاش کنید یا با کد پیامکی تأیید کنید.', array('status' => 429));
        }
        if (!phoenix_acc_password_check($cur, $c->pass_hash)) {
            phoenix_acc_fail_hit($phone);
            return phoenix_acc_invalid(array('current' => 'رمز عبور فعلی درست نیست.'), 'رمز عبور فعلی درست نیست.');
        }
    } elseif (!$fresh) {
        return new WP_Error('phoenix_acc_confirm', 'برای تعیین رمز عبور، لطفاً ابتدا با کد پیامکی تأیید کنید.', array('status' => 403));
    }

    $closed = phoenix_acc_password_set($phone, $pass, phoenix_acc_session_id());
    return rest_ensure_response(array('ok' => true, 'revoked' => (int) $closed, 'me' => phoenix_acc_me_payload($phone)));
}

/* ============================================================
   سفارش‌ها
   ============================================================ */

function phoenix_acc_api_orders(WP_REST_Request $r) {
    $phone = phoenix_acc_phone();
    $page  = max(1, min(100, (int) $r->get_param('page')));
    $res   = wc_get_orders(array(
        'billing_phone' => $phone, 'type' => 'shop_order', 'limit' => 10, 'paged' => $page,
        'paginate' => true, 'orderby' => 'date', 'order' => 'DESC',
    ));
    $rows = array();
    foreach ($res->orders as $order) {
        $jobs = array();
        foreach (phoenix_queue_jobs_of_order($order->get_id()) as $j) {
            $jobs[] = (string) $j->status;
        }
        $state = phoenix_acc_order_state($order->get_status(), $jobs);
        $items = array();
        foreach ($order->get_items() as $it) {
            $items[] = array('name' => $it->get_name(), 'qty' => (int) $it->get_quantity());
        }
        $rows[] = array(
            'id'      => $order->get_id(),
            'number'  => (string) $order->get_order_number(),
            'state'   => $state,
            'label'   => PHOENIX_ACC_ORDER_WORDS[$state],
            'created' => $order->get_date_created() ? $order->get_date_created()->date('c') : null,
            'total'   => (int) round((float) $order->get_total()),
            'items'   => $items,
            /* پرداختِ نیمه‌کاره — همان صفحه‌ی پرداختِ ووکامرس */
            'pay_url' => $state === 'awaiting_payment' ? $order->get_checkout_payment_url() : '',
        );
    }
    return rest_ensure_response(array('rows' => $rows, 'page' => $page, 'pages' => max(1, (int) $res->max_num_pages), 'total' => (int) $res->total));
}

function phoenix_acc_api_order(WP_REST_Request $r) {
    $order = phoenix_acc_own_order(phoenix_acc_phone(), (int) $r['id']);
    if (!$order) {
        return new WP_Error('phoenix_acc_nf', 'این سفارش پیدا نشد.', array('status' => 404));
    }
    return rest_ensure_response(phoenix_acc_view_with_required($order, false));
}

/** رازِ تحویل‌ها — فقط صاحبِ سفارش، و در تاریخچه ثبت می‌شود */
function phoenix_acc_api_order_reveal(WP_REST_Request $r) {
    if ($e = phoenix_acc_rate_limit('reveal', 30, HOUR_IN_SECONDS)) {
        return $e;
    }
    $order = phoenix_acc_own_order(phoenix_acc_phone(), (int) $r['id']);
    if (!$order) {
        return new WP_Error('phoenix_acc_nf', 'این سفارش پیدا نشد.', array('status' => 404));
    }
    phoenix_audit('queue', 'order:' . $order->get_id(), null, null, 'مشتری جزئیاتِ تحویل را دید');
    return rest_ensure_response(phoenix_acc_view_with_required($order, true));
}

/**
 * «اصلاح» — مدیر گفته ورودی غلط است؛ مشتری درستش می‌کند و کار به صف
 * برمی‌گردد.
 */
function phoenix_acc_api_order_inputs(WP_REST_Request $r) {
    $order = phoenix_acc_own_order(phoenix_acc_phone(), (int) $r['id']);
    if (!$order) {
        return new WP_Error('phoenix_acc_nf', 'این سفارش پیدا نشد.', array('status' => 404));
    }
    $body    = (array) $r->get_json_params();
    $item_id = (int) ($body['item_id'] ?? 0);
    $item    = $item_id ? $order->get_item($item_id) : null;
    $jobs    = phoenix_queue_jobs_of_order($order->get_id());
    $job     = $jobs[$item_id] ?? null;
    if (!$item || !$job || $job->status !== 'needs_input') {
        return new WP_Error('phoenix_acc_state', 'این مورد در حال حاضر نیازی به اصلاح ندارد.', array('status' => 409));
    }

    /* کلیدهای مجاز: همان‌هایی که قلم دارد + آنچه محصول لازم دانسته */
    $allowed = array_keys(phoenix_order_item_inputs($item));
    $product = wc_get_product((int) ($item->get_variation_id() ? $item->get_variation_id() : $item->get_product_id()));
    foreach (phoenix_queue_required($product, array()) as $req) {
        $allowed[] = $req['label'];
    }
    $c = phoenix_acc_inputs_clean($body['inputs'] ?? null, array_values(array_unique($allowed)));
    if (!$c['ok']) {
        return phoenix_acc_invalid($c['errors']);
    }
    $before = phoenix_order_item_inputs($item);
    foreach ($c['data'] as $k => $v) {
        $item->update_meta_data($k, $v);
    }
    $item->save();
    phoenix_queue_set($job, 'pending', 'مشتری اصلاح کرد');
    $order->add_order_note('مشتری ورودیِ «' . $item->get_name() . '» را اصلاح کرد.', false);
    phoenix_audit('queue', 'order:' . $order->get_id(), $before, array_merge($before, $c['data']), 'اصلاحِ ورودی از حسابِ مشتری');
    do_action('phoenix_queue_input_fixed', $job, $order, $item);
    return rest_ensure_response(phoenix_acc_view_with_required(wc_get_order($order->get_id()), false));
}

/* ---------- تحویل‌ها و اشتراک‌ها — از پنجاه سفارشِ اخیرِ پرداخت‌شده ---------- */

function phoenix_acc_paid_orders($phone) {
    return wc_get_orders(array(
        'billing_phone' => $phone, 'type' => 'shop_order', 'status' => array('processing', 'completed'),
        'limit' => 50, 'orderby' => 'date', 'order' => 'DESC',
    ));
}

function phoenix_acc_api_vault(WP_REST_Request $r) {
    $out = array();
    foreach (phoenix_acc_paid_orders(phoenix_acc_phone()) as $order) {
        foreach ($order->get_items() as $item_id => $item) {
            $entries = phoenix_delivery_entries($item, false);
            $codes   = count($item->get_meta('کد تحویل', false));
            if (!$entries && !$codes) {
                continue;
            }
            $out[] = array(
                'order_id'   => $order->get_id(),
                'number'     => (string) $order->get_order_number(),
                'item_id'    => (int) $item_id,
                'name'       => $item->get_name(),
                'deliveries' => $entries,
                'stock_codes'=> array_fill(0, $codes, str_repeat('•', 8)),
                'at'         => $entries ? max(array_column($entries, 'at')) : ($order->get_date_paid() ? $order->get_date_paid()->getTimestamp() : 0),
            );
        }
    }
    return rest_ensure_response($out);
}

function phoenix_acc_api_subscriptions(WP_REST_Request $r) {
    $out = array();
    $now = time();
    foreach (phoenix_acc_paid_orders(phoenix_acc_phone()) as $order) {
        $jobs = phoenix_queue_jobs_of_order($order->get_id());
        foreach ($order->get_items() as $item_id => $item) {
            $pid  = (int) ($item->get_variation_id() ? $item->get_variation_id() : $item->get_product_id());
            $paid = $order->get_date_paid() ? $order->get_date_paid()->getTimestamp() : 0;
            $job  = $jobs[(int) $item_id] ?? null;
            /* بی‌کارِ صف (کدِ انبار) یا کارِ انجام‌شده — وگرنه ساعت هنوز شروع نشده */
            $done = !$job || $job->status === 'done';
            $sub  = phoenix_acc_subscription(phoenix_acc_item_days($pid), phoenix_delivery_entries($item, false), $paid, $now, $done);
            if (!$sub) {
                continue;
            }
            $parent = wc_get_product((int) $item->get_product_id());
            $out[] = array_merge($sub, array(
                'order_id' => $order->get_id(),
                'number'   => (string) $order->get_order_number(),
                'item_id'  => (int) $item_id,
                'name'     => $item->get_name(),
                'slug'     => $parent ? $parent->get_slug() : '',
            ));
        }
    }
    /* نزدیک‌ترین به پایان اول؛ تمام‌شده‌ها آخر */
    usort($out, function ($a, $b) {
        return ($a['state'] === 'expired') <=> ($b['state'] === 'expired') ?: $a['end'] <=> $b['end'];
    });
    return rest_ensure_response($out);
}

/* ============================================================
   تیکت
   ============================================================ */

function phoenix_acc_api_tickets(WP_REST_Request $r) {
    return rest_ensure_response(phoenix_acc_tickets_of(phoenix_acc_phone()));
}

function phoenix_acc_api_ticket_create(WP_REST_Request $r) {
    $res = phoenix_acc_ticket_create(phoenix_acc_phone(), (array) $r->get_json_params());
    return is_wp_error($res) ? $res : rest_ensure_response($res);
}

function phoenix_acc_api_ticket(WP_REST_Request $r) {
    $t = phoenix_acc_ticket_customer_view(phoenix_acc_phone(), (int) $r['id']);
    return $t ? rest_ensure_response($t) : new WP_Error('phoenix_acc_nf', 'این تیکت پیدا نشد.', array('status' => 404));
}

function phoenix_acc_api_ticket_reply(WP_REST_Request $r) {
    $res = phoenix_acc_ticket_customer_reply(phoenix_acc_phone(), (int) $r['id'], (array) $r->get_json_params());
    return is_wp_error($res) ? $res : rest_ensure_response($res);
}

function phoenix_acc_api_ticket_close(WP_REST_Request $r) {
    $t = phoenix_acc_ticket_customer_close(phoenix_acc_phone(), (int) $r['id']);
    return $t ? rest_ensure_response($t) : new WP_Error('phoenix_acc_nf', 'این تیکت پیدا نشد.', array('status' => 404));
}
