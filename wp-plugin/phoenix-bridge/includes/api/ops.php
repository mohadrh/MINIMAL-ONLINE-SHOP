<?php
/**
 * کارهای روزمره — صفِ تحویل، تاریخچه، تنظیمات.
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', 'phoenix_ops_routes');
function phoenix_ops_routes() {
    phoenix_api_route('/queue', 'GET', 'phoenix_api_queue_get', array(
        'status' => array('type' => 'string', 'enum' => array('', 'pending', 'needs_input', 'done', 'failed', 'cancelled'), 'default' => ''),
    ));
    phoenix_api_route('/queue/(?P<id>\d+)', 'POST', 'phoenix_api_queue_act', array(
        'act'      => array('type' => 'string', 'enum' => array('done', 'retry', 'cancel', 'deliver', 'ask'), 'required' => true),
        'delivery' => array('type' => 'object'),
        'message'  => array('type' => 'string'),
    ));
    phoenix_api_route('/queue/(?P<id>\d+)/reveal', 'GET', 'phoenix_api_queue_reveal');

    phoenix_api_route('/log', 'GET', 'phoenix_api_log_get', array(
        'kind' => array('type' => 'string', 'enum' => array('', 'setting', 'rate', 'price', 'discount', 'queue', 'product', 'customer', 'ticket'), 'default' => ''),
        'page' => array('type' => 'integer', 'minimum' => 1, 'default' => 1),
    ));

    phoenix_api_route('/settings', 'GET', 'phoenix_api_settings_get');
    phoenix_api_route('/settings', 'POST', 'phoenix_api_settings_save', array(
        'auto_fulfil'      => array('type' => 'boolean'),
        'fulfil_fail_stop' => array('type' => 'integer', 'minimum' => 1, 'maximum' => 20),
        'psrc_checkout'    => array('type' => 'boolean'),
        'psrc_fresh_min'   => array('type' => 'integer', 'minimum' => 1, 'maximum' => 240),
    ));
}

/* ============================================================
   صفِ تحویل
   ============================================================ */

const PHOENIX_FULFIL_WORDS = array(
    'stock_code'      => 'کد از انبار',
    'stock_account'   => 'یوزر و پسورد از انبار',
    'upgrade_on_user' => 'ارتقای اکانتِ خودِ مشتری',
    'api_topup'       => 'شارژ خودکار',
    'manual'          => 'دستی',
);

function phoenix_queue_payload($status) {
    $rows   = array();
    $orders = array(); // نمای هر سفارش یک بار، حتی اگر چند قلمش در صف باشد
    foreach ((array) phoenix_queue_list($status, 100) as $job) {
        $payload = json_decode((string) $job->payload, true);
        $payload = is_array($payload) ? $payload : array();
        $result  = json_decode((string) $job->result, true);
        $product = wc_get_product((int) $job->product_id);
        $mode    = isset($payload['mode']) ? (string) $payload['mode'] : '';
        $oid     = (int) $job->order_id;

        if (!array_key_exists($oid, $orders)) {
            $order = function_exists('wc_get_order') ? wc_get_order($oid) : null;
            $orders[$oid] = $order ? array_merge(phoenix_order_view($order), array(
                /* ⚠ نشانیِ سفارش از خودِ ووکامرس — با HPOS دیگر
                   ‎post.php?post=‎ نیست. */
                'edit_url' => $order->get_edit_order_url(),
            )) : null;
        }
        $view = $orders[$oid];
        $item = null;
        foreach ($view ? $view['items'] : array() as $it) {
            if ($it['item_id'] === (int) $job->item_id) {
                $item = $it;
            }
        }

        /* ⚠ ورودیِ مشتری فقط به‌صورتِ رشته — پنل آن را متن می‌گذارد نه HTML. */
        $inputs = array();
        foreach ((array) ($payload['inputs'] ?? array()) as $k => $v) {
            $inputs[] = array('key' => (string) $k, 'value' => is_scalar($v) ? (string) $v : wp_json_encode($v));
        }

        $rows[] = array(
            'id'         => (int) $job->id,
            'order_id'   => $oid,
            'item_id'    => (int) $job->item_id,
            'order_url'  => $view ? $view['edit_url'] : admin_url('post.php?post=' . $oid . '&action=edit'),
            'product'    => $product ? $product->get_name() : ('#' . (int) $job->product_id),
            'qty'        => (int) ($payload['qty'] ?? 1),
            'mode'       => PHOENIX_FULFIL_WORDS[$mode] ?? ($mode === '' ? 'نامشخص' : $mode),
            'mode_key'   => $mode,
            /* ورودی‌های تازه (اگر مشتری اصلاح کرده) از خودِ قلم، وگرنه از صف */
            'inputs'     => $item && $item['inputs'] ? $item['inputs'] : $inputs,
            'status'     => (string) $job->status,
            'tries'      => (int) $job->tries,
            'created'    => mysql2date('c', $job->created_at, false),
            'note'       => is_array($result) && isset($result['note']) ? (string) $result['note'] : '',
            'deliveries' => $item ? $item['deliveries'] : array(),
            'required'   => phoenix_queue_required($product, $item ? $item['inputs'] : $inputs),
            'order'      => $view,
        );
    }
    return array(
        'counts'      => phoenix_queue_counts(),
        'rows'        => $rows,
        'auto_fulfil' => (bool) phoenix_setting('auto_fulfil'),
    );
}

/**
 * ورودی‌هایی که محصول از مشتری می‌خواهد، و اینکه داده شده یا نه —
 * برای چک‌لیستِ پیش از تحویل.
 */
function phoenix_queue_required($product, array $inputs) {
    if (!$product) {
        return array();
    }
    $owner = $product->get_parent_id() ? $product->get_parent_id() : $product->get_id();
    $f     = phoenix_get_fields($owner);
    $given = array();
    foreach ($inputs as $i) {
        if (trim((string) $i['value']) !== '') {
            $given[$i['key']] = true;
            /* سایت ورودی را با عنوانش ذخیره می‌کند، نه همیشه با کلید */
        }
    }
    $out = array();
    foreach ((array) ($f['required_inputs'] ?? array()) as $r) {
        if (!is_array($r) || empty($r['key'])) {
            continue;
        }
        $label = (string) ($r['label'] ?? $r['key']);
        $out[] = array('key' => (string) $r['key'], 'label' => $label,
                       'given' => isset($given[$r['key']]) || isset($given[$label]));
    }
    return $out;
}

function phoenix_api_queue_get(WP_REST_Request $r) {
    return phoenix_api_ok(phoenix_queue_payload((string) $r['status']));
}

/** کار + سفارش + قلمش، یا خطا */
function phoenix_queue_job_context($id) {
    global $wpdb;
    $t   = phoenix_table_queue();
    $job = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$t} WHERE id = %d", (int) $id));
    if (!$job) {
        return new WP_Error('phoenix_queue', 'این کار پیدا نشد.', array('status' => 404));
    }
    $order = wc_get_order((int) $job->order_id);
    $item  = $order ? $order->get_item((int) $job->item_id) : null;
    if (!$order || !$item) {
        return new WP_Error('phoenix_queue', 'سفارش یا قلمِ این کار دیگر وجود ندارد.', array('status' => 404));
    }
    return array($job, $order, $item);
}

function phoenix_queue_set($job, $status, $note) {
    global $wpdb;
    $wpdb->update(phoenix_table_queue(), array(
        'status'     => $status,
        'updated_at' => current_time('mysql', true),
        'result'     => wp_json_encode(array('note' => $note), JSON_UNESCAPED_UNICODE),
    ), array('id' => (int) $job->id), array('%s', '%s', '%s'), array('%d'));
    phoenix_audit('queue', 'job:' . $job->id, $job->status, $status, $note !== '' ? $note : 'دستی از پنل');
}

function phoenix_api_queue_act(WP_REST_Request $r) {
    $act = (string) $r['act'];

    /* ---------- تحویل: چه چیزی به مشتری داده شد ---------- */
    if ($act === 'deliver') {
        $ctx = phoenix_queue_job_context((int) $r['id']);
        if (is_wp_error($ctx)) {
            return $ctx;
        }
        list($job, $order, $item) = $ctx;
        /* ⚠ سفارشِ پرداخت‌نشده تحویل نمی‌شود — همان جایی که کلاهبرداری
           اتفاق می‌افتد: «پرداخت کردم، زود بده». */
        if (!$order->is_paid()) {
            return phoenix_api_fail('phoenix_unpaid', 'این سفارش هنوز پرداخت نشده؛ تحویل نمی‌شود.', 409);
        }
        $c = phoenix_delivery_clean($r['delivery']);
        if (!$c['ok']) {
            return new WP_Error('phoenix_invalid', 'بعضی فیلدها درست نیستند.', array('status' => 422, 'errors' => $c['errors']));
        }
        $user = wp_get_current_user();
        $res  = phoenix_delivery_add($order, $item, $c['data'], $user ? $user->user_login : '');
        if (is_wp_error($res)) {
            return phoenix_api_fail($res->get_error_code(), $res->get_error_message(), 500);
        }
        phoenix_queue_set($job, 'done', 'تحویل شد');
        phoenix_order_maybe_complete(wc_get_order($order->get_id()));
        do_action('phoenix_queue_delivered', $job, $order, $item);
        return phoenix_api_ok(phoenix_queue_payload(''));
    }

    /* ---------- اصلاح از مشتری: ورودیِ اشتباه، اکانتِ ناموجود، … ---------- */
    if ($act === 'ask') {
        $ctx = phoenix_queue_job_context((int) $r['id']);
        if (is_wp_error($ctx)) {
            return $ctx;
        }
        list($job, $order, $item) = $ctx;
        $msg = trim(sanitize_textarea_field((string) $r['message']));
        if ($msg === '' || mb_strlen($msg) > 500) {
            return new WP_Error('phoenix_invalid', 'پیام برای مشتری لازم است.', array('status' => 422, 'errors' => array('message' => 'بنویس چه چیزی باید اصلاح شود — حداکثر ۵۰۰ نویسه.')));
        }
        phoenix_queue_set($job, 'needs_input', $msg);
        /* مشتری در حسابش می‌بیند و همان‌جا اصلاح می‌کند (Phoenix Account) */
        $order->add_order_note('برای تحویلِ «' . $item->get_name() . '» این مورد باید اصلاح شود: ' . $msg, true);
        do_action('phoenix_queue_needs_input', $job, $order, $item, $msg);
        return phoenix_api_ok(phoenix_queue_payload(''));
    }

    $res = phoenix_queue_admin_act((int) $r['id'], $act);
    if (is_array($res) && ($res['type'] ?? '') === 'error') {
        return phoenix_api_fail('phoenix_queue', $res['text'], 404);
    }
    return phoenix_api_ok(phoenix_queue_payload(''));
}

/**
 * رازِ تحویل‌ها برای مدیر — فقط با کلیک، و ثبت‌شده.
 * ⚠ در فهرستِ صف همیشه پوشیده است؛ هر بار باز کردن در تاریخچه می‌آید.
 */
function phoenix_api_queue_reveal(WP_REST_Request $r) {
    $ctx = phoenix_queue_job_context((int) $r['id']);
    if (is_wp_error($ctx)) {
        return $ctx;
    }
    list($job, $order, $item) = $ctx;
    phoenix_audit('queue', 'job:' . $job->id, null, null, 'نمایشِ جزئیاتِ تحویل');
    return phoenix_api_ok(array('deliveries' => phoenix_delivery_entries($item, true)));
}

/* ============================================================
   تاریخچه
   ============================================================ */

/**
 * ⚠ ‎$kind‎ از فهرستِ سفیدِ اسکیما آمده و باز هم ‎prepare‎ می‌شود.
 * این صفحه فقط می‌خواند: دفترِ رویدادی که از پنل پاک یا ویرایش
 * شود، دیگر دفترِ رویداد نیست.
 */
function phoenix_api_log_get(WP_REST_Request $r) {
    global $wpdb;
    $table = phoenix_table_audit();
    $kind  = (string) $r['kind'];
    $per   = 40;
    $page  = max(1, (int) $r['page']);
    $off   = ($page - 1) * $per;

    if ($kind !== '') {
        $total = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE kind = %s", $kind));
        $rows  = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table} WHERE kind = %s ORDER BY id DESC LIMIT %d OFFSET %d", $kind, $per, $off));
    } else {
        $total = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
        $rows  = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table} ORDER BY id DESC LIMIT %d OFFSET %d", $per, $off));
    }

    $out = array();
    foreach ((array) $rows as $row) {
        $out[] = array(
            'at'      => mysql2date('c', $row->at, false),
            'kind'    => (string) $row->kind,
            'actor'   => (string) $row->actor,
            'subject' => (string) $row->subject,
            'before'  => $row->before_val === null ? null : (string) $row->before_val,
            'after'   => $row->after_val === null ? null : (string) $row->after_val,
            'note'    => $row->note === null ? '' : (string) $row->note,
        );
    }

    return phoenix_api_ok(array(
        'rows'  => $out,
        'total' => $total,
        'page'  => $page,
        'pages' => max(1, (int) ceil($total / $per)),
    ));
}

/* ============================================================
   تنظیمات
   ============================================================ */

function phoenix_settings_payload() {
    global $wp_version;

    $next = array();
    foreach (array(
        'phoenix_rate_hourly' => 'به‌روزرسانیِ ساعتیِ نرخ',
        'phoenix_daily'       => 'هرسِ روزانه‌ی تاریخچه',
        'phoenix_reprice_all' => 'بازنویسیِ قیمت‌ها',
        'phoenix_fulfil_tick' => 'تحویلِ خودکار',
    ) as $hook => $label) {
        $ts = wp_next_scheduled($hook);
        $next[] = array('hook' => $hook, 'label' => $label, 'at' => $ts ? gmdate('c', $ts) : null);
    }

    return array(
        'auto_fulfil'      => (bool) phoenix_setting('auto_fulfil'),
        'fulfil_fail_stop' => (int) phoenix_setting('fulfil_fail_stop', 3),
        'psrc_checkout'    => (bool) phoenix_setting('psrc_checkout', true),
        'psrc_fresh_min'   => (int) phoenix_setting('psrc_fresh_min', 10),
        /* ⚠ خریدِ خودکار فقط وقتی قابلِ روشن کردن است که کسی
           تأمین‌کننده را وصل کرده باشد. بدونش، کلید روشن می‌شد و
           هیچ اتفاقی نمی‌افتاد — بدترین نوعِ کلید. */
        'provider'         => (bool) has_filter('phoenix_fulfil_provider'),
        'fail_streak'      => (int) get_option('phoenix_fulfil_fail_streak', 0),
        'system'           => array(
            'version'   => PHOENIX_BRIDGE_VERSION,
            'php'       => PHP_VERSION,
            'wordpress' => (string) $wp_version,
            'woo'       => defined('WC_VERSION') ? WC_VERSION : '',
            'real_cron' => defined('DISABLE_WP_CRON') && DISABLE_WP_CRON,
            'site'      => phoenix_site_url(),
            'db'        => get_option(PHOENIX_DB_VERSION_OPTION) === PHOENIX_DB_VERSION,
        ),
        'schedule'         => $next,
    );
}

function phoenix_api_settings_get(WP_REST_Request $r) {
    return phoenix_api_ok(phoenix_settings_payload());
}

function phoenix_api_settings_save(WP_REST_Request $r) {
    $patch = array();
    if ($r->has_param('auto_fulfil')) {
        $on = (bool) $r['auto_fulfil'];
        if ($on && !has_filter('phoenix_fulfil_provider')) {
            return phoenix_api_fail('phoenix_no_provider', 'هنوز هیچ تأمین‌کننده‌ای وصل نشده؛ روشن کردنِ خریدِ خودکار کاری نمی‌کند.', 409);
        }
        $patch['auto_fulfil'] = $on;
        if ($on) {
            /* توقفِ قبلی پاک می‌شود — روشن کردنِ دوباره یعنی
               ادمین دیده چه شده و می‌خواهد دوباره امتحان شود. */
            update_option('phoenix_fulfil_fail_streak', 0, false);
        }
    }
    if ($r->has_param('fulfil_fail_stop')) {
        $patch['fulfil_fail_stop'] = (int) $r['fulfil_fail_stop'];
    }
    if ($r->has_param('psrc_checkout')) {
        $patch['psrc_checkout'] = (bool) $r['psrc_checkout'];
    }
    if ($r->has_param('psrc_fresh_min')) {
        $patch['psrc_fresh_min'] = (int) $r['psrc_fresh_min'];
    }
    if ($patch) {
        phoenix_settings_save($patch, 'از پنل');
    }
    return phoenix_api_ok(phoenix_settings_payload());
}
