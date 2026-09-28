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
        'status' => array('type' => 'string', 'enum' => array('', 'pending', 'done', 'failed', 'cancelled'), 'default' => ''),
    ));
    phoenix_api_route('/queue/(?P<id>\d+)', 'POST', 'phoenix_api_queue_act', array(
        'act' => array('type' => 'string', 'enum' => array('done', 'retry', 'cancel'), 'required' => true),
    ));

    phoenix_api_route('/log', 'GET', 'phoenix_api_log_get', array(
        'kind' => array('type' => 'string', 'enum' => array('', 'setting', 'rate', 'price', 'discount', 'queue', 'product'), 'default' => ''),
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
    $rows = array();
    foreach ((array) phoenix_queue_list($status, 100) as $job) {
        $payload = json_decode((string) $job->payload, true);
        $payload = is_array($payload) ? $payload : array();
        $result  = json_decode((string) $job->result, true);
        $product = wc_get_product((int) $job->product_id);
        $mode    = isset($payload['mode']) ? (string) $payload['mode'] : '';
        /* ⚠ نشانیِ سفارش از خودِ ووکامرس.
           با انبارِ سفارشِ تازه (HPOS، پیش‌فرضِ نسخه‌های جدید) سفارش
           دیگر ‎post.php?post=‎ نیست و آن نشانی صفحه‌ی خالی می‌دهد. */
        $order     = function_exists('wc_get_order') ? wc_get_order((int) $job->order_id) : null;
        $order_url = $order ? $order->get_edit_order_url()
            : admin_url('post.php?post=' . (int) $job->order_id . '&action=edit');

        /* ⚠ ورودیِ مشتری فقط به‌صورتِ رشته — هر چه در سفارش نوشته،
           همان نشان داده می‌شود و پنل آن را متن می‌گذارد نه HTML. */
        $inputs = array();
        foreach ((array) ($payload['inputs'] ?? array()) as $k => $v) {
            $inputs[] = array('key' => (string) $k, 'value' => is_scalar($v) ? (string) $v : wp_json_encode($v));
        }

        $rows[] = array(
            'id'        => (int) $job->id,
            'order_id'  => (int) $job->order_id,
            'order_url' => $order_url,
            'product'   => $product ? $product->get_name() : ('#' . (int) $job->product_id),
            'qty'       => (int) ($payload['qty'] ?? 1),
            'mode'      => PHOENIX_FULFIL_WORDS[$mode] ?? ($mode === '' ? 'نامشخص' : $mode),
            'inputs'    => $inputs,
            'status'    => (string) $job->status,
            'tries'     => (int) $job->tries,
            'created'   => mysql2date('c', $job->created_at, false),
            'note'      => is_array($result) && isset($result['note']) ? (string) $result['note'] : '',
        );
    }
    return array(
        'counts'      => phoenix_queue_counts(),
        'rows'        => $rows,
        'auto_fulfil' => (bool) phoenix_setting('auto_fulfil'),
    );
}

function phoenix_api_queue_get(WP_REST_Request $r) {
    return phoenix_api_ok(phoenix_queue_payload((string) $r['status']));
}

function phoenix_api_queue_act(WP_REST_Request $r) {
    $res = phoenix_queue_admin_act((int) $r['id'], (string) $r['act']);
    if (is_array($res) && ($res['type'] ?? '') === 'error') {
        return phoenix_api_fail('phoenix_queue', $res['text'], 404);
    }
    return phoenix_api_ok(phoenix_queue_payload(''));
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
