<?php
/**
 * جدول‌ها و تنظیماتِ موتورِ قیمت.
 *
 * ============================================================
 * ⚠ چرا جدولِ اختصاصی و نه همه‌چیز در option
 *
 * تنظیمات (حاشیه‌ها، منابع، قاعده‌های تخفیف) در option می‌مانند:
 * تعدادشان کم است، با هم خوانده می‌شوند، و وردپرس خودش کششان
 * می‌کند.
 *
 * ولی سه چیز در option نمی‌گنجد، چون رشد می‌کنند و باید
 * *پرس‌وجو* شوند:
 *
 *   ۱ لاگِ نرخ — هر ساعت چند رکورد، برای نمودارِ هفت‌روزه
 *   ۲ دفترِ رویداد — «چه کسی، کِی، چه چیزی را از چند به چند»
 *   ۳ صفِ تحویل — با وضعیت، تلاشِ دوباره، و کلیدِ یکتا
 *
 * یک option که هزاران ردیف در خودش دارد، هر بار کاملش از
 * پایگاه داده خوانده و unserialize می‌شود؛ روی هر بارگذاریِ
 * صفحه. این همان چیزی است که سایت را کند می‌کند.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

/** نسخه‌ی اسکیما — بالا که برود، dbDelta دوباره می‌دود */
const PHOENIX_DB_VERSION = '1';
const PHOENIX_DB_VERSION_OPTION = 'phoenix_db_version';

/* ------------------------------------------------------------
   نامِ جدول‌ها

   ⚠ همیشه از این توابع، هیچ‌وقت رشته‌ی دستی.

   نامِ جدول را نمی‌شود با ‎$wpdb->prepare‎ پارامتری کرد (prepare
   فقط مقدار را نقل‌قول می‌کند، نه شناسه را). پس تنها راهِ امن
   این است که نامِ جدول *هیچ‌وقت* از ورودیِ کاربر نیاید. این سه
   تابع تنها منبعِ نام‌اند و هیچ‌کدام آرگومان نمی‌گیرند.
   ------------------------------------------------------------ */

function phoenix_table_rate_log() {
    global $wpdb;
    return $wpdb->prefix . 'phoenix_rate_log';
}

function phoenix_table_audit() {
    global $wpdb;
    return $wpdb->prefix . 'phoenix_audit';
}

function phoenix_table_queue() {
    global $wpdb;
    return $wpdb->prefix . 'phoenix_queue';
}

/* ------------------------------------------------------------
   ساختِ جدول‌ها
   ------------------------------------------------------------ */

/**
 * ⚠ روی ‎admin_init‎ هم چک می‌شود، نه فقط روی فعال‌سازی.
 *
 * قلابِ فعال‌سازی وقتی افزونه با FTP به‌روز شود اجرا نمی‌شود —
 * فایل عوض شده ولی هیچ‌کس ‎activate‎ را صدا نزده. آن‌وقت کدِ
 * نسخه‌ی تازه دنبالِ ستونی می‌گردد که وجود ندارد و صفحه سفید
 * می‌شود. مقایسه‌ی نسخه روی هر ورود به پیشخوان، ارزان است و
 * جلوی همان را می‌گیرد.
 */
add_action('admin_init', 'phoenix_db_maybe_upgrade');
function phoenix_db_maybe_upgrade() {
    if (get_option(PHOENIX_DB_VERSION_OPTION) === PHOENIX_DB_VERSION) {
        return;
    }
    phoenix_db_install();
}

function phoenix_db_install() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $charset = $wpdb->get_charset_collate();
    $rate    = phoenix_table_rate_log();
    $audit   = phoenix_table_audit();
    $queue   = phoenix_table_queue();

    /* ⚠ dbDelta سخت‌گیر است: دو فاصله بعد از PRIMARY KEY، هر
       کلید در خطِ خودش، و نوعِ ستون‌ها دقیقاً همان‌طور که
       MySQL برمی‌گرداند — وگرنه هر بار فکر می‌کند ستون عوض
       شده و ALTER می‌زند. */

    dbDelta("CREATE TABLE {$rate} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        run_at datetime NOT NULL,
        source varchar(40) NOT NULL,
        rate int(11) unsigned DEFAULT NULL,
        ms smallint(5) unsigned DEFAULT NULL,
        status varchar(20) NOT NULL DEFAULT 'ok',
        chosen tinyint(1) NOT NULL DEFAULT 0,
        note varchar(190) DEFAULT NULL,
        PRIMARY KEY  (id),
        KEY run_at (run_at),
        KEY source_run (source,run_at)
    ) {$charset};");

    dbDelta("CREATE TABLE {$audit} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        at datetime NOT NULL,
        kind varchar(30) NOT NULL,
        actor varchar(80) NOT NULL DEFAULT 'system',
        subject varchar(190) NOT NULL DEFAULT '',
        before_val text,
        after_val text,
        note varchar(255) DEFAULT NULL,
        PRIMARY KEY  (id),
        KEY at (at),
        KEY kind_at (kind,at)
    ) {$charset};");

    dbDelta("CREATE TABLE {$queue} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        order_id bigint(20) unsigned NOT NULL,
        item_id bigint(20) unsigned NOT NULL DEFAULT 0,
        product_id bigint(20) unsigned NOT NULL,
        idem_key varchar(64) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'pending',
        tries smallint(5) unsigned NOT NULL DEFAULT 0,
        payload longtext,
        result longtext,
        PRIMARY KEY  (id),
        UNIQUE KEY idem_key (idem_key),
        KEY status_created (status,created_at),
        KEY order_id (order_id)
    ) {$charset};");

    update_option(PHOENIX_DB_VERSION_OPTION, PHOENIX_DB_VERSION, false);
}

/* ------------------------------------------------------------
   تنظیمات

   یک option برای همه‌ی تنظیماتِ موتور. ‎autoload‎ روشن است چون
   روی هر محاسبه‌ی قیمت لازم می‌شود و حجمش چند کیلوبایت است.
   ------------------------------------------------------------ */

const PHOENIX_SETTINGS_OPTION = 'phoenix_pricing_settings';

/**
 * پیش‌فرض‌ها — و هر کدام عمداً محافظه‌کارانه است.
 *
 * ⚠ افزونه‌ای که تازه فعال شده نباید قیمتِ هیچ محصولی را عوض
 * کند. ‎engine_on‎ خاموش است تا ادمین خودش، بعد از دیدنِ
 * پیش‌نمایش، روشنش کند. همین قاعده برای ‎auto_fulfil‎ هم هست و
 * آن‌جا دلیلش پول است.
 */
function phoenix_settings_defaults() {
    return array(
        /* ---------- موتور ---------- */
        'engine_on'      => false,  // نوشتنِ قیمت روی محصولات
        'auto_fulfil'    => false,  // خریدِ خودکار (بخشِ ۴)

        /* ---------- نرخ ---------- */
        'sources'        => array(), // [slug => bool] خالی یعنی همه روشن
        'pick'           => 'lowest', // lowest | median | average
        'min_sources'    => 2,
        'rate_ttl'       => 600,      // ثانیه
        'sane_min'       => 10000,    // تومان — کفِ مطلق
        'sane_max'       => 10000000, // تومان — سقفِ مطلق
        'spread_max'     => 25,       // ٪ فاصله‌ی مجاز از میانه
        'manual_rate'    => 0,        // >۰ یعنی همه‌ی منابع نادیده
        'manual_until'   => 0,        // timestamp انقضای نرخِ دستی

        /* ---------- حاشیه‌ی پیش‌فرض ---------- */
        'margin'         => phoenix_margin_defaults(),
        'margin_by_cat'  => array(),  // [term_id => margin]
        'margin_by_prod' => array(),  // [product_id => margin]

        /* ---------- تخفیف ---------- */
        'discounts'      => array(),
        'floor_percent'  => 5,  // قیمتِ نهایی هیچ‌وقت زیرِ قیمتِ تمام‌شده + این ٪

        /* ---------- سبد ---------- */
        'cart_lock_min'  => 30, // دقیقه — قیمتِ داخلِ سبد چقدر قفل بماند

        /* ---------- سقف‌های تحویلِ خودکار ---------- */
        'fulfil_daily_cap'   => 0,  // تومان، ۰ یعنی بی‌سقف (ولی موتور خاموش است)
        'fulfil_fail_stop'   => 3,  // این تعداد شکستِ پشت‌سرهم → توقفِ خودکار
    );
}

/** پیش‌فرضِ یک «نمایه‌ی حاشیه» */
function phoenix_margin_defaults() {
    return array(
        'percent'    => 18.0,
        'fixed'      => 0,      // تومان
        'min_profit' => 0,      // تومان — کفِ سودِ هر فروش
        'round_to'   => 1000,   // تومان
        'round_mode' => 'up',   // up | nearest | down
        'charm'      => 0,      // مثلاً ۹۰۰۰ → …۹۰۰۰ تومان
    );
}

/**
 * ⚠ کش در متغیرِ سراسری است نه ‎static‎، و این عمدی است.
 *
 * با ‎static‎ هیچ تابعِ دیگری نمی‌تواند باطلش کند؛ یعنی بعد از
 * ذخیره در پنل، بقیه‌ی همان درخواست هنوز مقدارِ قدیمی را
 * می‌بیند و صفحه‌ی بعد از ذخیره، تنظیماتِ پیش از ذخیره را
 * نشان می‌دهد.
 */
function phoenix_settings() {
    if (isset($GLOBALS['phoenix_settings_cache']) && is_array($GLOBALS['phoenix_settings_cache'])) {
        return $GLOBALS['phoenix_settings_cache'];
    }
    $saved = get_option(PHOENIX_SETTINGS_OPTION);
    $merged = is_array($saved)
        ? array_merge(phoenix_settings_defaults(), $saved)
        : phoenix_settings_defaults();

    $GLOBALS['phoenix_settings_cache'] = $merged;
    return $merged;
}

function phoenix_setting($key, $fallback = null) {
    $s = phoenix_settings();
    return array_key_exists($key, $s) ? $s[$key] : $fallback;
}

/**
 * ⚠ ذخیره همیشه از همین‌جا، و همیشه با ثبت در دفترِ رویداد.
 *
 * خواسته‌ی کارفرما این بود که «نمایشِ وضعیت کامل دستی باشد» —
 * یعنی هیچ تغییری نباید بی‌رد باقی بماند. اگر جایی
 * ‎update_option‎ مستقیم صدا زده شود، آن تغییر در تاریخچه
 * نمی‌آید و پنل دروغ می‌گوید.
 */
function phoenix_settings_save(array $patch, $note = '') {
    $before = phoenix_settings();
    $after  = array_merge($before, $patch);

    update_option(PHOENIX_SETTINGS_OPTION, $after, true);

    /* کش را همین‌جا باطل کن، نه ته تابع — وگرنه هر کدی که
       بینِ این دو خط اضافه شود مقدارِ قدیمی را می‌بیند. */
    phoenix_settings_reset_cache();

    foreach ($patch as $key => $value) {
        $old = isset($before[$key]) ? $before[$key] : null;
        if ($old === $value) {
            continue;
        }
        phoenix_audit('setting', $key, $old, $value, $note);
    }

    return $after;
}

function phoenix_settings_reset_cache() {
    unset($GLOBALS['phoenix_settings_cache']);
}

/* ------------------------------------------------------------
   دفترِ رویداد
   ------------------------------------------------------------ */

/**
 * یک سطر در تاریخچه.
 *
 * @param string $kind    setting | rate | price | discount | queue
 * @param string $subject کلید یا شناسه‌ی چیزی که عوض شد
 */
function phoenix_audit($kind, $subject, $before, $after, $note = '') {
    global $wpdb;

    $user  = wp_get_current_user();
    $actor = ($user && $user->ID) ? $user->user_login : 'system';

    $wpdb->insert(
        phoenix_table_audit(),
        array(
            'at'         => current_time('mysql', true),
            'kind'       => substr((string) $kind, 0, 30),
            'actor'      => substr((string) $actor, 0, 80),
            'subject'    => substr((string) $subject, 0, 190),
            'before_val' => phoenix_audit_scalar($before),
            'after_val'  => phoenix_audit_scalar($after),
            'note'       => $note === '' ? null : substr((string) $note, 0, 255),
        ),
        array('%s', '%s', '%s', '%s', '%s', '%s', '%s')
    );
}

/** آرایه‌ها به JSON، بقیه به رشته — تا ستونِ text همیشه خواندنی بماند */
function phoenix_audit_scalar($v) {
    if (is_array($v) || is_object($v)) {
        return wp_json_encode($v, JSON_UNESCAPED_UNICODE);
    }
    if (is_bool($v)) {
        return $v ? 'true' : 'false';
    }
    return $v === null ? null : (string) $v;
}

/**
 * خواندنِ تاریخچه.
 *
 * ⚠ ‎$kind‎ از فهرستِ سفید می‌آید نه مستقیم از ورودی — با اینکه
 * prepare استفاده می‌شود، محدود کردنِ دامنه یعنی حتی اگر روزی
 * این تابع جای دیگری بدونِ prepare صدا زده شود، باز چیزی به
 * پرس‌وجو تزریق نمی‌شود.
 */
function phoenix_audit_read($kind = '', $limit = 50) {
    global $wpdb;

    $limit = max(1, min(500, (int) $limit));
    $table = phoenix_table_audit();
    $kinds = array('setting', 'rate', 'price', 'discount', 'queue');

    if ($kind !== '' && in_array($kind, $kinds, true)) {
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table} WHERE kind = %s ORDER BY id DESC LIMIT %d",
            $kind,
            $limit
        ));
    }

    return $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$table} ORDER BY id DESC LIMIT %d",
        $limit
    ));
}

/**
 * هرس کردنِ تاریخچه.
 *
 * ⚠ بدونِ این، جدولِ نرخ در سال حدودِ نودهزار ردیف می‌شود
 * (پنج منبع × بیست‌وچهار ساعت × ۳۶۵). خودش فاجعه نیست، ولی
 * نمودارِ پنل هر بار رویش می‌دود. نودروز کافی است.
 */
add_action('phoenix_daily', 'phoenix_db_prune');
function phoenix_db_prune() {
    global $wpdb;

    $rate  = phoenix_table_rate_log();
    $audit = phoenix_table_audit();
    $queue = phoenix_table_queue();

    $wpdb->query($wpdb->prepare(
        "DELETE FROM {$rate} WHERE run_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL %d DAY)",
        90
    ));
    $wpdb->query($wpdb->prepare(
        "DELETE FROM {$audit} WHERE at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL %d DAY)",
        365
    ));
    /* کارهای تمام‌شده‌ی قدیمی — ناموفق‌ها می‌مانند تا دیده شوند */
    $wpdb->query($wpdb->prepare(
        "DELETE FROM {$queue} WHERE status = 'done' AND updated_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL %d DAY)",
        180
    ));
}
