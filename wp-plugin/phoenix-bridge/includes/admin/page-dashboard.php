<?php
/**
 * داشبورد — یک نگاه، کلِ وضعیت.
 *
 * ⚠ هرچه این‌جاست باید *قابلِ کنش* باشد.
 *
 * داشبوردی که فقط عدد نشان می‌دهد، بعد از هفته‌ی اول دیگر باز
 * نمی‌شود. پس هر بلوکِ این صفحه یا هشداری است که کاری می‌طلبد،
 * یا دکمه‌ای که همان‌جا کار را انجام می‌دهد.
 */

if (!defined('ABSPATH')) {
    exit;
}

function phoenix_page_dashboard() {
    if (!current_user_can(PHOENIX_CAP)) {
        wp_die('دسترسی نداری.');
    }

    $rate   = phoenix_rate_current();
    $on     = (bool) phoenix_setting('engine_on');
    $health = phoenix_rate_source_health();

    phoenix_page_open('فونیکس — داشبورد', 'وضعیتِ موتورِ قیمت، نرخ، تخفیف‌ها و صفِ تحویل.');

    /* ---------- هشدارها ---------- */
    phoenix_dashboard_alerts($rate, $on, $health);

    /* ---------- کلیدِ اصلی ---------- */
    phoenix_box_open(
        'موتورِ قیمت',
        'وقتی روشن باشد، قیمتِ محصولاتی که قیمتِ تمام‌شده دارند خودکار نوشته می‌شود. خاموش که باشد، هیچ قیمتی دست نمی‌خورد.'
    );
    phoenix_form_open('phoenix_save_engine');
    echo '<div class="phx-switch">';
    echo phoenix_checkbox('engine_on', $on, 'موتورِ قیمت روشن باشد');
    echo '</div>';
    phoenix_submit($on ? 'ذخیره' : 'روشن کن و قیمت‌ها را بنویس');
    phoenix_form_close();

    $state = get_option('phoenix_reprice_state');
    if (is_array($state)) {
        echo '<p class="phx-running">بازنویسی در حال اجراست — تا اینجا '
            . esc_html(number_format_i18n((int) $state['offset'])) . ' مورد بررسی شده.</p>';
    } else {
        $last = get_option('phoenix_reprice_last');
        if (is_array($last)) {
            echo '<p class="phx-muted">آخرین بازنویسیِ کامل: ' . esc_html(phoenix_ago($last['at']))
                . ' — ' . esc_html(number_format_i18n((int) $last['scanned'])) . ' مورد.</p>';
        }
    }
    phoenix_box_close();

    /* ---------- آمار ---------- */
    echo '<div class="phx-stats">';

    phoenix_stat(
        'نرخِ جاری',
        empty($rate['rate']) ? '—' : number_format_i18n((int) $rate['rate']) . ' ت',
        empty($rate['rate']) ? 'red' : (!empty($rate['stale']) ? 'amber' : 'green'),
        empty($rate['rate']) ? 'هیچ نرخی گرفته نشده' : (!empty($rate['stale']) ? 'کهنه' : phoenix_ago_iso($rate['at']))
    );

    $ok = 0;
    foreach ($health as $h) {
        if ($h->status === 'ok') {
            $ok++;
        }
    }
    phoenix_stat('منابعِ سالم', $ok . ' از ' . count($health),
        $ok >= (int) phoenix_setting('min_sources') ? 'green' : 'red');

    phoenix_stat('موتور', $on ? 'روشن' : 'خاموش', $on ? 'green' : 'grey');

    $live = 0;
    foreach (phoenix_discounts_all() as $r) {
        if (phoenix_discount_live(array_merge(phoenix_discount_blank(), (array) $r))) {
            $live++;
        }
    }
    phoenix_stat('تخفیفِ فعال', number_format_i18n($live), $live ? 'blue' : 'grey');

    $q = phoenix_queue_counts();
    phoenix_stat('صفِ تحویل', number_format_i18n($q['pending']) . ' منتظر',
        $q['failed'] > 0 ? 'red' : ($q['pending'] > 0 ? 'amber' : 'green'),
        $q['failed'] > 0 ? $q['failed'] . ' ناموفق' : '');

    phoenix_stat('محصولِ دستِ موتور', number_format_i18n(phoenix_engine_product_count()), 'grey',
        'بقیه دستی‌اند و دست نمی‌خورند');

    echo '</div>';

    /* ---------- نرخ در هفت روز ---------- */
    phoenix_box_open('نرخ در هفت روزِ گذشته');
    phoenix_sparkline(phoenix_rate_series(168));
    echo '<p><a class="button" href="' . esc_url(admin_url('admin.php?page=phoenix-rate')) . '">مدیریتِ نرخ و منابع</a></p>';
    phoenix_box_close();

    /* ---------- آخرین رویدادها ---------- */
    phoenix_box_open('آخرین اتفاق‌ها');
    phoenix_log_table(phoenix_audit_read('', 12));
    echo '<p><a class="button" href="' . esc_url(admin_url('admin.php?page=phoenix-log')) . '">تاریخچه‌ی کامل</a></p>';
    phoenix_box_close();

    phoenix_page_close();
}

/**
 * ⚠ هشدار فقط وقتی که واقعاً کاری لازم است.
 *
 * پنلی که همیشه یک نوارِ زرد دارد، همان نوار را نامرئی
 * می‌کند. پس هر کدامِ این‌ها شرطِ واقعی دارد و در حالتِ سالم
 * هیچ‌کدام دیده نمی‌شوند.
 */
function phoenix_dashboard_alerts($rate, $engine_on, array $health) {
    $alerts = array();

    if (empty($rate['rate'])) {
        $alerts[] = array('red', 'هیچ نرخی گرفته نشده. تا نرخ نیاید، قیمتِ دلاری محاسبه نمی‌شود.');
    } elseif (!empty($rate['stale'])) {
        $alerts[] = array('amber', 'نرخ کهنه است — آخرین به‌روزرسانیِ موفق ' . phoenix_ago_iso($rate['at']) . '.');
    }

    if ((int) phoenix_setting('manual_rate') > 0) {
        $until = (int) phoenix_setting('manual_until');
        $alerts[] = array('amber', 'نرخِ دستی فعال است و همه‌ی منابع نادیده گرفته می‌شوند'
            . ($until ? ' — تا ' . wp_date('Y/m/d H:i', $until) : ' و تاریخِ انقضا ندارد') . '.');
    }

    $dead = array();
    foreach ($health as $slug => $h) {
        if ($h->status !== 'ok') {
            $dead[] = $slug;
        }
    }
    if ($dead) {
        $alerts[] = array('amber', 'این منابع آخرین بار جواب ندادند: ' . implode('، ', $dead) . '.');
    }

    if (!$engine_on) {
        $alerts[] = array('grey', 'موتورِ قیمت خاموش است — هیچ قیمتی خودکار نوشته نمی‌شود.');
    }

    $q = phoenix_queue_counts();
    if ($q['failed'] > 0) {
        $alerts[] = array('red', $q['failed'] . ' کارِ تحویل ناموفق مانده و منتظرِ رسیدگی است.');
    }

    if (!$alerts) {
        return;
    }

    echo '<div class="phx-alerts">';
    foreach ($alerts as $a) {
        echo '<div class="phx-alert is-' . esc_attr($a[0]) . '">' . esc_html($a[1]) . '</div>';
    }
    echo '</div>';
}

/** چند محصول قیمتِ تمام‌شده دارند و دستِ موتورند */
function phoenix_engine_product_count() {
    global $wpdb;

    /* ⚠ شمارش از روی متا، نه با پیمودنِ همه‌ی محصولات.
       هزار ‎phoenix_cost_of‎ روی هر بارگذاریِ داشبورد یعنی
       هزار ‎get_post_meta‎. این پرس‌وجو یک بار می‌دود. */
    $key = PHOENIX_META_KEY;
    return (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(DISTINCT pm.post_id)
           FROM {$wpdb->postmeta} pm
           INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
          WHERE pm.meta_key = %s
            AND p.post_status IN ('publish','private')
            AND (pm.meta_value LIKE %s OR pm.meta_value LIKE %s)",
        $key,
        '%' . $wpdb->esc_like('"usd"') . '%',
        '%' . $wpdb->esc_like('"cost_toman"') . '%'
    ));
}

/** جدولِ رویدادها — هم در داشبورد هم در صفحه‌ی تاریخچه */
function phoenix_log_table($rows) {
    if (!$rows) {
        echo '<p class="phx-empty">هنوز چیزی ثبت نشده.</p>';
        return;
    }

    $labels = array(
        'setting'  => 'تنظیم',
        'rate'     => 'نرخ',
        'price'    => 'قیمت',
        'discount' => 'تخفیف',
        'queue'    => 'صف',
    );

    echo '<table class="widefat striped phx-table"><thead><tr>';
    echo '<th>کِی</th><th>چه چیزی</th><th>مورد</th><th>از</th><th>به</th><th>چه کسی</th><th>توضیح</th>';
    echo '</tr></thead><tbody>';

    foreach ($rows as $r) {
        echo '<tr>';
        echo '<td title="' . esc_attr($r->at) . '">' . esc_html(phoenix_ago($r->at)) . '</td>';
        echo '<td>' . esc_html(isset($labels[$r->kind]) ? $labels[$r->kind] : $r->kind) . '</td>';
        echo '<td><code>' . esc_html(phoenix_shorten($r->subject, 40)) . '</code></td>';
        echo '<td>' . esc_html(phoenix_shorten($r->before_val, 30)) . '</td>';
        echo '<td>' . esc_html(phoenix_shorten($r->after_val, 30)) . '</td>';
        echo '<td>' . esc_html($r->actor) . '</td>';
        echo '<td>' . esc_html(phoenix_shorten($r->note, 70)) . '</td>';
        echo '</tr>';
    }
    echo '</tbody></table>';
}

function phoenix_shorten($s, $n) {
    $s = (string) $s;
    if ($s === '') {
        return '—';
    }
    return mb_strlen($s) > $n ? mb_substr($s, 0, $n) . '…' : $s;
}
