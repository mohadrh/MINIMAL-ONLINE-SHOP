<?php
/**
 * اعلان‌ها — هر خرید (و اگر خواستند تیکت و چت) با جزئیات در تلگرامِ
 * مدیر، و/یا با یک API امضاشده به برنامه‌ی خودشان.
 *
 * ============================================================
 * ⚠ اعلان هرگز پرداخت را کند یا خراب نمی‌کند
 *
 * قلابِ «پرداخت شد» وسطِ برگشت از درگاه اجرا می‌شود. اگر همان‌جا به
 * تلگرام پیام می‌دادیم، تلگرامِ کند یا فیلترشده یعنی مشتری‌ای که چند
 * ثانیه جلوی صفحه‌ی سفید منتظر مانده — یا بدتر، خطایی که برگشتِ درگاه
 * را می‌شکند. پس:
 *
 *   ۱ رویداد فقط یک ردیف در صندوقِ خروجی (جدولِ ‎phoenix_acc_notify‎)
 *     می‌شود — هر گیرنده یک ردیف، با کلیدِ یکتای (رویداد، شناسه، گیرنده)
 *     تا «در حال انجام» و «تکمیل‌شده»ی یک سفارش دو پیام نشوند.
 *   ۲ کارِ زمان‌بندی‌شده‌ی وردپرس همان لحظه، در پس‌زمینه، می‌فرستد.
 *   ۳ شکست → دوباره با فاصله‌ی بیشتر (۱ دقیقه تا ۳ ساعت، شش بار)؛ خطای
 *     همیشگی (ربات از گروه بیرون شده، نشانیِ API پیدا نمی‌شود) همان بار
 *     «ناموفق» و در پنل دیده می‌شود.
 *   ۴ هر قلاب در try است — خطای اعلان هیچ‌وقت به پرداخت نمی‌رسد.
 *
 * ⚠ حریمِ خصوصی: شماره و ایمیلِ مشتری قابلِ خاموش کردن؛ ورودی‌های
 *   سفارش پیش‌فرض خاموش، و ورودی‌ای که شبیهِ رمز است همیشه پوشیده.
 *   رازِ تحویل‌ها (کد، پسوردِ اکانت) هرگز در اعلان نیست.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_ACC_NOTIFY_OPTION = 'phoenix_acc_notify';
const PHOENIX_ACC_NOTIFY_SECRET = 'phoenix_acc_notify_secret';
const PHOENIX_ACC_NOTIFY_CODE   = 'phoenix_acc_notify_code';
const PHOENIX_ACC_NOTIFY_RUN    = 'phoenix_acc_notify_run';
const PHOENIX_ACC_NOTIFY_TICK   = 'phoenix_acc_notify_tick';

function phoenix_acc_notify_settings() {
    $d = phoenix_acc_notify_defaults();
    $s = get_option(PHOENIX_ACC_NOTIFY_OPTION);
    if (!is_array($s)) {
        return $d;
    }
    $out = array_merge($d, $s);
    $out['events'] = array_merge($d['events'], is_array($s['events'] ?? null) ? $s['events'] : array());
    return $out;
}

function phoenix_acc_notify_save(array $data) {
    update_option(PHOENIX_ACC_NOTIFY_OPTION, $data, false);
}

function phoenix_acc_notify_secret($fresh = false) {
    $s = (string) get_option(PHOENIX_ACC_NOTIFY_SECRET, '');
    if ($fresh || strlen($s) < 32) {
        $s = bin2hex(random_bytes(24));
        update_option(PHOENIX_ACC_NOTIFY_SECRET, $s, false);
    }
    return $s;
}

/** توکنِ رباتِ اعلان — از «اتصال‌ها» */
function phoenix_acc_notify_token(array $s) {
    $slug = (string) ($s['tg_conn'] ?? '');
    $conn = $slug !== '' && function_exists('phoenix_conn_runtime') ? phoenix_conn_runtime($slug) : null;
    return $conn ? trim((string) $conn['key']) : '';
}

/**
 * «اتصال با کد» فقط وقتی پیام‌های ربات به همین سایت می‌رسد — یعنی ربات
 * با «وصل کردن» وبهوکش را این‌جا گذاشته (‎tg_bot‎). رباتی که برنامه‌ی
 * خودش را دارد (رباتِ فروش) وصل نمی‌شود؛ آن‌جا شناسه دستی.
 */
function phoenix_acc_notify_can_link(array $s) {
    return ($s['tg_conn'] ?? '') !== '' && ($s['tg_bot'] ?? '') !== '';
}

/**
 * ⚠ یک‌باره، از نسخه‌های پیش از ۰٫۹٫۰: اگر کدِ ورود روی تلگرام بود، خاموش
 *   می‌شود (خواسته‌ی فروشگاه: کد دیگر به تلگرام نرود) و همان ربات —
 *   توکن، وبهوک، واسطه — برای اعلان‌ها می‌ماند، تا اعلان‌ها قطع نشوند.
 */
function phoenix_acc_notify_migrate_tg_login() {
    $acc = get_option(PHOENIX_ACC_OPTION);
    if (!is_array($acc) || ($acc['sms_provider'] ?? '') !== 'telegram') {
        return false;
    }
    $n = phoenix_acc_notify_settings();
    if ($n['tg_conn'] === '' && !empty($acc['sms_conn'])) {
        $n['tg_conn'] = (string) $acc['sms_conn'];
        if ($n['tg_bot'] === '' && ($acc['tg_mode'] ?? 'own') !== 'shared') {
            $n['tg_bot'] = (string) ($acc['tg_bot'] ?? ''); // وبهوکش همین‌جاست
        }
        foreach (array('tg_api', 'tg_hook') as $k) {
            if ($n[$k] === '' && !empty($acc[$k])) {
                $n[$k] = (string) $acc[$k];
            }
        }
        phoenix_acc_notify_save($n);
    }
    $acc['sms_provider'] = 'off';
    $acc['sms_conn']     = '';
    update_option(PHOENIX_ACC_OPTION, $acc, false);
    if (function_exists('phoenix_audit')) {
        phoenix_audit('setting', 'account.sms_provider', 'telegram', 'off', 'کدِ ورود دیگر به تلگرام نمی‌رود؛ ربات برای اعلان‌ها ماند');
    }
    return true;
}

/** گیرنده‌های فعلی — هر کدام یک ردیف در صندوق */
function phoenix_acc_notify_dests(array $s) {
    $out = array();
    if (empty($s['on'])) {
        return $out;
    }
    if (!empty($s['tg_on'])) {
        foreach ($s['tg_chats'] as $c) {
            $out[] = 'tg:' . $c['id'];
        }
    }
    if (!empty($s['hook_on']) && $s['hook_url'] !== '') {
        $out[] = 'hook';
    }
    return $out;
}

/* ============================================================
   صندوقِ خروجی
   ============================================================ */

/** @return int چند ردیفِ تازه (تکراری‌ها نادیده) */
function phoenix_acc_notify_enqueue($event, $ref, array $data) {
    global $wpdb;
    $s = phoenix_acc_notify_settings();
    if (empty($s['on']) || empty($s['events'][$event])) {
        return 0;
    }
    $dests = phoenix_acc_notify_dests($s);
    if (!$dests) {
        return 0;
    }
    $t       = phoenix_acc_table_notify();
    $payload = wp_json_encode(phoenix_acc_notify_shape($data, $s), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $now     = gmdate('Y-m-d H:i:s');
    $n = 0;
    foreach ($dests as $dest) {
        $n += (int) $wpdb->query($wpdb->prepare(
            "INSERT IGNORE INTO {$t} (event, ref, dest, payload, status, tries, next_at, created_at) VALUES (%s, %s, %s, %s, 'pending', 0, %s, %s)",
            $event, substr((string) $ref, 0, 80), $dest, $payload, $now, $now
        ));
    }
    if ($n) {
        phoenix_acc_notify_kick();
    }
    return $n;
}

/** همین حالا در پس‌زمینه — نه در همین درخواست */
function phoenix_acc_notify_kick() {
    if (!wp_next_scheduled(PHOENIX_ACC_NOTIFY_RUN, array('now'))) {
        wp_schedule_single_event(time(), PHOENIX_ACC_NOTIFY_RUN, array('now'));
    }
    /* هاستی که کرونِ وردپرس را خاموش کرده و کرونِ واقعی دارد: همان کافی است */
    if ((!defined('DISABLE_WP_CRON') || !DISABLE_WP_CRON) && !has_action('shutdown', 'spawn_cron')) {
        add_action('shutdown', 'spawn_cron');
    }
}

add_filter('cron_schedules', 'phoenix_acc_notify_schedules');
function phoenix_acc_notify_schedules($s) {
    $s['phoenix_5min'] = array('interval' => 300, 'display' => 'هر ۵ دقیقه (فونیکس)');
    return $s;
}

/* تلاش‌های دوباره را این برمی‌دارد، حتی اگر اجرای «همین حالا» گم شده باشد */
add_action('init', 'phoenix_acc_notify_ensure_tick');
function phoenix_acc_notify_ensure_tick() {
    $s = get_option(PHOENIX_ACC_NOTIFY_OPTION);
    if (is_array($s) && !empty($s['on']) && !wp_next_scheduled(PHOENIX_ACC_NOTIFY_TICK)) {
        wp_schedule_event(time() + 300, 'phoenix_5min', PHOENIX_ACC_NOTIFY_TICK);
    }
}

add_action(PHOENIX_ACC_NOTIFY_RUN, 'phoenix_acc_notify_run');
add_action(PHOENIX_ACC_NOTIFY_TICK, 'phoenix_acc_notify_run');
function phoenix_acc_notify_run() {
    global $wpdb;
    /* یک اجرا در هر لحظه — وگرنه یک پیام دو بار می‌رفت */
    if (!phoenix_db_lock('phoenix_acc_notify', 0)) {
        return;
    }
    try {
        $t  = phoenix_acc_table_notify();
        $t0 = microtime(true);
        do {
            $rows = (array) $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM {$t} WHERE status = 'pending' AND next_at <= %s ORDER BY id ASC LIMIT 20",
                gmdate('Y-m-d H:i:s')
            ));
            foreach ($rows as $row) {
                phoenix_acc_notify_deliver_row($row);
                if (microtime(true) - $t0 > 20) {
                    phoenix_acc_notify_kick(); // باقی در اجرای بعد
                    return;
                }
            }
        } while (count($rows) === 20);
    } finally {
        phoenix_db_unlock('phoenix_acc_notify');
    }
}

function phoenix_acc_notify_deliver_row($row) {
    global $wpdb;
    $data  = json_decode((string) $row->payload, true);
    $res   = phoenix_acc_notify_send((string) $row->dest, (string) $row->event, (int) $row->id, is_array($data) ? $data : array(), phoenix_acc_notify_settings());
    $tries = (int) $row->tries + 1;
    $set   = array('tries' => $tries, 'error' => substr((string) ($res['error'] ?? ''), 0, 255));
    if ($res['status'] === 'sent') {
        $set['status']  = 'sent';
        $set['sent_at'] = gmdate('Y-m-d H:i:s');
    } elseif ($res['status'] === 'retry' && $tries < PHOENIX_ACC_NOTIFY_MAX_TRIES) {
        $set['next_at'] = gmdate('Y-m-d H:i:s', time() + max((int) ($res['after'] ?? 0), phoenix_acc_notify_backoff($tries)));
    } else {
        $set['status'] = 'failed';
    }
    $wpdb->update(phoenix_acc_table_notify(), $set, array('id' => (int) $row->id));
    return $set;
}

/** @return array{status:string, after?:int, error?:string} */
function phoenix_acc_notify_send($dest, $event, $id, array $data, array $s) {
    if (strpos($dest, 'tg:') === 0) {
        $r = phoenix_acc_tg_call('sendMessage', array(
            'chat_id'                  => substr($dest, 3),
            'text'                     => phoenix_acc_notify_text($event, $data),
            'parse_mode'               => 'HTML',
            'disable_web_page_preview' => true,
        ), phoenix_acc_notify_token($s));
        if (!is_wp_error($r)) {
            return array('status' => 'sent');
        }
        $v = phoenix_acc_notify_tg_verdict($r->get_error_code(), $r->get_error_message());
        return array('status' => $v['retry'] ? 'retry' : 'failed', 'after' => $v['after'], 'error' => $r->get_error_message());
    }
    if ($dest === 'hook') {
        if (empty($s['hook_on']) || $s['hook_url'] === '') {
            return array('status' => 'failed', 'error' => 'API خاموش شد یا نشانی ندارد.');
        }
        $body = wp_json_encode(array(
            'event' => $event, 'delivery' => (int) $id, 'sent_at' => gmdate('c'),
            'site'  => (string) wp_parse_url(home_url(), PHP_URL_HOST), 'data' => $data,
        ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $ts   = time();
        $http = wp_safe_remote_post($s['hook_url'], array(
            'timeout'     => 10,
            'redirection' => 0,
            'headers'     => array(
                'Content-Type'        => 'application/json; charset=utf-8',
                'User-Agent'          => 'PhoenixShop-Notify/1',
                'X-Phoenix-Event'     => $event,
                'X-Phoenix-Delivery'  => (string) (int) $id,
                'X-Phoenix-Timestamp' => (string) $ts,
                'X-Phoenix-Signature' => phoenix_acc_notify_sign(phoenix_acc_notify_secret(), $ts, $body),
            ),
            'body'        => $body,
        ));
        $code = is_wp_error($http) ? 0 : (int) wp_remote_retrieve_response_code($http);
        $v    = phoenix_acc_notify_hook_verdict($code);
        return array('status' => $v, 'error' => $v === 'sent' ? '' : (is_wp_error($http) ? $http->get_error_message() : 'HTTP ' . $code));
    }
    return array('status' => 'failed', 'error' => 'گیرنده‌ی ناشناخته');
}

add_action('phoenix_daily', 'phoenix_acc_notify_prune');
function phoenix_acc_notify_prune() {
    global $wpdb;
    $t = phoenix_acc_table_notify();
    $wpdb->query("DELETE FROM {$t} WHERE status = 'sent' AND created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)");
    $wpdb->query("DELETE FROM {$t} WHERE created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 DAY)");
}

/* ============================================================
   رویدادها
   ============================================================ */

/** نشانیِ پنل — بی‌توابعِ ‎includes/admin‎ که در کرون و REST نیستند */
function phoenix_acc_notify_admin_url($world, $path) {
    return admin_url('admin.php?page=phoenix' . ($world !== '' ? '-' . $world : '') . '#/' . $path);
}

function phoenix_acc_notify_order_data($order) {
    $v = phoenix_order_view($order, false);
    $v['currency']  = (string) $order->get_currency();
    $v['admin_url'] = phoenix_acc_notify_admin_url('customers', 'orders/' . $order->get_id());
    return $v;
}

/** هر قلاب این‌جا می‌ماند — خطای اعلان هرگز به پرداخت یا ثبتِ سفارش نمی‌رسد */
function phoenix_acc_notify_safely($fn) {
    try {
        $fn();
    } catch (\Throwable $e) {
        if (function_exists('error_log')) {
            error_log('phoenix notify: ' . $e->getMessage());
        }
    }
}

add_action('woocommerce_order_status_processing', 'phoenix_acc_notify_on_paid', 20, 2);
add_action('woocommerce_order_status_completed', 'phoenix_acc_notify_on_paid', 20, 2);
function phoenix_acc_notify_on_paid($order_id, $order = null) {
    phoenix_acc_notify_safely(function () use ($order_id, $order) {
        $order = is_object($order) ? $order : wc_get_order($order_id);
        if ($order) {
            phoenix_acc_notify_enqueue('order_paid', 'order:' . $order->get_id(), phoenix_acc_notify_order_data($order));
        }
    });
}

add_action('woocommerce_order_status_on-hold', 'phoenix_acc_notify_on_hold', 20, 2);
function phoenix_acc_notify_on_hold($order_id, $order = null) {
    phoenix_acc_notify_safely(function () use ($order_id, $order) {
        $order = is_object($order) ? $order : wc_get_order($order_id);
        if ($order) {
            phoenix_acc_notify_enqueue('order_on_hold', 'order:' . $order->get_id(), phoenix_acc_notify_order_data($order));
        }
    });
}

add_action('phoenix_order_created', 'phoenix_acc_notify_on_new', 20, 1);
function phoenix_acc_notify_on_new($order) {
    phoenix_acc_notify_safely(function () use ($order) {
        if (is_object($order)) {
            phoenix_acc_notify_enqueue('order_new', 'order:' . $order->get_id(), phoenix_acc_notify_order_data($order));
        }
    });
}

add_action('phoenix_queue_input_fixed', 'phoenix_acc_notify_on_input_fixed', 20, 3);
function phoenix_acc_notify_on_input_fixed($job, $order, $item) {
    phoenix_acc_notify_safely(function () use ($job, $order, $item) {
        if (!is_object($order) || !is_object($job)) {
            return;
        }
        $d = phoenix_acc_notify_order_data($order);
        $d['item'] = is_object($item) ? $item->get_name() : '';
        $d['items'] = array_values(array_filter($d['items'], function ($it) use ($item) {
            return is_object($item) && (int) $it['item_id'] === (int) $item->get_id();
        }));
        $d['admin_url'] = phoenix_acc_notify_admin_url('', 'queue');
        phoenix_acc_notify_enqueue('input_fixed', 'job:' . (int) $job->id . ':' . time(), $d);
    });
}

add_action('phoenix_ticket_customer_wrote', 'phoenix_acc_notify_on_ticket', 20, 2);
function phoenix_acc_notify_on_ticket($id, $phone) {
    phoenix_acc_notify_safely(function () use ($id, $phone) {
        global $wpdb;
        $tk = phoenix_acc_table_tickets();
        $m  = phoenix_acc_table_messages();
        $t  = $wpdb->get_row($wpdb->prepare("SELECT id, subject FROM {$tk} WHERE id = %d", (int) $id));
        $msg = $wpdb->get_row($wpdb->prepare("SELECT id, body FROM {$m} WHERE ticket_id = %d AND author = 'customer' ORDER BY id DESC LIMIT 1", (int) $id));
        if (!$t) {
            return;
        }
        phoenix_acc_notify_enqueue('ticket', 'ticket:' . (int) $t->id . ':' . ($msg ? (int) $msg->id : 0), array(
            'ticket_id' => (int) $t->id, 'subject' => (string) $t->subject, 'phone' => (string) $phone,
            'excerpt'   => $msg ? phoenix_acc_text($msg->body, 300, true) : '',
            'admin_url' => phoenix_acc_notify_admin_url('customers', 'tickets/' . (int) $t->id),
        ));
    });
}

add_action('phoenix_chat_started', 'phoenix_acc_notify_on_chat', 20, 1);
function phoenix_acc_notify_on_chat($id) {
    phoenix_acc_notify_safely(function () use ($id) {
        global $wpdb;
        $c   = phoenix_acc_chat_row((int) $id);
        $cm  = phoenix_acc_table_chat_msgs();
        $msg = $wpdb->get_var($wpdb->prepare("SELECT body FROM {$cm} WHERE chat_id = %d AND author = 'visitor' ORDER BY id ASC LIMIT 1", (int) $id));
        if (!$c) {
            return;
        }
        phoenix_acc_notify_enqueue('chat', 'chat:' . (int) $c->id, array(
            'chat_id' => (int) $c->id, 'agent' => (string) $c->agent, 'phone' => (string) $c->phone,
            'page'    => (string) $c->page, 'excerpt' => phoenix_acc_text((string) $msg, 300, true),
            'admin_url' => phoenix_acc_notify_admin_url('customers', 'chat/' . (int) $c->id),
        ));
    });
}

/* ============================================================
   اتصالِ گفتگو با کد — از وبهوکِ رباتِ ورود (telegram.php)
   ============================================================ */

/** @return bool ‎true‎ یعنی این پیام کدِ اتصال بود و رسیدگی شد */
function phoenix_acc_notify_catch($update) {
    $pending = get_transient(PHOENIX_ACC_NOTIFY_CODE);
    if (!is_array($pending) || empty($pending['code'])) {
        return false;
    }
    $c = phoenix_acc_notify_find_code($update, (string) $pending['code']);
    if (!$c) {
        return false;
    }
    delete_transient(PHOENIX_ACC_NOTIFY_CODE); // یک‌بارمصرف
    $s = phoenix_acc_notify_settings();
    if (!phoenix_acc_notify_can_link($s)) {
        return true;
    }
    $ids = array_column($s['tg_chats'], 'id');
    if (!in_array($c['id'], $ids, true) && count($ids) < PHOENIX_ACC_NOTIFY_MAX_CHATS) {
        $s['tg_chats'][] = array('id' => $c['id'], 'title' => $c['title']);
        phoenix_acc_notify_save($s);
        phoenix_audit('setting', 'account.notify', null, $c['title'] !== '' ? $c['title'] : $c['id'], 'گیرنده‌ی اعلان با کد اضافه شد');
    }
    phoenix_acc_tg_call('sendMessage', array(
        'chat_id' => $c['id'],
        'text'    => 'این گفتگو برای اعلان‌های فونیکس شاپ ثبت شد. از این پس سفارش‌های تازه همین‌جا می‌آید.',
    ));
    return true;
}

/* ============================================================
   پنل
   ============================================================ */

add_action('rest_api_init', 'phoenix_acc_notify_routes');
function phoenix_acc_notify_routes() {
    phoenix_api_route('/account/notify', 'GET', 'phoenix_acc_admin_notify_get');
    phoenix_api_route('/account/notify', 'POST', 'phoenix_acc_admin_notify_save');
    phoenix_api_route('/account/notify/act', 'POST', 'phoenix_acc_admin_notify_act', array(
        'act' => array('type' => 'string', 'enum' => array('link', 'test', 'retry', 'secret'), 'required' => true),
        'id'  => array('type' => 'integer', 'default' => 0),
    ));
}

function phoenix_acc_admin_notify_payload($extra = array()) {
    global $wpdb;
    $s     = phoenix_acc_notify_settings();
    $conns = array();
    foreach (phoenix_connections() as $slug => $row) {
        $conns[] = array('slug' => (string) $slug, 'label' => (string) $row['label'], 'key' => phoenix_conn_key_state($row));
    }
    $t   = phoenix_acc_table_notify();
    $log = array();
    foreach ((array) $wpdb->get_results("SELECT id, event, ref, dest, status, tries, created_at, sent_at, next_at, error FROM {$t} ORDER BY id DESC LIMIT 30") as $r) {
        $log[] = array(
            'id' => (int) $r->id, 'event' => (string) $r->event, 'ref' => (string) $r->ref, 'dest' => (string) $r->dest,
            'status' => (string) $r->status, 'tries' => (int) $r->tries, 'error' => (string) $r->error,
            'created' => $r->created_at ? gmdate('c', strtotime($r->created_at . ' UTC')) : null,
            'next' => $r->status === 'pending' && $r->next_at ? gmdate('c', strtotime($r->next_at . ' UTC')) : null,
        );
    }
    $events = array();
    foreach (PHOENIX_ACC_NOTIFY_EVENTS as $id => $e) {
        $events[] = array('id' => $id, 'label' => $e[0]);
    }
    return array_merge(array(
        'settings'    => $s,
        'events'      => $events,
        'connections' => $conns,
        'hook_default'=> phoenix_acc_tg_default_hook(),
        'can_link'    => phoenix_acc_notify_can_link($s),
        'hook_secret' => phoenix_acc_notify_secret(),
        'failed_24h'  => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$t} WHERE status = 'failed' AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)"),
        'log'         => $log,
    ), $extra);
}

function phoenix_acc_admin_notify_get(WP_REST_Request $r) {
    return phoenix_api_ok(phoenix_acc_admin_notify_payload());
}

function phoenix_acc_admin_notify_save(WP_REST_Request $r) {
    $c = phoenix_acc_notify_clean((array) $r->get_json_params(), array_keys(phoenix_connections()));
    if (!$c['ok']) {
        return new WP_Error('phoenix_invalid', 'بعضی فیلدها درست نیستند.', array('status' => 422, 'errors' => $c['errors']));
    }
    $before = phoenix_acc_notify_settings();
    /* نامِ ربات را فقط «وصل کردن» می‌گذارد؛ با همان توکن می‌ماند، با توکنِ دیگر نه */
    $c['data']['tg_bot'] = $c['data']['tg_conn'] === $before['tg_conn'] ? $before['tg_bot'] : '';
    phoenix_acc_notify_save($c['data']);
    if ($before['on'] !== $c['data']['on'] || $before['hook_url'] !== $c['data']['hook_url']) {
        phoenix_audit('setting', 'account.notify', $before['on'] ? 'on' : 'off', $c['data']['on'] ? 'on' : 'off', 'تنظیمِ اعلان‌ها');
    }
    return phoenix_api_ok(phoenix_acc_admin_notify_payload());
}

/** نمونه برای «ارسالِ آزمایشی» — پیام دقیقاً شکلِ یک سفارشِ واقعی */
function phoenix_acc_notify_sample() {
    return array(
        'id' => 1001, 'number' => '1001', 'status' => 'processing', 'total' => 1290000, 'currency' => 'IRT',
        'payment'  => array('method' => 'درگاهِ آزمایشی', 'transaction_id' => 'TEST-123456', 'is_paid' => true),
        'customer' => array('name' => 'مشتریِ نمونه', 'phone' => '09120000000', 'email' => 'sample@example.com'),
        'items'    => array(
            array('item_id' => 1, 'name' => 'نمونه — اشتراکِ یک‌ماهه', 'qty' => 1, 'total' => 520000,
                'inputs' => array(array('key' => 'ایمیلِ اکانت', 'value' => 'sample@example.com'), array('key' => 'رمزِ اکانت', 'value' => 'not-sent'))),
            array('item_id' => 2, 'name' => 'نمونه — گیفت‌کارت', 'qty' => 2, 'total' => 770000, 'inputs' => array()),
        ),
        'admin_url' => phoenix_acc_notify_admin_url('customers', 'orders'),
    );
}

function phoenix_acc_admin_notify_act(WP_REST_Request $r) {
    global $wpdb;
    $act = (string) $r['act'];
    $s   = phoenix_acc_notify_settings();

    if ($act === 'link') {
        if (!phoenix_acc_notify_can_link($s)) {
            return phoenix_api_fail('phoenix_acc_notify', 'اول ربات را با «وصل کردنِ ربات» وصل کن؛ یا اگر رباتِ برنامه‌ی دیگری است، شناسه‌ی گفتگو را دستی وارد کن.', 409);
        }
        $code = 'ph_' . strtolower(substr(preg_replace('/[^a-z0-9]/i', '', base64_encode(random_bytes(12))), 0, 10));
        set_transient(PHOENIX_ACC_NOTIFY_CODE, array('code' => $code, 'at' => time()), 15 * MINUTE_IN_SECONDS);
        $bot = (string) $s['tg_bot'];
        return phoenix_api_ok(phoenix_acc_admin_notify_payload(array('link' => array(
            'code' => $code, 'bot' => $bot, 'url' => 'https://t.me/' . $bot . '?start=' . $code,
            'group' => '/start@' . $bot . ' ' . $code, 'ttl' => 15 * MINUTE_IN_SECONDS,
        ))));
    }

    if ($act === 'secret') {
        phoenix_acc_notify_secret(true);
        phoenix_audit('setting', 'account.notify', null, 'secret', 'رمزِ API اعلان‌ها عوض شد');
        return phoenix_api_ok(phoenix_acc_admin_notify_payload());
    }

    if ($act === 'retry') {
        $t = phoenix_acc_table_notify();
        $wpdb->update($t, array('status' => 'pending', 'tries' => 0, 'next_at' => gmdate('Y-m-d H:i:s'), 'error' => ''),
            array('id' => (int) $r['id'], 'status' => 'failed'));
        phoenix_acc_notify_kick();
        return phoenix_api_ok(phoenix_acc_admin_notify_payload());
    }

    /* آزمایشی: همین حالا، بی‌صندوق — نتیجه‌ی هر گیرنده جدا */
    $lock = 'phoenix_acc_notifytest_' . get_current_user_id();
    if (get_transient($lock)) {
        return phoenix_api_fail('phoenix_busy', 'چند ثانیه صبر کن.', 429);
    }
    set_transient($lock, 1, 10);
    $test = array_merge($s, array('on' => true));
    $dests = phoenix_acc_notify_dests($test);
    if (!$dests) {
        return phoenix_api_fail('phoenix_acc_notify', 'هیچ گیرنده‌ای نیست — یک گفتگوی تلگرام یا نشانیِ API اضافه و ذخیره کن.', 409);
    }
    $data = phoenix_acc_notify_shape(phoenix_acc_notify_sample(), $s);
    $out  = array();
    foreach ($dests as $dest) {
        $res   = phoenix_acc_notify_send($dest, 'order_paid', 0, $data, $test);
        $out[] = array('dest' => $dest, 'ok' => $res['status'] === 'sent', 'error' => (string) ($res['error'] ?? ''));
    }
    return phoenix_api_ok(phoenix_acc_admin_notify_payload(array('test' => $out)));
}
