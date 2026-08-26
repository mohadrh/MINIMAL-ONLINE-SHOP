import { Hero } from '../components/home/Hero';
import { HotDeals } from '../components/home/HotDeals';
import { QuickAccess } from '../components/home/QuickAccess';
import { AiPicker } from '../components/home/AiPicker';
import { WhyPhoenix } from '../components/home/WhyPhoenix';
import { ProductRow, bestOf, newest } from '../components/home/ProductRow';
import { Reviews } from '../components/home/Reviews';
import { Articles } from '../components/home/Articles';
import { CallToAction } from '../components/home/CallToAction';
import { BrandRow } from '../components/home/BrandRow';

/**
 * صفحه‌ی اصلی.
 *
 * ترتیب سکشن‌ها یک قاعده دارد: **بین هر دو سکشن توضیحی، یک سکشن
 * فروش.**
 *
 * چیدمان قبلی این را نداشت و اندازه‌گیری‌اش تلخ بود: صفحه ۱۱٬۰۰۲
 * پیکسل بود — تقریباً شانزده صفحه اسکرول — و در تمام آن مسیر فقط
 * چهار محصول قابل خرید وجود داشت. نُه سکشن از دوازده‌تا فقط توضیح
 * می‌دادند، و «چطور کار می‌کند» و «چرا امن است» و «آمار» پشت سر هم
 * می‌آمدند: سه صفحه و نیم توضیحِ پیوسته بدون یک محصول.
 *
 * حالا سه ردیف محصول بینشان نشسته و آن سه سکشن توضیحی هم در یک
 * سکشن ادغام شده‌اند. نتیجه: از چهار محصول به شانزده، و ارتفاع کل
 * کمتر — که مهم است، چون کارفرما نسخه‌ی یک را به‌خاطر شلوغی رد کرد.
 *
 * تناوب پس‌زمینه — سفید، ته‌رنگ، سفید — کار جدا کردن را می‌کند.
 * خط جداکننده لازم نیست و نمی‌گذاریم.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <HotDeals />
      <QuickAccess />

      {/* فروش — بعد از دو سکشنِ ورودی */}
      <ProductRow
        title="پرفروش‌های هوش مصنوعی"
        lead="آنچه بیشتر از همه سفارش داده می‌شود، روی حساب خودت فعال می‌شود."
        href="/shop"
        hrefLabel="همه‌ی هوش مصنوعی‌ها"
        pick={bestOf(['ai'])}
        tone="tint"
      />

      <AiPicker />

      {/* فروش — بعد از مقایسه، وقتی تصمیم گرفته شده */}
      <ProductRow
        title="پرفروش‌های گیم"
        lead="اکانت قانونی، با گارانتی مادام‌العمر فونیکس."
        href="/shop"
        hrefLabel="همه‌ی بازی‌ها"
        pick={bestOf(['gaming'])}
      />

      {/* سه سکشن توضیحی که قبلاً جدا بودند، حالا یکی */}
      <WhyPhoenix />

      {/* فروش — قبل از اینکه صفحه به بخش اجتماعی برود */}
      <ProductRow
        title="تازه‌رسیده‌ها"
        lead="آخرین چیزهایی که به فروشگاه اضافه شدند."
        href="/shop"
        hrefLabel="دیدن فروشگاه"
        pick={newest()}
        tone="tint"
      />

      <Reviews />
      <Articles />
      <CallToAction />
      <BrandRow />
    </>
  );
}
