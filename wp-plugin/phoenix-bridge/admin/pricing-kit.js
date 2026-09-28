/* ============================================================
   قیمت‌گذاری — یک تکه، دو جا.

   ویرایشگرِ محصول (تبِ «قیمت‌گذاری» و هر پلن) و صفحه‌ی «منابعِ
   قیمت» (هر ردیفِ تابلو) هر دو همین را می‌سازند. دو نسخه یعنی
   روزی که یکی عوض شود، دو صفحه یک محصول را دو جور نشان می‌دهند.

   ⚠ کلید هیچ‌وقت این‌جا نیست. منبعِ API فقط اسمِ یک «اتصال» را
   دارد؛ کلیدش در سرور است و به مرورگر نمی‌آید.
   ============================================================ */

export function makePricing(ui, kit) {
  const { h, icon, fa, pill, ago, clear, put, busyButton, toast } = ui;

  const UNIT = { usd: 'دلار', toman: 'تومان', rial: 'ریال' };
  const STATUS = {
    ok: ['جواب داد', 'good'], off: ['خاموش', 'neutral'], net: ['اتصال برقرار نشد', 'bad'],
    http: ['خطای سرور', 'bad'], parse: ['پاسخِ نامعتبر', 'bad'], path: ['عدد پیدا نشد', 'bad'],
    value: ['عدد نبود', 'bad'], big: ['پاسخِ خیلی بزرگ', 'bad'], conn: ['اتصال خراب', 'bad'],
  };
  const PICKS = [
    { value: 'lowest', label: 'کمترین' },
    { value: 'median', label: 'میانه' },
    { value: 'average', label: 'میانگین' },
    { value: 'first', label: 'اولین پاسخ' },
    { value: 'pinned', label: 'دستی' },
  ];
  const MODES = [
    { value: 'manual', label: 'دستی', icon: 'text' },
    { value: 'usd', label: 'دلار × نرخ', icon: 'dollar' },
    { value: 'toman', label: 'هزینه‌ی تومانی', icon: 'layers' },
    { value: 'sources', label: 'از چند منبع', icon: 'pulse' },
  ];
  const newId = () => 's' + Math.random().toString(36).slice(2, 9).replace(/[^a-z0-9]/g, '0');
  const money = (n) => fa(Math.round(n)) + ' تومان';

  /* ============================================================
     یک منبع
     ============================================================ */

  function sourceRow(s, connections, onChange) {
    const id = s.id || newId();
    const label = kit.text({ value: s.label || '', max: 60, placeholder: 'مثلاً: تأمین‌کننده الف' });
    const kind = kit.seg({
      value: s.kind || 'api', label: 'نوعِ منبع', onChange: () => { paint(); onChange(); },
      options: [{ value: 'api', label: 'از API', icon: 'bolt' }, { value: 'fixed', label: 'عددِ دستی', icon: 'text' }],
    });
    const url = kit.text({ value: s.url || '', dir: 'ltr', max: 500, placeholder: 'https://api.supplier.com/prices' });
    const path = kit.text({ value: s.path || '', dir: 'ltr', max: 200, placeholder: 'data.price' });
    const conn = kit.select({
      value: s.conn || '',
      options: [{ value: '', label: 'بدونِ کلید' },
        ...connections.map((c) => ({ value: c.slug, label: c.label + (c.key === 'ok' ? '' : ' — کلید خراب') }))],
    });
    const value = kit.money({ value: s.value || '', allowEmpty: true, decimals: 2, unit: '' });
    const unit = kit.seg({
      value: s.unit || '', label: 'واحد', onChange,
      options: [{ value: 'usd', label: 'دلار' }, { value: 'toman', label: 'تومان' }, { value: 'rial', label: 'ریال' }],
    });
    const on = kit.toggle({ checked: s.on !== false, label: 'روشن', onChange });
    const result = h('div', { class: 'phx2-psrc__res', hidden: true, 'aria-live': 'polite' });

    const F = {
      label: kit.field({ label: 'اسم', required: true }, label.el),
      url: kit.field({ label: 'نشانیِ API', wide: true, hint: 'فقط https. پاسخ باید JSON باشد.' }, url.el),
      path: kit.field({ label: 'مسیرِ عدد در پاسخ', hint: 'هر نقطه یک سطح پایین‌تر: ‎data.price‎. در فهرست: ‎items.[].sku=gpt-1m.price‎' }, path.el),
      conn: kit.field({ label: 'کلید', hint: 'اتصال‌ها در «منابعِ قیمت ← اتصال‌ها» ساخته می‌شوند.' }, conn.el),
      value: kit.field({ label: 'عدد', hint: 'مثلاً قیمتی که تأمین‌کننده در تلگرام داده.' }, value.el),
      unit: kit.field({ label: 'واحد', required: true, hint: 'دلار با نرخِ روزِ تتر تومان می‌شود.' }, unit.el),
    };
    const apiBox = h('div', { class: 'phx2-form' }, F.url, F.path, F.conn);
    const fixedBox = h('div', { class: 'phx2-form' }, F.value);
    const paint = () => {
      apiBox.hidden = kind.get() !== 'api';
      fixedBox.hidden = kind.get() !== 'fixed';
    };
    paint();

    const el = h('div', { class: 'phx2-psrc' },
      h('div', { class: 'phx2-form' }, F.label, kit.field({ label: 'نوع' }, kind.el)),
      apiBox, fixedBox,
      h('div', { class: 'phx2-form' }, F.unit, kit.field({ label: 'وضعیت' }, on.el)),
      result,
    );

    return {
      el, id, F,
      label: () => label.get(),
      get: () => ({
        id, label: label.get(), kind: kind.get(), url: url.get(), path: path.get(),
        conn: conn.get(), value: value.get() || 0, unit: unit.get(), on: on.get(),
      }),
      showResult(r, toman, chosen) {
        if (!r) { result.hidden = true; return; }
        const [w, t] = STATUS[r.status] || ['خطا', 'bad'];
        put(result,
          pill(chosen ? 'انتخاب شد' : w, chosen ? 'brand' : t),
          r.status === 'ok' && r.value != null
            ? h('b', { class: 'num' }, fa(r.value) + ' ' + (UNIT[r.unit] || ''))
            : null,
          r.status === 'ok' && toman != null && r.unit !== 'toman'
            ? h('span', { class: 'num phx2-td-muted' }, '≈ ' + money(toman))
            : null,
          r.ms ? h('span', { class: 'num phx2-td-muted' }, fa(r.ms) + ' میلی‌ثانیه') : null,
          r.note && r.status !== 'ok' ? h('span', { class: 'phx2-psrc__note' }, r.note) : null,
        );
        result.hidden = false;
      },
    };
  }

  /* ============================================================
     فهرستِ منابع + الگو + خلاصه
     ============================================================ */

  function sourcesEditor({ cfg, state, connections = [], onChange = () => {}, onFetch, onApprove }) {
    const c = cfg && cfg.list ? cfg : { list: [], pick: 'lowest', pinned: '', max_jump: 30 };
    let lastPick = null;

    /* ⚠ فهرست همان لحظه‌ی ساخته شدن ‎onChange‎ را صدا می‌زند —
       پیش از آنکه ‎pinned‎ و خودِ ‎rep‎ مقدار داشته باشند. همان
       خطای ویرایشگرِ محصول، این بار این‌جا: تا پایانِ ساختن هیچ. */
    let ready = false;
    const changed = () => { if (!ready) return; refreshPinned(); onChange(); };
    const rep = kit.repeater({
      items: c.list.length ? c.list : [{ id: newId(), kind: 'api', on: true }],
      min: 1, max: 6, addLabel: 'افزودنِ منبع', onChange: changed,
      blank: () => ({ id: newId(), kind: 'api', on: true }),
      row: (s) => sourceRow(s, connections, changed),
    });

    const pick = kit.seg({ value: c.pick, label: 'الگوی انتخاب', options: PICKS, onChange: () => { paintPick(); onChange(); } });
    const pinned = kit.select({ value: c.pinned, options: [] });
    pinned.el.addEventListener('change', onChange);
    const jump = kit.money({ value: c.max_jump ?? 30, unit: '٪', allowEmpty: true });

    const pinnedField = kit.field({ label: 'از کدام منبع', hint: 'قیمت همیشه از همین می‌آید؛ اگر جواب ندهد، قیمتِ قبلی می‌ماند — به منبعِ دیگر نمی‌پرد.' }, pinned.el);
    const F = {
      list: kit.field({ label: 'منابع', wide: true }, rep.el),
      pinned: pinnedField,
      jump: kit.field({ label: 'سقفِ جهش', hint: 'تغییرِ بیشتر از این نگه داشته می‌شود تا تأیید کنی. صفر یعنی خاموش.' }, jump.el),
    };
    function refreshPinned() {
      const cur = pinned.get() || c.pinned;
      clear(pinned.el);
      for (const r of rep.rows()) {
        pinned.el.append(h('option', { value: r.id, selected: r.id === cur }, r.label() || 'بی‌اسم'));
      }
    }
    function paintPick() { pinnedField.hidden = pick.get() !== 'pinned'; }
    refreshPinned();
    paintPick();
    ready = true;

    /* ---------- خلاصه: چه انتخاب شد و چرا ---------- */
    const summary = h('div', { class: 'phx2-picksum', 'aria-live': 'polite' });
    const fetchBtn = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('refresh'), 'همین حالا بگیر');

    function showPick(p, { saved = false, candidate = null, use = null, at = null } = {}) {
      clear(summary);
      if (!p) {
        summary.append(h('p', { class: 'phx2-td-muted' }, 'هنوز از این منابع عددی گرفته نشده. «همین حالا بگیر» را بزن.'));
        return;
      }
      if (p.ok) {
        summary.append(h('div', { class: 'phx2-picksum__v' },
          h('span', null, 'هزینه‌ی انتخاب‌شده'),
          h('b', { class: 'num' }, money(p.toman)),
          p.unit === 'usd' ? h('small', { class: 'num' }, '(' + fa(p.value) + ' دلار)') : null));
        summary.append(h('p', { class: 'phx2-picksum__why' }, p.why));
      }
      if (p.held) {
        const box = h('div', { class: 'phx2-callout is-warn' }, icon('alert'), h('span', null, p.held));
        if (saved && candidate && onApprove) {
          const ok = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--primary', type: 'button' }, icon('check'), 'این قیمت را قبول کن');
          ok.addEventListener('click', busyButton(ok, onApprove));
          box.append(ok);
        }
        summary.append(box);
      }
      if (saved && use) {
        summary.append(h('p', { class: 'phx2-td-muted' },
          'در کار: ', h('span', { class: 'num' }, fa(use.value) + ' ' + (UNIT[use.unit] || '')),
          at ? ' — ' + ago(at) : ''));
      }
      if (!saved) summary.append(h('p', { class: 'phx2-td-muted' }, 'این نتیجه‌ی همین فرم است؛ با «ذخیره» روی سایت می‌رود.'));
    }

    function showResults(results, p) {
      const rows = p && p.rows ? p.rows : {};
      for (const r of rep.rows()) r.showResult(results ? results[r.id] : null, rows[r.id] ?? null, p && p.ok && p.from === r.id);
    }

    if (state && state.results) {
      showResults(state.results, state.pick);
      showPick(state.pick, { saved: true, candidate: state.candidate, use: state.use, at: state.at });
    } else {
      showPick(null);
    }

    fetchBtn.addEventListener('click', busyButton(fetchBtn, async () => {
      clearErrors();
      try {
        const d = await onFetch(get());
        lastPick = d.pick && d.pick.ok ? d.pick : null;
        showResults(d.results, d.pick);
        showPick(d.pick);
        onChange();
      } catch (e) {
        if (e.fields) setErrors(e.fields);
        toast(e.message, 'bad');
      }
    }));

    const el = h('div', { class: 'phx2-stack' },
      h('div', { class: 'phx2-form' }, F.list),
      h('div', { class: 'phx2-form' },
        kit.field({ label: 'الگوی انتخاب', wide: true, hint: 'از منابعی که جواب دادند کدام برنده شود.' }, pick.el),
        F.pinned, F.jump),
      h('div', { class: 'phx2-row' }, fetchBtn),
      summary,
    );

    function get() {
      return { list: rep.get(), pick: pick.get(), pinned: pinned.get() || '', max_jump: jump.get() ?? 0 };
    }
    function clearErrors() {
      for (const w of Object.values(F)) w.setError('');
      for (const r of rep.rows()) for (const w of Object.values(r.F)) w.setError('');
    }
    /** کلیدها مثلِ ‎list.0.url‎ — همان خروجیِ ‎phoenix_psrc_clean‎ */
    function setErrors(map) {
      const rows = rep.rows();
      for (const [k, msg] of Object.entries(map)) {
        const m = k.match(/^list\.(\d+)\.(\w+)/);
        if (m && rows[+m[1]]) {
          (rows[+m[1]].F[m[2]] || rows[+m[1]].F.label).setError(msg);
        } else if (k === 'pinned') F.pinned.setError(msg);
        else F.list.setError(msg);
      }
    }

    return { el, get, setErrors, clearErrors, lastPick: () => lastPick, fetch: () => fetchBtn.click() };
  }

  /* ============================================================
     قیمت‌گذاریِ کامل: منبعِ قیمت + هزینه + قفل + چند منبع
     ============================================================ */

  function pricingEditor({ pricing, plan = false, connections = [], onChange = () => {}, onFetch, onApprove }) {
    const p = pricing || { mode: plan ? 'inherit' : 'manual', cost_usd: 0, cost_toman: 0, locked: false };
    const mode = kit.seg({
      value: p.mode, label: 'منبعِ قیمت', onChange: () => { paint(); onChange(); },
      options: plan ? [{ value: 'inherit', label: 'مثلِ محصول', icon: 'layers' }, ...MODES] : MODES,
    });
    const usd = kit.money({ value: p.cost_usd || '', unit: 'دلار', allowEmpty: true, decimals: 2 });
    const toman = kit.money({ value: p.cost_toman || '', allowEmpty: true });
    const locked = kit.toggle({
      checked: p.locked, onChange,
      label: plan ? 'قفل — موتور به این پلن دست نزند' : 'قفل — موتور به قیمتِ این محصول دست نزند',
    });
    const src = sourcesEditor({
      cfg: p.sources, state: p.sources_state, connections, onChange, onFetch, onApprove,
    });

    const F = {
      mode: kit.field({ label: 'قیمت از کجا بیاید', wide: true }, mode.el),
      cost_usd: kit.field({ label: 'قیمتِ تمام‌شده به دلار', hint: plan ? 'خالی یعنی مثلِ محصول.' : 'چند دلار برای خودمان تمام می‌شود — نه قیمتِ سایتِ خودِ سرویس.' }, usd.el),
      cost_toman: kit.field({ label: 'قیمتِ تمام‌شده به تومان', hint: plan ? 'خالی یعنی مثلِ محصول.' : 'اگر جنس را تومانی خریده‌ایم.' }, toman.el),
      locked: kit.field({ label: '', wide: true }, locked.el),
    };
    const srcBox = h('div', { class: 'phx2-section' }, src.el);
    const hint = h('p', { class: 'phx2-tabfoot' });

    function paint() {
      const m = mode.get();
      F.cost_usd.hidden = m !== 'usd';
      F.cost_toman.hidden = m !== 'toman';
      F.locked.hidden = m === 'inherit';
      srcBox.hidden = m !== 'sources';
      hint.hidden = !(m === 'manual' || m === 'inherit');
      clear(hint);
      if (m === 'manual') hint.append(icon('info'), 'دستی یعنی همان عددی که در پلن‌ها می‌نویسی؛ موتور هیچ‌وقت دست نمی‌زند.');
      if (m === 'inherit') hint.append(icon('info'), 'این پلن همان منبع و هزینه‌ی کلِ محصول را دارد.');
    }
    paint();

    const el = h('div', { class: 'phx2-stack' },
      h('div', { class: 'phx2-form' }, F.mode, F.cost_usd, F.cost_toman, F.locked),
      hint,
      srcBox,
    );

    return {
      el,
      mode: () => mode.get(),
      locked: () => locked.get(),
      get: () => ({
        mode: mode.get(), cost_usd: usd.get() || 0, cost_toman: toman.get() || 0,
        locked: locked.get(), sources: mode.get() === 'sources' ? src.get() : null,
      }),
      /** نتیجه‌ی آخرین «بگیر»، برای پیش‌نمایش */
      tryPick: () => (mode.get() === 'sources' ? src.lastPick() : null),
      clearErrors() { for (const w of Object.values(F)) w.setError(''); src.clearErrors(); },
      /** کلیدها: ‎cost_usd‎، ‎cost_toman‎، ‎sources.list.0.url‎، ‎sources.pinned‎ */
      setErrors(map) {
        const sub = {};
        for (const [k, msg] of Object.entries(map)) {
          if (k.startsWith('sources.')) sub[k.slice(8)] = msg;
          else (F[k] || F.mode).setError(msg);
        }
        if (Object.keys(sub).length) src.setErrors(sub);
      },
      /** «قیمتِ تمام‌شده ندارد» — به فیلدِ همان حالت */
      costError(msg) { (mode.get() === 'toman' ? F.cost_toman : mode.get() === 'usd' ? F.cost_usd : F.mode).setError(msg); },
    };
  }

  return { pricingEditor, sourcesEditor, UNIT, STATUS, MODES };
}
