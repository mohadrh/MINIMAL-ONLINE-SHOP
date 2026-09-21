import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Clock, Calendar, ArrowLeft } from 'lucide-react';
import { ARTICLES, getArticleBySlug, getRelatedArticles } from '../../../data/articles';
import { tocOf } from '../../../data/articleKit';
import { getProductBySlug } from '../../../data/catalog';
import { asset } from '../../../lib/asset';
import { ArticleCard } from '../../../components/blog/ArticleCard';
import { ArticleBody } from '../../../components/blog/ArticleBody';
import { ArticleToc } from '../../../components/blog/ArticleToc';

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
  const toc = tocOf(a.body);

  /* محصولاتی که خودِ مقاله نام برده — همان‌ها در سایدبار هم
     می‌آیند، چون خواننده‌ای که وسطِ متن قانع شده نباید تا ته
     مقاله دنبالِ لینک بگردد. */
  const mentioned = a.body
    .filter((b): b is Extract<typeof b, { kind: 'product' }> => b.kind === 'product')
    .map((b) => getProductBySlug(b.slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

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
        <div className="wrap">

          {/* ---------- سرِ مقاله، تمام‌عرض ---------- */}
          <header className="post__head">
            <span className="pill" style={{ ['--pill' as string]: a.accent }}>
              {a.topicLabel}
            </span>
            <h1>{a.title}</h1>
            <p className="post__lead">{a.excerpt}</p>
            <p className="post__meta">
              <span><Clock aria-hidden="true" /> {fmt(a.readMinutes)} دقیقه مطالعه</span>
              <span><Calendar aria-hidden="true" /> {a.publishedAt}</span>
            </p>
          </header>

          {a.cover && (
            <div className={`post__cover ${a.coverWide ? '' : 'is-tall'}`}>
              <img src={asset(a.cover)} alt="" aria-hidden="true" />
            </div>
          )}

          {/* ---------- دو ستون ----------

              ⚠ سایدبار در DOM *بعد* از متن می‌آید و با ‎order‎
              کنارش می‌نشیند.

              صفحه‌خوان و کاربرِ کیبورد به ترتیبِ DOM حرکت
              می‌کنند. اگر سایدبار اول باشد، پیش از رسیدن به
              خودِ مقاله باید از فهرستِ مطالب و دو کارتِ محصول
              رد شوند — هر بار، در هر مقاله. */}
          <div className="post__grid">
            <div className="post__main">
              <ArticleBody body={a.body} />
            </div>

            <aside className="post__side">
              <div className="post__sticky">
                <ArticleToc items={toc} />

                {mentioned.length > 0 && (
                  <section className="sidebox">
                    <h2 className="sidebox__h">محصولاتِ این مقاله</h2>
                    <ul className="sidebox__list">
                      {mentioned.map((p) => (
                        <li key={p.slug}>
                          <Link href={`/product/${p.slug}`}>
                            {(p.media.logo ?? p.media.thumbnail) && (
                              <img
                                src={asset(p.media.logo ?? p.media.thumbnail)}
                                alt=""
                                aria-hidden="true"
                                loading="lazy"
                              />
                            )}
                            <span>{p.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="sidebox sidebox--cta">
                  <h2 className="sidebox__h">هنوز مطمئن نیستی؟</h2>
                  <p>
                    در چت بپرس — اگر جوابش را نداشت، به یک کارشناس وصلت می‌کند.
                  </p>
                  <Link href="/contact" className="btn btn--ghost btn--sm">
                    تماس با ما
                    <ArrowLeft aria-hidden="true" />
                  </Link>
                </section>
              </div>
            </aside>
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
