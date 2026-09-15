'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MessageCircle, Send, X } from 'lucide-react';
import {
  GREETING, START, freeText, pickAgent, run,
  type Answer, type ChatState,
} from '../../lib/chatAnswers';

/**
 * چت آنلاین — پشتیبانی، پیگیری سفارش و دستیارِ خرید، در یک پنجره.
 *
 * دو چیزِ جدا بودند: یک «دستیار خرید» در نوبار که با فیلترِ دسته و
 * بودجه محصول پیشنهاد می‌داد، و یک چتِ پشتیبانی کنار صفحه. هر دو
 * یک کار می‌کردند — کمک به کسی که نمی‌داند چه بخرد یا مشکلی دارد —
 * و کاربر فرقشان را نمی‌دانست، پس هیچ‌کدام را نمی‌زد.
 *
 * ⚠ گزینه‌های پیشنهادی داخلِ خودِ گفتگو هستند، نه در نواری زیرِ آن.
 *
 * قبلاً یک ردیفِ ثابت بالای کادرِ نوشتن بود با هشت دکمه‌ی هم‌سطح.
 * دو عیب داشت: آن هشت‌تا هیچ ترتیبی نداشتند — نه معلوم بود کدام
 * برای خرید است کدام برای پشتیبانی — و ردیف بخشی از گفتگو نبود،
 * پس حتی وقتی کاربر وسطِ یک سوالِ دیگر بود همان هشت‌تا را نشان
 * می‌داد.
 *
 * حالا هر پیامِ ربات گزینه‌های خودش را همراه دارد، پس در هر لحظه
 * فقط چیزی پیشنهاد می‌شود که در آن لحظه معنی دارد.
 *
 * ⚠ این کامپوننت هیچ منطقی ندارد.
 *
 * تمامِ تصمیم‌ها در ‎lib/chatAnswers‎ است و این‌جا فقط سه کار
 * می‌شود: نمایشِ پیام‌ها، فرستادنِ کنش به ‎run‎، و نگه‌داشتنِ
 * حالتی که آن فایل برمی‌گرداند. یعنی افزودنِ یک مسیرِ تازه به چت
 * هیچ تغییری این‌جا لازم ندارد.
 */

type Msg = {
  id: number;
  from: 'user' | 'bot';
  text: string;
  links?: Answer['links'];
  chips?: Answer['chips'];
};

/** خلاصه‌ی وضعیتِ کاربر، برای وقتی سوال به پشتیبانی می‌رود.
 *
 *  ⚠ فقط چیزی که خودِ کاربر دارد می‌فرستد، نه بیشتر.
 *
 *  سبد و آدرسِ صفحه به پشتیبانی می‌گوید طرف کجای کار است — همان
 *  دو چیزی که بدونشان اولین جوابِ پشتیبانی «چه محصولی؟» است.
 *  چیزی فراتر از این جمع نمی‌شود: نه ایمیل، نه شماره، نه تاریخچه.
 *  و چون پیام از تلگرامِ خودِ کاربر می‌رود، خودش قبلِ ارسال
 *  می‌بیند چه چیزی دارد می‌فرستد.
 *
 *  حافظه‌ی مرورگر می‌تواند خراب یا بسته باشد (پنجره‌ی ناشناس)، پس
 *  هر خواندنی داخل try است و نبودنش فقط یعنی خلاصه کوتاه‌تر
 *  می‌شود. */
function chatContext(): string {
  const bits: string[] = [];

  try {
    const raw = window.localStorage.getItem('phoenix.cart.v1');
    const lines = raw ? JSON.parse(raw) : [];
    if (Array.isArray(lines) && lines.length) {
      bits.push(`سبد خرید: ${lines.length} قلم`);
    }
  } catch {
    /* حافظه در دسترس نیست — خلاصه بدونِ سبد می‌رود */
  }

  try {
    bits.push(`صفحه: ${window.location.pathname}`);
  } catch {
    /* در محیطی بدون window اصلاً صدا زده نمی‌شود */
  }

  return bits.join(' | ');
}

export function LiveChat() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState('');
  /** حالتی که ربات بین دو پیام یادش می‌ماند */
  const [state, setState] = useState<ChatState>(START);

  /* ⚠ کارشناس یک‌بار انتخاب می‌شود و تا آخرِ گفتگو همان می‌ماند.

     دو دلیل که چرا این‌جا و نه داخلِ ماژول:

     یک، اگر قرعه موقعِ رندرِ سرور بخورد، مرورگر قرعه‌ی دیگری
     می‌اندازد و ری‌اکت هنگامِ هیدریشن اختلاف را خطا می‌دهد.
     ‎useState‎ با تابعِ سازنده فقط در مرورگر اجرا می‌شود.

     دو، نام باید ثابت بماند: کسی که به «سارا محمدی» وصل شده،
     پیامِ بعدی نباید ببیند «امیر رضایی». */
  const [agent] = useState(pickAgent);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 0, from: 'bot', text: GREETING.text, chips: GREETING.chips },
  ]);
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

  /* ⚠ گزینه‌های پیامِ قبلی پاک می‌شوند، نه اینکه بمانند.

     اگر بمانند، صفحه پر می‌شود از دکمه‌هایی که مربوط به سه سوالِ
     پیش‌اند و زدنشان کاربر را به عقب پرت می‌کند. فقط آخرین
     پیامِ ربات گزینه دارد — مثل هر گفتگوی واقعی که در آن فقط
     سوالِ آخر منتظرِ جواب است. */
  const push = (userText: string, a: Answer) => {
    setMsgs((m) => [
      ...m.map((x) => (x.chips ? { ...x, chips: undefined } : x)),
      { id: m.length, from: 'user', text: userText },
      { id: m.length + 1, from: 'bot', text: a.text, links: a.links, chips: a.chips },
    ]);
    setState(a.next ?? START);
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
    /* اطلاعاتِ همراه — تا اگر به تلگرام رفت، پشتیبانی بداند
       طرف کیست و چه در سبدش دارد. */
    push(text, freeText(text, state, agent, chatContext()));
  };

  /** آخرین چیزی که ربات پرسیده — راهنمای کادرِ نوشتن از همان می‌آید */
  const asking = msgs[msgs.length - 1]?.from === 'bot' ? state : START;

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
        {/* ⚠ مدار فقط وقتی چت باز است.

            کارفرما خواست دکمه در حالت عادی همینی بماند که هست و
            «وقتی رویش کلیک می‌شود» مثل نشانِ سیریِ آیفون بشود. پس
            این لایه همیشه در DOM هست ولی شفافیتش صفر است و با
            is-open روشن می‌شود — اگر با شرط رندر می‌شد، هر بار از
            نو ساخته می‌شد و انیمیشن از وسط می‌پرید. */}
        <span className="chatfab__orb" aria-hidden="true">
          <span className="chatfab__blob chatfab__blob--a" />
          <span className="chatfab__blob chatfab__blob--b" />
          <span className="chatfab__blob chatfab__blob--c" />
          <span className="chatfab__core" />
        </span>

        {!open && (
          <>
            <span className="chatfab__pulse" aria-hidden="true" />
            <span className="chatfab__spark" style={{ ['--i' as string]: 0, top: '-6px', insetInlineStart: '14%' }} aria-hidden="true" />
            <span className="chatfab__spark" style={{ ['--i' as string]: 1, top: '-9px', insetInlineEnd: '18%' }} aria-hidden="true" />
            <span className="chatfab__spark chatfab__spark--sm" style={{ ['--i' as string]: 2, bottom: '-6px', insetInlineEnd: '10%' }} aria-hidden="true" />
            <span className="chatfab__spark chatfab__spark--sm" style={{ ['--i' as string]: 3, bottom: '-8px', insetInlineStart: '26%' }} aria-hidden="true" />
          </>
        )}
        {/* نشانِ چت، نه جرقه.

            آیکونِ قبلی Sparkles بود — یادگارِ دکمه‌ی «دستیار خرید»
            که در چت ادغام شد. روی دکمه‌ای که گوشه‌ی صفحه شناور
            است، جرقه هیچ نمی‌گوید؛ حبابِ گفتگو همان نشانی است که
            کاربر برای پشتیبانی دنبالش می‌گردد. */}
        {open ? <X aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
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

                {/* گزینه‌های همین پیام.

                    نوشتنِ سوال از انتخاب کردن سخت‌تر است، و کاربرِ
                    چتِ فروشگاه معمولاً نمی‌داند اصلاً چه بپرسد. پس
                    ربات هر بار خودش چند راهِ بعدی را جلو می‌گذارد. */}
                {m.chips && m.chips.length > 0 && (
                  <span className="chat__chips">
                    {m.chips.map((c) => (
                      <button
                        key={c.act}
                        type="button"
                        onClick={() => push(c.label, run(c.act, state))}
                      >
                        {c.label}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form className="chat__form" onSubmit={send}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              /* وقتی ربات منتظرِ کدِ سفارش است، کادر همان را
                 می‌پرسد — نه یک «سوالت را بنویس» عمومی که کاربر
                 را دوباره سردرگم کند. */
              placeholder={asking.mode === 'track' ? 'کد سفارش، مثلاً PHX-123456' : 'سوالت را بنویس…'}
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
