'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * آکاردئون سوالات متداول.
 *
 * فقط یکی هم‌زمان باز می‌ماند. دلیلش این است که وقتی همه باز باشند،
 * فهرست سوال‌ها گم می‌شود و کاربر باید بین متن‌ها دنبال تیتر بگردد.
 *
 * از <details> استفاده نشده چون کنترل باز/بسته دست ماست و انیمیشن
 * ارتفاع روی آن قابل اتکا نیست.
 */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="faq">
      {items.map((it, i) => (
        <div key={it.q} className={`faq__item ${open === i ? 'is-open' : ''}`}>
          <button
            type="button"
            className="faq__q"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
          >
            {it.q}
            <ChevronDown aria-hidden="true" className="faq__caret" />
          </button>
          {open === i && <div className="faq__a">{it.a}</div>}
        </div>
      ))}
    </div>
  );
}
