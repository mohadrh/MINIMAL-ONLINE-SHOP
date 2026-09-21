<?php
/**
 * تستِ منطقِ قیمت و تخفیف — بدونِ وردپرس.
 *
 * ⚠ چرا با وردپرسِ قلابی و نه با نصبِ واقعی
 *
 * چیزی که این‌جا تست می‌شود ریاضیِ محض است: رُند، عددِ جذاب،
 * ارثِ حاشیه، برخوردِ تخفیف‌ها، و کفِ قیمت. هیچ‌کدام به
 * پایگاه داده کار ندارند. با یک نصبِ واقعی هم همین‌ها را تست
 * می‌کردیم، فقط صد برابر کندتر و با نویزِ ووکامرس وسطش.
 *
 * چیزهایی که این‌جا تست *نمی‌شوند* و باید روی نصبِ واقعی
 * دیده شوند: نوشتنِ قیمت روی محصول، قفلِ سبد، صف، و پنل.
 *
 * اجرا:  php wp-plugin/tests/pricing-test.php
 */

/* ============================================================
   وردپرسِ قلابی — فقط همان چند تابعی که مسیرِ محاسبه لازم دارد
   ============================================================ */

define('ABSPATH', __DIR__);
define('MINUTE_IN_SECONDS', 60);
define('HOUR_IN_SECONDS', 3600);
define('PHOENIX_BRIDGE_VERSION', 'test');
define('PHOENIX_META_KEY', '_phoenix');

$GLOBALS['fake_meta']    = array();   // post_id => fields
$GLOBALS['fake_parent']  = array();   // post_id => parent_id
$GLOBALS['fake_terms']   = array();   // post_id => [taxonomy => [term_id]]
$GLOBALS['fake_anc']     = array();   // term_id => [ancestors]
$GLOBALS['fake_options'] = array();

function phoenix_get_fields($id)          { return $GLOBALS['fake_meta'][$id] ?? array(); }
function wp_get_post_parent_id($id)       { return $GLOBALS['fake_parent'][$id] ?? 0; }
function get_ancestors($tid, $tax, $type) { return $GLOBALS['fake_anc'][$tid] ?? array(); }

function get_the_terms($id, $tax) {
    $ids = $GLOBALS['fake_terms'][$id][$tax] ?? array();
    if (!$ids) { return false; }
    return array_map(function ($t) { return (object) array('term_id' => $t); }, $ids);
}

function get_option($k, $d = false)      { return $GLOBALS['fake_options'][$k] ?? $d; }
function update_option($k, $v, $a = null){ $GLOBALS['fake_options'][$k] = $v; return true; }
function get_transient($k)               { return false; }
function set_transient($k, $v, $t = 0)   { return true; }
function apply_filters($tag, $value)     { return $value; }
function add_action()                    {}
function add_filter()                    {}
function wp_next_scheduled()             { return false; }
function wp_schedule_single_event()      { return true; }
function sanitize_key($k)                { return preg_replace('/[^a-z0-9_\-]/', '', strtolower((string) $k)); }
function sanitize_text_field($s)         { return trim(strip_tags((string) $s)); }
function number_format_i18n($n, $d = 0)  { return number_format((float) $n, $d); }
function wp_json_encode($v, $f = 0)      { return json_encode($v, $f); }
function current_time()                  { return gmdate('Y-m-d H:i:s'); }
function wp_get_current_user()           { return null; }
function phoenix_audit()                 {}
function phoenix_rate_value()            { return $GLOBALS['fake_rate'] ?? 0; }
function wc_get_product()                { return null; }
function phoenix_table_audit()           { return 'x'; }

/* تنظیمات — همان قراردادِ db.php، بدونِ پایگاه داده */
const PHOENIX_SETTINGS_OPTION = 'phoenix_pricing_settings';

function phoenix_settings_defaults() {
    return array(
        'engine_on' => false, 'floor_percent' => 5,
        'margin' => phoenix_margin_defaults(),
        'margin_by_cat' => array(), 'margin_by_prod' => array(),
        'discounts' => array(),
    );
}
function phoenix_margin_defaults() {
    return array('percent' => 18.0, 'fixed' => 0, 'min_profit' => 0,
                 'round_to' => 1000, 'round_mode' => 'up', 'charm' => 0);
}
function phoenix_settings() {
    return array_merge(phoenix_settings_defaults(), $GLOBALS['fake_settings'] ?? array());
}
function phoenix_setting($k, $f = null) {
    $s = phoenix_settings();
    return array_key_exists($k, $s) ? $s[$k] : $f;
}
function phoenix_settings_save() {}

/* ============================================================
   کدِ واقعی
   ============================================================ */

require_once __DIR__ . '/../phoenix-bridge/includes/discounts.php';

/* pricing.php قلاب‌های ووکامرس را ثبت می‌کند که این‌جا
   بی‌اثرند (add_action خالی است)، ولی توابعِ محاسبه واقعی‌اند. */
require_once __DIR__ . '/../phoenix-bridge/includes/pricing.php';

/* ============================================================
   چارچوبِ تست
   ============================================================ */

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;

function is_same($label, $got, $want) {
    if ($got === $want) {
        $GLOBALS['pass']++;
        printf("  ok    %-58s %s\n", $label, var_export($got, true));
        return;
    }
    $GLOBALS['fail']++;
    printf("  FAIL  %-58s got %s, want %s\n", $label, var_export($got, true), var_export($want, true));
}

function reset_world() {
    $GLOBALS['fake_meta']     = array();
    $GLOBALS['fake_parent']   = array();
    $GLOBALS['fake_terms']    = array();
    $GLOBALS['fake_anc']      = array();
    $GLOBALS['fake_settings'] = array();
    $GLOBALS['fake_rate']     = 100000;
}

function section($t) { echo "\n== {$t} ==\n"; }

/* ============================================================
   ۱ رُند
   ============================================================ */

section('رُند');
reset_world();

is_same('بالا: ۱۲۳۴۵۶۷ با پله‌ی ۱۰۰۰',   phoenix_round_price(1234567, 1000, 'up'), 1235000);
is_same('پایین: ۱۲۳۴۵۶۷ با پله‌ی ۱۰۰۰',  phoenix_round_price(1234567, 1000, 'down'), 1234000);
is_same('نزدیک: ۱۲۳۴۴۹۹ با پله‌ی ۱۰۰۰',  phoenix_round_price(1234499, 1000, 'nearest'), 1234000);
is_same('نزدیک: ۱۲۳۴۵۰۰ با پله‌ی ۱۰۰۰',  phoenix_round_price(1234500, 1000, 'nearest'), 1235000);
is_same('پله‌ی صفر نباید تقسیم بر صفر کند', phoenix_round_price(1234, 0, 'up'), 1234);
is_same('عددِ دقیقاً روی پله، بالا نمی‌رود', phoenix_round_price(1235000, 1000, 'up'), 1235000);

/* ============================================================
   ۲ عددِ جذاب
   ============================================================ */

section('عددِ جذاب');

is_same('۱۲۴۰۰۰۰ با پله ۱۰۰۰۰ و جذابِ ۹۰۰۰', phoenix_charm_price(1240000, 10000, 9000), 1239000);
is_same('۱۲۳۹۰۰۰ همان می‌ماند',                phoenix_charm_price(1239000, 10000, 9000), 1239000);
/* ⚠ مهم‌ترین تستِ این بخش: هیچ‌وقت بالاتر از عددِ ورودی */
is_same('۱۲۳۱۰۰۰ نباید به ۱۲۳۹۰۰۰ *بالا* برود', phoenix_charm_price(1231000, 10000, 9000), 1229000);
is_same('جذابِ صفر یعنی خاموش',                 phoenix_charm_price(1240000, 10000, 0), 1240000);
is_same('نتیجه هیچ‌وقت منفی نمی‌شود',            phoenix_charm_price(5000, 10000, 9000), 0);

/* ============================================================
   ۳ محدودکردنِ حاشیه
   ============================================================ */

section('محدودکردنِ حاشیه');

$m = phoenix_margin_sanitize(array('percent' => 1800, 'round_to' => 0, 'round_mode' => 'sideways', 'charm' => 99999));
is_same('درصدِ ۱۸۰۰ به سقفِ ۵۰۰ می‌خورد', $m['percent'], 500.0);
is_same('پله‌ی صفر می‌شود ۱',              $m['round_to'], 1);
is_same('جهتِ ناشناخته می‌شود up',         $m['round_mode'], 'up');
is_same('جذاب از پله بزرگ‌تر نمی‌شود',      $m['charm'], 0);

$m2 = phoenix_margin_sanitize(array('percent' => -300, 'fixed' => -5000));
is_same('درصدِ منفیِ افراطی به کفِ ۹۰− می‌خورد', $m2['percent'], -90.0);
is_same('مبلغِ ثابتِ منفی صفر می‌شود',            $m2['fixed'], 0);

/* ============================================================
   ۴ ارثِ حاشیه: محصول ← دسته ← پیش‌فرض
   ============================================================ */

section('ارثِ حاشیه');
reset_world();

$GLOBALS['fake_terms'][10] = array('product_cat' => array(7));
$GLOBALS['fake_settings'] = array(
    'margin'        => array('percent' => 18.0, 'round_to' => 1000, 'charm' => 0),
    'margin_by_cat' => array(7 => array('percent' => 30.0)),
    'margin_by_prod'=> array(10 => array('charm' => 900)),
);

$m = phoenix_margin_for(10);
is_same('درصد از دسته می‌آید',                      $m['percent'], 30.0);
is_same('جذاب از خودِ محصول می‌آید',                 $m['charm'], 900);
is_same('پله از پیش‌فرضِ کل می‌آید (ادغامِ فیلدی)',   $m['round_to'], 1000);

/* واریاسیون: دسته روی والد است، نه روی خودش */
$GLOBALS['fake_parent'][11] = 10;
$m = phoenix_margin_for(11);
is_same('واریاسیون درصدِ دسته‌ی والد را می‌گیرد', $m['percent'], 30.0);

/* دو دسته با حاشیه → کوچک‌ترین term_id، قطعی و تکرارپذیر */
reset_world();
$GLOBALS['fake_terms'][10] = array('product_cat' => array(9, 4));
$GLOBALS['fake_settings'] = array('margin_by_cat' => array(
    9 => array('percent' => 50.0),
    4 => array('percent' => 20.0),
));
is_same('دو دسته → کوچک‌ترین شناسه برنده', phoenix_margin_for(10)['percent'], 20.0);

/* ============================================================
   ۵ محاسبه‌ی کامل
   ============================================================ */

section('محاسبه‌ی کامل');
reset_world();

$GLOBALS['fake_meta'][20] = array('price_mode' => 'usd', 'cost_usd' => 12.0);
$GLOBALS['fake_rate'] = 100000;
$GLOBALS['fake_settings'] = array('margin' => array(
    'percent' => 20.0, 'fixed' => 0, 'min_profit' => 0,
    'round_to' => 1000, 'round_mode' => 'up', 'charm' => 0,
));

$c = phoenix_compute_price(20);
is_same('پایه = ۱۲ × ۱۰۰٬۰۰۰',      $c['base'], 1200000);
is_same('سود ۲۰٪',                   $c['profit'], 240000);
is_same('قیمت = ۱٬۴۴۰٬۰۰۰',          $c['regular'], 1440000);
is_same('بدونِ تخفیف، نهایی = قیمت',  $c['final'], 1440000);

/* حداقلِ سود روی محصولِ ارزان */
$GLOBALS['fake_meta'][21] = array('price_mode' => 'toman', 'cost_toman' => 50000);
$GLOBALS['fake_settings']['margin']['min_profit'] = 100000;
$c = phoenix_compute_price(21);
is_same('۲۰٪ از ۵۰٬۰۰۰ = ۱۰٬۰۰۰ ولی حداقل ۱۰۰٬۰۰۰ می‌چربد', $c['profit'], 100000);
is_same('قیمت = ۱۵۰٬۰۰۰',                                    $c['regular'], 150000);

/* دستی و قفل */
reset_world();
$GLOBALS['fake_meta'][22] = array('price_mode' => 'manual', 'cost_usd' => 12.0);
is_same('دستی → موتور دست نمی‌زند', phoenix_compute_price(22), null);

$GLOBALS['fake_meta'][23] = array('price_mode' => 'usd', 'cost_usd' => 12.0, 'price_locked' => true);
is_same('قفل → موتور دست نمی‌زند', phoenix_compute_price(23), null);

/* ⚠ نرخِ صفر: قیمت نباید صفر شود، باید دست‌نخورده بماند */
$GLOBALS['fake_meta'][24] = array('price_mode' => 'usd', 'cost_usd' => 12.0);
$GLOBALS['fake_rate'] = 0;
is_same('نرخِ صفر → null، نه قیمتِ صفر', phoenix_compute_price(24), null);

/* ============================================================
   ۵٫۵ ‎usd‎ قیمتِ تمام‌شده نیست — و موتور نباید فکر کند هست

   ⚠ این تست برای جلوگیری از یک فاجعه‌ی مشخص است.

   کاتالوگِ سایت فیلدی به‌نامِ ‎usd‎ دارد که معنایش «این سرویس
   در سایتِ خودش چند است» یا مبلغِ اسمیِ گیفت‌کارت است — نه
   قیمتِ تمام‌شده‌ی ما. کنوا پرو سالی ۱۲۰ دلار است و ما اکانتِ
   ظرفیتی را ۲۰۵ هزار تومان می‌فروشیم.

   اگر موتور ‎usd‎ را قیمتِ تمام‌شده حساب کند:

       ۱۲۰ × ۲۲۶٬۵۰۰ + ٪۱۸ ≈ ۳۲ میلیون تومان

   یعنی محصولِ ۲۰۵ هزار تومانی، صد و سی برابر گران. پس موتور
   فقط ‎cost_usd‎ را می‌خواند و ‎usd‎ برایش نامرئی است.
   ============================================================ */

section('usd نباید قیمتِ تمام‌شده حساب شود');
reset_world();

$GLOBALS['fake_rate'] = 226500;

/* دقیقاً شکلی که ‎push-woo‎ وارد می‌کند */
$GLOBALS['fake_meta'][50] = array('usd' => 120, 'price_mode' => 'manual');
is_same('محصولِ واردشده دستِ موتور نیست', phoenix_compute_price(50), null);

/* حتی بدونِ ‎price_mode‎ هم نباید حدس بزند */
$GLOBALS['fake_meta'][51] = array('usd' => 120);
is_same('‎usd‎ تنها، موتور را روشن نمی‌کند', phoenix_compute_price(51), null);

/* و وقتی قیمتِ تمام‌شده‌ی واقعی نوشته شود، کار می‌کند */
$GLOBALS['fake_meta'][52] = array('price_mode' => 'usd', 'cost_usd' => 0.6);
$GLOBALS['fake_settings'] = array(
    'margin' => array('percent' => 50.0, 'round_to' => 1000, 'round_mode' => 'up',
                      'charm' => 0, 'fixed' => 0, 'min_profit' => 0),
    'floor_percent' => 5,
);
$c = phoenix_compute_price(52);
is_same('‎cost_usd‎ی ۰٫۶ دلار → پایه ۱۳۵٬۹۰۰', $c['base'], 135900);
is_same('و قیمت نزدیکِ ۲۰۵ هزار درمی‌آید',      $c['regular'], 204000);

/* ============================================================
   ۶ تخفیف: بهترین می‌برد، جمع نمی‌شود
   ============================================================ */

section('تخفیف');
reset_world();

/* ⚠ حاشیه‌ی ۱۰۰٪ عمدی است، نه دلخواه.

   اولین نسخه‌ی این تست حاشیه را صفر گذاشته بود؛ یعنی قیمتِ
   فروش دقیقاً قیمتِ تمام‌شده. آن‌وقت *هر* تخفیفی زیرِ کف
   می‌افتاد و موتور درست رد می‌کرد — ولی تست فکر می‌کرد باگ
   است. خودِ همین، سوالِ خوبی را بیرون کشید: وقتی کف تخفیف را
   می‌خورد، ادمین از کجا بفهمد؟ (حالا ‎blocked‎ می‌گوید.)

   با تمام‌شده‌ی ۵۰۰ هزار و حاشیه‌ی ۱۰۰٪، قیمت یک میلیون
   می‌شود و کف نصفِ آن — پس تخفیف‌ها جا دارند و آنچه سنجیده
   می‌شود خودِ منطقِ برخورد است، نه کف. */
$GLOBALS['fake_meta'][30]  = array('price_mode' => 'toman', 'cost_toman' => 500000);
$GLOBALS['fake_terms'][30] = array('product_cat' => array(5));
$GLOBALS['fake_settings'] = array(
    'margin' => array('percent' => 100.0, 'round_to' => 1, 'round_mode' => 'up', 'charm' => 0,
                      'fixed' => 0, 'min_profit' => 0),
    'floor_percent' => 0,
    'discounts' => array(
        array('id' => 'a', 'title' => 'همه ۱۰٪', 'enabled' => true, 'scope' => 'all',
              'type' => 'percent', 'value' => 10),
        array('id' => 'b', 'title' => 'گیم ۳۰٪', 'enabled' => true, 'scope' => 'category',
              'targets' => array(5), 'type' => 'percent', 'value' => 30),
    ),
);

$c = phoenix_compute_price(30);
is_same('بهترین تخفیف برنده است، نه جمعِ هر دو', $c['sale'], 700000);
is_same('برچسب از همان قاعده می‌آید',            $c['discount']['label'], 'گیم ۳۰٪');

/* سقفِ تخفیف */
$GLOBALS['fake_settings']['discounts'] = array(
    array('id' => 'c', 'title' => 'با سقف', 'enabled' => true, 'scope' => 'all',
          'type' => 'percent', 'value' => 30, 'cap' => 100000),
);
$c = phoenix_compute_price(30);
is_same('۳۰٪ از ۱٬۰۰۰٬۰۰۰ ولی سقفِ ۱۰۰٬۰۰۰', $c['sale'], 900000);

/* پنجره‌ی زمانی */
$GLOBALS['fake_settings']['discounts'] = array(
    array('id' => 'd', 'title' => 'تمام‌شده', 'enabled' => true, 'scope' => 'all',
          'type' => 'percent', 'value' => 50, 'ends' => time() - 3600),
);
is_same('قاعده‌ی تاریخ‌گذشته اعمال نمی‌شود', phoenix_compute_price(30)['sale'], 0);

$GLOBALS['fake_settings']['discounts'] = array(
    array('id' => 'e', 'title' => 'هنوز نرسیده', 'enabled' => true, 'scope' => 'all',
          'type' => 'percent', 'value' => 50, 'starts' => time() + 3600),
);
is_same('قاعده‌ی آینده هنوز اعمال نمی‌شود', phoenix_compute_price(30)['sale'], 0);

/* روی‌هم */
$GLOBALS['fake_settings']['discounts'] = array(
    array('id' => 'f', 'title' => 'پایه ۲۰٪', 'enabled' => true, 'scope' => 'all',
          'type' => 'percent', 'value' => 20),
    array('id' => 'g', 'title' => 'روی‌هم ۱۰٪', 'enabled' => true, 'scope' => 'all',
          'type' => 'percent', 'value' => 10, 'stack' => true, 'priority' => 5),
);
$c = phoenix_compute_price(30);
is_same('روی‌هم روی باقی‌مانده می‌نشیند: ۱م → ۸۰۰ک → ۷۲۰ک', $c['sale'], 720000);

/* دسته‌ی فرزند */
reset_world();
$GLOBALS['fake_meta'][31]  = array('price_mode' => 'toman', 'cost_toman' => 500000);
$GLOBALS['fake_terms'][31] = array('product_cat' => array(12));
$GLOBALS['fake_anc'][12]   = array(5);
$GLOBALS['fake_settings'] = array(
    'margin' => array('percent' => 100.0, 'round_to' => 1, 'round_mode' => 'up',
                      'charm' => 0, 'fixed' => 0, 'min_profit' => 0),
    'floor_percent' => 0,
    'discounts' => array(array('id' => 'h', 'title' => 'دسته‌ی پدر', 'enabled' => true,
        'scope' => 'category', 'targets' => array(5), 'type' => 'percent', 'value' => 25)),
);
is_same('تخفیفِ دسته‌ی پدر، زیرشاخه را هم می‌گیرد', phoenix_compute_price(31)['sale'], 750000);

/* ============================================================
   ۷ کفِ قیمت — مهم‌ترین محافظ
   ============================================================ */

section('کفِ قیمت');
reset_world();

$GLOBALS['fake_meta'][40] = array('price_mode' => 'toman', 'cost_toman' => 1000000);
$GLOBALS['fake_settings'] = array(
    'margin' => array('percent' => 50.0, 'round_to' => 1, 'round_mode' => 'up',
                      'charm' => 0, 'fixed' => 0, 'min_profit' => 0),
    'floor_percent' => 10,
    'discounts' => array(array('id' => 'k', 'title' => 'حراجِ ۹۰٪', 'enabled' => true,
        'scope' => 'all', 'type' => 'percent', 'value' => 90)),
);

$c = phoenix_compute_price(40);
is_same('کف = تمام‌شده + ۱۰٪',                $c['floor'], 1100000);
is_same('تخفیفِ ۹۰٪ زیرِ کف نمی‌رود',          $c['sale'], 1100000);
is_same('کف علامت می‌خورد تا در پنل دیده شود', $c['floor_hit'], true);

/* حاشیه‌ی منفی هم از کف رد نمی‌شود */
$GLOBALS['fake_settings']['discounts'] = array();
$GLOBALS['fake_settings']['margin']['percent'] = -80.0;
$c = phoenix_compute_price(40);
is_same('حاشیه‌ی منفیِ ۸۰٪ هم زیرِ کف نمی‌رود', $c['regular'], 1100000);

/* ⚠ دو حالتِ متفاوت، که اولین نسخه‌ی این تست قاطی‌شان کرده بود.
   تفاوتشان این است که حاشیه از کف بیشتر است یا نه. */

/* ---- حالت الف: حاشیه از کف بیشتر است → تخفیف *بریده* می‌شود
        نه مسدود. مشتری تخفیف می‌گیرد، فقط نه به‌اندازه‌ای که
        قاعده گفته بود. */
reset_world();
$GLOBALS['fake_meta'][41] = array('price_mode' => 'toman', 'cost_toman' => 1000000);
$GLOBALS['fake_settings'] = array(
    'margin' => array('percent' => 18.0, 'round_to' => 1, 'round_mode' => 'up',
                      'charm' => 0, 'fixed' => 0, 'min_profit' => 0),
    'floor_percent' => 5,
    'discounts' => array(array('id' => 'z', 'title' => 'پنجاه درصد', 'enabled' => true,
        'scope' => 'all', 'type' => 'percent', 'value' => 50)),
);
$c = phoenix_compute_price(41);
is_same('قیمت پیش از تخفیف',                       $c['regular'], 1180000);
is_same('۵۰٪ تا کف بریده می‌شود، نه بیشتر',        $c['sale'], 1050000);
is_same('و کف علامت می‌خورد',                       $c['floor_hit'], true);
is_same('مسدود نیست — تخفیفی اعمال شد',            $c['blocked'], null);

/* ---- حالت ب: حاشیه از کف کمتر است → اصلاً جایی برای تخفیف
        نیست. این همان حالتی است که باید *بلند* گفته شود. */
$GLOBALS['fake_settings']['margin']['percent'] = 3.0;
$c = phoenix_compute_price(41);
is_same('حاشیه‌ی ۳٪ زیرِ کفِ ۵٪ → قیمت به کف می‌رود', $c['regular'], 1050000);
is_same('هیچ تخفیفی اعمال نمی‌شود',                   $c['sale'], 0);
is_same('و دلیلش برمی‌گردد تا پنل بگوید چرا',          is_array($c['blocked']), true);

/* ---- با حاشیه‌ی کافی، همان تخفیف کاملاً کار می‌کند */
$GLOBALS['fake_settings']['margin']['percent'] = 200.0;
$c = phoenix_compute_price(41);
is_same('با حاشیه‌ی ۲۰۰٪ تخفیفِ ۵۰٪ کامل اعمال می‌شود', $c['sale'], 1500000);
is_same('و دیگر مسدود نیست',                             $c['blocked'], null);

/* ============================================================
   ۸ پاک‌سازیِ قاعده‌ی تخفیف
   ============================================================ */

section('پاک‌سازیِ تخفیف');

$r = phoenix_discount_sanitize(array('type' => 'percent', 'value' => 150));
is_same('درصدِ بالای ۹۰ بریده می‌شود', $r['value'], 90.0);

$r = phoenix_discount_sanitize(array('scope' => 'hack; DROP TABLE'));
is_same('دامنه‌ی ناشناخته می‌شود all', $r['scope'], 'all');

$r = phoenix_discount_sanitize(array('starts' => 2000, 'ends' => 1000));
is_same('بازه‌ی وارونه صاف می‌شود (شروع)', $r['starts'], 1000);
is_same('بازه‌ی وارونه صاف می‌شود (پایان)', $r['ends'], 2000);

$r = phoenix_discount_sanitize(array('scope' => 'all', 'targets' => array(1, 2, 3)));
is_same('دامنه‌ی «همه» هدف نمی‌گیرد', $r['targets'], array());

$r = phoenix_discount_sanitize(array('scope' => 'category', 'targets' => array('5', 5, -2, 'x')));
is_same('هدف‌ها عددی، یکتا و مثبت می‌شوند', $r['targets'], array(5));

$r = phoenix_discount_sanitize(array());
is_same('شناسه خودکار ساخته می‌شود', strlen($r['id']) > 1, true);

/* ============================================================
   نتیجه
   ============================================================ */

printf("\n%s\n", str_repeat('-', 72));
printf("%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] > 0 ? 1 : 0);
