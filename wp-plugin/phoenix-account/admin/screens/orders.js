/* ============================================================
   سفارش‌ها — همه‌ی سفارش‌ها با مشتری، پرداخت و تحویل، بی‌رفتن به
   ووکامرس. (از افزونه‌ی Phoenix Account)

   ⚠ فقط نمایش. تحویل در «صفِ تحویل» است و ویرایشِ سفارش در خودِ
   ووکامرس — دو جا برای یک کار یعنی دو جا برای اشتباه.
   ============================================================ */

const STATUS = {
  pending: ['در انتظارِ پرداخت', 'neutral'], 'on-hold': ['در انتظارِ بررسی', 'warn'],
  processing: ['در حالِ انجام', 'info'], completed: ['تکمیل‌شده', 'good'],
  cancelled: ['لغوشده', 'neutral'], refunded: ['بازگشتِ وجه', 'neutral'], failed: ['ناموفق', 'bad'],
};
const JOB = { pending: ['منتظر', 'warn'], needs_input: ['منتظرِ اصلاحِ مشتری', 'info'], done: ['تحویل‌شده', 'good'], failed: ['ناموفق', 'bad'], cancelled: ['لغوشده', 'neutral'] };
const KIND = { code: 'کد', account: 'اکانت', upgrade: 'ارتقا', link: 'لینک' };

/** استایلِ خودِ این افزونه، یک بار، با همان نسخه‌ی ماژول */
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
  /* ‎#/orders/1204‎ یک سفارش؛ ‎#/orders/on-hold‎ فهرست با همان وضعیت */
  if (ctx.param && /^\d+$/.test(ctx.param)) return detail(ctx, ctx.param);
  if (ctx.param && STATUS[ctx.param]) { state.status = ctx.param; state.page = 1; state.q = ''; }
  return list(ctx);
}

const state = { status: '', q: '', page: 1 };

/* ============================================================
   فهرست
   ============================================================ */

async function list(ctx) {
  const { h, icon, fa, digits, ago, pill, put, clear } = ctx.ui;
  const { kit } = ctx;

  const body = h('div');
  const search = kit.text({ placeholder: 'شماره‌ی موبایل یا شماره‌ی سفارش…', type: 'search', value: state.q });
  let timer = 0;
  search.el.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = search.get(); state.page = 1; reload(); }, 350);
  });
  const segSlot = h('div');

  async function reload() {
    const qs = new URLSearchParams({ status: state.status, q: state.q, page: String(state.page) });
    const d = await ctx.api('GET', '/account/orders?' + qs);
    if (!ctx.alive()) return;
    paintSeg(d.counts);
    paintRows(d);
  }

  function paintSeg(c) {
    const opts = [{ value: '', label: 'همه' }];
    for (const [k, [w]] of Object.entries(STATUS)) {
      if (c[k] || state.status === k) opts.push({ value: k, label: w + ' · ' + fa(c[k] || 0) });
    }
    put(segSlot, kit.seg({ value: state.status, label: 'وضعیت', options: opts, onChange: (v) => { state.status = v; state.page = 1; reload(); } }).el);
  }

  function paintRows(d) {
    clear(body);
    if (!d.rows.length) {
      body.append(kit.emptyState({
        iconName: 'box',
        title: state.q || state.status ? 'سفارشی با این جست‌وجو نیست' : 'هنوز سفارشی ثبت نشده',
        text: state.q ? 'شماره‌ی موبایل را کامل بنویس (۰۹…) یا شماره‌ی سفارش را.' : '',
      }));
      return;
    }
    const table = h('table', { class: 'phx2-table phx2-table--rows' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'سفارش'),
        h('th', { scope: 'col' }, 'مشتری'),
        h('th', { scope: 'col' }, 'اقلام'),
        h('th', { scope: 'col' }, 'مبلغ'),
        h('th', { scope: 'col' }, 'پرداخت'),
        h('th', { scope: 'col' }, 'وضعیت'),
        h('th', { scope: 'col' }, 'تحویل'),
        h('th', { scope: 'col' }, 'زمان'),
      )),
      h('tbody', null, d.rows.map((r) => {
        const [sw, st] = STATUS[r.status] || [r.status_label, 'neutral'];
        const jobs = Object.entries(r.jobs || {});
        const tr = h('tr', { class: 'is-link' },
          h('td', null, h('a', { href: '#/orders/' + r.id }, h('b', { class: 'num' }, '#' + digits(r.number)))),
          h('td', null, r.customer.name || '—',
            r.customer.phone && h('a', { class: 'phx2-td-sub num', dir: 'ltr', href: '#/customers/' + r.customer.phone }, digits(r.customer.phone))),
          h('td', null, r.items.map((i) => i.name + (i.qty > 1 ? ' × ' + fa(i.qty) : '')).join('، ')),
          h('td', { class: 'num phx2-td-nowrap' }, fa(r.total)),
          h('td', null, r.method || '—', h('span', { class: 'phx2-td-sub' }, r.paid ? 'پرداخت ' + ago(r.paid) : 'پرداخت نشده')),
          h('td', null, pill(sw, st)),
          h('td', null, jobs.length
            ? jobs.map(([k, n]) => pill((JOB[k] || [k])[0] + (n > 1 ? ' ×' + fa(n) : ''), (JOB[k] || [0, 'neutral'])[1]))
            : h('span', { class: 'phx2-td-muted' }, '—')),
          h('td', { class: 'phx2-td-nowrap' }, ago(r.created)),
        );
        tr.addEventListener('click', (e) => { if (!e.target.closest('a')) ctx.go('orders/' + r.id); });
        return tr;
      })),
    );
    /* ⚠ ‎put‎‌وار: ‎pager‎ برای یک صفحه ‎null‎ است و ‎append()‎ی مرورگر آن را «null» می‌نویسد */
    body.append(...[
      h('div', { class: 'phx2-listmeta' }, h('span', null, fa(d.total) + ' سفارش')),
      h('div', { class: 'phx2-tablewrap' }, table),
      kit.pager({ page: d.page, pages: d.pages, onGo: (p) => { state.page = p; reload(); } }),
    ].filter(Boolean));
  }

  put(ctx.view,
    kit.pageHead({ title: 'سفارش‌ها', sub: 'هر سفارش با مشتری، پرداخت و وضعیتِ تحویلِ هر قلم.' }),
    h('div', { class: 'phx2-filters' }, h('span', { class: 'phx2-filters__s' }, icon('search'), search.el)),
    segSlot,
    body,
  );
  await reload();
}

/* ============================================================
   یک سفارش
   ============================================================ */

async function detail(ctx, id) {
  const d = await ctx.api('GET', '/account/orders/' + encodeURIComponent(id));
  if (!ctx.alive()) return;
  const { h, icon, fa, digits, ago, pill, put, toast, busyButton, confirmBox } = ctx.ui;
  const { kit } = ctx;
  const o = d.order;
  const [sw, st] = STATUS[o.status] || [o.status_label, 'neutral'];
  const money = (n) => fa(n) + ' تومان';
  const when = (iso) => (iso ? new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  const kv = (k, v) => [h('dt', null, k), h('dd', null, v)];

  const customer = h('section', { class: 'phx2-jobsec' },
    h('h4', null, icon('users'), 'مشتری'),
    h('dl', { class: 'phx2-kvs2' },
      kv('نام', o.customer.name || '—'),
      kv('موبایل', d.customer
        ? h('a', { href: '#/customers/' + d.customer.phone, dir: 'ltr', class: 'num' }, digits(d.customer.phone))
        : (o.customer.phone ? h('span', { dir: 'ltr', class: 'num' }, digits(o.customer.phone)) : '—')),
      o.customer.email && kv('ایمیل', h('span', { dir: 'ltr' }, o.customer.email)),
      d.customer && d.customer.orders_count !== undefined && kv('کلِ خریدها', fa(d.customer.orders_count) + ' سفارش · ' + money(d.customer.paid_total)),
      d.customer && d.customer.blocked && kv('حساب', pill('بسته‌شده', 'bad')),
    ));

  /* کارت‌به‌کارت یا آزمایش بی‌درگاه: تأییدِ دستی — همان راهِ پرداختِ واقعی
     (‎payment_complete‎): صفِ تحویل و اعلان‌ها هم راه می‌افتند */
  let payActs = null;
  if (o.status === 'pending' || o.status === 'on-hold') {
    const ref = kit.text({ dir: 'auto', max: 100, placeholder: 'مثلاً ۴ رقمِ آخرِ کارت یا شماره‌ی پیگیری' });
    const confirmBtn = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--primary', type: 'button' }, icon('check'), 'تأییدِ پرداخت');
    confirmBtn.addEventListener('click', busyButton(confirmBtn, async () => {
      const ok = await confirmBox({ title: 'پرداختِ ' + money(o.total) + ' تأیید شود؟',
        text: 'فقط وقتی پول واقعاً به حساب رسیده. سفارش «پرداخت‌شده» می‌شود، به صفِ تحویل می‌رود و اعلانِ خرید فرستاده می‌شود.', ok: 'تأیید', tone: 'brand' });
      if (!ok) return;
      try { await ctx.api('POST', '/account/orders/' + o.id, { act: 'confirm_payment', ref: ref.get() }); toast('پرداخت تأیید شد.', 'good'); detail(ctx, o.id); }
      catch (e) { toast(e.message, 'bad'); }
    }));
    const cancelBtn = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', type: 'button' }, icon('x'), 'لغوِ سفارش');
    cancelBtn.addEventListener('click', busyButton(cancelBtn, async () => {
      const ok = await confirmBox({ title: 'سفارش لغو شود؟', text: 'برای وقتی که پولی نرسیده یا مشتری منصرف شده. برگشت‌پذیر نیست.', ok: 'لغو کن', tone: 'bad' });
      if (!ok) return;
      try { await ctx.api('POST', '/account/orders/' + o.id, { act: 'cancel', ref: ref.get() }); toast('لغو شد.', 'good'); detail(ctx, o.id); }
      catch (e) { toast(e.message, 'bad'); }
    }));
    payActs = h('div', { class: 'phx2-stack' }, kit.field({ label: 'مرجعِ پرداخت (اختیاری)' }, ref.el), h('div', { class: 'phx2-row' }, confirmBtn, cancelBtn));
  }

  const payment = h('section', { class: 'phx2-jobsec' },
    h('h4', null, icon('dollar'), 'پرداخت'),
    h('dl', { class: 'phx2-kvs2' },
      kv('مبلغ', h('b', { class: 'num' }, money(o.total))),
      kv('روش', o.payment.method || '—'),
      kv('شماره‌ی تراکنش', o.payment.transaction_id ? h('code', { dir: 'ltr' }, o.payment.transaction_id) : '—'),
      kv('زمانِ ثبت', when(o.created)),
      kv('زمانِ پرداخت', o.paid ? when(o.paid) : pill('پرداخت نشده', 'warn')),
    ),
    payActs);

  const items = h('section', { class: 'phx2-jobsec is-wide' },
    h('h4', null, icon('box'), 'اقلام و تحویل'),
    h('div', { class: 'phxa-items' }, o.items.map((it) => {
      const [jw, jt] = it.job ? (JOB[it.job.status] || [it.job.status, 'neutral']) : [it.stock_codes.length ? 'از انبار تحویل شد' : 'بیرون از صف', it.stock_codes.length ? 'good' : 'neutral'];
      return h('article', { class: 'phxa-item' },
        h('div', { class: 'phxa-item__h' },
          h('b', null, it.name, it.qty > 1 ? ' × ' + fa(it.qty) : ''),
          h('span', { class: 'phxa-pills' }, pill(jw, jt), h('span', { class: 'num phx2-td-muted' }, money(it.total))),
        ),
        it.inputs.length ? h('dl', { class: 'phx2-kvs2' }, it.inputs.map((i) => kv(i.key, h('span', { dir: 'auto', class: 'phx2-copyable' }, i.value)))) : null,
        it.job && it.job.status === 'needs_input' && it.job.note ? h('p', { class: 'phx2-job__note is-info' }, icon('message'), it.job.note) : null,
        it.deliveries.map((e) => h('div', { class: 'phx2-deliv__h' },
          pill(KIND[e.kind] || e.kind, 'good'),
          h('span', { class: 'phx2-td-muted' }, 'تحویل ' + ago(new Date(e.at * 1000).toISOString())),
          e.until ? h('span', { class: 'phx2-td-muted' }, 'تا ' + when(new Date(e.until * 1000).toISOString())) : null,
        )),
        it.job && ctx.worldUrl('store', 'queue') ? h('a', { class: 'phx2-td-muted', href: ctx.worldUrl('store', 'queue') }, 'در صفِ تحویلِ فروشگاه ←') : null,
      );
    })));

  const note = o.note && h('section', { class: 'phx2-jobsec is-wide' },
    h('h4', null, icon('message'), 'یادداشتِ مشتری'), h('p', { dir: 'auto' }, o.note));

  const notes = card(ctx, 'یادداشت‌های سفارش', 'از خودِ ووکامرس — «برای مشتری» یعنی در ایمیل و حسابش هم دیده می‌شود.',
    d.notes.length
      ? h('ul', { class: 'phxa-notes' }, d.notes.map((n) => h('li', null,
        h('small', null, when(n.at), n.customer ? ' · برای مشتری' : '', n.by ? ' · ' + n.by : ''),
        h('p', { dir: 'auto' }, n.text))))
      : h('p', { class: 'phx2-empty' }, 'یادداشتی نیست.'));

  const tickets = d.tickets.length ? card(ctx, 'تیکت‌های این مشتری', '',
    h('ul', { class: 'phx2-linklist' }, d.tickets.map((t) => h('li', null,
      h('a', { href: '#/tickets/' + t.id }, t.subject), pill(TICKET[t.status][0], TICKET[t.status][1]))))) : null;

  put(ctx.view,
    kit.pageHead({
      title: 'سفارشِ #' + digits(o.number),
      sub: (o.customer.name || digits(o.customer.phone)) + ' · ' + when(o.created),
      back: { href: '#/orders', label: 'همه‌ی سفارش‌ها' },
      actions: [pill(sw, st), h('a', { class: 'phx2-btn phx2-btn--sm', href: d.order.edit_url, target: '_blank', rel: 'noopener noreferrer' }, icon('external'), 'در ووکامرس')],
    }),
    h('div', { class: 'phx2-jobgrid' }, customer, payment, items, note),
    h('div', { class: 'phx2-grid phx2-grid--halves' }, notes, tickets),
  );
}

const TICKET = { open: ['منتظرِ ما', 'warn'], answered: ['پاسخ داده شد', 'good'], closed: ['بسته', 'neutral'] };

function card(ctx, title, sub, ...kids) {
  return ctx.ui.card(title, sub, ...kids);
}
