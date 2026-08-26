'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  Award, Bookmark, ChevronLeft, LifeBuoy, LogOut, Moon, Package,
  ShieldCheck, User, Volume2, Wallet,
} from 'lucide-react';
import { PROFILE } from '../../data/account';
import { sound } from '../../lib/sound';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/**
 * منوی «حساب من».
 *
 * ساختارش از پنل نمونه آمده و ترتیبش هم از آن‌جا: موجودی کیف پول
 * بالاست چون عددی است که آدم اول دنبالش می‌گردد، و «خروج از حساب»
 * آخر و جدا، چون تنها گزینه‌ی بازگشت‌ناپذیر این فهرست است.
 *
 * با پورتال رندر می‌شود تا در ظرف‌های دارای overflow یا
 * stacking-context گیر نکند — نوبار چسبان دقیقاً همان تله را دارد.
 */
export function AccountMenu({
  theme,
  onToggleTheme,
}: {
  theme: 'light' | 'dark' | null;
  onToggleTheme: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  /* موتور صدا خودش وضعیتش را پخش می‌کند و subscribe تابع لغو
     اشتراک برمی‌گرداند، پس مستقیم به‌عنوان cleanup می‌رود. */
  useEffect(() => sound.subscribe(setSoundOn), []);

  /* Escape می‌بندد، و کلیک بیرون هم. بدون این دو، منو روی موبایل
     تله می‌شود. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (!(t instanceof Element) || !t.closest('.amenu')) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const links: { href: string; label: string; icon: React.ReactNode; badge?: string }[] = [
    { href: '/account', label: 'سفارش‌های من', icon: <Package /> },
    { href: '/account', label: 'نشان‌شده‌ها',   icon: <Bookmark /> },
    { href: '/account', label: 'باشگاه مشتریان', icon: <Award />, badge: fmt(PROFILE.points) },
    { href: '/account', label: 'پشتیبانی و تیکت', icon: <LifeBuoy /> },
    { href: '/account', label: 'امنیت حساب', icon: <ShieldCheck />, badge: 'ناقص' },
  ];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="nav__icon"
        aria-label="حساب کاربری"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <User />
      </button>

      {mounted && open && createPortal(
        <div className="amenu" role="dialog" aria-label="حساب من">
          <header className="amenu__head">
            <span className="amenu__avatar" aria-hidden="true">
              {PROFILE.name.trim().charAt(0)}
            </span>
            <div>
              <b>{PROFILE.name}</b>
              <span className="num">{PROFILE.phone}</span>
            </div>
          </header>

          <Link href="/account" className="amenu__wallet" onClick={() => setOpen(false)}>
            <span className="amenu__wallet-ic" aria-hidden="true"><Wallet /></span>
            <div>
              <span>موجودی کیف پول</span>
              <b className="num">{fmt(PROFILE.walletBalance)} تومان</b>
            </div>
            <ChevronLeft aria-hidden="true" />
          </Link>

          <nav className="amenu__list">
            {links.map((l) => (
              <Link key={l.label} href={l.href} className="amenu__item" onClick={() => setOpen(false)}>
                <span className="amenu__ic" aria-hidden="true">{l.icon}</span>
                {l.label}
                {l.badge && <span className="amenu__badge">{l.badge}</span>}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            className="amenu__item amenu__theme"
            onClick={onToggleTheme}
            aria-pressed={theme === 'dark'}
          >
            <span className="amenu__ic" aria-hidden="true"><Moon /></span>
            حالت شب
            <span className={`amenu__switch ${theme === 'dark' ? 'is-on' : ''}`} aria-hidden="true">
              <i />
            </span>
          </button>

          {/* صدا پیش‌فرض خاموش است و باید بماند.

              صدای خودکار در بازدید اول آزاردهنده است. ولی تا حالا
              اصلاً کلیدی نداشت، یعنی موتوری که ساخته شده بود هیچ‌وقت
              شنیده نمی‌شد. */}
          <button
            type="button"
            className="amenu__item amenu__theme"
            onClick={() => sound.toggle()}
            aria-pressed={soundOn}
          >
            <span className="amenu__ic" aria-hidden="true"><Volume2 /></span>
            صدای سایت
            <span className={`amenu__switch ${soundOn ? 'is-on' : ''}`} aria-hidden="true">
              <i />
            </span>
          </button>

          {/* تنها گزینه‌ی بازگشت‌ناپذیر این فهرست، پس جدا و قرمز */}
          <button type="button" className="amenu__item amenu__out">
            <span className="amenu__ic" aria-hidden="true"><LogOut /></span>
            خروج از حساب
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
