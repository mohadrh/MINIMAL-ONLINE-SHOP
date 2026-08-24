import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PRODUCTS, getProductBySlug } from '../../../data/catalog';
import { ProductView } from '../../../components/product/ProductView';

/* خروجی ایستا برای همه‌ی محصول‌ها.

   بدون این، مسیر پویا در حالت export ساخته نمی‌شود و لینک‌های
   کارت‌ها روی سایت زنده ۴۰۴ می‌دهند. */
export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const p = getProductBySlug(slug);
  if (!p) return { title: 'محصول پیدا نشد | فونیکس شاپ' };

  return {
    title: `خرید ${p.title} — ${p.englishTitle} | فونیکس شاپ`,
    description: p.shortDescription,
  };
}

export default async function ProductPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  return <ProductView product={product} />;
}
