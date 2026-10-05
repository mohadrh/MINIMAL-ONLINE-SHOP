/* ============================================================
   اعلان در تلگرام — هر خرید (و اگر خواستی تیکت و چت) با جزئیات در
   تلگرامِ مدیر، و/یا با API امضاشده به برنامه‌ی خودت.

   ⚠ پیام‌ها در پس‌زمینه می‌روند (notify.php): پرداختِ مشتری هیچ‌وقت
   منتظرِ تلگرام نمی‌ماند، و شکست دوباره امتحان می‌شود.
   ============================================================ */

export async function render(ctx) {
  const d = await ctx.api('GET', '/account/notify');
  if (ctx.alive()) paint(ctx, d);
}

const STATUS = { pending: ['در صف', 'warn'], sent: ['رسید', 'good'], failed: ['نرسید', 'bad'] };

/** کپی در کلیپ‌بورد؛ اگر مرورگر اجازه نداد، متن انتخاب می‌شود */
function copyRow(ctx, value, { secret = false } = {}) {
  const { h, icon, toast } = ctx.ui;
  const input = h('input', { class: 'phx2-in', dir: 'ltr', readonly: true, value, type: secret ? 'password' : 'text', spellcheck: 'false' });
  const copy = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('layers'), 'کپی');
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(value); toast('کپی شد.', 'good'); } catch { input.type = 'text'; input.select(); toast('با Ctrl+C کپی کن.', 'warn'); }
  });
  const row = h('div', { class: 'phx2-row' }, input, copy);
  if (secret) {
    const show = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', type: 'button' }, icon('eye'), 'نمایش');
    show.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      show.lastChild.textContent = input.type === 'password' ? 'نمایش' : 'پنهان';
    });
    row.append(show);
  }
  return row;
}

function paint(ctx, d) {
  const { h, icon, fa, digits, ago, pill, put, toast, busyButton, card, confirmBox } = ctx.ui;
  const { kit } = ctx;
  const s = d.settings;
  const evLabel = Object.fromEntries(d.events.map((e) => [e.id, e.label]));
  let chats = s.tg_chats.map((c) => ({ ...c }));

  /* ---------- وضعیت ---------- */
  const on = kit.toggle({ checked: s.on, label: 'اعلان‌ها روشن' });
  const hero = h('section', { class: 'phx2-card phx2-ratehero' },
    h('div', null,
      h('p', { class: 'phx2-ratehero__why' }, 'اعلانِ خرید'),
      h('h2', { class: 'phx2-ratehero__v' }, s.on ? 'روشن' : 'خاموش'),
      h('p', { class: 'phx2-ratehero__why' }, s.on
        ? fa(s.tg_on ? s.tg_chats.length : 0) + ' گفتگوی تلگرام' + (s.hook_on ? ' · API روشن' : '') + ' — هر خرید همان لحظه، در پس‌زمینه.'
        : 'روشنش کن تا هر خرید با جزئیات به تلگرامت بیاید.'),
    ),
    d.failed_24h ? pill(fa(d.failed_24h) + ' ناموفق در ۲۴ ساعت', 'bad') : pill(s.on ? 'روشن' : 'خاموش', s.on ? 'good' : 'neutral'),
  );

  /* ---------- تلگرام ---------- */
  const tgOn = kit.toggle({ checked: s.tg_on, label: 'به تلگرام بفرست' });
  const conn = kit.select({
    value: s.tg_conn,
    options: [{ value: '', label: 'همان رباتِ ورود' + (d.login_bot ? ' (@' + d.login_bot + ')' : '') },
      ...d.connections.map((c) => ({ value: c.slug, label: c.label + (c.key === 'ok' ? '' : ' — کلید خراب') }))],
  });
  const list = h('div', { class: 'phx2-stack' });
  const paintList = () => put(list, chats.length
    ? h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table' },
      h('thead', null, h('tr', null, h('th', null, 'گیرنده'), h('th', null, 'شناسه'), h('th', null, ''))),
      h('tbody', null, chats.map((c, i) => {
        const del = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', type: 'button' }, icon('trash'), 'حذف');
        del.addEventListener('click', () => { chats.splice(i, 1); paintList(); });
        return h('tr', null, h('td', null, c.title || '—'), h('td', { dir: 'ltr', class: 'num' }, c.id), h('td', null, del));
      }))))
    : h('p', { class: 'phx2-empty' }, 'هنوز گیرنده‌ای نیست.'));
  paintList();

  const linkOut = h('div', { class: 'phx2-stack', 'aria-live': 'polite' });
  const refresh = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('refresh'), 'تازه کن');
  refresh.addEventListener('click', busyButton(refresh, async () => {
    const fresh = await ctx.api('GET', '/account/notify');
    const have = new Set(chats.map((c) => c.id));
    const added = fresh.settings.tg_chats.filter((c) => !have.has(c.id));
    chats = chats.concat(added);
    paintList();
    toast(added.length ? fa(added.length) + ' گفتگو اضافه شد.' : 'هنوز پیامی با کد نرسیده.', added.length ? 'good' : 'info');
  }));
  const linkBtn = h('button', { class: 'phx2-btn', type: 'button' }, icon('plus'), 'اتصالِ گفتگو با کد');
  linkBtn.addEventListener('click', busyButton(linkBtn, async () => {
    try {
      const r = await ctx.api('POST', '/account/notify/act', { act: 'link' });
      const L = r.link;
      put(linkOut,
        h('div', { class: 'phx2-callout' }, icon('info'), h('span', null,
          'تا ۱۵ دقیقه: برای گفتگوی خودت این پیوند را در تلگرام باز کن و Start را بزن. برای گروهِ مدیران، ربات را عضوِ گروه کن و متنِ پایین را در گروه بفرست. برای کانال، ربات را مدیرِ کانال کن و کد را در کانال بفرست. بعد «تازه کن».')),
        h('a', { href: L.url, target: '_blank', rel: 'noopener noreferrer', dir: 'ltr', class: 'phx2-btn phx2-btn--primary' }, icon('external'), 'باز کردنِ @' + L.bot),
        h('b', null, 'برای گروه:'), copyRow(ctx, L.group),
        h('b', null, 'برای کانال:'), copyRow(ctx, L.code),
        h('div', { class: 'phx2-row phx2-row--end' }, refresh),
      );
    } catch (e) { toast(e.message, 'bad'); }
  }));

  const manId = kit.text({ dir: 'ltr', max: 40, placeholder: '123456789  یا  -1001234567890  یا  @channel' });
  const manTitle = kit.text({ max: 64, placeholder: 'مثلاً گروهِ فروش' });
  const manField = kit.field({ label: 'افزودنِ دستی', hint: d.can_link
    ? 'یا شناسه را خودت بنویس.'
    : 'شناسه‌ی گفتگوی خصوصی را ‎@userinfobot‎ می‌دهد؛ شناسه‌ی گروه با ‎-‎ شروع می‌شود؛ کانالِ عمومی ‎@نام‎. پیش از آن، در تلگرام ربات را Start کن یا عضوِ گروه/مدیرِ کانال کن — ربات به کسی که بازش نکرده نمی‌تواند پیام بدهد.' },
  h('div', { class: 'phx2-row' }, manId.el, manTitle.el));
  const manAdd = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('plus'), 'افزودن');
  manAdd.addEventListener('click', () => {
    manField.setError('');
    const id = manId.get();
    if (!/^(-?\d{5,20}|@[A-Za-z][A-Za-z0-9_]{4,31})$/.test(id)) { manField.setError('شناسه عددی است یا ‎@نامِ‌کانال‎.'); return; }
    if (chats.some((c) => c.id === id)) { manField.setError('این گیرنده هست.'); return; }
    if (chats.length >= 10) { manField.setError('حداکثر ۱۰ گیرنده.'); return; }
    chats.push({ id, title: manTitle.get() });
    manId.set(''); manTitle.set('');
    paintList();
  });

  const F = {
    tg_conn: kit.field({ label: 'ربات', hint: 'پیش‌فرض همان رباتِ کدِ ورود. اگر رباتِ دیگری برای اعلان‌ها ساختی، توکنش را در «منابعِ قیمت ← اتصال‌ها» بگذار و این‌جا انتخابش کن.' }, conn.el),
    tg_chats: kit.field({ label: 'گیرنده‌ها', wide: true, hint: 'گفتگوی خصوصی، گروهِ مدیران یا کانال — حداکثر ۱۰.' }, list),
  };
  const tgCard = card('تلگرام', 'جزئیاتِ هر خرید در گفتگوی خودت، گروهِ فروش، یا یک کانالِ خصوصی.',
    h('div', { class: 'phx2-form' }, kit.field({ label: 'وضعیت', wide: true }, tgOn.el), F.tg_conn, F.tg_chats),
    d.can_link ? h('div', { class: 'phx2-row' }, linkBtn) : h('div', { class: 'phx2-callout' }, icon('info'), h('span', null,
      'اتصال با کد فقط با رباتِ ورود در حالتِ «رباتِ جدا» کار می‌کند — چون پیام‌های رباتِ دیگر به این سایت نمی‌رسد. این‌جا شناسه را دستی وارد کن.')),
    linkOut,
    manField, h('div', { class: 'phx2-row phx2-row--end' }, manAdd),
  );

  /* ---------- رویدادها و حریمِ خصوصی ---------- */
  const evT = new Map(d.events.map((e) => [e.id, kit.toggle({ checked: !!s.events[e.id], label: e.label })]));
  const contact = kit.toggle({ checked: s.show_contact, label: 'شماره و ایمیلِ مشتری در پیام' });
  const inputs = kit.toggle({ checked: s.show_inputs, label: 'اطلاعاتی که مشتری برای تحویل وارد کرده (مثلاً ایمیلِ اکانت)' });
  const evCard = card('چه چیزهایی بیاید', 'هر رویداد برای هر گیرنده فقط یک بار — «در حال انجام» و «تکمیل‌شده»ی یک سفارش دو پیام نمی‌شوند.',
    h('div', { class: 'phx2-toggles' }, [...evT.values()].map((t) => t.el)),
    h('div', { class: 'phx2-toggles' }, contact.el, inputs.el),
    h('p', { class: 'phx2-td-muted' }, 'هر ورودی‌ای که شبیهِ رمز است (رمز، پسورد، PIN، کدِ تأیید) همیشه پوشیده می‌رود. کد و پسوردِ تحویل‌شده هیچ‌وقت در اعلان نیست.'),
  );

  /* ---------- API ---------- */
  const hookOn = kit.toggle({ checked: s.hook_on, label: 'فرستادن به API' });
  const hookUrl = kit.text({ value: s.hook_url, dir: 'ltr', max: 500, placeholder: 'https://bot.example.com/phoenix' });
  F.hook_url = kit.field({ label: 'نشانی (https)', wide: true, hint: 'هر رویداد یک ‎POST‎ با JSON به این نشانی، با امضای HMAC — راهنما و نمونه‌کد در docs/NOTIFY.md. پاسخِ ۲xx یعنی رسید؛ وگرنه دوباره.' }, hookUrl.el);
  const rotate = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', type: 'button' }, icon('lock'), 'رمزِ تازه');
  rotate.addEventListener('click', busyButton(rotate, async () => {
    const ok = await confirmBox({ title: 'رمزِ تازه؟', text: 'رمزِ فعلی همین حالا باطل می‌شود و برنامه‌ات تا رمزِ تازه را نگیرد امضاها را رد می‌کند.', ok: 'رمزِ تازه', tone: 'bad' });
    if (!ok) return;
    try { paint(ctx, await ctx.api('POST', '/account/notify/act', { act: 'secret' })); toast('رمزِ تازه ساخته شد.', 'good'); } catch (e) { toast(e.message, 'bad'); }
  }));
  const hookCard = card('API برای برنامه‌ی دیگر', 'اگر رباتِ تلگرام یا سیستمِ دیگری داری که خودش پیام بدهد یا کاری انجام دهد.',
    h('div', { class: 'phx2-form' }, kit.field({ label: 'وضعیت', wide: true }, hookOn.el), F.hook_url),
    h('b', null, 'رمزِ امضا — در هدرِ ‎X-Phoenix-Signature‎'),
    copyRow(ctx, d.hook_secret, { secret: true }),
    h('div', { class: 'phx2-row phx2-row--end' }, rotate),
  );

  /* ---------- ذخیره ---------- */
  const save = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('save'), 'ذخیره');
  save.addEventListener('click', busyButton(save, async () => {
    for (const f of Object.values(F)) f.setError('');
    try {
      paint(ctx, await ctx.api('POST', '/account/notify', {
        on: on.get(), tg_on: tgOn.get(), tg_conn: conn.get(), tg_chats: chats,
        hook_on: hookOn.get(), hook_url: hookUrl.get(),
        events: Object.fromEntries([...evT].map(([id, t]) => [id, t.get()])),
        show_contact: contact.get(), show_inputs: inputs.get(),
      }));
      toast('ذخیره شد.', 'good');
    } catch (e) {
      if (e.fields) for (const [k, m] of Object.entries(e.fields)) (F[k] || F.tg_chats).setError(m);
      toast(e.message, 'bad');
    }
  }));

  /* ---------- آزمایش ---------- */
  const testOut = h('div', { class: 'phx2-stack', 'aria-live': 'polite' });
  const testBtn = h('button', { class: 'phx2-btn', type: 'button' }, icon('message'), 'ارسالِ آزمایشی');
  testBtn.addEventListener('click', busyButton(testBtn, async () => {
    try {
      const r = await ctx.api('POST', '/account/notify/act', { act: 'test' });
      put(testOut, r.test.map((t) => h('div', { class: 'phx2-row' },
        pill(t.ok ? 'رسید' : 'نرسید', t.ok ? 'good' : 'bad'),
        h('span', null, t.dest === 'hook' ? 'API' : (chats.find((c) => 'tg:' + c.id === t.dest)?.title || t.dest.slice(3))),
        t.error ? h('span', { class: 'phx2-td-muted', dir: 'auto' }, t.error) : null)));
    } catch (e) { toast(e.message, 'bad'); }
  }));
  const testCard = card('آزمایش', 'یک سفارشِ نمونه (نه واقعی) به همه‌ی گیرنده‌های ذخیره‌شده — حتی اگر اعلان‌ها خاموش باشند.',
    h('div', { class: 'phx2-row' }, testBtn), testOut);

  /* ---------- آخرین اعلان‌ها ---------- */
  const destName = (dest) => dest === 'hook' ? 'API' : (s.tg_chats.find((c) => 'tg:' + c.id === dest)?.title || dest.slice(3));
  const logCard = card('آخرین اعلان‌ها', 'سی‌تای آخر. ناموفق‌ها را می‌شود دوباره فرستاد.',
    d.log.length
      ? h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table' },
        h('thead', null, h('tr', null, ['کِی', 'رویداد', 'گیرنده', 'وضعیت', ''].map((t) => h('th', null, t)))),
        h('tbody', null, d.log.map((r) => {
          const [w, tone] = STATUS[r.status] || [r.status, 'neutral'];
          let act = null;
          if (r.status === 'failed') {
            act = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('refresh'), 'دوباره');
            act.addEventListener('click', busyButton(act, async () => {
              try { paint(ctx, await ctx.api('POST', '/account/notify/act', { act: 'retry', id: r.id })); toast('دوباره در صف.', 'good'); } catch (e) { toast(e.message, 'bad'); }
            }));
          }
          return h('tr', null,
            h('td', null, r.created ? ago(r.created) : '—'),
            h('td', null, evLabel[r.event] || r.event, h('div', { class: 'phx2-td-sub', dir: 'ltr' }, digits(r.ref))),
            h('td', null, destName(r.dest)),
            h('td', null, pill(w + (r.tries > 1 ? ' · ' + fa(r.tries) + ' بار' : ''), tone),
              r.error ? h('div', { class: 'phx2-td-sub', dir: 'auto' }, r.error) : null),
            h('td', null, act));
        }))))
      : h('p', { class: 'phx2-empty' }, 'هنوز اعلانی نرفته.'),
  );

  put(ctx.view,
    kit.pageHead({ title: 'اعلان در تلگرام', sub: 'هر خرید با جزئیات در تلگرامِ تو — یا با API در برنامه‌ی خودت.' }),
    hero,
    h('div', { class: 'phx2-card' }, h('div', { class: 'phx2-row' }, on.el)),
    tgCard, evCard, hookCard,
    h('div', { class: 'phx2-row phx2-row--end' }, save),
    testCard, logCard,
  );
}
