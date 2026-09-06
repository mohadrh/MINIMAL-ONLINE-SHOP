<?php
/**
 * تحویلِ سفارش
 *
 * ============================================================
 * ووکامرس بعد از پرداخت هیچ کاری بلد نیست جز اینکه وضعیت را
 * عوض کند. کارِ واقعیِ این فروشگاه بعد از پرداخت شروع می‌شود:
 * یک کد از انبار برداشته و به مشتری داده شود، یا یک اکانت
 * ارتقا پیدا کند، یا کاری دستی در صف بیفتد.
 *
 * این فایل همان لایه است: یک انبارِ کد برای هر محصول، و یک
 * تحویل‌دهنده که با پرداخت شلیک می‌شود.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

define('PHOENIX_CODES_META', '_phoenix_codes');
define('PHOENIX_DELIVERED_META', '_phoenix_delivered');

/* ============================================================
   انبارِ کد
   ============================================================ */

/**
 * کدهای یک محصول.
 *
 * هر کد یک ردیف است: مقدار، وضعیت، و شناسه‌ی سفارشی که گرفتش.
 * کدِ مصرف‌شده پاک نمی‌شود — اگر مشتری برگردد و بگوید کدم کار
 * نکرد، باید بشود دید چه چیزی به او داده شده.
 */
function phoenix_get_codes($product_id) {
    $codes = get_post_meta($product_id, PHOENIX_CODES_META, true);
    return is_array($codes) ? $codes : array();
}

function phoenix_save_codes($product_id, $codes) {
    update_post_meta($product_id, PHOENIX_CODES_META, $codes);
    phoenix_sync_stock($product_id);
}

/**
 * موجودیِ ووکامرس را با تعدادِ کدهای آزاد یکی می‌کند.
 *
 * ⚠ بدون این، دو عدد از هم می‌افتند.
 *
 * ادمین کد اضافه می‌کند ولی موجودی ووکامرس همان می‌ماند؛ یا
 * موجودی ده است و کد صفر، و ده نفر می‌خرند و هیچ‌کس چیزی
 * نمی‌گیرد. یک عدد باید حقیقت داشته باشد و آن تعدادِ کدِ آزاد
 * است.
 */
function phoenix_sync_stock($product_id) {
    $product = wc_get_product($product_id);
    if (!$product) {
        return;
    }
    $f = phoenix_get_fields($product_id);
    $mode = isset($f['fulfillment']) ? $f['fulfillment'] : 'manual';

    /* فقط محصولاتی که از انبارِ کد تحویل می‌شوند */
    if ($mode !== 'stock_code' && $mode !== 'stock_account') {
        return;
    }

    $free = 0;
    foreach (phoenix_get_codes($product_id) as $c) {
        if (empty($c['used'])) {
            $free++;
        }
    }

    $product->set_manage_stock(true);
    $product->set_stock_quantity($free);
    $product->set_stock_status($free > 0 ? 'instock' : 'outofstock');
    $product->save();
}

/**
 * یک کدِ آزاد برمی‌دارد و به سفارش می‌بندد.
 *
 * ⚠ قفل لازم است.
 *
 * دو سفارشِ هم‌زمان می‌توانند هر دو «اولین کدِ آزاد» را ببینند و
 * یک کد به دو نفر برسد. قفلِ ووکامرس روی همان کلید، دومی را
 * منتظر می‌گذارد تا اولی تمام شود.
 */
function phoenix_claim_code($product_id, $order_id) {
    $lock = 'phoenix_lock_' . $product_id;

    /* قفلِ ساده با transient — تا پنج ثانیه صبر می‌کند */
    for ($i = 0; $i < 50; $i++) {
        if (get_transient($lock) === false) {
            break;
        }
        usleep(100000); // صدم ثانیه
    }
    set_transient($lock, 1, 10);

    try {
        $codes = phoenix_get_codes($product_id);
        foreach ($codes as $idx => $c) {
            if (empty($c['used'])) {
                $codes[$idx]['used']     = true;
                $codes[$idx]['order_id'] = $order_id;
                $codes[$idx]['used_at']  = current_time('mysql');
                phoenix_save_codes($product_id, $codes);
                return $c['value'];
            }
        }
        return null;
    } finally {
        delete_transient($lock);
    }
}

/* ============================================================
   پنلِ کدها
   ============================================================ */

add_action('add_meta_boxes', 'phoenix_codes_metabox');
function phoenix_codes_metabox() {
    add_meta_box(
        'phoenix_codes',
        'انبار کد فونیکس',
        'phoenix_codes_box',
        'product',
        'normal',
        'default'
    );
}

function phoenix_codes_box($post) {
    $codes = phoenix_get_codes($post->ID);
    $free  = 0;
    $used  = 0;
    foreach ($codes as $c) {
        if (empty($c['used'])) {
            $free++;
        } else {
            $used++;
        }
    }

    wp_nonce_field('phoenix_codes_save', 'phoenix_codes_nonce');

    echo '<p><strong>آزاد:</strong> ' . esc_html($free) . ' &nbsp; <strong>مصرف‌شده:</strong> ' . esc_html($used) . '</p>';
    echo '<p><label for="phoenix_new_codes">کدهای تازه — هر خط یک کد:</label></p>';
    echo '<textarea id="phoenix_new_codes" name="phoenix_new_codes" rows="6" style="width:100%;font-family:monospace;direction:ltr" placeholder="XXXX-YYYY-ZZZZ"></textarea>';
    echo '<p class="description">کدها به انبار اضافه می‌شوند و موجودی محصول خودکار برابر تعداد کدهای آزاد می‌شود.</p>';

    if ($used > 0) {
        echo '<details style="margin-top:12px"><summary>کدهای مصرف‌شده (' . esc_html($used) . ')</summary><table class="widefat striped" style="margin-top:8px"><thead><tr><th>کد</th><th>سفارش</th><th>زمان</th></tr></thead><tbody>';
        foreach ($codes as $c) {
            if (empty($c['used'])) {
                continue;
            }
            $oid = isset($c['order_id']) ? (int) $c['order_id'] : 0;
            echo '<tr><td style="font-family:monospace;direction:ltr">' . esc_html($c['value']) . '</td>';
            echo '<td>' . ($oid ? '<a href="' . esc_url(admin_url('post.php?post=' . $oid . '&action=edit')) . '">#' . esc_html($oid) . '</a>' : '—') . '</td>';
            echo '<td>' . esc_html(isset($c['used_at']) ? $c['used_at'] : '—') . '</td></tr>';
        }
        echo '</tbody></table></details>';
    }
}

add_action('save_post_product', 'phoenix_codes_save', 10, 1);
function phoenix_codes_save($post_id) {
    if (!isset($_POST['phoenix_codes_nonce'])
        || !wp_verify_nonce(sanitize_key(wp_unslash($_POST['phoenix_codes_nonce'])), 'phoenix_codes_save')) {
        return;
    }
    if (!current_user_can('edit_product', $post_id)) {
        return;
    }
    if (empty($_POST['phoenix_new_codes'])) {
        return;
    }

    $raw   = (string) wp_unslash($_POST['phoenix_new_codes']);
    $lines = preg_split('/\r\n|\r|\n/', $raw);
    $codes = phoenix_get_codes($post_id);

    /* تکراری اضافه نمی‌شود — ادمین گاهی یک فهرست را دو بار پیست
       می‌کند و آن‌وقت یک کد به دو نفر می‌رسد. */
    $existing = array();
    foreach ($codes as $c) {
        $existing[$c['value']] = true;
    }

    foreach ($lines as $line) {
        $v = trim(sanitize_text_field($line));
        if ($v === '' || isset($existing[$v])) {
            continue;
        }
        $codes[] = array(
            'value'   => $v,
            'used'    => false,
            'added_at' => current_time('mysql'),
        );
        $existing[$v] = true;
    }

    phoenix_save_codes($post_id, $codes);
}

/* ============================================================
   تحویل
   ============================================================ */

/**
 * با پرداخت، تحویل شلیک می‌شود.
 *
 * ⚠ روی processing و completed هر دو، ولی فقط یک بار.
 *
 * درگاه‌های مختلف وضعیت را جور دیگری جلو می‌برند و بعضی سفارش‌ها
 * دستی کامل می‌شوند. اگر فقط به یکی گوش بدهیم، بعضی سفارش‌ها
 * تحویل نمی‌شوند؛ اگر به هر دو گوش بدهیم و علامت نگذاریم، بعضی
 * دو بار کد می‌گیرند. متای delivered جلوی دومی را می‌گیرد.
 */
add_action('woocommerce_order_status_processing', 'phoenix_deliver_order');
add_action('woocommerce_order_status_completed', 'phoenix_deliver_order');
function phoenix_deliver_order($order_id) {
    $order = wc_get_order($order_id);
    if (!$order || $order->get_meta(PHOENIX_DELIVERED_META)) {
        return;
    }

    $delivered = array();
    $pending   = false;

    foreach ($order->get_items() as $item_id => $item) {
        $product_id = $item->get_product_id();
        $variation  = $item->get_variation_id();
        $target     = $variation ? $variation : $product_id;

        $f    = phoenix_get_fields($product_id);
        $mode = isset($f['fulfillment']) ? $f['fulfillment'] : 'manual';

        if ($mode === 'stock_code' || $mode === 'stock_account') {
            $qty = $item->get_quantity();
            for ($i = 0; $i < $qty; $i++) {
                $code = phoenix_claim_code($target, $order_id);
                if ($code === null) {
                    $code = phoenix_claim_code($product_id, $order_id);
                }
                if ($code !== null) {
                    $item->add_meta_data('کد تحویل', $code, false);
                    $delivered[] = $item->get_name() . ': ' . $code;
                } else {
                    /* کد تمام شده — سفارش نباید بی‌صدا رد شود */
                    $pending = true;
                    $order->add_order_note(
                        'کد برای «' . $item->get_name() . '» در انبار نبود. تحویل دستی لازم است.'
                    );
                }
            }
            $item->save();
        } else {
            $pending = true;
        }
    }

    if (!empty($delivered)) {
        $order->add_order_note(
            "تحویل خودکار انجام شد:\n" . implode("\n", $delivered),
            true // به مشتری هم نشان داده شود
        );
    }

    if ($pending) {
        $order->add_order_note('بخشی از این سفارش تحویل دستی می‌خواهد.');
    }

    $order->update_meta_data(PHOENIX_DELIVERED_META, current_time('mysql'));
    $order->save();
}

/* ============================================================
   ستون «تحویل» در فهرست سفارش‌ها
   ============================================================ */

add_filter('manage_edit-shop_order_columns', 'phoenix_order_column', 20);
add_filter('woocommerce_shop_order_list_table_columns', 'phoenix_order_column', 20);
function phoenix_order_column($columns) {
    $out = array();
    foreach ($columns as $key => $label) {
        $out[$key] = $label;
        if ($key === 'order_status') {
            $out['phoenix_delivery'] = 'تحویل';
        }
    }
    return $out;
}

add_action('manage_shop_order_posts_custom_column', 'phoenix_order_column_value', 20, 2);
add_action('woocommerce_shop_order_list_table_custom_column', 'phoenix_order_column_value', 20, 2);
function phoenix_order_column_value($column, $order) {
    if ($column !== 'phoenix_delivery') {
        return;
    }
    if (!is_object($order)) {
        $order = wc_get_order($order);
    }
    if (!$order) {
        return;
    }
    $at = $order->get_meta(PHOENIX_DELIVERED_META);
    echo $at
        ? '<span style="color:#1a7f37">✓ ' . esc_html($at) . '</span>'
        : '<span style="color:#9a6700">در انتظار</span>';
}
