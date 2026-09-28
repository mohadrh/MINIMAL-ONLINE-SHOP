<?php
/**
 * تابلوی قیمت — همه‌ی محصولات، هر کدام با منبعِ قیمت و عددِ الانش.
 *
 * ============================================================
 * خواسته‌ی کارفرما: «صفحه‌ی منابعِ قیمت باید برای هر محصول همه‌ی
 * این تنظیمات را داشته باشد.»
 *
 * ویرایشگرِ محصول همه‌چیزِ یک محصول را دارد؛ این صفحه یک چیز از
 * همه‌ی محصولات: قیمت از کجا می‌آید و الان چند است. و هر ردیف
 * همان‌جا ویرایش می‌شود — بدونِ باز کردنِ ویرایشگر.
 *
 * ⚠ «صاحبِ قیمت»
 * در محصولِ متغیر، هر پلن یا قیمتِ خودش را دارد یا از محصول ارث
 * می‌برد. پس هر ردیف یک «صاحب» است: کلِ محصول (شناسه‌ی پلن ۰)، یا
 * یک پلن با قیمت‌گذاریِ جدا. پلنِ ارث‌بر هم دیده می‌شود، با
 * قیمتش، ولی تنظیمش همان تنظیمِ محصول است.
 *
 * ⚠ ذخیره فقط قیمت‌گذاری را می‌نویسد، نه کلِ محصول.
 * ‎phoenix_product_write‎ همه‌ی فیلدها را از فرم می‌خواهد؛ این‌جا
 * فرمِ کامل نیست، پس فقط همان چند کلیدِ قیمت‌گذاری عوض می‌شود.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', 'phoenix_board_routes');
function phoenix_board_routes() {
    phoenix_api_route('/pricing', 'GET', 'phoenix_api_board_get');
    phoenix_api_route('/products/(?P<id>\d+)/pricing', 'POST', 'phoenix_api_board_save');
}

function phoenix_api_board_get(WP_REST_Request $r) {
    $ids = get_posts(array(
        'post_type'      => 'product',
        'post_status'    => array('publish', 'draft', 'private', 'pending'),
        'posts_per_page' => 500,
        'fields'         => 'ids',
        'orderby'        => 'title',
        'order'          => 'ASC',
        'no_found_rows'  => true,
    ));
    $rows = array();
    foreach ($ids as $id) {
        $row = phoenix_board_row((int) $id);
        if ($row) {
            $rows[] = $row;
        }
    }
    return phoenix_api_ok(array(
        'rows'      => $rows,
        'rate'      => phoenix_rate_value(),
        'engine_on' => (bool) phoenix_setting('engine_on'),
        'margin'    => phoenix_margin_sanitize((array) phoenix_setting('margin', array())),
    ));
}

/** یک محصول با صاحبانِ قیمتش */
function phoenix_board_row($id) {
    $p = wc_get_product($id);
    if (!$p || $p->is_type('variation')) {
        return null;
    }
    $f       = phoenix_get_fields($id);
    $by_prod = (array) phoenix_setting('margin_by_prod', array());

    $owners = array(phoenix_board_owner($id, 0, $p, $f, 'کلِ محصول'));

    $plans = array();
    if ($p->is_type('variable')) {
        foreach ($p->get_children() as $cid) {
            $v = wc_get_product($cid);
            if (!$v) {
                continue;
            }
            $vf    = phoenix_get_fields($cid);
            $label = isset($vf['label']) ? (string) $vf['label'] : implode(' ', (array) $v->get_attributes());
            $own   = isset($vf['price_mode']) && in_array($vf['price_mode'], PHOENIX_PRICE_MODES, true);
            $plans[] = array_merge(
                phoenix_board_owner((int) $cid, (int) $cid, $v, $vf, $label),
                array('inherit' => !$own)
            );
        }
    } else {
        /* تک‌پلن: قیمتِ روی سایت همان قیمتِ محصول است */
        $owners[0] = array_merge($owners[0], phoenix_board_price($p, $id));
    }

    return array(
        'id'            => $id,
        'title'         => $p->get_name(),
        'english_title' => isset($f['english_title']) ? (string) $f['english_title'] : '',
        'thumb'         => phoenix_product_thumb($p, $f),
        'accent'        => isset($f['accent']) ? (string) $f['accent'] : '',
        'status'        => $p->get_status(),
        'variable'      => $p->is_type('variable'),
        'margin'        => isset($by_prod[$id]) ? phoenix_margin_sanitize((array) $by_prod[$id]) : null,
        'margin_used'   => phoenix_margin_for($id),
        'owner'         => $owners[0],
        'plans'         => $plans,
    );
}

/** تنظیمِ قیمت‌گذاریِ یک صاحب */
function phoenix_board_owner($owner_id, $plan_id, $obj, array $f, $label) {
    $out = array(
        'plan_id' => $plan_id,
        'label'   => $label,
        'pricing' => array(
            'mode'       => isset($f['price_mode']) && in_array($f['price_mode'], PHOENIX_PRICE_MODES, true)
                ? $f['price_mode'] : ($plan_id ? 'inherit' : 'manual'),
            'cost_usd'   => (float) (isset($f['cost_usd']) ? $f['cost_usd'] : 0),
            'cost_toman' => (int) (isset($f['cost_toman']) ? $f['cost_toman'] : 0),
            'locked'     => !empty($f['price_locked']),
            'sources'    => phoenix_psrc_config($owner_id) ?: phoenix_psrc_blank(),
            'sources_state' => phoenix_psrc_state_public($owner_id),
        ),
    );
    if ($plan_id) {
        $out = array_merge($out, phoenix_board_price($obj, $plan_id));
    }
    return $out;
}

/** قیمتِ الانِ روی سایت، و آنچه موتور حساب می‌کند */
function phoenix_board_price($obj, $pid) {
    $calc = phoenix_compute_price($pid);
    return array(
        'current' => (int) round((float) $obj->get_price()),
        'regular' => (int) round((float) $obj->get_regular_price()),
        'calc'    => $calc ? array(
            'mode'     => $calc['mode'],
            'base'     => $calc['base'],
            'profit'   => $calc['profit'],
            'regular'  => $calc['regular'],
            'sale'     => $calc['sale'],
            'final'    => $calc['final'],
            'discount' => $calc['discount'] ? $calc['discount']['label'] : '',
            'blocked'  => $calc['blocked'] ? $calc['blocked']['why'] : '',
            'floor_hit'=> $calc['floor_hit'],
        ) : null,
    );
}

/**
 * ذخیره‌ی قیمت‌گذاریِ یک صاحب.
 *
 * بدنه: ‎{plan_id: 0|شناسه‌ی پلن, pricing: {mode, cost_usd, cost_toman, locked, sources}, margin?: {…}|null}‎
 * ‎margin‎ فقط برای کلِ محصول؛ کلیدش نیامده یعنی دست نخورد.
 */
function phoenix_api_board_save(WP_REST_Request $r) {
    $id = (int) $r['id'];
    $p  = wc_get_product($id);
    if (!$p || $p->is_type('variation')) {
        return phoenix_api_fail('phoenix_not_found', 'این محصول پیدا نشد.', 404);
    }
    if (!current_user_can('edit_product', $id)) {
        return phoenix_api_fail('phoenix_forbidden', 'اجازه‌ی ویرایشِ این محصول را نداری.', 403);
    }

    $in      = (array) $r->get_json_params();
    $plan_id = isset($in['plan_id']) ? (int) $in['plan_id'] : 0;
    if ($plan_id && (!$p->is_type('variable') || !phoenix_plan_owned($id, $plan_id))) {
        return phoenix_api_fail('phoenix_not_found', 'این پلن مالِ این محصول نیست.', 404);
    }

    $err   = array();
    $clean = phoenix_clean_pricing(isset($in['pricing']) ? $in['pricing'] : array(), $plan_id > 0,
        array_keys(phoenix_connections()), $err, 'sources.');
    if ($clean['mode'] === 'usd' && $clean['cost_usd'] <= 0) {
        $err['cost_usd'] = 'قیمتِ تمام‌شده‌ی دلاری را بنویس.';
    }
    if ($clean['mode'] === 'toman' && $clean['cost_toman'] <= 0) {
        $err['cost_toman'] = 'قیمتِ تمام‌شده‌ی تومانی را بنویس.';
    }
    if ($err) {
        return new WP_Error('phoenix_invalid', 'بعضی فیلدها درست نیستند.', array('status' => 422, 'errors' => $err));
    }

    $owner = $plan_id ? $plan_id : $id;
    $f     = phoenix_get_fields($owner);
    $before = array(
        'mode' => isset($f['price_mode']) ? $f['price_mode'] : '',
        'usd'  => isset($f['cost_usd']) ? $f['cost_usd'] : 0,
        'toman'=> isset($f['cost_toman']) ? $f['cost_toman'] : 0,
    );

    if ($clean['mode'] === 'inherit') {
        unset($f['price_mode']);
    } else {
        $f['price_mode'] = $clean['mode'];
    }
    phoenix_set_or_unset($f, 'cost_usd', $clean['cost_usd']);
    phoenix_set_or_unset($f, 'cost_toman', $clean['cost_toman']);
    $f['price_locked'] = $clean['locked'];
    phoenix_set_fields($owner, $f);
    phoenix_psrc_store($owner, $clean['mode'] === 'sources' ? $clean['sources'] : null);

    /* حاشیه‌ی اختصاصی — فقط کلِ محصول، و فقط اگر فرستاده شده */
    if (!$plan_id && array_key_exists('margin', $in)) {
        $by  = (array) phoenix_setting('margin_by_prod', array());
        $old = isset($by[$id]) ? $by[$id] : null;
        if (is_array($in['margin'])) {
            $by[$id] = phoenix_margin_sanitize($in['margin']);
        } else {
            unset($by[$id]);
        }
        if ($old !== (isset($by[$id]) ? $by[$id] : null)) {
            phoenix_settings_save(array('margin_by_prod' => $by), 'حاشیه‌ی «' . $p->get_name() . '»');
        }
    }

    if ($clean['mode'] === 'sources') {
        phoenix_psrc_refresh($owner);
    }
    if (phoenix_setting('engine_on')) {
        phoenix_psrc_apply_tree($owner, phoenix_rate_value());
    }

    wc_delete_product_transients($id);
    if (function_exists('phoenix_flush_catalog_cache')) {
        phoenix_flush_catalog_cache();
    }
    if (function_exists('phoenix_flush_prices_cache')) {
        phoenix_flush_prices_cache();
    }
    phoenix_audit('product', (string) $id, wp_json_encode($before), $clean['mode'], 'قیمت‌گذاری از منابعِ قیمت');

    return phoenix_api_ok(phoenix_board_row($id));
}
