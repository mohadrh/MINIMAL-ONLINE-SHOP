<?php
/**
 * بک‌اندِ ساختگیِ سایت — برای امتحانِ ورود و پنلِ مشتری بدونِ وردپرس.
 *
 *   ‎/wp-json/phoenix/v1/otp/{request,verify}‎  کدِ ورود
 *   ‎/wp-json/phoenix/v1/order‎                 ثبتِ سفارش (با ژتون یا نشست)
 *   ‎/wp-json/phoenix-account/v1/…‎             همه‌ی APIِ مشتری
 *
 * ⚠ کدِ پیامکی همیشه ‎123456‎ است — فقط این‌جا. قضاوت‌ها (قاعده‌ی
 * رمز، هش، قفل، وضعیتِ سفارش، اشتراک، متنِ تیکت) همان توابعِ واقعیِ
 * ‎phoenix-account/includes/core.php‎ و ‎delivery.php‎اند.
 *
 * سایت:  NEXT_PUBLIC_BRIDGE_URL=http://127.0.0.1:4330
 * حالت در ‎.shop-state.json‎؛ ‎?reset=1‎ روی هر درخواست از نو.
 */

define('ABSPATH', __DIR__);
require_once __DIR__ . '/../../phoenix-account/includes/core.php';
require_once __DIR__ . '/../../phoenix-bridge/includes/delivery.php';

const SHOP_SALT = 'harness-only-salt';
const SHOP_CODE = '123456';

/* ---------- CORS: فقط سرورِ توسعه‌ی محلی ---------- */
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if (preg_match('#^http://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, X-Phoenix-Session, X-Phoenix-Chat');
    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

$uri    = (string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode((string) file_get_contents('php://input'), true);
$body   = is_array($body) ? $body : array();

$FILE = __DIR__ . '/.shop-state.json';
$S = (!empty($_GET['reset']) || !is_file($FILE)) ? shop_seed() : json_decode((string) file_get_contents($FILE), true);

function out($data, $status = 200) {
    global $S, $FILE;
    file_put_contents($FILE, json_encode($S, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function fail($code, $msg, $status, array $data = array()) {
    out(array('code' => $code, 'message' => $msg, 'data' => array_merge(array('status' => $status), $data)), $status);
}
function norm_phone($raw) {
    $s = preg_replace('/[^0-9]/', '', strtr((string) $raw, array('۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9')));
    if (strpos($s, '98') === 0 && strlen($s) === 12) $s = '0' . substr($s, 2);
    return preg_match('/^09[0-9]{9}$/', $s) ? $s : '';
}

/* ---------- ژتونِ پل (مثلِ ‎phoenix_make_token‎) ---------- */
function make_token($phone) {
    $exp = time() + 900;
    return base64_encode($phone . '|' . $exp . '|' . hash_hmac('sha256', $phone . '|' . $exp, SHOP_SALT));
}
function token_phone($t) {
    $raw = base64_decode((string) $t, true);
    $p = $raw === false ? array() : explode('|', $raw);
    if (count($p) !== 3 || !ctype_digit($p[1]) || (int) $p[1] < time()) return '';
    return hash_equals(hash_hmac('sha256', $p[0] . '|' . $p[1], SHOP_SALT), $p[2]) ? $p[0] : '';
}
function token_consume($t) {
    global $S;
    $phone = token_phone($t);
    $k = hash('sha256', (string) $t);
    if ($phone === '' || isset($S['used'][$k])) return '';
    $S['used'][$k] = time();
    return $phone;
}

/* ---------- نشست (همان شکلِ ‎phoenix_acc_*‎) ---------- */
function session_new($phone) {
    global $S;
    $raw = phoenix_acc_new_token();
    $id = ++$S['seq'];
    $S['sessions'][phoenix_acc_token_hash($raw)] = array('id' => $id, 'phone' => $phone, 'created' => time(), 'last' => time(),
        'ua' => (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 'revoked' => false);
    $S['customers'][$phone] = array_merge(shop_blank_customer($phone), $S['customers'][$phone] ?? array(), array('last_login' => time()));
    $c = $S['customers'][$phone];
    out(array('token' => $raw, 'expires' => gmdate('c', time() + 30 * 86400), 'phone' => $phone, 'has_password' => $c['pass_hash'] !== ''));
}
function session_row() {
    global $S;
    $raw = (string) ($_SERVER['HTTP_X_PHOENIX_SESSION'] ?? '');
    if (!phoenix_acc_token_ok($raw)) return null;
    $h = phoenix_acc_token_hash($raw);
    $r = $S['sessions'][$h] ?? null;
    return $r && !$r['revoked'] ? $r + array('hash' => $h) : null;
}
function revoke_others($phone, $keep) {
    global $S;
    $n = 0;
    foreach ($S['sessions'] as &$s) {
        if ($s['phone'] === $phone && $s['id'] !== $keep && !$s['revoked']) { $s['revoked'] = true; $n++; }
    }
    unset($s);
    return $n;
}

/* ============================================================ */

function shop_blank_customer($phone) {
    return array('phone' => $phone, 'name' => '', 'email' => '', 'pass_hash' => '', 'pass_set_at' => null, 'blocked' => false, 'created' => time(), 'last_login' => null);
}

function shop_seed() {
    $now = time();
    $day = 86400;
    $o = function ($id, $status, $ago, $method, $tx, $items, $note = '') use ($now) {
        return array('id' => $id, 'number' => (string) $id, 'phone' => '09121234567', 'status' => $status,
            'created' => $now - $ago, 'paid' => $status === 'pending' ? 0 : $now - $ago + 60,
            'method' => $method, 'tx' => $tx, 'note' => $note, 'items' => $items);
    };
    $it = function ($id, $name, $qty, $total, $inputs, $job, $days = 0, $deliv = array(), $msg = '') {
        return array('item_id' => $id, 'product_id' => $id + 1000, 'name' => $name, 'qty' => $qty, 'total' => $total,
            'inputs' => $inputs, 'job' => $job, 'job_note' => $msg, 'days' => $days, 'deliveries' => $deliv, 'required' => array());
    };
    return array(
        'seq' => 100,
        'used' => array(),
        'fails' => array(),
        'customers' => array(
            /* رمزِ نمونه: Sunflower-42 */
            '09121234567' => array('phone' => '09121234567', 'name' => 'علی رضایی', 'email' => 'ali.r@example.com',
                'pass_hash' => phoenix_acc_password_hash('Sunflower-42'), 'pass_set_at' => $now - 20 * $day, 'blocked' => false,
                'created' => $now - 90 * $day, 'last_login' => $now - 2 * $day),
        ),
        'sessions' => array(),
        'orders' => array(
            '1204' => $o(1204, 'processing', 1500, 'زرین‌پال', 'A000000000123456789', array(
                $it(9041, 'چت‌جی‌پی‌تی پلاس - یک‌ماهه', 1, 5389000, array(array('key' => 'ایمیلِ اکانت', 'value' => 'ali.r@exmaple.com')), 'needs_input', 30, array(),
                    'این ایمیل در چت‌جی‌پی‌تی اکانت ندارد؛ ایمیلِ درست را بنویس.'),
                $it(9042, 'کلود پرو', 1, 5803000, array(), 'pending', 30),
            ), 'لطفاً امروز فعال شود.'),
            '1180' => $o(1180, 'completed', 12 * $day, 'درگاه سامان', '783412905501', array(
                $it(8801, 'اسپاتیفای پریمیوم - انفرادی', 1, 378000, array(), 'done', 30, array(
                    array('id' => 'd1', 'kind' => 'account', 'secret' => array('username' => 'phx.sp.2291@mail.com', 'password' => 'Qx7-mT92-Lp'),
                          'note' => 'رمز را عوض نکن؛ پروفایلِ خودت را بساز.', 'until' => 0, 'at' => $now - 12 * $day + 3600),
                )),
                $it(8802, 'کارتِ هدیه‌ی استیم ۲۰ دلاری', 1, 1950000, array(), 'done', 0, array(
                    array('id' => 'd2', 'kind' => 'code', 'secret' => array('code' => 'K7X4M-9QP2W-BR88T'), 'note' => 'در Steam از Add a Wallet Code.', 'until' => 0, 'at' => $now - 12 * $day + 4000),
                )),
            )),
            '1210' => $o(1210, 'pending', 600, '', '', array($it(9101, 'کانوا پرو - یک‌ماهه', 1, 249000, array(), null, 30))),
        ),
        'tickets' => array(
            array('id' => 31, 'phone' => '09121234567', 'subject' => 'فعال‌سازیِ چت‌جی‌پی‌تی', 'order_id' => 1204, 'status' => 'answered',
                'created' => $now - 1200, 'updated' => $now - 600, 'last_by' => 'staff', 'unread' => true, 'messages' => array(
                    array('id' => 1, 'author' => 'customer', 'body' => 'سلام، کِی فعال می‌شود؟', 'at' => $now - 1200),
                    array('id' => 2, 'author' => 'staff', 'body' => "ایمیلی که دادی اکانت ندارد.\nدر همان سفارش «اصلاح» را بزن و ایمیلِ درست را بنویس.", 'at' => $now - 600),
                )),
        ),
    );
}

/* ---------- سفارش → همان نمای ‎phoenix_order_view‎ ---------- */
function order_view($o, $reveal) {
    $items = array();
    foreach ($o['items'] as $it) {
        $del = array();
        foreach ($it['deliveries'] as $d) {
            $del[] = array('id' => $d['id'], 'kind' => $d['kind'], 'note' => $d['note'], 'until' => $d['until'], 'at' => $d['at'],
                'secret' => $reveal ? $d['secret'] : phoenix_delivery_mask($d['secret']));
        }
        $items[] = array('item_id' => $it['item_id'], 'product_id' => $it['product_id'], 'name' => $it['name'], 'qty' => $it['qty'], 'total' => $it['total'],
            'inputs' => $it['inputs'], 'deliveries' => $del, 'stock_codes' => array(), 'required' => $it['required'],
            'job' => $it['job'] ? array('id' => $it['item_id'], 'status' => $it['job'], 'note' => $it['job_note']) : null);
    }
    return array('id' => $o['id'], 'number' => $o['number'], 'status' => $o['status'], 'status_label' => $o['status'],
        'created' => gmdate('c', $o['created']), 'paid' => $o['paid'] ? gmdate('c', $o['paid']) : null,
        'total' => array_sum(array_column($o['items'], 'total')),
        'payment' => array('method' => $o['method'], 'transaction_id' => $o['tx'], 'is_paid' => (bool) $o['paid']),
        'customer' => array('name' => '', 'phone' => $o['phone'], 'email' => ''), 'note' => $o['note'], 'items' => $items);
}
function own_order($phone, $id) {
    global $S;
    $o = $S['orders'][(string) $id] ?? null;
    return $o && hash_equals($o['phone'], $phone) ? $o : null;
}
function ticket_out($t, $msgs) {
    $r = $t;
    if (!$msgs) unset($r['messages']);
    else $r['messages'] = array_map(function ($m) { return array('id' => $m['id'], 'author' => $m['author'], 'body' => $m['body'], 'at' => gmdate('c', $m['at'])); }, $t['messages']);
    $r['created'] = gmdate('c', $t['created']);
    $r['updated'] = gmdate('c', $t['updated']);
    unset($r['phone']);
    return $r;
}
function me_out($phone) {
    global $S;
    $c = $S['customers'][$phone];
    $paid = array_filter($S['orders'], function ($o) use ($phone) { return $o['phone'] === $phone && $o['paid']; });
    $mine = array_filter($S['tickets'], function ($t) use ($phone) { return $t['phone'] === $phone; });
    return array('phone' => $phone, 'name' => $c['name'], 'email' => $c['email'], 'has_password' => $c['pass_hash'] !== '',
        'pass_set_at' => $c['pass_set_at'] ? gmdate('c', $c['pass_set_at']) : null, 'joined' => gmdate('c', $c['created']),
        'orders_count' => count($paid), 'paid_total' => array_sum(array_map(function ($o) { return array_sum(array_column($o['items'], 'total')); }, $paid)),
        'open_tickets' => count(array_filter($mine, function ($t) { return $t['status'] !== 'closed'; })),
        'unread' => count(array_filter($mine, function ($t) { return $t['unread']; })));
}
function locked_for($phone) {
    global $S;
    $f = $S['fails'][$phone] ?? null;
    return $f && $f['until'] > time() ? $f['until'] - time() : 0;
}
function fail_hit($phone) {
    global $S;
    $n = ($S['fails'][$phone]['n'] ?? 0) + 1;
    $sec = phoenix_acc_lock_seconds($n);
    $S['fails'][$phone] = array('n' => $n, 'until' => $sec ? time() + $sec : 0);
}

/* ============================================================
   پل
   ============================================================ */

if ($uri === '/wp-json/phoenix/v1/otp/request') {
    if (norm_phone($body['phone'] ?? '') === '') fail('phoenix_bad_phone', 'شماره‌ی موبایل معتبر نیست.', 400);
    /* همان شکلِ ‎phoenix_otp_response_extra‎ی Phoenix Account وقتی کد در تلگرام می‌رود */
    out(array('ok' => true, 'ttl' => 120, 'channel' => 'telegram', 'bot' => 'PhoenixShopLoginBot', 'also' => 'email'));
}
if ($uri === '/wp-json/phoenix/v1/otp/verify') {
    $phone = norm_phone($body['phone'] ?? '');
    if ($phone === '' || !preg_match('/^\d{6}$/', (string) ($body['code'] ?? ''))) fail('phoenix_bad_input', 'شماره یا کد معتبر نیست.', 400);
    if ((string) $body['code'] !== SHOP_CODE) fail('phoenix_otp_wrong', 'کد درست نیست.', 401);
    out(array('ok' => true, 'token' => make_token($phone), 'ttl' => 900));
}
if ($uri === '/wp-json/phoenix/v1/order') {
    $phone = norm_phone($body['phone'] ?? '');
    $tp = token_phone($body['token'] ?? '');
    if ($tp === '') { $r = session_row(); $tp = $r ? $r['phone'] : ''; }
    if ($phone === '' || $tp === '' || !hash_equals($tp, $phone)) fail('phoenix_unverified', 'شماره تأیید نشده. اول کد یک‌بارمصرف را بگیر و وارد کن.', 401);
    $id = 1300 + (++$S['seq']);
    $S['orders'][(string) $id] = array('id' => $id, 'number' => (string) $id, 'phone' => $phone, 'status' => 'pending', 'created' => time(), 'paid' => 0,
        'method' => '', 'tx' => '', 'note' => '', 'items' => array());
    out(array('id' => $id, 'number' => (string) $id, 'key' => 'wc_order_x', 'total' => (int) ($body['expected_total'] ?? 0), 'pay_url' => '/account/#orders'));
}

/* ============================================================
   حساب
   ============================================================ */

$p = substr($uri, strlen('/wp-json/phoenix-account/v1'));
if (strpos($uri, '/wp-json/phoenix-account/v1') !== 0) fail('rest_no_route', 'مسیر نیست.', 404);

if ($p === '/session' && $method === 'POST') {
    $phone = token_consume($body['token'] ?? '');
    if ($phone === '') fail('phoenix_acc_token', 'تأیید منقضی شده یا قبلاً استفاده شده. کدِ تازه بگیر.', 401);
    if (!empty($S['customers'][$phone]['blocked'])) fail('phoenix_acc_blocked', 'این حساب بسته شده. با پشتیبانی تماس بگیر.', 403);
    unset($S['fails'][$phone]);
    session_new($phone);
}
if ($p === '/login') {
    $phone = norm_phone($body['phone'] ?? '');
    $pass = is_string($body['password'] ?? null) ? $body['password'] : '';
    if ($phone === '' || $pass === '') fail('phoenix_invalid', 'شماره و رمز را بنویس.', 422, array('errors' => array('phone' => 'شماره و رمز را بنویس.')));
    if ($w = locked_for($phone)) fail('phoenix_acc_locked', 'چند بار اشتباه زدی. ' . phoenix_acc_fa_digits_min($w) . ' دیگر امتحان کن، یا با کدِ پیامکی وارد شو.', 429);
    $hash = $S['customers'][$phone]['pass_hash'] ?? '';
    if (!($hash !== '' && phoenix_acc_password_check($pass, $hash))) {
        fail_hit($phone);
        fail('phoenix_acc_wrong', 'شماره یا رمز درست نیست. اگر رمز نگذاشته‌ای، با کدِ پیامکی وارد شو.', 401);
    }
    unset($S['fails'][$phone]);
    session_new($phone);
}
if ($p === '/password/reset') {
    $pass = is_string($body['password'] ?? null) ? $body['password'] : '';
    $hint = token_phone($body['token'] ?? '');
    if ($hint === '') fail('phoenix_acc_token', 'تأیید منقضی شده. کدِ تازه بگیر.', 401);
    if ($pr = phoenix_acc_password_problem($pass, $hint)) fail('phoenix_invalid', $pr, 422, array('errors' => array('password' => $pr)));
    $phone = token_consume($body['token']);
    if ($phone === '') fail('phoenix_acc_token', 'این تأیید قبلاً استفاده شده. کدِ تازه بگیر.', 401);
    $S['customers'][$phone] = array_merge(shop_blank_customer($phone), $S['customers'][$phone] ?? array(),
        array('pass_hash' => phoenix_acc_password_hash($pass), 'pass_set_at' => time()));
    revoke_others($phone, 0);
    unset($S['fails'][$phone]);
    session_new($phone);
}

/* ---------- چتِ آنلاین — بی‌نشست، با ژتونِ گفتگو (مشترک با پنل) ---------- */
if (strpos($p, '/chat') === 0) {
    require_once __DIR__ . '/chat-store.php';
    $CD = hc_load();
    $cs = $CD['settings'];
    if ($p === '/chat/config') out(phoenix_acc_chat_public($cs, hc_open_now($cs)));
    if ($p === '/chat' && $method === 'POST') {
        if (empty($cs['enabled'])) fail('phoenix_acc_chat_off', 'چتِ آنلاین فعلاً خاموش است.', 403);
        $msg = phoenix_acc_text($body['message'] ?? '', 2000, true);
        if ($msg === '') fail('phoenix_invalid', 'پیام خالی است.', 422);
        $agent = phoenix_acc_chat_pick_agent(phoenix_acc_chat_active_agents($cs), $body['agent'] ?? '', random_int(0, 1000000));
        $sess0 = session_row();
        $tok = phoenix_acc_new_token();
        $id = ++$CD['seq'];
        $msgs = array();
        $ctx = phoenix_acc_text($body['context'] ?? '', 1500, true);
        if ($ctx !== '') $msgs[] = array('id' => ++$CD['seq'], 'author' => 'system', 'staff' => '', 'body' => $ctx, 'at' => time());
        $msgs[] = array('id' => ++$CD['seq'], 'author' => 'visitor', 'staff' => '', 'body' => $msg, 'at' => time());
        $open = hc_open_now($cs);
        $msgs[] = array('id' => ++$CD['seq'], 'author' => 'bot', 'staff' => '', 'body' => phoenix_acc_chat_fill($open ? $cs['handoff'] : $cs['offline'], $agent), 'at' => time());
        $chat = array('id' => $id, 'token_hash' => phoenix_acc_token_hash($tok), 'phone' => $sess0 ? $sess0['phone'] : '', 'agent' => $agent,
            'status' => 'open', 'created' => time(), 'updated' => time(), 'last_by' => 'visitor', 'unread' => 1,
            'page' => phoenix_acc_text($body['page'] ?? '', 200), 'ua' => phoenix_acc_ua_label((string) ($_SERVER['HTTP_USER_AGENT'] ?? '')), 'messages' => $msgs);
        $CD['chats'][] = $chat;
        hc_save($CD);
        out(array('id' => $id, 'token' => $tok, 'agent' => $agent, 'status' => 'open', 'open' => $open, 'messages' => hc_msgs($chat, 0, false)));
    }
    if (preg_match('#^/chat/(\d+)(/messages|/close)?$#', $p, $m)) {
        $i = hc_find($CD, $m[1]);
        $tok = (string) ($_SERVER['HTTP_X_PHOENIX_CHAT'] ?? '');
        if ($i === null || !phoenix_acc_token_ok($tok) || !hash_equals($CD['chats'][$i]['token_hash'], phoenix_acc_token_hash($tok))) {
            fail('phoenix_acc_nf', 'این گفتگو پیدا نشد.', 404);
        }
        $c = &$CD['chats'][$i];
        $after = (int) ($_GET['after'] ?? ($body['after'] ?? 0));
        if (($m[2] ?? '') === '/messages') {
            $msg = phoenix_acc_text($body['body'] ?? '', 2000, true);
            if ($msg === '') fail('phoenix_invalid', 'پیام خالی است.', 422);
            $c['messages'][] = array('id' => ++$CD['seq'], 'author' => 'visitor', 'staff' => '', 'body' => $msg, 'at' => time());
            $c['status'] = 'open'; $c['unread'] = 1; $c['last_by'] = 'visitor'; $c['updated'] = time();
        } elseif (($m[2] ?? '') === '/close') {
            $c['status'] = 'closed'; $c['unread'] = 0; $c['updated'] = time();
        }
        $res = array('id' => $c['id'], 'agent' => $c['agent'], 'status' => $c['status'], 'messages' => hc_msgs($c, $after, false));
        unset($c);
        hc_save($CD);
        out($res);
    }
    fail('rest_no_route', 'مسیر نیست.', 404);
}

/* ---------- از این‌جا نشست لازم است ---------- */
$sess = session_row();
if (!$sess) fail('phoenix_acc_auth', 'نشستت تمام شده. دوباره وارد شو.', 401);
$phone = $sess['phone'];

if ($p === '/session' && $method === 'DELETE') { $S['sessions'][$sess['hash']]['revoked'] = true; out(array('ok' => true)); }
if ($p === '/sessions') {
    $rows = array();
    foreach ($S['sessions'] as $s) {
        if ($s['phone'] !== $phone || $s['revoked']) continue;
        $rows[] = array('id' => $s['id'], 'device' => phoenix_acc_ua_label($s['ua']), 'created' => gmdate('c', $s['created']), 'last_seen' => gmdate('c', $s['last']), 'current' => $s['id'] === $sess['id']);
    }
    out($rows);
}
if (preg_match('#^/sessions/(\d+)$#', $p, $m)) {
    foreach ($S['sessions'] as &$s) { if ($s['id'] === (int) $m[1] && $s['phone'] === $phone) { $s['revoked'] = true; unset($s); out(array('ok' => true)); } }
    unset($s);
    fail('phoenix_acc_nf', 'این نشست پیدا نشد.', 404);
}
if ($p === '/sessions/others') out(array('ok' => true, 'revoked' => revoke_others($phone, $sess['id'])));

if ($p === '/me' && $method === 'GET') out(me_out($phone));
if ($p === '/me' && $method === 'POST') {
    $name = phoenix_acc_text($body['name'] ?? '', 100);
    $email = trim((string) ($body['email'] ?? ''));
    $err = array();
    if (mb_strlen($name) < 2) $err['name'] = 'نامت را بنویس.';
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $err['email'] = 'ایمیل درست نیست.';
    if ($err) fail('phoenix_invalid', 'بعضی فیلدها درست نیستند.', 422, array('errors' => $err));
    $S['customers'][$phone]['name'] = $name;
    $S['customers'][$phone]['email'] = $email;
    out(me_out($phone));
}
if ($p === '/password') {
    $pass = is_string($body['password'] ?? null) ? $body['password'] : '';
    if ($pr = phoenix_acc_password_problem($pass, $phone)) fail('phoenix_invalid', $pr, 422, array('errors' => array('password' => $pr)));
    $c = $S['customers'][$phone];
    if (!empty($body['token'])) {
        $tp = token_consume($body['token']);
        if ($tp === '' || !hash_equals($tp, $phone)) fail('phoenix_acc_token', 'تأیید منقضی شده. کدِ تازه بگیر.', 401);
    } elseif ($c['pass_hash'] !== '') {
        if (!phoenix_acc_password_check((string) ($body['current'] ?? ''), $c['pass_hash'])) {
            fail_hit($phone);
            fail('phoenix_invalid', 'رمزِ فعلی درست نیست.', 422, array('errors' => array('current' => 'رمزِ فعلی درست نیست.')));
        }
    } elseif ($sess['created'] < time() - 900) {
        fail('phoenix_acc_confirm', 'برای گذاشتنِ رمز، اول با کدِ پیامکی تأیید کن.', 403);
    }
    $S['customers'][$phone]['pass_hash'] = phoenix_acc_password_hash($pass);
    $S['customers'][$phone]['pass_set_at'] = time();
    $n = revoke_others($phone, $sess['id']);
    out(array('ok' => true, 'revoked' => $n, 'me' => me_out($phone)));
}

if ($p === '/orders') {
    $rows = array();
    foreach ($S['orders'] as $o) {
        if ($o['phone'] !== $phone) continue;
        $jobs = array_values(array_filter(array_column($o['items'], 'job')));
        $st = phoenix_acc_order_state($o['status'], $jobs);
        $rows[] = array('id' => $o['id'], 'number' => $o['number'], 'state' => $st, 'label' => PHOENIX_ACC_ORDER_WORDS[$st],
            'created' => gmdate('c', $o['created']), 'total' => array_sum(array_column($o['items'], 'total')),
            'items' => array_map(function ($i) { return array('name' => $i['name'], 'qty' => $i['qty']); }, $o['items']),
            'pay_url' => $st === 'awaiting_payment' ? '/checkout/' : '');
    }
    usort($rows, function ($a, $b) { return strcmp($b['created'], $a['created']); });
    out(array('rows' => $rows, 'page' => 1, 'pages' => 1, 'total' => count($rows)));
}
if (preg_match('#^/orders/(\d+)(/reveal|/inputs)?$#', $p, $m)) {
    $o = own_order($phone, $m[1]);
    if (!$o) fail('phoenix_acc_nf', 'این سفارش پیدا نشد.', 404);
    $act = $m[2] ?? '';
    if ($act === '/inputs') {
        $iid = (int) ($body['item_id'] ?? 0);
        foreach ($S['orders'][(string) $o['id']]['items'] as &$it) {
            if ($it['item_id'] !== $iid) continue;
            if ($it['job'] !== 'needs_input') fail('phoenix_acc_state', 'این قلم الان اصلاح لازم ندارد.', 409);
            $c = phoenix_acc_inputs_clean($body['inputs'] ?? null, array_column($it['inputs'], 'key'));
            if (!$c['ok']) fail('phoenix_invalid', 'بعضی فیلدها درست نیستند.', 422, array('errors' => $c['errors']));
            foreach ($it['inputs'] as &$in) { if (isset($c['data'][$in['key']])) $in['value'] = $c['data'][$in['key']]; }
            unset($in);
            $it['job'] = 'pending';
            $it['job_note'] = 'مشتری اصلاح کرد';
        }
        unset($it);
        $o = $S['orders'][(string) $o['id']];
    }
    out(phoenix_acc_order_for_customer(order_view($o, $act === '/reveal')));
}
if ($p === '/vault') {
    $rows = array();
    foreach ($S['orders'] as $o) {
        if ($o['phone'] !== $phone || !$o['paid']) continue;
        foreach (order_view($o, false)['items'] as $it) {
            if (!$it['deliveries']) continue;
            $rows[] = array('order_id' => $o['id'], 'number' => $o['number'], 'item_id' => $it['item_id'], 'name' => $it['name'],
                'deliveries' => $it['deliveries'], 'stock_codes' => array(), 'at' => max(array_column($it['deliveries'], 'at')));
        }
    }
    out($rows);
}
if ($p === '/subscriptions') {
    $rows = array();
    foreach ($S['orders'] as $o) {
        if ($o['phone'] !== $phone || !$o['paid']) continue;
        foreach ($o['items'] as $it) {
            $sub = phoenix_acc_subscription($it['days'], $it['deliveries'], $o['paid'], time(), !$it['job'] || $it['job'] === 'done');
            if ($sub) $rows[] = $sub + array('order_id' => $o['id'], 'number' => $o['number'], 'item_id' => $it['item_id'], 'name' => $it['name'], 'slug' => 'spotify-premium');
        }
    }
    out($rows);
}

if ($p === '/tickets' && $method === 'GET') {
    $rows = array();
    foreach ($S['tickets'] as $t) { if ($t['phone'] === $phone) $rows[] = ticket_out($t, false); }
    out(array_reverse($rows));
}
if ($p === '/tickets' && $method === 'POST') {
    $c = phoenix_acc_ticket_clean($body, true);
    if (!$c['ok']) fail('phoenix_invalid', 'بعضی فیلدها درست نیستند.', 422, array('errors' => $c['errors']));
    $oid = $c['data']['order_id'] && own_order($phone, $c['data']['order_id']) ? $c['data']['order_id'] : 0;
    $t = array('id' => ++$S['seq'], 'phone' => $phone, 'subject' => $c['data']['subject'], 'order_id' => $oid, 'status' => 'open',
        'created' => time(), 'updated' => time(), 'last_by' => 'customer', 'unread' => false,
        'messages' => array(array('id' => ++$S['seq'], 'author' => 'customer', 'body' => $c['data']['body'], 'at' => time())));
    $S['tickets'][] = $t;
    out(ticket_out($t, true));
}
if (preg_match('#^/tickets/(\d+)(/close)?$#', $p, $m)) {
    foreach ($S['tickets'] as &$t) {
        if ($t['id'] !== (int) $m[1] || $t['phone'] !== $phone) continue;
        if (!empty($m[2])) { $t['status'] = 'closed'; $t['updated'] = time(); }
        elseif ($method === 'POST') {
            $c = phoenix_acc_ticket_clean($body, false);
            if (!$c['ok']) fail('phoenix_invalid', 'متنِ پیام را بنویس.', 422, array('errors' => $c['errors']));
            $t['messages'][] = array('id' => ++$S['seq'], 'author' => 'customer', 'body' => $c['data']['body'], 'at' => time());
            $t['status'] = 'open'; $t['last_by'] = 'customer'; $t['updated'] = time();
        } else {
            $t['unread'] = false;
        }
        $r = ticket_out($t, true);
        unset($t);
        out($r);
    }
    unset($t);
    fail('phoenix_acc_nf', 'این تیکت پیدا نشد.', 404);
}

fail('rest_no_route', 'مسیر نیست: ' . $method . ' ' . $p, 404);

function phoenix_acc_fa_digits_min($sec) {
    return strtr((string) max(1, (int) ceil($sec / 60)), array('0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴', '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹')) . ' دقیقه‌ی';
}
