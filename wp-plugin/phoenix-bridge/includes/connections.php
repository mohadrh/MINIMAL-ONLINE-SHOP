<?php
/**
 * اتصال‌ها — کلیدهای API، یک جا، رمزنگاری‌شده.
 *
 * ============================================================
 * ⚠ چرا جدا از منبع
 *
 * یک تأمین‌کننده یک کلید دارد و ده‌ها محصول. اگر کلید کنارِ هر
 * منبع نوشته می‌شد، عوض کردنش یعنی ده‌ها ویرایش — و یکی جا
 * می‌ماند. این‌جا یک بار نوشته می‌شود و منابع (نرخِ تتر و قیمتِ
 * محصول) فقط به اسمش اشاره می‌کنند.
 *
 * ⚠ و کلید هیچ‌وقت در متای محصول نیست.
 * متای محصول از REST ووکامرس بیرون می‌رود؛ تنظیماتِ افزونه نه.
 *
 * ⚠ سه قاعده‌ی امنیتی:
 *   ۱ رمزنگاریِ احرازشده (sodium، وگرنه openssl-GCM) با کلیدی که
 *     از نمکِ ‎AUTH‎ی wp-config ساخته می‌شود، نه از پایگاه داده.
 *   ۲ کلید هیچ‌وقت به مرورگر برنمی‌گردد — پنل فقط «ذخیره شده /
 *     خراب» را می‌بیند. در تاریخچه هم «••••».
 *   ۳ کلید و نامِ هدر شکستِ خط ندارند (تزریقِ هدر)، و هدرهای
 *     حساس قابلِ انتخاب نیستند.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_CONN_MAX           = 20;
const PHOENIX_CONN_AUTH          = array('bearer', 'header');
const PHOENIX_SOURCE_NONCE_BYTES = 24; // SODIUM_CRYPTO_SECRETBOX_NONCEBYTES
const PHOENIX_SOURCE_HEADER_DENY = array(
    'host', 'cookie', 'content-length', 'content-type', 'connection', 'transfer-encoding',
    'te', 'upgrade', 'accept', 'accept-encoding', 'user-agent', 'proxy-authorization', 'referer',
);

/* ============================================================
   اعتبارسنجی — خالص
   ============================================================ */

/**
 * @param bool $has_key اتصالِ موجود از قبل کلیدِ سالم دارد (ویرایش)
 * @return array{ok:bool, data?:array, errors?:array<string,string>}
 */
function phoenix_conn_clean(array $in, $has_key = false) {
    $err = array();

    $label = phoenix_source_line(isset($in['label']) ? $in['label'] : '', 60);
    if ($label === '') {
        $err['label'] = 'اتصال اسم ندارد — مثلاً نامِ تأمین‌کننده.';
    }

    $auth = isset($in['auth']) ? (string) $in['auth'] : 'bearer';
    if (!in_array($auth, PHOENIX_CONN_AUTH, true)) {
        $auth = 'bearer';
    }

    $header = '';
    if ($auth === 'header') {
        $header = trim((string) (isset($in['header']) ? $in['header'] : ''));
        if (!preg_match('/^[A-Za-z0-9-]{1,40}$/', $header)) {
            $err['header'] = 'نامِ هدر فقط حرفِ لاتین، عدد و خط‌تیره — مثلاً ‎X-API-Key‎.';
        } elseif (in_array(strtolower($header), PHOENIX_SOURCE_HEADER_DENY, true)) {
            $err['header'] = 'این هدر را خودِ درخواست تعیین می‌کند و قابلِ استفاده نیست.';
        }
    }

    $key = isset($in['key']) ? (string) $in['key'] : '';
    if ($key !== '' && (strlen($key) > 500 || preg_match('/[\x00-\x1F\x7F]/', $key))) {
        /* ⚠ شکستِ خط در مقدارِ هدر یعنی هدرِ دوم — تزریق. */
        $err['key'] = 'کلید نباید شکستِ خط یا نویسه‌ی کنترلی داشته باشد.';
    } elseif ($key === '' && !$has_key) {
        $err['key'] = 'کلیدِ API را وارد کن.';
    }

    if ($err) {
        return array('ok' => false, 'errors' => $err);
    }
    return array('ok' => true, 'data' => array(
        'label'  => $label,
        'auth'   => $auth,
        'header' => $header,
        'key'    => $key !== '' ? $key : null, // null یعنی «همان قبلی»
    ));
}

function phoenix_source_line($v, $max) {
    $v = trim(preg_replace('/[\r\n\t ]+/', ' ', strip_tags(is_scalar($v) ? (string) $v : '')));
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

/* ============================================================
   رمزنگاری
   ============================================================ */

/**
 * ⚠ کلیدِ رمزنگاری در پایگاه داده نیست.
 *
 * از نمکِ ‎AUTH‎ی وردپرس ساخته می‌شود که در wp-config است. کسی که
 * فقط به پایگاه داده دست پیدا کند (پشتیبان، تزریقِ SQL در افزونه‌ی
 * دیگر) متنِ رمزشده را می‌بیند و کلید را نه.
 *
 * نتیجه‌ی جانبی: اگر نمک‌ها عوض شوند، کلیدهای ذخیره‌شده دیگر باز
 * نمی‌شوند. پنل همین را می‌گوید («کلید دوباره لازم است») و اتصال
 * تا آن موقع استفاده نمی‌شود.
 */
function phoenix_secret_key() {
    $salt = function_exists('wp_salt') ? wp_salt('auth') : '';
    return hash_hmac('sha256', 'phoenix-bridge/source-keys/v1', $salt, true);
}

/**
 * ⚠ دو روش، چون هاستِ اشتراکی همه‌چیز ندارد.
 * sodium از PHP 7.2 هست ولی بعضی هاست‌ها افزونه‌اش را خاموش
 * می‌کنند (XAMPPِ همین پروژه هم ندارد). openssl تقریباً همه‌جا
 * هست. هر دو رمزنگاریِ احرازشده‌اند — دستکاری را می‌فهمند.
 * پیشوندِ ‎v1:‎/‎v2:‎ می‌گوید با کدام رمز شده.
 */
function phoenix_secret_method() {
    if (function_exists('sodium_crypto_secretbox')) {
        return 'sodium';
    }
    if (function_exists('openssl_encrypt') && in_array('aes-256-gcm', openssl_get_cipher_methods(), true)) {
        return 'openssl';
    }
    return '';
}

/** @return string|null ‎null‎ یعنی این سرور رمزنگاری ندارد — کلید ذخیره نمی‌شود */
function phoenix_secret_encrypt($plain, $method = null) {
    $method = $method === null ? phoenix_secret_method() : $method;
    $plain  = (string) $plain;

    if ($method === 'sodium') {
        $nonce = random_bytes(PHOENIX_SOURCE_NONCE_BYTES);
        return 'v1:' . base64_encode($nonce . sodium_crypto_secretbox($plain, $nonce, phoenix_secret_key()));
    }
    if ($method === 'openssl') {
        $iv  = random_bytes(12);
        $tag = '';
        $ct  = openssl_encrypt($plain, 'aes-256-gcm', phoenix_secret_key(), OPENSSL_RAW_DATA, $iv, $tag, 'phoenix', 16);
        return $ct === false ? null : 'v2:' . base64_encode($iv . $tag . $ct);
    }
    return null;
}

/** @return string|null ‎null‎ یعنی باز نشد */
function phoenix_secret_decrypt($blob) {
    if (!is_string($blob) || strlen($blob) < 4) {
        return null;
    }
    $ver = substr($blob, 0, 3);
    $raw = base64_decode(substr($blob, 3), true);
    if ($raw === false) {
        return null;
    }

    if ($ver === 'v1:' && function_exists('sodium_crypto_secretbox_open')) {
        if (strlen($raw) <= PHOENIX_SOURCE_NONCE_BYTES) {
            return null;
        }
        try {
            $plain = sodium_crypto_secretbox_open(
                substr($raw, PHOENIX_SOURCE_NONCE_BYTES),
                substr($raw, 0, PHOENIX_SOURCE_NONCE_BYTES),
                phoenix_secret_key()
            );
        } catch (Exception $e) {
            return null;
        }
        return $plain === false ? null : $plain;
    }

    if ($ver === 'v2:' && function_exists('openssl_decrypt')) {
        if (strlen($raw) <= 28) {
            return null;
        }
        $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', phoenix_secret_key(), OPENSSL_RAW_DATA,
            substr($raw, 0, 12), substr($raw, 12, 16), 'phoenix');
        return $plain === false ? null : $plain;
    }

    return null;
}

/* ============================================================
   انبار
   ============================================================ */

/** همان‌طور که ذخیره شده — با کلیدِ رمزشده */
function phoenix_connections() {
    $all = phoenix_setting('connections', array());
    return is_array($all) ? $all : array();
}

/**
 * اتصالِ آماده‌ی درخواست — کلیدِ باز شده.
 *
 * @return array|null ‎null‎ اگر نیست یا کلیدش باز نمی‌شود
 */
function phoenix_conn_runtime($slug) {
    if ($slug === '' || $slug === null) {
        return null;
    }
    $all = phoenix_connections();
    if (!isset($all[$slug]) || !is_array($all[$slug])) {
        return null;
    }
    $row = $all[$slug];
    $key = phoenix_secret_decrypt(isset($row['key_enc']) ? $row['key_enc'] : '');
    if ($key === null || $key === '') {
        return null;
    }
    return array(
        'slug'   => (string) $slug,
        'auth'   => (string) $row['auth'],
        'header' => (string) (isset($row['header']) ? $row['header'] : ''),
        'key'    => $key,
    );
}

/** وضعیتِ کلید برای پنل — بدونِ خودِ کلید */
function phoenix_conn_key_state(array $row) {
    $k = phoenix_secret_decrypt(isset($row['key_enc']) ? $row['key_enc'] : '');
    return $k === null || $k === '' ? 'broken' : 'ok';
}

/**
 * @param string|null $slug null یعنی اتصالِ تازه
 * @return string|WP_Error
 */
function phoenix_conn_save($slug, array $clean) {
    $all = phoenix_connections();

    if ($slug === null) {
        if (count($all) >= PHOENIX_CONN_MAX) {
            return new WP_Error('phoenix_too_many', 'حداکثر ' . PHOENIX_CONN_MAX . ' اتصال.');
        }
        do {
            $slug = 'k_' . bin2hex(random_bytes(3));
        } while (isset($all[$slug]));
        $old = array();
    } else {
        if (!isset($all[$slug])) {
            return new WP_Error('phoenix_not_found', 'این اتصال پیدا نشد.');
        }
        $old = $all[$slug];
    }

    $enc = isset($old['key_enc']) ? (string) $old['key_enc'] : '';
    if (is_string($clean['key'])) {
        $enc = phoenix_secret_encrypt($clean['key']);
        /* ⚠ بدونِ رمزنگاری، کلید ذخیره نمی‌شود — نه به‌صورتِ خام. */
        if ($enc === null) {
            return new WP_Error('phoenix_no_crypto', 'این سرور نه sodium دارد نه openssl؛ کلیدِ API را نمی‌شود امن نگه داشت. از پشتیبانیِ هاست بخواه یکی را فعال کند.');
        }
    }

    $all[$slug] = array(
        'label'   => $clean['label'],
        'auth'    => $clean['auth'],
        'header'  => $clean['header'],
        'key_enc' => $enc,
    );
    phoenix_settings_save(array('connections' => $all), 'اتصالِ «' . $clean['label'] . '»');
    return $slug;
}

function phoenix_conn_delete($slug) {
    $all = phoenix_connections();
    if (!isset($all[$slug])) {
        return false;
    }
    $label = (string) $all[$slug]['label'];
    unset($all[$slug]);
    phoenix_settings_save(array('connections' => $all), 'حذفِ اتصالِ «' . $label . '»');
    return true;
}

/**
 * سرِ درخواست: هدرِ احراز هویتِ یک اتصال.
 *
 * @param array|null $conn خروجیِ ‎phoenix_conn_runtime‎
 */
function phoenix_conn_headers($conn) {
    if (!is_array($conn) || empty($conn['key'])) {
        return array();
    }
    if ($conn['auth'] === 'header' && preg_match('/^[A-Za-z0-9-]{1,40}$/', $conn['header'])) {
        return array($conn['header'] => $conn['key']);
    }
    return array('Authorization' => 'Bearer ' . $conn['key']);
}

/**
 * برای تاریخچه: متنِ رمزشده هم نوشته نمی‌شود.
 *
 * رمزشده است، ولی دلیلی ندارد در جدولی که همه‌ی مدیرانِ فروشگاه
 * می‌بینند و یک سال می‌ماند، بنشیند.
 */
function phoenix_audit_redact($key, $value) {
    if ($key !== 'connections' || !is_array($value)) {
        return $value;
    }
    foreach ($value as $slug => $row) {
        if (is_array($row) && !empty($row['key_enc'])) {
            $value[$slug]['key_enc'] = '••••';
        }
    }
    return $value;
}
