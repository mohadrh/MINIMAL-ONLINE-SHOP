<?php
/**
 * صفحه‌ی نرخ.
 *
 * ⚠ ستونِ «چرا» مهم‌ترین ستونِ این جدول است.
 *
 * دیدنِ اینکه نرخ چند شد، کافی نیست. سوالی که واقعاً پرسیده
 * می‌شود این است: «چرا این عدد و نه آن یکی؟» — و بدونِ جواب،
 * ادمین به عددی که نمی‌فهمدش اعتماد نمی‌کند و می‌رود سراغِ
 * نرخِ دستی. پس هر ردیف می‌گوید چه شد: جواب داد، دیر کرد،
 * پرت بود، یا برنده شد.
 */

if (!defined('ABSPATH')) {
    exit;
}

function phoenix_page_rate() {
    if (!current_user_can(PHOENIX_CAP)) {
        wp_die('دسترسی نداری.');
    }

    $s       = phoenix_settings();
    $rate    = phoenix_rate_current();
    $health  = phoenix_rate_source_health();
    $sources = phoenix_rate_sources();
    $flags   = (array) $s['sources'];

    phoenix_page_open('نرخ تتر', 'از چند صرافی خوانده می‌شود، عددهای پرت کنار می‌روند، و از سالم‌ها یکی انتخاب می‌شود.');

    /* ---------- وضعیتِ الان ---------- */
    echo '<div class="phx-stats">';
    phoenix_stat('نرخِ جاری', empty($rate['rate']) ? '—' : number_format_i18n((int) $rate['rate']) . ' ت',
        empty($rate['rate']) ? 'red' : (!empty($rate['stale']) ? 'amber' : 'green'));
    phoenix_stat('منبعِ برنده', isset($rate['source']) && $rate['source'] !== '' ? $rate['source'] : '—', 'grey');
    phoenix_stat('آخرین به‌روزرسانی', phoenix_ago_iso(isset($rate['at']) ? $rate['at'] : null), 'grey');
    echo '</div>';

    if (!empty($rate['why'])) {
        echo '<p class="phx-why">' . esc_html($rate['why']) . '</p>';
    }

    /* ---------- دکمه‌ی دستی ---------- */
    phoenix_form_open('phoenix_refresh_rate');
    phoenix_submit('همین حالا دوباره بگیر');
    phoenix_form_close();

    /* ---------- جدولِ منابع ---------- */
    phoenix_box_open('منابع', 'تیکِ هر منبع را که برداری، دیگر خوانده نمی‌شود.');

    phoenix_form_open('phoenix_save_rate');

    echo '<table class="widefat striped phx-table"><thead><tr>';
    echo '<th>روشن</th><th>منبع</th><th>آخرین عدد</th><th>واحدِ منبع</th><th>سرعت</th><th>وضعیت</th><th>کِی</th><th>چرا</th>';
    echo '</tr></thead><tbody>';

    foreach ($sources as $slug => $src) {
        $h  = isset($health[$slug]) ? $health[$slug] : null;
        $on = !array_key_exists($slug, $flags) || $flags[$slug];

        echo '<tr>';
        echo '<td><input type="checkbox" name="src[' . esc_attr($slug) . ']" value="1"' . checked($on, true, false) . '></td>';
        echo '<td><b>' . esc_html($src['label']) . '</b><br><code class="phx-url">' . esc_html($src['url']) . '</code></td>';
        echo '<td>' . ($h && $h->rate ? esc_html(number_format_i18n((int) $h->rate)) : '—') . '</td>';
        echo '<td>' . esc_html($src['unit'] === 'rial' ? 'ریال' : 'تومان') . '</td>';
        echo '<td>' . ($h && $h->ms ? esc_html(number_format_i18n((int) $h->ms)) . ' ms' : '—') . '</td>';

        echo '<td>';
        if (!$h) {
            phoenix_badge('هنوز خوانده نشده', 'grey');
        } elseif ($h->status === 'ok') {
            phoenix_badge($h->chosen ? 'برنده' : 'سالم', $h->chosen ? 'blue' : 'green');
        } elseif ($h->status === 'outlier') {
            phoenix_badge('پرت', 'amber');
        } else {
            phoenix_badge($h->status, 'red');
        }
        echo '</td>';

        echo '<td>' . esc_html($h ? phoenix_ago($h->run_at) : '—') . '</td>';
        echo '<td class="phx-note">' . esc_html($h && $h->note ? $h->note : '—') . '</td>';
        echo '</tr>';
    }
    echo '</tbody></table>';

    /* ---------- تصمیم‌گیری ---------- */
    echo '<h3 class="phx-h3">چطور انتخاب شود</h3>';

    phoenix_field('روشِ انتخاب', phoenix_select('pick', array(
        'lowest'  => 'کمترین — ارزان‌ترین قیمتِ فروش',
        'median'  => 'میانه — مقاوم‌ترین در برابرِ عددِ خراب',
        'average' => 'میانگین',
    ), $s['pick']), 'کمترین خواسته‌ی کارفرماست؛ میانه امن‌تر است چون یک منبعِ خراب رویش اثر ندارد.');

    phoenix_field('حداقل منبعِ سالم', phoenix_input_num('min_sources', $s['min_sources'], '1', 1, 10),
        'کمتر از این تعداد، نرخ اصلاً عوض نمی‌شود. با یک منبع نمی‌شود فهمید عددش درست است یا نه.');

    phoenix_field('فاصله‌ی مجاز از میانه', phoenix_input_num('spread_max', $s['spread_max'], '1', 1, 90),
        'درصد. عددی که بیش از این با میانه فرق داشته باشد، پرت حساب می‌شود و کنار می‌رود.');

    phoenix_field('عمرِ کش', phoenix_input_num('rate_ttl', $s['rate_ttl'], '60', 60, 86400),
        'ثانیه. در این مدت به صرافی‌ها درخواست نمی‌رود.');

    echo '<h3 class="phx-h3">بازه‌ی معقول</h3>';
    echo '<p class="phx-box__note">عددِ بیرونِ این بازه بی‌چون‌وچرا رد می‌شود — دفاعِ آخر در برابرِ منبعی که ساختارِ پاسخش عوض شده.</p>';
    phoenix_field('کف', phoenix_input_num('sane_min', $s['sane_min'], '1000', 1000), 'تومان');
    phoenix_field('سقف', phoenix_input_num('sane_max', $s['sane_max'], '1000', 2000), 'تومان');

    echo '<h3 class="phx-h3">نرخِ دستی</h3>';
    echo '<p class="phx-box__note">پر که باشد، همه‌ی منابع نادیده گرفته می‌شوند. برای روزی که صرافی‌ها بخوابند یا عددشان بی‌ربط باشد.</p>';
    phoenix_field('نرخِ دستی', phoenix_input_num('manual_rate', $s['manual_rate'], '1000', 0), 'تومان. صفر یعنی خاموش.');
    phoenix_field('تا کِی', phoenix_input_when('manual_until', $s['manual_until']),
        'خالی یعنی تا وقتی خودت برداری — و آن وقت یادت می‌رود.');

    phoenix_submit('ذخیره‌ی تنظیماتِ نرخ');
    phoenix_form_close();
    phoenix_box_close();

    /* ---------- نمودار ---------- */
    phoenix_box_open('نرخ در هفت روزِ گذشته');
    phoenix_sparkline(phoenix_rate_series(168));
    phoenix_box_close();

    phoenix_box_open('تاریخچه‌ی نرخ');
    phoenix_log_table(phoenix_audit_read('rate', 30));
    phoenix_box_close();

    phoenix_page_close();
}
