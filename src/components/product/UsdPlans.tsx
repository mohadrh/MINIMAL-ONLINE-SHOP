'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DEFAULT_USD_RATE, tomanFromUsd, fetchUsdRate } from '../../lib/rate';

/**
 * پلن‌های دلاری، با تبدیلِ زنده به تومان.
 *
 * ⚠ چرا قیمتِ پایه دلار است و نه تومان.
 *
 * این محصولات به دلار خریده می‌شوند. اگر عددِ تومانی در داده
 * نوشته شود، هر بار که نرخ تکان بخورد باید همه‌ی محصولات دستی
 * عوض شوند — و روزی که یکی‌شان جا بماند، با ضرر می‌فروشیم.
 *
 * پس مبلغِ دلاری داده است و تومان محاسبه. یک عدد عوض می‌شود
 * (نرخ) و همه‌ی قیمت‌ها با آن می‌آیند.
 *
 * ⚠ نرخ به کاربر نشان داده می‌شود.
 *
 * در این بازار قیمتِ تومانیِ بی‌توضیح بی‌اعتماد است: خریدار
 * می‌داند محصول دلاری است و می‌خواهد بداند با چه نرخی حساب
 * شده. نشان دادنِ نرخ همان چیزی است که چانه‌زنی را تمام می‌کند.
 *
 * ⚠ جعبه‌ی «چند دلار» جدا از پلن‌هاست.
 *
 * بعضی خریدها مبلغِ آزاد دارند — شارژ کیف پول، گیفت کارتِ دلخواه.
 * یک جعبه هست که خودت عدد می‌زنی و تومانش را می‌بینی. زدنِ روی
 * هر پلن هم همان جعبه را پر می‌کند، پس کاربر می‌تواند از یک پلن
 * شروع کند و بالا و پایینش را ببیند.
 */

export interface UsdPlan {
  id: string;
  label: string;
  usd: number;
  note?: string;
}

const fa = (n: number) => n.toLocaleString('fa-IR');

export function UsdPlans({
  plans,
  onPick,
}: {
  plans: UsdPlan[];
  onPick?: (plan: UsdPlan) => void;
}) {
  const [rate, setRate] = React.useState(DEFAULT_USD_RATE);
  const [live, setLive] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [picked, setPicked] = React.useState(plans[0]?.id ?? '');
  const [amount, setAmount] = React.useState(String(plans[0]?.usd ?? ''));

  const load = React.useCallback(async () => {
    setBusy(true);
    const r = await fetchUsdRate();
    setRate(r.rate);
    setLive(r.live);
    setBusy(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  /* ⚠ ورودی رشته می‌ماند نه عدد.

     با state عددی، پاک کردنِ کادر یا نوشتنِ «۱۲.» ممکن نبود —
     هر بار به صفر برمی‌گشت و مکان‌نما می‌پرید. */
  const usd = Number(amount.replace(/[^\d.]/g, '')) || 0;
  const toman = tomanFromUsd(usd, rate);

  const pick = (p: UsdPlan) => {
    setPicked(p.id);
    setAmount(String(p.usd));
    onPick?.(p);
  };

  return (
    <div className="usdp">
      <div className="usdp__rate">
        <span>
          نرخ دلار: <b className="num">{fa(rate)}</b> تومان
        </span>
        <button type="button" onClick={() => void load()} disabled={busy}>
          <RefreshCw aria-hidden="true" className={busy ? 'is-spin' : ''} />
          {live ? 'نرخ روز' : 'نرخ پایه'}
        </button>
      </div>

      <ul className="usdp__plans">
        {plans.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className={`usdp__plan ${p.id === picked ? 'is-on' : ''}`}
              onClick={() => pick(p)}
              aria-pressed={p.id === picked}
            >
              <span className="usdp__plan-name">
                <b>{p.label}</b>
                {p.note && <span>{p.note}</span>}
              </span>
              <span className="usdp__plan-price">
                <span className="usdp__usd num">${fa(p.usd)}</span>
                <span className="usdp__toman num">{fa(tomanFromUsd(p.usd, rate))} تومان</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="usdp__calc">
        <label htmlFor="usdp-amount">یا خودت مبلغ را بنویس</label>
        <div className="usdp__row">
          <div className="usdp__field">
            <input
              id="usdp-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setPicked(''); }}
              placeholder="۲۰"
            />
            <span>دلار</span>
          </div>
          <span className="usdp__eq" aria-hidden="true">=</span>
          <output className="usdp__out num" htmlFor="usdp-amount">
            {usd > 0 ? `${fa(toman)} تومان` : '—'}
          </output>
        </div>
        {/* ⚠ گردکردن پنهان نمی‌ماند.
            «۴٬۲۷۳٬۵۵۰» در این بازار دستکاری‌شده به نظر می‌رسد، پس
            به ده‌هزار گرد می‌شود — و همین‌جا گفته می‌شود. */}
        <p className="usdp__hint">مبلغ به نزدیک‌ترین ده هزار تومان گرد می‌شود.</p>
      </div>
    </div>
  );
}
