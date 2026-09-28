<?php
/**
 * APIِ مدیر — از همان نگهبانِ Bridge (‎phoenix_api_route‎).
 *
 * ⚠ مسیرِ جدا نمی‌سازیم: قابلیت، nonce، سقفِ نوشتن و ‎no-store‎ همه از
 * Bridge می‌آیند. نسخه‌ی دوم از همان قواعد یعنی روزی یکی‌شان عقب
 * می‌ماند.
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', 'phoenix_acc_admin_routes');
function phoenix_acc_admin_routes() {
    phoenix_api_route('/account/sms', 'GET', 'phoenix_acc_admin_sms_get');
    phoenix_api_route('/account/sms', 'POST', 'phoenix_acc_admin_sms_save');
    phoenix_api_route('/account/sms/test', 'POST', 'phoenix_acc_admin_sms_test');
}

function phoenix_acc_admin_sms_payload() {
    $s     = phoenix_acc_settings();
    $conns = array();
    foreach (phoenix_connections() as $slug => $row) {
        $conns[] = array('slug' => (string) $slug, 'label' => (string) $row['label'], 'key' => phoenix_conn_key_state($row));
    }
    $dev = get_option(PHOENIX_ACC_DEVLOG, array());
    $log = get_option(PHOENIX_ACC_SMSLOG, array());
    return array(
        'settings'    => $s,
        'connections' => $conns,
        /* کدهای حالتِ آزمایشی فقط وقتی همان حالت روشن است */
        'devlog'      => $s['sms_provider'] === 'dev' ? phoenix_acc_log_fresh(is_array($dev) ? $dev : array(), 30 * MINUTE_IN_SECONDS, time()) : array(),
        'log'         => is_array($log) ? $log : array(),
        'bridge_debug'=> defined('WP_DEBUG') && WP_DEBUG,
    );
}

function phoenix_acc_admin_sms_get(WP_REST_Request $r) {
    return phoenix_api_ok(phoenix_acc_admin_sms_payload());
}

function phoenix_acc_admin_sms_save(WP_REST_Request $r) {
    $c = phoenix_acc_settings_clean((array) $r->get_json_params(), array_keys(phoenix_connections()));
    if (!$c['ok']) {
        return new WP_Error('phoenix_invalid', 'بعضی فیلدها درست نیستند.', array('status' => 422, 'errors' => $c['errors']));
    }
    phoenix_acc_settings_save($c['data']);
    return phoenix_api_ok(phoenix_acc_admin_sms_payload());
}

/**
 * پیامکِ آزمایشی به یک شماره — با عددِ نمونه‌ی ۱۲۳۴۵۶، نه کدِ ورودِ واقعی.
 * ⚠ سقفِ یکی در دقیقه برای هر مدیر: هر ارسال پول است.
 */
function phoenix_acc_admin_sms_test(WP_REST_Request $r) {
    $body  = (array) $r->get_json_params();
    $phone = function_exists('phoenix_normalize_phone') ? phoenix_normalize_phone((string) ($body['phone'] ?? '')) : '';
    if ($phone === '') {
        return new WP_Error('phoenix_invalid', 'شماره‌ی موبایل معتبر نیست.', array('status' => 422, 'errors' => array('phone' => 'مثلاً ۰۹۱۲۱۲۳۴۵۶۷')));
    }
    $provider = (string) phoenix_acc_setting('sms_provider');
    if (!in_array($provider, array('kavenegar', 'smsir'), true)) {
        return phoenix_api_fail('phoenix_no_sms', 'اول یک سامانه‌ی پیامک انتخاب و ذخیره کن.', 409);
    }
    $lock = 'phoenix_acc_smstest_' . get_current_user_id();
    if (get_transient($lock)) {
        return phoenix_api_fail('phoenix_busy', 'یک دقیقه صبر کن — هر پیامک هزینه دارد.', 429);
    }
    set_transient($lock, 1, MINUTE_IN_SECONDS);

    $res = phoenix_acc_sms_send($phone, '123456');
    return phoenix_api_ok(array_merge(phoenix_acc_admin_sms_payload(), array('test' => $res)));
}

/* ============================================================
   پنل و داشبورد
   ============================================================ */

add_filter('phoenix_admin_extensions', 'phoenix_acc_admin_sections');
function phoenix_acc_admin_sections($list) {
    $list[] = array(
        'id'     => 'sms',
        'label'  => 'پیامک و ورود',
        'icon'   => 'message',
        'module' => plugins_url('admin/screens/sms.js', PHOENIX_ACC_FILE),
        'ver'    => PHOENIX_ACC_VERSION,
    );
    return $list;
}

/**
 * ⚠ «پیامک وصل نیست» خودش هشدار است: مشتری نه وارد می‌شود نه
 * سفارش ثبت می‌کند. و حالتِ آزمایشی هشدارِ بالا — روی سایتِ واقعی
 * یعنی همان.
 */
add_filter('phoenix_dash_alerts_extra', 'phoenix_acc_dash_alerts');
function phoenix_acc_dash_alerts($alerts) {
    $p = (string) phoenix_acc_setting('sms_provider');
    if ($p === 'dev') {
        $alerts[] = array('level' => 'high', 'title' => 'پیامک در حالتِ آزمایشی است',
            'text' => 'کدِ ورود برای مشتری فرستاده نمی‌شود و فقط در پنل دیده می‌شود. پیش از فروشِ واقعی سامانه را وصل کن.',
            'action' => array('label' => 'پیامک و ورود', 'go' => 'sms'));
    } elseif ($p === 'off') {
        $alerts[] = array('level' => 'medium', 'title' => 'سامانه‌ی پیامک وصل نیست',
            'text' => 'بدونِ پیامک، مشتری نمی‌تواند وارد شود یا سفارش ثبت کند.',
            'action' => array('label' => 'پیامک و ورود', 'go' => 'sms'));
    }
    return $alerts;
}
