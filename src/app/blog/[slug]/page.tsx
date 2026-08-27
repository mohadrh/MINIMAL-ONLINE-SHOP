import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { ARTICLES, getArticleBySlug, getRelatedArticles } from '../../../data/articles';
import { asset } from '../../../lib/asset';
import { ArticleCard } from '../../../components/blog/ArticleCard';

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticleBySlug(slug);
  if (!a) return { title: 'مقاله پیدا نشد | فونیکس شاپ' };
  return { title: `${a.title} | فونیکس شاپ`, description: a.excerpt };
}

const fmt = (n: number) => n.toLocaleString('fa-IR');

export default async function ArticlePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const a = getArticleBySlug(slug);
  if (!a) notFound();

  const related = getRelatedArticles(slug, 3);

  return (
    <>
      <nav className="crumb" aria-label="مسیر">
        <div className="wrap crumb__row">
          <Link href="/">خانه</Link>
          <ChevronLeft aria-hidden="true" />
          <Link href="/blog">مقالات</Link>
          <ChevronLeft aria-hidden="true" />
          <span aria-current="page">{a.title}</span>
        </div>
      </nav>

      <article className="section post">
        <div className="wrap post__inner">
          <span className="pill">{a.topicLabel}</span>
          <h1>{a.title}</h1>
          <p className="post__meta num">{fmt(a.readMinutes)} دقیقه مطالعه</p>

          {a.cover && (
            <div className="post__cover">
              <img src={asset(a.cover)} alt="" aria-hidden="true" />
            </div>
          )}

          <div className="post__body">
            {a.body.map((b, i) => {
              if (b.kind === 'h') return <h2 key={i}>{b.text}</h2>;
              if (b.kind === 'ul') {
                return (
                  <ul key={i}>
                    {b.items.map((it) => <li key={it}>{it}</li>)}
                  </ul>
                );
              }
              if (b.kind === 'note') return <aside key={i} className="post__note">{b.text}</aside>;
              return <p key={i}>{b.text}</p>;
            })}
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="section section--tint">
          <div className="wrap">
            <div className="sec-head"><h2>مطالب مرتبط</h2></div>
            <div className="rail grid--3">
              {related.map((r, i) => <ArticleCard key={r.slug} a={r} i={i} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
