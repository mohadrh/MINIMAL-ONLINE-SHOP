<?php
/**
 * موتورِ قیمت — از قیمتِ تمام‌شده تا عددی که مشتری می‌بیند.
 *
 * ============================================================
 * سه رژیمِ قیمت، و هر محصول دقیقاً در یکی از آن‌هاست:
 *
 *   manual  ادمین خودش عدد تومانی گذاشته. موتور دست نمی‌زند.
 *   usd     قیمتِ تمام‌شده دلاری است → × نرخ × (۱ + حاشیه)
 *   toman   قیمتِ تمام‌شده تومانی است → × (۱ + حاشیه)
 *
 * ⚠ ‎manual‎ پیش‌فرض است، و این عمدی است.
 *
 * محصولی که کسی برایش قیمتِ تمام‌شده ننوشته، نباید ناگهان
 * قیمتش عوض شود. موتور فقط محصولی را لمس می‌کند که صریحاً
 * به او سپرده شده باشد.
 *
 * ============================================================
 * فرمولِ کامل، به همان ترتیبی که اجرا می‌شود:
 *
 *   ۱  پایه   = usd × نرخ   یا   هزینه‌ی تومانی
 *   ۲  سود    = بیشترِ ( پایه × درصد٪ ، حداقلِ سود )
 *   ۳  خام    = پایه + سود + مبلغِ ثابت
 *   ۴  رُند    = گرد شده به نزدیک‌ترین «round_to»
 *   ۵  جذاب   = دنباله‌ی عددِ رُند با «charm» عوض می‌شود
 *   ۶  کف     = هیچ‌وقت زیرِ پایه × (۱ + floor_percent٪)
 *
 * گامِ ۶ آخر است و بر همه‌ی گام‌های قبل می‌چربد — از جمله بر
 * تخفیف. دلیلش در ‎phoenix_price_floor‎ نوشته شده.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

/* ============================================================
   ۱ خواندنِ تنظیماتِ قیمتِ یک محصول
   ============================================================ */

/**
 * @return array{mode:string, usd:float, toman:float, locked:bool}
 *
 * روی واریاسیون: اگر خودش چیزی نداشت، از محصولِ والد ارث
 * می‌برد. یعنی «قیمتِ تمام‌شده‌ی این محصول ۱۲ دلار است» یک بار
 * روی والد نوشته می‌شود و همه‌ی پلن‌ها می‌گیرندش، مگر آنکه
 * پلنی خودش عددِ دیگری داشته باشد.
 */
/**
 * ⚠ ‎cost_usd‎ خوانده می‌شود، نه ‎usd‎ — و این تفاوت، یک فاجعه‌ی
 *   واقعی را جلو گرفت.
 *
 * فیلدِ ‎usd‎ از قبل در داده بود ولی معنایش *قیمتِ تمام‌شده
 * نیست*: «این سرویس در سایتِ خودش چند است» یا مبلغِ اسمیِ
 * گیفت‌کارت. کنوا پرو در سایتِ خودش سالی ۱۲۰ دلار است ولی ما
 * اکانتِ ظرفیتی می‌فروشیم و قیمتمان ۲۰۵٬۰۰۰ تومان است.
 *
 * اگر موتور ‎usd‎ را قیمتِ تمام‌شده حساب می‌کرد:
 *
 *     ۱۲۰ × ۲۲۶٬۵۰۰ + ٪۱۸  =  حدودِ ۳۲ میلیون تومان
 *
 * یعنی محصولِ ۲۰۵ هزار تومانی، صد و سی برابر گران می‌شد — و
 * این دقیقاً همان اشتباهی است که یک بار در خودِ سایت افتاده و
 * توضیحش در ‎catalog.ts‎ نوشته شده.
 *
 * پس موتور کلیدِ *جدا* دارد. ‎usd‎ مالِ نمایش است و موتور
 * هیچ‌وقت نگاهش نمی‌کند؛ ‎cost_usd‎ را فقط جایی می‌نویسیم که
 * واقعاً قیمتِ تمام‌شده‌ی خودمان باشد.
 */
function phoenix_cost_of($product_id) {
    $f = phoenix_get_fields($product_id);

    $mode   = isset($f['price_mode']) ? (string) $f['price_mode'] : '';
    $usd    = isset($f['cost_usd']) ? (float) $f['cost_usd'] : 0.0;
    $toman  = isset($f['cost_toman']) ? (float) $f['cost_toman'] : 0.0;
    $locked = !empty($f['price_locked']);

    /* ارث از والد، فقط برای واریاسیون */
    $parent = (int) wp_get_post_parent_id($product_id);
    if ($parent) {
        $pf = phoenix_get_fields($parent);
        if ($mode === '' && isset($pf['price_mode'])) {
            $mode = (string) $pf['price_mode'];
        }
        if ($usd <= 0 && isset($pf['cost_usd'])) {
            $usd = (float) $pf['cost_usd'];
        }
        if ($toman <= 0 && isset($pf['cost_toman'])) {
            $toman = (float) $pf['cost_toman'];
        }
        if (!$locked && !empty($pf['price_locked'])) {
            $locked = true;
        }
    }

    /* حدسِ رژیم وقتی صریح نوشته نشده — ولی هیچ‌وقت به سمتِ
       «موتور دست بزند» حدس نمی‌زند مگر عددی موجود باشد. */
    if ($mode === '') {
        if ($usd > 0) {
            $mode = 'usd';
        } elseif ($toman > 0) {
            $mode = 'toman';
        } else {
            $mode = 'manual';
        }
    }

    return array(
        'mode'   => in_array($mode, array('manual', 'usd', 'toman'), true) ? $mode : 'manual',
        'usd'    => max(0.0, $usd),
        'toman'  => max(0.0, $toman),
        'locked' => $locked,
    );
}

/* ============================================================
   ۲ حاشیه — کدام نمایه روی این محصول می‌نشیند
   ============================================================ */

/**
 * ⚠ خاص‌ترین برنده است، و ادغام «فیلد به فیلد» است نه «همه یا هیچ».
 *
 * یعنی می‌شود برای دسته‌ی گیم فقط ‎percent‎ را عوض کرد و
 * ‎round_to‎ و ‎charm‎ از پیش‌فرضِ کل بیایند. با ادغامِ «همه یا
 * هیچ»، ادمین مجبور بود هر بار هر شش فیلد را دوباره بنویسد و
 * یک روز یکی‌شان را جا می‌انداخت.
 *
 * ترتیب: محصول ← واریاسیون از والدش ← دسته ← پیش‌فرضِ کل
 */
function phoenix_margin_for($product_id) {
    $base = array_merge(phoenix_margin_defaults(), (array) phoenix_setting('margin', array()));

    $by_cat  = (array) phoenix_setting('margin_by_cat', array());
    $by_prod = (array) phoenix_setting('margin_by_prod', array());

    /* والد، برای واریاسیون‌ها — دسته روی والد نشسته نه واریاسیون */
    $parent = (int) wp_get_post_parent_id($product_id);
    $owner  = $parent ? $parent : (int) $product_id;

    /* ---------- دسته ---------- */
    $terms = get_the_terms($owner, 'product_cat');
    if (is_array($terms)) {
        /* ⚠ ترتیبِ دسته‌ها قطعی می‌شود.
           اگر محصولی در دو دسته باشد و هر دو حاشیه داشته باشند،
           بدونِ مرتب‌سازی نتیجه به ترتیبِ پایگاه داده بستگی
           دارد و یک روز بی‌دلیل عوض می‌شود. کوچک‌ترین
           ‎term_id‎ همیشه یکی است. */
        $ids = array();
        foreach ($terms as $t) {
            if (isset($by_cat[$t->term_id]) && is_array($by_cat[$t->term_id])) {
                $ids[] = (int) $t->term_id;
            }
        }
        if ($ids) {
            sort($ids);
            $base = array_merge($base, $by_cat[$ids[0]]);
        }
    }

    /* ---------- محصولِ والد ---------- */
    if ($parent && isset($by_prod[$parent]) && is_array($by_prod[$parent])) {
        $base = array_merge($base, $by_prod[$parent]);
    }

    /* ---------- خودِ محصول یا واریاسیون ---------- */
    if (isset($by_prod[$product_id]) && is_array($by_prod[$product_id])) {
        $base = array_merge($base, $by_prod[$product_id]);
    }

    return phoenix_margin_sanitize($base);
}

/**
 * ⚠ هر عددِ حاشیه محدود می‌شود، حتی عددی که از تنظیمات آمده.
 *
 * تنظیمات را ادمین می‌نویسد و ادمین هم اشتباه می‌کند: یک صفرِ
 * اضافه در ‎percent‎ یعنی ۱۸۰۰٪. سقف‌ها جلوی اشتباهِ تایپی را
 * می‌گیرند، نه جلوی حمله را — ولی همان اشتباهِ تایپی است که
 * واقعاً اتفاق می‌افتد.
 */
function phoenix_margin_sanitize(array $m) {
    $d = phoenix_margin_defaults();

    $percent = isset($m['percent']) ? (float) $m['percent'] : $d['percent'];
    $percent = max(-90.0, min(500.0, $percent));

    $round_to = isset($m['round_to']) ? (int) $m['round_to'] : $d['round_to'];
    $round_to = max(1, min(1000000, $round_to));

    $mode = isset($m['round_mode']) ? (string) $m['round_mode'] : $d['round_mode'];
    if (!in_array($mode, array('up', 'nearest', 'down'), true)) {
        $mode = 'up';
    }

    $charm = isset($m['charm']) ? (int) $m['charm'] : $d['charm'];
    $charm = max(0, min($round_to - 1, $charm));

    return array(
        'percent'    => $percent,
        'fixed'      => max(0, (int) (isset($m['fixed']) ? $m['fixed'] : $d['fixed'])),
        'min_profit' => max(0, (int) (isset($m['min_profit']) ? $m['min_profit'] : $d['min_profit'])),
        'round_to'   => $round_to,
        'round_mode' => $mode,
        'charm'      => $charm,
    );
}

/* ============================================================
   ۳ محاسبه
   ============================================================ */

/**
 * قیمتِ یک محصول، با همه‌ی جزئیاتِ راه.
 *
 * ⚠ خروجی عمداً پرجزئیات است.
 *
 * پنل باید بتواند بگوید «این عدد از کجا آمد» — پایه چند بود،
 * چه سودی رویش رفت، کدام تخفیف خورد، و کف کجا جلویش را
 * گرفت. بدونِ این، هر شکایتِ «چرا قیمت این‌قدر شد» تبدیل به
 * حدس‌زدن می‌شود.
 *
 * @return array|null null یعنی این محصول دستِ موتور نیست
 */
function phoenix_compute_price($product_id, $rate = null) {
    $cost = phoenix_cost_of($product_id);

    if ($cost['mode'] === 'manual' || $cost['locked']) {
        return null;
    }

    /* ---------- پایه ---------- */
    if ($cost['mode'] === 'usd') {
        $rate = $rate === null ? phoenix_rate_value() : (int) $rate;
        if ($rate <= 0 || $cost['usd'] <= 0) {
            /* بدونِ نرخ، قیمتِ دلاری قابلِ محاسبه نیست — و
               «صفر» جوابِ درستی نیست. دست نمی‌زنیم. */
            return null;
        }
        $base = $cost['usd'] * $rate;
    } else {
        if ($cost['toman'] <= 0) {
            return null;
        }
        $base = $cost['toman'];
        $rate = 0;
    }

    /* ---------- سود ---------- */
    $m      = phoenix_margin_for($product_id);
    $profit = max($base * ($m['percent'] / 100), (float) $m['min_profit']);
    $raw    = $base + $profit + $m['fixed'];

    /* ---------- رُند و عددِ جذاب ---------- */
    $regular = phoenix_round_price($raw, $m['round_to'], $m['round_mode']);
    if ($m['charm'] > 0) {
        $regular = phoenix_charm_price($regular, $m['round_to'], $m['charm']);
    }

    /* ---------- تخفیف ---------- */
    $discount = phoenix_discount_for($product_id, $regular);
    $sale     = $discount ? (int) $discount['price'] : 0;

    /* ---------- کف ---------- */
    $floor   = phoenix_price_floor($base);
    $under   = false;
    $blocked = null;

    if ($sale > 0 && $sale < $floor) {
        $sale  = $floor;
        $under = true;
    }
    if ($regular < $floor) {
        $regular = $floor;
        $under   = true;
    }

    /**
     * تخفیفی که بعد از کف دیگر تخفیف نیست، اصلاً اعمال نمی‌شود.
     *
     * ⚠ ولی بی‌صدا هم نمی‌شود، و این را تست پیدا کرد.
     *
     * حالتِ واقعی: حاشیه ۱۸٪ است و ادمین «۳۰٪ تخفیف» می‌گذارد.
     * سی درصد زیرِ قیمتِ تمام‌شده می‌افتد، کف جلویش را می‌گیرد،
     * و نتیجه این می‌شود که تخفیف *هیچ اثری ندارد* — ادمین
     * قاعده را ساخته، پنل می‌گوید «فعال»، و قیمت تکان نخورده.
     * بعد دنبالِ باگ می‌گردد.
     *
     * حساب هم درست است: روی حاشیه‌ی ۱۸٪ نمی‌شود ۳۰٪ تخفیف داد
     * بی‌آنکه ضرر کنی. ولی این را باید *گفت*، نه اینکه خاموش
     * بماند. پس دلیلش برمی‌گردد تا پنل نشانش بدهد.
     */
    if ($sale > 0 && $sale >= $regular) {
        $blocked = array(
            'label' => $discount ? $discount['label'] : '',
            'why'   => sprintf(
                'کفِ قیمت جلویش را گرفت — با این حاشیه، بیشترین تخفیفِ ممکن %s تومان است.',
                number_format_i18n(max(0, $regular - $floor))
            ),
        );
        $sale     = 0;
        $discount = null;
        $under    = true;
    }

    return array(
        'mode'       => $cost['mode'],
        'rate'       => (int) $rate,
        'cost_usd'   => $cost['usd'],
        'base'       => (int) round($base),
        'margin'     => $m,
        'profit'     => (int) round($profit),
        'raw'        => (int) round($raw),
        'regular'    => (int) $regular,
        'sale'       => (int) $sale,
        'final'      => (int) ($sale > 0 ? $sale : $regular),
        'discount'   => $discount,
        'blocked'    => $blocked,
        'floor'      => (int) $floor,
        'floor_hit'  => $under,
    );
}

/**
 * ⚠ کفِ قیمت — تنها چیزی که جلوی «محصول مفت شد» را می‌گیرد.
 *
 * سه چیز می‌توانند قیمت را به صفر نزدیک کنند و هر سه واقعی‌اند:
 *
 *   ۱ منبعِ نرخی که عددِ خراب داده و از فیلتر رد شده
 *   ۲ دو تخفیف که روی هم افتاده‌اند
 *   ۳ حاشیه‌ی منفی که ادمین برای حراج گذاشته و یادش رفته
 *
 * هیچ‌کدام «حمله» نیستند؛ همه‌شان اشتباهِ معمولی‌اند. و هر سه
 * با یک قاعده گرفته می‌شوند: قیمتِ نهایی هیچ‌وقت زیرِ قیمتِ
 * تمام‌شده به‌علاوه‌ی درصدی نمی‌رود.
 *
 * این آخرین گام است، پس حتی تخفیفِ ۹۹٪ هم از آن رد نمی‌شود.
 */
function phoenix_price_floor($base) {
    $pct = max(0.0, min(100.0, (float) phoenix_setting('floor_percent', 5)));
    return (int) ceil($base * (1 + $pct / 100));
}

function phoenix_round_price($value, $to, $mode) {
    $to = max(1, (int) $to);
    if ($mode === 'down') {
        return (int) (floor($value / $to) * $to);
    }
    if ($mode === 'nearest') {
        return (int) (round($value / $to) * $to);
    }
    return (int) (ceil($value / $to) * $to);
}

/**
 * عددِ «جذاب»: دنباله‌ی قیمت روی یک عددِ مشخص می‌نشیند.
 *
 * با ‎round_to = 10000‎ و ‎charm = 9000‎ قیمتِ ۱٬۲۴۰٬۰۰۰ می‌شود
 * ۱٬۲۳۹٬۰۰۰.
 *
 * ⚠ همیشه رو به پایین، نه بالا.
 *
 * اگر ۱٬۲۴۹٬۰۰۰ بسازد، قیمت از عددِ رُند بالاتر رفته و مشتری
 * بیشتر می‌دهد — که هم بدقولی است هم کفِ سودمان را جابه‌جا
 * نمی‌کند. پس یک پله پایین می‌آید.
 */
function phoenix_charm_price($price, $round_to, $charm) {
    $round_to = max(1, (int) $round_to);
    $charm    = max(0, min($round_to - 1, (int) $charm));
    if ($charm === 0) {
        return (int) $price;
    }
    $floorStep = (int) (floor($price / $round_to) * $round_to);
    $candidate = $floorStep + $charm;

    /* ⚠ ‎>‎ و نه ‎>=‎.
       با ‎>=‎ قیمتی که *از قبل* جذاب بود یک پله می‌افتاد:
       ۱٬۲۳۹٬۰۰۰ می‌شد ۱٬۲۲۹٬۰۰۰، و هر بار که موتور می‌دوید باز
       یک پله پایین‌تر. تستِ «۱۲۳۹۰۰۰ همان می‌ماند» همین را
       گرفت. */
    if ($candidate > $price) {
        $candidate -= $round_to;
    }
    return (int) max(0, $candidate);
}

/* ============================================================
   ۴ نوشتنِ قیمت روی محصول
   ============================================================ */

/**
 * ⚠ چرا قیمت *نوشته* می‌شود و نه سرِ نمایش حساب می‌شود
 *
 * راهِ ساده‌تر این بود که ‎woocommerce_product_get_price‎ را
 * فیلتر کنیم و عدد را لحظه‌ای بسازیم. سه چیز را می‌شکست:
 *
 *   ۱ مرتب‌سازی «ارزان‌ترین» در صفحه‌ی فروشگاه، که با پرس‌وجوی
 *     SQL روی ‎_price‎ کار می‌کند نه با فیلترِ PHP
 *   ۲ فیلترِ بازه‌ی قیمت، به همان دلیل
 *   ۳ گزارش‌های ووکامرس و هر افزونه‌ای که مستقیم متا می‌خواند
 *
 * پس قیمت یک بار نوشته می‌شود و بقیه‌ی سیستم عددِ واقعی را
 * می‌بیند.
 *
 * @return bool آیا چیزی عوض شد
 */
function phoenix_apply_price($product_id, $rate = null, $reason = 'engine') {
    if (!phoenix_setting('engine_on')) {
        return false;
    }

    $calc = phoenix_compute_price($product_id, $rate);
    if ($calc === null) {
        return false;
    }

    $product = wc_get_product($product_id);
    if (!$product) {
        return false;
    }

    $old_regular = (int) round((float) $product->get_regular_price('edit'));
    $old_sale    = (int) round((float) $product->get_sale_price('edit'));

    if ($old_regular === $calc['regular'] && $old_sale === $calc['sale']) {
        return false; // چیزی عوض نشده — نوشتنِ بی‌دلیل یعنی باطل‌کردنِ کشِ بی‌دلیل
    }

    $product->set_regular_price((string) $calc['regular']);
    $product->set_sale_price($calc['sale'] > 0 ? (string) $calc['sale'] : '');
    $product->save();

    phoenix_audit(
        'price',
        (string) $product_id,
        $old_sale > 0 ? "{$old_regular}/{$old_sale}" : (string) $old_regular,
        $calc['sale'] > 0 ? "{$calc['regular']}/{$calc['sale']}" : (string) $calc['regular'],
        $reason . ($calc['floor_hit'] ? ' — کفِ قیمت فعال شد' : '')
    );

    return true;
}

/* ============================================================
   ۵ بازنویسیِ دسته‌جمعی
   ============================================================ */

/**
 * ⚠ دسته‌دسته، نه همه با هم.
 *
 * فروشگاهی با سیصد محصول و پلن‌هایشان یعنی حدودِ هزار
 * ‎$product->save()‎. در یک اجرا، هم از حافظه می‌افتد هم از
 * زمانِ مجازِ PHP. پس هر دور یک دسته می‌نویسد و اگر کارِ
 * بیشتری مانده باشد، دورِ بعدی را زمان‌بندی می‌کند.
 *
 * ⚠ و یک قفل، تا دو اجرا هم‌زمان نشوند.
 *
 * بدونِ قفل، کرون و دکمه‌ی دستی می‌توانند با هم بدوند و هر دو
 * روی یک محصول بنویسند. نتیجه خراب نمی‌شود ولی تاریخچه پر از
 * سطرهای تکراری می‌شود و بار روی پایگاه داده دو برابر.
 */
const PHOENIX_REPRICE_LOCK  = 'phoenix_reprice_lock';
const PHOENIX_REPRICE_STATE = 'phoenix_reprice_state';

add_action('phoenix_reprice_all', 'phoenix_reprice_batch');
function phoenix_reprice_batch() {
    if (!phoenix_setting('engine_on')) {
        delete_option(PHOENIX_REPRICE_STATE);
        return;
    }

    /* ⚠ ‎add_option‎ به‌جای ‎set_transient‎ برای قفل.
       ‎add_option‎ روی نامِ تکراری شکست می‌خورد و همین شکست،
       اتمی است — دو فرآیندِ هم‌زمان نمی‌توانند هر دو موفق
       شوند. ‎get_transient‎ + ‎set_transient‎ بینشان فاصله
       دارد و همان فاصله، مسابقه است. */
    if (!add_option(PHOENIX_REPRICE_LOCK, time(), '', false)) {
        $since = (int) get_option(PHOENIX_REPRICE_LOCK);
        if ($since && (time() - $since) < 10 * MINUTE_IN_SECONDS) {
            return; // یکی دارد می‌دود
        }
        /* قفلِ گیرکرده — احتمالاً اجرای قبلی وسطِ راه مرد */
        update_option(PHOENIX_REPRICE_LOCK, time(), false);
    }

    try {
        $state  = get_option(PHOENIX_REPRICE_STATE);
        $offset = (is_array($state) && isset($state['offset'])) ? (int) $state['offset'] : 0;
        $rate   = phoenix_rate_value();
        $size   = 40;

        $ids = phoenix_priceable_ids($offset, $size);

        $changed = 0;
        foreach ($ids as $id) {
            if (phoenix_apply_price($id, $rate, 'بازنویسیِ دسته‌جمعی')) {
                $changed++;
            }
        }

        if (count($ids) < $size) {
            /* تمام شد */
            delete_option(PHOENIX_REPRICE_STATE);
            update_option('phoenix_reprice_last', array(
                'at'      => current_time('mysql', true),
                'scanned' => $offset + count($ids),
            ), false);
        } else {
            update_option(PHOENIX_REPRICE_STATE, array(
                'offset'  => $offset + $size,
                'changed' => (is_array($state) ? (int) $state['changed'] : 0) + $changed,
            ), false);
            wp_schedule_single_event(time() + 20, 'phoenix_reprice_all');
        }
    } finally {
        delete_option(PHOENIX_REPRICE_LOCK);
    }
}

/**
 * شناسه‌ی محصولات و واریاسیون‌هایی که موتور باید ببیند.
 *
 * ⚠ ‎post_status‎ محدود است.
 *
 * بدونش، سطلِ زباله و پیش‌نویس‌ها هم قیمت می‌گیرند — کارِ
 * بیهوده روی چیزی که کسی نمی‌بیند، و تاریخچه‌ای که پر از
 * محصولاتِ حذف‌شده می‌شود.
 */
function phoenix_priceable_ids($offset, $limit) {
    global $wpdb;

    $offset = max(0, (int) $offset);
    $limit  = max(1, min(200, (int) $limit));

    return array_map('intval', (array) $wpdb->get_col($wpdb->prepare(
        "SELECT ID FROM {$wpdb->posts}
          WHERE post_type IN ('product','product_variation')
            AND post_status IN ('publish','private')
          ORDER BY ID ASC
          LIMIT %d OFFSET %d",
        $limit,
        $offset
    )));
}

/**
 * شروعِ دستیِ بازنویسی از پنل.
 *
 * ⚠ زمان‌بندی می‌شود، همان‌جا اجرا نمی‌شود.
 *
 * وسوسه‌اش این بود که دسته‌ی اول را همان‌جا بنویسد تا ادمین
 * فوری نتیجه ببیند. ولی چهل ‎$product->save()‎ داخلِ یک
 * درخواستِ پیشخوان، روی هاستِ اشتراکی می‌تواند از زمانِ مجازِ
 * PHP رد شود — و آن‌وقت صفحه با خطای ۵۰۰ می‌ماند، وسطِ کار،
 * با قفلی که ‎finally‎ش اجرا نشده.
 *
 * پس صف می‌شود و پیامِ پنل هم همین را می‌گوید.
 */
function phoenix_reprice_start() {
    delete_option(PHOENIX_REPRICE_STATE);
    delete_option(PHOENIX_REPRICE_LOCK);

    $ts = wp_next_scheduled('phoenix_reprice_all');
    if ($ts) {
        wp_unschedule_event($ts, 'phoenix_reprice_all');
    }
    wp_schedule_single_event(time() + 5, 'phoenix_reprice_all');
}

/* ============================================================
   ۶ قفلِ قیمت در سبد
   ============================================================ */

/**
 * ⚠ قیمتی که مشتری دید، تا پرداخت همان می‌ماند.
 *
 * سناریو: مشتری ساعت ۱۰ محصولی را به سبد می‌اندازد، ساعت ۱۰:۱۵
 * کرونِ نرخ می‌دود، قیمت بالا می‌رود، و مشتری ساعت ۱۰:۲۰ سرِ
 * پرداخت عددِ دیگری می‌بیند. حق دارد شاکی باشد.
 *
 * پس قیمتِ لحظه‌ی افزودن روی خودِ ردیفِ سبد ذخیره می‌شود و تا
 * مدتِ معینی همان اعمال می‌شود. بعد از آن دیگر قفل نیست —
 * چون سبدِ سه‌روزه را نمی‌شود با نرخِ سه روز پیش فروخت.
 *
 * ⚠ سقفِ قفل هم دارد: قیمتِ قفل‌شده نباید *کمتر* از کفِ قیمتِ
 * امروز باشد. وگرنه کسی می‌تواند سبدش را روزها نگه دارد تا
 * نرخ بالا برود و با قیمتِ قدیمی بخرد.
 */
add_filter('woocommerce_add_cart_item_data', 'phoenix_cart_lock_stamp', 10, 3);
function phoenix_cart_lock_stamp($data, $product_id, $variation_id) {
    $id = $variation_id ? $variation_id : $product_id;
    $p  = wc_get_product($id);
    if (!$p) {
        return $data;
    }
    $data['phoenix_locked_price'] = (float) $p->get_price('edit');
    $data['phoenix_locked_at']    = time();
    return $data;
}

add_action('woocommerce_before_calculate_totals', 'phoenix_cart_lock_apply', 20, 1);
function phoenix_cart_lock_apply($cart) {
    if (is_admin() && !defined('DOING_AJAX')) {
        return;
    }
    $minutes = (int) phoenix_setting('cart_lock_min', 30);
    if ($minutes <= 0) {
        return;
    }
    $max_age = $minutes * MINUTE_IN_SECONDS;

    foreach ($cart->get_cart() as $item) {
        if (empty($item['phoenix_locked_price']) || empty($item['phoenix_locked_at'])) {
            continue;
        }
        if ((time() - (int) $item['phoenix_locked_at']) > $max_age) {
            continue; // قفل باز شد — قیمتِ امروز
        }
        /** @var WC_Product $product */
        $product = $item['data'];
        $locked  = (float) $item['phoenix_locked_price'];
        $now     = (float) $product->get_price('edit');

        /* فقط وقتی قفل به نفعِ مشتری است و زیرِ قیمتِ امروز
           نیفتاده. اگر قیمت پایین آمده، قیمتِ پایین‌تر
           می‌ماند — نگه‌داشتنِ عددِ گران‌ترِ دیروز کلاهبرداری
           است. */
        if ($locked > 0 && $locked < $now) {
            $product->set_price($locked);
        }
    }
}
