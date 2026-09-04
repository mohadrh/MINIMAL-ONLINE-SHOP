'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Send, Sparkles, X } from 'lucide-react';
import { QUICK, answerFor, quickAnswer, type Answer } from '../../lib/chatAnswers';

/**
 * چت آنلاین — که حالا دستیار خرید هم هست.
 *
 * دو چیزِ جدا بودند: یک «دستیار خرید» در نوبار که با فیلترِ دسته و
 * بودجه محصول پیشنهاد می‌داد، و یک چتِ پشتیبانی کنار صفحه. هر دو
 * یک کار می‌کردند — کمک به کسی که نمی‌داند چه بخرد یا مشکلی دارد —
 * و کاربر فرقشان را نمی‌دانست، پس هیچ‌کدام را نمی‌زد.
 *
 * حالا یکی است، و سه راه دارد:
 *   گزینه‌های آماده  — برای کسی که نمی‌داند چه بپرسد
 *   نوشتنِ آزاد      — که نام محصول را هم می‌فهمد
 *   لینک             — هر جواب، جایی برای رفتن می‌دهد
 *
 * ⚠ جواب‌ها از خودِ داده‌ی سایت ساخته می‌شوند (lib/chatAnswers)،
 * نه از متنِ ثابت. نسخه‌ی قبلی همین‌جا نوشته بود «زیر پانزده
 * دقیقه» در حالی که کلِ سایت شده بود «در اسرع وقت» — چت داشت
 * چیزی وعده می‌داد که سایت دیگر نمی‌گفت.
 */

type Msg = { id: number; from: 'user' | 'bot'; text: string; links?: Answer['links'] };

const GREETING =
  'سلام. هم برای انتخاب محصول کمکت می‌کنم، هم جواب سوال‌های سفارش و گارانتی را می‌دهم.'
  + '\n'
  + 'یکی از این‌ها را بزن، یا خودت بنویس.';

export function LiveChat() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: 'bot', text: GREETING }]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  /* نوبار همین چت را باز می‌کند.

     رویدادِ ساده به‌جای یک پرووایدرِ تازه: تنها چیزی که رد و بدل
     می‌شود «باز شو» است و برای همین، افزودن یک لایه‌ی حالت به کلِ
     برنامه صرف نمی‌کند. */
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('phoenix:chat-open', onOpen);
    return () => window.removeEventListener('phoenix:chat-open', onOpen);
  }, []);

  const push = (userText: string, a: Answer) => {
    setMsgs((m) => [
      ...m,
      { id: m.length, from: 'user', text: userText },
      { id: m.length + 1, from: 'bot', text: a.text, links: a.links },
    ]);
  };

  /* هر پیام تازه باید دیده شود، وگرنه کاربر باید دستی اسکرول کند */
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    push(text, answerFor(text));
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* دکمه‌ی گرد پایین صفحه.

          حلقه‌ی نبض فقط وقتی هست که چت بسته است — روی پنلِ باز
          فقط حواس‌پرتی می‌شود. */}
      <button
        type="button"
        className={`chatfab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'بستن چت' : 'چت آنلاین با پشتیبانی'}
      >
        {/* جرقه‌ها از دکمه‌ی دستیارِ حذف‌شده آمده‌اند — همان افکت،
            حالا روی تنها دکمه‌ای که مانده. */}
        {!open && (
          <>
            <span className="chatfab__pulse" aria-hidden="true" />
            <span className="chatfab__spark" style={{ ['--i' as string]: 0, top: '-6px', insetInlineStart: '14%' }} aria-hidden="true" />
            <span className="chatfab__spark" style={{ ['--i' as string]: 1, top: '-9px', insetInlineEnd: '18%' }} aria-hidden="true" />
            <span className="chatfab__spark chatfab__spark--sm" style={{ ['--i' as string]: 2, bottom: '-6px', insetInlineEnd: '10%' }} aria-hidden="true" />
            <span className="chatfab__spark chatfab__spark--sm" style={{ ['--i' as string]: 3, bottom: '-8px', insetInlineStart: '26%' }} aria-hidden="true" />
          </>
        )}
        {open ? <X aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
      </button>

      {open && (
        <div className="chat" role="dialog" aria-label="چت آنلاین">
          <div className="chat__head">
            <span className="chat__dot" aria-hidden="true" />
            <div>
              <b>دستیار و پشتیبانی فونیکس</b>
              <small>معمولاً زیر چند دقیقه جواب می‌دهیم</small>
            </div>
          </div>

          <div className="chat__body">
            {msgs.map((m) => (
              <div key={m.id} className={`chat__msg chat__msg--${m.from}`}>
                {m.text}
                {m.links && m.links.length > 0 && (
                  <span className="chat__links">
                    {m.links.map((l) => (
                      <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
                        {l.label}
                      </Link>
                    ))}
                  </span>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* گزینه‌های آماده.

              نوشتنِ سوال از انتخاب کردن سخت‌تر است، و کاربرِ چتِ
              فروشگاه معمولاً نمی‌داند اصلاً چه بپرسد. این‌ها همان
              چند سوالی‌اند که واقعاً پرسیده می‌شوند. */}
          <div className="chat__quick">
            {QUICK.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => push(q.label, quickAnswer(q.id))}
              >
                {q.label}
              </button>
            ))}
          </div>

          <form className="chat__form" onSubmit={send}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="سوالت را بنویس…"
              aria-label="متن پیام"
            />
            <button type="submit" aria-label="ارسال">
              <Send aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </>,
    document.body,
  );
}
