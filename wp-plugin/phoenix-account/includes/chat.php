<?php
/**
 * چتِ آنلاین — گفتگوی زنده‌ی بازدیدکننده با پشتیبانی.
 *
 * ============================================================
 * ربات (منوی خرید، پیگیری، سوال‌ها) در خودِ سایت می‌ماند؛ این‌جا
 * فقط آن بخشی است که به آدم می‌رسد:
 *
 *   ۱ ربات جواب نداشت یا مشتری «کارشناس» خواست → ‎POST /chat‎
 *     گفتگو ساخته می‌شود با یک نامِ کارشناس (از فهرستِ پنل) و یک
 *     ژتونِ تصادفی که فقط همان مرورگر دارد.
 *   ۲ مرورگر با همان ژتون پیام می‌فرستد و هر چند ثانیه جوابِ تازه
 *     را می‌پرسد.
 *   ۳ اپراتور در پنلِ «مشتریان» ← «چت آنلاین» با همان نامِ کارشناس
 *     جواب می‌دهد.
 *
 * ⚠ ژتون مالکیتِ گفتگوست. شناسه‌ی گفتگو پشتِ سرِ هم است؛ بی‌ژتون،
 * هر کسی گفتگوی دیگران را می‌خواند. در پایگاه داده فقط هشِ آن.
 *
 * ⚠ متن فقط متن: بی‌تگ ذخیره، و در پنل و سایت با ‎textContent‎.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_ACC_CHAT_OPTION  = 'phoenix_acc_chat';
const PHOENIX_ACC_CHAT_HEADER  = 'X-Phoenix-Chat';
const PHOENIX_ACC_CHAT_MSG_MAX = 300;

add_filter('rest_allowed_cors_headers', 'phoenix_acc_chat_cors');
function phoenix_acc_chat_cors($headers) {
    $headers[] = PHOENIX_ACC_CHAT_HEADER;
    return $headers;
}

function phoenix_acc_chat_settings() {
    $saved = get_option(PHOENIX_ACC_CHAT_OPTION);
    return is_array($saved) ? array_merge(phoenix_acc_chat_defaults(), $saved) : phoenix_acc_chat_defaults();
}

/** ساعتِ پاسخ‌گویی به وقتِ خودِ سایت — شنبه صفر */
function phoenix_acc_chat_open_now(array $s) {
    $now = new DateTime('now', wp_timezone());
    $day = ((int) $now->format('w') + 1) % 7; // PHP: یکشنبه ۰ → ما: شنبه ۰
    return phoenix_acc_chat_is_open($s, (int) $now->format('G') * 60 + (int) $now->format('i'), $day);
}

/* ============================================================
   داده
   ============================================================ */

function phoenix_acc_chat_row($id) {
    global $wpdb;
    $t = phoenix_acc_table_chats();
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM {$t} WHERE id = %d", (int) $id)) ?: null;
}

/** گفتگوی همین مرورگر — ژتون درست، وگرنه ‎null‎ */
function phoenix_acc_chat_own($id, $token) {
    if (!phoenix_acc_token_ok((string) $token)) {
        return null;
    }
    $c = phoenix_acc_chat_row($id);
    return $c && hash_equals((string) $c->token_hash, phoenix_acc_token_hash($token)) ? $c : null;
}

function phoenix_acc_chat_add($chat_id, $author, $staff, $body) {
    global $wpdb;
    $now = gmdate('Y-m-d H:i:s');
    $wpdb->insert(phoenix_acc_table_chat_msgs(), array(
        'chat_id' => (int) $chat_id, 'author' => $author, 'staff' => substr((string) $staff, 0, 60),
        'body' => $body, 'created_at' => $now,
    ), array('%d', '%s', '%s', '%s', '%s'));
    return (int) $wpdb->insert_id;
}

function phoenix_acc_chat_count($chat_id) {
    global $wpdb;
    $m = phoenix_acc_table_chat_msgs();
    return (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$m} WHERE chat_id = %d", (int) $chat_id));
}

/**
 * پیام‌های بعد از ‎$after‎ — شکلِ یکسان برای سایت و پنل.
 * ⚠ نامِ کاربریِ اپراتور فقط برای پنل؛ مشتری نامِ کارشناس را می‌بیند.
 */
function phoenix_acc_chat_messages($chat, $after, $for_staff) {
    global $wpdb;
    $m    = phoenix_acc_table_chat_msgs();
    $rows = (array) $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$m} WHERE chat_id = %d AND id > %d ORDER BY id ASC LIMIT 200", (int) $chat->id, max(0, (int) $after)
    ));
    $out = array();
    foreach ($rows as $r) {
        $out[] = array(
            'id'     => (int) $r->id,
            'author' => (string) $r->author,
            'name'   => $r->author === 'staff' ? (string) $chat->agent : '',
            'staff'  => $for_staff ? (string) $r->staff : '',
            'body'   => (string) $r->body,
            'at'     => gmdate('c', strtotime($r->created_at . ' UTC')),
        );
    }
    return $out;
}

function phoenix_acc_chat_touch($chat_id, array $data) {
    global $wpdb;
    $data['updated_at'] = gmdate('Y-m-d H:i:s');
    $wpdb->update(phoenix_acc_table_chats(), $data, array('id' => (int) $chat_id));
}

/* ============================================================
   APIِ سایت — بی‌نشست؛ مالکیت با ژتونِ گفتگو
   ============================================================ */

add_action('rest_api_init', 'phoenix_acc_chat_routes');
function phoenix_acc_chat_routes() {
    phoenix_acc_route('/chat/config', 'GET', 'phoenix_acc_api_chat_config', false);
    phoenix_acc_route('/chat', 'POST', 'phoenix_acc_api_chat_start', false);
    phoenix_acc_route('/chat/(?P<id>\d+)', 'GET', 'phoenix_acc_api_chat_get', false);
    phoenix_acc_route('/chat/(?P<id>\d+)/messages', 'POST', 'phoenix_acc_api_chat_send', false);
    phoenix_acc_route('/chat/(?P<id>\d+)/close', 'POST', 'phoenix_acc_api_chat_close', false);

    phoenix_api_route('/account/chat', 'GET', 'phoenix_acc_admin_chats', array(
        'status' => array('type' => 'string', 'enum' => array('', 'open', 'answered', 'closed'), 'default' => ''),
        'page'   => array('type' => 'integer', 'minimum' => 1, 'maximum' => 1000, 'default' => 1),
    ));
    phoenix_api_route('/account/chat/settings', 'GET', 'phoenix_acc_admin_chat_settings');
    phoenix_api_route('/account/chat/settings', 'POST', 'phoenix_acc_admin_chat_settings_save');
    phoenix_api_route('/account/chat/(?P<id>\d+)', 'GET', 'phoenix_acc_admin_chat', array(
        'after' => array('type' => 'integer', 'minimum' => 0, 'default' => 0),
    ));
    phoenix_api_route('/account/chat/(?P<id>\d+)', 'POST', 'phoenix_acc_admin_chat_act', array(
        'act'  => array('type' => 'string', 'enum' => array('reply', 'close', 'reopen'), 'required' => true),
        'body' => array('type' => 'string', 'default' => ''),
    ));
}

function phoenix_acc_chat_nf() {
    return new WP_Error('phoenix_acc_nf', 'این گفتگو پیدا نشد.', array('status' => 404));
}

function phoenix_acc_api_chat_config(WP_REST_Request $r) {
    $s = phoenix_acc_chat_settings();
    return rest_ensure_response(phoenix_acc_chat_public($s, phoenix_acc_chat_open_now($s)));
}

/**
 * گفتگوی تازه با اولین پیام.
 *
 * بدنه: ‎agent‎ (نامی که مرورگر به قرعه نشان داده)، ‎message‎، ‎page‎،
 * و ‎context‎ — چند خطِ آخرِ گفتگو با ربات، تا اپراتور بداند مشتری
 * تا این‌جا چه دیده.
 */
function phoenix_acc_api_chat_start(WP_REST_Request $r) {
    global $wpdb;
    if ($e = phoenix_acc_rate_limit('chat_start', 8, HOUR_IN_SECONDS)) {
        return $e;
    }
    $s = phoenix_acc_chat_settings();
    if (empty($s['enabled'])) {
        return new WP_Error('phoenix_acc_chat_off', 'چتِ آنلاین فعلاً خاموش است.', array('status' => 403));
    }
    $body = (array) $r->get_json_params();
    $msg  = phoenix_acc_text($body['message'] ?? '', 2000, true);
    if ($msg === '') {
        return new WP_Error('phoenix_invalid', 'پیام خالی است.', array('status' => 422));
    }
    $agent = phoenix_acc_chat_pick_agent(phoenix_acc_chat_active_agents($s), $body['agent'] ?? '', random_int(0, PHP_INT_MAX));

    /* مشتریِ واردشده؟ شماره از نشست، نه از بدنه */
    $sess  = phoenix_acc_session_row((string) $r->get_header(PHOENIX_ACC_HEADER));
    $token = phoenix_acc_new_token();
    $now   = gmdate('Y-m-d H:i:s');
    $wpdb->insert(phoenix_acc_table_chats(), array(
        'token_hash'   => phoenix_acc_token_hash($token),
        'phone'        => $sess ? (string) $sess->phone : '',
        'agent'        => $agent,
        'status'       => 'open',
        'created_at'   => $now,
        'updated_at'   => $now,
        'last_by'      => 'visitor',
        'unread_staff' => 1,
        'page'         => phoenix_acc_text($body['page'] ?? '', 200),
        'ua'           => phoenix_acc_text(phoenix_acc_ua_label((string) $r->get_header('user_agent')), 160),
    ), array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s'));
    $id = (int) $wpdb->insert_id;
    if (!$id) {
        return new WP_Error('phoenix_acc_db', 'گفتگو ساخته نشد.', array('status' => 500));
    }

    $ctx = phoenix_acc_text($body['context'] ?? '', 1500, true);
    if ($ctx !== '') {
        phoenix_acc_chat_add($id, 'system', '', $ctx);
    }
    phoenix_acc_chat_add($id, 'visitor', '', $msg);
    $open = phoenix_acc_chat_open_now($s);
    phoenix_acc_chat_add($id, 'bot', '', phoenix_acc_chat_fill($open ? $s['handoff'] : $s['offline'], $agent));
    do_action('phoenix_chat_started', $id);

    $chat = phoenix_acc_chat_row($id);
    return rest_ensure_response(array(
        'id'       => $id,
        'token'    => $token,
        'agent'    => $agent,
        'status'   => 'open',
        'open'     => $open,
        'messages' => phoenix_acc_chat_messages($chat, 0, false),
    ));
}

function phoenix_acc_chat_out($chat, $after) {
    return array(
        'id'       => (int) $chat->id,
        'agent'    => (string) $chat->agent,
        'status'   => (string) $chat->status,
        'messages' => phoenix_acc_chat_messages($chat, $after, false),
    );
}

function phoenix_acc_api_chat_get(WP_REST_Request $r) {
    $c = phoenix_acc_chat_own((int) $r['id'], (string) $r->get_header(PHOENIX_ACC_CHAT_HEADER));
    if (!$c) {
        return phoenix_acc_chat_nf();
    }
    return rest_ensure_response(phoenix_acc_chat_out($c, (int) $r->get_param('after')));
}

function phoenix_acc_api_chat_send(WP_REST_Request $r) {
    $c = phoenix_acc_chat_own((int) $r['id'], (string) $r->get_header(PHOENIX_ACC_CHAT_HEADER));
    if (!$c) {
        return phoenix_acc_chat_nf();
    }
    if ($e = phoenix_acc_rate_limit('chat_msg', 40, 10 * MINUTE_IN_SECONDS)) {
        return $e;
    }
    if (phoenix_acc_chat_count($c->id) >= PHOENIX_ACC_CHAT_MSG_MAX) {
        return new WP_Error('phoenix_acc_many', 'این گفتگو خیلی طولانی شد؛ لطفاً تیکت ثبت کنید.', array('status' => 409));
    }
    $body = (array) $r->get_json_params();
    $msg  = phoenix_acc_text($body['body'] ?? '', 2000, true);
    if ($msg === '') {
        return new WP_Error('phoenix_invalid', 'پیام خالی است.', array('status' => 422));
    }
    phoenix_acc_chat_add($c->id, 'visitor', '', $msg);
    phoenix_acc_chat_touch($c->id, array('status' => 'open', 'last_by' => 'visitor', 'unread_staff' => 1));
    do_action('phoenix_chat_visitor_wrote', (int) $c->id);
    return rest_ensure_response(phoenix_acc_chat_out(phoenix_acc_chat_row($c->id), (int) ($body['after'] ?? 0)));
}

function phoenix_acc_api_chat_close(WP_REST_Request $r) {
    $c = phoenix_acc_chat_own((int) $r['id'], (string) $r->get_header(PHOENIX_ACC_CHAT_HEADER));
    if (!$c) {
        return phoenix_acc_chat_nf();
    }
    phoenix_acc_chat_touch($c->id, array('status' => 'closed', 'unread_staff' => 0));
    return rest_ensure_response(array('ok' => true));
}

/* ============================================================
   پنلِ مدیر
   ============================================================ */

function phoenix_acc_chat_counts() {
    global $wpdb;
    $t   = phoenix_acc_table_chats();
    $out = array('open' => 0, 'answered' => 0, 'closed' => 0, 'unread' => 0);
    foreach ((array) $wpdb->get_results("SELECT status, COUNT(*) AS n, SUM(unread_staff) AS u FROM {$t} GROUP BY status") as $r) {
        if (isset($out[$r->status])) {
            $out[$r->status] = (int) $r->n;
        }
        $out['unread'] += (int) $r->u;
    }
    return $out;
}

function phoenix_acc_admin_chat_row($c) {
    global $wpdb;
    $m    = phoenix_acc_table_chat_msgs();
    $last = $wpdb->get_row($wpdb->prepare(
        "SELECT author, body FROM {$m} WHERE chat_id = %d AND author IN ('visitor', 'staff') ORDER BY id DESC LIMIT 1", (int) $c->id
    ));
    $cust = $c->phone !== '' ? phoenix_acc_customer($c->phone) : null;
    return array(
        'id'       => (int) $c->id,
        'agent'    => (string) $c->agent,
        'status'   => (string) $c->status,
        'unread'   => (bool) $c->unread_staff,
        'phone'    => (string) $c->phone,
        'customer' => $cust ? (string) $cust->name : '',
        'page'     => (string) $c->page,
        'device'   => (string) $c->ua,
        'created'  => gmdate('c', strtotime($c->created_at . ' UTC')),
        'updated'  => gmdate('c', strtotime($c->updated_at . ' UTC')),
        'last'     => $last ? array('author' => (string) $last->author, 'body' => mb_substr((string) $last->body, 0, 140)) : null,
    );
}

function phoenix_acc_admin_chats(WP_REST_Request $r) {
    global $wpdb;
    $t      = phoenix_acc_table_chats();
    $status = (string) $r['status'];
    $page   = (int) $r['page'];
    $per    = 30;
    $where  = $status !== '' ? $wpdb->prepare('WHERE status = %s', $status) : '';
    $total  = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$t} {$where}");
    /* خوانده‌نشده‌ها بالا، بعد تازه‌ترین */
    $rows   = (array) $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$t} {$where} ORDER BY unread_staff DESC, updated_at DESC LIMIT %d OFFSET %d", $per, ($page - 1) * $per
    ));
    return phoenix_api_ok(array(
        'rows'   => array_map('phoenix_acc_admin_chat_row', $rows),
        'total'  => $total, 'page' => $page, 'pages' => max(1, (int) ceil($total / $per)),
        'counts' => phoenix_acc_chat_counts(),
        'quick'  => phoenix_acc_chat_settings()['quick'],
    ));
}

function phoenix_acc_admin_chat(WP_REST_Request $r) {
    $c = phoenix_acc_chat_row((int) $r['id']);
    if (!$c) {
        return phoenix_api_fail('phoenix_acc_nf', 'این گفتگو پیدا نشد.', 404);
    }
    if ((int) $c->unread_staff) {
        phoenix_acc_chat_touch_quiet($c->id);
    }
    return phoenix_api_ok(array(
        'chat'     => phoenix_acc_admin_chat_row($c),
        'messages' => phoenix_acc_chat_messages($c, (int) $r['after'], true),
    ));
}

/** «خوانده شد» — بی‌آنکه ترتیبِ فهرست عوض شود */
function phoenix_acc_chat_touch_quiet($id) {
    global $wpdb;
    $wpdb->update(phoenix_acc_table_chats(), array('unread_staff' => 0), array('id' => (int) $id), array('%d'), array('%d'));
}

function phoenix_acc_admin_chat_act(WP_REST_Request $r) {
    $c = phoenix_acc_chat_row((int) $r['id']);
    if (!$c) {
        return phoenix_api_fail('phoenix_acc_nf', 'این گفتگو پیدا نشد.', 404);
    }
    $act = (string) $r['act'];
    if ($act === 'reply') {
        $body = phoenix_acc_text($r['body'], 2000, true);
        if ($body === '') {
            return new WP_Error('phoenix_invalid', 'متنِ جواب را بنویس.', array('status' => 422, 'errors' => array('body' => 'متنِ جواب را بنویس.')));
        }
        $user = wp_get_current_user();
        phoenix_acc_chat_add($c->id, 'staff', $user ? $user->user_login : '', $body);
        phoenix_acc_chat_touch($c->id, array('status' => 'answered', 'last_by' => 'staff', 'unread_staff' => 0));
        do_action('phoenix_chat_staff_replied', (int) $c->id);
    } else {
        phoenix_acc_chat_touch($c->id, array('status' => $act === 'close' ? 'closed' : 'open', 'unread_staff' => 0));
        phoenix_audit('ticket', 'chat:' . (int) $c->id, (string) $c->status, $act === 'close' ? 'closed' : 'open', $act === 'close' ? 'چت بسته شد' : 'چت دوباره باز شد');
    }
    $r->set_param('after', 0);
    return phoenix_acc_admin_chat($r);
}

function phoenix_acc_admin_chat_settings(WP_REST_Request $r) {
    $s = phoenix_acc_chat_settings();
    return phoenix_api_ok(array('settings' => $s, 'defaults' => phoenix_acc_chat_defaults(), 'open_now' => phoenix_acc_chat_open_now($s)));
}

function phoenix_acc_admin_chat_settings_save(WP_REST_Request $r) {
    $c = phoenix_acc_chat_settings_clean((array) $r->get_json_params());
    if (!$c['ok']) {
        return new WP_Error('phoenix_invalid', 'بعضی فیلدها درست نیستند.', array('status' => 422, 'errors' => $c['errors']));
    }
    $before = phoenix_acc_chat_settings();
    update_option(PHOENIX_ACC_CHAT_OPTION, $c['data'], false);
    foreach (array('enabled', 'bot', 'hours_on', 'title') as $k) {
        if ($before[$k] !== $c['data'][$k]) {
            phoenix_audit('setting', 'chat.' . $k, $before[$k], $c['data'][$k], 'چتِ آنلاین');
        }
    }
    return phoenix_acc_admin_chat_settings($r);
}

/* ---------- هرس: بسته‌های قدیمی بیرون، رهاشده‌ها بسته ---------- */

add_action('phoenix_daily', 'phoenix_acc_chat_prune');
function phoenix_acc_chat_prune() {
    global $wpdb;
    $t   = phoenix_acc_table_chats();
    $m   = phoenix_acc_table_chat_msgs();
    $old = gmdate('Y-m-d H:i:s', time() - 90 * DAY_IN_SECONDS);
    $ids = array_map('intval', (array) $wpdb->get_col($wpdb->prepare("SELECT id FROM {$t} WHERE status = 'closed' AND updated_at < %s LIMIT 500", $old)));
    if ($ids) {
        $in = implode(',', $ids);
        $wpdb->query("DELETE FROM {$m} WHERE chat_id IN ({$in})");
        $wpdb->query("DELETE FROM {$t} WHERE id IN ({$in})");
    }
    $wpdb->query($wpdb->prepare("UPDATE {$t} SET status = 'closed' WHERE status <> 'closed' AND updated_at < %s",
        gmdate('Y-m-d H:i:s', time() - 30 * DAY_IN_SECONDS)));
}
