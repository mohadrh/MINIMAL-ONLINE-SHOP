import React from 'react';
import Link from 'next/link';
import { Info, Lightbulb, TriangleAlert, Quote as QuoteIcon, ArrowLeft } from 'lucide-react';
import type { Block } from '../../data/articles';
import { anchorOf } from '../../data/articleKit';
import { getProductBySlug, getLowestPrice } from '../../data/catalog';
import { asset } from '../../lib/asset';

/**
 * رندرِ متنِ مقاله.
 *
 * ⚠ هیچ‌جا ‎dangerouslySetInnerHTML‎ نیست، و این محدودیتِ عمدیِ
 * کلِ سیستم است.
 *
 * متنِ مقاله روزی از وردپرس خواهد آمد. اگر آن متن به‌صورتِ
 * HTMLِ خام رندر شود، هر کسی که به پنل دسترسی پیدا کند
 * می‌تواند اسکریپت داخلِ مقاله بگذارد و روی مرورگرِ هر
 * بازدیدکننده اجرایش کند. با بلوکِ ساخت‌یافته، متن همیشه متن
 * است — حتی اگر منبعش آلوده باشد.
 *
 * ⚠ و لنگرها با همان شمارنده‌ی فهرستِ مطالب ساخته می‌شوند.
 *
 * اگر این‌جا ‎Set‎ی تازه بسازیم و فهرست هم یکی دیگر، دو تیترِ
 * هم‌نام در دو طرف شماره‌های متفاوت می‌گیرند و کلیک روی فهرست
 * جایی نمی‌رود. برای همین هر دو از ‎anchorOf‎ با یک ترتیب
 * استفاده می‌کنند.
 */
export function ArticleBody({ body }: { body: Block[] }) {
  const used = new Set<string>();

  return (
    <div className="post__body">
      {body.map((b, i) => <Piece key={i} b={b} used={used} />)}
    </div>
  );
}

function Piece({ b, used }: { b: Block; used: Set<string> }) {
  switch (b.kind) {
    case 'h':
      return <h2 id={anchorOf(b.text, used)}>{b.text}</h2>;

    case 'h3':
      return <h3 id={anchorOf(b.text, used)}>{b.text}</h3>;

    case 'p':
      return <p>{b.text}</p>;

    case 'ul':
      return <ul>{b.items.map((it, k) => <li key={k}>{it}</li>)}</ul>;

    case 'ol':
      return <ol>{b.items.map((it, k) => <li key={k}>{it}</li>)}</ol>;

    case 'note':
      return <Note text={b.text} tone={b.tone ?? 'info'} />;

    case 'quote':
      return (
        <blockquote className="post__quote">
          <QuoteIcon aria-hidden="true" />
          <p>{b.text}</p>
          {b.by && <cite>{b.by}</cite>}
        </blockquote>
      );

    case 'img':
      return (
        <figure className="post__fig">
          <img src={asset(b.src)} alt={b.caption ?? ''} loading="lazy" />
          {b.caption && <figcaption>{b.caption}</figcaption>}
        </figure>
      );

    /* ⚠ جدول در قابِ اسکرول‌دارِ خودش.
       جدولِ چهارستونی روی موبایل از عرضِ صفحه می‌زند بیرون و
       کلِ صفحه را افقی قابلِ اسکرول می‌کند — که یعنی متنِ
       مقاله هم می‌لغزد. این قاب فقط خودِ جدول را می‌لغزاند. */
    case 'table':
      return (
        <div className="post__tablewrap">
          <table className="post__table">
            <thead>
              <tr>{b.head.map((c, k) => <th key={k} scope="col">{c}</th>)}</tr>
            </thead>
            <tbody>
              {b.rows.map((row, k) => (
                <tr key={k}>
                  {row.map((c, j) => (
                    j === 0
                      ? <th key={j} scope="row">{c}</th>
                      : <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'steps':
      return (
        <ol className="post__steps">
          {b.items.map((s, k) => (
            <li key={k}>
              <b>{s.t}</b>
              <span>{s.d}</span>
            </li>
          ))}
        </ol>
      );

    case 'faq':
      return (
        <div className="post__faq">
          {b.items.map((f, k) => (
            <details key={k}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      );

    case 'product':
      return <ProductCta slug={b.slug} pitch={b.pitch} />;

    case 'hr':
      return <hr className="post__hr" />;

    default:
      return null;
  }
}

const TONES = {
  info: { Icon: Info,          label: 'نکته' },
  tip:  { Icon: Lightbulb,     label: 'پیشنهاد' },
  warn: { Icon: TriangleAlert, label: 'حواست باشد' },
} as const;

/**
 * ⚠ لحن با رنگ *و* آیکون *و* برچسب فرق می‌کند، نه فقط رنگ.
 *
 * کسی که رنگ را تشخیص نمی‌دهد باید بفهمد این «پیشنهاد» است یا
 * «حواست باشد» — و آن دو معنای کاملاً متفاوتی دارند.
 */
function Note({ text, tone }: { text: string; tone: 'info' | 'tip' | 'warn' }) {
  const { Icon, label } = TONES[tone];
  return (
    <aside className={`post__note is-${tone}`}>
      <span className="post__note-h">
        <Icon aria-hidden="true" />
        {label}
      </span>
      <span className="post__note-t">{text}</span>
    </aside>
  );
}

const fmt = (n: number) => n.toLocaleString('fa-IR');

/**
 * کارتِ محصول داخلِ متن.
 *
 * ⚠ فقط ‎slug‎ در مقاله ذخیره می‌شود — نه عنوان، نه قیمت.
 *
 * اگر قیمت در متنِ مقاله نوشته شود، روزِ بعدش غلط است. این‌جا
 * سرِ رندر از کاتالوگ خوانده می‌شود، پس مقاله هیچ‌وقت قیمتِ
 * کهنه نشان نمی‌دهد.
 *
 * ⚠ و اگر محصول حذف شده باشد، کارت اصلاً رندر نمی‌شود.
 *
 * لینکِ شکسته وسطِ مقاله از نبودنِ کارت بدتر است: خواننده
 * کلیک می‌کند و به ۴۰۴ می‌رسد، درست همان لحظه‌ای که قانع شده
 * بود بخرد.
 */
function ProductCta({ slug, pitch }: { slug: string; pitch?: string }) {
  const p = getProductBySlug(slug);
  if (!p) return null;

  const price = getLowestPrice(p);
  const img = p.media.logo ?? p.media.thumbnail;

  return (
    <aside className="post__cta">
      {img && (
        <span className="post__cta-ic">
          <img src={asset(img)} alt="" aria-hidden="true" loading="lazy" />
        </span>
      )}
      <span className="post__cta-txt">
        <b>{p.title}</b>
        {pitch && <small>{pitch}</small>}
      </span>
      <span className="post__cta-end">
        {price > 0 && <span className="post__cta-price num">از {fmt(price)} تومان</span>}
        <Link href={`/product/${p.slug}`} className="btn btn--primary btn--sm">
          دیدن محصول
          <ArrowLeft aria-hidden="true" />
        </Link>
      </span>
    </aside>
  );
}
