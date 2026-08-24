'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Layers, Plus, ShieldCheck, Star, Zap } from 'lucide-react';
import {
  getDefaultVariant, getLowestPrice, needsCustomerInput, type Product,
} from '../../data/catalog';
import { ProductArt } from '../ui/ProductArt';
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

/* سرعت تحویل تنها چیزی است که این بازار واقعاً رویش تصمیم می‌گیرد،
   پس روی کارت نشان خودش را دارد نه یک خط متن خاکستری کنار بقیه.

   داده‌ها «کمتر از ۱۵ دقیقه» و مثل آن‌اند، نه فقط «آنی». پس عدد را
   درمی‌آوریم: تا یک ربع، برای خریدارِ این بازار یعنی همان آنی. */
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const toEnDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));

const deliveryMinutes = (p: Product): number | null => {
  if (/آنی|فوری|بلافاصله/.test(p.deliveryEstimate)) return 0;
  const m = toEnDigits(p.deliveryEstimate).match(/(\d+)\s*دقیقه/);
  return m ? Number(m[1]) : null;
};

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
export function ProductCard({ product: p }: { product: Product }) {
  const router = useRouter();
  const { add } = useCart();
  const { launch } = useFlight();

  const v = getDefaultVariant(p);
  const off =
    v.compareAt && v.compareAt > v.price
      ? Math.round((1 - v.price / v.compareAt) * 100)
      : null;

  const stock = totalStock(p);
  const scarce = stock !== null && stock > 0 && stock <= 5;
  const sold = stock === 0;
  const plans = p.variants.length;
  const mins = deliveryMinutes(p);
  /* نشان سبز فقط برای واقعاً استثنایی‌ها.

     آستانه‌ی اول ۱۵ دقیقه بود و نتیجه‌اش این شد که ۲۴ کارت از ۲۷
     نشان گرفتند. نشانی که تقریباً همه دارند، چیزی را از بقیه جدا
     نمی‌کند و فقط جای بصری می‌گیرد. زمان تحویل برای همه در ردیف
     آرامِ نشانه‌ها می‌آید؛ سبزِ پررنگ سهم آن‌هایی است که واقعاً
     سریع‌ترند. */
  const exceptional = mins !== null && mins <= 5;

  const open = () => router.push(`/product/${p.slug}`);

  return (
    <div
      className={`pcard ${sold ? 'is-sold' : ''}`}
      style={{
        ['--accent' as string]: p.media.accent,
        ['--pick' as string]: `var(${arcStop(p.slug)})`,
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
      <ProductArt
        className="pcard__art"
        src={p.media.thumbnail}
        title={p.englishTitle}
        brand={p.brand}
      />
      <span className="pcard__over">

        {/* نشان‌ها روی تصویر می‌نشینند تا از بدنه‌ی متنی جا نگیرند */}
        <span className="pcard__flags">
          {off !== null && <span className="pcard__off num">٪{fmt(off)}−</span>}
          {exceptional && (
            <span className="pcard__instant">
              <Zap aria-hidden="true" />
              {mins === 0 ? 'آنی' : 'فوری'}
            </span>
          )}
        </span>

        {sold && <span className="pcard__sold">فعلاً ناموجود</span>}
      </span>

      <span className="pcard__body">
        <span className="pcard__top">
          <b className="pcard__name">{p.title}</b>
          <span className="pcard__rate" title={`${p.reviewsCount} نظر`}>
            <Star aria-hidden="true" />
            <span className="num">{p.rating.toLocaleString('fa-IR')}</span>
          </span>
        </span>

        <span className="pcard__note">{p.shortDescription}</span>

        {/* ردیف نشانه‌ها — هرکدام یک سوال خریدار را جواب می‌دهد */}
        <span className="pcard__signals">
          <span className="pcard__sig pcard__sig--time">
            <Clock aria-hidden="true" />
            {p.deliveryEstimate}
          </span>
          {plans > 1 && (
            <span className="pcard__sig">
              <Layers aria-hidden="true" />
              <span className="num">{fmt(plans)}</span> پلن
            </span>
          )}
          <span className="pcard__sig">
            <ShieldCheck aria-hidden="true" />
            {p.warrantyLabel}
          </span>
        </span>

        {/* کمبود موجودی فقط وقتی گفته می‌شود که واقعاً کم است.
            اگر همیشه بنویسیم «موجودی محدود»، دیگر کسی باور نمی‌کند. */}
        {scarce && (
          <span className="pcard__scarce num">تنها {fmt(stock)} عدد مانده</span>
        )}

        <span className="pcard__foot">
          <button
            type="button"
            className="pcard__add"
            disabled={sold}
            aria-label={`افزودن ${p.title} به سبد`}
            onClick={(e) => {
              e.stopPropagation();
              if (sold) return;
              /* محصولی که چند پلن یا ورودی لازم دارد نباید کورکورانه
                 اضافه شود — کاربر باید خودش انتخاب کند. */
              if (p.variants.length > 1 || needsCustomerInput(p)) {
                router.push(`/product/${p.slug}`);
                return;
              }
              const r = e.currentTarget.getBoundingClientRect();
              launch({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
              add(p, v);
            }}
          >
            <Plus aria-hidden="true" />
            <span className="pcard__add-text">افزودن</span>
          </button>

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
