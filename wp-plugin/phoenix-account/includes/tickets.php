<?php
/**
 * تیکت — گفت‌وگوی مشتری و پشتیبانی.
 *
 * ============================================================
 * سه وضعیت، از چشمِ «نوبتِ کیست»:
 *   open      نوبتِ ما — مشتری نوشته و منتظر است
 *   answered  نوبتِ مشتری — جواب داده‌ایم
 *   closed    بسته؛ اگر مشتری دوباره بنویسد باز می‌شود
 *
 * ⚠ متن فقط متن است: بی‌تگ ذخیره می‌شود و هر دو پنل آن را با
 * ‎textContent‎ می‌گذارند، نه HTML — پیامِ مشتری در پنلِ مدیر اجرا
 * نمی‌شود (XSS از راهِ پشتیبانی رایج‌ترین راهِ حمله به مدیر است).
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_ACC_TICKET_OPEN_MAX = 5;   // تیکتِ باز برای هر مشتری
const PHOENIX_ACC_TICKET_MSG_MAX  = 100; // پیام در هر تیکت

/** سقفِ ساعتی برای هر شماره — ‎$what‎: new | reply */
function phoenix_acc_ticket_throttle($phone, $what, $max) {
    $key = 'phoenix_acc_tq_' . $what . '_' . md5($phone . '|' . floor(time() / HOUR_IN_SECONDS));
    $n   = (int) get_transient($key);
    if ($n >= $max) {
        return new WP_Error('phoenix_acc_busy', 'در یک ساعت اخیر پیام‌های زیادی ارسال کرده‌اید. لطفاً کمی بعد دوباره ارسال کنید.', array('status' => 429));
    }
    set_transient($key, $n + 1, HOUR_IN_SECONDS);
    return null;
}

function phoenix_acc_ticket_row($id) {
    global $wpdb;
    $t = phoenix_acc_table_tickets();
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM {$t} WHERE id = %d", (int) $id)) ?: null;
}

function phoenix_acc_ticket_messages($id) {
    global $wpdb;
    $m = phoenix_acc_table_messages();
    return (array) $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$m} WHERE ticket_id = %d ORDER BY id ASC LIMIT %d", (int) $id, PHOENIX_ACC_TICKET_MSG_MAX
    ));
}

function phoenix_acc_ticket_shape($t, $with_messages, $for_staff) {
    $out = array(
        'id'       => (int) $t->id,
        'subject'  => (string) $t->subject,
        'order_id' => (int) $t->order_id,
        'status'   => (string) $t->status,
        'created'  => gmdate('c', strtotime($t->created_at . ' UTC')),
        'updated'  => gmdate('c', strtotime($t->updated_at . ' UTC')),
        'last_by'  => (string) $t->last_by,
        'unread'   => (bool) $t->unread,
    );
    if ($for_staff) {
        $out['phone'] = (string) $t->phone;
    }
    if ($with_messages) {
        $out['messages'] = array();
        foreach (phoenix_acc_ticket_messages($t->id) as $m) {
            $out['messages'][] = array(
                'id'     => (int) $m->id,
                'author' => (string) $m->author,
                /* نامِ کاربریِ اپراتور فقط برای پنلِ مدیر — مشتری «پشتیبانی» می‌بیند */
                'staff'  => $for_staff ? (string) $m->staff : '',
                'body'   => (string) $m->body,
                'at'     => gmdate('c', strtotime($m->created_at . ' UTC')),
            );
        }
    }
    return $out;
}

function phoenix_acc_ticket_add_message($ticket_id, $author, $staff, $body) {
    global $wpdb;
    $now = gmdate('Y-m-d H:i:s');
    $wpdb->insert(phoenix_acc_table_messages(), array(
        'ticket_id'  => (int) $ticket_id,
        'author'     => $author,
        'staff'      => substr((string) $staff, 0, 60),
        'body'       => $body,
        'created_at' => $now,
    ), array('%d', '%s', '%s', '%s', '%s'));
    return $now;
}

/* ============================================================
   مشتری
   ============================================================ */

function phoenix_acc_tickets_of($phone) {
    global $wpdb;
    $t = phoenix_acc_table_tickets();
    $rows = (array) $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$t} WHERE phone = %s ORDER BY updated_at DESC LIMIT 50", (string) $phone
    ));
    return array_map(function ($r) { return phoenix_acc_ticket_shape($r, false, false); }, $rows);
}

/** @return array|WP_Error */
function phoenix_acc_ticket_create($phone, array $in) {
    global $wpdb;
    $c = phoenix_acc_ticket_clean($in, true);
    if (!$c['ok']) {
        return new WP_Error('phoenix_invalid', 'بعضی فیلدها درست نیستند.', array('status' => 422, 'errors' => $c['errors']));
    }
    $t = phoenix_acc_table_tickets();
    $open = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t} WHERE phone = %s AND status <> 'closed'", $phone));
    if ($open >= PHOENIX_ACC_TICKET_OPEN_MAX) {
        return new WP_Error('phoenix_acc_many', 'چند تیکت باز دارید؛ لطفاً گفت‌وگو را در همان تیکت‌ها ادامه دهید.', array('status' => 409));
    }
    if ($e = phoenix_acc_ticket_throttle($phone, 'new', 5)) {
        return $e;
    }
    /* سفارشِ ضمیمه باید مالِ خودش باشد — وگرنه صفر */
    $order_id = $c['data']['order_id'] && phoenix_acc_own_order($phone, $c['data']['order_id']) ? (int) $c['data']['order_id'] : 0;
    $now = gmdate('Y-m-d H:i:s');
    $wpdb->insert($t, array(
        'phone' => $phone, 'subject' => $c['data']['subject'], 'order_id' => $order_id, 'status' => 'open',
        'created_at' => $now, 'updated_at' => $now, 'last_by' => 'customer', 'unread' => 0,
    ), array('%s', '%s', '%d', '%s', '%s', '%s', '%s', '%d'));
    $id = (int) $wpdb->insert_id;
    phoenix_acc_ticket_add_message($id, 'customer', '', $c['data']['body']);
    do_action('phoenix_ticket_customer_wrote', $id, $phone);
    return phoenix_acc_ticket_shape(phoenix_acc_ticket_row($id), true, false);
}

/** ⚠ فقط تیکتِ همین شماره — شناسه از مرورگر آمده */
function phoenix_acc_ticket_own($phone, $id) {
    $t = phoenix_acc_ticket_row($id);
    return $t && hash_equals((string) $t->phone, (string) $phone) ? $t : null;
}

/** @return array|WP_Error */
function phoenix_acc_ticket_customer_reply($phone, $id, array $in) {
    global $wpdb;
    $t = phoenix_acc_ticket_own($phone, $id);
    if (!$t) {
        return new WP_Error('phoenix_acc_nf', 'این تیکت پیدا نشد.', array('status' => 404));
    }
    $c = phoenix_acc_ticket_clean($in, false);
    if (!$c['ok']) {
        return new WP_Error('phoenix_invalid', 'لطفاً متن پیام را بنویسید.', array('status' => 422, 'errors' => $c['errors']));
    }
    if (count(phoenix_acc_ticket_messages($t->id)) >= PHOENIX_ACC_TICKET_MSG_MAX) {
        return new WP_Error('phoenix_acc_many', 'این گفت‌وگو طولانی شده است؛ لطفاً تیکت جدیدی ثبت کنید.', array('status' => 409));
    }
    if ($e = phoenix_acc_ticket_throttle($phone, 'reply', 20)) {
        return $e;
    }
    $now = phoenix_acc_ticket_add_message($t->id, 'customer', '', $c['data']['body']);
    $wpdb->update(phoenix_acc_table_tickets(), array('status' => 'open', 'updated_at' => $now, 'last_by' => 'customer', 'unread' => 0),
        array('id' => (int) $t->id), array('%s', '%s', '%s', '%d'), array('%d'));
    do_action('phoenix_ticket_customer_wrote', (int) $t->id, $phone);
    return phoenix_acc_ticket_shape(phoenix_acc_ticket_row($t->id), true, false);
}

/** دیدنِ تیکت = پاسخِ تازه خوانده شد */
function phoenix_acc_ticket_customer_view($phone, $id) {
    global $wpdb;
    $t = phoenix_acc_ticket_own($phone, $id);
    if (!$t) {
        return null;
    }
    if ((int) $t->unread) {
        $wpdb->update(phoenix_acc_table_tickets(), array('unread' => 0), array('id' => (int) $t->id), array('%d'), array('%d'));
        $t->unread = 0;
    }
    return phoenix_acc_ticket_shape($t, true, false);
}

function phoenix_acc_ticket_customer_close($phone, $id) {
    global $wpdb;
    $t = phoenix_acc_ticket_own($phone, $id);
    if (!$t) {
        return null;
    }
    $wpdb->update(phoenix_acc_table_tickets(), array('status' => 'closed', 'updated_at' => gmdate('Y-m-d H:i:s')),
        array('id' => (int) $t->id), array('%s', '%s'), array('%d'));
    return phoenix_acc_ticket_shape(phoenix_acc_ticket_row($t->id), true, false);
}

/* ============================================================
   پشتیبانی (پنلِ مدیر)
   ============================================================ */

function phoenix_acc_ticket_counts() {
    global $wpdb;
    $t   = phoenix_acc_table_tickets();
    $out = array('open' => 0, 'answered' => 0, 'closed' => 0);
    foreach ((array) $wpdb->get_results("SELECT status, COUNT(*) AS n FROM {$t} GROUP BY status") as $r) {
        if (isset($out[$r->status])) {
            $out[$r->status] = (int) $r->n;
        }
    }
    return $out;
}

/** @param string $status از فهرستِ سفیدِ اسکیما */
function phoenix_acc_tickets_admin($status, $phone, $page) {
    global $wpdb;
    $t     = phoenix_acc_table_tickets();
    $per   = 30;
    $where = array('1=1');
    $args  = array();
    if ($status !== '') {
        $where[] = 'status = %s';
        $args[]  = $status;
    }
    if ($phone !== '') {
        $where[] = 'phone = %s';
        $args[]  = $phone;
    }
    $w     = implode(' AND ', $where);
    $total = (int) ($args ? $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t} WHERE {$w}", $args)) : $wpdb->get_var("SELECT COUNT(*) FROM {$t}"));
    /* نوبتِ ما اول: قدیمی‌ترین منتظر بالاتر */
    $rows  = (array) $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$t} WHERE {$w} ORDER BY (status = 'open') DESC, CASE WHEN status = 'open' THEN updated_at END ASC, updated_at DESC LIMIT %d OFFSET %d",
        array_merge($args, array($per, ($page - 1) * $per))
    ));
    $out = array();
    foreach ($rows as $r) {
        $row = phoenix_acc_ticket_shape($r, false, true);
        $c   = phoenix_acc_customer($r->phone);
        $row['customer'] = $c ? (string) $c->name : '';
        $out[] = $row;
    }
    return array('rows' => $out, 'total' => $total, 'page' => $page, 'pages' => max(1, (int) ceil($total / $per)), 'counts' => phoenix_acc_ticket_counts());
}

/** @return array|WP_Error */
function phoenix_acc_ticket_staff_act($id, $act, $body) {
    global $wpdb;
    $t = phoenix_acc_ticket_row($id);
    if (!$t) {
        return new WP_Error('phoenix_acc_nf', 'این تیکت پیدا نشد.', array('status' => 404));
    }
    $now  = gmdate('Y-m-d H:i:s');
    $user = wp_get_current_user();
    if ($act === 'reply') {
        $c = phoenix_acc_ticket_clean(array('body' => $body), false);
        if (!$c['ok']) {
            return new WP_Error('phoenix_invalid', 'متنِ پاسخ را بنویس.', array('status' => 422, 'errors' => $c['errors']));
        }
        phoenix_acc_ticket_add_message($t->id, 'staff', $user ? $user->user_login : '', $c['data']['body']);
        $wpdb->update(phoenix_acc_table_tickets(), array('status' => 'answered', 'updated_at' => $now, 'last_by' => 'staff', 'unread' => 1),
            array('id' => (int) $t->id), array('%s', '%s', '%s', '%d'), array('%d'));
        do_action('phoenix_ticket_staff_replied', (int) $t->id, (string) $t->phone);
    } else {
        $to = $act === 'close' ? 'closed' : 'open';
        $wpdb->update(phoenix_acc_table_tickets(), array('status' => $to, 'updated_at' => $now),
            array('id' => (int) $t->id), array('%s', '%s'), array('%d'));
    }
    phoenix_audit('ticket', 'ticket:' . (int) $t->id, (string) $t->status, $act === 'reply' ? 'answered' : ($act === 'close' ? 'closed' : 'open'),
        $act === 'reply' ? 'پاسخِ پشتیبانی' : ($act === 'close' ? 'بسته شد' : 'دوباره باز شد'));
    return phoenix_acc_ticket_shape(phoenix_acc_ticket_row($t->id), true, true);
}
