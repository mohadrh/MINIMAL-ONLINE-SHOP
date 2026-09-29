<?php
/**
 * جدول‌ها و تنظیماتِ Phoenix Account.
 *
 * ⚠ جدا از تنظیماتِ Bridge، در ‎option‎ خودش. افزونه‌ی جدا یعنی
 * داده‌ی جدا: حذفِ یکی، دیگری را خراب نمی‌کند.
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_ACC_DB_VERSION = '3';
const PHOENIX_ACC_OPTION     = 'phoenix_account_settings';

function phoenix_acc_table_sessions() {
    global $wpdb;
    return $wpdb->prefix . 'phoenix_acc_sessions';
}

function phoenix_acc_table_customers() {
    global $wpdb;
    return $wpdb->prefix . 'phoenix_acc_customers';
}

function phoenix_acc_table_tickets() {
    global $wpdb;
    return $wpdb->prefix . 'phoenix_acc_tickets';
}

function phoenix_acc_table_messages() {
    global $wpdb;
    return $wpdb->prefix . 'phoenix_acc_ticket_msgs';
}

function phoenix_acc_table_chats() {
    global $wpdb;
    return $wpdb->prefix . 'phoenix_acc_chats';
}

function phoenix_acc_table_chat_msgs() {
    global $wpdb;
    return $wpdb->prefix . 'phoenix_acc_chat_msgs';
}

function phoenix_acc_install() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();
    $t = phoenix_acc_table_sessions();

    /* ⚠ مشتری با شماره شناخته می‌شود، نه با کاربرِ وردپرس.
       کاربرِ وردپرس یعنی نقش، ورود به ‎wp-admin‎ و ایمیلِ اجباری — هیچ‌کدام
       لازم نیست. رمز فقط هش (‎phoenix_acc_password_hash‎)؛ آمارِ خرید
       کش است و از سفارش‌ها دوباره ساخته می‌شود. */
    $c = phoenix_acc_table_customers();
    dbDelta("CREATE TABLE {$c} (
        phone varchar(15) NOT NULL,
        name varchar(100) NOT NULL DEFAULT '',
        email varchar(190) NOT NULL DEFAULT '',
        pass_hash varchar(255) NOT NULL DEFAULT '',
        pass_set_at datetime DEFAULT NULL,
        blocked tinyint(1) NOT NULL DEFAULT 0,
        admin_note varchar(500) NOT NULL DEFAULT '',
        created_at datetime NOT NULL,
        last_login datetime DEFAULT NULL,
        orders_count int(10) unsigned NOT NULL DEFAULT 0,
        paid_total bigint(20) unsigned NOT NULL DEFAULT 0,
        last_order_at datetime DEFAULT NULL,
        PRIMARY KEY  (phone),
        KEY last_order_at (last_order_at)
    ) {$charset};");

    $tk = phoenix_acc_table_tickets();
    dbDelta("CREATE TABLE {$tk} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        phone varchar(15) NOT NULL,
        subject varchar(150) NOT NULL,
        order_id bigint(20) unsigned NOT NULL DEFAULT 0,
        status varchar(12) NOT NULL DEFAULT 'open',
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        last_by varchar(10) NOT NULL DEFAULT 'customer',
        unread tinyint(1) NOT NULL DEFAULT 0,
        PRIMARY KEY  (id),
        KEY phone (phone),
        KEY status (status, updated_at)
    ) {$charset};");

    $m = phoenix_acc_table_messages();
    dbDelta("CREATE TABLE {$m} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        ticket_id bigint(20) unsigned NOT NULL,
        author varchar(10) NOT NULL,
        staff varchar(60) NOT NULL DEFAULT '',
        body text NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY ticket_id (ticket_id)
    ) {$charset};");

    /* چتِ آنلاین — هر گفتگو ژتونِ خودش را دارد (فقط هشش این‌جا)؛
       مرورگرِ بازدیدکننده با همان ژتون پیام می‌فرستد و جواب می‌گیرد. */
    $ch = phoenix_acc_table_chats();
    dbDelta("CREATE TABLE {$ch} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        token_hash char(64) NOT NULL,
        phone varchar(15) NOT NULL DEFAULT '',
        agent varchar(40) NOT NULL DEFAULT '',
        status varchar(10) NOT NULL DEFAULT 'open',
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        last_by varchar(10) NOT NULL DEFAULT 'visitor',
        unread_staff tinyint(1) NOT NULL DEFAULT 1,
        page varchar(200) NOT NULL DEFAULT '',
        ua varchar(160) NOT NULL DEFAULT '',
        PRIMARY KEY  (id),
        UNIQUE KEY token_hash (token_hash),
        KEY status (status, updated_at),
        KEY phone (phone)
    ) {$charset};");

    $cm = phoenix_acc_table_chat_msgs();
    dbDelta("CREATE TABLE {$cm} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        chat_id bigint(20) unsigned NOT NULL,
        author varchar(10) NOT NULL,
        staff varchar(60) NOT NULL DEFAULT '',
        body text NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY chat_id (chat_id, id)
    ) {$charset};");

    /* ⚠ ‎token_hash‎ یکتا: دو نشست با یک ژتون ممکن نیست، و جست‌وجو
       با ایندکس است، نه اسکنِ کلِ جدول سرِ هر درخواست. */
    dbDelta("CREATE TABLE {$t} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        phone varchar(15) NOT NULL,
        token_hash char(64) NOT NULL,
        created_at datetime NOT NULL,
        last_seen datetime NOT NULL,
        expires_at datetime NOT NULL,
        ua varchar(160) NOT NULL DEFAULT '',
        revoked tinyint(1) NOT NULL DEFAULT 0,
        PRIMARY KEY  (id),
        UNIQUE KEY token_hash (token_hash),
        KEY phone (phone)
    ) {$charset};");

    update_option('phoenix_acc_db_version', PHOENIX_ACC_DB_VERSION, false);
}

add_action('admin_init', 'phoenix_acc_maybe_upgrade');
function phoenix_acc_maybe_upgrade() {
    if (get_option('phoenix_acc_db_version') !== PHOENIX_ACC_DB_VERSION) {
        phoenix_acc_install();
    }
}

/* ---------- تنظیمات ---------- */

function phoenix_acc_settings() {
    $saved = get_option(PHOENIX_ACC_OPTION);
    return is_array($saved) ? array_merge(phoenix_acc_defaults(), $saved) : phoenix_acc_defaults();
}

function phoenix_acc_setting($key) {
    $s = phoenix_acc_settings();
    return isset($s[$key]) ? $s[$key] : null;
}

/** ذخیره، با ثبت در تاریخچه‌ی Bridge — هیچ تغییری بی‌رد نمی‌ماند */
function phoenix_acc_settings_save(array $data) {
    $before = phoenix_acc_settings();
    update_option(PHOENIX_ACC_OPTION, array_merge($before, $data), false);
    if (function_exists('phoenix_audit')) {
        foreach ($data as $k => $v) {
            if (!array_key_exists($k, $before) || $before[$k] !== $v) {
                phoenix_audit('setting', 'account.' . $k, isset($before[$k]) ? $before[$k] : null, $v, 'از پنل');
            }
        }
    }
}
