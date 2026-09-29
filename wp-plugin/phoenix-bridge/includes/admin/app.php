<?php
/**
 * پنلِ نسخه‌ی ۲ — صفحه‌ی پیشخوان که پنل را بار می‌کند.
 *
 * این فایل خودش تقریباً هیچ HTMLی نمی‌سازد: یک ظرفِ خالی، و
 * جاوااسکریپتِ پنل که همه‌چیز را از REST می‌خواند. دلیل و
 * ساختارِ کامل در docs/PANEL-V2.md.
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_APP_HANDLE = 'phoenix-app';

function phoenix_app_screen_id() {
    return 'toplevel_page_' . PHOENIX_MENU;
}

/** همه‌ی صفحه‌های پیشخوان که پنل را بار می‌کنند — فروشگاه و پنل‌های جدا */
function phoenix_app_screen_ids() {
    $ids = array(phoenix_app_screen_id());
    foreach (phoenix_admin_worlds() as $w) {
        $ids[] = 'toplevel_page_' . $w['menu'];
    }
    return $ids;
}

function phoenix_app_is_screen() {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    return $screen && in_array($screen->id, phoenix_app_screen_ids(), true);
}

function phoenix_app_page() {
    if (!current_user_can(PHOENIX_CAP)) {
        wp_die('دسترسی نداری.', '', array('response' => 403));
    }

    $theme = phoenix_app_user_theme();

    /* ⚠ حالتِ رنگ همین‌جا روی ظرف نوشته می‌شود، نه بعد از بارِ
       جاوااسکریپت.

       اگر پنل اول روشن بالا بیاید و بعد جاوااسکریپت تاریکش کند،
       کسی که تاریک را انتخاب کرده هر بار یک برقِ سفید می‌بیند. */
    echo '<div id="phx-app" class="phx2" dir="rtl" data-theme="' . esc_attr($theme) . '">';
    echo '<div class="phx2-boot" role="status" aria-live="polite">';
    echo '<span class="phx2-boot__dot" aria-hidden="true"></span>';
    echo '<span>' . esc_html('در حالِ بارگذاریِ پنل…') . '</span>';
    echo '</div>';
    echo '<noscript><p class="phx2-noscript">'
        . esc_html('پنلِ فونیکس بدونِ جاوااسکریپت کار نمی‌کند. جاوااسکریپتِ مرورگر را روشن کن و صفحه را دوباره باز کن.')
        . '</p></noscript>';
    echo '</div>';
}

function phoenix_app_user_theme() {
    $t = get_user_meta(get_current_user_id(), 'phoenix_theme', true);
    return in_array($t, array('light', 'dark', 'system'), true) ? $t : 'system';
}

add_action('admin_enqueue_scripts', 'phoenix_app_assets');
function phoenix_app_assets($hook) {
    if (!in_array($hook, phoenix_app_screen_ids(), true)) {
        return;
    }
    $world = phoenix_admin_world_for_page(isset($_GET['page']) ? sanitize_key(wp_unslash($_GET['page'])) : '');

    $base = plugins_url('admin/', dirname(__DIR__, 2) . '/phoenix-bridge.php');
    $ver  = PHOENIX_BRIDGE_VERSION;

    wp_enqueue_style(PHOENIX_APP_HANDLE, $base . 'app.css', array(), $ver);
    wp_enqueue_style(PHOENIX_APP_HANDLE . '-pages', $base . 'pages.css', array(PHOENIX_APP_HANDLE), $ver);
    wp_enqueue_script(PHOENIX_APP_HANDLE, $base . 'app.js', array(), $ver, true);

    /* انتخابگرِ رسانه‌ی خودِ وردپرس، برای تبِ «رسانه»ی محصول.
       بدونش دکمه‌ی «از کتابخانه» پنهان می‌ماند و فقط کادرِ نشانی
       هست — پس نبودنش چیزی را نمی‌شکند. */
    if (current_user_can('upload_files')) {
        wp_enqueue_media();
    }

    /* ⚠ هر چیزی که این‌جا می‌رود، در صفحه قابلِ دیدن است.

       nonce این‌جاست چون پنل برای هر درخواست لازمش دارد، و فقط
       برای همین کاربر و همین نشست معتبر است. ولی هیچ کلیدِ API،
       هیچ رمز، و هیچ تنظیماتِ حساسی این‌جا نمی‌آید — آن‌ها از
       REST و فقط به شکلِ «تنظیم شده / نشده» خوانده می‌شوند. */
    $boot = array(
        'ver'    => $ver,
        'root'   => esc_url_raw(rest_url(PHOENIX_API_NS . '/admin')),
        'nonce'  => wp_create_nonce('wp_rest'),
        'theme'  => phoenix_app_user_theme(),
        'user'   => wp_get_current_user()->display_name,
        'links'  => array(
            'woo_products' => admin_url('edit.php?post_type=product'),
        ),
        /* بخش‌های افزونه‌های دیگر — بررسی‌شده در ‎phoenix_admin_extensions‎ */
        'extensions' => $world ? array() : phoenix_admin_extensions(),
        /* پنلِ جدا (مثلاً «مشتریان»)، و نشانیِ همه‌ی پنل‌ها برای جابه‌جایی */
        'world'      => $world ? array(
            'id' => $world['id'], 'menu' => $world['menu'], 'title' => $world['title'], 'sub' => $world['sub'],
            'mark' => $world['mark'], 'sections' => $world['sections'],
        ) : null,
        'worlds'     => phoenix_app_world_links(),
    );

    wp_add_inline_script(
        PHOENIX_APP_HANDLE,
        'window.PHX_BOOT = ' . wp_json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) . ';',
        'before'
    );
}

/**
 * ‎type="module"‎ برای پنل.
 *
 * ⚠ فقط تگی که ‎src‎ی خودِ پنل را دارد عوض می‌شود.
 *
 * وردپرس اسکریپتِ درون‌خطیِ ‎PHX_BOOT‎ را هم در همان رشته
 * می‌فرستد. اگر همه‌ی ‎<script‎ها ماژول می‌شدند، آن هم ماژول
 * می‌شد — که کار می‌کرد ولی به‌خاطرِ ترتیبِ اجرای ماژول‌ها، نه
 * به‌خاطرِ طراحی. این‌جا فقط همان یکی.
 */
add_filter('script_loader_tag', 'phoenix_app_module_tag', 10, 3);
function phoenix_app_module_tag($tag, $handle, $src) {
    if ($handle !== PHOENIX_APP_HANDLE) {
        return $tag;
    }
    $needle = '<script src="' . esc_url($src) . '"';
    if (strpos($tag, $needle) !== false) {
        return str_replace($needle, '<script type="module" src="' . esc_url($src) . '"', $tag);
    }
    /* شکلِ تگ در نسخه‌های مختلفِ وردپرس کمی فرق دارد */
    return preg_replace(
        '#<script(?![^>]*type=)([^>]*\ssrc=["\']' . preg_quote(esc_url($src), '#') . ')#',
        '<script type="module"$1',
        $tag,
        1
    );
}

/** پنل‌ها برای «جابه‌جایی» در سربرگ — فروشگاه اول */
function phoenix_app_world_links() {
    $out = array(array('id' => 'store', 'label' => 'فروشگاه', 'icon' => 'grid', 'url' => phoenix_admin_url()));
    foreach (phoenix_admin_worlds() as $w) {
        $out[] = array('id' => $w['id'], 'label' => $w['title'], 'icon' => 'users', 'url' => phoenix_admin_url('', $w['id']));
    }
    return $out;
}

/** کلاسِ بدنه — فقط روی صفحه‌ی پنل، برای پس‌زمینه و پاورقی */
add_filter('admin_body_class', 'phoenix_app_body_class');
function phoenix_app_body_class($classes) {
    if (phoenix_app_is_screen()) {
        $classes .= ' phx2-body phx2-theme-' . phoenix_app_user_theme();
    }
    return $classes;
}

/** پاورقیِ «سپاسگزاریم از وردپرس» روی پنل جا نمی‌گیرد */
add_filter('admin_footer_text', 'phoenix_app_footer_text', 20);
function phoenix_app_footer_text($text) {
    return phoenix_app_is_screen() ? '' : $text;
}
add_filter('update_footer', 'phoenix_app_footer_version', 20);
function phoenix_app_footer_version($text) {
    return phoenix_app_is_screen() ? '' : $text;
}
