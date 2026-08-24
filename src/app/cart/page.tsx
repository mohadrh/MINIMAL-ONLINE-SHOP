import type { Metadata } from 'next';
import { CartView } from '../../components/cart/CartView';

export const metadata: Metadata = {
  title: 'سبد خرید | فونیکس شاپ',
};

export default function CartPage() {
  return <CartView />;
}
