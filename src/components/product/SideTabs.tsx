'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * یک سکشن، با فهرست در کنار.
 *
 * صفحه‌ی محصول شش سکشنِ پشت سر هم داشت — توضیحات، راهنمای پلن،
 * مشخصات، بعد از خرید، مزیت خرید، سوالات — و هر کدام سرتیتر و
 * پس‌زمینه و پادینگِ خودش را. نتیجه صفحه‌ای بود که کاربر باید
 * چند پرده اسکرول می‌کرد تا بفهمد کجا تمام می‌شود، و کارفرما
 * درست گفت که شلوغ است.
 *
 * حالا همه در یک سکشن‌اند: فهرست سمتِ شروع می‌ماند و متن کنارش
 * عوض می‌شود.
 *
 * ⚠ پنل‌ها پنهان نمی‌شوند، روی هم چیده‌اند.
 *
 * وسوسه این بود که مثل تب، هر بار فقط یکی رندر شود. ولی آن‌وقت
 * متنِ پنج بخش از صفحه غایب است: موتور جست‌وجو نمی‌بیندش،
 * Ctrl+F پیدایش نمی‌کند، و لینکِ مستقیم به یک بخش کار نمی‌کند.
 * پس همه هستند و فهرست فقط می‌گوید کجاییم — با اسکرول خودش
 * به‌روز می‌شود، و با کلیک به همان‌جا می‌رود.
 */

export interface TabItem {
  id: string;
  title: string;
  node: React.ReactNode;
}

export function SideTabs({ items }: { items: TabItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '');
  const paneRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    /* ⚠ با IntersectionObserver درست کار نمی‌کرد.

       اولین نسخه با IO نوشته شد و فعال هیچ‌وقت عوض نمی‌شد. دلیلش
       این بود که IO فقط وقتی خبر می‌دهد که چیزی از آستانه رد شود؛
       با نوارِ باریکی که ساخته بودیم، پنلِ بلندتر از آن نوار یک
       بار وارد می‌شد و دیگر رویدادی نمی‌داد — پس هرچه اسکرول
       می‌کردی، همان اولی فعال می‌ماند. روی صفحه‌ی محصول اندازه
       گرفته شد: در ۳۲۰۰ و ۴۶۰۰ پیکسل هر دو یک بخش را فعال
       نشان می‌دادند.

       حساب کردنِ مستقیم این مشکل را ندارد: هر بار موقعیتِ همه‌ی
       پنل‌ها را می‌بینیم و آخرین پنلی که بالای خطِ مرجع شروع شده
       برنده است. rAF جلوی اجرای چندباره در یک فریم را می‌گیرد. */
    let frame = 0;

    const pick = () => {
      frame = 0;
      /* خطِ مرجع یک‌سومِ بالای پنجره — نه خودِ لبه، چون آن‌وقت
         بخش تازه پیش از آنکه واقعاً دیده شود فعال می‌شود. */
      const line = window.innerHeight * 0.33;

      /* ⚠ از خودِ DOM خوانده می‌شود، نه از نقشه‌ی ref.

         نسخه‌ی قبلی ref هر پنل را در یک شیء نگه می‌داشت و همان‌جا
         می‌گشت — و هیچ‌وقت چیزی پیدا نمی‌کرد، پس همیشه اولین بخش
         فعال می‌ماند. اندازه‌گیری روی صفحه نشان داد در ۲۹۰۰ تا
         ۵۴۰۰ پیکسل هر چهار بار یک جواب می‌داد.

         پرس‌وجوی مستقیم این وابستگی را ندارد: هر پنل صفتِ
         data-pane دارد و همیشه در DOM هست. */
      const panes = document.querySelectorAll<HTMLElement>('[data-pane]');
      let current = items[0]?.id ?? '';
      panes.forEach((el) => {
        if (el.getBoundingClientRect().top <= line) {
          current = el.getAttribute('data-pane') ?? current;
        }
      });
      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(pick);
    };

    pick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [items]);

  const go = (id: string) => {
    setActive(id);
    paneRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="section ptabs reveal" id="details">
      <div className="wrap ptabs__grid">
        <nav className="ptabs__index" aria-label="بخش‌های این صفحه">
          <span className="ptabs__index-title">در این صفحه</span>
          <ul>
            {items.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  className={active === it.id ? 'is-on' : ''}
                  aria-current={active === it.id ? 'true' : undefined}
                  onClick={() => go(it.id)}
                >
                  {it.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ptabs__panes">
          {items.map((it) => (
            <article
              key={it.id}
              id={it.id}
              data-pane={it.id}
              className="ptabs__pane"
              ref={(el) => { paneRefs.current[it.id] = el; }}
            >
              <h2 className="ptabs__pane-title">{it.title}</h2>
              {it.node}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
