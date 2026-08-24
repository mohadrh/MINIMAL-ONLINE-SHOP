'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, Moon, Search, ShoppingBag, Sun, User, X } from 'lucide-react';
import { ShoppingAssistant } from './ShoppingAssistant';
import { CATEGORIES } from '../../data/catalog';
import { asset } from '../../lib/asset';

/**
 * نوبار.
 *
 * سفید، چسبان، با یک سایه‌ی چهاردرصدی — تنها سایه‌ی کل سایت.
 *
 * منوی دسته‌ها عمداً کشویی است نه مگامنوی همیشه‌باز: نمونه چهار سطح
 * دسته دارد و مگامنو لازمش می‌شود، ولی ما پنج دسته بیشتر نداریم و
 * مگامنو برای پنج آیتم فقط شلوغی است.
 */
export function Nav() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const [assistOpen, setAssistOpen] = useState(false);

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
      <div className="wrap nav__inner">
        <Link href="/" className="nav__brand">
          <img src={asset('/brand/phoenix-logo.png')} alt="" width={34} height={34} />
          <span>
            <b>PHOENIX SHOP</b>
            <small>اشتراک و اکانت اورجینال</small>
          </span>
        </Link>

        <nav className="nav__links" aria-label="دسته‌بندی‌ها">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`}>
              {c.title}
            </Link>
          ))}
          <Link href="/numbers">شماره مجازی</Link>
          <Link href="/blog">مقالات</Link>
        </nav>

        <div className="nav__actions">
          <button type="button" aria-label="جست‌وجو" className="nav__icon">
            <Search />
          </button>

          {/* تا وقتی تم واقعی معلوم نشده جای دکمه نگه داشته می‌شود،
              وگرنه HTMLِ سرور با حالت واقعی نمی‌خواند. */}
          {theme === null ? (
            <span className="nav__icon nav__icon--ghost" aria-hidden="true" />
          ) : (
            <button
              type="button"
              onClick={toggleTheme}
              className="nav__icon"
              aria-label={theme === 'dark' ? 'حالت روز' : 'حالت شب'}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
            </button>
          )}

          <Link href="/account" className="nav__icon" aria-label="حساب کاربری">
            <User />
          </Link>

          <Link href="/cart" className="nav__icon" aria-label="سبد خرید">
            <ShoppingBag />
          </Link>

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
            <Link href="/blog" onClick={() => setOpen(false)}>مقالات</Link>
            <Link href="/track" onClick={() => setOpen(false)}>پیگیری سفارش</Link>
          </div>
        </div>
      )}
    </header>
  );
}
