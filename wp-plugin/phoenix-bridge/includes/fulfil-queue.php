<?php
/**
 * صفِ تحویل.
 *
 * ============================================================
 * ⚠ این بخش پیش‌فرض خاموش است، و این یک تصمیم است نه کارِ
 *   ناتمام.
 *
 * خواسته این بود: «وقتی مشتری واریز کرد، خودش برود بخرد و روی
 * اکانتِ مشتری فعال کند.» درست است و ساخته می‌شود — ولی
 * خودکارش آخرین قدم است، نه اول:
 *
 *   ۱ پولِ واقعی خرج می‌کند. یک حلقه‌ی خراب، به‌جای یک خرید صد
 *     خرید می‌کند. برای همین هر کار یک «کلیدِ یکتا» دارد که در
 *     پایگاه داده ‎UNIQUE‎ است — دوبار ثبت شدن، خطای پایگاه
 *     داده می‌دهد نه خریدِ دوم.
 *
 *   ۲ تأمین‌کننده هنوز معلوم نیست. بدونِ API واقعی، هر کدی که
 *     برای «خرید» بنویسم حدس است. پس رابطِ ‎provider‎ تعریف
 *     شده و پیاده‌سازیِ پیش‌فرضش «بگذار در صفِ دستی» است.
 *
 *   ۳ سقف لازم دارد. سقفِ ریالیِ روزانه، و توقفِ خودکار وقتی
 *     چند کارِ پشتِ‌سرهم شکست خورد.
 *
 * تا آن روز، این صف کارِ واقعی می‌کند: هر سفارشِ پرداخت‌شده یک
 * ردیف می‌شود، اپراتور می‌بیندش، دستی انجامش می‌دهد و تیک
 * می‌زند. یعنی هیچ سفارشی گم نمی‌شود، حتی بدونِ خودکار.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

/* ============================================================
   ساختِ کار
   ============================================================ */

/**
 * ⚠ روی ‎processing‎ و ‎completed‎، و کلیدِ یکتا جلوی دوباره‌کاری
 *   را می‌گیرد.
 *
 * یک سفارش می‌تواند چند بار این قلاب‌ها را بزند: درگاه دو بار
 * callback بدهد، ادمین وضعیت را دستی عوض کند، یا افزونه‌ای
 * دیگر ‎save‎ صدا بزند. بدونِ کلیدِ یکتا، هر بار یک کارِ تازه
 * ساخته می‌شود و روزی که خودکار روشن شود، همان سفارش چند بار
 * خریداری می‌شود.
 *
 * کلید از ‎order:item:product‎ ساخته می‌شود، پس همیشه یکی است.
 */
add_action('woocommerce_order_status_processing', 'phoenix_queue_from_order', 5);
add_action('woocommerce_order_status_completed', 'phoenix_queue_from_order', 5);
function phoenix_queue_from_order($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) {
        return;
    }

    foreach ($order->get_items() as $item_id => $item) {
        $product_id = $item->get_variation_id() ? $item->get_variation_id() : $item->get_product_id();
        if (!$product_id) {
            continue;
        }

        $f    = phoenix_get_fields($product_id);
        $mode = isset($f['fulfillment']) ? $f['fulfillment'] : '';

        /* کدِ انبار را ‎orders.php‎ خودش تحویل می‌دهد و به صف
           نیازی ندارد. صف برای کارهایی است که باید *خریده*
           شوند. */
        if (in_array($mode, array('stock_code', 'stock_account'), true)) {
            continue;
        }

        phoenix_queue_add($order_id, (int) $item_id, (int) $product_id, array(
            'qty'    => (int) $item->get_quantity(),
            'mode'   => $mode,
            'inputs' => phoenix_order_item_inputs($item),
        ));
    }
}

/** ورودی‌هایی که مشتری داده (ایمیل اکانت، آیدی تلگرام، …) */
function phoenix_order_item_inputs($item) {
    $out = array();
    foreach ($item->get_meta_data() as $meta) {
        $d = $meta->get_data();
        $k = isset($d['key']) ? (string) $d['key'] : '';
        /* متای داخلیِ ووکامرس با زیرخط شروع می‌شود */
        if ($k === '' || $k[0] === '_') {
            continue;
        }
        $out[$k] = is_scalar($d['value']) ? (string) $d['value'] : wp_json_encode($d['value']);
    }
    return $out;
}

function phoenix_queue_add($order_id, $item_id, $product_id, array $payload) {
    global $wpdb;

    $idem = substr(hash('sha256', $order_id . ':' . $item_id . ':' . $product_id), 0, 64);
    $now  = current_time('mysql', true);

    /* ⚠ ‎insert‎ روی کلیدِ تکراری شکست می‌خورد و همین درست است.
       بررسیِ «آیا هست؟» بعد از «اضافه کن» یک پنجره‌ی مسابقه
       دارد؛ محدودیتِ ‎UNIQUE‎ی پایگاه داده ندارد. */
    $ok = $wpdb->insert(
        phoenix_table_queue(),
        array(
            'created_at' => $now,
            'updated_at' => $now,
            'order_id'   => (int) $order_id,
            'item_id'    => (int) $item_id,
            'product_id' => (int) $product_id,
            'idem_key'   => $idem,
            'status'     => 'pending',
            'tries'      => 0,
            'payload'    => wp_json_encode($payload, JSON_UNESCAPED_UNICODE),
        ),
        array('%s', '%s', '%d', '%d', '%d', '%s', '%s', '%d', '%s')
    );

    if ($ok) {
        phoenix_audit('queue', 'order:' . $order_id, null, 'pending', 'کارِ تحویل ساخته شد');
    }
    return (bool) $ok;
}

/* ============================================================
   خواندن
   ============================================================ */

function phoenix_queue_counts() {
    global $wpdb;
    $table = phoenix_table_queue();

    /* بدونِ ‎prepare‎ چون هیچ مقداری در این پرس‌وجو نیست — نامِ
       جدول از تابعِ بی‌آرگومانِ ‎phoenix_table_queue‎ می‌آید. */
    $rows = $wpdb->get_results("SELECT status, COUNT(*) AS n FROM {$table} GROUP BY status");

    $out = array('pending' => 0, 'done' => 0, 'failed' => 0, 'cancelled' => 0);
    foreach ((array) $rows as $r) {
        if (isset($out[$r->status])) {
            $out[$r->status] = (int) $r->n;
        }
    }
    return $out;
}

/**
 * @param string $status از فهرستِ سفید
 */
function phoenix_queue_list($status = '', $limit = 50) {
    global $wpdb;

    $table = phoenix_table_queue();
    $limit = max(1, min(200, (int) $limit));
    $known = array('pending', 'done', 'failed', 'cancelled');

    if ($status !== '' && in_array($status, $known, true)) {
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table} WHERE status = %s ORDER BY id DESC LIMIT %d",
            $status,
            $limit
        ));
    }
    return $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$table} ORDER BY id DESC LIMIT %d",
        $limit
    ));
}

/* ============================================================
   کنشِ دستی
   ============================================================ */

/**
 * ⚠ هر سه کنش دستی‌اند و همه در تاریخچه ثبت می‌شوند.
 *
 * «تیک زدم که انجام شد» بدونِ ردِ اینکه چه کسی و کِی، یعنی
 * فردا که مشتری بگوید «چیزی نگرفتم» هیچ‌کس نمی‌داند چه شده.
 */
function phoenix_queue_admin_act($id, $act) {
    global $wpdb;

    $table = phoenix_table_queue();
    $id    = (int) $id;

    $job = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %d", $id));
    if (!$job) {
        return array('type' => 'error', 'text' => 'این کار پیدا نشد.');
    }

    $map = array('retry' => 'pending', 'done' => 'done', 'cancel' => 'cancelled');
    $new = $map[$act];

    $wpdb->update(
        $table,
        array('status' => $new, 'updated_at' => current_time('mysql', true)),
        array('id' => $id),
        array('%s', '%s'),
        array('%d')
    );

    phoenix_audit('queue', 'job:' . $id, $job->status, $new, 'دستی از پنل');

    $words = array('retry' => 'به صف برگشت', 'done' => 'انجام‌شده علامت خورد', 'cancel' => 'لغو شد');
    return 'کار #' . $id . ' ' . $words[$act] . '.';
}

/* ============================================================
   اجرای خودکار — هنوز خاموش
   ============================================================ */

/**
 * رابطِ تأمین‌کننده.
 *
 * وقتی API واقعی آمد، یک افزونه یا همین‌جا این فیلتر را
 * می‌گیرد و آرایه‌ی ‎{ok, note}‎ برمی‌گرداند. تا آن روز
 * پیش‌فرض ‎false‎ است یعنی «بلد نیستم، بگذارش برای آدم».
 */
function phoenix_fulfil_run($job) {
    /**
     * @param false|array $result
     */
    $result = apply_filters('phoenix_fulfil_provider', false, $job);

    if (!is_array($result) || !isset($result['ok'])) {
        return false;
    }
    return $result;
}

add_action('phoenix_fulfil_tick', 'phoenix_fulfil_tick_cb');
function phoenix_fulfil_tick_cb() {
    if (!phoenix_setting('auto_fulfil')) {
        return;
    }

    /* ⚠ توقفِ خودکار بعد از چند شکستِ پشت‌سرهم.
       اگر تأمین‌کننده خراب شده باشد، تلاشِ بی‌پایان یعنی
       سوزاندنِ سهمیه و احتمالاً پول. */
    $fails = (int) get_option('phoenix_fulfil_fail_streak', 0);
    $limit = max(1, (int) phoenix_setting('fulfil_fail_stop', 3));
    if ($fails >= $limit) {
        return;
    }

    global $wpdb;
    $table = phoenix_table_queue();

    /* ثابتِ محض — هیچ ورودی‌ای این‌جا نیست */
    $job = $wpdb->get_row("SELECT * FROM {$table} WHERE status = 'pending' ORDER BY id ASC LIMIT 1");
    if (!$job) {
        return;
    }

    $res = phoenix_fulfil_run($job);
    $now = current_time('mysql', true);

    if ($res === false) {
        /* هیچ تأمین‌کننده‌ای نبود — کار دستِ آدم می‌ماند، نه
           اینکه «ناموفق» علامت بخورد. این دو چیزِ متفاوت‌اند. */
        return;
    }

    if (!empty($res['ok'])) {
        $wpdb->update($table, array(
            'status'     => 'done',
            'updated_at' => $now,
            'result'     => wp_json_encode($res, JSON_UNESCAPED_UNICODE),
        ), array('id' => $job->id), array('%s', '%s', '%s'), array('%d'));

        update_option('phoenix_fulfil_fail_streak', 0, false);
        phoenix_audit('queue', 'job:' . $job->id, 'pending', 'done', 'خودکار');
        return;
    }

    $tries = (int) $job->tries + 1;
    $wpdb->update($table, array(
        'status'     => $tries >= 3 ? 'failed' : 'pending',
        'tries'      => $tries,
        'updated_at' => $now,
        'result'     => wp_json_encode($res, JSON_UNESCAPED_UNICODE),
    ), array('id' => $job->id), array('%s', '%d', '%s', '%s'), array('%d'));

    update_option('phoenix_fulfil_fail_streak', $fails + 1, false);
    phoenix_audit('queue', 'job:' . $job->id, 'pending', $tries >= 3 ? 'failed' : 'pending',
        isset($res['note']) ? (string) $res['note'] : 'شکست');
}
