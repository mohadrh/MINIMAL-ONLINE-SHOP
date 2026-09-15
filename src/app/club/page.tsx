import type { Metadata } from 'next';
import Link from 'next/link';
import { ClubView } from '../../components/club/ClubView';

export const metadata: Metadata = {
  title: 'باشگاه مشتریان | فونیکس شاپ',
  description:
    'باشگاه مشتریان فونیکس شاپ به‌زودی راه می‌افتد — هر خرید امتیاز دارد و هر پله کش‌بک.',
};

/**
 * باشگاه مشتریان — فعلاً «به‌زودی».
 *
 * ⚠ خودِ صفحه پاک نشده و پشتِ پیام می‌ماند.
 *
 * کارفرما خواست استایلِ صفحه حفظ شود و رویش «به‌زودی» بنشیند.
 * دو دلیل دارد که درست است: کارِ ساخته‌شده از دست نمی‌رود و با
 * برداشتنِ همین چند خط دوباره زنده می‌شود، و بازدیدکننده هم
 * می‌بیند که چه چیزی دارد می‌آید — یک صفحه‌ی خالیِ «به‌زودی»
 * هیچ‌کدام را نمی‌گوید.
 *
 * ⚠ ‎inert‎ لازم است، نه فقط ‎pointer-events: none‎.
 *
 * بدونش محتوای پشتِ پرده با کلیدِ Tab قابل رسیدن می‌ماند: کاربرِ
 * کیبورد داخلِ ماشین‌حسابی می‌افتاد که نه می‌بیندش نه کار
 * می‌کند. ‎inert‎ هم فوکوس را می‌بندد هم از درختِ دسترس‌پذیری
 * بیرونش می‌کشد.
 */
export default function ClubPage() {
  return (
    <div className="soon">
      <div className="soon__bg" inert>
        <ClubView />
      </div>

      <div className="soon__front">
        <div className="soon__card">
          <span className="soon__badge">باشگاه مشتریان</span>
          <h1>به‌زودی با خبرهای خوبی برمی‌گردیم</h1>
          <p>
            داریم پله‌ها، امتیازها و کش‌بک را نهایی می‌کنیم. تا آن روز خریدت
            ثبت می‌شود و امتیازش سرِ جایش می‌ماند — چیزی از دست نمی‌رود.
          </p>
          <div className="soon__acts">
            <Link href="/shop" className="btn btn--primary">
              دیدن محصولات
            </Link>
            <Link href="/contact" className="btn btn--ghost">
              تماس با ما
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
