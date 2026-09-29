/* ============================================================
   داشبورد

   ⚠ این صفحه هیچ تصمیمی نمی‌گیرد.

   اینکه چه چیزی هشدار است، امتیازِ سلامت چند است، و خلاصه چه
   بگوید — همه در ‎includes/api/dashboard.php‎ حساب می‌شود و با
   تست پوشش دارد. این‌جا فقط نشان داده می‌شود. اگر پنل خودش
   قضاوت می‌کرد، منطق دو جا بود و روزی با هم نمی‌خواند.
   ============================================================ */

const KIND = { setting: 'تنظیم', rate: 'نرخ', price: 'قیمت', discount: 'تخفیف', queue: 'صف' };

/* نامِ فارسیِ کلیدهای تنظیمات در تاریخچه */
const SETTING = {
  engine_on: 'موتور قیمت', auto_fulfil: 'خرید خودکار', margin: 'حاشیه‌ی پیش‌فرض',
  margin_by_cat: 'حاشیه‌ی دسته‌ها', margin_by_prod: 'حاشیه‌ی محصولات', discounts: 'تخفیف‌ها',
  manual_rate: 'نرخ دستی', manual_until: 'انقضای نرخ دستی', sources: 'منابع نرخ',
  pick: 'روش انتخاب نرخ', min_sources: 'حداقل منبع', floor_percent: 'کف قیمت',
  cart_lock_min: 'قفل سبد', spread_max: 'فاصله‌ی مجاز',
};

const LEVEL = { high: ['بالا', 'bad'], medium: ['متوسط', 'warn'], low: ['کم', 'info'] };

export async function render(ctx) {
  const data = await ctx.api('GET', '/dashboard');
  paint(ctx, data);
}

function paint(ctx, d) {
  const { h, clear } = ctx.ui;
  const v = ctx.view;
  const st = d.state;

  ctx.setRate(st.rate.value, st.rate.stale);

  clear(v);
  /* ⚠ ‎put‎‌وار: کارتِ فروش بی‌ووکامرس ‎null‎ است و ‎append()‎ی مرورگر آن را «null» می‌نویسد */
  v.append(...[
    hero(ctx, d),
    kpis(ctx, d),
    d.sales ? salesCard(ctx, d.sales) : null,
    d.sales ? h('div', { class: 'phx2-grid phx2-grid--2' }, topCard(ctx, d.sales), soldCard(ctx, d.sales)) : null,
    h('div', { class: 'phx2-grid phx2-grid--2' },
      alertsCard(ctx, d),
      suggestionsCard(ctx, d),
    ),
    chartCard(ctx, d),
    recentCard(ctx, d),
  ].filter(Boolean));
}

/* ------------------------------------------------------------
   کنش‌ها — هر کدام پاسخِ تازه‌ی داشبورد را برمی‌گرداند
   ------------------------------------------------------------ */

async function act(ctx, what) {
  const { toast, confirmBox, fa } = ctx.ui;

  try {
    if (what === 'rate-refresh') {
      const d = await ctx.api('POST', '/rate/refresh');
      paint(ctx, d);
      toast('نرخِ تازه: ' + fa(d.state.rate.value) + ' تومان', 'good');
      return;
    }

    if (what === 'engine-on' || what === 'engine-off') {
      const on = what === 'engine-on';
      /* ⚠ روشن کردن تأیید می‌خواهد، خاموش کردن نه.
         روشن کردن قیمتِ واقعیِ محصولاتِ روی سایت را عوض می‌کند.
         خاموش کردن هیچ قیمتی را عوض نمی‌کند — فقط جلوی تغییرِ
         بعدی را می‌گیرد — پس پرسیدنش فقط یک کلیکِ بی‌فایده است. */
      if (on) {
        const ok = await confirmBox({
          title: 'موتورِ قیمت روشن شود؟',
          text: 'قیمتِ محصولاتی که قیمتِ تمام‌شده دارند، با نرخ و حاشیه‌ی فعلی دوباره حساب و روی سایت نوشته می‌شود. محصولاتِ دستی دست نمی‌خورند.',
          ok: 'روشن کن',
        });
        if (!ok) return;
      }
      const d = await ctx.api('POST', '/engine', { on });
      paint(ctx, d);
      toast(on ? 'موتور روشن شد؛ بازنویسیِ قیمت‌ها در صف است.' : 'موتور خاموش شد. قیمت‌ها همان‌طور که هستند می‌مانند.', on ? 'good' : 'info');
    }
  } catch (e) {
    toast(e.message, 'bad');
  }
}

function actionButton(ctx, action, cls = 'phx2-btn phx2-btn--sm') {
  const { h, icon, busyButton } = ctx.ui;
  if (!action) return null;

  if (action.href) {
    return h('a', { class: cls, href: action.href, target: '_blank', rel: 'noopener noreferrer' },
      action.label, icon('external'));
  }
  /* بخشی در پنلِ دیگرِ همین پیشخوان (مثلاً «مشتریان») — همین تب */
  if (action.link) {
    return h('a', { class: cls, href: action.link }, icon('arrow'), action.label);
  }
  const btn = h('button', { class: cls, type: 'button' },
    action.do === 'rate-refresh' ? icon('refresh') : action.do ? icon('power') : icon('arrow'),
    action.label);
  btn.addEventListener('click', busyButton(btn, async () => {
    if (action.do) await act(ctx, action.do);
    else if (action.go) ctx.go(action.go);
  }));
  return btn;
}

/* ------------------------------------------------------------
   سر: خلاصه و امتیاز
   ------------------------------------------------------------ */

function hero(ctx, d) {
  const { h, icon, fa, ago } = ctx.ui;
  const st = d.state;
  const score = d.health.score;
  const tone = score >= 85 ? 'good' : score >= 60 ? 'warn' : 'bad';

  return h('section', { class: 'phx2-card phx2-hero', 'aria-labelledby': 'phx2-sum' },
    h('div', null,
      h('span', { class: 'phx2-hero__k' }, icon('spark'), 'وضعیتِ کلی'),
      h('p', { class: 'phx2-hero__t', id: 'phx2-sum' }, d.summary),
      h('div', { class: 'phx2-hero__meta' },
        h('span', null, 'نرخ: ', h('b', { class: 'num' }, st.rate.value ? fa(st.rate.value) + ' تومان' : 'ندارد')),
        st.rate.at && h('span', null, 'به‌روز شده ', ago(st.rate.at)),
        h('span', null, 'موتور: ', st.engine.on ? 'روشن' : 'خاموش'),
      ),
    ),
    h('div', { class: 'phx2-score' },
      ring(ctx, score, tone),
      d.health.parts.length
        ? h('ul', { class: 'phx2-score__list', 'aria-label': 'دلیلِ کسرِ امتیاز' },
          d.health.parts.map((p) => h('li', null,
            h('span', null, p.label),
            /* ⚠ ‎dir="ltr"‎: در متنِ راست‌به‌چپ، الگوریتمِ دوجهته
               منفی را به سمتِ دیگرِ عدد می‌برد و «۱۵−» نشان می‌داد. */
            h('b', { class: 'num', dir: 'ltr' }, '−' + fa(Math.abs(p.delta))),
          )))
        : h('p', { class: 'phx2-score__ok' }, 'هیچ کسری ندارد'),
    ),
  );
}

function ring(ctx, score, tone) {
  const { h, s, fa } = ctx.ui;
  const R = 46;
  const C = 2 * Math.PI * R;
  const bar = s('circle', {
    class: 'phx2-ring__bar', cx: 54, cy: 54, r: R, fill: 'none',
    'stroke-width': 10, 'stroke-linecap': 'round',
    'stroke-dasharray': C.toFixed(2),
    'stroke-dashoffset': C.toFixed(2),
  });
  const el = h('div', {
    class: `phx2-ring is-${tone}`,
    role: 'img',
    'aria-label': `امتیازِ سلامت ${fa(score)} از ۱۰۰`,
  },
  s('svg', { viewBox: '0 0 108 108', 'aria-hidden': 'true' },
    s('circle', { class: 'phx2-ring__track', cx: 54, cy: 54, r: R, fill: 'none', 'stroke-width': 10 }),
    bar,
  ),
  h('span', { class: 'phx2-ring__v', 'aria-hidden': 'true' },
    h('b', { class: 'num' }, fa(score)),
    h('small', null, 'از ۱۰۰'),
  ));
  /* پر شدنِ حلقه بعد از نشستن در صفحه، تا انتقال دیده شود */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.setAttribute('stroke-dashoffset', (C * (1 - score / 100)).toFixed(2));
  }));
  return el;
}

/* ------------------------------------------------------------
   کاشی‌ها
   ------------------------------------------------------------ */

function kpi(ctx, { label, value, unit, tone, pillText, sub, extra }) {
  const { h, pill } = ctx.ui;
  return h('article', { class: `phx2-kpi is-${tone}` },
    h('div', { class: 'phx2-kpi__row' },
      h('span', { class: 'phx2-kpi__k' }, label),
      extra,
    ),
    h('div', { class: 'phx2-kpi__v num' }, value, unit && h('small', null, unit)),
    h('div', { class: 'phx2-kpi__row' },
      pill(pillText, tone),
    ),
    sub && h('p', { class: 'phx2-kpi__s' }, sub),
  );
}

function kpis(ctx, d) {
  const { h, fa, ago, busyButton } = ctx.ui;
  const st = d.state;

  const rateTone = !st.rate.value ? 'bad' : st.rate.stale ? 'warn' : 'good';
  const srcTone = st.sources.total === 0 ? 'neutral'
    : st.sources.ok >= st.sources.min ? (st.sources.dead.length ? 'warn' : 'good') : 'bad';
  const q = st.queue;
  const qTone = q.failed > 0 ? 'bad' : q.pending > 0 ? 'warn' : 'good';

  const sw = h('button', {
    class: 'phx2-switch',
    type: 'button',
    role: 'switch',
    'aria-checked': String(!!st.engine.on),
    'aria-label': 'موتورِ قیمت',
  });
  sw.addEventListener('click', busyButton(sw, () => act(ctx, st.engine.on ? 'engine-off' : 'engine-on')));

  return h('section', { class: 'phx2-kpis', 'aria-label': 'شاخص‌ها' },
    kpi(ctx, {
      label: 'نرخِ تتر',
      value: st.rate.value ? fa(st.rate.value) : '—',
      unit: st.rate.value ? 'تومان' : '',
      tone: rateTone,
      pillText: !st.rate.value ? 'ندارد' : st.rate.stale ? 'کهنه' : 'تازه',
      sub: st.rate.value
        ? [st.rate.manual ? 'نرخِ دستی' : (st.rate.source ? 'از ' + st.rate.source : ''), st.rate.at ? ago(st.rate.at) : '']
          .filter(Boolean).join(' · ')
        : 'هنوز هیچ نرخی گرفته نشده',
    }),
    kpi(ctx, {
      label: 'منابعِ سالم',
      value: fa(st.sources.ok),
      unit: 'از ' + fa(st.sources.total),
      tone: srcTone,
      pillText: srcTone === 'good' ? 'همه جواب می‌دهند' : srcTone === 'warn' ? 'بعضی خوابیده‌اند' : srcTone === 'bad' ? 'کمتر از حد' : 'تعریف نشده',
      sub: 'حداقلِ لازم: ' + fa(st.sources.min),
    }),
    kpi(ctx, {
      label: 'محصولاتِ دستِ موتور',
      value: fa(st.products.engine),
      unit: 'از ' + fa(st.products.total),
      tone: st.products.total === 0 ? 'neutral' : st.products.engine > 0 ? 'info' : 'neutral',
      pillText: st.products.missing > 0 ? fa(st.products.missing) + ' دستی' : 'همه خودکار',
      sub: 'بقیه قیمتِ دستی دارند و دست نمی‌خورند',
    }),
    kpi(ctx, {
      label: 'صفِ تحویل',
      value: fa(q.pending),
      unit: 'منتظر',
      tone: qTone,
      pillText: q.failed > 0 ? fa(q.failed) + ' ناموفق' : q.pending > 0 ? 'کار دارد' : 'خالی',
      sub: fa(q.done) + ' انجام‌شده',
    }),
    kpi(ctx, {
      label: 'تخفیفِ فعال',
      value: fa(st.discounts.live),
      unit: 'قاعده',
      tone: st.discounts.live > 0 ? 'brand' : 'neutral',
      pillText: st.discounts.live > 0 ? 'در جریان' : 'هیچ',
      sub: 'قاعده‌هایی که همین حالا روی قیمت‌اند',
    }),
    kpi(ctx, {
      label: 'موتورِ قیمت',
      value: st.engine.on ? 'روشن' : 'خاموش',
      tone: st.engine.on ? 'good' : 'neutral',
      pillText: st.engine.running ? 'در حالِ بازنویسی' : st.engine.on ? 'خودکار' : 'دستی',
      sub: st.engine.running
        ? fa(st.engine.scanned) + ' مورد بررسی شده'
        : st.engine.last_at ? 'آخرین بازنویسی ' + ago(st.engine.last_at) : 'هنوز بازنویسی نشده',
      extra: sw,
    }),
  );
}

/* ------------------------------------------------------------
   فروش

   ⚠ عدد از سرور، قضاوت هم: «امروز» با ساعتِ تهران بریده می‌شود و
   روند در ‎phoenix_sales_summary‎ حساب می‌شود (با تست). این‌جا فقط
   نشان داده می‌شود. جزئیاتِ هر سفارش در پنلِ «مشتریان».
   ------------------------------------------------------------ */

/** سفارش در پنلِ «مشتریان»، وگرنه صفحه‌ی ووکامرس */
function orderLink(ctx, id, fallback) {
  return ctx.worldUrl('customers', 'orders/' + id) || fallback;
}

function delta(ctx, now, before) {
  const { pill, fa } = ctx.ui;
  if (!before) return now ? pill('تازه', 'info') : null;
  const pct = ((now - before) / before) * 100;
  const tone = pct > 0 ? 'good' : pct < 0 ? 'bad' : 'neutral';
  return pill((pct > 0 ? '▲ ' : pct < 0 ? '▼ ' : '') + fa(Math.abs(pct).toFixed(0)) + '٪', tone);
}

function salesCard(ctx, sa) {
  const { h, fa, pill, card, icon } = ctx.ui;
  const tile = (label, value, sub, badge) => h('article', { class: 'phx2-sale' },
    h('div', { class: 'phx2-sale__h' }, h('span', null, label), badge),
    h('b', { class: 'num' }, value, h('small', null, ' تومان')),
    h('span', { class: 'phx2-sale__s' }, sub),
  );
  const wk = sa.week;
  const trend = wk.trend === null ? (wk.revenue ? pill('هفته‌ی اول', 'info') : null)
    : pill((wk.trend > 0 ? '▲ ' : wk.trend < 0 ? '▼ ' : '') + fa(Math.abs(wk.trend).toFixed(0)) + '٪', wk.trend > 0 ? 'good' : wk.trend < 0 ? 'bad' : 'neutral');

  const c = card('فروش', 'سفارش‌های پرداخت‌شده — با ساعتِ خودِ سایت.');
  const all = ctx.worldUrl('customers', 'orders');
  if (all) c.querySelector('.phx2-card__head').append(h('a', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', href: all }, 'همه‌ی سفارش‌ها', icon('arrow')));

  const w = sa.waiting || {};
  c.append(
    h('div', { class: 'phx2-sales' },
      tile('امروز', fa(sa.today.revenue), fa(sa.today.count) + ' سفارش · دیروز ' + fa(sa.yesterday.revenue), delta(ctx, sa.today.revenue, sa.yesterday.revenue)),
      tile('هفت روزِ اخیر', fa(wk.revenue), fa(wk.count) + ' سفارش · در برابرِ هفت روزِ قبل', trend),
      tile('سی روزِ اخیر', fa(sa.month.revenue), fa(sa.month.count) + ' سفارش · ' + fa(sa.month.buyers) + ' خریدار', null),
      tile('میانگینِ هر سفارش', fa(sa.month.avg), 'در سی روزِ اخیر', null),
    ),
    h('div', { class: 'phx2-chart phx2-chart--bars', role: 'img', 'aria-label': `فروشِ روزانه در سی روزِ اخیر؛ جمع ${fa(sa.month.revenue)} تومان` },
      bars(ctx, sa.daily)),
    (w.pending || w.on_hold) ? h('p', { class: 'phx2-sales__wait' },
      icon('clock'),
      h('span', null, fa(w.pending || 0) + ' سفارش در انتظارِ پرداخت'),
      w.on_hold ? h('a', { href: ctx.worldUrl('customers', 'orders/on-hold') || '#' }, fa(w.on_hold) + ' پرداخت منتظرِ تأییدِ توست') : null,
    ) : null,
  );
  return c;
}

/** ستون‌های فروشِ روزانه — چپ‌به‌راست مثلِ نمودارِ نرخ؛ امروز پررنگ */
function bars(ctx, days) {
  const { s, fa, shortDate } = ctx.ui;
  const W = 760; const H = 170;
  const P = { t: 14, r: 64, b: 26, l: 8 };
  /* سقفِ «گرد» — «۵۵ میلیون» خواناست، «۵۰٬۹۹۹٬۰۰۰» نه */
  const top0 = Math.max(1, ...days.map((d) => d.revenue));
  const mag = 10 ** Math.floor(Math.log10(top0));
  const max = (Math.ceil((top0 / mag) * 2) / 2) * mag;
  const short = (n) => (n >= 1e9 ? fa(+(n / 1e9).toFixed(1)) + ' میلیارد'
    : n >= 1e6 ? fa(+(n / 1e6).toFixed(1)) + ' میلیون'
    : n >= 1e3 ? fa(+(n / 1e3).toFixed(1)) + ' هزار' : fa(n));
  const bw = (W - P.l - P.r) / days.length;
  const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
  const last = days.length - 1;
  return s('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' },
    [0, 0.5, 1].map((f) => {
      const gy = P.t + f * (H - P.t - P.b);
      return [
        s('line', { class: 'phx2-chart__grid', x1: P.l, x2: W - P.r, y1: gy, y2: gy }),
        s('text', { class: 'phx2-chart__lbl', x: W - P.r + 8, y: gy + 4 }, short(Math.round(max * (1 - f)))),
      ];
    }),
    days.map((d, i) => {
      const top = y(d.revenue);
      const bar = s('rect', {
        class: 'phx2-bar' + (i === last ? ' is-today' : ''),
        x: (P.l + i * bw + bw * 0.18).toFixed(1), y: top.toFixed(1),
        width: (bw * 0.64).toFixed(1), height: Math.max(d.revenue ? 2 : 0, H - P.b - top).toFixed(1), rx: 3,
      });
      bar.append(s('title', null, `${shortDate(d.date + 'T12:00:00')} — ${fa(d.revenue)} تومان، ${fa(d.count)} سفارش`));
      return bar;
    }),
    s('text', { class: 'phx2-chart__lbl', x: P.l, y: H - 6 }, shortDate(days[0].date + 'T12:00:00')),
    s('text', { class: 'phx2-chart__lbl', x: W - P.r, y: H - 6, 'text-anchor': 'end' }, 'امروز'),
  );
}

function topCard(ctx, sa) {
  const { h, fa, card } = ctx.ui;
  const max = Math.max(1, ...sa.top.map((t) => t.revenue));
  return card('پرفروش‌ها', 'سی روزِ اخیر، به مبلغ.',
    sa.top.length
      ? h('ol', { class: 'phx2-top' }, sa.top.map((t) => h('li', null,
        h('div', { class: 'phx2-top__h' }, h('span', null, t.name), h('b', { class: 'num' }, fa(t.revenue))),
        h('div', { class: 'phx2-top__bar', 'aria-hidden': 'true' }, h('span', { style: { width: Math.max(3, (t.revenue / max) * 100) + '%' } })),
        h('small', { class: 'num' }, fa(t.qty) + ' عدد'),
      )))
      : h('p', { class: 'phx2-empty' }, 'در این سی روز هنوز فروشی نبوده.'));
}

function soldCard(ctx, sa) {
  const { h, fa, digits, ago, card } = ctx.ui;
  return card('آخرین فروش‌ها', 'پرداخت‌شده‌ها، تازه‌ترین بالا.',
    sa.recent.length
      ? h('ul', { class: 'phx2-linklist' }, sa.recent.map((r) => h('li', null,
        h('span', null,
          h('a', { href: orderLink(ctx, r.id, r.edit_url) }, h('b', { class: 'num' }, '#' + digits(r.number))),
          ' ', r.name || digits(r.phone),
          h('small', { class: 'phx2-td-sub' }, r.items)),
        h('span', { class: 'phx2-td-nowrap' }, h('b', { class: 'num' }, fa(r.total)), h('small', { class: 'phx2-td-sub' }, ago(r.paid))),
      )))
      : h('p', { class: 'phx2-empty' }, 'هنوز فروشی ثبت نشده.'));
}

/* ------------------------------------------------------------
   هشدارها و پیشنهادها
   ------------------------------------------------------------ */

function alertsCard(ctx, d) {
  const { h, icon, pill, card } = ctx.ui;

  if (!d.alerts.length) {
    return card('هشدارها', 'فقط وقتی کاری لازم است چیزی این‌جا می‌آید.',
      h('div', { class: 'phx2-allgood' }, icon('checkCircle'), 'چیزی نیست که رسیدگی بخواهد.'));
  }

  return card('هشدارها', 'مهم‌ترین اول.',
    h('div', { class: 'phx2-alerts' },
      d.alerts.map((a) => {
        const [word, tone] = LEVEL[a.level] || LEVEL.low;
        return h('article', { class: `phx2-alert is-${tone}` },
          h('div', { class: 'phx2-alert__h' },
            h('h3', { class: 'phx2-alert__t' }, a.title),
            pill(word, tone),
          ),
          h('p', { class: 'phx2-alert__x' }, a.text),
          actionButton(ctx, a.action),
        );
      }),
    ),
  );
}

function suggestionsCard(ctx, d) {
  const { h, icon, card } = ctx.ui;
  return card('پیشنهادها', 'کارِ بعدی — نبودنشان چیزی را نمی‌شکند.',
    d.suggestions.length
      ? h('ul', { class: 'phx2-sugs' },
        d.suggestions.map((sg) => h('li', { class: 'phx2-sug' },
          icon('bulb'),
          h('span', { class: 'phx2-sug__t' }, sg.text),
          actionButton(ctx, sg.action, 'phx2-btn phx2-btn--sm phx2-btn--ghost'),
        )))
      : h('p', { class: 'phx2-empty' }, 'پیشنهادی نداریم. همه‌چیز سرِ جایش است.'),
  );
}

/* ------------------------------------------------------------
   نمودار

   ⚠ بدونِ کتابخانه. یک خطِ زمانی با پیش‌زمینه، خطوطِ راهنما،
   و نقطه‌ی «الان» — صد خط SVG، نه دویست کیلوبایت Chart.js.

   ⚠ نمودار چپ‌به‌راست است حتی در صفحه‌ی راست‌به‌چپ. زمان در
   نمودارهای مالی — از جمله صرافی‌های ایرانی — چپ‌به‌راست جلو
   می‌رود و وارونه کردنش خواننده را گیج می‌کند.
   ------------------------------------------------------------ */

function chartCard(ctx, d) {
  const { h, card, fa, busyButton, icon } = ctx.ui;
  const pts = d.series || [];

  const refresh = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, icon('refresh'), 'همین حالا بگیر');
  refresh.addEventListener('click', busyButton(refresh, () => act(ctx, 'rate-refresh')));

  const c = card('نرخ در هفت روزِ گذشته', 'نرخِ انتخاب‌شده در هر به‌روزرسانی.');
  c.querySelector('.phx2-card__head').append(refresh);

  if (pts.length < 2) {
    c.append(h('p', { class: 'phx2-empty' }, 'هنوز داده‌ی کافی برای نمودار نیست — بعد از چند به‌روزرسانی پر می‌شود.'));
    return c;
  }

  const vals = pts.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const first = vals[0];
  const last = vals[vals.length - 1];
  const change = first ? ((last - first) / first) * 100 : 0;

  c.append(
    h('div', { class: 'phx2-chart', role: 'img', 'aria-label': `نرخ از ${fa(min)} تا ${fa(max)} تومان؛ الان ${fa(last)}` },
      lineChart(ctx, pts, min, max)),
    h('div', { class: 'phx2-stats' },
      h('span', null, 'کمترین ', h('b', { class: 'num' }, fa(min))),
      h('span', null, 'بیشترین ', h('b', { class: 'num' }, fa(max))),
      h('span', null, 'تغییرِ هفته ', h('b', { class: 'num', dir: 'ltr' },
        (change >= 0 ? '+' : '−') + fa(Math.abs(change).toFixed(1)) + '٪')),
      h('span', null, fa(pts.length) + ' نقطه'),
    ),
  );
  return c;
}

function lineChart(ctx, pts, min, max) {
  const { s, fa, shortDate } = ctx.ui;
  const W = 760; const H = 200;
  const P = { t: 18, r: 64, b: 28, l: 8 };
  const span = (max - min) || 1;
  const lo = min - span * 0.08;
  const hi = max + span * 0.08;

  const x = (i) => P.l + (i / (pts.length - 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);

  let line = '';
  pts.forEach((p, i) => { line += (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1) + ' '; });
  const area = line + `L${x(pts.length - 1).toFixed(1)} ${H - P.b} L${x(0).toFixed(1)} ${H - P.b} Z`;

  /* ⚠ شناسه‌ی گرادیانِ یکتا — اگر دو نمودار در صفحه باشند،
     شناسه‌ی تکراری یعنی دومی رنگِ اولی را می‌گیرد. */
  const gid = 'phx2g' + Math.random().toString(36).slice(2, 8);
  const lastI = pts.length - 1;

  const grid = [0, 0.5, 1].map((f) => {
    const gy = P.t + f * (H - P.t - P.b);
    const val = hi - f * (hi - lo);
    return [
      s('line', { class: 'phx2-chart__grid', x1: P.l, x2: W - P.r, y1: gy, y2: gy }),
      s('text', { class: 'phx2-chart__lbl', x: W - P.r + 8, y: gy + 4 }, fa(Math.round(val))),
    ];
  });

  /* ⚠ بدونِ ‎preserveAspectRatio="none"‎ — آن یکی نمودار را با
     عرضِ صفحه کش می‌داد و متنِ برچسب‌ها پهن و بدشکل می‌شد. */
  return s('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' },
    s('defs', null,
      s('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
        s('stop', { offset: '0%', 'stop-color': 'var(--brand)', 'stop-opacity': 0.26 }),
        s('stop', { offset: '100%', 'stop-color': 'var(--brand)', 'stop-opacity': 0 }),
      ),
    ),
    grid,
    s('path', { d: area, fill: `url(#${gid})` }),
    s('path', { class: 'phx2-chart__line', d: line }),
    s('circle', { class: 'phx2-chart__dot', cx: x(lastI), cy: y(pts[lastI].v), r: 4.5 }),
    s('text', { class: 'phx2-chart__lbl', x: P.l, y: H - 8 }, shortDate(pts[0].t)),
    s('text', { class: 'phx2-chart__lbl', x: W - P.r, y: H - 8, 'text-anchor': 'end' }, shortDate(pts[lastI].t)),
  );
}

/* ------------------------------------------------------------
   آخرین اتفاق‌ها
   ------------------------------------------------------------ */

const toFa = (t) => String(t).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

function prettyValue(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (v === 'true') return 'روشن';
  if (v === 'false') return 'خاموش';
  if (v === 'pending') return 'منتظر';
  if (v === 'done') return 'انجام‌شده';
  if (v === 'failed') return 'ناموفق';
  if (v === 'cancelled') return 'لغوشده';
  if (/^\d+$/.test(v)) return Number(v).toLocaleString('fa-IR');
  /* «۱۵٪» و «۱۲۰۰۰/۱۰۰۰۰» — فقط عدد و علامت، پس رقمش فارسی می‌شود */
  if (/^[\d.,/٪ ]+$/.test(v)) return toFa(v);
  return v.length > 32 ? v.slice(0, 32) + '…' : v;
}

/**
 * نامِ خوانای «مورد».
 *
 * ⚠ نامِ داخلیِ کد جلوی ادمین نمی‌آید.
 * تاریخچه «refresh» و «coupon:PHX-VIP» و «job:31» ذخیره می‌کند
 * چون برای جست‌وجو و شمارش لازم است؛ نمایشش باید فارسی باشد.
 */
/* ⚠ متنِ لاتین داخلِ جمله‌ی فارسی ایزوله می‌شود (FSI…PDI).
   بدونش «PHX-VIP» سرِ خط‌تیره می‌شکست و تکه‌هایش جابه‌جا
   نمایش داده می‌شدند. */
const iso = (t) => '⁨' + t + '⁩';

function prettySubject(kind, subject) {
  const sj = String(subject || '');
  if (kind === 'setting') return SETTING[sj] || sj;
  if (kind === 'price') return 'محصولِ ' + toFa(sj);
  if (kind === 'rate') return sj === 'refresh' ? 'به‌روزرسانیِ نرخ' : sj;
  if (sj.startsWith('coupon:')) return 'کدِ ' + iso(sj.slice(7));
  if (sj.startsWith('job:')) return 'کارِ ' + toFa(sj.slice(4));
  if (sj.startsWith('order:')) return 'سفارشِ ' + toFa(sj.slice(6));
  return /[A-Za-z]/.test(sj) ? iso(sj) : sj;
}

function recentCard(ctx, d) {
  const { h, card, ago, icon } = ctx.ui;
  const rows = d.recent || [];

  const c = card('آخرین اتفاق‌ها', 'هر تغییر، با زمان و نامِ کسی که انجامش داد.');
  const all = h('a', { class: 'phx2-btn phx2-btn--sm phx2-btn--ghost', href: '#/log' },
    'تاریخچه‌ی کامل', icon('arrow'));
  c.querySelector('.phx2-card__head').append(all);

  if (!rows.length) {
    c.append(h('p', { class: 'phx2-empty' }, 'هنوز چیزی ثبت نشده.'));
    return c;
  }

  c.append(h('div', { class: 'phx2-tablewrap' },
    h('table', { class: 'phx2-table' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'کِی'),
        h('th', { scope: 'col' }, 'چه'),
        h('th', { scope: 'col' }, 'مورد'),
        h('th', { scope: 'col' }, 'تغییر'),
        h('th', { scope: 'col' }, 'چه کسی'),
        h('th', { scope: 'col' }, 'توضیح'),
      )),
      h('tbody', null, rows.map((r) => h('tr', null,
        h('td', { title: r.at, class: 'phx2-td-nowrap' }, ago(r.at)),
        h('td', { class: 'phx2-td-strong' }, KIND[r.kind] || r.kind),
        h('td', { class: 'phx2-td-nowrap' }, prettySubject(r.kind, r.subject)),
        h('td', null, h('span', { class: 'phx2-change num' },
          h('s', null, prettyValue(r.before)),
          icon('arrow'),
          h('span', null, prettyValue(r.after)),
        )),
        h('td', null, r.actor === 'system' ? 'سیستم' : r.actor),
        h('td', null, r.note || '—'),
      ))),
    ),
  ));
  return c;
}
