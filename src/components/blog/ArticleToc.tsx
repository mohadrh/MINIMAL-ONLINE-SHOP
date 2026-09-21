'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { TocItem } from '../../data/articleKit';

/**
 * فهرستِ مطالب، با نشان‌دادنِ بخشِ فعلی.
 *
 * ============================================================
 * ⚠ ‎IntersectionObserver‎ این‌جا نقشِ *زنگ* را دارد، نه نقشِ
 *   پاسخ‌دهنده. و این تفاوت، یک باگِ واقعی بود.
 *
 * نسخه‌ی اول مستقیم از ‎isIntersecting‎ جواب می‌گرفت: «کدام
 * تیتر داخلِ نوارِ وسطِ صفحه است؟» با نوارِ باریک، جوابِ این
 * سوال بیشترِ وقت‌ها «هیچ‌کدام» است — تیترها که همیشه وسطِ
 * صفحه نیستند. پس ‎setActive‎ اصلاً صدا زده نمی‌شد و فهرست روی
 * آخرین تیتری که *اتفاقی* از نوار رد شده بود گیر می‌کرد.
 *
 * اندازه‌گیری شد: اسکرول به تیترِ چهارم، تیترِ سوم را روشن
 * نگه می‌داشت؛ و برگشت به تیترِ اول، تیترِ *پنجم* را.
 *
 * سوالِ درست این نیست «کدام تیتر در نوار است»، بلکه «آخرین
 * تیتری که از خطِ مطالعه بالاتر رفته کدام است» — و آن همیشه
 * جواب دارد.
 *
 * پس ناظر فقط می‌گوید «چیزی جابه‌جا شد، دوباره حساب کن»، و
 * حسابِ واقعی در ‎pick()‎ انجام می‌شود. صرفه‌جوییِ اصلی سرِ
 * جایش می‌ماند: ‎pick‎ فقط موقعِ ردشدنِ یک تیتر از خط اجرا
 * می‌شود، نه در هر فریمِ اسکرول.
 * ============================================================
 */
export function ArticleToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>('');

  /**
   * ⚠ قفلِ کوتاه بعد از کلیک.
   *
   * تنها ‎setActive‎ سرِ کلیک کافی نبود: بلافاصله اسکرولِ نرم
   * شروع می‌شود، تیترها از خط رد می‌شوند، ناظر ‎pick‎ را صدا
   * می‌زند و جوابِ موقعیتی روی انتخابِ کاربر می‌نشیند. نتیجه
   * این بود که هر کلیک، بخشِ *قبلی* را روشن می‌کرد.
   *
   * تا وقتی اسکرول در راه است، حرفِ کاربر می‌ماند.
   */
  const lockUntil = useRef(0);

  useEffect(() => {
    if (!items.length) return;

    const nodes = items
      .map((i) => document.getElementById(i.id))
      .filter((n): n is HTMLElement => n !== null);

    if (!nodes.length) return;

    /** آخرین تیتری که از خطِ مطالعه گذشته */
    const pick = () => {
      if (Date.now() < lockUntil.current) return;

      const line = window.innerHeight * 0.3;
      let current = items[0].id;

      for (const i of items) {
        const el = document.getElementById(i.id);
        if (el && el.getBoundingClientRect().top <= line) {
          current = i.id;
        }
      }
      setActive(current);
    };

    /* یک بار سرِ سوارشدن — ناظر تا وقتی چیزی از خط رد نشود
       صدا نمی‌کند، و بدونِ این، مقاله‌ای که وسطش باز شده
       (مثلاً با لینکِ ‎#‎) هیچ بخشِ فعالی نشان نمی‌داد. */
    pick();

    /* ⚠ دو حاشیه نباید روی‌هم ۱۰۰٪ شوند.
       با ‎-30%‎ و ‎-70%‎ ناحیه‌ی دیدِ ناظر ارتفاعِ صفر می‌گیرد و
       ردشدن از یک خطِ بی‌ارتفاع، گاهی اصلاً گزارش نمی‌شود —
       آن‌وقت ‎pick‎ صدا زده نمی‌شود و فهرست روی بخشِ قبلی
       می‌ماند. با ۲۰٪ فاصله، هر ردشدن حتماً دیده می‌شود. */
    const io = new IntersectionObserver(pick, {
      rootMargin: '-25% 0px -55% 0px',
      threshold: 0,
    });
    nodes.forEach((n) => io.observe(n));

    /* تغییرِ اندازه جای خط را عوض می‌کند ولی چیزی از آن رد
       نمی‌شود، پس ناظر خبردار نمی‌شود. */
    window.addEventListener('resize', pick, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener('resize', pick);
    };
  }, [items]);

  if (items.length < 2) return null; // با یک تیتر، فهرست معنا ندارد

  return (
    <nav className="toc" aria-labelledby="toc-h">
      <h2 className="toc__h" id="toc-h">در این مقاله</h2>
      <ol className="toc__list">
        {items.map((it) => (
          <li key={it.id} className={it.sub ? 'is-sub' : ''}>
            {/* ⚠ کلیک خودش بخش را فعال می‌کند و منتظرِ ناظر
                نمی‌ماند.

                نزدیکِ تهِ صفحه، مرورگر نمی‌تواند تیترِ هدف را
                به خطِ مطالعه برساند — فضای کافی زیرش نیست. پس
                «آخرین تیترِ بالای خط» تیترِ *بعدی* می‌ماند و
                کاربر روی «جمع‌بندی» می‌زند ولی بخشِ قبلی روشن
                می‌شود. این مشکلِ هر فهرستِ مطالبی است، نه این
                یکی.

                جوابش ساده است: وقتی کاربر صریحاً جایی را
                انتخاب می‌کند، حرفِ او مقدم بر حدسِ موقعیت است.
                اسکرولِ آزاد باز هم موقعیتی می‌ماند. */}
            <a
              href={`#${it.id}`}
              className={active === it.id ? 'is-on' : ''}
              aria-current={active === it.id ? 'true' : undefined}
              onClick={() => {
                setActive(it.id);
                /* یک ثانیه، تا اسکرولِ نرم برسد */
                lockUntil.current = Date.now() + 1000;
              }}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
