/* ============================================================
   تخفیف‌ها — قاعده‌های گروهی و کدهای اختصاصی.

   ⚠ «الان فعال؟» از خودِ سرور می‌آید، نه از تیکِ فرم. قاعده‌ای
   که روشن است ولی تاریخش نرسیده «فعال» نیست؛ اگر پنل بگوید
   هست، ادمین دنبالِ باگی می‌گردد که وجود ندارد.

   ⚠ قاعده‌ی جمع‌نشدن جلوی چشم است، نه در راهنما: اگر چند
   قاعده روی یک محصول بیفتند، فقط بهترینشان اعمال می‌شود.
   ============================================================ */

const STATE = { live: ['فعال', 'good'], off: ['خاموش', 'neutral'], upcoming: ['هنوز نرسیده', 'info'], ended: ['تمام شده', 'neutral'] };
const SCOPE = { all: 'همه‌ی محصولات', category: 'دسته‌ها', tag: 'تگ‌ها', product: 'محصولاتِ مشخص' };

export async function render(ctx) {
  const [d, terms] = await Promise.all([
    ctx.api('GET', '/discounts'),
    ctx.api('GET', '/terms').catch(() => ({ categories: [], tags: [] })),
  ]);
  if (ctx.alive()) paint(ctx, d, terms);
}

function paint(ctx, d, terms, editing) {
  const { h, icon, fa, pill, clear, put, toast, busyButton, card, confirmBox } = ctx.ui;
  const { kit } = ctx;

  const newBtn = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('plus'), 'قاعده‌ی تازه');
  newBtn.addEventListener('click', () => openEditor(blank()));

  /* ---------- فهرست ---------- */
  const listCard = card('قاعده‌ها', null);
  listCard.prepend(h('div', { class: 'phx2-callout is-info' }, icon('info'),
    h('span', null, 'اگر چند قاعده روی یک محصول بیفتند، ', h('b', null, 'فقط بهترینشان'),
      ' اعمال می‌شود — نه جمعشان. قاعده‌ای که «روی‌هم» را روشن کند، استثناست. و کفِ قیمت همیشه آخرین حرف را می‌زند.')));

  if (!d.rules.length) {
    listCard.append(kit.emptyState({
      iconName: 'tag', title: 'هنوز قاعده‌ای نیست',
      text: 'مثلاً «۲۰٪ روی کلِ دسته‌ی گیم تا جمعه» — روی کارتِ محصول هم دیده می‌شود.',
      action: newBtn.cloneNode(true),
    }));
    listCard.querySelector('.phx2-emptystate .phx2-btn')?.addEventListener('click', () => openEditor(blank()));
  } else {
    listCard.append(h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table phx2-table--rows' },
      h('thead', null, h('tr', null,
        h('th', null, 'عنوان'), h('th', null, 'دامنه'), h('th', null, 'مقدار'),
        h('th', null, 'بازه'), h('th', null, 'وضعیت'), h('th', null, ''))),
      h('tbody', null, d.rules.map((r) => {
        const [sw, st] = STATE[r.state] || STATE.off;
        const edit = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, 'ویرایش');
        edit.addEventListener('click', () => openEditor(r));
        const del = h('button', { class: 'phx2-icon-btn is-danger', type: 'button', 'aria-label': 'حذفِ ' + r.title }, icon('trash'));
        del.addEventListener('click', busyButton(del, async () => {
          const ok = await confirmBox({ title: 'این قاعده حذف شود؟', text: `«${r.title}» از روی قیمت‌ها برداشته می‌شود.`, ok: 'حذف کن', tone: 'bad' });
          if (!ok) return;
          try { paint(ctx, await ctx.api('DELETE', '/discounts/' + encodeURIComponent(r.id)), terms); toast('حذف شد.', 'info'); }
          catch (e) { toast(e.message, 'bad'); }
        }));
        return h('tr', null,
          h('td', null, h('b', null, r.title), r.stack && h('span', { class: 'phx2-td-sub' }, pill('روی‌هم', 'warn'))),
          h('td', null, SCOPE[r.scope] || r.scope,
            r.targets_named.length ? h('small', { class: 'phx2-td-sub' }, r.targets_named.slice(0, 4).map((t) => t.name).join('، ') + (r.targets_named.length > 4 ? '…' : '')) : null),
          h('td', { class: 'num phx2-td-nowrap' }, r.type === 'percent' ? fa(r.value) + '٪' : fa(r.value) + ' تومان',
            r.cap ? h('small', { class: 'phx2-td-sub' }, 'سقف ' + fa(r.cap)) : null),
          h('td', { class: 'phx2-td-nowrap' }, range(r)),
          h('td', null, pill(sw, st)),
          h('td', { class: 'phx2-td-nowrap' }, edit, ' ', del),
        );
      })),
    )));
  }

  function range(r) {
    const f = (ts) => new Date(ts * 1000).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
    if (!r.starts && !r.ends) return 'همیشه';
    return (r.starts ? f(r.starts) : 'از الان') + ' ← ' + (r.ends ? f(r.ends) : 'بی‌پایان');
  }

  /* ---------- ویرایشگرِ قاعده ---------- */
  const editorSlot = h('div');

  function blank() {
    return { id: '', title: '', enabled: true, scope: 'all', targets: [], targets_named: [], type: 'percent',
      value: 10, cap: 0, starts: 0, ends: 0, priority: 10, stack: false };
  }

  function openEditor(r) {
    const title = kit.text({ value: r.title, max: 120, placeholder: 'مثلاً: جشنواره‌ی گیم' });
    const enabled = kit.toggle({ checked: r.enabled, label: 'فعال' });
    const scope = kit.seg({
      value: r.scope, label: 'دامنه', onChange: () => paintTargets(),
      options: Object.entries(SCOPE).map(([value, label]) => ({ value, label })),
    });
    const catPick = kit.picker({
      selected: r.scope === 'category' ? r.targets_named : [],
      load: async (q) => terms.categories.filter((c) => !q || c.name.includes(q)).map((c) => ({ id: c.id, name: c.name })),
      placeholder: 'نامِ دسته…',
    });
    const tagPick = kit.picker({
      selected: r.scope === 'tag' ? r.targets_named : [],
      load: async (q) => terms.tags.filter((t) => !q || t.name.includes(q)).map((t) => ({ id: t.id, name: t.name })),
      placeholder: 'نامِ تگ…',
    });
    const prodPick = kit.picker({
      selected: r.scope === 'product' ? r.targets_named : [],
      load: async (q) => ctx.api('GET', '/search/products?q=' + encodeURIComponent(q)),
      placeholder: 'نامِ محصول…',
    });
    const catBox = kit.field({ label: 'کدام دسته‌ها', wide: true, hint: 'زیرشاخه‌ها هم حساب می‌شوند.' }, catPick.el);
    const tagBox = kit.field({ label: 'کدام تگ‌ها', wide: true }, tagPick.el);
    const prodBox = kit.field({ label: 'کدام محصولات', wide: true }, prodPick.el);
    function paintTargets() {
      catBox.hidden = scope.get() !== 'category';
      tagBox.hidden = scope.get() !== 'tag';
      prodBox.hidden = scope.get() !== 'product';
    }

    const type = kit.seg({ value: r.type, label: 'نوع', onChange: () => paintType(),
      options: [{ value: 'percent', label: 'درصدی' }, { value: 'amount', label: 'مبلغِ ثابت' }] });
    const value = kit.money({ value: r.value, unit: r.type === 'percent' ? '٪' : 'تومان', decimals: 1 });
    const cap = kit.money({ value: r.cap || '', allowEmpty: true });
    const capBox = kit.field({ label: 'سقفِ تخفیف', hint: '«۲۰٪ ولی حداکثر ۵۰۰ هزار». خالی یعنی بی‌سقف.' }, cap.el);
    function paintType() {
      capBox.hidden = type.get() !== 'percent';
      value.el.querySelector('.phx2-money__u').textContent = type.get() === 'percent' ? '٪' : 'تومان';
    }

    const starts = kit.when({ value: r.starts });
    const ends = kit.when({ value: r.ends });
    const stack = kit.toggle({ checked: r.stack, label: 'با تخفیف‌های دیگر جمع شود' });
    const priority = kit.money({ value: r.priority, unit: '' });

    const titleF = kit.field({ label: 'عنوان', required: true, hint: 'همین متن روی کارتِ محصول دیده می‌شود — برای مشتری بنویسش.' }, title.el);

    const save = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('save'), 'ذخیره‌ی قاعده');
    const cancel = h('button', { class: 'phx2-btn phx2-btn--ghost', type: 'button' }, 'انصراف');
    cancel.addEventListener('click', () => { ctx.setDirty(false); clear(editorSlot); });

    save.addEventListener('click', busyButton(save, async () => {
      titleF.setError('');
      const sc = scope.get();
      const targets = sc === 'category' ? catPick.get() : sc === 'tag' ? tagPick.get() : sc === 'product' ? prodPick.get() : [];
      try {
        const fresh = await ctx.api('POST', '/discounts', { rule: {
          id: r.id, title: title.get(), enabled: enabled.get(), scope: sc, targets,
          type: type.get(), value: value.get(), cap: type.get() === 'percent' ? (cap.get() || 0) : 0,
          starts: starts.get(), ends: ends.get(), priority: priority.get() || 10, stack: stack.get(),
        } });
        ctx.setDirty(false);
        toast('قاعده ذخیره شد. قیمت‌ها در پس‌زمینه به‌روز می‌شوند.', 'good');
        paint(ctx, fresh, terms);
      } catch (e) {
        if (/عنوان/.test(e.message)) titleF.setError(e.message);
        toast(e.message, 'bad');
      }
    }));

    const box = h('section', { class: 'phx2-card phx2-editcard', 'aria-labelledby': 'phx2-dsc-t' },
      h('header', { class: 'phx2-card__head' },
        h('h2', { class: 'phx2-card__t', id: 'phx2-dsc-t' }, r.id ? 'ویرایشِ «' + r.title + '»' : 'قاعده‌ی تازه')),
      h('div', { class: 'phx2-form' },
        titleF,
        kit.field({ label: 'وضعیت' }, enabled.el),
        kit.field({ label: 'روی چه چیزی', wide: true }, scope.el),
        catBox, tagBox, prodBox,
        kit.field({ label: 'نوع' }, type.el),
        kit.field({ label: 'مقدار', hint: 'درصدی حداکثر ۹۰ — قاعده‌ی گروهی نباید محصول را رایگان کند.' }, value.el),
        capBox,
        kit.field({ label: 'از', hint: 'خالی یعنی همین حالا.' }, starts.el),
        kit.field({ label: 'تا', hint: 'خالی یعنی بی‌پایان — که معمولاً منظورت نیست.' }, ends.el),
        kit.field({ label: 'روی‌هم', hint: 'پیش‌فرض خاموش. روشن یعنی روی بهترین تخفیفِ دیگر هم سوار می‌شود.' }, stack.el),
        kit.field({ label: 'اولویت', hint: 'فقط برای قاعده‌های روی‌هم؛ کوچک‌تر زودتر.' }, priority.el),
      ),
      h('div', { class: 'phx2-row phx2-row--end' }, cancel, save),
    );
    box.addEventListener('input', () => ctx.setDirty(true));
    paintTargets();
    paintType();
    put(editorSlot, box);
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    title.el.focus({ preventScroll: true });
  }

  /* ---------- کدِ اختصاصی ---------- */
  const code = kit.text({ max: 40, dir: 'ltr', placeholder: 'PHX-VIP-01' });
  const ctype = kit.seg({ value: 'percent', label: 'نوع', options: [{ value: 'percent', label: 'درصدی' }, { value: 'amount', label: 'مبلغِ ثابت' }] });
  const cvalue = kit.money({ value: '', unit: '', allowEmpty: true, decimals: 1 });
  const cemail = kit.text({ max: 120, dir: 'ltr', type: 'email', placeholder: 'you@mail.com' });
  const cexp = kit.when({ value: 0 });
  const gen = h('button', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', type: 'button' }, 'ساختِ خودکار');
  gen.addEventListener('click', () => {
    /* ⚠ ‎crypto.getRandomValues‎ و نه ‎Math.random‎: کدِ تخفیف
       نباید قابلِ حدس باشد. بدونِ حروفِ گیج‌کننده (O/0، I/1). */
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const buf = new Uint32Array(8);
    crypto.getRandomValues(buf);
    code.set('PHX-' + Array.from(buf, (n) => abc[n % abc.length]).join(''));
  });
  const make = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('plus'), 'ساختِ کد');
  make.addEventListener('click', busyButton(make, async () => {
    if (!code.get() || !cvalue.get()) { toast('کد و مقدار را بنویس.', 'bad'); return; }
    try {
      const fresh = await ctx.api('POST', '/coupons', { code: code.get(), type: ctype.get(), value: cvalue.get(), email: cemail.get(), expires: cexp.get() });
      toast('کد ساخته شد: ' + code.get(), 'good');
      paint(ctx, fresh, terms);
    } catch (e) { toast(e.message, 'bad'); }
  }));

  const coupons = card('کدِ اختصاصی برای یک نفر', 'کوپنِ یک‌بارمصرفِ ووکامرس. سرِ پرداخت وارد می‌شود، نه روی کارتِ محصول.',
    h('div', { class: 'phx2-form' },
      kit.field({ label: 'کد', hint: 'همین را برای مشتری می‌فرستی.' }, h('div', { class: 'phx2-row' }, code.el, gen)),
      kit.field({ label: 'نوع' }, ctype.el),
      kit.field({ label: 'مقدار' }, cvalue.el),
      kit.field({ label: 'قفل روی ایمیل', hint: 'خالی یعنی هرکس زودتر استفاده کند.' }, cemail.el),
      kit.field({ label: 'انقضا' }, cexp.el),
    ),
    h('div', { class: 'phx2-row phx2-row--end' }, make),
    d.coupons.length ? h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table' },
      h('thead', null, h('tr', null, h('th', null, 'کد'), h('th', null, 'مقدار'), h('th', null, 'استفاده'), h('th', null, 'ایمیل'), h('th', null, 'انقضا'))),
      h('tbody', null, d.coupons.map((c) => h('tr', null,
        h('td', null, h('code', { dir: 'ltr' }, c.code)),
        h('td', { class: 'num' }, c.type === 'percent' ? fa(c.value) + '٪' : fa(c.value) + ' تومان'),
        h('td', { class: 'num' }, fa(c.used) + (c.limit ? ' از ' + fa(c.limit) : '')),
        h('td', { dir: 'ltr' }, c.email || '—'),
        h('td', null, c.expires ? new Date(c.expires).toLocaleDateString('fa-IR') : '—'),
      ))),
    )) : null,
  );

  put(ctx.view, 
    kit.pageHead({ title: 'تخفیف‌ها', sub: 'قاعده‌های گروهی روی قیمتِ محصول می‌نشینند و روی کارت دیده می‌شوند.', actions: [newBtn] }),
    editorSlot,
    listCard,
    coupons,
  );
  if (editing) openEditor(editing);
}
