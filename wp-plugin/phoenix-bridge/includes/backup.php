<?php
/**
 * پشتیبان‌گیری و بازگرداندن — پنل ← «پشتیبان‌گیری».
 *
 * ============================================================
 * ⚠ چرا تکه‌تکه، و چرا رمزنگاری در مرورگر
 *
 * هاستِ اشتراکی هر درخواست را بعد از ۳۰–۶۰ ثانیه می‌کُشد. اگر کلِ
 * پایگاه داده در یک درخواست بیرون می‌آمد، با هزار مشتری کار می‌کرد
 * و با صدهزار نه. این‌جا هر درخواست حداکثر ۵۰۰ ردیفِ یک بخش است و
 * پنل آن‌ها را پشتِ هم می‌خواهد — هر اندازه‌ای جواب می‌دهد.
 *
 * فایل شماره‌ی مشتری، هشِ رمزِ عبور و کدهای فروخته‌نشده دارد. پس
 * همیشه با رمزی که مدیر می‌دهد رمزنگاری می‌شود (AES-GCM، کلید از
 * PBKDF2) — و این کار در مرورگر انجام می‌شود: رمزِ فایل هیچ‌وقت به
 * سرور نمی‌رسد و فایل هیچ‌وقت روی هاست نوشته نمی‌شود (پوشه‌ی
 * ‎uploads‎ عمومی است).
 *
 * ⚠ فقط مدیرِ کلِ سایت (‎manage_options‎)، نه هر مدیرِ فروشگاه.
 *
 * ⚠ نسخه‌ی خودکار: هر بار نسخه‌ی یکی از افزونه‌ها عوض شود، پیش از
 *   اینکه کدِ تازه به تنظیمات دست بزند، یک نسخه از تنظیمات ذخیره
 *   می‌شود (پنج‌تای آخر). بی‌رمز، چون همین پایگاه داده می‌ماند.
 *
 * بخش‌ها ثبت‌شدنی‌اند (‎phoenix_backup_sections‎) — Phoenix Account و
 * هر افزونه‌ی بعدی بخش‌های خودش را اضافه می‌کند و این فایل عوض نمی‌شود.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_BACKUP_SNAPS = 'phoenix_backup_snapshots';
const PHOENIX_BACKUP_SEEN  = 'phoenix_backup_versions_seen';

/* ============================================================
   بخش‌ها
   ============================================================ */

/**
 * @return array<string, array> ‎id => {label, group, kind: option|table|meta, …}‎
 *
 *   option  ‎options: [نام => تابعِ پیش‌فرض‌ها | 'secret']‎، ‎after‎ (اختیاری)
 *   table   ‎table‎ (تابعِ نام)، ‎pk‎، ‎cols‎، ‎updated‎، ‎keep‎ (اختیاری)
 *   meta    ‎keys‎ (متای محصول و گونه)، ‎codes‎ (انبارِ کد، اختیاری)
 */
function phoenix_backup_sections() {
    $q = array('id' => 'uint', 'created_at' => 'datetime', 'updated_at' => 'datetime', 'order_id' => 'uint',
        'item_id' => 'uint', 'product_id' => 'uint', 'idem_key' => 'str:64', 'status' => 'str:20',
        'tries' => 'uint', 'payload' => 'long?', 'result' => 'long?');
    $a = array('id' => 'uint', 'at' => 'datetime', 'kind' => 'str:30', 'actor' => 'str:80', 'subject' => 'str:190',
        'before_val' => 'text?', 'after_val' => 'text?', 'note' => 'str:255?');

    $list = array(
        'bridge.settings' => array(
            'label' => 'تنظیماتِ فروشگاه — قیمت، حاشیه، تخفیف، منابع و اتصال‌ها', 'group' => 'فروشگاه', 'kind' => 'option',
            'options' => array(PHOENIX_SETTINGS_OPTION => 'phoenix_settings_defaults'),
            'after' => 'phoenix_settings_reset_cache',
        ),
        'bridge.products' => array(
            'label' => 'تنظیماتِ فونیکسِ هر محصول — نوعِ تحویل و منابعِ قیمت', 'group' => 'فروشگاه', 'kind' => 'meta',
            'keys' => array(PHOENIX_META_KEY, PHOENIX_PSRC_META),
        ),
        'bridge.codes' => array(
            'label' => 'انبارِ کد (کدهای آزاد و فروخته‌شده)', 'group' => 'فروشگاه', 'kind' => 'meta',
            'keys' => array(PHOENIX_CODES_META), 'codes' => true,
        ),
        'bridge.queue' => array(
            'label' => 'صفِ تحویل', 'group' => 'فروشگاه', 'kind' => 'table',
            'table' => 'phoenix_table_queue', 'pk' => 'id', 'cols' => $q, 'updated' => 'updated_at',
            'keep' => 'phoenix_backup_keep_done_job',
        ),
        'bridge.audit' => array(
            'label' => 'تاریخچه‌ی تغییرات', 'group' => 'فروشگاه', 'kind' => 'table',
            'table' => 'phoenix_table_audit', 'pk' => 'id', 'cols' => $a, 'updated' => '',
        ),
    );

    $out = array();
    foreach ((array) apply_filters('phoenix_backup_sections', $list) as $id => $s) {
        if (!phoenix_backup_section_id_ok($id) || !is_array($s) || !isset($s['label'], $s['kind'])) {
            continue;
        }
        $ok = ($s['kind'] === 'option' && !empty($s['options']) && is_array($s['options']))
            || ($s['kind'] === 'table' && isset($s['table'], $s['pk'], $s['cols']) && is_callable($s['table'])
                && is_array($s['cols']) && isset($s['cols'][$s['pk']]))
            || ($s['kind'] === 'meta' && !empty($s['keys']) && is_array($s['keys']));
        if ($ok) {
            $s['group'] = isset($s['group']) ? (string) $s['group'] : 'دیگر';
            $out[$id] = $s;
        }
    }
    return $out;
}

/** نسخه‌ی هر افزونه — برای برچسبِ فایل و نسخه‌ی خودکار */
function phoenix_backup_versions() {
    $v = array('bridge' => PHOENIX_BRIDGE_VERSION);
    foreach ((array) apply_filters('phoenix_backup_versions', array()) as $k => $ver) {
        if (is_string($k) && preg_match('/^[a-z]{2,20}$/', $k) && is_scalar($ver)) {
            $v[$k] = (string) $ver;
        }
    }
    return $v;
}

/* ============================================================
   شمارش و بیرون‌بردن
   ============================================================ */

function phoenix_backup_meta_types() {
    return array('product', 'product_variation');
}

function phoenix_backup_count($s) {
    global $wpdb;
    if ($s['kind'] === 'option') {
        return count($s['options']);
    }
    if ($s['kind'] === 'table') {
        $t = call_user_func($s['table']);
        return (int) $wpdb->get_var("SELECT COUNT(*) FROM {$t}");
    }
    $in = implode(',', array_fill(0, count($s['keys']), '%s'));
    return (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(DISTINCT post_id) FROM {$wpdb->postmeta} WHERE meta_key IN ({$in})", ...array_values($s['keys'])
    ));
}

/**
 * یک دسته — ‎{rows, next}‎؛ ‎next = null‎ یعنی تمام.
 *
 * ⚠ نامِ جدول و ستون‌ها از تعریفِ بخش می‌آید، نه از درخواست؛
 *   مکان‌نما و اندازه با prepare.
 */
function phoenix_backup_export_batch($s, $cursor, $limit) {
    global $wpdb;
    $limit = max(1, min(PHOENIX_BACKUP_BATCH_MAX, (int) $limit));

    if ($s['kind'] === 'option') {
        $rows = array();
        foreach ($s['options'] as $name => $def) {
            $rows[] = array('name' => $name, 'value' => get_option($name, null));
        }
        return array('rows' => $rows, 'next' => null);
    }

    if ($s['kind'] === 'table') {
        $t    = call_user_func($s['table']);
        $pk   = $s['pk'];
        $cols = '`' . implode('`,`', array_keys($s['cols'])) . '`';
        $num  = in_array(rtrim($s['cols'][$pk], '?'), array('uint', 'int'), true);
        $sql  = $num
            ? $wpdb->prepare("SELECT {$cols} FROM {$t} WHERE `{$pk}` > %d ORDER BY `{$pk}` ASC LIMIT %d", (int) $cursor, $limit)
            : $wpdb->prepare("SELECT {$cols} FROM {$t} WHERE `{$pk}` > %s ORDER BY `{$pk}` ASC LIMIT %d", (string) $cursor, $limit);
        $rows = (array) $wpdb->get_results($sql, ARRAY_A);
        $next = count($rows) === $limit ? (string) end($rows)[$pk] : null;
        return array('rows' => $rows, 'next' => $next);
    }

    /* متا: اول شناسه‌ها، بعد متاهای همان‌ها — تا یک محصول بینِ دو دسته نصف نشود */
    $keys = array_values($s['keys']);
    $in   = implode(',', array_fill(0, count($keys), '%s'));
    $ids  = array_map('intval', (array) $wpdb->get_col($wpdb->prepare(
        "SELECT DISTINCT post_id FROM {$wpdb->postmeta} WHERE meta_key IN ({$in}) AND post_id > %d ORDER BY post_id ASC LIMIT %d",
        ...array_merge($keys, array((int) $cursor, $limit))
    )));
    $rows = array();
    foreach ($ids as $id) {
        $post = get_post($id);
        if (!$post || !in_array($post->post_type, phoenix_backup_meta_types(), true)) {
            continue;
        }
        $meta = array();
        foreach ($keys as $k) {
            $v = get_post_meta($id, $k, true);
            if ($v !== '' && $v !== null) {
                $meta[$k] = $v;
            }
        }
        $rows[] = array(
            'post_id' => $id, 'type' => $post->post_type, 'slug' => (string) $post->post_name,
            'sku' => (string) get_post_meta($id, '_sku', true), 'title' => (string) $post->post_title, 'meta' => $meta,
        );
    }
    return array('rows' => $rows, 'next' => count($ids) === $limit ? (string) end($ids) : null);
}

/* ============================================================
   بازگرداندن
   ============================================================ */

/**
 * @param string $mode merge | overwrite
 * @return array{inserted:int, replaced:int, skipped:int, rejected:int, notes:string[]}
 */
function phoenix_backup_import_batch($s, array $rows, $mode) {
    $res = array('inserted' => 0, 'replaced' => 0, 'skipped' => 0, 'rejected' => 0, 'notes' => array());
    if ($s['kind'] === 'option') {
        return phoenix_backup_import_options($s, $rows, $res);
    }
    if ($s['kind'] === 'table') {
        return phoenix_backup_import_table($s, $rows, $mode, $res);
    }
    return phoenix_backup_import_meta($s, $rows, $mode, $res);
}

/** ⚠ تنظیمات همیشه از فایل (در هر دو حالت) — ولی فقط کلیدهای شناخته و هم‌نوع */
function phoenix_backup_import_options($s, array $rows, array $res) {
    foreach ($rows as $r) {
        $name = is_array($r) && isset($r['name']) ? (string) $r['name'] : '';
        if (!isset($s['options'][$name]) || !array_key_exists('value', $r)) {
            $res['rejected']++;
            continue;
        }
        if ($r['value'] === null) {
            $res['skipped']++; // در سایتِ مبدأ هنوز ساخته نشده بود
            continue;
        }
        $def = $s['options'][$name];
        if ($def === 'secret') {
            if (!is_string($r['value']) || !preg_match('/^[a-f0-9]{32,128}$/', $r['value'])) {
                $res['rejected']++;
                continue;
            }
            $value = $r['value'];
        } else {
            $value = phoenix_backup_merge_settings(is_callable($def) ? (array) call_user_func($def) : array(), get_option($name, array()), $r['value']);
        }
        update_option($name, $value);
        $res['replaced']++;
    }
    if (!empty($s['after']) && is_callable($s['after'])) {
        call_user_func($s['after']);
    }
    /* اتصال‌ها با کلیدِ همین سایت رمز شده‌اند؛ در سایتِ دیگر باز نمی‌شوند */
    if (isset($s['options'][PHOENIX_SETTINGS_OPTION]) && function_exists('phoenix_connections')) {
        $broken = 0;
        foreach (phoenix_connections() as $row) {
            if (is_array($row) && phoenix_conn_key_state($row) !== 'ok') {
                $broken++;
            }
        }
        if ($broken) {
            $res['notes'][] = 'کلیدِ ' . $broken . ' اتصال در این سایت باز نمی‌شود (فایل از سایتِ دیگری است) — در «منابعِ قیمت ← اتصال‌ها» دوباره واردش کن.';
        }
    }
    return $res;
}

function phoenix_backup_import_table($s, array $rows, $mode, array $res) {
    global $wpdb;
    $t   = call_user_func($s['table']);
    $pk  = $s['pk'];
    $clean = array();
    foreach ($rows as $r) {
        $c = phoenix_backup_clean_row($r, $s['cols'], $pk);
        if ($c === null) {
            $res['rejected']++;
            continue;
        }
        $clean[(string) $c[$pk]] = $c;
    }
    if (!$clean) {
        return $res;
    }

    $num  = in_array(rtrim($s['cols'][$pk], '?'), array('uint', 'int'), true);
    $keys = array_keys($clean);
    $ph   = implode(',', array_fill(0, count($keys), $num ? '%d' : '%s'));
    $cols = '`' . implode('`,`', array_keys($s['cols'])) . '`';
    $current = array();
    foreach ((array) $wpdb->get_results($wpdb->prepare("SELECT {$cols} FROM {$t} WHERE `{$pk}` IN ({$ph})", ...$keys), ARRAY_A) as $row) {
        $current[(string) $row[$pk]] = $row;
    }

    /* خطای «کلیدِ تکراری» در پاسخِ JSON چاپ نشود — شمرده می‌شود */
    $quiet = $wpdb->suppress_errors(true);
    $wpdb->query('START TRANSACTION');
    foreach ($clean as $key => $row) {
        $do = phoenix_backup_decide($mode, $current[$key] ?? null, $row, (string) ($s['updated'] ?? ''), $s['keep'] ?? null);
        if ($do === 'skip') {
            $res['skipped']++;
            continue;
        }
        $fmt = array();
        foreach ($row as $col => $v) {
            $fmt[] = in_array(rtrim($s['cols'][$col], '?'), array('uint', 'int', 'bool'), true) ? '%d' : '%s';
        }
        $ok = $do === 'insert' ? $wpdb->insert($t, $row, $fmt) : $wpdb->replace($t, $row, $fmt);
        if ($ok === false) {
            /* معمولاً کلیدِ یکتای دیگری (مثلاً ‎chat_id‎) با ردیفِ دیگری یکی است */
            $res['skipped']++;
            continue;
        }
        $res[$do === 'insert' ? 'inserted' : 'replaced']++;
    }
    $wpdb->query('COMMIT');
    $wpdb->suppress_errors($quiet);
    return $res;
}

/** محصولِ مقصد: همان شناسه اگر همان محصول است؛ وگرنه با SKU یا نامک */
function phoenix_backup_meta_target($r) {
    $type = (string) ($r['type'] ?? '');
    if (!in_array($type, phoenix_backup_meta_types(), true)) {
        return 0;
    }
    $id   = (int) ($r['post_id'] ?? 0);
    $slug = (string) ($r['slug'] ?? '');
    $sku  = (string) ($r['sku'] ?? '');
    $p = $id ? get_post($id) : null;
    if ($p && $p->post_type === $type && ($slug === '' || $p->post_name === $slug)) {
        return $id;
    }
    if ($sku !== '' && function_exists('wc_get_product_id_by_sku')) {
        $sid = (int) wc_get_product_id_by_sku($sku);
        if ($sid && get_post_type($sid) === $type) {
            return $sid;
        }
    }
    if ($slug !== '' && $type === 'product') {
        $q = get_page_by_path($slug, OBJECT, 'product');
        if ($q) {
            return (int) $q->ID;
        }
    }
    return 0;
}

function phoenix_backup_import_meta($s, array $rows, $mode, array $res) {
    $missing = 0;
    foreach ($rows as $r) {
        if (!is_array($r) || !isset($r['meta']) || !is_array($r['meta'])) {
            $res['rejected']++;
            continue;
        }
        $id = phoenix_backup_meta_target($r);
        if (!$id) {
            $missing++;
            $res['skipped']++;
            continue;
        }
        $changed = false;
        foreach ($s['keys'] as $k) {
            if (!array_key_exists($k, $r['meta'])) {
                continue;
            }
            $v = $r['meta'][$k];
            if (!empty($s['codes'])) {
                /* قاعده‌ی ۱ — و زیرِ همان قفلی که فروش می‌گیرد */
                if (!phoenix_db_lock('phoenix_codes_' . $id, 10)) {
                    $res['notes'][] = 'انبارِ کدِ محصولِ ' . $id . ' مشغول بود؛ دوباره بازگردانی کن.';
                    continue;
                }
                try {
                    wp_cache_delete($id, 'post_meta');
                    $m = phoenix_backup_merge_codes(get_post_meta($id, $k, true), $v);
                    if ($m['added'] || $m['marked_used']) {
                        phoenix_save_codes($id, $m['codes']);
                        $changed = true;
                    }
                } finally {
                    phoenix_db_unlock('phoenix_codes_' . $id);
                }
                continue;
            }
            if ($k === PHOENIX_PSRC_META) {
                $c = phoenix_psrc_clean($v, array_keys(phoenix_connections()));
                $v = $c['data'];
            } elseif (!is_array($v) && !(is_string($v) && strlen($v) < 200000 && is_array(json_decode($v, true)))) {
                $res['rejected']++;
                continue;
            }
            $cur = get_post_meta($id, $k, true);
            if ($mode !== 'overwrite' && $cur !== '' && $cur !== null) {
                continue; // ادغام: پیکربندیِ فعلیِ محصول دست نمی‌خورد
            }
            update_post_meta($id, $k, $v);
            $changed = true;
        }
        $res[$changed ? 'replaced' : 'skipped']++;
    }
    if ($missing) {
        $res['notes'][] = $missing . ' محصول در این سایت پیدا نشد (نه با شناسه، نه SKU، نه نامک) و رد شد.';
    }
    return $res;
}

/* ============================================================
   نسخه‌ی خودکارِ تنظیمات
   ============================================================ */

function phoenix_backup_snapshot_options() {
    $out = array(PHOENIX_SETTINGS_OPTION);
    foreach ((array) apply_filters('phoenix_backup_snapshot_options', array()) as $name) {
        if (is_string($name) && preg_match('/^phoenix_[a-z0-9_]{2,60}$/', $name)) {
            $out[] = $name;
        }
    }
    return array_values(array_unique($out));
}

function phoenix_backup_snapshot_take($reason) {
    $data = array();
    foreach (phoenix_backup_snapshot_options() as $name) {
        $v = get_option($name, null);
        if ($v !== null) {
            $data[$name] = $v;
        }
    }
    $snap = array(
        'id' => bin2hex(random_bytes(6)), 'at' => gmdate('c'), 'reason' => substr((string) $reason, 0, 190),
        'versions' => phoenix_backup_versions(), 'data' => $data,
    );
    update_option(PHOENIX_BACKUP_SNAPS, phoenix_backup_snapshot_push(get_option(PHOENIX_BACKUP_SNAPS, array()), $snap), false);
    return $snap;
}

/**
 * ⚠ ‎plugins_loaded‎ با اولویتِ ۵: بعد از اینکه همه‌ی افزونه‌ها بار شده‌اند
 *   (نسخه‌ها معلوم‌اند) و پیش از به‌روزرسانیِ جدول‌های Phoenix Account
 *   (اولویتِ ۲۰) و Bridge (‎admin_init‎).
 */
add_action('plugins_loaded', 'phoenix_backup_watch_versions', 5);
function phoenix_backup_watch_versions() {
    $now    = phoenix_backup_versions();
    $seen   = get_option(PHOENIX_BACKUP_SEEN, null);
    $change = phoenix_backup_version_change($seen, $now);
    if ($change === '') {
        return;
    }
    /* چند درخواستِ هم‌زمان بعد از به‌روزرسانی — فقط یکی نسخه بگیرد */
    if (!add_option('phoenix_backup_watch_lock', time(), '', 'no')) {
        $at = (int) get_option('phoenix_backup_watch_lock');
        if (time() - $at < 60) {
            return;
        }
        update_option('phoenix_backup_watch_lock', time(), false);
    }
    phoenix_backup_snapshot_take(is_array($seen) ? 'پیش از نسخه‌ی تازه: ' . $change : 'نخستین نسخه‌ی خودکار');
    update_option(PHOENIX_BACKUP_SEEN, $now, true);
    delete_option('phoenix_backup_watch_lock');
}

function phoenix_backup_snapshot_restore($id) {
    foreach ((array) get_option(PHOENIX_BACKUP_SNAPS, array()) as $snap) {
        if (!is_array($snap) || ($snap['id'] ?? '') !== $id) {
            continue;
        }
        phoenix_backup_snapshot_take('پیش از بازگرداندنِ نسخه‌ی ' . ($snap['at'] ?? ''));
        $allowed = phoenix_backup_snapshot_options();
        foreach ((array) ($snap['data'] ?? array()) as $name => $value) {
            if (in_array($name, $allowed, true)) {
                update_option($name, $value);
            }
        }
        phoenix_settings_reset_cache();
        phoenix_audit('setting', 'backup', null, $snap['at'] ?? '', 'نسخه‌ی خودکارِ تنظیمات بازگردانده شد');
        return true;
    }
    return false;
}

/* ============================================================
   API — فقط مدیرِ کلِ سایت
   ============================================================ */

function phoenix_backup_can(WP_REST_Request $r) {
    if (!is_user_logged_in()) {
        return new WP_Error('phoenix_auth', 'نشستِ کاری منقضی شده. صفحه را تازه کن.', array('status' => 401));
    }
    if (!current_user_can('manage_options')) {
        return new WP_Error('phoenix_forbidden', 'پشتیبان‌گیری فقط برای مدیرِ کلِ سایت است — این فایل اطلاعاتِ مشتری‌ها را دارد.', array('status' => 403));
    }
    return true;
}

add_action('rest_api_init', 'phoenix_backup_routes');
function phoenix_backup_routes() {
    $p = array('permission_callback' => 'phoenix_backup_can');
    register_rest_route(PHOENIX_API_NS, '/admin/backup', $p + array('methods' => 'GET', 'callback' => 'phoenix_backup_api_manifest'));
    register_rest_route(PHOENIX_API_NS, '/admin/backup/export', $p + array(
        'methods' => 'GET', 'callback' => 'phoenix_backup_api_export',
        'args' => array(
            'section' => array('type' => 'string', 'required' => true),
            'cursor'  => array('type' => 'string', 'default' => ''),
            'limit'   => array('type' => 'integer', 'default' => 200, 'minimum' => 1, 'maximum' => PHOENIX_BACKUP_BATCH_MAX),
        ),
    ));
    register_rest_route(PHOENIX_API_NS, '/admin/backup/import', $p + array('methods' => 'POST', 'callback' => 'phoenix_backup_api_import'));
    register_rest_route(PHOENIX_API_NS, '/admin/backup/log', $p + array('methods' => 'POST', 'callback' => 'phoenix_backup_api_log'));
    register_rest_route(PHOENIX_API_NS, '/admin/backup/snapshot', $p + array('methods' => 'POST', 'callback' => 'phoenix_backup_api_snapshot'));
}

function phoenix_backup_api_manifest(WP_REST_Request $r) {
    $sections = array();
    foreach (phoenix_backup_sections() as $id => $s) {
        $sections[] = array('id' => $id, 'label' => $s['label'], 'group' => $s['group'], 'kind' => $s['kind'], 'count' => phoenix_backup_count($s));
    }
    $snaps = array();
    foreach ((array) get_option(PHOENIX_BACKUP_SNAPS, array()) as $snap) {
        if (is_array($snap) && isset($snap['id'])) {
            $snaps[] = array('id' => $snap['id'], 'at' => $snap['at'] ?? '', 'reason' => $snap['reason'] ?? '', 'versions' => $snap['versions'] ?? array());
        }
    }
    return phoenix_api_ok(array(
        'site' => (string) wp_parse_url(home_url(), PHP_URL_HOST), 'versions' => phoenix_backup_versions(),
        'format' => PHOENIX_BACKUP_FORMAT, 'v' => PHOENIX_BACKUP_V, 'batch' => PHOENIX_BACKUP_BATCH_MAX,
        'sections' => $sections, 'snapshots' => $snaps,
    ));
}

function phoenix_backup_api_export(WP_REST_Request $r) {
    $all = phoenix_backup_sections();
    $id  = (string) $r['section'];
    if (!isset($all[$id])) {
        return phoenix_api_fail('phoenix_backup_section', 'این بخش در این نسخه نیست.', 404);
    }
    return phoenix_api_ok(phoenix_backup_export_batch($all[$id], (string) $r['cursor'], (int) $r['limit']));
}

function phoenix_backup_api_import(WP_REST_Request $r) {
    $b    = (array) $r->get_json_params();
    $all  = phoenix_backup_sections();
    $id   = (string) ($b['section'] ?? '');
    $mode = ($b['mode'] ?? '') === 'overwrite' ? 'overwrite' : 'merge';
    $rows = isset($b['rows']) && is_array($b['rows']) ? array_values($b['rows']) : null;
    if (!isset($all[$id])) {
        /* فایلِ نسخه‌ی تازه‌تر بخشی دارد که این نسخه نمی‌شناسد — رد، نه خطا */
        return phoenix_api_ok(array('inserted' => 0, 'replaced' => 0, 'skipped' => 0, 'rejected' => 0,
            'notes' => array('بخشِ «' . substr($id, 0, 60) . '» در این نسخه نیست و رد شد.')));
    }
    if ($rows === null || count($rows) > PHOENIX_BACKUP_BATCH_MAX) {
        return phoenix_api_fail('phoenix_backup_batch', 'هر دسته حداکثر ' . PHOENIX_BACKUP_BATCH_MAX . ' ردیف.', 422);
    }
    return phoenix_api_ok(phoenix_backup_import_batch($all[$id], $rows, $mode));
}

/** یک سطر در تاریخچه برای هر خروجی/بازگردانیِ کامل — پنل در پایان می‌فرستد */
function phoenix_backup_api_log(WP_REST_Request $r) {
    $b   = (array) $r->get_json_params();
    $act = ($b['act'] ?? '') === 'import' ? 'import' : 'export';
    $ids = array_filter(array_map('strval', (array) ($b['sections'] ?? array())), 'phoenix_backup_section_id_ok');
    $note = $act === 'import'
        ? 'بازگردانی از فایل (' . (($b['mode'] ?? '') === 'overwrite' ? 'جایگزینی' : 'ادغام') . ')'
        : 'فایلِ پشتیبان ساخته شد';
    phoenix_audit('setting', 'backup', null, implode(',', array_slice($ids, 0, 20)), $note);
    return phoenix_api_ok(array('logged' => true));
}

function phoenix_backup_api_snapshot(WP_REST_Request $r) {
    $b = (array) $r->get_json_params();
    if (($b['act'] ?? '') === 'restore') {
        if (!phoenix_backup_snapshot_restore((string) ($b['id'] ?? ''))) {
            return phoenix_api_fail('phoenix_backup_snapshot', 'این نسخه دیگر نیست.', 404);
        }
    } else {
        phoenix_backup_snapshot_take('دستی از پنل');
    }
    return phoenix_backup_api_manifest($r);
}
