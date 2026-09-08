'use client';

import React from 'react';
import { ArrowLeft, ChevronRight, ChevronLeft, Send, ExternalLink } from 'lucide-react';
import { AI_NEWS, NEWS_CHANNEL } from '../../data/aiNews';
import { AI_TOOLS } from '../../data/aiLatest';
import { ServiceMark } from '../numbers/ServiceMark';
import { asset } from '../../lib/asset';

/**
 * اخبار هوش مصنوعی — هفتاد به سی.
 *
 * سمتِ پهن کارت‌های خبر است که کنارِ هم می‌لغزند، و سمتِ باریک
 * یک بنرِ ثابت برای کانال تلگرام.
 *
 * ⚠ چرا بنر کنارِ خبرهاست نه زیرشان.
 *
 * کسی که خبر می‌خواند همان کسی است که می‌خواهد خبرِ بعدی را هم
 * ببیند — یعنی دقیقاً مخاطبِ کانال. اگر بنر پایینِ سکشن باشد،
 * فقط کسی می‌بیندش که تا ته اسکرول کرده؛ کنارِ خبرها تمامِ مدت
 * در دید است بدون اینکه راهِ خواندن را ببندد.
 *
 * ⚠ لغزیدن با scroll-snap است نه با ترنسفورمِ جاوااسکریپتی.
 *
 * اسلایدرِ دستی یعنی بازنویسیِ چیزی که مرورگر خودش دارد: کشیدن با
 * انگشت، اینرسی، و پیمایش با کیبورد. دکمه‌ها فقط scrollBy صدا
 * می‌زنند و بقیه‌اش کارِ خودِ مرورگر است.
 */

export function AiNews() {
  const rail = React.useRef<HTMLDivElement>(null);

  /* ⚠ سکشن بدونِ خبر هم می‌آید، ولی ریلش فرق می‌کند.

     نسخه‌ی اول تا نبودنِ خبر اصلاً رندر نمی‌شد و نتیجه‌اش این
     بود که بنرِ کانال هم دیده نمی‌شد — در حالی که آن بنر به
     خبر وابسته نیست و کارش دعوت به کانال است.

     پس ساختار می‌ماند و فقط سمتِ پهن عوض می‌شود: تا وقتی خبری
     ثبت نشده، یک کارت می‌گوید تازه‌ترین‌ها کجاست. متنِ ساختگی
     نمی‌سازیم — چیزی که نداریم را ادعا نمی‌کنیم. */
  const empty = AI_NEWS.length === 0;

  const nudge = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('.ainw__card');
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    /* در راست‌به‌چپ، scrollLeft منفی می‌شود؛ dir را در جهت ضرب
       نمی‌کنیم چون scrollBy خودش با جهتِ نوشتار هماهنگ است. */
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className="ainw reveal">
      <div className="wrap">
        <header className="ainw__head">
          <div>
            <h2>اخبار هوش مصنوعی</h2>
            <p>تازه‌ترین مدل‌ها و قابلیت‌هایی که به کارت می‌آیند.</p>
          </div>
          <div className="ainw__nav" hidden={AI_NEWS.length === 0}>
            <button type="button" onClick={() => nudge(-1)} aria-label="خبر قبلی">
              <ChevronRight aria-hidden="true" />
            </button>
            <button type="button" onClick={() => nudge(1)} aria-label="خبر بعدی">
              <ChevronLeft aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="ainw__split">
          {/* ---------- هفتاد: ریلِ خبرها ---------- */}
          <div className={`ainw__rail ${empty ? 'is-empty' : ''}`} ref={rail}>
            {empty && (
              <p className="ainw__none">
                خبرِ تازه‌ای این‌جا ثبت نشده. مدل‌های جدید و قابلیت‌هایشان
                اول در کانال می‌آید.
              </p>
            )}
            {AI_NEWS.map((n) => {
              const tool = AI_TOOLS.find((t) => t.id === n.tool);
              return (
                <article
                  key={n.id}
                  className="ainw__card"
                  style={{ ['--tube' as string]: tool?.tint ?? 'var(--brand)' }}
                >
                  <div className="ainw__shot">
                    {n.image ? (
                      <img src={asset(n.image)} alt="" loading="lazy" />
                    ) : (
                      <span className="ainw__shot-mark" aria-hidden="true">
                        {tool?.logo ? (
                          <img src={asset(`/brand/logos/${tool.logo}`)} alt="" />
                        ) : (
                          <ServiceMark id={n.tool} mark={n.tool.slice(0, 1).toUpperCase()} />
                        )}
                      </span>
                    )}
                    {tool && <span className="ainw__tag">{tool.title}</span>}
                  </div>

                  <div className="ainw__body">
                    <time>{n.date}</time>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                  </div>

                  {n.link && (
                    <a
                      className="ainw__link"
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {n.linkLabel ?? 'دیدن ویدیو'}
                      <ExternalLink aria-hidden="true" />
                    </a>
                  )}
                </article>
              );
            })}

            {/* کارتِ آخر: راهِ رفتن به همه‌ی اخبار، همان‌جا که
                خواندن تمام می‌شود */}
            <a
              className="ainw__card ainw__card--all"
              href={NEWS_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>همه‌ی اخبار</span>
              <ArrowLeft aria-hidden="true" />
            </a>
          </div>

          {/* ---------- سی: بنرِ کانال ---------- */}
          <aside className="ainw__promo">
            <span className="ainw__promo-ico" aria-hidden="true">
              <Send />
            </span>
            <b>کانال تلگرام فونیکس</b>
            <p>
              تخفیف‌ها و خبرِ مدل‌های تازه اول آن‌جا می‌آید، بعد روی سایت.
            </p>
            <a
              className="btn btn--primary"
              href={NEWS_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
            >
              عضو شدن در کانال
            </a>
            <span className="ainw__promo-at">@Ph0enix_Shop</span>
          </aside>
        </div>
      </div>
    </section>
  );
}
