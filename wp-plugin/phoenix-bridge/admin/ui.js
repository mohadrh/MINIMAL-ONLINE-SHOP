/* ============================================================
   ابزارهای ساختِ رابط.

   ⚠ هیچ‌جای این پنل ‎innerHTML‎ ندارد — نه برای داده، نه حتی
   برای آیکون.

   داده‌ی این پنل از جاهایی می‌آید که ما کنترلشان نمی‌کنیم:
   نامِ محصولی که کسی در ووکامرس نوشته، پاسخِ یک API، یادداشتِ
   تاریخچه. اگر یکی از این‌ها روزی ‎<img onerror=…>‎ داشته باشد
   و با ‎innerHTML‎ گذاشته شود، در مرورگرِ ادمین اجرا می‌شود — با
   همه‌ی دسترسی‌های ادمین.

   ‎h()‎ هر رشته را ‎textContent‎ می‌کند. یعنی متن همیشه متن است،
   هر چه باشد. آیکون‌ها هم از ‎createElementNS‎ ساخته می‌شوند تا
   حتی یک ‎innerHTML‎ی «امن» در کد نباشد که کسی بعداً الگو
   بگیرد.
   ============================================================ */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * ساختِ عنصر.
 *
 *   h('div', { class: 'x', onclick: fn }, 'متن', h('b', null, 'پررنگ'))
 *
 * ⚠ ویژگی‌هایی که با ‎on‎ شروع می‌شوند فقط تابع می‌پذیرند —
 * رشته‌ی ‎onclick="…"‎ هرگز به‌عنوانِ ویژگی نوشته نمی‌شود.
 */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  applyProps(el, props);
  append(el, kids);
  return el;
}

export function s(tag, props, ...kids) {
  const el = document.createElementNS(SVG_NS, tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      el.setAttribute(k, String(v));
    }
  }
  append(el, kids);
  return el;
}

function applyProps(el, props) {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) {
      if (typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      continue;
    }
    if (k === 'class') { el.className = v; continue; }
    if (k === 'style' && typeof v === 'object') { Object.assign(el.style, v); continue; }
    if (k === 'text') { el.textContent = String(v); continue; }
    /* ⚠ نشانیِ ‎javascript:‎ هرگز در ‎href‎ نمی‌نشیند */
    if ((k === 'href' || k === 'src') && /^\s*javascript:/i.test(String(v))) continue;
    el.setAttribute(k, v === true ? '' : String(v));
  }
}

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/* ------------------------------------------------------------
   آیکون‌ها — مسیرهای ثابتِ خودمان، سبکِ خطی
   ------------------------------------------------------------ */

const ICONS = {
  grid: [['rect', { x: 3, y: 3, width: 7, height: 7, rx: 1.5 }], ['rect', { x: 14, y: 3, width: 7, height: 7, rx: 1.5 }],
    ['rect', { x: 14, y: 14, width: 7, height: 7, rx: 1.5 }], ['rect', { x: 3, y: 14, width: 7, height: 7, rx: 1.5 }]],
  box: [['path', { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' }],
    ['path', { d: 'M3.3 7 12 12l8.7-5' }], ['path', { d: 'M12 22V12' }]],
  pulse: [['path', { d: 'M22 12h-4l-3 9L9 3l-3 9H2' }]],
  percent: [['path', { d: 'M19 5 5 19' }], ['circle', { cx: 6.5, cy: 6.5, r: 2.5 }], ['circle', { cx: 17.5, cy: 17.5, r: 2.5 }]],
  tag: [['path', { d: 'M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z' }],
    ['circle', { cx: 7.5, cy: 7.5, r: 1 }]],
  inbox: [['path', { d: 'M22 12h-6l-2 3h-4l-2-3H2' }],
    ['path', { d: 'M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z' }]],
  clock: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M12 6v6l4 2' }]],
  refresh: [['path', { d: 'M3 12a9 9 0 0 1 9-9 9.8 9.8 0 0 1 6.7 2.7L21 8' }], ['path', { d: 'M21 3v5h-5' }],
    ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.8 9.8 0 0 1-6.7-2.7L3 16' }], ['path', { d: 'M8 16H3v5' }]],
  sun: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4' }]],
  moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
  monitor: [['rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }], ['path', { d: 'M8 21h8M12 17v4' }]],
  alert: [['path', { d: 'm21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3' }], ['path', { d: 'M12 9v4M12 17h.01' }]],
  check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  checkCircle: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'm9 12 2 2 4-4' }]],
  arrow: [['path', { d: 'm12 19-7-7 7-7' }], ['path', { d: 'M19 12H5' }]],
  external: [['path', { d: 'M15 3h6v6M10 14 21 3' }], ['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }]],
  power: [['path', { d: 'M12 2v10' }], ['path', { d: 'M18.4 6.6a9 9 0 1 1-12.8 0' }]],
  bulb: [['path', { d: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5' }],
    ['path', { d: 'M9 18h6M10 22h4' }]],
  info: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M12 16v-4M12 8h.01' }]],
  spark: [['path', { d: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8' }]],
};

export function icon(name, extra) {
  const spec = ICONS[name] || ICONS.info;
  const el = s('svg', {
    viewBox: '0 0 24 24',
    width: 24,
    height: 24,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
    ...(extra || {}),
  });
  for (const [tag, attrs] of spec) el.append(s(tag, attrs));
  return el;
}

/* ------------------------------------------------------------
   قالب‌بندی
   ------------------------------------------------------------ */

const NF = new Intl.NumberFormat('fa-IR');
export const fa = (n) => NF.format(Number(n) || 0);

const RTF = typeof Intl.RelativeTimeFormat === 'function'
  ? new Intl.RelativeTimeFormat('fa', { numeric: 'auto' })
  : null;

/** «۵ دقیقه پیش» */
export function ago(iso) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const sec = Math.round((t - Date.now()) / 1000);
  const abs = Math.abs(sec);
  if (!RTF) return new Date(t).toLocaleString('fa-IR');
  if (abs < 45) return 'همین حالا';
  if (abs < 3600) return RTF.format(Math.round(sec / 60), 'minute');
  if (abs < 86400) return RTF.format(Math.round(sec / 3600), 'hour');
  return RTF.format(Math.round(sec / 86400), 'day');
}

const DF = new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' });
export const shortDate = (iso) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : DF.format(new Date(t));
};

/* ------------------------------------------------------------
   اجزای کوچک
   ------------------------------------------------------------ */

/** نشانِ وضعیت — ‎tone‎: good | warn | bad | info | brand | neutral */
export function pill(text, tone = 'neutral') {
  return h('span', { class: `phx2-pill is-${tone}` }, text);
}

export function card(title, sub, ...kids) {
  return h('section', { class: 'phx2-card' },
    (title || sub) && h('header', { class: 'phx2-card__head' },
      h('div', null,
        title && h('h2', { class: 'phx2-card__t' }, title),
        sub && h('p', { class: 'phx2-card__s' }, sub),
      ),
    ),
    kids,
  );
}

/**
 * دکمه‌ای که حینِ کار قفل می‌شود.
 *
 * ⚠ ‎aria-busy‎ و نه فقط ‎disabled‎: صفحه‌خوان باید بفهمد دکمه
 * «در حالِ کار» است، نه «از کار افتاده». و کلیکِ دوم روی دکمه‌ی
 * در حالِ کار، درخواستِ دوم نمی‌فرستد.
 */
export function busyButton(btn, fn) {
  return async (e) => {
    if (btn.getAttribute('aria-busy') === 'true') return;
    btn.setAttribute('aria-busy', 'true');
    try {
      await fn(e);
    } finally {
      if (btn.isConnected) btn.removeAttribute('aria-busy');
    }
  };
}

/* ------------------------------------------------------------
   پیام‌ها
   ------------------------------------------------------------ */

let toastRegion = null;

export function toast(text, tone = 'info') {
  if (!toastRegion || !toastRegion.isConnected) {
    toastRegion = h('div', { class: 'phx2-toasts', role: 'status', 'aria-live': 'polite', dir: 'rtl' });
    document.body.append(toastRegion);
  }
  const iconName = tone === 'good' ? 'checkCircle' : tone === 'bad' ? 'alert' : 'info';
  const t = h('div', { class: `phx2-toast is-${tone}` }, icon(iconName), h('span', null, text));
  toastRegion.append(t);
  /* پیامِ خطا بیشتر می‌ماند — خواندنش مهم‌تر است */
  setTimeout(() => t.remove(), tone === 'bad' ? 7000 : 4000);
}

/**
 * پنجره‌ی تأیید.
 *
 * ⚠ ‎<dialog>‎ی خودِ مرورگر و نه ‎confirm()‎ و نه پنجره‌ی ساختگی.
 *
 * ‎confirm()‎ متن را با فونت و جهتِ سیستم نشان می‌دهد و فارسی را
 * می‌شکند. پنجره‌ی ساختگی باید تله‌ی فوکوس و کلیدِ Esc را دستی
 * پیاده کند و معمولاً یکی‌شان جا می‌ماند. ‎showModal()‎ هر دو را
 * خودش دارد.
 */
export function confirmBox({ title, text, ok = 'تأیید', cancel = 'انصراف', tone = 'brand' }) {
  return new Promise((resolve) => {
    const okBtn = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, ok);
    const noBtn = h('button', { class: 'phx2-btn phx2-btn--ghost', type: 'button' }, cancel);
    const dlg = h('dialog', { class: `phx2-dialog is-${tone}`, dir: 'rtl', 'aria-labelledby': 'phx2-dlg-t' },
      h('div', { class: 'phx2-dialog__b' },
        h('h2', { class: 'phx2-dialog__t', id: 'phx2-dlg-t' }, title),
        text && h('p', { class: 'phx2-dialog__x' }, text),
      ),
      h('div', { class: 'phx2-dialog__f' }, noBtn, okBtn),
    );
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    okBtn.addEventListener('click', () => done(true));
    noBtn.addEventListener('click', () => done(false));
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
    document.body.append(dlg);
    dlg.showModal();
    /* فوکوس روی «انصراف» — کنشِ برگشت‌پذیر، پیش‌فرضِ امن‌تر است */
    noBtn.focus();
  });
}
