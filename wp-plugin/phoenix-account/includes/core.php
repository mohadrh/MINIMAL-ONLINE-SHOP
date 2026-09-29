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
