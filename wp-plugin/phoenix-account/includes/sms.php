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
    $email    = !empty(phoenix_acc_setting('otp_email'));
    if ($email) {
        phoenix_acc_otp_email_send((string) $phone, (string) $code);
    }
    if ($provider === 'off') {
        /* ⚠ ایمیل تنها راه: برای سایت همیشه «فرستاده شد»، چه این شماره
           ایمیل داشته باشد چه نه — پاسخِ متفاوت می‌گفت حساب دارد یا نه.
           سایت می‌نویسد «اگر ایمیلی ثبت شده باشد». */
        return $email ? true : $sent;
    }
    if ($provider === 'telegram') {
        return phoenix_acc_tg_send_code((string) $phone, (string) $code);
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
 * کدِ ورود به ایمیلِ پرونده‌ی همین شماره — اگر هست (core.php: چرا فقط پرونده).
 *
 * @return bool|null ‎null‎ یعنی ایمیلی در پرونده نیست
 */
function phoenix_acc_otp_email_send($phone, $code) {
    $c = function_exists('phoenix_acc_customer') ? phoenix_acc_customer($phone) : null;
    $to = $c ? trim((string) $c->email) : '';
    if ($to === '' || !is_email($to) || !empty($c->blocked)) {
        return null;
    }
    $m  = phoenix_acc_otp_email_text($code, defined('PHOENIX_OTP_TTL') ? PHOENIX_OTP_TTL : 120);
    $ok = (bool) wp_mail($to, $m['subject'], $m['body']);
    phoenix_acc_sms_log($phone, array('ok' => $ok, 'note' => $ok ? 'ایمیل: فرستاده شد' : 'ایمیل: وردپرس نتوانست بفرستد (تنظیمِ SMTP)'));
    return $ok;
}

/* سایت بداند کد به ایمیل هم رفته — همان پاسخ برای همه‌ی شماره‌ها */
add_filter('phoenix_otp_response_extra', 'phoenix_acc_otp_email_extra_filter', 20, 2);
function phoenix_acc_otp_email_extra_filter($extra, $phone) {
    return phoenix_acc_otp_email_extra((array) $extra, (string) phoenix_acc_setting('sms_provider'), !empty(phoenix_acc_setting('otp_email')));
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
