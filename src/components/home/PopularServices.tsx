import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Smartphone, Gift, Gamepad2, Sparkles,
  BookOpen, Medal, PackageSearch, Handshake, LifeBuoy,
} from 'lucide-react';
import { PRODUCTS, type CategorySlug } from '../../data/catalog';

/**
 * سرویس‌های پرطرفدار — «دقیقاً چه چیزهایی می‌فروشید؟»
 *
 * سکشنِ بالاتر دسته‌ها را نشان می‌دهد؛ این یکی داخلِ دسته‌ها را.
 * کارفرما همین را خواست: «سکشن بعد چیزای ریزی رو به چشم بیاره،
 * مثل اینکه خدمات دیگه‌مون چیاست در هر دسته‌بندی.»
 *
 * چرا این کار لازم است: «هوش مصنوعی» به کسی که دنبال چت‌جی‌پی‌تی
 * است چیزی نمی‌گوید. او اسمِ محصول را می‌شناسد، نه نامِ دسته را.
 * تا وقتی اسم‌ها دیده نشوند، کاربر باید حدس بزند که داخلِ دسته چه
 * هست — و بیشترِ آدم‌ها حدس نمی‌زنند، می‌روند.
 *
 * ⚠ نام‌ها از خودِ کاتالوگ می‌آیند، نه از فهرستِ دستی. محصولی که
 * اضافه شود خودش این‌جا پیدایش می‌شود، و محصولی که حذف شود لینکِ
 * مرده جا نمی‌گذارد. وقتی داده از ووکامرس بیاید همین ساختار سرِ
 * جایش می‌ماند و فقط منبعِ PRODUCTS عوض می‌شود.
 */

interface Box {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  cats: CategorySlug[];
  href: string;
  tube: string;
}

const BOXES: Box[] = [
  {
    id: 'ai',
    title: 'اکانت هوش مصنوعی',
    icon: Sparkles,
    cats: ['ai'],
    href: '/ai',
    tube: '#ffa63d',
  },
  {
    id: 'giftcard',
    title: 'انواع گیفت کارت',
    icon: Gift,
    cats: ['giftcard'],
    href: '/giftcard',
    tube: '#ff9900',
  },
  {
    id: 'gaming',
    title: 'اکانت و بازی',
    icon: Gamepad2,
    cats: ['gaming'],
    href: '/gaming',
    tube: '#ff4d9f',
  },
  {
    id: 'apps',
    title: 'ابزار، شبکه و آموزش',
    icon: Smartphone,
    cats: ['creative', 'social', 'education'],
    href: '/shop',
    tube: '#c94ff5',
  },
];

/* ردیفِ پایین — کارهایی که محصول نیستند ولی کاربر دنبالشان می‌گردد.

   این‌ها عمداً محصول نیستند: صفحه‌هایی‌اند که تا حالا فقط از فوتر
   پیدا می‌شدند، یعنی عملاً پیدا نمی‌شدند. */
const EXTRAS = [
  { icon: Smartphone, title: 'شماره مجازی', href: '/numbers' },
  { icon: Medal, title: 'باشگاه مشتریان', href: '/club' },
  { icon: PackageSearch, title: 'پیگیری سفارش', href: '/track' },
  { icon: BookOpen, title: 'آموزش و مقاله', href: '/blog' },
  { icon: Handshake, title: 'نمایندگی و همکاری', href: '/reseller' },
  { icon: LifeBuoy, title: 'راهنمای خرید', href: '/guide' },
];

/** حداکثر چند نام در هر جعبه — بیشترش دیوارِ لینک می‌شود */
const PER_BOX = 6;

export function PopularServices() {
  const boxes = BOXES.map((b) => ({
    ...b,
    items: PRODUCTS.filter((p) => b.cats.includes(p.category)).slice(0, PER_BOX),
    total: PRODUCTS.filter((p) => b.cats.includes(p.category)).length,
  })).filter((b) => b.items.length > 0);

  return (
    <section className="section section--tint reveal">
      <div className="wrap">
        <div className="sec-head sec-head--mid">
          <span className="sec-head__kicker">دسترسی سریع</span>
          <h2>سرویس‌های پرطرفدار</h2>
          <p className="sec-head__lead">
            اسمِ چیزی که دنبالش هستی را همین‌جا بزن — لازم نیست اول دسته را باز کنی.
          </p>
        </div>

        <div className="psv">
          {boxes.map((b) => (
            <div key={b.id} className="psv__box" style={{ ['--tube' as string]: b.tube }}>
              <span className="psv__head">
                {/* آیکون بدونِ کادر — قاعده‌ی ثابتِ سایت */}
                <b.icon aria-hidden="true" />
                <b>{b.title}</b>
              </span>

              <span className="psv__chips">
                {b.items.map((p) => (
                  <Link key={p.slug} href={`/product/${p.slug}`} className="psv__chip">
                    {p.title}
                  </Link>
                ))}
              </span>

              {b.total > b.items.length && (
                <Link href={b.href} className="psv__more">
                  موارد بیشتر
                  <ArrowLeft aria-hidden="true" />
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="psv__extras">
          <h3 className="psv__extras-title">دیگر خدمات محبوب کاربران</h3>
          <div className="psv__row">
            {EXTRAS.map((e) => (
              <Link key={e.href} href={e.href} className="psv__x">
                <e.icon aria-hidden="true" />
                <b>{e.title}</b>
                <span className="psv__x-go">
                  اطلاعات بیشتر
                  <ArrowLeft aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
