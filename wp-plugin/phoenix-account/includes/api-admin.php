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

    phoenix_api_route('/account/overview', 'GET', 'phoenix_acc_admin_overview');
    phoenix_api_route('/account/orders', 'GET', 'phoenix_acc_admin_orders', array(
        'status' => array('type' => 'string', 'enum' => array('', 'pending', 'on-hold', 'processing', 'completed', 'cancelled', 'refunded', 'failed'), 'default' => ''),
        'q'      => array('type' => 'string', 'default' => ''),
        'page'   => array('type' => 'integer', 'minimum' => 1, 'maximum' => 1000, 'default' => 1),
    ));
    phoenix_api_route('/account/orders/(?P<id>\d+)', 'GET', 'phoenix_acc_admin_order');

    phoenix_api_route('/account/customers', 'GET', 'phoenix_acc_admin_customers', array(
        'q'    => array('type' => 'string', 'default' => ''),
        'sort' => array('type' => 'string', 'enum' => array('recent', 'spent', 'orders', 'joined'), 'default' => 'recent'),
        'page' => array('type' => 'integer', 'minimum' => 1, 'maximum' => 1000, 'default' => 1),
    ));
    phoenix_api_route('/account/customers/sync', 'POST', 'phoenix_acc_admin_customers_sync', array(
        'page' => array('type' => 'integer', 'minimum' => 1, 'maximum' => 1000, 'default' => 1),
    ));
    phoenix_api_route('/account/customers/(?P<phone>09\d{9})', 'GET', 'phoenix_acc_admin_customer');
    phoenix_api_route('/account/customers/(?P<phone>09\d{9})', 'POST', 'phoenix_acc_admin_customer_act', array(
        'act'  => array('type' => 'string', 'enum' => array('block', 'unblock', 'revoke', 'clear_password', 'unlock', 'note'), 'required' => true),
        'note' => array('type' => 'string', 'default' => ''),
    ));

    phoenix_api_route('/account/tickets', 'GET', 'phoenix_acc_admin_tickets', array(
        'status' => array('type' => 'string', 'enum' => array('', 'open', 'answered', 'closed'), 'default' => ''),
        'phone'  => array('type' => 'string', 'default' => ''),
        'page'   => array('type' => 'integer', 'minimum' => 1, 'maximum' => 1000, 'default' => 1),
    ));
    phoenix_api_route('/account/tickets/(?P<id>\d+)', 'GET', 'phoenix_acc_admin_ticket');
    phoenix_api_route('/account/tickets/(?P<id>\d+)', 'POST', 'phoenix_acc_admin_ticket_act', array(
        'act'  => array('type' => 'string', 'enum' => array('reply', 'close', 'reopen'), 'required' => true),
        'body' => array('type' => 'string', 'default' => ''),
    ));
}

/* ============================================================
   نمای کلی — صفحه‌ی اولِ پنلِ «مشتریان»: چه کسی منتظرِ ماست
   ============================================================ */

function phoenix_acc_admin_overview(WP_REST_Request $r) {
    global $wpdb;
    $t    = phoenix_acc_table_customers();
    $week = gmdate('Y-m-d H:i:s', time() - 7 * DAY_IN_SECONDS);
    $sum  = $wpdb->get_row($wpdb->prepare(
        "SELECT COUNT(*) AS n, SUM(created_at >= %s) AS new7, SUM(last_login >= %s) AS active7,
                SUM(pass_hash <> '') AS with_pass, SUM(blocked = 1) AS blocked
           FROM {$t}", $week, $week
    ));
    $fresh = (array) $wpdb->get_results("SELECT * FROM {$t} ORDER BY created_at DESC LIMIT 6");
    $queue = phoenix_queue_counts();
    $tk    = phoenix_acc_tickets_admin('open', '', 1);
    $recent = wc_get_orders(array('type' => 'shop_order', 'limit' => 8, 'orderby' => 'date', 'order' => 'DESC'));

    return phoenix_api_ok(array(
        'customers' => array(
            'total' => (int) $sum->n, 'new7' => (int) $sum->new7, 'active7' => (int) $sum->active7,
            'with_password' => (int) $sum->with_pass, 'blocked' => (int) $sum->blocked,
        ),
        'attention' => array(
            'chats'        => phoenix_acc_chat_counts()['unread'],
            'tickets_open' => $tk['counts']['open'],
            /* کارت‌به‌کارت و مانندش: پول رسیده یا نه — تا تأیید نشود، صف راه نمی‌افتد */
            'on_hold'      => (int) wc_orders_count('on-hold'),
            'pending'      => (int) wc_orders_count('pending'),
            'needs_input'  => (int) ($queue['needs_input'] ?? 0),
        ),
        'waiting'   => array_slice($tk['rows'], 0, 6),
        'recent'    => array_map('phoenix_acc_admin_order_row', $recent),
        'fresh'     => array_map('phoenix_acc_admin_customer_row', $fresh),
    ));
}

/* ============================================================
   سفارش‌ها — همه‌ی سفارش‌ها با پرداخت و تحویل، بی‌رفتن به ووکامرس
   ============================================================ */

function phoenix_acc_admin_order_row($order) {
    $jobs = array();
    foreach (phoenix_queue_jobs_of_order($order->get_id()) as $j) {
        $jobs[] = (string) $j->status;
    }
    $items = array();
    foreach ($order->get_items() as $it) {
        $items[] = array('name' => $it->get_name(), 'qty' => (int) $it->get_quantity());
    }
    $paid = $order->get_date_paid();
    return array(
        'id'           => $order->get_id(),
        'number'       => (string) $order->get_order_number(),
        'status'       => (string) $order->get_status(),
        'status_label' => wc_get_order_status_name($order->get_status()),
        'created'      => $order->get_date_created() ? $order->get_date_created()->date('c') : null,
        'paid'         => $paid ? $paid->date('c') : null,
        'total'        => (int) round((float) $order->get_total()),
        'method'       => (string) $order->get_payment_method_title(),
        'customer'     => array(
            'name'  => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
            'phone' => phoenix_normalize_phone((string) $order->get_billing_phone()),
        ),
        'items'        => $items,
        'jobs'         => array_count_values($jobs),
    );
}

function phoenix_acc_admin_orders(WP_REST_Request $r) {
    $q    = trim((string) $r['q']);
    $args = array('type' => 'shop_order', 'limit' => 25, 'paged' => (int) $r['page'], 'paginate' => true, 'orderby' => 'date', 'order' => 'DESC');
    if ((string) $r['status'] !== '') {
        $args['status'] = array((string) $r['status']);
    }
    $counts = array();
    foreach (array('pending', 'on-hold', 'processing', 'completed', 'cancelled', 'refunded', 'failed') as $st) {
        $counts[$st] = (int) wc_orders_count($st);
    }
    /* جست‌وجو: شماره‌ی موبایل یا شماره‌ی سفارش */
    $phone = phoenix_normalize_phone($q);
    if ($phone !== '') {
        $args['billing_phone'] = $phone;
    } elseif ($q !== '') {
        $num   = (int) preg_replace('/[^0-9]/', '', strtr($q, array('۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9')));
        $order = $num > 0 ? wc_get_order($num) : null;
        $rows  = $order && $order->get_type() === 'shop_order' ? array(phoenix_acc_admin_order_row($order)) : array();
        return phoenix_api_ok(array('rows' => $rows, 'page' => 1, 'pages' => 1, 'total' => count($rows), 'counts' => $counts));
    }
    $res  = wc_get_orders($args);
    $rows = array_map('phoenix_acc_admin_order_row', $res->orders);
    return phoenix_api_ok(array('rows' => $rows, 'page' => (int) $r['page'], 'pages' => max(1, (int) $res->max_num_pages), 'total' => (int) $res->total, 'counts' => $counts));
}

function phoenix_acc_admin_order(WP_REST_Request $r) {
    $order = wc_get_order((int) $r['id']);
    if (!$order || $order->get_type() !== 'shop_order') {
        return phoenix_api_fail('phoenix_acc_nf', 'این سفارش پیدا نشد.', 404);
    }
    $notes = array();
    foreach (wc_get_order_notes(array('order_id' => $order->get_id(), 'limit' => 30)) as $n) {
        $notes[] = array(
            'at'       => $n->date_created ? $n->date_created->date('c') : null,
            'text'     => wp_strip_all_tags((string) $n->content),
            'customer' => (bool) $n->customer_note,
            'by'       => (string) $n->added_by,
        );
    }
    $phone = phoenix_normalize_phone((string) $order->get_billing_phone());
    $cust  = $phone !== '' ? phoenix_acc_customer($phone) : null;
    return phoenix_api_ok(array(
        'order'    => array_merge(phoenix_order_view($order, false), array('edit_url' => $order->get_edit_order_url())),
        'notes'    => $notes,
        'customer' => $cust ? array('phone' => $phone, 'orders_count' => (int) $cust->orders_count, 'paid_total' => (int) $cust->paid_total, 'blocked' => (bool) $cust->blocked) : ($phone !== '' ? array('phone' => $phone) : null),
        'tickets'  => $phone !== '' ? phoenix_acc_tickets_admin('', $phone, 1)['rows'] : array(),
    ));
}

/* ============================================================
   مشتریان
   ============================================================ */

function phoenix_acc_admin_customer_row($c) {
    return array(
        'phone'        => (string) $c->phone,
        'name'         => (string) $c->name,
        'email'        => (string) $c->email,
        'orders_count' => (int) $c->orders_count,
        'paid_total'   => (int) $c->paid_total,
        'last_order'   => $c->last_order_at ? gmdate('c', strtotime($c->last_order_at . ' UTC')) : null,
        'last_login'   => $c->last_login ? gmdate('c', strtotime($c->last_login . ' UTC')) : null,
        'joined'       => gmdate('c', strtotime($c->created_at . ' UTC')),
        'has_password' => $c->pass_hash !== '',
        'blocked'      => (bool) $c->blocked,
    );
}

function phoenix_acc_admin_customers(WP_REST_Request $r) {
    global $wpdb;
    $t     = phoenix_acc_table_customers();
    $per   = 30;
    $page  = (int) $r['page'];
    $q     = trim((string) $r['q']);
    /* ⚠ ترتیب از فهرستِ سفید — نامِ ستون هرگز از ورودی نمی‌آید */
    $order = array('recent' => 'last_order_at DESC, created_at DESC', 'spent' => 'paid_total DESC', 'orders' => 'orders_count DESC', 'joined' => 'created_at DESC')[(string) $r['sort']];
    $where = '1=1';
    $args  = array();
    if ($q !== '') {
        $digits = preg_replace('/[^0-9]/', '', strtr($q, array('۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9')));
        $like   = '%' . $wpdb->esc_like($q) . '%';
        $where  = '(name LIKE %s OR email LIKE %s' . (strlen($digits) >= 3 ? ' OR phone LIKE %s' : '') . ')';
        $args   = array($like, $like);
        if (strlen($digits) >= 3) {
            $args[] = '%' . $wpdb->esc_like($digits) . '%';
        }
    }
    $total = (int) ($args ? $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t} WHERE {$where}", $args)) : $wpdb->get_var("SELECT COUNT(*) FROM {$t}"));
    $rows  = (array) $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$t} WHERE {$where} ORDER BY {$order} LIMIT %d OFFSET %d", array_merge($args, array($per, ($page - 1) * $per))
    ));
    $sum = $wpdb->get_row("SELECT COUNT(*) AS n, SUM(paid_total) AS spent, SUM(orders_count > 0) AS buyers, SUM(pass_hash <> '') AS with_pass FROM {$t}");
    return phoenix_api_ok(array(
        'rows'  => array_map('phoenix_acc_admin_customer_row', $rows),
        'total' => $total, 'page' => $page, 'pages' => max(1, (int) ceil($total / $per)),
        'summary' => array('customers' => (int) $sum->n, 'buyers' => (int) $sum->buyers, 'spent' => (int) $sum->spent, 'with_password' => (int) $sum->with_pass),
    ));
}

/**
 * ساختنِ فهرستِ مشتریان از سفارش‌های قبلی — صفحه‌به‌صفحه، هر بار
 * دویست سفارش، تا هاستِ کند وسطِ کار نبُرد.
 */
function phoenix_acc_admin_customers_sync(WP_REST_Request $r) {
    $page = (int) $r['page'];
    $res  = wc_get_orders(array('type' => 'shop_order', 'limit' => 200, 'paged' => $page, 'paginate' => true, 'orderby' => 'ID', 'order' => 'ASC', 'return' => 'objects'));
    $seen = array();
    foreach ($res->orders as $o) {
        $p = phoenix_normalize_phone((string) $o->get_billing_phone());
        if ($p !== '') {
            $seen[$p] = true;
        }
    }
    foreach (array_keys($seen) as $p) {
        phoenix_acc_customer_refresh($p);
    }
    return phoenix_api_ok(array('page' => $page, 'pages' => max(1, (int) $res->max_num_pages), 'phones' => count($seen), 'done' => $page >= (int) $res->max_num_pages));
}

function phoenix_acc_admin_customer_payload($phone) {
    $c = phoenix_acc_customer($phone);
    if (!$c) {
        return null;
    }
    $orders = wc_get_orders(array('billing_phone' => $phone, 'type' => 'shop_order', 'limit' => 50, 'orderby' => 'date', 'order' => 'DESC'));
    $sessions = array();
    foreach (phoenix_acc_sessions_of($phone) as $s) {
        $sessions[] = array('id' => (int) $s->id, 'device' => phoenix_acc_ua_label($s->ua),
            'created' => gmdate('c', strtotime($s->created_at . ' UTC')), 'last_seen' => gmdate('c', strtotime($s->last_seen . ' UTC')));
    }
    return array(
        'customer' => array_merge(phoenix_acc_admin_customer_row($c), array(
            'note'        => (string) $c->admin_note,
            'pass_set_at' => $c->pass_set_at ? gmdate('c', strtotime($c->pass_set_at . ' UTC')) : null,
            'locked_for'  => phoenix_acc_locked_for($phone),
        )),
        'orders'   => array_map('phoenix_acc_admin_order_row', $orders),
        'sessions' => $sessions,
        'tickets'  => phoenix_acc_tickets_admin('', $phone, 1)['rows'],
    );
}

function phoenix_acc_admin_customer(WP_REST_Request $r) {
    $phone = (string) $r['phone'];
    $d = phoenix_acc_admin_customer_payload($phone);
    if (!$d) {
        /* مشتریِ قدیمی که هنوز در فهرست نیامده — از سفارش‌هایش بساز */
        if (wc_get_orders(array('billing_phone' => $phone, 'type' => 'shop_order', 'limit' => 1, 'return' => 'ids'))) {
            phoenix_acc_customer_refresh($phone);
            $d = phoenix_acc_admin_customer_payload($phone);
        }
    }
    return $d ? phoenix_api_ok($d) : phoenix_api_fail('phoenix_acc_nf', 'مشتری‌ای با این شماره نیست.', 404);
}

/**
 * ⚠ مدیر رمزِ مشتری را نه می‌بیند نه می‌گذارد — فقط پاکش می‌کند تا
 * مشتری با کدِ پیامکی وارد شود و خودش رمزِ تازه بگذارد.
 */
function phoenix_acc_admin_customer_act(WP_REST_Request $r) {
    $phone = (string) $r['phone'];
    $c     = phoenix_acc_customer($phone);
    if (!$c) {
        return phoenix_api_fail('phoenix_acc_nf', 'مشتری‌ای با این شماره نیست.', 404);
    }
    $act  = (string) $r['act'];
    $subj = 'phone:' . $phone;
    switch ($act) {
        case 'block':
            phoenix_acc_customer_update($phone, array('blocked' => 1));
            phoenix_acc_session_revoke_others($phone, 0);
            phoenix_audit('customer', $subj, 'open', 'blocked', 'حساب بسته شد و همه‌ی نشست‌ها بیرون رفتند');
            break;
        case 'unblock':
            phoenix_acc_customer_update($phone, array('blocked' => 0));
            phoenix_audit('customer', $subj, 'blocked', 'open', 'حساب باز شد');
            break;
        case 'revoke':
            $n = phoenix_acc_session_revoke_others($phone, 0);
            phoenix_audit('customer', $subj, null, null, 'خروج از همه‌ی دستگاه‌ها (' . $n . ' نشست)');
            break;
        case 'clear_password':
            phoenix_acc_customer_update($phone, array('pass_hash' => '', 'pass_set_at' => null));
            phoenix_acc_session_revoke_others($phone, 0);
            phoenix_audit('customer', $subj, null, null, 'رمز پاک شد؛ ورود فقط با کدِ پیامکی');
            break;
        case 'unlock':
            phoenix_acc_fail_clear($phone);
            phoenix_audit('customer', $subj, null, null, 'قفلِ تلاشِ اشتباه برداشته شد');
            break;
        case 'note':
            $note = phoenix_acc_text($r['note'], 500, true);
            phoenix_acc_customer_update($phone, array('admin_note' => $note));
            phoenix_audit('customer', $subj, $c->admin_note, $note, 'یادداشتِ داخلی');
            break;
    }
    return phoenix_api_ok(phoenix_acc_admin_customer_payload($phone));
}

/* ============================================================
   تیکت‌ها
   ============================================================ */

function phoenix_acc_admin_tickets(WP_REST_Request $r) {
    $phone = phoenix_normalize_phone((string) $r['phone']);
    return phoenix_api_ok(phoenix_acc_tickets_admin((string) $r['status'], $phone, (int) $r['page']));
}

function phoenix_acc_admin_ticket(WP_REST_Request $r) {
    $t = phoenix_acc_ticket_row((int) $r['id']);
    if (!$t) {
        return phoenix_api_fail('phoenix_acc_nf', 'این تیکت پیدا نشد.', 404);
    }
    $c     = phoenix_acc_customer($t->phone);
    $order = $t->order_id ? wc_get_order((int) $t->order_id) : null;
    return phoenix_api_ok(array(
        'ticket'   => phoenix_acc_ticket_shape($t, true, true),
        'customer' => $c ? phoenix_acc_admin_customer_row($c) : array('phone' => (string) $t->phone),
        'order'    => $order ? phoenix_acc_admin_order_row($order) : null,
    ));
}

function phoenix_acc_admin_ticket_act(WP_REST_Request $r) {
    $res = phoenix_acc_ticket_staff_act((int) $r['id'], (string) $r['act'], (string) $r['body']);
    if (is_wp_error($res)) {
        return $res;
    }
    return phoenix_acc_admin_ticket($r);
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
        /* ربات تلگرام — بی‌تماس با تلگرام؛ وضعیتِ زنده با ‎GET /account/sms/telegram‎ */
        'telegram'    => array(
            'bot'          => (string) phoenix_acc_setting('tg_bot'),
            'mode'         => phoenix_acc_setting('tg_mode') === 'shared' ? 'shared' : 'own',
            'linked'       => phoenix_acc_tg_count(),
            'hook_default' => phoenix_acc_tg_default_hook(),
            'link_url'     => rest_url(PHOENIX_ACC_NS . '/tg/link'),
        ),
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
    /* توکنِ تازه (شاید رباتِ دیگر) یا نوعِ دیگرِ ربات: نامِ قبلی به مشتری
       نشان داده نشود تا دوباره «وصل کردن» زده شود */
    if ((string) $c['data']['sms_conn'] !== (string) phoenix_acc_setting('sms_conn')
        || (string) $c['data']['tg_mode'] !== (string) (phoenix_acc_setting('tg_mode') ?: 'own')) {
        $c['data']['tg_bot'] = '';
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
    if (!in_array($provider, array('kavenegar', 'smsir', 'telegram'), true)) {
        return phoenix_api_fail('phoenix_no_sms', 'اول یک سامانه‌ی پیامک یا ربات تلگرام انتخاب و ذخیره کن.', 409);
    }
    $lock = 'phoenix_acc_smstest_' . get_current_user_id();
    if (get_transient($lock)) {
        return phoenix_api_fail('phoenix_busy', 'یک دقیقه صبر کن — هر پیامک هزینه دارد.', 429);
    }
    set_transient($lock, 1, MINUTE_IN_SECONDS);

    $res = $provider === 'telegram' ? phoenix_acc_tg_test($phone) : phoenix_acc_sms_send($phone, '123456');
    return phoenix_api_ok(array_merge(phoenix_acc_admin_sms_payload(), array('test' => $res)));
}

/* ============================================================
   پنل و داشبورد
   ============================================================ */

/**
 * ⚠ پنلِ جدا، نه بخشِ بیشتر در پنلِ فروشگاه.
 * مشتری و سفارش و پشتیبانی کارِ هرروزه است؛ قیمت و محصول کارِ
 * گاه‌به‌گاه و حساس. هر کدام منوی خودش در پیشخوان — «فونیکس» و
 * «مشتریان» — با همان پوسته و همان نگهبانِ Bridge.
 */
add_filter('phoenix_admin_worlds', 'phoenix_acc_admin_world');
function phoenix_acc_admin_world($list) {
    $sections = array();
    foreach (array(
        'overview'  => array('نمای کلی', 'grid'),
        'chat'      => array('چت آنلاین', 'message'),
        'orders'    => array('سفارش‌ها', 'box'),
        'customers' => array('مشتریان', 'users'),
        'tickets'   => array('تیکت‌ها', 'inbox'),
        'sms'       => array('پیامک و ورود', 'lock'),
    ) as $id => $meta) {
        $sections[] = array(
            'id'     => $id,
            'label'  => $meta[0],
            'icon'   => $meta[1],
            'module' => plugins_url('admin/screens/' . $id . '.js', PHOENIX_ACC_FILE),
            'ver'    => PHOENIX_ACC_VERSION,
        );
    }
    $list[] = array(
        'id'       => 'customers',
        'title'    => 'مشتریان',
        'sub'      => 'سفارش‌ها، مشتریان و پشتیبانی',
        'mark'     => 'م',
        'dashicon' => 'dashicons-groups',
        'position' => 56.5,
        'sections' => $sections,
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
    $chats = phoenix_acc_chat_counts()['unread'];
    if ($chats > 0) {
        $alerts[] = array('level' => 'high', 'title' => 'پیامِ تازه در چتِ آنلاین',
            'text' => strtr((string) $chats, array('0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴', '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹')) . ' گفتگو منتظرِ جواب است — مشتری همین حالا روی سایت است.',
            'action' => array('label' => 'چت آنلاین', 'go' => 'chat', 'world' => 'customers'));
    }
    $waiting = phoenix_acc_ticket_counts()['open'];
    if ($waiting > 0) {
        $alerts[] = array('level' => 'medium', 'title' => 'تیکتِ منتظرِ پاسخ',
            'text' => strtr((string) $waiting, array('0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴', '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹')) . ' تیکت منتظرِ جوابِ پشتیبانی است.',
            'action' => array('label' => 'تیکت‌ها', 'go' => 'tickets', 'world' => 'customers'));
    }
    $p = (string) phoenix_acc_setting('sms_provider');
    if ($p === 'telegram' && (string) phoenix_acc_setting('tg_bot') === '') {
        $alerts[] = array('level' => 'high', 'title' => 'ربات تلگرام وصل نشده',
            'text' => 'کدِ ورود با تلگرام انتخاب شده ولی ربات هنوز وصل نشده؛ مشتری کد نمی‌گیرد.',
            'action' => array('label' => 'پیامک و ورود', 'go' => 'sms', 'world' => 'customers'));
    }
    if ($p === 'dev') {
        $alerts[] = array('level' => 'high', 'title' => 'پیامک در حالتِ آزمایشی است',
            'text' => 'کدِ ورود برای مشتری فرستاده نمی‌شود و فقط در پنل دیده می‌شود. پیش از فروشِ واقعی سامانه را وصل کن.',
            'action' => array('label' => 'پیامک و ورود', 'go' => 'sms', 'world' => 'customers'));
    } elseif ($p === 'off') {
        $alerts[] = array('level' => 'medium', 'title' => 'سامانه‌ی پیامک وصل نیست',
            'text' => 'بدونِ پیامک، مشتری نمی‌تواند وارد شود یا سفارش ثبت کند.',
            'action' => array('label' => 'پیامک و ورود', 'go' => 'sms', 'world' => 'customers'));
    }
    return $alerts;
}
