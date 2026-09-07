<?php
/**
 * اندپوینت‌های فونیکس
 *
 * ============================================================
 * سه اندپوینت، سه سطحِ دسترسیِ متفاوت — و این تفاوت عمدی است:
 *
 *   /catalog            عمومی، فقط‌خواندنی، بدون راز
 *   /customer-by-phone  با کلید ووکامرس، فقط از سمتِ سرور
 *   /order              عمومی ولی با محدودیت و اعتبارسنجیِ سخت
 *
 * ⚠ قاعده‌ای که هیچ‌وقت شکسته نمی‌شود: قیمت از سمتِ کلاینت خوانده
 * نمی‌شود. سفارش فقط شناسه‌ی محصول و تعداد می‌فرستد؛ قیمت را
 * ووکامرس از پایگاه داده‌ی خودش برمی‌دارد. اگر قیمت از کلاینت
 * بیاید، هر کسی می‌تواند یک اکانت میلیونی را به هزار تومان بخرد.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', 'phoenix_register_routes');
function phoenix_register_routes() {

    /* ---------- کاتالوگ عمومی ---------- */
    register_rest_route('phoenix/v1', '/catalog', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'phoenix_rest_catalog',
        'permission_callback' => '__return_true', // عمومی و فقط‌خواندنی
    ));

    /* ---------- جست‌وجوی مشتری با شماره ---------- */
    register_rest_route('phoenix/v1', '/customer-by-phone', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'phoenix_rest_customer_by_phone',
        'permission_callback' => 'phoenix_require_woo_key',
        'args'                => array(
            'phone' => array('required' => true, 'type' => 'string'),
        ),
    ));

    /* ---------- قیمت و موجودی زنده ---------- */
    register_rest_route('phoenix/v1', '/prices', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'phoenix_rest_prices',
        'permission_callback' => '__return_true',
    ));

    /* ---------- پیگیری سفارش ---------- */
    register_rest_route('phoenix/v1', '/track', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'phoenix_rest_track',
        'permission_callback' => 'phoenix_rate_limit_orders',
    ));

    /* ---------- ثبت سفارش ---------- */
    register_rest_route('phoenix/v1', '/order', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'phoenix_rest_create_order',
        'permission_callback' => 'phoenix_rate_limit_orders',
    ));
}

/* ============================================================
   دسترسی
   ============================================================ */

/**
 * فقط با کلیدِ ووکامرس.
 *
 * ⚠ hash_equals و نه == .
 *
 * مقایسه‌ی معمولیِ رشته به‌محضِ اولین بایتِ متفاوت برمی‌گردد، پس
 * زمانِ پاسخ می‌گوید چند بایتِ اول درست بوده. با تکرار می‌شود کلید
 * را بایت‌به‌بایت حدس زد. hash_equals زمانش ثابت است.
 */
function phoenix_require_woo_key(WP_REST_Request $request) {
    $key    = $request->get_param('consumer_key');
    $secret = $request->get_param('consumer_secret');

    if (!is_string($key) || !is_string($secret) || $key === '' || $secret === '') {
        return new WP_Error('phoenix_no_key', 'کلید لازم است.', array('status' => 401));
    }

    global $wpdb;
    $row = $wpdb->get_row($wpdb->prepare(
        "SELECT consumer_secret FROM {$wpdb->prefix}woocommerce_api_keys WHERE consumer_key = %s LIMIT 1",
        wc_api_hash($key)
    ));

    if (!$row || !hash_equals((string) $row->consumer_secret, $secret)) {
        return new WP_Error('phoenix_bad_key', 'کلید معتبر نیست.', array('status' => 401));
    }
    return true;
}

/**
 * محدودیت نرخ برای ثبت سفارش.
 *
 * اندپوینتِ عمومیِ ساختِ سفارش، بدونِ محدودیت، یعنی هر کسی
 * می‌تواند در دقیقه هزار سفارشِ الکی بسازد و پایگاه داده و انبار
 * را پر کند. ده تا در ساعت برای هر IP سخاوتمندانه است — کاربرِ
 * واقعی در یک نشست دو سه سفارش می‌دهد.
 */
function phoenix_rate_limit_orders(WP_REST_Request $request) {
    $ip  = phoenix_client_ip();
    $key = 'phoenix_rl_' . md5($ip);
    $n   = (int) get_transient($key);

    if ($n >= 10) {
        return new WP_Error(
            'phoenix_rate_limited',
            'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کن.',
            array('status' => 429)
        );
    }
    set_transient($key, $n + 1, HOUR_IN_SECONDS);
    return true;
}

/**
 * IP کلاینت.
 *
 * ⚠ هدرهای پراکسی فقط وقتی اعتبار دارند که پراکسیِ خودمان باشد.
 *
 * X-Forwarded-For را هر کسی می‌تواند جعل کند. اگر کورکورانه
 * قبولش کنیم، محدودیتِ نرخ بی‌فایده می‌شود چون مهاجم هر بار یک
 * IP تازه اعلام می‌کند. پس فقط وقتی می‌خوانیمش که ثابتِ
 * PHOENIX_TRUST_PROXY تعریف شده باشد.
 */
function phoenix_client_ip() {
    if (defined('PHOENIX_TRUST_PROXY') && PHOENIX_TRUST_PROXY && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip    = trim($parts[0]);
        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            return $ip;
        }
    }
    $remote = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
    return filter_var($remote, FILTER_VALIDATE_IP) ? $remote : '0.0.0.0';
}

/* ============================================================
   کاتالوگ
   ============================================================ */

/**
 * کاتالوگِ کامل در یک درخواست.
 *
 * سایتِ ایستا نمی‌تواند برای هر محصول یک درخواست بزند — سی محصول
 * یعنی سی رفت و برگشت. این‌جا همه‌چیز یک‌جا برمی‌گردد و ده دقیقه
 * کش می‌شود.
 */
function phoenix_rest_catalog(WP_REST_Request $request) {
    $cached = get_transient('phoenix_catalog_cache');
    if ($cached !== false && !$request->get_param('fresh')) {
        return rest_ensure_response($cached);
    }

    $query = new WP_Query(array(
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => 200,
        'no_found_rows'  => true,
        'fields'         => 'ids',
    ));

    $out = array();
    foreach ($query->posts as $pid) {
        $product = wc_get_product($pid);
        if (!$product) {
            continue;
        }
        $out[] = phoenix_shape_product($product);
    }

    set_transient('phoenix_catalog_cache', $out, 10 * MINUTE_IN_SECONDS);
    return rest_ensure_response($out);
}

function phoenix_shape_product($product) {
    $id = $product->get_id();

    $variants = array();
    if ($product->is_type('variable')) {
        foreach ($product->get_children() as $vid) {
            $v = wc_get_product($vid);
            if (!$v) {
                continue;
            }
            $vf = phoenix_get_fields($vid);
            $variants[] = array(
                'id'         => (string) $vid,
                'label'      => isset($vf['label']) && $vf['label'] !== ''
                    ? $vf['label']
                    : implode(' — ', array_values($v->get_variation_attributes())),
                'price'      => (int) round((float) $v->get_price()),
                'compareAt'  => $v->is_on_sale() ? (int) round((float) $v->get_regular_price()) : null,
                'usd'        => isset($vf['usd']) ? (float) $vf['usd'] : null,
                'stock'      => $v->is_in_stock() ? ($v->managing_stock() ? $v->get_stock_quantity() : null) : 0,
                'isDefault'  => !empty($vf['is_default']),
                'guide'      => isset($vf['guide']) ? $vf['guide'] : null,
            );
        }
    } else {
        $variants[] = array(
            'id'        => (string) $id,
            'label'     => 'خرید',
            'price'     => (int) round((float) $product->get_price()),
            'compareAt' => $product->is_on_sale() ? (int) round((float) $product->get_regular_price()) : null,
            'usd'       => null,
            'stock'     => $product->is_in_stock() ? ($product->managing_stock() ? $product->get_stock_quantity() : null) : 0,
            'isDefault' => true,
            'guide'     => null,
        );
    }

    $cats = array();
    foreach (wp_get_post_terms($id, 'product_cat') as $t) {
        $cats[] = array('slug' => $t->slug, 'name' => $t->name);
    }
    $tags = array();
    foreach (wp_get_post_terms($id, 'product_tag') as $t) {
        $tags[] = array('slug' => $t->slug, 'name' => $t->name);
    }

    $images = array();
    $main = wp_get_attachment_image_url($product->get_image_id(), 'large');
    if ($main) {
        $images[] = array('src' => $main);
    }
    foreach ($product->get_gallery_image_ids() as $gid) {
        $src = wp_get_attachment_image_url($gid, 'large');
        if ($src) {
            $images[] = array('src' => $src);
        }
    }

    return array(
        'id'                => $id,
        'name'              => $product->get_name(),
        'slug'              => $product->get_slug(),
        'type'              => $product->get_type(),
        'description'       => $product->get_description(),
        'short_description' => $product->get_short_description(),
        'sku'               => $product->get_sku(),
        'average_rating'    => $product->get_average_rating(),
        'rating_count'      => $product->get_rating_count(),
        'total_sales'       => (int) get_post_meta($id, 'total_sales', true),
        'categories'        => $cats,
        'tags'              => $tags,
        'images'            => $images,
        'phoenix'           => phoenix_get_fields($id),
        '_variants'         => $variants,
    );
}

/* ============================================================
   مشتری
   ============================================================ */

function phoenix_rest_customer_by_phone(WP_REST_Request $request) {
    $phone = phoenix_normalize_phone((string) $request->get_param('phone'));
    if ($phone === '') {
        return new WP_Error('phoenix_bad_phone', 'شماره معتبر نیست.', array('status' => 400));
    }

    $users = get_users(array(
        'meta_key'   => 'billing_phone',
        'meta_value' => $phone,
        'number'     => 1,
        'fields'     => 'ID',
    ));

    return rest_ensure_response(array('id' => !empty($users) ? (int) $users[0] : null));
}

/**
 * شماره را به یک شکلِ واحد درمی‌آورد.
 *
 * کاربر ۰۹۱۲…، ‎+۹۸۹۱۲…‎، ‎۹۸۹۱۲…‎ و با ارقام فارسی می‌نویسد. اگر
 * همان‌طور که آمده ذخیره شود، یک نفر با سه شکلِ نوشتن سه حساب
 * می‌سازد و هیچ‌کدام سفارش‌های دیگری را نمی‌بیند.
 */
function phoenix_normalize_phone($raw) {
    $fa = array('۰','۱','۲','۳','۴','۵','۶','۷','۸','۹');
    $ar = array('٠','١','٢','٣','٤','٥','٦','٧','٨','٩');
    $en = array('0','1','2','3','4','5','6','7','8','9');
    $s  = str_replace($fa, $en, $raw);
    $s  = str_replace($ar, $en, $s);
    $s  = preg_replace('/[^0-9]/', '', $s);

    if (strpos($s, '98') === 0 && strlen($s) === 12) {
        $s = '0' . substr($s, 2);
    }
    if (strpos($s, '9') === 0 && strlen($s) === 10) {
        $s = '0' . $s;
    }
    return preg_match('/^09[0-9]{9}$/', $s) ? $s : '';
}

/* ============================================================
   سفارش
   ============================================================ */

/**
 * ثبت سفارش.
 *
 * ⚠ قیمت هرگز از بدنه‌ی درخواست خوانده نمی‌شود.
 *
 * کلاینت فقط می‌گوید «این محصول، این تعداد». قیمت را ووکامرس از
 * پایگاه داده برمی‌دارد. این تنها راهِ درست است: هر معماری‌ای که
 * قیمت را از مرورگر بگیرد، با یک ابزارِ ساده دور زده می‌شود.
 */
function phoenix_rest_create_order(WP_REST_Request $request) {
    if (!function_exists('wc_create_order')) {
        return new WP_Error('phoenix_no_woo', 'ووکامرس فعال نیست.', array('status' => 500));
    }

    $body  = $request->get_json_params();
    $phone = phoenix_normalize_phone(isset($body['phone']) ? (string) $body['phone'] : '');
    $name  = isset($body['name']) ? sanitize_text_field((string) $body['name']) : '';
    $items = isset($body['items']) && is_array($body['items']) ? $body['items'] : array();

    if ($phone === '') {
        return new WP_Error('phoenix_bad_phone', 'شماره‌ی موبایل معتبر نیست.', array('status' => 400));
    }

    /* ⚠ شماره باید ثابت شده باشد.

       بدون این، اندپوینتِ عمومیِ سفارش یعنی هر کسی می‌تواند با
       شماره‌ی هر کسی سفارش بسازد — نه فقط مزاحمت، بلکه انبار را
       هم قفل می‌کند. ژتون از مسیرِ رمز یک‌بارمصرف می‌آید و فقط
       برای همان شماره معتبر است، پس ژتونِ یک نفر برای شماره‌ی
       دیگری کار نمی‌کند. */
    $token_phone = phoenix_token_phone(isset($body['token']) ? (string) $body['token'] : '');
    if ($token_phone === '' || !hash_equals($token_phone, $phone)) {
        return new WP_Error(
            'phoenix_unverified',
            'شماره تأیید نشده. اول کد یک‌بارمصرف را بگیر و وارد کن.',
            array('status' => 401)
        );
    }

    if (empty($items)) {
        return new WP_Error('phoenix_empty', 'سبد خالی است.', array('status' => 400));
    }
    if (count($items) > 20) {
        return new WP_Error('phoenix_too_many', 'تعداد اقلام بیش از حد است.', array('status' => 400));
    }

    $order = wc_create_order();

    foreach ($items as $raw) {
        $pid = isset($raw['id']) ? absint($raw['id']) : 0;
        $qty = isset($raw['qty']) ? absint($raw['qty']) : 1;
        if ($pid === 0 || $qty < 1 || $qty > 20) {
            $order->delete(true);
            return new WP_Error('phoenix_bad_item', 'قلم سفارش معتبر نیست.', array('status' => 400));
        }

        $product = wc_get_product($pid);
        if (!$product || $product->get_status() !== 'publish') {
            $order->delete(true);
            return new WP_Error('phoenix_no_product', 'محصول پیدا نشد.', array('status' => 400));
        }
        if (!$product->is_in_stock()) {
            $order->delete(true);
            return new WP_Error('phoenix_out_of_stock', 'این محصول موجود نیست: ' . $product->get_name(), array('status' => 409));
        }

        /* قیمت داده نمی‌شود؛ ووکامرس خودش از محصول برمی‌دارد */
        $item_id = $order->add_product($product, $qty);

        /* ورودی‌هایی که مشتری داده — روی همان قلم می‌نشینند تا
           اپراتور موقع تحویل ببیندشان */
        if (!empty($raw['inputs']) && is_array($raw['inputs']) && $item_id) {
            $item = $order->get_item($item_id);
            foreach ($raw['inputs'] as $k => $v) {
                if (!is_string($k) || !is_scalar($v)) {
                    continue;
                }
                $item->add_meta_data(sanitize_text_field($k), sanitize_text_field((string) $v), true);
            }
            $item->save();
        }
    }

    $order->set_billing_phone($phone);
    if ($name !== '') {
        $order->set_billing_first_name($name);
    }
    if (!empty($body['email']) && is_email($body['email'])) {
        $order->set_billing_email(sanitize_email($body['email']));
    }
    if (!empty($body['note'])) {
        $order->set_customer_note(sanitize_textarea_field((string) $body['note']));
    }

    $customer_id = phoenix_customer_id_for_phone($phone);
    if ($customer_id) {
        $order->set_customer_id($customer_id);
    }

    $order->calculate_totals();
    $order->update_status('pending', 'ثبت از فروشگاه فونیکس');

    return rest_ensure_response(array(
        'id'     => $order->get_id(),
        'number' => $order->get_order_number(),
        'key'    => $order->get_order_key(),
        'total'  => (int) round((float) $order->get_total()),
        'pay_url'=> $order->get_checkout_payment_url(),
    ));
}

function phoenix_customer_id_for_phone($phone) {
    $users = get_users(array(
        'meta_key'   => 'billing_phone',
        'meta_value' => $phone,
        'number'     => 1,
        'fields'     => 'ID',
    ));
    return !empty($users) ? (int) $users[0] : 0;
}

/* ============================================================
   کش
   ============================================================ */

/** با هر تغییرِ محصول، کشِ کاتالوگ می‌پرد */
add_action('woocommerce_update_product', 'phoenix_flush_catalog_cache');
add_action('woocommerce_new_product', 'phoenix_flush_catalog_cache');
add_action('woocommerce_delete_product', 'phoenix_flush_catalog_cache');
function phoenix_flush_catalog_cache() {
    delete_transient('phoenix_catalog_cache');
}

/* ============================================================
   پیگیری
   ============================================================ */

/**
 * سفارش را با شماره‌ی سفارش و موبایل برمی‌گرداند.
 *
 * ⚠ هر دو لازم‌اند و این عمدی است.
 *
 * فقط با شماره‌ی سفارش، هر کسی می‌تواند شماره‌ها را یکی‌یکی
 * امتحان کند و سفارش‌های دیگران را ببیند — اسم، تلفن، و کدی که
 * تحویل داده شده. شماره‌ی موبایل همان چیزی است که فقط صاحب سفارش
 * می‌داند.
 *
 * محدودیت نرخ هم دارد، وگرنه همان حدس‌زدن با ترکیب دوتایی ادامه
 * پیدا می‌کند.
 */
function phoenix_rest_track(WP_REST_Request $request) {
    $body   = $request->get_json_params();
    $number = isset($body['code']) ? sanitize_text_field((string) $body['code']) : '';
    $phone  = phoenix_normalize_phone(isset($body['phone']) ? (string) $body['phone'] : '');

    if ($number === '' || $phone === '') {
        return new WP_Error('phoenix_bad_track', 'شماره‌ی سفارش و موبایل لازم است.', array('status' => 400));
    }

    $order_id = (int) preg_replace('/[^0-9]/', '', $number);
    $order    = $order_id ? wc_get_order($order_id) : false;

    /* ⚠ پیام یکی است، چه سفارش نباشد چه شماره نخورد.

       اگر دو پیام متفاوت بدهیم، مهاجم می‌فهمد کدام شماره‌ی سفارش
       وجود دارد و فقط دنبال موبایلش می‌گردد. */
    if (!$order || !hash_equals(phoenix_normalize_phone($order->get_billing_phone()), $phone)) {
        return new WP_Error('phoenix_not_found', 'سفارشی با این مشخصات پیدا نشد.', array('status' => 404));
    }

    $items = array();
    foreach ($order->get_items() as $item) {
        $codes = array();
        foreach ($item->get_meta_data() as $m) {
            $d = $m->get_data();
            if (isset($d['key']) && $d['key'] === 'کد تحویل') {
                $codes[] = $d['value'];
            }
        }
        $items[] = array(
            'title'    => $item->get_name(),
            'quantity' => $item->get_quantity(),
            'total'    => (int) round((float) $item->get_total()),
            'codes'    => $codes,
        );
    }

    return rest_ensure_response(array(
        'number'    => $order->get_order_number(),
        'status'    => $order->get_status(),
        'createdAt' => $order->get_date_created() ? $order->get_date_created()->getTimestamp() : null,
        'total'     => (int) round((float) $order->get_total()),
        'delivered' => (bool) $order->get_meta(PHOENIX_DELIVERED_META),
        'items'     => $items,
    ));
}

/* ============================================================
   قیمت و موجودی زنده
   ============================================================ */

/**
 * فقط قیمت و موجودی — سبک، برای سایتِ ایستا.
 *
 * ⚠ مسئله‌ای که این حل می‌کند

 * سایت خروجی ایستا دارد، پس قیمت‌ها لحظه‌ی بیلد در HTML پخته
 * می‌شوند. اگر ادمین قیمتی را در پنل عوض کند و کسی بیلد نزند،
 * بازدیدکننده عدد قدیمی می‌بیند. پول از دست نمی‌رود — سفارش قیمت
 * را از ووکامرس می‌گیرد نه از مرورگر — ولی عددِ صفحه با فاکتور
 * فرق می‌کند و همین اعتماد را می‌برد.
 *
 * با این اندپوینت، صفحه بعد از باز شدن قیمت‌ها را تازه می‌کند.
 *
 * چرا جدا از /catalog: آن یکی توضیحات و تصویر و همه‌چیز را
 * می‌فرستد — برای هر بازدید سنگین است. این فقط سه عدد برای هر
 * پلن است و چند کیلوبایت می‌شود.
 */
function phoenix_rest_prices(WP_REST_Request $request) {
    $cached = get_transient('phoenix_prices_cache');
    if ($cached !== false) {
        return rest_ensure_response($cached);
    }

    $query = new WP_Query(array(
        'post_type'      => array('product', 'product_variation'),
        'post_status'    => 'publish',
        'posts_per_page' => 500,
        'no_found_rows'  => true,
        'fields'         => 'ids',
    ));

    $out = array();
    foreach ($query->posts as $pid) {
        $p = wc_get_product($pid);
        if (!$p) {
            continue;
        }
        $out[(string) $pid] = array(
            'price'     => (int) round((float) $p->get_price()),
            'compareAt' => $p->is_on_sale() ? (int) round((float) $p->get_regular_price()) : null,
            'stock'     => $p->is_in_stock()
                ? ($p->managing_stock() ? $p->get_stock_quantity() : null)
                : 0,
        );
    }

    /* یک دقیقه — قیمت آن‌قدر عوض نمی‌شود که کمتر لازم باشد، و
       این‌طور هر بازدید یک کوئری به دیتابیس نمی‌زند. */
    set_transient('phoenix_prices_cache', $out, MINUTE_IN_SECONDS);
    return rest_ensure_response($out);
}

add_action('woocommerce_update_product', 'phoenix_flush_prices_cache');
add_action('woocommerce_variation_set_stock', 'phoenix_flush_prices_cache');
add_action('woocommerce_product_set_stock', 'phoenix_flush_prices_cache');
function phoenix_flush_prices_cache() {
    delete_transient('phoenix_prices_cache');
}
