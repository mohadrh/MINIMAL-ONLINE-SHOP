<?php
/**
 * کدِ ورود با ربات تلگرام — رایگان، به‌جای پیامک.
 *
 * ============================================================
 * ⚠ ربات به «شماره» پیام نمی‌دهد، فقط به کسی که یک بار بازش کرده:
 *
 *   ۱ مشتری در سایت «ارسال کد» می‌زند. Bridge کد را می‌سازد و از
 *     ‎phoenix_send_otp‎ می‌خواهد بفرستد.
 *   ۲ اگر این شماره قبلاً ربات را باز کرده → کد همان لحظه در تلگرامش.
 *     اگر نه → کد (رمزنگاری‌شده، چند دقیقه) منتظر می‌ماند و سایت
 *     می‌گوید «ربات را باز کنید و شماره را بفرستید».
 *   ۳ مشتری در ربات «ارسالِ شماره‌ی من» را می‌زند. تلگرام شماره‌ی حسابِ
 *     خودِ او را می‌دهد؛ فقط وقتی ‎contact.user_id === from.id‎ است —
 *     یعنی شماره‌ی خودش، نه یکی از مخاطبانش — به این شماره وصل می‌شود
 *     و کدِ منتظر همان‌جا می‌رسد. از آن به بعد کدها مستقیم.
 *
 * ⚠ وبهوک با ‎secret_token‎ی تلگرام قفل است: هر درخواستی بی‌آن هدر رد.
 * ⚠ توکنِ ربات در «اتصال‌ها»ی Bridge، رمزنگاری‌شده؛ در پیامِ خطا پوشیده.
 * ⚠ هاستِ ایران ممکن است به ‎api.telegram.org‎ نرسد — ‎tg_api‎ یک واسطه
 *   (مثلاً Cloudflare Worker) و ‎tg_hook‎ نشانیِ وبهوک از همان واسطه.
 *   راهنما: docs/TELEGRAM.md
 *
 * ⚠ دو نوع ربات (‎tg_mode‎):
 *   own    رباتِ جدا فقط برای ورود — وبهوکش با این افزونه است.
 *   shared رباتی که فروشگاه از قبل دارد و برنامه‌ی خودش را دارد. این
 *          افزونه وبهوکش را دست نمی‌زند (وگرنه رباتِ فروش از کار می‌افتاد)؛
 *          آن ربات شماره‌ی مشتری را با ‎POST /tg/link‎ به ما می‌دهد و ما فقط
 *          با همان توکن کد می‌فرستیم (‎sendMessage‎ با وبهوکِ دیگران تداخل ندارد).
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_ACC_TG_SECRET = 'phoenix_acc_tg_secret';

function phoenix_acc_tg_shared() {
    return phoenix_acc_setting('tg_mode') === 'shared';
}

/** رمزِ وبهوک/API — اگر نیست یا کوتاه است، تازه */
function phoenix_acc_tg_secret() {
    $secret = (string) get_option(PHOENIX_ACC_TG_SECRET, '');
    if (strlen($secret) < 32) {
        $secret = bin2hex(random_bytes(24));
        update_option(PHOENIX_ACC_TG_SECRET, $secret, false);
    }
    return $secret;
}

function phoenix_acc_tg_token() {
    $conn = function_exists('phoenix_conn_runtime') ? phoenix_conn_runtime((string) phoenix_acc_setting('sms_conn')) : null;
    return $conn ? trim((string) $conn['key']) : '';
}

function phoenix_acc_tg_redact($text, $token) {
    return $token === '' ? (string) $text : str_replace($token, '***', (string) $text);
}

/** یک فراخوانیِ Bot API — نتیجه، یا ‎WP_Error‎ با پیامِ بی‌توکن */
function phoenix_acc_tg_call($method, array $params = array()) {
    $token = phoenix_acc_tg_token();
    if (!preg_match('/^\d{5,16}:[A-Za-z0-9_-]{30,80}$/', $token)) {
        return new WP_Error('phoenix_acc_tg_token', 'توکنِ ربات تنظیم نشده یا شکلش درست نیست.');
    }
    $req  = phoenix_acc_tg_request((string) phoenix_acc_setting('tg_api'), $token, $method, $params);
    $http = wp_safe_remote_post($req['url'], array(
        'headers' => array('Content-Type' => 'application/json'),
        'body'    => $req['body'],
        'timeout' => 8,
    ));
    if (is_wp_error($http)) {
        return new WP_Error('phoenix_acc_tg_net', 'به تلگرام نرسید: ' . phoenix_acc_tg_redact($http->get_error_message(), $token));
    }
    $j = json_decode((string) wp_remote_retrieve_body($http), true);
    if (!is_array($j) || empty($j['ok'])) {
        $desc = is_array($j) && isset($j['description']) ? (string) $j['description'] : 'HTTP ' . wp_remote_retrieve_response_code($http);
        return new WP_Error('phoenix_acc_tg_api', phoenix_acc_tg_redact($desc, $token));
    }
    return $j['result'];
}

/* ============================================================
   پیوندِ شماره ↔ گفتگوی ربات
   ============================================================ */

function phoenix_acc_tg_chat_of($phone) {
    global $wpdb;
    $t = phoenix_acc_table_tg();
    return (int) $wpdb->get_var($wpdb->prepare("SELECT chat_id FROM {$t} WHERE phone = %s", (string) $phone));
}

/** یک حسابِ تلگرام = یک شماره: پیوندِ قبلیِ همین گفتگو (شماره‌ی قدیمی) برداشته می‌شود */
function phoenix_acc_tg_link($phone, $chat, $user, $username) {
    global $wpdb;
    $t = phoenix_acc_table_tg();
    $wpdb->delete($t, array('chat_id' => (int) $chat), array('%d'));
    $wpdb->replace($t, array(
        'phone' => (string) $phone, 'chat_id' => (int) $chat, 'tg_user' => (int) $user,
        'username' => (string) $username, 'linked_at' => gmdate('Y-m-d H:i:s'),
    ), array('%s', '%d', '%d', '%s', '%s'));
}

function phoenix_acc_tg_unlink($phone) {
    global $wpdb;
    $wpdb->delete(phoenix_acc_table_tg(), array('phone' => (string) $phone), array('%s'));
}

function phoenix_acc_tg_count() {
    global $wpdb;
    $t = phoenix_acc_table_tg();
    return (int) $wpdb->get_var("SELECT COUNT(*) FROM {$t}");
}

/* ---------- کدِ منتظر: تا مشتری ربات را باز کند (رمزنگاری‌شده) ---------- */

function phoenix_acc_tg_pending_key($phone) {
    return 'phoenix_acc_tgp_' . md5((string) $phone);
}

function phoenix_acc_tg_pending_put($phone, $code) {
    $enc = function_exists('phoenix_secret_encrypt') ? phoenix_secret_encrypt((string) $code) : null;
    if ($enc) {
        set_transient(phoenix_acc_tg_pending_key($phone), $enc, 3 * MINUTE_IN_SECONDS);
    }
}

function phoenix_acc_tg_pending_take($phone) {
    $k = phoenix_acc_tg_pending_key($phone);
    $v = get_transient($k);
    delete_transient($k);
    return is_string($v) && $v !== '' ? phoenix_secret_decrypt($v) : null;
}

/* ============================================================
   فرستادنِ کد
   ============================================================ */

/**
 * @return bool ‎true‎ یعنی «کد رسید یا منتظرِ بازکردنِ ربات است»؛ ‎false‎
 *              یعنی تلگرام در دسترس نیست — Bridge خطا می‌دهد.
 */
function phoenix_acc_tg_send_code($phone, $code) {
    $chat = phoenix_acc_tg_chat_of($phone);
    if (!$chat) {
        phoenix_acc_tg_pending_put($phone, $code);
        phoenix_acc_sms_log($phone, array('ok' => true, 'note' => 'تلگرام: منتظرِ اولین بازکردنِ ربات'));
        return true;
    }
    $r = phoenix_acc_tg_call('sendMessage', array(
        'chat_id' => $chat, 'text' => phoenix_acc_tg_code_text($code), 'protect_content' => true,
    ));
    if (!is_wp_error($r)) {
        phoenix_acc_sms_log($phone, array('ok' => true, 'note' => 'تلگرام: رسید'));
        return true;
    }
    $msg = $r->get_error_message();
    /* ربات را بسته یا حذف کرده — پیوند برود، کد منتظر بماند، دوباره باز کند */
    if ($r->get_error_code() === 'phoenix_acc_tg_api' && preg_match('/blocked|chat not found|deactivated/i', $msg)) {
        phoenix_acc_tg_unlink($phone);
        phoenix_acc_tg_pending_put($phone, $code);
        phoenix_acc_sms_log($phone, array('ok' => true, 'note' => 'تلگرام: ربات بسته شده بود؛ منتظرِ بازکردنِ دوباره'));
        return true;
    }
    phoenix_acc_sms_log($phone, array('ok' => false, 'note' => $msg));
    return false;
}

/** سایت بداند کد کجا رفت — بی‌آنکه بگوید این شماره قبلاً وصل بوده یا نه */
add_filter('phoenix_otp_response_extra', 'phoenix_acc_tg_otp_extra', 10, 2);
function phoenix_acc_tg_otp_extra($extra, $phone) {
    $bot = (string) phoenix_acc_setting('tg_bot');
    if (phoenix_acc_setting('sms_provider') === 'telegram' && $bot !== '') {
        $extra['channel'] = 'telegram';
        $extra['bot']     = $bot;
    }
    return $extra;
}

/* ============================================================
   وبهوک — پیام‌های ربات
   ============================================================ */

add_action('rest_api_init', 'phoenix_acc_tg_routes');
function phoenix_acc_tg_routes() {
    register_rest_route(PHOENIX_ACC_NS, '/tg/hook', array(
        'methods'             => 'POST',
        'callback'            => 'phoenix_acc_tg_hook',
        'permission_callback' => 'phoenix_acc_tg_hook_permission',
    ));
    register_rest_route(PHOENIX_ACC_NS, '/tg/link', array(
        'methods'             => 'POST',
        'callback'            => 'phoenix_acc_tg_link_api',
        'permission_callback' => 'phoenix_acc_tg_link_permission',
    ));
    phoenix_api_route('/account/sms/telegram', 'GET', 'phoenix_acc_admin_tg_get');
    phoenix_api_route('/account/sms/telegram', 'POST', 'phoenix_acc_admin_tg_act', array(
        'act' => array('type' => 'string', 'enum' => array('connect', 'disconnect', 'rotate'), 'required' => true),
    ));
}

function phoenix_acc_tg_hook_permission(WP_REST_Request $r) {
    $secret = (string) get_option(PHOENIX_ACC_TG_SECRET, '');
    $got    = (string) $r->get_header('X-Telegram-Bot-Api-Secret-Token');
    /* رباتِ موجود: تلگرام به این‌جا نمی‌فرستد و رمز دستِ برنامه‌ی آن ربات است — بسته */
    if (phoenix_acc_tg_shared() || $secret === '' || $got === '' || !hash_equals($secret, $got)) {
        return new WP_Error('phoenix_acc_tg_forbidden', 'forbidden', array('status' => 403));
    }
    return true;
}

/** همیشه ۲۰۰ — وگرنه تلگرام همان پیام را بارها دوباره می‌فرستد */
function phoenix_acc_tg_hook(WP_REST_Request $r) {
    $u = phoenix_acc_tg_parse((array) $r->get_json_params());
    if ($u) {
        phoenix_acc_tg_handle($u);
    }
    return rest_ensure_response(array('ok' => true));
}

/* ============================================================
   رباتِ موجود — ‎POST /tg/link‎
   ============================================================ */

/** فقط در حالتِ ‎shared‎، و فقط با رمز در ‎X-Phoenix-Secret‎ */
function phoenix_acc_tg_link_permission(WP_REST_Request $r) {
    $secret = (string) get_option(PHOENIX_ACC_TG_SECRET, '');
    $got    = (string) $r->get_header('X-Phoenix-Secret');
    if (!phoenix_acc_tg_shared() || strlen($secret) < 32 || $got === '' || !hash_equals($secret, $got)) {
        return new WP_Error('phoenix_acc_tg_forbidden', 'forbidden', array('status' => 403));
    }
    return true;
}

/**
 * رباتِ فروشگاه مخاطبِ مشتری را گرفته؛ این‌جا پیوند می‌خورد و اگر کدی
 * منتظر بود همان لحظه در همان گفتگو فرستاده می‌شود. ‎message‎ متنی است
 * که آن ربات می‌تواند به مشتری نشان دهد.
 */
function phoenix_acc_tg_link_api(WP_REST_Request $r) {
    $T = PHOENIX_ACC_TG_TEXT;
    $v = phoenix_acc_tg_link_input($r->get_json_params());
    if (!$v['ok']) {
        $msg = array('not_own' => $T['not_own'], 'not_ir' => $T['not_ir'])[$v['error']] ?? 'درخواست نامعتبر است.';
        return new WP_Error('phoenix_acc_tg_' . $v['error'], $msg, array('status' => 422));
    }
    phoenix_acc_tg_link($v['phone'], $v['chat'], $v['user'], $v['username']);
    $sent = false;
    $code = phoenix_acc_tg_pending_take($v['phone']);
    if ($code !== null && $code !== '') {
        $s = phoenix_acc_tg_call('sendMessage', array('chat_id' => $v['chat'], 'text' => phoenix_acc_tg_code_text($code), 'protect_content' => true));
        $sent = !is_wp_error($s);
        if (!$sent) {
            phoenix_acc_tg_pending_put($v['phone'], $code); // تلگرام در دسترس نبود — کد برای بارِ بعد
        }
    }
    return rest_ensure_response(array(
        'ok' => true, 'code_sent' => $sent, 'message' => $sent ? $T['linked_sent'] : $T['linked'],
    ));
}

function phoenix_acc_tg_say($chat, $text, $markup = null) {
    $p = array('chat_id' => (int) $chat, 'text' => $text);
    if ($markup !== null) {
        $p['reply_markup'] = $markup;
    }
    return phoenix_acc_tg_call('sendMessage', $p);
}

function phoenix_acc_tg_handle(array $u) {
    $T = PHOENIX_ACC_TG_TEXT;
    if ($u['kind'] === 'contact') {
        if (empty($u['own'])) {
            phoenix_acc_tg_say($u['chat'], $T['not_own'], phoenix_acc_tg_contact_keyboard());
            return;
        }
        if ($u['phone'] === '') {
            phoenix_acc_tg_say($u['chat'], $T['not_ir'], array('remove_keyboard' => true));
            return;
        }
        phoenix_acc_tg_link($u['phone'], $u['chat'], $u['from'], $u['username']);
        phoenix_acc_tg_say($u['chat'], $T['linked'], array('remove_keyboard' => true));
        $code = phoenix_acc_tg_pending_take($u['phone']);
        if ($code !== null && $code !== '') {
            phoenix_acc_tg_call('sendMessage', array('chat_id' => $u['chat'], 'text' => phoenix_acc_tg_code_text($code), 'protect_content' => true));
        }
        return;
    }
    global $wpdb;
    $t      = phoenix_acc_table_tg();
    $linked = (bool) $wpdb->get_var($wpdb->prepare("SELECT phone FROM {$t} WHERE chat_id = %d", (int) $u['chat']));
    if ($u['kind'] === 'start' || !$linked) {
        phoenix_acc_tg_say($u['chat'], $T['welcome'], phoenix_acc_tg_contact_keyboard());
        return;
    }
    phoenix_acc_tg_say($u['chat'], $T['help']);
}

/* ============================================================
   پنلِ مدیر — وصل کردنِ ربات
   ============================================================ */

function phoenix_acc_tg_default_hook() {
    return rest_url(PHOENIX_ACC_NS . '/tg/hook');
}

function phoenix_acc_admin_tg_status() {
    if (phoenix_acc_tg_shared()) {
        /* وبهوکِ این ربات مالِ برنامه‌ی خودِ آن است. فقط می‌سنجیم به تلگرام
           می‌رسیم، و اینکه وبهوک اشتباهاً هنوز روی همین سایت نمانده باشد
           (اگر قبلاً در حالتِ «رباتِ جدا» وصلش کرده‌اند). */
        $info = phoenix_acc_tg_call('getWebhookInfo');
        $url  = is_wp_error($info) ? '' : (string) ($info['url'] ?? '');
        return array(
            'mode'        => 'shared',
            'bot'         => (string) phoenix_acc_setting('tg_bot'),
            'linked'      => phoenix_acc_tg_count(),
            'error'       => is_wp_error($info) ? $info->get_error_message() : '',
            'link_url'    => rest_url(PHOENIX_ACC_NS . '/tg/link'),
            'secret'      => phoenix_acc_tg_secret(),
            'hook_is_ours'=> $url !== '' && strpos($url, '/' . PHOENIX_ACC_NS . '/tg/hook') !== false,
            'hook'        => null,
        );
    }
    $info = phoenix_acc_tg_call('getWebhookInfo');
    return array(
        'mode'     => 'own',
        'bot'      => (string) phoenix_acc_setting('tg_bot'),
        'linked'   => phoenix_acc_tg_count(),
        'expected' => (string) (phoenix_acc_setting('tg_hook') ?: phoenix_acc_tg_default_hook()),
        'error'    => is_wp_error($info) ? $info->get_error_message() : '',
        'hook'     => is_wp_error($info) ? null : array(
            'url'        => (string) ($info['url'] ?? ''),
            'pending'    => (int) ($info['pending_update_count'] ?? 0),
            'last_error' => (string) ($info['last_error_message'] ?? ''),
            'last_at'    => isset($info['last_error_date']) ? gmdate('c', (int) $info['last_error_date']) : null,
        ),
    );
}

function phoenix_acc_admin_tg_get(WP_REST_Request $r) {
    return phoenix_api_ok(phoenix_acc_admin_tg_status());
}

function phoenix_acc_admin_tg_act(WP_REST_Request $r) {
    $act    = (string) $r['act'];
    $shared = phoenix_acc_tg_shared();
    if ($act === 'disconnect') {
        /* ⚠ رباتِ موجود: وبهوکش مالِ برنامه‌ی خودش است — دست نمی‌زنیم */
        if (!$shared) {
            $d = phoenix_acc_tg_call('deleteWebhook', array('drop_pending_updates' => true));
            if (is_wp_error($d)) {
                return phoenix_api_fail('phoenix_acc_tg', $d->get_error_message(), 502);
            }
        }
        /* سایت دیگر مشتری را به این ربات نفرستد */
        phoenix_acc_settings_save(array('tg_bot' => ''));
        phoenix_audit('setting', 'account.telegram', null, 'off', $shared ? 'رباتِ موجود جدا شد' : 'وبهوکِ ربات برداشته شد');
        return phoenix_api_ok(phoenix_acc_admin_tg_status());
    }

    $me = phoenix_acc_tg_call('getMe');
    if (is_wp_error($me)) {
        return phoenix_api_fail('phoenix_acc_tg', $me->get_error_message(), 502);
    }
    /* رمزِ تازه فقط بعد از موفقیت ذخیره می‌شود — شکست، ربات را قفل نکند */
    $secret = $act === 'rotate' ? bin2hex(random_bytes(24)) : phoenix_acc_tg_secret();
    $bot    = preg_replace('/[^A-Za-z0-9_]/', '', (string) ($me['username'] ?? ''));

    if ($shared) {
        if ($act === 'rotate') {
            update_option(PHOENIX_ACC_TG_SECRET, $secret, false);
        }
        phoenix_acc_settings_save(array('tg_bot' => $bot));
        phoenix_audit('setting', 'account.telegram', null, '@' . $bot,
            $act === 'rotate' ? 'رمزِ API ربات عوض شد' : 'رباتِ موجود وصل شد (بی‌وبهوک)');
        return phoenix_api_ok(phoenix_acc_admin_tg_status());
    }

    $set = phoenix_acc_tg_call('setWebhook', array(
        'url'                  => (string) (phoenix_acc_setting('tg_hook') ?: phoenix_acc_tg_default_hook()),
        'secret_token'         => $secret,
        'allowed_updates'      => array('message'),
        'drop_pending_updates' => true,
        'max_connections'      => 10,
    ));
    if (is_wp_error($set)) {
        return phoenix_api_fail('phoenix_acc_tg', $set->get_error_message(), 502);
    }
    if ($act === 'rotate') {
        update_option(PHOENIX_ACC_TG_SECRET, $secret, false);
    }
    phoenix_acc_settings_save(array('tg_bot' => $bot));
    phoenix_audit('setting', 'account.telegram', null, '@' . $bot, 'ربات وصل شد');
    return phoenix_api_ok(phoenix_acc_admin_tg_status());
}

/** پیامِ آزمایشیِ پنل به یک شماره‌ی وصل‌شده */
function phoenix_acc_tg_test($phone) {
    $chat = phoenix_acc_tg_chat_of($phone);
    if (!$chat) {
        return array('ok' => false, 'note' => 'این شماره هنوز ربات را باز نکرده. اول در تلگرام ربات را باز کن و «ارسال شماره‌ی من» را بزن.');
    }
    $r = phoenix_acc_tg_call('sendMessage', array('chat_id' => $chat, 'text' => "پیام آزمایشی فونیکس شاپ.\n" . phoenix_acc_tg_code_text('123456')));
    $res = is_wp_error($r) ? array('ok' => false, 'note' => $r->get_error_message()) : array('ok' => true, 'note' => 'در تلگرام رسید');
    phoenix_acc_sms_log($phone, $res);
    return $res;
}
