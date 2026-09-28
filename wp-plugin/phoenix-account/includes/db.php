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

const PHOENIX_ACC_DB_VERSION = '1';
const PHOENIX_ACC_OPTION     = 'phoenix_account_settings';

function phoenix_acc_table_sessions() {
    global $wpdb;
    return $wpdb->prefix . 'phoenix_acc_sessions';
}

function phoenix_acc_install() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();
    $t = phoenix_acc_table_sessions();

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
