<?php
/**
 * محصولات — فهرست، ویرایش، ساخت، پیش‌نمایشِ قیمت.
 *
 * ============================================================
 * ⚠ ساختارِ خودمان، نه ساختارِ ووکامرس
 *
 * ووکامرس محصول را برای فروشگاهِ کالای فیزیکی مدل کرده: وزن،
 * ابعاد، حمل، و «ویژگی» و «واریاسیون» با واژگانِ خودش. این پنل
 * همان محصول را به زبانِ این فروشگاه نشان می‌دهد: پلن، قیمتِ
 * تمام‌شده، روشِ تحویل، ورودی‌هایی که از مشتری لازم است.
 *
 * ترجمه بینِ این دو فقط این‌جا اتفاق می‌افتد:
 *
 *   ‎phoenix_product_payload()‎  ووکامرس → پنل
 *   ‎phoenix_product_write()‎    پنل → ووکامرس (بعد از clean)
 *
 * ⚠ «پلن» همان واریاسیونِ ووکامرس است. محصولِ یک‌پلنی «ساده»
 *   ذخیره می‌شود و محصولِ چندپلنی «متغیر» — و ادمین لازم نیست
 *   این را بداند. پلنِ دوم که اضافه شود، محصول خودش متغیر می‌شود؛
 *   و وقتی یکی بماند، دوباره ساده.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_PLAN_ATTR = 'پلن';

add_action('rest_api_init', 'phoenix_products_routes');
function phoenix_products_routes() {
    phoenix_api_route('/products', 'GET', 'phoenix_api_products_list', array(
        'search'   => array('type' => 'string', 'default' => ''),
        'category' => array('type' => 'integer', 'default' => 0),
        'mode'     => array('type' => 'string', 'enum' => array('', 'engine', 'manual', 'locked'), 'default' => ''),
        'status'   => array('type' => 'string', 'enum' => array('', 'publish', 'draft', 'private'), 'default' => ''),
        'page'     => array('type' => 'integer', 'default' => 1, 'minimum' => 1),
    ));
    phoenix_api_route('/products', 'POST', 'phoenix_api_products_create', array(
        'title' => array('type' => 'string', 'required' => true),
    ));
    phoenix_api_route('/products/(?P<id>\d+)', 'GET', 'phoenix_api_products_get');
    phoenix_api_route('/products/(?P<id>\d+)', 'POST', 'phoenix_api_products_save');
    phoenix_api_route('/products/(?P<id>\d+)', 'DELETE', 'phoenix_api_products_trash');
    phoenix_api_route('/products/(?P<id>\d+)/preview', 'POST', 'phoenix_api_products_preview');
    phoenix_api_route('/products/(?P<id>\d+)/sources/fetch', 'POST', 'phoenix_api_products_sources_fetch');
    phoenix_api_route('/products/(?P<id>\d+)/sources/approve', 'POST', 'phoenix_api_products_sources_approve');
    phoenix_api_route('/terms', 'GET', 'phoenix_api_terms');
}

/* ============================================================
   فهرست
   ============================================================ */

/**
 * ⚠ همه‌ی شناسه‌ها یک‌جا، صفحه‌بندی در PHP.
 *
 * فیلترِ «قیمت از کجا می‌آید» روی متای سریال‌شده است و برای
 * محصولِ متغیر به واریاسیون‌ها هم بسته است — با SQL نمی‌شود
 * درست فیلترش کرد. این فروشگاه چند ده تا چند صد محصول دارد؛
 * خواندنِ همه و فیلتر در PHP هم درست است و هم سریع. سقفِ ۱۰۰۰
 * برای روزی که این فرض نشکند.
 */
function phoenix_api_products_list(WP_REST_Request $r) {
    $args = array(
        'post_type'      => 'product',
        'post_status'    => $r['status'] !== '' ? array($r['status']) : array('publish', 'draft', 'private', 'pending'),
        'posts_per_page' => 1000,
        'fields'         => 'ids',
        'orderby'        => 'modified',
        'order'          => 'DESC',
        'no_found_rows'  => true,
    );
    $search = trim((string) $r['search']);
    if ($search !== '') {
        $args['s'] = $search;
    }
    if ((int) $r['category'] > 0) {
        $args['tax_query'] = array(array(
            'taxonomy'         => 'product_cat',
            'field'            => 'term_id',
            'terms'            => array((int) $r['category']),
            'include_children' => true,
        ));
    }

    $ids  = get_posts($args);
    $rows = array();
    foreach ($ids as $id) {
        $row = phoenix_product_row((int) $id);
        if (!$row) {
            continue;
        }
        if ($r['mode'] === 'engine' && !$row['engine']) continue;
        if ($r['mode'] === 'manual' && ($row['engine'] || $row['locked'])) continue;
        if ($r['mode'] === 'locked' && !$row['locked']) continue;
        $rows[] = $row;
    }

    $per   = 20;
    $page  = max(1, (int) $r['page']);
    $total = count($rows);

    return phoenix_api_ok(array(
        'rows'  => array_slice($rows, ($page - 1) * $per, $per),
        'total' => $total,
        'page'  => $page,
        'pages' => max(1, (int) ceil($total / $per)),
        'rate'  => phoenix_rate_value(),
        'engine_on' => (bool) phoenix_setting('engine_on'),
    ));
}

/** یک ردیفِ فهرست */
function phoenix_product_row($id) {
    $p = wc_get_product($id);
    if (!$p) {
        return null;
    }
    $f     = phoenix_get_fields($id);
    $plans = $p->is_type('variable') ? $p->get_children() : array($id);

    $engine = false;
    $locked = false;
    $modes  = array();
    $final  = null;
    foreach ($plans as $pid) {
        $cost = phoenix_cost_of((int) $pid);
        $modes[isset($cost['via']) ? $cost['via'] : $cost['mode']] = true;
        if ($cost['locked']) {
            $locked = true;
            continue;
        }
        if ($cost['mode'] !== 'manual' || isset($cost['via'])) {
            $engine = true;
            $c = phoenix_compute_price((int) $pid);
            if ($c && ($final === null || $c['final'] < $final)) {
                $final = $c['final'];
            }
        }
    }

    $terms = get_the_terms($id, 'product_cat');
    $cat   = is_array($terms) && $terms ? array('id' => (int) $terms[0]->term_id, 'name' => $terms[0]->name) : null;

    return array(
        'id'            => $id,
        'title'         => $p->get_name(),
        'english_title' => isset($f['english_title']) ? (string) $f['english_title'] : '',
        'thumb'         => phoenix_product_thumb($p, $f),
        'accent'        => isset($f['accent']) ? (string) $f['accent'] : '',
        'category'      => $cat,
        'status'        => $p->get_status(),
        'plans'         => count($plans),
        'price'         => (int) round((float) $p->get_price()),
        'on_sale'       => (bool) $p->is_on_sale(),
        'in_stock'      => (bool) $p->is_in_stock(),
        'mode'          => count($modes) > 1 ? 'mixed' : (string) key($modes),
        'engine'        => $engine,
        'locked'        => $locked,
        'engine_final'  => $final,
        'updated'       => $p->get_date_modified() ? $p->get_date_modified()->date('c') : null,
    );
}

/** تصویرِ کوچکِ فهرست: مسیرِ خودمان، وگرنه تصویرِ شاخصِ ووکامرس */
function phoenix_product_thumb($p, array $f) {
    foreach (array('logo', 'thumbnail') as $k) {
        if (!empty($f[$k])) {
            return phoenix_media_url((string) $f[$k]);
        }
    }
    $img = $p->get_image_id() ? wp_get_attachment_image_url($p->get_image_id(), 'thumbnail') : '';
    return $img ? $img : '';
}

/**
 * نشانیِ کاملِ تصویر برای نمایش در پنل.
 *
 * مسیرهای نسبی مالِ سایتِ استاتیک‌اند، نه وردپرس — پنل روی
 * ‎panel.‎ است و ‎/products/x.webp‎ آن‌جا وجود ندارد.
 */
function phoenix_media_url($v) {
    /* ⚠ متای قدیمی از همان دروازه‌ی ورودی رد می‌شود.
       محصولی که با واردات یا نسخه‌ی ۱ ذخیره شده هیچ‌وقت از
       ‎phoenix_product_clean()‎ رد نشده؛ نشانیِ نامعتبرش این‌جا
       خالی می‌شود، نه اینکه در ‎src‎ی پنل بنشیند. */
    $v = phoenix_clean_media(trim((string) $v));
    if (!$v || strpos($v, 'https://') === 0) {
        return (string) $v;
    }
    return phoenix_site_url() . $v;
}

/**
 * نشانیِ سایتِ استاتیک.
 *
 * ⚠ از ‎PHOENIX_SITE_URL‎ در wp-config، وگرنه از نشانیِ خودِ
 * وردپرس با حذفِ ‎panel.‎ — چون قرارِ این پروژه همین است
 * (docs/HOST.md). اگر روزی زیردامنه اسمِ دیگری گرفت، ثابت را
 * تعریف کن.
 */
function phoenix_site_url() {
    if (defined('PHOENIX_SITE_URL') && PHOENIX_SITE_URL) {
        return rtrim(PHOENIX_SITE_URL, '/');
    }
    $home = wp_parse_url(home_url());
    $host = isset($home['host']) ? preg_replace('/^panel\./', '', $home['host']) : '';
    return 'https://' . $host;
}

/* ============================================================
   یک محصول — ووکامرس ← پنل
   ============================================================ */

function phoenix_api_products_get(WP_REST_Request $r) {
    $p = wc_get_product((int) $r['id']);
    if (!$p || $p->is_type('variation')) {
        return phoenix_api_fail('phoenix_not_found', 'این محصول پیدا نشد.', 404);
    }
    return phoenix_api_ok(phoenix_product_payload($p));
}

function phoenix_product_payload($p) {
    $id = $p->get_id();
    $f  = phoenix_get_fields($id);

    $cat_ids = $p->get_category_ids();
    $tags    = array();
    foreach ($p->get_tag_ids() as $tid) {
        $t = get_term($tid, 'product_tag');
        if ($t && !is_wp_error($t)) {
            $tags[] = $t->name;
        }
    }

    $by_prod = (array) phoenix_setting('margin_by_prod', array());

    $payload = array(
        'id'                => $id,
        'title'             => $p->get_name(),
        'status'            => $p->get_status(),
        'permalink'         => phoenix_site_url() . '/product/' . $p->get_slug() . '/',
        'english_title'     => (string) ($f['english_title'] ?? ''),
        'brand'             => (string) ($f['brand'] ?? ''),
        'category'          => $cat_ids ? (int) $cat_ids[0] : 0,
        'tags'              => $tags,
        'short_description' => wp_strip_all_tags((string) $p->get_short_description()),
        'description'       => wp_strip_all_tags((string) $p->get_description()),
        'badges'            => array_values(array_intersect(PHOENIX_BADGES, (array) ($f['badges'] ?? array()))),
        'media'             => array(
            'thumbnail' => (string) ($f['thumbnail'] ?? ''),
            'logo'      => (string) ($f['logo'] ?? ''),
            'cover'     => (string) ($f['cover'] ?? ''),
            'cutout'    => (string) ($f['cutout'] ?? ''),
            'accent'    => (string) ($f['accent'] ?? ''),
        ),
        'content'           => array(
            'features'  => array_values((array) ($f['features'] ?? array())),
            'notes'     => array_values((array) ($f['notes'] ?? array())),
            'platforms' => array_values((array) ($f['platforms'] ?? array())),
            'faq'       => array_values(array_filter((array) ($f['faq'] ?? array()), 'is_array')),
        ),
        'delivery'          => array(
            'fulfillment'       => (string) ($f['fulfillment'] ?? 'manual'),
            'delivery_estimate' => (string) ($f['delivery_estimate'] ?? ''),
            'warranty_label'    => (string) ($f['warranty_label'] ?? ''),
            'required_inputs'   => array_values(array_filter((array) ($f['required_inputs'] ?? array()), 'is_array')),
        ),
        'pricing'           => array(
            'mode'       => in_array($f['price_mode'] ?? '', PHOENIX_PRICE_MODES, true) ? $f['price_mode'] : 'manual',
            'cost_usd'   => (float) ($f['cost_usd'] ?? 0),
            'cost_toman' => (int) ($f['cost_toman'] ?? 0),
            'locked'     => !empty($f['price_locked']),
            'margin'     => isset($by_prod[$id]) ? phoenix_margin_sanitize((array) $by_prod[$id]) : null,
            'sources'    => phoenix_psrc_config($id) ?: phoenix_psrc_blank(),
            'sources_state' => phoenix_psrc_state_public($id),
        ),
        'plans'             => array(),
        'engine_on'         => (bool) phoenix_setting('engine_on'),
    );

    if ($p->is_type('variable')) {
        $children = $p->get_children();
        foreach ($children as $cid) {
            $v = wc_get_product($cid);
            if (!$v) {
                continue;
            }
            $vf = phoenix_get_fields($cid);
            $payload['plans'][] = array(
                'id'         => (int) $cid,
                'label'      => (string) ($vf['label'] ?? implode(' ', $v->get_attributes())),
                'regular'    => (int) round((float) $v->get_regular_price('edit')),
                'sale'       => (int) round((float) $v->get_sale_price('edit')),
                'stock'      => $v->get_manage_stock() ? (int) $v->get_stock_quantity() : null,
                'usd'        => (float) ($vf['usd'] ?? 0),
                'duration_days' => (int) ($vf['duration_days'] ?? 0),
                'guide'      => isset($vf['guide']['fit'], $vf['guide']['detail']) ? $vf['guide'] : null,
                'is_default' => !empty($vf['is_default']),
                'pricing'    => array(
                    'mode'       => in_array($vf['price_mode'] ?? '', PHOENIX_PRICE_MODES, true) ? $vf['price_mode'] : 'inherit',
                    'cost_usd'   => (float) ($vf['cost_usd'] ?? 0),
                    'cost_toman' => (int) ($vf['cost_toman'] ?? 0),
                    'locked'     => !empty($vf['price_locked']),
                    'sources'    => phoenix_psrc_config($cid) ?: phoenix_psrc_blank(),
                    'sources_state' => phoenix_psrc_state_public($cid),
                ),
            );
        }
    } else {
        $payload['plans'][] = array(
            'id'         => 0,
            'label'      => (string) ($f['variant_label'] ?? 'خرید'),
            'regular'    => (int) round((float) $p->get_regular_price('edit')),
            'sale'       => (int) round((float) $p->get_sale_price('edit')),
            'stock'      => $p->get_manage_stock() ? (int) $p->get_stock_quantity() : null,
            'usd'        => (float) ($f['variant_usd'] ?? 0),
            'duration_days' => (int) ($f['variant_duration'] ?? 0),
            'guide'      => isset($f['variant_guide']['fit'], $f['variant_guide']['detail']) ? $f['variant_guide'] : null,
            'is_default' => true,
            'pricing'    => array('mode' => 'inherit', 'cost_usd' => 0, 'cost_toman' => 0, 'locked' => false,
                                  'sources' => phoenix_psrc_blank(), 'sources_state' => null),
        );
    }

    if ($payload['plans'] && !array_filter(array_column($payload['plans'], 'is_default'))) {
        $payload['plans'][0]['is_default'] = true;
    }

    $payload['preview'] = phoenix_product_preview($id, $payload);
    return $payload;
}

/* ============================================================
   پیش‌نمایشِ قیمت — بدونِ ذخیره
   ============================================================ */

/**
 * قیمتِ هر پلن با مقادیری که در فرم است، نه آنچه ذخیره شده.
 *
 * ⚠ از ‎phoenix_compute_with()‎ استفاده می‌کند — همان فرمولی که
 * موتور با آن روی سایت می‌نویسد. پیش‌نمایش و سایت نمی‌توانند
 * عددِ متفاوت بگویند.
 */
function phoenix_product_preview($product_id, array $data, array $try = array()) {
    $prod_pricing = $data['pricing'];
    $margin = !empty($prod_pricing['margin'])
        ? phoenix_margin_sanitize((array) $prod_pricing['margin'])
        : ($product_id ? phoenix_margin_for_owner($product_id) : phoenix_margin_sanitize((array) phoenix_setting('margin', array())));

    $rate = phoenix_rate_value();
    $out  = array();
    $many = count($data['plans']) > 1;

    foreach ($data['plans'] as $i => $plan) {
        $pp   = $plan['pricing'];
        /* ⚠ محصولِ تک‌پلنی قیمت‌گذاریِ پلن ندارد — همان محصول */
        $own  = $many && $pp['mode'] !== 'inherit';
        $mode = $own ? $pp['mode'] : $prod_pricing['mode'];
        $cost = array(
            'mode'   => $mode,
            'usd'    => phoenix_effective_cost($prod_pricing, $own ? $pp : array(), 'cost_usd'),
            'toman'  => phoenix_effective_cost($prod_pricing, $own ? $pp : array(), 'cost_toman'),
            'locked' => !empty($prod_pricing['locked']) || ($own && !empty($pp['locked'])),
        );
        $src = null;

        /* ---------- چند منبع ----------
           عدد از آخرین «بگیر» در همین فرم (اگر زده شده)، وگرنه از
           آخرین به‌روزرسانیِ ذخیره‌شده. */
        if ($mode === 'sources') {
            $key  = $own ? 'plan:' . $i : 'product';
            $pick = isset($try[$key]) ? phoenix_psrc_try_pick($try[$key]) : null;
            $c    = null;
            if ($pick) {
                $c   = phoenix_psrc_cost_of_use($pick);
                $src = array('why' => $pick['why'], 'held' => '', 'fresh' => true);
            } else {
                $owner = $own ? phoenix_plan_owned($product_id, (int) $plan['id']) : $product_id;
                if ($owner) {
                    $c  = phoenix_psrc_cost($owner);
                    $st = phoenix_psrc_state($owner);
                    $src = array(
                        'why'   => isset($st['pick']['why']) ? (string) $st['pick']['why'] : '',
                        'held'  => isset($st['pick']['held']) ? (string) $st['pick']['held'] : '',
                        'fresh' => false,
                    );
                }
            }
            if (!$c) {
                $out[] = array('label' => $plan['label'], 'engine' => false, 'via' => 'sources',
                               'why' => 'هنوز از منابع عددی گرفته نشده — «بگیر» را بزن.',
                               'current' => $plan['sale'] > 0 ? $plan['sale'] : $plan['regular']);
                continue;
            }
            $cost = array_merge($cost, $c);
        }

        $calc = phoenix_compute_with($cost, $margin, $plan['id'] ? $plan['id'] : $product_id, $rate);

        if ($calc === null) {
            $why = $cost['locked'] ? 'قفل — موتور دست نمی‌زند'
                : ($mode === 'manual' ? 'دستی — همان قیمتی که نوشته‌ای'
                : ($cost['mode'] === 'usd' && $rate <= 0 ? 'نرخ در دسترس نیست'
                : 'قیمتِ تمام‌شده وارد نشده'));
            $out[] = array('label' => $plan['label'], 'engine' => false, 'why' => $why,
                           'current' => $plan['sale'] > 0 ? $plan['sale'] : $plan['regular']);
            continue;
        }

        $out[] = array(
            'label'     => $plan['label'],
            'engine'    => true,
            'mode'      => $calc['mode'],
            'via'       => $mode === 'sources' ? 'sources' : '',
            'source'    => $src,
            'rate'      => $calc['rate'],
            'base'      => $calc['base'],
            'profit'    => $calc['profit'],
            'regular'   => $calc['regular'],
            'sale'      => $calc['sale'],
            'final'     => $calc['final'],
            'floor'     => $calc['floor'],
            'floor_hit' => $calc['floor_hit'],
            'discount'  => $calc['discount'] ? $calc['discount']['label'] : '',
            'blocked'   => $calc['blocked'] ? $calc['blocked']['why'] : '',
            'current'   => $plan['sale'] > 0 ? $plan['sale'] : $plan['regular'],
        );
    }
    return $out;
}

/** پلن مالِ همین محصول است؟ — شناسه از مرورگر آمده */
function phoenix_plan_owned($product_id, $plan_id) {
    return $plan_id > 0 && (int) wp_get_post_parent_id($plan_id) === (int) $product_id ? $plan_id : 0;
}

/**
 * حاشیه‌ی محصول بدونِ نسخه‌ی اختصاصیِ ذخیره‌شده‌اش — دسته، وگرنه کل.
 *
 * ⚠ نسخه‌ی اول کشِ تنظیمات را مستقیم دستکاری می‌کرد. اگر کش
 * هنوز بار نشده بود، فقط همان یک کلید در آن می‌نشست و بقیه‌ی
 * تنظیمات — حاشیه‌ی پیش‌فرض، کفِ قیمت — «نبود» خوانده می‌شدند.
 * حالا ‎phoenix_margin_for‎ خودش پارامترِ صریح دارد.
 */
function phoenix_margin_for_owner($product_id) {
    return phoenix_margin_for($product_id, true);
}

function phoenix_api_products_preview(WP_REST_Request $r) {
    $id    = (int) $r['id'];
    $clean = phoenix_product_clean((array) $r->get_json_params());
    /* پیش‌نمایش حتی با فرمِ ناقص هم باید کار کند — خطاها فقط
       جلوی ذخیره را می‌گیرند، نه جلوی دیدنِ قیمت را. */
    $data = $clean['ok'] ? $clean['data'] : phoenix_product_clean_loose((array) $r->get_json_params());
    /* نتیجه‌ی «بگیر»ِ همین فرم — فقط برای پیش‌نمایش؛ هیچ‌جا ذخیره نمی‌شود */
    $try = $r['_try'];
    return phoenix_api_ok(array(
        'preview' => phoenix_product_preview($id, $data, is_array($try) ? $try : array()),
        'rate'    => phoenix_rate_value(),
    ));
}

/** همان clean، ولی بدونِ رد شدن — فقط برای پیش‌نمایش */
function phoenix_product_clean_loose(array $in) {
    $plans = array();
    foreach ((isset($in['plans']) && is_array($in['plans']) ? $in['plans'] : array()) as $p) {
        if (!is_array($p)) continue;
        $plans[] = array(
            'id'      => max(0, (int) ($p['id'] ?? 0)),
            'label'   => phoenix_clean_line($p['label'] ?? '', 80),
            'regular' => max(0, (int) ($p['regular'] ?? 0)),
            'sale'    => max(0, (int) ($p['sale'] ?? 0)),
            'pricing' => phoenix_clean_pricing($p['pricing'] ?? array(), true),
        );
    }
    $pricing = phoenix_clean_pricing($in['pricing'] ?? array(), false);
    $pricing['margin'] = isset($in['pricing']['margin']) && is_array($in['pricing']['margin'])
        ? phoenix_margin_sanitize($in['pricing']['margin']) : null;
    return array('pricing' => $pricing, 'plans' => $plans);
}

/* ============================================================
   ذخیره — پنل ← ووکامرس
   ============================================================ */

function phoenix_api_products_save(WP_REST_Request $r) {
    $id = (int) $r['id'];
    $p  = wc_get_product($id);
    if (!$p || $p->is_type('variation')) {
        return phoenix_api_fail('phoenix_not_found', 'این محصول پیدا نشد.', 404);
    }
    if (!current_user_can('edit_product', $id)) {
        return phoenix_api_fail('phoenix_forbidden', 'اجازه‌ی ویرایشِ این محصول را نداری.', 403);
    }

    $clean = phoenix_product_clean((array) $r->get_json_params());
    if (!$clean['ok']) {
        return new WP_Error('phoenix_invalid', 'بعضی فیلدها درست نیستند.', array(
            'status' => 422,
            'errors' => $clean['errors'],
        ));
    }

    $result = phoenix_product_write($p, $clean['data']);
    if (is_wp_error($result)) {
        return $result;
    }
    return phoenix_api_ok(phoenix_product_payload(wc_get_product($id)));
}

/**
 * نوشتنِ داده‌ی پاک‌شده در ووکامرس.
 *
 * ⚠ ترتیب مهم است: اول نوعِ محصول، بعد پدر، بعد پلن‌ها.
 * واریاسیون بدونِ پدرِ متغیر ذخیره نمی‌شود، و ویژگیِ «پلن» باید
 * روی پدر باشد پیش از آنکه واریاسیونی به آن اشاره کند.
 */
function phoenix_product_write($p, array $d) {
    $id       = $p->get_id();
    $variable = count($d['plans']) > 1;

    /* ---------- نوع ----------
       ⚠ نوع را خودِ ‎save()‎ی ووکامرس عوض می‌کند، نه ما.
       ‎update_version_and_type()‎ در انبارِ داده‌ی ووکامرس برچسبِ
       ‎product_type‎ را از کلاسِ شیء می‌نویسد، کشِ نوع را پاک
       می‌کند و ‎woocommerce_product_type_changed‎ را صدا می‌زند —
       که افزونه‌های دیگر به آن گوش می‌دهند. نوشتنِ دستیِ برچسب
       پیش از آن، این رویداد را بی‌صدا می‌خورد. */
    if ($variable && !$p->is_type('variable')) {
        $p = new WC_Product_Variable($id);
    } elseif (!$variable && $p->is_type('variable')) {
        /* پلن‌های اضافه حذف می‌شوند، بعد محصول ساده می‌شود */
        foreach ($p->get_children() as $cid) {
            $v = wc_get_product($cid);
            if ($v) {
                $v->delete(true);
            }
        }
        $p = new WC_Product_Simple($id);
        /* ویژگیِ «پلن» مالِ محصولِ متغیر بود و این‌جا فقط
           برچسبِ بی‌کاری روی صفحه‌ی محصول می‌شد. */
        $p->set_attributes(array());
    }

    /* ---------- پدر ---------- */
    $p->set_name($d['title']);
    $p->set_status($d['status']);
    $p->set_short_description($d['short_description']);
    $p->set_description($d['description']);
    $p->set_virtual(true);
    $p->set_category_ids($d['category'] ? array($d['category']) : array());
    $p->set_tag_ids(phoenix_tag_ids($d['tags']));

    $f = phoenix_get_fields($id);
    $f = array_merge($f, array(
        'english_title'     => $d['english_title'],
        'brand'             => $d['brand'],
        'badges'            => $d['badges'],
        'thumbnail'         => $d['media']['thumbnail'],
        'logo'              => $d['media']['logo'],
        'cover'             => $d['media']['cover'],
        'cutout'            => $d['media']['cutout'],
        'accent'            => $d['media']['accent'],
        'features'          => $d['content']['features'],
        'notes'             => $d['content']['notes'],
        'platforms'         => $d['content']['platforms'],
        'faq'               => $d['content']['faq'],
        'fulfillment'       => $d['delivery']['fulfillment'],
        'delivery_estimate' => $d['delivery']['delivery_estimate'],
        'warranty_label'    => $d['delivery']['warranty_label'],
        'required_inputs'   => $d['delivery']['required_inputs'],
        'price_mode'        => $d['pricing']['mode'],
        'price_locked'      => $d['pricing']['locked'],
    ));
    phoenix_set_or_unset($f, 'cost_usd', $d['pricing']['cost_usd']);
    phoenix_set_or_unset($f, 'cost_toman', $d['pricing']['cost_toman']);

    if ($variable) {
        unset($f['variant_label'], $f['variant_guide'], $f['variant_usd'], $f['variant_duration']);

        $labels = array_column($d['plans'], 'label');
        $attr   = new WC_Product_Attribute();
        $attr->set_name(PHOENIX_PLAN_ATTR);
        $attr->set_options($labels);
        $attr->set_visible(true);
        $attr->set_variation(true);
        $p->set_attributes(array($attr));
    } else {
        $plan = $d['plans'][0];
        $f['variant_label'] = $plan['label'];
        if ($plan['guide']) {
            $f['variant_guide'] = $plan['guide'];
        } else {
            unset($f['variant_guide']);
        }
        phoenix_set_or_unset($f, 'variant_usd', $plan['usd']);
        phoenix_set_or_unset($f, 'variant_duration', $plan['duration_days']);

        $p->set_regular_price((string) $plan['regular']);
        $p->set_sale_price($plan['sale'] > 0 ? (string) $plan['sale'] : '');
        $p->set_manage_stock($plan['stock'] !== null);
        $p->set_stock_quantity($plan['stock'] !== null ? $plan['stock'] : null);
        $p->set_stock_status('instock');
        /* ⚠ پلنِ تک‌محصول تنظیماتِ قیمتِ جدا ندارد؛ قیمت‌گذاری
           همان قیمت‌گذاریِ محصول است. */
    }

    $p->save();
    phoenix_set_fields($id, $f);
    phoenix_psrc_store($id, $d['pricing']['mode'] === 'sources' ? $d['pricing']['sources'] : null);
    $src_owners = $d['pricing']['mode'] === 'sources' ? array($id) : array();

    /* ---------- پلن‌ها ---------- */
    if ($variable) {
        $p     = wc_get_product($id);
        $keys  = array_keys($p->get_attributes());
        $key   = $keys ? $keys[0] : sanitize_title(PHOENIX_PLAN_ATTR);
        $keep  = array();
        $default_label = '';

        foreach ($d['plans'] as $i => $plan) {
            $v = null;
            if ($plan['id'] > 0) {
                $v = wc_get_product($plan['id']);
                /* ⚠ فقط واریاسیونِ همین محصول. شناسه از مرورگر
                   آمده؛ بدونِ این چک، می‌شد با شناسه‌ی واریاسیونِ
                   محصولِ دیگری آن را بازنویسی کرد. */
                if (!$v || !$v->is_type('variation') || (int) $v->get_parent_id() !== $id) {
                    $v = null;
                }
            }
            if (!$v) {
                $v = new WC_Product_Variation();
                $v->set_parent_id($id);
            }

            $v->set_attributes(array($key => $plan['label']));
            $v->set_regular_price((string) $plan['regular']);
            $v->set_sale_price($plan['sale'] > 0 ? (string) $plan['sale'] : '');
            $v->set_manage_stock($plan['stock'] !== null);
            $v->set_stock_quantity($plan['stock'] !== null ? $plan['stock'] : null);
            $v->set_stock_status('instock');
            $v->set_virtual(true);
            $v->set_status('publish');
            $v->set_menu_order($i);
            $vid = $v->save();

            $vf = phoenix_get_fields($vid);
            $vf['label']      = $plan['label'];
            $vf['is_default'] = $plan['is_default'];
            if ($plan['guide']) {
                $vf['guide'] = $plan['guide'];
            } else {
                unset($vf['guide']);
            }
            phoenix_set_or_unset($vf, 'usd', $plan['usd']);
            phoenix_set_or_unset($vf, 'duration_days', $plan['duration_days']);
            if ($plan['pricing']['mode'] === 'inherit') {
                unset($vf['price_mode']);
            } else {
                $vf['price_mode'] = $plan['pricing']['mode'];
            }
            phoenix_set_or_unset($vf, 'cost_usd', $plan['pricing']['cost_usd']);
            phoenix_set_or_unset($vf, 'cost_toman', $plan['pricing']['cost_toman']);
            $vf['price_locked'] = $plan['pricing']['locked'];
            phoenix_set_fields($vid, $vf);
            $own_src = $plan['pricing']['mode'] === 'sources';
            phoenix_psrc_store((int) $vid, $own_src ? $plan['pricing']['sources'] : null);
            if ($own_src) {
                $src_owners[] = (int) $vid;
            }

            $keep[] = (int) $vid;
            if ($plan['is_default']) {
                $default_label = $plan['label'];
            }
        }

        /* پلن‌هایی که از فرم حذف شده‌اند */
        foreach ($p->get_children() as $cid) {
            if (!in_array((int) $cid, $keep, true)) {
                $v = wc_get_product($cid);
                if ($v) {
                    $v->delete(true);
                }
            }
        }

        $p = wc_get_product($id);
        $p->set_default_attributes(array($key => $default_label));
        $p->save();
        WC_Product_Variable::sync($id);
    }

    /* ---------- حاشیه‌ی اختصاصی ---------- */
    $by_prod = (array) phoenix_setting('margin_by_prod', array());
    $before  = isset($by_prod[$id]) ? $by_prod[$id] : null;
    if ($d['pricing']['margin']) {
        $by_prod[$id] = $d['pricing']['margin'];
    } else {
        unset($by_prod[$id]);
    }
    if ($before !== ($by_prod[$id] ?? null)) {
        phoenix_settings_save(array('margin_by_prod' => $by_prod), 'حاشیه‌ی «' . $d['title'] . '»');
    }

    /* ---------- منابع ----------
       ⚠ همین‌جا از منابع خوانده می‌شود، نه در کرونِ بعدی: ادمین
       ذخیره می‌زند و انتظار دارد قیمت همان لحظه از منابع بیاید.
       نتیجه‌ی «بگیر»ِ مرورگر استفاده نمی‌شود — سرور خودش می‌خواند. */
    foreach ($src_owners as $oid) {
        phoenix_psrc_refresh($oid);
    }

    /* ---------- قیمت‌ها ---------- */
    if (phoenix_setting('engine_on')) {
        $rate = phoenix_rate_value();
        $p    = wc_get_product($id);
        foreach ($p->is_type('variable') ? $p->get_children() : array($id) as $pid) {
            phoenix_apply_price((int) $pid, $rate, 'ذخیره از پنل');
        }
    }

    wc_delete_product_transients($id);
    if (function_exists('phoenix_flush_catalog_cache')) {
        phoenix_flush_catalog_cache();
    }
    if (function_exists('phoenix_flush_prices_cache')) {
        phoenix_flush_prices_cache();
    }

    phoenix_audit('product', (string) $id, null, $d['title'], 'ذخیره از پنل');
    return true;
}

/** مقدارِ صفر یعنی «ندارد» — کلید برداشته می‌شود، صفر ذخیره نمی‌شود */
function phoenix_set_or_unset(array &$f, $key, $value) {
    if ($value > 0) {
        $f[$key] = $value;
    } else {
        unset($f[$key]);
    }
}

/** نامِ تگ → شناسه؛ تگِ نبوده ساخته می‌شود */
function phoenix_tag_ids(array $names) {
    $ids = array();
    foreach ($names as $name) {
        $t = get_term_by('name', $name, 'product_tag');
        if (!$t) {
            $new = wp_insert_term($name, 'product_tag');
            if (is_wp_error($new)) {
                continue;
            }
            $ids[] = (int) $new['term_id'];
        } else {
            $ids[] = (int) $t->term_id;
        }
    }
    return $ids;
}

/* ============================================================
   ساخت و زباله‌دان
   ============================================================ */

/**
 * محصولِ تازه — پیش‌نویس، با یک پلن.
 *
 * ⚠ پیش‌نویس، نه منتشرشده. محصولی که تازه عنوان دارد و هنوز
 * قیمت و تصویر ندارد، نباید حتی یک لحظه روی سایت دیده شود.
 */
function phoenix_api_products_create(WP_REST_Request $r) {
    $title = phoenix_clean_line($r['title'], 200);
    if ($title === '') {
        return phoenix_api_fail('phoenix_invalid', 'عنوان خالی است.', 422);
    }
    $p = new WC_Product_Simple();
    $p->set_name($title);
    $p->set_status('draft');
    $p->set_virtual(true);
    $p->set_regular_price('0');
    $id = $p->save();

    phoenix_set_fields($id, array('price_mode' => 'manual', 'variant_label' => 'خرید', 'fulfillment' => 'manual'));
    phoenix_audit('product', (string) $id, null, $title, 'ساخته شد');

    return phoenix_api_ok(phoenix_product_payload(wc_get_product($id)));
}

/**
 * ⚠ زباله‌دان، نه حذف.
 *
 * حذفِ واقعی برگشت ندارد و سفارش‌های قدیمی به محصولِ حذف‌شده
 * اشاره می‌کنند. زباله‌دان سی روز نگهش می‌دارد و از پیشخوانِ
 * ووکامرس برمی‌گردد.
 */
function phoenix_api_products_trash(WP_REST_Request $r) {
    $id = (int) $r['id'];
    $p  = wc_get_product($id);
    if (!$p || $p->is_type('variation')) {
        return phoenix_api_fail('phoenix_not_found', 'این محصول پیدا نشد.', 404);
    }
    if (!current_user_can('delete_product', $id)) {
        return phoenix_api_fail('phoenix_forbidden', 'اجازه‌ی حذفِ این محصول را نداری.', 403);
    }
    wp_trash_post($id);
    phoenix_audit('product', (string) $id, $p->get_name(), null, 'به زباله‌دان رفت');
    return phoenix_api_ok(array('trashed' => $id));
}

/* ============================================================
   دسته‌ها و تگ‌ها
   ============================================================ */

function phoenix_api_terms(WP_REST_Request $r) {
    $cats = array();
    foreach ((array) get_terms(array('taxonomy' => 'product_cat', 'hide_empty' => false)) as $t) {
        if (is_object($t)) {
            $cats[] = array('id' => (int) $t->term_id, 'name' => $t->name, 'parent' => (int) $t->parent, 'count' => (int) $t->count);
        }
    }
    $tags = array();
    foreach ((array) get_terms(array('taxonomy' => 'product_tag', 'hide_empty' => false, 'number' => 300)) as $t) {
        if (is_object($t)) {
            $tags[] = array('id' => (int) $t->term_id, 'name' => $t->name, 'count' => (int) $t->count);
        }
    }
    /* اتصال‌ها برای انتخابِ منبعِ API — اسم و وضعیت، نه کلید */
    $conns = array();
    foreach (phoenix_connections() as $slug => $row) {
        $conns[] = array('slug' => (string) $slug, 'label' => (string) $row['label'], 'key' => phoenix_conn_key_state($row));
    }
    return phoenix_api_ok(array('categories' => $cats, 'tags' => $tags, 'connections' => $conns, 'site' => phoenix_site_url()));
}

/* ============================================================
   منابعِ قیمتِ محصول — «بگیر» و «تأیید»
   ============================================================ */

/**
 * منابعِ همین فرم را همان لحظه بخوان — بدونِ ذخیره.
 *
 * ⚠ سه ثانیه فاصله برای هر کاربر، علاوه بر سقفِ نوشتنِ نگهبان.
 * هر کلیک درخواستِ بیرونی به تأمین‌کننده است.
 */
function phoenix_api_products_sources_fetch(WP_REST_Request $r) {
    $id = (int) $r['id'];
    $p  = wc_get_product($id);
    if (!$p || $p->is_type('variation')) {
        return phoenix_api_fail('phoenix_not_found', 'این محصول پیدا نشد.', 404);
    }
    $in = (array) $r->get_json_params();
    $c  = phoenix_psrc_clean(isset($in['sources']) ? $in['sources'] : array(), array_keys(phoenix_connections()));
    if (!$c['ok']) {
        return new WP_Error('phoenix_invalid', 'بعضی فیلدهای منابع درست نیستند.', array('status' => 422, 'errors' => $c['errors']));
    }

    $lock = 'phoenix_psrc_fetch_' . get_current_user_id();
    if (get_transient($lock)) {
        return phoenix_api_fail('phoenix_busy', 'چند ثانیه صبر کن و دوباره بزن.', 429);
    }
    set_transient($lock, 1, 3);

    $owner   = !empty($in['plan_id']) ? phoenix_plan_owned($id, (int) $in['plan_id']) : $id;
    $prev    = $owner ? phoenix_psrc_state($owner) : array();
    $rate    = phoenix_rate_value();
    $results = phoenix_psrc_fetch($c['data']);

    return phoenix_api_ok(array(
        'results' => $results,
        'pick'    => phoenix_psrc_pick($c['data'], $results, $rate, isset($prev['use']) ? $prev['use'] : null),
        'rate'    => $rate,
    ));
}

/** تأییدِ جهشی که محافظ نگه داشته */
function phoenix_api_products_sources_approve(WP_REST_Request $r) {
    $id = (int) $r['id'];
    $p  = wc_get_product($id);
    if (!$p || $p->is_type('variation')) {
        return phoenix_api_fail('phoenix_not_found', 'این محصول پیدا نشد.', 404);
    }
    $in    = (array) $r->get_json_params();
    $owner = !empty($in['plan_id']) ? phoenix_plan_owned($id, (int) $in['plan_id']) : $id;
    if (!$owner || !phoenix_psrc_approve($owner)) {
        return phoenix_api_fail('phoenix_nothing', 'قیمتی منتظرِ تأیید نیست.', 409);
    }
    if (phoenix_setting('engine_on')) {
        phoenix_psrc_apply_tree($owner, phoenix_rate_value());
    }
    return phoenix_api_ok(phoenix_product_payload(wc_get_product($id)));
}
