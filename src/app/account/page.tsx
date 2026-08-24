import React from 'react';
import type { Metadata } from 'next';
import { AccountView } from '../../components/account/AccountView';

export const metadata: Metadata = {
  title: 'پنل کاربری | فونیکس شاپ',
  description: 'سفارش‌ها، تحویل‌ها، اشتراک‌های فعال و کیف پول شما.',
};

export default function AccountPage() {
  return <AccountView />;
}
