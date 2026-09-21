<?php
/**
 * تاریخچه‌ی کامل.
 *
 * ⚠ این صفحه فقط می‌خواند و هیچ فرمی ندارد.
 *
 * دفترِ رویداد اگر از داخلِ پنل قابلِ ویرایش یا پاک‌کردن باشد،
 * دیگر دفترِ رویداد نیست. هرس‌شدنش خودکار است (نود روز برای
 * نرخ، یک سال برای بقیه) و در ‎db.php‎ نوشته شده.
 */

if (!defined('ABSPATH')) {
    exit;
}

function phoenix_page_log() {
    if (!current_user_can(PHOENIX_CAP)) {
        wp_die('دسترسی نداری.');
    }

    $kinds = array(
        ''         => 'همه',
        'setting'  => 'تنظیمات',
        'rate'     => 'نرخ',
        'price'    => 'قیمت',
        'discount' => 'تخفیف',
        'queue'    => 'صف',
    );

    $kind = isset($_GET['kind']) ? sanitize_key(wp_unslash($_GET['kind'])) : '';
    if (!array_key_exists($kind, $kinds)) {
        $kind = '';
    }

    phoenix_page_open('تاریخچه', 'هر تغییری که موتور یا آدم انجام داده، با زمان و نامِ کاربر.');

    echo '<p class="phx-filters">';
    foreach ($kinds as $k => $label) {
        $url = add_query_arg(array('page' => 'phoenix-log', 'kind' => $k), admin_url('admin.php'));
        echo '<a class="button button-small' . ($kind === $k ? ' button-primary' : '') . '" href="'
            . esc_url($url) . '">' . esc_html($label) . '</a> ';
    }
    echo '</p>';

    phoenix_log_table(phoenix_audit_read($kind, 200));

    echo '<p class="phx-muted">'
        . esc_html('رکوردهای نرخ بعد از ۹۰ روز و بقیه بعد از یک سال خودکار هرس می‌شوند.')
        . '</p>';

    phoenix_page_close();
}
