'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, Moon, Search, ShoppingBag, Sun, X } from 'lucide-react';
import { AccountMenu } from './AccountMenu';
import { ShoppingAssistant } from './ShoppingAssistant';
import { MegaMenu } from './MegaMenu';
import { CATEGORIES } from '../../data/catalog';
import { asset } from '../../lib/asset';
import { useCart, useFlight } from '../../app/providers';

/**
 * نوبار.
 *
 * سفید، چسبان، با یک سایه‌ی چهاردرصدی — تنها سایه‌ی کل سایت.
 *
 * دو ردیف دارد، مثل هر دو سایت مرجع:
 *
 * ردیف بالا باریک است و چیزهایی که «درباره‌ی فروشگاه»‌اند —
 * مقالات، باشگاه، پیگیری سفارش، تماس. اینها را کسی روزی ده بار
 * نمی‌زند، پس نباید هم‌وزنِ محصول دیده شوند.
 *
 * ردیف پایین کار اصلی را می‌کند: مگامنوی محصولات، جست‌وجو، حساب،
 * سبد و دستیار.
 *
 * قبلاً هر پنج دسته کنار هم در یک ردیف بودند و «شلوغ» دیده می‌شد،
 * و مهم‌تر اینکه از منو نمی‌شد به محصول رسید — فقط به دسته. حالا
 * خودِ محصول‌ها داخل مگامنو هستند.
 */
export function Nav() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const [assistOpen, setAssistOpen] = useState(false);
  const [mega, setMega] = useState(false);

  /* مقصد پروازِ جت.

     پرووایدر از اول registerCartAnchor را داشت ولی هیچ‌کس صدایش
     نمی‌زد، پس cartAnchor همیشه null می‌ماند و اورلیِ پرواز بلافاصله
     complete() می‌کرد — یعنی زدنِ + هیچ اتفاقی نمی‌انداخت.

     جای آیکون با resize و اسکرول عوض می‌شود، پس دوباره اندازه
     گرفته می‌شود؛ نوبار چسبان است ولی موقعیت افقی‌اش با عرض پنجره
     تغییر می‌کند. */
  const { registerCartAnchor } = useFlight();
  const { count, openCart } = useCart();
  const cartRef = useRef<HTMLAnchorElement>(null);

  const measureCart = useCallback(() => {
    const el = cartRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    registerCartAnchor({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }, [registerCartAnchor]);

  useEffect(() => {
    measureCart();
    window.addEventListener('resize', measureCart);
    window.addEventListener('scroll', measureCart, { passive: true });
    return () => {
      window.removeEventListener('resize', measureCart);
      window.removeEventListener('scroll', measureCart);
    };
  }, [measureCart]);

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setTheme(t === 'dark' ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('phoenix.theme', next);
    } catch {
      /* حالت خصوصی — انتخاب فقط در همین نشست می‌ماند */
    }
  };

  return (
    <header className="nav">
      {/* ---------- ردیف بالا ---------- */}
      <div className="navtop">
        <div className="wrap navtop__row">
          <Link href="/blog">مقالات و آموزش</Link>
          <Link href="/club">باشگاه مشتریان</Link>
          <Link href="/track">پیگیری سفارش</Link>
          <Link href="/faq">سوالات متداول</Link>
          <span className="navtop__sep" aria-hidden="true" />
          <Link href="/about" className="navtop__contact">تماس با ما</Link>
        </div>
      </div>

      <div className="wrap nav__inner">
        <Link href="/" className="nav__brand">
          <img src={asset('/brand/phoenix-logo.png')} alt="" width={34} height={34} />
          <span>
            <b>PHOENIX SHOP</b>
            <small>اشتراک و اکانت اورجینال</small>
          </span>
        </Link>

        {/* ---------- مگامنو ----------

            با هاور باز می‌شود و با کلیک هم — روی لمسی هاوری در کار
            نیست و منویی که فقط با هاور باز شود، روی موبایل اصلاً
            وجود ندارد.

            بسته‌شدن روی خودِ ظرف است نه روی دکمه: اگر روی دکمه
            بود، لحظه‌ای که نشانگر وارد پنل می‌شد از دکمه خارج
            می‌شد و منو زیر دست کاربر می‌بست. */}
        <nav
          className="nav__links"
          aria-label="محصولات"
          onMouseEnter={() => setMega(true)}
          onMouseLeave={() => setMega(false)}
        >
          {/* لینک است، نه دکمه.

              «همه‌ی محصولات» جدا بود و همین را می‌گفت؛ حالا خودِ
              «دسته‌بندی محصولات» به فروشگاه می‌رود و مگامنو با
              هاور باز می‌شود. یک نام، یک مقصد — دو ورودیِ هم‌معنی
              کنار هم، فقط انتخاب را سخت می‌کرد. */}
          <Link
            href="/shop"
            className={`nav__mega-btn ${mega ? 'is-on' : ''}`}
            aria-expanded={mega}
            aria-haspopup="true"
          >
            دسته‌بندی محصولات
            <ChevronDown aria-hidden="true" />
          </Link>

          <Link href="/numbers">شماره مجازی</Link>
          <Link href="/about">تماس با ما</Link>

          {mega && (
            <div className="nav__mega">
              <MegaMenu onNavigate={() => setMega(false)} />
            </div>
          )}
        </nav>

        <div className="nav__actions">
          <button type="button" aria-label="جست‌وجو" className="nav__icon">
            <Search />
          </button>

          {/* همیشه دکمه است، حتی وقتی تم هنوز معلوم نیست.

              نسخه‌ی اول تا مشخص شدن تم یک <span> می‌گذاشت و بعد
              آن را با <button> عوض می‌کرد. ری‌اکت نمی‌تواند یک نوع
              عنصر را با نوع دیگری وصله کند، و نتیجه‌اش خطای
              hydration در تمام صفحه‌ها بود. حالا فقط آیکونِ داخلش
              بعد از سوار شدن جا می‌افتد — و آیکون، عنصر نیست. */}
          <button
            type="button"
            onClick={toggleTheme}
            className="nav__icon"
            aria-label={theme === 'dark' ? 'حالت روز' : 'حالت شب'}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>

          <AccountMenu theme={theme} onToggleTheme={toggleTheme} />

          {/* سبد، کشویی را باز می‌کند نه صفحه‌ی سبد را.

              هنوز <a href="/cart"> است تا با کلیک وسط یا Ctrl در تب
              تازه باز شود و آدرسش هم قابل کپی بماند؛ کلیک ساده را
              می‌گیریم و به‌جایش کشویی می‌آید. */}
          <a
            ref={cartRef}
            href="/cart"
            className="nav__icon nav__cart"
            aria-label={count > 0 ? `سبد خرید، ${count.toLocaleString('fa-IR')} کالا` : 'سبد خرید'}
            onClick={(e) => { e.preventDefault(); openCart(); }}
          >
            <ShoppingBag />
            {count > 0 && <span className="nav__cart-n num">{count.toLocaleString('fa-IR')}</span>}
          </a>

          {/* دکمه‌ی اصلی نوبار — دستیار خرید.

              افکت جرقه‌ها از نمونه: چهار ستاره‌ی clip-path که از
              scale(0) با تأخیر پله‌ای باز می‌شوند. همه aria-hidden
              چون تزئینی‌اند و صفحه‌خوان نباید بخواندشان. */}
          <button
            type="button"
            className="assistbtn"
            onClick={() => setAssistOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={assistOpen}
          >
            <span className="assistbtn__spark" style={{ ['--i' as string]: 0, top: '-9px', insetInlineStart: '14%' }} aria-hidden="true" />
            <span className="assistbtn__spark" style={{ ['--i' as string]: 1, top: '-12px', insetInlineEnd: '22%' }} aria-hidden="true" />
            <span className="assistbtn__spark assistbtn__spark--sm" style={{ ['--i' as string]: 2, bottom: '-9px', insetInlineEnd: '10%' }} aria-hidden="true" />
            <span className="assistbtn__spark assistbtn__spark--sm" style={{ ['--i' as string]: 3, bottom: '-11px', insetInlineStart: '28%' }} aria-hidden="true" />
            <em className="assistbtn__glyph" aria-hidden="true">✦</em>
            دستیار خرید
          </button>

          <button
            type="button"
            className="nav__icon nav__burger"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="منو"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {assistOpen && <ShoppingAssistant onClose={() => setAssistOpen(false)} />}

      {open && (
        <div className="nav__mobile">
          <div className="wrap">
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} onClick={() => setOpen(false)}>
                {c.title}
              </Link>
            ))}
            <Link href="/numbers" onClick={() => setOpen(false)}>شماره مجازی</Link>
            <Link href="/shop" onClick={() => setOpen(false)}>همه‌ی محصولات</Link>
            <span className="nav__mobile-sep" aria-hidden="true" />
            <Link href="/blog" onClick={() => setOpen(false)}>مقالات و آموزش</Link>
            <Link href="/club" onClick={() => setOpen(false)}>باشگاه مشتریان</Link>
            <Link href="/track" onClick={() => setOpen(false)}>پیگیری سفارش</Link>
            <Link href="/faq" onClick={() => setOpen(false)}>سوالات متداول</Link>
            <Link href="/about" onClick={() => setOpen(false)}>تماس با ما</Link>
          </div>
        </div>
      )}
    </header>
  );
}
