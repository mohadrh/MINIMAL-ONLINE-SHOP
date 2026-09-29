import React from 'react';
import type { Metadata } from 'next';
import { AccountView } from '../../components/account/AccountView';
import { LiveAccount } from '../../components/account/LiveAccount';
import { ACCOUNT_READY } from '../../lib/api/account';

export const metadata: Metadata = {
  title: 'پنل کاربری | فونیکس شاپ',
  description: 'سفارش‌ها، تحویل‌ها، اشتراک‌های فعال و تیکت‌هایت.',
};

/* ⚠ سایتِ وصل به پنل (‎NEXT_PUBLIC_BRIDGE_URL‎) پنلِ واقعی را نشان
   می‌دهد؛ بدونِ آن، همان نسخه‌ی نمایشی با داده‌ی نمونه — تصمیمِ
   لحظه‌ی بیلد است، نه مرورگر. */
export default function AccountPage() {
  return ACCOUNT_READY ? <LiveAccount /> : <AccountView />;
}
