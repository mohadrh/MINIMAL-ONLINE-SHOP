import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Headphones, Percent, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'نمایندگی فروش | فونیکس شاپ',
  description:
    'اگر خودت مشتری داری، می‌توانی محصولات فونیکس شاپ را با قیمت نمایندگی بفروشی.',
};

/**
 * نمایندگی فروش.
 *
 * سایت مرجع این را در منوی اصلی‌اش دارد و بی‌دلیل نیست: بخش بزرگی
 * از فروشِ این بازار از طریق واسطه‌های کوچک انجام می‌شود — کسی که
 * کانال تلگرامی دارد یا در یک گیم‌نت کار می‌کند.
 *
 * ⚠ ارقام پله‌ها و شرایط، تصمیم کسب‌وکار است نه فنی. اعدادِ اینجا
 * پیشنهادِ اولیه‌اند و باید با کارفرما تأیید شوند؛ فرم درخواست هم
 * فعلاً به تیکت وصل است تا وقتی فرآیند واقعی مشخص شود.
 */
const PERKS = [
  { icon: Percent, t: 'قیمت نمایندگی', d: 'بین ده تا بیست درصد زیر قیمت سایت، بسته به حجم ماهانه.' },
  { icon: Zap, t: 'تحویل خودکار', d: 'سفارش‌هایت مثل بقیه در صف سیستم می‌روند، بدون هماهنگی دستی.' },
  { icon: Headphones, t: 'پشتیبانی جدا', d: 'کانال پشتیبانی مخصوص نماینده‌ها، بدون صف عمومی.' },
];

const TIERS = [
  { t: 'شروع', n: 'زیر ده سفارش در ماه', off: '۱۰٪' },
  { t: 'فعال', n: 'ده تا پنجاه سفارش در ماه', off: '۱۵٪' },
  { t: 'عمده', n: 'بیش از پنجاه سفارش در ماه', off: '۲۰٪' },
];

export default function ResellerPage() {
  return (
    <>
      <header className="section club-head">
        <div className="wrap">
          <span className="sec-head__kicker">همکاری در فروش</span>
          <h1>نمایندگی فروش</h1>
          <p className="club-head__lead">
            اگر کانال، گیم‌نت یا مشتری‌های خودت را داری، لازم نیست هر سفارش را دستی
            هماهنگ کنی. با حساب نمایندگی، قیمت پایین‌تر می‌گیری و سفارش‌هایت خودکار
            انجام می‌شوند.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <div className="abt__ways">
            {PERKS.map(({ icon: Icon, t, d }) => (
              <div key={t} className="abt__way">
                <span className="abt__way-ico" aria-hidden="true"><Icon /></span>
                <b>{t}</b>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="wrap">
          <div className="sec-head sec-head--mid">
            <span className="sec-head__kicker">سه پله</span>
            <h2>تخفیف با حجم بیشتر می‌شود</h2>
          </div>

          <div className="tiers">
            {TIERS.map((x) => (
              <article key={x.t} className="tier" style={{ ['--tube' as string]: '#4a7cf7' }}>
                <header><b>{x.t}</b></header>
                <p className="tier__from">{x.n}</p>
                <p className="tier__cash num">{x.off}<span>تخفیف</span></p>
              </article>
            ))}
          </div>

          <div className="club-cta">
            <Link href="/account" className="btn btn--primary">درخواست نمایندگی</Link>
            <Link href="/about" className="btn btn--ghost">سوالی داری؟</Link>
          </div>

          <p className="pguide__help">
            <Check aria-hidden="true" />
            درخواستت از طریق تیکت ثبت می‌شود و معمولاً ظرف یک روز کاری جواب می‌گیرد.
          </p>
        </div>
      </section>
    </>
  );
}
