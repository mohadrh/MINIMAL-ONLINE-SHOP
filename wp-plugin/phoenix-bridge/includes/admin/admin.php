<?php
/**
 * پنلِ فونیکس — ستون فقرات.
 *
 * ============================================================
 * ⚠ قاعده‌ی این پنل، به خواسته‌ی کارفرما:
 *
 *   هر چیزی که خودکار است باید دستی هم بشود،
 *   و هر وضعیتی باید دیده شود.
 *
 * یعنی هیچ کاری پشتِ پرده نمی‌افتد که ادمین نتواند ببیندش،
 * جلویش را بگیرد، یا خودش انجامش دهد. هر صفحه سه چیز دارد:
 * **وضعیتِ الان**، **تاریخچه**، و **دکمه‌ی دستی**.
 *
 * ============================================================
 * ⚠ و سه قاعده‌ی امنیتی که هیچ صفحه‌ای از آن‌ها معاف نیست.
 *
 * هر سه در ‎phoenix_admin_guard()‎ جمع شده‌اند و هر کنشِ
 * نوشتنی اولین کاری که می‌کند صدا زدنِ آن است. جمع‌بودنشان در
 * یک تابع عمدی است: با تکرارِ دستیِ سه خط در هر صفحه، روزی
 * یکی‌شان جا می‌ماند و آن یک صفحه همان دری است که باز مانده.
 *
 *   ۱ قابلیت — ‎manage_woocommerce‎، نه ‎manage_options‎.
 *     کسی که فروشگاه را می‌چرخاند لزوماً مدیرِ کلِ سایت نیست.
 *
 *   ۲ nonce — روی هر فرم. بدونش، یک صفحه‌ی دیگر می‌تواند
 *     مرورگرِ ادمینِ لاگین‌شده را وادار کند حاشیه‌ی سود را
 *     صفر کند.
 *
 *   ۳ ‎wp_unslash‎ پیش از هر ‎sanitize‎. وردپرس روی ‎$_POST‎
 *     بک‌اسلش می‌گذارد؛ بدونِ برداشتنش، هر نقلِ‌قول در متن
 *     هر بار یک بک‌اسلشِ تازه می‌گیرد.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_CAP  = 'manage_woocommerce';
const PHOENIX_MENU = 'phoenix';

/* ============================================================
   منو
   ============================================================ */

add_action('admin_menu', 'phoenix_admin_menu');
function phoenix_admin_menu() {
    add_menu_page(
        'فونیکس',
        'فونیکس',
        PHOENIX_CAP,
        PHOENIX_MENU,
        'phoenix_page_dashboard',
        'dashicons-chart-line',
        56
    );

    $pages = array(
        PHOENIX_MENU          => array('داشبورد', 'phoenix_page_dashboard'),
        'phoenix-rate'        => array('نرخ تتر', 'phoenix_page_rate'),
        'phoenix-margins'     => array('حاشیه و قیمت', 'phoenix_page_margins'),
        'phoenix-discounts'   => array('تخفیف‌ها', 'phoenix_page_discounts'),
        'phoenix-queue'       => array('صف تحویل', 'phoenix_page_queue'),
        'phoenix-log'         => array('تاریخچه', 'phoenix_page_log'),
    );

    foreach ($pages as $slug => $def) {
        add_submenu_page(PHOENIX_MENU, $def[0] . ' — فونیکس', $def[0], PHOENIX_CAP, $slug, $def[1]);
    }
}

/* ============================================================
   نگهبان
   ============================================================ */

/**
 * ⚠ هر کنشِ نوشتنی با این شروع می‌شود، بی‌استثنا.
 *
 * ‎check_admin_referer‎ خودش روی شکست ‎wp_die‎ می‌کند، پس
 * نیازی به بررسیِ خروجی‌اش نیست — ولی ترتیب مهم است: اول
 * قابلیت، بعد nonce. برعکسش یعنی به کاربرِ بی‌اجازه هم
 * می‌گوییم nonce درست بود یا نه.
 */
function phoenix_admin_guard($action) {
    if (!current_user_can(PHOENIX_CAP)) {
        wp_die('اجازه‌ی دسترسی به این بخش را نداری.', 'دسترسی رد شد', array('response' => 403));
    }
    check_admin_referer($action);
}

/**
 * فرمِ امن — همیشه به‌جای ‎<form>‎ی دستی.
 *
 * ⚠ ‎page‎ در *نشانیِ* فرم است، نه فقط در فیلدِ مخفی.
 *
 * اول فقط فیلدِ مخفی بود و فرم به ‎admin.php‎ی بی‌کوئری پست
 * می‌شد. نتیجه این بود که ‎$_GET['page']‎ خالی می‌ماند،
 * ‎phoenix_current_page()‎ به پیش‌فرض (داشبورد) برمی‌گشت، و
 * *هر* ذخیره‌ای کاربر را به داشبورد پرت می‌کرد — نه به صفحه‌ای
 * که در آن بود. وردپرس هم صفحه‌ی پیشخوان را از ‎$_GET‎
 * می‌شناسد نه از ‎$_POST‎، پس فیلدِ مخفی هیچ‌وقت این کار را
 * نمی‌کرد.
 */
function phoenix_form_open($action, $extra = '') {
    $url = add_query_arg('page', phoenix_current_page(), admin_url('admin.php'));
    echo '<form method="post" action="' . esc_url($url) . '" ' . $extra . '>';
    echo '<input type="hidden" name="phoenix_action" value="' . esc_attr($action) . '">';
    wp_nonce_field($action);
}

function phoenix_form_close() {
    echo '</form>';
}

/** اسلاگِ صفحه‌ی جاری — از فهرستِ سفید، نه مستقیم از ‎$_GET‎ */
function phoenix_current_page() {
    $known = array(
        PHOENIX_MENU, 'phoenix-rate', 'phoenix-margins',
        'phoenix-discounts', 'phoenix-queue', 'phoenix-log',
    );
    $page = isset($_GET['page']) ? sanitize_key(wp_unslash($_GET['page'])) : PHOENIX_MENU;
    return in_array($page, $known, true) ? $page : PHOENIX_MENU;
}

/* ============================================================
   مسیریابِ کنش‌ها
   ============================================================ */

/**
 * ⚠ روی ‎admin_init‎ اجرا می‌شود، نه داخلِ رندرِ صفحه.
 *
 * دو دلیل. اول اینکه بعد از نوشتن باید ‎redirect‎ کرد تا رفرشِ
 * مرورگر فرم را دوباره نفرستد (الگوی POST-Redirect-GET) و
 * ‎wp_safe_redirect‎ بعد از شروعِ خروجیِ HTML کار نمی‌کند.
 * دوم اینکه هر کنش دقیقاً یک بار اجرا می‌شود، نه هر بار که
 * چیزی صفحه را دوباره رندر کند.
 */
add_action('admin_init', 'phoenix_admin_route');
function phoenix_admin_route() {
    if (empty($_POST['phoenix_action'])) {
        return;
    }
    $action = sanitize_key(wp_unslash($_POST['phoenix_action']));

    $handlers = array(
        'phoenix_save_engine'    => 'phoenix_do_save_engine',
        'phoenix_save_rate'      => 'phoenix_do_save_rate',
        'phoenix_refresh_rate'   => 'phoenix_do_refresh_rate',
        'phoenix_save_margin'    => 'phoenix_do_save_margin',
        'phoenix_save_cat'       => 'phoenix_do_save_cat_margin',
        'phoenix_save_prod'      => 'phoenix_do_save_prod_margin',
        'phoenix_reprice'        => 'phoenix_do_reprice',
        'phoenix_save_discount'  => 'phoenix_do_save_discount',
        'phoenix_del_discount'   => 'phoenix_do_del_discount',
        'phoenix_make_coupon'    => 'phoenix_do_make_coupon',
        'phoenix_queue_act'      => 'phoenix_do_queue_act',
    );

    if (!isset($handlers[$action])) {
        return;
    }

    phoenix_admin_guard($action);
    $notice = call_user_func($handlers[$action]);

    phoenix_notice_set($notice);
    wp_safe_redirect(add_query_arg('page', phoenix_current_page(), admin_url('admin.php')));
    exit;
}

/* ============================================================
   پیام‌ها

   بعد از redirect، ‎$_POST‎ از دست رفته. پیام در ‎transient‎ی
   مخصوصِ همان کاربر می‌ماند تا یک بار نشان داده شود.
   ============================================================ */

function phoenix_notice_set($notice) {
    if (!$notice) {
        return;
    }
    if (is_string($notice)) {
        $notice = array('type' => 'success', 'text' => $notice);
    }
    set_transient('phoenix_notice_' . get_current_user_id(), $notice, 60);
}

add_action('admin_notices', 'phoenix_notice_show');
function phoenix_notice_show() {
    /* ⚠ نبودِ ‎page‎ یعنی «صفحه‌ی فونیکس نیست».
       ‎phoenix_current_page()‎ در نبودش داشبوردِ فونیکس را
       برمی‌گرداند، پس تکیه به آن یعنی پیامِ ما روی صفحه‌ی
       اصلیِ پیشخوانِ وردپرس هم ظاهر می‌شود. */
    $page = isset($_GET['page']) ? sanitize_key(wp_unslash($_GET['page'])) : '';
    if (strpos($page, 'phoenix') !== 0) {
        return;
    }
    $key = 'phoenix_notice_' . get_current_user_id();
    $n   = get_transient($key);
    if (!is_array($n)) {
        return;
    }
    delete_transient($key);

    $class = $n['type'] === 'error' ? 'notice-error' : ($n['type'] === 'warning' ? 'notice-warning' : 'notice-success');
    echo '<div class="notice ' . esc_attr($class) . ' is-dismissible"><p>' . esc_html($n['text']) . '</p></div>';
}

/* ============================================================
   کنش‌ها
   ============================================================ */

function phoenix_do_save_engine() {
    $on = !empty($_POST['engine_on']);
    phoenix_settings_save(array('engine_on' => $on), 'از پنل');

    if ($on) {
        phoenix_reprice_start();
        return 'موتور روشن شد و بازنویسیِ قیمت‌ها شروع شد.';
    }
    return array('type' => 'warning', 'text' => 'موتور خاموش شد. قیمت‌ها همان‌طور که هستند می‌مانند.');
}

function phoenix_do_save_rate() {
    $pick = isset($_POST['pick']) ? sanitize_key(wp_unslash($_POST['pick'])) : 'lowest';
    if (!in_array($pick, array('lowest', 'median', 'average'), true)) {
        $pick = 'lowest';
    }

    /* منابع: هر چه در فرم تیک نخورده، خاموش */
    $flags = array();
    $posted = isset($_POST['src']) && is_array($_POST['src'])
        ? array_map('sanitize_key', array_map('strval', array_keys(wp_unslash($_POST['src']))))
        : array();
    foreach (array_keys(phoenix_rate_sources()) as $slug) {
        $flags[$slug] = in_array($slug, $posted, true);
    }

    /* ⚠ نرخِ دستی بدونِ انقضا اجازه دارد ولی هشدار می‌گیرد.
       ممنوع کردنش یعنی روزی که همه‌ی منابع بخوابند، ادمین
       دستش بسته است. */
    $manual = isset($_POST['manual_rate']) ? (int) $_POST['manual_rate'] : 0;
    $manual = max(0, min(100000000, $manual));

    $until = 0;
    if ($manual > 0 && !empty($_POST['manual_until'])) {
        $until = strtotime(sanitize_text_field(wp_unslash($_POST['manual_until'])));
        $until = $until ? (int) $until : 0;
    }

    phoenix_settings_save(array(
        'pick'         => $pick,
        'sources'      => $flags,
        'min_sources'  => max(1, min(10, (int) ($_POST['min_sources'] ?? 2))),
        'spread_max'   => max(1, min(90, (int) ($_POST['spread_max'] ?? 25))),
        'rate_ttl'     => max(60, min(86400, (int) ($_POST['rate_ttl'] ?? 600))),
        'sane_min'     => max(1000, (int) ($_POST['sane_min'] ?? 10000)),
        'sane_max'     => max(2000, (int) ($_POST['sane_max'] ?? 10000000)),
        'manual_rate'  => $manual,
        'manual_until' => $until,
    ), 'از پنل');

    if ($manual > 0 && $until === 0) {
        return array('type' => 'warning', 'text' => 'ذخیره شد — ولی نرخِ دستی بدونِ تاریخِ انقضاست و تا وقتی خودت برنداری می‌ماند.');
    }
    return 'تنظیماتِ نرخ ذخیره شد.';
}

function phoenix_do_refresh_rate() {
    $r = phoenix_rate_refresh('manual');

    if (!empty($r['failed'])) {
        return array('type' => 'error', 'text' => 'نرخ عوض نشد: ' . $r['why']);
    }
    return 'نرخِ تازه: ' . number_format_i18n((int) $r['rate']) . ' تومان — ' . $r['why'];
}

/** خواندنِ یک نمایه‌ی حاشیه از ‎$_POST‎ */
function phoenix_margin_from_post($prefix = '') {
    $g = function ($k, $d = 0) use ($prefix) {
        $key = $prefix . $k;
        return isset($_POST[$key]) ? wp_unslash($_POST[$key]) : $d;
    };
    return phoenix_margin_sanitize(array(
        'percent'    => (float) $g('percent', 0),
        'fixed'      => (int) $g('fixed', 0),
        'min_profit' => (int) $g('min_profit', 0),
        'round_to'   => (int) $g('round_to', 1000),
        'round_mode' => sanitize_key((string) $g('round_mode', 'up')),
        'charm'      => (int) $g('charm', 0),
    ));
}

function phoenix_do_save_margin() {
    phoenix_settings_save(array(
        'margin'        => phoenix_margin_from_post(),
        'floor_percent' => max(0, min(100, (int) ($_POST['floor_percent'] ?? 5))),
        'cart_lock_min' => max(0, min(1440, (int) ($_POST['cart_lock_min'] ?? 30))),
    ), 'از پنل');

    phoenix_discount_flush();
    return 'حاشیه‌ی پیش‌فرض ذخیره شد. بازنویسیِ قیمت‌ها در صف است.';
}

function phoenix_do_save_cat_margin() {
    $term = (int) ($_POST['term_id'] ?? 0);
    if ($term <= 0) {
        return array('type' => 'error', 'text' => 'دسته انتخاب نشده.');
    }

    $all = (array) phoenix_setting('margin_by_cat', array());
    if (!empty($_POST['remove'])) {
        unset($all[$term]);
        $msg = 'حاشیه‌ی این دسته برداشته شد.';
    } else {
        $all[$term] = phoenix_margin_from_post();
        $msg = 'حاشیه‌ی دسته ذخیره شد.';
    }

    phoenix_settings_save(array('margin_by_cat' => $all), 'از پنل');
    phoenix_discount_flush();
    return $msg;
}

function phoenix_do_save_prod_margin() {
    $pid = (int) ($_POST['product_id'] ?? 0);
    if ($pid <= 0 || !get_post($pid)) {
        return array('type' => 'error', 'text' => 'محصول پیدا نشد.');
    }

    $all = (array) phoenix_setting('margin_by_prod', array());
    if (!empty($_POST['remove'])) {
        unset($all[$pid]);
        $msg = 'حاشیه‌ی این محصول برداشته شد.';
    } else {
        $all[$pid] = phoenix_margin_from_post();
        $msg = 'حاشیه‌ی محصول ذخیره شد.';
    }

    phoenix_settings_save(array('margin_by_prod' => $all), 'از پنل');
    phoenix_apply_price($pid, null, 'تغییرِ حاشیه‌ی محصول');
    return $msg;
}

function phoenix_do_reprice() {
    if (!phoenix_setting('engine_on')) {
        return array('type' => 'warning', 'text' => 'موتور خاموش است؛ چیزی نوشته نمی‌شود. اول روشنش کن.');
    }
    phoenix_reprice_start();
    return 'بازنویسی شروع شد. دسته‌دسته جلو می‌رود و در همین صفحه پیشرفتش دیده می‌شود.';
}

function phoenix_do_save_discount() {
    $scope = isset($_POST['scope']) ? sanitize_key(wp_unslash($_POST['scope'])) : 'all';

    /* ⚠ هدف‌ها از دو ورودیِ متفاوت می‌آیند و فقط یکی‌شان به
       دامنه‌ی انتخاب‌شده می‌خورد.

       چک‌باکس‌ها همیشه در فرم‌اند (چون ادمین ممکن است دامنه را
       عوض کند)، و کادرِ شناسه هم همیشه هست. اگر هر دو خوانده
       شوند، «۲۰٪ روی دسته‌ی گیم» ناخواسته چند محصولِ بی‌ربط را
       هم می‌گیرد — چون شناسه‌ای که از ویرایشِ قبلی در کادر
       مانده، هنوز آن‌جاست. */
    $targets = array();

    if ($scope === 'product') {
        $raw = isset($_POST['product_ids']) ? (string) wp_unslash($_POST['product_ids']) : '';
        foreach (preg_split('/[^0-9]+/', $raw) as $piece) {
            $id = (int) $piece;
            if ($id > 0) {
                $targets[] = $id;
            }
        }
    } elseif (($scope === 'category' || $scope === 'tag')
        && !empty($_POST['targets']) && is_array($_POST['targets'])) {
        foreach (wp_unslash($_POST['targets']) as $t) {
            $targets[] = (int) $t;
        }
    }

    $rule = phoenix_discount_save(array(
        'id'       => isset($_POST['id']) ? sanitize_key(wp_unslash($_POST['id'])) : '',
        'title'    => isset($_POST['title']) ? wp_unslash($_POST['title']) : '',
        'enabled'  => !empty($_POST['enabled']),
        'scope'    => $scope,
        'targets'  => $targets,
        'type'     => isset($_POST['type']) ? sanitize_key(wp_unslash($_POST['type'])) : 'percent',
        'value'    => (float) ($_POST['value'] ?? 0),
        'cap'      => (int) ($_POST['cap'] ?? 0),
        'starts'   => !empty($_POST['starts']) ? (int) strtotime(sanitize_text_field(wp_unslash($_POST['starts']))) : 0,
        'ends'     => !empty($_POST['ends']) ? (int) strtotime(sanitize_text_field(wp_unslash($_POST['ends']))) : 0,
        'priority' => (int) ($_POST['priority'] ?? 10),
        'stack'    => !empty($_POST['stack']),
    ));

    return 'تخفیف «' . $rule['title'] . '» ذخیره شد. بازنویسیِ قیمت‌ها در صف است.';
}

function phoenix_do_del_discount() {
    phoenix_discount_delete(isset($_POST['id']) ? wp_unslash($_POST['id']) : '');
    return 'تخفیف حذف شد.';
}

function phoenix_do_make_coupon() {
    $res = phoenix_make_personal_coupon(
        isset($_POST['code']) ? wp_unslash($_POST['code']) : '',
        isset($_POST['ctype']) ? sanitize_key(wp_unslash($_POST['ctype'])) : 'percent',
        (float) ($_POST['cvalue'] ?? 0),
        isset($_POST['cemail']) ? sanitize_email(wp_unslash($_POST['cemail'])) : '',
        !empty($_POST['cexpires']) ? (int) strtotime(sanitize_text_field(wp_unslash($_POST['cexpires']))) : 0
    );

    if (is_wp_error($res)) {
        return array('type' => 'error', 'text' => $res->get_error_message());
    }
    return 'کدِ اختصاصی ساخته شد.';
}

function phoenix_do_queue_act() {
    $id  = (int) ($_POST['job_id'] ?? 0);
    $act = isset($_POST['act']) ? sanitize_key(wp_unslash($_POST['act'])) : '';

    if (!in_array($act, array('retry', 'done', 'cancel'), true) || $id <= 0) {
        return array('type' => 'error', 'text' => 'کنشِ نامعتبر.');
    }
    return phoenix_queue_admin_act($id, $act);
}

/* ============================================================
   ظاهر
   ============================================================ */

add_action('admin_enqueue_scripts', 'phoenix_admin_assets');
function phoenix_admin_assets($hook) {
    if (strpos((string) $hook, 'phoenix') === false) {
        return;
    }
    wp_enqueue_style(
        'phoenix-admin',
        plugins_url('assets/admin.css', dirname(__DIR__) . '/phoenix-bridge.php'),
        array(),
        PHOENIX_BRIDGE_VERSION
    );
}

/* ============================================================
   بارگذاریِ صفحه‌ها
   ============================================================ */

require_once __DIR__ . '/ui.php';
require_once __DIR__ . '/page-dashboard.php';
require_once __DIR__ . '/page-rate.php';
require_once __DIR__ . '/page-margins.php';
require_once __DIR__ . '/page-discounts.php';
require_once __DIR__ . '/page-queue.php';
require_once __DIR__ . '/page-log.php';
