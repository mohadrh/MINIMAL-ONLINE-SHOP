import type { Metadata } from 'next';
import { TrackView } from '../../components/track/TrackView';

export const metadata: Metadata = {
  title: 'پیگیری سفارش | فونیکس شاپ',
  description: 'وضعیت سفارش و اطلاعات تحویل را با کد پیگیری ببین.',
};

export default function TrackPage() {
  return <TrackView />;
}
