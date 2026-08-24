import { Hero } from '../components/home/Hero';
import { HotDeals } from '../components/home/HotDeals';
import { QuickAccess } from '../components/home/QuickAccess';
import { ServiceGrid } from '../components/home/ServiceGrid';
import { AiPicker } from '../components/home/AiPicker';
import { HowItWorks } from '../components/home/HowItWorks';
import { WhySafe } from '../components/home/WhySafe';
import { Stats } from '../components/home/Stats';
import { Reviews } from '../components/home/Reviews';
import { Articles } from '../components/home/Articles';
import { CallToAction } from '../components/home/CallToAction';
import { BrandRow } from '../components/home/BrandRow';

/**
 * صفحه‌ی اصلی.
 *
 * ترتیب سکشن‌ها از سند دستور کار می‌آید و عمدی است: از «چه
 * می‌فروشیم» به «چطور کار می‌کند» به «چرا به ما اعتماد کن» به
 * «حالا سفارش بده». هر سکشن یک کار دارد و بیشتر از یکی نه.
 *
 * تناوب پس‌زمینه — سفید، ته‌رنگ، سفید — کار جدا کردن را می‌کند.
 * خط جداکننده لازم نیست و نمی‌گذاریم.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <HotDeals />
      <QuickAccess />
      <ServiceGrid />
      <AiPicker />
      <HowItWorks />
      <WhySafe />
      <Stats />
      <Reviews />
      <Articles />
      <CallToAction />
      <BrandRow />
    </>
  );
}
