<?php
/**
 * تستِ تحویلِ دستی — اعتبارسنجی و پوشاندن.
 *
 * اجرا:  php wp-plugin/tests/delivery-test.php
 */

define('ABSPATH', __DIR__);
require_once __DIR__ . '/../phoenix-bridge/includes/delivery.php';

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;
function is_same($label, $got, $want) {
    if ($got === $want) { $GLOBALS['pass']++; printf("  ok    %s\n", $label); return; }
    $GLOBALS['fail']++;
    printf("  FAIL  %s\n        got  %s\n        want %s\n", $label,
        json_encode($got, JSON_UNESCAPED_UNICODE), json_encode($want, JSON_UNESCAPED_UNICODE));
}
function section($t) { echo "\n== {$t} ==\n"; }
function err($in, $f) { $r = phoenix_delivery_clean($in); return isset($r['errors'][$f]) ? true : ($r['ok'] ? 'ok' : array_keys($r['errors'])); }

section('نوع');
is_same('بی‌نوع رد', err(array(), 'kind'), true);
is_same('نوعِ ناشناخته رد', err(array('kind' => 'gift'), 'kind'), true);
is_same('ورودیِ غیرِ آرایه رد', phoenix_delivery_clean('code')['ok'], false);

section('کد');
is_same('کدِ خالی رد', err(array('kind' => 'code'), 'code'), true);
is_same('کد با شکستِ خط رد', err(array('kind' => 'code', 'code' => "AAA\nBBB"), 'code'), true);
$r = phoenix_delivery_clean(array('kind' => 'code', 'code' => '  ABCD-1234  '));
is_same('کدِ درست، فاصله‌ی دور حذف', $r['data']['secret'], array('code' => 'ABCD-1234'));

section('اکانت');
is_same('بی‌پسورد رد', err(array('kind' => 'account', 'username' => 'a@b.c'), 'password'), true);
is_same('بی‌یوزر رد', err(array('kind' => 'account', 'password' => 'x'), 'username'), true);
$r = phoenix_delivery_clean(array('kind' => 'account', 'username' => 'ali@mail.com', 'password' => 'a<b&c"d'));
is_same('پسوردِ با نویسه‌ی خاص دست‌نخورده', $r['data']['secret']['password'], 'a<b&c"d');
is_same('اکانتِ درست', $r['ok'], true);

section('لینک و ارتقا');
is_same('لینکِ http رد', err(array('kind' => 'link', 'url' => 'http://x.com/a'), 'url'), true);
is_same('لینکِ javascript رد', err(array('kind' => 'link', 'url' => 'javascript:alert(1)'), 'url'), true);
is_same('لینکِ https درست', phoenix_delivery_clean(array('kind' => 'link', 'url' => 'https://x.com/invite/abc'))['ok'], true);
is_same('ارتقا بی‌یادداشت رد', err(array('kind' => 'upgrade'), 'note'), true);
$r = phoenix_delivery_clean(array('kind' => 'upgrade', 'note' => 'روی ali@mail.com فعال شد'));
is_same('ارتقا راز ندارد', array($r['ok'], $r['data']['secret']), array(true, array()));

section('یادداشت و تاریخ');
$r = phoenix_delivery_clean(array('kind' => 'code', 'code' => 'X', 'note' => "خط ۱\n<script>x</script>خط ۲\x07"));
is_same('تگ و نویسه‌ی کنترلی بیرون، شکستِ خط می‌ماند', $r['data']['note'], "خط ۱\nxخط ۲");
is_same('یادداشتِ خیلی بلند بریده', mb_strlen(phoenix_delivery_clean(array('kind' => 'code', 'code' => 'X', 'note' => str_repeat('ب', 2000)))['data']['note']), 1000);
is_same('تاریخِ منفی رد', err(array('kind' => 'code', 'code' => 'X', 'until' => -5), 'until'), true);
is_same('تاریخِ بی‌معنا رد', err(array('kind' => 'code', 'code' => 'X', 'until' => 12345), 'until'), true);
is_same('تاریخِ درست می‌ماند', phoenix_delivery_clean(array('kind' => 'code', 'code' => 'X', 'until' => 1893456000))['data']['until'], 1893456000);

section('پوشاندن');
$m = phoenix_delivery_mask(array('username' => 'ali@mail.com', 'password' => 'secret123', 'code' => 'AB'));
is_same('یوزر: دو حرفِ اول پیدا', mb_substr($m['username'], 0, 2), 'al');
is_same('یوزر: بقیه پوشیده', strpos($m['username'], 'mail') === false, true);
is_same('پسورد کاملاً پوشیده، طولِ ثابت', $m['password'], str_repeat('•', 8));
is_same('کدِ کوتاه هم همان طول', $m['code'], str_repeat('•', 8));
$m2 = phoenix_delivery_mask(array('username' => 'ab@x.io', 'password' => str_repeat('p', 40)));
is_same('طولِ یوزر از پوشیده پیدا نیست', mb_strlen($m['username']), mb_strlen($m2['username']));
is_same('پسوردِ بلند هم همان طول', $m2['password'], str_repeat('•', 8));
is_same('یوزرِ خیلی کوتاه کاملاً پوشیده', phoenix_delivery_mask(array('username' => 'abc'))['username'], str_repeat('•', 8));

section('ورودی‌های ثبتِ سفارش');
$in = phoenix_order_inputs_clean(array(
    'ایمیلِ اکانت'      => ' ali@mail.com ',
    '_phoenix_delivery' => 'حمله',
    '_qty'              => '99',
    str_repeat('k', 61) => 'x',
    "a\nb"              => 'x',
    'x<script>'         => 'x',
    'telegram_id'       => array('nested'),
    'flag'              => true,
    'note'              => "خط\x07" . str_repeat('ی', 400),
));
is_same('فقط کلیدهای ساده', array_keys($in), array('ایمیلِ اکانت', 'note'));
is_same('فاصله‌ی دور حذف', $in['ایمیلِ اکانت'], 'ali@mail.com');
is_same('مقدار بریده و بی‌نویسه‌ی کنترلی', array(mb_strlen($in['note']), strpos($in['note'], "\x07")), array(300, false));
is_same('غیرِ آرایه → خالی', phoenix_order_inputs_clean('x'), array());
$many = array();
for ($i = 0; $i < 30; $i++) { $many['k' . $i] = 'v'; }
is_same('حداکثر ده ورودی', count(phoenix_order_inputs_clean($many)), 10);

printf("\n%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] ? 1 : 0);
