<?php
/**
 * قاعده‌های قیمت — حاشیه‌ها، تخفیف‌ها، کدهای اختصاصی.
 *
 * ⚠ هیچ قاعده‌ای بی‌پیش‌نمایش ذخیره نمی‌شود.
 *
 * «۱۸٪ سود» عددی انتزاعی است؛ «چت‌جی‌پی‌تی از ۱٬۷۶۶٬۰۰۰ می‌شود
 * ۱٬۸۹۹٬۰۰۰» را می‌شود قضاوت کرد. پس صفحه‌ی حاشیه‌ها همیشه
 * جدولِ محصولاتِ واقعی را کنارش دارد، و هر تخفیف می‌گوید الان
 * روی چند محصول نشسته.
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', 'phoenix_rules_routes');
function phoenix_rules_routes() {
    $margin = array(
        'percent'    => array('type' => 'number', 'minimum' => -90, 'maximum' => 500),
        'fixed'      => array('type' => 'integer', 'minimum' => 0),
        'min_profit' => array('type' => 'integer', 'minimum' => 0),
        'round_to'   => array('type' => 'integer', 'minimum' => 1, 'maximum' => 1000000),
        'round_mode' => array('type' => 'string', 'enum' => array('up', 'nearest', 'down')),
        'charm'      => array('type' => 'integer', 'minimum' => 0),
    );

    phoenix_api_route('/margins', 'GET', 'phoenix_api_margins_get');
    phoenix_api_route('/margins', 'POST', 'phoenix_api_margins_save', array(
        'margin'        => array('type' => 'object', 'required' => true, 'properties' => $margin),
        'floor_percent' => array('type' => 'integer', 'minimum' => 0, 'maximum' => 100, 'required' => true),
        'cart_lock_min' => array('type' => 'integer', 'minimum' => 0, 'maximum' => 1440, 'required' => true),
    ));
    phoenix_api_route('/margins/category', 'POST', 'phoenix_api_margins_category', array(
        'term_id' => array('type' => 'integer', 'minimum' => 1, 'required' => true),
        'margin'  => array('type' => array('object', 'null'), 'properties' => $margin),
    ));
    phoenix_api_route('/reprice', 'POST', 'phoenix_api_reprice');

    phoenix_api_route('/discounts', 'GET', 'phoenix_api_discounts_get');
    phoenix_api_route('/discounts', 'POST', 'phoenix_api_discounts_save', array(
        'rule' => array('type' => 'object', 'required' => true),
    ));
    phoenix_api_route('/discounts/(?P<id>[a-z0-9_\-]+)', 'DELETE', 'phoenix_api_discounts_delete');
    phoenix_api_route('/coupons', 'POST', 'phoenix_api_coupons_create', array(
        'code'    => array('type' => 'string', 'required' => true),
        'type'    => array('type' => 'string', 'enum' => array('percent', 'amount'), 'required' => true),
        'value'   => array('type' => 'number', 'minimum' => 0, 'required' => true),
        'email'   => array('type' => 'string', 'default' => ''),
        'expires' => array('type' => 'integer', 'minimum' => 0, 'default' => 0),
    ));

    phoenix_api_route('/search/products', 'GET', 'phoenix_api_search_products', array(
        'q' => array('type' => 'string', 'default' => ''),
    ));
}

/* ============================================================
   حاشیه‌ها
   ============================================================ */

function phoenix_margins_payload() {
    $s = phoenix_settings();

    $cats = array();
    foreach ((array) $s['margin_by_cat'] as $tid => $m) {
        $t = get_term((int) $tid, 'product_cat');
        if ($t && !is_wp_error($t)) {
            $cats[] = array('term_id' => (int) $tid, 'name' => $t->name, 'margin' => phoenix_margin_sanitize((array) $m));
        }
    }

    $prods = array();
    foreach ((array) $s['margin_by_prod'] as $pid => $m) {
        $p = wc_get_product((int) $pid);
        $prods[] = array(
            'id'     => (int) $pid,
            'title'  => $p ? $p->get_name() : 'محصولِ حذف‌شده',
            'exists' => (bool) $p,
            'margin' => phoenix_margin_sanitize((array) $m),
        );
    }

    $state = get_option('phoenix_reprice_state');
    $last  = get_option('phoenix_reprice_last');

    return array(
        'margin'        => phoenix_margin_sanitize((array) $s['margin']),
        'floor_percent' => (int) $s['floor_percent'],
        'cart_lock_min' => (int) $s['cart_lock_min'],
        'by_cat'        => $cats,
        'by_prod'       => $prods,
        'preview'       => phoenix_margins_preview(),
        'engine_on'     => (bool) $s['engine_on'],
        'rate'          => phoenix_rate_value(),
        'reprice'       => array(
            'running' => is_array($state),
            'scanned' => is_array($state) ? (int) $state['offset'] : 0,
            'last_at' => is_array($last) ? mysql2date('c', $last['at'], false) : null,
        ),
    );
}

/**
 * ⚠ پیش‌نمایش هیچ‌چیز نمی‌نویسد — ‎phoenix_compute_price‎ محاسبه‌ی
 * خالص است؛ ‎phoenix_apply_price‎ است که می‌نویسد.
 */
function phoenix_margins_preview() {
    global $wpdb;

    $ids = array_map('intval', (array) $wpdb->get_col($wpdb->prepare(
        "SELECT pm.post_id FROM {$wpdb->postmeta} pm
           INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
          WHERE pm.meta_key = %s
            AND p.post_status IN ('publish', 'private')
            AND p.post_type IN ('product', 'product_variation')
            AND (pm.meta_value LIKE %s OR pm.meta_value LIKE %s OR pm.meta_value LIKE %s)
          ORDER BY pm.post_id DESC LIMIT 12",
        PHOENIX_META_KEY,
        '%' . $wpdb->esc_like('"cost_usd"') . '%',
        '%' . $wpdb->esc_like('"cost_toman"') . '%',
        /* «چند منبع» هزینه‌اش در متای جداست؛ حالتش این‌جاست */
        '%' . $wpdb->esc_like('"price_mode";s:7:"sources"') . '%'
    )));

    $rate = phoenix_rate_value();
    $rows = array();
    foreach ($ids as $id) {
        $p = wc_get_product($id);
        if (!$p) {
            continue;
        }
        $name = $p->is_type('variation')
            ? (($parent = wc_get_product($p->get_parent_id())) ? $parent->get_name() : '') . ' — ' . phoenix_plan_label($id, $p)
            : $p->get_name();
        $c = phoenix_compute_price($id, $rate);
        $rows[] = array(
            'id'      => $p->is_type('variation') ? (int) $p->get_parent_id() : $id,
            'title'   => $name,
            'current' => (int) round((float) $p->get_price()),
            'calc'    => $c ? array(
                'mode'      => $c['mode'],
                'base'      => $c['base'],
                'profit'    => $c['profit'],
                'regular'   => $c['regular'],
                'final'     => $c['final'],
                'discount'  => $c['discount'] ? $c['discount']['label'] : '',
                'blocked'   => $c['blocked'] ? $c['blocked']['why'] : '',
                'floor_hit' => $c['floor_hit'],
            ) : null,
        );
    }
    return $rows;
}

function phoenix_plan_label($id, $p) {
    $f = phoenix_get_fields($id);
    return isset($f['label']) ? (string) $f['label'] : implode(' ', (array) $p->get_attributes());
}

function phoenix_api_margins_get(WP_REST_Request $r) {
    return phoenix_api_ok(phoenix_margins_payload());
}

function phoenix_api_margins_save(WP_REST_Request $r) {
    phoenix_settings_save(array(
        'margin'        => phoenix_margin_sanitize((array) $r['margin']),
        'floor_percent' => (int) $r['floor_percent'],
        'cart_lock_min' => (int) $r['cart_lock_min'],
    ), 'از پنل');
    phoenix_discount_flush();
    return phoenix_api_ok(phoenix_margins_payload());
}

function phoenix_api_margins_category(WP_REST_Request $r) {
    $tid = (int) $r['term_id'];
    $t   = get_term($tid, 'product_cat');
    if (!$t || is_wp_error($t)) {
        return phoenix_api_fail('phoenix_not_found', 'این دسته پیدا نشد.', 404);
    }
    $all = (array) phoenix_setting('margin_by_cat', array());
    if (is_array($r['margin'])) {
        $all[$tid] = phoenix_margin_sanitize($r['margin']);
    } else {
        unset($all[$tid]);
    }
    phoenix_settings_save(array('margin_by_cat' => $all), 'حاشیه‌ی دسته‌ی «' . $t->name . '»');
    phoenix_discount_flush();
    return phoenix_api_ok(phoenix_margins_payload());
}

function phoenix_api_reprice(WP_REST_Request $r) {
    if (!phoenix_setting('engine_on')) {
        return phoenix_api_fail('phoenix_engine_off', 'موتورِ قیمت خاموش است؛ چیزی نوشته نمی‌شود. اول از داشبورد روشنش کن.', 409);
    }
    phoenix_reprice_start();
    return phoenix_api_ok(phoenix_margins_payload());
}

/* ============================================================
   تخفیف‌ها
   ============================================================ */

function phoenix_discounts_payload() {
    $now   = time();
    $rules = array();
    foreach (phoenix_discounts_all() as $raw) {
        $rule = array_merge(phoenix_discount_blank(), (array) $raw);
        $state = !$rule['enabled'] ? 'off'
            : (phoenix_discount_live($rule, $now) ? 'live'
            : ($rule['starts'] && $now < $rule['starts'] ? 'upcoming' : 'ended'));
        $rule['state']   = $state;
        $rule['targets_named'] = phoenix_discount_target_names($rule);
        $rules[] = $rule;
    }

    $coupons = array();
    foreach ((array) get_posts(array(
        'post_type'      => 'shop_coupon',
        'posts_per_page' => 20,
        'post_status'    => 'publish',
        'orderby'        => 'date',
        'order'          => 'DESC',
    )) as $post) {
        $c = new WC_Coupon($post->ID);
        $exp = $c->get_date_expires();
        $coupons[] = array(
            'code'    => $c->get_code(),
            'type'    => $c->get_discount_type() === 'percent' ? 'percent' : 'amount',
            'value'   => (float) $c->get_amount(),
            'used'    => (int) $c->get_usage_count(),
            'limit'   => (int) $c->get_usage_limit(),
            'email'   => implode('، ', (array) $c->get_email_restrictions()),
            'expires' => $exp ? $exp->date('c') : null,
        );
    }

    return array('rules' => $rules, 'coupons' => $coupons);
}

/** نامِ هدف‌ها، تا جدول فقط عدد نباشد */
function phoenix_discount_target_names(array $rule) {
    $out = array();
    foreach (array_slice($rule['targets'], 0, 40) as $id) {
        if ($rule['scope'] === 'product') {
            $p = wc_get_product((int) $id);
            $out[] = array('id' => (int) $id, 'name' => $p ? $p->get_name() : '(حذف‌شده)');
            continue;
        }
        $tax = $rule['scope'] === 'tag' ? 'product_tag' : 'product_cat';
        $t   = get_term((int) $id, $tax);
        $out[] = array('id' => (int) $id, 'name' => ($t && !is_wp_error($t)) ? $t->name : '(حذف‌شده)');
    }
    return $out;
}

function phoenix_api_discounts_get(WP_REST_Request $r) {
    return phoenix_api_ok(phoenix_discounts_payload());
}

/**
 * ⚠ ‎phoenix_discount_sanitize‎ تنها دروازه است — همان که پنلِ قبلی
 * هم از آن رد می‌شد. درصد تا ۹۰، هدف‌ها عددِ مثبت، بازه‌ی وارونه
 * صاف می‌شود.
 */
function phoenix_api_discounts_save(WP_REST_Request $r) {
    $in = (array) $r['rule'];
    if (trim((string) ($in['title'] ?? '')) === '') {
        return phoenix_api_fail('phoenix_invalid', 'تخفیف عنوان ندارد — همین عنوان روی کارتِ محصول دیده می‌شود.', 422);
    }
    if ((float) ($in['value'] ?? 0) <= 0) {
        return phoenix_api_fail('phoenix_invalid', 'مقدارِ تخفیف باید بیشتر از صفر باشد.', 422);
    }
    if (($in['scope'] ?? 'all') !== 'all' && empty($in['targets'])) {
        return phoenix_api_fail('phoenix_invalid', 'دامنه انتخاب شده ولی هیچ هدفی ندارد.', 422);
    }
    phoenix_discount_save($in);
    return phoenix_api_ok(phoenix_discounts_payload());
}

function phoenix_api_discounts_delete(WP_REST_Request $r) {
    phoenix_discount_delete((string) $r['id']);
    return phoenix_api_ok(phoenix_discounts_payload());
}

function phoenix_api_coupons_create(WP_REST_Request $r) {
    $email = (string) $r['email'];
    if ($email !== '' && !is_email($email)) {
        return phoenix_api_fail('phoenix_invalid', 'ایمیل معتبر نیست.', 422);
    }
    $res = phoenix_make_personal_coupon((string) $r['code'], (string) $r['type'], (float) $r['value'], $email, (int) $r['expires']);
    if (is_wp_error($res)) {
        return phoenix_api_fail($res->get_error_code(), $res->get_error_message(), 422);
    }
    return phoenix_api_ok(phoenix_discounts_payload());
}

/* ============================================================
   جست‌وجوی محصول — برای انتخابِ هدفِ تخفیف
   ============================================================ */

function phoenix_api_search_products(WP_REST_Request $r) {
    $q = trim((string) $r['q']);
    $ids = get_posts(array(
        'post_type'      => 'product',
        'post_status'    => array('publish', 'draft', 'private'),
        'posts_per_page' => 20,
        'fields'         => 'ids',
        's'              => $q,
        'orderby'        => $q === '' ? 'modified' : 'relevance',
    ));
    $out = array();
    foreach ($ids as $id) {
        $out[] = array('id' => (int) $id, 'name' => get_the_title($id));
    }
    return phoenix_api_ok($out);
}
