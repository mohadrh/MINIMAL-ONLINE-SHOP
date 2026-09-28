<?php
/**
 * هسته‌ی خالصِ Phoenix Account — بدونِ وردپرس تست می‌شود.
 *
 * هر چیزی که «تصمیم» می‌گیرد این‌جاست: اعتبارسنجیِ تنظیمات، ساختنِ
 * درخواستِ سامانه‌ی پیامک، و قضاوت درباره‌ی پاسخش. بقیه‌ی فایل‌ها فقط
 * این‌ها را به وردپرس وصل می‌کنند (tests/account-test.php).
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_ACC_PROVIDERS = array('off', 'dev', 'kavenegar', 'smsir');

/* ============================================================
   تنظیمات
   ============================================================ */

function phoenix_acc_defaults() {
    return array(
        'sms_provider' => 'off',  // off | dev | kavenegar | smsir
        'sms_conn'     => '',     // اسلاگِ یک «اتصال» در Phoenix Bridge — کلید همان‌جاست
        'sms_tpl_otp'  => '',     // نامِ الگو (کاوه‌نگار) یا شناسه‌ی الگو (sms.ir)
        'sms_param'    => 'CODE', // نامِ متغیرِ کد در الگوی sms.ir
        'session_days' => 30,
    );
}

/**
 * @param string[] $conns اسلاگِ اتصال‌های موجود در Bridge
 * @return array{ok:bool, data:array, errors:array<string,string>}
 */
function phoenix_acc_settings_clean(array $in, array $conns = array()) {
    $d   = phoenix_acc_defaults();
    $err = array();

    $provider = isset($in['sms_provider']) ? (string) $in['sms_provider'] : $d['sms_provider'];
    if (!in_array($provider, PHOENIX_ACC_PROVIDERS, true)) {
        $err['sms_provider'] = 'سامانه‌ی ناشناخته.';
        $provider = 'off';
    }

    $conn  = isset($in['sms_conn']) ? (string) $in['sms_conn'] : '';
    $tpl   = trim((string) (isset($in['sms_tpl_otp']) ? $in['sms_tpl_otp'] : ''));
    $param = trim((string) (isset($in['sms_param']) ? $in['sms_param'] : $d['sms_param']));

    if (in_array($provider, array('kavenegar', 'smsir'), true)) {
        if ($conn === '' || !in_array($conn, $conns, true)) {
            $err['sms_conn'] = 'کلیدِ سامانه را از «اتصال‌ها» انتخاب کن — اگر نیست، اول آن‌جا بسازش.';
        }
        if ($provider === 'kavenegar' && !preg_match('/^[A-Za-z0-9_\-]{1,40}$/', $tpl)) {
            $err['sms_tpl_otp'] = 'نامِ الگو در پنلِ کاوه‌نگار — فقط حرفِ لاتین، عدد، ‎_‎ و ‎-‎.';
        }
        if ($provider === 'smsir') {
            if (!preg_match('/^[0-9]{1,9}$/', $tpl)) {
                $err['sms_tpl_otp'] = 'شناسه‌ی عددیِ الگو در پنلِ sms.ir.';
            }
            if (!preg_match('/^[A-Za-z][A-Za-z0-9_]{0,29}$/', $param)) {
                $err['sms_param'] = 'نامِ متغیرِ کد در الگو — مثلاً ‎CODE‎.';
            }
        }
    }

    $days = (int) (isset($in['session_days']) ? $in['session_days'] : $d['session_days']);
    if ($days < 1 || $days > 180) {
        $err['session_days'] = 'بینِ ۱ تا ۱۸۰ روز.';
        $days = max(1, min(180, $days));
    }

    return array(
        'ok'     => !$err,
        'errors' => $err,
        'data'   => array(
            'sms_provider' => $provider,
            'sms_conn'     => in_array($provider, array('kavenegar', 'smsir'), true) ? $conn : '',
            'sms_tpl_otp'  => in_array($provider, array('kavenegar', 'smsir'), true) ? $tpl : '',
            'sms_param'    => $param !== '' ? $param : $d['sms_param'],
            'session_days' => $days,
        ),
    );
}

/* ============================================================
   نشست
   ============================================================ */

/** ژتونِ تصادفیِ ۶۴ حرفی — فقط به مرورگر داده می‌شود، هرگز ذخیره نمی‌شود */
function phoenix_acc_new_token() {
    return bin2hex(random_bytes(32));
}

/**
 * ⚠ در پایگاه داده فقط هش.
 * اگر جدولِ نشست‌ها لو برود، هیچ نشستی از آن قابلِ استفاده نیست.
 */
function phoenix_acc_token_hash($raw) {
    return hash('sha256', (string) $raw);
}

/** ژتونِ سالم؟ — شکل، پیش از هر پرس‌وجو */
function phoenix_acc_token_ok($raw) {
    return is_string($raw) && preg_match('/^[a-f0-9]{64}$/', $raw) === 1;
}

/** شماره برای نمایش در فهرست‌ها: ۰۹۱۲***۴۵۶۷ */
function phoenix_acc_mask_phone($phone) {
    $p = (string) $phone;
    return strlen($p) === 11 ? substr($p, 0, 4) . '***' . substr($p, -4) : '***';
}

/** مرورگر و سیستم‌عامل از ‎User-Agent‎ — برای «نشست‌های فعال» */
function phoenix_acc_ua_label($ua) {
    $ua = (string) $ua;
    $os = preg_match('/Android/i', $ua) ? 'اندروید'
        : (preg_match('/iPhone|iPad|iOS/i', $ua) ? 'آیفون'
        : (preg_match('/Windows/i', $ua) ? 'ویندوز'
        : (preg_match('/Mac OS X|Macintosh/i', $ua) ? 'مک'
        : (preg_match('/Linux/i', $ua) ? 'لینوکس' : 'دستگاهِ ناشناخته'))));
    $br = preg_match('/Edg\//', $ua) ? 'Edge'
        : (preg_match('/Firefox\//', $ua) ? 'Firefox'
        : (preg_match('/Chrome\//', $ua) ? 'Chrome'
        : (preg_match('/Safari\//', $ua) ? 'Safari' : '')));
    return $br ? $os . ' · ' . $br : $os;
}

/* ============================================================
   پیامک — درخواست و پاسخ
   ============================================================ */

/**
 * درخواستِ ارسالِ کد با الگو.
 *
 * ⚠ هر دو سامانه کد را با «الگو» (Verify/Lookup) می‌فرستند، نه متنِ
 * آزاد: پیامکِ خدماتی با خطِ مخصوص، که به فهرستِ سیاهِ تبلیغاتی
 * نمی‌خورد و سریع می‌رسد. الگو یک بار در پنلِ سامانه تأیید می‌شود.
 *
 * @return array{method:string, url:string, headers:array, body:?string}|null
 */
function phoenix_acc_sms_request($provider, $key, array $s, $phone, $code) {
    $phone = (string) $phone;
    $code  = (string) $code;

    if ($provider === 'kavenegar') {
        /* کلید در مسیرِ نشانی است — طراحیِ خودِ کاوه‌نگار */
        return array(
            'method'  => 'GET',
            'url'     => 'https://api.kavenegar.com/v1/' . rawurlencode($key) . '/verify/lookup.json?'
                . http_build_query(array('receptor' => $phone, 'token' => $code, 'template' => $s['sms_tpl_otp'])),
            'headers' => array('Accept' => 'application/json'),
            'body'    => null,
        );
    }
    if ($provider === 'smsir') {
        return array(
            'method'  => 'POST',
            'url'     => 'https://api.sms.ir/v1/send/verify',
            'headers' => array('X-API-KEY' => $key, 'Content-Type' => 'application/json', 'Accept' => 'application/json'),
            'body'    => json_encode(array(
                'mobile'     => $phone,
                'templateId' => (int) $s['sms_tpl_otp'],
                'parameters' => array(array('name' => $s['sms_param'], 'value' => $code)),
            )),
        );
    }
    return null;
}

/**
 * پاسخِ سامانه موفق بود؟
 *
 * @return array{ok:bool, note:string}
 */
function phoenix_acc_sms_result($provider, $http_code, $body) {
    $j = json_decode((string) $body, true);
    if ($provider === 'kavenegar') {
        $st = isset($j['return']['status']) ? (int) $j['return']['status'] : 0;
        $msg = isset($j['return']['message']) ? (string) $j['return']['message'] : '';
        return array('ok' => $http_code === 200 && $st === 200, 'note' => $st ? $st . ' ' . $msg : 'HTTP ' . $http_code);
    }
    if ($provider === 'smsir') {
        $st = isset($j['status']) ? (int) $j['status'] : 0;
        $msg = isset($j['message']) ? (string) $j['message'] : '';
        return array('ok' => $http_code === 200 && $st === 1, 'note' => $st ? $st . ' ' . $msg : 'HTTP ' . $http_code);
    }
    return array('ok' => false, 'note' => 'سامانه‌ی ناشناخته');
}

/** فقط ردیف‌های تازه‌تر از ‎$ttl‎ ثانیه */
function phoenix_acc_log_fresh(array $list, $ttl, $now) {
    return array_values(array_filter($list, function ($r) use ($ttl, $now) {
        return is_array($r) && isset($r['at']) && ($now - (int) $r['at']) <= $ttl;
    }));
}

/** نگه داشتنِ فهرستِ کوتاهِ اخیر: جدیدها اول، کهنه‌ها بیرون */
function phoenix_acc_log_push(array $list, array $row, $max, $ttl, $now) {
    array_unshift($list, $row);
    $out = array();
    foreach ($list as $r) {
        if (is_array($r) && isset($r['at']) && ($now - (int) $r['at']) <= $ttl) {
            $out[] = $r;
        }
        if (count($out) >= $max) {
            break;
        }
    }
    return $out;
}
