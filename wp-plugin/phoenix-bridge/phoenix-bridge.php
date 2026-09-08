<?php
/**
 * Plugin Name: Phoenix Bridge
 * Description: پلِ میان فروشگاه فونیکس و ووکامرس — فیلدهای دیجیتال، اندپوینت عمومی، و کلید حساب روی شماره‌ی موبایل.
 * Version:     1.0.0
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

define('PHOENIX_BRIDGE_VERSION', '1.0.0');
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
 * فیلدها را به پاسخِ REST ووکامرس اضافه می‌کند.
 *
 * به‌جای اینکه کلاینت meta_data را بگردد، یک کلیدِ phoenix
 * می‌گیرد که از قبل ساختار دارد. مَپرِ سمتِ Next هر دو را
 * می‌فهمد، ولی این یکی تمیزتر است.
 */
add_filter('woocommerce_rest_prepare_product_object', 'phoenix_add_fields_to_product', 10, 3);
function phoenix_add_fields_to_product($response, $object, $request) {
    $response->data['phoenix'] = phoenix_get_fields($object->get_id());
    return $response;
}

add_filter('woocommerce_rest_prepare_product_variation_object', 'phoenix_add_fields_to_variation', 10, 3);
function phoenix_add_fields_to_variation($response, $object, $request) {
    $response->data['phoenix'] = phoenix_get_fields($object->get_id());
    return $response;
}

/* ============================================================
   ۲ پنل مدیریت — تبِ فونیکس روی صفحه‌ی محصول
   ============================================================ */

add_filter('woocommerce_product_data_tabs', 'phoenix_product_tab');
function phoenix_product_tab($tabs) {
    $tabs['phoenix'] = array(
        'label'    => 'فونیکس',
        'target'   => 'phoenix_product_data',
        'class'    => array(),
        'priority' => 21,
    );
    return $tabs;
}

add_action('woocommerce_product_data_panels', 'phoenix_product_panel');
function phoenix_product_panel() {
    global $post;
    $f = phoenix_get_fields($post->ID);

    echo '<div id="phoenix_product_data" class="panel woocommerce_options_panel">';

    woocommerce_wp_text_input(array(
        'id'          => 'phoenix_english_title',
        'label'       => 'نام انگلیسی',
        'description' => 'زیر عنوان فارسی نشان داده می‌شود.',
        'desc_tip'    => true,
        'value'       => isset($f['english_title']) ? $f['english_title'] : '',
    ));

    woocommerce_wp_text_input(array(
        'id'    => 'phoenix_brand',
        'label' => 'برند',
        'value' => isset($f['brand']) ? $f['brand'] : '',
    ));

    woocommerce_wp_select(array(
        'id'          => 'phoenix_fulfillment',
        'label'       => 'روش تحویل',
        'description' => 'بعد از پرداخت چه اتفاقی می‌افتد.',
        'desc_tip'    => true,
        'value'       => isset($f['fulfillment']) ? $f['fulfillment'] : 'manual',
        'options'     => array(
            'stock_code'      => 'کد از انبار',
            'stock_account'   => 'یوزر و پسورد از انبار',
            'upgrade_on_user' => 'ارتقای اکانت خود مشتری',
            'api_topup'       => 'شارژ خودکار',
            'manual'          => 'دستی',
        ),
    ));

    woocommerce_wp_text_input(array(
        'id'    => 'phoenix_delivery_estimate',
        'label' => 'زمان تحویل',
        'value' => isset($f['delivery_estimate']) ? $f['delivery_estimate'] : '',
    ));

    woocommerce_wp_text_input(array(
        'id'    => 'phoenix_warranty_label',
        'label' => 'عنوان گارانتی',
        'value' => isset($f['warranty_label']) ? $f['warranty_label'] : '',
    ));

    woocommerce_wp_text_input(array(
        'id'          => 'phoenix_accent',
        'label'       => 'رنگ شاخص',
        'description' => 'کد رنگ مثل ‎#ffa63d‎ — روی کارت محصول استفاده می‌شود.',
        'desc_tip'    => true,
        'value'       => isset($f['accent']) ? $f['accent'] : '',
    ));

    /* آرایه‌ها به‌صورت JSON ویرایش می‌شوند.

       فرمِ تکرارشونده‌ی درست ساختن در پنل ووکامرس کارِ یک روز است
       و این‌ها را ادمین کم عوض می‌کند. JSON زشت است ولی صادق:
       ساختار را همان‌طور نشان می‌دهد که هست، و اعتبارسنجی هنگام
       ذخیره جلوی JSONِ خراب را می‌گیرد. */
    phoenix_json_field('phoenix_required_inputs', 'ورودی‌های لازم از مشتری', $f, 'required_inputs',
        '[{"key":"email","label":"ایمیل اکانت","type":"email","example":"you@mail.com"}]');
    phoenix_json_field('phoenix_features', 'ویژگی‌ها', $f, 'features', '["ویژگی اول","ویژگی دوم"]');
    phoenix_json_field('phoenix_notes', 'نکته‌ها', $f, 'notes', '["نکته‌ی اول"]');
    phoenix_json_field('phoenix_faq', 'سوالات متداول', $f, 'faq', '[{"q":"سوال","a":"جواب"}]');
    phoenix_json_field('phoenix_platforms', 'پلتفرم‌ها', $f, 'platforms', '["Web","iOS","Android"]');
    phoenix_json_field('phoenix_badges', 'نشان‌ها', $f, 'badges', '["hot","new"]');

    echo '</div>';
}

function phoenix_json_field($id, $label, $fields, $key, $placeholder) {
    $value = isset($fields[$key]) ? wp_json_encode($fields[$key], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) : '';
    echo '<div class="options_group"><p class="form-field">';
    echo '<label for="' . esc_attr($id) . '">' . esc_html($label) . '</label>';
    echo '<textarea id="' . esc_attr($id) . '" name="' . esc_attr($id) . '" rows="4" style="width:70%;font-family:monospace;direction:ltr" placeholder="' . esc_attr($placeholder) . '">'
        . esc_textarea($value) . '</textarea>';
    echo '</p></div>';
}

/**
 * ذخیره.
 *
 * ⚠ nonce را خودِ ووکامرس چک می‌کند، ولی قابلیت را باید ما چک
 * کنیم: بدون این، هر کاربری که به هر دلیلی بتواند درخواستِ ذخیره
 * بفرستد می‌تواند متای محصول را عوض کند.
 */
add_action('woocommerce_process_product_meta', 'phoenix_save_fields');
function phoenix_save_fields($post_id) {
    if (!current_user_can('edit_product', $post_id)) {
        return;
    }

    $f = phoenix_get_fields($post_id);

    $texts = array(
        'english_title'     => 'phoenix_english_title',
        'brand'             => 'phoenix_brand',
        'fulfillment'       => 'phoenix_fulfillment',
        'delivery_estimate' => 'phoenix_delivery_estimate',
        'warranty_label'    => 'phoenix_warranty_label',
        'accent'            => 'phoenix_accent',
    );
    foreach ($texts as $key => $field) {
        if (isset($_POST[$field])) {
            $f[$key] = sanitize_text_field(wp_unslash($_POST[$field]));
        }
    }

    $jsons = array(
        'required_inputs' => 'phoenix_required_inputs',
        'features'        => 'phoenix_features',
        'notes'           => 'phoenix_notes',
        'faq'             => 'phoenix_faq',
        'platforms'       => 'phoenix_platforms',
        'badges'          => 'phoenix_badges',
    );
    foreach ($jsons as $key => $field) {
        if (!isset($_POST[$field])) {
            continue;
        }
        $raw = trim((string) wp_unslash($_POST[$field]));
        if ($raw === '') {
            unset($f[$key]);
            continue;
        }
        $decoded = json_decode($raw, true);
        /* JSONِ خراب بی‌صدا نادیده گرفته نمی‌شود — مقدارِ قبلی
           می‌ماند و به ادمین هشدار داده می‌شود. بی‌صدا پاک کردن
           یعنی ادمین فکر می‌کند ذخیره شده. */
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $f[$key] = phoenix_sanitize_deep($decoded);
        } else {
            set_transient('phoenix_json_error_' . $post_id, $field, 60);
        }
    }

    phoenix_set_fields($post_id, $f);
}

/** پاک‌سازی بازگشتی — هیچ رشته‌ای بدون sanitize ذخیره نمی‌شود */
function phoenix_sanitize_deep($value) {
    if (is_array($value)) {
        $out = array();
        foreach ($value as $k => $v) {
            $out[sanitize_key((string) $k)] = phoenix_sanitize_deep($v);
        }
        return $out;
    }
    if (is_string($value)) {
        return sanitize_textarea_field($value);
    }
    if (is_bool($value) || is_numeric($value)) {
        return $value;
    }
    return '';
}

add_action('admin_notices', 'phoenix_json_error_notice');
function phoenix_json_error_notice() {
    global $post;
    if (!$post) {
        return;
    }
    $bad = get_transient('phoenix_json_error_' . $post->ID);
    if ($bad) {
        delete_transient('phoenix_json_error_' . $post->ID);
        echo '<div class="notice notice-error"><p>فیلد <code>' . esc_html($bad)
            . '</code> ذخیره نشد چون JSON آن معتبر نبود. مقدار قبلی دست‌نخورده ماند.</p></div>';
    }
}

/* ============================================================
   ۳ فیلدهای پلن روی واریاسیون
   ============================================================ */

add_action('woocommerce_variation_options_pricing', 'phoenix_variation_fields', 10, 3);
function phoenix_variation_fields($loop, $variation_data, $variation) {
    $f = phoenix_get_fields($variation->ID);

    woocommerce_wp_text_input(array(
        'id'            => "phoenix_var_label_{$loop}",
        'name'          => "phoenix_var_label[{$loop}]",
        'label'         => 'برچسب پلن',
        'value'         => isset($f['label']) ? $f['label'] : '',
        'wrapper_class' => 'form-row form-row-first',
    ));

    woocommerce_wp_text_input(array(
        'id'            => "phoenix_var_usd_{$loop}",
        'name'          => "phoenix_var_usd[{$loop}]",
        'label'         => 'مبلغ دلاری',
        'type'          => 'number',
        'custom_attributes' => array('step' => '0.01', 'min' => '0'),
        'value'         => isset($f['usd']) ? $f['usd'] : '',
        'wrapper_class' => 'form-row form-row-last',
        'description'   => 'اگر پر باشد، قیمت تومانی از نرخ روز حساب می‌شود.',
        'desc_tip'      => true,
    ));

    woocommerce_wp_textarea_input(array(
        'id'            => "phoenix_var_fit_{$loop}",
        'name'          => "phoenix_var_fit[{$loop}]",
        'label'         => 'این پلن مال کیست',
        'value'         => isset($f['guide']['fit']) ? $f['guide']['fit'] : '',
        'wrapper_class' => 'form-row form-row-full',
    ));

    woocommerce_wp_textarea_input(array(
        'id'            => "phoenix_var_detail_{$loop}",
        'name'          => "phoenix_var_detail[{$loop}]",
        'label'         => 'دقیقاً چه می‌گیرد',
        'value'         => isset($f['guide']['detail']) ? $f['guide']['detail'] : '',
        'wrapper_class' => 'form-row form-row-full',
    ));
}

add_action('woocommerce_save_product_variation', 'phoenix_save_variation', 10, 2);
function phoenix_save_variation($variation_id, $loop) {
    if (!current_user_can('edit_product', $variation_id)) {
        return;
    }

    $f = phoenix_get_fields($variation_id);

    if (isset($_POST['phoenix_var_label'][$loop])) {
        $f['label'] = sanitize_text_field(wp_unslash($_POST['phoenix_var_label'][$loop]));
    }
    if (isset($_POST['phoenix_var_usd'][$loop])) {
        $usd = (string) wp_unslash($_POST['phoenix_var_usd'][$loop]);
        $f['usd'] = $usd === '' ? null : (float) $usd;
        if ($f['usd'] === null) {
            unset($f['usd']);
        }
    }

    $fit    = isset($_POST['phoenix_var_fit'][$loop]) ? sanitize_textarea_field(wp_unslash($_POST['phoenix_var_fit'][$loop])) : '';
    $detail = isset($_POST['phoenix_var_detail'][$loop]) ? sanitize_textarea_field(wp_unslash($_POST['phoenix_var_detail'][$loop])) : '';
    if ($fit !== '' && $detail !== '') {
        $f['guide'] = array('fit' => $fit, 'detail' => $detail);
    } else {
        unset($f['guide']);
    }

    phoenix_set_fields($variation_id, $f);
}

/* ============================================================
   بارگذاری بخش‌ها
   ============================================================ */

require_once plugin_dir_path(__FILE__) . 'includes/rest.php';
require_once plugin_dir_path(__FILE__) . 'includes/auth.php';
require_once plugin_dir_path(__FILE__) . 'includes/orders.php';
require_once plugin_dir_path(__FILE__) . 'includes/rate.php';

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
