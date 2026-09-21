<?php
/**
 * حاشیه و قیمت.
 *
 * ⚠ پیش‌نمایشِ زنده مهم‌ترین چیزِ این صفحه است.
 *
 * «۱۸٪ سود» یک عددِ انتزاعی است؛ کسی نمی‌داند یعنی چه. ولی
 * «چت‌جی‌پی‌تی از ۱٬۷۶۶٬۰۰۰ می‌شود ۱٬۸۹۹٬۰۰۰» را می‌شود قضاوت
 * کرد. پس پیش از ذخیره، جدولِ ده محصولِ واقعی نشان می‌دهد
 * تنظیماتِ فعلی چه می‌کند.
 */

if (!defined('ABSPATH')) {
    exit;
}

function phoenix_page_margins() {
    if (!current_user_can(PHOENIX_CAP)) {
        wp_die('دسترسی نداری.');
    }

    $s = phoenix_settings();

    phoenix_page_open('حاشیه و قیمت', 'قیمتِ تمام‌شده را از فیلدهای محصول می‌گیرد و قیمتِ فروش را می‌سازد.');

    /* ---------- فرمول ---------- */
    phoenix_box_open('فرمول', 'به همین ترتیب اجرا می‌شود.');
    echo '<ol class="phx-formula">';
    echo '<li><b>پایه</b> = مبلغِ دلاری × نرخ &nbsp;<i>یا</i>&nbsp; هزینه‌ی تومانی</li>';
    echo '<li><b>سود</b> = بیشترِ ( پایه × درصد٪ ، حداقلِ سود )</li>';
    echo '<li><b>خام</b> = پایه + سود + مبلغِ ثابت</li>';
    echo '<li><b>رُند</b> به مضربِ «رُند به»، در جهتی که انتخاب شده</li>';
    echo '<li><b>عددِ جذاب</b>، اگر تنظیم شده باشد</li>';
    echo '<li><b>تخفیف</b>، بهترین قاعده‌ی فعال</li>';
    echo '<li><b>کفِ قیمت</b> — و این آخرین حرف است، حتی بر تخفیف</li>';
    echo '</ol>';
    phoenix_box_close();

    /* ---------- پیش‌فرضِ کل ---------- */
    phoenix_box_open('حاشیه‌ی پیش‌فرض', 'روی هر محصولی که حاشیه‌ی خاصِ خودش یا دسته‌اش را نداشته باشد.');
    phoenix_form_open('phoenix_save_margin');
    phoenix_margin_fields(array_merge(phoenix_margin_defaults(), (array) $s['margin']));

    echo '<h3 class="phx-h3">محافظ‌ها</h3>';
    phoenix_field('کفِ قیمت', phoenix_input_num('floor_percent', $s['floor_percent'], '1', 0, 100),
        'درصد بالاتر از قیمتِ تمام‌شده. قیمتِ نهایی — حتی بعد از تخفیف — هیچ‌وقت زیرِ این نمی‌رود. صفر یعنی فقط جلوی ضرر گرفته می‌شود.');
    phoenix_field('قفلِ قیمت در سبد', phoenix_input_num('cart_lock_min', $s['cart_lock_min'], '5', 0, 1440),
        'دقیقه. قیمتی که مشتری موقعِ افزودن دید، تا این مدت برایش می‌ماند حتی اگر نرخ بالا برود. صفر یعنی بدونِ قفل.');

    phoenix_submit('ذخیره');
    phoenix_form_close();
    phoenix_box_close();

    /* ---------- پیش‌نمایش ---------- */
    phoenix_box_open('پیش‌نمایشِ زنده', 'با تنظیماتِ همین حالا، روی ده محصولِ واقعی.');
    phoenix_price_preview();
    phoenix_box_close();

    /* ---------- دسته ---------- */
    phoenix_box_open('حاشیه به‌ازای دسته', 'فقط فیلدهایی که این‌جا پر می‌کنی جایگزین می‌شوند؛ بقیه از پیش‌فرضِ کل می‌آیند.');
    phoenix_margin_cat_table();
    phoenix_box_close();

    /* ---------- محصول ---------- */
    phoenix_box_open('حاشیه به‌ازای محصول');
    phoenix_margin_prod_table();
    phoenix_box_close();

    /* ---------- بازنویسی ---------- */
    phoenix_box_open('بازنویسیِ دستی', 'قیمتِ همه‌ی محصولات با تنظیماتِ فعلی دوباره نوشته می‌شود. دسته‌دسته جلو می‌رود.');
    phoenix_form_open('phoenix_reprice');
    phoenix_submit('بازنویسیِ همه‌ی قیمت‌ها', 'secondary');
    phoenix_form_close();
    phoenix_box_close();

    phoenix_box_open('تاریخچه‌ی قیمت');
    phoenix_log_table(phoenix_audit_read('price', 40));
    phoenix_box_close();

    phoenix_page_close();
}

/**
 * ⚠ پیش‌نمایش هیچ‌چیز نمی‌نویسد.
 *
 * ‎phoenix_compute_price‎ محاسبه‌ی خالص است و
 * ‎phoenix_apply_price‎ است که می‌نویسد. این جدایی عمدی است:
 * پیش‌نمایش باید بشود صد بار باز کرد بی‌آنکه چیزی عوض شود.
 */
function phoenix_price_preview() {
    global $wpdb;

    $key = PHOENIX_META_KEY;
    $ids = array_map('intval', (array) $wpdb->get_col($wpdb->prepare(
        "SELECT pm.post_id
           FROM {$wpdb->postmeta} pm
           INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
          WHERE pm.meta_key = %s
            AND p.post_status = 'publish'
            AND (pm.meta_value LIKE %s OR pm.meta_value LIKE %s)
          ORDER BY pm.post_id DESC
          LIMIT 10",
        $key,
        '%' . $wpdb->esc_like('"usd"') . '%',
        '%' . $wpdb->esc_like('"cost_toman"') . '%'
    )));

    if (!$ids) {
        echo '<p class="phx-empty">هیچ محصولی هنوز قیمتِ تمام‌شده ندارد. در صفحه‌ی ویرایشِ محصول، تبِ «فونیکس» را پر کن.</p>';
        return;
    }

    $rate = phoenix_rate_value();

    echo '<table class="widefat striped phx-table"><thead><tr>';
    echo '<th>محصول</th><th>تمام‌شده</th><th>پایه</th><th>سود</th><th>قیمت</th><th>تخفیف</th><th>نهایی</th><th>الان در سایت</th>';
    echo '</tr></thead><tbody>';

    foreach ($ids as $id) {
        $calc = phoenix_compute_price($id, $rate);
        $p    = wc_get_product($id);
        if (!$p) {
            continue;
        }

        echo '<tr>';
        echo '<td><a href="' . esc_url(get_edit_post_link($id)) . '">' . esc_html($p->get_name()) . '</a></td>';

        if ($calc === null) {
            echo '<td colspan="6" class="phx-muted">دستی — موتور دست نمی‌زند</td>';
            echo '<td>' . esc_html(phoenix_toman((int) $p->get_price('edit'))) . '</td>';
            echo '</tr>';
            continue;
        }

        echo '<td>' . esc_html($calc['mode'] === 'usd'
            ? '$' . rtrim(rtrim(number_format($calc['cost_usd'], 2), '0'), '.')
            : phoenix_toman($calc['base'])) . '</td>';
        echo '<td>' . esc_html(number_format_i18n($calc['base'])) . '</td>';
        echo '<td>' . esc_html(number_format_i18n($calc['profit'])) . '</td>';
        echo '<td>' . esc_html(number_format_i18n($calc['regular'])) . '</td>';
        echo '<td>';
        if ($calc['discount']) {
            echo esc_html($calc['discount']['label'] . ' · −' . number_format_i18n($calc['discount']['off']));
        } elseif (!empty($calc['blocked'])) {
            /* تخفیفی هست ولی کف نگذاشته اعمال شود — این باید
               دیده شود، وگرنه ادمین دنبالِ باگی می‌گردد که
               نیست. */
            echo '<span class="phx-badge is-red">اعمال نشد</span><br>';
            echo '<small class="phx-muted">' . esc_html($calc['blocked']['why']) . '</small>';
        } else {
            echo '—';
        }
        echo '</td>';
        echo '<td><b>' . esc_html(number_format_i18n($calc['final'])) . '</b>'
            . ($calc['floor_hit'] ? ' <span class="phx-badge is-amber">کف</span>' : '') . '</td>';
        echo '<td class="phx-muted">' . esc_html(number_format_i18n((int) $p->get_price('edit'))) . '</td>';
        echo '</tr>';
    }
    echo '</tbody></table>';

    if ($rate <= 0) {
        echo '<p class="phx-alert is-amber">نرخ در دسترس نیست، پس ردیف‌های دلاری محاسبه نشدند.</p>';
    }
}

function phoenix_margin_cat_table() {
    $saved = (array) phoenix_setting('margin_by_cat', array());
    $terms = get_terms(array('taxonomy' => 'product_cat', 'hide_empty' => false));

    if (is_wp_error($terms) || !$terms) {
        echo '<p class="phx-empty">هنوز دسته‌ای ساخته نشده.</p>';
        return;
    }

    if ($saved) {
        echo '<table class="widefat striped phx-table"><thead><tr>';
        echo '<th>دسته</th><th>درصد</th><th>ثابت</th><th>حداقل سود</th><th>رُند</th><th></th>';
        echo '</tr></thead><tbody>';
        foreach ($saved as $tid => $m) {
            $t = get_term((int) $tid, 'product_cat');
            if (!$t || is_wp_error($t)) {
                continue;
            }
            $m = phoenix_margin_sanitize((array) $m);
            echo '<tr>';
            echo '<td><b>' . esc_html($t->name) . '</b></td>';
            echo '<td>' . esc_html(number_format_i18n($m['percent'], 1)) . '٪</td>';
            echo '<td>' . esc_html(number_format_i18n($m['fixed'])) . '</td>';
            echo '<td>' . esc_html(number_format_i18n($m['min_profit'])) . '</td>';
            echo '<td>' . esc_html(number_format_i18n($m['round_to'])) . '</td>';
            echo '<td>';
            phoenix_form_open('phoenix_save_cat', 'style="display:inline"');
            echo '<input type="hidden" name="term_id" value="' . esc_attr((int) $tid) . '">';
            echo '<input type="hidden" name="remove" value="1">';
            echo '<button class="button-link phx-danger-link">برداشتن</button>';
            phoenix_form_close();
            echo '</td></tr>';
        }
        echo '</tbody></table>';
    }

    $options = array(0 => '— دسته را انتخاب کن —');
    foreach ($terms as $t) {
        $options[$t->term_id] = $t->name;
    }

    echo '<h3 class="phx-h3">افزودن یا ویرایش</h3>';
    phoenix_form_open('phoenix_save_cat');
    phoenix_field('دسته', phoenix_select('term_id', $options, 0));
    phoenix_margin_fields(phoenix_margin_defaults());
    phoenix_submit('ذخیره‌ی حاشیه‌ی دسته');
    phoenix_form_close();
}

function phoenix_margin_prod_table() {
    $saved = (array) phoenix_setting('margin_by_prod', array());

    if ($saved) {
        echo '<table class="widefat striped phx-table"><thead><tr>';
        echo '<th>محصول</th><th>درصد</th><th>ثابت</th><th>حداقل سود</th><th></th>';
        echo '</tr></thead><tbody>';
        foreach ($saved as $pid => $m) {
            $p = wc_get_product((int) $pid);
            $m = phoenix_margin_sanitize((array) $m);
            echo '<tr>';
            echo '<td>' . ($p
                ? '<a href="' . esc_url(get_edit_post_link((int) $pid)) . '">' . esc_html($p->get_name()) . '</a>'
                : '<span class="phx-muted">محصولِ حذف‌شده #' . esc_html((int) $pid) . '</span>') . '</td>';
            echo '<td>' . esc_html(number_format_i18n($m['percent'], 1)) . '٪</td>';
            echo '<td>' . esc_html(number_format_i18n($m['fixed'])) . '</td>';
            echo '<td>' . esc_html(number_format_i18n($m['min_profit'])) . '</td>';
            echo '<td>';
            phoenix_form_open('phoenix_save_prod', 'style="display:inline"');
            echo '<input type="hidden" name="product_id" value="' . esc_attr((int) $pid) . '">';
            echo '<input type="hidden" name="remove" value="1">';
            echo '<button class="button-link phx-danger-link">برداشتن</button>';
            phoenix_form_close();
            echo '</td></tr>';
        }
        echo '</tbody></table>';
    }

    echo '<h3 class="phx-h3">افزودن یا ویرایش</h3>';
    echo '<p class="phx-box__note">شناسه‌ی محصول را از نوارِ نشانیِ صفحه‌ی ویرایشش بردار (‎post=۱۲۳‎). برای یک محصول، ساده‌تر این است که همان‌جا در تبِ «فونیکس» تنظیمش کنی.</p>';

    phoenix_form_open('phoenix_save_prod');
    phoenix_field('شناسه‌ی محصول', phoenix_input_num('product_id', '', '1', 1));
    phoenix_margin_fields(phoenix_margin_defaults());
    phoenix_submit('ذخیره‌ی حاشیه‌ی محصول');
    phoenix_form_close();
}
