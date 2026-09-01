import type { Metadata } from 'next';
import Link from 'next/link';
import { CreditCard, KeyRound, MousePointerClick, ShieldCheck } from 'lucide-react';
import { HELP_ARTICLES } from '../../data/helpArticles';

export const metadata: Metadata = {
  title: 'راهنمای خرید | فونیکس شاپ',
  description:
    'از انتخاب پلن تا تحویل: هر قدمِ خرید از فونیکس شاپ، با جواب سوال‌هایی که وسط راه پیش می‌آید.',
};

/**
 * راهنمای خرید.
 *
 * سایت‌های مرجعِ این بازار هر کدام یک «راهنما» دارند و دلیلش روشن
 * است: خریدارِ اشتراک خارجی معمولاً بار اولش است. سوالش «کدام
 * ارزان‌تر است» نیست، «اصلاً چطور کار می‌کند» است.
 *
 * چهار قدم، و زیرشان سوال‌هایی که واقعاً وسط راه پیش می‌آید — از
 * همان مقاله‌های راهنما که در /faq هم هستند، نه متنِ تازه‌ای که
 * روزی با آن‌ها اختلاف پیدا کند.
 */
const STEPS = [
  {
    icon: MousePointerClick,
    t: 'محصول و پلن را انتخاب کن',
    d: 'در صفحه‌ی هر محصول، بخش «انواع اکانت» می‌گوید هر پلن مالِ کیست. اگر مطمئن نیستی، ارزان‌ترین را بگیر؛ بعداً می‌شود ارتقا داد.',
  },
  {
    icon: KeyRound,
    t: 'چیزی که لازم است را بده',
    d: 'بیشتر اشتراک‌ها فقط ایمیلِ حسابت را می‌خواهند تا روی همان فعال شود. رمز عبورت هیچ‌وقت لازم نیست — اگر جایی خواسته شد، از طرف ما نیست.',
  },
  {
    icon: CreditCard,
    t: 'با کارت بانکی خودت پرداخت کن',
    d: 'درگاه ریالی داخلی. قیمت پیش از پرداخت کامل معلوم است و هزینه‌ی پنهانی وجود ندارد.',
  },
  {
    icon: ShieldCheck,
    t: 'تحویل و پیگیری',
    d: 'کد پیگیری همان لحظه صادر می‌شود و وضعیت سفارش در پنل کاربری‌ات دیده می‌شود. اگر بیش از حد معمول طول کشید، از همان‌جا تیکت بزن.',
  },
];

export default function GuidePage() {
  const faq = HELP_ARTICLES.slice(0, 6);

  return (
    <>
      <header className="section club-head">
        <div className="wrap">
          <span className="sec-head__kicker">بار اولت است؟</span>
          <h1>راهنمای خرید</h1>
          <p className="club-head__lead">
            خرید اشتراک خارجی از ایران پیچیده به نظر می‌رسد، ولی از این طرف چهار قدم
            بیشتر نیست. اینجا نوشته‌ایم هر قدم چیست و وسطش چه سوالی پیش می‌آید.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <ol className="gsteps">
            {STEPS.map((s, i) => (
              <li key={s.t} className="gstep">
                <span className="gstep__n num">{(i + 1).toLocaleString('fa-IR')}</span>
                <span className="gstep__ico" aria-hidden="true"><s.icon /></span>
                <div>
                  <b>{s.t}</b>
                  <p>{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--tint">
        <div className="wrap abt">
          <div className="sec-head sec-head--mid">
            <span className="sec-head__kicker">وسط راه</span>
            <h2>سوال‌هایی که پیش می‌آید</h2>
          </div>

          {faq.map((a) => (
            <article key={a.id} className="abt__block">
              <h2>{a.title}</h2>
              <p>{a.answer}</p>
            </article>
          ))}

          <div className="club-cta">
            <Link href="/faq" className="btn btn--ghost">دیدن همه‌ی سوال‌ها</Link>
            <Link href="/shop" className="btn btn--primary">شروع از فروشگاه</Link>
          </div>
        </div>
      </section>
    </>
  );
}
