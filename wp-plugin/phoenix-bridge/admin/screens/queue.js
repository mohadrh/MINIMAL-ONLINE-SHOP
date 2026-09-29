/* ============================================================
   صفِ تحویل.

   ⚠ حتی با خریدِ خودکارِ خاموش هم کار می‌کند.
   خاموش بودنِ خرید یعنی «کسی خودکار پول خرج نمی‌کند»، نه
   «سفارش‌ها گم می‌شوند». هر سفارشِ پرداخت‌شده این‌جا یک کارت
   است و اپراتور همان‌جا انجامش می‌دهد و ثبتش می‌کند.

   هر کارت همه‌ی آنچه برای تحویل لازم است دارد — بی‌رفتن به ووکامرس:
   چک‌لیستِ پیش از تحویل، مشتری، پرداخت، ورودی‌ها، بقیه‌ی اقلامِ
   همان سفارش، و آنچه قبلاً تحویل شده (پوشیده، با «نمایش»).
   ============================================================ */

const STATUS = {
  pending: ['منتظر', 'warn'], needs_input: ['منتظرِ اصلاحِ مشتری', 'info'],
  done: ['تحویل‌شده', 'good'], failed: ['ناموفق', 'bad'], cancelled: ['لغوشده', 'neutral'],
};
const KINDS = [
  { value: 'code', label: 'کد', icon: 'tag' },
  { value: 'account', label: 'اکانت', icon: 'lock' },
  { value: 'upgrade', label: 'ارتقا روی اکانتِ مشتری', icon: 'up' },
  { value: 'link', label: 'لینک', icon: 'external' },
];
const KIND_WORD = { code: 'کد', account: 'اکانت', upgrade: 'ارتقا', link: 'لینک' };
const SECRET_WORD = { code: 'کد', username: 'یوزرنیم', password: 'پسورد', url: 'لینک' };

export async function render(ctx, filter = '') {
  const d = await ctx.api('GET', '/queue' + (filter ? '?status=' + filter : ''));
  if (ctx.alive()) paint(ctx, d, filter);
}

function paint(ctx, d, filter) {
  const { h, icon, fa, digits, ago, pill, put, toast, busyButton, confirmBox } = ctx.ui;
  const { kit } = ctx;
  const c = d.counts;
  const money = (n) => fa(n) + ' تومان';
  const when = (iso) => (iso ? new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  const tabs = kit.seg({
    value: filter, label: 'فیلتر',
    options: [
      { value: '', label: 'همه' },
      { value: 'pending', label: 'منتظر · ' + fa(c.pending) },
      { value: 'needs_input', label: 'اصلاحِ مشتری · ' + fa(c.needs_input || 0) },
      { value: 'failed', label: 'ناموفق · ' + fa(c.failed) },
      { value: 'done', label: 'تحویل‌شده · ' + fa(c.done) },
      { value: 'cancelled', label: 'لغوشده · ' + fa(c.cancelled) },
    ],
    onChange: (v) => render(ctx, v),
  });

  const after = async (p, word) => {
    try { await p; toast(word, 'good'); render(ctx, filter); } catch (e) { toast(e.message, 'bad'); throw e; }
  };

  const list = h('div', { class: 'phx2-jobs' });
  if (!d.rows.length) {
    list.append(kit.emptyState({
      iconName: 'inbox',
      title: filter ? 'چیزی با این فیلتر نیست' : 'صف خالی است',
      text: filter ? '' : 'هر سفارشِ پرداخت‌شده‌ای که باید خریده یا فعال شود، این‌جا می‌آید.',
    }));
  }

  for (const job of d.rows) {
    const o = job.order;
    const [sw, st] = STATUS[job.status] || [job.status, 'neutral'];
    const paid = o ? o.payment.is_paid : false;
    const missing = job.required.filter((r) => !r.given);
    const open = job.status === 'pending' || job.status === 'failed' || job.status === 'needs_input';
    const line = o && o.items.find((it) => it.item_id === job.item_id);

    /* ---------- چک‌لیستِ پیش از تحویل ---------- */
    const check = (ok, yes, no) => h('li', { class: ok ? 'is-ok' : 'is-bad' }, icon(ok ? 'checkCircle' : 'alert'), ok ? yes : no);
    const checklist = open && h('ul', { class: 'phx2-check' },
      check(paid, 'پرداخت تأیید شده' + (o && o.payment.transaction_id ? ' — تراکنشِ ‎' + o.payment.transaction_id + '‎' : ''),
        'پرداخت تأیید نشده — تحویل نده'),
      job.status === 'needs_input'
        ? check(false, '', 'منتظرِ اصلاحِ ورودی از طرفِ مشتری')
        : job.required.length
        ? check(!missing.length, 'همه‌ی ورودی‌های لازم داده شده', 'نداده: ' + missing.map((m) => m.label).join('، '))
        : check(true, 'این محصول ورودی از مشتری نمی‌خواهد', ''),
    );

    /* ---------- بخش‌ها ---------- */
    const kv = (k, v) => [h('dt', null, k), h('dd', null, v)];
    const customer = o && h('section', { class: 'phx2-jobsec' },
      h('h4', null, icon('users'), 'مشتری'),
      h('dl', { class: 'phx2-kvs2' },
        kv('نام', o.customer.name || '—'),
        kv('موبایل', o.customer.phone ? h('a', { href: 'tel:' + o.customer.phone, dir: 'ltr', class: 'num' }, digits(o.customer.phone)) : '—'),
        o.customer.email && kv('ایمیل', h('span', { dir: 'ltr' }, o.customer.email)),
        /* پرونده‌ی مشتری (خریدهای قبلی، تیکت‌ها) در پنلِ «مشتریان» */
        o.customer.phone && ctx.worldUrl('customers') && kv('پرونده',
          h('a', { href: ctx.worldUrl('customers', 'customers/' + o.customer.phone.replace(/\D/g, '').replace(/^98(?=9\d{9}$)/, '0').replace(/^(?=9\d{9}$)/, '0')) }, 'خریدها و تیکت‌ها ←')),
      ));
    const payment = o && h('section', { class: 'phx2-jobsec' },
      h('h4', null, icon('dollar'), 'پرداخت'),
      h('dl', { class: 'phx2-kvs2' },
        line && o.items.length > 1 ? kv('همین قلم', h('span', { class: 'num' }, money(line.total))) : null,
        kv(o.items.length > 1 ? 'کلِ سفارش' : 'مبلغ', h('b', { class: 'num' }, money(o.total))),
        kv('روش', o.payment.method || '—'),
        kv('شماره‌ی تراکنش', o.payment.transaction_id ? h('code', { dir: 'ltr' }, o.payment.transaction_id) : '—'),
        kv('زمانِ پرداخت', when(o.paid)),
        kv('وضعیتِ سفارش', pill(o.status_label, paid ? 'good' : 'warn')),
      ));
    const inputs = h('section', { class: 'phx2-jobsec' },
      h('h4', null, icon('text'), 'ورودی‌های مشتری'),
      job.inputs.length
        ? h('dl', { class: 'phx2-kvs2' }, job.inputs.map((i) => kv(i.key, h('span', { dir: 'auto', class: 'phx2-copyable' }, i.value))))
        : h('p', { class: 'phx2-job__none' }, 'مشتری ورودی‌ای نداده.'));
    const others = o && o.items.length > 1 && h('section', { class: 'phx2-jobsec' },
      h('h4', null, icon('box'), 'بقیه‌ی اقلامِ همین سفارش'),
      h('ul', { class: 'phx2-linklist' }, o.items.filter((it) => it.item_id !== job.item_id).map((it) =>
        h('li', null, h('span', null, it.name, it.qty > 1 ? ' × ' + fa(it.qty) : ''),
          h('span', null, it.job ? pill((STATUS[it.job.status] || [it.job.status])[0], (STATUS[it.job.status] || [0, 'neutral'])[1]) : pill('خودکار', 'neutral'))))));
    const note = o && o.note && h('section', { class: 'phx2-jobsec' },
      h('h4', null, icon('message'), 'یادداشتِ مشتری'), h('p', { dir: 'auto' }, o.note));

    /* ---------- تحویل‌شده‌ها — پوشیده تا «نمایش» ---------- */
    const delivWrap = h('div');
    const paintDeliv = (entries) => put(delivWrap, entries.map((e) => h('div', { class: 'phx2-deliv' },
      h('div', { class: 'phx2-deliv__h' }, pill(KIND_WORD[e.kind] || e.kind, 'good'), h('span', { class: 'phx2-td-muted' }, ago(new Date(e.at * 1000).toISOString())),
        e.until ? h('span', { class: 'phx2-td-muted' }, 'تا ' + when(new Date(e.until * 1000).toISOString())) : null),
      e.secret === null
        ? h('p', { class: 'phx2-job__note' }, icon('alert'), 'باز نمی‌شود — نمکِ وردپرس عوض شده.')
        : Object.keys(e.secret).length
          ? h('dl', { class: 'phx2-kvs2' }, Object.entries(e.secret).map(([k, v]) => kv(SECRET_WORD[k] || k, h('code', { dir: 'ltr' }, v))))
          : null,
      e.note ? h('p', { class: 'phx2-deliv__note', dir: 'auto' }, e.note) : null,
    )));
    let deliveries = null;
    if (job.deliveries.length) {
      paintDeliv(job.deliveries);
      const hasSecret = job.deliveries.some((e) => e.secret && Object.keys(e.secret).length);
      const reveal = hasSecret ? h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', type: 'button' }, icon('eye'), 'نمایش') : null;
      if (reveal) reveal.addEventListener('click', busyButton(reveal, async () => {
        try { paintDeliv((await ctx.api('GET', '/queue/' + job.id + '/reveal')).deliveries); reveal.remove(); }
        catch (e) { toast(e.message, 'bad'); }
      }));
      deliveries = h('section', { class: 'phx2-jobsec is-wide' },
        h('h4', null, icon('checkCircle'), 'تحویل‌شده', reveal), delivWrap);
    }

    /* ---------- فرمِ تحویل ---------- */
    const formSlot = h('div');
    function deliverForm() {
      const kind = kit.seg({ value: 'code', label: 'چه چیزی', options: KINDS, onChange: () => paintKind() });
      const code = kit.text({ dir: 'ltr', max: 500, placeholder: 'XXXX-XXXX-XXXX' });
      const user = kit.text({ dir: 'ltr', max: 200 });
      const pass = kit.text({ dir: 'ltr', max: 200 });
      const url = kit.text({ dir: 'ltr', max: 500, placeholder: 'https://' });
      const msg = kit.area({ rows: 3, max: 1000, placeholder: 'مثلاً: روی ایمیلِ … فعال شد. اولین ورود را از همین لینک بزن.' });
      const until = kit.when({ value: 0 });
      const F = {
        kind: kit.field({ label: 'چه چیزی تحویل می‌دهی', wide: true }, kind.el),
        code: kit.field({ label: 'کد', wide: true }, code.el),
        username: kit.field({ label: 'یوزرنیم یا ایمیلِ اکانت' }, user.el),
        password: kit.field({ label: 'پسوردِ اکانت' }, pass.el),
        url: kit.field({ label: 'لینک', wide: true }, url.el),
        note: kit.field({ label: 'پیام برای مشتری', wide: true, hint: 'در حسابش کنارِ تحویل می‌بیند. برای «ارتقا» لازم است: روی کدام اکانت فعال شد.' }, msg.el),
        until: kit.field({ label: 'تا کِی معتبر است', hint: 'اختیاری — برای اشتراک. خالی یعنی از مدتِ پلن حساب شود.' }, until.el),
      };
      function paintKind() {
        const k = kind.get();
        F.code.hidden = k !== 'code';
        F.username.hidden = F.password.hidden = k !== 'account';
        F.url.hidden = k !== 'link';
      }
      paintKind();
      const send = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('check'), 'ثبت و تحویل');
      send.addEventListener('click', busyButton(send, async () => {
        for (const w of Object.values(F)) w.setError('');
        try {
          await after(ctx.api('POST', '/queue/' + job.id, {
            act: 'deliver',
            delivery: { kind: kind.get(), code: code.get(), username: user.get(), password: pass.get(), url: url.get(), note: msg.get(), until: until.get() || 0 },
          }), 'تحویل ثبت شد — مشتری در حسابش می‌بیند.');
        } catch (e) { if (e.fields) for (const [k, m] of Object.entries(e.fields)) (F[k] || F.kind).setError(m); }
      }));
      const cancel = h('button', { class: 'phx2-btn phx2-btn--ghost', type: 'button' }, 'انصراف');
      cancel.addEventListener('click', () => put(formSlot));
      put(formSlot, h('div', { class: 'phx2-subcard' },
        h('div', { class: 'phx2-callout is-info' }, icon('lock'),
          h('span', null, 'کد، یوزر، پسورد و لینک رمزنگاری‌شده ذخیره می‌شوند و فقط در حسابِ همین مشتری دیده می‌شوند — نه در ایمیل و یادداشتِ سفارش.')),
        h('div', { class: 'phx2-form' }, F.kind, F.code, F.username, F.password, F.url, F.note, F.until),
        h('div', { class: 'phx2-row phx2-row--end' }, cancel, send)));
    }
    function askForm() {
      const msg = kit.area({ rows: 3, max: 500, placeholder: 'مثلاً: ایمیلی که داده‌ای اکانتِ چت‌جی‌پی‌تی ندارد؛ ایمیلِ درست را بنویس.' });
      const F = kit.field({ label: 'چه چیزی را مشتری باید اصلاح کند', wide: true, hint: 'در حسابش می‌بیند و همان‌جا اصلاح می‌کند؛ بعد کار به صف برمی‌گردد.' }, msg.el);
      const send = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('message'), 'بفرست');
      send.addEventListener('click', busyButton(send, async () => {
        F.setError('');
        try { await after(ctx.api('POST', '/queue/' + job.id, { act: 'ask', message: msg.get() }), 'برای مشتری فرستاده شد.'); }
        catch (e) { if (e.fields && e.fields.message) F.setError(e.fields.message); }
      }));
      const cancel = h('button', { class: 'phx2-btn phx2-btn--ghost', type: 'button' }, 'انصراف');
      cancel.addEventListener('click', () => put(formSlot));
      put(formSlot, h('div', { class: 'phx2-subcard' }, h('div', { class: 'phx2-form' }, F), h('div', { class: 'phx2-row phx2-row--end' }, cancel, send)));
    }

    /* ---------- کنش‌ها ---------- */
    const btns = [];
    const mk = (label, cls, fn, iconName) => {
      const b = h('button', { class: 'phx2-btn phx2-btn--sm ' + (cls || ''), type: 'button' }, iconName ? icon(iconName) : null, label);
      b.addEventListener('click', fn);
      btns.push(b);
      return b;
    };
    if (open) {
      const deliver = mk('تحویل', 'phx2-btn--primary', () => deliverForm(), 'check');
      if (!paid) { deliver.disabled = true; deliver.title = 'پرداخت تأیید نشده'; }
      if (job.status !== 'needs_input') mk('درخواستِ اصلاح از مشتری', '', () => askForm(), 'message');
    }
    if (job.status === 'failed' || job.status === 'cancelled' || job.status === 'needs_input') {
      const b = mk('به صف برگردان', '', null, 'refresh');
      b.addEventListener('click', busyButton(b, () => after(ctx.api('POST', '/queue/' + job.id, { act: 'retry' }), 'به صف برگشت.').catch(() => {})));
    }
    if (job.status === 'pending') {
      const b = mk('لغو', 'phx2-btn--ghost', null);
      b.addEventListener('click', busyButton(b, async () => {
        const ok = await confirmBox({ title: 'این کار لغو شود؟', text: `سفارشِ #${o ? o.number : job.order_id} — ${job.product}. لغوِ این کار سفارش را لغو نمی‌کند؛ فقط از صف بیرونش می‌آورد.`, ok: 'لغو کن', tone: 'bad' });
        if (ok) await after(ctx.api('POST', '/queue/' + job.id, { act: 'cancel' }), 'لغو شد.').catch(() => {});
      }));
    }

    list.append(h('article', { class: `phx2-job is-${st}` },
      h('header', { class: 'phx2-job__h' },
        h('div', null,
          h('b', null, job.product, job.qty > 1 ? h('span', { class: 'num' }, ' × ' + fa(job.qty)) : null),
          h('p', { class: 'phx2-job__m' },
            h('a', { href: job.order_url, target: '_blank', rel: 'noopener noreferrer' }, 'سفارشِ #' + digits(o ? o.number : job.order_id)),
            h('span', null, job.mode),
            h('span', null, ago(job.created)),
            job.tries > 0 ? h('span', { class: 'num' }, fa(job.tries) + ' تلاش') : null,
          ),
        ),
        pill(sw, st),
      ),
      checklist,
      job.note && job.status !== 'done'
        ? h('p', { class: 'phx2-job__note' + (job.status === 'failed' ? '' : ' is-info') }, icon(job.status === 'failed' ? 'alert' : job.status === 'needs_input' ? 'message' : 'info'), job.note)
        : null,
      h('div', { class: 'phx2-jobgrid' }, customer, payment, inputs, others, note, deliveries),
      formSlot,
      btns.length ? h('div', { class: 'phx2-row phx2-row--end' }, btns) : null,
    ));
  }

  put(ctx.view,
    kit.pageHead({ title: 'صفِ تحویل', sub: 'سفارش‌های پرداخت‌شده‌ای که باید خریده یا فعال شوند — با همه‌ی جزئیاتِ مشتری و پرداخت.' }),
    !d.auto_fulfil ? h('div', { class: 'phx2-callout is-info' }, icon('info'),
      h('span', null, 'خریدِ خودکار خاموش است — عمدی. تا وقتی تأمین‌کننده‌ای وصل نشده، هر کار دستی تحویل و ثبت می‌شود. سفارش‌ها گم نمی‌شوند.')) : null,
    h('div', { class: 'phx2-filters' }, tabs.el),
    list,
  );
}
