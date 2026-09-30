<?php
/**
 * داده‌های Phoenix Account در «پشتیبان‌گیری»ِ Bridge.
 *
 * ⚠ همیشه بار می‌شود، نه در ‎phoenix_acc_boot‎: Bridge نسخه‌ها را روی
 *   ‎plugins_loaded‎ با اولویتِ ۵ می‌سنجد و پیش از آن باید بداند Account
 *   چه نسخه‌ای است و کدام تنظیمات را نگه دارد. بدونِ Bridge این
 *   فیلترها کسی را صدا نمی‌زنند و بی‌اثرند.
 *
 * ⚠ نشست‌های ورود عمداً نیستند. بعد از بازگرداندن، مشتری یک بار
 *   دوباره وارد می‌شود — امن‌تر از زنده کردنِ نشستی که شاید باطل شده بود.
 *
 * ⚠ حتی «جایگزینی» این‌ها را به عقب برنمی‌گرداند (‎keep‎):
 *   - رمزِ عبوری که مشتری بعد از فایل عوض کرده — شاید چون قبلی لو رفته بود
 *   - مسدود کردنی که بعد از فایل انجام شده
 *   - پیوندِ تلگرامی که بعد از فایل عوض شده — وگرنه کدِ ورود به حسابِ
 *     تلگرامِ قبلی می‌رفت
 */

/** پرونده‌ی فعلیِ مشتری بماند؟ */
function phoenix_acc_backup_keep_customer($cur, $inc) {
    $newer_pass = !empty($cur['pass_set_at'])
        && (empty($inc['pass_set_at']) || strcmp((string) $cur['pass_set_at'], (string) $inc['pass_set_at']) > 0);
    $blocked = !empty($cur['blocked']) && empty($inc['blocked']);
    return $newer_pass || $blocked;
}

/** پیوندِ تازه‌ترِ تلگرام بماند */
function phoenix_acc_backup_keep_tg($cur, $inc) {
    return strcmp((string) ($cur['linked_at'] ?? ''), (string) ($inc['linked_at'] ?? '')) > 0;
}

if (!defined('ABSPATH')) {
    exit;
}

add_filter('phoenix_backup_versions', 'phoenix_acc_backup_versions');
function phoenix_acc_backup_versions($v) {
    $v['account'] = PHOENIX_ACC_VERSION;
    return $v;
}

/* نامِ خامِ option‌ها: ثابت‌های chat.php و telegram.php هنوز بار نشده‌اند */
add_filter('phoenix_backup_snapshot_options', 'phoenix_acc_backup_snapshot_options');
function phoenix_acc_backup_snapshot_options($list) {
    return array_merge((array) $list, array(PHOENIX_ACC_OPTION, 'phoenix_acc_chat', 'phoenix_acc_tg_secret'));
}

add_filter('phoenix_backup_sections', 'phoenix_acc_backup_sections');
function phoenix_acc_backup_sections($list) {
    $g   = 'مشتریان';
    $msg = array('id' => 'uint', 'author' => 'str:10', 'staff' => 'str:60', 'body' => 'text', 'created_at' => 'datetime');

    $list['account.settings'] = array(
        'label' => 'تنظیماتِ مشتریان — پیامک و تلگرام، چتِ آنلاین', 'group' => $g, 'kind' => 'option',
        'options' => array(
            PHOENIX_ACC_OPTION      => 'phoenix_acc_defaults',
            'phoenix_acc_chat'      => 'phoenix_acc_chat_defaults',
            'phoenix_acc_tg_secret' => 'secret',
        ),
    );
    /* مشتری ستونِ «آخرین تغییر» ندارد: در ادغام، پرونده‌ی فعلی (رمزِ تازه، یادداشت) می‌ماند */
    $list['account.customers'] = array(
        'label' => 'مشتریان — پرونده، هشِ رمزِ عبور، آمارِ خرید', 'group' => $g, 'kind' => 'table',
        'table' => 'phoenix_acc_table_customers', 'pk' => 'phone', 'updated' => '',
        'keep' => 'phoenix_acc_backup_keep_customer',
        'cols' => array(
            'phone' => 'str:15', 'name' => 'str:100', 'email' => 'str:190', 'pass_hash' => 'str:255',
            'pass_set_at' => 'datetime?', 'blocked' => 'bool', 'admin_note' => 'str:500', 'created_at' => 'datetime',
            'last_login' => 'datetime?', 'orders_count' => 'uint', 'paid_total' => 'uint', 'last_order_at' => 'datetime?',
        ),
    );
    $list['account.tickets'] = array(
        'label' => 'تیکت‌ها', 'group' => $g, 'kind' => 'table',
        'table' => 'phoenix_acc_table_tickets', 'pk' => 'id', 'updated' => 'updated_at',
        'cols' => array(
            'id' => 'uint', 'phone' => 'str:15', 'subject' => 'str:150', 'order_id' => 'uint', 'status' => 'str:12',
            'created_at' => 'datetime', 'updated_at' => 'datetime', 'last_by' => 'str:10', 'unread' => 'bool',
        ),
    );
    $list['account.ticket_msgs'] = array(
        'label' => 'پیام‌های تیکت', 'group' => $g, 'kind' => 'table',
        'table' => 'phoenix_acc_table_messages', 'pk' => 'id', 'updated' => '',
        'cols' => array_merge(array('id' => 'uint', 'ticket_id' => 'uint'), $msg),
    );
    $list['account.chats'] = array(
        'label' => 'گفتگوهای چتِ آنلاین', 'group' => $g, 'kind' => 'table',
        'table' => 'phoenix_acc_table_chats', 'pk' => 'id', 'updated' => 'updated_at',
        'cols' => array(
            'id' => 'uint', 'token_hash' => 'str:64', 'phone' => 'str:15', 'agent' => 'str:40', 'status' => 'str:10',
            'created_at' => 'datetime', 'updated_at' => 'datetime', 'last_by' => 'str:10', 'unread_staff' => 'bool',
            'page' => 'str:200', 'ua' => 'str:160',
        ),
    );
    $list['account.chat_msgs'] = array(
        'label' => 'پیام‌های چت', 'group' => $g, 'kind' => 'table',
        'table' => 'phoenix_acc_table_chat_msgs', 'pk' => 'id', 'updated' => '',
        'cols' => array_merge(array('id' => 'uint', 'chat_id' => 'uint'), $msg),
    );
    $list['account.tg'] = array(
        'label' => 'پیوندِ شماره‌ها با ربات تلگرام', 'group' => $g, 'kind' => 'table',
        'table' => 'phoenix_acc_table_tg', 'pk' => 'phone', 'updated' => 'linked_at',
        'keep' => 'phoenix_acc_backup_keep_tg',
        'cols' => array('phone' => 'str:15', 'chat_id' => 'int', 'tg_user' => 'int', 'username' => 'str:64', 'linked_at' => 'datetime'),
    );
    return $list;
}
