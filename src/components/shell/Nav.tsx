'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, MessageCircle, Moon, Search, ShoppingBag, Sun, X } from 'lucide-react';
import { AccountMenu } from './AccountMenu';
import { ShoppingAssistant } from './ShoppingAssistant';
import { MegaMenu } from './MegaMenu';
import { NavSearch } from './NavSearch';
import { PromoBar } from './PromoBar';
import { CATEGORIES } from '../../data/catalog';
import { Glyph, type GlyphName } from '../ui/Glyph';
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
/* آیکون هر دسته در منوی موبایل — همان‌هایی که مگامنو دارد */
const MOBILE_ICONS: Record<string, GlyphName> = {
  ai: 'ai', creative: 'creative', social: 'social',
  education: 'education', gaming: 'gaming',
};

export function Nav() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const [assistOpen, setAssistOpen] = useState(false);
  const [mega, setMega] = useState(false);
  const [search, setSearch] = useState(false);

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
      <PromoBar />

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
          <Link href="/blog">آموزش و مقاله</Link>
          <Link href="/club">باشگاه مشتریان</Link>

          {mega && (
            <div className="nav__mega">
              <MegaMenu onNavigate={() => setMega(false)} />
            </div>
          )}
        </nav>

        <div className="nav__actions">
          {/* بیضیِ جست‌وجو — بین گزینه‌های منو و آیکون‌ها.

              با هاور باز می‌شود و پنلِ نتیجه زیرش می‌آید؛ کلیک هم
              کار می‌کند چون روی لمسی هاوری در کار نیست. خودِ بیضی
              هیچ‌وقت جمع نمی‌شود — عرضش ثابت است تا با باز و بسته
              شدنش ردیفِ دکمه‌ها جابه‌جا نشود. */}
          <button
            type="button"
            aria-label="جست‌وجو"
            aria-expanded={search}
            className={`navpill ${search ? 'is-on' : ''}`}
            onMouseEnter={() => { setSearch(true); setMega(false); }}
            onClick={() => { setSearch((v) => !v); setMega(false); }}
          >
            <Search aria-hidden="true" />
            <span>جست‌وجو در فونیکس شاپ</span>
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

          {/* چت آنلاین، که حالا همان دستیار خرید هم هست.

              دو دکمه‌ی جدا بودند و هر دو یک کار می‌کردند: کمک به
              کاربری که نمی‌داند چه بخرد یا مشکلی دارد. کاربر
              نمی‌داند فرقشان چیست و همین باعث می‌شود هیچ‌کدام را
              نزند. حالا یکی است و افکتِ جرقه‌ی دستیار روی همین
              نشسته. */}
          <button
            type="button"
            className="nav__chat"
            onClick={() => setAssistOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={assistOpen}
            aria-label="چت آنلاین و دستیار خرید"
          >
            <span className="nav__chat-spark" style={{ ['--i' as string]: 0, top: '-7px', insetInlineStart: '10%' }} aria-hidden="true" />
            <span className="nav__chat-spark" style={{ ['--i' as string]: 1, top: '-9px', insetInlineEnd: '16%' }} aria-hidden="true" />
            <span className="nav__chat-spark nav__chat-spark--sm" style={{ ['--i' as string]: 2, bottom: '-7px', insetInlineEnd: '8%' }} aria-hidden="true" />
            <span className="nav__chat-spark nav__chat-spark--sm" style={{ ['--i' as string]: 3, bottom: '-8px', insetInlineStart: '22%' }} aria-hidden="true" />
            <MessageCircle aria-hidden="true" />
            <span className="nav__chat-dot" aria-hidden="true" />
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

      <NavSearch open={search} onClose={() => setSearch(false)} />

      {assistOpen && <ShoppingAssistant onClose={() => setAssistOpen(false)} />}

      {/* ---------- منوی موبایل ----------

          نسخه‌ی جداست، نه مگامنوی فشرده‌شده. مگامنو با هاور کار
          می‌کند و ستون سومش جزئیاتِ محصول را نشان می‌دهد؛ هیچ‌کدام
          روی صفحه‌ی لمسی معنا ندارد.

          این‌جا فقط دو بلوک است: دسته‌ها به‌صورت کاشیِ آیکون‌دار —
          که با انگشت راحت زده می‌شوند — و زیرش فهرستِ ساده‌ی
          صفحه‌ها. هیچ محصولی در منوی موبایل نیست؛ کاربر با یک ضربه
          به دسته می‌رسد و آن‌جا محصولات را با تصویرِ درست می‌بیند،
          به‌جای اینکه فهرستی بی‌تصویر را در منو اسکرول کند. */}
      {open && (
        <div className="navm">
          <div className="wrap">
            <span className="navm__label">دسته‌بندی محصولات</span>
            <div className="navm__cats">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/${c.slug}`}
                  className="navm__cat"
                  onClick={() => setOpen(false)}
                >
                  <span className="navm__cat-ico" aria-hidden="true">
                    <Glyph name={MOBILE_ICONS[c.slug] ?? 'spark'} />
                  </span>
                  {c.title}
                </Link>
              ))}
              <Link href="/numbers" className="navm__cat" onClick={() => setOpen(false)}>
                <span className="navm__cat-ico" aria-hidden="true"><Glyph name="number" /></span>
                شماره مجازی
              </Link>
            </div>

            <span className="navm__label">فونیکس شاپ</span>
            <nav className="navm__links">
              <Link href="/shop" onClick={() => setOpen(false)}>همه‌ی محصولات</Link>
              <Link href="/guide" onClick={() => setOpen(false)}>راهنمای خرید</Link>
              <Link href="/blog" onClick={() => setOpen(false)}>مقالات و آموزش</Link>
              <Link href="/club" onClick={() => setOpen(false)}>باشگاه مشتریان</Link>
              <Link href="/reseller" onClick={() => setOpen(false)}>نمایندگی فروش</Link>
              <Link href="/track" onClick={() => setOpen(false)}>پیگیری سفارش</Link>
              <Link href="/faq" onClick={() => setOpen(false)}>سوالات متداول</Link>
              <Link href="/about" onClick={() => setOpen(false)}>درباره‌ی ما</Link>
              <Link href="/contact" onClick={() => setOpen(false)}>تماس با ما</Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
