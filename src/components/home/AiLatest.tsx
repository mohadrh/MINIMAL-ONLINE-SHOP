'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Info } from 'lucide-react';
import { AI_TOOLS, AI_PURPOSES, type AiPurpose, type AiTool } from '../../data/aiLatest';
import { AiToolDialog } from './AiToolDialog';
import { PRODUCTS, getLowestPrice } from '../../data/catalog';
import { ServiceMark } from '../numbers/ServiceMark';
import { asset } from '../../lib/asset';

/**
 * تازه‌های هوش مصنوعی.
 *
 * ⚠ این سکشن با «کدام هوش مصنوعی به کارت می‌آید» یکی نیست.
 *
 * آن یکی سه مدلِ بزرگ را کنار هم می‌گذارد و ریز مقایسه می‌کند —
 * برای کسی که می‌داند دنبال چیست و بین دو گزینه مانده. این‌جا
 * برعکس است: کسی که هنوز نمی‌داند «هوش مصنوعی» یعنی چند دسته
 * ابزارِ کاملاً متفاوت.
 *
 * پس اول کار می‌آید، بعد برند. سه دکمه‌ی بالای سکشن دسته‌ها را
 * عوض می‌کنند: می‌خواهی بنویسی، تصویر بسازی، یا کد بزنی. تا وقتی
 * کاربر نداند کدام دسته کارِ اوست، نامِ ده سرویس فقط سردرگمش
 * می‌کند.
 *
 * ⚠ قیمت از کاتالوگ می‌آید، نه از این فایل.
 *
 * ابزاری که هنوز نمی‌فروشیم اسلاگ ندارد و به‌جای قیمت «به‌زودی»
 * می‌گیرد و دکمه‌اش به تماس می‌رود. عددِ حدسی روی کارت یعنی
 * مشتری روی قیمتی سفارش می‌دهد که ما پشتش نیستیم.
 */

const fmt = (n: number) => n.toLocaleString('fa-IR');

export function AiLatest() {
  const [tab, setTab] = React.useState<AiPurpose>('chat');
  const [open, setOpen] = React.useState<AiTool | null>(null);

  const shown = AI_TOOLS.filter((t) => t.purpose === tab);
  const active = AI_PURPOSES.find((p) => p.key === tab);

  return (
    <section className="ailx reveal">
      <div className="wrap">
        <header className="ailx__head">
          <div>
            <h2>تازه‌های هوش مصنوعی</h2>
            <p className="ailx__lead">
              هر کدام کارِ متفاوتی می‌کنند. اول بگو دنبال چه هستی، بعد
              انتخاب کن.
            </p>
          </div>
          <Link href="/ai" className="ailx__all">
            همه‌ی اشتراک‌ها
            <ArrowLeft aria-hidden="true" />
          </Link>
        </header>

        {/* سه کار، نه سه برند */}
        <div className="ailx__tabs" role="tablist" aria-label="دسته‌بندی بر اساس کاربرد">
          {AI_PURPOSES.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={p.key === tab}
              className={`ailx__tab ${p.key === tab ? 'is-on' : ''}`}
              onClick={() => setTab(p.key)}
            >
              <b>{p.label}</b>
              <span>{p.hint}</span>
            </button>
          ))}
        </div>

        <p className="sr-only" aria-live="polite">
          {active ? `${shown.length} ابزار در دسته‌ی ${active.label}` : ''}
        </p>

        <div className="ailx__grid">
          {shown.map((t) => {
            const product = t.slug
              ? PRODUCTS.find((p) => p.slug === t.slug)
              : undefined;
            const price = product ? getLowestPrice(product) : 0;

            return (
              <article
                key={t.id}
                className="ailt"
                style={{ ['--tube' as string]: t.tint }}
              >
                {/* نوارِ رنگیِ برند — تنها جایی که رنگِ سرویس
                    می‌آید، تا کارت‌ها با هم نجنگند */}
                <div className="ailt__band">
                  <span className="ailt__logo">
                    {t.logo ? (
                      <img src={asset(`/brand/logos/${t.logo}`)} alt="" />
                    ) : (
                      <ServiceMark id={t.id} mark={t.englishTitle.slice(0, 1)} />
                    )}
                  </span>
                  {t.fresh && <span className="ailt__fresh">تازه</span>}
                </div>

                <div className="ailt__body">
                  <h3>
                    {t.title}
                    <span className="ailt__en">{t.englishTitle}</span>
                  </h3>
                  <p className="ailt__lead">{t.lead}</p>

                  <ul className="ailt__does">
                    {t.does.map((d) => (
                      <li key={d}>
                        <Check aria-hidden="true" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                <footer className="ailt__foot">
                  <button
                    type="button"
                    className="ailt__more"
                    onClick={() => setOpen(t)}
                  >
                    <Info aria-hidden="true" />
                    جزئیات و خبرها
                  </button>
                  {product ? (
                    <>
                      <span className="ailt__price">
                        <span>از</span>
                        <b className="num">{fmt(price)}</b>
                        <span>تومان</span>
                      </span>
                      <Link href={`/product/${t.slug}`} className="btn btn--primary btn--sm">
                        دیدن پلن‌ها
                      </Link>
                    </>
                  ) : (
                    <>
                      <span className="ailt__soon">به‌زودی</span>
                      <Link href="/contact" className="btn btn--ghost btn--sm">
                        خبرم کن
                      </Link>
                    </>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      </div>

      {open && <AiToolDialog tool={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
