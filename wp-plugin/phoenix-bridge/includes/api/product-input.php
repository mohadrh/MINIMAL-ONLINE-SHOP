<?php
/**
 * ورودیِ ویرایشگرِ محصول — اعتبارسنجی و پاک‌سازی.
 *
 * ============================================================
 * ⚠ این تنها دروازه است، و خالص است.
 *
 * هر چیزی که پنل برای ذخیره‌ی محصول می‌فرستد، اول از
 * ‎phoenix_product_clean()‎ رد می‌شود و فقط خروجیِ آن به ووکامرس
 * می‌رسد. هیچ کدِ ذخیره‌ای ‎$request‎ را مستقیم نمی‌خواند.
 *
 * خالص است — به پایگاه داده و ووکامرس دست نمی‌زند — پس بدونِ
 * وردپرس تست می‌شود. و چون تنها دروازه است، تستِ همین یک تابع
 * یعنی تستِ هر چیزی که می‌تواند واردِ محصول شود.
 *
 * ⚠ خطا رد می‌شود، بی‌صدا «درست» نمی‌شود — مگر جایی که درست
 *   کردنش بی‌خطر و آشکار است.
 *
 * دو پلن با برچسبِ یکسان رد می‌شوند با پیغامِ روشن، نه اینکه
 * یکی‌شان بی‌خبر «پلن ۲» شود. ولی فضای خالیِ اضافه یا ردیفِ
 * خالیِ فهرست بی‌صدا برداشته می‌شود، چون هیچ‌کس آن را عمداً
 * نمی‌خواهد.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_BADGES      = array('hot', 'new', 'bestseller', 'limited');
const PHOENIX_FULFILLMENT = array('stock_code', 'stock_account', 'upgrade_on_user', 'api_topup', 'manual');
const PHOENIX_INPUT_TYPES = array('text', 'email', 'tel', 'url', 'username');
const PHOENIX_PRICE_MODES = array('manual', 'usd', 'toman', 'sources');

/**
 * @return array{ok:bool, data?:array, errors?:array<string,string>}
 */
function phoenix_product_clean(array $in) {
    $err = array();

    /* ---------- اصلی ---------- */

    $title = phoenix_clean_line(isset($in['title']) ? $in['title'] : '', 200);
    if ($title === '') {
        $err['title'] = 'عنوانِ محصول خالی است.';
    }

    $status = isset($in['status']) ? (string) $in['status'] : 'draft';
    if (!in_array($status, array('publish', 'draft', 'private'), true)) {
        $status = 'draft';
    }

    $out = array(
        'title'             => $title,
        'status'            => $status,
        'english_title'     => phoenix_clean_line(isset($in['english_title']) ? $in['english_title'] : '', 120),
        'brand'             => phoenix_clean_line(isset($in['brand']) ? $in['brand'] : '', 120),
        'category'          => max(0, (int) (isset($in['category']) ? $in['category'] : 0)),
        'tags'              => phoenix_clean_list(isset($in['tags']) ? $in['tags'] : array(), 40, 60),
        'short_description' => phoenix_clean_text(isset($in['short_description']) ? $in['short_description'] : '', 600),
        'description'       => phoenix_clean_text(isset($in['description']) ? $in['description'] : '', 8000),
        'badges'            => array_values(array_intersect(
            PHOENIX_BADGES,
            is_array(isset($in['badges']) ? $in['badges'] : null) ? array_map('strval', $in['badges']) : array()
        )),
    );

    /* ---------- رسانه ---------- */

    $media = isset($in['media']) && is_array($in['media']) ? $in['media'] : array();
    $out['media'] = array();
    foreach (array('thumbnail', 'logo', 'cover', 'cutout') as $k) {
        $raw = isset($media[$k]) ? trim((string) $media[$k]) : '';
        $ok  = phoenix_clean_media($raw);
        if ($raw !== '' && $ok === null) {
            $err['media.' . $k] = 'نشانیِ تصویر معتبر نیست. یا مسیری مثل ‎/products/x.webp‎ یا نشانیِ https.';
        }
        $out['media'][$k] = $ok === null ? '' : $ok;
    }
    $accent = isset($media['accent']) ? trim((string) $media['accent']) : '';
    if ($accent !== '' && !preg_match('/^#[0-9a-fA-F]{6}$/', $accent)) {
        $err['media.accent'] = 'رنگ باید شش‌رقمی باشد، مثل ‎#c24a24‎.';
        $accent = '';
    }
    $out['media']['accent'] = strtolower($accent);

    /* ---------- محتوا ---------- */

    $c = isset($in['content']) && is_array($in['content']) ? $in['content'] : array();
    $out['content'] = array(
        'features'  => phoenix_clean_list(isset($c['features']) ? $c['features'] : array(), 30, 200),
        'notes'     => phoenix_clean_list(isset($c['notes']) ? $c['notes'] : array(), 30, 400),
        'platforms' => phoenix_clean_list(isset($c['platforms']) ? $c['platforms'] : array(), 12, 40),
        'faq'       => array(),
    );
    foreach ((isset($c['faq']) && is_array($c['faq']) ? $c['faq'] : array()) as $i => $f) {
        if (!is_array($f)) {
            continue;
        }
        $q = phoenix_clean_line(isset($f['q']) ? $f['q'] : '', 200);
        $a = phoenix_clean_text(isset($f['a']) ? $f['a'] : '', 1200);
        if ($q === '' && $a === '') {
            continue; // ردیفِ خالی — کسی آن را عمداً نمی‌خواهد
        }
        if ($q === '' || $a === '') {
            $err['content.faq.' . $i] = 'هر سوال هم پرسش می‌خواهد هم پاسخ.';
            continue;
        }
        if (count($out['content']['faq']) < 30) {
            $out['content']['faq'][] = array('q' => $q, 'a' => $a);
        }
    }

    /* ---------- تحویل ---------- */

    $d = isset($in['delivery']) && is_array($in['delivery']) ? $in['delivery'] : array();
    $ful = isset($d['fulfillment']) ? (string) $d['fulfillment'] : 'manual';
    $out['delivery'] = array(
        'fulfillment'       => in_array($ful, PHOENIX_FULFILLMENT, true) ? $ful : 'manual',
        'delivery_estimate' => phoenix_clean_line(isset($d['delivery_estimate']) ? $d['delivery_estimate'] : '', 120),
        'warranty_label'    => phoenix_clean_line(isset($d['warranty_label']) ? $d['warranty_label'] : '', 120),
        'required_inputs'   => array(),
    );
    $keys = array();
    foreach ((isset($d['required_inputs']) && is_array($d['required_inputs']) ? $d['required_inputs'] : array()) as $i => $r) {
        if (!is_array($r)) {
            continue;
        }
        $label = phoenix_clean_line(isset($r['label']) ? $r['label'] : '', 60);
        $key   = strtolower(trim((string) (isset($r['key']) ? $r['key'] : '')));
        if ($label === '' && $key === '') {
            continue;
        }
        /* ⚠ کلید فقط حروفِ لاتینِ کوچک و عدد و زیرخط.
           همین کلید نامِ فیلدِ سفارش در ووکامرس می‌شود و بعد در
           ایمیل و پنلِ سفارش نشان داده می‌شود. */
        if (!preg_match('/^[a-z][a-z0-9_]{0,39}$/', $key)) {
            $err['delivery.required_inputs.' . $i] = 'کلیدِ «' . $label . '» باید با حرفِ لاتین شروع شود و فقط حرف و عدد و _ داشته باشد.';
            continue;
        }
        if ($label === '') {
            $err['delivery.required_inputs.' . $i] = 'ورودیِ «' . $key . '» عنوان ندارد.';
            continue;
        }
        if (isset($keys[$key])) {
            $err['delivery.required_inputs.' . $i] = 'کلیدِ «' . $key . '» دو بار آمده.';
            continue;
        }
        $keys[$key] = true;
        $type = isset($r['type']) ? (string) $r['type'] : 'text';
        if (count($out['delivery']['required_inputs']) < 8) {
            $out['delivery']['required_inputs'][] = array(
                'key'     => $key,
                'label'   => $label,
                'type'    => in_array($type, PHOENIX_INPUT_TYPES, true) ? $type : 'text',
                'hint'    => phoenix_clean_line(isset($r['hint']) ? $r['hint'] : '', 160),
                'example' => phoenix_clean_line(isset($r['example']) ? $r['example'] : '', 80),
            );
        }
    }

    /* ---------- قیمت‌گذاریِ کلِ محصول ---------- */

    $conns = function_exists('phoenix_connections') ? array_keys(phoenix_connections()) : array();

    $out['pricing'] = phoenix_clean_pricing(isset($in['pricing']) ? $in['pricing'] : array(), false, $conns, $err, 'pricing.sources.');
    $pm = isset($in['pricing']['margin']) ? $in['pricing']['margin'] : null;
    $out['pricing']['margin'] = is_array($pm) ? phoenix_margin_sanitize($pm) : null;

    /* ---------- پلن‌ها ---------- */

    $plans = isset($in['plans']) && is_array($in['plans']) ? array_values($in['plans']) : array();
    if (!$plans) {
        $err['plans'] = 'دست‌کم یک پلن لازم است — قیمت و دکمه‌ی خرید از پلن می‌خوانند.';
    }
    if (count($plans) > 20) {
        $err['plans'] = 'حداکثر بیست پلن.';
        $plans = array_slice($plans, 0, 20);
    }

    $out['plans'] = array();
    $labels       = array();
    $default      = -1;

    foreach ($plans as $i => $p) {
        if (!is_array($p)) {
            continue;
        }
        $label = phoenix_clean_line(isset($p['label']) ? $p['label'] : '', 80);
        if ($label === '') {
            $err['plans.' . $i . '.label'] = 'پلنِ ' . ($i + 1) . ' برچسب ندارد.';
        } elseif (isset($labels[$label])) {
            /* ⚠ رد می‌شود، نه اینکه بی‌خبر عوض شود.
               برچسب همان مقدارِ ویژگیِ واریاسیون در ووکامرس است؛ دو
               پلنِ هم‌نام یعنی مشتری نمی‌تواند یکی‌شان را انتخاب
               کند. */
            $err['plans.' . $i . '.label'] = 'برچسبِ «' . $label . '» دو بار آمده.';
        }
        $labels[$label] = true;

        $regular = max(0, min(10000000000, (int) (isset($p['regular']) ? $p['regular'] : 0)));
        $sale    = max(0, min(10000000000, (int) (isset($p['sale']) ? $p['sale'] : 0)));
        if ($sale > 0 && $sale >= $regular) {
            $err['plans.' . $i . '.sale'] = 'قیمتِ تخفیف‌خورده‌ی «' . $label . '» باید کمتر از قیمتِ اصلی باشد.';
            $sale = 0;
        }

        $stock = isset($p['stock']) && $p['stock'] !== null && $p['stock'] !== ''
            ? max(0, min(1000000, (int) $p['stock']))
            : null;

        $guide = null;
        if (isset($p['guide']) && is_array($p['guide'])) {
            $fit    = phoenix_clean_line(isset($p['guide']['fit']) ? $p['guide']['fit'] : '', 200);
            $detail = phoenix_clean_text(isset($p['guide']['detail']) ? $p['guide']['detail'] : '', 600);
            if ($fit !== '' && $detail !== '') {
                $guide = array('fit' => $fit, 'detail' => $detail);
            } elseif ($fit !== '' || $detail !== '') {
                $err['plans.' . $i . '.guide'] = 'راهنمای «' . $label . '» هم «مالِ کیست» می‌خواهد هم «چه می‌گیرد».';
            }
        }

        if (!empty($p['is_default']) && $default < 0) {
            $default = count($out['plans']);
        }

        $out['plans'][] = array(
            'id'      => max(0, (int) (isset($p['id']) ? $p['id'] : 0)),
            'label'   => $label,
            'regular' => $regular,
            'sale'    => $sale,
            'stock'   => $stock,
            'usd'     => max(0, min(100000, round((float) (isset($p['usd']) ? $p['usd'] : 0), 2))),
            /* مدتِ اشتراک به روز — صفر یعنی اشتراکی نیست (کد، شارژ، …).
               «اشتراک‌ها»ی حسابِ مشتری و یادآوریِ تمدید از همین می‌خوانند. */
            'duration_days' => max(0, min(3650, (int) (isset($p['duration_days']) ? $p['duration_days'] : 0))),
            'guide'   => $guide,
            /* ⚠ تک‌پلن یعنی محصولِ ساده: قیمت‌گذاریِ پلن وجود ندارد.
               اگر پلنِ دوم حذف شده و تنظیمِ جدای اولی مانده، همان
               تنظیم بی‌صدا نادیده گرفته می‌شد — پیش‌نمایش یک چیز
               می‌گفت و ذخیره چیزِ دیگری می‌نوشت. */
            'pricing' => phoenix_clean_pricing(count($plans) > 1 && isset($p['pricing']) ? $p['pricing'] : array(), true, $conns, $err, 'plans.' . $i . '.pricing.sources.'),
            'is_default' => false,
        );
    }

    /* ⚠ دقیقاً یک پلنِ پیش‌فرض.
       هیچ → اولی. بیش از یکی → اولین علامت‌خورده. این یکی بی‌صدا
       درست می‌شود چون نتیجه‌اش همیشه همان چیزی است که ادمین
       می‌بیند: پلنِ بالای فهرست. */
    if ($out['plans']) {
        $out['plans'][$default < 0 ? 0 : $default]['is_default'] = true;
    }

    /* پلنی که قیمتش دستی است باید قیمت داشته باشد */
    foreach ($out['plans'] as $i => $p) {
        $mode = $p['pricing']['mode'] === 'inherit' ? $out['pricing']['mode'] : $p['pricing']['mode'];
        if ($mode === 'manual' && $p['regular'] <= 0) {
            $err['plans.' . $i . '.regular'] = 'قیمتِ «' . $p['label'] . '» دستی است ولی عددی ندارد.';
        }
        if ($mode === 'usd' && phoenix_effective_cost($out['pricing'], $p['pricing'], 'cost_usd') <= 0) {
            $err['plans.' . $i . '.pricing'] = '«' . $p['label'] . '» از نرخ دلار حساب می‌شود ولی قیمتِ تمام‌شده‌ی دلاری ندارد.';
        }
        if ($mode === 'toman' && phoenix_effective_cost($out['pricing'], $p['pricing'], 'cost_toman') <= 0) {
            $err['plans.' . $i . '.pricing'] = '«' . $p['label'] . '» قیمتِ تمام‌شده‌ی تومانی ندارد.';
        }
    }

    return $err ? array('ok' => false, 'errors' => $err) : array('ok' => true, 'data' => $out);
}

/** هزینه‌ی مؤثرِ یک پلن: خودش، وگرنه از محصول */
function phoenix_effective_cost(array $product_pricing, array $plan_pricing, $key) {
    $own = isset($plan_pricing[$key]) ? (float) $plan_pricing[$key] : 0;
    return $own > 0 ? $own : (isset($product_pricing[$key]) ? (float) $product_pricing[$key] : 0);
}

/**
 * @param bool     $plan  پلن «ارث از محصول» هم می‌تواند باشد؛ محصول نه
 * @param string[] $conns اتصال‌های موجود — برای منابعِ API
 * @param array    $err   خطاهای منابع این‌جا اضافه می‌شوند، با پیشوندِ ‎$prefix‎
 */
function phoenix_clean_pricing($p, $plan, array $conns = array(), &$err = null, $prefix = '') {
    $p     = is_array($p) ? $p : array();
    $modes = $plan ? array_merge(array('inherit'), PHOENIX_PRICE_MODES) : PHOENIX_PRICE_MODES;
    $mode  = isset($p['mode']) ? (string) $p['mode'] : ($plan ? 'inherit' : 'manual');
    $mode  = in_array($mode, $modes, true) ? $mode : ($plan ? 'inherit' : 'manual');

    /* ⚠ منابع فقط وقتی «چند منبع» انتخاب شده بررسی می‌شوند.
       ادمینی که یک بار منبع ساخته و بعد به «دستی» برگشته، نباید
       به‌خاطرِ نشانیِ نیمه‌کاره‌ی آن‌جا نتواند ذخیره کند. */
    $sources = null;
    if ($mode === 'sources' && function_exists('phoenix_psrc_clean')) {
        $c = phoenix_psrc_clean(isset($p['sources']) ? $p['sources'] : array(), $conns);
        $sources = $c['data'];
        if (is_array($err)) {
            foreach ($c['errors'] as $k => $msg) {
                $err[$prefix . $k] = $msg;
            }
        }
    }

    return array(
        'mode'       => $mode,
        'cost_usd'   => max(0, min(100000, round((float) (isset($p['cost_usd']) ? $p['cost_usd'] : 0), 4))),
        'cost_toman' => max(0, min(10000000000, (int) (isset($p['cost_toman']) ? $p['cost_toman'] : 0))),
        'locked'     => !empty($p['locked']),
        'sources'    => $sources,
    );
}

/* ------------------------------------------------------------
   پاک‌سازهای پایه
   ------------------------------------------------------------ */

/** یک خط: بدونِ تگ، بدونِ شکستِ خط، با سقفِ طول */
function phoenix_clean_line($v, $max) {
    $v = sanitize_text_field(is_scalar($v) ? (string) $v : '');
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

/** چندخطی: بدونِ تگ، شکستِ خط می‌ماند */
function phoenix_clean_text($v, $max) {
    $v = sanitize_textarea_field(is_scalar($v) ? (string) $v : '');
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

/** فهرستِ رشته‌ها: خالی‌ها و تکراری‌ها بیرون، سقفِ تعداد و طول */
function phoenix_clean_list($v, $max_items, $max_len) {
    if (!is_array($v)) {
        return array();
    }
    $out  = array();
    $seen = array();
    foreach ($v as $item) {
        $item = phoenix_clean_line($item, $max_len);
        if ($item === '' || isset($seen[$item])) {
            continue;
        }
        $seen[$item] = true;
        $out[] = $item;
        if (count($out) >= $max_items) {
            break;
        }
    }
    return $out;
}

/**
 * نشانیِ تصویر: مسیرِ سایتِ استاتیک یا https.
 *
 * ⚠ ‎javascript:‎ و ‎data:‎ و ‎../‎ رد می‌شوند.
 *
 * این مقدار بعداً در ‎src‎ی ‎<img>‎ روی سایت و در پنل می‌نشیند.
 * ‎data:‎ می‌تواند SVGِ اسکریپت‌دار باشد، و ‎../‎ در مسیر یعنی
 * خروج از پوشه‌ای که انتظارش را داریم.
 *
 * @return string|null null یعنی نامعتبر
 */
function phoenix_clean_media($v) {
    if ($v === '') {
        return '';
    }
    if (strlen($v) > 300) {
        return null;
    }
    /* ⚠ ‎//‎ در ابتدا یعنی «دامنه‌ی دیگر با همان پروتکل».
       ‎//evil.com/a.png‎ ظاهرِ مسیرِ سایت دارد ولی از جای دیگری بار
       می‌شود — تستِ product-input همین را گرفت. */
    if (preg_match('#^/(?!/)[A-Za-z0-9/_.\-]+\.(webp|avif|png|jpe?g|svg|gif)$#i', $v) && strpos($v, '..') === false) {
        return $v;
    }
    if (preg_match('#^https://[A-Za-z0-9.\-]+(:\d+)?/[^\s"\'<>]*$#', $v)) {
        return $v;
    }
    return null;
}
