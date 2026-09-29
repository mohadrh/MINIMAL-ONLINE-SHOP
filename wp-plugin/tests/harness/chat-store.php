<?php
/**
 * چتِ ساختگیِ مشترک بینِ پنل (fake-api.php) و سایت (fake-shop.php).
 *
 * حالت در ‎.chat-state.json‎ — تا پیامی که در چتِ سایت نوشته می‌شود
 * در پنلِ «مشتریان ← چت آنلاین» دیده شود و جوابش برگردد، مثلِ
 * وردپرسِ واقعی. قضاوت‌ها (تنظیمات، قرعه‌ی کارشناس، ساعتِ کاری، متن)
 * همان توابعِ ‎phoenix-account/includes/core.php‎اند.
 */

function hc_file() {
    return __DIR__ . '/.chat-state.json';
}

function hc_load() {
    $f = hc_file();
    $d = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
    if (!is_array($d)) {
        $d = hc_seed();
    }
    return $d;
}

function hc_save(array $d) {
    file_put_contents(hc_file(), json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function hc_seed() {
    $now = time();
    return array(
        'seq' => 100,
        'settings' => phoenix_acc_chat_defaults(),
        'chats' => array(
            array('id' => 7, 'token_hash' => str_repeat('0', 64), 'phone' => '09121234567', 'agent' => 'نگین کاظمی', 'status' => 'open',
                'created' => $now - 240, 'updated' => $now - 60, 'last_by' => 'visitor', 'unread' => 1, 'page' => '/product/chatgpt/', 'ua' => 'آیفون · Safari',
                'messages' => array(
                    array('id' => 1, 'author' => 'system', 'staff' => '', 'body' => "مشتری: کمک برای انتخاب\nربات: دنبالِ چه دسته‌ای هستی؟", 'at' => $now - 240),
                    array('id' => 2, 'author' => 'visitor', 'staff' => '', 'body' => 'سلام، چت‌جی‌پی‌تی پلاس رو روی ایمیل خودم فعال می‌کنید؟', 'at' => $now - 230),
                    array('id' => 3, 'author' => 'bot', 'staff' => '', 'body' => "وصلت می‌کنم به نگین کاظمی از تیم پشتیبانی.\n\nسوالت را برایش فرستادم و همین‌جا جواب می‌دهد.", 'at' => $now - 229),
                    array('id' => 4, 'author' => 'visitor', 'staff' => '', 'body' => 'کِی فعال می‌شه؟', 'at' => $now - 60),
                )),
            array('id' => 6, 'token_hash' => str_repeat('1', 64), 'phone' => '', 'agent' => 'آرش بهرامی', 'status' => 'answered',
                'created' => $now - 7200, 'updated' => $now - 6000, 'last_by' => 'staff', 'unread' => 0, 'page' => '/numbers/', 'ua' => 'اندروید · Chrome',
                'messages' => array(
                    array('id' => 5, 'author' => 'visitor', 'staff' => '', 'body' => 'شماره مجازی آمریکا برای واتساپ دارید؟', 'at' => $now - 7200),
                    array('id' => 6, 'author' => 'bot', 'staff' => '', 'body' => 'وصلت می‌کنم به آرش بهرامی از تیم پشتیبانی.', 'at' => $now - 7199),
                    array('id' => 7, 'author' => 'staff', 'staff' => 'مدیر', 'body' => 'بله، از صفحه‌ی شماره‌ها «آمریکا» و «واتساپ» را انتخاب کنید.', 'at' => $now - 6000),
                )),
        ),
    );
}

function hc_find(array &$d, $id) {
    foreach ($d['chats'] as $i => $c) {
        if ($c['id'] === (int) $id) {
            return $i;
        }
    }
    return null;
}

function hc_msgs(array $c, $after, $staff) {
    $out = array();
    foreach ($c['messages'] as $m) {
        if ($m['id'] <= (int) $after) continue;
        $out[] = array('id' => $m['id'], 'author' => $m['author'], 'name' => $m['author'] === 'staff' ? $c['agent'] : '',
            'staff' => $staff ? $m['staff'] : '', 'body' => $m['body'], 'at' => gmdate('c', $m['at']));
    }
    return $out;
}

function hc_open_now(array $s) {
    $t = time() + 12600; // تهران
    $day = ((int) gmdate('w', $t) + 1) % 7;
    return phoenix_acc_chat_is_open($s, (int) gmdate('G', $t) * 60 + (int) gmdate('i', $t), $day);
}

function hc_counts(array $d) {
    $o = array('open' => 0, 'answered' => 0, 'closed' => 0, 'unread' => 0);
    foreach ($d['chats'] as $c) { $o[$c['status']]++; $o['unread'] += $c['unread']; }
    return $o;
}

function hc_row(array $c) {
    $last = null;
    foreach ($c['messages'] as $m) { if (in_array($m['author'], array('visitor', 'staff'), true)) $last = $m; }
    return array('id' => $c['id'], 'agent' => $c['agent'], 'status' => $c['status'], 'unread' => (bool) $c['unread'],
        'phone' => $c['phone'], 'customer' => $c['phone'] === '09121234567' ? 'علی رضایی' : '', 'page' => $c['page'], 'device' => $c['ua'],
        'created' => gmdate('c', $c['created']), 'updated' => gmdate('c', $c['updated']),
        'last' => $last ? array('author' => $last['author'], 'body' => mb_substr($last['body'], 0, 140)) : null);
}
