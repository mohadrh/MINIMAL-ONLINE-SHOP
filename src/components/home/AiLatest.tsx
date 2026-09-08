'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { AI_TOOLS, type AiTool } from '../../data/aiLatest';
import { AI_NEWS, NEWS_CHANNEL } from '../../data/aiNews';
import { AiToolDialog } from './AiToolDialog';
import { PRODUCTS, getLowestPrice } from '../../data/catalog';
import { ServiceMark } from '../numbers/ServiceMark';
import { asset } from '../../lib/asset';

/**
 * تازه‌های هوش مصنوعی — هفتاد به سی.
 *
 * ⚠ این یک سکشن است، نه دو تا.
 *
 * اول دو سکشنِ جدا بود: یکی شبکه‌ی ابزارها با سه دکمه‌ی دسته، و
 * یکی ریلِ اخبار. کنارِ هم هر دو یک کار می‌کردند — «این‌ها
 * هستند» — و صفحه دو بار همان حرف را می‌زد.
 *
 * حالا یکی است: ریلی از کارت‌های کوچک که می‌لغزند، و کنارش
 * دعوت به کانال. کارت فقط می‌گوید چه هست و به چه درد می‌خورد؛
 * هرچه بیشتر بخواهی، با زدنِ «جزئیات» در پنجره باز می‌شود.
 *
 * ⚠ خبرها هم داخلِ همین ریل می‌آیند، نه در سکشنِ دیگر.
 *
 * تا وقتی خبری ثبت نشده، ریل ابزارها را نشان می‌دهد. خبر که
 * اضافه شود جلوی ابزارها می‌نشیند — تازه‌ترین چیز باید اول
 * دیده شود.
 */

const fmt = (n: number) => n.toLocaleString('fa-IR');

export function AiLatest() {
  const [open, setOpen] = React.useState<AiTool | null>(null);
  const rail = React.useRef<HTMLDivElement>(null);

  const nudge = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('.ailt');
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step });
  };

  return (
    <section className="ailx reveal">
      <div className="wrap">
        <header className="ailx__head">
          <div>
            <h2>تازه‌های هوش مصنوعی</h2>
            <p className="ailx__lead">
              مدل‌های تازه و کاری که هرکدام راه می‌اندازند.
            </p>
          </div>
          <div className="ailx__tools">
            <Link href="/ai" className="ailx__all">
              مشاهده همه
              <ArrowLeft aria-hidden="true" />
            </Link>
            <div className="ailx__nav">
              <button type="button" onClick={() => nudge(-1)} aria-label="قبلی">
                <ChevronRight aria-hidden="true" />
              </button>
              <button type="button" onClick={() => nudge(1)} aria-label="بعدی">
                <ChevronLeft aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <div className="ailx__split">
          {/* ---------- هفتاد: ریلِ کارت‌ها ---------- */}
          <div className="ailx__rail" ref={rail}>
            {AI_TOOLS.map((t) => {
              const product = t.slug
                ? PRODUCTS.find((p) => p.slug === t.slug)
                : undefined;
              /* خبرِ همین ابزار، اگر ثبت شده باشد */
              const news = AI_NEWS.find((n) => n.tool === t.id);

              return (
                <button
                  key={t.id}
                  type="button"
                  className="ailt"
                  style={{ ['--tube' as string]: t.tint }}
                  onClick={() => setOpen(t)}
                  aria-label={`جزئیات ${t.title}`}
                >
                  <span className="ailt__logo">
                    {t.logo ? (
                      <img src={asset(`/brand/logos/${t.logo}`)} alt="" />
                    ) : (
                      <ServiceMark id={t.id} mark={t.englishTitle.slice(0, 1)} />
                    )}
                  </span>

                  <span className="ailt__body">
                    <span className="ailt__top">
                      <b>{t.title}</b>
                      {/* ⚠ نامِ مدل کنارِ نامِ سرویس.

                          کارفرما می‌خواست مدلِ تازه در متن دیده
                          شود. «کلاد» به کسی که دنبال است نمی‌گوید
                          کدام نسخه را می‌گیرد؛ «Claude Opus 4.5»
                          می‌گوید. */}
                      {t.model && <span className="ailt__model">{t.model}</span>}
                      {t.fresh && <span className="ailt__fresh">تازه</span>}
                    </span>
                    <span className="ailt__lead">
                      {news ? news.title : t.lead}
                    </span>
                    <span className="ailt__foot">
                      {product ? (
                        <span className="ailt__price">
                          از <b className="num">{fmt(getLowestPrice(product))}</b> تومان
                        </span>
                      ) : (
                        <span className="ailt__soon">به‌زودی</span>
                      )}
                      <span className="ailt__more">جزئیات</span>
                    </span>
                  </span>
                </button>
              );
            })}

            {/* کارتِ آخر: راهِ ادامه، همان‌جا که خواندن تمام می‌شود */}
            <Link href="/ai" className="ailt ailt--all">
              <span>مشاهده همه</span>
              <ArrowLeft aria-hidden="true" />
            </Link>
          </div>

          {/* ---------- سی: بنرِ کانال ---------- */}
          <aside className="ailx__promo">
            <span className="ailx__promo-ico" aria-hidden="true">
              <Send />
            </span>
            <b>کانال تلگرام فونیکس</b>
            <p>تخفیف‌ها و خبرِ مدل‌های تازه اول آن‌جا می‌آید، بعد روی سایت.</p>
            <a
              className="btn btn--primary"
              href={NEWS_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
            >
              عضو شدن در کانال
            </a>
            <span className="ailx__promo-at">@Ph0enix_Shop</span>
          </aside>
        </div>
      </div>

      {open && <AiToolDialog tool={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
