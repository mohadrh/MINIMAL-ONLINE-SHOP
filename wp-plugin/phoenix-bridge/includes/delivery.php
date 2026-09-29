<?php
/**
 * تحویلِ دستی — چیزی که اپراتور بعد از خرید به مشتری می‌دهد.
 *
 * ============================================================
 * ⚠ تا ۱٫۵٫۰ «انجام شد» فقط یک تیک بود.
 *
 * اپراتور اکانت را می‌ساخت یا کد را می‌خرید، ولی جایی نبود که
 * «چه چیزی» به مشتری داده شد ثبت شود: مشتری با پیام‌رسان می‌گرفتش و
 * فردا که گمش می‌کرد، هیچ‌کس نمی‌دانست چه بوده. حالا هر تحویل روی
 * همان قلمِ سفارش ثبت می‌شود و مشتری در «تحویلی‌ها»ی حسابش می‌بیندش.
 *
 * ⚠ رمزنگاری‌شده.
 * کد، یوزر و پسورد، و لینک با همان رمزنگاریِ اتصال‌ها (connections.php)
 * در متای مخفیِ قلم (‎_phoenix_delivery‎) می‌نشینند — نه در یادداشتِ
 * سفارش، نه در ایمیل، نه در REST ووکامرس. فقط صاحبِ سفارش (از حسابش)
 * و مدیر (با دکمه‌ی «نمایش»، که در تاریخچه ثبت می‌شود) بازشان می‌کنند.
 * ============================================================
 */

if (!defined('ABSPATH')) {
    exit;
}

const PHOENIX_DELIVERY_META  = '_phoenix_delivery';
const PHOENIX_DELIVERY_KINDS = array('code', 'account', 'upgrade', 'link');

/* ============================================================
   اعتبارسنجی — خالص
   ============================================================ */

/**
 * @return array{ok:bool, data:array, errors:array<string,string>}
 */
function phoenix_delivery_clean($in) {
    $in   = is_array($in) ? $in : array();
    $err  = array();
    $kind = isset($in['kind']) ? (string) $in['kind'] : '';
    if (!in_array($kind, PHOENIX_DELIVERY_KINDS, true)) {
        return array('ok' => false, 'data' => array(), 'errors' => array('kind' => 'نوعِ تحویل را انتخاب کن.'));
    }

    $line = function ($k, $max) use ($in) {
        $v = isset($in[$k]) && is_scalar($in[$k]) ? trim((string) $in[$k]) : '';
        /* بدونِ نویسه‌ی کنترلی — ولی خودِ مقدار دست نمی‌خورد: پسوردِ
           «a<b&c» باید همان‌طور به مشتری برسد، نه پاک‌سازی‌شده. */
        return preg_match('/[\x00-\x1F\x7F]/', $v) ? null : (function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max));
    };

    $secret = array();
    if ($kind === 'code') {
        $code = $line('code', 500);
        if ($code === null) {
            $err['code'] = 'کد نویسه‌ی نامعتبر (مثلاً شکستِ خط) دارد.';
        } elseif ($code === '') {
            $err['code'] = 'کد را بنویس.';
        }
        $secret['code'] = (string) $code;
    } elseif ($kind === 'account') {
        $u = $line('username', 200);
        $p = $line('password', 200);
        if ($u === null || $u === '') {
            $err['username'] = $u === null ? 'یوزرنیم نویسه‌ی نامعتبر دارد.' : 'یوزرنیم یا ایمیلِ اکانت را بنویس.';
        }
        if ($p === null || $p === '') {
            $err['password'] = $p === null ? 'پسورد نویسه‌ی نامعتبر دارد.' : 'پسوردِ اکانت را بنویس.';
        }
        $secret['username'] = (string) $u;
        $secret['password'] = (string) $p;
    } elseif ($kind === 'link') {
        $url = $line('url', 500);
        if ($url === null || !preg_match('#^https://[^\s"\'<>]+$#', (string) $url)) {
            $err['url'] = 'لینکِ https کامل.';
        }
        $secret['url'] = (string) $url;
    }
    /* ‎upgrade‎: روی اکانتِ خودِ مشتری فعال شده — رازی نیست، فقط یادداشت */

    $note = isset($in['note']) && is_scalar($in['note']) ? trim((string) $in['note']) : '';
    $note = preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/', '', $note); // شکستِ خط می‌ماند
    $note = function_exists('mb_substr') ? mb_substr(strip_tags($note), 0, 1000) : substr(strip_tags($note), 0, 1000);
    if ($kind === 'upgrade' && $note === '') {
        $err['note'] = 'بنویس روی کدام اکانت فعال شد — مثلاً «روی ایمیلِ ali@… تا ۱۴ آبان».';
    }

    $until = isset($in['until']) ? (int) $in['until'] : 0;
    if ($until < 0 || ($until > 0 && $until < 1000000000)) {
        $err['until'] = 'تاریخِ پایان نامعتبر است.';
        $until = 0;
    }

    return array('ok' => !$err, 'errors' => $err, 'data' => array(
        'kind' => $kind, 'secret' => $secret, 'note' => $note, 'until' => $until,
    ));
}

/** برای فهرست‌ها: پیدا که هست، ولی خودِ راز نه */
function phoenix_delivery_mask(array $secret) {
    $out = array();
    /* طولِ ثابت — طولِ پسورد یا کد هم نباید از پوشیده‌اش پیدا باشد. */
    foreach ($secret as $k => $v) {
        $v = (string) $v;
        $n = function_exists('mb_strlen') ? mb_strlen($v) : strlen($v);
        $out[$k] = $k === 'username' && $n > 5
            ? (function_exists('mb_substr') ? mb_substr($v, 0, 2) : substr($v, 0, 2)) . str_repeat('•', 6)
            : str_repeat('•', 8);
    }
    return $out;
}

/**
 * ورودی‌های مشتری در ثبتِ سفارش → فقط آنچه می‌شود متای قلم کرد.
 *
 * ⚠ کلید با «_» (متای داخلی) و کلیدِ بلند یا با نویسه‌ی کنترلی
 * بیرون؛ حداکثر ده ورودی و هر مقدار سیصد نویسه.
 *
 * @return array<string,string>
 */
function phoenix_order_inputs_clean($raw) {
    $out = array();
    if (!is_array($raw)) {
        return $out;
    }
    foreach ($raw as $k => $v) {
        if (!is_string($k) || !is_scalar($v) || is_bool($v)) {
            continue;
        }
        $k = trim($k);
        $n = function_exists('mb_strlen') ? mb_strlen($k, 'UTF-8') : strlen($k);
        if ($k === '' || $k[0] === '_' || $n > 60 || preg_match('/[\x00-\x1F\x7F<>]/', $k)) {
            continue;
        }
        $v = trim(preg_replace('/[\x00-\x1F\x7F]/', '', (string) $v));
        $out[$k] = function_exists('mb_substr') ? mb_substr($v, 0, 300, 'UTF-8') : substr($v, 0, 300);
        if (count($out) >= 10) {
            break;
        }
    }
    return $out;
}

/* ============================================================
   وردپرس
   ============================================================ */

/**
 * @param WC_Order_Item $item
 * @return array ثبتِ تازه (بدونِ راز)
 */
function phoenix_delivery_add($order, $item, array $data, $by) {
    $enc = phoenix_secret_encrypt(wp_json_encode($data['secret']));
    if ($data['secret'] && $enc === null) {
        return new WP_Error('phoenix_no_crypto', 'این سرور رمزنگاری ندارد؛ تحویلِ محرمانه ذخیره نمی‌شود.');
    }
    $list = $item->get_meta(PHOENIX_DELIVERY_META, true);
    $list = is_array($list) ? $list : array();
    $entry = array(
        'id'     => substr(bin2hex(random_bytes(6)), 0, 12),
        'kind'   => $data['kind'],
        'secret' => $data['secret'] ? $enc : '',
        'note'   => $data['note'],
        'until'  => (int) $data['until'],
        'at'     => time(),
        'by'     => (string) $by,
    );
    $list[] = $entry;
    $item->update_meta_data(PHOENIX_DELIVERY_META, $list);
    $item->save();

    $words = array('code' => 'کد', 'account' => 'اکانت', 'upgrade' => 'ارتقا', 'link' => 'لینک');
    /* ⚠ یادداشتِ سفارش بدونِ راز — یادداشت در ایمیل و پنلِ ووکامرس
       دیده می‌شود. مشتری خودِ تحویل را در حسابش می‌بیند. */
    $order->add_order_note('تحویل شد: «' . $item->get_name() . '» — ' . $words[$data['kind']] . '. جزئیات در حسابِ مشتری.', true);
    phoenix_audit('queue', 'order:' . $order->get_id(), null, $words[$data['kind']], 'تحویلِ «' . $item->get_name() . '»');
    return $entry;
}

/**
 * تحویل‌های یک قلم.
 *
 * @param bool $reveal راز را باز کن — فقط برای صاحبِ سفارش یا مدیری که «نمایش» زده
 */
function phoenix_delivery_entries($item, $reveal = false) {
    $list = $item->get_meta(PHOENIX_DELIVERY_META, true);
    $out  = array();
    foreach (is_array($list) ? $list : array() as $e) {
        $secret = array();
        if (!empty($e['secret'])) {
            $plain  = phoenix_secret_decrypt($e['secret']);
            $secret = $plain === null ? null : json_decode($plain, true);
        }
        $out[] = array(
            'id'     => (string) $e['id'],
            'kind'   => (string) $e['kind'],
            'note'   => (string) $e['note'],
            'until'  => (int) ($e['until'] ?? 0),
            'at'     => (int) $e['at'],
            /* ‎null‎ یعنی باز نشد (نمکِ وردپرس عوض شده) — پنل می‌گوید */
            'secret' => $secret === null ? null : ($reveal ? (array) $secret : phoenix_delivery_mask((array) $secret)),
        );
    }
    return $out;
}

/* ============================================================
   نمای سفارش — مشترکِ صفِ تحویل، «سفارش‌ها»ی پنل و حسابِ مشتری
   ============================================================ */

/** کارهای صفِ همین سفارش، با کلیدِ شناسه‌ی قلم */
function phoenix_queue_jobs_of_order($order_id) {
    global $wpdb;
    $t    = phoenix_table_queue();
    $rows = (array) $wpdb->get_results($wpdb->prepare("SELECT * FROM {$t} WHERE order_id = %d ORDER BY id ASC", (int) $order_id));
    $out  = array();
    foreach ($rows as $r) {
        $out[(int) $r->item_id] = $r;
    }
    return $out;
}

/** ورودی‌هایی که مشتری روی قلم داده — متن، نه HTML */
function phoenix_item_inputs_list($item) {
    $out = array();
    foreach (phoenix_order_item_inputs($item) as $k => $v) {
        $out[] = array('key' => (string) $k, 'value' => (string) $v);
    }
    return $out;
}

/**
 * همه‌ی چیزی که درباره‌ی یک سفارش باید دیده شود.
 *
 * ⚠ خنثی است: نه نشانیِ پنلِ مدیر دارد نه نامِ اپراتور. هر کدام از
 * دو طرف (مدیر، مشتری) آنچه لازم دارد رویش اضافه می‌کند — تا چیزی
 * از پنلِ مدیر ناخواسته به حسابِ مشتری نرسد.
 *
 * @param bool $reveal تحویل‌ها با رازشان (فقط برای صاحبِ سفارش)
 */
function phoenix_order_view($order, $reveal = false) {
    $jobs  = phoenix_queue_jobs_of_order($order->get_id());
    $items = array();
    foreach ($order->get_items() as $item_id => $item) {
        $job   = isset($jobs[(int) $item_id]) ? $jobs[(int) $item_id] : null;
        $res   = $job ? json_decode((string) $job->result, true) : null;
        $codes = array();
        foreach ($item->get_meta('کد تحویل', false) as $m) {
            $codes[] = (string) $m->value; // کدِ انبار (orders.php)
        }
        $items[] = array(
            'item_id'    => (int) $item_id,
            'product_id' => (int) ($item->get_variation_id() ? $item->get_variation_id() : $item->get_product_id()),
            'name'       => $item->get_name(),
            'qty'        => (int) $item->get_quantity(),
            'total'      => (int) round((float) $item->get_total()),
            'inputs'     => phoenix_item_inputs_list($item),
            'deliveries' => phoenix_delivery_entries($item, $reveal),
            'stock_codes'=> $reveal ? $codes : array_map(function ($c) { return str_repeat('•', 8); }, $codes),
            'job'        => $job ? array(
                'id'     => (int) $job->id,
                'status' => (string) $job->status,
                'note'   => is_array($res) && isset($res['note']) ? (string) $res['note'] : '',
            ) : null,
        );
    }
    $paid = $order->get_date_paid();
    return array(
        'id'           => $order->get_id(),
        'number'       => (string) $order->get_order_number(),
        'status'       => (string) $order->get_status(),
        'status_label' => function_exists('wc_get_order_status_name') ? wc_get_order_status_name($order->get_status()) : $order->get_status(),
        'created'      => $order->get_date_created() ? $order->get_date_created()->date('c') : null,
        'paid'         => $paid ? $paid->date('c') : null,
        'total'        => (int) round((float) $order->get_total()),
        'payment'      => array(
            'method'         => (string) $order->get_payment_method_title(),
            'transaction_id' => (string) $order->get_transaction_id(),
            'is_paid'        => (bool) $order->is_paid(),
        ),
        'customer'     => array(
            'name'  => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
            'phone' => (string) $order->get_billing_phone(),
            'email' => (string) $order->get_billing_email(),
        ),
        'note'         => (string) $order->get_customer_note(),
        'items'        => $items,
    );
}

/**
 * همه‌ی قلم‌های سفارش تحویل شدند؟ — آن‌وقت سفارش «تکمیل‌شده».
 *
 * ⚠ فقط از «در حال انجام» به «تکمیل». سفارشی که هنوز پرداخت نشده یا
 * لغو شده، با تحویلِ یک قلم خودبه‌خود تکمیل نمی‌شود.
 */
function phoenix_order_maybe_complete($order) {
    if ($order->get_status() !== 'processing') {
        return false;
    }
    $jobs = phoenix_queue_jobs_of_order($order->get_id());
    foreach ($jobs as $j) {
        if (in_array($j->status, array('pending', 'failed', 'needs_input'), true)) {
            return false;
        }
    }
    $order->update_status('completed', 'همه‌ی اقلام تحویل شدند.');
    return true;
}
