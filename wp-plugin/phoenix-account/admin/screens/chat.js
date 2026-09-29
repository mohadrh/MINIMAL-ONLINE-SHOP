/* ============================================================
   چتِ آنلاین — صندوقِ گفتگوهای زنده و همه‌ی تنظیماتِ چتِ سایت.
   (از افزونه‌ی Phoenix Account)

   ⚠ اپراتور با نامِ کارشناسی جواب می‌دهد که مشتری از اول دیده
   (یکی از فهرستِ «کارشناس‌ها»، به قرعه برای هر گفتگو). نامِ کاربریِ
   خودِ اپراتور فقط در همین پنل دیده می‌شود.

   ⚠ پیامِ بازدیدکننده فقط متن است — با ‎textContent‎، نه HTML.
   ============================================================ */

const STATUS = { open: ['منتظرِ جواب', 'bad'], answered: ['جواب داده شد', 'good'], closed: ['بسته', 'neutral'] };
const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

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
  if (ctx.param && /^\d+$/.test(ctx.param)) return thread(ctx, ctx.param);
  return home(ctx);
}

/** هر چند ثانیه، تا وقتی همین صفحه باز است و تب دیده می‌شود */
function poll(ctx, ms, fn) {
  const id = setInterval(() => {
    if (!ctx.alive()) { clearInterval(id); return; }
    if (document.visibilityState === 'visible') fn();
  }, ms);
}

const state = { status: 'open', tab: 'inbox' };

/* ============================================================
   صفحه‌ی اصلی: گفتگوها + تنظیمات
   ============================================================ */

async function home(ctx) {
  const { h, icon, put, pill } = ctx.ui;
  const { kit } = ctx;
  const [list, conf] = await Promise.all([
    ctx.api('GET', '/account/chat?status=' + state.status),
    ctx.api('GET', '/account/chat/settings'),
  ]);
  if (!ctx.alive()) return;

  const s = conf.settings;
  const inboxEl = h('div');
  const tabs = kit.tabs([
    { id: 'inbox', label: 'گفتگوها', icon: 'message', el: inboxEl },
    { id: 'settings', label: 'ظاهر و متن‌ها', icon: 'sliders', el: settingsForm(ctx, conf) },
    { id: 'agents', label: 'کارشناس‌ها', icon: 'users', el: agentsForm(ctx, conf) },
    { id: 'quick', label: 'پاسخ‌های آماده', icon: 'text', el: quickForm(ctx, conf) },
  ], { onChange: (id) => { state.tab = id; } });
  tabs.show(state.tab);

  const paintInbox = (d) => {
    tabs.badge('inbox', d.counts.unread);
    put(inboxEl, inbox(ctx, d));
  };
  paintInbox(list);

  /* گفتگوی تازه بی‌تازه‌کردنِ صفحه */
  poll(ctx, 8000, async () => {
    try { paintInbox(await ctx.api('GET', '/account/chat?status=' + state.status)); } catch { /* دورِ بعد */ }
  });
  const reload = async () => paintInbox(await ctx.api('GET', '/account/chat?status=' + state.status));
  inboxEl.addEventListener('phxa:filter', reload);

  put(ctx.view,
    kit.pageHead({
      title: 'چت آنلاین',
      sub: 'گفتگوی زنده با کسانی که همین حالا روی سایت‌اند — با نامِ کارشناسی که مشتری می‌بیند جواب می‌دهی.',
      actions: [
        pill(s.enabled ? 'روی سایت روشن' : 'خاموش', s.enabled ? 'good' : 'neutral'),
        s.hours_on ? pill(conf.open_now ? 'الان ساعتِ پاسخ‌گویی' : 'خارج از ساعتِ کاری', conf.open_now ? 'info' : 'warn') : null,
      ],
    }),
    tabs.el,
  );
}

function inbox(ctx, d) {
  const { h, icon, fa, digits, ago, pill } = ctx.ui;
  const { kit } = ctx;
  const c = d.counts;
  const seg = kit.seg({
    value: state.status, label: 'وضعیت',
    options: [
      { value: 'open', label: 'منتظرِ جواب · ' + fa(c.open) },
      { value: 'answered', label: 'جواب داده شد · ' + fa(c.answered) },
      { value: 'closed', label: 'بسته · ' + fa(c.closed) },
      { value: '', label: 'همه' },
    ],
    onChange: (v) => { state.status = v; seg.el.dispatchEvent(new Event('phxa:filter', { bubbles: true })); },
  });

  const body = d.rows.length
    ? h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table phx2-table--rows' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'بازدیدکننده'),
        h('th', { scope: 'col' }, 'آخرین پیام'),
        h('th', { scope: 'col' }, 'با نامِ'),
        h('th', { scope: 'col' }, 'وضعیت'),
        h('th', { scope: 'col' }, 'زمان'),
      )),
      h('tbody', null, d.rows.map((r) => {
        const [sw, st] = STATUS[r.status] || [r.status, 'neutral'];
        const tr = h('tr', { class: 'is-link' + (r.unread ? ' phxa-unread' : '') },
          h('td', null,
            r.unread ? h('span', { class: 'phxa-dot is-hot', 'aria-label': 'خوانده نشده' }) : null,
            h('a', { href: '#/chat/' + r.id }, h('b', null, r.customer || (r.phone ? digits(r.phone) : 'بازدیدکننده‌ی #' + digits(r.id)))),
            h('span', { class: 'phx2-td-sub' }, [r.device, r.page].filter(Boolean).join(' · '))),
          h('td', { class: 'phxa-snip', dir: 'auto' },
            r.last ? [h('span', { class: 'phx2-td-muted' }, r.last.author === 'staff' ? 'شما: ' : ''), r.last.body] : '—'),
          h('td', null, r.agent),
          h('td', null, pill(sw, st)),
          h('td', { class: 'phx2-td-nowrap' }, ago(r.updated)),
        );
        tr.addEventListener('click', (e) => { if (!e.target.closest('a')) ctx.go('chat/' + r.id); });
        return tr;
      }))))
    : kit.emptyState({
      iconName: 'message',
      title: state.status === 'open' ? 'کسی منتظرِ جواب نیست' : 'گفتگویی نیست',
      text: state.status === 'open' ? 'هر وقت مشتری در چتِ سایت سراغِ کارشناس برود، همین‌جا می‌آید — صفحه خودش تازه می‌شود.' : '',
    });

  return h('div', { class: 'phx2-stack' }, h('div', { class: 'phx2-filters' }, seg.el), body);
}

/* ============================================================
   یک گفتگو
   ============================================================ */

async function thread(ctx, id) {
  const { h, icon, fa, digits, ago, pill, put, toast, busyButton, card } = ctx.ui;
  const { kit } = ctx;
  const [d, list] = await Promise.all([
    ctx.api('GET', '/account/chat/' + encodeURIComponent(id)),
    ctx.api('GET', '/account/chat?status=open'),
  ]);
  if (!ctx.alive()) return;

  let chat = d.chat;
  let last = 0;
  const when = (iso) => new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
  const threadEl = h('div', { class: 'phxa-thread', 'aria-live': 'polite' });

  const addMsgs = (msgs) => {
    for (const m of msgs) {
      if (m.id <= last) continue;
      last = m.id;
      const who = m.author === 'staff' ? chat.agent + (m.staff ? ' (' + m.staff + ')' : '')
        : m.author === 'visitor' ? 'مشتری' : m.author === 'bot' ? 'پیامِ خودکار' : 'پیش از وصل شدن';
      const cls = m.author === 'staff' ? 'is-staff' : m.author === 'visitor' ? 'is-customer' : 'is-bot';
      threadEl.append(h('div', { class: 'phxa-msg ' + cls },
        h('div', { class: 'phxa-msg__b', dir: 'auto' }, m.body),
        h('div', { class: 'phxa-msg__m' }, h('span', null, who), h('time', { datetime: m.at, title: when(m.at) }, ago(m.at)))));
    }
    threadEl.lastElementChild?.scrollIntoView({ block: 'nearest' });
  };
  addMsgs(d.messages);

  /* ---------- جواب ---------- */
  const reply = kit.area({ rows: 3, max: 2000, placeholder: `جواب به نامِ ${chat.agent}… (Ctrl+Enter فرستادن)` });
  const replyF = kit.field({ label: 'جواب', wide: true }, reply.el);
  const input = reply.input;
  const quick = h('div', { class: 'phxa-quick' }, (list.quick || []).map((q) => {
    const b = h('button', { type: 'button', class: 'phx2-chip', title: q }, q.length > 44 ? q.slice(0, 44) + '…' : q);
    b.addEventListener('click', () => { input.value = input.value ? input.value + '\n' + q : q; input.dispatchEvent(new Event('input')); input.focus(); });
    return b;
  }));
  const send = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('message'), 'بفرست');
  const doSend = busyButton(send, async () => {
    replyF.setError('');
    try {
      const r = await ctx.api('POST', '/account/chat/' + chat.id, { act: 'reply', body: reply.get() });
      chat = r.chat;
      input.value = '';
      input.dispatchEvent(new Event('input'));
      addMsgs(r.messages);
      paintHead();
    } catch (e) {
      if (e.fields && e.fields.body) replyF.setError(e.fields.body);
      toast(e.message, 'bad');
    }
  });
  send.addEventListener('click', doSend);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doSend(); } });

  const toggle = h('button', { class: 'phx2-btn phx2-btn--ghost', type: 'button' });
  toggle.addEventListener('click', busyButton(toggle, async () => {
    try {
      const r = await ctx.api('POST', '/account/chat/' + chat.id, { act: chat.status === 'closed' ? 'reopen' : 'close' });
      chat = r.chat;
      paintHead();
      toast(chat.status === 'closed' ? 'گفتگو بسته شد.' : 'دوباره باز شد.', 'good');
    } catch (e) { toast(e.message, 'bad'); }
  }));

  const headSlot = h('div');
  function paintHead() {
    const [sw, st] = STATUS[chat.status] || [chat.status, 'neutral'];
    put(toggle, icon(chat.status === 'closed' ? 'refresh' : 'check'), chat.status === 'closed' ? 'باز کن' : 'ببند');
    put(headSlot, kit.pageHead({
      title: chat.customer || (chat.phone ? digits(chat.phone) : 'بازدیدکننده‌ی #' + digits(chat.id)),
      sub: 'جواب به نامِ «' + chat.agent + '» · شروع ' + when(chat.created),
      back: { href: '#/chat', label: 'همه‌ی گفتگوها' },
      actions: [pill(sw, st)],
    }));
  }
  paintHead();

  const conv = card('گفتگو', 'پیام‌ها هر چند ثانیه خودشان تازه می‌شوند.',
    threadEl,
    h('div', { class: 'phxa-reply' },
      quick.childElementCount ? quick : null,
      h('div', { class: 'phx2-form' }, replyF),
      h('div', { class: 'phx2-row phx2-row--end' }, toggle, send)),
  );

  const side = card('بازدیدکننده', '',
    h('dl', { class: 'phx2-kvs2' },
      h('dt', null, 'حساب'), h('dd', null, chat.phone
        ? h('a', { href: '#/customers/' + chat.phone, dir: 'ltr', class: 'num' }, digits(chat.phone))
        : 'وارد نشده'),
      h('dt', null, 'صفحه'), h('dd', { dir: 'ltr' }, chat.page || '—'),
      h('dt', null, 'دستگاه'), h('dd', null, chat.device || '—'),
      h('dt', null, 'شروع'), h('dd', null, ago(chat.created)),
    ),
    list.rows.filter((r) => r.id !== chat.id).length
      ? h('div', null, h('h3', { class: 'phx2-h3' }, 'منتظرهای دیگر'),
        h('ul', { class: 'phx2-linklist' }, list.rows.filter((r) => r.id !== chat.id).slice(0, 6).map((r) => h('li', null,
          h('a', { href: '#/chat/' + r.id }, r.customer || (r.phone ? digits(r.phone) : 'بازدیدکننده‌ی #' + digits(r.id))),
          h('span', { class: 'phx2-td-muted' }, ago(r.updated))))))
      : null,
  );

  put(ctx.view, headSlot, h('div', { class: 'phx2-split' }, conv, side));
  input.focus({ preventScroll: true });

  poll(ctx, 4000, async () => {
    try {
      const r = await ctx.api('GET', '/account/chat/' + chat.id + '?after=' + last);
      const was = chat.status;
      chat = r.chat;
      addMsgs(r.messages);
      if (was !== chat.status) paintHead();
    } catch { /* دورِ بعد */ }
  });
}

/* ============================================================
   تنظیمات
   ============================================================ */

async function save(ctx, patch, fields) {
  const { toast } = ctx.ui;
  for (const f of Object.values(fields)) f.setError('');
  const cur = (await ctx.api('GET', '/account/chat/settings')).settings;
  try {
    const r = await ctx.api('POST', '/account/chat/settings', { ...cur, ...patch });
    toast('ذخیره شد — سایت در بارِ بعدیِ صفحه همین را نشان می‌دهد.', 'good');
    return r;
  } catch (e) {
    if (e.fields) for (const [k, m] of Object.entries(e.fields)) (fields[k] || Object.values(fields)[0]).setError(m);
    toast(e.message, 'bad');
    throw e;
  }
}

function settingsForm(ctx, conf) {
  const { h, icon, busyButton, card } = ctx.ui;
  const { kit } = ctx;
  const s = conf.settings;

  const enabled = kit.toggle({ checked: s.enabled, label: 'چت روی سایت نشان داده شود' });
  const bot = kit.toggle({ checked: s.bot, label: 'دستیارِ خودکار پیش از کارشناس (منوی خرید، پیگیری، سوال‌ها)' });
  const tgOn = kit.toggle({ checked: s.show_telegram, label: 'پیوندِ «پرسیدن در تلگرام» هم کنارِ جوابِ کارشناس' });
  const hoursOn = kit.toggle({ checked: s.hours_on, label: 'ساعتِ پاسخ‌گویی دارد (بیرون از آن، پیامِ «خارج از ساعت»)', onChange: () => paintHours() });

  const title = kit.text({ value: s.title, max: 60 });
  const subtitle = kit.text({ value: s.subtitle, max: 90 });
  const greeting = kit.area({ value: s.greeting, rows: 4, max: 600 });
  const handoff = kit.area({ value: s.handoff, rows: 3, max: 600 });
  const offline = kit.area({ value: s.offline, rows: 3, max: 600 });
  const telegram = kit.text({ value: s.telegram, max: 32, dir: 'ltr', placeholder: 'Ph0enixSupport' });
  const from = kit.text({ value: s.hours_from, max: 5, dir: 'ltr', placeholder: '09:00' });
  const to = kit.text({ value: s.hours_to, max: 5, dir: 'ltr', placeholder: '23:00' });
  const dayBoxes = DAYS.map((label, i) => {
    const b = h('input', { type: 'checkbox', checked: s.days.includes(i) });
    return { i, b, el: h('label', { class: 'phxa-day' }, b, label) };
  });
  const position = kit.seg({ value: s.position, label: 'گوشه', options: [{ value: 'left', label: 'چپِ صفحه' }, { value: 'right', label: 'راستِ صفحه' }] });
  const accentPick = h('input', { type: 'color', class: 'phxa-color', value: s.accent || '#e8862e', 'aria-label': 'رنگ' });
  const accentOn = kit.toggle({ checked: !!s.accent, label: 'رنگِ جدا برای چت (وگرنه رنگِ خودِ سایت)' });

  const F = {
    title: kit.field({ label: 'عنوانِ پنجره' }, title.el),
    subtitle: kit.field({ label: 'زیرِ عنوان' }, subtitle.el),
    greeting: kit.field({ label: 'اولین پیام', wide: true, hint: 'وقتی مشتری چت را باز می‌کند.' }, greeting.el),
    handoff: kit.field({ label: 'وصل شدن به کارشناس', wide: true, hint: '‎{agent}‎ جای نامِ کارشناس می‌نشیند.' }, handoff.el),
    offline: kit.field({ label: 'خارج از ساعتِ کاری', wide: true, hint: 'پیام همچنان ثبت می‌شود و این‌جا می‌آید. ‎{agent}‎ = نامِ کارشناس.' }, offline.el),
    telegram: kit.field({ label: 'آیدیِ تلگرامِ پشتیبانی', hint: 'بی‌@' }, telegram.el),
    hours_from: kit.field({ label: 'از ساعت' }, from.el),
    hours_to: kit.field({ label: 'تا ساعت', hint: 'اگر از نیمه‌شب رد شود (۲۲:۰۰ تا ۰۲:۰۰) هم درست است.' }, to.el),
    days: kit.field({ label: 'روزها', wide: true }, h('div', { class: 'phxa-days' }, dayBoxes.map((d) => d.el))),
    position: kit.field({ label: 'جای دکمه‌ی چت' }, position.el),
    accent: kit.field({ label: 'رنگ' }, h('div', { class: 'phx2-row' }, accentOn.el, accentPick)),
    agents: kit.field({ label: '' }, h('span')),
  };
  function paintHours() {
    const on = hoursOn.get();
    F.hours_from.hidden = F.hours_to.hidden = F.days.hidden = !on;
    F.offline.hidden = !on;
  }
  paintHours();

  const btn = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('save'), 'ذخیره');
  btn.addEventListener('click', busyButton(btn, async () => {
    try {
      await save(ctx, {
        enabled: enabled.get(), bot: bot.get(), show_telegram: tgOn.get(), hours_on: hoursOn.get(),
        title: title.get(), subtitle: subtitle.get(), greeting: greeting.get(), handoff: handoff.get(), offline: offline.get(),
        telegram: telegram.get(), hours_from: from.get(), hours_to: to.get(),
        days: dayBoxes.filter((d) => d.b.checked).map((d) => d.i),
        position: position.get(), accent: accentOn.get() ? accentPick.value : '',
      }, F);
    } catch { /* پیام نشان داده شد */ }
  }));

  return h('div', { class: 'phx2-grid' },
    card('روشن و خاموش', '', h('div', { class: 'phx2-toggles' }, enabled.el, bot.el, tgOn.el, hoursOn.el)),
    card('متن‌ها', 'همان چیزی که مشتری در پنجره‌ی چت می‌خواند.',
      h('div', { class: 'phx2-form' }, F.title, F.subtitle, F.greeting, F.handoff, F.offline, F.telegram)),
    card('ساعت و ظاهر', '',
      h('div', { class: 'phx2-form' }, F.hours_from, F.hours_to, F.days, F.position, F.accent)),
    h('div', { class: 'phx2-row phx2-row--end' }, btn),
  );
}

function agentsForm(ctx, conf) {
  const { h, icon, busyButton, card, toast } = ctx.ui;
  const { kit } = ctx;
  const rep = kit.repeater({
    items: conf.settings.agents,
    max: 60,
    min: 1,
    addLabel: 'کارشناسِ تازه',
    blank: () => ({ name: '', active: true }),
    row: (a, changed) => {
      const name = kit.text({ value: a.name, max: 40, placeholder: 'مثلاً مهسا توکلی', onInput: changed });
      const on = kit.toggle({ checked: a.active, label: 'فعال', onChange: changed });
      return { el: h('div', { class: 'phxa-agent' }, name.el, on.el), get: () => ({ name: name.get(), active: on.get() }) };
    },
  });
  const errF = kit.field({ label: '' }, h('span'));
  const btn = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('save'), 'ذخیره‌ی کارشناس‌ها');
  btn.addEventListener('click', busyButton(btn, async () => {
    try { await save(ctx, { agents: rep.get() }, { agents: errF }); } catch { /* نشان داده شد */ }
  }));
  const reset = h('button', { class: 'phx2-btn phx2-btn--ghost', type: 'button' }, icon('refresh'), 'برگشت به بیست نامِ پیش‌فرض');
  reset.addEventListener('click', busyButton(reset, async () => {
    try { await save(ctx, { agents: conf.defaults.agents }, { agents: errF }); ctx.reload(); } catch { toast('انجام نشد.', 'bad'); }
  }));
  return card('کارشناس‌ها', 'به هر گفتگو یکی از فعال‌ها به قرعه نشان داده می‌شود و تا آخرِ همان گفتگو همان می‌ماند. هر کدام را می‌شود خاموش کرد بی‌آنکه حذف شود.',
    rep.el, errF, h('div', { class: 'phx2-row phx2-row--end' }, reset, btn));
}

function quickForm(ctx, conf) {
  const { h, icon, busyButton, card } = ctx.ui;
  const { kit } = ctx;
  const rep = kit.lines({ items: conf.settings.quick, placeholder: 'متنِ آماده…', addLabel: 'پاسخِ تازه', max: 40, maxLen: 400 });
  const errF = kit.field({ label: '' }, h('span'));
  const btn = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('save'), 'ذخیره');
  btn.addEventListener('click', busyButton(btn, async () => {
    try { await save(ctx, { quick: rep.get() }, { quick: errF }); } catch { /* نشان داده شد */ }
  }));
  return card('پاسخ‌های آماده', 'زیرِ کادرِ جواب در هر گفتگو؛ با یک کلیک در کادر می‌نشیند و قبل از فرستادن ویرایش می‌شود.',
    rep.el, errF, h('div', { class: 'phx2-row phx2-row--end' }, btn));
}
