/* ============================================================
   مشتریان — هر مشتری با خریدهایش، تیکت‌ها و امنیتِ حسابش.
   (از افزونه‌ی Phoenix Account)

   ⚠ مدیر رمزِ مشتری را نه می‌بیند نه می‌گذارد. فقط می‌تواند پاکش
   کند تا مشتری با کدِ پیامکی وارد شود و خودش رمزِ تازه بگذارد —
   رمزی که مدیر بداند، رمزِ مشتری نیست.
   ============================================================ */

const SORT = [
  { value: 'recent', label: 'آخرین خرید' },
  { value: 'spent', label: 'بیشترین خرید' },
  { value: 'orders', label: 'بیشترین سفارش' },
  { value: 'joined', label: 'تازه‌ترین' },
];
const ORDER = {
  pending: ['در انتظارِ پرداخت', 'neutral'], 'on-hold': ['در انتظارِ بررسی', 'warn'],
  processing: ['در حالِ انجام', 'info'], completed: ['تکمیل‌شده', 'good'],
  cancelled: ['لغوشده', 'neutral'], refunded: ['بازگشتِ وجه', 'neutral'], failed: ['ناموفق', 'bad'],
};
const TICKET = { open: ['منتظرِ ما', 'warn'], answered: ['پاسخ داده شد', 'good'], closed: ['بسته', 'neutral'] };

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

const state = { q: '', sort: 'recent', page: 1 };

/* ============================================================
   فهرست
   ============================================================ */

async function list(ctx) {
  const { h, icon, fa, digits, ago, pill, put, clear, toast, busyButton } = ctx.ui;
  const { kit } = ctx;

  const body = h('div');
  const strip = h('div');
  const search = kit.text({ placeholder: 'نام، ایمیل یا بخشی از شماره…', type: 'search', value: state.q });
  let timer = 0;
  search.el.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = search.get(); state.page = 1; reload(); }, 350);
  });
  const sort = kit.seg({ value: state.sort, label: 'ترتیب', options: SORT, onChange: (v) => { state.sort = v; state.page = 1; reload(); } });

  /* مشتریانِ قدیمی (پیش از این افزونه) از سفارش‌هایشان ساخته می‌شوند —
     صفحه‌به‌صفحه، با پیشرفت */
  const sync = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('refresh'), 'ساختن از سفارش‌های قبلی');
  sync.addEventListener('click', busyButton(sync, async () => {
    try {
      let page = 1;
      let phones = 0;
      for (;;) {
        const r = await ctx.api('POST', '/account/customers/sync', { page });
        phones += r.phones;
        sync.lastChild.textContent = 'صفحه‌ی ' + fa(page) + ' از ' + fa(r.pages) + '…';
        if (r.done || page >= r.pages) break;
        page += 1;
      }
      toast('از سفارش‌ها به‌روز شد — ' + fa(phones) + ' شماره.', 'good');
      reload();
    } catch (e) { toast(e.message, 'bad'); }
    finally { sync.lastChild.textContent = 'ساختن از سفارش‌های قبلی'; }
  }));

  /* مشتریِ تازه از پنل — برای آزمایشِ ورود و خرید پیش از پیامک و درگاه */
  const newBox = h('div');
  const addBtn = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--primary', type: 'button' }, icon('plus'), 'افزودنِ مشتری');
  addBtn.addEventListener('click', () => {
    if (newBox.firstChild) { put(newBox); return; }
    const phone = kit.text({ dir: 'ltr', max: 15, type: 'tel', placeholder: '09121234567' });
    const name = kit.text({ max: 100 });
    const email = kit.text({ dir: 'ltr', max: 190, type: 'email', placeholder: 'name@example.com' });
    const pass = kit.text({ dir: 'ltr', max: 64, type: 'password' });
    const F = {
      phone: kit.field({ label: 'موبایل', required: true }, phone.el),
      name: kit.field({ label: 'نام' }, name.el),
      email: kit.field({ label: 'ایمیل', hint: 'اگر «کد به ایمیل» روشن باشد، کدِ ورود به این‌جا هم می‌رود.' }, email.el),
      password: kit.field({ label: 'رمزِ عبور', hint: 'اختیاری. اگر بگذاری، با شماره و همین رمز در سایت وارد می‌شود — بی‌پیامک. دست‌کم ۸ نویسه، حروفِ انگلیسی و عدد.' }, pass.el),
    };
    const make = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('check'), 'ساختن');
    make.addEventListener('click', busyButton(make, async () => {
      for (const f of Object.values(F)) f.setError('');
      try {
        const r = await ctx.api('POST', '/account/customers/new', { phone: phone.get(), name: name.get(), email: email.get(), password: pass.get() });
        toast('مشتری ساخته شد.', 'good');
        ctx.go('customers/' + r.customer.phone);
      } catch (e) {
        if (e.fields) for (const [k, m] of Object.entries(e.fields)) (F[k] || F.phone).setError(m);
        toast(e.message, 'bad');
      }
    }));
    put(newBox, ctx.ui.card('مشتریِ تازه', 'برای آزمایشِ ورود و خرید، یا ثبتِ دستیِ مشتری‌ای که تلفنی خرید کرده.',
      h('div', { class: 'phx2-form' }, F.phone, F.name, F.email, F.password),
      h('div', { class: 'phx2-row phx2-row--end' }, make)));
  });

  async function reload() {
    const qs = new URLSearchParams({ q: state.q, sort: state.sort, page: String(state.page) });
    const d = await ctx.api('GET', '/account/customers?' + qs);
    if (!ctx.alive()) return;
    const s = d.summary;
    put(strip, h('div', { class: 'phxa-strip' },
      h('div', null, h('span', null, 'مشتری'), h('b', null, fa(s.customers))),
      h('div', null, h('span', null, 'خریدار'), h('b', null, fa(s.buyers)), h('small', null, 'دست‌کم یک سفارشِ پرداخت‌شده')),
      h('div', null, h('span', null, 'جمعِ خرید'), h('b', null, fa(s.spent)), h('small', null, 'تومان')),
      h('div', null, h('span', null, 'رمز گذاشته‌اند'), h('b', null, fa(s.with_password))),
    ));
    paintRows(d);
  }

  function paintRows(d) {
    clear(body);
    if (!d.rows.length) {
      body.append(kit.emptyState({
        iconName: 'users',
        title: state.q ? 'مشتری‌ای با این جست‌وجو نیست' : 'هنوز مشتری‌ای در فهرست نیست',
        text: state.q ? '' : 'هر کس وارد حسابش شود یا خرید کند این‌جا می‌آید. مشتریانِ قبلی را با «ساختن از سفارش‌های قبلی» بیاور.',
      }));
      return;
    }
    const table = h('table', { class: 'phx2-table phx2-table--rows' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'مشتری'),
        h('th', { scope: 'col' }, 'سفارش'),
        h('th', { scope: 'col' }, 'جمعِ خرید'),
        h('th', { scope: 'col' }, 'آخرین خرید'),
        h('th', { scope: 'col' }, 'آخرین ورود'),
        h('th', { scope: 'col' }, 'حساب'),
      )),
      h('tbody', null, d.rows.map((c) => {
        const tr = h('tr', { class: 'is-link' },
          h('td', null, h('a', { href: '#/customers/' + c.phone }, h('b', null, c.name || 'بی‌نام')),
            h('span', { class: 'phx2-td-sub num', dir: 'ltr' }, digits(c.phone))),
          h('td', { class: 'num' }, fa(c.orders_count)),
          h('td', { class: 'num phx2-td-nowrap' }, fa(c.paid_total)),
          h('td', { class: 'phx2-td-nowrap' }, ago(c.last_order)),
          h('td', { class: 'phx2-td-nowrap' }, ago(c.last_login)),
          h('td', null, c.blocked ? pill('بسته', 'bad') : pill(c.has_password ? 'با رمز' : 'فقط پیامک', c.has_password ? 'good' : 'neutral')),
        );
        tr.addEventListener('click', (e) => { if (!e.target.closest('a')) ctx.go('customers/' + c.phone); });
        return tr;
      })),
    );
    /* ⚠ ‎put‎‌وار: ‎pager‎ برای یک صفحه ‎null‎ است و ‎append()‎ی مرورگر آن را «null» می‌نویسد */
    body.append(...[
      h('div', { class: 'phx2-listmeta' }, h('span', null, fa(d.total) + ' مشتری')),
      h('div', { class: 'phx2-tablewrap' }, table),
      kit.pager({ page: d.page, pages: d.pages, onGo: (p) => { state.page = p; reload(); } }),
    ].filter(Boolean));
  }

  put(ctx.view,
    kit.pageHead({ title: 'مشتریان', sub: 'هر مشتری با خریدها، تیکت‌ها و امنیتِ حسابش.', actions: [addBtn, sync] }),
    newBox,
    strip,
    h('div', { class: 'phx2-filters' }, h('span', { class: 'phx2-filters__s' }, icon('search'), search.el), sort.el),
    body,
  );
  await reload();
}

/* ============================================================
   یک مشتری
   ============================================================ */

async function detail(ctx, phone) {
  const d = await ctx.api('GET', '/account/customers/' + encodeURIComponent(phone));
  if (ctx.alive()) paint(ctx, d);
}

function paint(ctx, d) {
  const { h, icon, fa, digits, ago, pill, put, toast, busyButton, confirmBox, card } = ctx.ui;
  const { kit } = ctx;
  const c = d.customer;
  const when = (iso) => (iso ? new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  const act = async (body, word) => {
    try {
      paint(ctx, await ctx.api('POST', '/account/customers/' + c.phone, body));
      toast(word, 'good');
    } catch (e) { toast(e.message, 'bad'); }
  };
  const actBtn = (label, iconName, cls, fn) => {
    const b = h('button', { class: 'phx2-btn phx2-btn--sm ' + (cls || ''), type: 'button' }, icon(iconName), label);
    b.addEventListener('click', busyButton(b, fn));
    return b;
  };

  /* ---------- سربرگ ---------- */
  const who = h('div', { class: 'phxa-who' },
    h('span', { class: 'phxa-who__av', 'aria-hidden': 'true' }, (c.name || '؟').trim().charAt(0)),
    h('div', { class: 'phxa-who__t' },
      h('b', null, c.name || 'بی‌نام'),
      h('span', null, h('a', { href: 'tel:' + c.phone, dir: 'ltr', class: 'num' }, digits(c.phone)), c.email ? ' · ' : '', c.email ? h('span', { dir: 'ltr' }, c.email) : null),
    ),
    h('span', { class: 'phxa-pills' },
      c.blocked ? pill('حساب بسته', 'bad') : pill('فعال', 'good'),
      pill(c.has_password ? 'رمز دارد' : 'فقط پیامک', c.has_password ? 'good' : 'neutral'),
      c.locked_for > 0 ? pill('قفلِ تلاشِ اشتباه', 'warn') : null,
    ),
  );

  const strip = h('div', { class: 'phxa-strip' },
    h('div', null, h('span', null, 'سفارشِ پرداخت‌شده'), h('b', null, fa(c.orders_count))),
    h('div', null, h('span', null, 'جمعِ خرید'), h('b', null, fa(c.paid_total)), h('small', null, 'تومان')),
    h('div', null, h('span', null, 'عضو از'), h('b', null, new Date(c.joined).toLocaleDateString('fa-IR'))),
    h('div', null, h('span', null, 'آخرین ورود'), h('b', null, c.last_login ? ago(c.last_login) : '—')),
  );

  /* ---------- سفارش‌ها ---------- */
  const orders = card('خریدها', 'پنجاه سفارشِ آخر — با هر وضعیتی.',
    d.orders.length
      ? h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table phx2-table--rows' },
        h('thead', null, h('tr', null, h('th', null, 'سفارش'), h('th', null, 'اقلام'), h('th', null, 'مبلغ'), h('th', null, 'وضعیت'), h('th', null, 'زمان'))),
        h('tbody', null, d.orders.map((o) => {
          const [sw, st] = ORDER[o.status] || [o.status_label, 'neutral'];
          const tr = h('tr', { class: 'is-link' },
            h('td', null, h('a', { href: '#/orders/' + o.id }, h('b', { class: 'num' }, '#' + digits(o.number)))),
            h('td', null, o.items.map((i) => i.name).join('، ')),
            h('td', { class: 'num phx2-td-nowrap' }, fa(o.total)),
            h('td', null, pill(sw, st)),
            h('td', { class: 'phx2-td-nowrap' }, ago(o.created)),
          );
          tr.addEventListener('click', (e) => { if (!e.target.closest('a')) ctx.go('orders/' + o.id); });
          return tr;
        }))))
      : h('p', { class: 'phx2-empty' }, 'هنوز سفارشی نداده.'));

  /* ---------- تیکت‌ها ---------- */
  const tickets = card('تیکت‌ها', '',
    d.tickets.length
      ? h('ul', { class: 'phx2-linklist' }, d.tickets.map((t) => h('li', null,
        h('a', { href: '#/tickets/' + t.id }, t.subject),
        h('span', null, pill(TICKET[t.status][0], TICKET[t.status][1]), ' ', h('span', { class: 'phx2-td-muted' }, ago(t.updated))))))
      : h('p', { class: 'phx2-empty' }, 'تیکتی نفرستاده.'));

  /* ---------- امنیت ---------- */
  const passBox = h('div');
  const security = card('امنیتِ حساب', 'هر کدام در «تاریخچه» با نامِ تو ثبت می‌شود.',
    h('dl', { class: 'phx2-kvs2' },
      h('dt', null, 'رمز'), h('dd', null, c.has_password ? 'گذاشته — ' + when(c.pass_set_at) : 'ندارد؛ با کدِ پیامکی وارد می‌شود'),
      h('dt', null, 'تلاشِ اشتباه'), h('dd', null, c.locked_for > 0 ? 'قفل تا ' + fa(Math.ceil(c.locked_for / 60)) + ' دقیقه‌ی دیگر' : 'قفل نیست'),
    ),
    h('h3', { class: 'phx2-h3' }, 'دستگاه‌های واردشده'),
    d.sessions.length
      ? h('ul', { class: 'phx2-linklist' }, d.sessions.map((s) => h('li', null,
        h('span', null, icon('phone'), ' ', s.device), h('span', { class: 'phx2-td-muted' }, 'آخرین بار ' + ago(s.last_seen)))))
      : h('p', { class: 'phx2-empty' }, 'هیچ دستگاهی الان وارد نیست.'),
    passBox,
    h('div', { class: 'phx2-row' },
      actBtn(c.has_password ? 'رمزِ تازه' : 'گذاشتنِ رمز', 'lock', '', async () => {
        if (passBox.firstChild) { put(passBox); return; }
        const pass = kit.text({ dir: 'ltr', max: 64, type: 'password' });
        const F = kit.field({ label: 'رمزِ عبورِ تازه', hint: 'دست‌کم ۸ نویسه، حروفِ انگلیسی و عدد. مشتری از همه‌ی دستگاه‌ها بیرون می‌رود و با این رمز وارد می‌شود؛ رمز را از راهِ امن به او بده.' }, pass.el);
        const go = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--primary', type: 'button' }, icon('save'), 'گذاشتن');
        go.addEventListener('click', busyButton(go, async () => {
          F.setError('');
          try { paint(ctx, await ctx.api('POST', '/account/customers/' + c.phone, { act: 'set_password', password: pass.get() })); toast('رمز گذاشته شد.', 'good'); }
          catch (e) { F.setError(e.fields && e.fields.password ? e.fields.password : e.message); }
        }));
        put(passBox, h('div', { class: 'phx2-stack' }, F, h('div', { class: 'phx2-row phx2-row--end' }, go)));
      }),
      d.sessions.length ? actBtn('خروج از همه‌ی دستگاه‌ها', 'power', '', () => act({ act: 'revoke' }, 'از همه‌ی دستگاه‌ها بیرون رفت.')) : null,
      c.locked_for > 0 ? actBtn('برداشتنِ قفل', 'lock', '', () => act({ act: 'unlock' }, 'قفل برداشته شد.')) : null,
      c.has_password ? actBtn('پاک کردنِ رمز', 'x', '', async () => {
        const ok = await confirmBox({ title: 'رمزِ این مشتری پاک شود؟', text: 'از همه‌ی دستگاه‌ها بیرون می‌رود و فقط با کدِ پیامکی وارد می‌شود؛ بعد خودش رمزِ تازه می‌گذارد.', ok: 'پاک کن', tone: 'bad' });
        if (ok) await act({ act: 'clear_password' }, 'رمز پاک شد.');
      }) : null,
      c.blocked
        ? actBtn('باز کردنِ حساب', 'check', 'phx2-btn--primary', () => act({ act: 'unblock' }, 'حساب باز شد.'))
        : actBtn('بستنِ حساب', 'lock', 'phx2-btn--ghost', async () => {
          const ok = await confirmBox({ title: 'حسابِ این مشتری بسته شود؟', text: 'از همه‌ی دستگاه‌ها بیرون می‌رود و دیگر نه با رمز وارد می‌شود نه با کد. سفارش‌ها و خریدهایش دست نمی‌خورند.', ok: 'ببند', tone: 'bad' });
          if (ok) await act({ act: 'block' }, 'حساب بسته شد.');
        }),
    ),
  );

  /* ---------- نام و ایمیل ---------- */
  const pName = kit.text({ value: c.name, max: 100 });
  const pEmail = kit.text({ value: c.email, dir: 'ltr', max: 190, type: 'email' });
  const PF = { name: kit.field({ label: 'نام' }, pName.el), email: kit.field({ label: 'ایمیل', hint: 'کدِ ورود با ایمیل فقط به همین نشانی می‌رود.' }, pEmail.el) };
  const saveProfile = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('save'), 'ذخیره');
  saveProfile.addEventListener('click', busyButton(saveProfile, async () => {
    PF.name.setError(''); PF.email.setError('');
    try { paint(ctx, await ctx.api('POST', '/account/customers/' + c.phone, { act: 'profile', name: pName.get(), email: pEmail.get() })); toast('ذخیره شد.', 'good'); }
    catch (e) { if (e.fields) for (const [k, m] of Object.entries(e.fields)) (PF[k] || PF.name).setError(m); toast(e.message, 'bad'); }
  }));
  const profile = card('نام و ایمیل', '', h('div', { class: 'phx2-form' }, PF.name, PF.email), h('div', { class: 'phx2-row phx2-row--end' }, saveProfile));

  /* ---------- یادداشتِ داخلی ---------- */
  const noteIn = kit.area({ value: c.note, rows: 3, max: 500, placeholder: 'فقط برای تیم — مشتری نمی‌بیند.' });
  const saveNote = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('save'), 'ذخیره‌ی یادداشت');
  saveNote.addEventListener('click', busyButton(saveNote, () => act({ act: 'note', note: noteIn.get() }, 'یادداشت ذخیره شد.')));
  const note = card('یادداشتِ داخلی', '', h('div', { class: 'phxa-note' }, noteIn.el, h('div', { class: 'phx2-row phx2-row--end' }, saveNote)));

  put(ctx.view,
    kit.pageHead({ title: c.name || digits(c.phone), sub: 'پرونده‌ی مشتری', back: { href: '#/customers', label: 'همه‌ی مشتریان' } }),
    h('section', { class: 'phx2-card' }, h('div', { class: 'phx2-stack' }, who, strip)),
    orders,
    h('div', { class: 'phx2-grid phx2-grid--halves' }, h('div', { class: 'phx2-grid' }, tickets, profile, note), security),
  );
}
