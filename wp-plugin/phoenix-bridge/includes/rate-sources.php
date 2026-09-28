<?php
/**
 * منابعِ نرخِ تتر.
 *
 * ============================================================
 * ⚠ چرا چند منبع و نه یکی
 *
 * قیمتِ کلِ فروشگاه به این عدد گره خورده. یک منبع یعنی یک نقطه‌ی
 * شکست: اگر ساختارِ پاسخش عوض شود یا عددِ خراب بدهد، یا همه‌ی
 * قیمت‌ها نجومی می‌شوند یا همه مفت.
 *
 * با چند منبع می‌شود پرسید «آیا این عدد با بقیه می‌خواند؟» — و
 * این سوال، تنها دفاعِ واقعیِ ما در برابرِ منبعِ دروغ‌گوست.
 *
 * ⚠ و چرا «کمترین» خطرناک‌تر از آن است که به نظر می‌رسد
 *
 * کارفرما گفت کمترین نرخ انتخاب شود تا ارزان‌تر بفروشیم. منطقی
 * است، ولی یک لبه‌ی تیز دارد: اگر یک منبع خراب شود و نصفِ عدد
 * را بدهد، «کمترین» یعنی همان عددِ خراب، و ما زیرِ قیمتِ
 * تمام‌شده می‌فروشیم.
 *
 * پس کمترین از میانِ *عددهای سالم* انتخاب می‌شود، نه از میانِ
 * همه. سالم یعنی: در بازه‌ی مطلق، و نزدیک به میانه‌ی همان دور.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * تعریفِ منابع.
 *
 * هر منبع: نشانی، مسیرِ عدد در JSON، و واحد.
 *
 * ⚠ ‎unit‎ اجباری و صریح است.
 *
 * بیشترِ صرافی‌های ایرانی تومان می‌دهند و بیشترِ سرویس‌های نرخ،
 * ریال. یک بار اشتباهِ ضرب در ده، یعنی قیمتِ کلِ فروشگاه ده
 * برابر یا یک‌دهم. پس هیچ پیش‌فرضی وجود ندارد و هر منبع باید
 * واحدش را بنویسد.
 *
 * ⚠ ‎path‎ با نقطه جدا می‌شود و ‎[]‎ یعنی «در آرایه بگرد».
 * مثال: ‎results.[].symbol=USDTIRT.price‎
 */
function phoenix_rate_sources() {
    $sources = array(
        'nobitex' => array(
            'label' => 'نوبیتکس',
            'url'   => 'https://api.nobitex.ir/v2/orderbook/USDTIRT',
            'path'  => 'lastTradePrice',
            'unit'  => 'rial',
        ),
        'wallex' => array(
            'label' => 'والکس',
            'url'   => 'https://api.wallex.ir/v1/markets',
            'path'  => 'result.symbols.USDTTMN.stats.lastPrice',
            'unit'  => 'toman',
        ),
        'bitpin' => array(
            'label' => 'بیت‌پین',
            'url'   => 'https://api.bitpin.ir/v1/mkt/markets/',
            'path'  => 'results.[].code=USDT_IRT.price',
            'unit'  => 'toman',
        ),
        'ramzinex' => array(
            'label' => 'رمزینکس',
            'url'   => 'https://publicapi.ramzinex.com/exchange/api/v1.0/exchange/pairs/11/ticker',
            'path'  => 'data.sell',
            'unit'  => 'rial',
        ),
    );

    /* منبعِ سفارشی از wp-config — برای وقتی که یکی از بالایی‌ها
       بمیرد و نخواهیم افزونه را دوباره منتشر کنیم. */
    if (defined('PHOENIX_RATE_URL') && PHOENIX_RATE_URL !== '') {
        $sources['custom'] = array(
            'label' => 'منبع سفارشی',
            'url'   => PHOENIX_RATE_URL,
            'path'  => defined('PHOENIX_RATE_PATH') ? PHOENIX_RATE_PATH : 'rate',
            'unit'  => defined('PHOENIX_RATE_UNIT') ? PHOENIX_RATE_UNIT : 'toman',
            /* کلیدِ wp-config هم مثلِ یک اتصال رفتار می‌کند (Bearer) */
            'conn'  => defined('PHOENIX_RATE_KEY') && PHOENIX_RATE_KEY !== ''
                ? array('slug' => 'config', 'auth' => 'bearer', 'header' => '', 'key' => (string) PHOENIX_RATE_KEY)
                : null,
            'origin' => 'config',
        );
    }

    /* منابعی که ادمین در پنل ساخته (rate-custom.php) — از همان
       اعتبارسنجیِ پایین رد می‌شوند، مثلِ بقیه. */
    if (function_exists('phoenix_custom_sources_runtime')) {
        $sources = array_merge($sources, phoenix_custom_sources_runtime());
    }

    /**
     * ⚠ فیلتر می‌گیرد ولی خروجی‌اش دوباره اعتبارسنجی می‌شود.
     *
     * افزونه‌ی دیگری روی همان سایت می‌تواند این فیلتر را بگیرد.
     * اگر نشانیِ بی‌ریخت یا واحدِ ناشناخته برگرداند، نباید به
     * ‎wp_remote_get‎ برسد.
     */
    $sources = apply_filters('phoenix_rate_sources', $sources);

    return phoenix_rate_sources_validate($sources);
}

/**
 * ⚠ هر نشانی باید https باشد و هر واحد از دو مقدارِ شناخته‌شده.
 *
 * نشانیِ http یعنی عددی که قیمتِ فروشگاه را تعیین می‌کند، روی
 * شبکه قابلِ دستکاری است. و واحدِ ناشناخته یعنی تقسیم بر ده
 * انجام نمی‌شود یا اشتباه انجام می‌شود — همان خطای ده‌برابری.
 */
function phoenix_rate_sources_validate($sources) {
    if (!is_array($sources)) {
        return array();
    }

    $out = array();
    foreach ($sources as $slug => $src) {
        $slug = sanitize_key((string) $slug);
        if ($slug === '' || !is_array($src)) {
            continue;
        }
        $url  = isset($src['url']) ? (string) $src['url'] : '';
        $unit = isset($src['unit']) ? (string) $src['unit'] : '';
        $path = isset($src['path']) ? (string) $src['path'] : '';

        if ($path === '' || !in_array($unit, array('rial', 'toman'), true)) {
            continue;
        }
        /* ‎wp_http_validate_url‎ نشانیِ داخلی و لوکال را هم رد
           می‌کند — جلوی SSRF از مسیرِ فیلتر. */
        if (!wp_http_validate_url($url) || stripos($url, 'https://') !== 0) {
            continue;
        }

        /* ⚠ شکستِ خط در کلید یا نامِ هدر یعنی هدرِ تزریقی */
        $conn = isset($src['conn']) && is_array($src['conn']) ? $src['conn'] : null;
        if ($conn !== null && (preg_match('/[\x00-\x1F\x7F]/', (string) $conn['key'] . (string) $conn['header']))) {
            continue;
        }

        $out[$slug] = array(
            'label'  => isset($src['label']) ? sanitize_text_field((string) $src['label']) : $slug,
            'url'    => $url,
            'path'   => $path,
            'unit'   => $unit,
            'conn'   => $conn,
            'origin' => isset($src['origin']) && in_array($src['origin'], array('builtin', 'config', 'panel'), true)
                ? $src['origin'] : 'builtin',
        );
    }
    return $out;
}

/** منابعی که ادمین خاموششان نکرده */
function phoenix_rate_sources_enabled() {
    $all   = phoenix_rate_sources();
    $flags = phoenix_setting('sources', array());
    if (!is_array($flags) || !$flags) {
        return $all; // خالی یعنی همه روشن
    }
    $out = array();
    foreach ($all as $slug => $src) {
        if (!array_key_exists($slug, $flags) || $flags[$slug]) {
            $out[$slug] = $src;
        }
    }
    return $out;
}

/* ============================================================
   گرفتنِ یک منبع
   ============================================================ */

/**
 * یک عدد از یک API — مشترکِ نرخِ تتر و قیمتِ محصول.
 *
 * @param array|null $conn خروجیِ ‎phoenix_conn_runtime‎، یا null
 * @return array{value:?float, ms:int, status:string, note:string}
 *
 * ⚠ هیچ‌وقت استثنا پرتاب نمی‌کند و هیچ‌وقت ‎null‎ برنمی‌گرداند.
 *
 * این تابع داخلِ حلقه‌ای صدا زده می‌شود که باید تا آخر برود.
 * اگر یک منبع منفجر شود و حلقه بشکند، منابعِ بعدی هم خوانده
 * نمی‌شوند — یعنی یک منبعِ خراب، کلِ به‌روزرسانی را می‌خواباند.
 */
function phoenix_source_read($url, $path, $conn = null) {
    $got = phoenix_http_json($url, $conn);
    if ($got['data'] === null) {
        return array('value' => null, 'ms' => $got['ms'], 'status' => $got['status'], 'note' => $got['note']);
    }

    $node = phoenix_rate_dig($got['data'], $path);
    if ($node === null) {
        /* کلیدهایی که واقعاً هست — تا ادمین مسیر را حدس نزند */
        $keys = phoenix_rate_dig_hint($got['data'], $path);
        return array('value' => null, 'ms' => $got['ms'], 'status' => 'path', 'note' => 'مسیر پیدا نشد: ' . $path
            . ($keys ? ' — کلیدهای موجود: ' . implode('، ', $keys) : ''));
    }

    $value = phoenix_rate_to_number($node);
    if ($value === null || $value <= 0) {
        return array('value' => null, 'ms' => $got['ms'], 'status' => 'value', 'note' => 'عدد نبود');
    }
    return array('value' => $value, 'ms' => $got['ms'], 'status' => 'ok', 'note' => '');
}

/**
 * GET و JSON — با کشِ همان درخواست.
 *
 * ⚠ کش در طولِ یک اجرا، نه بیشتر.
 * تأمین‌کننده معمولاً یک نشانیِ «فهرستِ قیمت» دارد و ده‌ها محصول از
 * همان می‌خوانند. بدونِ کش، به‌روزرسانیِ ساعتی ده‌ها بار همان را
 * می‌گرفت — کُند، و راهِ مطمئنِ بسته شدنِ IP توسطِ تأمین‌کننده.
 */
function phoenix_http_json($url, $conn = null) {
    static $memo = array();
    $mkey = $url . '|' . (is_array($conn) ? $conn['slug'] : '');
    if (isset($memo[$mkey])) {
        return array_merge($memo[$mkey], array('ms' => 0));
    }

    $started = microtime(true);
    $args = array(
        'timeout'     => 6,
        'redirection' => 2,
        'user-agent'  => 'PhoenixBridge/' . PHOENIX_BRIDGE_VERSION . '; ' . home_url('/'),
        'headers'     => array_merge(array('Accept' => 'application/json'), phoenix_conn_headers($conn)),
    );

    /* ⚠ ‎safe‎: نشانیِ داخلی و خصوصی رد می‌شود — در ریدایرکت هم.
       نشانی را ادمین در پنل تایپ می‌کند؛ این جلوی استفاده از افزونه
       برای کاویدنِ شبکه‌ی داخلیِ هاست را می‌گیرد. */
    $res = wp_safe_remote_get($url, $args);
    $ms  = (int) round((microtime(true) - $started) * 1000);

    if (is_wp_error($res)) {
        $out = array('data' => null, 'status' => 'net', 'note' => $res->get_error_message());
    } else {
        $code = (int) wp_remote_retrieve_response_code($res);
        /* ⚠ سقفِ حجم: صفحه‌ی HTMLِ چندمگابایتی ‎json_decode‎ را روی
           حافظه می‌برد. */
        $body = (string) wp_remote_retrieve_body($res);
        if ($code !== 200) {
            $out = array('data' => null, 'status' => 'http', 'note' => 'HTTP ' . $code);
        } elseif (strlen($body) > 512 * 1024) {
            $out = array('data' => null, 'status' => 'big', 'note' => 'پاسخ بیش از ۵۱۲ کیلوبایت');
        } else {
            $data = json_decode($body, true);
            $out  = json_last_error() !== JSON_ERROR_NONE || !is_array($data)
                ? array('data' => null, 'status' => 'parse', 'note' => 'JSON نامعتبر')
                : array('data' => $data, 'status' => 'ok', 'note' => '');
        }
    }

    $memo[$mkey] = $out;
    return array_merge($out, array('ms' => $ms));
}

/**
 * نرخِ تتر از یک منبع: همان خواندن، به‌علاوه‌ی واحد و بازه‌ی معقول.
 *
 * @return array{rate:?int, ms:int, status:string, note:string}
 */
function phoenix_rate_fetch_one($slug, array $src) {
    $r = phoenix_source_read($src['url'], $src['path'], isset($src['conn']) ? $src['conn'] : null);
    if ($r['value'] === null) {
        return phoenix_rate_result(null, $r['ms'], $r['status'], $r['note']);
    }

    $value = $src['unit'] === 'rial' ? $r['value'] / 10 : $r['value'];

    $min = (int) phoenix_setting('sane_min');
    $max = (int) phoenix_setting('sane_max');
    if ($value < $min || $value > $max) {
        return phoenix_rate_result(null, $r['ms'], 'range', 'خارج از بازه: ' . round($value));
    }

    return phoenix_rate_result((int) round($value), $r['ms'], 'ok', '');
}

function phoenix_rate_result($rate, $ms, $status, $note) {
    return array('rate' => $rate, 'ms' => $ms, 'status' => $status, 'note' => $note);
}

/**
 * پیمودنِ مسیر در آرایه‌ی تودرتو.
 *
 * ‎a.b.c‎            → ‎$d['a']['b']['c']‎
 * ‎a.[].k=v.price‎   → در آرایه‌ی ‎a‎ دنبالِ عضوی بگرد که
 *                      ‎k === v‎ باشد، بعد ‎price‎ش را بردار
 *
 * ⚠ بخشِ ‎[]‎ لازم است چون بعضی صرافی‌ها فهرستِ همه‌ی بازارها را
 * می‌دهند و بازارِ ما یکی از اعضای آن است، نه کلیدِ ثابت.
 */
function phoenix_rate_dig($data, $path) {
    $node  = $data;
    $parts = explode('.', $path);

    for ($i = 0; $i < count($parts); $i++) {
        $part = $parts[$i];

        if ($part === '[]') {
            /* بخشِ بعدی باید ‎key=value‎ باشد */
            if (!isset($parts[$i + 1]) || strpos($parts[$i + 1], '=') === false) {
                return null;
            }
            list($needleKey, $needleVal) = explode('=', $parts[$i + 1], 2);
            if (!is_array($node)) {
                return null;
            }
            $found = null;
            foreach ($node as $row) {
                if (is_array($row)
                    && isset($row[$needleKey])
                    && (string) $row[$needleKey] === $needleVal) {
                    $found = $row;
                    break;
                }
            }
            if ($found === null) {
                return null;
            }
            $node = $found;
            $i++; // بخشِ ‎key=value‎ مصرف شد
            continue;
        }

        if (!is_array($node) || !array_key_exists($part, $node)) {
            return null;
        }
        $node = $node[$part];
    }

    return is_scalar($node) ? $node : null;
}

/**
 * کلیدهای آخرین جایی که مسیر هنوز درست بود.
 *
 * «مسیر پیدا نشد» به‌تنهایی ادمین را وادار به حدس می‌کند؛ «در
 * ‎data‎ این‌ها هست: symbol، price، stats» راه را نشان می‌دهد.
 *
 * ⚠ از پاسخِ بیرونی می‌آید: کوتاه و محدود، و پنل آن را متن
 * می‌گذارد نه HTML.
 *
 * @return string[] حداکثر ۱۵ کلید
 */
function phoenix_rate_dig_hint($data, $path) {
    $node = $data;
    $parts = explode('.', $path);
    for ($i = 0; $i < count($parts); $i++) {
        if ($parts[$i] === '[]') {
            break; // داخلِ آرایه‌ی جست‌وجو — همین سطح بس است
        }
        if (!is_array($node) || !array_key_exists($parts[$i], $node)) {
            break;
        }
        $node = $node[$parts[$i]];
    }
    if (!is_array($node)) {
        return array();
    }
    if (array_keys($node) === range(0, count($node) - 1)) {
        /* فهرست است: کلیدهای عضوِ اولش مفیدتر از ۰، ۱، ۲ */
        $first = reset($node);
        $node  = is_array($first) ? $first : array();
    }
    $out = array();
    foreach (array_slice(array_keys($node), 0, 15) as $k) {
        $out[] = substr(preg_replace('/[^\w\-.:=]/u', '', (string) $k), 0, 30);
    }
    return array_values(array_filter($out, 'strlen'));
}

/**
 * رشته به عدد.
 *
 * ⚠ جداکننده‌ها پاک می‌شوند ولی ارقامِ فارسی هم.
 * «۱۱۲٬۵۰۰» از بعضی منابعِ ایرانی می‌آید و ‎(float)‎ رویش صفر
 * می‌دهد — یعنی منبع «جواب داد» ولی عددش صفر است، که بدترین
 * حالت است چون شبیهِ خطا نیست.
 */
function phoenix_rate_to_number($raw) {
    if (is_int($raw) || is_float($raw)) {
        return (float) $raw;
    }
    if (!is_string($raw)) {
        return null;
    }

    $fa = array('۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹');
    $ar = array('٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩');
    $en = array('0', '1', '2', '3', '4', '5', '6', '7', '8', '9');
    $s  = str_replace($fa, $en, $raw);
    $s  = str_replace($ar, $en, $s);
    $s  = str_replace(array(',', '٬', '،', ' ', "\xC2\xA0"), '', $s);

    if (!is_numeric($s)) {
        return null;
    }
    return (float) $s;
}
