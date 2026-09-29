<?php
/**
 * مشتری — ردیفِ جدولِ ‎phoenix_acc_customers‎، رمز و قفل.
 *
 * ============================================================
 * ⚠ قفلِ تلاشِ اشتباه روی «شماره» است، نه روی ردیفِ مشتری.
 *
 * اگر فقط مشتری‌های موجود قفل می‌شدند، مهاجم از «قفل شد» یا «نشد»
 * می‌فهمید کدام شماره این‌جا حساب دارد. پس شمارنده برای هر شماره‌ای
 * که امتحان شود نگه داشته می‌شود و پاسخ برای همه یکی است.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

/** @return object|null */
function phoenix_acc_customer($phone) {
    global $wpdb;
    $t = phoenix_acc_table_customers();
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM {$t} WHERE phone = %s", (string) $phone)) ?: null;
}

/** ردیفِ مشتری را بساز اگر نیست — بی‌آنکه چیزی از قبل را بازنویسی کند */
function phoenix_acc_customer_ensure($phone) {
    global $wpdb;
    $t = phoenix_acc_table_customers();
    $wpdb->query($wpdb->prepare(
        "INSERT IGNORE INTO {$t} (phone, created_at) VALUES (%s, %s)", (string) $phone, gmdate('Y-m-d H:i:s')
    ));
}

function phoenix_acc_customer_update($phone, array $data) {
    global $wpdb;
    phoenix_acc_customer_ensure($phone);
    return false !== $wpdb->update(phoenix_acc_table_customers(), $data, array('phone' => (string) $phone));
}

/**
 * آمارِ خرید از خودِ سفارش‌ها — نه جمع‌زدنِ تدریجی که با یک رویدادِ
 * جاافتاده برای همیشه غلط بماند.
 */
function phoenix_acc_customer_refresh($phone) {
    if (!function_exists('wc_get_orders') || $phone === '') {
        return;
    }
    $paid  = wc_get_orders(array('billing_phone' => $phone, 'status' => array('processing', 'completed'), 'limit' => -1, 'type' => 'shop_order'));
    $sum   = 0;
    foreach ($paid as $o) {
        $sum += (int) round((float) $o->get_total());
    }
    $last = wc_get_orders(array('billing_phone' => $phone, 'limit' => 1, 'orderby' => 'date', 'order' => 'DESC', 'type' => 'shop_order'));
    $data = array('orders_count' => count($paid), 'paid_total' => $sum);
    if ($last && $last[0]->get_date_created()) {
        $data['last_order_at'] = gmdate('Y-m-d H:i:s', $last[0]->get_date_created()->getTimestamp());
        /* نامِ مشتری از سفارش، فقط اگر خودش هنوز در حسابش ننوشته */
        $row = phoenix_acc_customer($phone);
        if (!$row || $row->name === '') {
            $name = trim($last[0]->get_billing_first_name() . ' ' . $last[0]->get_billing_last_name());
            if ($name !== '') {
                $data['name'] = phoenix_acc_text($name, 100);
            }
        }
        if (!$row || $row->email === '') {
            $email = (string) $last[0]->get_billing_email();
            if ($email !== '' && is_email($email)) {
                $data['email'] = $email;
            }
        }
    }
    phoenix_acc_customer_update($phone, $data);
}

/** هر تغییرِ وضعیتِ سفارش → آمارِ همان مشتری */
add_action('woocommerce_order_status_changed', 'phoenix_acc_on_order_status', 20, 1);
add_action('phoenix_order_created', 'phoenix_acc_on_order_status', 20, 1);
function phoenix_acc_on_order_status($order) {
    $order = is_object($order) ? $order : (function_exists('wc_get_order') ? wc_get_order((int) $order) : null);
    if (!$order) {
        return;
    }
    $phone = phoenix_normalize_phone((string) $order->get_billing_phone());
    if ($phone !== '') {
        phoenix_acc_customer_refresh($phone);
    }
}

/** حسابِ بسته‌شده سفارشِ تازه هم نمی‌دهد (فیلترِ Bridge) */
add_filter('phoenix_order_blocked', 'phoenix_acc_order_blocked', 10, 2);
function phoenix_acc_order_blocked($msg, $phone) {
    $c = phoenix_acc_customer((string) $phone);
    return $c && (int) $c->blocked ? 'این حساب مسدود شده است. لطفاً با پشتیبانی تماس بگیرید.' : $msg;
}

/* ============================================================
   قفلِ تلاشِ اشتباه
   ============================================================ */

function phoenix_acc_fail_key($phone) {
    return 'phoenix_acc_lf_' . md5((string) $phone);
}

/** @return int ثانیه‌های باقیِ قفل؛ صفر یعنی آزاد */
function phoenix_acc_locked_for($phone) {
    $r = get_transient(phoenix_acc_fail_key($phone));
    return is_array($r) && !empty($r['until']) ? max(0, (int) $r['until'] - time()) : 0;
}

function phoenix_acc_fail_hit($phone) {
    $key = phoenix_acc_fail_key($phone);
    $r   = get_transient($key);
    $n   = (is_array($r) ? (int) $r['n'] : 0) + 1;
    $sec = phoenix_acc_lock_seconds($n);
    set_transient($key, array('n' => $n, 'until' => $sec ? time() + $sec : 0), DAY_IN_SECONDS);
}

function phoenix_acc_fail_clear($phone) {
    delete_transient(phoenix_acc_fail_key($phone));
}

/**
 * رمزِ تازه، و بیرون انداختنِ بقیه‌ی نشست‌ها.
 *
 * ⚠ کسی که رمز را عوض می‌کند معمولاً فکر می‌کند کسی دیگر واردِ
 * حسابش شده؛ اگر نشست‌های قبلی باز بمانند، عوض کردنِ رمز کاری نکرده.
 *
 * @param int $keep شناسه‌ی نشستی که بماند (همین دستگاه)، یا صفر
 */
function phoenix_acc_password_set($phone, $pass, $keep) {
    phoenix_acc_customer_update($phone, array(
        'pass_hash'   => phoenix_acc_password_hash($pass),
        'pass_set_at' => gmdate('Y-m-d H:i:s'),
    ));
    phoenix_acc_fail_clear($phone);
    return phoenix_acc_session_revoke_others($phone, (int) $keep);
}

/**
 * ژتونِ Bridge (بعد از کدِ پیامکی) → شماره، فقط یک بار.
 *
 * ⚠ ژتون پانزده دقیقه معتبر است؛ بدونِ «فقط یک بار»، کسی که یک بار
 * دیدش تا پانزده دقیقه هر کاری با آن می‌کرد.
 *
 * @return string شماره، یا خالی
 */
function phoenix_acc_token_consume($token) {
    $token = (string) $token;
    $phone = function_exists('phoenix_token_phone') ? phoenix_token_phone($token) : '';
    if ($phone === '') {
        return '';
    }
    $used = 'phoenix_acc_used_' . hash('sha256', $token);
    if (get_transient($used)) {
        return '';
    }
    set_transient($used, 1, 20 * MINUTE_IN_SECONDS);
    return $phone;
}

/* ============================================================
   سفارش‌های مشتری
   ============================================================ */

/**
 * سفارش مالِ این شماره است؟ — ‎null‎ اگر نه.
 *
 * ⚠ «پیدا نشد» برای هر دو حالت؛ «مالِ تو نیست» یعنی «این شماره‌ی
 * سفارش وجود دارد».
 */
function phoenix_acc_own_order($phone, $id) {
    $order = function_exists('wc_get_order') ? wc_get_order((int) $id) : null;
    if (!$order || $order->get_type() !== 'shop_order') {
        return null;
    }
    $owner = phoenix_normalize_phone((string) $order->get_billing_phone());
    return $owner !== '' && hash_equals($owner, (string) $phone) ? $order : null;
}

/** ورودی‌های لازمِ هر قلم (برای فرمِ «اصلاح») کنارِ نمای سفارش */
function phoenix_acc_view_with_required($order, $reveal) {
    $view = phoenix_order_view($order, $reveal);
    foreach ($view['items'] as &$it) {
        $product = wc_get_product((int) $it['product_id']);
        $it['required'] = function_exists('phoenix_queue_required') ? phoenix_queue_required($product, $it['inputs']) : array();
    }
    unset($it);
    return phoenix_acc_order_for_customer($view);
}

/** مدتِ پلنِ یک قلم (روز) — از فیلدهای Bridge */
function phoenix_acc_item_days($product_id) {
    $product = wc_get_product((int) $product_id);
    if (!$product) {
        return 0;
    }
    $f = phoenix_get_fields($product->get_id());
    if ($product->get_parent_id()) {
        return (int) ($f['duration_days'] ?? 0);
    }
    return (int) ($f['variant_duration'] ?? 0);
}
