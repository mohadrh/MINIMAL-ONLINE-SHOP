'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Columns2, Layers, Plus, Star } from 'lucide-react';
import { ShareBubble } from './ShareBubble';
import {
  getDefaultVariant, getLowestPrice, needsCustomerInput, type Product,
} from '../../data/catalog';
import { ProductArt } from '../ui/ProductArt';
import { useCompare } from '../shop/Compare';
import { useCart, useFlight } from '../../app/providers';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/* هفت توقف کمان ققنوس. هر محصول یکی را برمی‌دارد و دکمه‌ی افزودنش
   همان را پاستلی می‌کند — پس ردیف کارت‌ها رنگین‌کمانِ خود لوگو
   می‌شود، ولی خیلی کم‌رنگ.

   انتخاب از روی نام محصول است نه ایندکسِ فهرست: با ایندکس، رنگ هر
   کارت با فیلتر و مرتب‌سازی می‌پرید، و همان محصول در فروشگاه و در
   «مرتبط‌ها» دو رنگ می‌شد. */
const ARC = [
  '--phx-amber', '--phx-orange', '--phx-crimson', '--phx-pink',
  '--phx-magenta', '--phx-violet', '--phx-indigo',
] as const;

const arcStop = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ARC[h % ARC.length];
};

/* زمان تحویل دیگر عددی نیست.

   قبلاً داده‌ها «کمتر از ۱۵ دقیقه» و مثل آن بودند و کارت از رویشان
   نشان سبزِ «آنی» می‌ساخت. کارفرما گفت این ادعاها اغراق است و همه
   به یک جمله‌ی واحد رفتند: «در اسرع وقت، توسط سیستم».

   پس نشان سبز هم برداشته شد. نشانی که از عددی می‌آمد که دیگر وجود
   ندارد، فقط تزئین است. */

/* مجموع موجودی، نه کمترینش.

   اولین نسخه Math.min روی پلن‌ها می‌گرفت و نتیجه‌اش این بود که
   بازی‌ای با ۲ نسخه‌ی PS5 و ۲۴ نسخه‌ی PC، «کمیاب» علامت می‌خورد.
   هفده کارت از بیست‌وهفت‌تا هشدار کمبود می‌دادند — و هشداری که
   همه‌جا هست، هیچ‌جا خوانده نمی‌شود. */
const totalStock = (p: Product): number | null => {
  const nums = p.variants.map((v) => v.stock).filter((s): s is number => s !== null);
  if (nums.length !== p.variants.length) return null;   // یک پلن نامحدود = محصول نامحدود
  return nums.reduce((a, b) => a + b, 0);
};

/**
 * کارت محصول — یک بار نوشته می‌شود و در فروشگاه، دسته و «مرتبط‌ها»
 * تکرار.
 *
 * کارت خودش <div> است نه <a>، چون داخلش دکمه‌ی افزودن هست و
 * لینکِ تودرتو HTML نامعتبر می‌سازد. مسیریابی با router انجام
 * می‌شود و دکمه با stopPropagation جلوی رسیدن کلیک به کارت را
 * می‌گیرد.
 *
 * چیزی که روی کارت می‌آید عمداً محدود است. هر نشانه باید به یک
 * سوالِ واقعیِ خریدار جواب بدهد: چند است، کِی می‌رسد، چند پلن
 * دارد، و آیا اصلاً مانده. هرچیز دیگری کارت را شلوغ می‌کند بدون
 * اینکه تصمیم را جلو ببرد.
 */
export function ProductCard(
  { product: p, style }: { product: Product; style?: React.CSSProperties },
) {
  const router = useRouter();
  const { add } = useCart();
  const { launch } = useFlight();
  const compare = useCompare();

  const v = getDefaultVariant(p);
  const off =
    v.compareAt && v.compareAt > v.price
      ? Math.round((1 - v.price / v.compareAt) * 100)
      : null;

  const stock = totalStock(p);
  const scarce = stock !== null && stock > 0 && stock <= 5;
  const sold = stock === 0;
  const plans = p.variants.length;

  const isGame = p.category === 'gaming';

  /* انتخاب سریع پلن، روی خود کارت.

     قبلاً + برای محصول چندپلنی فقط به صفحه‌ی محصول می‌رفت. منطقش
     درست بود — نباید کورکورانه پلنی را اضافه کرد — ولی از دید
     کاربر دکمه‌ای که «افزودن» می‌گوید و بعد صفحه عوض می‌کند، یعنی
     کار نکرد. و چون بیشتر محصولات چند پلن دارند، تقریباً هیچ +ی
     کار نمی‌کرد.

     حالا فهرست کوتاه پلن‌ها همان‌جا باز می‌شود. محصولی که ورودی
     لازم دارد (ایمیل، یوزرنیم) همچنان به صفحه می‌رود، چون آن را
     نمی‌شود در یک پاپ‌آور کوچک گرفت. */
  const [picking, setPicking] = useState(false);
  const pickRef = useRef<HTMLDivElement>(null);

  const needsPage = needsCustomerInput(p);
  const multiPlan = p.variants.length > 1;

  useEffect(() => {
    if (!picking) return;
    const onDown = (e: PointerEvent) => {
      if (!pickRef.current?.contains(e.target as Node)) setPicking(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicking(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [picking]);

  const addVariant = (variant: typeof v, el: HTMLElement) => {
    /* اگر محصول ورودی لازم دارد (ایمیل، یوزرنیم)، نمی‌شود از روی
       کارت اضافه‌اش کرد — بدون آن ورودی، سر تسویه معلوم نیست
       اشتراک را روی کدام حساب فعال کنیم. */
    if (needsCustomerInput(p)) {
      router.push(`/product/${p.slug}?plan=${encodeURIComponent(variant.id)}`);
      return;
    }
    const r = el.getBoundingClientRect();
    launch({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    add(p, variant);
    setPicking(false);
  };

  const open = () => router.push(`/product/${p.slug}`);

  return (
    <div
      className={`pcard ${sold ? 'is-sold' : ''}`}
      style={{
        ['--accent' as string]: p.media.accent,
        ['--pick' as string]: `var(${arcStop(p.slug)})`,
        ...style,
      }}
      onClick={open}
      onKeyDown={(e) => {
        /* کارت با کیبورد هم باید باز شود، وگرنه کل فروشگاه فقط
           با ماوس قابل استفاده است. */
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      }}
      role="link"
      tabIndex={0}
      aria-label={`${p.title} — ${fmt(getLowestPrice(p))} تومان`}
    >
      {/* بازی‌ها قاب خودشان را می‌شکنند.

          کارتِ اشتراک یک بنر تخت است و همان درست است. ولی بازی
          کاراکتر دارد، و کاراکتری که از لبه‌ی بالای قاب بیرون
          می‌زند، کارت را از تصویرِ توی جعبه به چیزی سه‌بعدی تبدیل
          می‌کند — همان کاری که نسخه‌ی قبلی سایت می‌کرد. */}
      <ProductArt
        className={`pcard__art ${isGame ? 'pcard__art--game' : ''}`}
        src={p.media.thumbnail}
        title={p.englishTitle}
        brand={p.brand}
      />
      <span className="pcard__over">

        {/* نشان‌ها روی تصویر می‌نشینند تا از بدنه‌ی متنی جا نگیرند */}
        <span className="pcard__flags">
          {off !== null && <span className="pcard__off num">٪{fmt(off)}−</span>}
        </span>

        {sold && <span className="pcard__sold">فعلاً ناموجود</span>}

      </span>

      {/* مقایسه و اشتراک‌گذاری — زیر عکس، نه رویش.

          روی خودِ تصویر بودند و دو مشکل داشتند: جلوی کاراکترِ بازی
          را می‌گرفتند، و روی بنرهای روشن حباب سفید روی سفید گم
          می‌شد. این‌جا زمینه‌ی ثابت دارند، همیشه خوانا هستند، و
          مرزِ بین «تصویر محصول» و «کاری که می‌توانی بکنی» روشن
          می‌ماند. */}
      <span className="pcard__acts">
        <button
          type="button"
          className={`bub ${compare.has(p.slug) ? 'is-on' : ''}`}
          data-tip={compare.has(p.slug) ? 'حذف از مقایسه' : 'مقایسه'}
          aria-pressed={compare.has(p.slug)}
          aria-label={compare.has(p.slug) ? `حذف ${p.title} از مقایسه` : `افزودن ${p.title} به مقایسه`}
          disabled={!compare.has(p.slug) && compare.full}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); compare.toggle(p); }}
        >
          <Columns2 aria-hidden="true" />
        </button>

        <ShareBubble title={p.title} path={`/product/${p.slug}`} />
      </span>

      <span className="pcard__body">
        <span className="pcard__top">
          <b className="pcard__name">{p.title}</b>
          <span className="pcard__rate" title={`${p.reviewsCount} نظر`}>
            <Star aria-hidden="true" />
            <span className="num">{p.rating.toLocaleString('fa-IR')}</span>
          </span>
        </span>

        {/* کارت عمداً کم‌حرف است.

            قبلاً یک جمله‌ی کامل توضیح داشت و زیرش سه نشانه: زمان
            تحویل، تعداد پلن، و گارانتی. دو تای اول و سوم روی هر
            بیست‌وهفت محصول *دقیقاً یکسان* بودند — «در اسرع وقت،
            توسط سیستم» و «گارانتی تمام دوره‌ی اشتراک». چیزی که
            روی همه یکسان است، بین آن‌ها تمایزی نمی‌سازد؛ فقط
            ارتفاع می‌گیرد و چشم را از قیمت و نام دور می‌کند.

            حالا فقط نام، امتیاز، تعداد پلن، و قیمت. توضیح و
            گارانتی و زمان تحویل، همه در صفحه‌ی محصول‌اند — جایی
            که کاربر آمده تا بخواندشان. */}
        {plans > 1 && (
          <span className="pcard__plans">
            <Layers aria-hidden="true" />
            <span className="num">{fmt(plans)}</span> پلن
          </span>
        )}

        {/* کمبود موجودی فقط وقتی گفته می‌شود که واقعاً کم است.
            اگر همیشه بنویسیم «موجودی محدود»، دیگر کسی باور نمی‌کند. */}
        {scarce && (
          <span className="pcard__scarce num">تنها {fmt(stock)} عدد مانده</span>
        )}

        <span className="pcard__foot">
          <div className="pcard__addwrap" ref={pickRef}>
            <button
              type="button"
              className="pcard__add"
              disabled={sold}
              aria-expanded={multiPlan && !needsPage ? picking : undefined}
              aria-label={
                needsPage ? `انتخاب و خرید ${p.title}`
                : multiPlan ? `انتخاب پلن ${p.title}`
                : `افزودن ${p.title} به سبد`
              }
              onClick={(e) => {
                e.stopPropagation();
                if (sold) return;
                /* محصولی که ورودی لازم دارد هم اول فهرست پلن را
                   نشان می‌دهد. آنجا دکمه‌ی «توضیح بده» هست که به
                   صفحه‌ی محصول می‌برد — همان‌جا که ایمیل و آیدی
                   گرفته می‌شود. */
                if (multiPlan || needsPage) { setPicking((x) => !x); return; }
                addVariant(v, e.currentTarget);
              }}
            >
              <Plus aria-hidden="true" />
              {/* برچسبِ یکسان برای همه.

                  قبلاً سه حالت داشت — «انتخاب»، «پلن‌ها»، «افزودن» —
                  و کاربر با یک ردیف کارت روبه‌رو می‌شد که هر دکمه‌اش
                  چیز دیگری می‌گفت. یک برچسبِ ثابت یعنی یک انتظارِ
                  ثابت؛ اینکه پشتش پاپ‌آور باز شود یا مستقیم اضافه
                  شود، جزئیاتِ ماست نه دغدغه‌ی او. */}
              <span className="pcard__add-text">خرید</span>
            </button>

            {picking && (
              <div className="pcard__picker" role="menu" onClick={(e) => e.stopPropagation()}>
                <span className="pcard__picker-title">کدام پلن؟</span>
                {p.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    role="menuitem"
                    className="pcard__picker-row"
                    disabled={variant.stock === 0}
                    onClick={(e) => { e.stopPropagation(); addVariant(variant, e.currentTarget); }}
                  >
                    <span>{variant.label}</span>
                    <b className="num">
                      {variant.stock === 0 ? 'ناموجود' : fmt(variant.price)}
                    </b>
                  </button>
                ))}

                {/* راه خروج برای کسی که نمی‌داند کدام را بردارد.

                    بدون این، فهرستِ پلن‌ها برای آدمِ مردد بن‌بست است:
                    سه اسم و سه قیمت می‌بیند و هیچ‌کدام نمی‌گوید چه
                    فرقی دارند. */}
                <button
                  type="button"
                  className="pcard__picker-help"
                  onClick={(e) => { e.stopPropagation(); router.push(`/product/${p.slug}`); }}
                >
                  نمی‌دانم کدام را بگیرم، توضیح بده
                </button>
              </div>
            )}
          </div>

          <span className="pcard__prices">
            {v.compareAt && <s className="pcard__was num">{fmt(v.compareAt)}</s>}
            <b className="pcard__now num">{fmt(getLowestPrice(p))}</b>
            <span className="pcard__unit">تومان</span>
          </span>
        </span>
      </span>
    </div>
  );
}
