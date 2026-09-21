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
            'key'   => defined('PHOENIX_RATE_KEY') ? PHOENIX_RATE_KEY : '',
        );
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

        $out[$slug] = array(
            'label' => isset($src['label']) ? sanitize_text_field((string) $src['label']) : $slug,
            'url'   => $url,
            'path'  => $path,
            'unit'  => $unit,
            'key'   => isset($src['key']) ? (string) $src['key'] : '',
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
 * @return array{rate:?int, ms:int, status:string, note:string}
 *
 * ⚠ هیچ‌وقت استثنا پرتاب نمی‌کند و هیچ‌وقت ‎null‎ برنمی‌گرداند.
 *
 * این تابع داخلِ حلقه‌ای صدا زده می‌شود که باید تا آخر برود.
 * اگر یک منبع منفجر شود و حلقه بشکند، منابعِ بعدی هم خوانده
 * نمی‌شوند و «کمتر از دو منبع» فعال می‌شود — یعنی یک منبعِ
 * خراب، کلِ به‌روزرسانی را می‌خواباند.
 */
function phoenix_rate_fetch_one($slug, array $src) {
    $started = microtime(true);

    $args = array(
        'timeout'     => 6,
        'redirection' => 2,
        'user-agent'  => 'PhoenixBridge/' . PHOENIX_BRIDGE_VERSION . '; ' . home_url('/'),
        'headers'     => array('Accept' => 'application/json'),
    );
    if (!empty($src['key'])) {
        $args['headers']['Authorization'] = 'Bearer ' . $src['key'];
    }

    $res = wp_remote_get($src['url'], $args);
    $ms  = (int) round((microtime(true) - $started) * 1000);

    if (is_wp_error($res)) {
        return phoenix_rate_result(null, $ms, 'net', $res->get_error_message());
    }

    $code = (int) wp_remote_retrieve_response_code($res);
    if ($code !== 200) {
        return phoenix_rate_result(null, $ms, 'http', 'HTTP ' . $code);
    }

    /* ⚠ سقفِ حجم.
       منبعی که به‌جای JSON یک صفحه‌ی HTMLِ چندمگابایتی بدهد،
       ‎json_decode‎ را روی حافظه می‌برد. */
    $body = (string) wp_remote_retrieve_body($res);
    if (strlen($body) > 512 * 1024) {
        return phoenix_rate_result(null, $ms, 'big', 'پاسخ بیش از ۵۱۲ کیلوبایت');
    }

    $data = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        return phoenix_rate_result(null, $ms, 'parse', 'JSON نامعتبر');
    }

    $node = phoenix_rate_dig($data, $src['path']);
    if ($node === null) {
        return phoenix_rate_result(null, $ms, 'path', 'مسیر پیدا نشد: ' . $src['path']);
    }

    $value = phoenix_rate_to_number($node);
    if ($value === null || $value <= 0) {
        return phoenix_rate_result(null, $ms, 'value', 'عدد نبود');
    }

    if ($src['unit'] === 'rial') {
        $value = $value / 10;
    }

    $min = (int) phoenix_setting('sane_min');
    $max = (int) phoenix_setting('sane_max');
    if ($value < $min || $value > $max) {
        return phoenix_rate_result(null, $ms, 'range', 'خارج از بازه: ' . round($value));
    }

    return phoenix_rate_result((int) round($value), $ms, 'ok', '');
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
