<?php
/**
 * تستِ هسته‌ی Phoenix Account — تنظیمات، نشست، پیامک.
 *
 * چیزی که این‌جا تست *نمی‌شود*: ارسالِ واقعیِ پیامک و پایگاه داده.
 * درخواستِ پیامک این‌جا ساخته و بررسی می‌شود؛ رسیدنش با دکمه‌ی
 * «ارسالِ آزمایشی» در پنل.
 *
 * اجرا:  php wp-plugin/tests/account-test.php
 */

define('ABSPATH', __DIR__);
require_once __DIR__ . '/../phoenix-account/includes/core.php';

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;
function is_same($label, $got, $want) {
    if ($got === $want) { $GLOBALS['pass']++; printf("  ok    %s\n", $label); return; }
    $GLOBALS['fail']++;
    printf("  FAIL  %s\n        got  %s\n        want %s\n", $label,
        json_encode($got, JSON_UNESCAPED_UNICODE), json_encode($want, JSON_UNESCAPED_UNICODE));
}
function section($t) { echo "\n== {$t} ==\n"; }
function err($in, $field, $conns = array('k_aaaaaa')) {
    $r = phoenix_acc_settings_clean($in, $conns);
    return isset($r['errors'][$field]) ? true : ($r['ok'] ? 'ok' : array_keys($r['errors']));
}

/* ============================================================ */
section('تنظیمات');

$r = phoenix_acc_settings_clean(array());
is_same('پیش‌فرض: خاموش و درست', array($r['ok'], $r['data']['sms_provider']), array(true, 'off'));
is_same('پیش‌فرض: سی روز', $r['data']['session_days'], 30);
is_same('سامانه‌ی ناشناخته رد', err(array('sms_provider' => 'twilio'), 'sms_provider'), true);
is_same('آزمایشی بی‌کلید درست است', phoenix_acc_settings_clean(array('sms_provider' => 'dev'))['ok'], true);

$kv = array('sms_provider' => 'kavenegar', 'sms_conn' => 'k_aaaaaa', 'sms_tpl_otp' => 'phoenix-login');
is_same('کاوه‌نگارِ کامل پذیرفته', phoenix_acc_settings_clean($kv, array('k_aaaaaa'))['ok'], true);
is_same('کاوه‌نگار بی‌کلید رد', err(array_merge($kv, array('sms_conn' => '')), 'sms_conn'), true);
is_same('اتصالِ ناموجود رد', err(array_merge($kv, array('sms_conn' => 'k_zzzzzz')), 'sms_conn'), true);
is_same('نامِ الگوی کاوه‌نگار با فاصله رد', err(array_merge($kv, array('sms_tpl_otp' => 'my template')), 'sms_tpl_otp'), true);
is_same('نامِ الگوی کاوه‌نگار خالی رد', err(array_merge($kv, array('sms_tpl_otp' => '')), 'sms_tpl_otp'), true);

$si = array('sms_provider' => 'smsir', 'sms_conn' => 'k_aaaaaa', 'sms_tpl_otp' => '123456', 'sms_param' => 'CODE');
is_same('sms.irِ کامل پذیرفته', phoenix_acc_settings_clean($si, array('k_aaaaaa'))['ok'], true);
is_same('شناسه‌ی الگوی sms.ir غیرِ عددی رد', err(array_merge($si, array('sms_tpl_otp' => 'abc')), 'sms_tpl_otp'), true);
is_same('نامِ متغیر با #  رد', err(array_merge($si, array('sms_param' => '#CODE#')), 'sms_param'), true);

is_same('روزِ صفر رد', err(array('session_days' => 0), 'session_days'), true);
is_same('روزِ ۱۰۰۰ رد و بریده', phoenix_acc_settings_clean(array('session_days' => 1000))['data']['session_days'], 180);
is_same('خاموش کلید و الگو را نگه نمی‌دارد',
    array_intersect_key(phoenix_acc_settings_clean(array('sms_provider' => 'off', 'sms_conn' => 'k_aaaaaa', 'sms_tpl_otp' => 'x'))['data'], array('sms_conn' => 1, 'sms_tpl_otp' => 1)),
    array('sms_conn' => '', 'sms_tpl_otp' => ''));

/* ============================================================ */
section('نشست');

$t1 = phoenix_acc_new_token();
$t2 = phoenix_acc_new_token();
is_same('ژتون ۶۴ حرفِ هگز', (bool) preg_match('/^[a-f0-9]{64}$/', $t1), true);
is_same('هر بار ژتونِ تازه', $t1 !== $t2, true);
is_same('شکلِ ژتون درست', phoenix_acc_token_ok($t1), true);
is_same('ژتونِ کوتاه رد', phoenix_acc_token_ok('abc'), false);
is_same('ژتون با حروفِ بزرگ رد', phoenix_acc_token_ok(strtoupper($t1)), false);
is_same('ژتونِ غیرِ رشته رد', phoenix_acc_token_ok(array('x')), false);
is_same('هش ثابت است', phoenix_acc_token_hash($t1) === phoenix_acc_token_hash($t1), true);
is_same('هش با خودِ ژتون فرق دارد', phoenix_acc_token_hash($t1) !== $t1, true);

is_same('شماره پوشانده می‌شود', phoenix_acc_mask_phone('09121234567'), '0912***4567');
is_same('شماره‌ی عجیب کامل پوشانده', phoenix_acc_mask_phone('123'), '***');

is_same('اندروید · Chrome', phoenix_acc_ua_label('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36'), 'اندروید · Chrome');
is_same('آیفون · Safari', phoenix_acc_ua_label('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'), 'آیفون · Safari');
is_same('ویندوز · Edge', phoenix_acc_ua_label('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36 Edg/128.0'), 'ویندوز · Edge');
is_same('ناشناخته', phoenix_acc_ua_label(''), 'دستگاهِ ناشناخته');

/* ============================================================ */
section('پیامک — درخواست');

$s = array_merge(phoenix_acc_defaults(), $kv);
$req = phoenix_acc_sms_request('kavenegar', 'AB/CD+12', $s, '09121234567', '482913');
is_same('کاوه‌نگار: GET', $req['method'], 'GET');
is_same('کاوه‌نگار: کلید در مسیر، کدگذاری‌شده', strpos($req['url'], '/v1/AB%2FCD%2B12/verify/lookup.json?') !== false, true);
is_same('کاوه‌نگار: گیرنده، کد و الگو', strpos($req['url'], 'receptor=09121234567&token=482913&template=phoenix-login') !== false, true);

$s = array_merge(phoenix_acc_defaults(), $si);
$req = phoenix_acc_sms_request('smsir', 'key-xyz', $s, '09121234567', '482913');
$b = json_decode($req['body'], true);
is_same('sms.ir: POST به verify', array($req['method'], $req['url']), array('POST', 'https://api.sms.ir/v1/send/verify'));
is_same('sms.ir: کلید در هدر', $req['headers']['X-API-KEY'], 'key-xyz');
is_same('sms.ir: شناسه‌ی الگو عدد', $b['templateId'], 123456);
is_same('sms.ir: متغیرِ کد', $b['parameters'], array(array('name' => 'CODE', 'value' => '482913')));
is_same('سامانه‌ی ناشناخته → بی‌درخواست', phoenix_acc_sms_request('dev', 'k', $s, '0912', '1'), null);

/* ============================================================ */
section('پیامک — پاسخ');

is_same('کاوه‌نگار موفق', phoenix_acc_sms_result('kavenegar', 200, '{"return":{"status":200,"message":"تایید شد"},"entries":[]}')['ok'], true);
$r = phoenix_acc_sms_result('kavenegar', 200, '{"return":{"status":424,"message":"الگو یافت نشد"}}');
is_same('کاوه‌نگار: الگوی اشتباه ناموفق، با دلیل', array($r['ok'], $r['note']), array(false, '424 الگو یافت نشد'));
is_same('sms.ir موفق', phoenix_acc_sms_result('smsir', 200, '{"status":1,"message":"موفق"}')['ok'], true);
is_same('sms.ir کلیدِ اشتباه ناموفق', phoenix_acc_sms_result('smsir', 401, '{"status":0,"message":"unauthorized"}')['ok'], false);
is_same('پاسخِ غیرِ JSON ناموفق', phoenix_acc_sms_result('smsir', 502, '<html>')['note'], 'HTTP 502');

/* ============================================================ */
section('فهرستِ اخیر');

$now = 10000;
$l = array();
for ($i = 1; $i <= 5; $i++) { $l = phoenix_acc_log_push($l, array('at' => $now - 10 + $i, 'n' => $i), 3, 600, $now); }
is_same('جدیدها اول، حداکثر سه', array_column($l, 'n'), array(5, 4, 3));
$l = phoenix_acc_log_push(array(array('at' => $now - 700, 'n' => 'old')), array('at' => $now, 'n' => 'new'), 10, 600, $now);
is_same('کهنه‌تر از عمر بیرون', array_column($l, 'n'), array('new'));
is_same('تازه‌ها', array_column(phoenix_acc_log_fresh(array(array('at' => $now - 5, 'n' => 1), array('at' => $now - 5000, 'n' => 2)), 600, $now), 'n'), array(1));

printf("\n%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] ? 1 : 0);
