/* ============================================================
   زیرگروه‌های داخل هر دسته

   دسته‌بندی سایت پنج تاست و همین درست است، ولی «دسته» برای مرور
   کافی نیست: هفده بازی زیر یک تیتر، یک دیوار است نه فهرست.

   الگو از سایت مرجع گرفته شده، جایی که هر دسته چند زیرگروهِ
   نام‌دار دارد و کاربر پیش از دیدن قیمت‌ها می‌فهمد کجای فهرست
   ایستاده.

   زیرگروه از برچسب‌های خودِ محصول حساب می‌شود، نه از فهرستی از
   اسلاگ‌ها. فهرست دستی با اضافه شدن هر محصول باید به‌روز شود و
   هیچ‌کس یادش نمی‌ماند؛ محصولی که از قلم بیفتد بی‌صدا از منو غیب
   می‌شود. با برچسب، محصول تازه خودش سرِ جایش می‌نشیند.

   ⚠ دو قاعده:
   ۱ ترتیب مهم است — اولین زیرگروهی که برچسبش بخورد برنده است، پس
     خاص‌ترین‌ها بالا می‌آیند.
   ۲ دسته‌ای که سه محصول دارد زیرگروه نمی‌خواهد. سرتیتر روی یک
     فهرستِ دوتایی، فقط ارتفاع می‌گیرد. برای همین طراحی و ادیت،
     شبکه‌های اجتماعی و آموزشی اینجا خالی‌اند و فهرستشان تخت
     می‌ماند تا وقتی که محصولاتشان بیشتر شود.
   ============================================================ */

import type { CategorySlug, Product } from './catalog';

export interface Group {
  id: string;
  title: string;
  /** اگر یکی از این برچسب‌ها روی محصول باشد، در این زیرگروه است */
  tags: string[];
}

export const GROUPS_BY_CATEGORY: Record<CategorySlug, Group[]> = {
  /* «نوشتن» اول می‌آید چون چت‌جی‌پی‌تی و کلاد هم برچسبِ coding
     دارند هم writing؛ کرسر فقط coding دارد و درست همان‌جا
     می‌نشیند که باید. */
  ai: [
    { id: 'chat',   title: 'گفتگو، نوشتن و تحقیق', tags: ['writing'] },
    { id: 'coding', title: 'کدنویسی',              tags: ['coding'] },
  ],

  creative: [],
  social: [],
  education: [],

  /* ترتیب اینجا نتیجه را عوض می‌کند و یک بار هم عوض کرد: بازی‌های
     ورزشی برچسبِ online دارند، پس وقتی «شوتر و آنلاین» بالاتر بود
     هر سه‌شان زیر شوتر می‌افتادند. خاص‌ترین برچسب باید اول بیاید. */
  gaming: [
    { id: 'sports',    title: 'ورزشی',                tags: ['sports'] },
    { id: 'horror',    title: 'ترسناک',               tags: ['horror'] },
    { id: 'shooter',   title: 'شوتر و آنلاین',        tags: ['shooter', 'online'] },
    { id: 'openworld', title: 'جهان‌باز و نقش‌آفرینی', tags: ['open-world', 'rpg'] },
    { id: 'story',     title: 'داستانی و ماجرایی',    tags: ['story-driven', 'action-adventure'] },
    { id: 'solo',      title: 'تک‌نفره',              tags: ['single-player', 'roguelike'] },
  ],
};

/**
 * زیرگروهِ یک محصول را برمی‌گرداند، یا null اگر هیچ‌کدام نخورد.
 *
 * محصولی که به هیچ زیرگروهی نخورد حذف نمی‌شود؛ زیر «بقیه»
 * می‌نشیند. حذفِ بی‌صدا بدترین حالت است — محصول در داده هست ولی
 * هیچ‌جای سایت دیده نمی‌شود.
 */
export function groupOf(p: Product): string | null {
  const tags = p.tags ?? [];
  for (const g of GROUPS_BY_CATEGORY[p.category] ?? []) {
    if (g.tags.some((t) => tags.includes(t))) return g.id;
  }
  return null;
}

export interface GroupWithItems extends Group {
  items: Product[];
}

/**
 * زیرگروه‌های یک دسته، فقط آن‌هایی که محصول دارند.
 *
 * اگر دسته‌ای اصلاً زیرگروه تعریف‌شده نداشته باشد، همه‌ی
 * محصولاتش در یک گروهِ بی‌نام برمی‌گردند — کامپوننت سرتیتر را
 * برای گروهِ بی‌نام نمی‌کشد، پس فهرست تخت می‌ماند.
 */
export function groupsWithItems(cat: CategorySlug, products: Product[]): GroupWithItems[] {
  const inCat = products.filter((p) => p.category === cat);
  if (!inCat.length) return [];

  const defined = GROUPS_BY_CATEGORY[cat] ?? [];
  if (!defined.length) return [{ id: '_flat', title: '', tags: [], items: inCat }];

  const groups: GroupWithItems[] = defined
    .map((g) => ({ ...g, items: inCat.filter((p) => groupOf(p) === g.id) }))
    .filter((g) => g.items.length > 0);

  const rest = inCat.filter((p) => !groupOf(p));
  if (rest.length) groups.push({ id: '_rest', title: 'بقیه', tags: [], items: rest });

  return groups;
}
