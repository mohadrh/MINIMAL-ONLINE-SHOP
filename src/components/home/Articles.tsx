import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ARTICLES } from '../../data/articles';
import { ArticleCard } from '../blog/ArticleCard';


export function Articles() {
  const items = ARTICLES.slice(0, 3);

  return (
    <section className="section arts reveal">
      <div className="wrap">
        <div className="sec-head arts__head">
          <div>
            <span className="sec-head__kicker">راهنما</span>
            <h2>آخرین مطالب</h2>
          </div>
          <Link href="/blog" className="btn btn--ghost btn--sm">
            همه‌ی مقالات
            <ArrowLeft aria-hidden="true" />
          </Link>
        </div>

        <div className="rail grid--3">
          {items.map((a, idx) => <ArticleCard key={a.slug} a={a} i={idx} />)}
        </div>
      </div>
    </section>
  );
}
