import type { Metadata } from 'next';
import { ShopBrowser } from '../../components/shop/ShopBrowser';

export const metadata: Metadata = {
  title: 'فروشگاه — همه‌ی محصولات | فونیکس شاپ',
  description: 'اشتراک هوش مصنوعی، ابزار خلاقیت، اکانت بازی و شماره مجازی.',
};

export default function ShopPage() {
  return <ShopBrowser />;
}
