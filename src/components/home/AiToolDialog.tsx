'use client';

import React from 'react';
import Link from 'next/link';
import { X, ChevronRight, ChevronLeft, ExternalLink, Check } from 'lucide-react';
import type { AiTool } from '../../data/aiLatest';
import { ServiceMark } from '../numbers/ServiceMark';
import { asset } from '../../lib/asset';

/**
 * پنجره‌ی جزئیاتِ یک ابزار هوش مصنوعی.
 *
 * کارت روی صفحه سه سطر جا دارد و بیشترش را نمی‌شود جا داد؛ این‌جا
 * جای همان چیزهایی است که روی کارت نمی‌گنجید — مدل‌ها، کاربردها،
 * و خبرها.
 *
 * ⚠ به‌جای بردن کاربر به صفحه‌ی دیگر، پنجره باز می‌شود.
 *
 * این سکشن جای **انتخاب** است نه جای خرید. کسی که هنوز بین
 * چهار ابزار مانده، اگر با هر کلیک از صفحه بیرون برود، برای
 * مقایسه باید مدام برگردد. پنجره او را همان‌جا نگه می‌دارد و
 * دکمه‌ی خرید سرِ جایش هست.
 *
 * ⚠ خبرها با پیمایشِ خودشان می‌آیند، نه همه با هم.
 *
 * پنج خبرِ پشت‌سرهم یعنی پنجره‌ای که باید اسکرول شود و هیچ‌کدام
 * دیده نمی‌شوند. یکی در هر لحظه، با دکمه‌ی جلو و عقب — همان
 * کاری که خودِ کاربر با انگشتش می‌کند.
 */

const focusable =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function AiToolDialog({
  tool,
  onClose,
}: {
  tool: AiTool;
  onClose: () => void;
}) {
  const [n, setN] = React.useState(0);
  const box = React.useRef<HTMLDivElement>(null);

  const news = tool.news ?? [];
  const item = news[n];

  /* ⚠ Escape و تله‌ی فوکوس با هم در یک اثر.
     جدا نوشتنشان یعنی دو شنونده روی همان رویداد و ترتیبِ
     حذفشان مهم می‌شد. */
  React.useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>(focusable)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !box.current) return;
      const list = [...box.current.querySelectorAll<HTMLElement>(focusable)];
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, [onClose]);

  return (
    <div className="aidlg" onClick={onClose} role="presentation">
      <div
        className="aidlg__box"
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aidlg-title"
        onClick={(e) => e.stopPropagation()}
        style={{ ['--tube' as string]: tool.tint }}
      >
        <header className="aidlg__head">
          <span className="aidlg__logo">
            {tool.logo ? (
              <img src={asset(`/brand/logos/${tool.logo}`)} alt="" />
            ) : (
              <ServiceMark id={tool.id} mark={tool.englishTitle.slice(0, 1)} />
            )}
          </span>
          <div>
            <h2 id="aidlg-title">{tool.title}</h2>
            <p>
              <span className="aidlg__en">{tool.englishTitle}</span>
              <span className="aidlg__dot">·</span>
              {tool.maker}
            </p>
          </div>
          <button type="button" className="aidlg__x" onClick={onClose} aria-label="بستن">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="aidlg__body">
          <p className="aidlg__lead">{tool.lead}</p>

          {tool.models && tool.models.length > 0 && (
            <section className="aidlg__sec">
              <h3>مدل‌ها و پلن‌ها</h3>
              <ul className="aidlg__models">
                {tool.models.map((m) => (
                  <li key={m.name}>
                    <b>{m.name}</b>
                    <span>{m.note}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tool.uses && tool.uses.length > 0 && (
            <section className="aidlg__sec">
              <h3>به چه دردی می‌خورد</h3>
              <ul className="aidlg__uses">
                {tool.uses.map((u) => (
                  <li key={u.title}>
                    <Check aria-hidden="true" />
                    <div>
                      <b>{u.title}</b>
                      <p>{u.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ⚠ اگر خبری نیست، این بخش اصلاً نمی‌آید.
              «خبری ثبت نشده» یعنی یک قابِ خالی که فقط جا می‌گیرد. */}
          {item && (
            <section className="aidlg__sec aidlg__news">
              <div className="aidlg__news-head">
                <h3>خبر</h3>
                {news.length > 1 && (
                  <div className="aidlg__nav">
                    <button
                      type="button"
                      onClick={() => setN((v) => (v - 1 + news.length) % news.length)}
                      aria-label="خبر قبلی"
                    >
                      <ChevronRight aria-hidden="true" />
                    </button>
                    <span className="num">
                      {(n + 1).toLocaleString('fa-IR')} از {news.length.toLocaleString('fa-IR')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setN((v) => (v + 1) % news.length)}
                      aria-label="خبر بعدی"
                    >
                      <ChevronLeft aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              {item.image && (
                <img className="aidlg__shot" src={asset(item.image)} alt="" />
              )}
              <b className="aidlg__news-title">{item.title}</b>
              <time className="aidlg__date">{item.date}</time>
              <p className="aidlg__news-body">{item.body}</p>
              {item.link && (
                <a
                  className="aidlg__link"
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.linkLabel ?? 'دیدن در اینستاگرام'}
                  <ExternalLink aria-hidden="true" />
                </a>
              )}
            </section>
          )}
        </div>

        <footer className="aidlg__foot">
          {tool.slug ? (
            <Link href={`/product/${tool.slug}`} className="btn btn--primary">
              خرید {tool.title}
            </Link>
          ) : (
            <Link href="/contact" className="btn btn--primary">
              وقتی رسید خبرم کن
            </Link>
          )}
          <Link href="/ai" className="btn btn--ghost">همه‌ی هوش مصنوعی‌ها</Link>
        </footer>
      </div>
    </div>
  );
}
