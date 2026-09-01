import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Category, CategorySlug, Product } from '../../data/catalog';
import { groupsWithItems } from '../../data/groups';
import { ProductCard } from '../product/ProductCard';

/**
 * صفحه‌ی دسته.
 *
 * قبلاً یک شبکه‌ی تخت بود: هفده بازی زیر یک تیتر. آن یک دیوار است،
 * نه فهرست — چشم جایی برای ایستادن ندارد و کاربر یا اسکرول می‌کند
 * تا ته یا برمی‌گردد.
 *
 * حالا محصولات زیر زیرگروه‌های نام‌دار می‌نشینند، همان الگویی که
 * در سایت‌های مرجع این بازار کار می‌کند. زیرگروه‌ها از برچسب خودِ
 * محصول می‌آیند (data/groups)، پس محصول تازه خودش سرِ جایش
 * می‌نشیند و لازم نیست کسی فهرستی را به‌روز کند.
 *
 * دسته‌ای که زیرگروه تعریف‌شده ندارد — طراحی، شبکه‌های اجتماعی،
 * آموزشی، که هر کدام دو سه محصول دارند — یک شبکه‌ی تخت و بی‌سرتیتر
 * می‌گیرد. سرتیتر روی فهرستِ دوتایی، فقط ارتفاع است.
 */
export function CategoryView(
  { category, products }: { category: Category; products: Product[] },
) {
  const groups = groupsWithItems(category.slug as CategorySlug, products);
  const grouped = groups.length > 1 || (groups[0] && groups[0].title !== '');

  return (
    <>
      <nav className="crumb" aria-label="مسیر">
        <div className="wrap crumb__row">
          <Link href="/">خانه</Link>
          <ChevronLeft aria-hidden="true" />
          <Link href="/shop">فروشگاه</Link>
          <ChevronLeft aria-hidden="true" />
          <span aria-current="page">{category.title}</span>
        </div>
      </nav>

      <header className="section shop__head">
        <div className="wrap">
          <h1>{category.title}</h1>
          <p className="sec-head__lead">{category.tagline}</p>

          {/* پرش به زیرگروه‌ها.

              روی دسته‌ی گیم که شش زیرگروه دارد، این ردیف کاربر را
              مستقیم می‌برد پایین به همان چیزی که دنبالش است، بدون
              اسکرول کردن از کنار پانزده کارتِ بی‌ربط. */}
          {grouped && groups.length > 1 && (
            <div className="shop__rail catjump" role="group" aria-label="پرش به زیرگروه">
              {groups.map((g) => (
                <a key={g.id} href={`#g-${g.id}`} className="shop__chip">
                  {g.title}
                  <span className="deals__count num">
                    {g.items.length.toLocaleString('fa-IR')}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="wrap shop">
        {grouped ? (
          groups.map((g) => (
            <section key={g.id} id={`g-${g.id}`} className="catgroup">
              <div className="catgroup__head">
                <h2>{g.title}</h2>
                <span className="catgroup__n num">
                  {g.items.length.toLocaleString('fa-IR')} محصول
                </span>
              </div>

              <div className="shop__grid shop__grid--3">
                {g.items.map((p, i) => (
                  <ProductCard key={p.slug} product={p} style={{ ['--i' as string]: i }} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="shop__grid shop__grid--3">
            {products.map((p, i) => (
              <ProductCard key={p.slug} product={p} style={{ ['--i' as string]: i }} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
