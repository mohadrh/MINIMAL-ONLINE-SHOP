<?php
/**
 * فیلدهای قیمت روی خودِ محصول.
 *
 * ============================================================
 * ⚠ چرا این‌جا و نه فقط در پنلِ فونیکس
 *
 * کسی که محصول اضافه می‌کند، در صفحه‌ی محصولِ ووکامرس است نه
 * در پنلِ ما. اگر قیمتِ تمام‌شده جای دیگری تنظیم شود، دو اتفاق
 * می‌افتد: یا یادش می‌رود، یا محصول را با قیمتِ دستی می‌سازد و
 * موتور هیچ‌وقت دستش به آن نمی‌رسد.
 *
 * پس همان‌جا، کنارِ قیمتِ ووکامرس، سه چیز پرسیده می‌شود:
 * قیمتِ تمام‌شده از چه جنسی است، چقدر است، و آیا موتور اجازه
 * دارد دستش بزند.
 *
 * ⚠ و یک پیش‌نمایشِ کوچک، همان‌جا.
 *
 * ادمین باید *پیش از ذخیره* بداند این محصول چند تومان
 * درمی‌آید. بدونش، محصول را ذخیره می‌کند، می‌رود سایت را
 * می‌بیند، برمی‌گردد و عوض می‌کند.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

/* ============================================================
   فیلدها روی محصولِ ساده و والد
   ============================================================ */

add_action('woocommerce_product_options_pricing', 'phoenix_product_price_fields');
function phoenix_product_price_fields() {
    global $post;
    if (!$post) {
        return;
    }
    $f = phoenix_get_fields($post->ID);

    echo '<div class="options_group phoenix-cost">';

    woocommerce_wp_select(array(
        'id'          => 'phoenix_price_mode',
        'label'       => 'قیمت‌گذاری فونیکس',
        'description' => 'دستی یعنی موتور اصلاً دست نمی‌زند.',
        'desc_tip'    => true,
        'value'       => isset($f['price_mode']) ? $f['price_mode'] : 'manual',
        'options'     => array(
            'manual' => 'دستی — قیمت را خودم می‌نویسم',
            'usd'    => 'دلاری — از نرخ تتر حساب شود',
            'toman'  => 'تومانی — قیمتِ تمام‌شده‌ی تومانی دارم',
        ),
    ));

    woocommerce_wp_text_input(array(
        'id'                => 'phoenix_usd',
        'label'             => 'قیمتِ تمام‌شده (دلار)',
        'type'              => 'number',
        'custom_attributes' => array('step' => '0.01', 'min' => '0'),
        'value'             => isset($f['usd']) ? $f['usd'] : '',
        'description'       => 'چند دلار برای ما تمام می‌شود. قیمتِ فروش از این ساخته می‌شود.',
        'desc_tip'          => true,
    ));

    woocommerce_wp_text_input(array(
        'id'                => 'phoenix_cost_toman',
        'label'             => 'قیمتِ تمام‌شده (تومان)',
        'type'              => 'number',
        'custom_attributes' => array('step' => '1000', 'min' => '0'),
        'value'             => isset($f['cost_toman']) ? $f['cost_toman'] : '',
        'description'       => 'اگر جنس را تومانی خریده‌ایم.',
        'desc_tip'          => true,
    ));

    woocommerce_wp_checkbox(array(
        'id'          => 'phoenix_price_locked',
        'label'       => 'قفلِ قیمت',
        'description' => 'موتور این محصول را نادیده می‌گیرد، حتی اگر قیمتِ تمام‌شده داشته باشد.',
        'value'       => !empty($f['price_locked']) ? 'yes' : 'no',
    ));

    phoenix_price_hint($post->ID);

    echo '</div>';
}

/**
 * پیش‌نمایشِ کنارِ فرم.
 *
 * ⚠ عمداً «آخرین محاسبه» است نه «بعد از ذخیره».
 *
 * چیزی که این‌جا دیده می‌شود با مقادیرِ *ذخیره‌شده* حساب شده،
 * نه با آنچه ادمین همین حالا تایپ کرده. نوشتنِ زنده‌اش
 * جاوااسکریپت و تکرارِ فرمول در سمتِ کلاینت می‌خواست — یعنی
 * دو جا که باید همیشه با هم بخوانند. یک متنِ صادق بهتر از دو
 * فرمولِ ناهماهنگ است.
 */
function phoenix_price_hint($product_id) {
    $calc = phoenix_compute_price($product_id);

    echo '<p class="form-field phoenix-hint">';

    if ($calc === null) {
        echo '<span class="phoenix-hint__muted">'
            . esc_html('این محصول دستِ موتور نیست — یا دستی است، یا قفل، یا قیمتِ تمام‌شده ندارد.')
            . '</span>';
        echo '</p>';
        return;
    }

    echo '<b>' . esc_html('با تنظیماتِ فعلی: ') . '</b>';
    printf(
        /* translators: پایه، سود، قیمت */
        esc_html('پایه %1$s + سود %2$s ← %3$s'),
        esc_html(number_format_i18n($calc['base'])),
        esc_html(number_format_i18n($calc['profit'])),
        esc_html(number_format_i18n($calc['regular']))
    );

    if ($calc['sale'] > 0) {
        echo ' <span class="phoenix-hint__sale">'
            . esc_html('با تخفیف: ' . number_format_i18n($calc['sale'])) . '</span>';
    } elseif (!empty($calc['blocked'])) {
        echo '<br><span class="phoenix-hint__warn">'
            . esc_html('تخفیف اعمال نشد — ' . $calc['blocked']['why']) . '</span>';
    }
    if ($calc['mode'] === 'usd') {
        echo ' <span class="phoenix-hint__muted">'
            . esc_html('(نرخ ' . number_format_i18n($calc['rate']) . ')') . '</span>';
    }
    if ($calc['floor_hit']) {
        echo ' <span class="phoenix-hint__warn">' . esc_html('کفِ قیمت فعال شد') . '</span>';
    }

    echo '</p>';
}

/**
 * ذخیره.
 *
 * ⚠ قابلیت این‌جا هم چک می‌شود.
 *
 * ‎woocommerce_process_product_meta‎ بعد از بررسیِ nonceِ خودِ
 * ووکامرس اجرا می‌شود، ولی nonce فقط می‌گوید «درخواست از فرمِ
 * ما آمده»، نه «این کاربر اجازه دارد». هر دو لازم‌اند.
 */
add_action('woocommerce_process_product_meta', 'phoenix_save_price_fields', 20);
function phoenix_save_price_fields($post_id) {
    if (!current_user_can('edit_product', $post_id)) {
        return;
    }

    $f = phoenix_get_fields($post_id);

    $mode = isset($_POST['phoenix_price_mode'])
        ? sanitize_key(wp_unslash($_POST['phoenix_price_mode']))
        : 'manual';
    $f['price_mode'] = in_array($mode, array('manual', 'usd', 'toman'), true) ? $mode : 'manual';

    $usd = isset($_POST['phoenix_usd']) ? (float) wp_unslash($_POST['phoenix_usd']) : 0;
    if ($usd > 0) {
        $f['usd'] = round($usd, 4);
    } else {
        unset($f['usd']);
    }

    $toman = isset($_POST['phoenix_cost_toman']) ? (int) wp_unslash($_POST['phoenix_cost_toman']) : 0;
    if ($toman > 0) {
        $f['cost_toman'] = $toman;
    } else {
        unset($f['cost_toman']);
    }

    $f['price_locked'] = !empty($_POST['phoenix_price_locked']);

    phoenix_set_fields($post_id, $f);

    /* ⚠ قیمت همین‌جا نوشته می‌شود، نه در کرونِ بعدی.
       ادمین ذخیره می‌کند و انتظار دارد قیمت عوض شده باشد.
       اگر تا کرونِ بعدی صبر کند، فکر می‌کند کار نکرده. */
    phoenix_apply_price($post_id, null, 'ذخیره‌ی محصول');
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
