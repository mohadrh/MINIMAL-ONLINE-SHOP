/* ============================================================
   تنظیمات — ظاهر، خریدِ خودکار، و وضعیتِ سیستم.

   ⚠ کلیدِ خریدِ خودکار فقط وقتی کار می‌کند که تأمین‌کننده‌ای وصل
   باشد. بدونش، روشن کردنش هیچ اثری نداشت — بدترین نوعِ کلید،
   چون ادمین فکر می‌کند کاری انجام شده. پس غیرفعال است و دلیلش
   کنارش نوشته شده.
   ============================================================ */

export async function render(ctx) {
  const d = await ctx.api('GET', '/settings');
  if (ctx.alive()) paint(ctx, d);
}

function paint(ctx, d) {
  const { h, icon, fa, pill, clear, put, toast, busyButton, card, confirmBox } = ctx.ui;
  const { kit } = ctx;
  const sys = d.system;

  /* ---------- خریدِ خودکار ---------- */
  const auto = kit.toggle({ checked: d.auto_fulfil, label: 'خریدِ خودکار بعد از پرداخت' });
  const autoBtn = auto.el.querySelector('button');
  if (!d.provider && !d.auto_fulfil) { autoBtn.disabled = true; auto.el.classList.add('is-disabled'); }
  const stop = kit.money({ value: d.fulfil_fail_stop, unit: 'شکست' });
  const save = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('save'), 'ذخیره');
  save.addEventListener('click', busyButton(save, async () => {
    if (auto.get() && !d.auto_fulfil) {
      const ok = await confirmBox({
        title: 'خریدِ خودکار روشن شود؟',
        text: 'از این به بعد هر سفارشِ پرداخت‌شده بدونِ تأییدِ آدم از تأمین‌کننده خریده می‌شود — با پولِ واقعی.',
        ok: 'روشن کن', tone: 'bad',
      });
      if (!ok) return;
    }
    try {
      paint(ctx, await ctx.api('POST', '/settings', { auto_fulfil: auto.get(), fulfil_fail_stop: stop.get() || 3 }));
      toast('ذخیره شد.', 'good');
    } catch (e) { toast(e.message, 'bad'); auto.set(d.auto_fulfil); }
  }));

  const fulfil = card('خریدِ خودکار', 'وقتی مشتری پرداخت کرد، خودش از تأمین‌کننده بخرد و تحویل دهد.',
    h('div', { class: 'phx2-form' },
      kit.field({ label: 'وضعیت', wide: true, hint: d.provider
        ? 'تأمین‌کننده وصل است. پیش از روشن کردن، چند سفارش را دستی از صف رد کن.'
        : 'هنوز هیچ تأمین‌کننده‌ای وصل نشده، پس این کلید غیرفعال است. سفارش‌ها در «صفِ تحویل» دستی انجام می‌شوند.' }, auto.el),
      kit.field({ label: 'توقف بعد از', hint: 'این تعداد شکستِ پشت‌سرهم، خریدِ خودکار را می‌خواباند — تا تأمین‌کننده‌ی خراب پول نسوزاند.' }, stop.el),
    ),
    d.fail_streak > 0 && h('div', { class: 'phx2-callout is-warn' }, icon('alert'), h('span', null, fa(d.fail_streak) + ' شکستِ پشت‌سرهم ثبت شده.')),
    h('div', { class: 'phx2-row phx2-row--end' }, save),
  );

  /* ---------- وضعیتِ سیستم ---------- */
  const row = (k, v, ok) => h('div', { class: 'phx2-kv' },
    h('dt', null, k),
    h('dd', null, v, ok === undefined ? null : pill(ok ? 'درست' : 'ایراد', ok ? 'good' : 'bad')));

  const system = card('وضعیتِ سیستم', 'اگر چیزی کار نکرد، این‌جا اولین جایی است که باید نگاه کرد.',
    h('dl', { class: 'phx2-kvs' },
      row('نسخه‌ی افزونه', h('span', { class: 'num', dir: 'ltr' }, sys.version)),
      row('وردپرس', h('span', { class: 'num', dir: 'ltr' }, sys.wordpress)),
      row('ووکامرس', h('span', { class: 'num', dir: 'ltr' }, sys.woo || '—'), !!sys.woo),
      row('PHP', h('span', { class: 'num', dir: 'ltr' }, sys.php)),
      row('جدول‌های افزونه', sys.db ? 'به‌روز' : 'نیاز به ساخت', sys.db),
      row('کرونِ واقعیِ سرور', sys.real_cron ? 'راه افتاده' : 'نه — نرخ فقط با بازدید به‌روز می‌شود', sys.real_cron),
      row('نشانیِ سایت', h('a', { href: sys.site, target: '_blank', rel: 'noopener noreferrer', dir: 'ltr' }, sys.site)),
    ),
  );

  const schedule = card('کارهای زمان‌بندی‌شده', 'چه کاری کِی دوباره اجرا می‌شود.',
    h('dl', { class: 'phx2-kvs' }, d.schedule.map((s) => row(s.label,
      s.at ? new Date(s.at).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : 'زمان‌بندی نشده'))),
  );

  const look = card('ظاهر', 'روشن و تاریک از نوارِ بالا عوض می‌شود و برای هر کاربر جدا ذخیره می‌شود.',
    h('p', { class: 'phx2-card__s' }, 'حالتِ «مثلِ سیستم» از تنظیماتِ دستگاهت پیروی می‌کند.'));

  put(ctx.view, 
    kit.pageHead({ title: 'تنظیمات', sub: 'خریدِ خودکار و وضعیتِ سیستم.' }),
    h('div', { class: 'phx2-grid phx2-grid--2' }, fulfil, h('div', { class: 'phx2-grid' }, look, schedule)),
    system,
  );
}
