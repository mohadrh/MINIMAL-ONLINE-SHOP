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

/* ============================================================ */
section('رمز: قاعده‌ها');

$P = '09121234567';
is_same('کوتاه رد', phoenix_acc_password_problem('abc123', $P) !== '', true);
is_same('هفت نویسه رد، هشت قبول', array(phoenix_acc_password_problem('abcdefg', $P) !== '', phoenix_acc_password_problem('ab3def9h', $P)), array(true, ''));
is_same('خیلی بلند رد', phoenix_acc_password_problem(str_repeat('ab1', 30), $P) !== '', true);
is_same('رایج رد (بی‌توجه به حروفِ بزرگ)', phoenix_acc_password_problem('PassWord1', $P) !== '', true);
is_same('رایج با ارقامِ فارسی هم رد', phoenix_acc_password_problem('۱۲۳۴۵۶۷۸', $P) !== '', true);
is_same('یک نویسه‌ی تکراری رد', phoenix_acc_password_problem('zzzzzzzzzz', $P) !== '', true);
is_same('شماره‌ی خودش رد', phoenix_acc_password_problem('09121234567', $P) !== '', true);
is_same('شماره بی‌صفر وسطِ رمز رد', phoenix_acc_password_problem('x9121234567y', $P) !== '', true);
is_same('فاصله‌ی اول رد', phoenix_acc_password_problem(' goodpass77', $P) !== '', true);
is_same('نویسه‌ی کنترلی رد', phoenix_acc_password_problem("good\x00pass77", $P) !== '', true);
is_same('بی‌حرفِ انگلیسی رد (حتی با عدد)', phoenix_acc_password_problem('گل‌سرخِ۱۴۰۵', $P) !== '', true);
is_same('فقط حروف رد', phoenix_acc_password_problem('Sunflowers', $P) !== '', true);
is_same('فقط عدد رد', phoenix_acc_password_problem('90817263', $P) !== '', true);
is_same('حرف + عدد قبول', phoenix_acc_password_problem('Sunflower42', $P), '');
is_same('با نماد هم قبول', phoenix_acc_password_problem('Gol-Sorkh!1405', $P), '');
is_same('عددِ فارسی هم عدد است', phoenix_acc_password_problem('Sunflower۴۲', $P), '');
is_same('پیام‌ها محترمانه‌اند', strpos(phoenix_acc_password_problem('abc', $P), 'باید') !== false, true);
is_same('غیرِ رشته رد', phoenix_acc_password_problem(12345678, $P) !== '', true);

section('رمز: هش');

$h = phoenix_acc_password_hash('Sunflower-42');
is_same('هش، خودِ رمز نیست', strpos($h, 'Sunflower') === false, true);
is_same('رمزِ درست', phoenix_acc_password_check('Sunflower-42', $h), true);
is_same('رمزِ غلط', phoenix_acc_password_check('Sunflower-43', $h), false);
is_same('ارقامِ فارسی = لاتین', phoenix_acc_password_check('Sunflower-۴۲', $h), true);
is_same('هشِ خالی هیچ‌وقت درست نیست', phoenix_acc_password_check('x', ''), false);
$long = str_repeat('ب', 40);
is_same('بلندتر از ۷۲ بایت: تهِ رمز هم مهم است', phoenix_acc_password_check($long . 'الف', phoenix_acc_password_hash($long . 'دال')), false);
is_same('دو هشِ یک رمز یکی نیستند (نمک)', $h !== phoenix_acc_password_hash('Sunflower-42'), true);

section('قفلِ تلاشِ اشتباه');

is_same('چهار اشتباه آزاد', phoenix_acc_lock_seconds(4), 0);
is_same('پنجمی پانزده دقیقه', phoenix_acc_lock_seconds(5), 900);
is_same('دهمی یک ساعت', phoenix_acc_lock_seconds(10), 3600);

/* ============================================================ */
section('وضعیتِ سفارش برای مشتری');

is_same('پرداخت‌نشده', phoenix_acc_order_state('pending', array()), 'awaiting_payment');
is_same('کارت‌به‌کارت منتظرِ تأیید', phoenix_acc_order_state('on-hold', array()), 'checking');
is_same('در حالِ انجام', phoenix_acc_order_state('processing', array('pending')), 'fulfilling');
is_same('یک قلم اصلاح می‌خواهد', phoenix_acc_order_state('processing', array('done', 'needs_input')), 'needs_input');
is_same('تکمیل = تحویل', phoenix_acc_order_state('completed', array()), 'delivered');
is_same('لغو', phoenix_acc_order_state('cancelled', array()), 'failed');

$view = array(
    'id' => 12, 'number' => '12', 'status' => 'processing', 'created' => 'c', 'paid' => 'p', 'total' => 500,
    'payment' => array('method' => 'زرین‌پال', 'transaction_id' => 'T1', 'is_paid' => true),
    'customer' => array('name' => 'x', 'phone' => '0912', 'email' => ''), 'note' => '',
    'items' => array(
        array('item_id' => 1, 'product_id' => 5, 'name' => 'الف', 'qty' => 1, 'total' => 200, 'inputs' => array(), 'deliveries' => array(), 'stock_codes' => array(),
              'job' => array('id' => 3, 'status' => 'failed', 'note' => 'تأمین‌کننده جواب نداد')),
        array('item_id' => 2, 'product_id' => 6, 'name' => 'ب', 'qty' => 1, 'total' => 300, 'inputs' => array(), 'deliveries' => array(), 'stock_codes' => array(),
              'job' => array('id' => 4, 'status' => 'needs_input', 'note' => 'ایمیل را درست کن')),
    ),
);
$cv = phoenix_acc_order_for_customer($view);
is_same('یادداشتِ داخلیِ صف به مشتری نمی‌رسد', $cv['items'][0]['message'], '');
is_same('قلمِ ناموفق برای مشتری «در انتظار»', $cv['items'][0]['state'], 'waiting');
is_same('پیامِ اصلاح می‌رسد', array($cv['items'][1]['state'], $cv['items'][1]['message']), array('needs_input', 'ایمیل را درست کن'));
is_same('وضعیتِ کلی: اصلاح', $cv['state'], 'needs_input');
is_same('مشخصاتِ مشتری در نمای مشتری تکرار نمی‌شود', array_key_exists('customer', $cv), false);

section('اشتراک');

$day = 86400;
$now = 1900000000;
is_same('بی‌مدت و بی‌تاریخ: اشتراک نیست', phoenix_acc_subscription(0, array(), $now - $day, $now), null);
$s = phoenix_acc_subscription(30, array(), $now - 10 * $day, $now);
is_same('سی‌روزه از پرداخت: بیست روز مانده', array($s['days_left'], $s['state']), array(20, 'active'));
$s = phoenix_acc_subscription(30, array(array('at' => $now - 2 * $day, 'until' => 0)), $now - 10 * $day, $now);
is_same('شروع از تحویل، نه از پرداخت', $s['days_left'], 28);
$s = phoenix_acc_subscription(30, array(array('at' => $now - 2 * $day, 'until' => $now + 3 * $day)), $now - 10 * $day, $now);
is_same('«تا کِی»ی مدیر مقدم است', array($s['days_left'], $s['state']), array(3, 'ending'));
is_same('هنوز تحویل نشده: ساعت شروع نشده', phoenix_acc_subscription(30, array(), $now - 5 * $day, $now, false), null);
$s = phoenix_acc_subscription(30, array(array('at' => $now - $day, 'until' => 0)), $now - 5 * $day, $now, false);
is_same('تحویل شده ولی صف هنوز باز: از تحویل', $s['days_left'], 29);
$s = phoenix_acc_subscription(30, array(), $now - 40 * $day, $now);
is_same('تمام‌شده', array($s['days_left'], $s['state']), array(0, 'expired'));

/* ============================================================ */
section('متن و تیکت');

is_same('تگ و نویسه‌ی کنترلی بیرون', phoenix_acc_text("<b>سلام</b>\x07 دنیا", 100), 'سلام دنیا');
is_same('شکستِ خط فقط در چندخطی', array(phoenix_acc_text("a\nb", 10), phoenix_acc_text("a\nb", 10, true)), array('ab', "a\nb"));
is_same('چند خطِ خالی → یکی', phoenix_acc_text("a\n\n\n\n\nb", 10, true), "a\n\nb");
is_same('UTF-8ی خراب رد', phoenix_acc_text("\xC3\x28", 10), '');
is_same('بریده در سقف', mb_strlen(phoenix_acc_text(str_repeat('ک', 500), 120)), 120);
$t = phoenix_acc_ticket_clean(array('subject' => 'کد', 'body' => ''), true);
is_same('تیکت: موضوعِ کوتاه و متنِ خالی', array($t['ok'], array_keys($t['errors'])), array(false, array('body', 'subject')));
$t = phoenix_acc_ticket_clean(array('subject' => 'کدم کار نمی‌کند', 'body' => '<script>alert(1)</script>سلام', 'order_id' => '-4'), true);
is_same('تیکت: اسکریپت بیرون، سفارشِ منفی صفر', array($t['ok'], $t['data']['body'], $t['data']['order_id']), array(true, 'alert(1)سلام', 0));

section('اصلاحِ ورودی');

$allowed = array('email', 'آیدیِ تلگرام');
is_same('کلیدِ ناشناخته رد', phoenix_acc_inputs_clean(array('_phoenix_delivery' => 'x'), $allowed)['ok'], false);
is_same('مقدارِ خالی رد', phoenix_acc_inputs_clean(array('email' => '  '), $allowed)['ok'], false);
is_same('غیرِ آرایه رد', phoenix_acc_inputs_clean('email=x', $allowed)['ok'], false);
$c = phoenix_acc_inputs_clean(array('email' => ' a@b.co ', 'آیدیِ تلگرام' => '@mina'), $allowed);
is_same('درست', array($c['ok'], $c['data']), array(true, array('email' => 'a@b.co', 'آیدیِ تلگرام' => '@mina')));

/* ============================================================ */
section('چت: تنظیمات');

$d = phoenix_acc_chat_defaults();
is_same('بیست کارشناس، همه فعال', array(count($d['agents']), count(phoenix_acc_chat_active_agents($d))), array(20, 20));
is_same('نام‌ها فارسی', (bool) preg_match('/^[\x{0600}-\x{06FF}\x{200C} ]+$/u', implode('', array_column($d['agents'], 'name'))), true);
$c = phoenix_acc_chat_settings_clean(array());
is_same('بی‌ورودی = پیش‌فرض و درست', array($c['ok'], $c['data']['title'], count($c['data']['agents'])), array(true, $d['title'], 20));
$c = phoenix_acc_chat_settings_clean(array('agents' => array(array('name' => 'الف', 'active' => false))));
is_same('بی‌کارشناسِ فعال رد', isset($c['errors']['agents']), true);
$c = phoenix_acc_chat_settings_clean(array('agents' => array(array('name' => 'الف', 'active' => true), array('name' => 'الف', 'active' => true), array('name' => ' ', 'active' => true), array('name' => '<b>ب</b>', 'active' => true))));
is_same('نامِ تکراری و خالی بیرون، تگ پاک', array_column($c['data']['agents'], 'name'), array('الف', 'ب'));
is_same('ساعتِ بد رد', isset(phoenix_acc_chat_settings_clean(array('hours_from' => '25:00'))['errors']['hours_from']), true);
is_same('رنگِ بد رد', isset(phoenix_acc_chat_settings_clean(array('accent' => 'red;background:url(x)'))['errors']['accent']), true);
is_same('رنگِ درست کوچک', phoenix_acc_chat_settings_clean(array('accent' => '#E8862E'))['data']['accent'], '#e8862e');
is_same('آیدیِ تلگرام با @ پذیرفته', phoenix_acc_chat_settings_clean(array('telegram' => '@Ph0enixSupport'))['data']['telegram'], 'Ph0enixSupport');
is_same('آیدیِ تلگرامِ بد رد', isset(phoenix_acc_chat_settings_clean(array('telegram' => 'a b'))['errors']['telegram']), true);
is_same('گوشه‌ی ناشناخته → چپ', phoenix_acc_chat_settings_clean(array('position' => 'top'))['data']['position'], 'left');
is_same('ساعتِ روشن بی‌روز رد', isset(phoenix_acc_chat_settings_clean(array('hours_on' => true, 'days' => array()))['errors']['days']), true);
is_same('روزِ بیرون از ۰..۶ بیرون', phoenix_acc_chat_settings_clean(array('days' => array(9, 2, 2, -1)))['data']['days'], array(2));
$pub = phoenix_acc_chat_public($d, true);
is_same('سایت پاسخ‌های آماده را نمی‌بیند', array_key_exists('quick', $pub), false);

section('چت: ساعت و کارشناس');

$h = array_merge($d, array('hours_on' => true, 'hours_from' => '09:00', 'hours_to' => '23:00', 'days' => array(0, 1, 2, 3, 4, 5)));
is_same('ساعتِ خاموش = همیشه باز', phoenix_acc_chat_is_open($d, 3 * 60, 6), true);
is_same('۱۰ صبحِ شنبه باز', phoenix_acc_chat_is_open($h, 600, 0), true);
is_same('۸ صبح بسته', phoenix_acc_chat_is_open($h, 480, 0), false);
is_same('جمعه بسته', phoenix_acc_chat_is_open($h, 600, 6), false);
is_same('۲۳:۰۰ خودش بسته', phoenix_acc_chat_is_open($h, 23 * 60, 1), false);
$night = array_merge($h, array('hours_from' => '22:00', 'hours_to' => '02:00'));
is_same('بازه‌ی از نیمه‌شب گذشته: ۱ بامداد باز', phoenix_acc_chat_is_open($night, 60, 1), true);
is_same('بازه‌ی از نیمه‌شب گذشته: ظهر بسته', phoenix_acc_chat_is_open($night, 720, 1), false);
$act = array('سارا محمدی', 'امیر رضایی');
is_same('نامِ خواسته‌شده اگر فعال است', phoenix_acc_chat_pick_agent($act, 'امیر رضایی', 0), 'امیر رضایی');
is_same('نامِ ناشناخته → قرعه از فعال‌ها', in_array(phoenix_acc_chat_pick_agent($act, 'هکر', 7), $act, true), true);
is_same('بی‌فعال → «پشتیبانی»', phoenix_acc_chat_pick_agent(array(), 'x', 1), 'پشتیبانی');
is_same('{agent} جایگزین', phoenix_acc_chat_fill('وصلت می‌کنم به {agent}.', 'سارا'), 'وصلت می‌کنم به سارا.');

/* ============================================================ */
section('تلگرام: فقط رباتِ اعلان‌ها');

$r = phoenix_acc_tg_request('', '123:ABC', 'sendMessage', array('text' => 'سفارش'));
is_same('پیش‌فرض api.telegram.org', $r['url'], 'https://api.telegram.org/bot123:ABC/sendMessage');
is_same('متنِ فارسی خوانا در بدنه', strpos($r['body'], 'سفارش') !== false, true);
is_same('واسطه با / آخر', phoenix_acc_tg_request('https://tg.example.workers.dev/', 't', 'getMe', array())['url'], 'https://tg.example.workers.dev/bott/getMe');
$c = phoenix_acc_settings_clean(array('sms_provider' => 'telegram', 'sms_conn' => 'k_bot'), array('k_bot'));
is_same('کدِ ورود با تلگرام دیگر پذیرفته نیست', array($c['ok'], $c['data']['sms_provider'], $c['data']['sms_conn']), array(false, 'off', ''));
is_same('کلیدهای قدیمیِ تلگرام در تنظیماتِ ورود نیست', array_key_exists('tg_mode', phoenix_acc_settings_clean(array())['data']), false);
is_same('واسطه‌ی http رد (اعلان‌ها)', isset(phoenix_acc_notify_clean(array('tg_api' => 'http://x.dev'))['errors']['tg_api']), true);
is_same('وبهوکِ واسطه با پارامتر رد', isset(phoenix_acc_notify_clean(array('tg_hook' => 'https://x.dev/hook?to=evil'))['errors']['tg_hook']), true);
is_same('واسطه‌ی https پذیرفته', phoenix_acc_notify_clean(array('tg_api' => 'https://tg.x.workers.dev/'))['data']['tg_api'], 'https://tg.x.workers.dev');
is_same('نامِ ربات از ورودی گرفته نمی‌شود', phoenix_acc_notify_clean(array('tg_bot' => 'EvilBot'))['data']['tg_bot'], '');
is_same('گیرنده بی‌توکن رد', isset(phoenix_acc_notify_clean(array('tg_chats' => array(array('id' => '5550001'))), array('k'))['errors']['tg_conn']), true);
is_same('تلگرام خاموش: بی‌توکن مجاز', phoenix_acc_notify_clean(array('tg_on' => false, 'tg_chats' => array(array('id' => '5550001'))), array('k'))['ok'], true);
foreach (array('phoenix_acc_tg_phone', 'phoenix_acc_tg_parse', 'phoenix_acc_tg_link_input', 'phoenix_acc_tg_code_text', 'phoenix_acc_tg_contact_keyboard') as $gone) {
    is_same('برداشته شد: ' . $gone, function_exists($gone), false);
}

/* ============================================================ */
section('اعلان‌ها: تنظیمات');

$c = phoenix_acc_notify_clean(array(), array());
is_same('پیش‌فرض: خاموش، پرداخت و منتظرِ تأیید روشن، ثبتِ بی‌پرداخت خاموش', array($c['ok'], $c['data']['on'], $c['data']['events']['order_paid'], $c['data']['events']['order_on_hold'], $c['data']['events']['order_new'], $c['data']['show_inputs']), array(true, false, true, true, false, false));
$c = phoenix_acc_notify_clean(array('on' => true, 'tg_conn' => 'k_bot', 'tg_chats' => array(
    array('id' => '123456789', 'title' => 'من'), array('id' => '-1001234567890', 'title' => '<b>گروه</b>'), array('id' => '@phoenix_sales'), array('id' => '123456789'),
)), array('k_bot'));
is_same('سه گیرنده، تکراری حذف', array($c['ok'], array_column($c['data']['tg_chats'], 'id')), array(true, array('123456789', '-1001234567890', '@phoenix_sales')));
is_same('عنوان بی‌برچسب', $c['data']['tg_chats'][1]['title'] !== '<b>گروه</b>', true);
is_same('شناسه‌ی خراب رد', isset(phoenix_acc_notify_clean(array('tg_chats' => array(array('id' => '12; DROP'))))['errors']['tg_chats']), true);
is_same('اتصالِ ناموجود رد', isset(phoenix_acc_notify_clean(array('tg_conn' => 'nope'), array('k_bot'))['errors']['tg_conn']), true);
$many = array(); for ($k = 0; $k < 12; $k++) { $many[] = array('id' => (string) (100000 + $k)); }
is_same('بیش از ۱۰ گیرنده رد', array(isset(phoenix_acc_notify_clean(array('tg_chats' => $many))['errors']['tg_chats']), count(phoenix_acc_notify_clean(array('tg_chats' => $many))['data']['tg_chats'])), array(true, 10));
is_same('API: http رد', isset(phoenix_acc_notify_clean(array('hook_url' => 'http://x.dev/h'))['errors']['hook_url']), true);
is_same('API: نام‌کاربری در نشانی رد', isset(phoenix_acc_notify_clean(array('hook_url' => 'https://u:p@x.dev/h'))['errors']['hook_url']), true);
is_same('API روشن بی‌نشانی رد', isset(phoenix_acc_notify_clean(array('hook_on' => true))['errors']['hook_url']), true);
is_same('API با پارامتر پذیرفته', phoenix_acc_notify_clean(array('hook_on' => true, 'hook_url' => 'https://bot.x.dev/hook?k=1'))['ok'], true);

section('اعلان‌ها: متن');
$order = array('id' => 77, 'number' => '1204', 'total' => 1290000, 'currency' => 'IRT',
    'customer' => array('name' => 'علی <script>', 'phone' => '09121234567', 'email' => 'a@b.co'),
    'payment' => array('method' => 'زرین‌پال', 'transaction_id' => 'A1&B2'),
    'items' => array(array('item_id' => 1, 'name' => 'اسپاتیفای', 'qty' => 2, 'total' => 1040000,
        'inputs' => array(array('key' => 'ایمیلِ اکانت', 'value' => 'x@y.z'), array('key' => 'رمزِ اکانت', 'value' => 'hunter2'), array('key' => 'Password', 'value' => 'p')),
        'deliveries' => array(array('secret' => 'X')), 'stock_codes' => array('CODE-1'))),
    'admin_url' => 'https://panel.example/wp-admin/admin.php?page=phoenix-customers#/orders/77');
$sh = phoenix_acc_notify_shape($order, array('show_contact' => true, 'show_inputs' => true));
$tx = phoenix_acc_notify_text('order_paid', $sh);
is_same('عنوان و شماره‌ی سفارش و مبلغ', array(strpos($tx, 'پرداخت شد') !== false, strpos($tx, '#۱۲۰۴') !== false, strpos($tx, '۱٬۲۹۰٬۰۰۰ تومان') !== false), array(true, true, true));
is_same('نامِ مشتری escape شد', array(strpos($tx, '<script>'), strpos($tx, '&lt;script&gt;') !== false), array(false, true));
is_same('رمزِ اکانت هرگز در پیام', array(strpos($tx, 'hunter2'), strpos($tx, '>p<'), strpos($tx, 'x@y.z') !== false), array(false, false, true));
is_same('کد و رازِ تحویل حذف', array(isset($sh['items'][0]['deliveries']), isset($sh['items'][0]['stock_codes'])), array(false, false));
is_same('کدِ پیگیری escape', strpos($tx, 'A1&amp;B2') !== false, true);
is_same('پیوندِ پنل', strpos($tx, '<a href="https://panel.example/wp-admin/admin.php?page=phoenix-customers#/orders/77">') !== false, true);
$sh = phoenix_acc_notify_shape($order, array('show_contact' => false, 'show_inputs' => false));
$tx = phoenix_acc_notify_text('order_paid', $sh);
is_same('بی‌تماس و بی‌ورودی: نام می‌ماند', array(strpos($tx, '۰۹۱۲'), strpos($tx, 'a@b.co'), strpos($tx, 'x@y.z'), isset($sh['items'][0]['inputs']), strpos($tx, 'علی') !== false), array(false, false, false, false, true));
$big = $order; $big['items'] = array();
for ($k = 0; $k < 40; $k++) { $big['items'][] = array('name' => str_repeat('محصولِ بسیار طولانی ', 12), 'qty' => 1, 'total' => 1000); }
$tx = phoenix_acc_notify_text('order_paid', phoenix_acc_notify_shape($big, array()));
is_same('سفارشِ بزرگ زیرِ سقفِ تلگرام، پیوند می‌ماند', array(strlen($tx) <= 3800, strpos($tx, 'باز کردن در پنل') !== false, strpos($tx, 'قلمِ دیگر') !== false), array(true, true, true));
is_same('پیوندِ غیرِ http نه', strpos(phoenix_acc_notify_text('order_paid', array('admin_url' => 'javascript:alert(1)')), 'href'), false);
$tx = phoenix_acc_notify_text('ticket', array('ticket_id' => 9, 'subject' => 'کد کار نمی‌کند', 'phone' => '0912', 'excerpt' => 'سلام <i>'));
is_same('تیکت', array(strpos($tx, '#۹') !== false, strpos($tx, '&lt;i&gt;') !== false), array(true, true));
is_same('ریال', phoenix_acc_notify_money(5000, 'IRR'), '۵٬۰۰۰ ریال');
is_same('رمزگونه‌ها', array(phoenix_acc_notify_secretish('رمز عبور'), phoenix_acc_notify_secretish('کلمه‌ی عبور'), phoenix_acc_notify_secretish('PIN'), phoenix_acc_notify_secretish('کد تأیید'), phoenix_acc_notify_secretish('ایمیل'), phoenix_acc_notify_secretish('نام کاربری')), array(true, true, true, true, false, false));

section('اعلان‌ها: دوباره یا نه، امضا، کد');
is_same('شبکه → دوباره', phoenix_acc_notify_tg_verdict('phoenix_acc_tg_net', 'cURL error 28'), array('retry' => true, 'after' => 0));
is_same('۴۲۹ → دوباره بعد از retry_after', phoenix_acc_notify_tg_verdict('phoenix_acc_tg_api', 'Too Many Requests: retry after 30'), array('retry' => true, 'after' => 31));
is_same('ربات بیرون‌شده → نه', phoenix_acc_notify_tg_verdict('phoenix_acc_tg_api', 'Forbidden: bot was kicked from the group chat')['retry'], false);
is_same('گفتگو نیست → نه', phoenix_acc_notify_tg_verdict('phoenix_acc_tg_api', 'Bad Request: chat not found')['retry'], false);
is_same('۵۰۲ → دوباره', phoenix_acc_notify_tg_verdict('phoenix_acc_tg_api', 'HTTP 502')['retry'], true);
is_same('API: ۲۰۰/۴۰۴/۴۲۹/۵۰۳/شبکه', array_map('phoenix_acc_notify_hook_verdict', array(200, 404, 429, 503, 0)), array('sent', 'failed', 'retry', 'retry', 'retry'));
is_same('فاصله‌ها', array_map('phoenix_acc_notify_backoff', array(1, 2, 3, 4, 5, 9)), array(60, 300, 900, 3600, 10800, 10800));
is_same('امضا = HMAC(زمان.بدنه)', phoenix_acc_notify_sign('s3cret', 1700000000, '{"a":1}'), 'sha256=' . hash_hmac('sha256', '1700000000.{"a":1}', 's3cret'));
$code = 'ph_ab12cd34ef';
$u = array('message' => array('chat' => array('id' => 555, 'type' => 'private', 'first_name' => 'علی'), 'text' => '/start ' . $code));
is_same('کد در گفتگوی خصوصی', phoenix_acc_notify_find_code($u, $code), array('id' => '555', 'title' => 'علی', 'type' => 'private'));
$u = array('message' => array('chat' => array('id' => -1009876543210, 'type' => 'supergroup', 'title' => 'فروش'), 'text' => '/start@PhoenixShopBot ' . $code));
is_same('کد در گروه', phoenix_acc_notify_find_code($u, $code)['id'], '-1009876543210');
$u = array('channel_post' => array('chat' => array('id' => -1001, 'type' => 'channel', 'title' => 'سفارش‌ها'), 'text' => $code));
is_same('کد در کانال', phoenix_acc_notify_find_code($u, $code)['title'], 'سفارش‌ها');
is_same('کدِ دیگر نه', phoenix_acc_notify_find_code(array('message' => array('chat' => array('id' => 1), 'text' => '/start ph_zzzzzzzzzz')), $code), null);
is_same('کد چسبیده به متنِ دیگر نه', phoenix_acc_notify_find_code(array('message' => array('chat' => array('id' => 1), 'text' => 'x' . $code)), $code), null);
is_same('کدِ بدشکل نه', phoenix_acc_notify_find_code(array('message' => array('chat' => array('id' => 1), 'text' => '.*')), '.*'), null);

/* ============================================================ */
section('کد با ایمیل و مشتریِ تازه از پنل');

$m = phoenix_acc_otp_email_text('482913', 120);
is_same('ایمیلِ کد: موضوع و متن', array(strpos($m['subject'], '482913') !== false, strpos($m['body'], '۲ دقیقه') !== false, strpos($m['body'], 'هرگز کد را از شما نمی‌خواهد') !== false), array(true, true, true));
is_same('خاموش → سایت چیزی نمی‌گوید', phoenix_acc_otp_email_extra(array(), 'off', false), array());
is_same('بی‌سامانه، ایمیل تنها راه', phoenix_acc_otp_email_extra(array(), 'off', true), array('channel' => 'email'));
is_same('کنارِ تلگرام', phoenix_acc_otp_email_extra(array('channel' => 'telegram', 'bot' => 'B'), 'telegram', true), array('channel' => 'telegram', 'bot' => 'B', 'also' => 'email'));
is_same('کنارِ پیامک', phoenix_acc_otp_email_extra(array(), 'kavenegar', true), array('also' => 'email'));
is_same('گزینه ذخیره می‌شود', array(phoenix_acc_settings_clean(array('otp_email' => true))['data']['otp_email'], phoenix_acc_settings_clean(array())['data']['otp_email']), array(true, false));

$v = phoenix_acc_admin_customer_clean(array('name' => 'مشتریِ <b>آزمایشی</b>', 'email' => 'Test@Example.COM', 'password' => 'Phoenix2026'), '09121234567');
is_same('مشتریِ تازه: درست، ایمیل کوچک، نام بی‌برچسب', array($v['ok'], $v['data']['email'], strpos($v['data']['name'], '<b>')), array(true, 'test@example.com', false));
is_same('شماره‌ی خراب رد', isset(phoenix_acc_admin_customer_clean(array(), '')['errors']['phone']), true);
is_same('ایمیلِ خراب رد', isset(phoenix_acc_admin_customer_clean(array('email' => 'a@b'), '09121234567')['errors']['email']), true);
is_same('ایمیل با برچسب رد', isset(phoenix_acc_admin_customer_clean(array('email' => 'a<x>@b.co'), '09121234567')['errors']['email']), true);
is_same('رمزِ ضعیف رد (همان قاعده‌ی سایت)', isset(phoenix_acc_admin_customer_clean(array('password' => '12345678'), '09121234567')['errors']['password']), true);
is_same('بی‌رمز مجاز', phoenix_acc_admin_customer_clean(array('name' => 'x'), '09121234567')['ok'], true);

printf("\n%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] ? 1 : 0);
