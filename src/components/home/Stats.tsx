import React from 'react';
import { CalendarDays, Globe2, ShoppingBag, Users } from 'lucide-react';
import { PRODUCTS } from '../../data/catalog';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/**
 * آمار.
 *
 * نمونه هر عدد را با یک آیکون کنارش می‌گذارد و برچسب را زیرش.
 * قاب و کارت ندارد — هر کادری دور عدد بگذاری، عدد کوچک‌تر دیده
 * می‌شود.
 */
export function Stats() {
  const sales = PRODUCTS.reduce((s, p) => s + p.salesCount, 0);
  const reviews = PRODUCTS.reduce((s, p) => s + p.reviewsCount, 0);

  const items = [
    { icon: ShoppingBag, num: fmt(Math.round(sales / 1000)) + 'K+', label: 'سفارش تحویل‌شده' },
    { icon: Users,       num: fmt(reviews) + '+',                   label: 'نظر ثبت‌شده' },
    { icon: Globe2,      num: fmt(PRODUCTS.length) + '+',           label: 'سرویس فعال' },
    { icon: CalendarDays, num: '۲۴/۷',                              label: 'پشتیبانی' },
  ];

  return (
    <section className="section stats-sec reveal">
      <div className="container stats">
        {items.map(({ icon: Icon, num, label }, idx) => (
          <div key={label} className="stats__item" style={{ ['--i' as string]: idx }}>
            <div className="stats__head">
              <span className="stats__num num">{num}</span>
              <Icon aria-hidden="true" />
            </div>
            <div className="stats__title">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
