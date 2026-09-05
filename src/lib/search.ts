/* ============================================================
   جستجوی محصولات

   یک تابع، دو مصرف‌کننده: جستجوی نوار بالا و جعبه‌ی جستجوی صفحه‌ی
   اصلی.

   جدا شد چون همین منطق داشت بار دوم نوشته می‌شد. دو نسخه‌ی جدا از
   یک جستجو، همیشه یک روز از هم فاصله می‌گیرند — یکی برچسب‌ها را
   هم می‌گردد و دیگری نه — و کاربر نمی‌فهمد چرا یک عبارت در نوار
   بالا جواب می‌دهد و در صفحه‌ی اصلی نه.

   وقتی داده از ووکامرس بیاید، همین‌جا به جستجوی سمت سرور وصل
   می‌شود و هر دو با هم عوض می‌شوند.
   ============================================================ */

import { PRODUCTS, type Product } from '../data/catalog';
import { NUMBER_SERVICES, type NumberService } from '../data/numbers';

export interface SearchHits {
  products: Product[];
  numbers: NumberService[];
}

/** کمترین طولی که جستجو را راه می‌اندازد */
export const MIN_QUERY = 2;

export function searchAll(q: string, max = 6, maxNumbers = 3): SearchHits {
  const t = q.trim().toLowerCase();
  if (t.length < MIN_QUERY) return { products: [], numbers: [] };

  const products = PRODUCTS.filter(
    (p) => p.title.toLowerCase().includes(t)
      || p.englishTitle.toLowerCase().includes(t)
      || p.brand.toLowerCase().includes(t)
      /* برچسب‌ها هم گشته می‌شوند: کسی که «گیفت کارت» می‌نویسد
         باید همه‌شان را ببیند، نه فقط آن‌هایی که این عبارت در
         عنوانشان هست. */
      || (p.tags ?? []).some((tag) => tag.toLowerCase().includes(t)),
  ).slice(0, max);

  const numbers = NUMBER_SERVICES.filter(
    (s) => s.name.toLowerCase().includes(t) || s.id.includes(t),
  ).slice(0, maxNumbers);

  return { products, numbers };
}
