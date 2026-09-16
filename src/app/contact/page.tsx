import type { Metadata } from 'next';
import { ContactView } from '../../components/contact/ContactView';

export const metadata: Metadata = {
  title: 'تماس با ما | فونیکس شاپ',
  description:
    'پشتیبانی فونیکس شاپ: پیگیری سفارش، راهنمای فعال‌سازی، گارانتی و راه‌های تماس با زمان جواب مشخص.',
};

export default function ContactPage() {
  return <ContactView />;
}
