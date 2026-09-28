/* ============================================================
   جعبه‌ابزارِ فرم — مشترکِ همه‌ی صفحه‌ها.

   ⚠ این‌جا چیزی import نمی‌شود؛ ‎ui‎ از بیرون داده می‌شود.
   دلیلش همان دلیلِ پوسته است: هر ماژول فقط یک بار و با نسخه بار
   می‌شود، تا بعد از به‌روزرسانی نیمی کهنه و نیمی تازه نماند.

   ⚠ هر کنترل دو چیز برمی‌گرداند: خودِ عنصر (‎el‎) و خواندنِ
   مقدار (‎get‎). صفحه‌ها هیچ‌وقت از DOM مقدار نمی‌خوانند؛ فقط از
   ‎get‎. این یعنی شکلِ داده یک‌جا تعریف می‌شود، نه لای
   ‎querySelector‎ها.
   ============================================================ */

export function makeKit(ui) {
  const { h, icon, fa } = ui;
  let uid = 0;
  const nid = (p) => `phx2-${p}-${++uid}`;

  /* ---------- رقم ---------- */

  /** رقمِ فارسی و عربی به لاتین — تا «۱۲۰۰۰» هم پذیرفته شود */
  const toLatin = (s) => String(s)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  /* ---------- قاب ---------- */

  /**
   * یک ردیفِ فرم.
   *
   * ⚠ خطا کنارِ همان فیلد، نه فقط بالای صفحه.
   * کسی که ده فیلد پر کرده باید ببیند کدام یکی ایراد دارد، نه
   * فقط اینکه «بعضی فیلدها درست نیستند».
   */
  function field({ label, hint, required, wide }, control) {
    const id = control.id || (control.id = nid('f'));
    const hintId = hint ? nid('h') : null;
    const errEl = h('p', { class: 'phx2-field__err', role: 'alert', hidden: true });
    if (hintId) control.setAttribute('aria-describedby', hintId);

    const el = h('div', { class: 'phx2-field' + (wide ? ' is-wide' : '') },
      label && h('label', { class: 'phx2-field__l', for: id },
        label, required && h('span', { class: 'phx2-field__req', 'aria-hidden': 'true' }, '*')),
      control,
      hint && h('p', { class: 'phx2-field__h', id: hintId }, hint),
      errEl,
    );
    el.setError = (msg) => {
      errEl.hidden = !msg;
      errEl.textContent = msg || '';
      el.classList.toggle('has-error', !!msg);
      control.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };
    return el;
  }

  /* ---------- کنترل‌ها ---------- */

  function text({ value = '', placeholder = '', max, dir, onInput, type = 'text' } = {}) {
    const el = h('input', {
      class: 'phx2-in', type, value, placeholder, maxlength: max, dir,
      autocomplete: 'off', spellcheck: 'false',
    });
    if (onInput) el.addEventListener('input', () => onInput(el.value));
    return { el, get: () => el.value.trim(), set: (v) => { el.value = v; } };
  }

  /**
   * مبلغ — تومان یا عددِ صحیح.
   *
   * ⚠ ‎type="text"‎ و نه ‎number‎.
   *
   * ‎number‎ رقمِ فارسی نمی‌پذیرد و روی بعضی کیبوردهای فارسی کاربر
   * تایپ می‌کند و هیچ اتفاقی نمی‌افتد. این‌جا هر رقمی پذیرفته و
   * به لاتین تبدیل می‌شود، و زیرش مبلغ با جداکننده‌ی فارسی دیده
   * می‌شود — شمردنِ صفرهای «۱۷۶۶۰۰۰۰» چشمی ممکن نیست.
   */
  function money({ value = 0, unit = 'تومان', allowEmpty = false, decimals = 0, onInput } = {}) {
    const show = (v) => (v === null || v === '' ? '' : String(v));
    const el = h('input', {
      class: 'phx2-in phx2-in--num', type: 'text', inputmode: decimals ? 'decimal' : 'numeric',
      dir: 'ltr', value: show(value), autocomplete: 'off',
    });
    const out = h('span', { class: 'phx2-money__v', 'aria-live': 'polite' });
    const wrap = h('div', { class: 'phx2-money' }, el, h('span', { class: 'phx2-money__u' }, unit), out);

    const parse = () => {
      const raw = toLatin(el.value).replace(/[,٬\s]/g, '');
      if (raw === '') return allowEmpty ? null : 0;
      const n = decimals ? parseFloat(raw) : parseInt(raw, 10);
      return Number.isFinite(n) ? n : (allowEmpty ? null : 0);
    };
    const paint = () => {
      const n = parse();
      out.textContent = n ? fa(n) + ' ' + unit : '';
    };
    el.addEventListener('input', () => { paint(); onInput && onInput(parse()); });
    paint();
    return { el: wrap, input: el, get: parse, set: (v) => { el.value = show(v); paint(); } };
  }

  function area({ value = '', rows = 4, max, placeholder = '', onInput } = {}) {
    const el = h('textarea', { class: 'phx2-in phx2-in--area', rows, maxlength: max, placeholder });
    el.value = value;
    const count = max ? h('span', { class: 'phx2-area__c num' }) : null;
    const paint = () => { if (count) count.textContent = fa(el.value.length) + ' / ' + fa(max); };
    el.addEventListener('input', () => { paint(); onInput && onInput(el.value); });
    paint();
    return { el: count ? h('div', { class: 'phx2-area' }, el, count) : el, input: el, get: () => el.value.trim() };
  }

  function select({ value, options, onChange } = {}) {
    const el = h('select', { class: 'phx2-in phx2-in--select' },
      options.map((o) => h('option', { value: String(o.value), selected: String(o.value) === String(value) }, o.label)));
    if (onChange) el.addEventListener('change', () => onChange(el.value));
    return { el, get: () => el.value, set: (v) => { el.value = String(v); } };
  }

  /** کلیدِ روشن/خاموش با برچسب */
  function toggle({ checked = false, label, onChange } = {}) {
    const btn = h('button', { class: 'phx2-switch', type: 'button', role: 'switch', 'aria-checked': String(!!checked) });
    const lab = h('span', { class: 'phx2-toggle__l' }, label);
    const el = h('label', { class: 'phx2-toggle' }, btn, lab);
    btn.setAttribute('aria-label', label);
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', String(v));
      onChange && onChange(v);
    });
    return { el, get: () => btn.getAttribute('aria-checked') === 'true', set: (v) => btn.setAttribute('aria-checked', String(!!v)) };
  }

  /**
   * گزینه‌ی تکی به شکلِ دکمه‌های کنارِ هم.
   * ⚠ ‎role="radiogroup"‎ و کلیدهای جهت‌دار — همان رفتارِ رادیو.
   */
  function seg({ value, options, onChange, label } = {}) {
    let cur = value;
    const el = h('div', { class: 'phx2-segx', role: 'radiogroup', 'aria-label': label || '' });
    const btns = options.map((o, i) => {
      const b = h('button', {
        type: 'button', role: 'radio', 'data-v': String(o.value),
        title: o.hint || null,
      }, o.icon && icon(o.icon), o.label);
      b.addEventListener('click', () => pick(o.value, true));
      b.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; // راست‌به‌چپ
        if (!dir) return;
        e.preventDefault();
        const n = options[(i + dir + options.length) % options.length];
        pick(n.value, true);
        el.querySelector(`[data-v="${CSS.escape(String(n.value))}"]`).focus();
      });
      return b;
    });
    el.append(...btns);
    function pick(v, fire) {
      cur = v;
      for (const b of btns) {
        const on = b.dataset.v === String(v);
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
      }
      if (fire && onChange) onChange(v);
    }
    pick(value, false);
    return { el, get: () => cur, set: (v) => pick(v, false) };
  }

  /** تاریخ و ساعت ↔ timestamp ثانیه */
  function when({ value = 0, onInput } = {}) {
    const pad = (n) => String(n).padStart(2, '0');
    const toLocal = (ts) => {
      if (!ts) return '';
      const d = new Date(ts * 1000);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const el = h('input', { class: 'phx2-in', type: 'datetime-local', value: toLocal(value), dir: 'ltr' });
    const shamsi = h('span', { class: 'phx2-money__v' });
    const paint = () => {
      const t = el.value ? Date.parse(el.value) : NaN;
      shamsi.textContent = Number.isNaN(t) ? '' : new Date(t).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
    };
    el.addEventListener('input', () => { paint(); onInput && onInput(); });
    paint();
    return {
      el: h('div', { class: 'phx2-money' }, el, shamsi),
      get: () => (el.value ? Math.floor(Date.parse(el.value) / 1000) : 0),
    };
  }

  /* ---------- فهرستِ ردیفی ---------- */

  /**
   * ویرایشگرِ فهرست: افزودن، حذف، جابه‌جایی.
   *
   * ⚠ جای JSON — همان چیزی که پنلِ قبلی را «به‌هم‌ریخته» می‌کرد.
   * هر ردیف یک ‎row(item)‎ است که ‎{ el, get }‎ برمی‌گرداند.
   *
   * ⚠ جابه‌جایی با دکمه، نه کشیدن‌ورها کردن.
   * کشیدن روی لمسی و با کیبورد کار نمی‌کند؛ دو دکمه‌ی «بالا» و
   * «پایین» همه‌جا کار می‌کنند.
   */
  function repeater({ items = [], row, blank, addLabel = 'افزودن', max = 50, min = 0, onChange, emptyText }) {
    const list = h('ol', { class: 'phx2-rep__list' });
    const addBtn = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', type: 'button' }, icon('plus'), addLabel);
    const empty = emptyText ? h('p', { class: 'phx2-rep__empty' }, emptyText) : null;
    const el = h('div', { class: 'phx2-rep' }, list, empty, addBtn);
    let rows = [];

    const sync = () => {
      rows.forEach((r, i) => {
        r.num.textContent = fa(i + 1);
        r.up.disabled = i === 0;
        r.down.disabled = i === rows.length - 1;
        r.del.disabled = rows.length <= min;
      });
      addBtn.disabled = rows.length >= max;
      if (empty) empty.hidden = rows.length > 0;
      onChange && onChange();
    };

    const add = (item, focus) => {
      const ctl = row(item, sync);
      const num = h('span', { class: 'phx2-rep__n num', 'aria-hidden': 'true' });
      const up = h('button', { class: 'phx2-icon-btn', type: 'button', 'aria-label': 'بالاتر' }, icon('up'));
      const down = h('button', { class: 'phx2-icon-btn', type: 'button', 'aria-label': 'پایین‌تر' }, icon('down'));
      const del = h('button', { class: 'phx2-icon-btn is-danger', type: 'button', 'aria-label': 'حذف' }, icon('trash'));
      const li = h('li', { class: 'phx2-rep__row' },
        h('div', { class: 'phx2-rep__side' }, num, up, down, del),
        h('div', { class: 'phx2-rep__body' }, ctl.el),
      );
      const rec = { li, ctl, num, up, down, del };
      up.addEventListener('click', () => move(rec, -1));
      down.addEventListener('click', () => move(rec, 1));
      del.addEventListener('click', () => {
        rows = rows.filter((r) => r !== rec);
        li.remove();
        sync();
      });
      rows.push(rec);
      list.append(li);
      sync();
      if (focus) li.querySelector('input, textarea, select')?.focus();
    };

    const move = (rec, d) => {
      const i = rows.indexOf(rec);
      const j = i + d;
      if (j < 0 || j >= rows.length) return;
      [rows[i], rows[j]] = [rows[j], rows[i]];
      if (d < 0) list.insertBefore(rec.li, rows[j + 1].li);
      else list.insertBefore(rows[j - 1].li, rec.li);
      sync();
      (d < 0 ? rec.up : rec.down).focus();
    };

    items.forEach((it) => add(it, false));
    addBtn.addEventListener('click', () => add(blank(), true));
    sync();

    return {
      el,
      get: () => rows.map((r) => r.ctl.get()),
      rows: () => rows.map((r) => r.ctl),
    };
  }

  /** فهرستِ ساده‌ی یک‌خطی — برای ویژگی‌ها و نکته‌ها */
  function lines({ items = [], placeholder = '', addLabel, max = 30, maxLen = 200, onChange }) {
    return repeater({
      items, max, addLabel, onChange,
      blank: () => '',
      emptyText: 'هنوز چیزی اضافه نشده.',
      row: (v, changed) => {
        const t = text({ value: v, placeholder, max: maxLen, onInput: changed });
        return { el: t.el, get: t.get };
      },
    });
  }

  /* ---------- چیپ ---------- */

  /**
   * برچسب‌ها و پلتفرم‌ها: تایپ کن، Enter بزن.
   * پیشنهادها از فهرستِ موجود — تا «ps5» و «PS5» دو تگ نشوند.
   */
  function chips({ items = [], suggestions = [], placeholder = 'بنویس و Enter بزن', max = 40, onChange }) {
    let vals = [...items];
    const listId = nid('dl');
    const input = h('input', { class: 'phx2-chips__in', type: 'text', placeholder, list: listId, autocomplete: 'off' });
    const dl = h('datalist', { id: listId }, suggestions.map((s) => h('option', { value: s })));
    const box = h('div', { class: 'phx2-chips' });
    const el = h('div', { class: 'phx2-chips__wrap' }, box, dl);

    const paint = () => {
      ui.clear(box);
      for (const v of vals) {
        const x = h('button', { type: 'button', class: 'phx2-chip__x', 'aria-label': 'حذفِ ' + v }, icon('x'));
        x.addEventListener('click', () => { vals = vals.filter((k) => k !== v); paint(); onChange && onChange(); input.focus(); });
        box.append(h('span', { class: 'phx2-chip' }, h('span', null, v), x));
      }
      box.append(input);
    };
    const commit = () => {
      const v = input.value.trim().replace(/[،,]+$/, '');
      if (v && !vals.includes(v) && vals.length < max) { vals.push(v); onChange && onChange(); }
      input.value = '';
      paint();
      input.focus();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',' || e.key === '،') { e.preventDefault(); commit(); }
      if (e.key === 'Backspace' && !input.value && vals.length) { vals.pop(); paint(); onChange && onChange(); input.focus(); }
    });
    input.addEventListener('change', () => { if (suggestions.includes(input.value.trim())) commit(); });
    input.addEventListener('blur', () => { if (input.value.trim()) commit(); });
    paint();
    return { el, get: () => [...vals] };
  }

  /**
   * انتخابِ چندتایی از فهرستی که از سرور جست‌وجو می‌شود — هدف‌های
   * تخفیف (دسته، تگ، محصول).
   */
  function picker({ selected = [], load, placeholder = 'جست‌وجو…', onChange }) {
    let vals = [...selected];
    let timer = 0;
    const input = h('input', { class: 'phx2-in', type: 'search', placeholder, autocomplete: 'off' });
    const results = h('ul', { class: 'phx2-pick__res', role: 'listbox', hidden: true });
    const box = h('div', { class: 'phx2-chips' });
    const el = h('div', { class: 'phx2-pick' }, box, h('div', { class: 'phx2-pick__search' }, input, results));

    const paint = () => {
      ui.clear(box);
      if (!vals.length) box.append(h('span', { class: 'phx2-pick__none' }, 'هنوز چیزی انتخاب نشده.'));
      for (const v of vals) {
        const x = h('button', { type: 'button', class: 'phx2-chip__x', 'aria-label': 'حذفِ ' + v.name }, icon('x'));
        x.addEventListener('click', () => { vals = vals.filter((k) => k.id !== v.id); paint(); onChange && onChange(); });
        box.append(h('span', { class: 'phx2-chip' }, h('span', null, v.name), x));
      }
    };
    const search = async () => {
      const list = await load(input.value.trim());
      ui.clear(results);
      const fresh = list.filter((it) => !vals.some((v) => v.id === it.id)).slice(0, 12);
      results.hidden = !fresh.length;
      for (const it of fresh) {
        const b = h('button', { type: 'button', role: 'option' }, it.name);
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => { vals.push(it); paint(); onChange && onChange(); input.value = ''; results.hidden = true; input.focus(); });
        results.append(h('li', null, b));
      }
    };
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 250); });
    input.addEventListener('focus', search);
    input.addEventListener('blur', () => setTimeout(() => { results.hidden = true; }, 150));
    paint();
    return { el, get: () => vals.map((v) => v.id), getNamed: () => [...vals] };
  }

  /* ---------- تب ---------- */

  /**
   * ⚠ نقش‌های ARIA کامل و کلیدهای جهت‌دار.
   * تب‌ها همه بار می‌شوند و فقط پنهان می‌شوند — نه اینکه با عوض
   * شدنِ تب ساخته شوند. وگرنه چیزی که در تبِ دیگر تایپ شده بود
   * با رفتن به تبِ بعد گم می‌شد.
   */
  function tabs(list, { onChange } = {}) {
    const bar = h('div', { class: 'phx2-tabs', role: 'tablist' });
    const panels = h('div', { class: 'phx2-tabpanels' });
    const recs = list.map((t, i) => {
      const tid = nid('tab');
      const pid = nid('panel');
      const badge = h('span', { class: 'phx2-tab__badge num', hidden: true });
      const btn = h('button', {
        type: 'button', role: 'tab', id: tid, 'aria-controls': pid, 'aria-selected': 'false', tabindex: '-1',
      }, t.icon && icon(t.icon), t.label, badge);
      const panel = h('section', { role: 'tabpanel', id: pid, 'aria-labelledby': tid, hidden: true, class: 'phx2-tabpanel' }, t.el);
      btn.addEventListener('click', () => show(i));
      btn.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const n = (i + d + list.length) % list.length;
        show(n);
        recs[n].btn.focus();
      });
      bar.append(btn);
      panels.append(panel);
      return { btn, panel, badge, id: t.id };
    });
    function show(i) {
      recs.forEach((r, k) => {
        const on = k === i;
        r.btn.setAttribute('aria-selected', String(on));
        r.btn.tabIndex = on ? 0 : -1;
        r.panel.hidden = !on;
      });
      onChange && onChange(recs[i].id);
    }
    show(0);
    return {
      el: h('div', { class: 'phx2-tabset' }, bar, panels),
      show: (id) => { const i = recs.findIndex((r) => r.id === id); if (i >= 0) show(i); },
      badge: (id, n) => {
        const r = recs.find((x) => x.id === id);
        if (!r) return;
        r.badge.hidden = !n;
        r.badge.textContent = n ? fa(n) : '';
      },
    };
  }

  /* ---------- صفحه‌بندی ---------- */

  function pager({ page, pages, onGo }) {
    if (pages <= 1) return null;
    const btn = (label, p, dis, cur) => {
      const b = h('button', {
        type: 'button', class: 'phx2-pager__b' + (cur ? ' is-on' : ''), disabled: dis,
        'aria-current': cur ? 'page' : null,
      }, label);
      if (!dis && !cur) b.addEventListener('click', () => onGo(p));
      return b;
    };
    const nums = [];
    for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) nums.push(btn(fa(p), p, false, p === page));
    return h('nav', { class: 'phx2-pager', 'aria-label': 'صفحه‌ها' },
      btn('قبلی', page - 1, page <= 1, false), nums, btn('بعدی', page + 1, page >= pages, false));
  }

  /* ---------- وضعیتِ خالی ---------- */

  function emptyState({ iconName = 'box', title, text: body, action }) {
    return h('div', { class: 'phx2-emptystate' },
      h('span', { class: 'phx2-emptystate__i' }, icon(iconName)),
      h('h3', null, title),
      body && h('p', null, body),
      action,
    );
  }

  /** سربرگِ هر صفحه: عنوان، توضیح، کنش‌ها */
  function pageHead({ title, sub, actions = [], back }) {
    return h('header', { class: 'phx2-pagehead' },
      h('div', null,
        back && h('a', { class: 'phx2-back', href: back.href }, icon('arrowRight'), back.label),
        h('h1', { class: 'phx2-pagehead__t' }, title),
        sub && h('p', { class: 'phx2-pagehead__s' }, sub),
      ),
      h('div', { class: 'phx2-pagehead__a' }, actions),
    );
  }

  /**
   * شش فیلدِ حاشیه — مشترکِ ویرایشگرِ محصول، صفحه‌ی حاشیه‌ها و
   * حاشیه‌ی دسته‌ها.
   * ⚠ هر فیلد توضیح دارد؛ «عددِ جذاب» بدونِ مثال معنا ندارد.
   */
  function marginFields(m) {
    const percent = money({ value: m.percent, unit: '٪', decimals: 1 });
    const fixed = money({ value: m.fixed || '', allowEmpty: true });
    const minp = money({ value: m.min_profit || '', allowEmpty: true });
    const roundTo = money({ value: m.round_to, unit: 'تومان' });
    const mode = seg({
      value: m.round_mode, label: 'جهتِ رُند',
      options: [{ value: 'up', label: 'بالا' }, { value: 'nearest', label: 'نزدیک‌ترین' }, { value: 'down', label: 'پایین' }],
    });
    const charm = money({ value: m.charm || '', allowEmpty: true });
    const el = h('div', { class: 'phx2-form' },
      field({ label: 'درصدِ سود', hint: 'روی قیمتِ تمام‌شده. منفی فقط برای حراج.' }, percent.el),
      field({ label: 'مبلغِ ثابت', hint: 'بعد از درصد اضافه می‌شود — مثلاً کارمزدِ درگاه.' }, fixed.el),
      field({ label: 'حداقلِ سود', hint: 'برای محصولِ ارزان: اگر درصد کمتر از این شد، همین.' }, minp.el),
      field({ label: 'رُند به', hint: 'قیمت به مضربِ این عدد گرد می‌شود.' }, roundTo.el),
      field({ label: 'جهتِ رُند', hint: '«بالا» یعنی هیچ‌وقت زیرِ محاسبه.' }, mode.el),
      field({ label: 'عددِ جذاب', hint: 'با رُندِ ۱۰٬۰۰۰ و جذابِ ۹٬۰۰۰: ۱٬۲۴۰٬۰۰۰ ← ۱٬۲۳۹٬۰۰۰. خالی یعنی خاموش.' }, charm.el),
    );
    return {
      el,
      get: () => ({
        percent: percent.get() || 0, fixed: fixed.get() || 0, min_profit: minp.get() || 0,
        round_to: roundTo.get() || 1, round_mode: mode.get(), charm: charm.get() || 0,
      }),
    };
  }

  return {
    toLatin, field, text, money, area, select, toggle, seg, when,
    repeater, lines, chips, picker, tabs, pager, emptyState, pageHead, marginFields,
  };
}
