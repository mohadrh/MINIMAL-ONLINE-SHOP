<?php
/**
 * نشستِ مشتری.
 *
 * ============================================================
 * ⚠ چرا ژتونِ پانزده‌دقیقه‌ایِ Bridge کافی نیست
 *
 * آن ژتون برای ثبتِ سفارش ساخته شده: کد را می‌زنی و همان لحظه
 * می‌خری. پنلِ حساب چیزِ دیگری است — مشتری فردا برمی‌گردد تا ببیند
 * کدش آمد یا نه، و نباید هر بار پیامک بگیرد.
 *
 * پس ژتونِ Bridge یک بار با یک نشستِ بلند عوض می‌شود:
 *
 *   ۱ ژتونِ تصادفی ۳۲ بایت؛ در پایگاه داده فقط هشش
 *   ۲ انقضا (پیش‌فرض ۳۰ روز)، و «خروج از همه‌ی دستگاه‌ها»
 *   ۳ حداکثر ده نشست برای هر شماره — قدیمی‌ترین بیرون می‌رود
 *   ۴ ژتونِ Bridge فقط یک بار قابلِ تبدیل است
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_ACC_MAX_SESSIONS = 10;
const PHOENIX_ACC_HEADER       = 'X-Phoenix-Session';

/**
 * ⚠ هدرِ اختصاصی، نه ‎Authorization‎.
 * بعضی هاست‌ها (آپاچی با CGI) هدرِ ‎Authorization‎ را به PHP نمی‌رسانند و
 * ورود بی‌صدا خراب می‌شود. سایت روی دامنه‌ی دیگری است، پس هدر باید در
 * CORSِ وردپرس مجاز شود.
 */
add_filter('rest_allowed_cors_headers', 'phoenix_acc_cors_headers');
function phoenix_acc_cors_headers($headers) {
    $headers[] = PHOENIX_ACC_HEADER;
    return $headers;
}

/**
 * ثبتِ سفارش در Bridge با نشستِ حساب، بی‌کدِ پیامکیِ تازه.
 * خالی یعنی «نشستِ معتبری نیست» و Bridge همان ژتونِ کد را می‌خواهد.
 */
add_filter('phoenix_verified_phone', 'phoenix_acc_verified_phone', 10, 2);
function phoenix_acc_verified_phone($phone, $request) {
    if ($phone !== '' || !($request instanceof WP_REST_Request)) {
        return $phone;
    }
    $row = phoenix_acc_session_row((string) $request->get_header(PHOENIX_ACC_HEADER));
    return $row ? (string) $row->phone : '';
}

function phoenix_acc_session_create($phone, $ua) {
    global $wpdb;
    $t    = phoenix_acc_table_sessions();
    $now  = time();
    $days = (int) phoenix_acc_setting('session_days');
    $raw  = phoenix_acc_new_token();

    $wpdb->insert($t, array(
        'phone'      => $phone,
        'token_hash' => phoenix_acc_token_hash($raw),
        'created_at' => gmdate('Y-m-d H:i:s', $now),
        'last_seen'  => gmdate('Y-m-d H:i:s', $now),
        'expires_at' => gmdate('Y-m-d H:i:s', $now + max(1, $days) * DAY_IN_SECONDS),
        'ua'         => substr(sanitize_text_field((string) $ua), 0, 160),
        'revoked'    => 0,
    ), array('%s', '%s', '%s', '%s', '%s', '%s', '%d'));

    /* سقفِ ده نشست — قدیمی‌ترین‌های فعال بیرون */
    $ids = $wpdb->get_col($wpdb->prepare(
        "SELECT id FROM {$t} WHERE phone = %s AND revoked = 0 AND expires_at > %s ORDER BY last_seen DESC",
        $phone, gmdate('Y-m-d H:i:s', $now)
    ));
    foreach (array_slice(array_map('intval', (array) $ids), PHOENIX_ACC_MAX_SESSIONS) as $old) {
        $wpdb->update($t, array('revoked' => 1), array('id' => $old), array('%d'), array('%d'));
    }

    return array('token' => $raw, 'expires' => $now + max(1, $days) * DAY_IN_SECONDS);
}

/**
 * نشستِ معتبر؟
 *
 * @return object|null ردیفِ نشست
 */
function phoenix_acc_session_row($raw) {
    if (!phoenix_acc_token_ok($raw)) {
        return null;
    }
    global $wpdb;
    $t   = phoenix_acc_table_sessions();
    $now = gmdate('Y-m-d H:i:s');
    $row = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$t} WHERE token_hash = %s AND revoked = 0 AND expires_at > %s",
        phoenix_acc_token_hash($raw), $now
    ));
    if (!$row) {
        return null;
    }
    /* «آخرین بازدید» هر ده دقیقه، نه سرِ هر درخواست — یک نوشتن برای
       هر کلیکِ مشتری، بی‌دلیل پایگاه داده را شلوغ می‌کند. */
    if (strtotime($row->last_seen . ' UTC') < time() - 600) {
        $wpdb->update($t, array('last_seen' => $now), array('id' => (int) $row->id), array('%s'), array('%d'));
    }
    return $row;
}

function phoenix_acc_sessions_of($phone) {
    global $wpdb;
    $t = phoenix_acc_table_sessions();
    return (array) $wpdb->get_results($wpdb->prepare(
        "SELECT id, created_at, last_seen, expires_at, ua FROM {$t}
          WHERE phone = %s AND revoked = 0 AND expires_at > %s ORDER BY last_seen DESC LIMIT 20",
        $phone, gmdate('Y-m-d H:i:s')
    ));
}

/** ⚠ فقط نشستِ همین شماره — شناسه از مرورگر آمده */
function phoenix_acc_session_revoke($phone, $id) {
    global $wpdb;
    return (bool) $wpdb->update(phoenix_acc_table_sessions(), array('revoked' => 1),
        array('id' => (int) $id, 'phone' => $phone), array('%d'), array('%d', '%s'));
}

function phoenix_acc_session_revoke_others($phone, $keep_id) {
    global $wpdb;
    $t = phoenix_acc_table_sessions();
    return (int) $wpdb->query($wpdb->prepare(
        "UPDATE {$t} SET revoked = 1 WHERE phone = %s AND id <> %d AND revoked = 0", $phone, (int) $keep_id
    ));
}

/** هرسِ روزانه: نشستِ منقضی یا بسته‌شده‌ی قدیمی‌تر از یک ماه */
add_action('phoenix_daily', 'phoenix_acc_sessions_prune');
function phoenix_acc_sessions_prune() {
    global $wpdb;
    $t = phoenix_acc_table_sessions();
    $wpdb->query($wpdb->prepare(
        "DELETE FROM {$t} WHERE (revoked = 1 OR expires_at < %s) AND last_seen < %s",
        gmdate('Y-m-d H:i:s'), gmdate('Y-m-d H:i:s', time() - 30 * DAY_IN_SECONDS)
    ));
}
