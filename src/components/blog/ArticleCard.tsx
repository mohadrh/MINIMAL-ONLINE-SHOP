import React from 'react';
import Link from 'next/link';
import { asset } from '../../lib/asset';
import type { Article } from '../../data/articles';

/**
 * کارت مقاله.
 *
 * سه جا رندر می‌شد — فهرست مقالات، مقالات مرتبط در صفحه‌ی مقاله، و
 * سکشن صفحه‌ی اصلی — و هر سه یک نسخه‌ی کپی‌شده داشتند. وقتی کاور
 * ایراد داشت، باید سه جا درست می‌شد. حالا یکی است.
 *
 * رنگِ مقاله روی خودِ کارت می‌نشیند (--art-accent) و پس‌زمینه‌ی
 * کاور از همان ساخته می‌شود، پس تصویرِ مربع روی زمینه‌ی خالی
 * شناور نمی‌ماند.
 */
export function ArticleCard({ a, i }: { a: Article; i?: number }) {
  const fmt = (n: number) => n.toLocaleString('fa-IR');

  return (
    <Link
      href={`/blog/${a.slug}`}
      className="art"
      style={{ ['--art-accent' as string]: a.accent, ['--i' as string]: i ?? 0 }}
    >
      {a.cover && (
        <span className="art__cover">
          <img
            src={asset(a.cover)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            data-wide={a.coverWide ? '1' : undefined}
          />
        </span>
      )}
      <span className="pill art__topic">{a.topicLabel}</span>
      <h3>{a.title}</h3>
      <p className="small muted">{a.excerpt}</p>
      <span className="xsmall muted art__meta num">
        {fmt(a.readMinutes)} دقیقه مطالعه
      </span>
    </Link>
  );
}
