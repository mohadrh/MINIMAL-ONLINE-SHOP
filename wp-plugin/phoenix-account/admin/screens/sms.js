/* ============================================================
   پیامک و ورود — از افزونه‌ی Phoenix Account، داخلِ پنلِ فونیکس.

   ⚠ این ماژول چیزی import نمی‌کند؛ همه‌چیز از ‎ctx‎ می‌آید — همان
   قراردادِ صفحه‌های Bridge (پوسته، کیت، API با nonce).
   ============================================================ */

const PROVIDERS = [
  { value: 'off', label: 'خاموش' },
  { value: 'dev', label: 'آزمایشی' },
  { value: 'kavenegar', label: 'کاوه‌نگار' },
  { value: 'smsir', label: 'sms.ir' },
];
const WORD = { off: ['وصل نیست', 'bad'], dev: ['آزمایشی', 'warn'], kavenegar: ['کاوه‌نگار', 'good'], smsir: ['sms.ir', 'good'] };

export async function render(ctx) {
  const d = await ctx.api('GET', '/account/sms');
  if (ctx.alive()) paint(ctx, d);
}

function paint(ctx, d) {
  const { h, icon, digits, ago, pill, put, toast, busyButton, card } = ctx.ui;
  const { kit } = ctx;
  const s = d.settings;

  /* ---------- وضعیت ---------- */
  const [sw, st] = WORD[s.sms_provider] || WORD.off;
  const status = h('section', { class: 'phx2-card phx2-ratehero' },
    h('div', null,
      h('span', { class: 'phx2-hero__k' }, icon('message'), 'ارسالِ کدِ ورود'),
      h('p', { class: 'phx2-ratehero__v' }, sw),
      h('p', { class: 'phx2-ratehero__why' },
        s.sms_provider === 'off'
          ? 'مشتری کدِ ورود نمی‌گیرد؛ پس نه وارد حسابش می‌شود نه سفارش ثبت می‌کند.'
          : s.sms_provider === 'dev'
            ? 'کد برای کسی فرستاده نمی‌شود — فقط پایینِ همین صفحه دیده می‌شود. برای امتحانِ پنلِ مشتری پیش از خریدِ سامانه.'
            : 'کدِ ورود با الگوی تأییدشده‌ی سامانه فرستاده می‌شود.'),
    ),
    pill(sw, st),
  );

  /* ---------- تنظیمات ---------- */
  const provider = kit.seg({ value: s.sms_provider, label: 'سامانه', options: PROVIDERS, onChange: () => paintFields() });
  const conn = kit.select({
    value: s.sms_conn,
    options: [{ value: '', label: '— انتخاب کن —' },
      ...d.connections.map((c) => ({ value: c.slug, label: c.label + (c.key === 'ok' ? '' : ' — کلید خراب') }))],
  });
  const tpl = kit.text({ value: s.sms_tpl_otp, dir: 'ltr', max: 40 });
  const param = kit.text({ value: s.sms_param, dir: 'ltr', max: 30, placeholder: 'CODE' });
  const days = kit.money({ value: s.session_days, unit: 'روز' });

  const F = {
    sms_provider: kit.field({ label: 'سامانه', wide: true }, provider.el),
    sms_conn: kit.field({ label: 'کلیدِ سامانه', hint: '' }, h('div', { class: 'phx2-stack' }, conn.el,
      h('a', { href: '#/rate/connections', class: 'phx2-td-muted' }, 'ساختنِ اتصالِ تازه در «منابعِ قیمت ← اتصال‌ها»'))),
    sms_tpl_otp: kit.field({ label: 'الگو', hint: '…' }, tpl.el),
    sms_param: kit.field({ label: 'نامِ متغیرِ کد در الگو', hint: 'همان نامی که در متنِ الگو با ‎#…#‎ آمده.' }, param.el),
    session_days: kit.field({ label: 'مشتری تا چند روز واردِ حسابش بماند', hint: 'بعد از این، دوباره کد می‌خواهد. «خروج از همه‌ی دستگاه‌ها» را خودِ مشتری هم دارد.' }, days.el),
  };
  /* راهنمای الگو با سامانه عوض می‌شود — همان عنصرِ ‎aria-describedby‎ */
  const tplHint = F.sms_tpl_otp.querySelector('.phx2-field__h');

  function paintFields() {
    const p = provider.get();
    const real = p === 'kavenegar' || p === 'smsir';
    F.sms_conn.hidden = !real;
    F.sms_tpl_otp.hidden = !real;
    F.sms_param.hidden = p !== 'smsir';
    tplHint.textContent = p === 'kavenegar'
      ? 'در پنلِ کاوه‌نگار: «اعتبارسنجی ← الگوی جدید»، متن مثلاً «کد ورود فونیکس: %token». نامِ الگو را این‌جا بنویس.'
      : 'در پنلِ sms.ir: «ارسالِ سریع ← الگوی جدید»، متن مثلاً «کد ورود فونیکس: #CODE#». شناسه‌ی عددیِ الگو را این‌جا بنویس.';
  }
  paintFields();

  const save = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('save'), 'ذخیره');
  save.addEventListener('click', busyButton(save, async () => {
    for (const w of Object.values(F)) w.setError('');
    try {
      paint(ctx, await ctx.api('POST', '/account/sms', {
        sms_provider: provider.get(), sms_conn: conn.get(), sms_tpl_otp: tpl.get(),
        sms_param: param.get(), session_days: days.get() || 30,
      }));
      toast('ذخیره شد.', 'good');
    } catch (e) {
      if (e.fields) for (const [k, m] of Object.entries(e.fields)) (F[k] || F.sms_provider).setError(m);
      toast(e.message, 'bad');
    }
  }));

  const settings = card('تنظیم', 'کلیدِ سامانه در «اتصال‌ها» رمزنگاری‌شده می‌ماند؛ این‌جا فقط اسمش انتخاب می‌شود.',
    h('div', { class: 'phx2-form' }, F.sms_provider, F.sms_conn, F.sms_tpl_otp, F.sms_param, F.session_days),
    h('div', { class: 'phx2-row phx2-row--end' }, save),
  );

  /* ---------- کدهای حالتِ آزمایشی ---------- */
  let devCard = null;
  if (s.sms_provider === 'dev') {
    const reload = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('refresh'), 'تازه کن');
    reload.addEventListener('click', busyButton(reload, async () => paint(ctx, await ctx.api('GET', '/account/sms'))));
    devCard = card('کدهای اخیر', 'فقط در حالتِ آزمایشی، و فقط سی دقیقه.',
      h('div', { class: 'phx2-callout is-warn' }, icon('alert'),
        h('span', null, 'این کدها را فقط خودت ببین. روی سایتِ واقعی، پیش از فروش سامانه را وصل کن.')),
      d.devlog.length
        ? h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table' },
          h('thead', null, h('tr', null, h('th', null, 'شماره'), h('th', null, 'کد'), h('th', null, 'کِی'))),
          h('tbody', null, d.devlog.map((r) => h('tr', null,
            h('td', { class: 'num', dir: 'ltr' }, digits(r.phone)),
            h('td', null, h('b', { class: 'num phx2-devcode', dir: 'ltr' }, digits(r.code))),
            h('td', null, ago(new Date(r.at * 1000).toISOString())),
          )))))
        : h('p', { class: 'phx2-empty' }, 'هنوز کسی کد نخواسته. از صفحه‌ی ورودِ سایت یک کد بخواه و «تازه کن» را بزن.'),
      h('div', { class: 'phx2-row phx2-row--end' }, reload),
    );
  }

  /* ---------- ارسالِ آزمایشی ---------- */
  const testPhone = kit.text({ dir: 'ltr', max: 15, placeholder: '09121234567', type: 'tel' });
  const testOut = h('div', { class: 'phx2-src__test', hidden: true, 'aria-live': 'polite' });
  const testField = kit.field({ label: 'شماره', hint: 'عددِ نمونه‌ی ۱۲۳۴۵۶ با همان الگو فرستاده می‌شود.' }, testPhone.el);
  const testBtn = h('button', { class: 'phx2-btn', type: 'button' }, icon('message'), 'بفرست');
  testBtn.addEventListener('click', busyButton(testBtn, async () => {
    testField.setError('');
    try {
      const r = await ctx.api('POST', '/account/sms/test', { phone: testPhone.get() });
      put(testOut, pill(r.test.ok ? 'رسید' : 'نرسید', r.test.ok ? 'good' : 'bad'), h('span', { class: 'phx2-src__note' }, r.test.note));
      testOut.hidden = false;
    } catch (e) {
      if (e.fields && e.fields.phone) testField.setError(e.fields.phone);
      toast(e.message, 'bad');
    }
  }));
  const real = s.sms_provider === 'kavenegar' || s.sms_provider === 'smsir';
  const test = real && card('ارسالِ آزمایشی', 'پیش از روشن کردن برای مشتری‌ها، یک بار به شماره‌ی خودت.',
    h('div', { class: 'phx2-form' }, testField),
    testOut,
    h('div', { class: 'phx2-row phx2-row--end' }, testBtn),
  );

  /* ---------- آخرین ارسال‌ها ---------- */
  const log = card('آخرین ارسال‌ها', 'بدونِ خودِ کد — فقط اینکه رسید یا نه و چرا.',
    d.log.length
      ? h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table' },
        h('thead', null, h('tr', null, h('th', null, 'شماره'), h('th', null, 'نتیجه'), h('th', null, 'پاسخِ سامانه'), h('th', null, 'کِی'))),
        h('tbody', null, d.log.map((r) => h('tr', null,
          h('td', { class: 'num', dir: 'ltr' }, digits(r.phone)),
          h('td', null, pill(r.ok ? 'رسید' : 'نرسید', r.ok ? 'good' : 'bad')),
          h('td', { class: 'phx2-td-muted' }, r.note || '—'),
          h('td', null, ago(new Date(r.at * 1000).toISOString())),
        )))))
      : h('p', { class: 'phx2-empty' }, 'هنوز پیامکی فرستاده نشده.'),
  );

  put(ctx.view,
    kit.pageHead({ title: 'پیامک و ورود', sub: 'کدِ ورودِ مشتری‌ها با کدام سامانه فرستاده شود — از افزونه‌ی Phoenix Account.' }),
    status,
    h('div', { class: 'phx2-grid phx2-grid--halves' }, settings, h('div', { class: 'phx2-grid' }, devCard, test, log)),
  );
}
