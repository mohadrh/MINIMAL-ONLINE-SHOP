'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Headset, Send, X } from 'lucide-react';

/**
 * چت آنلاین — دکمه‌ی چسبیده به لبه‌ی صفحه.
 *
 * مثل نمونه: یک زبانه که همیشه کنار صفحه است و با کلیک پنل باز
 * می‌شود.
 *
 * فعلاً جواب‌ها از یک فهرست ثابت می‌آیند. وقتی بک‌اند وصل شد، فقط
 * تابع reply عوض می‌شود و بقیه‌ی کامپوننت دست نمی‌خورد — برای همین
 * پاسخ‌دهی از رابط جدا نگه داشته شده.
 */

type Msg = { id: number; from: 'user' | 'bot'; text: string };

const GREETING =
  'سلام. چه کمکی می‌توانم بکنم؟ درباره‌ی سفارش، تحویل یا گارانتی بپرس.';

/* پاسخ‌های آماده. کلیدواژه‌ها عمداً کوتاه‌اند تا با نوشتار محاوره‌ای
   هم بخوانند — کاربر «کی می‌رسه» می‌نویسد نه «زمان تحویل چقدر است». */
const CANNED: { k: string[]; a: string }[] = [
  { k: ['تحویل', 'کی', 'زمان', 'چقدر طول'],
    a: 'بیشتر سفارش‌ها زیر پانزده دقیقه تحویل می‌شوند. اگر سرویس ظرفیتی باشد ممکن است تا چند ساعت طول بکشد.' },
  { k: ['گارانتی', 'ضمانت', 'مرجوع'],
    a: 'تا آخرین روز اشتراک پشتیبانی می‌کنیم. اگر وسط دوره مشکلی پیش بیاید جایگزین می‌کنیم یا پول را برمی‌گردانیم.' },
  { k: ['رمز', 'پسورد', 'امن'],
    a: 'رمز عبورت را هیچ‌وقت نمی‌خواهیم. برای فعال‌سازی فقط ایمیل لازم است.' },
  { k: ['پرداخت', 'کارت', 'ریال'],
    a: 'پرداخت با کارت بانکی ایرانی و درگاه داخلی است. نه ارز لازم داری نه حساب خارجی.' },
  { k: ['شماره', 'مجازی'],
    a: 'شماره‌ی مجازی بیش از سی کشور داریم، برای ساخت حساب و تأیید هویت.' },
];

const reply = (text: string) => {
  const t = text.trim();
  const hit = CANNED.find((c) => c.k.some((k) => t.includes(k)));
  return (
    hit?.a ??
    'برای این یکی بهتر است پشتیبانی جواب بدهد. از طریق تلگرام یا صفحه‌ی پیگیری سفارش پیام بگذار، همان روز جواب می‌گیری.'
  );
};

export function LiveChat() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: 'bot', text: GREETING }]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

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
    setMsgs((m) => [
      ...m,
      { id: m.length, from: 'user', text },
      { id: m.length + 1, from: 'bot', text: reply(text) },
    ]);
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
        {!open && <span className="chatfab__pulse" aria-hidden="true" />}
        {open ? <X aria-hidden="true" /> : <Headset aria-hidden="true" />}
      </button>

      {open && (
        <div className="chat" role="dialog" aria-label="چت آنلاین">
          <div className="chat__head">
            <span className="chat__dot" aria-hidden="true" />
            <div>
              <b>پشتیبانی فونیکس</b>
              <small>معمولاً زیر چند دقیقه جواب می‌دهیم</small>
            </div>
          </div>

          <div className="chat__body">
            {msgs.map((m) => (
              <div key={m.id} className={`chat__msg chat__msg--${m.from}`}>
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
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
