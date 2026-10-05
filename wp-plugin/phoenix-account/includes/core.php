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

/* ⚠ تلگرام از ۰٫۹٫۰ برای کدِ ورود نیست — فقط اعلان‌های مدیر (telegram.php) */
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
        'otp_email'    => false,  // کد به ایمیلِ ثبت‌شده‌ی مشتری هم برود
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
            'otp_email'    => !empty($in['otp_email']),
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

/* ============================================================
   رمزِ عبورِ مشتری
   ============================================================ */

/**
 * رایج‌ترین رمزها — همان‌هایی که ربات‌ها اول امتحان می‌کنند.
 * فهرستِ کامل نیست و لازم هم نیست: سقفِ تلاش بقیه را می‌بندد.
 */
const PHOENIX_ACC_COMMON_PASSWORDS = array(
    '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234',
    '11223344', '12344321', '123123123', '88888888', '99999999', '66666666', '55555555',
    'password', 'password1', 'password123', 'qwertyui', 'qwerty123', 'qwertyuiop', 'asdfghjk',
    'asdf1234', 'abcd1234', 'abc12345', '1q2w3e4r', '1qaz2wsx', 'zxcvbnm1', 'iloveyou',
    'admin123', 'welcome1', 'p@ssw0rd', 'passw0rd', 'football', 'baseball', 'princess',
);

/** ارقامِ فارسی و عربی → لاتین. رمزی که روی گوشی با کیبوردِ فارسی
    زده شده، روی لپ‌تاپ هم باید بخورد. */
function phoenix_acc_password_normalize($p) {
    return str_replace(
        array('۰','۱','۲','۳','۴','۵','۶','۷','۸','۹','٠','١','٢','٣','٤','٥','٦','٧','٨','٩'),
        array('0','1','2','3','4','5','6','7','8','9','0','1','2','3','4','5','6','7','8','9'),
        (string) $p
    );
}

/** راهنمای رمز — همین متن زیرِ هر فیلدِ رمز در سایت، و همین قاعده در ‎password_problem‎ */
const PHOENIX_ACC_PASSWORD_RULE = 'رمز عبور باید دست‌کم ۸ کاراکتر و ترکیبی از حروف انگلیسی و اعداد باشد. استفاده از نمادهایی مانند ! @ # نیز توصیه می‌شود.';

/**
 * رمزِ تازه قبول است؟
 *
 * قاعده: ۸ تا ۶۴ کاراکتر، دست‌کم یک حرفِ انگلیسی و یک عدد؛ رایج
 * نباشد و شماره‌ی موبایلِ خودِ مشتری نباشد.
 *
 * ⚠ حرفِ انگلیسی لازم است، نه فارسی: رمزِ فارسی روی کیبوردی که
 * زبانش عوض نشده غلط تایپ می‌شود و مشتری فکر می‌کند رمزش خراب است.
 *
 * @return string خالی یعنی قبول؛ وگرنه پیامِ فارسی برای مشتری
 */
function phoenix_acc_password_problem($pass, $phone) {
    if (!is_string($pass) || $pass === '') {
        return 'لطفاً رمز عبور خود را وارد کنید.';
    }
    $p = phoenix_acc_password_normalize($pass);
    $n = function_exists('mb_strlen') ? mb_strlen($p, 'UTF-8') : strlen($p);
    if ($n < 8) {
        return 'رمز عبور باید دست‌کم ۸ کاراکتر باشد.';
    }
    if ($n > 64) {
        return 'رمز عبور حداکثر می‌تواند ۶۴ کاراکتر باشد.';
    }
    if (preg_match('/[\x00-\x1F\x7F]/', $p)) {
        return 'رمز عبور کاراکترِ نامعتبر دارد.';
    }
    if (trim($p) !== $p) {
        return 'لطفاً فاصله‌ی ابتدا یا انتهای رمز عبور را حذف کنید.';
    }
    if (!preg_match('/[A-Za-z]/', $p) || !preg_match('/[0-9]/', $p)) {
        return 'رمز عبور باید ترکیبی از حروف انگلیسی و اعداد باشد.';
    }
    if (preg_match('/^(.)\1+$/u', $p)) {
        return 'رمز عبور نمی‌تواند فقط یک کاراکترِ تکراری باشد.';
    }
    $lower = strtolower($p);
    if (in_array($lower, PHOENIX_ACC_COMMON_PASSWORDS, true)) {
        return 'این رمز عبور بسیار رایج است؛ لطفاً رمز دیگری انتخاب کنید.';
    }
    $digits = preg_replace('/[^0-9]/', '', (string) $phone);
    if (strlen($digits) >= 10 && strpos(preg_replace('/[^0-9]/', '', $p), substr($digits, -9)) !== false) {
        return 'لطفاً شماره‌ی موبایل خود را در رمز عبور به کار نبرید.';
    }
    return '';
}

/**
 * ⚠ پیش‌هشِ SHA-256 پیش از bcrypt.
 * bcrypt فقط ۷۲ بایتِ اول را می‌بیند و رمزِ فارسی هر نویسه‌اش دو
 * بایت است؛ بدونِ این، دو رمزِ بلندِ متفاوت با شروعِ یکسان یکی
 * می‌شدند. ‎base64‎ تا بایتِ صفر هم به bcrypt نرسد. نمک ندارد، پس
 * عوض شدنِ نمکِ وردپرس رمزِ کسی را خراب نمی‌کند.
 */
function phoenix_acc_password_prehash($pass) {
    return base64_encode(hash('sha256', phoenix_acc_password_normalize($pass), true));
}

function phoenix_acc_password_hash($pass) {
    return password_hash(phoenix_acc_password_prehash($pass), PASSWORD_DEFAULT);
}

function phoenix_acc_password_check($pass, $hash) {
    return is_string($pass) && is_string($hash) && $hash !== ''
        && password_verify(phoenix_acc_password_prehash($pass), $hash);
}

/**
 * چند ثانیه قفل بعد از ‎$fails‎ تلاشِ اشتباهِ پشتِ هم.
 * پنج تا آزاد (غلطِ تایپی)، بعد پانزده دقیقه، از ده به بعد یک ساعت.
 */
function phoenix_acc_lock_seconds($fails) {
    $fails = (int) $fails;
    if ($fails < 5) {
        return 0;
    }
    return $fails < 10 ? 15 * 60 : 60 * 60;
}

/* ============================================================
   سفارش از چشمِ مشتری
   ============================================================ */

const PHOENIX_ACC_ORDER_WORDS = array(
    'awaiting_payment' => 'در انتظارِ پرداخت',
    'checking'         => 'در انتظارِ تأییدِ پرداخت',
    'fulfilling'       => 'در حالِ آماده‌سازی',
    'needs_input'      => 'نیازمندِ اصلاح',
    'delivered'        => 'تحویل شد',
    'failed'           => 'لغو شد',
    'refunded'         => 'بازگشتِ وجه',
);

/**
 * وضعیتِ سفارش برای مشتری — ساده‌تر از ووکامرس و صف.
 *
 * @param string[] $jobs وضعیتِ کارهای صفِ همین سفارش
 */
function phoenix_acc_order_state($wc_status, array $jobs) {
    switch ((string) $wc_status) {
        case 'pending':
            return 'awaiting_payment';
        case 'on-hold':
            return 'checking';
        case 'completed':
            return 'delivered';
        case 'cancelled':
        case 'failed':
            return 'failed';
        case 'refunded':
            return 'refunded';
    }
    return in_array('needs_input', $jobs, true) ? 'needs_input' : 'fulfilling';
}

/**
 * نمای سفارش (‎phoenix_order_view‎ی Bridge) → آنچه مشتری می‌بیند.
 *
 * ⚠ یادداشتِ صف داخلی است («تأمین‌کننده جواب نداد»، …) و به مشتری
 * نمی‌رسد؛ فقط پیامی که مدیر برای «اصلاح» نوشته.
 */
function phoenix_acc_order_for_customer(array $v) {
    $jobs  = array();
    $items = array();
    foreach ((array) ($v['items'] ?? array()) as $it) {
        $job = isset($it['job']) && is_array($it['job']) ? $it['job'] : null;
        if ($job) {
            $jobs[] = (string) $job['status'];
        }
        $delivered = !empty($it['deliveries']) || !empty($it['stock_codes'])
            || ($job && $job['status'] === 'done')
            || (!$job && ($v['status'] ?? '') === 'completed');
        $state = $job && $job['status'] === 'needs_input' ? 'needs_input'
            : ($job && $job['status'] === 'cancelled' ? 'cancelled'
            : ($delivered ? 'delivered' : 'waiting'));
        $items[] = array(
            'item_id'     => (int) $it['item_id'],
            'product_id'  => (int) ($it['product_id'] ?? 0),
            'name'        => (string) $it['name'],
            'qty'         => (int) $it['qty'],
            'total'       => (int) $it['total'],
            'inputs'      => (array) ($it['inputs'] ?? array()),
            'required'    => (array) ($it['required'] ?? array()),
            'deliveries'  => (array) ($it['deliveries'] ?? array()),
            'stock_codes' => (array) ($it['stock_codes'] ?? array()),
            'state'       => $state,
            'message'     => $state === 'needs_input' ? (string) $job['note'] : '',
        );
    }
    $state = phoenix_acc_order_state($v['status'] ?? '', $jobs);
    return array(
        'id'       => (int) $v['id'],
        'number'   => (string) $v['number'],
        'state'    => $state,
        'label'    => PHOENIX_ACC_ORDER_WORDS[$state],
        'created'  => $v['created'] ?? null,
        'paid'     => $v['paid'] ?? null,
        'total'    => (int) $v['total'],
        'payment'  => array(
            'method'         => (string) ($v['payment']['method'] ?? ''),
            'transaction_id' => (string) ($v['payment']['transaction_id'] ?? ''),
            'is_paid'        => !empty($v['payment']['is_paid']),
        ),
        'note'     => (string) ($v['note'] ?? ''),
        'items'    => $items,
    );
}

/**
 * اشتراکِ یک قلم — یا ‎null‎ اگر مدت‌دار نیست یا هنوز شروع نشده.
 *
 * شروع: اولین تحویل، وگرنه زمانِ پرداخت — ولی فقط اگر قلم تحویل شده
 * (کدِ انبار همان لحظه‌ی پرداخت می‌رسد). قلمی که هنوز در صف است
 * اشتراک نیست: ساعتش نباید از پرداخت بچرخد وقتی مشتری چیزی نگرفته.
 * پایان: «تا کِی»ی آخرین تحویل اگر مدیر زده، وگرنه شروع + مدتِ پلن.
 *
 * @param array $deliveries تحویل‌های قلم (با ‎at‎ و ‎until‎)
 * @param bool  $delivered  قلم تحویل شده (بی‌کارِ صف، یا کارِ انجام‌شده)
 */
function phoenix_acc_subscription($days, array $deliveries, $paid_ts, $now, $delivered = true) {
    $days  = (int) $days;
    $start = 0;
    $until = 0;
    foreach ($deliveries as $d) {
        $at = (int) ($d['at'] ?? 0);
        if ($at > 0 && ($start === 0 || $at < $start)) {
            $start = $at;
        }
        $until = max($until, (int) ($d['until'] ?? 0));
    }
    if ($start === 0) {
        if (!$delivered) {
            return null;
        }
        $start = (int) $paid_ts;
    }
    if ($start <= 0 || ($days <= 0 && $until <= 0)) {
        return null;
    }
    $end   = $until > 0 ? $until : $start + $days * 86400;
    $total = max(1, (int) round(($end - $start) / 86400));
    $left  = (int) ceil(($end - $now) / 86400);
    return array(
        'start'      => $start,
        'end'        => $end,
        'total_days' => $total,
        'days_left'  => max(0, $left),
        'state'      => $left <= 0 ? 'expired' : ($left <= 5 ? 'ending' : 'active'),
    );
}

/* ============================================================
   متنِ آزادِ مشتری — تیکت، ورودی
   ============================================================ */

/**
 * متنِ ساده: بی‌تگ، بی‌نویسه‌ی کنترلی (جز شکستِ خط اگر ‎$multiline‎)،
 * فاصله‌ی دور حذف، و بریده در ‎$max‎.
 */
function phoenix_acc_text($s, $max, $multiline = false) {
    $s = is_scalar($s) ? (string) $s : '';
    if (function_exists('mb_check_encoding') && !mb_check_encoding($s, 'UTF-8')) {
        return '';
    }
    $s = strip_tags($s);
    $s = str_replace("\r\n", "\n", $s);
    $s = preg_replace($multiline ? '/[\x00-\x09\x0B-\x1F\x7F]/' : '/[\x00-\x1F\x7F]/', '', $s);
    if ($multiline) {
        $s = preg_replace("/\n{3,}/", "\n\n", $s);
    }
    $s = trim($s);
    return function_exists('mb_substr') ? mb_substr($s, 0, $max, 'UTF-8') : substr($s, 0, $max);
}

/**
 * تیکتِ تازه یا پاسخ.
 *
 * @return array{ok:bool, errors:array<string,string>, data:array}
 */
function phoenix_acc_ticket_clean(array $in, $with_subject) {
    $err  = array();
    $body = phoenix_acc_text($in['body'] ?? '', 4000, true);
    if (mb_strlen($body, 'UTF-8') < 2) {
        $err['body'] = 'لطفاً متن پیام را بنویسید.';
    }
    $data = array('body' => $body);
    if ($with_subject) {
        $subject = phoenix_acc_text($in['subject'] ?? '', 120);
        if (mb_strlen($subject, 'UTF-8') < 3) {
            $err['subject'] = 'لطفاً موضوع را بنویسید (دست‌کم ۳ کاراکتر).';
        }
        $data['subject']  = $subject;
        $data['order_id'] = max(0, (int) ($in['order_id'] ?? 0));
    }
    return array('ok' => !$err, 'errors' => $err, 'data' => $data);
}

/**
 * ورودی‌هایی که مشتری برای «اصلاح» فرستاده.
 *
 * ⚠ فقط کلیدهایی که همین قلم از قبل دارد یا محصول لازم دانسته —
 * نه هر کلیدی. کلیدِ دلخواه یعنی متای دلخواه روی قلمِ سفارش.
 *
 * @param string[] $allowed
 * @return array{ok:bool, errors:array<string,string>, data:array<string,string>}
 */
function phoenix_acc_inputs_clean($in, array $allowed) {
    $err = array();
    $out = array();
    if (!is_array($in) || !$in) {
        return array('ok' => false, 'errors' => array('inputs' => 'موردی برای اصلاح ارسال نشد.'), 'data' => array());
    }
    foreach ($in as $k => $v) {
        $k = (string) $k;
        if (!in_array($k, $allowed, true)) {
            $err['inputs'] = 'این سفارش چنین فیلدی ندارد.';
            continue;
        }
        $v = phoenix_acc_text($v, 300);
        if ($v === '') {
            $err[$k] = 'لطفاً این فیلد را خالی نگذارید.';
            continue;
        }
        $out[$k] = $v;
    }
    return array('ok' => !$err && $out, 'errors' => $err, 'data' => $out);
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

/* ============================================================
   چتِ آنلاین — تنظیمات
   ============================================================ */

/**
 * بیست کارشناس — نامِ فارسی. به هر گفتگو یکی نشان داده می‌شود و تا
 * آخرِ همان گفتگو همان می‌ماند. فهرست از پنل عوض می‌شود.
 */
const PHOENIX_ACC_CHAT_AGENTS = array(
    'سارا محمدی', 'امیر رضایی', 'نگین کاظمی', 'محمد حسینی',
    'الهه نوری', 'پویا صادقی', 'مریم افشار', 'رضا کریمی',
    'شیوا مرادی', 'آرش بهرامی', 'نیلوفر جعفری', 'سینا اکبری',
    'هستی رحیمی', 'کیان مهدوی', 'پریسا شریفی', 'بهنام قاسمی',
    'یلدا امینی', 'فرهاد نیک‌پور', 'ترانه سلطانی', 'حامد یزدانی',
);

/**
 * پیش‌فرض‌ها — متن‌ها همان‌اند که چتِ سایت همین حالا دارد؛ لحن را
 * کارفرما بعداً از پنل عوض می‌کند.
 */
function phoenix_acc_chat_defaults() {
    $agents = array();
    foreach (PHOENIX_ACC_CHAT_AGENTS as $n) {
        $agents[] = array('name' => $n, 'active' => true);
    }
    return array(
        'enabled'       => true,
        'bot'           => true,
        'title'         => 'دستیار و پشتیبانی فونیکس',
        'subtitle'      => 'معمولاً زیر چند دقیقه جواب می‌دهیم',
        'greeting'      => "سلام 👋\nهم برای انتخاب محصول کمکت می‌کنم، هم سفارشت را پیگیری می‌کنم، هم جواب سوال‌هایت را می‌دهم.\n\nکدام؟",
        'handoff'       => "وصلت می‌کنم به {agent} از تیم پشتیبانی.\n\nسوالت را برایش فرستادم و همین‌جا جواب می‌دهد.",
        'offline'       => "الان خارج از ساعتِ پاسخ‌گویی هستیم.\n\nسوالت را برای {agent} فرستادم؛ اولِ وقتِ کاری همین‌جا جواب می‌دهد.",
        'hours_on'      => false,
        'hours_from'    => '09:00',
        'hours_to'      => '23:00',
        'days'          => array(0, 1, 2, 3, 4, 5, 6), // ۰ = شنبه … ۶ = جمعه
        'telegram'      => 'Ph0enixSupport',
        'show_telegram' => true,
        'position'      => 'left',   // left | right — گوشه‌ی دکمه
        'accent'        => '',       // خالی = رنگِ خودِ سایت
        'agents'        => $agents,
        'quick'         => array(
            'سلام، وقتتون بخیر. در خدمتم.',
            'چند لحظه اجازه بدید بررسی کنم.',
            'سفارشتون در صفِ تحویل است و به‌زودی فعال می‌شود.',
            'لطفاً شماره‌ی سفارش را بفرستید.',
            'مشکل برطرف شد. اگر سوال دیگری هست در خدمتم.',
        ),
    );
}

/**
 * @return array{ok:bool, errors:array<string,string>, data:array}
 */
function phoenix_acc_chat_settings_clean(array $in) {
    $d   = phoenix_acc_chat_defaults();
    $err = array();
    $out = array();

    foreach (array('enabled', 'bot', 'hours_on', 'show_telegram') as $k) {
        $out[$k] = array_key_exists($k, $in) ? (bool) $in[$k] : $d[$k];
    }

    foreach (array('title' => 60, 'subtitle' => 90) as $k => $max) {
        $v = phoenix_acc_text(array_key_exists($k, $in) ? $in[$k] : $d[$k], $max);
        if ($v === '') {
            $err[$k] = 'خالی نماند.';
        }
        $out[$k] = $v;
    }
    foreach (array('greeting' => 600, 'handoff' => 600, 'offline' => 600) as $k => $max) {
        $v = phoenix_acc_text(array_key_exists($k, $in) ? $in[$k] : $d[$k], $max, true);
        if ($v === '') {
            $err[$k] = 'خالی نماند.';
        }
        $out[$k] = $v;
    }

    foreach (array('hours_from', 'hours_to') as $k) {
        $v = (string) (array_key_exists($k, $in) ? $in[$k] : $d[$k]);
        if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $v)) {
            $err[$k] = 'ساعت به شکلِ ۰۹:۰۰ — از ۰۰:۰۰ تا ۲۳:۵۹.';
            $v = $d[$k];
        }
        $out[$k] = $v;
    }
    $days = array();
    foreach ((array) (array_key_exists('days', $in) ? $in['days'] : $d['days']) as $x) {
        if (is_numeric($x) && (int) $x >= 0 && (int) $x <= 6) {
            $days[(int) $x] = true;
        }
    }
    $out['days'] = array_keys($days);
    sort($out['days']);
    if ($out['hours_on'] && !$out['days']) {
        $err['days'] = 'دست‌کم یک روز.';
    }

    $tg = ltrim(trim((string) (array_key_exists('telegram', $in) ? $in['telegram'] : $d['telegram'])), '@');
    if ($tg !== '' && !preg_match('/^[A-Za-z][A-Za-z0-9_]{4,31}$/', $tg)) {
        $err['telegram'] = 'آیدیِ تلگرام: حرفِ لاتین، عدد و زیرخط، ۵ تا ۳۲ نویسه.';
        $tg = $d['telegram'];
    }
    $out['telegram'] = $tg;

    $pos = (string) ($in['position'] ?? $d['position']);
    $out['position'] = in_array($pos, array('left', 'right'), true) ? $pos : 'left';

    $acc = trim((string) ($in['accent'] ?? ''));
    if ($acc !== '' && !preg_match('/^#[0-9a-fA-F]{6}$/', $acc)) {
        $err['accent'] = 'رنگ به شکلِ ‎#e8862e‎، یا خالی برای رنگِ سایت.';
        $acc = '';
    }
    $out['accent'] = strtolower($acc);

    /* کارشناس‌ها: نامِ تکراری یک بار، حداکثر ۶۰ نفر */
    $agents = array();
    $seen   = array();
    foreach ((array) (array_key_exists('agents', $in) ? $in['agents'] : $d['agents']) as $a) {
        $name = phoenix_acc_text(is_array($a) ? ($a['name'] ?? '') : $a, 40);
        if ($name === '' || isset($seen[$name])) {
            continue;
        }
        $seen[$name] = true;
        $agents[] = array('name' => $name, 'active' => is_array($a) ? !empty($a['active']) : true);
        if (count($agents) >= 60) {
            break;
        }
    }
    if (!array_filter(array_column($agents, 'active'))) {
        $err['agents'] = 'دست‌کم یک کارشناسِ فعال لازم است.';
    }
    $out['agents'] = $agents;

    $quick = array();
    foreach ((array) (array_key_exists('quick', $in) ? $in['quick'] : $d['quick']) as $q) {
        $q = phoenix_acc_text($q, 400, true);
        if ($q !== '' && count($quick) < 40) {
            $quick[] = $q;
        }
    }
    $out['quick'] = $quick;

    return array('ok' => !$err, 'errors' => $err, 'data' => $out);
}

/** نام‌های کارشناس‌های فعال */
function phoenix_acc_chat_active_agents(array $s) {
    $out = array();
    foreach ((array) $s['agents'] as $a) {
        if (!empty($a['active'])) {
            $out[] = (string) $a['name'];
        }
    }
    return $out;
}

/** آنچه سایت لازم دارد — بی‌پاسخ‌های آماده‌ی اپراتور */
function phoenix_acc_chat_public(array $s, $open) {
    return array(
        'enabled'  => (bool) $s['enabled'],
        'bot'      => (bool) $s['bot'],
        'title'    => $s['title'],
        'subtitle' => $s['subtitle'],
        'greeting' => $s['greeting'],
        'handoff'  => $s['handoff'],
        'offline'  => $s['offline'],
        'open'     => (bool) $open,
        'telegram' => $s['show_telegram'] ? $s['telegram'] : '',
        'position' => $s['position'],
        'accent'   => $s['accent'],
        'agents'   => phoenix_acc_chat_active_agents($s),
    );
}

/**
 * الان ساعتِ پاسخ‌گویی است؟
 *
 * @param int $minutes دقیقه از نیمه‌شب، به وقتِ سایت
 * @param int $day     ۰ = شنبه … ۶ = جمعه
 */
function phoenix_acc_chat_is_open(array $s, $minutes, $day) {
    if (empty($s['hours_on'])) {
        return true;
    }
    if (!in_array((int) $day, array_map('intval', (array) $s['days']), true)) {
        return false;
    }
    list($fh, $fm) = array_map('intval', explode(':', $s['hours_from']));
    list($th, $tm) = array_map('intval', explode(':', $s['hours_to']));
    $from = $fh * 60 + $fm;
    $to   = $th * 60 + $tm;
    /* ‎۲۲:۰۰ تا ۰۲:۰۰‎ — بازه از نیمه‌شب رد می‌شود */
    return $from <= $to ? ($minutes >= $from && $minutes < $to) : ($minutes >= $from || $minutes < $to);
}

/** نامی که مرورگر خواسته، اگر در فهرستِ فعال هست؛ وگرنه یکی به قرعه */
function phoenix_acc_chat_pick_agent(array $active, $wanted, $rand) {
    if (!$active) {
        return 'پشتیبانی';
    }
    $wanted = (string) $wanted;
    if ($wanted !== '' && in_array($wanted, $active, true)) {
        return $wanted;
    }
    return $active[abs((int) $rand) % count($active)];
}

/** ‎{agent}‎ در متن‌های قابلِ تنظیم */
function phoenix_acc_chat_fill($text, $agent) {
    return str_replace('{agent}', (string) $agent, (string) $text);
}

/* ============================================================
   Bot API تلگرام — رباتِ اعلان‌ها (telegram.php)
   ============================================================ */

/**
 * درخواستِ Bot API.
 *
 * @param string $api نشانیِ پایه — ‎https://api.telegram.org‎ یا یک واسطه
 * @return array{url:string, body:string}
 */
function phoenix_acc_tg_request($api, $token, $method, array $params) {
    $base = rtrim((string) $api, '/');
    if ($base === '') {
        $base = 'https://api.telegram.org';
    }
    return array(
        'url'  => $base . '/bot' . $token . '/' . $method,
        'body' => json_encode($params, JSON_UNESCAPED_UNICODE),
    );
}

/* ============================================================
   اعلان‌ها — خرید و پشتیبانی در تلگرامِ مدیر، یا API برای برنامه‌ی دیگر
   ============================================================ */

/*
 * ⚠ همه‌ی متن‌ها و تصمیم‌ها این‌جا، خالص؛ notify.php فقط به وردپرس و
 * تلگرام وصلشان می‌کند (tests/account-test.php، tests/notify-flow-test.php).
 */

/** رویداد => ‎[برچسب در پنل، پیش‌فرض، عنوانِ پیام]‎ */
const PHOENIX_ACC_NOTIFY_EVENTS = array(
    'order_paid'    => array('سفارشِ پرداخت‌شده', true, '🛒 سفارشِ تازه — پرداخت شد'),
    'order_on_hold' => array('سفارشِ منتظرِ تأییدِ پرداخت (کارت‌به‌کارت)', true, '⏳ سفارش منتظرِ تأییدِ پرداخت'),
    'order_new'     => array('سفارشِ ثبت‌شده، هنوز پرداخت‌نشده', false, '🆕 سفارشِ ثبت‌شده — هنوز پرداخت نشده'),
    'input_fixed'   => array('مشتری اطلاعاتِ تحویل را اصلاح کرد', true, '✏️ مشتری اطلاعاتِ تحویل را اصلاح کرد'),
    'ticket'        => array('پیامِ تازه‌ی مشتری در تیکت', false, '🎫 پیامِ تازه در تیکت'),
    'chat'          => array('گفتگوی تازه در چتِ آنلاین', false, '💬 گفتگوی تازه در چت'),
);

const PHOENIX_ACC_NOTIFY_MAX_CHATS = 10;

function phoenix_acc_notify_defaults() {
    $ev = array();
    foreach (PHOENIX_ACC_NOTIFY_EVENTS as $id => $e) {
        $ev[$id] = $e[1];
    }
    return array(
        'on'           => false,
        'tg_on'        => true,
        'tg_conn'      => '',      // اسلاگِ «اتصال» با توکنِ ربات
        'tg_bot'       => '',      // نامِ ربات — با «وصل کردن» (وبهوک روی همین سایت)؛ از ورودی نه
        'tg_api'       => '',      // واسطه‌ی Bot API اگر هاست به تلگرام نمی‌رسد؛ خالی = api.telegram.org
        'tg_hook'      => '',      // نشانیِ وبهوک از راهِ واسطه؛ خالی = همین سایت
        'tg_chats'     => array(), // ‎[{id, title}]‎
        'hook_on'      => false,
        'hook_url'     => '',
        'events'       => $ev,
        'show_contact' => true,    // شماره و ایمیلِ مشتری در پیام
        'show_inputs'  => false,   // ورودی‌های سفارش (رمزها همیشه پوشیده)
    );
}

/** شناسه‌ی گفتگوی تلگرام: عددی (کاربر، گروه ‎-…‎، کانال ‎-100…‎) یا ‎@کانال‎ */
function phoenix_acc_notify_chat_id_ok($id) {
    return is_string($id) && preg_match('/^(-?\d{5,20}|@[A-Za-z][A-Za-z0-9_]{4,31})$/', $id) === 1;
}

/**
 * @param string[] $conns اسلاگِ اتصال‌های Bridge
 * @return array{ok:bool, data:array, errors:array<string,string>}
 */
function phoenix_acc_notify_clean(array $in, array $conns = array()) {
    $d   = phoenix_acc_notify_defaults();
    $err = array();
    $out = array(
        'on'           => !empty($in['on']),
        'tg_on'        => array_key_exists('tg_on', $in) ? !empty($in['tg_on']) : $d['tg_on'],
        'hook_on'      => !empty($in['hook_on']),
        'show_contact' => array_key_exists('show_contact', $in) ? !empty($in['show_contact']) : $d['show_contact'],
        'show_inputs'  => !empty($in['show_inputs']),
    );

    $conn = isset($in['tg_conn']) ? (string) $in['tg_conn'] : '';
    if ($conn !== '' && !in_array($conn, $conns, true)) {
        $err['tg_conn'] = 'این اتصال نیست — توکنِ ربات را در «منابعِ قیمت ← اتصال‌ها» بساز و این‌جا انتخاب کن.';
        $conn = '';
    }
    $out['tg_conn'] = $conn;
    $out['tg_bot']  = ''; // فقط «وصل کردن» می‌گذاردش — ذخیره نگهش می‌دارد (notify.php)
    foreach (array('tg_api', 'tg_hook') as $k) {
        $v = rtrim(trim((string) ($in[$k] ?? '')), '/');
        if ($v !== '' && !preg_match('#^https://[A-Za-z0-9.\-]+(:\d+)?(/[^\s?\#]*)?$#', $v)) {
            $err[$k] = 'نشانیِ کاملِ https، بی‌پارامتر — یا خالی.';
            $v = '';
        }
        $out[$k] = $v;
    }
    $wants_tg = $out['tg_on'] && !empty($in['tg_chats']) && is_array($in['tg_chats']);
    if ($wants_tg && $conn === '' && empty($err['tg_conn'])) {
        $err['tg_conn'] = 'برای فرستادن به تلگرام، توکنِ ربات را انتخاب کن.';
    }

    $chats = array();
    $seen  = array();
    foreach (isset($in['tg_chats']) && is_array($in['tg_chats']) ? $in['tg_chats'] : array() as $c) {
        $id = is_array($c) && isset($c['id']) && is_scalar($c['id']) ? trim((string) $c['id']) : '';
        if (!phoenix_acc_notify_chat_id_ok($id)) {
            $err['tg_chats'] = 'شناسه‌ی گفتگو عددی است (مثلاً ‎123456789‎ یا ‎-1001234567890‎) یا ‎@نامِ‌کانال‎.';
            continue;
        }
        if (isset($seen[$id])) {
            continue;
        }
        $seen[$id] = true;
        $chats[] = array('id' => $id, 'title' => phoenix_acc_text(is_array($c) ? ($c['title'] ?? '') : '', 64));
    }
    if (count($chats) > PHOENIX_ACC_NOTIFY_MAX_CHATS) {
        $err['tg_chats'] = 'حداکثر ' . PHOENIX_ACC_NOTIFY_MAX_CHATS . ' گیرنده.';
        $chats = array_slice($chats, 0, PHOENIX_ACC_NOTIFY_MAX_CHATS);
    }
    $out['tg_chats'] = $chats;

    $url = trim((string) ($in['hook_url'] ?? ''));
    if ($url !== '' && (!preg_match('#^https://[A-Za-z0-9.\-]+(:\d+)?(/[^\s]*)?$#', $url) || strlen($url) > 500 || strpos($url, '@') !== false)) {
        $err['hook_url'] = 'نشانیِ کاملِ https — بی‌نام‌کاربری و رمز در خودِ نشانی.';
        $url = '';
    }
    $out['hook_url'] = $url;
    if ($out['hook_on'] && $url === '') {
        $err['hook_url'] = 'برای API نشانی لازم است.';
    }

    $ev = array();
    foreach (PHOENIX_ACC_NOTIFY_EVENTS as $id => $e) {
        $ev[$id] = isset($in['events']) && is_array($in['events']) && array_key_exists($id, $in['events'])
            ? !empty($in['events'][$id]) : $e[1];
    }
    $out['events'] = $ev;

    return array('ok' => !$err, 'data' => $out, 'errors' => $err);
}

function phoenix_acc_notify_fa($s) {
    return strtr((string) $s, array('0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴', '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹'));
}

function phoenix_acc_notify_money($n, $currency = 'IRT') {
    $unit = array('IRT' => 'تومان', 'IRR' => 'ریال', 'IRHT' => 'هزار تومان')[$currency] ?? $currency;
    return phoenix_acc_notify_fa(number_format((float) $n, 0, '.', '٬')) . ' ' . $unit;
}

function phoenix_acc_notify_esc($s) {
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** ورودی‌ای که شبیهِ رمز است هرگز به تلگرام یا API نمی‌رود */
function phoenix_acc_notify_secretish($key) {
    return preg_match('/(رمز|پسورد|گذرواژه|کلمه.?ی?.?عبور|password|passwd|pass\b|pwd|pin\b|otp|cvv|کد.?(امنیتی|تأیید|تایید|ورود|یکبار))/iu', (string) $key) === 1;
}

/** ورودی‌ها پیش از رفتن — رمزگونه‌ها پوشیده */
function phoenix_acc_notify_inputs(array $list) {
    $out = array();
    foreach ($list as $kv) {
        if (!is_array($kv) || !isset($kv['key'])) {
            continue;
        }
        $k = (string) $kv['key'];
        $out[] = array('key' => $k, 'value' => phoenix_acc_notify_secretish($k) ? '••••••' : (string) ($kv['value'] ?? ''));
    }
    return $out;
}

/**
 * دادهٔ رویداد پس از تنظیماتِ حریمِ خصوصی — همان چیزی که هم به تلگرام
 * و هم به API می‌رود.
 */
function phoenix_acc_notify_shape(array $d, array $opt) {
    if (isset($d['customer']) && is_array($d['customer']) && empty($opt['show_contact'])) {
        unset($d['customer']['phone'], $d['customer']['email']);
    }
    if (isset($d['phone']) && empty($opt['show_contact'])) {
        unset($d['phone']);
    }
    if (isset($d['items']) && is_array($d['items'])) {
        foreach ($d['items'] as $i => $it) {
            if (!empty($opt['show_inputs']) && isset($it['inputs']) && is_array($it['inputs'])) {
                $d['items'][$i]['inputs'] = phoenix_acc_notify_inputs($it['inputs']);
            } else {
                unset($d['items'][$i]['inputs']);
            }
            unset($d['items'][$i]['deliveries'], $d['items'][$i]['stock_codes']);
        }
    }
    return $d;
}

/**
 * متنِ پیامِ تلگرام (HTML) — زیرِ ۳۸۰۰ نویسه، زیرِ سقفِ ۴۰۹۶ تلگرام.
 * ‎$d‎ پیش‌تر از ‎phoenix_acc_notify_shape‎ گذشته است.
 *
 * ⚠ سرِ پیام (سفارش، مشتری) و تهِ آن (پرداخت، پیوندِ پنل) همیشه کامل؛
 *   قلم‌ها در فضای باقی‌مانده، و اگر جا نشد «… و N قلمِ دیگر» — تا مدیر
 *   بداند چیزی جا مانده.
 */
function phoenix_acc_notify_text($event, array $d) {
    $e   = 'phoenix_acc_notify_esc';
    $fa  = 'phoenix_acc_notify_fa';
    $cur = (string) ($d['currency'] ?? 'IRT');
    $head = array('<b>' . $e(PHOENIX_ACC_NOTIFY_EVENTS[$event][2] ?? $event) . '</b>');
    $body = array(); // قلم‌ها — هر کدام چند سطر
    $foot = array();

    if (strpos($event, 'order_') === 0 || $event === 'input_fixed') {
        $head[] = 'سفارشِ ' . $fa('#' . $e($d['number'] ?? $d['id'] ?? '')) . (isset($d['total']) ? ' · ' . phoenix_acc_notify_money($d['total'], $cur) : '');
        $c = isset($d['customer']) && is_array($d['customer']) ? $d['customer'] : array();
        $who = array_filter(array(
            trim((string) ($c['name'] ?? '')) !== '' ? $e($c['name']) : '',
            !empty($c['phone']) ? $fa($e($c['phone'])) : '',
            !empty($c['email']) ? $e($c['email']) : '',
        ));
        if ($who) {
            $head[] = '👤 ' . implode(' · ', $who);
        }
        if ($event === 'input_fixed' && !empty($d['item'])) {
            $head[] = 'قلم: ' . $e($d['item']);
        }
        foreach (isset($d['items']) && is_array($d['items']) ? $d['items'] : array() as $it) {
            $q = (int) ($it['qty'] ?? 1);
            $block = array('• ' . $e($it['name'] ?? '') . ($q > 1 ? ' ×' . $fa($q) : '')
                . (isset($it['total']) ? ' — ' . phoenix_acc_notify_money($it['total'], $cur) : ''));
            foreach (isset($it['inputs']) && is_array($it['inputs']) ? array_slice($it['inputs'], 0, 6) : array() as $kv) {
                $block[] = '    ' . $e($kv['key']) . ': <code>' . $e($kv['value']) . '</code>';
            }
            $body[] = implode("\n", $block);
        }
        $p = isset($d['payment']) && is_array($d['payment']) ? $d['payment'] : array();
        $pay = array_filter(array(
            !empty($p['method']) ? $e($p['method']) : '',
            !empty($p['transaction_id']) ? 'کدِ پیگیری <code>' . $e($p['transaction_id']) . '</code>' : '',
        ));
        if ($pay) {
            $foot[] = '💳 ' . implode(' · ', $pay);
        }
        if (!empty($d['note'])) {
            $foot[] = '📝 ' . $e(phoenix_acc_text($d['note'], 300, true));
        }
    } elseif ($event === 'ticket') {
        $head[] = 'تیکتِ ' . $fa('#' . (int) ($d['ticket_id'] ?? 0)) . ' — ' . $e($d['subject'] ?? '');
        if (!empty($d['phone'])) {
            $head[] = '👤 ' . $fa($e($d['phone']));
        }
        if (!empty($d['excerpt'])) {
            $body[] = '«' . $e($d['excerpt']) . '»';
        }
    } elseif ($event === 'chat') {
        $head[] = 'کارشناس: ' . $e($d['agent'] ?? '—') . (!empty($d['phone']) ? ' · 👤 ' . $fa($e($d['phone'])) : '');
        if (!empty($d['excerpt'])) {
            $body[] = '«' . $e($d['excerpt']) . '»';
        }
        if (!empty($d['page'])) {
            $foot[] = 'صفحه: ' . $e($d['page']);
        }
    }
    if (!empty($d['admin_url']) && preg_match('#^https?://#', (string) $d['admin_url'])) {
        $foot[] = '<a href="' . $e($d['admin_url']) . '">باز کردن در پنل</a>';
    }

    $headS  = implode("\n", $head);
    $footS  = $foot ? "\n\n" . implode("\n", $foot) : '';
    $budget = 3800 - strlen($headS) - strlen($footS) - 80; // ۸۰: جای «… و N قلمِ دیگر»
    $kept = array();
    foreach ($body as $i => $b) {
        $len = strlen(implode("\n", $kept)) + strlen($b) + 1;
        if ($len > $budget || count($kept) >= 12) {
            $kept[] = '… و ' . $fa(count($body) - $i) . (strpos($event, 'order_') === 0 || $event === 'input_fixed' ? ' قلمِ دیگر' : ' سطرِ دیگر');
            break;
        }
        $kept[] = $b;
    }
    return $headS . ($kept ? "\n\n" . implode("\n", $kept) : '') . $footS;
}

/** چند ثانیه تا تلاشِ بعد — ۱ دقیقه، ۵، ۱۵، یک ساعت، سه ساعت */
function phoenix_acc_notify_backoff($tries) {
    $steps = array(60, 300, 900, 3600, 10800);
    return $steps[max(0, min(count($steps) - 1, (int) $tries - 1))];
}

const PHOENIX_ACC_NOTIFY_MAX_TRIES = 6;

/**
 * خطای تلگرام → دوباره یا نه.
 *
 * @return array{retry:bool, after:int}
 */
function phoenix_acc_notify_tg_verdict($code, $desc) {
    $desc = (string) $desc;
    if ($code === 'phoenix_acc_tg_net') {
        return array('retry' => true, 'after' => 0);
    }
    if (preg_match('/retry after (\d+)/i', $desc, $m)) {
        return array('retry' => true, 'after' => min(3600, (int) $m[1] + 1));
    }
    if ($code === 'phoenix_acc_tg_api' && preg_match('/^(HTTP )?5\d\d|Internal Server Error|Bad Gateway|Gateway/i', $desc)) {
        return array('retry' => true, 'after' => 0);
    }
    return array('retry' => false, 'after' => 0); // توکن، ربات بیرون‌شده، گفتگوی ناموجود — تکرار فایده ندارد
}

/** امضای API: ‎sha256=HMAC(secret, "زمان.بدنه")‎ — زمان در امضا، تا پیامِ قدیمی دوباره پذیرفته نشود */
function phoenix_acc_notify_sign($secret, $ts, $body) {
    return 'sha256=' . hash_hmac('sha256', (int) $ts . '.' . (string) $body, (string) $secret);
}

/** پاسخِ وبهوک → دوباره یا نه (۴۰۸ و ۴۲۹ و ۵xx و خطای شبکه: دوباره) */
function phoenix_acc_notify_hook_verdict($status) {
    $status = (int) $status;
    if ($status >= 200 && $status < 300) {
        return 'sent';
    }
    return ($status === 0 || $status === 408 || $status === 429 || $status >= 500) ? 'retry' : 'failed';
}

/**
 * پیامِ «اتصال» با کدِ یک‌بارمصرف — در گفتگوی خصوصی، گروه یا کانال.
 *
 * @return array|null ‎{id, title, type}‎
 */
function phoenix_acc_notify_find_code($update, $code) {
    if (!is_array($update) || !is_string($code) || !preg_match('/^ph_[a-z0-9]{8,16}$/', $code)) {
        return null;
    }
    foreach (array('message', 'channel_post') as $k) {
        $m = isset($update[$k]) && is_array($update[$k]) ? $update[$k] : null;
        if (!$m || !isset($m['chat']['id'])) {
            continue;
        }
        $text = (string) ($m['text'] ?? '');
        if (!preg_match('/(^|\s)' . preg_quote($code, '/') . '(\s|$)/', $text)) {
            continue;
        }
        $c = $m['chat'];
        $title = (string) ($c['title'] ?? trim(($c['first_name'] ?? '') . ' ' . ($c['last_name'] ?? '')));
        if ($title === '' && !empty($c['username'])) {
            $title = '@' . $c['username'];
        }
        return array('id' => (string) (int) $c['id'], 'title' => phoenix_acc_text($title, 64), 'type' => (string) ($c['type'] ?? ''));
    }
    return null;
}

/* ============================================================
   کدِ ورود با ایمیل
   ============================================================ */

/*
 * ⚠ فقط به ایمیلی که همین حالا در پرونده‌ی همان شماره است — هرگز به
 * ایمیلی که در صفحه‌ی ورود تایپ شود. وگرنه هر کسی شماره‌ی دیگری را
 * با ایمیلِ خودش می‌زد و کدِ ورودِ حسابِ او را می‌گرفت. ایمیلِ پرونده
 * را یا خودِ مشتری بعد از ورود گذاشته، یا مدیر.
 */

/** @return array{subject:string, body:string} */
function phoenix_acc_otp_email_text($code, $ttl) {
    $min = max(1, (int) ceil((int) $ttl / 60));
    $fa  = strtr((string) $min, array('0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴', '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹'));
    return array(
        'subject' => 'کد ورود فونیکس شاپ: ' . $code,
        'body'    => "کد ورود شما به فونیکس شاپ:\n\n" . $code . "\n\n"
            . 'این کد تا ' . $fa . " دقیقه معتبر است. لطفاً آن را در اختیار هیچ‌کس قرار ندهید؛ پشتیبانی فونیکس شاپ هرگز کد را از شما نمی‌خواهد.\n\n"
            . 'اگر شما درخواست ورود نداده‌اید، این ایمیل را نادیده بگیرید.',
    );
}

/**
 * سایت چه بگوید — بی‌آنکه بگوید این شماره ایمیل دارد یا نه.
 *
 * @return array ‎channel: email‎ وقتی ایمیل تنها راه است؛ ‎also: email‎ وقتی کنارِ راهِ اصلی
 */
function phoenix_acc_otp_email_extra(array $extra, $provider, $on) {
    if (!$on) {
        return $extra;
    }
    if ($provider === 'off' && empty($extra['channel'])) {
        $extra['channel'] = 'email';
    } else {
        $extra['also'] = 'email';
    }
    return $extra;
}

/**
 * مشتریِ تازه از پنلِ مدیر — برای آزمایش یا ثبتِ دستی.
 * شماره پیش‌تر با ‎phoenix_normalize_phone‎ی Bridge یکدست شده.
 *
 * @return array{ok:bool, data:array, errors:array<string,string>}
 */
function phoenix_acc_admin_customer_clean(array $in, $phone) {
    $err = array();
    if (!preg_match('/^09\d{9}$/', (string) $phone)) {
        $err['phone'] = 'شماره‌ی موبایلِ ایران، مثلاً ۰۹۱۲۱۲۳۴۵۶۷.';
    }
    $name = phoenix_acc_text($in['name'] ?? '', 100);
    $email = trim((string) ($in['email'] ?? ''));
    if ($email !== '' && (strlen($email) > 190 || !preg_match('/^[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}$/', $email))) {
        $err['email'] = 'ایمیل درست نیست.';
    }
    $pass = (string) ($in['password'] ?? '');
    if ($pass !== '') {
        $bad = phoenix_acc_password_problem($pass, $phone);
        if ($bad !== '') {
            $err['password'] = $bad;
        }
    }
    return array('ok' => !$err, 'errors' => $err, 'data' => array('name' => $name, 'email' => strtolower($email), 'password' => $pass));
}
