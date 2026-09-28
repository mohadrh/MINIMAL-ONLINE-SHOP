<?php
/**
 * APIِ ساختگیِ پنل — برای دیدنِ همه‌ی صفحه‌ها بدونِ وردپرس.
 *
 * ============================================================
 * ⚠ ساختگی فقط جایی که چاره‌ای نیست.
 *
 * ووکامرس و پایگاه داده این‌جا نیستند، پس «انبار» یک فایلِ JSON
 * است (‎.state.json‎، با ‎?reset=1‎ از نو). ولی هر چیزی که
 * *تصمیم* می‌گیرد از خودِ افزونه می‌آید، نه از کپیِ آن:
 *
 *   اعتبارسنجیِ محصول     ‎phoenix_product_clean()‎        product-input.php
 *   پیش‌نمایشِ قیمت      ‎phoenix_product_preview()‎      products.php
 *   فرمولِ قیمت          ‎phoenix_compute_with()‎         pricing.php
 *   تخفیف‌ها              ‎phoenix_discount_*()‎           discounts.php
 *   منابعِ نرخ            ‎phoenix_rate_sources()‎         rate-sources.php
 *
 * پس خطای ۴۲۲ که ویرایشگر نشان می‌دهد همان خطایی است که سرورِ
 * واقعی می‌دهد، و عددِ پیش‌نمایش همان عددی است که موتور می‌نویسد.
 *
 * چیزی که این‌جا آزموده *نمی‌شود*: نوشتن در ووکامرس
 * (‎phoenix_product_write‎). آن فقط روی نصبِ واقعی دیده می‌شود.
 * ============================================================
 */

define('ABSPATH', __DIR__);
define('PHOENIX_BRIDGE_VERSION', '1.3.0');
define('PHOENIX_META_KEY', '_phoenix');
define('PHOENIX_SITE_URL', 'http://127.0.0.1:4330');

/* ============================================================
   وردپرسِ قلابی — فقط آنچه کدِ واقعیِ بالا صدا می‌زند
   ============================================================ */

function add_action() {}
function add_filter() {}
function has_filter() { return false; }
function apply_filters($tag, $v) { return $v; }
function sanitize_key($k) { return preg_replace('/[^a-z0-9_\-]/', '', strtolower((string) $k)); }
function sanitize_text_field($s) {
    $s = preg_replace('@<(script|style)[^>]*?>.*?</\\1>@si', '', (string) $s);
    return trim(preg_replace('/[\r\n\t ]+/', ' ', strip_tags($s)));
}
function sanitize_textarea_field($s) {
    $s = preg_replace('@<(script|style)[^>]*?>.*?</\\1>@si', '', (string) $s);
    return trim(strip_tags($s));
}
function wp_json_encode($v, $f = 0) { return json_encode($v, $f); }
function number_format_i18n($n, $d = 0) { return number_format((float) $n, $d); }
function wp_next_scheduled() { return false; }
function wp_schedule_single_event() { return true; }
/* مثلِ وردپرس: نشانیِ داخلی و خصوصی رد (SSRF) */
function wp_http_validate_url($u) {
    $host = parse_url($u, PHP_URL_HOST);
    if (!filter_var($u, FILTER_VALIDATE_URL) || !$host || preg_match('/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/', $host)) {
        return false;
    }
    return $u;
}
function wp_salt() { return 'harness-salt'; }
function get_current_user_id() { return 1; }
function maybe_unserialize($v) { return $v; }
function get_transient($k) {
    $t = $GLOBALS['S']['transients'][$k] ?? null;
    return ($t && $t[1] > time()) ? $t[0] : false;
}
function set_transient($k, $v, $ttl = 0) { $GLOBALS['S']['transients'][$k] = array($v, time() + $ttl); return true; }
function get_post_meta($id, $key, $single = false) { return $GLOBALS['S']['meta'][(string) $id][$key] ?? ''; }
function update_post_meta($id, $key, $v) { $GLOBALS['S']['meta'][(string) $id][$key] = $v; return true; }
function delete_post_meta($id, $key) { unset($GLOBALS['S']['meta'][(string) $id][$key]); return true; }

class WP_Error {
    private $c; private $m;
    public function __construct($c = '', $m = '', $d = null) { $this->c = $c; $this->m = $m; }
    public function get_error_code() { return $this->c; }
    public function get_error_message() { return $this->m; }
}
function is_wp_error($x) { return $x instanceof WP_Error; }

/**
 * تأمین‌کننده‌های ساختگی — همان پاسخ‌هایی که یک API واقعی می‌دهد.
 * ‎phoenix_source_read()‎ی واقعی رویشان اجرا می‌شود: مسیر، عدد،
 * واحد، راهنمای کلید، و ۴۰۱ برای کلیدِ اشتباه.
 */
function wp_safe_remote_get($url, $args = array()) {
    $h = isset($args['headers']) ? $args['headers'] : array();
    switch (strtok($url, '?')) {
        case 'https://api.supplier-a.example/v1/prices':
            return array('code' => 200, 'body' => json_encode(array('items' => array(
                array('sku' => 'gpt-1m', 'price' => 19.5), array('sku' => 'gpt-3m', 'price' => 56.9),
                array('sku' => 'gpt-team', 'price' => 118), array('sku' => 'spotify-fam', 'price' => 2.6)))));
        case 'https://b2b.supplier-b.example/api/chatgpt':
            if (($h['X-API-Key'] ?? '') !== 'demo-key-b') {
                return array('code' => 401, 'body' => '{"error":"unauthorized"}');
            }
            return array('code' => 200, 'body' => json_encode(array('data' => array('price' => '4,600,000', 'currency' => 'IRT'))));
        case 'https://api.supplier-c.example/gemini':
            return array('code' => 200, 'body' => json_encode(array('price_toman' => 1480000, 'updated' => '2026-09-28')));
        case 'https://api.my-exchange.example/ticker':
            return array('code' => 200, 'body' => json_encode(array('data' => array('USDT' => array('price' => '2268000')))));
    }
    return new WP_Error('http_request_failed', 'cURL error 6: Could not resolve host: ' . parse_url($url, PHP_URL_HOST));
}
function wp_remote_retrieve_response_code($r) { return $r['code']; }
function wp_remote_retrieve_body($r) { return $r['body']; }
function wp_parse_url($u) { return parse_url($u); }
function home_url() { return 'https://panel.phonixmarket.com'; }
function get_ancestors() { return array(); }

function wp_get_post_parent_id($id) {
    foreach ($GLOBALS['S']['products'] as $p) {
        foreach ($p['plans'] as $pl) {
            if ((int) $pl['id'] === (int) $id && count($p['plans']) > 1) {
                return (int) $p['id'];
            }
        }
    }
    return 0;
}

function get_the_terms($id, $tax) {
    $p = h_product((int) $id);
    if (!$p) {
        return false;
    }
    if ($tax === 'product_cat') {
        $c = h_cat($p['category']);
        return $c ? array((object) array('term_id' => $c['id'], 'name' => $c['name'])) : false;
    }
    $out = array();
    foreach ($p['tags'] as $name) {
        foreach (h_tags() as $t) {
            if ($t['name'] === $name) {
                $out[] = (object) array('term_id' => $t['id'], 'name' => $name);
            }
        }
    }
    return $out ? $out : false;
}

/* ---------- تنظیمات و دفترِ رویداد، روی انبارِ JSON ---------- */

function phoenix_margin_defaults() {
    return array('percent' => 18.0, 'fixed' => 0, 'min_profit' => 0,
                 'round_to' => 1000, 'round_mode' => 'up', 'charm' => 0);
}
function phoenix_settings() { return $GLOBALS['S']['settings']; }
function phoenix_setting($k, $f = null) {
    $s = phoenix_settings();
    return array_key_exists($k, $s) ? $s[$k] : $f;
}
function phoenix_settings_save(array $patch, $note = '') {
    foreach ($patch as $k => $v) {
        $before = isset($GLOBALS['S']['settings'][$k]) ? $GLOBALS['S']['settings'][$k] : null;
        if ($before !== $v) {
            /* همان سانسورِ db.phpِ واقعی: متنِ رمزشده به تاریخچه نمی‌رود */
            phoenix_audit('setting', $k, h_scalar(phoenix_audit_redact($k, $before)), h_scalar(phoenix_audit_redact($k, $v)), $note);
        }
        $GLOBALS['S']['settings'][$k] = $v;
    }
}
function phoenix_audit($kind, $subject, $before, $after, $note = '') {
    array_unshift($GLOBALS['S']['log'], array(
        'at' => gmdate('c'), 'kind' => $kind, 'actor' => 'مدیر', 'subject' => (string) $subject,
        'before' => $before === null ? null : (string) $before,
        'after' => $after === null ? null : (string) $after, 'note' => (string) $note,
    ));
}
function h_scalar($v) {
    if (is_bool($v)) return $v ? 'true' : 'false';
    if (is_array($v)) return json_encode($v, JSON_UNESCAPED_UNICODE);
    return $v === null ? null : (string) $v;
}
function phoenix_rate_value() {
    $s = $GLOBALS['S']['settings'];
    if ($s['manual_rate'] > 0 && (!$s['manual_until'] || $s['manual_until'] > time())) {
        return (int) $s['manual_rate'];
    }
    return (int) $GLOBALS['S']['rate']['value'];
}
function phoenix_get_fields($id) { return array(); }

/* ============================================================
   کدِ واقعیِ افزونه
   ============================================================ */

$inc = __DIR__ . '/../../phoenix-bridge/includes/';
require_once $inc . 'connections.php';
require_once $inc . 'rate-sources.php';
require_once $inc . 'rate-custom.php';
require_once $inc . 'discounts.php';
require_once $inc . 'pricing.php';
require_once $inc . 'product-sources.php';
require_once $inc . 'api/dashboard.php';
require_once $inc . 'api/product-input.php';
require_once $inc . 'api/products.php';

/* ============================================================
   انبار
   ============================================================ */

$STATE = __DIR__ . '/.state.json';
if (!empty($_GET['reset']) || !is_file($STATE)) {
    $GLOBALS['S'] = h_seed();
    h_seed_after();
} else {
    $GLOBALS['S'] = json_decode((string) file_get_contents($STATE), true);
    if (!is_array($GLOBALS['S'])) {
        $GLOBALS['S'] = h_seed();
        h_seed_after();
    }
}

/* منابعِ نمونه: ChatGPT از سه جا (یکی با کلید)، و Gemini با جهشی که
   محافظ نگهش می‌دارد. وضعیت‌شان با همان ‎phoenix_psrc_refresh‎ی
   واقعی ساخته می‌شود. */
function h_seed_after() {
    $GLOBALS['S']['settings']['connections'] = array(
        'k_b0b0b0' => array('label' => 'تأمین‌کننده ب', 'auth' => 'header', 'header' => 'X-API-Key',
                            'key_enc' => phoenix_secret_encrypt('demo-key-b')),
    );
    update_post_meta(142, PHOENIX_PSRC_META, array(
        'list' => array(
            array('id' => 'sa1', 'label' => 'تأمین‌کننده الف', 'kind' => 'api', 'url' => 'https://api.supplier-a.example/v1/prices',
                  'path' => 'items.[].sku=gpt-1m.price', 'conn' => '', 'unit' => 'usd', 'value' => 0, 'on' => true),
            array('id' => 'sb1', 'label' => 'تأمین‌کننده ب', 'kind' => 'api', 'url' => 'https://b2b.supplier-b.example/api/chatgpt',
                  'path' => 'data.price', 'conn' => 'k_b0b0b0', 'unit' => 'toman', 'value' => 0, 'on' => true),
            array('id' => 'sc1', 'label' => 'قیمتِ تلگرامیِ ج', 'kind' => 'fixed', 'url' => '', 'path' => '', 'conn' => '',
                  'unit' => 'toman', 'value' => 4700000, 'on' => true),
        ),
        'pick' => 'lowest', 'pinned' => '', 'max_jump' => 30,
    ));
    phoenix_psrc_refresh(142);

    update_post_meta(144, PHOENIX_PSRC_META, array(
        'list' => array(
            array('id' => 'sg1', 'label' => 'تأمین‌کننده ج', 'kind' => 'api', 'url' => 'https://api.supplier-c.example/gemini',
                  'path' => 'price_toman', 'conn' => '', 'unit' => 'toman', 'value' => 0, 'on' => true),
        ),
        'pick' => 'lowest', 'pinned' => '', 'max_jump' => 30,
    ));
    update_post_meta(144, PHOENIX_PSRC_STATE, array('use' => array('value' => 690000, 'unit' => 'toman', 'from' => 'sg1', 'at' => gmdate('c', time() - 86400))));
    phoenix_psrc_refresh(144);
}

function h_cats() {
    return array(
        array('id' => 10, 'name' => 'هوش مصنوعی', 'parent' => 0, 'count' => 3),
        array('id' => 11, 'name' => 'طراحی و تدوین', 'parent' => 0, 'count' => 2),
        array('id' => 12, 'name' => 'موسیقی و سرگرمی', 'parent' => 0, 'count' => 2),
        array('id' => 13, 'name' => 'پیام‌رسان', 'parent' => 0, 'count' => 1),
        array('id' => 14, 'name' => 'آموزش', 'parent' => 0, 'count' => 1),
    );
}
function h_cat($id) {
    foreach (h_cats() as $c) {
        if ($c['id'] === (int) $id) return $c;
    }
    return null;
}
function h_tags() {
    $names = array('هوش مصنوعی', 'طراحی', 'پرفروش', 'اشتراک', 'موسیقی', 'برنامه‌نویسی', 'تدوین', 'زبان');
    $out = array();
    foreach ($names as $i => $n) {
        $out[] = array('id' => 100 + $i, 'name' => $n, 'count' => 1);
    }
    return $out;
}

function h_plan($id, $label, $regular, $sale = 0, array $pricing = array(), $extra = array()) {
    return array_merge(array(
        'id' => $id, 'label' => $label, 'regular' => $regular, 'sale' => $sale, 'stock' => null,
        'usd' => 0, 'guide' => null, 'is_default' => false,
        'pricing' => array_merge(array('mode' => 'inherit', 'cost_usd' => 0, 'cost_toman' => 0, 'locked' => false), $pricing),
    ), $extra);
}

function h_prod($id, $title, $en, $cat, $slug, $logo, $accent, array $pricing, array $plans, array $extra = array()) {
    $plans[0]['is_default'] = true;
    return array_replace_recursive(array(
        'id' => $id, 'title' => $title, 'status' => 'publish', 'slug' => $slug,
        'english_title' => $en, 'brand' => $en, 'category' => $cat, 'tags' => array(),
        'short_description' => '', 'description' => '', 'badges' => array(),
        'media' => array('thumbnail' => '/products/' . $slug . '-thumb.webp', 'logo' => '/brand/logos/' . $logo,
                         'cover' => '/products/' . $slug . '-card.webp', 'cutout' => '', 'accent' => $accent),
        'content' => array('features' => array(), 'notes' => array(), 'platforms' => array('Web', 'iOS', 'Android'), 'faq' => array()),
        'delivery' => array('fulfillment' => 'upgrade_on_user', 'delivery_estimate' => '۱۵ دقیقه تا ۲ ساعت',
                            'warranty_label' => 'گارانتیِ کاملِ دوره', 'required_inputs' => array(
                                array('key' => 'email', 'label' => 'ایمیلِ اکانت', 'type' => 'email', 'hint' => '', 'example' => 'you@mail.com'))),
        'pricing' => array_merge(array('mode' => 'manual', 'cost_usd' => 0, 'cost_toman' => 0, 'locked' => false), $pricing),
        'plans' => $plans,
        'updated' => gmdate('c', time() - $id * 3700),
    ), $extra);
}

function h_seed() {
    $settings = array(
        'engine_on' => true, 'auto_fulfil' => false, 'sources' => array(), 'pick' => 'lowest',
        'min_sources' => 2, 'rate_ttl' => 600, 'sane_min' => 10000, 'sane_max' => 10000000,
        'spread_max' => 25, 'manual_rate' => 0, 'manual_until' => 0,
        'margin' => phoenix_margin_defaults(), 'margin_by_cat' => array('10' => array('percent' => 22.0, 'round_to' => 1000, 'round_mode' => 'up', 'charm' => 0, 'fixed' => 0, 'min_profit' => 20000)),
        'margin_by_prod' => array(), 'discounts' => array(), 'floor_percent' => 5, 'cart_lock_min' => 30,
        'fulfil_daily_cap' => 0, 'fulfil_fail_stop' => 3,
        'custom_sources' => array(), 'connections' => array(),
    );

    $products = array(
        h_prod(142, 'چت‌جی‌پی‌تی پلاس', 'ChatGPT Plus', 10, 'chatgpt', 'openai.svg', '#10a37f',
            array('mode' => 'sources'),
            array(h_plan(1421, 'یک‌ماهه', 0), h_plan(1422, 'سه‌ماهه', 0, 0, array('mode' => 'usd', 'cost_usd' => 58)),
                  h_plan(1423, 'تیمی (۵ نفر)', 0, 0, array('mode' => 'usd', 'cost_usd' => 125), array('guide' => array('fit' => 'تیم‌های کوچک', 'detail' => 'پنج صندلی با مدیریتِ متمرکز')))),
            array('badges' => array('bestseller'), 'tags' => array('هوش مصنوعی', 'پرفروش'),
                  'content' => array('features' => array('GPT-5 بدونِ محدودیتِ روزانه', 'ساختِ تصویر', 'حالتِ صوتیِ پیشرفته'),
                                     'faq' => array(array('q' => 'روی اکانتِ خودم فعال می‌شود؟', 'a' => 'بله، ایمیلِ اکانتت را می‌گیریم و روی همان ارتقا می‌دهیم.'))))),
        h_prod(143, 'کلود پرو', 'Claude Pro', 10, 'claude-pro', 'claude.svg', '#d97757',
            array('mode' => 'usd', 'cost_usd' => 21),
            array(h_plan(0, 'یک‌ماهه', 0)),
            array('tags' => array('هوش مصنوعی', 'برنامه‌نویسی'))),
        h_prod(144, 'جمینای پرو', 'Gemini Pro', 10, 'gemini-pro', 'gemini.svg', '#4f7cff',
            array('mode' => 'sources'),
            array(h_plan(0, 'یک‌ماهه', 0))),
        h_prod(145, 'کانوا پرو', 'Canva Pro', 11, 'canva-pro', 'canva.svg', '#7d2ae8',
            array('mode' => 'manual'),
            array(h_plan(1451, 'یک‌ماهه', 249000), h_plan(1452, 'یک‌ساله', 1890000, 1690000)),
            array('badges' => array('hot'), 'tags' => array('طراحی'))),
        h_prod(146, 'کپ‌کات پرو', 'CapCut Pro', 11, 'capcut-pro', 'capcut.svg', '#111111',
            array('mode' => 'usd', 'cost_usd' => 9.99, 'locked' => true),
            array(h_plan(0, 'یک‌ماهه', 590000)),
            array('tags' => array('تدوین'))),
        h_prod(147, 'اسپاتیفای پریمیوم', 'Spotify Premium', 12, 'spotify-premium', 'spotify.svg', '#1db954',
            array('mode' => 'toman', 'cost_toman' => 320000),
            array(h_plan(1471, 'انفرادی', 0), h_plan(1472, 'خانوادگی', 0, 0, array('mode' => 'toman', 'cost_toman' => 610000))),
            array('tags' => array('موسیقی', 'اشتراک'))),
        h_prod(148, 'تلگرام پریمیوم', 'Telegram Premium', 13, 'telegram-premium', 'telegram.svg', '#2aabee',
            array('mode' => 'usd', 'cost_usd' => 4.99),
            array(h_plan(1481, 'سه‌ماهه', 0, 0, array('mode' => 'usd', 'cost_usd' => 13.99)), h_plan(1482, 'شش‌ماهه', 0, 0, array('mode' => 'usd', 'cost_usd' => 18.99)), h_plan(1483, 'یک‌ساله', 0, 0, array('mode' => 'usd', 'cost_usd' => 33.99))),
            array('delivery' => array('fulfillment' => 'api_topup', 'required_inputs' => array(
                array('key' => 'telegram_id', 'label' => 'آیدیِ تلگرام', 'type' => 'username', 'hint' => 'بدونِ @', 'example' => 'phoenix'))))),
        h_prod(149, 'دولینگو سوپر', 'Duolingo Super', 14, 'duolingo-super', 'duolingo.svg', '#58cc02',
            array('mode' => 'manual'),
            array(h_plan(0, 'یک‌ساله', 890000)),
            array('status' => 'draft', 'tags' => array('زبان'))),
    );

    $by_id = array();
    foreach ($products as $p) {
        $by_id[(string) $p['id']] = $p;
    }

    $now = time();
    return array(
        'settings' => $settings,
        'rate'     => array('value' => 226500, 'at' => gmdate('c', $now - 480), 'source' => 'wallex',
                            'why' => 'کمترین از 4 منبعِ سالم — cron'),
        'products' => $by_id,
        'next_id'  => 500,
        'coupons'  => array(
            array('code' => 'PHX-VIP-7K2Q', 'type' => 'percent', 'value' => 15, 'used' => 0, 'limit' => 1,
                  'email' => 'sara@example.com', 'expires' => gmdate('c', $now + 86400 * 6)),
        ),
        'queue' => array(
            array('id' => 31, 'order_id' => 1204, 'product' => 'چت‌جی‌پی‌تی پلاس', 'qty' => 1, 'mode' => 'ارتقای اکانتِ خودِ مشتری',
                  'inputs' => array(array('key' => 'email', 'value' => 'ali.r@example.com')), 'status' => 'pending', 'tries' => 0,
                  'created' => gmdate('c', $now - 1500), 'note' => ''),
            array('id' => 30, 'order_id' => 1203, 'product' => 'تلگرام پریمیوم', 'qty' => 2, 'mode' => 'شارژ خودکار',
                  'inputs' => array(array('key' => 'telegram_id', 'value' => 'mina_dev')), 'status' => 'failed', 'tries' => 3,
                  'created' => gmdate('c', $now - 7200), 'note' => 'تأمین‌کننده پاسخ نداد (timeout بعد از ۲۰ ثانیه).'),
            array('id' => 29, 'order_id' => 1199, 'product' => 'اسپاتیفای پریمیوم', 'qty' => 1, 'mode' => 'دستی',
                  'inputs' => array(), 'status' => 'done', 'tries' => 1, 'created' => gmdate('c', $now - 86400), 'note' => ''),
        ),
        'log' => h_seed_log($now),
        'src_test_at' => 0,
        'meta' => array(),
        'transients' => array(),
    );
}

function h_seed_log($now) {
    $rows = array();
    $kinds = array(
        array('rate', 'refresh', '225100', '226500', 'کمترین از ۴ منبعِ سالم — cron'),
        array('price', '142', '1766000', '1799000', 'بازنویسیِ دسته‌جمعی'),
        array('setting', 'engine_on', 'false', 'true', 'از پنل'),
        array('discount', 'coupon:PHX-VIP-7K2Q', null, '15٪', 'کدِ اختصاصی ساخته شد'),
        array('queue', 'job:29', 'pending', 'done', 'دستی از پنل'),
        array('product', '145', null, 'کانوا پرو', 'ذخیره از پنل'),
        array('setting', 'margin', '{"percent":18}', '{"percent":22}', 'از پنل'),
    );
    for ($i = 0; $i < 52; $i++) {
        $k = $kinds[$i % count($kinds)];
        $rows[] = array('at' => gmdate('c', $now - $i * 5400 - 300), 'kind' => $k[0], 'actor' => $i % 3 ? 'system' : 'mohadrh',
                        'subject' => $k[1], 'before' => $k[2], 'after' => $k[3], 'note' => $k[4]);
    }
    return $rows;
}

/* ============================================================
   پاسخ
   ============================================================ */

function h_ok($data) {
    h_send(200, array('ok' => true, 'data' => $data));
}
function h_fail($code, $message, $status, array $extra = array()) {
    h_send($status, array('code' => $code, 'message' => $message, 'data' => array_merge(array('status' => $status), $extra)));
}
function h_send($status, $body) {
    file_put_contents($GLOBALS['STATE'], json_encode($GLOBALS['S'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

/* ============================================================
   محصولات
   ============================================================ */

function h_product($id) {
    return isset($GLOBALS['S']['products'][(string) $id]) ? $GLOBALS['S']['products'][(string) $id] : null;
}

/** همان شکلِ ‎phoenix_product_row()‎ */
function h_row(array $p) {
    $engine = false; $locked = false; $modes = array(); $final = null; $min = null;
    $margin = phoenix_margin_for($p['id']);
    foreach ($p['plans'] as $pl) {
        $mode = $pl['pricing']['mode'] === 'inherit' ? $p['pricing']['mode'] : $pl['pricing']['mode'];
        $modes[$mode] = true;
        $lk = $p['pricing']['locked'] || $pl['pricing']['locked'];
        $price = $pl['sale'] > 0 ? $pl['sale'] : $pl['regular'];
        if ($lk) { $locked = true; }
        elseif ($mode !== 'manual') {
            if ($mode === 'sources') { $modes['sources'] = true; }
            $engine = true;
            $c = phoenix_compute_with(h_cost($p, $pl), $margin, $pl['id'] ?: $p['id']);
            if ($c) {
                $price = $c['final'];
                if ($final === null || $c['final'] < $final) $final = $c['final'];
            }
        }
        if ($price > 0 && ($min === null || $price < $min)) $min = $price;
    }
    $cat = h_cat($p['category']);
    $thumb = $p['media']['logo'] ?: $p['media']['thumbnail'];
    return array(
        'id' => $p['id'], 'title' => $p['title'], 'english_title' => $p['english_title'],
        'thumb' => $thumb ? phoenix_media_url($thumb) : '', 'accent' => $p['media']['accent'],
        'category' => $cat ? array('id' => $cat['id'], 'name' => $cat['name']) : null,
        'status' => $p['status'], 'plans' => count($p['plans']), 'price' => (int) $min,
        'on_sale' => (bool) array_filter(array_column($p['plans'], 'sale')), 'in_stock' => true,
        'mode' => count($modes) > 1 ? 'mixed' : (string) key($modes),
        'engine' => $engine, 'locked' => $locked, 'engine_final' => $final, 'updated' => $p['updated'],
    );
}

function h_cost(array $p, array $pl) {
    $own  = count($p['plans']) > 1 && $pl['pricing']['mode'] !== 'inherit';
    $mode = $own ? $pl['pricing']['mode'] : $p['pricing']['mode'];
    if ($mode === 'sources') {
        $c = phoenix_psrc_cost($own ? $pl['id'] : $p['id']);
        return array_merge($c ?: array('mode' => 'manual', 'usd' => 0, 'toman' => 0),
            array('locked' => $p['pricing']['locked'] || ($own && $pl['pricing']['locked']), 'via' => 'sources'));
    }
    return array(
        'mode'   => $mode,
        'usd'    => phoenix_effective_cost($p['pricing'], $pl['pricing'], 'cost_usd'),
        'toman'  => phoenix_effective_cost($p['pricing'], $pl['pricing'], 'cost_toman'),
        'locked' => $p['pricing']['locked'] || $pl['pricing']['locked'],
    );
}

/** همان شکلِ ‎phoenix_product_payload()‎ */
function h_payload(array $p) {
    $by = (array) phoenix_setting('margin_by_prod', array());
    $out = $p;
    unset($out['slug'], $out['updated']);
    $out['permalink'] = PHOENIX_SITE_URL . '/product/' . $p['slug'] . '/';
    $out['pricing']['margin'] = isset($by[(string) $p['id']]) ? phoenix_margin_sanitize((array) $by[(string) $p['id']]) : null;
    $out['pricing']['sources'] = phoenix_psrc_config($p['id']) ?: phoenix_psrc_blank();
    $out['pricing']['sources_state'] = phoenix_psrc_state_public($p['id']);
    foreach ($out['plans'] as &$pl) {
        $pl['pricing']['sources'] = ($pl['id'] ? phoenix_psrc_config($pl['id']) : null) ?: phoenix_psrc_blank();
        $pl['pricing']['sources_state'] = $pl['id'] ? phoenix_psrc_state_public($pl['id']) : null;
    }
    unset($pl);
    $out['engine_on'] = (bool) phoenix_setting('engine_on');
    $out['preview'] = phoenix_product_preview($p['id'], $out);
    return $out;
}

/* ============================================================
   مسیرها
   ============================================================ */

$path   = substr((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), strlen('/__api'));
$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode((string) file_get_contents('php://input'), true);
$body   = is_array($body) ? $body : array();
$q      = $_GET;

if (($_SERVER['HTTP_X_WP_NONCE'] ?? '') !== 'test-nonce') {
    h_fail('rest_cookie_invalid_nonce', 'Cookie check failed', 403);
}

/* ---------- داشبورد — از fixtures، مثلِ قبل ---------- */

if ($path === '/dashboard' || $path === '/engine' || $path === '/rate/refresh') {
    $fx = json_decode((string) file_get_contents(__DIR__ . '/fixtures.json'), true);
    $sc = $_SERVER['HTTP_X_HARNESS_SCENARIO'] ?? 'healthy';
    $d  = $fx[isset($fx[$sc]) ? $sc : 'healthy'];
    if ($path === '/engine') {
        phoenix_settings_save(array('engine_on' => !empty($body['on'])), 'از پنل');
    }
    $d['state']['engine']['on'] = (bool) phoenix_setting('engine_on');
    h_ok($d);
}
if ($path === '/prefs') {
    h_ok(array('theme' => $body['theme'] ?? 'system'));
}

/* ---------- محصولات ---------- */

if ($path === '/products' && $method === 'GET') {
    $rows = array();
    $products = $GLOBALS['S']['products'];
    uasort($products, function ($a, $b) { return strcmp($b['updated'], $a['updated']); });
    foreach ($products as $p) {
        $s = trim((string) ($q['search'] ?? ''));
        if ($s !== '' && mb_stripos($p['title'] . ' ' . $p['english_title'], $s) === false) continue;
        if (!empty($q['category']) && (int) $q['category'] !== (int) $p['category']) continue;
        if (!empty($q['status']) && $q['status'] !== $p['status']) continue;
        $row = h_row($p);
        $m = $q['mode'] ?? '';
        if ($m === 'engine' && !$row['engine']) continue;
        if ($m === 'manual' && ($row['engine'] || $row['locked'])) continue;
        if ($m === 'locked' && !$row['locked']) continue;
        $rows[] = $row;
    }
    $per = 5; /* کوچک، تا صفحه‌بندی هم دیده شود */
    $page = max(1, (int) ($q['page'] ?? 1));
    h_ok(array('rows' => array_slice($rows, ($page - 1) * $per, $per), 'total' => count($rows), 'page' => $page,
               'pages' => max(1, (int) ceil(count($rows) / $per)), 'rate' => phoenix_rate_value(),
               'engine_on' => (bool) phoenix_setting('engine_on')));
}

if ($path === '/products' && $method === 'POST') {
    $title = phoenix_clean_line($body['title'] ?? '', 200);
    if ($title === '') h_fail('phoenix_invalid', 'عنوان خالی است.', 422);
    $id = $GLOBALS['S']['next_id']++;
    $p = h_prod($id, $title, '', 0, 'new-' . $id, '', '', array('mode' => 'manual'), array(h_plan(0, 'خرید', 0)),
        array('status' => 'draft', 'media' => array('thumbnail' => '', 'logo' => '', 'cover' => '', 'accent' => ''),
              'content' => array('platforms' => array()), 'delivery' => array('fulfillment' => 'manual', 'delivery_estimate' => '', 'warranty_label' => '', 'required_inputs' => array()),
              'updated' => gmdate('c')));
    /* array_replace_recursive آرایه‌ی خالی را جایگزین نمی‌کند */
    $p['media'] = array('thumbnail' => '', 'logo' => '', 'cover' => '', 'cutout' => '', 'accent' => '');
    $p['content']['platforms'] = array();
    $p['delivery']['required_inputs'] = array();
    $GLOBALS['S']['products'][(string) $id] = $p;
    phoenix_audit('product', (string) $id, null, $title, 'ساخته شد');
    h_ok(h_payload($p));
}

if (preg_match('#^/products/(\d+)$#', $path, $m)) {
    $p = h_product((int) $m[1]);
    if (!$p) h_fail('phoenix_not_found', 'این محصول پیدا نشد.', 404);

    if ($method === 'GET') h_ok(h_payload($p));

    if ($method === 'DELETE') {
        unset($GLOBALS['S']['products'][(string) $p['id']]);
        phoenix_audit('product', (string) $p['id'], $p['title'], null, 'به زباله‌دان رفت');
        h_ok(array('trashed' => $p['id']));
    }

    /* ذخیره — از همان دروازه‌ی واقعی */
    $clean = phoenix_product_clean($body);
    if (!$clean['ok']) {
        h_fail('phoenix_invalid', 'بعضی فیلدها درست نیستند.', 422, array('errors' => $clean['errors']));
    }
    $d = $clean['data'];
    $old_ids = array_map('intval', array_column($p['plans'], 'id'));
    $multi = count($d['plans']) > 1;
    foreach ($d['plans'] as $i => &$pl) {
        /* مثلِ ‎phoenix_product_write‎: فقط پلنِ خودِ همین محصول */
        if (!$multi) { $pl['id'] = 0; continue; }
        if (!$pl['id'] || !in_array((int) $pl['id'], $old_ids, true)) {
            $pl['id'] = $GLOBALS['S']['next_id']++;
        }
    }
    unset($pl);
    $margin = $d['pricing']['margin'];
    unset($d['pricing']['margin']);
    $by = (array) phoenix_setting('margin_by_prod', array());
    if ($margin) { $by[(string) $p['id']] = $margin; } else { unset($by[(string) $p['id']]); }
    if ($by !== (array) phoenix_setting('margin_by_prod', array())) {
        phoenix_settings_save(array('margin_by_prod' => $by), 'حاشیه‌ی «' . $d['title'] . '»');
    }
    /* پیکربندیِ منابع جدا از محصول، مثلِ ‎_phoenix_sources‎ی واقعی */
    phoenix_psrc_store($p['id'], $d['pricing']['mode'] === 'sources' ? $d['pricing']['sources'] : null);
    $owners = $d['pricing']['mode'] === 'sources' ? array($p['id']) : array();
    foreach ($d['plans'] as $pl) {
        if ($pl['id']) {
            $own = $multi && $pl['pricing']['mode'] === 'sources';
            phoenix_psrc_store($pl['id'], $own ? $pl['pricing']['sources'] : null);
            if ($own) { $owners[] = $pl['id']; }
        }
    }
    unset($d['pricing']['sources']);
    $GLOBALS['S']['products'][(string) $p['id']] = array_merge($p, $d, array('updated' => gmdate('c')));
    foreach ($owners as $oid) { phoenix_psrc_refresh($oid); }
    phoenix_audit('product', (string) $p['id'], null, $d['title'], 'ذخیره از پنل');
    h_ok(h_payload($GLOBALS['S']['products'][(string) $p['id']]));
}

if (preg_match('#^/products/(\d+)/preview$#', $path, $m)) {
    $clean = phoenix_product_clean($body);
    $data  = $clean['ok'] ? $clean['data'] : phoenix_product_clean_loose($body);
    $try = isset($body['_try']) && is_array($body['_try']) ? $body['_try'] : array();
    h_ok(array('preview' => phoenix_product_preview((int) $m[1], $data, $try), 'rate' => phoenix_rate_value()));
}

if ($path === '/terms') {
    $conns = array();
    foreach (phoenix_connections() as $slug => $row) {
        $conns[] = array('slug' => $slug, 'label' => $row['label'], 'key' => phoenix_conn_key_state($row));
    }
    h_ok(array('categories' => h_cats(), 'tags' => h_tags(), 'connections' => $conns, 'site' => PHOENIX_SITE_URL));
}

/* ---------- نرخ و منابع ---------- */

function h_rate_payload() {
    $s = phoenix_settings();
    $health = array(
        'nobitex'  => array('rate' => 227100, 'ms' => 412, 'status' => 'ok', 'note' => ''),
        'wallex'   => array('rate' => 226500, 'ms' => 288, 'status' => 'ok', 'note' => ''),
        'bitpin'   => array('rate' => 227900, 'ms' => 655, 'status' => 'ok', 'note' => ''),
        'ramzinex' => array('rate' => null, 'ms' => 10000, 'status' => 'net', 'note' => 'پاسخ در ۱۰ ثانیه نیامد'),
    );
    $sources = array();
    foreach (phoenix_rate_sources() as $slug => $src) {
        $h = $health[$slug] ?? null;
        $row = $GLOBALS['S']['settings']['custom_sources'][$slug] ?? null;
        $sources[] = array(
            'slug' => $slug, 'label' => $src['label'], 'url' => $row ? $row['url'] : preg_replace('/\?.*$/', '', $src['url']),
            'unit' => $src['unit'], 'path' => $src['path'], 'origin' => $src['origin'],
            'conn' => $row ? $row['conn'] : '', 'conn_ok' => true,
            'enabled' => !array_key_exists($slug, (array) $s['sources']) || (bool) $s['sources'][$slug],
            'health' => $h ? array_merge($h, array('at' => $GLOBALS['S']['rate']['at'], 'chosen' => $slug === $GLOBALS['S']['rate']['source'])) : null,
        );
    }
    $fx = json_decode((string) file_get_contents(__DIR__ . '/fixtures.json'), true);
    $history = array();
    foreach ($GLOBALS['S']['log'] as $row) {
        if ($row['kind'] === 'rate' && count($history) < 20) {
            $history[] = array('at' => $row['at'], 'before' => $row['before'] === null ? null : (int) $row['before'],
                               'after' => $row['after'] === null ? null : (int) $row['after'], 'note' => $row['note'], 'actor' => $row['actor']);
        }
    }
    $manual = $s['manual_rate'] > 0 && (!$s['manual_until'] || $s['manual_until'] > time());
    $all = phoenix_rate_sources();
    $slug = $GLOBALS['S']['rate']['source'];
    return array(
        'current' => array(
            'value' => phoenix_rate_value(), 'at' => $GLOBALS['S']['rate']['at'], 'stale' => false,
            'source' => $manual ? 'نرخِ دستی' : ($all[$slug]['label'] ?? $slug),
            'why' => phoenix_fa_digits($manual ? 'نرخِ دستیِ ادمین' : $GLOBALS['S']['rate']['why']),
        ),
        'settings' => array_intersect_key($s, array_flip(array('pick', 'min_sources', 'spread_max', 'rate_ttl', 'sane_min', 'sane_max', 'manual_rate', 'manual_until'))),
        'sources' => $sources,
        'custom_max' => PHOENIX_CUSTOM_SOURCES_MAX,
        'connections' => h_conn_payload(),
        'crypto' => phoenix_secret_method() !== '',
        'series' => $fx['healthy']['series'],
        'history' => $history,
    );
}

if ($path === '/rate' && $method === 'GET') h_ok(h_rate_payload());

if ($path === '/rate' && $method === 'POST') {
    foreach (array('pick', 'min_sources', 'spread_max', 'rate_ttl', 'sane_min', 'sane_max', 'manual_rate', 'manual_until', 'sources') as $k) {
        if (!array_key_exists($k, $body)) h_fail('rest_missing_callback_param', 'پارامترِ ' . $k . ' نیامده.', 400);
    }
    if ((int) $body['sane_max'] <= (int) $body['sane_min']) h_fail('phoenix_invalid', 'سقفِ بازه‌ی معقول باید از کفش بیشتر باشد.', 422);
    $flags = array();
    foreach (array_keys(phoenix_rate_sources()) as $slug) {
        $flags[$slug] = array_key_exists($slug, (array) $body['sources']) ? (bool) $body['sources'][$slug] : true;
    }
    if (!array_filter($flags)) h_fail('phoenix_invalid', 'دست‌کم یک منبع باید روشن بماند.', 422);
    $manual = (int) $body['manual_rate'];
    $until = $manual > 0 ? (int) $body['manual_until'] : 0;
    if ($until > 0 && $until < time()) h_fail('phoenix_invalid', 'تاریخِ انقضای نرخِ دستی گذشته است.', 422);
    phoenix_settings_save(array(
        'pick' => (string) $body['pick'], 'min_sources' => (int) $body['min_sources'], 'spread_max' => (int) $body['spread_max'],
        'rate_ttl' => (int) $body['rate_ttl'], 'sane_min' => (int) $body['sane_min'], 'sane_max' => (int) $body['sane_max'],
        'sources' => $flags, 'manual_rate' => $manual, 'manual_until' => $until,
    ), 'از پنل');
    h_ok(h_rate_payload());
}

if (preg_match('#^/sources/([a-z0-9_\-]+)/test$#', $path, $m)) {
    if (!isset(phoenix_rate_sources()[$m[1]])) h_fail('phoenix_not_found', 'این منبع تعریف نشده.', 404);
    if (time() - (int) $GLOBALS['S']['src_test_at'] < 10) h_fail('phoenix_busy', 'ده ثانیه صبر کن و دوباره امتحان کن.', 429);
    $GLOBALS['S']['src_test_at'] = time();
    if (strpos($m[1], 'p_') === 0) {
        $r = phoenix_rate_fetch_one($m[1], phoenix_rate_sources()[$m[1]]);
        h_ok(array('slug' => $m[1], 'rate' => $r['rate'], 'ms' => $r['ms'], 'status' => $r['status'], 'note' => $r['note']));
    }
    if ($m[1] === 'ramzinex') h_ok(array('slug' => $m[1], 'rate' => null, 'ms' => 10000, 'status' => 'net', 'note' => 'پاسخ در ۱۰ ثانیه نیامد'));
    h_ok(array('slug' => $m[1], 'rate' => 226000 + mt_rand(0, 2500), 'ms' => mt_rand(180, 700), 'status' => 'ok', 'note' => ''));
}

/* ---------- حاشیه‌ها ---------- */

function h_margins_payload() {
    $s = phoenix_settings();
    $cats = array();
    foreach ((array) $s['margin_by_cat'] as $tid => $m) {
        $c = h_cat($tid);
        if ($c) $cats[] = array('term_id' => (int) $tid, 'name' => $c['name'], 'margin' => phoenix_margin_sanitize((array) $m));
    }
    $prods = array();
    foreach ((array) $s['margin_by_prod'] as $pid => $m) {
        $p = h_product($pid);
        $prods[] = array('id' => (int) $pid, 'title' => $p ? $p['title'] : 'محصولِ حذف‌شده', 'exists' => (bool) $p, 'margin' => phoenix_margin_sanitize((array) $m));
    }
    $rows = array();
    foreach ($GLOBALS['S']['products'] as $p) {
        foreach ($p['plans'] as $pl) {
            $cost = h_cost($p, $pl);
            if ($cost['mode'] === 'manual' || count($rows) >= 12) continue;
            $c = phoenix_compute_with($cost, phoenix_margin_for($pl['id'] ?: $p['id']), $pl['id'] ?: $p['id']);
            $rows[] = array(
                'id' => $p['id'], 'title' => count($p['plans']) > 1 ? $p['title'] . ' — ' . $pl['label'] : $p['title'],
                'current' => (int) ($pl['sale'] ?: $pl['regular']),
                'calc' => $c ? array('mode' => $c['mode'], 'base' => $c['base'], 'profit' => $c['profit'], 'regular' => $c['regular'],
                    'final' => $c['final'], 'discount' => $c['discount'] ? $c['discount']['label'] : '',
                    'blocked' => $c['blocked'] ? $c['blocked']['why'] : '', 'floor_hit' => $c['floor_hit']) : null,
            );
        }
    }
    return array(
        'margin' => phoenix_margin_sanitize((array) $s['margin']), 'floor_percent' => (int) $s['floor_percent'],
        'cart_lock_min' => (int) $s['cart_lock_min'], 'by_cat' => $cats, 'by_prod' => $prods, 'preview' => $rows,
        'engine_on' => (bool) $s['engine_on'], 'rate' => phoenix_rate_value(),
        'reprice' => array('running' => false, 'scanned' => 0, 'last_at' => gmdate('c', time() - 3000)),
    );
}

if ($path === '/margins' && $method === 'GET') h_ok(h_margins_payload());
if ($path === '/margins' && $method === 'POST') {
    phoenix_settings_save(array('margin' => phoenix_margin_sanitize((array) ($body['margin'] ?? array())),
        'floor_percent' => max(0, min(100, (int) ($body['floor_percent'] ?? 5))),
        'cart_lock_min' => max(0, min(1440, (int) ($body['cart_lock_min'] ?? 30)))), 'از پنل');
    h_ok(h_margins_payload());
}
if ($path === '/margins/category') {
    $c = h_cat((int) ($body['term_id'] ?? 0));
    if (!$c) h_fail('phoenix_not_found', 'این دسته پیدا نشد.', 404);
    $all = (array) phoenix_setting('margin_by_cat', array());
    if (isset($body['margin']) && is_array($body['margin'])) { $all[(string) $c['id']] = phoenix_margin_sanitize($body['margin']); }
    else { unset($all[(string) $c['id']]); }
    phoenix_settings_save(array('margin_by_cat' => $all), 'حاشیه‌ی دسته‌ی «' . $c['name'] . '»');
    h_ok(h_margins_payload());
}
if ($path === '/reprice') {
    if (!phoenix_setting('engine_on')) h_fail('phoenix_engine_off', 'موتورِ قیمت خاموش است؛ چیزی نوشته نمی‌شود. اول از داشبورد روشنش کن.', 409);
    h_ok(h_margins_payload());
}

/* ---------- تخفیف‌ها ---------- */

function h_discounts_payload() {
    $rules = array();
    foreach (phoenix_discounts_all() as $raw) {
        $r = array_merge(phoenix_discount_blank(), (array) $raw);
        $r['state'] = !$r['enabled'] ? 'off' : (phoenix_discount_live($r) ? 'live' : ($r['starts'] && time() < $r['starts'] ? 'upcoming' : 'ended'));
        $r['targets_named'] = array();
        foreach ($r['targets'] as $id) {
            if ($r['scope'] === 'product') { $p = h_product($id); $name = $p ? $p['title'] : '(حذف‌شده)'; }
            elseif ($r['scope'] === 'category') { $c = h_cat($id); $name = $c ? $c['name'] : '(حذف‌شده)'; }
            else { $name = '(حذف‌شده)'; foreach (h_tags() as $t) { if ($t['id'] === (int) $id) $name = $t['name']; } }
            $r['targets_named'][] = array('id' => (int) $id, 'name' => $name);
        }
        $rules[] = $r;
    }
    return array('rules' => $rules, 'coupons' => $GLOBALS['S']['coupons']);
}

if ($path === '/discounts' && $method === 'GET') h_ok(h_discounts_payload());
if ($path === '/discounts' && $method === 'POST') {
    $in = (array) ($body['rule'] ?? array());
    if (trim((string) ($in['title'] ?? '')) === '') h_fail('phoenix_invalid', 'تخفیف عنوان ندارد — همین عنوان روی کارتِ محصول دیده می‌شود.', 422);
    if ((float) ($in['value'] ?? 0) <= 0) h_fail('phoenix_invalid', 'مقدارِ تخفیف باید بیشتر از صفر باشد.', 422);
    if (($in['scope'] ?? 'all') !== 'all' && empty($in['targets'])) h_fail('phoenix_invalid', 'دامنه انتخاب شده ولی هیچ هدفی ندارد.', 422);
    phoenix_discount_save($in);
    h_ok(h_discounts_payload());
}
if (preg_match('#^/discounts/([a-z0-9_\-]+)$#', $path, $m) && $method === 'DELETE') {
    phoenix_discount_delete($m[1]);
    h_ok(h_discounts_payload());
}
if ($path === '/coupons') {
    $code = strtolower(sanitize_text_field($body['code'] ?? ''));
    if ($code === '') h_fail('phoenix_bad_code', 'کد خالی است.', 422);
    foreach ($GLOBALS['S']['coupons'] as $c) { if (strtolower($c['code']) === $code) h_fail('phoenix_dup_code', 'این کد از قبل هست.', 422); }
    $email = (string) ($body['email'] ?? '');
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) h_fail('phoenix_invalid', 'ایمیل معتبر نیست.', 422);
    if ((float) ($body['value'] ?? 0) <= 0) h_fail('phoenix_bad_value', 'مقدار باید بیشتر از صفر باشد.', 422);
    array_unshift($GLOBALS['S']['coupons'], array('code' => $code, 'type' => $body['type'] === 'amount' ? 'amount' : 'percent',
        'value' => (float) $body['value'], 'used' => 0, 'limit' => 1, 'email' => $email,
        'expires' => !empty($body['expires']) ? gmdate('c', (int) $body['expires']) : null));
    phoenix_audit('discount', 'coupon:' . $code, null, $body['value'] . ($body['type'] === 'amount' ? ' تومان' : '٪'), 'کدِ اختصاصی ساخته شد');
    h_ok(h_discounts_payload());
}
if ($path === '/search/products') {
    $s = trim((string) ($q['q'] ?? ''));
    $out = array();
    foreach ($GLOBALS['S']['products'] as $p) {
        if ($s === '' || mb_stripos($p['title'] . ' ' . $p['english_title'], $s) !== false) $out[] = array('id' => $p['id'], 'name' => $p['title']);
    }
    h_ok(array_slice($out, 0, 20));
}

/* ---------- صف، تاریخچه، تنظیمات ---------- */

function h_queue_payload($status) {
    $counts = array('pending' => 0, 'done' => 0, 'failed' => 0, 'cancelled' => 0);
    $rows = array();
    foreach ($GLOBALS['S']['queue'] as $j) {
        $counts[$j['status']]++;
        if ($status === '' || $status === $j['status']) {
            $rows[] = array_merge($j, array('order_url' => 'https://panel.phonixmarket.com/wp-admin/admin.php?page=wc-orders&action=edit&id=' . $j['order_id']));
        }
    }
    return array('counts' => $counts, 'rows' => $rows, 'auto_fulfil' => (bool) phoenix_setting('auto_fulfil'));
}
if ($path === '/queue') h_ok(h_queue_payload((string) ($q['status'] ?? '')));
if (preg_match('#^/queue/(\d+)$#', $path, $m)) {
    $act = (string) ($body['act'] ?? '');
    if (!in_array($act, array('done', 'retry', 'cancel'), true)) h_fail('rest_invalid_param', 'کنشِ نامعتبر.', 400);
    foreach ($GLOBALS['S']['queue'] as &$j) {
        if ($j['id'] === (int) $m[1]) {
            $before = $j['status'];
            $j['status'] = array('done' => 'done', 'retry' => 'pending', 'cancel' => 'cancelled')[$act];
            if ($act === 'retry') $j['note'] = '';
            phoenix_audit('queue', 'job:' . $j['id'], $before, $j['status'], 'دستی از پنل');
            unset($j);
            h_ok(h_queue_payload(''));
        }
    }
    h_fail('phoenix_queue', 'این کار پیدا نشد.', 404);
}
if ($path === '/log') {
    $kind = (string) ($q['kind'] ?? '');
    $rows = array_values(array_filter($GLOBALS['S']['log'], function ($r) use ($kind) { return $kind === '' || $r['kind'] === $kind; }));
    $page = max(1, (int) ($q['page'] ?? 1));
    h_ok(array('rows' => array_slice($rows, ($page - 1) * 40, 40), 'total' => count($rows), 'page' => $page,
               'pages' => max(1, (int) ceil(count($rows) / 40))));
}

function h_settings_payload() {
    return array(
        'auto_fulfil' => (bool) phoenix_setting('auto_fulfil'), 'fulfil_fail_stop' => (int) phoenix_setting('fulfil_fail_stop', 3),
        'provider' => false, 'fail_streak' => 2,
        'system' => array('version' => PHOENIX_BRIDGE_VERSION, 'php' => PHP_VERSION, 'wordpress' => '6.8.2', 'woo' => '10.1.2',
                          'real_cron' => false, 'site' => 'https://phonixmarket.com', 'db' => true),
        'schedule' => array(
            array('hook' => 'phoenix_rate_hourly', 'label' => 'به‌روزرسانیِ ساعتیِ نرخ', 'at' => gmdate('c', time() + 1800)),
            array('hook' => 'phoenix_daily', 'label' => 'هرسِ روزانه‌ی تاریخچه', 'at' => gmdate('c', time() + 40000)),
            array('hook' => 'phoenix_reprice_all', 'label' => 'بازنویسیِ قیمت‌ها', 'at' => null),
            array('hook' => 'phoenix_fulfil_tick', 'label' => 'تحویلِ خودکار', 'at' => null),
        ),
    );
}
if ($path === '/settings' && $method === 'GET') h_ok(h_settings_payload());
if ($path === '/settings' && $method === 'POST') {
    if (!empty($body['auto_fulfil'])) h_fail('phoenix_no_provider', 'هنوز هیچ تأمین‌کننده‌ای وصل نشده؛ روشن کردنِ خریدِ خودکار کاری نمی‌کند.', 409);
    $patch = array('auto_fulfil' => false);
    if (isset($body['fulfil_fail_stop'])) $patch['fulfil_fail_stop'] = max(1, min(20, (int) $body['fulfil_fail_stop']));
    phoenix_settings_save($patch, 'از پنل');
    h_ok(h_settings_payload());
}

/* ---------- منابعِ قیمتِ محصول ---------- */

if (preg_match('#^/products/(\d+)/sources/(fetch|approve)$#', $path, $m)) {
    $id = (int) $m[1];
    if (!h_product($id)) h_fail('phoenix_not_found', 'این محصول پیدا نشد.', 404);
    $owner = !empty($body['plan_id']) ? phoenix_plan_owned($id, (int) $body['plan_id']) : $id;
    if ($m[2] === 'approve') {
        if (!$owner || !phoenix_psrc_approve($owner)) h_fail('phoenix_nothing', 'قیمتی منتظرِ تأیید نیست.', 409);
        h_ok(h_payload(h_product($id)));
    }
    $c = phoenix_psrc_clean($body['sources'] ?? array(), array_keys(phoenix_connections()));
    if (!$c['ok']) h_fail('phoenix_invalid', 'بعضی فیلدهای منابع درست نیستند.', 422, array('errors' => $c['errors']));
    $prev = $owner ? phoenix_psrc_state($owner) : array();
    $results = phoenix_psrc_fetch($c['data']);
    h_ok(array('results' => $results, 'rate' => phoenix_rate_value(),
               'pick' => phoenix_psrc_pick($c['data'], $results, phoenix_rate_value(), $prev['use'] ?? null)));
}

/* ---------- تابلوی قیمت ---------- */

function h_board_row(array $p) {
    $by = (array) phoenix_setting('margin_by_prod', array());
    $multi = count($p['plans']) > 1;
    $owner_pricing = array_merge($p['pricing'], array(
        'sources' => phoenix_psrc_config($p['id']) ?: phoenix_psrc_blank(),
        'sources_state' => phoenix_psrc_state_public($p['id']),
    ));
    $price = function (array $pl) use ($p) {
        $cost = h_cost($p, $pl);
        $c = phoenix_compute_with($cost, phoenix_margin_for($pl['id'] ?: $p['id']), $pl['id'] ?: $p['id']);
        return array(
            'current' => (int) ($pl['sale'] ?: $pl['regular']),
            'regular' => (int) $pl['regular'],
            'calc' => $c ? array('mode' => $c['mode'], 'base' => $c['base'], 'profit' => $c['profit'], 'regular' => $c['regular'],
                'sale' => $c['sale'], 'final' => $c['final'], 'discount' => $c['discount'] ? $c['discount']['label'] : '',
                'blocked' => $c['blocked'] ? $c['blocked']['why'] : '', 'floor_hit' => $c['floor_hit']) : null,
        );
    };
    $owner = array('plan_id' => 0, 'label' => 'کلِ محصول', 'pricing' => $owner_pricing);
    $plans = array();
    if ($multi) {
        foreach ($p['plans'] as $pl) {
            $plans[] = array_merge(array(
                'plan_id' => $pl['id'], 'label' => $pl['label'], 'inherit' => $pl['pricing']['mode'] === 'inherit',
                'pricing' => array_merge($pl['pricing'], array(
                    'sources' => phoenix_psrc_config($pl['id']) ?: phoenix_psrc_blank(),
                    'sources_state' => phoenix_psrc_state_public($pl['id']),
                )),
            ), $price($pl));
        }
    } else {
        $owner = array_merge($owner, $price($p['plans'][0]));
    }
    $thumb = $p['media']['logo'] ?: $p['media']['thumbnail'];
    return array(
        'id' => $p['id'], 'title' => $p['title'], 'english_title' => $p['english_title'],
        'thumb' => $thumb ? phoenix_media_url($thumb) : '', 'accent' => $p['media']['accent'],
        'status' => $p['status'], 'variable' => $multi,
        'margin' => isset($by[(string) $p['id']]) ? phoenix_margin_sanitize((array) $by[(string) $p['id']]) : null,
        'margin_used' => phoenix_margin_for($p['id']),
        'owner' => $owner, 'plans' => $plans,
    );
}

if ($path === '/pricing') {
    $rows = array();
    $products = $GLOBALS['S']['products'];
    uasort($products, function ($a, $b) { return strcmp($a['title'], $b['title']); });
    foreach ($products as $pr) { $rows[] = h_board_row($pr); }
    h_ok(array('rows' => $rows, 'rate' => phoenix_rate_value(), 'engine_on' => (bool) phoenix_setting('engine_on'),
               'margin' => phoenix_margin_sanitize((array) phoenix_setting('margin', array()))));
}

if (preg_match('#^/products/(\d+)/pricing$#', $path, $m)) {
    $pr = h_product((int) $m[1]);
    if (!$pr) h_fail('phoenix_not_found', 'این محصول پیدا نشد.', 404);
    $plan_id = (int) ($body['plan_id'] ?? 0);
    if ($plan_id && !phoenix_plan_owned($pr['id'], $plan_id)) h_fail('phoenix_not_found', 'این پلن مالِ این محصول نیست.', 404);
    $err = array();
    $clean = phoenix_clean_pricing($body['pricing'] ?? array(), $plan_id > 0, array_keys(phoenix_connections()), $err, 'sources.');
    if ($clean['mode'] === 'usd' && $clean['cost_usd'] <= 0) $err['cost_usd'] = 'قیمتِ تمام‌شده‌ی دلاری را بنویس.';
    if ($clean['mode'] === 'toman' && $clean['cost_toman'] <= 0) $err['cost_toman'] = 'قیمتِ تمام‌شده‌ی تومانی را بنویس.';
    if ($err) h_fail('phoenix_invalid', 'بعضی فیلدها درست نیستند.', 422, array('errors' => $err));

    $store = array('mode' => $clean['mode'], 'cost_usd' => $clean['cost_usd'], 'cost_toman' => $clean['cost_toman'], 'locked' => $clean['locked']);
    $key = (string) $pr['id'];
    if ($plan_id) {
        foreach ($GLOBALS['S']['products'][$key]['plans'] as &$pl) {
            if ((int) $pl['id'] === $plan_id) { $pl['pricing'] = $store; }
        }
        unset($pl);
    } else {
        $GLOBALS['S']['products'][$key]['pricing'] = $store;
        if (array_key_exists('margin', $body)) {
            $by = (array) phoenix_setting('margin_by_prod', array());
            if (is_array($body['margin'])) { $by[$key] = phoenix_margin_sanitize($body['margin']); } else { unset($by[$key]); }
            phoenix_settings_save(array('margin_by_prod' => $by), 'حاشیه‌ی «' . $pr['title'] . '»');
        }
    }
    $owner = $plan_id ?: $pr['id'];
    phoenix_psrc_store($owner, $clean['mode'] === 'sources' ? $clean['sources'] : null);
    if ($clean['mode'] === 'sources') phoenix_psrc_refresh($owner);
    phoenix_audit('product', $key, null, $clean['mode'], 'قیمت‌گذاری از منابعِ قیمت');
    h_ok(h_board_row(h_product($pr['id'])));
}

/* ---------- منابعِ نرخِ سفارشی و اتصال‌ها — با توابعِ واقعی ---------- */

function h_conn_payload() {
    $out = array();
    foreach (phoenix_connections() as $slug => $row) {
        $used = 0;
        foreach ((array) phoenix_setting('custom_sources', array()) as $cs) { if (($cs['conn'] ?? '') === $slug) $used++; }
        foreach ($GLOBALS['S']['meta'] as $meta) {
            foreach ((array) (($meta[PHOENIX_PSRC_META]['list'] ?? array())) as $src) { if (($src['conn'] ?? '') === $slug) { $used++; break; } }
        }
        $out[] = array('slug' => $slug, 'label' => $row['label'], 'auth' => $row['auth'], 'header' => $row['header'],
                       'key' => phoenix_conn_key_state($row), 'used' => $used);
    }
    return $out;
}

if ($path === '/sources' || $path === '/sources/try' || preg_match('#^/sources/(p_[a-f0-9]{6})$#', $path, $m)) {
    if ($method === 'DELETE') {
        if (!phoenix_custom_source_delete($m[1])) h_fail('phoenix_not_found', 'این منبع پیدا نشد.', 404);
        h_ok(h_rate_payload());
    }
    $c = phoenix_source_clean($body, array_keys(phoenix_connections()));
    if (!$c['ok']) h_fail('phoenix_invalid', 'بعضی فیلدها درست نیستند.', 422, array('errors' => $c['errors']));
    if ($path === '/sources/try') {
        $conn = $c['data']['conn'] !== '' ? phoenix_conn_runtime($c['data']['conn']) : null;
        $r = phoenix_rate_fetch_one('try', array_merge($c['data'], array('conn' => $conn)));
        h_ok(array('rate' => $r['rate'], 'ms' => $r['ms'], 'status' => $r['status'], 'note' => $r['note']));
    }
    $res = phoenix_custom_source_save($path === '/sources' ? null : $m[1], $c['data']);
    if (is_wp_error($res)) h_fail($res->get_error_code(), $res->get_error_message(), 422);
    h_ok(h_rate_payload());
}

if ($path === '/connections' || preg_match('#^/connections/(k_[a-f0-9]{6})$#', $path, $m)) {
    $all = phoenix_connections();
    if ($method === 'DELETE') {
        foreach (h_conn_payload() as $cp) {
            if ($cp['slug'] === $m[1] && $cp['used'] > 0) h_fail('phoenix_in_use', 'این اتصال در ' . phoenix_fa_digits((string) $cp['used']) . ' منبع استفاده شده؛ اول آن‌ها را عوض کن.', 409);
        }
        phoenix_conn_delete($m[1]);
        h_ok(h_rate_payload());
    }
    $slug = $path === '/connections' ? null : $m[1];
    $c = phoenix_conn_clean($body, $slug && isset($all[$slug]) && phoenix_conn_key_state($all[$slug]) === 'ok');
    if (!$c['ok']) h_fail('phoenix_invalid', 'بعضی فیلدها درست نیستند.', 422, array('errors' => $c['errors']));
    $res = phoenix_conn_save($slug, $c['data']);
    if (is_wp_error($res)) h_fail($res->get_error_code(), $res->get_error_message(), 422);
    h_ok(h_rate_payload());
}

h_fail('rest_no_route', 'مسیر پیدا نشد: ' . $method . ' ' . $path, 404);
