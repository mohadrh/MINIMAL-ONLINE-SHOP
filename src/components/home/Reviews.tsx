import React from 'react';
import { Star } from 'lucide-react';
import { REVIEWS } from '../../data/reviews';

/**
 * نظرات.
 *
 * کارت‌ها روی نوار ته‌رنگ‌دار می‌نشینند و خودشان ته‌رنگ عمیق‌تری
 * دارند — همان کاری که نمونه می‌کند. روی موبایل کشویی می‌شوند.
 */
export function Reviews() {
  return (
    <section className="section section--tint reveal">
      <div className="wrap">
        <div className="sec-head sec-head--center">
          <span className="sec-head__kicker">تجربه‌ی خریداران</span>
          <h2>مشتری‌ها چه می‌گویند</h2>
        </div>

        <div className="rail grid--3 reviews">
          {REVIEWS.slice(0, 3).map((r, idx) => (
            <figure key={r.id} className="review" style={{ ['--i' as string]: idx }}>
              <div className="review__stars" aria-label={`امتیاز ${r.rating} از ۵`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={i < r.rating ? 'is-on' : ''} aria-hidden="true" />
                ))}
              </div>
              <blockquote>{r.body}</blockquote>
              <figcaption>
                <b>{r.author}</b>
                <span className="xsmall muted">{r.role} · {r.product}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
