<?php
/**
 * Plugin Name: Phoenix Bridge
 * Description: پلِ میان فروشگاه فونیکس و ووکامرس — فیلدهای دیجیتال، اندپوینت عمومی، و کلید حساب روی شماره‌ی موبایل.
 * Version:     1.5.0
 * Requires PHP: 7.4
 * Author:      Phoenix Shop
 * Text Domain: phoenix-bridge
 *
 * ============================================================
 * چرا این افزونه لازم است
 *
 * ووکامرس برای فروشگاهِ کالای فیزیکی ساخته شده. سه چیز که این
 * بازار لازم دارد، در ووکامرس اصلاً جایی ندارند:
 *
 *   ۱ «برای فعال‌سازی چه چیزی از مشتری بگیریم» — ایمیل اکانت،
 *     آیدی تلگرام، Organization ID. ووکامرس فقط آدرسِ پستی دارد.
 *
 *   ۲ «بعد از پرداخت چه اتفاقی می‌افتد» — کد از انبار، ارتقای
 *     اکانت خودِ مشتری، یا کار دستی. ووکامرس فقط downloadable
 *     دارد که هیچ‌کدام این‌ها نیست.
 *
 *   ۳ کلیدِ حساب. ووکامرس مشتری را با ایمیل می‌شناسد؛ فروشگاه
 *     ایرانی با شماره‌ی موبایل. جست‌وجوی مشتری با شماره در
 *     REST ووکامرس وجود ندارد.
 *
 * این افزونه هر سه را اضافه می‌کند، و یک اندپوینتِ عمومیِ
 * فقط‌خواندنی می‌دهد تا سایتِ ایستا بتواند بدون کلید، کاتالوگ را
 * بخواند.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit; // دسترسی مستقیم ممنوع
}

define('PHOENIX_BRIDGE_VERSION', '1.5.0');
define('PHOENIX_META_KEY', '_phoenix');

/* ============================================================
   ۱ فیلدهای فونیکس روی محصول
   ============================================================ */

/**
 * متای فونیکس یک آرایه‌ی واحد است، نه بیست فیلدِ جدا.
 *
 * با فیلدهای جدا هر افزودنِ تازه یک مهاجرت لازم دارد و
 * postmeta پر از کلیدهای متفرقه می‌شود. با یک آرایه، افزودنِ
 * فیلد فقط تغییرِ فرم است.
 */
function phoenix_get_fields($post_id) {
    $raw = get_post_meta($post_id, PHOENIX_META_KEY, true);
    if (is_array($raw)) {
        return $raw;
    }
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return array();
}

function phoenix_set_fields($post_id, $fields) {
    update_post_meta($post_id, PHOENIX_META_KEY, $fields);
}

/**
 * ⚠ فقط فیلدهای نمایشی — هر جا که بیرون می‌رود.
 *
 * تا ۱٫۲٫۰ اندپوینتِ عمومیِ ‎/catalog‎ کلِ ‎_phoenix‎ را
 * برمی‌گرداند — یعنی ‎cost_usd‎ و ‎cost_toman‎، قیمتِ تمام‌شده‌ی
 * خودمان، برای هر کسی که نشانی را باز کند. رقیب حاشیه‌ی سودِ هر
 * محصول را می‌دید.
 *
 * فهرستِ سفید است نه سیاه: فیلدِ تازه‌ای که روزی اضافه شود تا
 * وقتی این‌جا نوشته نشده بیرون نمی‌رود. فهرست همان چیزی است که
 * سایت می‌خواند (src/lib/api/wooTypes.ts).
 */
const PHOENIX_PUBLIC_FIELDS = array(
    'english_title', 'brand', 'fulfillment', 'delivery_estimate', 'warranty_label', 'required_inputs',
    'features', 'notes', 'faq', 'platforms', 'accent', 'thumbnail', 'logo', 'cover', 'cutout', 'badges',
    'seed_rating', 'seed_reviews', 'seed_sales', 'variant_label', 'variant_guide', 'variant_usd',
    /* پلن‌ها */
    'label', 'usd', 'is_default', 'guide',
);

function phoenix_public_fields($post_id) {
    return array_intersect_key(phoenix_get_fields($post_id), array_flip(PHOENIX_PUBLIC_FIELDS));
}

/**
 * فیلدها را به پاسخِ REST ووکامرس اضافه می‌کند.
 *
 * به‌جای اینکه کلاینت meta_data را بگردد، یک کلیدِ phoenix
 * می‌گیرد که از قبل ساختار دارد. مَپرِ سمتِ Next هر دو را
 * می‌فهمد، ولی این یکی تمیزتر است.
 */
add_filter('woocommerce_rest_prepare_product_object', 'phoenix_add_fields_to_product', 10, 3);
function phoenix_add_fields_to_product($response, $object, $request) {
    $response->data['phoenix'] = phoenix_public_fields($object->get_id());
    return $response;
}

add_filter('woocommerce_rest_prepare_product_variation_object', 'phoenix_add_fields_to_variation', 10, 3);
function phoenix_add_fields_to_variation($response, $object, $request) {
    $response->data['phoenix'] = phoenix_public_fields($object->get_id());
    return $response;
}

/* ============================================================
   ۲ ویرایش — در پنلِ فونیکس
   ============================================================ */

/* ⚠ فیلدهای فونیکس دیگر در صفحه‌ی محصولِ ووکامرس ویرایش نمی‌شوند.

   تا ۱٫۲٫۰ این‌جا یک تبِ «فونیکس» بود با شش جعبه‌ی JSON، و
   فیلدهای پلن روی هر واریاسیون. حالا همه‌ی این‌ها — و رسانه،
   محتوا، و قیمت‌گذاریِ هر پلن — در ویرایشگرِ پنل‌اند
   (includes/api/products.php)، با اعتبارسنجیِ واقعی به‌جای
   «اگر JSON خراب بود نادیده بگیر».

   ⚠ و ذخیره‌کننده‌هایشان هم رفتند، نه فقط فرم‌ها.

   اگر فقط فرم برداشته می‌شد و ‎woocommerce_process_product_meta‎
   می‌ماند، هر ذخیره در صفحه‌ی ووکامرس (مثلاً عوض کردنِ موجودی)
   فیلدهایی را که فرمش دیگر نیست خالی می‌دید و روی داده‌ی پنل
   می‌نوشت. صفحه‌ی ووکامرس حالا فقط یک پیوند دارد
   (includes/admin/woo-screen.php) و به ‎_phoenix‎ دست نمی‌زند. */

/* ============================================================
   بارگذاری بخش‌ها
   ============================================================ */

$phoenix_dir = plugin_dir_path(__FILE__);

/* ⚠ ترتیب مهم است، و این‌ها وابستگی دارند:
     db          پایه‌ی همه — تنظیمات و دفترِ رویداد
     rate-*      به تنظیمات نیاز دارد
     discounts   سرِ محاسبه‌ی قیمت صدا زده می‌شود
     pricing     به نرخ و تخفیف هر دو نیاز دارد
     بقیه        از این چهارتا استفاده می‌کنند */
require_once $phoenix_dir . 'includes/db.php';
require_once $phoenix_dir . 'includes/connections.php';
require_once $phoenix_dir . 'includes/rate-sources.php';
require_once $phoenix_dir . 'includes/rate-custom.php';
require_once $phoenix_dir . 'includes/rate.php';
require_once $phoenix_dir . 'includes/discounts.php';
require_once $phoenix_dir . 'includes/pricing.php';
require_once $phoenix_dir . 'includes/product-sources.php';
require_once $phoenix_dir . 'includes/product-pricing.php';
require_once $phoenix_dir . 'includes/fulfil-queue.php';

require_once $phoenix_dir . 'includes/rest.php';
require_once $phoenix_dir . 'includes/auth.php';
require_once $phoenix_dir . 'includes/orders.php';

/* ⚠ APIِ پنل همیشه بار می‌شود، نه فقط در پیشخوان.
   درخواست‌های REST ‎is_admin()‎ نیستند؛ اگر این‌ها داخلِ شرطِ
   پایین بودند، پنل به هر درخواستی ۴۰۴ می‌گرفت. نگهبانشان
   (guard.php) خودش دسترسی را چک می‌کند. */
require_once $phoenix_dir . 'includes/api/guard.php';
require_once $phoenix_dir . 'includes/api/dashboard.php';
require_once $phoenix_dir . 'includes/api/product-input.php';
require_once $phoenix_dir . 'includes/api/products.php';
require_once $phoenix_dir . 'includes/api/pricing-board.php';
require_once $phoenix_dir . 'includes/api/rate-admin.php';
require_once $phoenix_dir . 'includes/api/rules.php';
require_once $phoenix_dir . 'includes/api/ops.php';

if (is_admin()) {
    require_once $phoenix_dir . 'includes/admin/admin.php';
}

/**
 * فعال‌سازی — جدول‌ها ساخته می‌شوند و زمان‌بندی‌ها می‌نشینند.
 *
 * ⚠ هیچ قیمتی سرِ فعال‌سازی نوشته نمی‌شود.
 *
 * افزونه‌ای که به‌محضِ فعال‌شدن قیمتِ کلِ فروشگاه را عوض کند،
 * ترسناک است — و اگر تنظیماتش هنوز پیش‌فرض باشد، احتمالاً
 * اشتباه هم هست. موتور خاموش فعال می‌شود و ادمین بعد از
 * دیدنِ پیش‌نمایش خودش روشنش می‌کند.
 */
register_activation_hook(__FILE__, 'phoenix_on_activate');
function phoenix_on_activate() {
    phoenix_db_install();

    if (!wp_next_scheduled('phoenix_rate_hourly')) {
        wp_schedule_event(time() + 60, 'hourly', 'phoenix_rate_hourly');
    }
    if (!wp_next_scheduled('phoenix_daily')) {
        wp_schedule_event(time() + 300, 'daily', 'phoenix_daily');
    }
}

/**
 * غیرفعال‌سازی — زمان‌بندی‌ها برداشته می‌شوند.
 *
 * ⚠ جدول‌ها و تنظیمات می‌مانند.
 *
 * غیرفعال‌کردن معمولاً موقتی است (عیب‌یابی، به‌روزرسانی). پاک
 * کردنِ تاریخچه‌ی قیمت و تخفیف‌ها سرِ یک غیرفعال‌سازیِ
 * ده‌ثانیه‌ای، داده‌ای را می‌برد که برگرداندنش ممکن نیست.
 */
register_deactivation_hook(__FILE__, 'phoenix_on_deactivate');
function phoenix_on_deactivate() {
    foreach (array('phoenix_rate_hourly', 'phoenix_daily', 'phoenix_reprice_all', 'phoenix_fulfil_tick') as $hook) {
        $ts = wp_next_scheduled($hook);
        while ($ts) {
            wp_unschedule_event($ts, $hook);
            $ts = wp_next_scheduled($hook);
        }
    }
}

/**
 * ⚠ افزونه بدون ووکامرس فعال نمی‌شود.
 *
 * همه‌ی قلاب‌های این‌جا به توابع ووکامرس وابسته‌اند. اگر ووکامرس
 * غیرفعال شود و ما ساکت بمانیم، سایت با خطای مرگبار بالا نمی‌آید
 * و ادمین نمی‌فهمد چرا.
 */
add_action('admin_init', 'phoenix_require_woocommerce');
function phoenix_require_woocommerce() {
    if (!class_exists('WooCommerce')) {
        deactivate_plugins(plugin_basename(__FILE__));
        add_action('admin_notices', function () {
            echo '<div class="notice notice-error"><p>افزونه‌ی Phoenix Bridge غیرفعال شد چون ووکامرس نصب یا فعال نیست.</p></div>';
        });
    }
}
