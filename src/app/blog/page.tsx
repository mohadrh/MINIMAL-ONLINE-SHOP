import type { Metadata } from 'next';
import Link from 'next/link';
import { ARTICLES } from '../../data/articles';
import { asset } from '../../lib/asset';

export const metadata: Metadata = {
  title: 'مقالات و راهنماها | فونیکس شاپ',
  description: 'راهنمای خرید اشتراک، مقایسه‌ی سرویس‌ها و آموزش‌های کاربردی.',
};

const fmt = (n: number) => n.toLocaleString('fa-IR');

export default function BlogPage() {
  return (
    <>
      <header className="section shop__head">
        <div className="wrap">
          <h1>مقالات و راهنماها</h1>
          <p className="sec-head__lead">
            قبل از خرید بخوان. اینجا نوشته‌ایم کدام سرویس به چه کاری می‌آید.
          </p>
        </div>
      </header>

      <div className="wrap shop">
        <div className="shop__grid">
          {ARTICLES.map((a) => (
            <Link key={a.slug} href={`/blog/${a.slug}`} className="art">
              {a.cover && (
                <span className="art__cover">
                  <img src={asset(a.cover)} alt="" aria-hidden="true" loading="lazy" />
                </span>
              )}
              <span className="pill art__topic">{a.topicLabel}</span>
              <h3>{a.title}</h3>
              <p className="small muted">{a.excerpt}</p>
              <span className="xsmall muted art__meta num">
                {fmt(a.readMinutes)} دقیقه مطالعه
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
