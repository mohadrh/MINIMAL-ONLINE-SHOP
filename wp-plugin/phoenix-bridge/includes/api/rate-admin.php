<?php
/**
 * نرخ، منابع و اتصال‌ها — برای صفحه‌ی «منابعِ قیمت» در پنل.
 *
 * ⚠ ستونِ «چرا» مهم‌ترین چیزِ این صفحه است.
 *
 * دیدنِ اینکه نرخ چند شد کافی نیست. سوالی که واقعاً پرسیده
 * می‌شود این است: «چرا این عدد و نه آن یکی؟» — و بدونِ جواب،
 * ادمین به عددی که نمی‌فهمدش اعتماد نمی‌کند و می‌رود سراغِ
 * نرخِ دستی. پس هر منبع می‌گوید چه شد، و دکمه‌ی آزمایش دارد که
 * همان لحظه پاسخِ واقعی‌اش را نشان می‌دهد.
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', 'phoenix_rate_admin_routes');
function phoenix_rate_admin_routes() {
    phoenix_api_route('/rate', 'GET', 'phoenix_api_rate_get');
    phoenix_api_route('/rate', 'POST', 'phoenix_api_rate_save', array(
        'pick'         => array('type' => 'string', 'enum' => array('lowest', 'median', 'average'), 'required' => true),
        'min_sources'  => array('type' => 'integer', 'minimum' => 1, 'maximum' => 10, 'required' => true),
        'spread_max'   => array('type' => 'integer', 'minimum' => 1, 'maximum' => 90, 'required' => true),
        'rate_ttl'     => array('type' => 'integer', 'minimum' => 60, 'maximum' => 86400, 'required' => true),
        'sane_min'     => array('type' => 'integer', 'minimum' => 1000, 'required' => true),
        'sane_max'     => array('type' => 'integer', 'minimum' => 2000, 'required' => true),
        'manual_rate'  => array('type' => 'integer', 'minimum' => 0, 'maximum' => 100000000, 'required' => true),
        'manual_until' => array('type' => 'integer', 'minimum' => 0, 'required' => true),
        'sources'      => array('type' => 'object', 'required' => true),
    ));
    phoenix_api_route('/sources/(?P<slug>[a-z0-9_\-]+)/test', 'POST', 'phoenix_api_source_test');

    /* منابعِ ساخته‌شده در پنل — فقط اسلاگِ ‎p_‎؛ منابعِ داخلی و
       wp-config از این مسیرها ویرایش یا حذف نمی‌شوند. */
    phoenix_api_route('/sources', 'POST', 'phoenix_api_source_create');
    phoenix_api_route('/sources/try', 'POST', 'phoenix_api_source_try');
    phoenix_api_route('/sources/(?P<slug>p_[a-f0-9]{6})', 'POST', 'phoenix_api_source_update');
    phoenix_api_route('/sources/(?P<slug>p_[a-f0-9]{6})', 'DELETE', 'phoenix_api_source_delete');

    phoenix_api_route('/connections', 'POST', 'phoenix_api_conn_create');
    phoenix_api_route('/connections/(?P<slug>k_[a-f0-9]{6})', 'POST', 'phoenix_api_conn_update');
    phoenix_api_route('/connections/(?P<slug>k_[a-f0-9]{6})', 'DELETE', 'phoenix_api_conn_delete');
}

function phoenix_rate_payload() {
    $s       = phoenix_settings();
    $cur     = phoenix_rate_current();
    $health  = phoenix_rate_source_health();
    $flags   = (array) $s['sources'];
    $sources = array();
    $panel   = phoenix_custom_sources();
    $conns   = phoenix_connections();
    $live    = phoenix_rate_sources();

    /* منبعِ پنلی که اتصالش خراب است در ‎$live‎ نیست (کنار رفته)،
       ولی باید در پنل دیده شود تا ادمین درستش کند. */
    foreach ($panel as $slug => $row) {
        if (!isset($live[$slug]) && is_array($row)) {
            $live[$slug] = array('label' => (string) $row['label'], 'url' => (string) $row['url'],
                'path' => (string) $row['path'], 'unit' => (string) $row['unit'], 'origin' => 'panel');
        }
    }

    foreach ($live as $slug => $src) {
        $h   = isset($health[$slug]) ? $health[$slug] : null;
        $row = isset($panel[$slug]) && is_array($panel[$slug]) ? $panel[$slug] : null;
        $cs  = $row ? (string) $row['conn'] : '';
        $sources[] = array(
            'slug'    => $slug,
            'label'   => $src['label'],
            /* ⚠ نشانی بدونِ رشته‌ی پرس‌وجو برای منابعِ داخلی و
               wp-config — اگر کلید در نشانی باشد، در پنل دیده نشود.
               منبعِ پنل را خودِ ادمین نوشته و باید ویرایشش کند. */
            'url'     => $row ? (string) $row['url'] : preg_replace('/\?.*$/', '', $src['url']),
            'path'    => $src['path'],
            'unit'    => $src['unit'],
            'origin'  => isset($src['origin']) ? $src['origin'] : 'builtin',
            'conn'    => $cs,
            'conn_ok' => $cs === '' || (isset($conns[$cs]) && phoenix_conn_key_state($conns[$cs]) === 'ok'),
            'enabled' => !array_key_exists($slug, $flags) || (bool) $flags[$slug],
            'health'  => $h ? array(
                'rate'   => $h->rate === null ? null : (int) $h->rate,
                'ms'     => (int) $h->ms,
                'status' => (string) $h->status,
                'note'   => (string) $h->note,
                'at'     => mysql2date('c', $h->run_at, false),
                'chosen' => (bool) $h->chosen,
            ) : null,
        );
    }

    $all_src = phoenix_rate_sources();
    $slug    = isset($cur['source']) ? (string) $cur['source'] : '';

    $history = array();
    foreach ((array) phoenix_audit_read('rate', 20) as $row) {
        $history[] = array(
            'at'     => mysql2date('c', $row->at, false),
            'before' => $row->before_val === null ? null : (int) $row->before_val,
            'after'  => $row->after_val === null ? null : (int) $row->after_val,
            'note'   => (string) $row->note,
            'actor'  => (string) $row->actor,
        );
    }

    return array(
        'current' => array(
            'value'  => empty($cur['rate']) ? 0 : (int) $cur['rate'],
            'at'     => isset($cur['at']) ? $cur['at'] : null,
            'stale'  => !empty($cur['stale']),
            'source' => $slug === 'manual' ? 'نرخِ دستی' : (isset($all_src[$slug]['label']) ? $all_src[$slug]['label'] : $slug),
            'why'    => phoenix_fa_digits(isset($cur['why']) ? (string) $cur['why'] : ''),
        ),
        'settings' => array(
            'pick'         => (string) $s['pick'],
            'min_sources'  => (int) $s['min_sources'],
            'spread_max'   => (int) $s['spread_max'],
            'rate_ttl'     => (int) $s['rate_ttl'],
            'sane_min'     => (int) $s['sane_min'],
            'sane_max'     => (int) $s['sane_max'],
            'manual_rate'  => (int) $s['manual_rate'],
            'manual_until' => (int) $s['manual_until'],
        ),
        'sources'     => $sources,
        'custom_max'  => PHOENIX_CUSTOM_SOURCES_MAX,
        'connections' => phoenix_conn_payload(),
        'crypto'      => phoenix_secret_method() !== '',
        'series'      => phoenix_dash_series(168),
        'history'     => $history,
    );
}

/**
 * اتصال‌ها برای پنل — اسم، روش، وضعیتِ کلید، و چند جا استفاده شده.
 * ⚠ خودِ کلید هیچ‌وقت.
 */
function phoenix_conn_payload() {
    $out = array();
    foreach (phoenix_connections() as $slug => $row) {
        $out[] = array(
            'slug'   => (string) $slug,
            'label'  => (string) $row['label'],
            'auth'   => (string) $row['auth'],
            'header' => (string) $row['header'],
            'key'    => phoenix_conn_key_state($row),
            'used'   => phoenix_conn_usage($slug),
        );
    }
    return $out;
}

/** چند منبع (نرخ + محصول) از این اتصال استفاده می‌کنند */
function phoenix_conn_usage($slug) {
    global $wpdb;
    $n = 0;
    foreach (phoenix_custom_sources() as $row) {
        if (is_array($row) && isset($row['conn']) && $row['conn'] === $slug) {
            $n++;
        }
    }
    $n += (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key = %s AND meta_value LIKE %s",
        PHOENIX_PSRC_META,
        '%' . $wpdb->esc_like('"' . $slug . '"') . '%'
    ));
    return $n;
}

function phoenix_api_rate_get(WP_REST_Request $r) {
    return phoenix_api_ok(phoenix_rate_payload());
}

function phoenix_api_rate_save(WP_REST_Request $r) {
    if ((int) $r['sane_max'] <= (int) $r['sane_min']) {
        return phoenix_api_fail('phoenix_invalid', 'سقفِ بازه‌ی معقول باید از کفش بیشتر باشد.', 422);
    }

    /* منابع: فقط اسلاگ‌های شناخته‌شده؛ هر چه نیامده روشن می‌ماند */
    $posted = (array) $r['sources'];
    $flags  = array();
    foreach (array_keys(phoenix_rate_sources()) as $slug) {
        $flags[$slug] = array_key_exists($slug, $posted) ? (bool) $posted[$slug] : true;
    }
    if (!array_filter($flags)) {
        return phoenix_api_fail('phoenix_invalid', 'دست‌کم یک منبع باید روشن بماند.', 422);
    }

    $manual = (int) $r['manual_rate'];
    $until  = $manual > 0 ? (int) $r['manual_until'] : 0;
    if ($until > 0 && $until < time()) {
        return phoenix_api_fail('phoenix_invalid', 'تاریخِ انقضای نرخِ دستی گذشته است.', 422);
    }

    phoenix_settings_save(array(
        'pick'         => (string) $r['pick'],
        'min_sources'  => (int) $r['min_sources'],
        'spread_max'   => (int) $r['spread_max'],
        'rate_ttl'     => (int) $r['rate_ttl'],
        'sane_min'     => (int) $r['sane_min'],
        'sane_max'     => (int) $r['sane_max'],
        'sources'      => $flags,
        'manual_rate'  => $manual,
        'manual_until' => $until,
    ), 'از پنل');

    return phoenix_api_ok(phoenix_rate_payload());
}

/**
 * آزمایشِ یک منبع — همان لحظه، بدونِ اثر روی نرخ.
 *
 * ⚠ ده ثانیه فاصله برای هر کاربر.
 *
 * هر آزمایش یک درخواستِ بیرونی به صرافی است. کلیک‌های پشت‌سرهم
 * یعنی درخواست‌های پشت‌سرهم، و بعضی صرافی‌ها IPِ پرتکرار را
 * موقتاً می‌بندند — آن‌وقت کرونِ ساعتِ بعد هم شکست می‌خورد.
 */
function phoenix_api_source_test(WP_REST_Request $r) {
    $slug    = sanitize_key((string) $r['slug']);
    $sources = phoenix_rate_sources();
    if (!isset($sources[$slug])) {
        return phoenix_api_fail('phoenix_not_found', 'این منبع تعریف نشده، یا اتصالش خراب است.', 404);
    }
    if ($busy = phoenix_src_test_lock()) {
        return $busy;
    }
    $res = phoenix_rate_fetch_one($slug, $sources[$slug]);
    return phoenix_api_ok(array(
        'slug'   => $slug,
        'rate'   => $res['rate'],
        'ms'     => (int) $res['ms'],
        'status' => (string) $res['status'],
        'note'   => (string) $res['note'],
    ));
}

/** @return WP_Error|null */
function phoenix_src_test_lock() {
    $key = 'phoenix_src_test_' . get_current_user_id();
    if (get_transient($key)) {
        return phoenix_api_fail('phoenix_busy', 'ده ثانیه صبر کن و دوباره امتحان کن.', 429);
    }
    set_transient($key, 1, 10);
    return null;
}

/* ============================================================
   منابعِ نرخِ ساخته‌شده در پنل
   ============================================================ */

function phoenix_api_invalid(array $errors) {
    return new WP_Error('phoenix_invalid', 'بعضی فیلدها درست نیستند.', array('status' => 422, 'errors' => $errors));
}

function phoenix_api_source_create(WP_REST_Request $r) {
    $clean = phoenix_source_clean((array) $r->get_json_params(), array_keys(phoenix_connections()));
    if (!$clean['ok']) {
        return phoenix_api_invalid($clean['errors']);
    }
    $slug = phoenix_custom_source_save(null, $clean['data']);
    if (is_wp_error($slug)) {
        return phoenix_api_fail($slug->get_error_code(), $slug->get_error_message(), 422);
    }
    return phoenix_api_ok(array_merge(phoenix_rate_payload(), array('saved' => $slug)));
}

function phoenix_api_source_update(WP_REST_Request $r) {
    $slug  = (string) $r['slug'];
    $clean = phoenix_source_clean((array) $r->get_json_params(), array_keys(phoenix_connections()));
    if (!$clean['ok']) {
        return phoenix_api_invalid($clean['errors']);
    }
    $res = phoenix_custom_source_save($slug, $clean['data']);
    if (is_wp_error($res)) {
        return phoenix_api_fail($res->get_error_code(), $res->get_error_message(), 404);
    }
    return phoenix_api_ok(array_merge(phoenix_rate_payload(), array('saved' => $slug)));
}

function phoenix_api_source_delete(WP_REST_Request $r) {
    if (!phoenix_custom_source_delete((string) $r['slug'])) {
        return phoenix_api_fail('phoenix_not_found', 'این منبع پیدا نشد.', 404);
    }
    return phoenix_api_ok(phoenix_rate_payload());
}

/**
 * آزمایش پیش از ذخیره — با همان ‎phoenix_rate_fetch_one‎.
 *
 * ⚠ همان قفلِ ده‌ثانیه‌ایِ دکمه‌ی آزمایش. این مسیر نشانیِ دلخواه
 * می‌گیرد، پس بدونِ سقف می‌شد با آن به هر جایی پشت‌سرهم درخواست
 * فرستاد. نشانیِ داخلی را هم ‎wp_safe_remote_get‎ رد می‌کند.
 */
function phoenix_api_source_try(WP_REST_Request $r) {
    $clean = phoenix_source_clean((array) $r->get_json_params(), array_keys(phoenix_connections()));
    if (!$clean['ok']) {
        return phoenix_api_invalid($clean['errors']);
    }
    $d    = $clean['data'];
    $conn = null;
    if ($d['conn'] !== '') {
        $conn = phoenix_conn_runtime($d['conn']);
        if ($conn === null) {
            return phoenix_api_invalid(array('conn' => 'کلیدِ این اتصال باز نمی‌شود — در بخشِ اتصال‌ها دوباره واردش کن.'));
        }
    }
    if ($busy = phoenix_src_test_lock()) {
        return $busy;
    }
    $res = phoenix_rate_fetch_one('try', array_merge($d, array('conn' => $conn)));
    return phoenix_api_ok(array(
        'rate'   => $res['rate'],
        'ms'     => (int) $res['ms'],
        'status' => (string) $res['status'],
        'note'   => (string) $res['note'],
    ));
}

/* ============================================================
   اتصال‌ها
   ============================================================ */

function phoenix_api_conn_create(WP_REST_Request $r) {
    $clean = phoenix_conn_clean((array) $r->get_json_params(), false);
    if (!$clean['ok']) {
        return phoenix_api_invalid($clean['errors']);
    }
    $slug = phoenix_conn_save(null, $clean['data']);
    if (is_wp_error($slug)) {
        return phoenix_api_fail($slug->get_error_code(), $slug->get_error_message(), 422);
    }
    return phoenix_api_ok(array_merge(phoenix_rate_payload(), array('saved' => $slug)));
}

function phoenix_api_conn_update(WP_REST_Request $r) {
    $slug = (string) $r['slug'];
    $all  = phoenix_connections();
    if (!isset($all[$slug])) {
        return phoenix_api_fail('phoenix_not_found', 'این اتصال پیدا نشد.', 404);
    }
    /* کلیدِ خالی یعنی «همان قبلی» — مگر کلیدِ قبلی دیگر باز نشود */
    $clean = phoenix_conn_clean((array) $r->get_json_params(), phoenix_conn_key_state($all[$slug]) === 'ok');
    if (!$clean['ok']) {
        return phoenix_api_invalid($clean['errors']);
    }
    $res = phoenix_conn_save($slug, $clean['data']);
    if (is_wp_error($res)) {
        return phoenix_api_fail($res->get_error_code(), $res->get_error_message(), 422);
    }
    return phoenix_api_ok(array_merge(phoenix_rate_payload(), array('saved' => $slug)));
}

/**
 * ⚠ اتصالی که جایی استفاده شده حذف نمی‌شود.
 * منبعی که اتصالش ناگهان نباشد، ساعتِ بعد بی‌صدا از کار می‌افتد —
 * و قیمتِ محصول همان‌جا می‌ماند بی‌آنکه کسی بفهمد چرا.
 */
function phoenix_api_conn_delete(WP_REST_Request $r) {
    $slug = (string) $r['slug'];
    $used = phoenix_conn_usage($slug);
    if ($used > 0) {
        return phoenix_api_fail('phoenix_in_use', 'این اتصال در ' . phoenix_fa_digits((string) $used) . ' منبع استفاده شده؛ اول آن‌ها را عوض کن.', 409);
    }
    if (!phoenix_conn_delete($slug)) {
        return phoenix_api_fail('phoenix_not_found', 'این اتصال پیدا نشد.', 404);
    }
    return phoenix_api_ok(phoenix_rate_payload());
}
