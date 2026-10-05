<?php
/**
 * ربات تلگرام — فقط برای اعلان‌های مدیر (notify.php).
 *
 * ============================================================
 * ⚠ از Phoenix Account ۰٫۹٫۰ کدِ ورودِ مشتری دیگر به تلگرام نمی‌رود —
 *   خواسته‌ی فروشگاه. مشتری با رمز، ایمیل یا پیامک وارد می‌شود. این
 *   ربات فقط خرید و پشتیبانی را به گفتگو، گروه یا کانالِ مدیر می‌فرستد.
 *   (نسخه‌ی ورود با تلگرام در تاریخچه‌ی گیت هست، اگر روزی برگشت.)
 *
 * ⚠ وبهوک با ‎secret_token‎ی تلگرام قفل است؛ تنها کارش گرفتنِ «کدِ
 *   اتصالِ گفتگو» است (‎phoenix_acc_notify_catch‎). به هر کسِ دیگری که
 *   ربات را باز کند فقط یک جمله می‌گوید.
 * ⚠ توکن در «اتصال‌ها»ی Bridge، رمزنگاری‌شده؛ در پیامِ خطا پوشیده.
 * ⚠ هاستِ ایران ممکن است به ‎api.telegram.org‎ نرسد — ‎tg_api‎ یک واسطه
 *   (مثلاً Cloudflare Worker) و ‎tg_hook‎ نشانیِ وبهوک از همان واسطه،
 *   هر دو در تنظیماتِ اعلان‌ها. راهنما: docs/NOTIFY.md
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_ACC_TG_SECRET = 'phoenix_acc_tg_secret';

/** رمزِ وبهوک — اگر نیست یا کوتاه است، تازه */
function phoenix_acc_tg_secret() {
    $secret = (string) get_option(PHOENIX_ACC_TG_SECRET, '');
    if (strlen($secret) < 32) {
        $secret = bin2hex(random_bytes(24));
        update_option(PHOENIX_ACC_TG_SECRET, $secret, false);
    }
    return $secret;
}

/** تنظیماتِ ربات — از اعلان‌ها */
function phoenix_acc_tg_conf() {
    return function_exists('phoenix_acc_notify_settings') ? phoenix_acc_notify_settings() : phoenix_acc_notify_defaults();
}

function phoenix_acc_tg_token() {
    $slug = (string) (phoenix_acc_tg_conf()['tg_conn'] ?? '');
    $conn = $slug !== '' && function_exists('phoenix_conn_runtime') ? phoenix_conn_runtime($slug) : null;
    return $conn ? trim((string) $conn['key']) : '';
}

function phoenix_acc_tg_redact($text, $token) {
    return $token === '' ? (string) $text : str_replace($token, '***', (string) $text);
}

/**
 * یک فراخوانیِ Bot API — نتیجه، یا ‎WP_Error‎ با پیامِ بی‌توکن.
 *
 * @param string|null $token ‎null‎ = رباتِ اعلان‌ها
 */
function phoenix_acc_tg_call($method, array $params = array(), $token = null) {
    $token = $token === null ? phoenix_acc_tg_token() : trim((string) $token);
    if (!preg_match('/^\d{5,16}:[A-Za-z0-9_-]{30,80}$/', $token)) {
        return new WP_Error('phoenix_acc_tg_token', 'توکنِ ربات تنظیم نشده یا شکلش درست نیست.');
    }
    $req  = phoenix_acc_tg_request((string) (phoenix_acc_tg_conf()['tg_api'] ?? ''), $token, $method, $params);
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
   وبهوک
   ============================================================ */

add_action('rest_api_init', 'phoenix_acc_tg_routes');
function phoenix_acc_tg_routes() {
    register_rest_route(PHOENIX_ACC_NS, '/tg/hook', array(
        'methods'             => 'POST',
        'callback'            => 'phoenix_acc_tg_hook',
        'permission_callback' => 'phoenix_acc_tg_hook_permission',
    ));
    phoenix_api_route('/account/notify/bot', 'GET', 'phoenix_acc_admin_tg_get');
    phoenix_api_route('/account/notify/bot', 'POST', 'phoenix_acc_admin_tg_act', array(
        'act' => array('type' => 'string', 'enum' => array('connect', 'disconnect'), 'required' => true),
    ));
}

function phoenix_acc_tg_hook_permission(WP_REST_Request $r) {
    $secret = (string) get_option(PHOENIX_ACC_TG_SECRET, '');
    $got    = (string) $r->get_header('X-Telegram-Bot-Api-Secret-Token');
    if ($secret === '' || $got === '' || !hash_equals($secret, $got)) {
        return new WP_Error('phoenix_acc_tg_forbidden', 'forbidden', array('status' => 403));
    }
    return true;
}

const PHOENIX_ACC_TG_ONLY_NOTIFY = 'این ربات فقط اعلان‌های داخلیِ فونیکس شاپ را برای مدیران می‌فرستد. برای خرید و پشتیبانی لطفاً به سایت مراجعه کنید.';

/** همیشه ۲۰۰ — وگرنه تلگرام همان پیام را بارها دوباره می‌فرستد */
function phoenix_acc_tg_hook(WP_REST_Request $r) {
    $raw = (array) $r->get_json_params();
    if (function_exists('phoenix_acc_notify_catch') && phoenix_acc_notify_catch($raw)) {
        return rest_ensure_response(array('ok' => true));
    }
    /* کسِ دیگری ربات را باز کرده: یک جمله، فقط در گفتگوی خصوصی و فقط
       برای ‎/start‎ — در گروه‌ها ساکت، و به هر پیامی جواب نمی‌دهد */
    $m = isset($raw['message']) && is_array($raw['message']) ? $raw['message'] : null;
    if ($m && ($m['chat']['type'] ?? '') === 'private' && preg_match('#^/start(\s|$)#', (string) ($m['text'] ?? ''))) {
        phoenix_acc_tg_call('sendMessage', array('chat_id' => (int) $m['chat']['id'], 'text' => PHOENIX_ACC_TG_ONLY_NOTIFY));
    }
    return rest_ensure_response(array('ok' => true));
}

/* ============================================================
   پنل — وصل کردنِ رباتِ اعلان
   ============================================================ */

function phoenix_acc_tg_default_hook() {
    return rest_url(PHOENIX_ACC_NS . '/tg/hook');
}

function phoenix_acc_admin_tg_status() {
    $s    = phoenix_acc_tg_conf();
    $info = phoenix_acc_tg_call('getWebhookInfo');
    return array(
        'bot'      => (string) ($s['tg_bot'] ?? ''),
        'expected' => (string) (($s['tg_hook'] ?? '') ?: phoenix_acc_tg_default_hook()),
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

/**
 * ⚠ «وصل کردن» وبهوکِ ربات را روی همین سایت می‌گذارد. رباتی که برنامه‌ی
 *   خودش را دارد (مثلاً رباتِ فروش) را وصل نکنید — از کار می‌افتد؛ برای
 *   آن فقط توکن را انتخاب کنید و گیرنده‌ها را دستی بنویسید.
 */
function phoenix_acc_admin_tg_act(WP_REST_Request $r) {
    $s = phoenix_acc_tg_conf();
    if ((string) $r['act'] === 'disconnect') {
        $d = phoenix_acc_tg_call('deleteWebhook', array('drop_pending_updates' => true));
        if (is_wp_error($d)) {
            return phoenix_api_fail('phoenix_acc_tg', $d->get_error_message(), 502);
        }
        phoenix_acc_notify_save(array_merge($s, array('tg_bot' => '')));
        phoenix_audit('setting', 'account.notify', null, 'off', 'وبهوکِ رباتِ اعلان برداشته شد');
        return phoenix_api_ok(phoenix_acc_admin_tg_status());
    }
    $me = phoenix_acc_tg_call('getMe');
    if (is_wp_error($me)) {
        return phoenix_api_fail('phoenix_acc_tg', $me->get_error_message(), 502);
    }
    $set = phoenix_acc_tg_call('setWebhook', array(
        'url'                  => (string) (($s['tg_hook'] ?? '') ?: phoenix_acc_tg_default_hook()),
        'secret_token'         => phoenix_acc_tg_secret(),
        'allowed_updates'      => array('message', 'channel_post'), // کانال: برای کدِ اتصال
        'drop_pending_updates' => true,
        'max_connections'      => 10,
    ));
    if (is_wp_error($set)) {
        return phoenix_api_fail('phoenix_acc_tg', $set->get_error_message(), 502);
    }
    $bot = preg_replace('/[^A-Za-z0-9_]/', '', (string) ($me['username'] ?? ''));
    phoenix_acc_notify_save(array_merge($s, array('tg_bot' => $bot)));
    phoenix_audit('setting', 'account.notify', null, '@' . $bot, 'رباتِ اعلان وصل شد');
    return phoenix_api_ok(phoenix_acc_admin_tg_status());
}
