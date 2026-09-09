import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PRODUCTS, getProductBySlug } from '../../../data/catalog';
import { absolute } from '../../../lib/site';
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

  const title = `خرید ${p.title} — ${p.englishTitle} | فونیکس شاپ`;

  /* ⚠ تصویرِ محصول، نه نشانِ فروشگاه.

     وقتی کسی لینکِ یک محصول را در تلگرام می‌فرستد، پیش‌نمایش
     باید همان محصول را نشان بدهد. اگر همه‌ی لینک‌ها یک نشانِ
     یکسان بدهند، گیرنده نمی‌فهمد کدامش کدام است. */
  const image = p.media.cover ?? p.media.thumbnail;

  return {
    title,
    description: p.shortDescription,
    openGraph: {
      type: 'website',
      title,
      description: p.shortDescription,
      url: absolute(`product/${p.slug}`),
      images: [{ url: image, alt: p.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: p.shortDescription,
      images: [image],
    },
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
