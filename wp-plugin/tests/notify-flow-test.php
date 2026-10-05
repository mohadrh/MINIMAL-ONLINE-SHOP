<?php
/**
 * تستِ جریانِ اعلان‌ها — خودِ includes/notify.php و telegram.php، روی
 * وردپرس، ووکامرس، تلگرام و APIِ ساختگی.
 *
 * اجرا:  php wp-plugin/tests/notify-flow-test.php
 */

define('ABSPATH', __DIR__);
define('MINUTE_IN_SECONDS', 60);
const PHOENIX_ACC_NS = 'phoenix-account/v1';

/* ---------- وردپرسِ ساختگی ---------- */
$GLOBALS['opts'] = array();
$GLOBALS['tr'] = array();
$GLOBALS['http'] = array();     // هر درخواستِ بیرونی
$GLOBALS['tg_reply'] = array(); // chat_id => پاسخِ ساختگیِ تلگرام
$GLOBALS['hook_status'] = 200;
$GLOBALS['net_down'] = false;
$GLOBALS['lock_ok'] = true;
$GLOBALS['cron'] = array();
$GLOBALS['actions'] = array();
$GLOBALS['now'] = time();

function add_action($h, $cb) { $GLOBALS['actions'][$h][] = $cb; }
function has_action($h, $cb) { return in_array($cb, $GLOBALS['actions'][$h] ?? array(), true); }
function add_filter() {}
function register_rest_route() {}
function phoenix_api_route() {}
function rest_url($p) { return 'https://panel.example/wp-json/' . $p; }
function admin_url($p) { return 'https://panel.example/wp-admin/' . $p; }
function home_url() { return 'https://panel.example'; }
function wp_parse_url($u, $c) { return parse_url($u, $c); }
function wp_json_encode($v, $f = 0) { return json_encode($v, $f); }
function get_option($k, $d = false) { return array_key_exists($k, $GLOBALS['opts']) ? $GLOBALS['opts'][$k] : $d; }
function update_option($k, $v, $a = null) { $GLOBALS['opts'][$k] = $v; }
function get_transient($k) { return $GLOBALS['tr'][$k] ?? false; }
function set_transient($k, $v) { $GLOBALS['tr'][$k] = $v; }
function delete_transient($k) { unset($GLOBALS['tr'][$k]); }
function wp_next_scheduled($h, $a = array()) { return $GLOBALS['cron'][$h . json_encode($a)] ?? false; }
function wp_schedule_single_event($t, $h, $a = array()) { $GLOBALS['cron'][$h . json_encode($a)] = $t; }
function wp_schedule_event() {}
function get_current_user_id() { return 1; }
function phoenix_audit() {}
function phoenix_api_ok($d) { return $d; }
function phoenix_api_fail($c, $m, $s) { return new WP_Error($c, $m, array('status' => $s)); }
function rest_ensure_response($x) { return $x; }
function phoenix_secret_encrypt($s) { return 'enc:' . base64_encode($s); }
function phoenix_secret_decrypt($s) { return strpos($s, 'enc:') === 0 ? base64_decode(substr($s, 4)) : null; }
function phoenix_conn_runtime($slug) {
    $keys = array('k_login' => '111111111:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsawQ', 'k_notify' => '222222222:BBHdqTcvCH1vGWJxfSeofSAs0K5PALDsawQ');
    return isset($keys[$slug]) ? array('key' => $keys[$slug]) : null;
}
function phoenix_connections() { return array('k_login' => array('label' => 'ورود'), 'k_notify' => array('label' => 'اعلان')); }
function phoenix_conn_key_state() { return 'ok'; }
function phoenix_acc_setting($k) { return $GLOBALS['opts']['acc'][$k] ?? null; }
function phoenix_acc_settings_save(array $d) { $GLOBALS['opts']['acc'] = array_merge($GLOBALS['opts']['acc'], $d); }
function phoenix_acc_sms_log() {}
function phoenix_acc_table_tg() { return 'tg'; }
function phoenix_acc_table_notify() { return 'wp_notify'; }
function phoenix_db_lock($n, $w = 5) { return $GLOBALS['lock_ok']; }
function phoenix_db_unlock($n) {}

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

/** تلگرام و APIِ ساختگی */
function wp_safe_remote_post($url, $args) {
    if ($GLOBALS['net_down']) {
        return new WP_Error('http', 'cURL error 28: timed out');
    }
    $GLOBALS['http'][] = array('url' => $url, 'args' => $args);
    if (preg_match('#^https://api\.telegram\.org/bot([^/]+)/(\w+)$#', $url, $m)) {
        $body = json_decode($args['body'], true);
        $r = $GLOBALS['tg_reply'][(string) ($body['chat_id'] ?? '')] ?? '{"ok":true,"result":{"message_id":1}}';
        return array('code' => 200, 'body' => $r);
    }
    return array('code' => $GLOBALS['hook_status'], 'body' => 'ok');
}
function wp_remote_retrieve_body($r) { return $r['body']; }
function wp_remote_retrieve_response_code($r) { return $r['code']; }

/** صندوقِ خروجی در حافظه — فقط پرس‌وجوهای notify.php */
class FakeDb {
    public $rows = array();
    public $next = 1;
    public function prepare($q, ...$a) {
        foreach ($a as $v) { $q = preg_replace('/%[sd]/', is_int($v) ? (string) $v : "'" . str_replace("'", "''", (string) $v) . "'", $q, 1); }
        return $q;
    }
    public function query($q) {
        if (preg_match("/INSERT IGNORE INTO wp_notify .* VALUES \('([^']*)', '([^']*)', '([^']*)', '((?:[^']|'')*)', 'pending', 0, '([^']*)', '([^']*)'\)/s", $q, $m)) {
            foreach ($this->rows as $r) { if ($r->event === $m[1] && $r->ref === $m[2] && $r->dest === $m[3]) return 0; }
            $this->rows[$this->next] = (object) array('id' => $this->next, 'event' => $m[1], 'ref' => $m[2], 'dest' => $m[3],
                'payload' => str_replace("''", "'", $m[4]), 'status' => 'pending', 'tries' => 0, 'next_at' => $m[5], 'created_at' => $m[6], 'sent_at' => null, 'error' => '');
            $this->next++;
            return 1;
        }
        return 0;
    }
    public function get_results($q) {
        if (strpos($q, "status = 'pending' AND next_at <=") !== false) {
            preg_match("/next_at <= '([^']+)'/", $q, $m);
            return array_values(array_filter($this->rows, function ($r) use ($m) { return $r->status === 'pending' && $r->next_at <= $m[1]; }));
        }
        return array_reverse(array_values($this->rows));
    }
    public function get_var($q) { return count(array_filter($this->rows, function ($r) { return $r->status === 'failed'; })); }
    public function get_row() { return null; }
    public function update($t, $set, $where) {
        $r = $this->rows[$where['id']] ?? null;
        if (!$r || (isset($where['status']) && $r->status !== $where['status'])) return 0;
        foreach ($set as $k => $v) { $r->$k = $v; }
        return 1;
    }
}
$GLOBALS['wpdb'] = new FakeDb();

/** ووکامرسِ ساختگی */
class FakeOrder {
    public $id; public function __construct($id) { $this->id = $id; }
    public function get_id() { return $this->id; }
    public function get_currency() { return 'IRT'; }
}
function wc_get_order($id) { if ($id === 666) throw new RuntimeException('پایگاه داده رفت'); return new FakeOrder($id); }
function phoenix_order_view($order, $reveal) {
    return array('id' => $order->get_id(), 'number' => (string) $order->get_id(), 'status' => 'processing', 'total' => 520000,
        'payment' => array('method' => 'زرین‌پال', 'transaction_id' => 'T-1', 'is_paid' => true),
        'customer' => array('name' => 'علی', 'phone' => '09121234567', 'email' => 'a@b.co'),
        'items' => array(array('item_id' => 1, 'name' => 'اسپاتیفای', 'qty' => 1, 'total' => 520000,
            'inputs' => array(array('key' => 'ایمیل', 'value' => 'x@y.z'), array('key' => 'رمز', 'value' => 'hunter2')),
            'deliveries' => array(array('secret' => 'CODE')), 'stock_codes' => array('S1'))));
}

require_once __DIR__ . '/../phoenix-account/includes/core.php';
require_once __DIR__ . '/../phoenix-account/includes/telegram.php';
require_once __DIR__ . '/../phoenix-account/includes/notify.php';

/* از ۰٫۹٫۰ کدِ ورود به تلگرام نمی‌رود؛ ربات فقط مالِ اعلان‌هاست */
$GLOBALS['opts']['acc'] = array('sms_provider' => 'off');
$GLOBALS['opts'][PHOENIX_ACC_TG_SECRET] = str_repeat('ab', 24);

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;
function is_same($label, $got, $want) {
    if ($got === $want) { $GLOBALS['pass']++; printf("  ok    %s\n", $label); return; }
    $GLOBALS['fail']++;
    printf("  FAIL  %s\n        got  %s\n        want %s\n", $label, json_encode($got, JSON_UNESCAPED_UNICODE), json_encode($want, JSON_UNESCAPED_UNICODE));
}
function section($t) { echo "\n== {$t} ==\n"; }
function rows() { return array_values($GLOBALS['wpdb']->rows); }
function by_dest($d) { foreach (rows() as $r) { if ($r->dest === $d) return $r; } return null; }
function sent_tg() { return array_values(array_filter($GLOBALS['http'], function ($h) { return strpos($h['url'], 'api.telegram.org') !== false; })); }
/** ذخیره مثلِ پنل؛ رباتِ ‎k_login‎ «وصل‌شده» فرض می‌شود (وبهوکش این‌جاست) */
function save(array $in) {
    $in += array('tg_conn' => 'k_login');
    $c = phoenix_acc_notify_clean($in, array('k_login', 'k_notify'));
    $c['data']['tg_bot'] = $c['data']['tg_conn'] === 'k_login' ? 'PhoenixShopBot' : '';
    phoenix_acc_notify_save($c['data']);
    return $c;
}
function run_due() { foreach ($GLOBALS['wpdb']->rows as $r) { if ($r->status === 'pending') $r->next_at = '2000-01-01 00:00:00'; } phoenix_acc_notify_run(); }

/* ============================================================ */
section('خاموش');
phoenix_acc_notify_on_paid(10);
is_same('اعلان خاموش → هیچ ردیفی', count(rows()), 0);

section('صف، بی‌تکرار');
save(array('on' => true, 'tg_chats' => array(array('id' => '5550001', 'title' => 'من'), array('id' => '-100777', 'title' => 'گروه')),
    'hook_on' => true, 'hook_url' => 'https://bot.example/phoenix', 'show_inputs' => true));
phoenix_acc_notify_on_paid(10, new FakeOrder(10));
phoenix_acc_notify_on_paid(10, new FakeOrder(10)); // «تکمیل‌شده» پس از «در حال انجام»
is_same('سه گیرنده، یک بار', array_column(array_map('get_object_vars', rows()), 'dest'), array('tg:5550001', 'tg:-100777', 'hook'));
is_same('هیچ پیامی در همان درخواست نرفت (پس‌زمینه)', count($GLOBALS['http']), 0);
is_same('اجرای پس‌زمینه زمان‌بندی شد', (bool) wp_next_scheduled(PHOENIX_ACC_NOTIFY_RUN, array('now')), true);
$p = json_decode(rows()[0]->payload, true);
is_same('صندوق: رازِ تحویل نیست، رمز پوشیده', array(isset($p['items'][0]['deliveries']), isset($p['items'][0]['stock_codes']), $p['items'][0]['inputs'][1]['value']), array(false, false, '••••••'));
phoenix_acc_notify_on_hold(10, new FakeOrder(10));
is_same('رویدادِ دیگرِ همان سفارش (منتظرِ تأیید) جدا', count(rows()), 6);

section('فرستادن');
$GLOBALS['tg_reply']['-100777'] = '{"ok":false,"error_code":403,"description":"Forbidden: bot was kicked from the supergroup chat"}';
$GLOBALS['hook_status'] = 503;
run_due();
is_same('تلگرامِ من: رسید', by_dest('tg:5550001')->status, 'sent');
is_same('گروهی که ربات از آن بیرون شده: همان بار ناموفق، با دلیل', array(by_dest('tg:-100777')->status, strpos(by_dest('tg:-100777')->error, 'kicked') !== false), array('failed', true));
$h = by_dest('hook');
is_same('API ۵۰۳: دوباره، یک دقیقه بعد', array($h->status, $h->tries, strtotime($h->next_at . ' UTC') >= time() + 55), array('pending', 1, true));
$tg = sent_tg();
$msg = json_decode($tg[0]['args']['body'], true);
is_same('پیام: HTML، بی‌پیش‌نمایش، با جزئیات و پیوند', array($msg['parse_mode'], $msg['disable_web_page_preview'], strpos($msg['text'], 'اسپاتیفای') !== false, strpos($msg['text'], 'hunter2'), strpos($msg['text'], 'باز کردن در پنل') !== false), array('HTML', true, true, false, true));
is_same('با توکنِ رباتِ اعلان', strpos($tg[0]['url'], '/bot111111111:') !== false, true);

phoenix_acc_notify_run(); // هنوز وقتش نشده
is_same('پیش از موعد دوباره فرستاده نشد', by_dest('hook')->tries, 1);

$GLOBALS['hook_status'] = 200;
$GLOBALS['http'] = array();
run_due();
$hooks = array_values(array_filter($GLOBALS['http'], function ($x) { return strpos($x['url'], 'bot.example') !== false; }));
is_same('API: رسید', by_dest('hook')->status, 'sent');
$hd = $hooks[0]['args']['headers'];
$body = $hooks[0]['args']['body'];
is_same('امضای درست (زمان.بدنه)', $hd['X-Phoenix-Signature'], 'sha256=' . hash_hmac('sha256', $hd['X-Phoenix-Timestamp'] . '.' . $body, phoenix_acc_notify_secret()));
$b = json_decode($body, true);
is_same('بدنه‌ی API', array($b['event'], $hd['X-Phoenix-Event'], $b['data']['number'], $b['site'], isset($b['data']['items'][0]['deliveries'])), array('order_paid', 'order_paid', '10', 'panel.example', false));
is_same('بی‌دنبال‌کردنِ تغییرِ مسیر', $hooks[0]['args']['redirection'], 0);

section('تلاشِ دوباره، ۴۲۹، شبکه');
$GLOBALS['wpdb']->rows = array();
save(array('on' => true, 'tg_chats' => array(array('id' => '5550001'))));
$GLOBALS['tg_reply']['5550001'] = '{"ok":false,"error_code":429,"description":"Too Many Requests: retry after 120"}';
phoenix_acc_notify_on_paid(11, new FakeOrder(11));
run_due();
is_same('۴۲۹: دست‌کم همان retry_after', strtotime(by_dest('tg:5550001')->next_at . ' UTC') >= time() + 120, true);
unset($GLOBALS['tg_reply']['5550001']);
$GLOBALS['net_down'] = true;
for ($k = 0; $k < 7; $k++) { run_due(); }
$GLOBALS['net_down'] = false;
is_same('شش بار شکستِ شبکه → ناموفق، نه بی‌پایان', array(by_dest('tg:5550001')->status, by_dest('tg:5550001')->tries), array('failed', 6));
$res = phoenix_acc_admin_notify_act(new Req(array('act' => 'retry', 'id' => by_dest('tg:5550001')->id)));
is_same('«دوباره» از پنل → در صف، شمارش از صفر', array(by_dest('tg:5550001')->status, by_dest('tg:5550001')->tries), array('pending', 0));
run_due();
is_same('و رسید', by_dest('tg:5550001')->status, 'sent');

section('قفل و خطا');
$GLOBALS['wpdb']->rows = array();
phoenix_acc_notify_on_paid(12, new FakeOrder(12));
$GLOBALS['lock_ok'] = false;
$GLOBALS['http'] = array();
run_due();
is_same('اجرای دیگری در کار است → این یکی دست نمی‌زند', array(count($GLOBALS['http']), by_dest('tg:5550001')->status), array(0, 'pending'));
$GLOBALS['lock_ok'] = true;
phoenix_acc_notify_on_paid(666);
is_same('خطا در اعلان به پرداخت نمی‌رسد (بی‌استثنا)', true, true);
save(array('on' => true, 'tg_chats' => array(array('id' => '5550001')), 'events' => array('order_paid' => false)));
$before = count(rows());
phoenix_acc_notify_on_paid(13, new FakeOrder(13));
is_same('رویدادِ خاموش → هیچ', count(rows()), $before);

section('رباتِ جدا برای اعلان');
$GLOBALS['wpdb']->rows = array();
$GLOBALS['http'] = array();
save(array('on' => true, 'tg_conn' => 'k_notify', 'tg_chats' => array(array('id' => '5550001'))));
phoenix_acc_notify_on_paid(14, new FakeOrder(14));
run_due();
is_same('با توکنِ رباتِ اعلان', strpos(sent_tg()[0]['url'], '/bot222222222:') !== false, true);
is_same('اتصال با کد برای رباتِ دیگر نیست', phoenix_acc_notify_can_link(phoenix_acc_notify_settings()), false);

section('اتصالِ گفتگو با کد');
save(array('on' => true, 'tg_chats' => array()));
is_same('بی‌کدِ منتظر: پیامِ عادی', phoenix_acc_notify_catch(array('message' => array('chat' => array('id' => 1, 'type' => 'private'), 'text' => '/start'))), false);
$r = phoenix_acc_admin_notify_act(new Req(array('act' => 'link')));
$code = $r['link']['code'];
is_same('کد و پیوند', array((bool) preg_match('/^ph_[a-z0-9]{10}$/', $code), $r['link']['url'], $r['link']['group']), array(true, 'https://t.me/PhoenixShopBot?start=' . $code, '/start@PhoenixShopBot ' . $code));
$GLOBALS['http'] = array();
$hook = phoenix_acc_tg_hook(new Req(array('message' => array('chat' => array('id' => -1009876543210, 'type' => 'supergroup', 'title' => 'فروش'), 'from' => array('id' => 5), 'text' => '/start@PhoenixShopBot ' . $code)), str_repeat('ab', 24)));
is_same('گروه از راهِ وبهوکِ ربات اضافه شد', phoenix_acc_notify_settings()['tg_chats'], array(array('id' => '-1009876543210', 'title' => 'فروش')));
is_same('ربات در همان گروه تأیید کرد', json_decode(sent_tg()[0]['args']['body'], true)['chat_id'], '-1009876543210');
is_same('کد یک‌بارمصرف', phoenix_acc_notify_catch(array('message' => array('chat' => array('id' => 9, 'type' => 'private'), 'text' => '/start ' . $code))), false);
$GLOBALS['opts']['phoenix_acc_notify']['tg_bot'] = '';
is_same('رباتِ وصل‌نشده (مثلاً رباتِ فروش): اتصال با کد نه', phoenix_acc_admin_notify_act(new Req(array('act' => 'link'))) instanceof WP_Error, true);
$GLOBALS['opts']['phoenix_acc_notify']['tg_bot'] = 'PhoenixShopBot';

section('ارسالِ آزمایشی');
$GLOBALS['wpdb']->rows = array();
save(array('on' => false, 'tg_chats' => array(array('id' => '5550001'), array('id' => '-100777'))));
$r = phoenix_acc_admin_notify_act(new Req(array('act' => 'test')));
is_same('حتی خاموش: نتیجه‌ی هر گیرنده، بی‌صندوق', array(array_column($r['test'], 'ok'), count(rows())), array(array(true, false), 0));
$GLOBALS['tr'] = array();
save(array('on' => true));
is_same('بی‌گیرنده: خطای روشن', phoenix_acc_admin_notify_act(new Req(array('act' => 'test'))) instanceof WP_Error, true);

printf("\n%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] ? 1 : 0);
