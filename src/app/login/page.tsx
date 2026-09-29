import type { Metadata } from 'next';
import { LoginFlow } from '../../components/account/LoginFlow';
import { LiveLogin } from '../../components/account/LiveLogin';
import { ACCOUNT_READY } from '../../lib/api/account';

export const metadata: Metadata = {
  title: 'ورود به حساب | فونیکس شاپ',
  description: 'با شماره‌ی موبایل و رمز، یا با کد پیامکی وارد شو.',
};

export default function LoginPage() {
  return ACCOUNT_READY ? <LiveLogin /> : <LoginFlow />;
}
