import type { Metadata } from 'next';
import { HELP_ARTICLES, HELP_CATEGORIES } from '../../data/helpArticles';
import { Faq } from '../../components/ui/Faq';

export const metadata: Metadata = {
  title: 'سوالات متداول | فونیکس شاپ',
  description: 'جواب پرتکرارترین سوال‌ها درباره‌ی خرید، تحویل و گارانتی.',
};

export default function FaqPage() {
  /* گروه‌بندی بر اساس دسته — یک فهرست چهل‌تایی بدون سرتیتر،
     پیدا کردن جواب را سخت‌تر می‌کند نه آسان‌تر. */
  const groups = Object.entries(HELP_CATEGORIES).map(([id, title]) => ({
    id,
    title,
    items: HELP_ARTICLES
      .filter((a) => a.category === id)
      .map((a) => ({
        q: a.title,
        /* گام‌ها اگر باشند به جواب چسبانده می‌شوند — راهنمای عملی
           بدون گام‌هایش نصفه است. */
        a: a.steps?.length
          ? a.answer + '\n\n' + a.steps.map((s, i) => (i + 1) + '. ' + s).join('\n')
          : a.answer,
      })),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <header className="section shop__head">
        <div className="wrap">
          <h1>سوالات متداول</h1>
          <p className="sec-head__lead">
            اگر جوابت اینجا نبود، از دستیار خرید بپرس یا تیکت بزن.
          </p>
        </div>
      </header>

      <div className="wrap faqpage">
        {groups.map((g) => (
          <section key={g.id} className="faqpage__group">
            <h2>{g.title}</h2>
            <Faq items={g.items} />
          </section>
        ))}
      </div>
    </>
  );
}
