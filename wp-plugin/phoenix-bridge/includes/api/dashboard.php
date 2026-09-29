<?php
/**
 * داشبوردِ پنلِ نسخه‌ی ۲.
 *
 * ============================================================
 * ⚠ دو نیمه، و جدایی‌شان عمدی است
 *
 *   جمع‌آوری  ‎phoenix_dash_state()‎ — به وردپرس و پایگاه داده
 *             دست می‌زند و یک آرایه‌ی ساده برمی‌گرداند.
 *
 *   قضاوت     ‎phoenix_dash_health()‎ و ‎_alerts()‎ و ‎_summary()‎
 *             و ‎_suggestions()‎ — تابعِ خالص؛ همان آرایه را
 *             می‌گیرند و هیچ‌جای دیگر را نگاه نمی‌کنند.
 *
 * نیمه‌ی دوم جایی است که اشتباه در آن هزینه دارد: هشداری که
 * بی‌جا بیاید، هشدارهای بعدی را نامرئی می‌کند؛ و امتیازی که
 * بی‌دلیل پایین باشد، ادمین را دنبالِ مشکلِ ناموجود می‌فرستد.
 * چون خالص است، بدونِ وردپرس تست می‌شود.
 *
 * ⚠ و همه‌ی قضاوت‌ها در PHP است، نه در جاوااسکریپتِ پنل.
 *
 * اگر پنل خودش تصمیم بگیرد «این هشدار است»، منطق دو جا
 * می‌شود و روزی با هم نمی‌خوانند. پنل فقط نشان می‌دهد.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', 'phoenix_dash_routes');
function phoenix_dash_routes() {
    phoenix_api_route('/dashboard', 'GET', 'phoenix_api_dashboard');

    phoenix_api_route('/engine', 'POST', 'phoenix_api_engine', array(
        'on' => array('type' => 'boolean', 'required' => true),
    ));

    phoenix_api_route('/rate/refresh', 'POST', 'phoenix_api_rate_refresh');

    phoenix_api_route('/prefs', 'POST', 'phoenix_api_prefs', array(
        'theme' => array(
            'type'     => 'string',
            'enum'     => array('light', 'dark', 'system'),
            'required' => true,
        ),
    ));
}

/* ============================================================
   جمع‌آوری
   ============================================================ */

function phoenix_dash_state() {
    $rate    = phoenix_rate_current();
    $enabled = phoenix_rate_sources_enabled();
    $health  = phoenix_rate_source_health();

    /* فقط منابعِ روشن شمرده می‌شوند. منبعی که ادمین خاموشش
       کرده «خوابیده» نیست، کنار گذاشته شده. */
    $ok   = 0;
    $read = 0;
    $dead = array();
    foreach ($enabled as $slug => $src) {
        if (!isset($health[$slug])) {
            continue; // هنوز خوانده نشده — نه سالم، نه خراب
        }
        $read++;
        if ($health[$slug]->status === 'ok') {
            $ok++;
        } else {
            $dead[] = $src['label'];
        }
    }

    $live = 0;
    foreach (phoenix_discounts_all() as $r) {
        if (phoenix_discount_live(array_merge(phoenix_discount_blank(), (array) $r))) {
            $live++;
        }
    }

    /* ⚠ نامِ فارسیِ منبع، نه اسلاگش.
       پنل «از wallex» می‌نوشت — نامِ داخلیِ کد، جلوی چشمِ ادمین. */
    $src_slug  = isset($rate['source']) ? (string) $rate['source'] : '';
    $all_src   = phoenix_rate_sources();
    $src_label = $src_slug === 'manual' ? 'نرخِ دستی'
        : (isset($all_src[$src_slug]['label']) ? $all_src[$src_slug]['label'] : $src_slug);

    $state_opt = get_option('phoenix_reprice_state');
    $last_opt  = get_option('phoenix_reprice_last');

    return array(
        'rate' => array(
            'value'        => empty($rate['rate']) ? 0 : (int) $rate['rate'],
            'at'           => isset($rate['at']) ? $rate['at'] : null,
            'stale'        => !empty($rate['stale']),
            'source'       => $src_label,
            'why'          => isset($rate['why']) ? (string) $rate['why'] : '',
            'manual'       => (int) phoenix_setting('manual_rate') > 0,
            'manual_until' => (int) phoenix_setting('manual_until'),
        ),
        'sources' => array(
            'total' => count($enabled),
            /* ⚠ چندتا تا حالا *امتحان* شده‌اند.
               روی نصبِ تازه هیچ‌کدام خوانده نشده‌اند و «۰ منبعِ سالم»
               دروغ است — امتحان نشده‌اند، نه اینکه جواب نداده
               باشند. قضاوتِ «زیرِ حداقل» فقط وقتی معنا دارد که
               دست‌کم یک دور خوانده شده باشد. */
            'read'  => $read,
            'ok'    => $ok,
            'dead'  => $dead,
            'min'   => max(1, (int) phoenix_setting('min_sources')),
        ),
        'engine' => array(
            'on'      => (bool) phoenix_setting('engine_on'),
            'running' => is_array($state_opt),
            'scanned' => is_array($state_opt) ? (int) $state_opt['offset'] : 0,
            'last_at' => is_array($last_opt) ? (string) $last_opt['at'] : null,
        ),
        'products'    => phoenix_dash_product_counts(),
        'discounts'   => array('live' => $live),
        'queue'       => phoenix_queue_counts(),
        'auto_fulfil' => (bool) phoenix_setting('auto_fulfil'),
        'real_cron'   => defined('DISABLE_WP_CRON') && DISABLE_WP_CRON,
    );
}

/**
 * چند محصول داریم و چندتایشان قیمتِ تمام‌شده دارند.
 *
 * ⚠ ‎"cost_usd"‎ شمرده می‌شود، نه ‎"usd"‎.
 *
 * ‎usd‎ «در سایتِ خودش چند است» را می‌گوید و روی بیشترِ محصولاتِ
 * واردشده هست. اگر آن را می‌شمردیم، داشبورد می‌گفت «۳۴ محصول
 * دستِ موتور» در حالی که هیچ‌کدام قیمتِ تمام‌شده نداشتند.
 *
 * ⚠ واریاسیون به والدش شمرده می‌شود.
 *
 * محصولی با سه پلن که فقط یکی‌شان هزینه دارد، «یک محصول با
 * قیمتِ تمام‌شده» است نه سه. شمارشِ خام، عدد را از تعدادِ کلِ
 * محصولات بزرگ‌تر نشان می‌داد.
 */
function phoenix_dash_product_counts() {
    global $wpdb;

    $total = (int) $wpdb->get_var(
        "SELECT COUNT(*) FROM {$wpdb->posts}
          WHERE post_type = 'product' AND post_status = 'publish'"
    );

    $with_cost = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(DISTINCT CASE WHEN p.post_type = 'product_variation'
                                    THEN p.post_parent ELSE p.ID END)
           FROM {$wpdb->postmeta} pm
           INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
          WHERE pm.meta_key = %s
            AND p.post_type IN ('product', 'product_variation')
            AND p.post_status IN ('publish', 'private')
            AND (pm.meta_value LIKE %s OR pm.meta_value LIKE %s OR pm.meta_value LIKE %s)",
        PHOENIX_META_KEY,
        '%' . $wpdb->esc_like('"cost_usd"') . '%',
        '%' . $wpdb->esc_like('"cost_toman"') . '%',
        /* «چند منبع» هزینه‌اش در متای جداست؛ حالتش این‌جاست */
        '%' . $wpdb->esc_like('"price_mode";s:7:"sources"') . '%'
    ));

    $with_cost = min($with_cost, $total);

    return array(
        'total'   => $total,
        'engine'  => $with_cost,
        'missing' => max(0, $total - $with_cost),
        'held'    => function_exists('phoenix_psrc_held_count') ? phoenix_psrc_held_count() : 0,
    );
}

/* ============================================================
   قضاوت — همه خالص
   ============================================================ */

/**
 * رقمِ فارسی، برای جمله‌هایی که خودمان می‌سازیم.
 *
 * ⚠ ‎sprintf('%d')‎ رقمِ لاتین می‌دهد و نتیجه‌اش «2 کارِ تحویل
 * ناموفق» بود — عددِ انگلیسی وسطِ جمله‌ی فارسی. فقط روی متن‌هایی
 * اعمال می‌شود که کاملاً مالِ خودمان‌اند (خلاصه، هشدار، پیشنهاد)؛
 * نامِ محصول و یادداشتِ تاریخچه دست نمی‌خورند، چون «PS5» نباید
 * «PS۵» شود.
 */
function phoenix_fa_digits($text) {
    return strtr((string) $text, array(
        '0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴',
        '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹',
    ));
}

/** منابعِ سالم زیرِ حداقل‌اند — فقط اگر دست‌کم یک دور خوانده شده باشند */
function phoenix_dash_below_min(array $s) {
    $read = isset($s['sources']['read']) ? (int) $s['sources']['read'] : (int) $s['sources']['total'];
    return $s['sources']['total'] > 0
        && $read > 0
        && $s['sources']['ok'] < $s['sources']['min'];
}

/**
 * امتیازِ سلامت، از صد.
 *
 * ⚠ هر کسر دلیلِ نوشته‌شده دارد و همه به پنل برمی‌گردند.
 *
 * عددِ «۷۲ از ۱۰۰» بدونِ توضیح، فقط اضطراب می‌سازد. پنل کنارِ
 * امتیاز فهرستِ کسرها را نشان می‌دهد تا معلوم باشد دقیقاً چه
 * چیزی درست شود تا بالا برود.
 *
 * ⚠ موتورِ خاموش کسر ندارد.
 *
 * خاموش بودن تصمیم است، نه خرابی — فروشگاهی که همه‌ی قیمت‌ها را
 * دستی می‌گذارد سالم است.
 */
function phoenix_dash_health(array $s) {
    $parts = array();

    if (empty($s['rate']['value'])) {
        $parts[] = array('label' => 'هیچ نرخی گرفته نشده', 'delta' => -40);
    } elseif (!empty($s['rate']['stale'])) {
        $parts[] = array('label' => 'نرخ کهنه است', 'delta' => -15);
    }

    if (phoenix_dash_below_min($s)) {
        $parts[] = array(
            'label' => sprintf('فقط %d منبعِ سالم؛ حداقل %d لازم است', $s['sources']['ok'], $s['sources']['min']),
            'delta' => -20,
        );
    }

    $dead = count($s['sources']['dead']);
    if ($dead > 0) {
        $parts[] = array(
            'label' => sprintf('%d منبع جواب نمی‌دهد', $dead),
            'delta' => -min(15, 5 * $dead),
        );
    }

    $failed = (int) $s['queue']['failed'];
    if ($failed > 0) {
        $parts[] = array(
            'label' => sprintf('%d کارِ تحویل ناموفق', $failed),
            'delta' => -min(20, 10 * $failed),
        );
    }

    if (!empty($s['rate']['manual']) && empty($s['rate']['manual_until'])) {
        $parts[] = array('label' => 'نرخِ دستیِ بدونِ تاریخِ انقضا', 'delta' => -5);
    }

    $score = 100;
    foreach ($parts as $i => $p) {
        $score += $p['delta'];
        $parts[$i]['label'] = phoenix_fa_digits($p['label']);
    }

    return array('score' => max(0, $score), 'parts' => $parts);
}

/**
 * هشدارها — فقط وقتی کاری لازم است.
 *
 * ⚠ پنلی که همیشه یک نوارِ زرد دارد، همان نوار را نامرئی
 * می‌کند. پس هر هشدار شرطِ واقعی دارد و در حالتِ سالم هیچ‌کدام
 * نمی‌آیند — و هر کدام یک کنش دارد، نه فقط یک جمله.
 *
 * @return array[] {level: high|medium|low, title, text, action?}
 */
/**
 * هشدارهای خودِ Bridge به‌علاوه‌ی افزونه‌های دیگر (مثلاً «حالتِ آزمایشیِ
 * پیامک روشن است» از Phoenix Account).
 *
 * ⚠ هشدارِ بیرونی هم از همان الگو رد می‌شود: فقط سه سطح، متنِ
 * ساده، و کنشِ «برو به بخش» — نه نشانیِ دلخواه.
 */
function phoenix_dash_alerts_all(array $s) {
    $out = phoenix_dash_alerts($s);
    foreach ((array) apply_filters('phoenix_dash_alerts_extra', array()) as $a) {
        if (!is_array($a) || empty($a['title'])) {
            continue;
        }
        $alert = array(
            'level' => in_array($a['level'] ?? '', array('high', 'medium', 'low'), true) ? $a['level'] : 'medium',
            'title' => sanitize_text_field((string) $a['title']),
            'text'  => sanitize_text_field((string) ($a['text'] ?? '')),
        );
        if (!empty($a['action']['go']) && preg_match('/^[a-z][a-z0-9-]{1,30}$/', $a['action']['go'])) {
            $label = sanitize_text_field((string) ($a['action']['label'] ?? 'برو'));
            $world = (string) ($a['action']['world'] ?? '');
            /* بخشی در پنلِ جدا (مثلاً «مشتریان») — نشانیِ همان پنل، نه ‎#‎ی این یکی.
               ⚠ ‎admin.php‎ی Bridge (و ‎phoenix_admin_worlds‎) روی REST بار نمی‌شود؛
               شناسه با الگو سنجیده و نشانی مستقیم ساخته می‌شود. */
            if ($world !== '' && preg_match('/^[a-z]{2,20}$/', $world)) {
                $alert['action'] = array('label' => $label,
                    'link' => admin_url('admin.php?page=phoenix-' . $world . '#/' . $a['action']['go']));
            } elseif ($world === '') {
                $alert['action'] = array('label' => $label, 'go' => $a['action']['go']);
            }
        }
        $out[] = $alert;
    }
    /* بالاها اول، همان ترتیبی که ‎phoenix_dash_alerts‎ دارد */
    $rank = array('high' => 0, 'medium' => 1, 'low' => 2);
    usort($out, function ($a, $b) use ($rank) { return $rank[$a['level']] <=> $rank[$b['level']]; });
    return $out;
}

function phoenix_dash_alerts(array $s) {
    $out = array();

    if (empty($s['rate']['value'])) {
        $out[] = array(
            'level'  => 'high',
            'title'  => 'هیچ نرخی گرفته نشده',
            'text'   => 'تا نرخ نیاید، قیمتِ هیچ محصولِ دلاری‌ای حساب نمی‌شود.',
            'action' => array('label' => 'همین حالا بگیر', 'do' => 'rate-refresh'),
        );
    } elseif (!empty($s['rate']['stale'])) {
        $out[] = array(
            'level'  => 'medium',
            'title'  => 'نرخ کهنه است',
            'text'   => 'آخرین به‌روزرسانیِ موفق مدتی پیش بوده. قیمت‌ها با همان نرخِ قبلی حساب می‌شوند.',
            'action' => array('label' => 'دوباره بگیر', 'do' => 'rate-refresh'),
        );
    }

    if (phoenix_dash_below_min($s)) {
        $out[] = array(
            'level'  => 'high',
            'title'  => 'نرخ عوض نمی‌شود',
            'text'   => sprintf(
                'فقط %d منبع جواب داده و حداقل %d لازم است. با یک منبع نمی‌شود فهمید عددش درست است یا نه، پس نرخِ قبلی می‌ماند.',
                $s['sources']['ok'],
                $s['sources']['min']
            ),
            'action' => array('label' => 'منابعِ قیمت', 'go' => 'rate'),
        );
    }

    if (!empty($s['sources']['dead'])) {
        $out[] = array(
            'level'  => 'medium',
            'title'  => 'منبعی جواب نمی‌دهد',
            'text'   => 'این‌ها آخرین بار جواب ندادند: ' . implode('، ', $s['sources']['dead']) . '.',
            'action' => array('label' => 'ببین چرا', 'go' => 'rate'),
        );
    }

    /* قیمتی که منابعش جهش داشته یا هیچ‌کدام جواب نداده‌اند */
    if (!empty($s['products']['held'])) {
        $out[] = array(
            'level'  => 'high',
            'title'  => 'قیمتِ محصول نگه داشته شده',
            'text'   => sprintf('منابعِ قیمتِ %d محصول یا پلن جهشِ بزرگ داشته‌اند یا جواب نداده‌اند؛ قیمتِ قبلی مانده تا تو ببینی.', (int) $s['products']['held']),
            'action' => array('label' => 'منابعِ قیمت', 'go' => 'rate'),
        );
    }

    if ((int) $s['queue']['failed'] > 0) {
        $out[] = array(
            'level'  => 'high',
            'title'  => 'کارِ تحویلِ ناموفق',
            'text'   => sprintf('%d سفارش منتظرِ رسیدگی است و مشتری هنوز چیزی نگرفته.', (int) $s['queue']['failed']),
            'action' => array('label' => 'صفِ تحویل', 'go' => 'queue'),
        );
    }

    if (!empty($s['rate']['manual'])) {
        $out[] = array(
            'level' => empty($s['rate']['manual_until']) ? 'medium' : 'low',
            'title' => 'نرخِ دستی فعال است',
            'text'  => empty($s['rate']['manual_until'])
                ? 'همه‌ی منابع نادیده گرفته می‌شوند و تاریخِ انقضا ندارد — تا وقتی خودت برنداری می‌ماند.'
                : 'همه‌ی منابع تا تاریخِ انقضا نادیده گرفته می‌شوند.',
            'action' => array('label' => 'تنظیماتِ نرخ', 'go' => 'rate'),
        );
    }

    /* موتورِ خاموش فقط وقتی هشدار است که کاری برایش مانده باشد */
    if (empty($s['engine']['on']) && (int) $s['products']['engine'] > 0) {
        $out[] = array(
            'level'  => 'medium',
            'title'  => 'موتورِ قیمت خاموش است',
            'text'   => sprintf(
                '%d محصول قیمتِ تمام‌شده دارند ولی قیمتشان خودکار حساب نمی‌شود.',
                (int) $s['products']['engine']
            ),
            'action' => array('label' => 'روشن کن', 'do' => 'engine-on'),
        );
    }

    /* ترتیب: بالا، متوسط، کم — تا مهم‌ترین اول دیده شود */
    $rank = array('high' => 0, 'medium' => 1, 'low' => 2);
    usort($out, function ($a, $b) use ($rank) {
        return $rank[$a['level']] <=> $rank[$b['level']];
    });

    foreach ($out as $i => $a) {
        $out[$i]['title'] = phoenix_fa_digits($a['title']);
        $out[$i]['text']  = phoenix_fa_digits($a['text']);
    }
    return $out;
}

/**
 * پیشنهادها — کارِ بعدی، نه خرابی.
 *
 * فرقشان با هشدار این است که نبودنشان چیزی را نمی‌شکند؛ فقط
 * فروشگاه را بهتر می‌کنند.
 */
function phoenix_dash_suggestions(array $s) {
    $out = array();

    if ((int) $s['products']['missing'] > 0 && (int) $s['products']['total'] > 0) {
        $out[] = array(
            'text'   => sprintf(
                '%d محصول از %d هنوز قیمتِ تمام‌شده ندارند و قیمتشان دستی است.',
                (int) $s['products']['missing'],
                (int) $s['products']['total']
            ),
            'action' => array('label' => 'محصولات', 'go' => 'products'),
        );
    }

    if (empty($s['real_cron'])) {
        $out[] = array(
            'text'   => 'کرونِ واقعیِ سرور راه نیفتاده؛ نرخ فقط وقتی به‌روز می‌شود که کسی سایت را باز کند.',
            'action' => array('label' => 'راهنما', 'href' => 'https://github.com/mohadrh/MINIMAL-ONLINE-SHOP/blob/main/docs/WORDPRESS-SETUP.md'),
        );
    }

    foreach ($out as $i => $g) {
        $out[$i]['text'] = phoenix_fa_digits($g['text']);
    }
    return $out;
}

/** یک جمله‌ی خلاصه — همان «Executive Summary» */
function phoenix_dash_summary(array $s, array $health) {
    if (empty($s['rate']['value'])) {
        return 'هنوز هیچ نرخی گرفته نشده، پس قیمتِ محصولاتِ دلاری حساب نمی‌شود. اول نرخ را بگیر.';
    }
    if ($health['score'] >= 90) {
        if (empty($s['engine']['on'])) {
            return 'همه‌چیز سالم است. موتورِ قیمت خاموش است، پس قیمت‌ها همان‌اند که دستی نوشته‌ای.';
        }
        return 'همه‌چیز سالم است: نرخ تازه است، منابع جواب می‌دهند و قیمت‌ها خودکار حساب می‌شوند.';
    }
    $worst = $health['parts'];
    usort($worst, function ($a, $b) {
        return $a['delta'] <=> $b['delta'];
    });
    return 'مهم‌ترین مشکلِ الان: ' . $worst[0]['label'] . '.';
}

/* ============================================================
   فروش — خالص؛ ‎phoenix_dash_sales()‎ سفارش‌ها را جمع می‌کند
   ============================================================ */

/**
 * خلاصه‌ی فروش از سفارش‌های پرداخت‌شده.
 *
 * ⚠ روز با ساعتِ خودِ سایت (تهران) بریده می‌شود، نه UTC. بدونِ
 * ‎$offset‎ فروشِ سه و نیمِ بامداد تا نیمه‌شب «دیروز» شمرده می‌شد.
 *
 * ⚠ «هفته» هفت روزِ آخر است (امروز هم)، و روندش در برابرِ هفت روزِ
 * پیش از آن — نه «این هفته‌ی تقویمی»، که شنبه‌ها همیشه افت نشان
 * می‌داد.
 *
 * @param array[] $rows ‎{ts, total, phone, items:[{name, qty, total}]}‎
 * @param int     $offset ثانیه‌ی اختلافِ منطقه‌ی زمانیِ سایت با UTC
 */
function phoenix_sales_summary(array $rows, $now, $offset, $days = 30) {
    $days  = max(14, (int) $days);
    $dayOf = function ($ts) use ($offset) { return (int) floor(((int) $ts + (int) $offset) / 86400); };
    $today = $dayOf($now);
    $blank = function () { return array('count' => 0, 'revenue' => 0); };

    $daily = array();
    for ($i = $days - 1; $i >= 0; $i--) {
        $d = $today - $i;
        $daily[$d] = array('date' => gmdate('Y-m-d', $d * 86400), 'count' => 0, 'revenue' => 0);
    }
    $t = $blank(); $y = $blank(); $w = $blank(); $pw = $blank(); $m = $blank();
    $buyers = array();
    $top    = array();

    foreach ($rows as $r) {
        $age = $today - $dayOf($r['ts'] ?? 0);
        if ($age < 0 || $age >= $days) {
            continue;
        }
        $rev = (int) ($r['total'] ?? 0);
        $add = function (&$b) use ($rev) { $b['count']++; $b['revenue'] += $rev; };
        if ($age === 0) { $add($t); }
        if ($age === 1) { $add($y); }
        if ($age < 7) { $add($w); } elseif ($age < 14) { $add($pw); }
        $add($m);
        $daily[$today - $age]['count']++;
        $daily[$today - $age]['revenue'] += $rev;
        if (!empty($r['phone'])) {
            $buyers[(string) $r['phone']] = true;
        }
        foreach ((array) ($r['items'] ?? array()) as $it) {
            $k = (string) ($it['name'] ?? '');
            if ($k === '') {
                continue;
            }
            if (!isset($top[$k])) {
                $top[$k] = array('name' => $k, 'qty' => 0, 'revenue' => 0);
            }
            $top[$k]['qty']     += (int) ($it['qty'] ?? 0);
            $top[$k]['revenue'] += (int) ($it['total'] ?? 0);
        }
    }

    usort($top, function ($a, $b) { return $b['revenue'] <=> $a['revenue'] ?: $b['qty'] <=> $a['qty']; });
    $w['trend'] = $pw['revenue'] > 0 ? round(($w['revenue'] - $pw['revenue']) / $pw['revenue'] * 100, 1) : null;
    $m['avg']    = $m['count'] ? (int) round($m['revenue'] / $m['count']) : 0;
    $m['buyers'] = count($buyers);

    return array(
        'today'     => $t,
        'yesterday' => $y,
        'week'      => $w,
        'prev_week' => $pw,
        'month'     => $m,
        'daily'     => array_values($daily),
        'top'       => array_slice($top, 0, 5),
    );
}

/**
 * سفارش‌های پرداخت‌شده‌ی یک ماهِ اخیر → ‎phoenix_sales_summary‎.
 * دو دقیقه کش؛ هر تغییرِ وضعیتِ سفارش کش را می‌پراند.
 */
function phoenix_dash_sales() {
    if (!function_exists('wc_get_orders')) {
        return null;
    }
    $cached = get_transient('phoenix_dash_sales');
    if (is_array($cached)) {
        return $cached;
    }
    $now    = time();
    $orders = wc_get_orders(array(
        'type'      => 'shop_order',
        'status'    => array('processing', 'completed'),
        'date_paid' => '>' . ($now - 32 * DAY_IN_SECONDS),
        'limit'     => 3000,
    ));
    $rows = array();
    foreach ($orders as $o) {
        $paid = $o->get_date_paid();
        if (!$paid) {
            continue;
        }
        $items = array();
        foreach ($o->get_items() as $it) {
            $items[] = array('name' => $it->get_name(), 'qty' => (int) $it->get_quantity(), 'total' => (int) round((float) $it->get_total()));
        }
        $rows[] = array(
            'id'     => $o->get_id(),
            'number' => (string) $o->get_order_number(),
            'name'   => trim($o->get_billing_first_name() . ' ' . $o->get_billing_last_name()),
            'ts'     => $paid->getTimestamp(),
            'total'  => (int) round((float) $o->get_total()),
            'phone'  => phoenix_normalize_phone((string) $o->get_billing_phone()),
            'items'  => $items,
            'edit'   => $o->get_edit_order_url(),
        );
    }
    $offset = (int) wp_timezone()->getOffset(new DateTime('now'));
    $out    = phoenix_sales_summary($rows, $now, $offset, 30);

    usort($rows, function ($a, $b) { return $b['ts'] <=> $a['ts']; });
    $out['recent'] = array_map(function ($r) {
        return array(
            'id' => $r['id'], 'number' => $r['number'], 'name' => $r['name'], 'phone' => $r['phone'],
            'total' => $r['total'], 'paid' => gmdate('c', $r['ts']), 'edit_url' => $r['edit'],
            'items' => implode('، ', array_column($r['items'], 'name')),
        );
    }, array_slice($rows, 0, 6));
    $out['waiting'] = array('pending' => (int) wc_orders_count('pending'), 'on_hold' => (int) wc_orders_count('on-hold'));

    set_transient('phoenix_dash_sales', $out, 2 * MINUTE_IN_SECONDS);
    return $out;
}

add_action('woocommerce_order_status_changed', 'phoenix_dash_sales_flush');
function phoenix_dash_sales_flush() {
    delete_transient('phoenix_dash_sales');
}

/** سریِ نرخ برای نمودار — حداکثر ۲۰۰ نقطه */
function phoenix_dash_series($hours = 168) {
    $rows = phoenix_rate_series($hours);
    $pts  = array();
    foreach ((array) $rows as $r) {
        $pts[] = array('t' => mysql2date('c', $r->run_at, false), 'v' => (int) $r->rate);
    }
    $n = count($pts);
    if ($n <= 200) {
        return $pts;
    }
    /* ⚠ نمونه‌برداری با گامِ ثابت، ولی نقطه‌ی آخر همیشه می‌ماند —
       «نرخِ الان» مهم‌ترین نقطه‌ی نمودار است. */
    $step = $n / 200;
    $out  = array();
    for ($i = 0; $i < 199; $i++) {
        $out[] = $pts[(int) floor($i * $step)];
    }
    $out[] = $pts[$n - 1];
    return $out;
}

/* ============================================================
   مسیرها
   ============================================================ */

function phoenix_api_dashboard(WP_REST_Request $request) {
    $s      = phoenix_dash_state();
    $health = phoenix_dash_health($s);

    $recent = array();
    foreach ((array) phoenix_audit_read('', 8) as $r) {
        $recent[] = array(
            'at'      => mysql2date('c', $r->at, false),
            'kind'    => (string) $r->kind,
            'actor'   => (string) $r->actor,
            'subject' => (string) $r->subject,
            'before'  => $r->before_val === null ? null : (string) $r->before_val,
            'after'   => $r->after_val === null ? null : (string) $r->after_val,
            'note'    => $r->note === null ? '' : (string) $r->note,
        );
    }

    return phoenix_api_ok(array(
        'state'       => $s,
        'health'      => $health,
        'summary'     => phoenix_dash_summary($s, $health),
        'alerts'      => phoenix_dash_alerts_all($s),
        'suggestions' => phoenix_dash_suggestions($s),
        'series'      => phoenix_dash_series(168),
        'recent'      => $recent,
        'sales'       => phoenix_dash_sales(),
    ));
}

function phoenix_api_engine(WP_REST_Request $request) {
    $on = (bool) $request->get_param('on');
    phoenix_settings_save(array('engine_on' => $on), 'از پنل');
    if ($on) {
        phoenix_reprice_start();
    }
    return phoenix_api_dashboard($request);
}

/**
 * ⚠ قفلِ سی‌ثانیه‌ای، جدا از سقفِ کلیِ نوشتن.
 *
 * هر بارِ این دکمه چهار درخواستِ بیرونی به صرافی‌ها می‌زند.
 * چند کلیکِ پشت‌سرهم یعنی چند برابر درخواست — و بعضی صرافی‌ها
 * IPِ پرتکرار را موقتاً می‌بندند، که یعنی کرونِ ساعتِ بعد هم
 * شکست می‌خورد.
 */
function phoenix_api_rate_refresh(WP_REST_Request $request) {
    if (get_transient('phoenix_api_refresh_lock')) {
        return phoenix_api_fail('phoenix_busy', 'همین چند لحظه پیش گرفته شد. نیم دقیقه صبر کن.', 429);
    }
    set_transient('phoenix_api_refresh_lock', 1, 30);

    $r = phoenix_rate_refresh('manual');
    if (!empty($r['failed'])) {
        return phoenix_api_fail('phoenix_rate_failed', 'نرخ عوض نشد: ' . $r['why'], 502);
    }
    return phoenix_api_dashboard($request);
}

function phoenix_api_prefs(WP_REST_Request $request) {
    $theme = (string) $request->get_param('theme');
    /* ‎enum‎ در اسکیما همین را چک کرده، ولی این تابع ممکن است
       روزی از جای دیگری صدا زده شود. */
    if (!in_array($theme, array('light', 'dark', 'system'), true)) {
        return phoenix_api_fail('phoenix_bad_theme', 'حالتِ نامعتبر.');
    }
    update_user_meta(get_current_user_id(), 'phoenix_theme', $theme);
    return phoenix_api_ok(array('theme' => $theme));
}
