<?php
/**
 * قیمتِ محصول از چند منبع.
 *
 * ============================================================
 * خواسته‌ی کارفرما: «یک محصول را از سه جا بخوان، طبقِ الگو یکی را
 * انتخاب کن — مثلاً کمترین — سود را رویش بگذار و روی سایت ببر؛
 * و بشود دستی هم انتخاب کرد.»
 *
 *   منبع      API (نشانی + مسیرِ عدد + اتصال) یا عددی که ادمین
 *             خودش می‌نویسد (قیمتی که تأمین‌کننده در تلگرام داده)
 *   واحد      دلار (× نرخِ تتر)، تومان، یا ریال
 *   الگو      کمترین، میانه، میانگین، اولین پاسخ، یا یک منبعِ مشخص
 *   بعد       همان موتور: حاشیه ← رُند ← تخفیف ← کف
 *
 * ============================================================
 * ⚠ دو محافظ، چون حالا قیمت از جایی می‌آید که دستِ ما نیست
 *
 *   ۱ اگر هیچ منبعی جواب ندهد، قیمت عوض نمی‌شود — آخرین عددِ
 *     سالم می‌ماند. «صفر» یا «نامعلوم» هیچ‌وقت روی سایت نمی‌رود.
 *
 *   ۲ جهشِ بیش از سقف (مثلاً ۳۰٪) نگه داشته می‌شود تا ادمین
 *     تأییدش کند. APIی که یک روز به‌جای دلار سنت برگرداند، قیمت را
 *     صدبرابر نمی‌کند؛ هشدار می‌دهد.
 *
 * ⚠ پیکربندی در متای جدای ‎_phoenix_sources‎ است، نه در ‎_phoenix‎.
 *   ‎_phoenix‎ (فیلدهای نمایشی‌اش) از REST بیرون می‌رود؛ نشانیِ
 *   تأمین‌کننده‌ها کسبِ‌وکارِ ماست. کلیدِ API که اصلاً این‌جا نیست
 *   (connections.php).
 *
 * ⚠ ‎phoenix_psrc_clean()‎ و ‎phoenix_psrc_pick()‎ خالص‌اند و بدونِ
 *   وردپرس تست می‌شوند (tests/product-sources-test.php).
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_PSRC_META  = '_phoenix_sources';
const PHOENIX_PSRC_STATE = '_phoenix_sources_state';
const PHOENIX_PSRC_MAX   = 6;
const PHOENIX_PSRC_PICKS = array('lowest', 'median', 'average', 'first', 'pinned');
const PHOENIX_PSRC_UNITS = array('usd', 'toman', 'rial');

/* ============================================================
   اعتبارسنجی — خالص
   ============================================================ */

function phoenix_psrc_blank() {
    return array('list' => array(), 'pick' => 'lowest', 'pinned' => '', 'max_jump' => 30);
}

/**
 * @param string[] $conns اسلاگِ اتصال‌های موجود
 * @return array{ok:bool, data:array, errors:array<string,string>}
 *         ‎data‎ همیشه هست (برای پیش‌نمایش حتی با خطا)
 */
function phoenix_psrc_clean($in, array $conns = array()) {
    $in  = is_array($in) ? $in : array();
    $err = array();
    $out = phoenix_psrc_blank();

    $rows = isset($in['list']) && is_array($in['list']) ? array_values($in['list']) : array();
    if (count($rows) > PHOENIX_PSRC_MAX) {
        $err['list'] = 'حداکثر ' . PHOENIX_PSRC_MAX . ' منبع برای هر قیمت.';
        $rows = array_slice($rows, 0, PHOENIX_PSRC_MAX);
    }

    $ids = array();
    foreach ($rows as $i => $r) {
        if (!is_array($r)) {
            continue;
        }
        $id = isset($r['id']) ? (string) $r['id'] : '';
        if (!preg_match('/^s[a-z0-9]{1,10}$/', $id) || isset($ids[$id])) {
            $id = 's' . $i . substr(md5(serialize($r) . $i), 0, 5);
        }
        $ids[$id] = true;

        $label = phoenix_source_line(isset($r['label']) ? $r['label'] : '', 60);
        $kind  = isset($r['kind']) && $r['kind'] === 'fixed' ? 'fixed' : 'api';
        $unit  = isset($r['unit']) ? (string) $r['unit'] : '';
        $row   = array('id' => $id, 'label' => $label, 'kind' => $kind, 'unit' => $unit,
                       'on' => !array_key_exists('on', $r) || !empty($r['on']),
                       'url' => '', 'path' => '', 'conn' => '', 'value' => 0);
        $p = 'list.' . $i . '.';

        if ($label === '') {
            $err[$p . 'label'] = 'منبعِ ' . ($i + 1) . ' اسم ندارد.';
        }
        if (!in_array($unit, PHOENIX_PSRC_UNITS, true)) {
            /* ⚠ پیش‌فرض ندارد: دلار یا تومان یا ریالِ اشتباه یعنی
               قیمتِ صدها یا ده برابر. */
            $err[$p . 'unit'] = 'واحدِ «' . ($label ?: 'منبعِ ' . ($i + 1)) . '» را انتخاب کن.';
        }

        if ($kind === 'fixed') {
            $v = (float) (isset($r['value']) ? $r['value'] : 0);
            if ($v <= 0 || $v > 1e11) {
                $err[$p . 'value'] = 'عددِ «' . ($label ?: 'منبعِ ' . ($i + 1)) . '» باید بیشتر از صفر باشد.';
            }
            $row['value'] = round(max(0, min(1e11, $v)), 4);
        } else {
            $row['url']  = trim((string) (isset($r['url']) ? $r['url'] : ''));
            $row['path'] = trim((string) (isset($r['path']) ? $r['path'] : ''));
            $row['conn'] = isset($r['conn']) ? (string) $r['conn'] : '';
            if (($e = phoenix_source_url_error($row['url'])) !== '') {
                $err[$p . 'url'] = $e;
            }
            if (($e = phoenix_source_path_error($row['path'])) !== '') {
                $err[$p . 'path'] = $e;
            }
            if (($e = phoenix_source_conn_error($row['conn'], $conns)) !== '') {
                $err[$p . 'conn'] = $e;
            }
        }
        $out['list'][] = $row;
    }

    if (!array_filter(array_column($out['list'], 'on'))) {
        $err['list'] = 'دست‌کم یک منبعِ روشن لازم است.';
    }

    $pick = isset($in['pick']) ? (string) $in['pick'] : 'lowest';
    $out['pick'] = in_array($pick, PHOENIX_PSRC_PICKS, true) ? $pick : 'lowest';

    if ($out['pick'] === 'pinned') {
        $pin = isset($in['pinned']) ? (string) $in['pinned'] : '';
        if (!isset($ids[$pin])) {
            $err['pinned'] = 'منبعی که قیمت باید از آن بیاید را انتخاب کن.';
        }
        $out['pinned'] = isset($ids[$pin]) ? $pin : '';
    }

    $out['max_jump'] = max(0, min(500, (int) (isset($in['max_jump']) ? $in['max_jump'] : 30)));

    return array('ok' => !$err, 'data' => $out, 'errors' => $err);
}

/* ============================================================
   انتخاب — خالص
   ============================================================ */

/** ارقام و جداکننده‌ی فارسی برای متنی که پنل نشان می‌دهد */
function phoenix_psrc_fa($s) {
    return strtr((string) $s, array('0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴',
        '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹', ',' => '٬'));
}

/** یک عدد در واحدِ منبع → تومان. ‎null‎ یعنی قابلِ تبدیل نیست */
function phoenix_psrc_toman($value, $unit, $rate) {
    if (!is_numeric($value) || $value <= 0) {
        return null;
    }
    if ($unit === 'usd') {
        return $rate > 0 ? (int) round($value * $rate) : null;
    }
    return (int) round($unit === 'rial' ? $value / 10 : $value);
}

/**
 * @param array      $cfg     خروجیِ ‎phoenix_psrc_clean‎
 * @param array      $results ‎[id => {value, unit, status, note}]‎
 * @param int        $rate    نرخِ تتر
 * @param array|null $last    عددی که الان در کار است ‎{value, unit}‎
 * @return array{
 *   ok:bool, value:?float, unit:string, toman:?int, from:string,
 *   why:string, held:string, rows:array<string,?int>
 * }
 */
function phoenix_psrc_pick(array $cfg, array $results, $rate, $last = null) {
    $labels = array();
    $cands  = array(); // id => toman
    $rows   = array();
    foreach ($cfg['list'] as $s) {
        $labels[$s['id']] = $s['label'];
        $r = isset($results[$s['id']]) ? $results[$s['id']] : null;
        $t = ($s['on'] && $r && $r['status'] === 'ok') ? phoenix_psrc_toman($r['value'], $s['unit'], $rate) : null;
        $rows[$s['id']] = $t;
        if ($t !== null) {
            $cands[$s['id']] = $t;
        }
    }

    $none = array('ok' => false, 'value' => null, 'unit' => '', 'toman' => null, 'from' => '', 'why' => '', 'held' => '', 'rows' => $rows);

    if (!$cands) {
        $none['held'] = 'هیچ منبعی عددِ قابلِ استفاده نداد — قیمت همان قبلی می‌ماند.';
        return $none;
    }

    $n = count($cands);
    switch ($cfg['pick']) {
        case 'pinned':
            if (!isset($cands[$cfg['pinned']])) {
                $none['held'] = 'منبعِ انتخاب‌شده («' . (isset($labels[$cfg['pinned']]) ? $labels[$cfg['pinned']] : '؟') . '») جواب نداد — قیمت همان قبلی می‌ماند.';
                return $none;
            }
            $from = $cfg['pinned'];
            $why  = 'دستی: همیشه از «' . $labels[$from] . '».';
            break;

        case 'first':
            $from = (string) key($cands);
            $why  = 'اولین منبعی که جواب داد: «' . $labels[$from] . '».';
            break;

        case 'median':
        case 'average':
            $vals = array_values($cands);
            sort($vals);
            if ($cfg['pick'] === 'median') {
                $mid   = (int) floor($n / 2);
                $toman = $n % 2 ? $vals[$mid] : (int) round(($vals[$mid - 1] + $vals[$mid]) / 2);
                $why   = 'میانه‌ی ' . phoenix_psrc_fa($n) . ' منبع.';
            } else {
                $toman = (int) round(array_sum($vals) / $n);
                $why   = 'میانگینِ ' . phoenix_psrc_fa($n) . ' منبع.';
            }
            $from  = $cfg['pick'];
            $value = $toman;
            $unit  = 'toman';
            break;

        default: // lowest
            asort($cands);
            $from = (string) key($cands);
            $why  = 'کمترین از ' . phoenix_psrc_fa($n) . ' منبع: «' . $labels[$from] . '».';
    }

    if (!isset($value)) {
        /* از یک منبعِ مشخص: عدد و واحدِ خودش می‌ماند. منبعِ دلاری
           دلاری می‌ماند تا عوض شدنِ نرخِ تتر هم رویش اثر کند. */
        $toman = $cands[$from];
        foreach ($cfg['list'] as $s) {
            if ($s['id'] === $from) {
                $value = (float) $results[$from]['value'];
                $unit  = $s['unit'];
            }
        }
    }

    $out = array('ok' => true, 'value' => $value, 'unit' => $unit, 'toman' => $toman,
                 'from' => $from, 'why' => $why, 'held' => '', 'rows' => $rows);

    /* ---------- محافظِ جهش ---------- */
    if ($cfg['max_jump'] > 0 && is_array($last)) {
        $before = phoenix_psrc_toman(isset($last['value']) ? $last['value'] : 0, isset($last['unit']) ? $last['unit'] : '', $rate);
        if ($before) {
            $jump = abs($toman - $before) / $before * 100;
            if ($jump > $cfg['max_jump']) {
                $out['held'] = sprintf('جهشِ %s٪ (از %s به %s تومان) — بیش از سقفِ %s٪. تا تأیید نکنی، قیمتِ قبلی می‌ماند.',
                    phoenix_psrc_fa(round($jump)), phoenix_psrc_fa(number_format($before)),
                    phoenix_psrc_fa(number_format($toman)), phoenix_psrc_fa($cfg['max_jump']));
            }
        }
    }
    return $out;
}

/* ============================================================
   وردپرس: خواندن، ذخیره، به‌روزرسانی
   ============================================================ */

function phoenix_psrc_config($post_id) {
    $c = get_post_meta($post_id, PHOENIX_PSRC_META, true);
    return is_array($c) && isset($c['list']) ? array_merge(phoenix_psrc_blank(), $c) : null;
}

function phoenix_psrc_state($post_id) {
    $s = get_post_meta($post_id, PHOENIX_PSRC_STATE, true);
    return is_array($s) ? $s : array();
}

/**
 * وضعیت برای پنل.
 *
 * ⚠ فقط عدد و وضعیت؛ پیکربندی جداست و کلید اصلاً این‌جا نیست.
 * یادداشتِ هر منبع ممکن است کلیدهای پاسخِ API را داشته باشد
 * (راهنمای مسیر) — متن است و پنل آن را متن می‌گذارد.
 */
function phoenix_psrc_state_public($post_id) {
    $s = phoenix_psrc_state($post_id);
    if (!$s) {
        return null;
    }
    return array(
        'at'        => isset($s['at']) ? $s['at'] : null,
        'results'   => isset($s['results']) ? $s['results'] : array(),
        'pick'      => isset($s['pick']) ? $s['pick'] : null,
        'use'       => isset($s['use']) ? $s['use'] : null,
        'candidate' => isset($s['candidate']) ? $s['candidate'] : null,
    );
}

/**
 * منابع را بخوان — بدونِ ذخیره.
 *
 * @return array ‎[id => {value, unit, status, note, ms}]‎
 */
function phoenix_psrc_fetch(array $cfg) {
    $out = array();
    foreach ($cfg['list'] as $s) {
        if (!$s['on']) {
            $out[$s['id']] = array('value' => null, 'unit' => $s['unit'], 'status' => 'off', 'note' => 'خاموش', 'ms' => 0);
            continue;
        }
        if ($s['kind'] === 'fixed') {
            $out[$s['id']] = array('value' => (float) $s['value'], 'unit' => $s['unit'], 'status' => 'ok', 'note' => 'عددِ دستی', 'ms' => 0);
            continue;
        }
        $conn = null;
        if ($s['conn'] !== '') {
            $conn = phoenix_conn_runtime($s['conn']);
            if ($conn === null) {
                $out[$s['id']] = array('value' => null, 'unit' => $s['unit'], 'status' => 'conn',
                                       'note' => 'کلیدِ اتصال باز نمی‌شود یا اتصال حذف شده.', 'ms' => 0);
                continue;
            }
        }
        $r = phoenix_source_read($s['url'], $s['path'], $conn);
        $out[$s['id']] = array('value' => $r['value'], 'unit' => $s['unit'], 'status' => $r['status'], 'note' => $r['note'], 'ms' => $r['ms']);
    }
    return $out;
}

/**
 * به‌روزرسانیِ یک محصول یا پلن: بخوان، انتخاب کن، ذخیره کن.
 *
 * ⚠ ‎use‎ همان عددی است که موتور می‌خواند. فقط وقتی عوض می‌شود
 * که انتخاب سالم و بی‌جهش باشد؛ وگرنه آخرین عددِ سالم می‌ماند و
 * پیشنهادِ تازه در ‎candidate‎ منتظرِ تأیید می‌نشیند.
 */
function phoenix_psrc_refresh($post_id, $reason = '') {
    $cfg = phoenix_psrc_config($post_id);
    if (!$cfg) {
        return null;
    }
    $prev    = phoenix_psrc_state($post_id);
    $results = phoenix_psrc_fetch($cfg);
    $pick    = phoenix_psrc_pick($cfg, $results, phoenix_rate_value(), isset($prev['use']) ? $prev['use'] : null);

    $state = array(
        'at'        => gmdate('c'),
        'results'   => $results,
        'pick'      => $pick,
        'use'       => isset($prev['use']) ? $prev['use'] : null,
        'candidate' => null,
    );
    if ($pick['ok'] && $pick['held'] === '') {
        $state['use'] = array('value' => $pick['value'], 'unit' => $pick['unit'], 'from' => $pick['from'], 'at' => $state['at']);
    } elseif ($pick['ok']) {
        $state['candidate'] = array('value' => $pick['value'], 'unit' => $pick['unit'], 'from' => $pick['from']);
    }
    update_post_meta($post_id, PHOENIX_PSRC_STATE, $state);

    $before = isset($prev['use']['value']) ? $prev['use']['value'] . ' ' . $prev['use']['unit'] : null;
    $after  = isset($state['use']['value']) ? $state['use']['value'] . ' ' . $state['use']['unit'] : null;
    if ($before !== $after) {
        phoenix_audit('price', (string) $post_id, $before, $after, ($reason !== '' ? $reason . ' — ' : '') . 'منابعِ قیمت: ' . $pick['why']);
    }
    return $state;
}

/** تأییدِ پیشنهادی که محافظِ جهش نگهش داشته */
function phoenix_psrc_approve($post_id) {
    $state = phoenix_psrc_state($post_id);
    if (empty($state['candidate'])) {
        return false;
    }
    $before = isset($state['use']['value']) ? $state['use']['value'] . ' ' . $state['use']['unit'] : null;
    $state['use'] = array_merge($state['candidate'], array('at' => gmdate('c')));
    $state['candidate'] = null;
    if (isset($state['pick'])) {
        $state['pick']['held'] = '';
    }
    update_post_meta($post_id, PHOENIX_PSRC_STATE, $state);
    phoenix_audit('price', (string) $post_id, $before, $state['use']['value'] . ' ' . $state['use']['unit'], 'تأییدِ دستیِ جهشِ قیمت');
    return true;
}

/**
 * هزینه برای موتور — همان شکلِ ‎phoenix_cost_of‎.
 *
 * @return array|null ‎null‎ یعنی هنوز عددی نیست؛ موتور دست نمی‌زند
 */
function phoenix_psrc_cost($post_id) {
    $state = phoenix_psrc_state($post_id);
    return empty($state['use']) ? null : phoenix_psrc_cost_of_use($state['use']);
}

/** ‎{value, unit}‎ → شکلِ هزینه‌ی موتور */
function phoenix_psrc_cost_of_use($u) {
    if (!is_array($u) || !isset($u['value'], $u['unit']) || !is_numeric($u['value']) || $u['value'] <= 0
        || !in_array($u['unit'], PHOENIX_PSRC_UNITS, true)) {
        return null;
    }
    if ($u['unit'] === 'usd') {
        return array('mode' => 'usd', 'usd' => (float) $u['value'], 'toman' => 0.0);
    }
    return array('mode' => 'toman', 'usd' => 0.0, 'toman' => (float) ($u['unit'] === 'rial' ? $u['value'] / 10 : $u['value']));
}

/**
 * نتیجه‌ی «بگیر» که مرورگر برای پیش‌نمایش پس می‌فرستد.
 *
 * ⚠ فقط برای پیش‌نمایش، و باز هم پاک‌سازی می‌شود. هیچ‌وقت ذخیره
 * نمی‌شود: موقعِ ذخیره سرور خودش دوباره از منابع می‌خواند.
 */
function phoenix_psrc_try_pick($t) {
    if (!is_array($t) || !isset($t['value'], $t['unit']) || !is_numeric($t['value'])) {
        return null;
    }
    $v = (float) $t['value'];
    if ($v <= 0 || $v > 1e11 || !in_array($t['unit'], PHOENIX_PSRC_UNITS, true)) {
        return null;
    }
    return array('value' => $v, 'unit' => (string) $t['unit'],
                 'why' => phoenix_source_line(isset($t['why']) ? $t['why'] : '', 200));
}

/**
 * ساعتی: همه‌ی محصولات و پلن‌هایی که منبع دارند.
 *
 * ⚠ بعد از نرخِ تتر اجرا می‌شود (اولویتِ ۳۰ در برابرِ ۱۰)، تا
 * منبعِ دلاری با نرخِ تازه مقایسه شود. و سقفِ زمانی دارد: هاستِ
 * اشتراکی درخواستِ PHPِ طولانی را می‌کشد، و نیمه‌کاره ماندن بدتر
 * از ادامه در ساعتِ بعد است.
 */
add_action('phoenix_rate_hourly', 'phoenix_psrc_refresh_all', 30);
function phoenix_psrc_refresh_all() {
    global $wpdb;
    $ids = array_map('intval', (array) $wpdb->get_col($wpdb->prepare(
        "SELECT pm.post_id FROM {$wpdb->postmeta} pm
           INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
          WHERE pm.meta_key = %s AND p.post_status NOT IN ('trash', 'auto-draft')
          ORDER BY pm.post_id",
        PHOENIX_PSRC_META
    )));

    $started = time();
    $engine  = (bool) phoenix_setting('engine_on');
    $rate    = phoenix_rate_value();
    foreach ($ids as $id) {
        if (time() - $started > 40) {
            break;
        }
        phoenix_psrc_refresh($id);
        if ($engine) {
            phoenix_psrc_apply_tree($id, $rate);
        }
    }
}

/** قیمت را روی خودش و — اگر محصولِ متغیر است — روی پلن‌هایی که از آن ارث می‌برند بنویس */
function phoenix_psrc_apply_tree($id, $rate) {
    phoenix_apply_price($id, $rate, 'منابعِ قیمت');
    $p = function_exists('wc_get_product') ? wc_get_product($id) : null;
    if ($p && $p->is_type('variable')) {
        foreach ($p->get_children() as $cid) {
            phoenix_apply_price((int) $cid, $rate, 'منابعِ قیمت');
        }
    }
}

/** شمارِ قیمت‌هایی که الان نگه داشته شده‌اند — برای داشبورد */
function phoenix_psrc_held_count() {
    global $wpdb;
    $rows = (array) $wpdb->get_col($wpdb->prepare(
        "SELECT meta_value FROM {$wpdb->postmeta} WHERE meta_key = %s", PHOENIX_PSRC_STATE
    ));
    $n = 0;
    foreach ($rows as $raw) {
        $s = maybe_unserialize($raw);
        if (is_array($s) && !empty($s['pick']['held'])) {
            $n++;
        }
    }
    return $n;
}

/**
 * پیکربندی را ذخیره یا پاک کن.
 *
 * @param array|null $cfg ‎null‎ یعنی این قیمت دیگر از منابع نیست —
 *                        پیکربندی و وضعیت هر دو پاک می‌شوند
 */
function phoenix_psrc_store($post_id, $cfg) {
    if ($cfg === null) {
        delete_post_meta($post_id, PHOENIX_PSRC_META);
        delete_post_meta($post_id, PHOENIX_PSRC_STATE);
        return;
    }
    update_post_meta($post_id, PHOENIX_PSRC_META, $cfg);
}

/* ============================================================
   سرِ خرید
   ============================================================ */

/**
 * وضعیت کهنه است؟ — خالص.
 *
 * @param array|null $state خروجیِ ‎phoenix_psrc_state‎
 */
function phoenix_psrc_is_stale($state, $now, $minutes) {
    if (!is_array($state) || empty($state['at'])) {
        return true;
    }
    $at = strtotime((string) $state['at']);
    return !$at || ($now - $at) > max(1, (int) $minutes) * 60;
}

/**
 * «صاحبِ» قیمتِ یک محصول یا پلن، اگر از چند منبع می‌آید.
 * همان قاعده‌ی ارثِ ‎phoenix_cost_of‎: پلنی که حالتِ خودش را ندارد
 * از محصول می‌گیرد.
 *
 * @return int ‎0‎ یعنی این قیمت از منابع نیست
 */
function phoenix_psrc_owner_of($product_id) {
    $f    = phoenix_get_fields($product_id);
    $mode = isset($f['price_mode']) ? (string) $f['price_mode'] : '';
    if ($mode === 'sources') {
        return (int) $product_id;
    }
    $parent = (int) wp_get_post_parent_id($product_id);
    if ($mode === '' && $parent) {
        $pf = phoenix_get_fields($parent);
        if (isset($pf['price_mode']) && $pf['price_mode'] === 'sources') {
            return $parent;
        }
    }
    return 0;
}

/**
 * سرِ خرید: منابعِ کهنه‌ی همین اقلام را همان لحظه تازه کن.
 *
 * ============================================================
 * ⚠ سه سقف، چون این‌جا مشتری منتظر است:
 *
 *   ۱ فقط کهنه‌ها — اگر در ده دقیقه‌ی اخیر (قابلِ تنظیم) خوانده
 *     شده، دوباره خوانده نمی‌شود. بیشترِ خریدها هیچ درخواستِ
 *     بیرونی نمی‌زنند.
 *   ۲ حداکثر پنج ثانیه برای همه، سه ثانیه برای هر درخواست. سایت
 *     بعد از دوازده ثانیه قطع می‌کند؛ این باید خیلی زودتر تمام شود.
 *   ۳ قفلِ سی‌ثانیه‌ای برای هر محصول. ده خریدِ هم‌زمان یعنی یک
 *     درخواست به تأمین‌کننده، نه ده.
 *
 * ⚠ شکست هیچ‌وقت جلوی خرید را نمی‌گیرد: منبعی که جواب ندهد یا
 * جهش داشته باشد، قیمتِ قبلی را نگه می‌دارد (همان محافظ‌های
 * ‎phoenix_psrc_pick‎).
 * ============================================================
 *
 * @param int[] $ids شناسه‌ی محصول یا پلنِ اقلامِ سفارش
 * @return int[] صاحب‌هایی که تازه شدند
 */
function phoenix_psrc_refresh_for_purchase(array $ids) {
    if (!phoenix_setting('psrc_checkout', true)) {
        return array();
    }
    $owners = array();
    foreach ($ids as $id) {
        $o = phoenix_psrc_owner_of((int) $id);
        if ($o) {
            $owners[$o] = true;
        }
    }
    if (!$owners) {
        return array();
    }

    $minutes = (int) phoenix_setting('psrc_fresh_min', 10);
    $started = microtime(true);
    $done    = array();
    $GLOBALS['phoenix_http_timeout'] = 3;

    foreach (array_keys($owners) as $o) {
        if (microtime(true) - $started > 5) {
            break;
        }
        if (!phoenix_psrc_is_stale(phoenix_psrc_state($o), time(), $minutes)) {
            continue;
        }
        $lock = 'phoenix_psrc_lock_' . $o;
        if (get_transient($lock)) {
            continue; // خریدِ دیگری همین حالا دارد می‌خواندش
        }
        set_transient($lock, 1, 30);
        phoenix_psrc_refresh($o, 'سرِ خرید');
        if (phoenix_setting('engine_on')) {
            phoenix_psrc_apply_tree($o, phoenix_rate_value());
        }
        delete_transient($lock);
        $done[] = $o;
    }

    unset($GLOBALS['phoenix_http_timeout']);
    return $done;
}

/**
 * خریدِ مستقیم از سبدِ ووکامرس (اگر کسی از خودِ ووکامرس بخرد):
 * همان تازه‌سازی پیش از افزودن به سبد، تا قفلِ قیمتِ سبد
 * (‎phoenix_cart_lock_stamp‎) عددِ تازه را مهر کند.
 */
add_filter('woocommerce_add_to_cart_validation', 'phoenix_psrc_before_cart', 5, 4);
function phoenix_psrc_before_cart($passed, $product_id, $qty = 1, $variation_id = 0) {
    if ($passed) {
        phoenix_psrc_refresh_for_purchase(array($variation_id ? $variation_id : $product_id));
    }
    return $passed;
}
