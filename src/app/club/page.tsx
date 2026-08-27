import type { Metadata } from 'next';
import { ClubView } from '../../components/club/ClubView';

export const metadata: Metadata = {
  title: 'باشگاه مشتریان | فونیکس شاپ',
  description:
    'هر خرید امتیاز دارد و هر پله کش‌بک. باشگاه مشتریان فونیکس شاپ رایگان است و از اولین سفارش شروع می‌شود.',
};

export default function ClubPage() {
  return <ClubView />;
}
