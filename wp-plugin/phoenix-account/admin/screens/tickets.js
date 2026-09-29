/* ============================================================
   تیکت‌ها — صندوقِ پشتیبانی. (از افزونه‌ی Phoenix Account)

   ⚠ پیامِ مشتری فقط متن است: با ‎textContent‎ نشسته، نه HTML.
   تیکت رایج‌ترین راهِ رساندنِ کدِ مخرب به مرورگرِ مدیر است.
   ============================================================ */

const STATUS = { open: ['منتظرِ ما', 'warn'], answered: ['پاسخ داده شد', 'good'], closed: ['بسته', 'neutral'] };

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
  if (ctx.param) return detail(ctx, ctx.param);
  return list(ctx);
}

const state = { status: 'open', page: 1 };

/* ============================================================
   صندوق
   ============================================================ */

async function list(ctx) {
  const d = await ctx.api('GET', '/account/tickets?' + new URLSearchParams({ status: state.status, page: String(state.page) }));
  if (!ctx.alive()) return;
  const { h, fa, digits, ago, pill, put } = ctx.ui;
  const { kit } = ctx;
  const c = d.counts;

  const seg = kit.seg({
    value: state.status, label: 'وضعیت',
    options: [
      { value: 'open', label: 'منتظرِ ما · ' + fa(c.open) },
      { value: 'answered', label: 'پاسخ داده شد · ' + fa(c.answered) },
      { value: 'closed', label: 'بسته · ' + fa(c.closed) },
      { value: '', label: 'همه' },
    ],
    onChange: (v) => { state.status = v; state.page = 1; list(ctx); },
  });

  const body = d.rows.length
    ? h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table phx2-table--rows' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'موضوع'),
        h('th', { scope: 'col' }, 'مشتری'),
        h('th', { scope: 'col' }, 'سفارش'),
        h('th', { scope: 'col' }, 'وضعیت'),
        h('th', { scope: 'col' }, 'آخرین پیام'),
      )),
      h('tbody', null, d.rows.map((t) => {
        const [sw, st] = STATUS[t.status] || [t.status, 'neutral'];
        const tr = h('tr', { class: 'is-link' },
          h('td', null, t.status === 'open' ? h('span', { class: 'phxa-dot', 'aria-hidden': 'true' }) : null,
            h('a', { href: '#/tickets/' + t.id }, h('b', null, t.subject))),
          h('td', null, t.customer || 'بی‌نام', h('span', { class: 'phx2-td-sub num', dir: 'ltr' }, digits(t.phone))),
          h('td', null, t.order_id ? h('a', { href: '#/orders/' + t.order_id, class: 'num' }, '#' + digits(t.order_id)) : '—'),
          h('td', null, pill(sw, st)),
          h('td', { class: 'phx2-td-nowrap' }, ago(t.updated), h('span', { class: 'phx2-td-sub' }, t.last_by === 'staff' ? 'از پشتیبانی' : 'از مشتری')),
        );
        tr.addEventListener('click', (e) => { if (!e.target.closest('a')) ctx.go('tickets/' + t.id); });
        return tr;
      }))))
    : kit.emptyState({
      iconName: 'message',
      title: state.status === 'open' ? 'تیکتی منتظرِ جواب نیست' : 'تیکتی نیست',
      text: state.status === 'open' ? 'هر پیامِ تازه‌ی مشتری این‌جا بالای فهرست می‌آید.' : '',
    });

  put(ctx.view,
    kit.pageHead({ title: 'تیکت‌ها', sub: 'پیام‌های مشتری‌ها از حسابشان — قدیمی‌ترین منتظر بالاتر.' }),
    h('div', { class: 'phx2-filters' }, seg.el),
    body,
    kit.pager({ page: d.page, pages: d.pages, onGo: (p) => { state.page = p; list(ctx); } }),
  );
}

/* ============================================================
   یک تیکت
   ============================================================ */

async function detail(ctx, id) {
  const d = await ctx.api('GET', '/account/tickets/' + encodeURIComponent(id));
  if (ctx.alive()) paint(ctx, d);
}

function paint(ctx, d) {
  const { h, icon, fa, digits, ago, pill, put, toast, busyButton, card } = ctx.ui;
  const { kit } = ctx;
  const t = d.ticket;
  const [sw, st] = STATUS[t.status] || [t.status, 'neutral'];
  const when = (iso) => new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });

  const thread = h('div', { class: 'phxa-thread' }, t.messages.map((m) => h('div', { class: 'phxa-msg is-' + m.author },
    h('div', { class: 'phxa-msg__b', dir: 'auto' }, m.body),
    h('div', { class: 'phxa-msg__m' },
      h('span', null, m.author === 'staff' ? 'پشتیبانی' + (m.staff ? ' · ' + m.staff : '') : 'مشتری'),
      h('time', { datetime: m.at, title: when(m.at) }, ago(m.at))),
  )));

  const reply = kit.area({ rows: 4, max: 4000, placeholder: 'جوابِ مشتری… در حسابش می‌بیند.' });
  const replyF = kit.field({ label: 'پاسخ', wide: true }, reply.el);
  const send = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('message'), 'بفرست');
  send.addEventListener('click', busyButton(send, async () => {
    replyF.setError('');
    try {
      paint(ctx, await ctx.api('POST', '/account/tickets/' + t.id, { act: 'reply', body: reply.get() }));
      toast('فرستاده شد.', 'good');
    } catch (e) {
      if (e.fields && e.fields.body) replyF.setError(e.fields.body);
      toast(e.message, 'bad');
    }
  }));
  const toggle = h('button', { class: 'phx2-btn phx2-btn--ghost', type: 'button' }, icon(t.status === 'closed' ? 'refresh' : 'check'), t.status === 'closed' ? 'باز کن' : 'ببند');
  toggle.addEventListener('click', busyButton(toggle, async () => {
    try {
      paint(ctx, await ctx.api('POST', '/account/tickets/' + t.id, { act: t.status === 'closed' ? 'reopen' : 'close' }));
      toast(t.status === 'closed' ? 'باز شد.' : 'بسته شد.', 'good');
    } catch (e) { toast(e.message, 'bad'); }
  }));

  const conv = card('گفت‌وگو', t.status === 'closed' ? 'بسته است؛ اگر مشتری دوباره بنویسد خودش باز می‌شود.' : '',
    thread,
    h('div', { class: 'phxa-reply' }, h('div', { class: 'phx2-form' }, replyF), h('div', { class: 'phx2-row phx2-row--end' }, toggle, send)),
  );

  const c = d.customer;
  const side = h('div', { class: 'phx2-grid' },
    card('مشتری', '',
      h('dl', { class: 'phx2-kvs2' },
        h('dt', null, 'نام'), h('dd', null, c.name || '—'),
        h('dt', null, 'موبایل'), h('dd', null, h('a', { href: '#/customers/' + c.phone, dir: 'ltr', class: 'num' }, digits(c.phone))),
        c.orders_count !== undefined ? [h('dt', null, 'خرید'), h('dd', null, fa(c.orders_count) + ' سفارش · ' + fa(c.paid_total) + ' تومان')] : null,
        c.blocked ? [h('dt', null, 'حساب'), h('dd', null, pill('بسته‌شده', 'bad'))] : null,
      )),
    d.order ? card('سفارشِ این تیکت', '',
      h('dl', { class: 'phx2-kvs2' },
        h('dt', null, 'شماره'), h('dd', null, h('a', { href: '#/orders/' + d.order.id, class: 'num' }, '#' + digits(d.order.number))),
        h('dt', null, 'اقلام'), h('dd', null, d.order.items.map((i) => i.name).join('، ')),
        h('dt', null, 'مبلغ'), h('dd', { class: 'num' }, fa(d.order.total) + ' تومان'),
        h('dt', null, 'وضعیت'), h('dd', null, d.order.status_label),
      )) : null,
  );

  put(ctx.view,
    kit.pageHead({ title: t.subject, sub: 'تیکتِ #' + digits(t.id) + ' · ' + when(t.created), back: { href: '#/tickets', label: 'همه‌ی تیکت‌ها' }, actions: [pill(sw, st)] }),
    h('div', { class: 'phx2-split' }, conv, side),
  );
  if (t.status !== 'closed') reply.el.focus({ preventScroll: true });
}
