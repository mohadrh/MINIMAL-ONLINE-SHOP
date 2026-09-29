'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MessageCircle, Send, X } from 'lucide-react';
import {
  GREETING, START, freeText, pickAgent, run,
  type Answer, type ChatState,
} from '../../lib/chatAnswers';
import {
  CHAT_LIVE, chatConfig, endChat, pollChat, sendChat, startChat, storedChat,
  type ChatConfig, type ChatMessage, type LiveChat as LiveConv,
} from '../../lib/api/chat';

/**
 * چت آنلاین — پشتیبانی، پیگیری سفارش و دستیارِ خرید، در یک پنجره.
 *
 * دو چیزِ جدا بودند: یک «دستیار خرید» در نوبار که با فیلترِ دسته و
 * بودجه محصول پیشنهاد می‌داد، و یک چتِ پشتیبانی کنار صفحه. هر دو
 * یک کار می‌کردند — کمک به کسی که نمی‌داند چه بخرد یا مشکلی دارد —
 * و کاربر فرقشان را نمی‌دانست، پس هیچ‌کدام را نمی‌زد.
 *
 * ⚠ گزینه‌های پیشنهادی داخلِ خودِ گفتگو هستند، نه در نواری زیرِ آن.
 * هر پیامِ ربات گزینه‌های خودش را همراه دارد، پس در هر لحظه فقط
 * چیزی پیشنهاد می‌شود که در آن لحظه معنی دارد.
 *
 * ⚠ منطقِ ربات این‌جا نیست — در ‎lib/chatAnswers‎ است.
 *
 * ⚠ سایتِ وصل به پنل (‎NEXT_PUBLIC_BRIDGE_URL‎): وقتی ربات جواب ندارد
 * یا دستیار در پنل خاموش است، سوال واقعاً به «مشتریان ← چت آنلاین»
 * می‌رود و جوابِ اپراتور — با نامِ همان کارشناسی که مشتری دیده —
 * همین‌جا می‌آید. عنوان، متن‌ها، نام‌ها، رنگ و گوشه هم از همان پنل.
 * بی‌اتصال، همان رفتارِ نمایشیِ قبلی.
 */

type Msg = {
  id: number;
  from: 'user' | 'bot';
  text: string;
  /** نامِ کارشناس، روی جوابِ اپراتور */
  who?: string;
  links?: Answer['links'];
  chips?: Answer['chips'];
};

/** خلاصه‌ی وضعیتِ کاربر، برای وقتی سوال به پشتیبانی می‌رود.
 *
 *  ⚠ فقط چیزی که خودِ کاربر دارد می‌فرستد، نه بیشتر: تعدادِ سبد و
 *  آدرسِ صفحه — همان دو چیزی که بدونشان اولین جوابِ پشتیبانی «چه
 *  محصولی؟» است. نه ایمیل، نه شماره، نه تاریخچه. */
function chatContext(): string {
  const bits: string[] = [];
  try {
    const raw = window.localStorage.getItem('phoenix.cart.v1');
    const lines = raw ? JSON.parse(raw) : [];
    if (Array.isArray(lines) && lines.length) bits.push(`سبد خرید: ${lines.length} قلم`);
  } catch { /* حافظه در دسترس نیست — خلاصه بدونِ سبد می‌رود */ }
  try { bits.push(`صفحه: ${window.location.pathname}`); } catch { /* بی‌صدا */ }
  return bits.join(' | ');
}

const telegramLink = (id: string) => ({ label: 'پرسیدن در تلگرام', href: `https://t.me/${id}` });

export function LiveChat() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  /** حالتی که ربات بین دو پیام یادش می‌ماند */
  const [state, setState] = useState<ChatState>(START);

  /* ⚠ کارشناس یک‌بار انتخاب می‌شود و تا آخرِ گفتگو همان می‌ماند.
     ‎useState‎ با تابعِ سازنده فقط در مرورگر اجرا می‌شود — قرعه‌ی سرور
     و مرورگر با هم اختلاف نمی‌سازند. سایتِ وصل، نام را از فهرستِ پنل
     دوباره قرعه می‌کشد (پایین). */
  const [agent, setAgent] = useState(pickAgent);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 0, from: 'bot', text: GREETING.text, chips: GREETING.chips },
  ]);
  const bodyRef = useRef<HTMLDivElement>(null);

  /* ---------- سایتِ وصل به پنل ---------- */
  const [conf, setConf] = useState<ChatConfig | null>(null);
  const [live, setLive] = useState<LiveConv | null>(null);
  const [unread, setUnread] = useState(0);
  const lastId = useRef(0);
  const nextId = useRef(1);
  const openRef = useRef(false);
  openRef.current = open;

  useEffect(() => setMounted(true), []);

  /** ‎skipVisitor‎: پیامِ خودِ مشتری که همین حالا در صفحه نشسته — دوبار نیاید */
  const mapServer = useCallback((list: ChatMessage[], name: string, skipVisitor = false): Msg[] => {
    const out: Msg[] = [];
    for (const m of list) {
      lastId.current = Math.max(lastId.current, m.id);
      if (m.author === 'system' || (skipVisitor && m.author === 'visitor')) continue;
      out.push({
        id: nextId.current++,
        from: m.author === 'visitor' ? 'user' : 'bot',
        text: m.body,
        who: m.author === 'staff' ? (m.name || name) : undefined,
      });
    }
    return out;
  }, []);

  /* تنظیمات از پنل، و گفتگوی نیمه‌کاره‌ی قبلی از همین مرورگر */
  useEffect(() => {
    if (!CHAT_LIVE) return;
    let dead = false;
    chatConfig().then((c) => {
      if (dead || !c) return;
      setConf(c);
      if (c.agents.length) setAgent(c.agents[Math.floor(Math.random() * c.agents.length)]);
      setMsgs((m) => (m.length === 1
        ? [{ id: 0, from: 'bot', text: c.greeting, chips: c.bot ? GREETING.chips : undefined }]
        : m));
    });
    const prev = storedChat();
    if (prev) {
      pollChat(prev, 0).then((r) => {
        if (dead) return;
        setLive(prev);
        setAgent(prev.agent);
        setMsgs((m) => [...m, ...mapServer(r.messages, prev.agent)]);
      }).catch(() => { /* گفتگو دیگر نیست */ });
    }
    return () => { dead = true; };
  }, [mapServer]);

  /* جای دکمه — «بازگشت به بالا» به گوشه‌ی مقابل می‌رود */
  useEffect(() => {
    document.documentElement.classList.toggle('chat-flip', conf?.position === 'right');
  }, [conf]);

  /* جوابِ اپراتور: هر چند ثانیه وقتی پنجره باز است، کندتر وقتی بسته */
  useEffect(() => {
    if (!live) return;
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const r = await pollChat(live, lastId.current);
        const add = mapServer(r.messages, live.agent);
        if (!add.length) return;
        setMsgs((m) => [...m, ...add]);
        if (!openRef.current) setUnread((n) => n + add.filter((x) => x.from === 'bot').length);
      } catch { /* دورِ بعد */ }
    };
    const t = window.setInterval(tick, open ? 4000 : 15000);
    return () => window.clearInterval(t);
  }, [live, open, mapServer]);

  useEffect(() => { if (open) setUnread(0); }, [open]);

  /* نوبار همین چت را باز می‌کند */
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('phoenix:chat-open', onOpen);
    return () => window.removeEventListener('phoenix:chat-open', onOpen);
  }, []);

  /* ⚠ گزینه‌های پیامِ قبلی پاک می‌شوند — فقط آخرین پیامِ ربات گزینه دارد */
  const push = (userText: string, a: Answer) => {
    setMsgs((m) => [
      ...m.map((x) => (x.chips ? { ...x, chips: undefined } : x)),
      { id: nextId.current++, from: 'user', text: userText },
      { id: nextId.current++, from: 'bot', text: a.text, links: a.links, chips: a.chips },
    ]);
    setState(a.next ?? START);
  };

  /** سوال به کارشناسِ واقعی — گفتگوی تازه در پنل */
  const toAgent = async (question: string, fallback: Answer | null) => {
    setBusy(true);
    const context = msgs.slice(-8)
      .map((m) => `${m.from === 'user' ? 'مشتری' : 'ربات'}: ${m.text}`).join('\n').slice(-1400)
      + '\n' + chatContext();
    try {
      const r = await startChat({ agent, message: question, page: window.location.pathname, context });
      const conv = { id: r.id, token: r.token, agent: r.agent };
      setAgent(r.agent);
      setLive(conv);
      lastId.current = 0;
      const add = mapServer(r.messages, r.agent, true);
      if (conf?.telegram && add.length) add[add.length - 1].links = [telegramLink(conf.telegram)];
      setMsgs((m) => [...m.map((x) => (x.chips ? { ...x, chips: undefined } : x)), ...add]);
      setState(START);
    } catch {
      /* پنل در دسترس نیست — همان جوابِ قبلی (پیوندِ تلگرام). پیامِ مشتری
         از قبل در صفحه است، پس فقط جواب اضافه می‌شود. */
      const a = fallback ?? { text: 'الان وصل نمی‌شود. کمی بعد دوباره بنویس یا در تلگرام بپرس.', links: conf?.telegram ? [telegramLink(conf.telegram)] : undefined };
      setMsgs((m) => [...m, { id: nextId.current++, from: 'bot', text: a.text, links: a.links, chips: a.chips }]);
      setState(a.next ?? START);
    } finally {
      setBusy(false);
    }
  };

  /* هر پیام تازه باید دیده شود.
     ⚠ خودِ فهرست اسکرول می‌شود، نه ‎scrollIntoView‎ — آن یکی صفحه را هم
     جابه‌جا می‌کرد و روی پنجره‌ی کوتاه، پیامِ آخر زیرِ لبه می‌ماند. */
  useEffect(() => {
    const b = bodyRef.current;
    if (b) b.scrollTop = b.scrollHeight;
  }, [msgs, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');

    /* گفتگو با کارشناس باز است — پیام مستقیم به او */
    if (live) {
      setBusy(true);
      try {
        const r = await sendChat(live, text, lastId.current);
        setMsgs((m) => [...m, ...mapServer(r.messages, live.agent)]);
      } catch {
        setLive(null);
        push(text, { text: 'این گفتگو دیگر باز نیست. دوباره بنویس تا به کارشناس وصل شوی.' });
      } finally {
        setBusy(false);
      }
      return;
    }

    /* دستیار در پنل خاموش است — هر پیام به کارشناس */
    if (conf && conf.enabled && !conf.bot) {
      setMsgs((m) => [...m, { id: nextId.current++, from: 'user', text }]);
      await toAgent(text, null);
      return;
    }

    const a = freeText(text, state, agent, chatContext());
    if (a.handoff && conf?.enabled) {
      setMsgs((m) => [...m.map((x) => (x.chips ? { ...x, chips: undefined } : x)), { id: nextId.current++, from: 'user', text }]);
      await toAgent(a.handoff, a);
      return;
    }
    push(text, a);
  };

  const finishLive = async () => {
    if (!live) return;
    const conv = live;
    setLive(null);
    try { await endChat(conv); } catch { /* این‌جا فراموش شد */ }
    setMsgs((m) => [...m, {
      id: nextId.current++, from: 'bot', text: 'گفتگو با کارشناس تمام شد. اگر باز سوالی بود، همین‌جا بنویس.',
      chips: conf?.bot === false ? undefined : GREETING.chips,
    }]);
  };

  /** آخرین چیزی که ربات پرسیده — راهنمای کادرِ نوشتن از همان می‌آید */
  const asking = msgs[msgs.length - 1]?.from === 'bot' ? state : START;

  if (!mounted) return null;
  /* خاموش از پنل — نه دکمه، نه پنجره */
  if (CHAT_LIVE && conf && !conf.enabled) return null;

  const flip = conf?.position === 'right' ? ' is-flip' : '';
  const accent = conf?.accent ? { ['--chat-accent' as string]: conf.accent } : undefined;
  const accentCls = conf?.accent ? ' has-accent' : '';

  return createPortal(
    <>
      <button
        type="button"
        className={`chatfab${flip}${accentCls} ${open ? 'is-open' : ''}`}
        style={accent}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'بستن چت' : unread ? `چت آنلاین — ${unread} پیامِ تازه` : 'چت آنلاین با پشتیبانی'}
      >
        {/* ⚠ مدار فقط وقتی چت باز است — لایه همیشه در DOM، با is-open روشن */}
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
        {!open && unread > 0 && <span className="chatfab__badge num" aria-hidden="true">{unread.toLocaleString('fa-IR')}</span>}
        {open ? <X aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
      </button>

      {open && (
        <div className={`chat${flip}${accentCls}`} style={accent} role="dialog" aria-label="چت آنلاین">
          <div className="chat__head">
            <span className="chat__dot" aria-hidden="true" />
            <div>
              <b>{live ? `${agent} — ${conf?.title ?? 'پشتیبانی'}` : (conf?.title ?? 'دستیار و پشتیبانی فونیکس')}</b>
              <small>{conf?.subtitle ?? 'معمولاً زیر چند دقیقه جواب می‌دهیم'}</small>
            </div>
            {live && (
              <button type="button" className="chat__end" onClick={finishLive}>پایانِ گفتگو</button>
            )}
          </div>

          <div className="chat__body" aria-live="polite" ref={bodyRef}>
            {msgs.map((m) => (
              <div key={m.id} className={`chat__msg chat__msg--${m.from}${m.who ? ' chat__msg--agent' : ''}`}>
                {m.who && <span className="chat__who">{m.who}</span>}
                {m.text}

                {m.links && m.links.length > 0 && (
                  <span className="chat__links">
                    {m.links.map((l) => (
                      l.href.startsWith('http')
                        ? <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                        : <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
                    ))}
                  </span>
                )}

                {m.chips && m.chips.length > 0 && (
                  <span className="chat__chips">
                    {m.chips.map((c) => (
                      <button
                        key={c.act}
                        type="button"
                        onClick={() => {
                          const a = run(c.act, state);
                          push(c.label, a);
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            ))}
          </div>

          <form className="chat__form" onSubmit={send}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              disabled={busy}
              placeholder={live ? `پیامت برای ${agent}…` : asking.mode === 'track' ? 'کد سفارش، مثلاً PHX-123456' : 'سوالت را بنویس…'}
              aria-label="متن پیام"
            />
            <button type="submit" aria-label="ارسال" disabled={busy}>
              <Send aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </>,
    document.body,
  );
}
