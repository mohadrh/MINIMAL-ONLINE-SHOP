/* ============================================================
   منابعِ قیمت — سه تب.

     قیمتِ محصولات   هر محصول و پلن: قیمت از کجا، الان چند، چرا —
                      و همان‌جا قابلِ ویرایش (خواسته‌ی کارفرما)
     نرخِ تتر         صرافی‌ها و منابعِ سفارشی
     اتصال‌ها          کلیدهای API، یک بار برای همه

   ⚠ هر منبع می‌گوید چه شد و چرا، و دکمه‌ی آزمایش دارد. ادمینی
   که نمی‌فهمد قیمت چرا این عدد شد، به آن اعتماد نمی‌کند و
   می‌رود سراغِ دستی — که دقیقاً چیزی است که نباید عادت شود.
   ============================================================ */

const STATUS = {
  ok:      ['سالم', 'good'],
  outlier: ['پرت — کنار رفت', 'warn'],
  net:     ['اتصال برقرار نشد', 'bad'],
  http:    ['خطای سرور', 'bad'],
  parse:   ['پاسخِ نامعتبر', 'bad'],
  path:    ['عدد پیدا نشد', 'bad'],
  value:   ['عدد نبود', 'bad'],
  range:   ['خارج از بازه', 'bad'],
  big:     ['پاسخِ بیش از حد بزرگ', 'bad'],
};
const TABS = ['products', 'tether', 'connections'];

export async function render(ctx) {
  const [rate, board] = await Promise.all([ctx.api('GET', '/rate'), ctx.api('GET', '/pricing')]);
  if (ctx.alive()) paint(ctx, rate, board, TABS.includes(ctx.param) ? ctx.param : 'products');
}

function paint(ctx, rate, board, tab) {
  const { h, icon, put } = ctx.ui;
  const { kit } = ctx;
  ctx.setRate(rate.current.value, rate.current.stale);

  const dirty = new Set();
  const mark = (key, on) => { if (on) dirty.add(key); else dirty.delete(key); ctx.setDirty(dirty.size > 0); };
  const reload = async (nextTab) => {
    const [r, b] = await Promise.all([ctx.api('GET', '/rate'), ctx.api('GET', '/pricing')]);
    if (ctx.alive()) { ctx.setDirty(false); paint(ctx, r, b, nextTab); }
  };

  let tabs = null;
  /* شمارِ ردیف‌هایی که توجه می‌خواهند — روی تب، و بعد از هر ذخیره تازه */
  const onProblems = (n) => tabs && tabs.badge('products', n);
  const productsEl = productsTab(ctx, rate, board, mark, onProblems);
  tabs = kit.tabs([
    { id: 'products', label: 'قیمتِ محصولات', icon: 'box', el: productsEl.el },
    { id: 'tether', label: 'نرخِ تتر', icon: 'pulse', el: tetherTab(ctx, rate, mark, () => reload('tether')) },
    { id: 'connections', label: 'اتصال‌ها', icon: 'lock', el: connectionsTab(ctx, rate, () => reload('connections')) },
  ], {
    /* ⚠ ‎replaceState‎ و نه ‎location.hash‎: عوض کردنِ تب نباید کلِ
       صفحه را دوباره از سرور بخواند و فرمِ نیمه‌کاره را پاک کند. */
    onChange: (id) => history.replaceState(null, '', '#/rate/' + id),
  });
  tabs.show(tab);
  productsEl.recount();

  put(ctx.view,
    kit.pageHead({
      title: 'منابعِ قیمت',
      sub: 'هر محصول قیمتش را از کجا می‌گیرد — دستی، دلاری، تومانی یا از چند منبع — و نرخِ تتر و کلیدهای API.',
    }),
    h('div', { class: 'phx2-pagetabs' }, tabs.el),
  );
}

/* ============================================================
   تبِ ۱ — قیمتِ محصولات
   ============================================================ */

/** وضعیتِ یک صاحبِ قیمت: [متن، رنگ] */
function ownerStatus(o) {
  const p = o.pricing;
  if (p.locked) return ['قفل', 'neutral'];
  if (p.mode === 'manual') return ['دستی', 'neutral'];
  if (p.mode === 'inherit') return ['مثلِ محصول', 'neutral'];
  if (p.mode === 'sources') {
    const st = p.sources_state;
    if (!st || !st.use) return ['هنوز عددی نیست', 'bad'];
    if (st.pick && st.pick.held) return ['نگه داشته شده', 'warn'];
    return ['سالم', 'good'];
  }
  const cost = p.mode === 'usd' ? p.cost_usd : p.cost_toman;
  return cost > 0 ? ['خودکار', 'good'] : ['بی‌هزینه', 'bad'];
}

/** بدترین وضعیتِ ردیف — تا مشکل در فهرستِ بسته هم دیده شود */
function rowStatus(r) {
  const all = [r.owner, ...r.plans.filter((p) => !p.inherit)].map(ownerStatus);
  return all.find((s) => s[1] === 'bad') || all.find((s) => s[1] === 'warn') || all[0];
}

const MODE_WORD = { manual: 'دستی', usd: 'دلار × نرخ', toman: 'هزینه‌ی تومانی', sources: 'چند منبع', inherit: 'مثلِ محصول' };

function productsTab(ctx, rate, board, mark, onProblems) {
  const { h, icon, fa, pill, put, clear } = ctx.ui;
  const { kit } = ctx;

  const search = kit.text({ placeholder: 'جست‌وجوی محصول…', max: 80 });
  const filter = kit.seg({
    value: '', label: 'فیلتر', onChange: () => apply(),
    options: [
      { value: '', label: 'همه' }, { value: 'sources', label: 'چند منبع' },
      { value: 'problem', label: 'نیازِ توجه' }, { value: 'manual', label: 'دستی' },
    ],
  });
  search.el.addEventListener('input', () => apply());

  const list = h('div', { class: 'phx2-board' });
  const recount = () => onProblems(rows.filter((x) => ['bad', 'warn'].includes(rowStatus(x.data())[1])).length);
  const rows = board.rows.map((r) => boardRow(ctx, r, board, rate, mark, () => recount()));
  list.append(...rows.map((x) => x.el));
  const none = h('p', { class: 'phx2-empty', hidden: true }, 'محصولی با این فیلتر نیست.');

  function apply() {
    const q = search.get().toLowerCase();
    const f = filter.get();
    let shown = 0;
    rows.forEach((x) => {
      const r = x.data();
      const modes = [r.owner.pricing.mode, ...r.plans.filter((p) => !p.inherit).map((p) => p.pricing.mode)];
      const st = rowStatus(r)[1];
      const ok = (!q || (r.title + ' ' + r.english_title).toLowerCase().includes(q))
        && (!f || (f === 'sources' ? modes.includes('sources') : f === 'manual' ? modes.every((m) => m === 'manual') : st === 'bad' || st === 'warn'));
      x.el.hidden = !ok;
      if (ok) shown++;
    });
    none.hidden = shown > 0;
  }

  return { recount, el: h('div', { class: 'phx2-stack' },
    !board.engine_on && h('div', { class: 'phx2-callout is-info' }, icon('info'),
      h('span', null, 'موتورِ قیمت خاموش است: تنظیم‌ها ذخیره و منابع خوانده می‌شوند، ولی قیمتِ روی سایت عوض نمی‌شود تا از داشبورد روشنش کنی.')),
    h('div', { class: 'phx2-filters' },
      h('label', { class: 'phx2-filters__s' }, icon('search'), search.el), filter.el,
      h('span', { class: 'phx2-td-muted num' }, fa(board.rows.length) + ' محصول · نرخ ' + fa(board.rate))),
    list, none,
  ) };
}

function boardRow(ctx, r0, board, rate, mark, changed) {
  const { h, icon, fa, pill, put, clear, toast, busyButton } = ctx.ui;
  const { kit } = ctx;
  let r = r0;
  let body = null;

  const head = h('button', { class: 'phx2-brow__h', type: 'button', 'aria-expanded': 'false' });
  const el = h('article', { class: 'phx2-brow' }, head);

  function paintHead() {
    const [sw, st] = rowStatus(r);
    const own = r.plans.filter((p) => !p.inherit).length;
    /* قیمتِ روی سایت؛ اگر هنوز نوشته نشده (موتور خاموش)، عددِ موتور */
    const now = (o) => (o.current > 0 ? o.current : o.calc ? o.calc.final : 0);
    const price = (r.variable ? r.plans.map(now) : [now(r.owner)]).filter((n) => n > 0);
    const min = price.length ? Math.min(...price) : 0;
    put(head,
      h('span', { class: 'phx2-prod__img', style: r.accent ? { '--acc': r.accent } : null },
        r.thumb ? h('img', { src: r.thumb, alt: '', loading: 'lazy' }) : icon('box')),
      h('span', { class: 'phx2-brow__t' },
        h('b', null, r.title),
        h('small', null, MODE_WORD[r.owner.pricing.mode] || r.owner.pricing.mode,
          r.variable ? ' · ' + fa(r.plans.length) + ' پلن' + (own ? '، ' + fa(own) + ' با قیمتِ جدا' : '') : '')),
      h('span', { class: 'phx2-brow__p num' }, min ? (r.variable ? 'از ' : '') + fa(min) + ' تومان' : '—'),
      pill(sw, st),
      h('span', { class: 'phx2-brow__chev', 'aria-hidden': 'true' }, icon('down')),
    );
  }
  paintHead();

  head.addEventListener('click', () => {
    const open = head.getAttribute('aria-expanded') !== 'true';
    head.setAttribute('aria-expanded', String(open));
    el.classList.toggle('is-open', open);
    if (open && !body) { body = buildBody(); el.append(body); }
    if (body) body.hidden = !open;
  });

  const refresh = (fresh) => {
    r = fresh;
    paintHead();
    changed();
    if (body) { body.remove(); body = buildBody(); el.append(body); }
  };

  /* ---------- بدنه: همه‌ی تنظیم‌های قیمتِ همین محصول ---------- */
  function buildBody() {
    const key = (planId) => r.id + ':' + planId;
    const fetchFor = (planId) => (cfg) => ctx.api('POST', '/products/' + r.id + '/sources/fetch', { plan_id: planId, sources: cfg });
    const approveFor = (planId) => async () => {
      try {
        await ctx.api('POST', '/products/' + r.id + '/sources/approve', { plan_id: planId });
        toast('قیمتِ تازه تأیید شد.', 'good');
        refresh(await ctx.api('GET', '/pricing').then((b) => b.rows.find((x) => x.id === r.id) || r));
      } catch (e) { toast(e.message, 'bad'); }
    };

    const owners = [];
    function ownerBlock(o, planId, title, withMargin) {
      const pe = ctx.pricing.pricingEditor({
        pricing: o.pricing, plan: planId > 0, connections: rate.connections,
        onChange: () => { mark(key(planId), true); save.disabled = false; },
        onFetch: fetchFor(planId), onApprove: approveFor(planId),
      });

      let own = null;
      let mg = null;
      let mgBox = null;
      if (withMargin) {
        own = kit.seg({
          value: r.margin ? 'own' : 'inherit', label: 'حاشیه‌ی سود',
          options: [{ value: 'inherit', label: 'مثلِ دسته یا کل' }, { value: 'own', label: 'اختصاصیِ همین محصول' }],
          onChange: () => { mgBox.hidden = own.get() !== 'own'; mark(key(planId), true); save.disabled = false; },
        });
        mg = kit.marginFields(r.margin || r.margin_used);
        mgBox = h('div', { class: 'phx2-subcard', hidden: !r.margin }, mg.el);
        mgBox.addEventListener('input', () => { mark(key(planId), true); save.disabled = false; });
      }

      const save = h('button', { class: 'phx2-btn phx2-btn--primary phx2-btn--sm', type: 'button', disabled: true }, icon('save'), 'ذخیره');
      save.addEventListener('click', busyButton(save, async () => {
        pe.clearErrors();
        const body = { plan_id: planId, pricing: pe.get() };
        if (withMargin) body.margin = own.get() === 'own' ? mg.get() : null;
        try {
          const fresh = await ctx.api('POST', '/products/' + r.id + '/pricing', body);
          mark(key(planId), false);
          toast('قیمت‌گذاریِ «' + (planId ? title : r.title) + '» ذخیره شد.', 'good');
          refresh(fresh);
        } catch (e) {
          if (e.fields) pe.setErrors(e.fields);
          toast(e.message, 'bad');
        }
      }));

      const calc = o.calc;
      const now = h('p', { class: 'phx2-owner__now' },
        'روی سایت: ', h('b', { class: 'num' }, o.current ? fa(o.current) + ' تومان' : '—'),
        calc ? [' · موتور: ', h('b', { class: 'num' }, fa(calc.final) + ' تومان'),
          calc.discount ? ' (' + calc.discount + ')' : '', calc.blocked ? ' — ' + calc.blocked : ''] : null);

      const block = h('section', { class: 'phx2-owner' + (planId ? ' is-plan' : '') },
        h('header', { class: 'phx2-owner__h' }, h('b', null, title), (o.current || calc) ? now : null),
        pe.el,
        withMargin && h('div', { class: 'phx2-section' },
          kit.field({ label: 'حاشیه‌ی سود', wide: true, hint: 'برای همه‌ی پلن‌هایی که موتور قیمتشان را می‌نویسد.' }, own.el), mgBox),
        h('div', { class: 'phx2-row phx2-row--end' }, save),
      );
      owners.push(block);
      return block;
    }

    const wrap = h('div', { class: 'phx2-brow__b' });
    wrap.append(ownerBlock(r.owner, 0, r.variable ? 'کلِ محصول — پلن‌هایی که «مثلِ محصول»اند' : 'قیمت‌گذاری', true));
    for (const p of r.plans) {
      wrap.append(ownerBlock(p, p.plan_id, 'پلن: ' + p.label, false));
    }
    wrap.append(h('p', { class: 'phx2-row' },
      h('a', { class: 'phx2-btn phx2-btn--ghost phx2-btn--sm', href: '#/products/' + r.id }, icon('arrowRight'), 'ویرایشگرِ کاملِ محصول')));
    return wrap;
  }

  return { el, data: () => r };
}

/* ============================================================
   تبِ ۲ — نرخِ تتر
   ============================================================ */

function tetherTab(ctx, d, mark, reload) {
  const { h, icon, fa, ago, pill, clear, put, toast, busyButton, card, confirmBox } = ctx.ui;
  const { kit } = ctx;
  const c = d.current;
  const s = d.settings;

  /* ---------- وضعیتِ الان ---------- */
  const refresh = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('refresh'), 'همین حالا بگیر');
  refresh.addEventListener('click', busyButton(refresh, async () => {
    try {
      await ctx.api('POST', '/rate/refresh');
      toast('نرخ به‌روز شد.', 'good');
      await reload();
    } catch (e) { toast(e.message, 'bad'); }
  }));

  const now = h('section', { class: 'phx2-card phx2-ratehero' },
    h('div', null,
      h('span', { class: 'phx2-hero__k' }, icon('pulse'), 'نرخِ جاری'),
      h('p', { class: 'phx2-ratehero__v num' }, c.value ? fa(c.value) : '—', c.value ? h('small', null, ' تومان') : null),
      h('p', { class: 'phx2-ratehero__m' },
        pill(!c.value ? 'ندارد' : c.stale ? 'کهنه' : 'تازه', !c.value ? 'bad' : c.stale ? 'warn' : 'good'),
        c.source ? h('span', null, 'از ' + c.source) : null,
        c.at ? h('span', null, ago(c.at)) : null,
      ),
      c.why ? h('p', { class: 'phx2-ratehero__why' }, c.why) : null,
    ),
    h('div', { class: 'phx2-ratehero__a' }, refresh),
  );

  /* ---------- منابع ---------- */
  const toggles = {};
  const editorSlot = h('div');
  const addBtn = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('plus'), 'منبعِ تازه');
  const panelCount = d.sources.filter((x) => x.origin === 'panel').length;
  addBtn.disabled = panelCount >= d.custom_max;
  addBtn.addEventListener('click', () => openEditor(null));

  const srcCard = card('منابع', 'هر منبعی که خاموش شود دیگر خوانده نمی‌شود. «آزمایش» همان لحظه پاسخِ واقعی را نشان می‌دهد و روی نرخ اثری ندارد.');
  srcCard.querySelector('.phx2-card__head').append(addBtn);
  const rows = h('div', { class: 'phx2-srcs' });

  for (const src of d.sources) {
    const hl = src.health;
    const [sw, st] = hl ? (STATUS[hl.status] || ['خطا', 'bad']) : ['هنوز خوانده نشده', 'neutral'];
    const tog = kit.toggle({ checked: src.enabled, label: 'روشن', onChange: () => markDirty() });
    toggles[src.slug] = tog;

    const result = h('div', { class: 'phx2-src__test', hidden: true, 'aria-live': 'polite' });
    const test = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('flask'), 'آزمایش');
    test.addEventListener('click', busyButton(test, async () => {
      try {
        const r = await ctx.api('POST', '/sources/' + encodeURIComponent(src.slug) + '/test');
        showTry(result, r);
      } catch (e) { toast(e.message, 'bad'); }
    }));

    const acts = [test];
    if (src.origin === 'panel') {
      const edit = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', type: 'button' }, icon('sliders'), 'ویرایش');
      edit.addEventListener('click', () => openEditor(src));
      const del = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost is-danger', type: 'button' }, icon('trash'), 'حذف');
      del.addEventListener('click', busyButton(del, async () => {
        const ok = await confirmBox({ title: 'این منبع حذف شود؟', text: '«' + src.label + '» دیگر خوانده نمی‌شود.', ok: 'حذف کن', tone: 'bad' });
        if (!ok) return;
        try { await ctx.api('DELETE', '/sources/' + src.slug); toast('حذف شد.', 'info'); await reload(); }
        catch (e) { toast(e.message, 'bad'); }
      }));
      acts.push(edit, del);
    }

    rows.append(h('article', { class: 'phx2-src' + (hl && hl.chosen ? ' is-chosen' : '') },
      h('div', { class: 'phx2-src__h' },
        h('div', null,
          h('b', null, src.label,
            src.origin === 'config' ? h('small', null, ' — از wp-config') : null,
            src.origin === 'panel' ? h('small', null, ' — سفارشی') : null),
          h('code', { class: 'phx2-src__url', dir: 'ltr', title: src.url }, src.url),
        ),
        tog.el,
      ),
      h('div', { class: 'phx2-src__m' },
        pill(hl && hl.chosen ? 'برنده' : sw, hl && hl.chosen ? 'brand' : st),
        hl && hl.rate ? h('span', { class: 'num' }, fa(hl.rate) + ' تومان') : null,
        hl && hl.ms ? h('span', { class: 'num' }, fa(hl.ms) + ' میلی‌ثانیه') : null,
        h('span', null, 'واحد: ' + (src.unit === 'rial' ? 'ریال' : 'تومان')),
        hl ? h('span', null, ago(hl.at)) : null,
      ),
      !src.conn_ok ? h('p', { class: 'phx2-src__note is-bad' }, 'کلیدِ اتصالش باز نمی‌شود — این منبع فعلاً خوانده نمی‌شود.') : null,
      hl && hl.note ? h('p', { class: 'phx2-src__note' }, hl.note) : null,
      h('div', { class: 'phx2-row' }, acts),
      result,
    ));
  }
  srcCard.append(rows, editorSlot);

  function showTry(box, r) {
    const [w, t] = STATUS[r.status] || ['خطا', 'bad'];
    put(box,
      pill(w, t),
      r.rate ? h('b', { class: 'num' }, fa(r.rate) + ' تومان') : null,
      r.ms ? h('span', { class: 'num' }, fa(r.ms) + ' میلی‌ثانیه') : null,
      r.note ? h('span', { class: 'phx2-src__note' }, r.note) : null,
    );
    box.hidden = false;
  }

  /* ---------- ویرایشگرِ منبعِ سفارشی ---------- */
  function openEditor(src) {
    const e = src || { label: '', url: '', path: '', unit: '', conn: '' };
    const label = kit.text({ value: e.label, max: 60, placeholder: 'مثلاً: صرافیِ فلان' });
    const url = kit.text({ value: e.url, dir: 'ltr', max: 500, placeholder: 'https://api.exchange.com/ticker' });
    const path = kit.text({ value: e.path, dir: 'ltr', max: 200, placeholder: 'data.USDT.price' });
    const unit = kit.seg({ value: e.unit, label: 'واحد', options: [{ value: 'toman', label: 'تومان' }, { value: 'rial', label: 'ریال' }] });
    const conn = kit.select({
      value: e.conn || '',
      options: [{ value: '', label: 'بدونِ کلید' }, ...d.connections.map((x) => ({ value: x.slug, label: x.label }))],
    });
    const F = {
      label: kit.field({ label: 'اسم', required: true }, label.el),
      unit: kit.field({ label: 'واحدِ عدد', required: true, hint: 'اشتباهش قیمتِ کلِ فروشگاه را ده برابر می‌کند.' }, unit.el),
      url: kit.field({ label: 'نشانیِ API', wide: true, hint: 'فقط https. نشانیِ شبکه‌ی داخلی رد می‌شود.' }, url.el),
      path: kit.field({ label: 'مسیرِ عدد در پاسخ', hint: 'هر نقطه یک سطح پایین‌تر. در فهرست: ‎markets.[].symbol=USDTIRT.price‎' }, path.el),
      conn: kit.field({ label: 'کلید', hint: 'از تبِ «اتصال‌ها».' }, conn.el),
    };
    const body = () => ({ label: label.get(), url: url.get(), path: path.get(), unit: unit.get(), conn: conn.get() });
    const errors = (map) => { for (const [k, m] of Object.entries(map)) (F[k] || F.label).setError(m); };
    const clearAll = () => { for (const w of Object.values(F)) w.setError(''); };

    const out = h('div', { class: 'phx2-src__test', hidden: true, 'aria-live': 'polite' });
    const tryBtn = h('button', { class: 'phx2-btn', type: 'button' }, icon('flask'), 'آزمایش');
    tryBtn.addEventListener('click', busyButton(tryBtn, async () => {
      clearAll();
      try { showTry(out, await ctx.api('POST', '/sources/try', body())); }
      catch (err) { if (err.fields) errors(err.fields); toast(err.message, 'bad'); }
    }));
    const saveBtn = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('save'), 'ذخیره‌ی منبع');
    saveBtn.addEventListener('click', busyButton(saveBtn, async () => {
      clearAll();
      try {
        await ctx.api('POST', src ? '/sources/' + src.slug : '/sources', body());
        toast('منبع ذخیره شد. از به‌روزرسانیِ بعدی خوانده می‌شود.', 'good');
        await reload();
      } catch (err) { if (err.fields) errors(err.fields); toast(err.message, 'bad'); }
    }));
    const cancel = h('button', { class: 'phx2-btn phx2-btn--ghost', type: 'button' }, 'انصراف');
    cancel.addEventListener('click', () => clear(editorSlot));

    const box = h('section', { class: 'phx2-card phx2-editcard' },
      h('h3', { class: 'phx2-card__t' }, src ? 'ویرایشِ «' + src.label + '»' : 'منبعِ تازه‌ی نرخ'),
      h('div', { class: 'phx2-form' }, F.label, F.unit, F.url, F.path, F.conn),
      out,
      h('div', { class: 'phx2-row phx2-row--end' }, cancel, tryBtn, saveBtn),
    );
    put(editorSlot, box);
    box.scrollIntoView({ block: 'start', behavior: 'smooth' });
    label.el.focus({ preventScroll: true });
  }

  /* ---------- تصمیم‌گیری ---------- */
  const pick = kit.seg({
    value: s.pick, label: 'روشِ انتخاب', onChange: () => markDirty(),
    options: [{ value: 'lowest', label: 'کمترین' }, { value: 'median', label: 'میانه' }, { value: 'average', label: 'میانگین' }],
  });
  const minS = kit.money({ value: s.min_sources, unit: 'منبع' });
  const spread = kit.money({ value: s.spread_max, unit: '٪' });
  const ttl = kit.money({ value: Math.round(s.rate_ttl / 60), unit: 'دقیقه' });
  const smin = kit.money({ value: s.sane_min });
  const smax = kit.money({ value: s.sane_max });
  const manual = kit.money({ value: s.manual_rate || '', allowEmpty: true });
  const until = kit.when({ value: s.manual_until });

  const rules = card('چطور انتخاب شود', null,
    h('div', { class: 'phx2-form' },
      kit.field({ label: 'روشِ انتخاب', wide: true, hint: '«کمترین» ارزان‌ترین قیمتِ فروش است. «میانه» مقاوم‌ترین در برابرِ منبعِ خراب — یک عددِ اشتباه رویش اثر ندارد.' }, pick.el),
      kit.field({ label: 'حداقل منبعِ سالم', hint: 'کمتر از این، نرخ اصلاً عوض نمی‌شود. حرفِ یک منبع را نمی‌شود راستی‌آزمایی کرد.' }, minS.el),
      kit.field({ label: 'فاصله‌ی مجاز از میانه', hint: 'عددی که بیش از این با بقیه فرق دارد، پرت حساب می‌شود و کنار می‌رود.' }, spread.el),
      kit.field({ label: 'عمرِ کش', hint: 'در این مدت به صرافی‌ها درخواست نمی‌رود.' }, ttl.el),
    ),
  );
  const guard = card('بازه‌ی معقول', 'عددِ بیرونِ این بازه بی‌چون‌وچرا رد می‌شود — دفاعِ آخر در برابرِ منبعی که ساختارِ پاسخش عوض شده.',
    h('div', { class: 'phx2-form' }, kit.field({ label: 'کف' }, smin.el), kit.field({ label: 'سقف' }, smax.el)));
  const man = card('نرخِ دستی', 'پر که باشد، همه‌ی منابع نادیده گرفته می‌شوند. برای روزی که صرافی‌ها بخوابند.',
    h('div', { class: 'phx2-form' },
      kit.field({ label: 'نرخ', hint: 'خالی یعنی خاموش.' }, manual.el),
      kit.field({ label: 'تا کِی', hint: 'خالی یعنی تا وقتی خودت برداری — و آن وقت یادت می‌رود.' }, until.el),
    ),
  );

  const saveBtn = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button', disabled: true }, icon('save'), 'ذخیره‌ی تنظیماتِ نرخ');
  function markDirty() { saveBtn.disabled = false; mark('tether', true); }
  for (const el of [rules, guard, man]) el.addEventListener('input', markDirty);

  saveBtn.addEventListener('click', busyButton(saveBtn, async () => {
    const sources = {};
    for (const [slug, t] of Object.entries(toggles)) sources[slug] = t.get();
    try {
      await ctx.api('POST', '/rate', {
        pick: pick.get(), min_sources: minS.get() || 1, spread_max: spread.get() || 25,
        rate_ttl: (ttl.get() || 10) * 60, sane_min: smin.get(), sane_max: smax.get(),
        manual_rate: manual.get() || 0, manual_until: manual.get() ? until.get() : 0, sources,
      });
      mark('tether', false);
      toast(manual.get() && !until.get() ? 'ذخیره شد — ولی نرخِ دستی بدونِ تاریخِ انقضاست.' : 'ذخیره شد.', manual.get() && !until.get() ? 'info' : 'good');
      await reload();
    } catch (e) { toast(e.message, 'bad'); }
  }));

  /* ---------- تاریخچه ---------- */
  const hist = card('تاریخچه‌ی نرخ', 'هر بار که نرخ عوض شد، از چند به چند و چرا.');
  if (!d.history.length) hist.append(h('p', { class: 'phx2-empty' }, 'هنوز تغییری ثبت نشده.'));
  else {
    hist.append(h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table' },
      h('thead', null, h('tr', null, h('th', null, 'کِی'), h('th', null, 'تغییر'), h('th', null, 'چرا'))),
      h('tbody', null, d.history.map((r) => h('tr', null,
        h('td', { class: 'phx2-td-nowrap' }, ago(r.at)),
        h('td', null, h('span', { class: 'phx2-change num' },
          h('s', null, r.before ? fa(r.before) : '—'), icon('arrow'), h('span', null, r.after ? fa(r.after) : '—'))),
        h('td', null, r.note),
      ))),
    )));
  }

  return h('div', { class: 'phx2-stack phx2-stack--lg' },
    now,
    srcCard,
    h('div', { class: 'phx2-grid phx2-grid--halves' }, rules, h('div', { class: 'phx2-grid' }, guard, man)),
    h('div', { class: 'phx2-row phx2-row--end' }, saveBtn),
    hist,
  );
}

/* ============================================================
   تبِ ۳ — اتصال‌ها
   ============================================================ */

function connectionsTab(ctx, d, reload) {
  const { h, icon, fa, pill, clear, put, toast, busyButton, card, confirmBox } = ctx.ui;
  const { kit } = ctx;

  const slot = h('div');
  const addBtn = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button', disabled: !d.crypto }, icon('plus'), 'اتصالِ تازه');
  addBtn.addEventListener('click', () => open(null));

  const list = h('div', { class: 'phx2-conns' });
  if (!d.connections.length) {
    list.append(kit.emptyState({
      iconName: 'lock', title: 'هنوز اتصالی نیست',
      text: 'اگر تأمین‌کننده برای API کلید می‌دهد، یک بار این‌جا واردش کن و بعد در منابعِ هر محصول فقط اسمش را انتخاب کن.',
    }));
  }
  for (const c of d.connections) {
    const edit = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', type: 'button' }, icon('sliders'), 'ویرایش');
    edit.addEventListener('click', () => open(c));
    const del = h('button', {
      class: 'phx2-btn phx2-btn--sm phx2-btn--ghost is-danger', type: 'button', disabled: c.used > 0,
      title: c.used > 0 ? 'اول منابعی که از آن استفاده می‌کنند را عوض کن' : null,
    }, icon('trash'), 'حذف');
    del.addEventListener('click', busyButton(del, async () => {
      const ok = await confirmBox({ title: 'اتصال حذف شود؟', text: 'کلیدِ «' + c.label + '» برای همیشه پاک می‌شود.', ok: 'حذف کن', tone: 'bad' });
      if (!ok) return;
      try { await ctx.api('DELETE', '/connections/' + c.slug); toast('حذف شد.', 'info'); await reload(); }
      catch (e) { toast(e.message, 'bad'); }
    }));
    list.append(h('article', { class: 'phx2-conn' },
      h('span', { class: 'phx2-conn__i', 'aria-hidden': 'true' }, icon('lock')),
      h('div', { class: 'phx2-conn__b' },
        h('b', null, c.label),
        h('span', { class: 'phx2-td-muted' }, c.auth === 'header' ? 'هدرِ ‎' + c.header + '‎' : 'Authorization: Bearer',
          ' · ', c.used ? 'در ' + fa(c.used) + ' منبع' : 'هنوز جایی استفاده نشده'),
      ),
      pill(c.key === 'ok' ? 'کلید ذخیره شده' : 'کلید باز نمی‌شود — دوباره واردش کن', c.key === 'ok' ? 'good' : 'bad'),
      h('div', { class: 'phx2-row' }, edit, del),
    ));
  }

  function open(c) {
    const label = kit.text({ value: c ? c.label : '', max: 60, placeholder: 'مثلاً: تأمین‌کننده الف' });
    const auth = kit.seg({
      value: c ? c.auth : 'bearer', label: 'روش', onChange: () => { F.header.hidden = auth.get() !== 'header'; },
      options: [{ value: 'bearer', label: 'Bearer' }, { value: 'header', label: 'هدرِ دلخواه' }],
    });
    const header = kit.text({ value: c ? c.header : '', dir: 'ltr', max: 40, placeholder: 'X-API-Key' });
    const key = kit.text({
      type: 'password', dir: 'ltr', max: 500,
      placeholder: c && c.key === 'ok' ? 'ذخیره شده — برای عوض کردن بنویس' : 'کلیدِ API',
    });
    key.el.setAttribute('autocomplete', 'new-password');
    const F = {
      label: kit.field({ label: 'اسم', required: true }, label.el),
      auth: kit.field({ label: 'کلید کجا فرستاده شود', hint: 'مستنداتِ API تأمین‌کننده می‌گوید.' }, auth.el),
      header: kit.field({ label: 'نامِ هدر' }, header.el),
      key: kit.field({ label: 'کلید', wide: true, hint: 'رمزنگاری‌شده ذخیره می‌شود و دیگر به مرورگر برنمی‌گردد — حتی برای خودت.' }, key.el),
    };
    F.header.hidden = auth.get() !== 'header';

    const save = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('save'), 'ذخیره');
    save.addEventListener('click', busyButton(save, async () => {
      for (const w of Object.values(F)) w.setError('');
      try {
        await ctx.api('POST', c ? '/connections/' + c.slug : '/connections',
          { label: label.get(), auth: auth.get(), header: header.get(), key: key.el.value });
        key.el.value = '';
        toast('اتصال ذخیره شد.', 'good');
        await reload();
      } catch (e) {
        if (e.fields) for (const [k, m] of Object.entries(e.fields)) (F[k] || F.label).setError(m);
        toast(e.message, 'bad');
      }
    }));
    const cancel = h('button', { class: 'phx2-btn phx2-btn--ghost', type: 'button' }, 'انصراف');
    cancel.addEventListener('click', () => clear(slot));

    const box = h('section', { class: 'phx2-card phx2-editcard' },
      h('h3', { class: 'phx2-card__t' }, c ? 'ویرایشِ «' + c.label + '»' : 'اتصالِ تازه'),
      h('div', { class: 'phx2-form' }, F.label, F.auth, F.header, F.key),
      h('div', { class: 'phx2-row phx2-row--end' }, cancel, save),
    );
    put(slot, box);
    box.scrollIntoView({ block: 'start', behavior: 'smooth' });
    label.el.focus({ preventScroll: true });
  }

  return h('div', { class: 'phx2-stack phx2-stack--lg' },
    !d.crypto && h('div', { class: 'phx2-callout is-bad' }, icon('alert'),
      h('span', null, 'این سرور نه sodium دارد نه openssl؛ کلیدِ API را نمی‌شود امن نگه داشت. از پشتیبانیِ هاست بخواه یکی را فعال کند.')),
    card('اتصال‌ها', 'کلیدهای API تأمین‌کننده‌ها. منابعِ قیمتِ محصول و نرخِ تتر فقط به اسمِ اتصال اشاره می‌کنند؛ عوض کردنِ کلید یک جا انجام می‌شود.',
      h('div', { class: 'phx2-row phx2-row--end' }, addBtn), list),
    slot,
  );
}
