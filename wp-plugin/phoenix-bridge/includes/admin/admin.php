<?php
/**
 * پنلِ فونیکس — منو و ورودیِ پیشخوان.
 *
 * ============================================================
 * ⚠ قاعده‌ی این پنل، به خواسته‌ی کارفرما:
 *
 *   هر چیزی که خودکار است باید دستی هم بشود،
 *   و هر وضعیتی باید دیده شود.
 *
 * ============================================================
 * ⚠ از ۱٫۳٫۰ همه‌ی صفحه‌ها یک صفحه‌اند.
 *
 * نسخه‌ی ۱ برای هر بخش یک صفحه‌ی PHP داشت که فرم پست می‌کرد.
 * حالا یک پنل است (app.php) که همه‌چیز را از REST می‌خواند
 * (includes/api/)، و منوی کناری فقط میان‌بُر به بخش‌هایش است.
 *
 * امنیت دیگر این‌جا نیست — در guard.php است: قابلیت، nonce،
 * سقفِ نوشتن، و ‎no-store‎ روی هر مسیر. این فایل هیچ کنشِ
 * نوشتنی ندارد، پس چیزی برای نگهبانی ندارد.
 *
 * نسخه‌ی ۱ در تاریخچه‌ی گیت و در ‎releases/phoenix-bridge-1.2.0.zip‎
 * هست، اگر روزی لازم شد.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

/* ‎PHOENIX_CAP‎ در db.php تعریف شده — دلیلش همان‌جا. */
const PHOENIX_MENU = 'phoenix';

/**
 * بخش‌های پنل — همان‌هایی که در نوارِ خودِ پنل هستند.
 *
 * ⚠ هم‌نام با ‎NAV‎ در admin/app.js. اگر بخشی آن‌جا اضافه شد و
 * این‌جا نه، فقط میان‌بُرش در منوی وردپرس نیست؛ چیزی خراب نمی‌شود.
 */
function phoenix_admin_sections() {
    return array(
        'dashboard' => 'داشبورد',
        'products'  => 'محصولات',
        'rate'      => 'منابعِ قیمت',
        'margins'   => 'حاشیه‌ها',
        'discounts' => 'تخفیف‌ها',
        'queue'     => 'صفِ تحویل',
        'log'       => 'تاریخچه',
        'settings'  => 'تنظیمات',
    );
}

add_action('admin_menu', 'phoenix_admin_menu');
function phoenix_admin_menu() {
    add_menu_page(
        'فونیکس',
        'فونیکس',
        PHOENIX_CAP,
        PHOENIX_MENU,
        'phoenix_app_page',
        'dashicons-chart-line',
        56
    );

    /* ⚠ زیرمنوها نشانی‌اند، نه صفحه.
       همه به همان صفحه می‌روند با یک ‎#/بخش‎ متفاوت. وردپرس
       نشانیِ بدونِ تابعِ رندر را همان‌طور که هست در ‎href‎
       می‌گذارد؛ اولی تنها زیرمنویی است که صفحه‌ی واقعی دارد. */
    $first = true;
    foreach (phoenix_admin_sections() as $id => $label) {
        if ($first) {
            add_submenu_page(PHOENIX_MENU, $label . ' — فونیکس', $label, PHOENIX_CAP, PHOENIX_MENU, 'phoenix_app_page');
            $first = false;
            continue;
        }
        add_submenu_page(PHOENIX_MENU, $label, $label, PHOENIX_CAP, 'admin.php?page=' . PHOENIX_MENU . '#/' . $id);
    }
    foreach (phoenix_admin_extensions() as $ext) {
        add_submenu_page(PHOENIX_MENU, $ext['label'], $ext['label'], PHOENIX_CAP, 'admin.php?page=' . PHOENIX_MENU . '#/' . $ext['id']);
    }
}

/**
 * بخش‌هایی که افزونه‌های دیگر (مثلاً Phoenix Account) به همین پنل
 * اضافه می‌کنند — به‌جای پنلِ دوم.
 *
 *   add_filter('phoenix_admin_extensions', function ($list) {
 *       $list[] = array('id' => 'sms', 'label' => 'پیامک', 'icon' => 'bell',
 *                       'module' => plugins_url('admin/screens/sms.js', __FILE__));
 *       return $list;
 *   });
 *
 * ⚠ هر بخش سخت بررسی می‌شود، چون ماژولش در پنلِ مدیر اجرا می‌شود:
 * شناسه از الگوی ثابت، و نشانیِ ماژول فقط از پوشه‌ی افزونه‌های همین
 * سایت و با پسوندِ ‎.js‎. نشانیِ بیرونی یعنی کدِ دیگران با دسترسیِ
 * مدیر — رد می‌شود.
 *
 * @return array[] ‎{id, label, icon, module}‎
 */
function phoenix_admin_extensions() {
    $core = array_keys(phoenix_admin_sections());
    $base = trailingslashit(plugins_url());
    $out  = array();
    foreach ((array) apply_filters('phoenix_admin_extensions', array()) as $e) {
        if (!is_array($e)) {
            continue;
        }
        $id     = isset($e['id']) ? (string) $e['id'] : '';
        $module = isset($e['module']) ? (string) $e['module'] : '';
        if (!preg_match('/^[a-z][a-z0-9-]{1,30}$/', $id) || in_array($id, $core, true) || isset($out[$id])) {
            continue;
        }
        if (strpos($module, $base) !== 0 || !preg_match('#^[^?\#]+\.js$#', $module) || strpos($module, '..') !== false) {
            continue;
        }
        $out[$id] = array(
            'id'     => $id,
            'label'  => sanitize_text_field(isset($e['label']) ? (string) $e['label'] : $id),
            'icon'   => isset($e['icon']) && preg_match('/^[a-zA-Z]{2,20}$/', $e['icon']) ? $e['icon'] : 'box',
            'module' => esc_url_raw($module),
            /* نسخه‌ی خودِ آن افزونه — برای شکستنِ کشِ مرورگر بعد از به‌روزرسانی‌اش */
            'ver'    => isset($e['ver']) && preg_match('/^[0-9a-z.\-]{1,20}$/', $e['ver']) ? $e['ver'] : PHOENIX_BRIDGE_VERSION,
        );
    }
    return array_values($out);
}

/**
 * نشانیِ یک بخش در پنل — برای پیوند از جاهای دیگرِ پیشخوان.
 *
 * @param string $path مثل ‎products/12‎
 */
function phoenix_admin_url($path = '') {
    $url = admin_url('admin.php?page=' . PHOENIX_MENU);
    return $path === '' ? $url : $url . '#/' . ltrim($path, '/');
}

/**
 * ⚠ نشانی‌های نسخه‌ی ۱ هنوز در نشانک‌ها و تاریخچه‌ی مرورگرِ ادمین‌اند.
 *
 * ‎admin.php?page=phoenix-rate‎ بدونِ این، «اجازه‌ی دسترسی به این
 * صفحه را ندارید» می‌دهد — که ادمین را می‌ترساند، نه راهنمایی‌اش
 * می‌کند. این‌جا به بخشِ هم‌ارزش در پنل می‌رود.
 */
add_action('admin_init', 'phoenix_admin_legacy_redirect');
function phoenix_admin_legacy_redirect() {
    if (!isset($_GET['page'])) {
        return;
    }
    $page = sanitize_key(wp_unslash($_GET['page']));
    $map  = array(
        'phoenix-rate'      => 'rate',
        'phoenix-margins'   => 'margins',
        'phoenix-discounts' => 'discounts',
        'phoenix-queue'     => 'queue',
        'phoenix-log'       => 'log',
    );
    if (isset($map[$page]) && current_user_can(PHOENIX_CAP)) {
        wp_safe_redirect(phoenix_admin_url($map[$page]));
        exit;
    }
}

require_once __DIR__ . '/app.php';
require_once __DIR__ . '/woo-screen.php';
