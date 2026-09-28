<?php
/**
 * قیمت در فهرستِ محصولاتِ ووکامرس — یک ستون و یک کنشِ گروهی.
 *
 * ⚠ ویرایشِ قیمت این‌جا نیست.
 *
 * تا ۱٫۲٫۰ فیلدهای قیمتِ تمام‌شده کنارِ قیمتِ ووکامرس بودند. حالا
 * در ویرایشگرِ پنل‌اند، با پیش‌نمایشِ زنده به‌جای «آخرین محاسبه».
 * این فایل فقط نشان می‌دهد و بازنویسی می‌کند.
 */

if (!defined('ABSPATH')) {
    exit;
}

/* ============================================================
   ستون در فهرستِ محصولات
   ============================================================ */

/**
 * ⚠ یک ستون، نه سه.
 *
 * فهرستِ محصولاتِ ووکامرس از قبل شلوغ است. آنچه واقعاً لازم
 * است این است که در یک نگاه بشود دید کدام محصول دستِ موتور
 * است و قیمتِ تمام‌شده‌اش چند — بقیه‌اش یک کلیک دورتر است.
 */
add_filter('manage_edit-product_columns', 'phoenix_product_column', 20);
function phoenix_product_column($cols) {
    $out = array();
    foreach ($cols as $key => $label) {
        $out[$key] = $label;
        if ($key === 'price') {
            $out['phoenix_cost'] = 'قیمتِ تمام‌شده';
        }
    }
    if (!isset($out['phoenix_cost'])) {
        $out['phoenix_cost'] = 'قیمتِ تمام‌شده';
    }
    return $out;
}

add_action('manage_product_posts_custom_column', 'phoenix_product_column_value', 20, 2);
function phoenix_product_column_value($column, $post_id) {
    if ($column !== 'phoenix_cost') {
        return;
    }

    $cost = phoenix_cost_of($post_id);

    if ($cost['locked']) {
        echo '<span class="phx-badge is-amber">قفل</span>';
        return;
    }
    if ($cost['mode'] === 'manual') {
        echo '<span class="phx-muted">دستی</span>';
        return;
    }
    if ($cost['mode'] === 'usd') {
        echo '<b>$' . esc_html(rtrim(rtrim(number_format($cost['usd'], 2), '0'), '.')) . '</b>';
    } else {
        echo '<b>' . esc_html(number_format_i18n($cost['toman'])) . '</b> <small>ت</small>';
    }

    $m = phoenix_margin_for($post_id);
    echo '<br><small class="phx-muted">'
        . esc_html('سود ' . number_format_i18n($m['percent'], 1) . '٪')
        . '</small>';
}

/* ============================================================
   کنشِ گروهی
   ============================================================ */

add_filter('bulk_actions-edit-product', 'phoenix_bulk_action');
function phoenix_bulk_action($actions) {
    $actions['phoenix_reprice'] = 'فونیکس: بازنویسیِ قیمت';
    return $actions;
}

/**
 * ⚠ ‎handle_bulk_actions‎ خودش nonce را بررسی کرده، ولی
 * قابلیت را نه — و این هوکی است که با یک URL هم می‌شود
 * زدش.
 */
add_filter('handle_bulk_actions-edit-product', 'phoenix_bulk_handle', 10, 3);
function phoenix_bulk_handle($redirect, $action, $ids) {
    if ($action !== 'phoenix_reprice') {
        return $redirect;
    }
    if (!current_user_can(PHOENIX_CAP)) {
        return $redirect;
    }

    $rate = phoenix_rate_value();
    $n    = 0;

    foreach ((array) $ids as $id) {
        $id = (int) $id;
        if (phoenix_apply_price($id, $rate, 'کنشِ گروهی')) {
            $n++;
        }
        /* واریاسیون‌ها هم، وگرنه محصولِ متغیر دست‌نخورده می‌ماند */
        $product = wc_get_product($id);
        if ($product && $product->is_type('variable')) {
            foreach ($product->get_children() as $child) {
                if (phoenix_apply_price((int) $child, $rate, 'کنشِ گروهی')) {
                    $n++;
                }
            }
        }
    }

    return add_query_arg('phoenix_repriced', $n, $redirect);
}

add_action('admin_notices', 'phoenix_bulk_notice');
function phoenix_bulk_notice() {
    if (!isset($_GET['phoenix_repriced'])) {
        return;
    }
    $n = (int) $_GET['phoenix_repriced'];
    echo '<div class="notice notice-success is-dismissible"><p>'
        . esc_html(sprintf('قیمتِ %s مورد بازنویسی شد.', number_format_i18n($n)))
        . '</p></div>';
}
