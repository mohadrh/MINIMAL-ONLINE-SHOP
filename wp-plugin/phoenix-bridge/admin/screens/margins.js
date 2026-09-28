/* ============================================================
   حاشیه‌ها — سودِ پیش‌فرض، سودِ هر دسته، و محافظ‌ها.

   ⚠ کنارِ هر عدد، اثرش روی محصولاتِ واقعی.
   «۱۸٪» انتزاعی است؛ «چت‌جی‌پی‌تی از ۱٬۷۶۶٬۰۰۰ می‌شود ۱٬۸۹۹٬۰۰۰»
   را می‌شود قضاوت کرد.
   ============================================================ */

export async function render(ctx) {
  const [d, terms] = await Promise.all([
    ctx.api('GET', '/margins'),
    ctx.api('GET', '/terms').catch(() => ({ categories: [] })),
  ]);
  if (ctx.alive()) paint(ctx, d, terms);
}

function paint(ctx, d, terms) {
  const { h, icon, fa, ago, pill, clear, put, toast, busyButton, card, confirmBox } = ctx.ui;
  const { kit } = ctx;

  /* ---------- فرمول ---------- */
  const steps = [
    ['پایه', 'قیمتِ تمام‌شده؛ دلاری ضربدر نرخ، یا تومانی'],
    ['سود', 'بیشترِ درصد و حداقلِ سود'],
    ['مبلغِ ثابت', 'مثلاً کارمزدِ درگاه'],
    ['رُند', 'به مضربِ «رُند به»، در جهتی که انتخاب شده'],
    ['عددِ جذاب', 'اگر تنظیم شده باشد'],
    ['تخفیف', 'بهترین قاعده‌ی فعال'],
    ['کف', 'آخرین حرف — حتی بر تخفیف'],
  ];
  const formula = card('فرمول', 'به همین ترتیب اجرا می‌شود.',
    h('ol', { class: 'phx2-flow' }, steps.map(([t, x]) => h('li', null, h('b', null, t), h('span', null, x)))));

  /* ---------- پیش‌فرضِ کل ---------- */
  const mg = kit.marginFields(d.margin);
  const floor = kit.money({ value: d.floor_percent, unit: '٪' });
  const lock = kit.money({ value: d.cart_lock_min, unit: 'دقیقه' });
  const save = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button', disabled: true }, icon('save'), 'ذخیره');
  const def = card('حاشیه‌ی پیش‌فرض', 'روی هر محصولی که حاشیه‌ی خودش یا دسته‌اش را نداشته باشد.',
    mg.el,
    h('h3', { class: 'phx2-h3' }, 'محافظ‌ها'),
    h('div', { class: 'phx2-form' },
      kit.field({ label: 'کفِ قیمت', hint: 'درصد بالاتر از قیمتِ تمام‌شده. قیمتِ نهایی — حتی بعد از تخفیف — هیچ‌وقت زیرِ این نمی‌رود.' }, floor.el),
      kit.field({ label: 'قفلِ قیمت در سبد', hint: 'قیمتی که مشتری موقعِ افزودن دید، تا این مدت برایش می‌ماند حتی اگر نرخ بالا برود.' }, lock.el),
    ),
    h('div', { class: 'phx2-row phx2-row--end' }, save),
  );
  def.addEventListener('input', () => { save.disabled = false; ctx.setDirty(true); });
  def.addEventListener('click', (e) => { if (e.target.closest('.phx2-segx button')) { save.disabled = false; ctx.setDirty(true); } });
  save.addEventListener('click', busyButton(save, async () => {
    try {
      const fresh = await ctx.api('POST', '/margins', { margin: mg.get(), floor_percent: floor.get(), cart_lock_min: lock.get() });
      ctx.setDirty(false);
      toast(fresh.engine_on ? 'ذخیره شد. بازنویسیِ قیمت‌ها در صف است.' : 'ذخیره شد.', 'good');
      paint(ctx, fresh, terms);
    } catch (e) { toast(e.message, 'bad'); }
  }));

  /* ---------- پیش‌نمایش ---------- */
  const pv = card('اثرش روی محصولات', 'با تنظیماتِ ذخیره‌شده‌ی فعلی — ذخیره کن تا پیش‌نمایش تازه شود.');
  if (!d.preview.length) {
    pv.append(kit.emptyState({
      iconName: 'dollar',
      title: 'هنوز هیچ محصولی قیمتِ تمام‌شده ندارد',
      text: 'در ویرایشگرِ هر محصول، تبِ «قیمت‌گذاری»، منبع را «دلاری» یا «تومانی» بگذار و قیمتِ تمام‌شده را وارد کن.',
      action: h('a', { class: 'phx2-btn', href: '#/products' }, icon('box'), 'محصولات'),
    }));
  } else {
    pv.append(h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table' },
      h('thead', null, h('tr', null,
        h('th', null, 'محصول'), h('th', null, 'پایه'), h('th', null, 'سود'),
        h('th', null, 'تخفیف'), h('th', null, 'نهایی'), h('th', null, 'الان روی سایت'))),
      h('tbody', null, d.preview.map((r) => h('tr', null,
        h('td', null, h('a', { href: '#/products/' + r.id }, r.title)),
        r.calc ? [
          h('td', { class: 'num' }, fa(r.calc.base)),
          h('td', { class: 'num' }, '+' + fa(r.calc.profit)),
          h('td', null, r.calc.discount || (r.calc.blocked ? pill('اعمال نشد', 'bad') : '—')),
          h('td', { class: 'num phx2-td-strong' }, fa(r.calc.final), r.calc.floor_hit && h('span', { class: 'phx2-td-sub' }, pill('کف', 'warn'))),
        ] : h('td', { colspan: 4, class: 'phx2-td-muted' }, 'دستی یا قفل — موتور دست نمی‌زند'),
        h('td', { class: 'num' }, fa(r.current)),
      ))),
    )));
  }

  const reprice = h('button', { class: 'phx2-btn', type: 'button', disabled: !d.engine_on }, icon('refresh'), 'بازنویسیِ همه‌ی قیمت‌ها');
  reprice.addEventListener('click', busyButton(reprice, async () => {
    const ok = await confirmBox({
      title: 'همه‌ی قیمت‌ها بازنویسی شوند؟',
      text: 'قیمتِ همه‌ی محصولاتی که قیمتِ تمام‌شده دارند با تنظیماتِ فعلی دوباره نوشته می‌شود. دسته‌دسته در پس‌زمینه جلو می‌رود.',
      ok: 'بازنویسی کن',
    });
    if (!ok) return;
    try { paint(ctx, await ctx.api('POST', '/reprice'), terms); toast('در صف است.', 'good'); }
    catch (e) { toast(e.message, 'bad'); }
  }));
  pv.querySelector('.phx2-card__head').append(h('div', { class: 'phx2-row' },
    d.reprice.running ? pill('در حالِ بازنویسی — ' + fa(d.reprice.scanned), 'warn')
      : d.reprice.last_at ? h('span', { class: 'phx2-card__s' }, 'آخرین بازنویسی ' + ago(d.reprice.last_at)) : null,
    reprice,
  ));
  if (!d.engine_on) {
    pv.append(h('p', { class: 'phx2-tabfoot' }, icon('info'), 'موتورِ قیمت خاموش است؛ این جدول فقط پیش‌نمایش است و چیزی روی سایت نوشته نمی‌شود.'));
  }

  /* ---------- دسته‌ها ---------- */
  const catCard = card('حاشیه‌ی هر دسته', 'فقط برای دسته‌هایی که باید با پیش‌فرض فرق کنند. محصولِ زیرشاخه، حاشیه‌ی دسته‌ی خودش را می‌گیرد.');
  const catList = h('div', { class: 'phx2-catlist' });
  for (const c of d.by_cat) catList.append(catRow(c));
  if (!d.by_cat.length) catList.append(h('p', { class: 'phx2-empty' }, 'همه‌ی دسته‌ها از پیش‌فرض پیروی می‌کنند.'));

  const unused = terms.categories.filter((t) => !d.by_cat.some((c) => c.term_id === t.id));
  const addSel = kit.select({ value: 0, options: [{ value: 0, label: '— یک دسته انتخاب کن —' }, ...unused.map((t) => ({ value: t.id, label: t.name }))] });
  const addBtn = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('plus'), 'حاشیه‌ی جدا برای این دسته');
  addBtn.addEventListener('click', () => {
    const id = Number(addSel.get());
    if (!id) { toast('اول دسته را انتخاب کن.', 'bad'); return; }
    const t = unused.find((x) => x.id === id);
    catList.querySelector('.phx2-empty')?.remove();
    const row = catRow({ term_id: id, name: t.name, margin: d.margin }, true);
    catList.prepend(row);
    row.querySelector('input')?.focus();
  });
  catCard.append(catList, h('div', { class: 'phx2-row' }, addSel.el, addBtn));

  function catRow(c, fresh) {
    const f = kit.marginFields(c.margin);
    const saveC = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--primary', type: 'button' }, icon('save'), 'ذخیره');
    const del = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost is-danger', type: 'button' }, icon('trash'), 'برداشتن');
    saveC.addEventListener('click', busyButton(saveC, async () => {
      try { paint(ctx, await ctx.api('POST', '/margins/category', { term_id: c.term_id, margin: f.get() }), terms); toast('حاشیه‌ی «' + c.name + '» ذخیره شد.', 'good'); }
      catch (e) { toast(e.message, 'bad'); }
    }));
    del.addEventListener('click', busyButton(del, async () => {
      if (fresh) { el.remove(); return; }
      try { paint(ctx, await ctx.api('POST', '/margins/category', { term_id: c.term_id, margin: null }), terms); toast('«' + c.name + '» دوباره از پیش‌فرض پیروی می‌کند.', 'info'); }
      catch (e) { toast(e.message, 'bad'); }
    }));
    const el = h('details', { class: 'phx2-catrow', open: !!fresh },
      h('summary', null,
        h('b', null, c.name),
        h('span', { class: 'phx2-catrow__s num' }, fa(c.margin.percent) + '٪ سود' + (c.margin.fixed ? ' + ' + fa(c.margin.fixed) : '')),
        fresh && pill('ذخیره نشده', 'warn'),
      ),
      f.el,
      h('div', { class: 'phx2-row phx2-row--end' }, del, saveC),
    );
    return el;
  }

  /* ---------- محصولاتِ دارای حاشیه‌ی اختصاصی ---------- */
  const prodCard = card('محصولاتِ دارای حاشیه‌ی اختصاصی', 'این‌ها در ویرایشگرِ خودِ محصول، تبِ «قیمت‌گذاری» تنظیم می‌شوند.');
  if (!d.by_prod.length) prodCard.append(h('p', { class: 'phx2-empty' }, 'هیچ محصولی حاشیه‌ی اختصاصی ندارد.'));
  else prodCard.append(h('ul', { class: 'phx2-linklist' }, d.by_prod.map((p) => h('li', null,
    p.exists ? h('a', { href: '#/products/' + p.id }, p.title) : h('span', { class: 'phx2-td-muted' }, p.title),
    h('span', { class: 'num' }, fa(p.margin.percent) + '٪'),
  ))));

  put(ctx.view, 
    kit.pageHead({ title: 'حاشیه‌ها', sub: 'سودی که روی قیمتِ تمام‌شده می‌نشیند، و محافظ‌هایی که نمی‌گذارند محصول زیرِ قیمت فروخته شود.' }),
    h('div', { class: 'phx2-grid phx2-grid--2' }, def, formula),
    pv,
    catCard,
    prodCard,
  );
}
