import type { Metadata } from 'next';
import { ClubTracks } from '../../components/club/ClubTracks';

export const metadata: Metadata = {
  title: 'نمایندگی فروش | فونیکس شاپ',
  description:
    'نمایندگی فروش فونیکس شاپ به‌زودی راه می‌افتد — اگر خودت مشتری داری، همراه ما باش.',
};

/**
 * نمایندگی فروش — فعلاً «به‌زودی».
 *
 * ⚠ پس‌زمینه همان ‎ClubTracks‎ باشگاه است، نه یک طرحِ تازه.
 *
 * دورِ اول محتوای خودِ صفحه را تار کردم و پیام را رویش گذاشتم.
 * کارفرما گفت منظورش آن نبود: **پس‌زمینه‌ی موشن‌دارِ صفحه‌ی
 * باشگاه** را می‌خواست — همان لوله‌های محو با گلوله‌های نورانی.
 *
 * و درست هم هست: این صفحه محتوایی ندارد که نشان دادنش ارزش
 * داشته باشد (فقط یک جمله است)، پس تار کردنِ یک صفحه‌ی کامل
 * پشتش فقط شلوغی بود. پس‌زمینه‌ی موشن‌دار همان حسِ «یک سیستمی
 * این پشت دارد کار می‌کند» را می‌دهد که برای «به‌زودی» دقیقاً
 * همان حرفِ درست است.
 *
 * محتوای ساخته‌شده‌ی نمایندگی پاک نشده — در
 * ‎components/reseller/ResellerContent.tsx‎ منتظر است.
 */
export default function ResellerPage() {
  return (
    /* ⚠ ‎clubpage‎ لازم است، نه تزئینی.

       ‎.ctracks‎ با ‎position: absolute; inset: 0‎ کشیده می‌شود و
       بلوکِ دربرگیرنده می‌خواهد. آن کلاس همان ‎position: relative‎
       و ‎isolation‎ را می‌دهد که در صفحه‌ی باشگاه هم می‌دهد. */
    <div className="clubpage soonbare">
      <ClubTracks />

      <div className="soonbare__card">
        <span className="soon__badge">نمایندگی فروش</span>
        <h1>خبرهای خوب تو راهه — با ما همراه باشید</h1>
      </div>
    </div>
  );
}
