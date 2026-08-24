import type { Metadata } from 'next';
import { NumbersBrowser } from '../../components/numbers/NumbersBrowser';

export const metadata: Metadata = {
  title: 'شماره مجازی | فونیکس شاپ',
  description: 'شماره‌ی واقعی از بیش از سی کشور برای ساخت حساب و تأیید هویت.',
};

export default function NumbersPage() {
  return <NumbersBrowser />;
}
