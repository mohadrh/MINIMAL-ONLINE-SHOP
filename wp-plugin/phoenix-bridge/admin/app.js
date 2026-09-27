/* ============================================================
   پنلِ فونیکس — پوسته.

   سربرگ، منو، حالتِ رنگ، کلاینتِ API، و مسیریاب. هر صفحه یک
   فایلِ جدا در ‎screens/‎ است که فقط وقتی باز می‌شود بار می‌شود.

   ⚠ صفحه‌ها چیزی import نمی‌کنند؛ همه‌چیز را از ‎ctx‎ می‌گیرند.

   دلیلش کشِ مرورگر است. ماژولی که ‎import './ui.js'‎ کند، نسخه‌ی
   بی‌پارامتر را می‌گیرد و بعد از به‌روزرسانیِ افزونه، مرورگر
   همان قدیمی را از کش می‌دهد — یعنی پنلی با نیمی کدِ تازه و
   نیمی قدیمی. این‌جا هر فایل با ‎?v=نسخه‎ بار می‌شود و فقط یک
   جا، پس همیشه همه با هم عوض می‌شوند.
   ============================================================ */

const BOOT = window.PHX_BOOT || {};
const V = '?v=' + encodeURIComponent(BOOT.ver || '0');

const ui = await import('./ui.js' + V);
const { h, icon, clear, toast, fa } = ui;

const root = document.getElementById('phx-app');

/* ------------------------------------------------------------
   کلاینتِ API
   ------------------------------------------------------------ */

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * ⚠ هر درخواست nonce دارد و کوکی — و هیچ‌چیزِ دیگری.
 *
 * هیچ کلید و رمزی در این فایل نیست و نباید باشد: همه‌چیز در
 * سرور است و پنل فقط نتیجه را می‌بیند.
 */
async function api(method, path, body) {
  let res;
  try {
    res = await fetch(BOOT.root + path, {
      method,
      credentials: 'same-origin',
      headers: {
        'X-WP-Nonce': BOOT.nonce,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('به سرور نرسید. اتصالِ اینترنت را چک کن.', 0, 'network');
  }

  let data = null;
  try { data = await res.json(); } catch { /* پاسخِ غیرِ JSON — پایین رسیدگی می‌شود */ }

  if (!res.ok) {
    /* ⚠ nonceِ منقضی یعنی نشست تمام شده، نه خرابی.
       nonceِ وردپرس یک روز عمر دارد؛ پنلی که از دیروز باز مانده
       با همین خطا روبه‌رو می‌شود و باید بگوید چه کند. */
    if (res.status === 401 || data?.code === 'rest_cookie_invalid_nonce') {
      sessionExpired();
    }
    throw new ApiError(data?.message || `خطای سرور (${res.status})`, res.status, data?.code);
  }
  return data && typeof data === 'object' && 'data' in data ? data.data : data;
}

function sessionExpired() {
  if (document.querySelector('.phx2-expired')) return;
  const bar = h('div', { class: 'phx2-card phx2-expired', role: 'alert' },
    h('div', { class: 'phx2-alert is-warn' },
      h('div', { class: 'phx2-alert__t' }, 'نشستِ کاری تمام شده'),
      h('p', { class: 'phx2-alert__x' }, 'برای امنیت، پنل بعد از مدتی بی‌کاری دوباره تأیید می‌خواهد.'),
      h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button', onclick: () => location.reload() },
        icon('refresh'), 'تازه کردنِ صفحه'),
    ),
  );
  view.prepend(bar);
}

/* ------------------------------------------------------------
   حالتِ رنگ
   ------------------------------------------------------------ */

const THEMES = [
  { id: 'light',  label: 'روشن',  icon: 'sun' },
  { id: 'dark',   label: 'تاریک', icon: 'moon' },
  { id: 'system', label: 'مثلِ سیستم', icon: 'monitor' },
];

function applyTheme(t) {
  const b = document.body;
  b.classList.remove('phx2-theme-light', 'phx2-theme-dark', 'phx2-theme-system');
  b.classList.add('phx2-body', 'phx2-theme-' + t);
  root.dataset.theme = t;
}

async function setTheme(t, seg) {
  const prev = root.dataset.theme;
  applyTheme(t);
  paintSeg(seg, t);
  try {
    await api('POST', '/prefs', { theme: t });
  } catch (e) {
    /* ⚠ برگشت به حالتِ قبل، نه ماندن روی حالتِ ذخیره‌نشده.
       وگرنه صفحه‌ی بعد با حالتِ قبلی باز می‌شود و کاربر فکر
       می‌کند انتخابش گم شده. */
    applyTheme(prev);
    paintSeg(seg, prev);
    toast('حالتِ رنگ ذخیره نشد: ' + e.message, 'bad');
  }
}

function paintSeg(seg, t) {
  for (const b of seg.querySelectorAll('button')) {
    b.setAttribute('aria-pressed', String(b.dataset.theme === t));
  }
}

/* ------------------------------------------------------------
   منو

   ⚠ صفحه‌هایی که هنوز در نسخه‌ی ۲ ساخته نشده‌اند به صفحه‌ی
   نسخه‌ی ۱ می‌روند — و برچسب دارند.

   جای خالی («به‌زودی») نمی‌گذاریم: هر مورد در منو باید کاری
   بکند. ولی کسی که رویش می‌زند باید بداند به صفحه‌ی قدیمی
   می‌رود، وگرنه ظاهرِ متفاوت شبیهِ خرابی به نظر می‌رسد.
   ------------------------------------------------------------ */

const NAV = [
  { id: 'dashboard', label: 'داشبورد',     icon: 'grid',    screen: 'dashboard' },
  { id: 'products',  label: 'محصولات',     icon: 'box',     legacy: 'ووکامرس' },
  { id: 'rate',      label: 'منابع قیمت',  icon: 'pulse',   legacy: 'قبلی' },
  { id: 'margins',   label: 'حاشیه‌ها',    icon: 'percent', legacy: 'قبلی' },
  { id: 'discounts', label: 'تخفیف‌ها',    icon: 'tag',     legacy: 'قبلی' },
  { id: 'queue',     label: 'صف تحویل',    icon: 'inbox',   legacy: 'قبلی' },
  { id: 'log',       label: 'تاریخچه',     icon: 'clock',   legacy: 'قبلی' },
];

const SCREENS = Object.fromEntries(NAV.filter((n) => n.screen).map((n) => [n.id, n.screen]));

function navHref(item) {
  if (item.screen) return '#/' + item.id;
  return (BOOT.links && BOOT.links[item.id]) || '#';
}

/* ------------------------------------------------------------
   پوسته
   ------------------------------------------------------------ */

let view;
let navList;
let rateChip;

function renderShell() {
  clear(root);

  const seg = h('div', { class: 'phx2-seg', role: 'group', 'aria-label': 'حالتِ رنگ' });
  for (const t of THEMES) {
    seg.append(h('button', {
      type: 'button',
      'data-theme': t.id,
      title: t.label,
      'aria-label': t.label,
      'aria-pressed': 'false',
      onclick: () => setTheme(t.id, seg),
    }, icon(t.icon)));
  }
  paintSeg(seg, root.dataset.theme || 'system');

  rateChip = h('span', { class: 'phx2-ratechip is-neutral', title: 'نرخِ تتر' },
    h('span', { class: 'phx2-ratechip__dot', 'aria-hidden': 'true' }),
    h('span', null, 'نرخ'),
    h('b', { class: 'num' }, '…'),
  );

  navList = h('ul', { class: 'phx2-nav', role: 'list' });
  for (const item of NAV) {
    navList.append(h('li', null,
      h('a', { href: navHref(item), 'data-id': item.id },
        icon(item.icon),
        item.label,
        item.legacy && h('span', { class: 'phx2-nav__legacy' }, item.legacy),
      ),
    ));
  }

  const head = h('header', { class: 'phx2-head' },
    h('div', { class: 'phx2-head__row' },
      h('div', { class: 'phx2-brand' },
        h('span', { class: 'phx2-brand__mark', 'aria-hidden': 'true' }, 'ف'),
        h('span', null,
          h('span', { class: 'phx2-brand__t' }, 'فونیکس'),
          h('span', { class: 'phx2-brand__s' }, 'پنلِ مدیریتِ فروشگاه'),
        ),
      ),
      h('div', { class: 'phx2-tools' }, rateChip, seg),
    ),
    h('nav', { 'aria-label': 'بخش‌های پنل' }, navList),
  );

  view = h('main', { class: 'phx2-view', id: 'phx2-view', tabindex: '-1' });
  root.append(head, view);
}

/** چیپِ نرخِ سربرگ — هر صفحه‌ای که نرخ را می‌داند صدایش می‌زند */
function setRate(value, stale) {
  if (!rateChip) return;
  const b = rateChip.querySelector('b');
  b.textContent = value ? fa(value) : 'ندارد';
  rateChip.className = 'phx2-ratechip ' + (!value ? 'is-bad' : stale ? 'is-warn' : 'is-good');
  rateChip.title = !value ? 'هیچ نرخی گرفته نشده' : stale ? 'نرخ کهنه است' : 'نرخِ تتر، تازه';
}

/* ------------------------------------------------------------
   مسیریاب
   ------------------------------------------------------------ */

function currentId() {
  const m = location.hash.match(/^#\/([a-z-]+)/);
  const id = m ? m[1] : 'dashboard';
  return SCREENS[id] ? id : 'dashboard';
}

let token = 0;

async function route() {
  const id = currentId();
  const my = ++token;

  for (const a of navList.querySelectorAll('a')) {
    if (a.dataset.id === id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }

  clear(view);
  view.append(h('div', { class: 'phx2-skel', style: { height: '140px' } }));

  try {
    const mod = await import(`./screens/${SCREENS[id]}.js${V}`);
    /* ⚠ اگر کاربر وسطِ بار شدن به صفحه‌ی دیگری رفت، نتیجه‌ی این
       یکی دور ریخته می‌شود — وگرنه صفحه‌ی کُندتر روی صفحه‌ی
       جدیدتر می‌نشیند. */
    if (my !== token) return;
    await mod.render(ctx);
  } catch (e) {
    if (my !== token) return;
    showError(e);
  }
}

function showError(e) {
  clear(view);
  view.append(h('div', { class: 'phx2-card phx2-error', role: 'alert' },
    icon('alert'),
    h('h2', { class: 'phx2-card__t' }, 'این بخش بار نشد'),
    h('p', null, e && e.message ? e.message : 'خطای ناشناخته.'),
    h('button', { class: 'phx2-btn', type: 'button', onclick: route }, icon('refresh'), 'دوباره'),
  ));
}

/* ------------------------------------------------------------
   ‎ctx‎ — تنها چیزی که صفحه‌ها می‌بینند
   ------------------------------------------------------------ */

const ctx = {
  ui,
  boot: BOOT,
  get view() { return view; },
  api,
  setRate,
  showError,
  /** رفتن به بخشی از پنل، یا به صفحه‌ی نسخه‌ی قبلیِ آن */
  go(id) {
    if (SCREENS[id]) { location.hash = '#/' + id; return; }
    const url = BOOT.links && BOOT.links[id];
    if (url) location.href = url;
  },
};

/* ------------------------------------------------------------
   شروع
   ------------------------------------------------------------ */

applyTheme(root.dataset.theme || BOOT.theme || 'system');
renderShell();
window.addEventListener('hashchange', route);
route();

/* ⚠ نشانِ آماده بودن — فقط برای تستِ خودکار؛ روی کار اثری ندارد */
root.dataset.ready = '1';
