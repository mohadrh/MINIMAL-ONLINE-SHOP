'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown, CreditCard, Search, Sparkles,
} from 'lucide-react';
import { HELP_ARTICLES } from '../../data/helpArticles';

/**
 * چرا فونیکس شاپ — مسیر خرید اسکرول‌محور.
 *
 * قبلاً «خرید چطور است»، «چرا امن است» و «آمار» سه سکشن جدا بودند
 * و پشت سر هم می‌آمدند: ۲٬۳۷۳ پیکسل توضیحِ پیوسته بدون یک محصول.
 * حالا یکی‌اند و جای آزادشده به ردیف‌های محصول رسید.
 *
 * مسیر می‌چسبد و با اسکرول جلو می‌رود: هر گام که کامل شد، تیوبِ
 * رنگیِ خودش روشن می‌شود و بعد نوبت بعدی. کاربر خودش مسیر را طی
 * می‌کند نه اینکه فقط تماشا کند.
 *
 * ارتفاع چسبندگی عمداً کوتاه است — کمی بیش از دو صفحه برای سه گام.
 * سکشنی که کاربر را زیاد نگه دارد، از توضیح به مانع تبدیل می‌شود.
 */

/* ارتفاعِ گام‌ها — متقارن.

   نسخه‌ی قبل موج‌دار بود (بالا، پایین، وسط) و بی‌نظم دیده می‌شد:
   سه ارتفاعِ متفاوت هیچ قاعده‌ای نداشت که چشم بتواند بگیرد.

   حالا دو طرف قرینه‌اند و وسط در اوج. نظم از تقارن می‌آید، نه
   از صاف بودن — و مسیر همچنان یک کمانِ پرش است نه یک خطِ افقی.

   عدد، فاصله‌ی هر گام از سقفِ ناحیه است: صفر یعنی بالاترین. */
const LIFTS = ['56px', '0px', '56px'];

/* کمانِ پرش. مختصات با جای واقعیِ گره‌ها اندازه‌گیری شده، نه حدس:
   سه ستونِ مساوی با فاصله، مرکزشان روی ۰٫۱۵۸، ۰٫۵ و ۰٫۸۴۲ از عرض
   می‌افتد. ارتفاع هم lift به‌علاوه‌ی نصفِ قطرِ گره (۲۸).

   ⚠ کمان از روی عرضِ واقعی ساخته می‌شود، نه از عددِ ثابت.

   تا امروز مسیر روی قابِ ۹۰۰تایی نوشته بود و SVG با
   ‎preserveAspectRatio="none"‎ کشیده می‌شد تا کمان تمامِ عرض را
   بگیرد. کارِ خودش را می‌کرد ولی دستگاهِ مختصات را افقی می‌کشید:
   روی عرضِ ۱۱۰۰ ضریبِ کشش ۱٫۲۲ بود و با هر تغییرِ عرضِ پنجره
   عوض می‌شد. برای خطِ دوپیکسلی مهم نبود (‎non-scaling-stroke‎
   جبرانش می‌کرد) ولی هر شکلِ توپُری روی این مسیر پهن می‌شد — و
   چون ‎rotate="auto"‎ آن را می‌چرخاند، جهتِ پهن‌شدن هم مدام عوض
   می‌شد.

   حالا viewBox خودش به عرضِ رندرشده تغییر می‌کند و نسبت دقیقاً
   یک‌به‌یک می‌ماند. هیچ چیزی روی مسیر دیگر کج نمی‌شود. */
/** مرکزِ هر گام، به‌صورتِ کسری از عرض — از راست به چپ.
 *
 *  سه ستونِ مساوی با فاصله‌ی بینشان. عددها با جای واقعیِ گره‌ها
 *  اندازه‌گیری شده‌اند، نه حدس. */
const AT = [0.8422, 0.5, 0.1578];

const wireFor = (w: number) => {
  const x = AT.map((f) => (f * w).toFixed(1));
  /* دو قوسِ قرینه که در گره‌ی وسط به هم می‌رسند */
  return `M ${x[0]} 84 Q ${(0.6711 * w).toFixed(1)} 28 ${x[1]} 28`
    + ` Q ${(0.3289 * w).toFixed(1)} 28 ${x[2]} 84`;
};

/** عرضِ مبنا تا وقتی اندازه‌گیریِ واقعی برسد — همان عددِ قبلی */
const WIRE_W0 = 900;

/* ⚠ ایستگاه‌های جنگنده اندازه‌گیری می‌شوند، حساب نمی‌شوند.

   کسرِ مسیر برای هر گره، کسری از *طولِ کمان* است نه از عرضِ
   صفحه. یک‌بار ‎done/۳‎ گذاشته بودم و ۱۳۱ پیکسل خطا داشت.

   می‌شد با تقارنِ همین مسیر حلش کرد (دو قوسِ قرینه، پس گره‌ی
   وسط دقیقاً روی ۰٫۵) ولی آن جواب به شکلِ مسیر بند است: تا
   تعدادِ گام‌ها یا هندسه‌ی کمان عوض شود، از کار می‌افتد — و
   یک‌بار که چهار گام شد، همین اتفاق افتاد.

   پس جای استدلال، اندازه‌گیری: هر بار که مسیر عوض می‌شود جای
   هر گره با جست‌وجوی دودویی روی ‎getPointAtLength‎ پیدا
   می‌شود. به هیچ فرضی درباره‌ی شکلِ مسیر یا تعدادِ گام‌ها تکیه
   نمی‌کند. */
const FALLBACK_STOPS = AT.map((_, i) => i / (AT.length - 1));

/* ⚠ سیلوئتِ سوخو-۵۷، از بالا.

   کارفرما خواست همان جنگنده‌ای که موقعِ «افزودن به سبد» پرواز
   می‌کند این‌جا هم مسیر را طی کند. مدلِ سه‌بعدیِ واقعی
   (‎su57.glb‎) پنج‌ونیم مگابایت است و با ‎three.js‎ رندر می‌شود؛
   آوردنش وسطِ صفحه‌ی اصلی یعنی همان حجم روی هر بازدید، برای
   شکلی که این‌جا سی پیکسل دیده می‌شود.

   پس همان هواپیما، ولی به‌صورتِ سیلوئت: دماغه‌ی تیز، بال‌های
   ذوزنقه، دو دم‌عمودیِ مایل و دو موتور. در این اندازه چیزی جز
   خطِ بیرونی دیده نمی‌شود، و خطِ بیرونی همان است.

   دماغه روی ‎+X‎ محلی است چون ‎rotate="auto"‎ محورِ X را با
   جهتِ حرکت تراز می‌کند — یعنی هواپیما همیشه رو به جلو می‌رود. */
const SU57 = 'M 20 0 L 13 -1.8 L 6 -2.6 L 1 -12 L -4 -13 L -5.5 -5.5 '
  + 'L -10 -4.6 L -13 -10 L -16 -9.5 L -15.5 -4.2 L -18 -3.6 L -19 0 '
  + 'L -18 3.6 L -15.5 4.2 L -16 9.5 L -13 10 L -10 4.6 L -5.5 5.5 '
  + 'L -4 13 L 1 12 L 6 2.6 L 13 1.8 Z';

/* ⚠ سه گامِ بی‌توضیح، و توضیح‌ها عمداً رفتند.

   یک دور جمله‌ی توضیح و یک جمله‌ی اعتماد زیرِ هر گام بود —
   سه گام در سه ستون، هر کدام سه سطر. کارفرما گفت متن‌های
   اضافه را بردار و فقط خودِ مراحل بماند، و حق داشت: مسیرِ
   خرید باید در یک نگاه خوانده شود، نه اینکه خودش یک مقاله
   باشد. جوابِ تردیدها در «سوالات متداول» همین پایین هست.

   یک دور چهارتا شد — ورود و پرداخت جدا — ولی کارفرما گفت سه
   مرحله. و درست است: ورود و پرداخت در عملِ کاربر یک نشستِ
   پیوسته‌اند، پس شکستنشان به دو گام، مسیر را طولانی‌تر نشان
   می‌داد بی‌آنکه چیزی روشن کند. */
const STEPS = [
  { icon: <Search />,     t: 'محصول را بگرد، مقایسه کن، انتخاب کن' },
  { icon: <CreditCard />, t: 'وارد شو و پرداخت کن' },
  { icon: <Sparkles />,   t: 'کمتر از دو ساعت فعال می‌شود' },
];

/* سه سوالی که واقعاً پرسیده می‌شوند، با جوابشان.
   جای سه شعارِ اعتمادسازیِ قبلی را گرفتند: «روی حساب خودت» و
   «رمزت را نمی‌خواهیم» چیزهایی بودند که هر فروشگاهی می‌گوید و
   هیچ‌کدام تردیدی را برطرف نمی‌کرد. سوال و جواب، تردید را
   مستقیم هدف می‌گیرد. */
const ASKED = HELP_ARTICLES.slice(0, 3);

export function WhyPhoenix() {
  const [done, setDone] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [openQ, setOpenQ] = useState<string | null>(null);

  /* عرضِ واقعیِ قابِ مسیر — کمان و viewBox از همین ساخته می‌شوند */
  const wireRef = useRef<SVGSVGElement>(null);
  const [wireW, setWireW] = useState(WIRE_W0);

  useEffect(() => {
    const el = wireRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      if (w > 0) setWireW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wire = wireFor(wireW);

  /* کسرِ طولِ مسیر برای هر گره — از خودِ مسیرِ رندرشده خوانده
     می‌شود. دلیلش بالای ‎FALLBACK_STOPS‎ نوشته شده. */
  const litRef = useRef<SVGPathElement>(null);
  const [stops, setStops] = useState<number[]>(FALLBACK_STOPS);

  useEffect(() => {
    const path = litRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    if (!total) return;

    const found = AT.map((f) => {
      const targetX = f * wireW;
      /* مسیر از راست به چپ می‌رود، پس x با افزایشِ طول نزولی
         است — شرطِ دودویی روی همین تکیه می‌کند. */
      let lo = 0;
      let hi = total;
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2;
        if (path.getPointAtLength(mid).x > targetX) lo = mid;
        else hi = mid;
      }
      return ((lo + hi) / 2) / total;
    });

    setStops(found);
  }, [wire, wireW]);

  /** ایستگاهی که با این تعداد گامِ تمام‌شده باید رویش بایستد */
  const stopAt = (n: number) => stops[Math.min(stops.length - 1, Math.max(0, n))];

  /* ⚠ جنگنده با ترنسفرمِ CSS می‌رود، نه با ‎animateMotion‎.

     نسخه‌ی قبل ‎animateMotion‎ داشت: ‎keyPoints‎ دستی ست می‌شد و
     ‎beginElement()‎ صدا زده می‌شد تا مرورگر از ایستگاه قبلی به
     تازه برود. با سه گام کار می‌کرد، ولی بعد از تغییر به چهار
     گام از کار افتاد — و اندازه‌گیری نشان داد چطور: ‎keyPoints‎
     دقیقاً یک‌بار و با مقدارِ درست ست می‌شد («۱٫۰۰۰ → ۰٫۳۳۶»)،
     ولی هواپیما روی نقطه‌ی *اولِ* فهرست یخ می‌زد. همان
     ‎beginElement()‎ اگر از کنسول صدا زده می‌شد درست کار می‌کرد.
     یعنی مشکل در زمان‌بندیِ SMIL نسبت به کامیتِ ری‌اکت بود، نه
     در منطقِ ما.

     جای کشتیِ جنگ با SMIL، نقطه و زاویه را خودمان از مسیر
     می‌خوانیم و روی ترنسفرم می‌گذاریم؛ نرم‌شدنش را هم CSS با
     یک ‎transition‎ انجام می‌دهد. هم کوتاه‌تر شد، هم رفتارش
     قابلِ اندازه‌گیری و پیش‌بینی است.

     ⚠ ‎transform-box: view-box‎ و ‎transform-origin: 0 0‎ در CSS
     لازم‌اند، وگرنه ترنسفرمِ CSS حولِ مرکزِ جعبه‌ی خودِ شکل
     می‌چرخد نه مبدأِ دستگاهِ SVG، و هواپیما از مسیر می‌پرد. */
  const [jetAt, setJetAt] = useState<{ x: number; y: number; a: number } | null>(null);

  useEffect(() => {
    const path = litRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    if (!total) return;

    const len = total * stopAt(done);
    const p = path.getPointAtLength(len);

    /* زاویه از دو نقطه‌ی نزدیکِ دو طرف — همان کاری که
       ‎rotate="auto"‎ می‌کرد، ولی این‌جا خودمان حسابش می‌کنیم.
       روی دو سرِ مسیر، نمونه از داخل گرفته می‌شود تا زاویه صفر
       نشود. */
    const d = Math.max(1, total * 0.004);
    const p0 = path.getPointAtLength(Math.max(0, len - d));
    const p1 = path.getPointAtLength(Math.min(total, len + d));
    const a = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;

    setJetAt({ x: p.x, y: p.y, a });
  }, [done, wireW, stops]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setDone(STEPS.length); return; }

    let frame = 0;
    const onScroll = () => {
      /* فریمِ در انتظار را لغو کن و تازه‌اش را بگذار.

         نسخه‌ی اول اگر فریمی در انتظار بود، رویداد را دور می‌ریخت.
         نتیجه‌اش این بود که آخرین موقعیتِ اسکرول هیچ‌وقت حساب
         نمی‌شد: رویدادِ آخر دور ریخته می‌شد و دیگر رویدادی نمی‌آمد
         که جایش را بگیرد، پس مسیر روی گام دوم گیر می‌کرد.

         با لغو و زمان‌بندی دوباره، همیشه تازه‌ترین موقعیت برنده
         است و بار محاسبه هم همان یکی در هر فریم می‌ماند. */
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const el = wrapRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        /* چقدر از ناحیه‌ی چسبنده رد شده‌ایم، بین صفر و یک.
           ارتفاع قابل اسکرول = کل ارتفاع منهای یک صفحه، چون آخرین
           صفحه همان جایی است که مسیر هنوز چسبیده. */
        const scrollable = el.offsetHeight - window.innerHeight;
        if (scrollable <= 0) { setDone(STEPS.length); return; }
        const p = Math.min(1, Math.max(0, -r.top / scrollable));
        setDone(Math.min(STEPS.length, Math.floor(p * STEPS.length + 0.34)));
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="section section--tint" id="why">
      {/* ظرف بلند — چسبندگی از ارتفاع همین می‌آید */}
      <div className="tracked" ref={wrapRef}>
        <div className="tracked__stick">
          <div className="wrap">
            <div className="sec-head sec-head--mid">
              <span className="sec-head__kicker">چطور کار می‌کند</span>
              <h2>خرید از فونیکس شاپ چطور است؟</h2>
              <p className="sec-head__lead">
                بیشتر سرویس‌های بین‌المللی کارت ایرانی را قبول نمی‌کنند. کاری که ما
                می‌کنیم این است که آن پرداخت را از طرف تو انجام می‌دهیم.
              </p>
            </div>

            <ol
              className="buypath"
              /* ⚠ ‎--lit‎ جداست از ‎--done‎، و لازم است.

                 ‎--done‎ شمارشِ گام است و برای روشن‌شدنِ خودِ
                 گام‌ها به کار می‌رود. ولی طولِ خطِ روشن باید
                 دقیقاً همان‌جایی تمام شود که جنگنده ایستاده —
                 وگرنه هواپیما جلوتر از دنباله‌اش پرواز می‌کند و
                 به نظر می‌رسد از مسیر جدا شده. پس هر دو از یک
                 جدول می‌خوانند. */
              style={{ ['--done' as string]: done, ['--lit' as string]: stopAt(done) }}
              aria-label="سه مرحله‌ی خرید"
            >
              {/* کمانِ پرش.

                  یک نکته‌ی ساخت که بار اول از قلم افتاد و گره‌ها را
                  سی‌ودو پیکسل زیرِ خط انداخت: inset-block-start روی
                  فرزندِ absolute از لبه‌ی *padding-box* حساب می‌شود،
                  ولی گام‌ها از لبه‌ی content شروع می‌شوند. پس این
                  عدد باید دقیقاً برابرِ padding-block-start خودِ
                  .buypath باشد — هر دو در CSS روی ۸۰ پیکسل ثابت‌اند و
                  با هم عوض می‌شوند. */}
              <svg
                ref={wireRef}
                className="buypath__wire"
                viewBox={`0 0 ${wireW} 112`}
                aria-hidden="true"
                focusable="false"
              >
                <path className="buypath__wire-bed" d={wire} pathLength={1} />
                <path ref={litRef} className="buypath__wire-lit" d={wire} pathLength={1} />

              </svg>

              {/* ⚠ جنگنده در قابِ جداگانه است، نه در همان SVGِ سیم.

                  سیم باید *زیرِ* گره‌ها بماند، وگرنه خطِ رنگی از
                  روی دایره‌ی هر گام رد می‌شود — مسیر از مرکزِ هر
                  سه گره می‌گذرد. ولی جنگنده باید *روی* گره‌ها
                  باشد، چون دقیقاً سرِ همان‌ها می‌ایستد؛ در یک قاب
                  با سیم، هر بار که می‌رسید پشتِ دایره گم می‌شد.
                  اندازه‌گیری شد: در هر سه ایستگاه کاملاً پنهان
                  بود.

                  دو قاب با viewBox و ابعادِ یکسان، پس هندسه‌شان
                  مو‌به‌مو یکی است و هواپیما دقیقاً روی سیم
                  می‌نشیند — فقط لایه‌شان فرق می‌کند. */}
              <svg
                className="buypath__wire buypath__flight"
                viewBox={`0 0 ${wireW} 112`}
                aria-hidden="true"
                focusable="false"
              >
                <g
                  className="buypath__jet"
                  style={
                    jetAt
                      ? { transform: `translate(${jetAt.x}px, ${jetAt.y}px) rotate(${jetAt.a}deg)` }
                      : { opacity: 0 }
                  }
                >
                  {/* ⚠ سی پیکسل بالاتر از خودِ سیم می‌پرد.

                      دقیقاً روی مسیر که بود، سرِ هر ایستگاه کاملاً
                      روی دایره‌ی گام می‌نشست و آیکونش را می‌پوشاند
                      — یعنی همان لحظه‌ای که گام مهم می‌شد، نشانه‌اش
                      ناپدید می‌شد.

                      جابه‌جایی داخلِ گروهِ چرخان است، پس نسبت به
                      *جهتِ پرواز* عمود می‌ماند نه نسبت به صفحه:
                      هرجای کمان که باشد، همان‌قدر بالای سیم است.

                      چهل، چون شعاعِ گره ۲۸ است و آیکونش تا ۱۲
                      پیکسلی مرکز می‌آید؛ با این عدد شکمِ هواپیما
                      بالای آیکون می‌ماند و فقط لبه‌ی حلقه را لمس
                      می‌کند — مثل فرودآمدن سرِ ایستگاه.

                      ⚠ علامت مثبت است، نه منفی — و این خلافِ
                      شهود است. در SVG محورِ Y رو به پایین است و
                      ‎rotate="auto"‎ محورِ X را با جهتِ حرکت تراز
                      می‌کند؛ مسیرِ ما از راست به چپ می‌رود، پس
                      دستگاهِ محلی حدود صد‌و‌هشتاد درجه چرخیده و
                      ‎-۴۰‎ هواپیما را روی صفحه پایین می‌بُرد.
                      اندازه‌گیری شد: با منفی، باز هم روی آیکون
                      می‌افتاد. */}
                  <g transform="translate(0,40)">
                    {/* شعله‌ی موتورها — پشتِ بدنه کشیده می‌شود تا
                        زیرش بیفتد، مثل خودِ هواپیما */}
                    <ellipse className="buypath__jet-burn" cx="-23" cy="-2.4" rx="5.5" ry="1.5" />
                    <ellipse className="buypath__jet-burn" cx="-23" cy="2.4" rx="5.5" ry="1.5" />
                    <path className="buypath__jet-body" d={SU57} />
                    {/* کابین — تنها جزئیاتی که در این اندازه دیده می‌شود */}
                    <ellipse className="buypath__jet-glass" cx="9" cy="0" rx="4.2" ry="1.5" />
                  </g>
                </g>
              </svg>

              {STEPS.map((s, i) => {
                const state = i < done ? 'is-done' : i === done ? 'is-now' : '';
                return (
                  <li
                    key={s.t}
                    className={`buypath__step ${state}`}
                    /* موج، نه شیب: بالا، پایین، وسط. مرحله‌ای که
                       فقط بالا برود، همان خطِ صاف است با زاویه. */
                    style={{ ['--i' as string]: i, ['--lift' as string]: LIFTS[i] }}
                  >
                    {/* آیکون خودِ گام می‌ماند و تیک نمی‌خورد.

                        وقتی گام تمام شد، آیکون رنگ خودش را می‌گیرد و
                        نور می‌دهد — مثل تیوبی که روشن شده. تیک،
                        آیکون را با یک علامتِ عمومی عوض می‌کرد و
                        شخصیتِ هر گام از بین می‌رفت. */}
                    <span className="buypath__node" aria-hidden="true">
                      <span className="buypath__icon">{s.icon}</span>
                      <span className="buypath__n num">{(i + 1).toLocaleString('fa-IR')}</span>
                    </span>

                    <div className="buypath__body">
                      <b>{s.t}</b>
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="buypath__hint" aria-hidden="true">
              {done < STEPS.length ? 'اسکرول کن' : 'همین سه قدم، تمام.'}
            </p>
          </div>
        </div>
      </div>

      {/* ---------- سوالاتی که واقعاً پرسیده می‌شوند ---------- */}
      <div className="wrap askd">
        <div className="sec-head">
          <h2>سوالات متداول</h2>
        </div>

        {ASKED.map((a) => (
          <div key={a.id} className="askd__item">
            <button
              type="button"
              className="askd__q"
              aria-expanded={openQ === a.id}
              onClick={() => setOpenQ(openQ === a.id ? null : a.id)}
            >
              <b>{a.title}</b>
              <ChevronDown aria-hidden="true" />
            </button>
            {openQ === a.id && <p className="askd__a">{a.answer}</p>}
          </div>
        ))}

        <Link href="/faq" className="btn btn--ghost btn--sm askd__more">
          دیدن همه‌ی سوال‌ها
        </Link>
      </div>
    </section>
  );
}
