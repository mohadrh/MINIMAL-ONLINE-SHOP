import React from 'react';
import Link from 'next/link';
import { Instagram, Mail, MessageCircle, Send } from 'lucide-react';
import { CATEGORIES } from '../../data/catalog';
import { asset } from '../../lib/asset';

const HELP = [
  { t: 'سوالات متداول', h: '/faq' },
  { t: 'پیگیری سفارش', h: '/track' },
  { t: 'قوانین و گارانتی', h: '/rules' },
  { t: 'تماس با ما', h: '/contact' },
];

const ABOUT = [
  { t: 'درباره‌ی ما', h: '/about' },
  { t: 'مقالات', h: '/blog' },
  { t: 'همکاری با ما', h: '/careers' },
  { t: 'ثبت شکایت', h: '/complaint' },
];

export function Footer() {
  return (
    <footer className="ft">
      <div className="wrap ft__grid">
        <div className="ft__brand">
          <Link href="/" className="ft__logo">
            <img src={asset('/brand/phoenix-logo.png')} alt="" width={36} height={36} />
            <b>PHOENIX SHOP</b>
          </Link>
          <p className="small">
            اشتراک‌هایی که از ایران نمی‌شود خرید، با کارت بانکی خودت. روی حساب
            شخصی خودت فعال می‌شوند و رمزت را هیچ‌وقت نمی‌خواهیم.
          </p>
          <div className="ft__social">
            <a href="#" aria-label="تلگرام"><Send /></a>
            <a href="#" aria-label="اینستاگرام"><Instagram /></a>
            <a href="#" aria-label="پشتیبانی"><MessageCircle /></a>
            <a href="#" aria-label="ایمیل"><Mail /></a>
          </div>
        </div>

        <nav className="ft__col" aria-label="دسته‌بندی‌ها">
          <h2>دسته‌بندی‌ها</h2>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`}>{c.title}</Link>
          ))}
          <Link href="/numbers">شماره مجازی</Link>
        </nav>

        <nav className="ft__col" aria-label="راهنما">
          <h2>راهنما</h2>
          {HELP.map((l) => <Link key={l.h} href={l.h}>{l.t}</Link>)}
        </nav>

        <nav className="ft__col" aria-label="فونیکس شاپ">
          <h2>فونیکس شاپ</h2>
          {ABOUT.map((l) => <Link key={l.h} href={l.h}>{l.t}</Link>)}
        </nav>
      </div>

      <div className="wrap ft__bottom">
        <span className="xsmall">همه‌ی حقوق متعلق به فونیکس شاپ است.</span>
        <span className="xsmall num">۱۴۰۴</span>
      </div>
    </footer>
  );
}
