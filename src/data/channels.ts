/* ============================================================
   کانال‌های یوتیوب برای یادگیری

   ⚠ این فهرست پیشنهاد است، نه تأییدشده.

   این کانال‌ها به مشتری معرفی می‌شوند و اعتبارشان پای برند فونیکس
   شاپ می‌رود. انتخاب نهایی با کارفرماست — هرکدام را نخواست، همین
   جا حذف شود؛ هرکدام را خواست اضافه کند، یک شیء تازه کافی است.

   معیار انتخاب: کانالی که آموزشِ *استفاده* از سرویس را می‌دهد، نه
   کانالی که سرویس را می‌فروشد. مشتری ما اشتراک را از ما خریده و
   دنبال این است که بیشتر ازش دربیاورد.
   ============================================================ */

export type ChannelTopic = 'ai' | 'creative' | 'gaming' | 'language';

export interface Channel {
  id: string;
  name: string;
  handle: string;
  url: string;
  topic: ChannelTopic;
  /** یک جمله: این کانال دقیقاً به چه دردی می‌خورد */
  why: string;
  lang: 'fa' | 'en';
}

export const CHANNEL_TOPICS: Record<ChannelTopic, string> = {
  ai: 'هوش مصنوعی',
  creative: 'طراحی و ادیت',
  gaming: 'گیم',
  language: 'زبان',
};

export const CHANNELS: Channel[] = [
  {
    id: 'c-openai',
    name: 'OpenAI',
    handle: '@OpenAI',
    url: 'https://www.youtube.com/@OpenAI',
    topic: 'ai',
    why: 'کانال رسمی سازنده‌ی چت‌جی‌پی‌تی. هر قابلیت تازه اول اینجا نشان داده می‌شود.',
    lang: 'en',
  },
  {
    id: 'c-anthropic',
    name: 'Anthropic',
    handle: '@anthropic-ai',
    url: 'https://www.youtube.com/@anthropic-ai',
    topic: 'ai',
    why: 'کانال رسمی کلاد. برای کسی که با متن‌های بلند و کد کار می‌کند.',
    lang: 'en',
  },
  {
    id: 'c-google-ai',
    name: 'Google AI',
    handle: '@googleai',
    url: 'https://www.youtube.com/@googleai',
    topic: 'ai',
    why: 'جمنای و ابزارهای هوش مصنوعی گوگل، از خود گوگل.',
    lang: 'en',
  },
  {
    id: 'c-canva',
    name: 'Canva',
    handle: '@canva',
    url: 'https://www.youtube.com/@canva',
    topic: 'creative',
    why: 'آموزش رسمی کنوا — از پست ساده تا کیت برند و کار تیمی.',
    lang: 'en',
  },
  {
    id: 'c-capcut',
    name: 'CapCut',
    handle: '@CapCut',
    url: 'https://www.youtube.com/@CapCut',
    topic: 'creative',
    why: 'ترفندهای ادیت و افکت‌های تازه، مستقیم از سازنده.',
    lang: 'en',
  },
  {
    id: 'c-figma',
    name: 'Figma',
    handle: '@Figma',
    url: 'https://www.youtube.com/@Figma',
    topic: 'creative',
    why: 'از پایه تا کامپوننت و پروتوتایپ. برای تیم‌های طراحی.',
    lang: 'en',
  },
  {
    id: 'c-duolingo',
    name: 'Duolingo',
    handle: '@duolingo',
    url: 'https://www.youtube.com/@duolingo',
    topic: 'language',
    why: 'روش‌های نگه‌داشتن زنجیره‌ی روزها و بیرون کشیدن بیشترین از اپ.',
    lang: 'en',
  },
  {
    id: 'c-playstation',
    name: 'PlayStation',
    handle: '@PlayStation',
    url: 'https://www.youtube.com/@PlayStation',
    topic: 'gaming',
    why: 'تریلر و تاریخ انتشار بازی‌ها، پیش از اینکه جای دیگری بیاید.',
    lang: 'en',
  },
];

export const getChannelsByTopic = (topic: ChannelTopic) =>
  CHANNELS.filter((c) => c.topic === topic);
