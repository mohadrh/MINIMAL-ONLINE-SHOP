<?php
/**
 * هسته‌ی خالصِ پشتیبان‌گیری — بدونِ وردپرس تست می‌شود
 * (tests/backup-test.php). هر تصمیمِ «این ردیف درست است؟» و «کدام
 * بماند؟» این‌جاست؛ backup.php فقط به پایگاه داده وصلش می‌کند.
 *
 * ============================================================
 * ⚠ سه قاعده که هیچ بازگردانی نمی‌شکند
 *
 *   ۱ کدِ فروخته‌شده هیچ‌وقت دوباره آزاد نمی‌شود. فایلِ دیروز می‌گوید
 *     کد آزاد بود؛ امروز فروخته شده. اگر فایل برنده می‌شد، همان کد
 *     دوباره به مشتریِ دیگری فروخته می‌شد.
 *   ۲ کارِ تحویل‌شده‌ی صف به «منتظر» برنمی‌گردد — وگرنه دوباره تحویل
 *     (و شاید دوباره خرید از تأمین‌کننده) می‌شد.
 *   ۳ در «ادغام» ردیفِ تازه‌ترِ سایت می‌ماند؛ فایل فقط چیزی را که
 *     نیست اضافه، یا کهنه‌تر را تازه می‌کند.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_BACKUP_FORMAT    = 'phoenix-backup';
const PHOENIX_BACKUP_V         = 1;
const PHOENIX_BACKUP_BATCH_MAX = 500;
const PHOENIX_BACKUP_SNAP_MAX  = 5;

/**
 * یک ردیف از فایل → ردیفِ امن برای پایگاه داده، یا ‎null‎.
 *
 * ‎$cols‎: ‎[ستون => نوع]‎ — ‎uint‎، ‎int‎، ‎bool‎، ‎str:N‎، ‎text‎، ‎long‎،
 * ‎datetime‎ و ‎datetime?‎ (خالی‌پذیر). ستونی که در فهرست نیست دور
 * ریخته می‌شود (فایلِ نسخه‌ی دیگر ستونی دارد که این نسخه ندارد).
 * ستونی که در ردیف نیست حذف می‌شود تا پیش‌فرضِ جدول بنشیند.
 */
function phoenix_backup_clean_row($row, array $cols, $pk) {
    if (!is_array($row) || !array_key_exists($pk, $row)) {
        return null;
    }
    $out = array();
    foreach ($cols as $col => $type) {
        if (!array_key_exists($col, $row)) {
            continue;
        }
        $v = $row[$col];
        $nullable = substr($type, -1) === '?';
        $t = rtrim($type, '?');
        if ($v === null) {
            if (!$nullable) {
                return null;
            }
            $out[$col] = null;
            continue;
        }
        if (!is_scalar($v)) {
            return null;
        }
        if ($t === 'uint' || $t === 'int') {
            $s = is_int($v) ? (string) $v : (string) $v;
            if (!preg_match($t === 'uint' ? '/^\d{1,19}$/' : '/^-?\d{1,19}$/', $s)) {
                return null;
            }
            $out[$col] = (int) $s;
        } elseif ($t === 'bool') {
            $out[$col] = ($v === true || $v === 1 || $v === '1') ? 1 : 0;
        } elseif ($t === 'datetime') {
            if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', (string) $v)) {
                return null;
            }
            $out[$col] = (string) $v;
        } elseif (strpos($t, 'str:') === 0) {
            $max = (int) substr($t, 4);
            $out[$col] = function_exists('mb_substr') ? mb_substr((string) $v, 0, $max, 'UTF-8') : substr((string) $v, 0, $max);
        } elseif ($t === 'text') {
            $out[$col] = substr((string) $v, 0, 65535);
        } elseif ($t === 'long') {
            $out[$col] = substr((string) $v, 0, 4 * 1024 * 1024);
        } else {
            return null; // نوعِ ناشناخته — خطای برنامه‌نویس، نه داده
        }
    }
    if (!array_key_exists($pk, $out) || $out[$pk] === '' || $out[$pk] === null) {
        return null;
    }
    return $out;
}

/**
 * ردیفِ فایل با ردیفِ فعلی — چه شود؟
 *
 * @param string     $mode    merge | overwrite
 * @param array|null $current ردیفِ فعلی در سایت
 * @param string     $updated ستونِ «آخرین تغییر»، یا ''
 * @param callable|null $keep ‎fn($current, $incoming): bool‎ — ‎true‎ یعنی فعلی به هر حال بماند
 * @return string insert | replace | skip
 */
function phoenix_backup_decide($mode, $current, array $incoming, $updated = '', $keep = null) {
    if ($current === null) {
        return 'insert';
    }
    if ($keep && call_user_func($keep, $current, $incoming)) {
        return 'skip';
    }
    if ($mode === 'overwrite') {
        return 'replace';
    }
    if ($updated !== '' && isset($incoming[$updated], $current[$updated])
        && strcmp((string) $incoming[$updated], (string) $current[$updated]) > 0) {
        return 'replace';
    }
    return 'skip';
}

/** قاعده‌ی ۲: کارِ تحویل‌شده برنمی‌گردد */
function phoenix_backup_keep_done_job($current, $incoming) {
    return isset($current['status']) && $current['status'] === 'done'
        && (!isset($incoming['status']) || $incoming['status'] !== 'done');
}

/**
 * انبارِ کد: فعلی + فایل — قاعده‌ی ۱.
 *
 * کدی که در سایت نیست اضافه می‌شود (با همان وضعیتی که در فایل داشت).
 * کدی که هر دو دارند: اگر یکی می‌گوید فروخته شده، فروخته شده است —
 * حتی در «جایگزینی».
 *
 * @return array{codes:array, added:int, marked_used:int}
 */
function phoenix_backup_merge_codes($current, $incoming) {
    $clean = function ($c) {
        if (!is_array($c) || !isset($c['value']) || !is_scalar($c['value'])) {
            return null;
        }
        $v = trim((string) $c['value']);
        if ($v === '' || strlen($v) > 500) {
            return null;
        }
        $out = array('value' => $v, 'used' => !empty($c['used']));
        foreach (array('added_at', 'used_at') as $k) {
            if (isset($c[$k]) && is_string($c[$k]) && preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $c[$k])) {
                $out[$k] = $c[$k];
            }
        }
        if (isset($c['order_id']) && is_scalar($c['order_id']) && preg_match('/^\d{1,19}$/', (string) $c['order_id'])) {
            $out['order_id'] = (int) $c['order_id'];
        }
        return $out;
    };

    $list  = array();
    $index = array();
    foreach (is_array($current) ? $current : array() as $c) {
        if (!is_array($c) || !isset($c['value'])) {
            continue;
        }
        $index[(string) $c['value']] = count($list);
        $list[] = $c; // فعلی همان‌طور که هست — حتی کلیدهایی که این نسخه نمی‌شناسد
    }
    $added = 0;
    $marked = 0;
    foreach (is_array($incoming) ? $incoming : array() as $raw) {
        $c = $clean($raw);
        if ($c === null) {
            continue;
        }
        if (!isset($index[$c['value']])) {
            $index[$c['value']] = count($list);
            $list[] = $c;
            $added++;
            continue;
        }
        $i = $index[$c['value']];
        if (empty($list[$i]['used']) && $c['used']) {
            $list[$i] = array_merge($list[$i], array_intersect_key($c, array_flip(array('used', 'order_id', 'used_at'))));
            $marked++;
        }
    }
    return array('codes' => $list, 'added' => $added, 'marked_used' => $marked);
}

/**
 * تنظیمات از فایل: فقط کلیدهایی که این نسخه می‌شناسد (پیش‌فرض‌ها یا
 * آنچه همین حالا ذخیره است)، و هر مقدار هم‌نوعِ پیش‌فرضش.
 */
function phoenix_backup_merge_settings(array $defaults, $current, $incoming) {
    $current = is_array($current) ? $current : array();
    if (!is_array($incoming)) {
        return $current;
    }
    $known = array_merge($defaults, $current);
    $out = $current;
    foreach ($incoming as $k => $v) {
        if (!is_string($k) || !array_key_exists($k, $known)) {
            continue;
        }
        $ref = $known[$k];
        if (is_array($ref)) {
            if (!is_array($v)) {
                continue;
            }
        } elseif (is_bool($ref)) {
            $v = (bool) $v;
        } elseif (is_int($ref) || is_float($ref)) {
            if (!is_numeric($v)) {
                continue;
            }
            $v = is_int($ref) && (string) (int) $v === (string) $v ? (int) $v : (float) $v;
        } elseif (is_string($ref) || $ref === null) {
            if (!is_scalar($v) && $v !== null) {
                continue;
            }
            $v = $v === null ? null : (string) $v;
        }
        $out[$k] = $v;
    }
    return $out;
}

/** حلقه‌ی نسخه‌های خودکار — تازه‌ترین اول، حداکثر ‎$max‎ */
function phoenix_backup_snapshot_push($ring, array $snap, $max = PHOENIX_BACKUP_SNAP_MAX) {
    $ring = is_array($ring) ? array_values($ring) : array();
    array_unshift($ring, $snap);
    return array_slice($ring, 0, max(1, (int) $max));
}

/** نسخه‌ها عوض شده‌اند؟ متنِ کوتاه برای برچسبِ نسخه‌ی خودکار، یا '' */
function phoenix_backup_version_change($seen, array $now) {
    $seen = is_array($seen) ? $seen : array();
    $parts = array();
    foreach ($now as $k => $v) {
        $old = isset($seen[$k]) ? (string) $seen[$k] : '';
        if ($old !== (string) $v) {
            $parts[] = $k . ' ' . ($old === '' ? 'نصب' : $old) . ' ← ' . $v;
        }
    }
    return implode('، ', $parts);
}

/** شناسه‌ی بخش — فقط از فهرستِ ثبت‌شده، ولی شکلش هم سخت‌گیرانه */
function phoenix_backup_section_id_ok($id) {
    return is_string($id) && preg_match('/^[a-z][a-z0-9_]{1,20}\.[a-z][a-z0-9_]{1,30}$/', $id) === 1;
}
