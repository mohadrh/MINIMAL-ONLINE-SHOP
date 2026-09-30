<?php
/**
 * تستِ پشتیبان‌گیری — هسته‌ی خالص، و خودِ backup.php و قفلِ انبارِ کد
 * روی وردپرس و پایگاه داده‌ی ساختگی.
 *
 * اجرا:  php wp-plugin/tests/backup-test.php
 */

define('ABSPATH', __DIR__);
define('ARRAY_A', 'ARRAY_A');
define('PHOENIX_BRIDGE_VERSION', '1.7.0');
define('PHOENIX_META_KEY', '_phoenix');
const PHOENIX_API_NS = 'phoenix/v1';
const PHOENIX_PSRC_META = '_phoenix_sources';

/* ---------- وردپرسِ ساختگی ---------- */
$GLOBALS['opts'] = array();
$GLOBALS['meta'] = array();   // [post_id][key] = value
$GLOBALS['posts'] = array();  // id => {post_type, post_name, post_title}
$GLOBALS['lock_ok'] = true;
$GLOBALS['locks'] = array();
$GLOBALS['audit'] = array();
$GLOBALS['filters'] = array();

function add_action() {}
function add_filter($tag, $cb) { $GLOBALS['filters'][$tag][] = $cb; }
function apply_filters($tag, $v) { foreach ($GLOBALS['filters'][$tag] ?? array() as $cb) { $v = $cb($v); } return $v; }
function register_rest_route() {}
function get_option($k, $d = false) { return array_key_exists($k, $GLOBALS['opts']) ? $GLOBALS['opts'][$k] : $d; }
function update_option($k, $v, $a = null) { $GLOBALS['opts'][$k] = $v; return true; }
function add_option($k, $v, $x = '', $a = 'yes') { if (array_key_exists($k, $GLOBALS['opts'])) return false; $GLOBALS['opts'][$k] = $v; return true; }
function delete_option($k) { unset($GLOBALS['opts'][$k]); }
function get_post_meta($id, $k, $single) { return $GLOBALS['meta'][$id][$k] ?? ''; }
function update_post_meta($id, $k, $v) { $GLOBALS['meta'][$id][$k] = $v; }
function wp_cache_delete() {}
function get_post($id) { return isset($GLOBALS['posts'][$id]) ? (object) ($GLOBALS['posts'][$id] + array('ID' => $id)) : null; }
function get_post_type($id) { return $GLOBALS['posts'][$id]['post_type'] ?? false; }
function get_page_by_path($slug, $o, $type) { foreach ($GLOBALS['posts'] as $id => $p) { if ($p['post_name'] === $slug && $p['post_type'] === $type) return (object) ($p + array('ID' => $id)); } return null; }
function wc_get_product_id_by_sku($sku) { foreach ($GLOBALS['meta'] as $id => $m) { if (($m['_sku'] ?? '') === $sku) return $id; } return 0; }
function wc_get_product() { return null; }
function current_time() { return '2026-09-30 12:00:00'; }
function wp_get_current_user() { return (object) array('ID' => 1, 'user_login' => 'admin'); }
function wp_json_encode($v, $f = 0) { return json_encode($v, $f); }
function phoenix_connections() { return array(); }
function phoenix_conn_key_state($r) { return 'ok'; }
function phoenix_psrc_clean($v, $c) { return array('ok' => true, 'data' => $v, 'errors' => array()); }
function phoenix_get_fields() { return array(); }

/** فقط پرس‌وجوهایی که backup.php و قفل می‌سازند */
class FakeDb {
    public $prefix = 'wp_';
    public $postmeta = 'wp_postmeta';
    public $t = array();          // جدول => [pk => row]
    public $pk = array();
    public $log = array();
    public function prepare($q, ...$a) {
        foreach ($a as $v) { $q = preg_replace('/%[sd]/', is_int($v) ? (string) $v : "'" . addslashes((string) $v) . "'", $q, 1); }
        return $q;
    }
    public function suppress_errors($on = true) { return false; }
    public function query($q) {
        $this->log[] = $q;
        if (preg_match("/RELEASE_LOCK\('([^']+)'\)/", $q, $m)) { unset($GLOBALS['locks'][$m[1]]); }
        return true;
    }
    public function get_var($q) {
        if (preg_match("/GET_LOCK\('([^']+)'/", $q, $m)) {
            if (!$GLOBALS['lock_ok']) return '0';
            $GLOBALS['locks'][$m[1]] = true;
            return '1';
        }
        if (preg_match('/SELECT COUNT\(\*\) FROM (\w+)/', $q, $m)) return count($this->t[$m[1]] ?? array());
        return null;
    }
    private function rows($t) { $r = $this->t[$t] ?? array(); ksort($r, SORT_NATURAL); return $r; }
    public function get_results($q, $f = null) {
        if (preg_match("/FROM (\w+) WHERE `(\w+)` > '?([^' ]*)'? ORDER BY `\w+` ASC LIMIT (\d+)/", $q, $m)) {
            $out = array();
            foreach ($this->rows($m[1]) as $k => $row) {
                if (strcmp((string) $k, $m[3]) > 0 || (is_numeric($k) && (int) $k > (int) $m[3] && $m[3] !== '')) {
                    if ($m[3] === '' || (is_numeric($k) ? (int) $k > (int) $m[3] : strcmp((string) $k, $m[3]) > 0)) $out[] = $row;
                } elseif ($m[3] === '' || $m[3] === '0') { $out[] = $row; }
                if (count($out) >= (int) $m[4]) break;
            }
            return $out;
        }
        if (preg_match("/FROM (\w+) WHERE `(\w+)` IN \((.*)\)/", $q, $m)) {
            $keys = array_map(function ($x) { return trim($x, " '"); }, explode(',', $m[3]));
            $out = array();
            foreach ($keys as $k) { if (isset($this->t[$m[1]][$k])) $out[] = $this->t[$m[1]][$k]; }
            return $out;
        }
        return array();
    }
    /** شناسه‌ی محصول‌هایی که این متاها را دارند — همان پرس‌وجوی export */
    public function get_col($q) {
        preg_match("/meta_key IN \((.*?)\) AND post_id > (\d+) ORDER BY post_id ASC LIMIT (\d+)/", $q, $m);
        $keys = array_map(function ($x) { return trim($x, " '"); }, explode(',', $m[1]));
        $ids = array();
        foreach ($GLOBALS['meta'] as $id => $meta) {
            if ($id > (int) $m[2] && array_intersect($keys, array_keys($meta))) $ids[] = $id;
        }
        sort($ids);
        return array_slice($ids, 0, (int) $m[3]);
    }
    public function insert($t, $row) {
        if (!isset($this->pk[$t])) { $this->t[$t][] = $row; return 1; } // تاریخچه و بقیه — فقط ثبت
        $k = (string) $row[$this->pk[$t]];
        if (isset($this->t[$t][$k])) return false;
        foreach ($this->t[$t] ?? array() as $r) { if (isset($row['idem_key'], $r['idem_key']) && $r['idem_key'] === $row['idem_key']) return false; }
        $this->t[$t][$k] = $row;
        return 1;
    }
    public function replace($t, $row) { $this->t[$t][(string) $row[$this->pk[$t]]] = array_merge($this->t[$t][(string) $row[$this->pk[$t]]] ?? array(), $row); return 1; }
}
$GLOBALS['wpdb'] = new FakeDb();

require_once __DIR__ . '/../phoenix-bridge/includes/db.php';
require_once __DIR__ . '/../phoenix-bridge/includes/orders.php';
require_once __DIR__ . '/../phoenix-bridge/includes/backup-core.php';
require_once __DIR__ . '/../phoenix-bridge/includes/backup.php';

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;
function is_same($label, $got, $want) {
    if ($got === $want) { $GLOBALS['pass']++; printf("  ok    %s\n", $label); return; }
    $GLOBALS['fail']++;
    printf("  FAIL  %s\n        got  %s\n        want %s\n", $label, json_encode($got, JSON_UNESCAPED_UNICODE), json_encode($want, JSON_UNESCAPED_UNICODE));
}
function section($t) { echo "\n== {$t} ==\n"; }

/* ============================================================ */
section('ردیف');
$cols = array('id' => 'uint', 'name' => 'str:5', 'at' => 'datetime', 'gone' => 'datetime?', 'n' => 'int', 'on' => 'bool', 'body' => 'text');
is_same('ردیفِ درست', phoenix_backup_clean_row(array('id' => '7', 'name' => 'علیرضا‌جان', 'at' => '2026-01-02 03:04:05', 'gone' => null, 'n' => -3, 'on' => '1', 'x' => 'دور'), $cols, 'id'),
    array('id' => 7, 'name' => 'علیرض', 'at' => '2026-01-02 03:04:05', 'gone' => null, 'n' => -3, 'on' => 1));
is_same('ستونِ ناشناخته دور ریخته، ستونِ غایب حذف', array_keys(phoenix_backup_clean_row(array('id' => 1, 'zzz' => 1), $cols, 'id')), array('id'));
is_same('بی‌کلید رد', phoenix_backup_clean_row(array('name' => 'x'), $cols, 'id'), null);
is_same('عددِ خراب رد', phoenix_backup_clean_row(array('id' => '7 OR 1'), $cols, 'id'), null);
is_same('منفی برای uint رد', phoenix_backup_clean_row(array('id' => -1), $cols, 'id'), null);
is_same('تاریخِ خراب رد', phoenix_backup_clean_row(array('id' => 1, 'at' => 'yesterday'), $cols, 'id'), null);
is_same('null در ستونِ ناخالی‌پذیر رد', phoenix_backup_clean_row(array('id' => 1, 'at' => null), $cols, 'id'), null);
is_same('آرایه به‌جای مقدار رد', phoenix_backup_clean_row(array('id' => 1, 'body' => array('x')), $cols, 'id'), null);
is_same('ورودیِ غیرِ آرایه رد', phoenix_backup_clean_row('x', $cols, 'id'), null);

section('کدام بماند');
$old = array('id' => 1, 'status' => 'pending', 'updated_at' => '2026-01-01 00:00:00');
$new = array('id' => 1, 'status' => 'pending', 'updated_at' => '2026-02-01 00:00:00');
is_same('نیست → اضافه', phoenix_backup_decide('merge', null, $new, 'updated_at'), 'insert');
is_same('ادغام: فایل تازه‌تر → تازه', phoenix_backup_decide('merge', $old, $new, 'updated_at'), 'replace');
is_same('ادغام: سایت تازه‌تر → بماند', phoenix_backup_decide('merge', $new, $old, 'updated_at'), 'skip');
is_same('ادغام بی‌ستونِ زمان → بماند', phoenix_backup_decide('merge', $old, $new, ''), 'skip');
is_same('جایگزینی → فایل', phoenix_backup_decide('overwrite', $new, $old, 'updated_at'), 'replace');
$done = array('id' => 1, 'status' => 'done', 'updated_at' => '2026-01-01 00:00:00');
is_same('کارِ تحویل‌شده در ادغام برنمی‌گردد', phoenix_backup_decide('merge', $done, $new, 'updated_at', 'phoenix_backup_keep_done_job'), 'skip');
is_same('کارِ تحویل‌شده در جایگزینی هم برنمی‌گردد', phoenix_backup_decide('overwrite', $done, $old, 'updated_at', 'phoenix_backup_keep_done_job'), 'skip');
is_same('منتظر → تحویل‌شده از فایل مجاز', phoenix_backup_decide('overwrite', $old, $done, 'updated_at', 'phoenix_backup_keep_done_job'), 'replace');

section('انبارِ کد — کدِ فروخته‌شده آزاد نمی‌شود');
$cur = array(
    array('value' => 'AAA', 'used' => true, 'order_id' => 90, 'used_at' => '2026-09-01 10:00:00', 'extra' => 'نگه‌دار'),
    array('value' => 'BBB', 'used' => false, 'added_at' => '2026-08-01 10:00:00'),
);
$inc = array(
    array('value' => 'AAA', 'used' => false),                                        // فایل: آزاد — ولی امروز فروخته شده
    array('value' => 'BBB', 'used' => true, 'order_id' => 77, 'used_at' => '2026-09-02 10:00:00'),
    array('value' => 'CCC', 'used' => false, 'added_at' => '2026-08-05 10:00:00'),
    array('value' => '', 'used' => false), array('x' => 1), 'junk',
);
$m = phoenix_backup_merge_codes($cur, $inc);
$by = array(); foreach ($m['codes'] as $c) { $by[$c['value']] = $c; }
is_same('فروخته‌شده فروخته می‌ماند', array($by['AAA']['used'], $by['AAA']['order_id'], $by['AAA']['extra']), array(true, 90, 'نگه‌دار'));
is_same('فروش در فایل ثبت شد', array($by['BBB']['used'], $by['BBB']['order_id']), array(true, 77));
is_same('کدِ غایب اضافه، آشغال رد', array(isset($by['CCC']), count($m['codes']), $m['added'], $m['marked_used']), array(true, 3, 1, 1));
is_same('انبارِ خالی + فایل', count(phoenix_backup_merge_codes('', $inc)['codes']), 3);

section('تنظیمات');
$d = array('a' => 1, 'b' => false, 'c' => array(), 'd' => 'x', 'f' => 1.5);
$r = phoenix_backup_merge_settings($d, array('a' => 2, 'keep' => 'k'), array('a' => '9', 'b' => 1, 'c' => 'not-array', 'd' => 5, 'f' => '2.25', 'evil' => 1, 'keep' => 'k2'));
is_same('فقط کلیدهای شناخته، هم‌نوع', $r, array('a' => 9, 'keep' => 'k2', 'b' => true, 'd' => '5', 'f' => 2.25));
is_same('فایلِ خراب → فعلی', phoenix_backup_merge_settings($d, array('a' => 3), 'x'), array('a' => 3));

section('نسخه‌ها و شناسه');
$ring = array();
for ($i = 1; $i <= 7; $i++) { $ring = phoenix_backup_snapshot_push($ring, array('id' => (string) $i)); }
is_same('پنج‌تای آخر، تازه اول', array_column($ring, 'id'), array('7', '6', '5', '4', '3'));
is_same('بی‌تغییر', phoenix_backup_version_change(array('bridge' => '1.7.0'), array('bridge' => '1.7.0')), '');
is_same('تغییر', phoenix_backup_version_change(array('bridge' => '1.6.1'), array('bridge' => '1.7.0', 'account' => '0.6.0')), 'bridge 1.6.1 ← 1.7.0، account نصب ← 0.6.0');
is_same('شناسه‌ی بخش', array(phoenix_backup_section_id_ok('account.ticket_msgs'), phoenix_backup_section_id_ok('../x'), phoenix_backup_section_id_ok('a')), array(true, false, false));

/* ============================================================ */
section('بخش‌ها و نسخه‌ها');
add_filter('phoenix_backup_versions', function ($v) { $v['account'] = '0.6.0'; $v['Bad Key'] = 'x'; return $v; });
add_filter('phoenix_backup_sections', function ($l) {
    $l['evil'] = array('label' => 'x', 'kind' => 'table');                       // شناسه‌ی بد
    $l['acc.broken'] = array('label' => 'x', 'kind' => 'table', 'pk' => 'id');   // بی‌جدول
    return $l;
});
$secs = phoenix_backup_sections();
is_same('بخش‌های Bridge، بی‌تعریف‌های خراب', array_keys($secs), array('bridge.settings', 'bridge.products', 'bridge.codes', 'bridge.queue', 'bridge.audit'));
is_same('نسخه‌ها، بی‌کلیدِ خراب', phoenix_backup_versions(), array('bridge' => '1.7.0', 'account' => '0.6.0'));

section('صف: بیرون بردن تکه‌تکه');
$db = $GLOBALS['wpdb'];
$db->pk['wp_phoenix_queue'] = 'id';
for ($i = 1; $i <= 5; $i++) {
    $db->t['wp_phoenix_queue'][(string) $i] = array('id' => $i, 'created_at' => '2026-09-01 00:00:00', 'updated_at' => '2026-09-01 00:00:00',
        'order_id' => 100 + $i, 'item_id' => 0, 'product_id' => 5, 'idem_key' => 'k' . $i, 'status' => $i === 1 ? 'done' : 'pending', 'tries' => 0, 'payload' => '{}', 'result' => null);
}
$q = $secs['bridge.queue'];
$b1 = phoenix_backup_export_batch($q, '', 2);
$b2 = phoenix_backup_export_batch($q, $b1['next'], 2);
$b3 = phoenix_backup_export_batch($q, $b2['next'], 2);
is_same('۲ + ۲ + ۱، مکان‌نما درست', array(count($b1['rows']), $b1['next'], count($b2['rows']), $b2['next'], count($b3['rows']), $b3['next']), array(2, '2', 2, '4', 1, null));

section('صف: بازگرداندن');
$file = array(
    array_merge($db->t['wp_phoenix_queue']['1'], array('status' => 'pending', 'updated_at' => '2026-09-05 00:00:00')), // تحویل‌شده ← منتظر؟ نه
    array_merge($db->t['wp_phoenix_queue']['2'], array('status' => 'failed', 'updated_at' => '2026-09-05 00:00:00')),  // تازه‌تر
    array_merge($db->t['wp_phoenix_queue']['3'], array('updated_at' => '2026-08-01 00:00:00', 'status' => 'failed')), // کهنه‌تر
    array('id' => 9, 'created_at' => '2026-09-01 00:00:00', 'updated_at' => '2026-09-01 00:00:00', 'order_id' => 200, 'product_id' => 5, 'idem_key' => 'k9', 'status' => 'pending'),
    array('id' => 10, 'created_at' => 'bad', 'updated_at' => '2026-09-01 00:00:00', 'order_id' => 1, 'product_id' => 1, 'idem_key' => 'k10'),
);
$r = phoenix_backup_import_batch($q, $file, 'merge');
is_same('ادغام: ۱ اضافه، ۱ تازه، ۲ دست‌نخورده، ۱ رد', array($r['inserted'], $r['replaced'], $r['skipped'], $r['rejected']), array(1, 1, 2, 1));
is_same('کارِ تحویل‌شده همان «done» ماند', $db->t['wp_phoenix_queue']['1']['status'], 'done');
is_same('کهنه‌ترِ فایل روی تازه‌ترِ سایت ننشست', $db->t['wp_phoenix_queue']['3']['status'], 'pending');
is_same('در تراکنش', array_slice($db->log, -2), array('START TRANSACTION', 'COMMIT'));
$r = phoenix_backup_import_batch($q, array($file[2], $file[0]), 'overwrite');
is_same('جایگزینی: کهنه‌تر هم نوشته شد، تحویل‌شده باز هم نه', array($db->t['wp_phoenix_queue']['3']['status'], $db->t['wp_phoenix_queue']['1']['status'], $r['replaced'], $r['skipped']), array('failed', 'done', 1, 1));

section('تنظیمات: بازگرداندن');
$GLOBALS['opts'][PHOENIX_SETTINGS_OPTION] = array('engine_on' => false, 'min_sources' => 2, 'connections' => array('k' => array('key_enc' => 'x')));
$GLOBALS['phoenix_settings_cache'] = array('stale' => true);
$r = phoenix_backup_import_batch($secs['bridge.settings'], array(
    array('name' => PHOENIX_SETTINGS_OPTION, 'value' => array('engine_on' => true, 'min_sources' => '3', 'hack' => 'x')),
    array('name' => 'siteurl', 'value' => 'https://evil'),
), 'merge');
is_same('فقط option‌ِ همان بخش، فقط کلیدهای شناخته', array($GLOBALS['opts'][PHOENIX_SETTINGS_OPTION]['engine_on'], $GLOBALS['opts'][PHOENIX_SETTINGS_OPTION]['min_sources'], isset($GLOBALS['opts'][PHOENIX_SETTINGS_OPTION]['hack']), isset($GLOBALS['opts']['siteurl']), $r['rejected']), array(true, 3, false, false, 1));
is_same('کش باطل شد', isset($GLOBALS['phoenix_settings_cache']), false);
$sec = array('kind' => 'option', 'options' => array('phoenix_acc_tg_secret' => 'secret'));
is_same('رمزِ خراب رد، null رد نه — دست‌نخورده', array(phoenix_backup_import_batch($sec, array(array('name' => 'phoenix_acc_tg_secret', 'value' => 'short')), 'merge')['rejected'],
    phoenix_backup_import_batch($sec, array(array('name' => 'phoenix_acc_tg_secret', 'value' => null)), 'merge')['skipped']), array(1, 1));

section('محصول و انبارِ کد: بازگرداندن');
$GLOBALS['posts'][11] = array('post_type' => 'product', 'post_name' => 'spotify', 'post_title' => 'Spotify');
$GLOBALS['posts'][12] = array('post_type' => 'product_variation', 'post_name' => 'spotify-1m', 'post_title' => 'Spotify 1m');
$GLOBALS['meta'][12]['_sku'] = 'SP-1M';
$GLOBALS['meta'][11][PHOENIX_META_KEY] = array('fulfillment' => 'manual');
$exp = phoenix_backup_export_batch($secs['bridge.products'], '', 10);
is_same('بیرون: فقط محصول‌ها با متای فونیکس', array(count($exp['rows']), $exp['rows'][0]['slug'], $exp['rows'][0]['meta'][PHOENIX_META_KEY]), array(1, 'spotify', array('fulfillment' => 'manual')));
$r = phoenix_backup_import_batch($secs['bridge.products'], array(
    array('post_id' => 11, 'type' => 'product', 'slug' => 'spotify', 'meta' => array(PHOENIX_META_KEY => array('fulfillment' => 'stock_code'))),
    array('post_id' => 999, 'type' => 'product_variation', 'slug' => 'x', 'sku' => 'SP-1M', 'meta' => array(PHOENIX_META_KEY => array('a' => 1))),
    array('post_id' => 5, 'type' => 'page', 'slug' => 'about', 'meta' => array(PHOENIX_META_KEY => array('a' => 1))),
), 'merge');
is_same('ادغام: پیکربندیِ فعلیِ محصول دست نخورد', $GLOBALS['meta'][11][PHOENIX_META_KEY], array('fulfillment' => 'manual'));
is_same('شناسه‌ی دیگر ولی همان SKU → همان گونه', $GLOBALS['meta'][12][PHOENIX_META_KEY] ?? null, array('a' => 1));
is_same('برگه‌ی غیرِ محصول رد + یادداشت', array($r['skipped'], count($r['notes'])), array(2, 1));
phoenix_backup_import_batch($secs['bridge.products'], array(array('post_id' => 11, 'type' => 'product', 'slug' => 'spotify', 'meta' => array(PHOENIX_META_KEY => array('fulfillment' => 'stock_code')))), 'overwrite');
is_same('جایگزینی: نوشته شد', $GLOBALS['meta'][11][PHOENIX_META_KEY], array('fulfillment' => 'stock_code'));

$GLOBALS['meta'][11][PHOENIX_CODES_META] = array(array('value' => 'AAA', 'used' => true, 'order_id' => 5));
$r = phoenix_backup_import_batch($secs['bridge.codes'], array(array('post_id' => 11, 'type' => 'product', 'slug' => 'spotify',
    'meta' => array(PHOENIX_CODES_META => array(array('value' => 'AAA', 'used' => false), array('value' => 'NEW', 'used' => false))))), 'overwrite');
is_same('انبار: حتی در جایگزینی، فروخته فروخته ماند؛ تازه اضافه', array_map(function ($c) { return array($c['value'], $c['used']); }, $GLOBALS['meta'][11][PHOENIX_CODES_META]), array(array('AAA', true), array('NEW', false)));
is_same('قفل آزاد شد', $GLOBALS['locks'], array());
$GLOBALS['lock_ok'] = false;
$r = phoenix_backup_import_batch($secs['bridge.codes'], array(array('post_id' => 11, 'type' => 'product', 'slug' => 'spotify',
    'meta' => array(PHOENIX_CODES_META => array(array('value' => 'ZZZ'))))), 'merge');
is_same('انبارِ مشغول: چیزی نوشته نشد، یادداشت', array(count($GLOBALS['meta'][11][PHOENIX_CODES_META]), count($r['notes'])), array(2, 1));
$GLOBALS['lock_ok'] = true;

section('فروشِ کد با قفل');
$GLOBALS['meta'][20][PHOENIX_CODES_META] = array(array('value' => 'X1', 'used' => true), array('value' => 'X2', 'used' => false), array('value' => 'X3', 'used' => false));
is_same('اولین کدِ آزاد', phoenix_claim_code(20, 555), 'X2');
is_same('به سفارش بسته شد، قفل آزاد', array($GLOBALS['meta'][20][PHOENIX_CODES_META][1]['used'], $GLOBALS['meta'][20][PHOENIX_CODES_META][1]['order_id'], $GLOBALS['locks']), array(true, 555, array()));
$GLOBALS['lock_ok'] = false;
is_same('قفل نشد → false، بی‌برداشتن', array(phoenix_claim_code(20, 556), $GLOBALS['meta'][20][PHOENIX_CODES_META][2]['used']), array(false, false));
$GLOBALS['lock_ok'] = true;
is_same('بعدی', phoenix_claim_code(20, 557), 'X3');
is_same('تمام شد → null', phoenix_claim_code(20, 558), null);
is_same('نامِ قفل با پیشوند و زیرِ ۶۴', array(phoenix_db_lock_name('phoenix_codes_20'), strlen(phoenix_db_lock_name(str_repeat('x', 100)))), array('wp_phoenix_codes_20', 63));

section('نسخه‌ی خودکار');
add_filter('phoenix_backup_snapshot_options', function ($l) { return array_merge($l, array('phoenix_account_settings', 'wp_users_evil', 'siteurl')); });
$GLOBALS['opts']['phoenix_account_settings'] = array('sms_provider' => 'telegram');
phoenix_backup_watch_versions();
$snaps = get_option(PHOENIX_BACKUP_SNAPS);
is_same('بارِ اول: نسخه‌ی پایه، فقط option‌های فونیکس', array(count($snaps), $snaps[0]['reason'], array_keys($snaps[0]['data'])), array(1, 'نخستین نسخه‌ی خودکار', array(PHOENIX_SETTINGS_OPTION, 'phoenix_account_settings')));
phoenix_backup_watch_versions();
is_same('بی‌تغییرِ نسخه، نسخه‌ی تازه نه', count(get_option(PHOENIX_BACKUP_SNAPS)), 1);
$GLOBALS['opts'][PHOENIX_BACKUP_SEEN] = array('bridge' => '1.6.1', 'account' => '0.6.0');
$GLOBALS['opts']['phoenix_backup_watch_lock'] = time();
phoenix_backup_watch_versions();
is_same('درخواستِ هم‌زمان (قفل) نسخه نمی‌گیرد', count(get_option(PHOENIX_BACKUP_SNAPS)), 1);
unset($GLOBALS['opts']['phoenix_backup_watch_lock']);
phoenix_backup_watch_versions();
$snaps = get_option(PHOENIX_BACKUP_SNAPS);
is_same('به‌روزرسانی → نسخه با برچسب', array(count($snaps), $snaps[0]['reason'], isset($GLOBALS['opts']['phoenix_backup_watch_lock'])), array(2, 'پیش از نسخه‌ی تازه: bridge 1.6.1 ← 1.7.0', false));

$GLOBALS['opts']['phoenix_account_settings'] = array('sms_provider' => 'off');
is_same('بازگرداندن', phoenix_backup_snapshot_restore($snaps[0]['id']), true);
is_same('تنظیم برگشت، پیش از آن نسخه‌ای از فعلی', array($GLOBALS['opts']['phoenix_account_settings']['sms_provider'], count(get_option(PHOENIX_BACKUP_SNAPS)), get_option(PHOENIX_BACKUP_SNAPS)[0]['data']['phoenix_account_settings']['sms_provider']), array('telegram', 3, 'off'));
is_same('شناسه‌ی ناموجود', phoenix_backup_snapshot_restore('nope'), false);

section('Phoenix Account: بخش‌ها و آنچه برنمی‌گردد');
define('PHOENIX_ACC_VERSION', '0.6.0');
const PHOENIX_ACC_OPTION = 'phoenix_account_settings';
function phoenix_acc_defaults() { return array('sms_provider' => 'off'); }
function phoenix_acc_chat_defaults() { return array('on' => true); }
foreach (array('customers', 'tickets', 'messages', 'chats', 'chat_msgs', 'tg') as $t) { eval("function phoenix_acc_table_{$t}() { return 'wp_acc_{$t}'; }"); }
require_once __DIR__ . '/../phoenix-account/includes/backup-sections.php';
$secs = phoenix_backup_sections();
is_same('بخش‌های Account ثبت شد، نشست‌ها نه', array_values(array_filter(array_keys($secs), function ($k) { return strpos($k, 'account.') === 0; })),
    array('account.settings', 'account.customers', 'account.tickets', 'account.ticket_msgs', 'account.chats', 'account.chat_msgs', 'account.tg'));
is_same('نسخه‌ی Account', phoenix_backup_versions()['account'], '0.6.0');

$db->pk['wp_acc_customers'] = 'phone';
$db->t['wp_acc_customers'] = array(
    '09121111111' => array('phone' => '09121111111', 'name' => 'علی', 'pass_hash' => 'NEW', 'pass_set_at' => '2026-09-20 00:00:00', 'blocked' => 0, 'created_at' => '2026-01-01 00:00:00'),
    '09122222222' => array('phone' => '09122222222', 'name' => 'مسدود', 'pass_hash' => '', 'pass_set_at' => null, 'blocked' => 1, 'created_at' => '2026-01-01 00:00:00'),
    '09123333333' => array('phone' => '09123333333', 'name' => 'قدیمی', 'pass_hash' => 'A', 'pass_set_at' => '2026-01-01 00:00:00', 'blocked' => 0, 'created_at' => '2026-01-01 00:00:00'),
);
$file = array(
    array('phone' => '09121111111', 'name' => 'علی', 'pass_hash' => 'OLD-LEAKED', 'pass_set_at' => '2026-05-01 00:00:00', 'blocked' => 0, 'created_at' => '2026-01-01 00:00:00'),
    array('phone' => '09122222222', 'name' => 'مسدود', 'pass_hash' => '', 'pass_set_at' => null, 'blocked' => 0, 'created_at' => '2026-01-01 00:00:00'),
    array('phone' => '09123333333', 'name' => 'نامِ فایل', 'pass_hash' => 'A', 'pass_set_at' => '2026-01-01 00:00:00', 'blocked' => 0, 'created_at' => '2026-01-01 00:00:00'),
);
$r = phoenix_backup_import_batch($secs['account.customers'], $file, 'overwrite');
is_same('جایگزینی: رمزِ تازه‌ی مشتری با رمزِ کهنه‌ی فایل عوض نشد', $db->t['wp_acc_customers']['09121111111']['pass_hash'], 'NEW');
is_same('جایگزینی: مسدود مسدود ماند', $db->t['wp_acc_customers']['09122222222']['blocked'], 1);
is_same('بقیه نوشته شد', array($db->t['wp_acc_customers']['09123333333']['name'], $r['replaced'], $r['skipped']), array('نامِ فایل', 1, 2));

$db->pk['wp_acc_tg'] = 'phone';
$db->t['wp_acc_tg'] = array('09121111111' => array('phone' => '09121111111', 'chat_id' => 999, 'tg_user' => 999, 'username' => 'new', 'linked_at' => '2026-09-25 00:00:00'));
phoenix_backup_import_batch($secs['account.tg'], array(array('phone' => '09121111111', 'chat_id' => 111, 'tg_user' => 111, 'username' => 'old', 'linked_at' => '2026-03-01 00:00:00')), 'overwrite');
is_same('جایگزینی: پیوندِ تلگرامِ تازه‌تر ماند — کد به حسابِ قبلی نمی‌رود', $db->t['wp_acc_tg']['09121111111']['chat_id'], 999);
$r = phoenix_backup_import_batch($secs['account.tg'], array(array('phone' => '09125555555', 'chat_id' => -5, 'tg_user' => 5, 'username' => 'x', 'linked_at' => '2026-03-01 00:00:00')), 'merge');
is_same('شناسه‌ی منفیِ گفتگو برای ستونِ int پذیرفته', $r['inserted'], 1);

printf("\n%d قبول، %d مردود\n", $GLOBALS['pass'], $GLOBALS['fail']);
exit($GLOBALS['fail'] ? 1 : 0);
