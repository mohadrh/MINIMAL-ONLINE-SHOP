'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgePercent, Flame, PiggyBank, Sparkles } from 'lucide-react';
import {
  CATEGORIES, PRODUCTS, getLowestPrice, type CategorySlug,
} from '../../data/catalog';
import { Glyph, type GlyphName } from '../ui/Glyph';
import { asset } from '../../lib/asset';
import { isMonoDarkLogo } from '../../lib/logoTone';

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
/* ⚠ ترتیبِ رنگ‌ها چیده شده، نه تصادفی — و دلیلش هست.

   خواسته این بود که نورِ کارت‌ها متنوع باشد و «دو تا کنارِ هم یک
   رنگ نباشند». قرعه‌ی واقعی هر دو را می‌شکند: هم گاهی دو همسایه
   را هم‌رنگ می‌کند، هم چون سرور و مرورگر دو قرعه‌ی جدا می‌اندازند،
   رنگ‌ها لحظه‌ی هیدریشن می‌پرند.

   پس چیدمانِ ثابتی حساب شد که در هر سه اندازه‌ی شبکه شرط را نگه
   دارد. شبکه چهار ستون است، زیر ۱۱۸۰ دو ستون، زیر ۵۶۰ یک ستون —
   یعنی همسایه‌ی هر کارت بسته به عرضِ صفحه می‌تواند ‎+۱‎، ‎+۲‎ یا
   ‎+۴‎ باشد. این ترتیب هر سه فاصله را رعایت می‌کند:

     ai  بنفش │ طراحی تراکوتا │ اجتماعی کهربا │ آموزش آبی
     گیم تراکوتا │ گیفت کهربا │ شماره آبی │ سایر بنفش

   و از هر چهار رنگ دقیقاً دو بار استفاده می‌شود، پس هیچ رنگی
   غالب نمی‌شود. جاهایی که معنا داشت هم سرِ جای خودش ماند: هوش
   مصنوعی بنفشِ ai، گیفت کارت کهربایِ باشگاه، آموزش آبیِ اعتماد. */
const TUBES: Record<string, string> = {
  ai: 'var(--ai)',
  creative: 'var(--brand)',
  social: 'var(--vip)',
  education: 'var(--blue)',
  gaming: 'var(--brand)',
  giftcard: 'var(--vip)',
  numbers: 'var(--blue)',
  all: 'var(--ai)',
};

/** حداکثر چند نام در هر کارت — بیشترش دیوارِ لینک می‌شود.
 *
 * ⚠ چهار، چون هر تراشه نصفِ عرض است و چهارتا دقیقاً دو ردیف
 * می‌شود. با پنج‌تا، دسته‌ای با نام‌های بلند — «گیفت کارت
 * پلی‌استیشن» — چهار ردیف می‌خواست و ته جعبه بریده می‌شد. */
const PER_CARD = 6;

const fmt = (n: number) => n.toLocaleString('fa-IR');

/** یک تراشه زیرِ کارت — یا نشانِ یک محصول، یا آیکونِ یک فیلتر */
type Chip = {
  slug: string;
  title: string;
  logo: string;
  /** وقتی نشان ندارد؛ جای حرفِ اول می‌نشیند */
  icon?: React.ReactNode;
  /** مقصدِ دلخواه — وگرنه به خودِ دسته می‌رود */
  to?: string;
};

type Card = {
  slug: CategorySlug | 'numbers' | 'all';
  title: string;
  tagline: string;
  count: number;
  from: number;
  items: Chip[];
  href: string;
};

export function CategoryShowcase() {
  const cards: Card[] = CATEGORIES.map((c) => {
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
      { slug: '', title: 'واتساپ', logo: '/brand/logos/whatsapp.svg' },
      { slug: '', title: 'چت‌جی‌پی‌تی', logo: '/brand/logos/openai.svg' },
      { slug: '', title: 'ایکس', logo: '/brand/logos/x.svg' },
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
    title: 'دسترسی سریع فیلترها',
    tagline: 'میان‌بر به پرکاربردترین فیلترهای فروشگاه — یک کلیک تا فهرستِ باریک‌شده',
    count: PRODUCTS.length,
    from: PRODUCTS.length ? Math.min(...PRODUCTS.map(getLowestPrice)) : 0,
    /* ⚠ آیکون می‌گیرند، نه حرفِ اولِ نامشان.
       و ⚠ هرکدام به فیلترِ خودش در ‎/shop‎ می‌روند.

       تا امروز این چهارتا ‎logo: ''‎ داشتند و به حرفِ اول می‌افتادند:
       «پ»، «ت»، «ت»، «م» — دو دایره‌ی هم‌شکل که هیچ‌کدام چیزی
       نمی‌گفتند، آن هم کنارِ هفت کارتی که نشانِ واقعیِ برندها را
       نشان می‌دهند. حرف در دایره ادایِ لوگو درمی‌آورد، و این‌ها
       لوگو نیستند؛ فیلترند. پس آیکون، که دقیقاً همان را می‌گوید.

       هر چهارتا هم به ‎/shop‎ی خالی می‌رفتند. حالا برچسبِ واقعیِ
       کاتالوگ را با خودشان می‌برند و فهرست همان‌طور که وعده داده
       شده باریک می‌رسد. */
    items: [
      { slug: '', title: 'پرفروش‌ها',    logo: '', icon: <Flame />,       to: '/shop?tag=bestseller' },
      { slug: '', title: 'تخفیف‌دارها',  logo: '', icon: <BadgePercent />, to: '/shop?deals=1' },
      { slug: '', title: 'تازه رسیده‌ها', logo: '', icon: <Sparkles />,    to: '/shop?tag=new-release' },
      { slug: '', title: 'مقرون‌به‌صرفه', logo: '', icon: <PiggyBank />,   to: '/shop?tag=budget' },
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
    <section className="catshow reveal" id="catshow">
      <div className="wrap catshow__inner">
        <div className="sec-head sec-head--mid">
          <span className="sec-head__kicker">از کجا شروع کنم</span>
          <h2>دسته‌بندی محصولات</h2>
          <p className="sec-head__lead">
            هر چیزی لازم داشتی، از همین‌جا راحت‌تر پیدایش می‌کنی.
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
                  const href = it.to ?? (it.slug ? `/product/${it.slug}` : c.href);
                  return (
                    <Link
                      key={it.slug || it.title}
                      href={href}
                      className="catcard__chip"
                      title={it.title}
                    >
                      <span className="catcard__chip-ic" aria-hidden="true">
                        {it.logo
                          ? (
                            <img
                              src={asset(it.logo)}
                              alt=""
                              loading="lazy"
                              /* نشانِ تک‌رنگِ تیره در شب سفید می‌شود —
                                 دلیلش در logoTone.ts نوشته شده */
                              data-mono={isMonoDarkLogo(it.logo) ? '' : undefined}
                            />
                          )
                          : it.icon ?? <b>{it.title.slice(0, 1)}</b>}
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
