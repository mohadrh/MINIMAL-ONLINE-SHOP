/* ============================================================
   نمای کلی — صفحه‌ی اولِ پنلِ «مشتریان». (از افزونه‌ی Phoenix Account)

   ⚠ فقط «چه کسی منتظرِ ماست»: تیکتِ بی‌جواب، پرداختِ منتظرِ تأیید،
   سفارشی که مشتری باید اصلاحش کند. آمارِ فروش در داشبوردِ فروشگاه
   است — دو جا یعنی دو عدد که روزی با هم نمی‌خوانند.
   ============================================================ */

const ORDER = {
  pending: ['در انتظارِ پرداخت', 'neutral'], 'on-hold': ['در انتظارِ بررسی', 'warn'],
  processing: ['در حالِ انجام', 'info'], completed: ['تکمیل‌شده', 'good'],
  cancelled: ['لغوشده', 'neutral'], refunded: ['بازگشتِ وجه', 'neutral'], failed: ['ناموفق', 'bad'],
};

function ensureCss() {
  if (document.querySelector('link[data-phxa]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = new URL('../account.css' + new URL(import.meta.url).search, import.meta.url).href;
  l.dataset.phxa = '1';
  document.head.append(l);
}

export async function render(ctx) {
  ensureCss();
  const d = await ctx.api('GET', '/account/overview');
  if (ctx.alive()) paint(ctx, d);
}

function paint(ctx, d) {
  const { h, icon, fa, digits, ago, pill, put, card } = ctx.ui;
  const { kit } = ctx;
  const a = d.attention;
  const c = d.customers;

  const tile = ({ label, value, unit, tone, pillText, sub, href }) => h('a', { class: `phx2-kpi is-${tone} phxa-tile`, href },
    h('div', { class: 'phx2-kpi__row' }, h('span', { class: 'phx2-kpi__k' }, label)),
    h('div', { class: 'phx2-kpi__v num' }, value, unit && h('small', null, unit)),
    h('div', { class: 'phx2-kpi__row' }, pill(pillText, tone)),
    sub && h('p', { class: 'phx2-kpi__s' }, sub),
  );

  const tiles = h('section', { class: 'phx2-kpis', 'aria-label': 'منتظرِ ما' },
    tile({
      label: 'تیکتِ بی‌جواب', value: fa(a.tickets_open), unit: 'تیکت', href: '#/tickets',
      tone: a.tickets_open ? 'warn' : 'good', pillText: a.tickets_open ? 'منتظرِ جوابِ ما' : 'همه جواب گرفته‌اند',
      sub: 'قدیمی‌ترین منتظر اول',
    }),
    tile({
      label: 'پرداختِ منتظرِ تأیید', value: fa(a.on_hold), unit: 'سفارش', href: '#/orders/on-hold',
      tone: a.on_hold ? 'warn' : 'good', pillText: a.on_hold ? 'بررسی کن' : 'چیزی نیست',
      sub: 'کارت‌به‌کارت و مانندش — تا تأیید نشود، تحویل راه نمی‌افتد',
    }),
    tile({
      label: 'منتظرِ اصلاحِ مشتری', value: fa(a.needs_input), unit: 'قلم', href: ctx.worldUrl('store', 'queue') || '#/orders',
      tone: a.needs_input ? 'info' : 'neutral', pillText: a.needs_input ? 'مشتری باید درست کند' : 'هیچ',
      sub: 'در حسابش پیام را می‌بیند و همان‌جا اصلاح می‌کند',
    }),
    tile({
      label: 'پرداخت‌نشده', value: fa(a.pending), unit: 'سفارش', href: '#/orders/pending',
      tone: 'neutral', pillText: 'سبدِ رهاشده یا در راهِ درگاه', sub: '',
    }),
  );

  const strip = h('div', { class: 'phxa-strip' },
    h('div', null, h('span', null, 'مشتری'), h('b', null, fa(c.total))),
    h('div', null, h('span', null, 'تازه در این هفته'), h('b', null, fa(c.new7))),
    h('div', null, h('span', null, 'وارد شده در این هفته'), h('b', null, fa(c.active7))),
    h('div', null, h('span', null, 'رمز گذاشته‌اند'), h('b', null, fa(c.with_password))),
    c.blocked ? h('div', null, h('span', null, 'حسابِ بسته'), h('b', null, fa(c.blocked))) : null,
  );

  const waiting = card('منتظرِ جواب', 'قدیمی‌ترین بالا.',
    d.waiting.length
      ? h('ul', { class: 'phx2-linklist' }, d.waiting.map((t) => h('li', null,
        h('a', { href: '#/tickets/' + t.id }, h('span', { class: 'phxa-dot', 'aria-hidden': 'true' }), t.subject),
        h('span', { class: 'phx2-td-muted' }, (t.customer || digits(t.phone)) + ' · ' + ago(t.updated)))))
      : h('div', { class: 'phx2-allgood' }, icon('checkCircle'), 'هیچ تیکتی منتظرِ ما نیست.'));

  const recent = card('آخرین سفارش‌ها', '',
    d.recent.length
      ? h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table phx2-table--rows' },
        h('thead', null, h('tr', null, h('th', null, 'سفارش'), h('th', null, 'مشتری'), h('th', null, 'مبلغ'), h('th', null, 'وضعیت'), h('th', null, 'زمان'))),
        h('tbody', null, d.recent.map((o) => {
          const [sw, st] = ORDER[o.status] || [o.status_label, 'neutral'];
          const tr = h('tr', { class: 'is-link' },
            h('td', null, h('a', { href: '#/orders/' + o.id }, h('b', { class: 'num' }, '#' + digits(o.number)))),
            h('td', null, o.customer.name || digits(o.customer.phone)),
            h('td', { class: 'num phx2-td-nowrap' }, fa(o.total)),
            h('td', null, pill(sw, st)),
            h('td', { class: 'phx2-td-nowrap' }, ago(o.created)),
          );
          tr.addEventListener('click', (e) => { if (!e.target.closest('a')) ctx.go('orders/' + o.id); });
          return tr;
        }))))
      : h('p', { class: 'phx2-empty' }, 'هنوز سفارشی نیست.'));
  const all = h('a', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', href: '#/orders' }, 'همه', icon('arrow'));
  recent.querySelector('.phx2-card__head').append(all);

  const fresh = card('مشتریانِ تازه', '',
    d.fresh.length
      ? h('ul', { class: 'phx2-linklist' }, d.fresh.map((f) => h('li', null,
        h('a', { href: '#/customers/' + f.phone }, f.name || 'بی‌نام'),
        h('span', { class: 'phx2-td-muted num', dir: 'ltr' }, digits(f.phone)))))
      : h('p', { class: 'phx2-empty' }, 'هنوز کسی نیست.'));

  const sales = ctx.worldUrl('store', 'dashboard');

  put(ctx.view,
    kit.pageHead({
      title: 'نمای کلی',
      sub: 'چه کسی منتظرِ ماست — تیکت، پرداخت، اصلاح.',
      actions: sales ? [h('a', { class: 'phx2-btn phx2-btn--sm', href: sales }, icon('pulse'), 'آمارِ فروش در داشبوردِ فروشگاه')] : [],
    }),
    tiles,
    strip,
    h('div', { class: 'phx2-grid phx2-grid--halves' }, waiting, h('div', { class: 'phx2-grid' }, fresh)),
    recent,
  );
}
