<?php
/**
 * تستِ جریانِ کدِ ورود با تلگرام — خودِ ‎includes/telegram.php‎، روی
 * وردپرس و تلگرامِ ساختگی.
 *
 *   ۱ کد پیش از وصل شدن → منتظر می‌ماند، پیامی نمی‌رود
 *   ۲ مخاطبِ کسِ دیگر → پیوند نمی‌خورد
 *   ۳ شماره‌ی خودش → پیوند، و کدِ منتظر همان‌جا می‌رسد
 *   ۴ کدِ بعدی مستقیم
 *   ۵ ربات بسته شده → پیوند برداشته، کد منتظر، «رسید» برای سایت
 *   ۶ تلگرام در دسترس نیست → ‎false‎ (Bridge خطا می‌دهد)
 *   ۷ وبهوک بی‌رمز یا با رمزِ غلط رد
 *
 * اجرا:  php wp-plugin/tests/telegram-flow-test.php
 */

define('ABSPATH', __DIR__);
define('MINUTE_IN_SECONDS', 60);
const PHOENIX_ACC_NS = 'phoenix-account/v1';

/* ---------- وردپرسِ ساختگی ---------- */
$GLOBALS['opts'] = array();
$GLOBALS['tr']   = array();
$GLOBALS['http'] = array();   // فراخوانی‌های تلگرام
$GLOBALS['net_down'] = false;
$GLOBALS['blocked']  = array();
$GLOBALS['smslog']   = array();

function add_action() {}
function add_filter() {}
function register_rest_route() {}
function phoenix_api_route() {}
function rest_url($p) { return 'https://panel.example/wp-json/' . $p; }
function get_option($k, $d = false) { return $GLOBALS['opts'][$k] ?? $d; }
function update_option($k, $v) { $GLOBALS['opts'][$k] = $v; }
function get_transient($k) { return $GLOBALS['tr'][$k] ?? false; }
function set_transient($k, $v) { $GLOBALS['tr'][$k] = $v; }
function delete_transient($k) { unset($GLOBALS['tr'][$k]); }
function phoenix_secret_encrypt($s) { return 'enc:' . base64_encode($s); }
function phoenix_secret_decrypt($s) { return strpos($s, 'enc:') === 0 ? base64_decode(substr($s, 4)) : null; }
function phoenix_conn_runtime($slug) { return $slug === 'k_bot' ? array('key' => '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsawQ') : null; }
function phoenix_acc_setting($k) { return $GLOBALS['opts']['acc'][$k] ?? null; }
function phoenix_acc_settings_save(array $d) { $GLOBALS['opts']['acc'] = array_merge($GLOBALS['opts']['acc'], $d); }
function phoenix_acc_sms_log($phone, $res) { $GLOBALS['smslog'][] = array($phone, $res['ok'], $res['note']); }
function phoenix_audit() {}
function phoenix_acc_table_tg() { return 'tg'; }

class WP_Error {
    private $c; private $m;
    public function __construct($c = '', $m = '', $d = null) { $this->c = $c; $this->m = $m; }
    public function get_error_code() { return $this->c; }
    public function get_error_message() { return $this->m; }
}
function is_wp_error($x) { return $x instanceof WP_Error; }

/** تلگرامِ ساختگی: هر درخواست ثبت می‌شود */
function wp_safe_remote_post($url, $args) {
    if ($GLOBALS['net_down']) {
        return new WP_Error('http', 'cURL error 28: Connection timed out after 8000 ms: ' . $url);
    }
    preg_match('#/bot[^/]+/(\w+)$#', $url, $m);
    $body = json_decode($args['body'], true);
    $GLOBALS['http'][] = array('method' => $m[1], 'body' => $body, 'url' => $url);
    if ($m[1] === 'sendMessage' && in_array((int) $body['chat_id'], $GLOBALS['blocked'], true)) {
        return array('code' => 403, 'body' => '{"ok":false,"description":"Forbidden: bot was blocked by the user"}');
    }
    return array('code' => 200, 'body' => '{"ok":true,"result":{"username":"PhoenixShopBot"}}');
}
function wp_remote_retrieve_body($r) { return $r['body']; }
function wp_remote_retrieve_response_code($r) { return $r['code']; }

/** پایگاه داده‌ی ساختگی — فقط همان پرس‌وجوهای جدولِ tg */
class FakeDb {
    public $rows = array(); // phone => row
    public function prepare($q, ...$a) {
        foreach ($a as $v) { $q = preg_replace('/%[sd]/', is_int($v) ? (string) $v : "'" . addslashes($v) . "'", $q, 1); }
        return $q;
    }
    public function get_var($q) {
        if (preg_match("/SELECT chat_id FROM tg WHERE phone = '(\d+)'/", $q, $m)) return isset($this->rows[$m[1]]) ? $this->rows[$m[1]]['chat_id'] : null;
        if (preg_match('/SELECT phone FROM tg WHERE chat_id = (-?\d+)/', $q, $m)) {
            foreach ($this->rows as $r) { if ($r['chat_id'] === (int) $m[1]) return $r['phone']; }
            return null;
        }
        if (strpos($q, 'COUNT(*)') !== false) return count($this->rows);
        return null;
    }
    public function delete($t, $where) {
        foreach ($this->rows as $p => $r) {
            if ((isset($where['chat_id']) && $r['chat_id'] === $where['chat_id']) || (isset($where['phone']) && $p === $where['phone'])) unset($this->rows[$p]);
        }
    }
    public function replace($t, $data) { $this->rows[$data['phone']] = $data; }
}
$GLOBALS['wpdb'] = new FakeDb();

require_once __DIR__ . '/../phoenix-account/includes/core.php';
require_once __DIR__ . '/../phoenix-account/includes/telegram.php';

$GLOBALS['opts']['acc'] = array('sms_provider' => 'telegram', 'sms_conn' => 'k_bot', 'tg_api' => '', 'tg_bot' => 'PhoenixShopBot');

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;
function is_same($label, $got, $want) {
    if ($got === $want) { $GLOBALS['pass']++; printf("  ok    %s\n", $label); return; }
    $GLOBALS['fail']++;
    printf("  FAIL  %s\n        got  %s\n        want %s\n", $label, json_encode($got, JSON_UNESCAPED_UNICODE), json_encode($want, JSON_UNESCAPED_UNICODE));
}
function sent() { return array_values(array_filter($GLOBALS['http'], function ($c) { return $c['method'] === 'sendMessage'; })); }
function reset_http() { $GLOBALS['http'] = array(); }

$P = '09121234567';
$me = array('id' => 555, 'type' => 'private');

echo "\n== ۱ پیش از وصل شدن ==\n";
is_same('«رسید» برای سایت', phoenix_acc_tg_send_code($P, '111111'), true);
is_same('هیچ پیامی نرفت', count(sent()), 0);
is_same('کد رمزنگاری‌شده منتظر است', strpos((string) get_transient(phoenix_acc_tg_pending_key($P)), 'enc:') === 0, true);

echo "\n== ۲ مخاطبِ کسِ دیگر ==\n";
reset_http();
phoenix_acc_tg_handle(phoenix_acc_tg_parse(array('message' => array('chat' => $me, 'from' => array('id' => 555),
    'contact' => array('phone_number' => '989121234567', 'user_id' => 999)))));
is_same('پیوند نخورد', $GLOBALS['wpdb']->rows, array());
is_same('پیامِ «فقط شماره‌ی خودتان»', sent()[0]['body']['text'], PHOENIX_ACC_TG_TEXT['not_own']);
is_same('کد هنوز منتظر است', get_transient(phoenix_acc_tg_pending_key($P)) !== false, true);

echo "\n== ۳ شماره‌ی خودش ==\n";
reset_http();
phoenix_acc_tg_handle(phoenix_acc_tg_parse(array('message' => array('chat' => $me, 'from' => array('id' => 555, 'username' => 'ali_r'),
    'contact' => array('phone_number' => '+989121234567', 'user_id' => 555)))));
is_same('پیوند خورد', $GLOBALS['wpdb']->rows[$P]['chat_id'] ?? null, 555);
$msgs = sent();
is_same('اول «تأیید شد»، بعد کد', array(count($msgs), $msgs[0]['body']['text']), array(2, PHOENIX_ACC_TG_TEXT['linked']));
is_same('کدِ منتظر رسید', strpos($msgs[1]['body']['text'], '111111') !== false, true);
is_same('کدِ محافظت‌شده (فوروارد نمی‌شود)', $msgs[1]['body']['protect_content'] ?? false, true);
is_same('کدِ منتظر پاک شد', get_transient(phoenix_acc_tg_pending_key($P)), false);

echo "\n== ۴ کدِ بعدی مستقیم ==\n";
reset_http();
is_same('رسید', phoenix_acc_tg_send_code($P, '222222'), true);
is_same('به همان گفتگو، با همان کد', array(sent()[0]['body']['chat_id'], strpos(sent()[0]['body']['text'], '222222') !== false), array(555, true));

echo "\n== ۵ ربات بسته شده ==\n";
$GLOBALS['blocked'] = array(555);
is_same('برای سایت «رسید» (راهنما: ربات را باز کنید)', phoenix_acc_tg_send_code($P, '333333'), true);
is_same('پیوند برداشته شد', isset($GLOBALS['wpdb']->rows[$P]), false);
is_same('کد منتظرِ بازکردنِ دوباره', phoenix_secret_decrypt((string) get_transient(phoenix_acc_tg_pending_key($P))), '333333');
$GLOBALS['blocked'] = array();

echo "\n== ۶ تلگرام در دسترس نیست ==\n";
phoenix_acc_tg_link($P, 555, 555, 'ali_r');
$GLOBALS['net_down'] = true;
is_same('false — Bridge خطا می‌دهد', phoenix_acc_tg_send_code($P, '444444'), false);
$last = end($GLOBALS['smslog']);
is_same('توکن در گزارش نیست', strpos($last[2], 'AAHdqTcv') === false, true);
$GLOBALS['net_down'] = false;

echo "\n== ۷ وبهوک ==\n";
class Req { public $h; public function __construct($h) { $this->h = $h; } public function get_header($k) { return $this->h; } }
class_alias('Req', 'WP_REST_Request');
is_same('بی‌رمزِ ثبت‌شده رد', is_wp_error(phoenix_acc_tg_hook_permission(new Req('x'))), true);
update_option(PHOENIX_ACC_TG_SECRET, str_repeat('ab', 24));
is_same('رمزِ غلط رد', is_wp_error(phoenix_acc_tg_hook_permission(new Req('wrong'))), true);
is_same('بی‌هدر رد', is_wp_error(phoenix_acc_tg_hook_permission(new Req(''))), true);
is_same('رمزِ درست', phoenix_acc_tg_hook_permission(new Req(str_repeat('ab', 24))), true);

echo "\n== ۸ پاسخِ «کد کجا رفت» ==\n";
is_same('تلگرام و نامِ ربات', phoenix_acc_tg_otp_extra(array(), $P), array('channel' => 'telegram', 'bot' => 'PhoenixShopBot'));
$GLOBALS['opts']['acc']['sms_provider'] = 'kavenegar';
is_same('سامانه‌ی دیگر: هیچ', phoenix_acc_tg_otp_extra(array(), $P), array());

printf("\n%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] ? 1 : 0);
