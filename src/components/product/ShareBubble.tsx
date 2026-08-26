'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Link2, MessageCircle, Send, Share2, X } from 'lucide-react';

/**
 * اشتراک‌گذاری محصول.
 *
 * روی موبایل اول سراغ شیت خودِ سیستم می‌رود (navigator.share): آن‌جا
 * هر اپی که کاربر دارد فهرست می‌شود و ما لازم نیست حدس بزنیم کدام را
 * دارد. فقط اگر سیستم چنین چیزی نداشت — یعنی تقریباً همه‌ی
 * دسکتاپ‌ها — پاپ‌آپ خودمان باز می‌شود.
 *
 * تلگرام و واتساپ انتخاب شده‌اند چون لینک محصول در ایران عملاً از
 * همین دو جا دست‌به‌دست می‌شود. «کپی لینک» هم هست، برای هر جای
 * دیگری.
 */

interface Props {
  title: string;
  path: string;
  /** روی کارت کوچک است و روی صفحه‌ی محصول برچسب هم دارد */
  variant?: 'bubble' | 'wide';
}

export function ShareBubble({ title, path, variant = 'bubble' }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  /* آدرس فقط در مرورگر معلوم است — در رندر سمت سرور origin نداریم */
  const url = () =>
    (typeof window === 'undefined' ? '' : window.location.origin) + path;

  const text = `${title} — فونیکس شاپ`;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const start = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: text, url: url() });
        return;
      } catch {
        /* کاربر بست — پاپ‌آپ خودمان را هم باز نمی‌کنیم */
        return;
      }
    }
    setOpen((v) => !v);
  };

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.setTimeout(() => { setCopied(false); setOpen(false); }, 1400);
    } catch {
      setCopied(false);
    }
  };

  const link = (href: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(href, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  return (
    <div className="shb" ref={boxRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`bub ${variant === 'wide' ? 'bub--wide' : ''}`}
        data-tip="اشتراک‌گذاری"
        aria-label={`اشتراک‌گذاری ${title}`}
        aria-expanded={open}
        onClick={start}
      >
        <Share2 aria-hidden="true" />
        {variant === 'wide' && <span>اشتراک‌گذاری</span>}
      </button>

      {open && (
        <div className="shb__pop" role="menu">
          <div className="shb__head">
            <b>اشتراک‌گذاری</b>
            <button type="button" onClick={() => setOpen(false)} aria-label="بستن">
              <X aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            role="menuitem"
            className="shb__item shb__item--tg"
            onClick={link(`https://t.me/share/url?url=${encodeURIComponent(url())}&text=${encodeURIComponent(text)}`)}
          >
            <Send aria-hidden="true" /> تلگرام
          </button>

          <button
            type="button"
            role="menuitem"
            className="shb__item shb__item--wa"
            onClick={link(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url()}`)}`)}
          >
            <MessageCircle aria-hidden="true" /> واتساپ
          </button>

          <button type="button" role="menuitem" className="shb__item" onClick={copy}>
            {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
            {copied ? 'کپی شد' : 'کپی لینک'}
          </button>
        </div>
      )}
    </div>
  );
}
