/* ============================================================
   شکلِ داده‌ای که ووکامرس برمی‌گرداند

   فقط فیلدهایی که واقعاً استفاده می‌کنیم. ووکامرس برای هر محصول
   حدود شصت فیلد می‌فرستد و تایپ کردنِ همه‌شان کاری است که هیچ‌وقت
   به‌روز نمی‌ماند.

   ⚠ همه‌چیز اختیاری فرض شده.

   نصب‌های مختلفِ ووکامرس فیلدهای متفاوتی دارند — افزونه‌ها اضافه
   می‌کنند، نسخه‌ها عوض می‌شوند، و یک محصولِ ساده اصلاً variations
   ندارد. اگر این‌جا چیزی را الزامی فرض کنیم، اولین محصولی که آن را
   نداشته باشد کلِ صفحه را می‌اندازد. مَپر جای خالی را پر می‌کند.
   ============================================================ */

export interface WooImage {
  id?: number;
  src?: string;
  alt?: string;
}

export interface WooTerm {
  id?: number;
  name?: string;
  slug?: string;
}

/** متای دلخواه — افزونه‌ی پل داده‌های فونیکس را همین‌جا می‌گذارد */
export interface WooMeta {
  key?: string;
  value?: unknown;
}

export interface WooProduct {
  id?: number;
  name?: string;
  slug?: string;
  type?: string;                 // simple | variable | ...
  status?: string;               // publish | draft | ...
  description?: string;
  short_description?: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  on_sale?: boolean;
  stock_status?: string;         // instock | outofstock | onbackorder
  stock_quantity?: number | null;
  manage_stock?: boolean;
  categories?: WooTerm[];
  tags?: WooTerm[];
  images?: WooImage[];
  attributes?: { id?: number; name?: string; options?: string[] }[];
  variations?: number[];
  average_rating?: string;
  rating_count?: number;
  total_sales?: number;
  date_created?: string;
  meta_data?: WooMeta[];
  /** افزونه‌ی پل این را به پاسخ اضافه می‌کند */
  phoenix?: PhoenixFields;
}

export interface WooVariation {
  id?: number;
  description?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  on_sale?: boolean;
  stock_status?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  attributes?: { name?: string; option?: string }[];
  meta_data?: WooMeta[];
  phoenix?: PhoenixVariantFields;
}

/* ---------------------------------------------------------------
   فیلدهایی که ووکامرس ندارد و افزونه‌ی ما اضافه می‌کند

   ووکامرس برای فروشگاهِ کالای فیزیکی ساخته شده. چیزهایی که این
   بازار لازم دارد — «برای فعال‌سازی چه چیزی از مشتری بگیریم»،
   «بعد از پرداخت چه اتفاقی می‌افتد»، «کدام پلن به درد کی می‌خورد»
   — در ووکامرس جایی ندارند و باید متا شوند.
--------------------------------------------------------------- */

export interface PhoenixFields {
  english_title?: string;
  brand?: string;
  fulfillment?: string;
  delivery_estimate?: string;
  warranty_label?: string;
  required_inputs?: {
    key?: string;
    label?: string;
    hint?: string;
    type?: string;
    pattern?: string;
    example?: string;
  }[];
  features?: string[];
  notes?: string[];
  faq?: { q?: string; a?: string }[];
  platforms?: string[];
  accent?: string;
  cover?: string;
  cutout?: string;
  badges?: string[];
}

export interface PhoenixVariantFields {
  label?: string;
  usd?: number;
  is_default?: boolean;
  guide?: { fit?: string; detail?: string };
}
