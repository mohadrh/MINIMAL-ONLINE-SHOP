'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  CATEGORIES, PRODUCTS, getLowestPrice, type CategorySlug,
} from '../../data/catalog';
import { Glyph, type GlyphName } from '../ui/Glyph';
import { asset } from '../../lib/asset';

/**
 * ویترین دسته‌بندی‌ها.
 *
 * هر دسته یک کارت است که چهار چیز را همان‌جا جواب می‌دهد: چه
 * دسته‌ای است، چند محصول دارد، از چند شروع می‌شود، و **دقیقاً چه
 * چیزهایی داخلش هست**.
 *
 * آن مورد آخر تازه است. اولش یک سکشنِ جدا زیر همین بخش ساخته شد که
 * نامِ محصول‌ها را در چهار جعبه نشان می‌داد، ولی کارفرما گفت
 * جایشان همین کارت‌هاست نه یک سکشنِ دیگر — و درست بود: دو بخشِ
 * پشت‌سرهم که هر دو دسته‌ها را فهرست می‌کردند، یک کار را دو بار
 * می‌کردند.
 *
 * ⚠ به همین دلیل کارت دیگر خودش لینک نیست.
 *
 * قبلاً کلِ کارت یک <Link> بود. حالا که داخلش لینکِ محصول هست،
 * آن ساختار HTMLِ نامعتبر می‌شد — لنگر داخل لنگر — و مرورگر
 * خودش تگ‌ها را باز می‌کند و چیدمان به هم می‌ریزد. پس کارت یک
 * div است و لینک‌ها داخلش: تیتر، نامِ محصول‌ها، و «موارد بیشتر».
 */

const ICONS: Record<string, GlyphName> = {
  ai: 'ai', creative: 'creative', social: 'social',
  education: 'education', gaming: 'gaming', giftcard: 'gift', numbers: 'number',
};

/* رنگ هر دسته از کمان ققنوس، نه از یک آبیِ مشترک */
/* ⚠ هفت رنگِ دلخواه جای خود را به چهار رنگِ پالت داد.

   قبلاً هر دسته یک رنگِ جدا داشت — نارنجی، سرخ، سرخابی، بنفش —
   که از کمانِ لوگو برداشته شده بودند. کنارِ پالتِ تراکوتا هیچ‌کدام
   نمی‌نشستند و کارت‌ها شبیهِ هفت سایتِ مختلف می‌شدند.

   ماکاپِ کارفرما سه رنگِ معنایی دارد و هر کدام کارِ مشخصی
   می‌کند. همان سه به‌اضافه‌ی خودِ برند، بین هفت دسته پخش شدند —
   پس تنوع می‌ماند ولی همه‌ی رنگ‌ها از یک خانواده‌اند:

     هوش مصنوعی  → بنفشِ ملایمِ ai، همان که ماکاپ فقط برای
                    محصولاتِ هوش مصنوعی می‌گذارد
     گیفت کارت   → کهربایی vip، رنگِ باشگاه و هدیه
     اجتماعی و آموزشی و شماره → آبیِ اعتماد
     طراحی و گیم → تراکوتای برند */
const TUBES: Record<string, string> = {
  ai: 'var(--ai)',
  creative: 'var(--brand)',
  gaming: 'var(--brand)',
  social: 'var(--blue)',
  education: 'var(--blue)',
  giftcard: 'var(--vip)',
  numbers: 'var(--blue)',
  /* کارتِ «سایر» رنگِ خودِ برند را می‌گیرد، نه رنگِ یک دسته —
     چون به هیچ دسته‌ای تعلق ندارد و بالای همه‌شان است. */
  all: 'var(--brand)',
};

/** حداکثر چند نام در هر کارت — بیشترش دیوارِ لینک می‌شود.
 *
 * ⚠ چهار، چون هر تراشه نصفِ عرض است و چهارتا دقیقاً دو ردیف
 * می‌شود. با پنج‌تا، دسته‌ای با نام‌های بلند — «گیفت کارت
 * پلی‌استیشن» — چهار ردیف می‌خواست و ته جعبه بریده می‌شد. */
const PER_CARD = 6;

const fmt = (n: number) => n.toLocaleString('fa-IR');

export function CategoryShowcase() {
  const cards = CATEGORIES.map((c) => {
    const items = PRODUCTS.filter((p) => p.category === c.slug);
    const from = items.length ? Math.min(...items.map(getLowestPrice)) : 0;
    return {
      slug: c.slug as CategorySlug | 'numbers' | 'all',
      title: c.title,
      tagline: c.tagline,
      count: items.length,
      from,
      /* نام‌ها از خودِ کاتالوگ می‌آیند، نه از فهرستِ دستی. محصولِ
         تازه خودش این‌جا پیدایش می‌شود و محصولِ حذف‌شده لینکِ مرده
         جا نمی‌گذارد. با ووکامرس هم همین می‌ماند. */
      /* ⚠ نشان اگر بود، وگرنه تصویرِ کارت.

         بازی‌ها لوگو ندارند و ندارند‌ش هم درست است — کسی بازی را
         از روی نشانِ ناشر نمی‌شناسد، از روی جلدش می‌شناسد. پس
         همان جلدِ مربع در قابِ کوچک می‌نشیند. */
      items: items.slice(0, PER_CARD).map((p) => ({
        slug: p.slug,
        title: p.title,
        logo: p.media.logo ?? p.media.thumbnail,
      })),
      href: `/${c.slug}`,
    };
  });

  /* شماره‌ی مجازی دسته‌ی کاتالوگ نیست ولی محصول است — جایش
     همین‌جاست، نه در فهرستی جدا که کسی پیدایش نکند. */
  cards.push({
    slug: 'numbers',
    title: 'شماره مجازی',
    tagline: 'برای ساخت حساب در سرویس‌هایی که ایران را قبول نمی‌کنند',
    count: 0,
    from: 0,
    items: [
      { slug: '', title: 'تلگرام', logo: '/brand/logos/telegram.svg' },
      { slug: '', title: 'واتساپ', logo: '' },
      { slug: '', title: 'چت‌جی‌پی‌تی', logo: '/brand/logos/openai.svg' },
      { slug: '', title: 'اینستاگرام', logo: '' },
      { slug: '', title: 'دیسکورد', logo: '/brand/logos/discord.svg' },
      { slug: '', title: 'استیم', logo: '/brand/logos/steam.svg' },
    ],
    href: '/numbers',
  });

  /* ⚠ کارتِ هشتم، و دلیلش چیدمان است نه محتوا.
     …ولی محتوایش هم واقعی است.

     هفت کارت در هیچ تعداد ستونی ردیفِ کامل نمی‌شود: در چهار ستون
     یکی تنها می‌ماند، در سه ستون هم. یک کارتِ تنها در ردیفِ آخر،
     هرچقدر هم وسط‌چین، ناتمام به نظر می‌رسد.

     هشت‌تا در چهار ستون دو ردیفِ پُر است و در دو ستون چهار ردیفِ
     پُر — یعنی در هر اندازه‌ای مستطیل می‌ماند. و کارتی که اضافه
     شد همان جایی است که کاربر بعد از دیدنِ دسته‌ها می‌خواهد برود. */
  cards.push({
    slug: 'all',
    title: 'سایر محصولات',
    tagline: 'باقیِ فهرست، با فیلتر و مرتب‌سازی — هرچه بالا ندیدی این‌جاست',
    count: PRODUCTS.length,
    from: PRODUCTS.length ? Math.min(...PRODUCTS.map(getLowestPrice)) : 0,
    /* ⚠ این‌ها برچسبِ واقعیِ فروشگاه‌اند، نه اسمِ قابلیت.
       هر کدام در ‎/shop‎ فیلترِ خودش را دارد، پس کلیک روی کارت
       کاربر را دقیقاً به همان فهرست می‌رساند. */
    items: [
      { slug: '', title: 'پرفروش‌ها', logo: '' },
      { slug: '', title: 'تخفیف‌دارها', logo: '' },
      { slug: '', title: 'تازه رسیده‌ها', logo: '' },
      { slug: '', title: 'مقرون‌به‌صرفه', logo: '' },
    ],
    href: '/shop',
  });

  return (
    /* ⚠ پس‌زمینه‌ی ستاره و هاله‌ی متحرک برداشته شد.

       یک آسمانِ پرستاره در شب و چهار هاله‌ی چرخانِ رنگی در روز
       پشتِ این سکشن بود. کارفرما گفت قشنگ است ولی حواسِ مشتری را
       پرت می‌کند — و این‌جا بدترین جای ممکن برای حواس‌پرتی است،
       چون همان نقطه‌ای است که کاربر باید دسته‌اش را انتخاب کند.

       جایش یک ته‌رنگِ ثابت و آرام نشست که در CSS تعریف شده. */
    <section className="catshow reveal">
      <div className="wrap catshow__inner">
        <div className="sec-head sec-head--mid">
          <span className="sec-head__kicker">از کجا شروع کنم</span>
          <h2>دسته‌بندی محصولات</h2>
          <p className="sec-head__lead">
            اسمِ چیزی که دنبالش هستی را همین‌جا بزن — لازم نیست اول دسته را باز کنی.
          </p>
        </div>

        <div className="catshow__grid">
          {cards.map((c) => (
            <div
              key={c.slug}
              className="catcard"
              style={{ ['--tube' as string]: TUBES[c.slug] ?? 'var(--brand)' }}
            >
              {/* رنگِ دسته که از پایین بالا می‌آید */}
              <span className="catcard__flood" aria-hidden="true" />

              <Link href={c.href} className="catcard__head">
                <span className="catcard__ico" aria-hidden="true">
                  <Glyph name={ICONS[c.slug] ?? 'spark'} />
                </span>
                <b className="catcard__title">{c.title}</b>
              </Link>

              <p className="catcard__lead">{c.tagline}</p>

              {/* ⚠ نشانِ سرویس‌ها، نه نامشان.

                  تا امروز نامِ هر محصول یک تراشه‌ی متنی بود. با
                  نشان، هم بیشترشان جا می‌شوند — شش به‌جای چهار —
                  هم کاربر سرویس را از روی لوگو زودتر می‌شناسد تا
                  از روی نامِ فارسی‌اش.

                  نام نرفته: روی هاور از کنارِ نشان باز می‌شود. */}
              <span className="catcard__chips">
                {c.items.map((it) => {
                  const href = it.slug ? `/product/${it.slug}` : c.href;
                  return (
                    <Link
                      key={it.slug || it.title}
                      href={href}
                      className="catcard__chip"
                      title={it.title}
                    >
                      <span className="catcard__chip-ic" aria-hidden="true">
                        {it.logo
                          ? <img src={asset(it.logo)} alt="" loading="lazy" />
                          : <b>{it.title.slice(0, 1)}</b>}
                      </span>
                      {/* گرید صفر‌کسری → یک‌کسری: بازشدنِ نرم بدونِ
                          پرشِ چیدمان، که با max-width نمی‌شود */}
                      <span className="catcard__chip-name"><span>{it.title}</span></span>
                    </Link>
                  );
                })}
              </span>

              <span className="catcard__foot">
                {/* ⚠ قیمت از کارتِ دسته برداشته شد.

                    «از ۲۰۰٬۰۰۰ تومان» این‌جا بود. کارفرما گفت
                    برداشته شود — و درست است: کمترین قیمتِ یک دسته
                    معمولاً مالِ ارزان‌ترین پلنِ کوچک‌ترین محصول
                    است و انتظاری می‌سازد که صفحه‌ی محصول
                    برآورده‌اش نمی‌کند. تعدادِ محصول می‌ماند، چون
                    آن یکی راست است و کمک می‌کند. */}
                <span className="catcard__meta">
                  {c.count > 0 && <span className="num">{fmt(c.count)} محصول</span>}
                  {c.count === 0 && <span>بیش از سی کشور</span>}
                </span>

                <Link href={c.href} className="catcard__go">
                  موارد بیشتر
                  <ArrowLeft aria-hidden="true" />
                </Link>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
