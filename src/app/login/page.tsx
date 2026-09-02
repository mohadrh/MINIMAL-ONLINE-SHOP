import type { Metadata } from 'next';
import { LoginFlow } from '../../components/account/LoginFlow';

export const metadata: Metadata = {
  title: 'ورود به حساب | فونیکس شاپ',
  description: 'با شماره‌ی موبایل و رمز، یا با کد پیامکی وارد شو.',
};

export default function LoginPage() {
  return <LoginFlow />;
}
