<?php
/**
 * پیامک — کدِ ورود.
 *
 * ============================================================
 * ⚠ حالتِ آزمایشی
 *
 * سامانه‌ی پیامک هنوز خریده نشده، ولی کارفرما می‌خواهد پنلِ مشتری را
 * از همین حالا امتحان کند. در حالتِ آزمایشی کد به هیچ‌جا فرستاده
 * نمی‌شود؛ فقط در پنلِ مدیر (صفحه‌ی «پیامک و ورود») سی دقیقه دیده
 * می‌شود.
 *
 * امن است چون درخواست‌کننده کد را نمی‌بیند — فقط مدیر. ولی روی سایتِ
 * واقعی یعنی «هیچ مشتری‌ای نمی‌تواند وارد شود»، پس تا روشن است یک
 * هشدارِ قرمز روی داشبورد می‌ماند.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_ACC_DEVLOG = 'phoenix_acc_sms_devlog';
const PHOENIX_ACC_SMSLOG = 'phoenix_acc_sms_log';

/**
 * ‎phoenix_send_otp‎ از Bridge: ‎null‎ یعنی «من مسئول نیستم».
 */
add_filter('phoenix_send_otp', 'phoenix_acc_send_otp', 10, 3);
function phoenix_acc_send_otp($sent, $phone, $code) {
    $provider = (string) phoenix_acc_setting('sms_provider');
    if ($provider === 'off') {
        return $sent; // رفتارِ خودِ Bridge
    }
    if ($provider === 'dev') {
        $list = get_option(PHOENIX_ACC_DEVLOG, array());
        update_option(PHOENIX_ACC_DEVLOG, phoenix_acc_log_push(is_array($list) ? $list : array(),
            array('at' => time(), 'phone' => (string) $phone, 'code' => (string) $code), 20, 30 * MINUTE_IN_SECONDS, time()), false);
        return true;
    }
    $r = phoenix_acc_sms_send($phone, $code);
    return $r['ok'];
}

/**
 * ارسالِ واقعی با سامانه‌ی تنظیم‌شده.
 *
 * @return array{ok:bool, note:string}
 */
function phoenix_acc_sms_send($phone, $code) {
    $s    = phoenix_acc_settings();
    $conn = function_exists('phoenix_conn_runtime') ? phoenix_conn_runtime($s['sms_conn']) : null;
    if (!$conn) {
        $res = array('ok' => false, 'note' => 'کلیدِ سامانه باز نمی‌شود یا اتصال حذف شده.');
        phoenix_acc_sms_log($phone, $res);
        return $res;
    }

    $req = phoenix_acc_sms_request($s['sms_provider'], $conn['key'], $s, $phone, $code);
    if (!$req) {
        return array('ok' => false, 'note' => 'سامانه تنظیم نشده.');
    }

    /* نشانیِ سامانه ثابت و از خودِ افزونه است، نه از ورودی — ولی
       ‎safe‎ همچنان: اگر روزی کسی نشانی را فیلتر کرد، داخلی نرود. */
    $http = wp_safe_remote_request($req['url'], array(
        'method'  => $req['method'],
        'headers' => $req['headers'],
        'body'    => $req['body'],
        'timeout' => 8,
    ));
    if (is_wp_error($http)) {
        $res = array('ok' => false, 'note' => $http->get_error_message());
    } else {
        $res = phoenix_acc_sms_result($s['sms_provider'], (int) wp_remote_retrieve_response_code($http), wp_remote_retrieve_body($http));
    }
    phoenix_acc_sms_log($phone, $res);
    return $res;
}

/** آخرین ارسال‌ها — برای عیب‌یابی در پنل، بدونِ خودِ کد */
function phoenix_acc_sms_log($phone, array $res) {
    $list = get_option(PHOENIX_ACC_SMSLOG, array());
    update_option(PHOENIX_ACC_SMSLOG, phoenix_acc_log_push(is_array($list) ? $list : array(), array(
        'at' => time(), 'phone' => phoenix_acc_mask_phone($phone),
        'ok' => (bool) $res['ok'], 'note' => substr((string) $res['note'], 0, 160),
    ), 20, 7 * DAY_IN_SECONDS, time()), false);
}
