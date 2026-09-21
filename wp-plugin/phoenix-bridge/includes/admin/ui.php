<?php
/**
 * تکه‌های تکرارشونده‌ی پنل.
 *
 * ⚠ هر تابعِ این فایل خودش ‎esc_*‎ می‌زند.
 *
 * دلیلش قاعده‌ای است که رعایتش با چشم سخت است: «خروجی را
 * escape کن». وقتی هر صفحه خودش HTML می‌نویسد، یک ‎echo‎ی
 * بی‌escape لای صد خط گم می‌شود. وقتی همه از همین چند تابع
 * می‌گذرند، جای escape یک‌جاست و قابلِ بازبینی.
 */

if (!defined('ABSPATH')) {
    exit;
}

/** پوسته‌ی صفحه */
function phoenix_page_open($title, $lead = '') {
    echo '<div class="wrap phx">';
    echo '<h1 class="phx__h1">' . esc_html($title) . '</h1>';
    if ($lead !== '') {
        echo '<p class="phx__lead">' . esc_html($lead) . '</p>';
    }
}

function phoenix_page_close() {
    echo '</div>';
}

/** کارتِ آماری */
function phoenix_stat($label, $value, $tone = '', $hint = '') {
    echo '<div class="phx-stat' . ($tone ? ' is-' . esc_attr($tone) : '') . '">';
    echo '<span class="phx-stat__k">' . esc_html($label) . '</span>';
    echo '<b class="phx-stat__v">' . esc_html($value) . '</b>';
    if ($hint !== '') {
        echo '<small class="phx-stat__h">' . esc_html($hint) . '</small>';
    }
    echo '</div>';
}

/** جعبه با تیتر */
function phoenix_box_open($title, $note = '') {
    echo '<div class="phx-box">';
    echo '<h2 class="phx-box__h">' . esc_html($title) . '</h2>';
    if ($note !== '') {
        echo '<p class="phx-box__note">' . esc_html($note) . '</p>';
    }
}

function phoenix_box_close() {
    echo '</div>';
}

/** نشانِ وضعیت */
function phoenix_badge($text, $tone = 'grey') {
    $tones = array('grey', 'green', 'amber', 'red', 'blue');
    if (!in_array($tone, $tones, true)) {
        $tone = 'grey';
    }
    echo '<span class="phx-badge is-' . esc_attr($tone) . '">' . esc_html($text) . '</span>';
}

/** ردیفِ فرم */
function phoenix_field($label, $html, $hint = '') {
    echo '<div class="phx-field">';
    echo '<label class="phx-field__l">' . esc_html($label) . '</label>';
    echo '<div class="phx-field__c">' . $html; // خودِ سازنده escape کرده
    if ($hint !== '') {
        echo '<small class="phx-field__h">' . esc_html($hint) . '</small>';
    }
    echo '</div></div>';
}

/** ورودیِ عددی */
function phoenix_input_num($name, $value, $step = '1', $min = null, $max = null) {
    $attrs = '';
    if ($min !== null) {
        $attrs .= ' min="' . esc_attr($min) . '"';
    }
    if ($max !== null) {
        $attrs .= ' max="' . esc_attr($max) . '"';
    }
    return '<input type="number" name="' . esc_attr($name) . '" value="' . esc_attr($value)
        . '" step="' . esc_attr($step) . '"' . $attrs . ' class="phx-in">';
}

function phoenix_input_text($name, $value, $placeholder = '') {
    return '<input type="text" name="' . esc_attr($name) . '" value="' . esc_attr($value)
        . '" placeholder="' . esc_attr($placeholder) . '" class="phx-in">';
}

/** ‎datetime-local‎ — ورودی و خروجی هر دو محلی‌اند، ذخیره timestamp */
function phoenix_input_when($name, $ts) {
    $val = $ts ? wp_date('Y-m-d\TH:i', (int) $ts) : '';
    return '<input type="datetime-local" name="' . esc_attr($name) . '" value="' . esc_attr($val) . '" class="phx-in">';
}

function phoenix_select($name, array $options, $current) {
    $out = '<select name="' . esc_attr($name) . '" class="phx-in">';
    foreach ($options as $k => $label) {
        $out .= '<option value="' . esc_attr($k) . '"' . selected($current, $k, false) . '>'
            . esc_html($label) . '</option>';
    }
    return $out . '</select>';
}

function phoenix_checkbox($name, $on, $label) {
    return '<label class="phx-check"><input type="checkbox" name="' . esc_attr($name) . '" value="1"'
        . checked($on, true, false) . '> ' . esc_html($label) . '</label>';
}

/** شش فیلدِ یک نمایه‌ی حاشیه */
function phoenix_margin_fields(array $m, $prefix = '') {
    phoenix_field('درصد سود', phoenix_input_num($prefix . 'percent', $m['percent'], '0.1', -90, 500),
        'روی قیمتِ تمام‌شده. منفی یعنی زیرِ قیمت — فقط برای حراج.');
    phoenix_field('مبلغ ثابت', phoenix_input_num($prefix . 'fixed', $m['fixed'], '1000', 0),
        'تومان، بعد از درصد اضافه می‌شود. برای پوشاندنِ کارمزدِ درگاه.');
    phoenix_field('حداقل سود', phoenix_input_num($prefix . 'min_profit', $m['min_profit'], '1000', 0),
        'اگر درصد کمتر از این شد، همین اعمال می‌شود. برای محصولِ ارزان.');
    phoenix_field('رُند به', phoenix_input_num($prefix . 'round_to', $m['round_to'], '1000', 1),
        'قیمت به مضربِ این عدد گرد می‌شود.');
    phoenix_field('جهتِ رُند', phoenix_select($prefix . 'round_mode', array(
        'up'      => 'بالا — هیچ‌وقت زیرِ محاسبه',
        'nearest' => 'نزدیک‌ترین',
        'down'    => 'پایین — به نفعِ مشتری',
    ), $m['round_mode']));
    phoenix_field('عددِ جذاب', phoenix_input_num($prefix . 'charm', $m['charm'], '1000', 0),
        'مثلاً ۹۰۰۰ با رُندِ ۱۰۰۰۰ → ۱٬۲۳۹٬۰۰۰ به‌جای ۱٬۲۴۰٬۰۰۰. صفر یعنی خاموش.');
}

/** دکمه */
function phoenix_submit($label, $kind = 'primary') {
    $class = $kind === 'primary' ? 'button button-primary' : ($kind === 'danger' ? 'button phx-danger' : 'button');
    echo '<p class="phx-actions"><button type="submit" class="' . esc_attr($class) . '">' . esc_html($label) . '</button></p>';
}

/* ------------------------------------------------------------
   کمک‌کننده‌های نمایش
   ------------------------------------------------------------ */

function phoenix_toman($n) {
    return number_format_i18n((int) $n) . ' تومان';
}

/** «۴ دقیقه پیش» از یک رشته‌ی MySQLِ UTC */
function phoenix_ago($mysql_utc) {
    if (!$mysql_utc) {
        return '—';
    }
    $ts = strtotime($mysql_utc . ' UTC');
    if (!$ts) {
        return '—';
    }
    $diff = time() - $ts;
    if ($diff < 0) {
        return 'همین حالا';
    }
    return human_time_diff($ts, time()) . ' پیش';
}

function phoenix_ago_iso($iso) {
    if (!$iso) {
        return '—';
    }
    $ts = strtotime($iso);
    return $ts ? human_time_diff($ts, time()) . ' پیش' : '—';
}

/**
 * نمودارِ خطیِ ساده به‌صورت SVG.
 *
 * ⚠ بدونِ کتابخانه، و این عمدی است.
 *
 * یک نمودارِ خطیِ تک‌سری، صد خط کد است. آوردنِ Chart.js برای
 * همین، یعنی دویست کیلوبایت جاوااسکریپت روی پنل و یک وابستگیِ
 * تازه که باید به‌روز بماند — برای چیزی که شکلِ کلیِ نرخ را
 * نشان می‌دهد و بس.
 */
function phoenix_sparkline(array $points, $w = 760, $h = 160) {
    $vals = array();
    foreach ($points as $p) {
        $vals[] = (int) $p->rate;
    }
    if (count($vals) < 2) {
        echo '<p class="phx-empty">هنوز داده‌ی کافی برای نمودار نیست.</p>';
        return;
    }

    $min = min($vals);
    $max = max($vals);
    /* بازه‌ی صفر یعنی تقسیم بر صفر؛ و نمودارِ خطِ صاف هم باید
       وسط بنشیند نه روی لبه. */
    $span = ($max - $min) ?: 1;
    $pad  = 18;

    $n = count($vals);
    $d = '';
    foreach ($vals as $i => $v) {
        $x = $pad + ($i / ($n - 1)) * ($w - 2 * $pad);
        $y = $h - $pad - (($v - $min) / $span) * ($h - 2 * $pad);
        $d .= ($i === 0 ? 'M' : 'L') . round($x, 1) . ' ' . round($y, 1) . ' ';
    }

    echo '<svg class="phx-chart" viewBox="0 0 ' . (int) $w . ' ' . (int) $h . '" role="img" aria-label="'
        . esc_attr(sprintf('نمودار نرخ از %s تا %s تومان', number_format_i18n($min), number_format_i18n($max)))
        . '">';
    echo '<path d="' . esc_attr(trim($d)) . '" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>';
    echo '</svg>';
    echo '<p class="phx-chart__legend">کمترین ' . esc_html(number_format_i18n($min))
        . ' · بیشترین ' . esc_html(number_format_i18n($max))
        . ' · ' . esc_html(number_format_i18n($n)) . ' نقطه</p>';
}
