'use client';

import React, { useMemo, useState } from 'react';
import { ARTICLES, type ArticleTopic } from '../../data/articles';
import { ArticleCard } from './ArticleCard';

/**
 * فهرست مقالات با دسته‌بندی.
 *
 * دسته‌ها از خودِ مقاله‌ها ساخته می‌شوند، نه از یک فهرست دستی. اگر
 * مقاله‌ای با موضوع تازه اضافه شود، تبش خودبه‌خود می‌آید؛ و دسته‌ای
 * که مقاله‌اش حذف شود، تبش می‌رود. فهرستِ دستی همیشه دیر یا زود از
 * داده عقب می‌افتد.
 *
 * تبِ «همه» اینجا هست — برخلاف تخفیف‌های صفحه‌ی اصلی. آنجا هر دسته
 * یک دنیای جدا بود و قاطی‌شدنشان به کسی کمک نمی‌کرد؛ اینجا خواننده
 * معمولاً نمی‌داند دنبال چه موضوعی است و مرور کردنِ همه، خودش کار
 * اصلی است.
 */

const ORDER: ArticleTopic[] = ['ai', 'gaming', 'creative', 'guide'];

export function BlogBrowser() {
  const [topic, setTopic] = useState<ArticleTopic | 'all'>('all');

  const tabs = useMemo(() => {
    const counts = new Map<ArticleTopic, { label: string; n: number }>();
    for (const a of ARTICLES) {
      const prev = counts.get(a.topic);
      counts.set(a.topic, { label: a.topicLabel, n: (prev?.n ?? 0) + 1 });
    }
    return ORDER
      .filter((t) => counts.has(t))
      .map((t) => ({ id: t, ...counts.get(t)! }));
  }, []);

  const shown = useMemo(
    () => (topic === 'all' ? ARTICLES : ARTICLES.filter((a) => a.topic === topic)),
    [topic],
  );

  return (
    <>
      <div className="shop__rail" role="group" aria-label="موضوع مقاله">
        <button
          className={`shop__chip ${topic === 'all' ? 'is-on' : ''}`}
          aria-pressed={topic === 'all'}
          onClick={() => setTopic('all')}
        >
          همه
          <span className="deals__count num">{ARTICLES.length.toLocaleString('fa-IR')}</span>
        </button>

        {tabs.map((t) => (
          <button
            key={t.id}
            className={`shop__chip ${topic === t.id ? 'is-on' : ''}`}
            aria-pressed={topic === t.id}
            onClick={() => setTopic(t.id)}
          >
            {t.label}
            <span className="deals__count num">{t.n.toLocaleString('fa-IR')}</span>
          </button>
        ))}
      </div>

      <div className="shop__grid">
        {shown.map((a) => <ArticleCard key={a.slug} a={a} />)}
      </div>
    </>
  );
}
