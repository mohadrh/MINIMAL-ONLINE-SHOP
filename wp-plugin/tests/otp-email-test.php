<?php
/**
 * تستِ کدِ ورود با ایمیل — خودِ includes/sms.php روی وردپرسِ ساختگی.
 *
 *   ۱ فقط به ایمیلِ پرونده‌ی همان شماره؛ مسدود نه
 *   ۲ «خاموش» + ایمیل: پاسخِ سایت برای شماره‌ی بی‌ایمیل همان «فرستاده شد»
 *      — وگرنه معلوم می‌شد کدام شماره حساب دارد
 *   ۳ کنارِ آزمایشی/تلگرام: راهِ اصلی همان، ایمیل اضافه
 *
 * اجرا:  php wp-plugin/tests/otp-email-test.php
 */

define('ABSPATH', __DIR__);
define('MINUTE_IN_SECONDS', 60);
define('DAY_IN_SECONDS', 86400);
$GLOBALS['opts'] = array();
$GLOBALS['mail'] = array();
$GLOBALS['customers'] = array(
    '09121111111' => (object) array('phone' => '09121111111', 'email' => 'ali@example.com', 'blocked' => 0),
    '09122222222' => (object) array('phone' => '09122222222', 'email' => '', 'blocked' => 0),
    '09123333333' => (object) array('phone' => '09123333333', 'email' => 'blocked@example.com', 'blocked' => 1),
);
$GLOBALS['tg'] = array();
function add_filter() {}
function get_option($k, $d = false) { return $GLOBALS['opts'][$k] ?? $d; }
function update_option($k, $v) { $GLOBALS['opts'][$k] = $v; }
function phoenix_acc_setting($k) { return $GLOBALS['opts']['acc'][$k] ?? null; }
function phoenix_acc_customer($phone) { return $GLOBALS['customers'][$phone] ?? null; }
function is_email($e) { return filter_var($e, FILTER_VALIDATE_EMAIL) ? $e : false; }
function wp_mail($to, $subject, $body) { $GLOBALS['mail'][] = array($to, $subject, $body); return true; }
function get_transient() { return false; }
function phoenix_acc_tg_send_code($phone, $code) { $GLOBALS['tg'][] = array($phone, $code); return true; }
require_once __DIR__ . '/../phoenix-account/includes/core.php';
require_once __DIR__ . '/../phoenix-account/includes/sms.php';

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;
function is_same($label, $got, $want) {
    if ($got === $want) { $GLOBALS['pass']++; printf("  ok    %s\n", $label); return; }
    $GLOBALS['fail']++;
    printf("  FAIL  %s\n        got  %s\n        want %s\n", $label, json_encode($got, JSON_UNESCAPED_UNICODE), json_encode($want, JSON_UNESCAPED_UNICODE));
}

echo "\n== خاموش + ایمیل ==\n";
$GLOBALS['opts']['acc'] = array('sms_provider' => 'off', 'otp_email' => true);
is_same('شماره با ایمیل: رسید', phoenix_acc_send_otp(null, '09121111111', '111111'), true);
is_same('به ایمیلِ پرونده، با کد', array($GLOBALS['mail'][0][0], strpos($GLOBALS['mail'][0][1], '111111') !== false), array('ali@example.com', true));
$GLOBALS['mail'] = array();
is_same('شماره‌ی بی‌ایمیل: پاسخ همان', phoenix_acc_send_otp(null, '09122222222', '222222'), true);
is_same('ولی هیچ ایمیلی نرفت', count($GLOBALS['mail']), 0);
is_same('شماره‌ی ناشناخته: پاسخ همان', phoenix_acc_send_otp(null, '09129999999', '333333'), true);
is_same('حسابِ بسته: ایمیل نه', array(phoenix_acc_send_otp(null, '09123333333', '444444'), count($GLOBALS['mail'])), array(true, 0));

echo "\n== خاموش، بی‌ایمیل: رفتارِ قبلی ==\n";
$GLOBALS['opts']['acc'] = array('sms_provider' => 'off', 'otp_email' => false);
is_same('همان رفتارِ Bridge', phoenix_acc_send_otp(null, '09121111111', '555555'), null);
is_same('ایمیلی نرفت', count($GLOBALS['mail']), 0);

echo "\n== کنارِ راهِ اصلی ==\n";
$GLOBALS['opts']['acc'] = array('sms_provider' => 'telegram', 'otp_email' => true);
is_same('تنظیمِ کهنه‌ی «telegram»: فقط ایمیل — هیچ کدی به تلگرام نه', array(phoenix_acc_send_otp(null, '09121111111', '666666'), count($GLOBALS['tg']), count($GLOBALS['mail'])), array(true, 0, 1));
$GLOBALS['opts']['acc'] = array('sms_provider' => 'dev', 'otp_email' => true);
phoenix_acc_send_otp(null, '09121111111', '777777');
is_same('آزمایشی + ایمیل: کد در پنل هم هست', array(count($GLOBALS['mail']), get_option(PHOENIX_ACC_DEVLOG)[0]['code']), array(2, '777777'));

printf("\n%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] ? 1 : 0);
