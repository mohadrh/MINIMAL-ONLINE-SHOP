<?php
/**
 * Plugin Name: Phoenix Account
 * Description: پنلِ مشتریِ فروشگاه فونیکس — ورود با رمز یا پیامک، بازیابیِ رمز، سفارش‌ها، تحویل‌ها، اشتراک‌ها و تیکت؛ و برای مدیر پنلِ جدای «مشتریان». کنارِ Phoenix Bridge کار می‌کند.
 * Version:     0.2.0
 * Requires PHP: 7.4
 * Requires Plugins: phoenix-bridge
 * Author:      Phoenix Shop
 * Text Domain: phoenix-account
 *
 * ============================================================
 * چرا افزونه‌ی جدا — docs/ACCOUNT.md
 *
 * Phoenix Bridge مدیریتِ فروشگاه است؛ این یکی خریدار. ورود با کد،
 * اتصال‌ها (کلیدِ رمزنگاری‌شده) و پنلِ مدیر از Bridge می‌آیند و
 * این‌جا تکرار نمی‌شوند.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

define('PHOENIX_ACC_VERSION', '0.2.0');
define('PHOENIX_ACC_FILE', __FILE__);
define('PHOENIX_ACC_NEEDS_BRIDGE', '1.6.0');

$phoenix_acc_dir = plugin_dir_path(__FILE__);
require_once $phoenix_acc_dir . 'includes/core.php';
require_once $phoenix_acc_dir . 'includes/db.php';

register_activation_hook(__FILE__, 'phoenix_acc_install');

/**
 * ⚠ بقیه فقط وقتی Bridge هست.
 *
 * وردپرس افزونه‌ها را به ترتیبِ الفبا بار می‌کند و «account» پیش از
 * «bridge» است؛ پس این‌جا روی ‎plugins_loaded‎ صبر می‌کنیم تا Bridge
 * هم بار شده باشد. اگر نبود یا قدیمی بود، هیچ مسیری ثبت نمی‌شود و
 * فقط یک پیامِ روشن در پیشخوان می‌ماند — نه خطای مرگبار.
 */
add_action('plugins_loaded', 'phoenix_acc_boot', 20);
function phoenix_acc_boot() {
    $ok = defined('PHOENIX_BRIDGE_VERSION')
        && version_compare(PHOENIX_BRIDGE_VERSION, PHOENIX_ACC_NEEDS_BRIDGE, '>=')
        && function_exists('phoenix_token_phone')
        && function_exists('phoenix_api_route')
        && function_exists('phoenix_conn_runtime')
        /* ⚠ فقط تابع‌هایی که روی هر درخواست بار می‌شوند — ‎includes/admin/‎ی
           Bridge فقط در پیشخوان است و REST آن را ندارد */
        && function_exists('phoenix_order_view');
    if (!$ok) {
        add_action('admin_notices', 'phoenix_acc_need_bridge');
        return;
    }
    phoenix_acc_maybe_upgrade(); // جدول‌های تازه حتی اگر مدیر هنوز به پیشخوان نیامده
    $dir = plugin_dir_path(__FILE__);
    require_once $dir . 'includes/sessions.php';
    require_once $dir . 'includes/customers.php';
    require_once $dir . 'includes/tickets.php';
    require_once $dir . 'includes/sms.php';
    require_once $dir . 'includes/api-customer.php';
    require_once $dir . 'includes/api-admin.php';
}

function phoenix_acc_need_bridge() {
    if (!current_user_can('activate_plugins')) {
        return;
    }
    echo '<div class="notice notice-error"><p>'
        . esc_html('Phoenix Account به Phoenix Bridge نسخه‌ی ' . PHOENIX_ACC_NEEDS_BRIDGE . ' یا بالاتر نیاز دارد. اول آن را نصب یا به‌روز کن.')
        . '</p></div>';
}
