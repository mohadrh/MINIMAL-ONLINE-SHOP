<?php
/**
 * بررسی سازگاری هاست با ووکامرس و افزونه‌ی فونیکس
 *
 * ============================================================
 * چطور استفاده کنید:
 *
 *   ۱ این فایل را در پوشه‌ی public_html هاست آپلود کنید
 *   ۲ در مرورگر باز کنید: https://دامنه‌شما/hostcheck.php
 *   ۳ نتیجه را ببینید
 *   ۴ ⚠ بعدش حتماً پاکش کنید
 *
 * چرا باید پاک شود: این فایل نسخه‌ی PHP، مسیرها و افزونه‌های
 * سرور را نشان می‌دهد. برای کسی که دنبال راه نفوذ است، همین
 * فهرست نقطه‌ی شروع است. برای همین خودش هم بعد از نمایش هشدار
 * می‌دهد.
 * ============================================================
 */

header('Content-Type: text/html; charset=utf-8');

/* ---------- بررسی‌ها ---------- */

$checks = array();

function check($name, $ok, $actual, $need, $why, $fatal = true) {
    global $checks;
    $checks[] = array(
        'name'   => $name,
        'ok'     => $ok,
        'actual' => $actual,
        'need'   => $need,
        'why'    => $why,
        'fatal'  => $fatal,
    );
}

/* نسخه‌ی PHP */
$php = PHP_VERSION;
check(
    'نسخه‌ی PHP',
    version_compare($php, '8.0', '>='),
    $php,
    '۸٫۰ یا بالاتر',
    'ووکامرس جدید روی PHP قدیمی اجرا نمی‌شود. اگر پایین‌تر است، معمولاً از پنل هاست قابل تغییر است.'
);

/* حافظه */
$mem_raw = ini_get('memory_limit');
$mem = (int) $mem_raw;
if (strpos(strtolower($mem_raw), 'g') !== false) {
    $mem *= 1024;
}
check(
    'حافظه‌ی PHP',
    $mem >= 256 || $mem === -1,
    $mem_raw,
    'دست‌کم ۲۵۶M',
    'ووکامرس با ۱۲۸M در صفحه‌ی محصولات یا هنگام بروزرسانی می‌افتد. مهم‌ترین عددِ این فهرست.'
);

/* زمان اجرا */
$exec = (int) ini_get('max_execution_time');
check(
    'حداکثر زمان اجرا',
    $exec >= 60 || $exec === 0,
    $exec === 0 ? 'بی‌نهایت' : $exec . ' ثانیه',
    'دست‌کم ۶۰ ثانیه',
    'نصب افزونه و ایمپورت محصول از این بیشتر طول می‌کشد.',
    false
);

/* حجم آپلود */
$upl = ini_get('upload_max_filesize');
check(
    'حداکثر حجم آپلود',
    (int) $upl >= 8,
    $upl,
    'دست‌کم ۸M',
    'برای آپلود تصویر محصول و فایل افزونه.',
    false
);

/* دیتابیس */
check(
    'افزونه‌ی MySQL',
    extension_loaded('mysqli') || extension_loaded('pdo_mysql'),
    (extension_loaded('mysqli') ? 'mysqli ' : '') . (extension_loaded('pdo_mysql') ? 'pdo_mysql' : ''),
    'mysqli یا pdo_mysql',
    'بدون این وردپرس اصلاً نصب نمی‌شود.'
);

/* افزونه‌های لازم ووکامرس */
$need_ext = array(
    'curl'     => 'برای تماس با درگاه پرداخت و سرویس پیامک',
    'json'     => 'برای REST API',
    'mbstring' => 'برای متن فارسی — بدون این حروف به‌هم می‌ریزند',
    'openssl'  => 'برای HTTPS و رمزنگاری',
    'gd'       => 'برای ساخت تصویر بندانگشتی محصول',
    'zip'      => 'برای نصب افزونه و قالب',
    'xml'      => 'برای ایمپورت و اکسپورت',
);
foreach ($need_ext as $ext => $why) {
    check(
        'افزونه‌ی ' . $ext,
        extension_loaded($ext),
        extension_loaded($ext) ? 'هست' : 'نیست',
        'باید فعال باشد',
        $why,
        in_array($ext, array('curl', 'json', 'mbstring', 'openssl'), true)
    );
}

/* HTTPS */
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
check(
    'HTTPS',
    $https,
    $https ? 'فعال' : 'غیرفعال',
    'باید فعال باشد',
    'هیچ درگاه پرداختی روی HTTP وصل نمی‌شود. اگر گواهی رایگان دارید، از پنل هاست فعالش کنید.'
);

/* بازنویسی آدرس */
$rewrite = function_exists('apache_get_modules')
    ? in_array('mod_rewrite', apache_get_modules(), true)
    : null;
check(
    'بازنویسی آدرس',
    $rewrite !== false,
    $rewrite === null ? 'قابل تشخیص نیست' : ($rewrite ? 'فعال' : 'غیرفعال'),
    'mod_rewrite یا معادلش',
    'برای آدرس‌های تمیز و REST API. اگر Nginx است، معمولاً خودش تنظیم است.',
    false
);

/* نوشتن روی دیسک */
$writable = is_writable(__DIR__);
check(
    'اجازه‌ی نوشتن',
    $writable,
    $writable ? 'دارد' : 'ندارد',
    'باید داشته باشد',
    'برای آپلود تصویر و نصب افزونه.'
);

/* فضای دیسک */
$free = @disk_free_space(__DIR__);
if ($free !== false) {
    $gb = round($free / 1073741824, 2);
    check(
        'فضای آزاد',
        $free > 1073741824,
        $gb . ' گیگابایت',
        'دست‌کم ۱ گیگ',
        'وردپرس و ووکامرس حدود ۲۰۰ مگ می‌گیرند؛ بقیه برای تصویر محصول و پشتیبان.',
        false
    );
}

/* Node — فقط اطلاعاتی */
$node = @shell_exec('node -v 2>&1');
$has_node = $node && strpos($node, 'v') === 0;
check(
    'Node.js',
    true, // شکست حساب نمی‌شود
    $has_node ? trim($node) : 'نیست یا در دسترس نیست',
    'اختیاری',
    $has_node
        ? 'اگر Node دارید، می‌توانید خودِ سایت را هم این‌جا میزبانی کنید و تغییرات فوری اعمال شوند.'
        : 'مشکلی نیست — سایت به‌صورت ایستا روی GitHub Pages می‌ماند و کاتالوگ در زمان بیلد همگام می‌شود.',
    false
);

/* ---------- شمارش ---------- */

$fail_fatal = 0;
$fail_soft  = 0;
foreach ($checks as $c) {
    if (!$c['ok']) {
        if ($c['fatal']) {
            $fail_fatal++;
        } else {
            $fail_soft++;
        }
    }
}

?><!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>بررسی هاست — فونیکس شاپ</title>
<style>
  body{font-family:Tahoma,system-ui,sans-serif;background:#f5f7fc;color:#14151b;
       margin:0;padding:24px;line-height:1.9}
  .box{max-width:820px;margin:0 auto;background:#fff;border:1px solid #e2e7f2;
       border-radius:16px;padding:24px}
  h1{font-size:22px;margin:0 0 4px}
  .sub{color:#5a6270;font-size:14px;margin:0 0 20px}
  .verdict{padding:14px 16px;border-radius:12px;margin-bottom:20px;font-weight:bold}
  .good{background:#eaf7f1;color:#1a7f4b}
  .warn{background:#fdf4e7;color:#8a5a00}
  .bad{background:#fdecec;color:#a11}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:right;padding:10px 8px;border-bottom:1px solid #eef1f8;vertical-align:top}
  th{color:#5a6270;font-weight:normal;font-size:12px}
  .ok{color:#1a7f4b;font-weight:bold}
  .no{color:#a11;font-weight:bold}
  .soft{color:#8a5a00;font-weight:bold}
  .why{color:#5a6270;font-size:12.5px}
  .danger{margin-top:22px;padding:14px 16px;background:#fdecec;color:#a11;
          border-radius:12px;font-size:14px}
  code{background:#f0f2f8;padding:2px 6px;border-radius:5px;direction:ltr;
       display:inline-block;font-family:monospace}
</style>
</head>
<body>
<div class="box">
  <h1>بررسی سازگاری هاست</h1>
  <p class="sub">برای ووکامرس و افزونه‌ی فونیکس</p>

  <?php if ($fail_fatal === 0 && $fail_soft === 0): ?>
    <div class="verdict good">✓ هاست کاملاً مناسب است. می‌توانید وردپرس را نصب کنید.</div>
  <?php elseif ($fail_fatal === 0): ?>
    <div class="verdict warn">
      ✓ هاست کار می‌کند، ولی <?php echo $fail_soft; ?> مورد بهتر است درست شود.
      هیچ‌کدام مانع نصب نیست.
    </div>
  <?php else: ?>
    <div class="verdict bad">
      ✗ <?php echo $fail_fatal; ?> مورد باید حل شود، وگرنه فروشگاه درست کار نمی‌کند.
      بیشترشان از پنل هاست یا با یک تیکت به پشتیبانی قابل تغییرند.
    </div>
  <?php endif; ?>

  <table>
    <thead>
      <tr><th>مورد</th><th>وضعیت</th><th>الان</th><th>لازم</th></tr>
    </thead>
    <tbody>
    <?php foreach ($checks as $c): ?>
      <tr>
        <td>
          <?php echo htmlspecialchars($c['name'], ENT_QUOTES, 'UTF-8'); ?>
          <div class="why"><?php echo htmlspecialchars($c['why'], ENT_QUOTES, 'UTF-8'); ?></div>
        </td>
        <td class="<?php echo $c['ok'] ? 'ok' : ($c['fatal'] ? 'no' : 'soft'); ?>">
          <?php echo $c['ok'] ? '✓' : ($c['fatal'] ? '✗' : '!'); ?>
        </td>
        <td><code><?php echo htmlspecialchars((string) $c['actual'], ENT_QUOTES, 'UTF-8'); ?></code></td>
        <td class="why"><?php echo htmlspecialchars($c['need'], ENT_QUOTES, 'UTF-8'); ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>

  <div class="danger">
    ⚠ <strong>این فایل را حالا پاک کنید.</strong>
    نسخه‌ی PHP و فهرست افزونه‌های سرور را نشان می‌دهد، و برای کسی که
    دنبال راه نفوذ است همین فهرست نقطه‌ی شروع است.
  </div>
</div>
</body>
</html>
