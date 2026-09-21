<?php
/**
 * تخفیف‌ها — گروهی و اختصاصی.
 *
 * ============================================================
 * ⚠ چرا کوپنِ ووکامرس کافی نبود
 *
 * کوپن سرِ *پرداخت* اعمال می‌شود. یعنی مشتری قیمتِ کامل را
 * می‌بیند، به سبد می‌اندازد، و تازه سرِ صندوق می‌فهمد ارزان‌تر
 * شده. برای «۲۰٪ روی کلِ دسته‌ی گیم تا جمعه» این اشتباه است:
 * تخفیفِ گروهی باید *روی کارتِ محصول* دیده شود، وگرنه کارش را
 * نمی‌کند.
 *
 * پس دو چیزِ متفاوت داریم و هر کدام جای خودش:
 *
 *   قاعده‌ی گروهی  → این‌جا، روی قیمتِ محصول می‌نشیند
 *                    (دسته / تگ / محصول / همه)
 *   کدِ اختصاصی    → کوپنِ خودِ ووکامرس، سرِ پرداخت
 *                    (ساختنش از پنلِ ما، یک دکمه)
 *
 * ============================================================
 * ⚠ و قاعده‌ای که یک شبِ جمعه را نجات می‌دهد: جمع نمی‌شوند.
 *
 * اگر «۲۰٪ روی همه» و «۳۰٪ روی گیم» و «۱۵٪ روی این محصول» هر
 * سه فعال باشند، پیش‌فرض این است که *بهترینشان* اعمال شود، نه
 * هر سه. با جمع‌شدن، همان محصول ۶۵٪ تخفیف می‌خورد بی‌آنکه
 * کسی خواسته باشد.
 *
 * قاعده‌ای که صریحاً ‎stack‎ دارد روی بهترین سوار می‌شود — ولی
 * کفِ قیمت (در pricing.php) باز هم آخرین حرف را می‌زند.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * ساختِ یک قاعده‌ی خالی — تنها جایی که شکلِ قاعده تعریف می‌شود.
 */
function phoenix_discount_blank() {
    return array(
        'id'       => '',
        'title'    => '',
        'enabled'  => true,
        'scope'    => 'all',      // all | category | tag | product
        'targets'  => array(),    // term_id یا product_id
        'type'     => 'percent',  // percent | amount
        'value'    => 0,
        'cap'      => 0,          // سقفِ تومانیِ تخفیفِ درصدی، ۰ یعنی بی‌سقف
        'starts'   => 0,
        'ends'     => 0,
        'priority' => 10,
        'stack'    => false,
    );
}

function phoenix_discount_scopes() {
    return array(
        'all'      => 'همه‌ی محصولات',
        'category' => 'یک یا چند دسته',
        'tag'      => 'یک یا چند تگ',
        'product'  => 'محصولِ مشخص',
    );
}

/** همه‌ی قاعده‌ها، همان‌طور که ذخیره شده‌اند */
function phoenix_discounts_all() {
    $rules = phoenix_setting('discounts', array());
    return is_array($rules) ? $rules : array();
}

/**
 * ⚠ پاک‌سازیِ یک قاعده پیش از ذخیره.
 *
 * این تابع تنها دروازه‌ی نوشتن است. هر عددی محدود می‌شود و هر
 * رشته‌ای از فهرستِ سفید می‌آید — یعنی حتی اگر فرمِ پنل دور
 * زده شود، چیزی که در option می‌نشیند همیشه شکلِ درست دارد.
 */
function phoenix_discount_sanitize(array $in) {
    $d = phoenix_discount_blank();

    $id = isset($in['id']) ? sanitize_key((string) $in['id']) : '';
    if ($id === '') {
        $id = 'd' . substr(md5(uniqid('', true)), 0, 10);
    }

    $scope = isset($in['scope']) ? (string) $in['scope'] : 'all';
    if (!array_key_exists($scope, phoenix_discount_scopes())) {
        $scope = 'all';
    }

    $type = (isset($in['type']) && $in['type'] === 'amount') ? 'amount' : 'percent';

    $value = isset($in['value']) ? (float) $in['value'] : 0;
    /* ⚠ درصد تا ۹۰ و نه ۱۰۰.
       صد درصد یعنی رایگان، و هیچ‌وقت «تخفیفِ گروهی» نباید
       بتواند محصول را رایگان کند. اگر واقعاً هدیه لازم است،
       کوپنِ تک‌نفره کارِ درست است نه قاعده‌ی گروهی. */
    $value = ($type === 'percent') ? max(0.0, min(90.0, $value)) : max(0.0, $value);

    $targets = array();
    if (isset($in['targets']) && is_array($in['targets']) && $scope !== 'all') {
        foreach ($in['targets'] as $t) {
            $t = (int) $t;
            if ($t > 0) {
                $targets[] = $t;
            }
        }
        $targets = array_values(array_unique($targets));
    }

    $starts = isset($in['starts']) ? (int) $in['starts'] : 0;
    $ends   = isset($in['ends']) ? (int) $in['ends'] : 0;
    /* بازه‌ی وارونه یعنی قاعده هیچ‌وقت فعال نمی‌شود و ادمین
       نمی‌فهمد چرا — پس همان‌جا اصلاح می‌شود. */
    if ($starts > 0 && $ends > 0 && $ends < $starts) {
        $tmp    = $starts;
        $starts = $ends;
        $ends   = $tmp;
    }

    return array(
        'id'       => $id,
        'title'    => isset($in['title']) ? sanitize_text_field((string) $in['title']) : '',
        'enabled'  => !empty($in['enabled']),
        'scope'    => $scope,
        'targets'  => $targets,
        'type'     => $type,
        'value'    => $value,
        'cap'      => max(0, (int) (isset($in['cap']) ? $in['cap'] : 0)),
        'starts'   => max(0, $starts),
        'ends'     => max(0, $ends),
        'priority' => max(0, min(1000, (int) (isset($in['priority']) ? $in['priority'] : $d['priority']))),
        'stack'    => !empty($in['stack']),
    );
}

function phoenix_discount_save(array $rule) {
    $rule  = phoenix_discount_sanitize($rule);
    $all   = phoenix_discounts_all();
    $found = false;

    foreach ($all as $i => $existing) {
        if (isset($existing['id']) && $existing['id'] === $rule['id']) {
            $all[$i] = $rule;
            $found   = true;
            break;
        }
    }
    if (!$found) {
        $all[] = $rule;
    }

    phoenix_settings_save(array('discounts' => array_values($all)), 'تخفیف: ' . $rule['title']);
    phoenix_discount_flush();
    return $rule;
}

function phoenix_discount_delete($id) {
    $id  = sanitize_key((string) $id);
    $all = phoenix_discounts_all();
    $out = array();
    foreach ($all as $rule) {
        if (isset($rule['id']) && $rule['id'] === $id) {
            phoenix_audit('discount', $id, isset($rule['title']) ? $rule['title'] : $id, null, 'حذف شد');
            continue;
        }
        $out[] = $rule;
    }
    phoenix_settings_save(array('discounts' => $out), 'حذفِ تخفیف');
    phoenix_discount_flush();
}

/* ============================================================
   اعمال
   ============================================================ */

/** آیا این قاعده همین حالا در پنجره‌ی زمانی‌اش است */
function phoenix_discount_live(array $rule, $now = null) {
    if (empty($rule['enabled'])) {
        return false;
    }
    $now = $now === null ? time() : (int) $now;
    if (!empty($rule['starts']) && $now < (int) $rule['starts']) {
        return false;
    }
    if (!empty($rule['ends']) && $now > (int) $rule['ends']) {
        return false;
    }
    return true;
}

/**
 * آیا این قاعده روی این محصول می‌نشیند.
 *
 * ⚠ دسته و تگ روی *والد* بررسی می‌شوند.
 *
 * واریاسیون خودش ‎product_cat‎ ندارد؛ دسته روی محصولِ والد
 * است. بدونِ این، «۲۰٪ روی دسته‌ی گیم» هیچ پلنی را نمی‌گرفت و
 * فقط محصولاتِ ساده را — باگی که فقط وقتی دیده می‌شود که
 * کسی شکایت کند.
 */
function phoenix_discount_matches(array $rule, $product_id) {
    $parent = (int) wp_get_post_parent_id($product_id);
    $owner  = $parent ? $parent : (int) $product_id;

    switch ($rule['scope']) {
        case 'all':
            return true;

        case 'product':
            return in_array((int) $product_id, $rule['targets'], true)
                || in_array($owner, $rule['targets'], true);

        case 'category':
            return phoenix_has_any_term($owner, 'product_cat', $rule['targets']);

        case 'tag':
            return phoenix_has_any_term($owner, 'product_tag', $rule['targets']);
    }
    return false;
}

/**
 * ⚠ شاملِ دسته‌های فرزند هم می‌شود.
 *
 * ادمین «۲۰٪ روی گیم» می‌گذارد و انتظار دارد زیرشاخه‌هایش هم
 * بگیرند. ‎has_term‎ با ‎term_id‎ فقط دقیقاً همان دسته را
 * می‌بیند، پس زنجیره‌ی نیاکانِ هر دسته‌ی محصول چک می‌شود.
 */
function phoenix_has_any_term($post_id, $taxonomy, array $wanted) {
    if (!$wanted) {
        return false;
    }
    $terms = get_the_terms($post_id, $taxonomy);
    if (!is_array($terms)) {
        return false;
    }
    foreach ($terms as $t) {
        if (in_array((int) $t->term_id, $wanted, true)) {
            return true;
        }
        foreach (get_ancestors($t->term_id, $taxonomy, 'taxonomy') as $anc) {
            if (in_array((int) $anc, $wanted, true)) {
                return true;
            }
        }
    }
    return false;
}

/** مبلغِ تخفیفِ یک قاعده روی یک قیمت */
function phoenix_discount_amount(array $rule, $price) {
    $price = max(0, (int) $price);
    if ($rule['type'] === 'amount') {
        return (int) min($price, round($rule['value']));
    }
    $off = $price * ((float) $rule['value'] / 100);
    if (!empty($rule['cap'])) {
        $off = min($off, (float) $rule['cap']);
    }
    return (int) min($price, round($off));
}

/**
 * بهترین تخفیفِ ممکن روی این محصول.
 *
 * @return array|null {price, off, rules[], label}
 */
function phoenix_discount_for($product_id, $regular) {
    $regular = (int) $regular;
    if ($regular <= 0) {
        return null;
    }

    $now   = time();
    $best  = null;
    $stack = array();

    foreach (phoenix_discounts_all() as $raw) {
        $rule = array_merge(phoenix_discount_blank(), (array) $raw);
        if (!phoenix_discount_live($rule, $now)) {
            continue;
        }
        if (!phoenix_discount_matches($rule, $product_id)) {
            continue;
        }
        if ((float) $rule['value'] <= 0) {
            continue;
        }

        if (!empty($rule['stack'])) {
            $stack[] = $rule;
            continue;
        }

        $off = phoenix_discount_amount($rule, $regular);
        if ($best === null || $off > $best['off']) {
            $best = array('rule' => $rule, 'off' => $off);
        }
    }

    if ($best === null && !$stack) {
        return null;
    }

    $price = $regular;
    $used  = array();

    if ($best !== null) {
        $price -= $best['off'];
        $used[] = $best['rule'];
    }

    /* ⚠ قاعده‌های stack به ترتیبِ اولویت و روی قیمتِ *باقی‌مانده*
       اعمال می‌شوند، نه روی قیمتِ اولیه. وگرنه سه تخفیفِ ۴۰٪
       می‌شود ۱۲۰٪ و قیمت منفی. */
    usort($stack, function ($a, $b) {
        return (int) $a['priority'] <=> (int) $b['priority'];
    });
    foreach ($stack as $rule) {
        if ($price <= 0) {
            break;
        }
        $off    = phoenix_discount_amount($rule, $price);
        $price -= $off;
        if ($off > 0) {
            $used[] = $rule;
        }
    }

    $price = max(0, (int) $price);
    if ($price >= $regular || !$used) {
        return null;
    }

    return array(
        'price' => $price,
        'off'   => $regular - $price,
        'rules' => array_map(function ($r) {
            return array('id' => $r['id'], 'title' => $r['title'], 'type' => $r['type'], 'value' => $r['value']);
        }, $used),
        'label' => count($used) === 1
            ? $used[0]['title']
            : sprintf('%d تخفیف', count($used)),
    );
}

/**
 * ⚠ قاعده‌ای که تاریخش رسیده، خودش قیمت را برنمی‌گرداند.
 *
 * تخفیف روی قیمتِ *نوشته‌شده* می‌نشیند، پس وقتی جمعه تمام شد،
 * تا بازنویسیِ بعدی قیمت‌ها هنوز تخفیف‌دارند. یک رویدادِ
 * روزانه کافی نیست — تخفیف ممکن است ساعتِ ۱۸ تمام شود.
 *
 * پس هر بار که قاعده‌ای ذخیره یا حذف می‌شود، و هر ساعت،
 * بازنویسی زمان‌بندی می‌شود.
 */
function phoenix_discount_flush() {
    if (!phoenix_setting('engine_on')) {
        return;
    }
    if (!wp_next_scheduled('phoenix_reprice_all')) {
        wp_schedule_single_event(time() + 10, 'phoenix_reprice_all');
    }
}

add_action('phoenix_rate_hourly', 'phoenix_discount_flush', 20);

/* ============================================================
   کدِ اختصاصی برای یک نفر
   ============================================================ */

/**
 * ساختِ کوپنِ تک‌نفره.
 *
 * ⚠ قفل روی ایمیلِ مشتری، نه شماره‌اش.
 *
 * ووکامرس کوپن را با ‎customer_email‎ محدود می‌کند و چیزی
 * به‌نامِ «قفل روی موبایل» ندارد. حسابِ ما با موبایل ساخته
 * می‌شود ولی هر حساب یک ایمیلِ ووکامرسی هم دارد — همان
 * استفاده می‌شود. اگر مشتری ایمیل نداشته باشد، کوپن
 * ‎usage_limit = 1‎ می‌گیرد و هرکس زودتر استفاده کند مالِ
 * اوست، که برای کدِ فرستاده‌شده به یک نفر کافی است.
 *
 * @return int|WP_Error شناسه‌ی کوپن
 */
function phoenix_make_personal_coupon($code, $type, $value, $email = '', $expires = 0) {
    if (!function_exists('wc_get_coupon_id_by_code')) {
        return new WP_Error('phoenix_no_woo', 'ووکامرس در دسترس نیست.');
    }

    $code = wc_format_coupon_code(sanitize_text_field($code));
    if ($code === '') {
        return new WP_Error('phoenix_bad_code', 'کد خالی است.');
    }
    if (wc_get_coupon_id_by_code($code)) {
        return new WP_Error('phoenix_dup_code', 'این کد از قبل هست.');
    }

    $type  = $type === 'amount' ? 'fixed_cart' : 'percent';
    $value = (float) $value;
    $value = $type === 'percent' ? max(0.0, min(100.0, $value)) : max(0.0, $value);
    if ($value <= 0) {
        return new WP_Error('phoenix_bad_value', 'مقدار باید بیشتر از صفر باشد.');
    }

    $coupon = new WC_Coupon();
    $coupon->set_code($code);
    $coupon->set_discount_type($type);
    $coupon->set_amount($value);
    $coupon->set_usage_limit(1);
    $coupon->set_usage_limit_per_user(1);
    $coupon->set_individual_use(true);

    if ($email !== '' && is_email($email)) {
        $coupon->set_email_restrictions(array(sanitize_email($email)));
    }
    if ($expires > 0) {
        $coupon->set_date_expires($expires);
    }

    $id = $coupon->save();
    if (!$id) {
        return new WP_Error('phoenix_save_failed', 'ذخیره نشد.');
    }

    phoenix_audit('discount', 'coupon:' . $code, null, $value . ($type === 'percent' ? '٪' : ' تومان'), 'کدِ اختصاصی ساخته شد');
    return (int) $id;
}
