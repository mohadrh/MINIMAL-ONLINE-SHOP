/* ============================================================
   محصولات — فهرست و ویرایشگر.

     ‎#/products‎        فهرست
     ‎#/products/42‎     ویرایشِ محصولِ ۴۲

   ⚠ ساختارِ این فروشگاه، نه ساختارِ ووکامرس.
   «پلن» به‌جای واریاسیون، «قیمت از کجا بیاید» به‌جای فیلدِ
   قیمت، «از مشتری چه بگیریم» به‌جای آدرسِ پستی. ترجمه به
   ووکامرس فقط در سرور است (includes/api/products.php).

   ⚠ هیچ JSONی جلوی ادمین نیست. هر فهرست — پلن‌ها، ویژگی‌ها،
   پرسش‌ها، ورودی‌های لازم — ویرایشگرِ ردیفی است.
   ============================================================ */

export async function render(ctx) {
  if (ctx.param) return editor(ctx, ctx.param);
  return list(ctx);
}

const STATUS = { publish: ['منتشرشده', 'good'], draft: ['پیش‌نویس', 'neutral'], private: ['خصوصی', 'info'], pending: ['در انتظار', 'warn'] };
const MODE = {
  manual: ['دستی', 'neutral'], usd: ['دلاری × نرخ', 'brand'], toman: ['هزینه‌ی تومانی', 'info'],
  sources: ['چند منبع', 'good'], mixed: ['ترکیبی', 'warn'], locked: ['قفل', 'warn'],
};
const FULFIL = [
  { value: 'upgrade_on_user', label: 'ارتقای اکانتِ خودِ مشتری', hint: 'اشتراک روی ایمیل یا حسابی که مشتری می‌دهد فعال می‌شود.' },
  { value: 'stock_code',      label: 'کد از انبار',               hint: 'یک کدِ آماده از انبارِ کدها خودکار تحویل می‌شود.' },
  { value: 'stock_account',   label: 'یوزر و پسورد از انبار',     hint: 'مشخصاتِ یک حسابِ آماده از انبار خودکار تحویل می‌شود.' },
  { value: 'api_topup',       label: 'شارژِ خودکار',               hint: 'از طریقِ API تأمین‌کننده شارژ می‌شود (صفِ تحویل).' },
  { value: 'manual',          label: 'دستی',                        hint: 'سفارش به صفِ تحویل می‌رود و اپراتور انجامش می‌دهد.' },
];
const INPUT_TYPES = [
  { value: 'email', label: 'ایمیل' }, { value: 'username', label: 'نامِ کاربری' },
  { value: 'tel', label: 'شماره تلفن' }, { value: 'url', label: 'نشانی' }, { value: 'text', label: 'متن' },
];
const BADGES = [
  { value: 'hot', label: 'داغ' }, { value: 'new', label: 'تازه' },
  { value: 'bestseller', label: 'پرفروش' }, { value: 'limited', label: 'محدود' },
];
const PLATFORMS = ['Web', 'iOS', 'Android', 'Windows', 'macOS', 'Linux', 'PC', 'Steam'];

/* ============================================================
   فهرست
   ============================================================ */

async function list(ctx) {
  const { h, icon, fa, ago, pill, clear, put, toast, busyButton } = ctx.ui;
  const { kit } = ctx;
  const v = ctx.view;

  const state = { search: '', category: 0, mode: '', status: '', page: 1 };
  const terms = await ctx.api('GET', '/terms').catch(() => ({ categories: [], tags: [] }));

  const newTitle = kit.text({ placeholder: 'عنوانِ محصولِ تازه' });
  const createBtn = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('plus'), 'ساختن');
  const newForm = h('div', { class: 'phx2-newform', hidden: true }, newTitle.el, createBtn);
  const newBtn = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('plus'), 'محصولِ تازه');
  newBtn.addEventListener('click', () => { newForm.hidden = !newForm.hidden; if (!newForm.hidden) newTitle.el.focus(); });

  const create = busyButton(createBtn, async () => {
    const title = newTitle.get();
    if (!title) { toast('عنوان را بنویس.', 'bad'); newTitle.el.focus(); return; }
    try {
      const p = await ctx.api('POST', '/products', { title });
      toast('ساخته شد — به‌صورتِ پیش‌نویس، تا وقتی کامل شود روی سایت دیده نمی‌شود.', 'good');
      ctx.go('products/' + p.id);
    } catch (e) { toast(e.message, 'bad'); }
  });
  createBtn.addEventListener('click', create);
  newTitle.el.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });

  /* ---------- فیلترها ---------- */
  const search = kit.text({ placeholder: 'جست‌وجوی عنوان…', type: 'search' });
  const cat = kit.select({
    value: 0,
    options: [{ value: 0, label: 'همه‌ی دسته‌ها' }, ...terms.categories.map((c) => ({ value: c.id, label: c.name }))],
  });
  const mode = kit.seg({
    value: '', label: 'منبعِ قیمت',
    options: [{ value: '', label: 'همه' }, { value: 'engine', label: 'خودکار' }, { value: 'manual', label: 'دستی' }, { value: 'locked', label: 'قفل' }],
  });
  const status = kit.select({
    value: '',
    options: [{ value: '', label: 'همه‌ی وضعیت‌ها' }, { value: 'publish', label: 'منتشرشده' }, { value: 'draft', label: 'پیش‌نویس' }, { value: 'private', label: 'خصوصی' }],
  });

  const body = h('div', { class: 'phx2-card phx2-card--flush' });

  let timer = 0;
  const reload = async () => {
    body.setAttribute('aria-busy', 'true');
    const q = new URLSearchParams({
      search: state.search, category: String(state.category), mode: state.mode, status: state.status, page: String(state.page),
    });
    try {
      const d = await ctx.api('GET', '/products?' + q.toString());
      if (!ctx.alive()) return;
      paintRows(d);
    } catch (e) {
      put(body, h('p', { class: 'phx2-empty' }, e.message));
    } finally {
      body.removeAttribute('aria-busy');
    }
  };

  search.el.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.search = search.get(); state.page = 1; reload(); }, 300); });
  cat.el.addEventListener('change', () => { state.category = Number(cat.get()); state.page = 1; reload(); });
  mode.el.addEventListener('click', () => { if (mode.get() !== state.mode) { state.mode = mode.get(); state.page = 1; reload(); } });
  status.el.addEventListener('change', () => { state.status = status.get(); state.page = 1; reload(); });

  function paintRows(d) {
    clear(body);
    if (!d.rows.length) {
      body.append(kit.emptyState({
        iconName: 'box',
        title: state.search || state.category || state.mode || state.status ? 'چیزی با این فیلترها پیدا نشد' : 'هنوز محصولی نیست',
        text: state.search || state.category || state.mode || state.status
          ? 'فیلترها را کم کن، یا جست‌وجو را عوض کن.'
          : 'محصولات را می‌شود یک‌جا از سایت وارد کرد (npm run push) یا همین‌جا تک‌تک ساخت.',
      }));
      return;
    }
    const table = h('table', { class: 'phx2-table phx2-table--rows' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'محصول'),
        h('th', { scope: 'col' }, 'دسته'),
        h('th', { scope: 'col' }, 'پلن'),
        h('th', { scope: 'col' }, 'قیمت'),
        h('th', { scope: 'col' }, 'منبعِ قیمت'),
        h('th', { scope: 'col' }, 'وضعیت'),
        h('th', { scope: 'col' }, 'آخرین تغییر'),
      )),
      h('tbody', null, d.rows.map((r) => {
        const [sw, st] = STATUS[r.status] || [r.status, 'neutral'];
        const [mw, mt] = r.locked ? MODE.locked : (MODE[r.mode] || MODE.manual);
        const tr = h('tr', { class: 'is-link' },
          h('td', null, h('a', { class: 'phx2-prod', href: '#/products/' + r.id },
            h('span', { class: 'phx2-prod__img', style: r.accent ? { '--acc': r.accent } : null },
              r.thumb ? h('img', { src: r.thumb, alt: '', loading: 'lazy' }) : icon('image')),
            h('span', null,
              h('b', null, r.title),
              r.english_title && h('small', { dir: 'ltr' }, r.english_title),
            ),
          )),
          h('td', null, r.category ? r.category.name : '—'),
          h('td', { class: 'num' }, fa(r.plans)),
          h('td', { class: 'num phx2-td-nowrap' },
            r.price ? fa(r.price) : '—',
            r.engine_final && r.engine_final !== r.price
              && h('small', { class: 'phx2-td-sub', title: 'قیمتی که موتور با تنظیماتِ فعلی می‌نویسد' }, 'موتور: ' + fa(r.engine_final)),
          ),
          h('td', null, pill(mw, mt)),
          h('td', null, pill(sw, st), !r.in_stock && h('span', { class: 'phx2-td-sub' }, pill('ناموجود', 'bad'))),
          h('td', { class: 'phx2-td-nowrap' }, ago(r.updated)),
        );
        tr.addEventListener('click', (e) => { if (!e.target.closest('a')) ctx.go('products/' + r.id); });
        return tr;
      })),
    );
    /* ⚠ ‎put‎‌وار: ‎pager‎ برای یک صفحه ‎null‎ است و ‎append()‎ی مرورگر آن را «null» می‌نویسد */
    body.append(...[
      h('div', { class: 'phx2-listmeta' },
        h('span', null, fa(d.total) + ' محصول'),
        !d.engine_on && h('span', null, pill('موتورِ قیمت خاموش است — ستونِ «موتور» فقط پیش‌نمایش است', 'neutral')),
      ),
      h('div', { class: 'phx2-tablewrap' }, table),
      kit.pager({ page: d.page, pages: d.pages, onGo: (p) => { state.page = p; reload(); } }),
    ].filter(Boolean));
    /* ⚠ سربرگ این‌جا به‌روز نمی‌شود: این پاسخ نمی‌داند نرخ کهنه
       است یا نه، و «تازه» نوشتنِ نرخِ کهنه هشدارِ سربرگ را پاک
       می‌کرد. سربرگ را ‎/rate‎ پر می‌کند (app.js). */
  }

  put(v, 
    kit.pageHead({ title: 'محصولات', sub: 'همه‌ی محصولات با ساختارِ این فروشگاه: پلن، قیمتِ تمام‌شده، روشِ تحویل.', actions: [newBtn] }),
    newForm,
    h('div', { class: 'phx2-filters' },
      h('span', { class: 'phx2-filters__s' }, icon('search'), search.el),
      cat.el, status.el, mode.el,
    ),
    body,
  );
  await reload();
}

/* ============================================================
   ویرایشگر
   ============================================================ */

async function editor(ctx, id) {
  const { h, clear, put, toast } = ctx.ui;
  const [data, terms] = await Promise.all([
    ctx.api('GET', '/products/' + encodeURIComponent(id)),
    ctx.api('GET', '/terms').catch(() => ({ categories: [], tags: [], site: '' })),
  ]);
  if (!ctx.alive()) return;
  build(ctx, data, terms);
}

function build(ctx, data, terms) {
  const { h, icon, fa, pill, clear, put, toast, confirmBox, busyButton } = ctx.ui;
  const { kit } = ctx;
  const v = ctx.view;
  const site = (terms.site || '').replace(/\/$/, '');
  const mediaUrl = (p) => (!p ? '' : /^https:\/\//.test(p) ? p : site + p);

  /* ⚠ وضعیتِ ویرایشگر بالای همه‌چیز، و تغییر تا پایانِ ساختن نادیده.
     بعضی کنترل‌ها (چیپ، فهرست، کلید) همان لحظه‌ی ساخته شدن
     ‎onChange‎ را صدا می‌زنند. وقتی این متغیرها پایین‌تر بودند،
     ‎schedule‎ به ‎chkTimer‎ی می‌رسید که هنوز تعریف نشده بود و
     ویرایشگر اصلاً باز نمی‌شد — سرورِ آزمایشی همین را گرفت. */
  let ready = false;
  let initial = '';
  let chkTimer = 0;
  let pvTimer = 0;
  let pvSeq = 0;
  const onChange = () => { if (ready) schedule(); };

  /* ============================================================
     تبِ اصلی
     ============================================================ */

  const f = {};
  f.title = kit.text({ value: data.title, max: 200, onInput: (t) => { titleEl.textContent = t || 'بی‌عنوان'; } });
  f.english = kit.text({ value: data.english_title, max: 120, dir: 'ltr' });
  f.brand = kit.text({ value: data.brand, max: 120 });
  f.category = kit.select({
    value: data.category,
    options: [{ value: 0, label: '— بدونِ دسته —' }, ...orderCats(terms.categories).map((c) => ({ value: c.id, label: '  '.repeat(c.depth) + c.name }))],
  });
  f.tags = kit.chips({ items: data.tags, suggestions: terms.tags.map((t) => t.name), onChange });
  f.status = kit.seg({
    value: data.status, label: 'وضعیت', onChange,
    options: [{ value: 'publish', label: 'منتشرشده' }, { value: 'draft', label: 'پیش‌نویس' }, { value: 'private', label: 'خصوصی' }],
  });
  const badgeToggles = BADGES.map((b) => ({ ...b, t: kit.toggle({ checked: data.badges.includes(b.value), label: b.label, onChange }) }));
  f.short = kit.area({ value: data.short_description, rows: 3, max: 600 });
  f.desc = kit.area({ value: data.description, rows: 9, max: 8000 });

  const W = {}; // قابِ فیلدها — برای نشان دادنِ خطا
  const tabMain = h('div', { class: 'phx2-form' },
    W.title = kit.field({ label: 'عنوان', required: true, hint: 'همان چیزی که روی کارت و صفحه‌ی محصول دیده می‌شود.' }, f.title.el),
    kit.field({ label: 'نامِ انگلیسی', hint: 'زیرِ عنوانِ فارسی، کوچک.' }, f.english.el),
    kit.field({ label: 'برند' }, f.brand.el),
    kit.field({ label: 'دسته' }, f.category.el),
    kit.field({ label: 'وضعیت', hint: 'پیش‌نویس روی سایت دیده نمی‌شود.' }, f.status.el),
    kit.field({ label: 'تگ‌ها', wide: true, hint: 'فیلترهای فروشگاه (پرفروش‌ها، تخفیف‌دارها، …) از همین‌ها می‌خوانند.' }, f.tags.el),
    kit.field({ label: 'نشان‌ها', wide: true, hint: 'برچسب‌های روی کارتِ محصول.' },
      h('div', { class: 'phx2-toggles' }, badgeToggles.map((b) => b.t.el))),
    W.short = kit.field({ label: 'توضیحِ کوتاه', wide: true, hint: 'یکی دو جمله؛ زیرِ عنوان در صفحه‌ی محصول.' }, f.short.el),
    W.desc = kit.field({ label: 'توضیحِ کامل', wide: true }, f.desc.el),
  );

  /* ============================================================
     تبِ پلن‌ها
     ============================================================ */

  /* ⚠ ‎pr‎ این‌جا تعریف می‌شود، پیش از پلن‌ها — و این ترتیب حیاتی
     است. فهرستِ پلن‌ها همان لحظه‌ی ساخته شدن ‎refreshPlanNotes‎ را
     صدا می‌زند که ‎pr‎ را می‌خواند. با ‎const‎ی که پایین‌تر بود،
     ویرایشگر اصلاً باز نمی‌شد (ReferenceError). */
  const pr = {};
  const radioName = 'phx2-default-' + data.id;
  const connections = terms.connections || [];

  /* «بگیر» و «قبول کن» برای هر صاحبِ قیمت — کلِ محصول یا یک پلن */
  const fetchFor = (planId) => (cfg) => ctx.api('POST', '/products/' + data.id + '/sources/fetch', { plan_id: planId || 0, sources: cfg });
  const approveFor = (planId) => async () => {
    try {
      const fresh = await ctx.api('POST', '/products/' + data.id + '/sources/approve', { plan_id: planId || 0 });
      toast('قیمتِ تازه تأیید شد.', 'good');
      ctx.setDirty(false);
      build(ctx, fresh, terms);
    } catch (e) { toast(e.message, 'bad'); }
  };

  const plans = kit.repeater({
    items: data.plans,
    min: 1, max: 20,
    addLabel: 'افزودنِ پلن',
    onChange: () => { refreshPlanNotes(); onChange(); },
    blank: () => ({ id: 0, label: '', regular: 0, sale: 0, stock: null, usd: 0, duration_days: 0, guide: null, is_default: false,
      pricing: { mode: 'inherit', cost_usd: 0, cost_toman: 0, locked: false } }),
    row: (p) => planRow(p),
  });

  function planRow(p) {
    const label = kit.text({ value: p.label, max: 80, placeholder: 'مثلاً: Plus — یک ماهه' });
    const regular = kit.money({ value: p.regular || '', allowEmpty: false });
    const sale = kit.money({ value: p.sale || '', allowEmpty: true });
    const def = h('input', { type: 'radio', name: radioName, checked: !!p.is_default });
    const limited = kit.toggle({ checked: p.stock !== null, label: 'موجودیِ محدود', onChange: (on) => { stockBox.hidden = !on; } });
    const stock = kit.money({ value: p.stock ?? '', unit: 'عدد', allowEmpty: true });
    const stockBox = h('div', { hidden: p.stock === null }, stock.el);
    const usd = kit.money({ value: p.usd || '', unit: 'دلار', allowEmpty: true, decimals: 2 });
    const duration = kit.money({ value: p.duration_days || '', unit: 'روز', allowEmpty: true });
    const fit = kit.text({ value: p.guide?.fit || '', max: 200, placeholder: 'مثلاً: برای کسی که هر روز با چت‌جی‌پی‌تی کار می‌کند' });
    const detail = kit.area({ value: p.guide?.detail || '', rows: 3, max: 600, placeholder: 'دقیقاً چه می‌گیرد و چه نمی‌گیرد.' });

    /* قیمت‌گذاریِ جدای همین پلن — فقط وقتی بیش از یک پلن هست.
       همان تکه‌ی صفحه‌ی «منابعِ قیمت» (pricing-kit.js). */
    const pe = ctx.pricing.pricingEditor({
      pricing: p.pricing, plan: true, connections,
      onChange: () => { refreshPlanNotes(); onChange(); },
      onFetch: fetchFor(p.id), onApprove: approveFor(p.id),
    });
    const own = h('details', { class: 'phx2-planprice', open: p.pricing.mode !== 'inherit' },
      h('summary', null, icon('dollar'), 'قیمت‌گذاریِ جدا برای همین پلن'),
      pe.el,
    );
    const note = h('p', { class: 'phx2-plan__note', hidden: true });

    const F = {};
    const el = h('div', { class: 'phx2-plan' },
      h('div', { class: 'phx2-form' },
        F.label = kit.field({ label: 'برچسب', required: true }, label.el),
        kit.field({ label: 'پیش‌فرض' }, h('label', { class: 'phx2-radio' }, def, h('span', null, 'همین پلن اول انتخاب شده باشد'))),
        F.regular = kit.field({ label: 'قیمتِ اصلی' }, regular.el),
        F.sale = kit.field({ label: 'قیمتِ تخفیف‌خورده', hint: 'خالی یعنی بدونِ تخفیف. قیمتِ اصلی خط می‌خورد.' }, sale.el),
        kit.field({ label: 'موجودی' }, h('div', { class: 'phx2-stack' }, limited.el, stockBox)),
        kit.field({ label: 'مبلغِ دلاری (نمایشی)', hint: 'فقط برای نمایش: «در سایتِ خودش چند است». قیمتِ تمام‌شده نیست و موتور از آن استفاده نمی‌کند.' }, usd.el),
        kit.field({ label: 'مدتِ اشتراک', hint: 'خالی یعنی اشتراکی نیست (کد، شارژ). با مدت، مشتری در حسابش تاریخِ پایان را می‌بیند و یادآوریِ تمدید می‌گیرد.' }, duration.el),
        F.guide = kit.field({ label: 'این پلن مالِ کیست', wide: true }, fit.el),
        kit.field({ label: 'دقیقاً چه می‌گیرد', wide: true }, detail.el),
      ),
      note,
      own,
    );

    return {
      el, F, own, note, pe,
      get: () => ({
        id: p.id || 0,
        label: label.get(),
        regular: regular.get() || 0,
        sale: sale.get() || 0,
        stock: limited.get() ? (stock.get() ?? 0) : null,
        usd: usd.get() || 0,
        duration_days: duration.get() || 0,
        guide: fit.get() || detail.get() ? { fit: fit.get(), detail: detail.get() } : null,
        is_default: def.checked,
        pricing: pe.get(),
      }),
    };
  }

  /**
   * ⚠ روی پلنی که موتور قیمتش را می‌نویسد، گفته می‌شود.
   * وگرنه ادمین قیمت را دستی عوض می‌کند، ذخیره می‌زند، و موتور
   * بی‌صدا عددِ دیگری جایش می‌نویسد.
   */
  function refreshPlanNotes() {
    /* ‎pr.pe‎ آخرین چیزی است که ساخته می‌شود؛ تا نباشد، یعنی هنوز
       وسطِ ساختنیم — و ‎plans‎ هم هنوز مقدار ندارد. */
    if (!pr.pe) return;
    const rows = plans.rows();
    const many = rows.length > 1;
    for (const r of rows) {
      r.own.hidden = !many;
      const m = r.pe.mode() === 'inherit' || !many ? pr.pe.mode() : r.pe.mode();
      const locked = pr.pe.locked() || (many && r.pe.mode() !== 'inherit' && r.pe.locked());
      const byEngine = m !== 'manual' && !locked;
      r.note.hidden = !byEngine;
      r.note.textContent = byEngine
        ? 'قیمتِ این پلن را موتور ' + (m === 'sources' ? 'از منابع' : 'از روی قیمتِ تمام‌شده') + ' می‌نویسد'
          + (data.engine_on === false ? ' — وقتی موتور روشن باشد.' : '.') + ' عددی که این‌جا بنویسی جایگزین می‌شود.'
        : '';
    }
  }

  const tabPlans = h('div', null,
    h('p', { class: 'phx2-tabintro' }, 'هر پلن یک گزینه‌ی خرید است. با یک پلن، مشتری انتخابی نمی‌بیند؛ با بیشتر، بینشان انتخاب می‌کند.'),
    plans.el,
  );

  /* ============================================================
     تبِ قیمت‌گذاری
     ============================================================ */

  const m0 = data.pricing.margin;
  pr.own = kit.seg({
    value: m0 ? 'own' : 'inherit', label: 'حاشیه‌ی سود',
    options: [{ value: 'inherit', label: 'مثلِ دسته یا کل' }, { value: 'own', label: 'اختصاصیِ همین محصول' }],
    onChange: () => paintPricing(),
  });
  const mg = kit.marginFields(m0 || { percent: 18, fixed: 0, min_profit: 0, round_to: 1000, round_mode: 'up', charm: 0 });
  const marginBox = h('div', { class: 'phx2-subcard' }, mg.el);
  const engineBox = h('div', { class: 'phx2-section' },
    kit.field({ label: 'حاشیه‌ی سود', wide: true, hint: 'روی هر پلنی که موتور قیمتش را می‌نویسد، به هر روشی.' }, pr.own.el),
    marginBox,
  );
  function paintPricing() {
    marginBox.hidden = pr.own.get() !== 'own';
  }

  /* ⚠ آخرین — ‎refreshPlanNotes‎ با بودنِ همین می‌فهمد ساختن تمام شده */
  pr.pe = ctx.pricing.pricingEditor({
    pricing: data.pricing, plan: false, connections,
    onChange: () => { refreshPlanNotes(); onChange(); },
    onFetch: fetchFor(0), onApprove: approveFor(0),
  });

  const tabPricing = h('div', null,
    h('p', { class: 'phx2-tabintro' }, 'قیمت از کجا بیاید — برای کلِ محصول. هر پلن در تبِ «پلن‌ها» می‌تواند منبعِ خودش را داشته باشد. همین تنظیم‌ها در صفحه‌ی «منابعِ قیمت» هم هست.'),
    pr.pe.el,
    engineBox,
  );

  /* ============================================================
     تبِ رسانه
     ============================================================ */

  const md = {};
  const imgField = (key, label, hint) => {
    const input = kit.text({ value: data.media[key], dir: 'ltr', placeholder: '/products/name.webp', max: 300 });
    const img = h('img', { alt: '' });
    const box = h('div', { class: 'phx2-imgbox' + (key === 'logo' ? ' is-round' : '') }, img);
    const paint = () => {
      const u = mediaUrl(input.get());
      img.hidden = !u;
      if (u) img.src = u; else img.removeAttribute('src');
      box.classList.toggle('is-empty', !u);
      paintCard();
    };
    input.el.addEventListener('input', paint);
    img.addEventListener('error', () => box.classList.add('is-broken'));
    img.addEventListener('load', () => box.classList.remove('is-broken'));

    const pickBtn = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('image'), 'کتابخانه');
    pickBtn.hidden = !(window.wp && window.wp.media);
    pickBtn.addEventListener('click', () => {
      const frame = window.wp.media({ title: label, library: { type: 'image' }, multiple: false, button: { text: 'انتخاب' } });
      frame.on('select', () => {
        const a = frame.state().get('selection').first().toJSON();
        if (a && typeof a.url === 'string' && /^https:\/\//.test(a.url)) { input.set(a.url); paint(); onChange(); }
      });
      frame.open();
    });
    const clearBtn = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', type: 'button' }, icon('x'), 'پاک کردن');
    clearBtn.addEventListener('click', () => { input.set(''); paint(); onChange(); });

    md[key] = input;
    const wrap = W['media.' + key] = kit.field({ label, hint },
      h('div', { class: 'phx2-imgfield' }, box, h('div', { class: 'phx2-stack' }, input.el, h('div', { class: 'phx2-row' }, pickBtn, clearBtn))));
    queueMicrotask(paint);
    return wrap;
  };

  const accentIn = h('input', { type: 'color', class: 'phx2-color', value: data.media.accent || '#c24a24' });
  const accentTxt = kit.text({ value: data.media.accent || '', dir: 'ltr', max: 7, placeholder: '#c24a24' });
  accentIn.addEventListener('input', () => { accentTxt.set(accentIn.value); paintCard(); });
  accentTxt.el.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(accentTxt.get())) accentIn.value = accentTxt.get(); paintCard(); });

  /* پیش‌نمایشِ کارت — همان چیزی که روی سایت دیده می‌شود، تقریبی */
  const cardImg = h('div', { class: 'phx2-mock__img' });
  const cardLogo = h('span', { class: 'phx2-mock__logo' });
  const cardTitle = h('b', null);
  const cardPrice = h('span', { class: 'phx2-mock__price num' });
  const mock = h('div', { class: 'phx2-mock', 'aria-hidden': 'true' }, cardImg, h('div', { class: 'phx2-mock__b' }, cardLogo, cardTitle, cardPrice));
  function paintCard() {
    const acc = /^#[0-9a-f]{6}$/i.test(accentTxt.get()) ? accentTxt.get() : '#c24a24';
    mock.style.setProperty('--acc', acc);
    const thumb = mediaUrl(md.thumbnail?.get() || md.cover?.get() || '');
    cardImg.style.backgroundImage = thumb ? `url("${thumb.replace(/"/g, '')}")` : '';
    const logo = mediaUrl(md.logo?.get() || '');
    clear(cardLogo);
    if (logo) cardLogo.append(h('img', { src: logo, alt: '' }));
    cardTitle.textContent = f.title.get() || 'بی‌عنوان';
    const rows = plans.get();
    const min = Math.min(...rows.map((r) => r.sale || r.regular || Infinity));
    cardPrice.textContent = Number.isFinite(min) ? 'از ' + fa(min) + ' تومان' : '';
  }

  const tabMedia = h('div', { class: 'phx2-split' },
    h('div', { class: 'phx2-form phx2-form--one' },
      imgField('thumbnail', 'تصویرِ کارت', 'تصویرِ اصلی روی کارت و صفحه‌ی محصول.'),
      imgField('logo', 'لوگو', 'نشانِ برند، گرد نمایش داده می‌شود.'),
      imgField('cover', 'کاور', 'تصویرِ پهنِ بالای صفحه‌ی محصول.'),
      imgField('cutout', 'تصویرِ بُریده', 'تصویرِ بی‌زمینه برای بخش‌های ویژه — اختیاری.'),
      W['media.accent'] = kit.field({ label: 'رنگِ شاخص', hint: 'رنگِ هاله و جزئیاتِ کارت.' },
        h('div', { class: 'phx2-row' }, accentIn, accentTxt.el)),
    ),
    h('aside', { class: 'phx2-split__side' }, h('p', { class: 'phx2-field__l' }, 'روی سایت تقریباً این‌طور'), mock),
  );

  /* ============================================================
     تبِ محتوا
     ============================================================ */

  const features = kit.lines({ items: data.content.features, placeholder: 'یک ویژگی در یک خط', addLabel: 'افزودنِ ویژگی', maxLen: 200, onChange });
  const notes = kit.lines({ items: data.content.notes, placeholder: 'یک نکته', addLabel: 'افزودنِ نکته', maxLen: 400, onChange });
  const platforms = kit.chips({ items: data.content.platforms, suggestions: PLATFORMS, onChange });
  const faq = kit.repeater({
    items: data.content.faq, max: 30, addLabel: 'افزودنِ پرسش', onChange,
    emptyText: 'هنوز پرسشی نیست. پرسش‌های پرتکرار خریدار را این‌جا جواب بده.',
    blank: () => ({ q: '', a: '' }),
    row: (it) => {
      const q = kit.text({ value: it.q, max: 200, placeholder: 'پرسش' });
      const a = kit.area({ value: it.a, rows: 3, max: 1200, placeholder: 'پاسخ' });
      return { el: h('div', { class: 'phx2-stack' }, q.el, a.el), get: () => ({ q: q.get(), a: a.get() }) };
    },
  });
  const tabContent = h('div', { class: 'phx2-form' },
    kit.field({ label: 'ویژگی‌ها', wide: true, hint: 'فهرستِ تیک‌خورده در صفحه‌ی محصول.' }, features.el),
    kit.field({ label: 'نکته‌ها', wide: true, hint: 'در بخشِ «شرایط و توضیحات».' }, notes.el),
    W['content.faq'] = kit.field({ label: 'پرسش‌های پرتکرار', wide: true }, faq.el),
    kit.field({ label: 'پلتفرم‌ها', wide: true, hint: 'کجا کار می‌کند.' }, platforms.el),
  );

  /* ============================================================
     تبِ تحویل
     ============================================================ */

  const ful = kit.select({ value: data.delivery.fulfillment, options: FULFIL });
  const fulHint = h('p', { class: 'phx2-field__h' });
  const paintFul = () => { fulHint.textContent = (FULFIL.find((o) => o.value === ful.get()) || {}).hint || ''; };
  ful.el.addEventListener('change', paintFul);
  paintFul();

  const est = kit.text({ value: data.delivery.delivery_estimate, max: 120, placeholder: 'مثلاً: کمتر از دو ساعت' });
  const war = kit.text({ value: data.delivery.warranty_label, max: 120, placeholder: 'مثلاً: گارانتیِ تمامِ دوره' });
  const inputs = kit.repeater({
    items: data.delivery.required_inputs, max: 8, addLabel: 'افزودنِ ورودی', onChange,
    emptyText: 'هیچ ورودی‌ای لازم نیست — بعد از پرداخت مستقیم تحویل می‌شود.',
    blank: () => ({ key: '', label: '', type: 'email', hint: '', example: '' }),
    row: (it) => {
      const label = kit.text({ value: it.label, max: 60, placeholder: 'مثلاً: ایمیلِ اکانت' });
      const key = kit.text({ value: it.key, max: 40, dir: 'ltr', placeholder: 'email' });
      const type = kit.select({ value: it.type, options: INPUT_TYPES });
      /* ⚠ کلید از نوع حدس زده می‌شود، فقط اگر هنوز خالی است */
      type.el.addEventListener('change', () => { if (!key.get()) key.set({ email: 'email', username: 'username', tel: 'phone', url: 'url', text: 'value' }[type.get()]); });
      const hint = kit.text({ value: it.hint, max: 160, placeholder: 'راهنمایی که زیرِ فیلد می‌بیند' });
      const example = kit.text({ value: it.example, max: 80, dir: 'ltr', placeholder: 'you@mail.com' });
      return {
        el: h('div', { class: 'phx2-form' },
          kit.field({ label: 'عنوان' }, label.el),
          kit.field({ label: 'نوع' }, type.el),
          kit.field({ label: 'کلید', hint: 'لاتینِ کوچک؛ نامِ فیلد در سفارش.' }, key.el),
          kit.field({ label: 'نمونه' }, example.el),
          kit.field({ label: 'راهنما', wide: true }, hint.el),
        ),
        get: () => ({ label: label.get(), key: key.get(), type: type.get(), hint: hint.get(), example: example.get() }),
      };
    },
  });
  const tabDelivery = h('div', { class: 'phx2-form' },
    kit.field({ label: 'روشِ تحویل', wide: true }, h('div', { class: 'phx2-stack' }, ful.el, fulHint)),
    kit.field({ label: 'زمانِ تحویل' }, est.el),
    kit.field({ label: 'گارانتی' }, war.el),
    W['delivery.required_inputs'] = kit.field({ label: 'از مشتری چه بگیریم', wide: true, hint: 'این‌ها پیش از پرداخت از مشتری پرسیده می‌شوند و بعد از ثبت قابلِ تغییر نیستند.' }, inputs.el),
  );

  /* ============================================================
     جمع‌آوری
     ============================================================ */

  const collect = () => ({
    title: f.title.get(),
    status: f.status.get(),
    english_title: f.english.get(),
    brand: f.brand.get(),
    category: Number(f.category.get()) || 0,
    tags: f.tags.get(),
    short_description: f.short.get(),
    description: f.desc.get(),
    badges: badgeToggles.filter((b) => b.t.get()).map((b) => b.value),
    media: {
      thumbnail: md.thumbnail.get(), logo: md.logo.get(), cover: md.cover.get(), cutout: md.cutout.get(),
      accent: accentTxt.get().toLowerCase(),
    },
    content: { features: features.get(), notes: notes.get(), platforms: platforms.get(), faq: faq.get() },
    delivery: {
      fulfillment: ful.get(), delivery_estimate: est.get(), warranty_label: war.get(), required_inputs: inputs.get(),
    },
    pricing: {
      ...pr.pe.get(),
      margin: pr.own.get() === 'own' ? mg.get() : null,
    },
    plans: plans.get(),
  });

  /* ============================================================
     پیش‌نمایشِ قیمت
     ============================================================ */

  const previewBody = h('div', { class: 'phx2-pv' });
  const previewCard = h('aside', { class: 'phx2-card phx2-editor__side', 'aria-labelledby': 'phx2-pv-t' },
    h('h2', { class: 'phx2-card__t', id: 'phx2-pv-t' }, 'پیش‌نمایشِ قیمت'),
    h('p', { class: 'phx2-card__s' }, 'با همین فرم، پیش از ذخیره — همان فرمولی که روی سایت می‌نویسد.'),
    previewBody,
  );

  function paintPreview(list, rate) {
    clear(previewBody);
    if (typeof rate === 'number' && rate > 0) {
      previewBody.append(h('p', { class: 'phx2-pv__rate' }, 'نرخِ فعلی: ', h('b', { class: 'num' }, fa(rate)), ' تومان'));
    }
    for (const r of list) {
      if (!r.engine) {
        previewBody.append(h('div', { class: 'phx2-pv__row' },
          h('div', { class: 'phx2-pv__h' }, h('b', null, r.label || 'پلن'), pill(r.via === 'sources' ? 'چند منبع' : 'دستی', 'neutral')),
          h('p', { class: 'phx2-pv__why' }, r.why),
          r.current ? h('div', { class: 'phx2-pv__final num' }, fa(r.current), h('small', null, ' تومان')) : null,
        ));
        continue;
      }
      const diff = r.current ? r.final - r.current : 0;
      previewBody.append(h('div', { class: 'phx2-pv__row' },
        h('div', { class: 'phx2-pv__h' }, h('b', null, r.label || 'پلن'),
          pill(r.via === 'sources' ? 'چند منبع' : r.mode === 'usd' ? 'دلاری' : 'تومانی', 'brand')),
        r.source && r.source.why ? h('p', { class: 'phx2-pv__why' }, r.source.why) : null,
        r.source && r.source.held ? h('p', { class: 'phx2-pv__warn' }, icon('alert'), 'نگه داشته شده — منتظرِ تأیید') : null,
        h('dl', { class: 'phx2-pv__dl' },
          h('dt', null, 'پایه'), h('dd', { class: 'num' }, fa(r.base)),
          h('dt', null, 'سود'), h('dd', { class: 'num' }, '+' + fa(r.profit)),
          r.discount && [h('dt', null, 'تخفیف'), h('dd', null, r.discount)],
        ),
        h('div', { class: 'phx2-pv__final num' },
          r.sale ? [h('s', null, fa(r.regular)), ' '] : null,
          fa(r.final), h('small', null, ' تومان')),
        r.current && diff !== 0 && h('p', { class: 'phx2-pv__diff num ' + (diff > 0 ? 'is-up' : 'is-down') },
          (diff > 0 ? 'گران‌تر از الان: +' : 'ارزان‌تر از الان: −') + fa(Math.abs(diff))),
        r.floor_hit && h('p', { class: 'phx2-pv__warn' }, icon('alert'), 'کفِ قیمت فعال شد.'),
        r.blocked && h('p', { class: 'phx2-pv__warn' }, icon('alert'), r.blocked),
      ));
    }
  }

  /** نتیجه‌ی آخرین «بگیر»ِ هر صاحبِ قیمت — فقط برای پیش‌نمایش */
  function tries() {
    const t = {};
    const p0 = pr.pe.tryPick();
    if (p0) t.product = p0;
    plans.rows().forEach((r, i) => { const x = r.pe.tryPick(); if (x) t['plan:' + i] = x; });
    return t;
  }

  async function preview() {
    const my = ++pvSeq;
    previewBody.setAttribute('aria-busy', 'true');
    try {
      const d = await ctx.api('POST', '/products/' + data.id + '/preview', { ...collect(), _try: tries() });
      if (my === pvSeq && ctx.alive()) paintPreview(d.preview, d.rate);
    } catch { /* پیش‌نمایش حیاتی نیست؛ خطایش صفحه را نمی‌شکند */ }
    finally { if (my === pvSeq) previewBody.removeAttribute('aria-busy'); }
  }

  /* ============================================================
     وضعیت: تغییر، ذخیره، خطا
     ============================================================ */

  const saveBtn = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button', disabled: true }, icon('save'), 'ذخیره');
  const barSave = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('save'), 'ذخیره');
  const barRevert = h('button', { class: 'phx2-btn phx2-btn--ghost', type: 'button' }, 'بازگرداندن');
  const bar = h('div', { class: 'phx2-savebar', hidden: true, role: 'region', 'aria-label': 'ذخیره' },
    h('span', null, icon('info'), 'تغییراتِ ذخیره‌نشده'), h('div', { class: 'phx2-row' }, barRevert, barSave));

  function checkDirty() {
    const d = JSON.stringify(collect()) !== initial;
    saveBtn.disabled = !d;
    bar.hidden = !d;
    ctx.setDirty(d);
  }

  function schedule() {
    if (!ready) return;
    clearTimeout(chkTimer);
    chkTimer = setTimeout(checkDirty, 120);
    clearTimeout(pvTimer);
    pvTimer = setTimeout(preview, 550);
  }

  const tabErr = (key) => (
    /^plans\.\d+\.pricing/.test(key) ? (plans.rows().length === 1 ? 'pricing' : 'plans')
      : key.startsWith('pricing') ? 'pricing'
      : key.startsWith('plans') ? 'plans'
      : key.startsWith('media') ? 'media'
      : key.startsWith('content') ? 'content'
      : key.startsWith('delivery') ? 'delivery'
      : 'main');

  function clearErrors() {
    for (const w of Object.values(W)) w.setError && w.setError('');
    for (const r of plans.rows()) {
      for (const w of Object.values(r.F)) w.setError && w.setError('');
      r.pe.clearErrors();
    }
    pr.pe.clearErrors();
    for (const t of ['main', 'plans', 'pricing', 'media', 'content', 'delivery']) tabs.badge(t, 0);
  }

  function showErrors(errors) {
    clearErrors();
    const count = {};
    const rows = plans.rows();
    for (const [key, msg] of Object.entries(errors)) {
      const t = tabErr(key);
      count[t] = (count[t] || 0) + 1;
      const m = key.match(/^plans\.(\d+)\.(\w+)/);
      if (m && m[2] === 'pricing') {
        /* خطای قیمت‌گذاریِ پلن. محصولِ تک‌پلنی قیمت‌گذاریِ جدا برای
           پلن ندارد؛ خطا مالِ خودِ محصول است، در تبِ قیمت‌گذاری. */
        const one = rows.length === 1;
        const pe = one ? pr.pe : rows[+m[1]] && rows[+m[1]].pe;
        if (!pe) { toast(msg, 'bad'); continue; }
        const rest = key.slice(('plans.' + m[1] + '.pricing.').length);
        if (key.includes('.pricing.sources.')) pe.setErrors({ [rest]: msg });
        else pe.costError(msg);
        if (!one) rows[+m[1]].own.open = true;
        continue;
      }
      if (key.startsWith('pricing.sources.')) {
        pr.pe.setErrors({ [key.slice(8)]: msg });
        continue;
      }
      if (m && rows[+m[1]]) {
        (rows[+m[1]].F[m[2]] || rows[+m[1]].F.label).setError(msg);
        continue;
      }
      const w = W[key] || W[key.replace(/\.\d+$/, '')] || W[key.split('.').slice(0, 2).join('.')];
      if (w) w.setError(msg);
      else toast(msg, 'bad');
    }
    for (const [t, n] of Object.entries(count)) tabs.badge(t, n);
    const first = Object.keys(errors)[0];
    if (!first) return;
    tabs.show(tabErr(first));
    /* و خودِ فیلد جلوی چشم، با فوکوس — نه فقط تبش */
    requestAnimationFrame(() => {
      const bad = form.querySelector('[role=tabpanel]:not([hidden]) .phx2-field.has-error');
      if (!bad) return;
      bad.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      const input = bad.querySelector('input:not([type=hidden]), textarea, select, button');
      if (input) input.focus({ preventScroll: true });
    });
  }

  const doSave = async () => {
    clearErrors();
    try {
      const fresh = await ctx.api('POST', '/products/' + data.id, collect());
      toast('ذخیره شد.', 'good');
      ctx.setDirty(false);
      build(ctx, fresh, terms);
    } catch (e) {
      if (e.fields) {
        showErrors(e.fields);
        toast(`${fa(Object.keys(e.fields).length)} مورد درست نیست — کنارِ هر فیلد نوشته شده.`, 'bad');
      } else {
        toast(e.message, 'bad');
      }
    }
  };
  saveBtn.addEventListener('click', busyButton(saveBtn, doSave));
  barSave.addEventListener('click', busyButton(barSave, doSave));
  barRevert.addEventListener('click', async () => {
    const ok = await confirmBox({ title: 'تغییرات برگردانده شوند؟', text: 'فرم به آخرین حالتِ ذخیره‌شده برمی‌گردد.', ok: 'برگردان' });
    if (ok) { ctx.setDirty(false); build(ctx, data, terms); }
  });

  const trashBtn = h('button', { class: 'phx2-btn phx2-btn--ghost is-danger', type: 'button' }, icon('trash'), 'زباله‌دان');
  trashBtn.addEventListener('click', busyButton(trashBtn, async () => {
    const ok = await confirmBox({
      title: 'به زباله‌دان برود؟',
      text: `«${data.title}» از سایت برداشته می‌شود. تا سی روز از زباله‌دانِ ووکامرس برمی‌گردد.`,
      ok: 'بفرست به زباله‌دان', tone: 'bad',
    });
    if (!ok) return;
    try {
      await ctx.api('DELETE', '/products/' + data.id);
      ctx.setDirty(false);
      toast('به زباله‌دان رفت.', 'info');
      ctx.go('products');
    } catch (e) { toast(e.message, 'bad'); }
  }));

  /* ⚠ ‎Ctrl+S‎ ذخیره می‌کند، نه «ذخیره‌ی صفحه‌ی مرورگر». */
  const onKey = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      if (!document.body.contains(saveBtn)) { document.removeEventListener('keydown', onKey); return; }
      e.preventDefault();
      if (!saveBtn.disabled) saveBtn.click();
    }
  };
  document.addEventListener('keydown', onKey);

  /* ============================================================
     چیدمان
     ============================================================ */

  const tabs = kit.tabs([
    { id: 'main', label: 'اصلی', icon: 'text', el: tabMain },
    { id: 'plans', label: 'پلن‌ها', icon: 'layers', el: tabPlans },
    { id: 'pricing', label: 'قیمت‌گذاری', icon: 'dollar', el: tabPricing },
    { id: 'media', label: 'رسانه', icon: 'image', el: tabMedia },
    { id: 'content', label: 'محتوا', icon: 'box', el: tabContent },
    { id: 'delivery', label: 'تحویل', icon: 'truck', el: tabDelivery },
  ]);

  const titleEl = h('span', null, data.title || 'بی‌عنوان');
  const [sw, st] = STATUS[data.status] || [data.status, 'neutral'];

  const form = h('div', { class: 'phx2-card phx2-editor__main' }, tabs.el);
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b && b.getAttribute('role') !== 'tab') schedule();
  });

  put(ctx.view, 
    kit.pageHead({
      title: titleEl,
      sub: h('span', { class: 'phx2-row' }, pill(sw, st), data.english_title && h('span', { dir: 'ltr' }, data.english_title)),
      back: { href: '#/products', label: 'همه‌ی محصولات' },
      actions: [
        data.status === 'publish' && h('a', { class: 'phx2-btn phx2-btn--ghost', href: data.permalink, target: '_blank', rel: 'noopener noreferrer' }, icon('eye'), 'روی سایت'),
        trashBtn,
        saveBtn,
      ],
    }),
    h('div', { class: 'phx2-editor' }, form, previewCard),
    bar,
  );

  paintPricing();
  refreshPlanNotes();
  paintCard();
  paintPreview(data.preview || [], null);
  initial = JSON.stringify(collect());
  ready = true;
}

/* ============================================================
   کمکی‌ها
   ============================================================ */

/** دسته‌ها به ترتیبِ درختی، با عمق — تا زیرشاخه زیرِ پدرش دیده شود */
function orderCats(cats) {
  const kids = new Map();
  for (const c of cats) {
    if (!kids.has(c.parent)) kids.set(c.parent, []);
    kids.get(c.parent).push(c);
  }
  const out = [];
  const walk = (pid, depth) => {
    for (const c of (kids.get(pid) || []).sort((a, b) => a.name.localeCompare(b.name, 'fa'))) {
      out.push({ ...c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(0, 0);
  /* دسته‌ای که پدرش در فهرست نیست هم گم نشود */
  for (const c of cats) if (!out.some((o) => o.id === c.id)) out.push({ ...c, depth: 0 });
  return out;
}
