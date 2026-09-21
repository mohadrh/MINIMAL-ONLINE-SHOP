<?php
/**
 * تخفیف‌ها.
 *
 * ⚠ ستونِ «الان فعال؟» از خودِ موتور می‌آید، نه از تیکِ فرم.
 *
 * قاعده‌ای که تیکش روشن است ولی تاریخش نرسیده، «فعال» نیست —
 * و اگر پنل بگوید فعال است، ادمین دنبالِ باگی می‌گردد که وجود
 * ندارد. همان تابعی که سرِ محاسبه‌ی قیمت تصمیم می‌گیرد،
 * این‌جا هم صدا زده می‌شود.
 */

if (!defined('ABSPATH')) {
    exit;
}

function phoenix_page_discounts() {
    if (!current_user_can(PHOENIX_CAP)) {
        wp_die('دسترسی نداری.');
    }

    phoenix_page_open('تخفیف‌ها', 'قاعده‌های گروهی روی قیمتِ محصول می‌نشینند و در کارتِ محصول دیده می‌شوند. کدِ اختصاصی سرِ پرداخت اعمال می‌شود.');

    /* ---------- قاعده‌ی جمع‌نشدن ---------- */
    echo '<div class="phx-alert is-blue">';
    echo esc_html('اگر چند قاعده روی یک محصول بیفتند، فقط بهترینشان اعمال می‌شود — نه همه‌شان. قاعده‌ای که «روی‌هم» را تیک بزند، استثناست.');
    echo '</div>';

    phoenix_discount_list();

    phoenix_box_open('قاعده‌ی تازه');
    phoenix_discount_form(phoenix_discount_blank());
    phoenix_box_close();

    /* ---------- ویرایش ---------- */
    $edit = isset($_GET['edit']) ? sanitize_key(wp_unslash($_GET['edit'])) : '';
    if ($edit !== '') {
        foreach (phoenix_discounts_all() as $r) {
            if (isset($r['id']) && $r['id'] === $edit) {
                phoenix_box_open('ویرایشِ «' . (isset($r['title']) ? $r['title'] : $edit) . '»');
                phoenix_discount_form(array_merge(phoenix_discount_blank(), (array) $r));
                phoenix_box_close();
                break;
            }
        }
    }

    phoenix_coupon_box();

    phoenix_box_open('تاریخچه‌ی تخفیف');
    phoenix_log_table(phoenix_audit_read('discount', 30));
    phoenix_box_close();

    phoenix_page_close();
}

function phoenix_discount_list() {
    $rules = phoenix_discounts_all();
    if (!$rules) {
        echo '<p class="phx-empty">هنوز قاعده‌ای ساخته نشده.</p>';
        return;
    }

    $scopes = phoenix_discount_scopes();

    echo '<table class="widefat striped phx-table"><thead><tr>';
    echo '<th>عنوان</th><th>دامنه</th><th>مقدار</th><th>سقف</th><th>از</th><th>تا</th><th>الان فعال؟</th><th></th>';
    echo '</tr></thead><tbody>';

    foreach ($rules as $raw) {
        $r    = array_merge(phoenix_discount_blank(), (array) $raw);
        $live = phoenix_discount_live($r);

        echo '<tr>';
        echo '<td><b>' . esc_html($r['title'] !== '' ? $r['title'] : $r['id']) . '</b>'
            . (!empty($r['stack']) ? ' <span class="phx-badge is-amber">روی‌هم</span>' : '') . '</td>';

        echo '<td>' . esc_html(isset($scopes[$r['scope']]) ? $scopes[$r['scope']] : $r['scope']);
        if ($r['targets']) {
            echo '<br><small class="phx-muted">' . esc_html(phoenix_target_names($r['scope'], $r['targets'])) . '</small>';
        }
        echo '</td>';

        echo '<td>' . esc_html($r['type'] === 'percent'
            ? number_format_i18n((float) $r['value'], 1) . '٪'
            : phoenix_toman($r['value'])) . '</td>';
        echo '<td>' . esc_html($r['cap'] ? phoenix_toman($r['cap']) : '—') . '</td>';
        echo '<td>' . esc_html($r['starts'] ? wp_date('Y/m/d H:i', $r['starts']) : 'همیشه') . '</td>';
        echo '<td>' . esc_html($r['ends'] ? wp_date('Y/m/d H:i', $r['ends']) : 'بی‌پایان') . '</td>';

        echo '<td>';
        if (!$r['enabled']) {
            phoenix_badge('خاموش', 'grey');
        } elseif ($live) {
            phoenix_badge('فعال', 'green');
        } elseif ($r['starts'] && time() < $r['starts']) {
            phoenix_badge('هنوز نرسیده', 'blue');
        } else {
            phoenix_badge('تمام شده', 'grey');
        }
        echo '</td>';

        echo '<td>';
        echo '<a class="button button-small" href="'
            . esc_url(add_query_arg(array('page' => 'phoenix-discounts', 'edit' => $r['id']), admin_url('admin.php')))
            . '#phx-edit">ویرایش</a> ';
        phoenix_form_open('phoenix_del_discount', 'style="display:inline"');
        echo '<input type="hidden" name="id" value="' . esc_attr($r['id']) . '">';
        echo '<button class="button-link phx-danger-link">حذف</button>';
        phoenix_form_close();
        echo '</td>';

        echo '</tr>';
    }
    echo '</tbody></table>';
}

/** نامِ دسته‌ها/تگ‌ها/محصولاتِ هدف، برای اینکه ستون فقط عدد نباشد */
function phoenix_target_names($scope, array $ids) {
    $names = array();
    foreach (array_slice($ids, 0, 6) as $id) {
        if ($scope === 'product') {
            $p = wc_get_product((int) $id);
            $names[] = $p ? $p->get_name() : '#' . (int) $id;
            continue;
        }
        $tax = $scope === 'tag' ? 'product_tag' : 'product_cat';
        $t   = get_term((int) $id, $tax);
        $names[] = ($t && !is_wp_error($t)) ? $t->name : '#' . (int) $id;
    }
    if (count($ids) > 6) {
        $names[] = '… و ' . (count($ids) - 6) . ' مورد دیگر';
    }
    return implode('، ', $names);
}

function phoenix_discount_form(array $r) {
    echo '<div id="phx-edit"></div>';
    phoenix_form_open('phoenix_save_discount');
    echo '<input type="hidden" name="id" value="' . esc_attr($r['id']) . '">';

    phoenix_field('عنوان', phoenix_input_text('title', $r['title'], 'مثلاً: جشنواره‌ی گیم'),
        'همین متن روی کارتِ محصول دیده می‌شود، پس برای مشتری بنویسش نه برای خودت.');

    phoenix_field('فعال', phoenix_checkbox('enabled', $r['enabled'], 'این قاعده کار کند'));

    phoenix_field('دامنه', phoenix_select('scope', phoenix_discount_scopes(), $r['scope']));

    /* ---------- هدف‌ها ---------- */
    echo '<div class="phx-field"><label class="phx-field__l">هدف‌ها</label><div class="phx-field__c">';
    echo '<div class="phx-targets">';

    echo '<fieldset class="phx-tg"><legend>دسته‌ها</legend>';
    phoenix_target_checks('product_cat', $r);
    echo '</fieldset>';

    echo '<fieldset class="phx-tg"><legend>تگ‌ها</legend>';
    phoenix_target_checks('product_tag', $r);
    echo '</fieldset>';

    echo '</div>';
    echo '<small class="phx-field__h">'
        . esc_html('فقط آن‌هایی شمرده می‌شوند که با دامنه‌ی انتخابی بخوانند. برای «محصولِ مشخص»، شناسه‌ها را در کادرِ پایین بنویس.')
        . '</small>';

    echo '<input type="text" class="phx-in" name="product_ids" value="'
        . esc_attr(implode(',', $r['scope'] === 'product' ? $r['targets'] : array()))
        . '" placeholder="شناسه‌ی محصول‌ها با کاما: 120,145">';
    echo '</div></div>';

    phoenix_field('نوع', phoenix_select('type', array(
        'percent' => 'درصدی',
        'amount'  => 'مبلغِ ثابت (تومان)',
    ), $r['type']));

    phoenix_field('مقدار', phoenix_input_num('value', $r['value'], '0.5', 0),
        'درصدی حداکثر ۹۰ — قاعده‌ی گروهی هیچ‌وقت نباید محصول را رایگان کند.');

    phoenix_field('سقفِ تخفیف', phoenix_input_num('cap', $r['cap'], '10000', 0),
        'تومان، فقط برای درصدی. «۲۰٪ ولی حداکثر ۵۰۰ هزار». صفر یعنی بی‌سقف.');

    phoenix_field('از', phoenix_input_when('starts', $r['starts']), 'خالی یعنی همین حالا.');
    phoenix_field('تا', phoenix_input_when('ends', $r['ends']), 'خالی یعنی بی‌پایان — که معمولاً منظورت نیست.');

    phoenix_field('اولویت', phoenix_input_num('priority', $r['priority'], '1', 0, 1000),
        'فقط برای قاعده‌های «روی‌هم»؛ کوچک‌تر زودتر اعمال می‌شود.');

    phoenix_field('روی‌هم', phoenix_checkbox('stack', $r['stack'], 'با تخفیف‌های دیگر جمع شود'),
        'پیش‌فرض خاموش است. روشن کردنش یعنی این تخفیف روی بهترین تخفیفِ دیگر هم سوار می‌شود.');

    phoenix_submit('ذخیره‌ی قاعده');
    phoenix_form_close();
}

function phoenix_target_checks($taxonomy, array $r) {
    $terms = get_terms(array('taxonomy' => $taxonomy, 'hide_empty' => false, 'number' => 100));
    if (is_wp_error($terms) || !$terms) {
        echo '<p class="phx-muted">هیچ موردی نیست.</p>';
        return;
    }
    $on = ($r['scope'] === 'category' && $taxonomy === 'product_cat')
        || ($r['scope'] === 'tag' && $taxonomy === 'product_tag');

    foreach ($terms as $t) {
        $checked = $on && in_array((int) $t->term_id, $r['targets'], true);
        echo '<label class="phx-check"><input type="checkbox" name="targets[]" value="'
            . esc_attr((int) $t->term_id) . '"' . checked($checked, true, false) . '> '
            . esc_html($t->name) . '</label>';
    }
}

function phoenix_coupon_box() {
    phoenix_box_open(
        'کدِ اختصاصی برای یک نفر',
        'کوپنِ خودِ ووکامرس با سقفِ یک‌بار مصرف. سرِ پرداخت وارد می‌شود، نه روی کارتِ محصول.'
    );

    phoenix_form_open('phoenix_make_coupon');
    phoenix_field('کد', phoenix_input_text('code', '', 'PHX-XYZ123'), 'همین را برای مشتری می‌فرستی.');
    phoenix_field('نوع', phoenix_select('ctype', array('percent' => 'درصدی', 'amount' => 'مبلغِ ثابت'), 'percent'));
    phoenix_field('مقدار', phoenix_input_num('cvalue', '', '1', 0));
    phoenix_field('قفل روی ایمیل', '<input type="email" name="cemail" class="phx-in" placeholder="you@mail.com">',
        'خالی هم می‌شود گذاشت؛ آن‌وقت هرکس زودتر استفاده کند مالِ اوست.');
    phoenix_field('انقضا', phoenix_input_when('cexpires', 0));
    phoenix_submit('ساختِ کد');
    phoenix_form_close();

    phoenix_box_close();
}
