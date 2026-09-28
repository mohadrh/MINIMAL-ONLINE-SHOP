/* ============================================================
   پنلِ فونیکس — پوسته.

   سربرگ، منو، حالتِ رنگ، کلاینتِ API، مسیریاب، و نگهبانِ
   تغییراتِ ذخیره‌نشده. هر صفحه یک فایلِ جدا در ‎screens/‎ است که
   فقط وقتی باز می‌شود بار می‌شود.

   ⚠ صفحه‌ها چیزی import نمی‌کنند؛ همه‌چیز را از ‎ctx‎ می‌گیرند.

   دلیلش کشِ مرورگر است. ماژولی که ‎import './ui.js'‎ کند، نسخه‌ی
   بی‌پارامتر را می‌گیرد و بعد از به‌روزرسانیِ افزونه، مرورگر
   همان قدیمی را از کش می‌دهد — پنلی با نیمی کدِ تازه و نیمی
   قدیمی. این‌جا هر فایل با ‎?v=نسخه‎ و فقط یک بار بار می‌شود.
   ============================================================ */

const BOOT = window.PHX_BOOT || {};
const V = '?v=' + encodeURIComponent(BOOT.ver || '0');

const ui = await import('./ui.js' + V);
const { makeKit } = await import('./kit.js' + V);
const kit = makeKit(ui);
const { makePricing } = await import('./pricing-kit.js' + V);
const pricing = makePricing(ui, kit);
const { h, icon, clear, toast, fa, confirmBox } = ui;

const root = document.getElementById('phx-app');

/* ------------------------------------------------------------
   کلاینتِ API
   ------------------------------------------------------------ */

class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    /** خطاهای هر فیلد — ‎{ 'plans.0.label': 'پیام' }‎ */
    this.fields = (details && details.errors) || null;
  }
}

/**
 * ⚠ هر درخواست nonce دارد و کوکی — و هیچ‌چیزِ دیگری.
 * هیچ کلید و رمزی در این فایل نیست و نباید باشد.
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
  try { data = await res.json(); } catch { /* پاسخِ غیرِ JSON */ }

  if (!res.ok) {
    /* ⚠ nonceِ منقضی یعنی نشست تمام شده، نه خرابی. */
    if (res.status === 401 || data?.code === 'rest_cookie_invalid_nonce') sessionExpired();
    throw new ApiError(data?.message || `خطای سرور (${res.status})`, res.status, data?.code, data?.data);
  }
  return data && typeof data === 'object' && 'data' in data ? data.data : data;
}

function sessionExpired() {
  if (document.querySelector('.phx2-expired')) return;
  view.prepend(h('div', { class: 'phx2-card phx2-expired', role: 'alert' },
    h('div', { class: 'phx2-alert is-warn' },
      h('div', { class: 'phx2-alert__t' }, 'نشستِ کاری تمام شده'),
      h('p', { class: 'phx2-alert__x' }, 'برای امنیت، پنل بعد از مدتی بی‌کاری دوباره تأیید می‌خواهد. تغییراتِ ذخیره‌نشده را جایی کپی کن، بعد صفحه را تازه کن.'),
      h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button', onclick: () => location.reload() },
        icon('refresh'), 'تازه کردنِ صفحه'),
    ),
  ));
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
    applyTheme(prev);
    paintSeg(seg, prev);
    toast('حالتِ رنگ ذخیره نشد: ' + e.message, 'bad');
  }
}

function paintSeg(seg, t) {
  for (const b of seg.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.theme === t));
}

/* ------------------------------------------------------------
   منو — همه‌ی بخش‌ها در پنلِ تازه
   ------------------------------------------------------------ */

const NAV = [
  { id: 'dashboard', label: 'داشبورد',    icon: 'grid' },
  { id: 'products',  label: 'محصولات',    icon: 'box' },
  { id: 'rate',      label: 'منابعِ قیمت', icon: 'pulse' },
  { id: 'margins',   label: 'حاشیه‌ها',   icon: 'percent' },
  { id: 'discounts', label: 'تخفیف‌ها',   icon: 'tag' },
  { id: 'queue',     label: 'صفِ تحویل',  icon: 'inbox' },
  { id: 'log',       label: 'تاریخچه',    icon: 'clock' },
  { id: 'settings',  label: 'تنظیمات',    icon: 'sliders' },
];
const IDS = new Set(NAV.map((n) => n.id));

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
      type: 'button', 'data-theme': t.id, title: t.label, 'aria-label': t.label, 'aria-pressed': 'false',
      onclick: () => setTheme(t.id, seg),
    }, icon(t.icon)));
  }
  paintSeg(seg, root.dataset.theme || 'system');

  rateChip = h('a', { class: 'phx2-ratechip is-neutral', href: '#/rate', title: 'نرخِ تتر' },
    h('span', { class: 'phx2-ratechip__dot', 'aria-hidden': 'true' }),
    h('span', null, 'نرخ'),
    h('b', { class: 'num' }, '…'),
  );

  navList = h('ul', { class: 'phx2-nav', role: 'list' });
  for (const item of NAV) {
    navList.append(h('li', null, h('a', { href: '#/' + item.id, 'data-id': item.id }, icon(item.icon), item.label)));
  }

  const head = h('header', { class: 'phx2-head' },
    h('div', { class: 'phx2-head__row' },
      h('a', { class: 'phx2-brand', href: '#/dashboard' },
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

function setRate(value, stale) {
  if (!rateChip) return;
  rateChip.querySelector('b').textContent = value ? fa(value) : 'ندارد';
  rateChip.className = 'phx2-ratechip ' + (!value ? 'is-bad' : stale ? 'is-warn' : 'is-good');
  rateChip.title = !value ? 'هیچ نرخی گرفته نشده' : stale ? 'نرخ کهنه است' : 'نرخِ تتر، تازه';
}

/* ------------------------------------------------------------
   نگهبانِ تغییراتِ ذخیره‌نشده

   ⚠ فرمی که ده دقیقه رویش کار شده، با یک کلیکِ اشتباه روی منو
   نباید بی‌صدا دور ریخته شود. هم رفتن به بخشِ دیگرِ پنل می‌پرسد،
   هم بستنِ تب و رفتن به صفحه‌ی دیگرِ وردپرس.
   ------------------------------------------------------------ */

let dirty = false;
let lastHash = location.hash;
let skipNext = false;

function setDirty(v) {
  dirty = !!v;
  root.classList.toggle('is-dirty', dirty);
}

window.addEventListener('beforeunload', (e) => {
  if (!dirty) return;
  e.preventDefault();
  e.returnValue = '';
});

async function onHash() {
  if (skipNext) { skipNext = false; return; }
  if (dirty) {
    const target = location.hash;
    skipNext = true;
    location.hash = lastHash;
    const ok = await confirmBox({
      title: 'تغییرات ذخیره نشده‌اند',
      text: 'اگر از این صفحه بروی، تغییراتی که ذخیره نکرده‌ای از دست می‌روند.',
      ok: 'برو، ذخیره نمی‌خواهم',
      cancel: 'بمان',
    });
    if (!ok) return;
    setDirty(false);
    location.hash = target;
    return;
  }
  lastHash = location.hash;
  route();
}

/* ------------------------------------------------------------
   مسیریاب —  ‎#/products/42‎  →  صفحه‌ی products با پارامتر 42
   ------------------------------------------------------------ */

function parse() {
  const m = location.hash.match(/^#\/([a-z-]+)(?:\/([A-Za-z0-9_-]+))?/);
  const id = m && IDS.has(m[1]) ? m[1] : 'dashboard';
  return { id, param: m && IDS.has(m[1]) ? (m[2] || null) : null };
}

let token = 0;

async function route() {
  const { id, param } = parse();
  const my = ++token;
  setDirty(false);

  for (const a of navList.querySelectorAll('a')) {
    if (a.dataset.id === id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  syncWpMenu(id);

  clear(view);
  view.append(h('div', { class: 'phx2-skel', style: { height: '140px' } }),
    h('div', { class: 'phx2-skel', style: { height: '320px' } }));

  try {
    const mod = await import(`./screens/${id}.js${V}`);
    if (my !== token) return;
    await mod.render({ ...ctx, param, alive: () => my === token });
    if (my === token) view.focus({ preventScroll: true });
  } catch (e) {
    if (my !== token) return;
    showError(e);
  }
}

/**
 * منوی کناریِ وردپرس هم بخشِ باز را نشان بدهد.
 *
 * همه‌ی زیرمنوهای فونیکس یک صفحه‌اند با ‎#‎ متفاوت، پس وردپرس
 * همیشه اولی («داشبورد») را پررنگ می‌کند — حتی وقتی ادمین در
 * محصولات است.
 */
function syncWpMenu(id) {
  for (const li of document.querySelectorAll('#toplevel_page_phoenix .wp-submenu li')) {
    const a = li.querySelector('a');
    if (!a) continue;
    const m = (a.getAttribute('href') || '').match(/#\/([a-z-]+)/);
    const on = (m ? m[1] : 'dashboard') === id;
    li.classList.toggle('current', on);
    a.classList.toggle('current', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
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
  kit,
  pricing,
  boot: BOOT,
  get view() { return view; },
  api,
  ApiError,
  setRate,
  setDirty,
  showError,
  reload: route,
  go(path) { location.hash = '#/' + path; },
};

/* ------------------------------------------------------------
   شروع
   ------------------------------------------------------------ */

applyTheme(root.dataset.theme || BOOT.theme || 'system');
renderShell();
window.addEventListener('hashchange', onHash);
route();

/* نرخِ سربرگ را داشبورد و صفحه‌ی منابع خودشان پر می‌کنند؛ اگر
   پنل از صفحه‌ی دیگری باز شد، سربرگ با «…» نماند. */
if (!['dashboard', 'rate'].includes(parse().id)) {
  api('GET', '/rate').then((d) => setRate(d.current.value, d.current.stale)).catch(() => {});
}

/* ⚠ فقط برای تستِ خودکار؛ روی کار اثری ندارد */
root.dataset.ready = '1';
