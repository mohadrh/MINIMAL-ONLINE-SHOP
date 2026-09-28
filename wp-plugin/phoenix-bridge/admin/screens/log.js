/* ============================================================
   تاریخچه — هر تغییری که موتور یا آدم انجام داده.

   ⚠ فقط خواندنی. دفترِ رویدادی که از پنل پاک یا ویرایش شود،
   دیگر دفترِ رویداد نیست. هرسش خودکار است: نرخ بعد از ۹۰ روز،
   بقیه بعد از یک سال.
   ============================================================ */

const KIND = { setting: 'تنظیم', rate: 'نرخ', price: 'قیمت', discount: 'تخفیف', queue: 'صف', product: 'محصول' };
const SETTING = {
  engine_on: 'موتور قیمت', auto_fulfil: 'خرید خودکار', margin: 'حاشیه‌ی پیش‌فرض',
  margin_by_cat: 'حاشیه‌ی دسته‌ها', margin_by_prod: 'حاشیه‌ی محصولات', discounts: 'تخفیف‌ها',
  manual_rate: 'نرخ دستی', manual_until: 'انقضای نرخ دستی', sources: 'منابع نرخ',
  pick: 'روش انتخاب نرخ', min_sources: 'حداقل منبع', floor_percent: 'کف قیمت',
  cart_lock_min: 'قفل سبد', spread_max: 'فاصله‌ی مجاز', rate_ttl: 'عمر کش نرخ',
  sane_min: 'کف بازه', sane_max: 'سقف بازه', fulfil_fail_stop: 'توقف بعد از شکست',
};
const toFa = (t) => String(t).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const iso = (t) => '⁨' + t + '⁩';

function subject(kind, s) {
  const v = String(s || '');
  if (kind === 'setting') return SETTING[v] || v;
  if (kind === 'price' || kind === 'product') return 'محصولِ ' + toFa(v);
  if (kind === 'rate') return v === 'refresh' ? 'به‌روزرسانیِ نرخ' : v;
  if (v.startsWith('coupon:')) return 'کدِ ' + iso(v.slice(7));
  if (v.startsWith('job:')) return 'کارِ ' + toFa(v.slice(4));
  if (v.startsWith('order:')) return 'سفارشِ ' + toFa(v.slice(6));
  return /[A-Za-z]/.test(v) ? iso(v) : v;
}

function value(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (v === 'true') return 'روشن';
  if (v === 'false') return 'خاموش';
  const words = { pending: 'منتظر', done: 'انجام‌شده', failed: 'ناموفق', cancelled: 'لغوشده' };
  if (words[v]) return words[v];
  if (/^\d+$/.test(v)) return Number(v).toLocaleString('fa-IR');
  if (/^[\d.,/٪ ]+$/.test(v)) return toFa(v);
  /* JSON — مثلاً نمایه‌ی حاشیه. کامل در title، خلاصه در متن. */
  if (v.startsWith('{') || v.startsWith('[')) return v.length > 40 ? v.slice(0, 40) + '…' : v;
  return v.length > 48 ? v.slice(0, 48) + '…' : v;
}

export async function render(ctx, kind = '', page = 1) {
  const d = await ctx.api('GET', `/log?kind=${encodeURIComponent(kind)}&page=${page}`);
  if (ctx.alive()) paint(ctx, d, kind);
}

function paint(ctx, d, kind) {
  const { h, icon, fa, ago, clear, put } = ctx.ui;
  const { kit } = ctx;

  const filter = kit.seg({
    value: kind, label: 'نوع',
    options: [{ value: '', label: 'همه' }, ...Object.entries(KIND).map(([value, label]) => ({ value, label }))],
    onChange: (k) => render(ctx, k, 1),
  });

  const body = d.rows.length
    ? h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table' },
      h('thead', null, h('tr', null,
        h('th', null, 'کِی'), h('th', null, 'چه'), h('th', null, 'مورد'),
        h('th', null, 'تغییر'), h('th', null, 'چه کسی'), h('th', null, 'توضیح'))),
      h('tbody', null, d.rows.map((r) => h('tr', null,
        h('td', { class: 'phx2-td-nowrap', title: new Date(r.at).toLocaleString('fa-IR') }, ago(r.at)),
        h('td', { class: 'phx2-td-strong' }, KIND[r.kind] || r.kind),
        h('td', { class: 'phx2-td-nowrap' },
          (r.kind === 'price' || r.kind === 'product') && /^\d+$/.test(r.subject)
            ? h('a', { href: '#/products/' + r.subject }, subject(r.kind, r.subject))
            : subject(r.kind, r.subject)),
        h('td', null, h('span', { class: 'phx2-change num', title: (r.before || '—') + ' → ' + (r.after || '—') },
          h('s', null, value(r.before)), icon('arrow'), h('span', null, value(r.after)))),
        h('td', null, r.actor === 'system' ? 'سیستم' : r.actor),
        h('td', null, r.note || '—'),
      ))),
    ))
    : kit.emptyState({ iconName: 'clock', title: 'چیزی ثبت نشده', text: kind ? 'با این فیلتر هیچ رویدادی نیست.' : '' });

  put(ctx.view, 
    kit.pageHead({ title: 'تاریخچه', sub: fa(d.total) + ' رویداد — هر تغییر، با زمان و نامِ کسی که انجامش داد.' }),
    h('div', { class: 'phx2-filters' }, filter.el),
    h('section', { class: 'phx2-card' }, body,
      kit.pager({ page: d.page, pages: d.pages, onGo: (p) => render(ctx, kind, p) })),
  );
}
