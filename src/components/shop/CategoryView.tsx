import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Category, Product } from '../../data/catalog';
import { ProductCard } from '../product/ProductCard';

/**
 * صفحه‌ی دسته.
 *
 * عمداً ساده است: مسیر راهنما، یک سربرگ، و شبکه‌ی محصولات. فیلتر
 * ندارد چون دسته خودش فیلتر است؛ اگر کسی فیلتر بیشتری می‌خواهد،
 * فروشگاه برای همان است.
 */
export function CategoryView(
  { category, products }: { category: Category; products: Product[] },
) {
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
        </div>
      </header>

      <div className="wrap shop">
        <div className="shop__grid">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    </>
  );
}
