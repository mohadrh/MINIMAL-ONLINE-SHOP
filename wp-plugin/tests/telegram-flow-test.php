<?php
/**
 * تستِ رباتِ تلگرام — از ۰٫۹٫۰ فقط برای اعلان‌های مدیر.
 * خودِ includes/telegram.php و notify.php، روی وردپرس و تلگرامِ ساختگی.
 *
 *   ۱ توکن از تنظیماتِ اعلان؛ بی‌توکن خطای روشن، توکن در هیچ پیامی نیست
 *   ۲ «وصل کردن»: وبهوک با رمز و فقط پیام/کانال؛ نامِ ربات ذخیره
 *   ۳ وبهوک بی‌رمز یا با رمزِ غلط رد
 *   ۴ غریبه ربات را باز کند: یک جمله، فقط در گفتگوی خصوصی و فقط ‎/start‎
 *   ۵ جدا کردن
 *   ۶ مهاجرتِ یک‌باره از «کدِ ورود با تلگرام»: خاموش، ربات برای اعلان‌ها می‌ماند
 *   ۷ کدِ ورود دیگر به تلگرام نمی‌رود
 *
 * اجرا:  php wp-plugin/tests/telegram-flow-test.php
 */

define('ABSPATH', __DIR__);
define('MINUTE_IN_SECONDS', 60);
define('DAY_IN_SECONDS', 86400);
const PHOENIX_ACC_NS = 'phoenix-account/v1';
const PHOENIX_ACC_OPTION = 'phoenix_account_settings';

$GLOBALS['opts'] = array();
$GLOBALS['http'] = array();
$GLOBALS['net_down'] = false;
$GLOBALS['audit'] = array();

function add_action() {}
function add_filter() {}
function register_rest_route() {}
function phoenix_api_route() {}
function rest_url($p) { return 'https://panel.example/wp-json/' . $p; }
function get_option($k, $d = false) { return array_key_exists($k, $GLOBALS['opts']) ? $GLOBALS['opts'][$k] : $d; }
function update_option($k, $v, $a = null) { $GLOBALS['opts'][$k] = $v; }
function get_transient() { return false; }
function phoenix_conn_runtime($slug) { return $slug === 'k_bot' ? array('key' => '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsawQ') : null; }
function phoenix_acc_setting($k) { return $GLOBALS['opts'][PHOENIX_ACC_OPTION][$k] ?? null; }
function phoenix_audit($kind, $subject, $b, $a, $note = '') { $GLOBALS['audit'][] = $note; }
function phoenix_api_ok($d) { return $d; }
function phoenix_api_fail($c, $m, $s) { return new WP_Error($c, $m, array('status' => $s)); }
function rest_ensure_response($x) { return $x; }

class WP_Error {
    private $c; private $m;
    public function __construct($c = '', $m = '', $d = null) { $this->c = $c; $this->m = $m; }
    public function get_error_code() { return $this->c; }
    public function get_error_message() { return $this->m; }
}
function is_wp_error($x) { return $x instanceof WP_Error; }
class Req implements ArrayAccess {
    public $h; public $json;
    public function __construct($json = array(), $h = '') { $this->json = $json; $this->h = $h; }
    public function get_header($k) { return $this->h; }
    public function get_json_params() { return $this->json; }
    public function offsetExists($k): bool { return isset($this->json[$k]); }
    public function offsetGet($k): mixed { return $this->json[$k] ?? null; }
    public function offsetSet($k, $v): void {}
    public function offsetUnset($k): void {}
}
class_alias('Req', 'WP_REST_Request');

function wp_safe_remote_post($url, $args) {
    if ($GLOBALS['net_down']) {
        return new WP_Error('http', 'cURL error 28: timed out: ' . $url);
    }
    preg_match('#/bot[^/]+/(\w+)$#', $url, $m);
    $GLOBALS['http'][] = array('method' => $m[1], 'body' => json_decode($args['body'], true), 'url' => $url);
    $res = $m[1] === 'getMe' ? '{"ok":true,"result":{"username":"PhoenixNotifyBot"}}' : '{"ok":true,"result":true}';
    return array('code' => 200, 'body' => $res);
}
function wp_remote_retrieve_body($r) { return $r['body']; }
function wp_remote_retrieve_response_code($r) { return $r['code']; }

require_once __DIR__ . '/../phoenix-account/includes/core.php';
require_once __DIR__ . '/../phoenix-account/includes/telegram.php';
require_once __DIR__ . '/../phoenix-account/includes/notify.php';
require_once __DIR__ . '/../phoenix-account/includes/sms.php';

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;
function is_same($label, $got, $want) {
    if ($got === $want) { $GLOBALS['pass']++; printf("  ok    %s\n", $label); return; }
    $GLOBALS['fail']++;
    printf("  FAIL  %s\n        got  %s\n        want %s\n", $label, json_encode($got, JSON_UNESCAPED_UNICODE), json_encode($want, JSON_UNESCAPED_UNICODE));
}
function calls($method) { return array_values(array_filter($GLOBALS['http'], function ($c) use ($method) { return $c['method'] === $method; })); }
function notify_set(array $patch) { phoenix_acc_notify_save(array_merge(phoenix_acc_notify_settings(), $patch)); }

echo "\n== ۱ توکن ==\n";
$r = phoenix_acc_tg_call('getMe');
is_same('بی‌توکن: خطای روشن، بی‌تماس', array(is_wp_error($r) ? $r->get_error_code() : null, count($GLOBALS['http'])), array('phoenix_acc_tg_token', 0));
notify_set(array('tg_conn' => 'k_bot'));
is_same('با توکنِ اعلان‌ها', phoenix_acc_tg_call('getMe')['username'], 'PhoenixNotifyBot');
$GLOBALS['net_down'] = true;
$r = phoenix_acc_tg_call('getMe');
$GLOBALS['net_down'] = false;
is_same('خطای شبکه بی‌توکن', array($r->get_error_code(), strpos($r->get_error_message(), 'AAHdqTcv')), array('phoenix_acc_tg_net', false));
notify_set(array('tg_api' => 'https://relay.example.workers.dev'));
$GLOBALS['http'] = array();
phoenix_acc_tg_call('getMe');
is_same('از راهِ واسطه', strpos($GLOBALS['http'][0]['url'], 'https://relay.example.workers.dev/bot') === 0, true);
notify_set(array('tg_api' => ''));

echo "\n== ۲ وصل کردن ==\n";
$GLOBALS['http'] = array();
$st = phoenix_acc_admin_tg_act(new Req(array('act' => 'connect')));
$set = calls('setWebhook')[0]['body'] ?? array();
is_same('وبهوک روی همین سایت، با رمز، فقط پیام و کانال', array($set['url'] ?? null, strlen($set['secret_token'] ?? ''), $set['allowed_updates'] ?? null),
    array('https://panel.example/wp-json/phoenix-account/v1/tg/hook', 48, array('message', 'channel_post')));
is_same('نامِ ربات در تنظیماتِ اعلان', array(phoenix_acc_notify_settings()['tg_bot'], $st['bot']), array('PhoenixNotifyBot', 'PhoenixNotifyBot'));
is_same('اتصال با کد حالا ممکن', phoenix_acc_notify_can_link(phoenix_acc_notify_settings()), true);

echo "\n== ۳ وبهوک ==\n";
$secret = get_option(PHOENIX_ACC_TG_SECRET);
is_same('رمزِ غلط رد', is_wp_error(phoenix_acc_tg_hook_permission(new Req(array(), 'wrong'))), true);
is_same('بی‌هدر رد', is_wp_error(phoenix_acc_tg_hook_permission(new Req(array(), ''))), true);
is_same('رمزِ درست', phoenix_acc_tg_hook_permission(new Req(array(), $secret)), true);

echo "\n== ۴ غریبه ==\n";
$GLOBALS['http'] = array();
phoenix_acc_tg_hook(new Req(array('message' => array('chat' => array('id' => 777, 'type' => 'private'), 'from' => array('id' => 777), 'text' => '/start'))));
$s = calls('sendMessage');
is_same('یک جمله: فقط اعلانِ مدیر', array(count($s), $s[0]['body']['text'] ?? null), array(1, PHOENIX_ACC_TG_ONLY_NOTIFY));
$GLOBALS['http'] = array();
phoenix_acc_tg_hook(new Req(array('message' => array('chat' => array('id' => 777, 'type' => 'private'), 'from' => array('id' => 777), 'text' => 'سلام'))));
phoenix_acc_tg_hook(new Req(array('message' => array('chat' => array('id' => -100, 'type' => 'supergroup'), 'from' => array('id' => 1), 'text' => '/start'))));
phoenix_acc_tg_hook(new Req(array('message' => array('chat' => array('id' => 777, 'type' => 'private'), 'from' => array('id' => 777), 'contact' => array('phone_number' => '989121234567', 'user_id' => 777)))));
is_same('پیامِ آزاد، گروه، و شماره: بی‌جواب، بی‌پیوند', array(count($GLOBALS['http']), isset($GLOBALS['opts']['phoenix_acc_tgp_' . md5('09121234567')])), array(0, false));

echo "\n== ۵ جدا کردن ==\n";
$GLOBALS['http'] = array();
phoenix_acc_admin_tg_act(new Req(array('act' => 'disconnect')));
is_same('deleteWebhook و نامِ ربات پاک', array(count(calls('deleteWebhook')), phoenix_acc_notify_settings()['tg_bot']), array(1, ''));

echo "\n== ۶ مهاجرت ==\n";
$GLOBALS['opts'] = array(PHOENIX_ACC_OPTION => array('sms_provider' => 'telegram', 'sms_conn' => 'k_bot', 'tg_bot' => 'PhoenixShopBot', 'tg_mode' => 'own', 'tg_api' => 'https://relay.example.workers.dev', 'otp_email' => true));
is_same('یک بار انجام شد', phoenix_acc_notify_migrate_tg_login(), true);
$n = phoenix_acc_notify_settings();
is_same('همان ربات برای اعلان‌ها (توکن، نام، واسطه)', array($n['tg_conn'], $n['tg_bot'], $n['tg_api']), array('k_bot', 'PhoenixShopBot', 'https://relay.example.workers.dev'));
is_same('کدِ ورود خاموش، تنظیمِ دیگر سرِ جا', array($GLOBALS['opts'][PHOENIX_ACC_OPTION]['sms_provider'], $GLOBALS['opts'][PHOENIX_ACC_OPTION]['sms_conn'], $GLOBALS['opts'][PHOENIX_ACC_OPTION]['otp_email']), array('off', '', true));
is_same('در تاریخچه', end($GLOBALS['audit']), 'کدِ ورود دیگر به تلگرام نمی‌رود؛ ربات برای اعلان‌ها ماند');
is_same('بارِ دوم هیچ', phoenix_acc_notify_migrate_tg_login(), false);
$GLOBALS['opts'] = array(PHOENIX_ACC_OPTION => array('sms_provider' => 'telegram', 'sms_conn' => 'k_bot', 'tg_bot' => 'SalesBot', 'tg_mode' => 'shared'));
phoenix_acc_notify_migrate_tg_login();
is_same('رباتِ فروش (وبهوکِ خودش): توکن می‌ماند ولی «وصل» نه', array(phoenix_acc_notify_settings()['tg_conn'], phoenix_acc_notify_settings()['tg_bot']), array('k_bot', ''));
$GLOBALS['opts'] = array(PHOENIX_ACC_OPTION => array('sms_provider' => 'telegram', 'sms_conn' => 'k_bot'), 'phoenix_acc_notify' => array('tg_conn' => 'k_other', 'tg_bot' => 'OtherBot'));
phoenix_acc_notify_migrate_tg_login();
is_same('اعلان‌ها رباتِ خودش را داشت: دست نخورد', array(phoenix_acc_notify_settings()['tg_conn'], phoenix_acc_notify_settings()['tg_bot']), array('k_other', 'OtherBot'));

echo "\n== ۷ کدِ ورود ==\n";
$GLOBALS['http'] = array();
$GLOBALS['opts'][PHOENIX_ACC_OPTION] = array('sms_provider' => 'telegram', 'sms_conn' => 'k_bot'); // تنظیمِ کهنه پیش از مهاجرت
phoenix_acc_send_otp(null, '09121234567', '482913');
is_same('هیچ پیامی به تلگرام نرفت', count($GLOBALS['http']), 0);

printf("\n%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] ? 1 : 0);
