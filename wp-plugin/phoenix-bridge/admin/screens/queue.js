/* ============================================================
   صفِ تحویل.

   ⚠ حتی با خریدِ خودکارِ خاموش هم کار می‌کند.
   خاموش بودنِ خرید یعنی «کسی خودکار پول خرج نمی‌کند»، نه
   «سفارش‌ها گم می‌شوند». هر سفارشِ پرداخت‌شده این‌جا یک کارت
   است و اپراتور همان‌جا انجامش می‌دهد و تیک می‌زند.
   ============================================================ */

const STATUS = { pending: ['منتظر', 'warn'], done: ['انجام‌شده', 'good'], failed: ['ناموفق', 'bad'], cancelled: ['لغوشده', 'neutral'] };

export async function render(ctx, filter = '') {
  const d = await ctx.api('GET', '/queue' + (filter ? '?status=' + filter : ''));
  if (ctx.alive()) paint(ctx, d, filter);
}

function paint(ctx, d, filter) {
  const { h, icon, fa, ago, pill, clear, put, toast, busyButton, confirmBox } = ctx.ui;
  const { kit } = ctx;
  const c = d.counts;

  const tabs = kit.seg({
    value: filter, label: 'فیلتر',
    options: [
      { value: '', label: 'همه' },
      { value: 'pending', label: 'منتظر · ' + fa(c.pending) },
      { value: 'failed', label: 'ناموفق · ' + fa(c.failed) },
      { value: 'done', label: 'انجام‌شده · ' + fa(c.done) },
      { value: 'cancelled', label: 'لغوشده · ' + fa(c.cancelled) },
    ],
    onChange: (v) => render(ctx, v),
  });

  const act = async (job, what) => {
    if (what === 'cancel') {
      const ok = await confirmBox({ title: 'این کار لغو شود؟', text: `سفارشِ #${job.order_id} — ${job.product}. لغوِ این کار سفارش را لغو نمی‌کند؛ فقط از صف بیرونش می‌آورد.`, ok: 'لغو کن', tone: 'bad' });
      if (!ok) return;
    }
    try {
      await ctx.api('POST', '/queue/' + job.id, { act: what });
      toast({ done: 'انجام‌شده علامت خورد.', retry: 'به صف برگشت.', cancel: 'لغو شد.' }[what], 'good');
      render(ctx, filter);
    } catch (e) { toast(e.message, 'bad'); }
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
    const [sw, st] = STATUS[job.status] || [job.status, 'neutral'];
    const btns = [];
    const mk = (label, what, cls) => {
      const b = h('button', { class: 'phx2-btn phx2-btn--sm ' + (cls || ''), type: 'button' }, label);
      b.addEventListener('click', busyButton(b, () => act(job, what)));
      btns.push(b);
    };
    if (job.status !== 'done') mk('انجام شد', 'done', 'phx2-btn--primary');
    if (job.status === 'failed' || job.status === 'cancelled') mk('به صف برگردان', 'retry');
    if (job.status === 'pending') mk('لغو', 'cancel', 'phx2-btn--ghost');

    list.append(h('article', { class: `phx2-job is-${st}` },
      h('header', { class: 'phx2-job__h' },
        h('div', null,
          h('b', null, job.product, job.qty > 1 && h('span', { class: 'num' }, ' × ' + fa(job.qty))),
          h('p', { class: 'phx2-job__m' },
            h('a', { href: job.order_url, target: '_blank', rel: 'noopener noreferrer' }, 'سفارشِ #' + fa(job.order_id)),
            h('span', null, job.mode),
            h('span', null, ago(job.created)),
            job.tries > 0 && h('span', { class: 'num' }, fa(job.tries) + ' تلاش'),
          ),
        ),
        pill(sw, st),
      ),
      job.inputs.length
        ? h('dl', { class: 'phx2-job__in' }, job.inputs.map((i) => [h('dt', null, i.key), h('dd', { dir: 'auto' }, i.value)]))
        : h('p', { class: 'phx2-job__none' }, 'مشتری ورودی‌ای نداده.'),
      job.note && h('p', { class: 'phx2-job__note' }, icon('alert'), job.note),
      btns.length && h('div', { class: 'phx2-row phx2-row--end' }, btns),
    ));
  }

  put(ctx.view, 
    kit.pageHead({ title: 'صفِ تحویل', sub: 'سفارش‌های پرداخت‌شده‌ای که باید خریده یا فعال شوند.' }),
    !d.auto_fulfil && h('div', { class: 'phx2-callout is-info' }, icon('info'),
      h('span', null, 'خریدِ خودکار خاموش است — عمدی. تا وقتی تأمین‌کننده‌ای وصل نشده، هر کار دستی تأیید می‌شود. سفارش‌ها گم نمی‌شوند.')),
    h('div', { class: 'phx2-filters' }, tabs.el),
    list,
  );
}
