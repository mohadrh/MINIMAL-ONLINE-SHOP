<?php
/**
 * نرخِ تتر — جمع‌آوری، انتخاب، کش، اندپوینت.
 *
 * ============================================================
 * ⚠ چرا از سرور و نه مستقیم از مرورگر
 *
 *   ۱ کلیدِ API. کلیدی که در جاوااسکریپتِ صفحه باشد، کلیدِ
 *     عمومی است. هر کسی برمی‌داردش و سهمیه‌ی ما را خرج می‌کند.
 *   ۲ CORS. بیشترِ صرافی‌ها از مرورگر جواب نمی‌دهند.
 *   ۳ حجمِ درخواست. هر بازدیدکننده یک درخواست یعنی سهمیه‌ی
 *     روزانه تا ظهر تمام است. این‌جا کش می‌شود، پس هر ده دقیقه
 *     یک درخواست می‌رود بیرون — نه هر بازدید.
 *
 * ⚠ و یک قاعده که هیچ‌وقت شکسته نمی‌شود:
 *
 *   نرخِ ناموفق، نرخِ صفر نیست.
 *
 * اگر همه‌ی منابع بخوابند، نرخِ آخرین بارِ موفق می‌ماند و
 * «کهنه» علامت می‌خورد. قیمتِ کمی قدیمی از قیمتِ نداشتن بهتر
 * است، و از قیمتِ صفر بی‌نهایت بهتر.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_RATE_CACHE = 'phoenix_usd_rate';
const PHOENIX_RATE_LAST  = 'phoenix_usd_rate_last';

/* ============================================================
   ۱ به‌روزرسانی
   ============================================================ */

/**
 * یک دورِ کامل: همه‌ی منابع، فیلتر، انتخاب، ثبت.
 *
 * @param string $trigger cron | manual | checkout | miss
 * @return array نتیجه‌ی کامل، برای پنل و لاگ
 */
function phoenix_rate_refresh($trigger = 'cron') {
    $settings = phoenix_settings();

    /* ---------- نرخِ دستی، اگر هست و منقضی نشده ---------- */
    $manual = phoenix_rate_manual();
    if ($manual !== null) {
        $out = array(
            'rate'    => $manual,
            'at'      => gmdate('c'),
            'stale'   => false,
            'source'  => 'manual',
            'why'     => 'نرخِ دستی فعال است؛ منابع نادیده گرفته شدند.',
            'rows'    => array(),
            'trigger' => $trigger,
        );
        phoenix_rate_store($out);
        return $out;
    }

    /* ---------- گرفتنِ همه‌ی منابع ---------- */
    $sources = phoenix_rate_sources_enabled();
    $rows    = array();
    $run_at  = current_time('mysql', true);

    foreach ($sources as $slug => $src) {
        $r = phoenix_rate_fetch_one($slug, $src);
        $rows[$slug] = array(
            'slug'   => $slug,
            'label'  => $src['label'],
            'rate'   => $r['rate'],
            'ms'     => $r['ms'],
            'status' => $r['status'],
            'note'   => $r['note'],
            'chosen' => false,
            'kept'   => $r['rate'] !== null,
        );
    }

    /* ---------- کنار گذاشتنِ عددهای پرت ---------- */
    $rows = phoenix_rate_reject_outliers($rows);

    $good = array();
    foreach ($rows as $slug => $row) {
        if ($row['kept'] && $row['rate'] !== null) {
            $good[$slug] = (int) $row['rate'];
        }
    }

    /* ---------- تصمیم ---------- */
    $min_sources = max(1, (int) $settings['min_sources']);
    $previous    = phoenix_rate_last();

    if (count($good) < $min_sources) {
        /**
         * ⚠ با یک منبع تصمیم نمی‌گیریم.
         *
         * حرفِ یک منبع را نمی‌شود راستی‌آزمایی کرد. اگر همان
         * یکی خراب باشد، هیچ چیزی جلویش را نمی‌گیرد و قیمتِ کلِ
         * فروشگاه با عددِ خراب نوشته می‌شود. نرخِ قبلی می‌ماند
         * و هشدار ثبت می‌شود.
         */
        phoenix_rate_log_rows($run_at, $rows);
        phoenix_audit(
            'rate',
            'refresh',
            $previous ? $previous['rate'] : null,
            $previous ? $previous['rate'] : null,
            sprintf('فقط %d منبع سالم بود (حداقل %d لازم است) — نرخ عوض نشد.', count($good), $min_sources)
        );

        $out = $previous ? $previous : array('rate' => null, 'at' => null);
        $out['stale']   = true;
        $out['why']     = sprintf('فقط %d منبعِ سالم؛ حداقل %d لازم است.', count($good), $min_sources);
        $out['rows']    = array_values($rows);
        $out['trigger'] = $trigger;
        $out['failed']  = true;
        return $out;
    }

    $pick   = isset($settings['pick']) ? $settings['pick'] : 'lowest';
    $chosen = phoenix_rate_pick($good, $pick);

    /* کدام منبع برنده شد */
    $winner = '';
    foreach ($good as $slug => $val) {
        if ($val === $chosen['rate']) {
            $winner = $slug;
            break;
        }
    }
    if ($winner !== '' && isset($rows[$winner])) {
        $rows[$winner]['chosen'] = true;
    }

    phoenix_rate_log_rows($run_at, $rows);

    $out = array(
        'rate'    => $chosen['rate'],
        'at'      => gmdate('c'),
        'stale'   => false,
        'source'  => $winner !== '' ? $winner : $pick,
        'why'     => $chosen['why'],
        'rows'    => array_values($rows),
        'trigger' => $trigger,
    );

    if (!$previous || (int) $previous['rate'] !== (int) $chosen['rate']) {
        phoenix_audit(
            'rate',
            'refresh',
            $previous ? $previous['rate'] : null,
            $chosen['rate'],
            $chosen['why'] . ' — ' . $trigger
        );
    }

    phoenix_rate_store($out);

    /**
     * ⚠ نرخ که عوض شد، قیمت‌ها خودکار بازنویسی نمی‌شوند.
     *
     * نوشتنِ قیمتِ چندصد محصول کارِ سنگینی است و نباید وسطِ
     * یک درخواستِ HTTP انجام شود. یک رویدادِ جدا صدا زده
     * می‌شود که خودش دسته‌دسته پیش می‌رود.
     */
    if (phoenix_setting('engine_on')) {
        if (!wp_next_scheduled('phoenix_reprice_all')) {
            wp_schedule_single_event(time() + 30, 'phoenix_reprice_all');
        }
    }

    return $out;
}

/**
 * نرخِ دستی، اگر فعال و منقضی‌نشده باشد.
 *
 * ⚠ انقضا اجباری نیست ولی هشدارش هست.
 *
 * نرخِ دستی برای وقتی است که همه‌ی منابع بخوابند یا عددشان
 * بی‌ربط باشد. خطرش این است که یادمان برود برداریمش و
 * فروشگاه هفته‌ها با نرخِ کهنه کار کند. اگر تاریخِ انقضا
 * گذاشته شده باشد، خودش برمی‌دارد.
 */
function phoenix_rate_manual() {
    $rate  = (int) phoenix_setting('manual_rate');
    $until = (int) phoenix_setting('manual_until');

    if ($rate <= 0) {
        return null;
    }
    if ($until > 0 && time() > $until) {
        /* منقضی شد — خودکار خاموش می‌شود و در تاریخچه می‌ماند */
        phoenix_settings_save(
            array('manual_rate' => 0, 'manual_until' => 0),
            'نرخِ دستی منقضی شد و خودکار برداشته شد.'
        );
        return null;
    }
    return $rate;
}

/**
 * انداختنِ عددهای پرت.
 *
 * ⚠ بازه از *میانه‌ی همان دور* ساخته می‌شود، نه از عددِ ثابت.
 *
 * بازه‌ی ثابت با تغییرِ بازار بی‌معنا می‌شود؛ امروز نرخ
 * صدهزار است و سالِ دیگر دویست‌هزار. ولی «نباید بیش از ۲۵٪ با
 * بقیه فرق داشته باشد» همیشه معنا دارد، هر نرخی که بازار
 * داشته باشد.
 *
 * میانه است نه میانگین: با میانگین، خودِ عددِ پرت میانگین را
 * به سمتِ خودش می‌کشد و از فیلتر رد می‌شود.
 */
function phoenix_rate_reject_outliers(array $rows) {
    $values = array();
    foreach ($rows as $row) {
        if ($row['rate'] !== null) {
            $values[] = (int) $row['rate'];
        }
    }
    if (count($values) < 3) {
        /* با دو عدد میانه معنا ندارد — کدامشان پرت است؟
           هر دو می‌مانند و شرطِ «حداقل دو منبع» کارش را
           می‌کند. */
        return $rows;
    }

    sort($values);
    $n      = count($values);
    $median = ($n % 2)
        ? $values[intdiv($n, 2)]
        : (int) round(($values[$n / 2 - 1] + $values[$n / 2]) / 2);

    $spread = max(1, (float) phoenix_setting('spread_max')) / 100;
    $lo     = $median * (1 - $spread);
    $hi     = $median * (1 + $spread);

    foreach ($rows as $slug => $row) {
        if ($row['rate'] === null) {
            continue;
        }
        if ($row['rate'] < $lo || $row['rate'] > $hi) {
            $rows[$slug]['kept']   = false;
            $rows[$slug]['status'] = 'outlier';
            $rows[$slug]['note']   = sprintf(
                'بیش از ٪%d با میانه‌ی %s فاصله دارد',
                (int) phoenix_setting('spread_max'),
                number_format_i18n($median)
            );
        }
    }
    return $rows;
}

/** @return array{rate:int, why:string} */
function phoenix_rate_pick(array $good, $mode) {
    $values = array_values($good);
    sort($values);
    $n = count($values);

    if ($mode === 'median') {
        $rate = ($n % 2)
            ? $values[intdiv($n, 2)]
            : (int) round(($values[$n / 2 - 1] + $values[$n / 2]) / 2);
        return array('rate' => $rate, 'why' => sprintf('میانه‌ی %d منبعِ سالم', $n));
    }

    if ($mode === 'average') {
        $rate = (int) round(array_sum($values) / $n);
        return array('rate' => $rate, 'why' => sprintf('میانگینِ %d منبعِ سالم', $n));
    }

    /* پیش‌فرض و خواسته‌ی کارفرما: کمترین */
    return array(
        'rate' => $values[0],
        'why'  => sprintf(
            'کمترین از %d منبعِ سالم (بازه %s تا %s)',
            $n,
            number_format_i18n($values[0]),
            number_format_i18n($values[$n - 1])
        ),
    );
}

/* ============================================================
   ۲ ذخیره و خواندن
   ============================================================ */

function phoenix_rate_store(array $out) {
    $ttl = max(60, (int) phoenix_setting('rate_ttl'));
    set_transient(PHOENIX_RATE_CACHE, $out, $ttl);
    /* بدونِ انقضا — پشتوانه‌ی روزی که هیچ منبعی نباشد */
    update_option(PHOENIX_RATE_LAST, $out, false);
}

/** آخرین نرخِ موفق، بی‌توجه به کهنگی */
function phoenix_rate_last() {
    $last = get_option(PHOENIX_RATE_LAST);
    return (is_array($last) && !empty($last['rate'])) ? $last : null;
}

/**
 * نرخِ جاری — گران‌ترین کاری که می‌کند خواندنِ transient است.
 *
 * ⚠ این تابع هیچ‌وقت خودش شبکه نمی‌زند.
 *
 * وسوسه‌اش هست: «کش خالی است، برو بگیر». ولی این تابع سرِ
 * محاسبه‌ی قیمتِ هر محصول صدا زده می‌شود. اگر کش خالی باشد و
 * ده بازدیدکننده هم‌زمان بیایند، ده تا درخواستِ هم‌زمان به
 * چهار صرافی می‌رود و صفحه شش ثانیه طول می‌کشد.
 *
 * پس کشِ خالی یعنی «نرخِ آخر را بده و یک به‌روزرسانی برای
 * پس‌زمینه بگذار».
 */
function phoenix_rate_current() {
    $cached = get_transient(PHOENIX_RATE_CACHE);
    if (is_array($cached) && !empty($cached['rate'])) {
        return $cached;
    }

    $last = phoenix_rate_last();

    if (!wp_next_scheduled('phoenix_rate_refresh_event')) {
        wp_schedule_single_event(time() + 5, 'phoenix_rate_refresh_event', array('miss'));
    }

    if ($last) {
        $last['stale'] = true;
        return $last;
    }
    return array('rate' => null, 'at' => null, 'stale' => true, 'source' => '', 'why' => 'هنوز هیچ نرخی گرفته نشده.');
}

/** فقط عدد — برای جاهایی که آرایه لازم نیست */
function phoenix_rate_value() {
    $r = phoenix_rate_current();
    return empty($r['rate']) ? 0 : (int) $r['rate'];
}

/* ============================================================
   ۳ لاگ
   ============================================================ */

function phoenix_rate_log_rows($run_at, array $rows) {
    global $wpdb;
    $table = phoenix_table_rate_log();

    foreach ($rows as $row) {
        $wpdb->insert(
            $table,
            array(
                'run_at' => $run_at,
                'source' => substr($row['slug'], 0, 40),
                'rate'   => $row['rate'] === null ? null : (int) $row['rate'],
                'ms'     => min(65535, (int) $row['ms']),
                'status' => substr($row['status'], 0, 20),
                'chosen' => $row['chosen'] ? 1 : 0,
                'note'   => $row['note'] === '' ? null : substr($row['note'], 0, 190),
            ),
            array('%s', '%s', '%d', '%d', '%s', '%d', '%s')
        );
    }
}

/**
 * سریِ زمانیِ نرخِ انتخاب‌شده، برای نمودارِ پنل.
 *
 * @param int $hours چند ساعتِ گذشته
 */
function phoenix_rate_series($hours = 168) {
    global $wpdb;
    $table = phoenix_table_rate_log();
    $hours = max(1, min(24 * 90, (int) $hours));

    return $wpdb->get_results($wpdb->prepare(
        "SELECT run_at, rate FROM {$table}
          WHERE chosen = 1 AND rate IS NOT NULL
            AND run_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL %d HOUR)
          ORDER BY run_at ASC",
        $hours
    ));
}

/** آخرین وضعیتِ هر منبع — برای جدولِ سلامتِ پنل */
function phoenix_rate_source_health() {
    global $wpdb;
    $table = phoenix_table_rate_log();

    /* ⚠ نامِ جدول داخلِ رشته است ولی از ورودی نمی‌آید
       (phoenix_table_rate_log هیچ آرگومانی نمی‌گیرد). */
    $rows = $wpdb->get_results(
        "SELECT r.source, r.rate, r.ms, r.status, r.note, r.run_at, r.chosen
           FROM {$table} r
           INNER JOIN (
             SELECT source, MAX(id) AS max_id FROM {$table} GROUP BY source
           ) last ON last.max_id = r.id"
    );

    $out = array();
    foreach ((array) $rows as $row) {
        $out[$row->source] = $row;
    }
    return $out;
}

/* ============================================================
   ۴ زمان‌بندی
   ============================================================ */

add_action('phoenix_rate_refresh_event', 'phoenix_rate_refresh_cb', 10, 1);
function phoenix_rate_refresh_cb($trigger = 'cron') {
    phoenix_rate_refresh(is_string($trigger) ? $trigger : 'cron');
}

/**
 * ⚠ کرونِ وردپرس با بازدید اجرا می‌شود، نه با ساعت.
 *
 * روی سایتِ کم‌بازدید ممکن است ساعت‌ها دیر شود. راهِ درستش
 * کرونِ واقعیِ سرور است:
 *
 *   * * * * * curl -s https://SITE/wp-cron.php?doing_wp_cron >/dev/null
 *
 * و در wp-config: ‎define('DISABLE_WP_CRON', true);‎
 * این در docs/BACKEND.md هم نوشته شده.
 */
add_action('init', 'phoenix_rate_schedule');
function phoenix_rate_schedule() {
    if (!wp_next_scheduled('phoenix_rate_hourly')) {
        wp_schedule_event(time() + 60, 'hourly', 'phoenix_rate_hourly');
    }
    if (!wp_next_scheduled('phoenix_daily')) {
        wp_schedule_event(time() + 300, 'daily', 'phoenix_daily');
    }

    /* ⚠ تیکِ تحویل فقط وقتی خودکار روشن است زمان‌بندی می‌شود —
       و وقتی خاموش شد، برداشته می‌شود.

       اول اصلاً زمان‌بندی نمی‌شد و این یک باگِ خاموش بود: هر
       کس روزی ‎auto_fulfil‎ را روشن می‌کرد، هیچ اتفاقی
       نمی‌افتاد و دنبالِ ایراد در جای اشتباه می‌گشت. */
    $on = (bool) phoenix_setting('auto_fulfil');
    $ts = wp_next_scheduled('phoenix_fulfil_tick');

    if ($on && !$ts) {
        wp_schedule_event(time() + 60, 'phoenix_five_min', 'phoenix_fulfil_tick');
    } elseif (!$on && $ts) {
        wp_unschedule_event($ts, 'phoenix_fulfil_tick');
    }
}

add_filter('cron_schedules', 'phoenix_cron_schedules');
function phoenix_cron_schedules($schedules) {
    $schedules['phoenix_five_min'] = array(
        'interval' => 5 * MINUTE_IN_SECONDS,
        'display'  => 'هر پنج دقیقه (فونیکس)',
    );
    return $schedules;
}

add_action('phoenix_rate_hourly', 'phoenix_rate_hourly_cb');
function phoenix_rate_hourly_cb() {
    phoenix_rate_refresh('cron');
}

/**
 * سرِ هر سفارش — ولی فقط اگر نرخ کهنه باشد.
 *
 * ⚠ سفارش نباید منتظرِ شبکه بماند.
 *
 * چهار صرافی با تایم‌اوتِ شش ثانیه یعنی تا شش ثانیه تأخیر در
 * ثبتِ سفارشِ مشتری — درست همان لحظه‌ای که نباید چیزی کند
 * باشد. پس این‌جا فقط یک رویدادِ فوری زمان‌بندی می‌شود و خودِ
 * سفارش بی‌معطلی جلو می‌رود.
 *
 * و قیمتِ همین سفارش هم دیگر تکان نمی‌خورد: ووکامرس مبلغِ هر
 * ردیف را سرِ ساختِ سفارش ذخیره می‌کند. نرخِ تازه روی
 * سفارش‌های بعدی اثر دارد، نه این یکی.
 */
add_action('woocommerce_checkout_order_processed', 'phoenix_rate_after_order', 20, 1);
add_action('woocommerce_store_api_checkout_order_processed', 'phoenix_rate_after_order', 20, 1);
function phoenix_rate_after_order($order_id) {
    $cur = get_transient(PHOENIX_RATE_CACHE);
    if (is_array($cur) && !empty($cur['rate'])) {
        return; // تازه است
    }
    if (!wp_next_scheduled('phoenix_rate_refresh_event')) {
        wp_schedule_single_event(time() + 5, 'phoenix_rate_refresh_event', array('checkout'));
    }
}

/* ============================================================
   ۵ اندپوینتِ عمومی
   ============================================================ */

add_action('rest_api_init', 'phoenix_rate_routes');
function phoenix_rate_routes() {
    register_rest_route('phoenix/v1', '/rate', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'phoenix_rate_get',
        'permission_callback' => '__return_true', // عمومی و فقط‌خواندنی
    ));
}

/**
 * ⚠ پاسخ عمداً کم‌جزئیات است.
 *
 * پنل جدولِ کاملِ منابع را می‌بیند؛ اندپوینتِ عمومی نه. اینکه
 * از کدام صرافی می‌خوانیم، کدامشان خواب است و چقدر طول
 * می‌کشد، اطلاعاتِ داخلیِ ماست. برای سایت فقط عدد و زمانش
 * لازم است.
 */
function phoenix_rate_get() {
    $r = phoenix_rate_current();

    return rest_ensure_response(array(
        'rate'  => isset($r['rate']) ? $r['rate'] : null,
        'at'    => isset($r['at']) ? $r['at'] : null,
        'stale' => !empty($r['stale']),
    ));
}
