import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CATEGORIES, getProductsByCategory, type CategorySlug } from '../../data/catalog';
import { CategoryView } from '../../components/shop/CategoryView';

/* هر دسته یک صفحه‌ی مستقل می‌شود.

   این همان چیزی است که در نمونه باعث می‌شود صفحه‌ی اول آرام بماند:
   عمق در درخت است، نه روی صفحه‌ی اصلی. */
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ category: string }> },
): Promise<Metadata> {
  const { category } = await params;
  const c = CATEGORIES.find((x) => x.slug === category);
  if (!c) return { title: 'دسته پیدا نشد | فونیکس شاپ' };
  return { title: `${c.title} | فونیکس شاپ`, description: c.tagline };
}

export default async function CategoryPage(
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.slug === category);
  if (!cat) notFound();

  return (
    <CategoryView
      category={cat}
      products={getProductsByCategory(cat.slug as CategorySlug)}
    />
  );
}
