/* ============================================================
   نشستِ مشتری در مرورگر — جدا تا هم ‎bridge.ts‎ (ثبتِ سفارش) و هم
   ‎account.ts‎ (پنل) بخوانندش، بی‌واردکردنِ دوطرفه.
   ============================================================ */

const KEY = 'phoenix.session.v1';

export interface StoredSession {
  token: string;
  phone: string;
  expires: string;
}

export function getSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    if (!s || typeof s.token !== 'string' || !/^[a-f0-9]{64}$/.test(s.token) || Date.parse(s.expires) < Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function keepSession(s: StoredSession) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* حالتِ خصوصی — فقط همین صفحه */ }
  window.dispatchEvent(new Event('phoenix:session'));
}

export function forgetSession() {
  try { localStorage.removeItem(KEY); } catch { /* بی‌صدا */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('phoenix:session'));
}
