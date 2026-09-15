'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { PRODUCTS } from '../../data/catalog';
import { asset } from '../../lib/asset';
import { isMonoDarkLogo } from '../../lib/logoTone';

/**
 * پلِ میانِ هیرو و دسته‌بندی‌ها — رودِ نشان‌ها.
 *
 * ⚠ این سکشن یک کارِ مشخص دارد، نه اینکه فقط جای خالی را پر کند.
 *
 * هیرو پنج دسته را نشان می‌دهد و سکشنِ بعدی هم دسته‌هاست. بینشان
 * یک سوالِ بی‌جواب می‌ماند که کاربر واقعاً دارد: «آخرش *چه
 * برندهایی* این‌جا هست؟» فهرستِ ثابت جوابش را می‌دهد ولی بیست
 * نشان در یک شبکه، دیواری می‌شود که کسی نگاهش نمی‌کند.
 *
 * حرکت این را حل می‌کند: دو ردیف که آرام و خلافِ هم می‌لغزند، در
 * هر لحظه فقط چند نشان جلوی چشم است و در ده ثانیه همه از جلو رد
 * می‌شوند. نگاه‌کردن هزینه‌ای ندارد چون خودش می‌آید.
 *
 * ⚠ و سه قید که این را از یک «مارکی»ِ تزئینی جدا می‌کند:
 *
 *   ۱ نشان‌ها از خودِ کاتالوگ می‌آیند. محصولِ تازه خودش این‌جا
 *     پیدایش می‌شود و محصولِ حذف‌شده نشانِ مرده جا نمی‌گذارد.
 *
 *   ۲ هر نشان لینکِ همان محصول است. یعنی این نوار مسیرِ خرید هم
 *     هست نه فقط ویترین.
 *
 *   ۳ با هاور می‌ایستد، و با ‎prefers-reduced-motion‎ اصلاً راه
 *     نمی‌افتد. چیزی که مدام تکان می‌خورد و نمی‌شود نگهش داشت،
 *     از اطلاعات به مزاحمت تبدیل می‌شود.
 */

/** یک نشان روی نوار */
type Mark = {
  slug: string;
  title: string;
  img: string;
  /** جلدِ بازی است نه نشانِ برند — قابش پر می‌شود نه جاگذاری */
  cover?: boolean;
  /** دسته‌ی محصول — ردیف‌ها از روی همین تقسیم می‌شوند */
  cat: string;
};

/* ⚠ بازی‌ها هم می‌آیند، با جلدشان.

   اول فقط محصولاتی می‌آمدند که نشانِ برند داشتند و هفده بازی
   بیرون می‌ماندند — یعنی نواری که ادعا می‌کرد «همه‌ی سرویس‌ها»
   را نشان می‌دهد، بزرگ‌ترین دسته را جا می‌انداخت.

   بازی نشانِ برند ندارد و نداشتنش هم درست است: کسی بازی را از
   روی نشانِ ناشر نمی‌شناسد، از روی جلدش می‌شناسد. پس همان
   جلد می‌آید — ولی با ‎cover‎ علامت می‌خورد تا قاب را پر کند
   نه اینکه وسطش جاگذاری شود، چون جلد تصویر است نه نشان. */
function marks(): Mark[] {
  const seen = new Set<string>();
  const out: Mark[] = [];

  for (const p of PRODUCTS) {
    const logo = p.media.logo;
    const img = logo ?? p.media.thumbnail;
    if (!img || seen.has(img)) continue;
    seen.add(img);
    out.push({ slug: p.slug, title: p.title, img, cover: !logo, cat: p.category });
  }
  return out;
}

/** ⚠ تقسیم بر اساسِ دسته است، نه یک‌درمیان.
 *
 *  اول یک‌درمیان بود تا هر دو ردیف از همه‌ی دسته‌ها نشان داشته
 *  باشند. کارفرما گفت ردیفِ بالا اکانت‌ها و هوش مصنوعی باشد و
 *  ردیفِ پایین گیم — و این بهتر است، چون دو ردیف دو جنسِ متفاوت
 *  نشان می‌دهند: بالا نشانِ برند (دایره‌های تمیز)، پایین جلدِ
 *  بازی (تصویرهای پررنگ). یک‌درمیان، این دو جنس را قاطی می‌کرد
 *  و هر ردیف ناهموار دیده می‌شد.
 *
 *  هر دو ردیف باید به‌قدرِ کافی بلند بمانند وگرنه حلقه شکاف
 *  می‌گیرد؛ با ۲۱ و ۱۷ نشان، هر نسخه چند برابرِ عرضِ قاب است. */
function split(all: Mark[]): [Mark[], Mark[]] {
  const games = all.filter((m) => m.cat === 'gaming');
  const rest = all.filter((m) => m.cat !== 'gaming');
  return [rest, games];
}

function Row({ items, dir }: { items: Mark[]; dir: 'fwd' | 'rev' }) {
  /* ⚠ سه نسخه، نه دو — و این فرقِ حلقه‌ی بی‌درز با حلقه‌ی
     شکاف‌دار است.

     نوار به اندازه‌ی *یک نسخه* می‌لغزد و بعد از اول شروع
     می‌کند. چون نسخه‌ها عینِ هم‌اند، لحظه‌ی بازگشت تصویر عوض
     نمی‌شود و پرش دیده نمی‌شود — **به شرطی که عرضِ یک نسخه از
     عرضِ قاب بیشتر باشد**. وگرنه ته نوار به لبه‌ی قاب می‌رسد
     پیش از آنکه نسخه‌ی بعدی برسد، و یک لحظه خالی می‌ماند.

     با دو نسخه همین اتفاق افتاد: ردیفِ دوم ده نشان داشت
     (۱۳۲۰ پیکسل) در قابی که ۱۳۶۰ بود — چهل پیکسل کم آورد و
     کارفرما دید که «تمام می‌شوند». با سه نسخه و بازگشت روی
     یک‌سوم، حتی ردیفِ کوتاه هم دو برابرِ قاب طول دارد. */
  const REPEATS = 3;
  const loop = Array.from({ length: REPEATS }, () => items).flat();

  return (
    <div className={`hbridge__row hbridge__row--${dir}`}>
      <div className="hbridge__track" style={{ ['--n' as string]: items.length }}>
        {loop.map((m, i) => (
          <Link
            key={`${m.img}-${i}`}
            href={`/product/${m.slug}`}
            className="hbridge__mark"
            title={m.title}
            /* نیمه‌ی دومْ کپیِ تصویری است، نه محتوای تازه —
               صفحه‌خوان نباید دوبار بخواندش. */
            aria-hidden={i >= items.length ? 'true' : undefined}
            tabIndex={i >= items.length ? -1 : undefined}
          >
            <span className={`hbridge__mark-ic ${m.cover ? 'is-cover' : ''}`}>
              <img
                src={asset(m.img)}
                alt=""
                loading="lazy"
                /* نشانِ تک‌رنگِ تیره در شب سفید می‌شود —
                   دلیلش در logoTone.ts نوشته شده */
                data-mono={!m.cover && isMonoDarkLogo(m.img) ? '' : undefined}
              />
            </span>
            <span className="hbridge__mark-name">{m.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString('fa-IR');

export function HeroBridge() {
  const all = marks();
  const [top, bottom] = split(all);

  /* اگر روزی نشانی نماند، سکشن اصلاً رندر نمی‌شود — یک نوارِ
     خالیِ متحرک از نبودنش بدتر است. */
  if (all.length < 4) return null;

  return (
    <section className="hbridge reveal" aria-labelledby="hbridge-h">
      <div className="wrap hbridge__head">
        <span className="hbridge__kicker">{fmt(all.length)} سرویس و اکانت</span>
        <h2 id="hbridge-h">خرید بی‌دردسر و مطمئن اکانت‌ها و سرویس‌ها</h2>
        <p>با قیمت مناسب</p>
      </div>

      <div className="hbridge__rows">
        <Row items={top} dir="fwd" />
        <Row items={bottom} dir="rev" />
      </div>

      {/* ⚠ تگ‌های دسته برداشته شدند و جایشان یک فلش نشست.

          پنج تگِ دسته این‌جا بود که دقیقاً همان کاری را می‌کرد
          که سکشنِ *بعدی* می‌کند — و سکشنِ بعدی آن را بهتر
          می‌کند، چون کارت دارد و شمارش و نشان. دو ردیفِ
          پشت‌سرهم با یک کار، یعنی کاربر دو بار همان تصمیم را
          می‌گیرد.

          فلش همان را می‌گوید بی‌آنکه چیزی تکرار کند: «ادامه
          پایین است». */}
      <a href="#catshow" className="hbridge__down" aria-label="رفتن به دسته‌بندی محصولات">
        <ChevronDown aria-hidden="true" />
      </a>
    </section>
  );
}
