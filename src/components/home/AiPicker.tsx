'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { AI_MODELS, AI_COMPARE } from '../../data/aiModels';
import { getProductBySlug, getLowestPrice } from '../../data/catalog';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/**
 * کدام هوش مصنوعی به کارت می‌آید.
 *
 * دو ابزار که کار متفاوتی می‌کنند و هر دو لازم‌اند:
 *
 *   ستون انتخاب + پنل جزئیات — برای کسی که یک مدل را در نظر دارد
 *   و می‌خواهد بداند دقیقاً چه می‌کند.
 *
 *   جدول مقایسه — برای کسی که هنوز تصمیم نگرفته. یک ردیف را دنبال
 *   می‌کند و زودتر به جواب می‌رسد تا با خواندن چهار توضیح.
 *
 * قیمت از کاتالوگ خوانده می‌شود نه از داده‌ی این سکشن، پس هیچ‌وقت
 * با صفحه‌ی محصول ناهم‌خوان نمی‌شود. مدلی که در کاتالوگ نباشد،
 * قیمتش هم نشان داده نمی‌شود.
 */
export function AiPicker() {
  const [id, setId] = useState(AI_MODELS[0].id);
  const model = AI_MODELS.find((m) => m.id === id) ?? AI_MODELS[0];
  const product = getProductBySlug(model.slug);

  return (
    <section id="ai-picker" className="section section--tint aip reveal">
      <div className="wrap">
        <div className="sec-head sec-head--center">
          <span className="sec-head__kicker">راهنمای انتخاب</span>
          <h2>کدام هوش مصنوعی به کارت می‌آید؟</h2>
          <p className="sec-head__lead">
            چهار مدل، چهار کاربرد متفاوت. اگر مطمئن نیستی کدام را بخری،
            اول این را بخوان.
          </p>
        </div>

        <div className="aip__grid">
          {/* ---------- ستون انتخاب ---------- */}
          <div className="aip__list" role="tablist" aria-label="مدل‌های هوش مصنوعی">
            {AI_MODELS.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={m.id === id}
                className={`aip__opt ${m.id === id ? 'is-on' : ''}`}
                style={{ ['--accent' as string]: m.accent }}
                onClick={() => setId(m.id)}
              >
                <span className="aip__opt-icon" aria-hidden="true">{m.icon}</span>
                <span className="aip__opt-text">
                  <b>{m.name}</b>
                  <small>{m.badge}</small>
                </span>
              </button>
            ))}
          </div>

          {/* ---------- پنل جزئیات ---------- */}
          <div className="aip__panel" style={{ ['--accent' as string]: model.accent }}>
            <div className="aip__panel-head">
              <span className="aip__panel-icon" aria-hidden="true">{model.icon}</span>
              <div>
                <h3>{model.name}</h3>
                <span className="aip__sub">{model.subName}</span>
              </div>
              {product && (
                <span className="aip__price">
                  <span className="aip__price-label">از</span>
                  <b className="num">{fmt(getLowestPrice(product))}</b>
                  <span className="aip__price-label">تومان</span>
                </span>
              )}
            </div>

            <p className="aip__desc">{model.description}</p>

            <div className="aip__cols">
              <div>
                <h4 className="aip__h4">به چه کاری می‌آید</h4>
                <ul className="aip__uses">
                  {model.useCases.map((u) => (
                    <li key={u}>
                      <Check aria-hidden="true" />
                      {u}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="aip__h4">در یک نگاه</h4>
                <dl className="aip__bench">
                  {model.benchmarks.map((b) => (
                    <div key={b.label} className={b.strong ? 'is-strong' : ''}>
                      <dt>{b.label}</dt>
                      <dd>{b.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div className="aip__foot">
              <span className="aip__activation">{model.activationType}</span>
              {product && (
                <Link href={`/product/${product.slug}`} className="btn btn--primary btn--sm">
                  خرید {model.name}
                  <ArrowLeft aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ---------- جدول مقایسه ---------- */}
        <div className="aip__compare">
          <h3 className="aip__compare-title">مقایسه‌ی سریع</h3>
          <p className="aip__compare-lead">
            سطری که به کارت می‌آید را پیدا کن، ستونش جواب توست.
          </p>

          <div className="aip__table-wrap">
            <table className="aip__table">
              <thead>
                <tr>
                  <th scope="col">ویژگی</th>
                  {AI_MODELS.map((m) => (
                    <th key={m.id} scope="col" style={{ ['--accent' as string]: m.accent }}>
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AI_COMPARE.map((row) => (
                  <tr key={row.row}>
                    <th scope="row">{row.row}</th>
                    {AI_MODELS.map((m) => (
                      <td key={m.id}>{row.values[m.id] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
