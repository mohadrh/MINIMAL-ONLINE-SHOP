'use client';

import React from 'react';
import { Check, HelpCircle } from 'lucide-react';
import type { Product, Variant } from '../../data/catalog';

/**
 * انواع اکانت — راهنمای انتخاب پلن.
 *
 * برچسبِ پلن می‌گوید چه چیزی است، نه اینکه به دردِ چه کسی می‌خورد.
 * «Go» و «Plus» و «ظرفیت دو» برای کسی که تازه وارد این بازار شده
 * هیچ معنایی ندارند، و همین جایی است که خریدار یا تیکت می‌زند یا
 * صفحه را می‌بندد.
 *
 * پس هر پلن اینجا سه چیز دارد: قیمتش، یک جمله که می‌گوید مالِ
 * کیست، و چند جمله که می‌گوید دقیقاً چه می‌گیری. متن از خودِ
 * داده‌ی پلن می‌آید (variant.guide) نه از یک متنِ عمومی، چون
 * تفاوتِ Go و Plus با تفاوتِ ظرفیت دو و سه هیچ ربطی به هم ندارد.
 *
 * پلنی که راهنما ندارد اصلاً نشان داده نمی‌شود، و اگر هیچ‌کدام
 * نداشته باشند کل بخش نمی‌آید — بخشی با تیتر «کدام را انتخاب کنم»
 * و بدنه‌ی خالی، بدتر از نبودنش است.
 *
 * کلیک روی هر کارت، همان پلن را در بالای صفحه انتخاب می‌کند و
 * صفحه را می‌برد سرِ خرید. راهنمایی که خواننده را به تصمیم نرساند،
 * فقط متن است.
 */

const fmt = (n: number) => n.toLocaleString('fa-IR');

export function PlanGuide(
  { p, selected, onPick }: { p: Product; selected: string; onPick: (id: string) => void },
) {
  const withGuide = p.variants.filter((v): v is Variant & { guide: NonNullable<Variant['guide']> } =>
    Boolean(v.guide));

  if (withGuide.length === 0) return null;

  /* ارزان‌ترین و گران‌ترین، برای جمله‌ی راهنما */
  const prices = withGuide.map((v) => v.price);
  const cheapest = withGuide.find((v) => v.price === Math.min(...prices))!;

  return (
    <section className="pguide">
      <div className="sec-head sec-head--mid">
        <span className="sec-head__kicker">راهنمای انتخاب</span>
        <h2>انواع اکانت {p.title}</h2>
        <p className="sec-head__lead">
          {withGuide.length > 1
            ? `${fmt(withGuide.length)} پلن داریم و تفاوتشان از اسمشان معلوم نیست. اینجا نوشته‌ایم هر کدام مالِ کیست.`
            : 'اینجا نوشته‌ایم این پلن دقیقاً چه چیزی به تو می‌دهد.'}
        </p>
      </div>

      <div className="pguide__grid">
        {withGuide.map((v) => {
          const on = v.id === selected;
          const sold = v.stock !== null && v.stock <= 0;
          return (
            <article key={v.id} className={`pguide__card ${on ? 'is-on' : ''}`}>
              <header>
                <b>{v.label}</b>
                {v.price === cheapest.price && withGuide.length > 1 && (
                  <span className="pguide__tag">ارزان‌ترین</span>
                )}
              </header>

              <p className="pguide__fit">{v.guide.fit}</p>
              <p className="pguide__detail">{v.guide.detail}</p>

              <footer>
                <span className="pguide__price num">
                  {fmt(v.price)}
                  <small> تومان</small>
                </span>

                <button
                  type="button"
                  className={`btn btn--sm ${on ? 'btn--ghost' : 'btn--primary'}`}
                  disabled={sold}
                  onClick={() => onPick(v.id)}
                >
                  {sold ? 'ناموجود' : on ? <><Check aria-hidden="true" /> انتخاب شده</> : 'همین را می‌خواهم'}
                </button>
              </footer>
            </article>
          );
        })}
      </div>

      <p className="pguide__help">
        <HelpCircle aria-hidden="true" />
        هنوز مطمئن نیستی؟ ارزان‌ترین را بگیر و امتحان کن — «{cheapest.label}».
        اگر کم آمد، تفاوتش را بعداً پرداخت می‌کنی.
      </p>
    </section>
  );
}
