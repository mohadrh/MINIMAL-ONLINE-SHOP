<?php
/**
 * صفحه‌های محصولِ خودِ ووکامرس — فقط پیوند به پنل.
 *
 * ⚠ هیچ چیزی این‌جا ذخیره نمی‌شود.
 *
 * ادمین عادت دارد از «محصولات ← ویرایش» وارد شود. اگر آن‌جا هیچ
 * نشانی از فونیکس نباشد، فکر می‌کند محصول تنظیمِ فونیکس ندارد؛
 * اگر فرمِ کامل باشد، دو ویرایشگرِ هم‌زمان روی یک داده داریم.
 * پس یک جعبه‌ی کوچک: وضعیت در یک خط، و دکمه‌ی «ویرایش در فونیکس».
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('add_meta_boxes_product', 'phoenix_woo_box_register');
function phoenix_woo_box_register($post) {
    if (!current_user_can(PHOENIX_CAP)) {
        return;
    }
    add_meta_box('phoenix-edit', 'فونیکس', 'phoenix_woo_box', 'product', 'side', 'high');
}

function phoenix_woo_box($post) {
    if ($post->post_status === 'auto-draft') {
        echo '<p>' . esc_html('محصولِ تازه را از پنلِ فونیکس بساز — همه‌ی فیلدها، پلن‌ها و قیمت‌گذاری همان‌جاست.') . '</p>';
        echo '<p><a class="button" href="' . esc_url(phoenix_admin_url('products')) . '">'
            . esc_html('محصولات در فونیکس') . '</a></p>';
        return;
    }

    $cost = phoenix_cost_of($post->ID);
    if ($cost['locked']) {
        $line = 'قیمت قفل است — موتور دست نمی‌زند.';
    } elseif ($cost['mode'] === 'usd') {
        $line = 'قیمت از دلار ساخته می‌شود ($' . rtrim(rtrim(number_format($cost['usd'], 2), '0'), '.') . ').';
    } elseif ($cost['mode'] === 'toman') {
        $line = 'قیمت از قیمتِ تمام‌شده‌ی تومانی ساخته می‌شود.';
    } else {
        $line = 'قیمت دستی است.';
    }

    echo '<p>' . esc_html($line) . '</p>';
    echo '<p>' . esc_html('پلن‌ها، رسانه، محتوا و قیمت‌گذاری در پنلِ فونیکس ویرایش می‌شوند.') . '</p>';
    echo '<p><a class="button button-primary" href="' . esc_url(phoenix_admin_url('products/' . (int) $post->ID)) . '">'
        . esc_html('ویرایش در فونیکس') . '</a></p>';
}

/** «ویرایش در فونیکس» زیرِ نامِ هر محصول در فهرست */
add_filter('post_row_actions', 'phoenix_woo_row_action', 20, 2);
function phoenix_woo_row_action($actions, $post) {
    if ($post->post_type !== 'product' || $post->post_status === 'trash' || !current_user_can(PHOENIX_CAP)) {
        return $actions;
    }
    $actions['phoenix'] = '<a href="' . esc_url(phoenix_admin_url('products/' . (int) $post->ID)) . '">'
        . esc_html('ویرایش در فونیکس') . '</a>';
    return $actions;
}

/**
 * ظاهرِ ستونِ «قیمتِ تمام‌شده» در فهرستِ محصولات.
 *
 * چند خط، درون‌خطی — برای یک ستون فایلِ CSS جدا ارزشِ یک
 * درخواستِ دیگر را ندارد.
 */
add_action('admin_enqueue_scripts', 'phoenix_woo_list_style');
function phoenix_woo_list_style($hook) {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if ($hook !== 'edit.php' || !$screen || $screen->post_type !== 'product') {
        return;
    }
    wp_register_style('phoenix-woo-list', false, array(), PHOENIX_BRIDGE_VERSION);
    wp_enqueue_style('phoenix-woo-list');
    wp_add_inline_style('phoenix-woo-list',
        '.column-phoenix_cost{width:9em}'
        . '.phx-muted{color:#646970}'
        . '.phx-badge{display:inline-block;padding:1px 8px;border-radius:9px;font-size:12px}'
        . '.phx-badge.is-amber{background:#fcf0dc;color:#8a4b00}'
    );
}
