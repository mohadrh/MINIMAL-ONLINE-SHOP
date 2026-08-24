import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ARTICLES } from '../../data/articles';
import { asset } from '../../lib/asset';

const fmt = (n: number) => n.toLocaleString('fa-IR');

export function Articles() {
  const items = ARTICLES.slice(0, 3);

  return (
    <section className="section reveal">
      <div className="container">
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
          {items.map((a, idx) => (
            <Link key={a.slug} href={`/blog/${a.slug}`} className="art" style={{ ['--i' as string]: idx }}>
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
    </section>
  );
}
