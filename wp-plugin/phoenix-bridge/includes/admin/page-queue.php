<?php
/**
 * صفِ تحویل.
 *
 * ⚠ این صفحه حتی با موتورِ خودکارِ خاموش هم کار می‌کند.
 *
 * خاموش‌بودنِ خرید خودکار یعنی «هیچ‌کس خودش پول خرج نمی‌کند»،
 * نه «سفارش‌ها گم می‌شوند». هر سفارشِ پرداخت‌شده این‌جا یک ردیف
 * است و اپراتور همان‌جا تیکش می‌زند.
 */

if (!defined('ABSPATH')) {
    exit;
}

function phoenix_page_queue() {
    if (!current_user_can(PHOENIX_CAP)) {
        wp_die('دسترسی نداری.');
    }

    $counts = phoenix_queue_counts();
    $auto   = (bool) phoenix_setting('auto_fulfil');

    phoenix_page_open('صفِ تحویل', 'هر سفارشِ پرداخت‌شده که باید خریده یا فعال شود، این‌جاست.');

    if (!$auto) {
        echo '<div class="phx-alert is-blue">';
        echo esc_html('خریدِ خودکار خاموش است — عمدی. تا وقتی API تأمین‌کننده و کیفِ پول آماده نیست، هر کار دستی تأیید می‌شود. سفارش‌ها گم نمی‌شوند، فقط خودکار خرید نمی‌شوند.');
        echo '</div>';
    }

    echo '<div class="phx-stats">';
    phoenix_stat('منتظر', number_format_i18n($counts['pending']), $counts['pending'] ? 'amber' : 'green');
    phoenix_stat('انجام‌شده', number_format_i18n($counts['done']), 'green');
    phoenix_stat('ناموفق', number_format_i18n($counts['failed']), $counts['failed'] ? 'red' : 'grey');
    phoenix_stat('لغوشده', number_format_i18n($counts['cancelled']), 'grey');
    phoenix_stat('خریدِ خودکار', $auto ? 'روشن' : 'خاموش', $auto ? 'green' : 'grey');
    echo '</div>';

    $filter = isset($_GET['status']) ? sanitize_key(wp_unslash($_GET['status'])) : '';
    $known  = array('' => 'همه', 'pending' => 'منتظر', 'done' => 'انجام‌شده', 'failed' => 'ناموفق', 'cancelled' => 'لغوشده');
    if (!array_key_exists($filter, $known)) {
        $filter = '';
    }

    echo '<p class="phx-filters">';
    foreach ($known as $k => $label) {
        $url = add_query_arg(
            array('page' => 'phoenix-queue', 'status' => $k),
            admin_url('admin.php')
        );
        echo '<a class="button button-small' . ($filter === $k ? ' button-primary' : '') . '" href="'
            . esc_url($url) . '">' . esc_html($label) . '</a> ';
    }
    echo '</p>';

    phoenix_queue_table(phoenix_queue_list($filter, 100));

    phoenix_page_close();
}

function phoenix_queue_table($jobs) {
    if (!$jobs) {
        echo '<p class="phx-empty">چیزی در صف نیست.</p>';
        return;
    }

    $tones = array('pending' => 'amber', 'done' => 'green', 'failed' => 'red', 'cancelled' => 'grey');
    $words = array('pending' => 'منتظر', 'done' => 'انجام‌شده', 'failed' => 'ناموفق', 'cancelled' => 'لغوشده');

    echo '<table class="widefat striped phx-table"><thead><tr>';
    echo '<th>#</th><th>سفارش</th><th>محصول</th><th>چه باید بشود</th><th>ورودیِ مشتری</th>';
    echo '<th>وضعیت</th><th>تلاش</th><th>کِی</th><th>کنش</th>';
    echo '</tr></thead><tbody>';

    foreach ($jobs as $job) {
        $payload = json_decode((string) $job->payload, true);
        $payload = is_array($payload) ? $payload : array();
        $product = wc_get_product((int) $job->product_id);

        echo '<tr>';
        echo '<td>' . esc_html((int) $job->id) . '</td>';

        $order_link = admin_url('post.php?post=' . (int) $job->order_id . '&action=edit');
        echo '<td><a href="' . esc_url($order_link) . '">#' . esc_html((int) $job->order_id) . '</a></td>';

        echo '<td>' . ($product
            ? '<a href="' . esc_url(get_edit_post_link((int) $job->product_id)) . '">' . esc_html($product->get_name()) . '</a>'
            : '<span class="phx-muted">#' . esc_html((int) $job->product_id) . '</span>')
            . (isset($payload['qty']) && (int) $payload['qty'] > 1
                ? ' <span class="phx-badge is-blue">×' . esc_html((int) $payload['qty']) . '</span>'
                : '')
            . '</td>';

        echo '<td>' . esc_html(phoenix_fulfil_word(isset($payload['mode']) ? $payload['mode'] : '')) . '</td>';

        echo '<td class="phx-note">';
        if (!empty($payload['inputs']) && is_array($payload['inputs'])) {
            foreach ($payload['inputs'] as $k => $v) {
                echo '<div><b>' . esc_html($k) . ':</b> ' . esc_html(phoenix_shorten($v, 40)) . '</div>';
            }
        } else {
            echo '—';
        }
        echo '</td>';

        echo '<td>';
        phoenix_badge(
            isset($words[$job->status]) ? $words[$job->status] : $job->status,
            isset($tones[$job->status]) ? $tones[$job->status] : 'grey'
        );
        echo '</td>';

        echo '<td>' . esc_html((int) $job->tries) . '</td>';
        echo '<td title="' . esc_attr($job->created_at) . '">' . esc_html(phoenix_ago($job->created_at)) . '</td>';

        echo '<td class="phx-rowacts">';
        if ($job->status !== 'done') {
            phoenix_queue_btn($job->id, 'done', 'انجام شد');
        }
        if ($job->status === 'failed' || $job->status === 'cancelled') {
            phoenix_queue_btn($job->id, 'retry', 'به صف برگردان');
        }
        if ($job->status === 'pending') {
            phoenix_queue_btn($job->id, 'cancel', 'لغو');
        }
        echo '</td>';

        echo '</tr>';
    }
    echo '</tbody></table>';
}

function phoenix_queue_btn($id, $act, $label) {
    phoenix_form_open('phoenix_queue_act', 'style="display:inline"');
    echo '<input type="hidden" name="job_id" value="' . esc_attr((int) $id) . '">';
    echo '<input type="hidden" name="act" value="' . esc_attr($act) . '">';
    echo '<button class="button button-small">' . esc_html($label) . '</button> ';
    phoenix_form_close();
}

function phoenix_fulfil_word($mode) {
    $map = array(
        'stock_code'      => 'کد از انبار',
        'stock_account'   => 'یوزر و پسورد از انبار',
        'upgrade_on_user' => 'ارتقای اکانتِ خودِ مشتری',
        'api_topup'       => 'شارژ خودکار',
        'manual'          => 'دستی',
    );
    return isset($map[$mode]) ? $map[$mode] : ($mode === '' ? 'نامشخص' : $mode);
}
