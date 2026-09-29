/* ============================================================
   کلاینتِ چتِ آنلاین — افزونه‌ی Phoenix Account
   (‎/wp-json/phoenix-account/v1/chat‎)

   ربات در خودِ سایت می‌ماند (‎lib/chatAnswers‎)؛ این فقط بخشی است
   که به آدم می‌رسد. هر گفتگو ژتونِ خودش را دارد که فقط همین مرورگر
   نگه می‌دارد — بدونِ آن، کسی گفتگو را نمی‌خواند.

   ⚠ بی‌اتصالِ پنل (نسخه‌ی نمایشی) هیچ‌کدام صدا زده نمی‌شود و چت
   همان رفتارِ قبلی را دارد.
   ============================================================ */

import { BRIDGE_READY, BridgeError } from './bridge';
import { getSession } from './session';

const BASE = (process.env.NEXT_PUBLIC_BRIDGE_URL ?? '').replace(/\/$/, '');
const KEY = 'phoenix.chat.v1';
const CONF_KEY = 'phoenix.chat.conf.v1';

export const CHAT_LIVE = BRIDGE_READY;

export interface ChatConfig {
  enabled: boolean;
  bot: boolean;
  title: string;
  subtitle: string;
  greeting: string;
  handoff: string;
  offline: string;
  open: boolean;
  telegram: string;
  position: 'left' | 'right';
  accent: string;
  agents: string[];
}

export interface ChatMessage {
  id: number;
  author: 'visitor' | 'staff' | 'bot' | 'system';
  name: string;
  body: string;
  at: string;
}

export interface LiveChat {
  id: number;
  token: string;
  agent: string;
}

async function call<T>(method: string, path: string, body?: unknown, chat?: LiveChat): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (chat) headers['X-Phoenix-Chat'] = chat.token;
    /* مشتریِ واردشده: گفتگو به حسابش وصل می‌شود (فقط سرِ شروع) */
    const s = getSession();
    if (s && path === '/chat' && method === 'POST') headers['X-Phoenix-Session'] = s.token;
    const res = await fetch(`${BASE}/wp-json/phoenix-account/v1${path}`, {
      method, signal: ctrl.signal, headers, cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string; code?: string } & T;
    if (!res.ok) {
      /* گفتگو دیگر نیست (هرس شد یا ژتون عوض شد) — از این مرورگر هم برود */
      if (res.status === 404 && chat) forgetChat();
      throw new BridgeError(res.status, data.message || 'انجام نشد.', data.code || '');
    }
    return data;
  } catch (e) {
    if (e instanceof BridgeError) throw e;
    throw new BridgeError(0, 'ارتباط برقرار نشد.');
  } finally {
    clearTimeout(timer);
  }
}

/** تنظیماتِ چت — پنج دقیقه در همین تب نگه داشته می‌شود */
export async function chatConfig(): Promise<ChatConfig | null> {
  if (!CHAT_LIVE) return null;
  try {
    const raw = sessionStorage.getItem(CONF_KEY);
    if (raw) {
      const c = JSON.parse(raw) as { at: number; v: ChatConfig };
      if (Date.now() - c.at < 5 * 60 * 1000) return c.v;
    }
  } catch { /* بی‌صدا */ }
  try {
    const v = await call<ChatConfig>('GET', '/chat/config');
    try { sessionStorage.setItem(CONF_KEY, JSON.stringify({ at: Date.now(), v })); } catch { /* بی‌صدا */ }
    return v;
  } catch {
    return null;
  }
}

export function storedChat(): LiveChat | null {
  try {
    const raw = localStorage.getItem(KEY);
    const c = raw ? (JSON.parse(raw) as LiveChat) : null;
    return c && typeof c.id === 'number' && /^[a-f0-9]{64}$/.test(c.token) ? c : null;
  } catch {
    return null;
  }
}

export function forgetChat() {
  try { localStorage.removeItem(KEY); } catch { /* بی‌صدا */ }
}

export async function startChat(p: { agent: string; message: string; page: string; context: string }) {
  const r = await call<LiveChat & { status: string; open: boolean; messages: ChatMessage[] }>('POST', '/chat', p);
  try { localStorage.setItem(KEY, JSON.stringify({ id: r.id, token: r.token, agent: r.agent })); } catch { /* فقط همین صفحه */ }
  return r;
}

export const pollChat = (chat: LiveChat, after: number) =>
  call<{ status: string; agent: string; messages: ChatMessage[] }>('GET', `/chat/${chat.id}?after=${after}`, undefined, chat);

export const sendChat = (chat: LiveChat, body: string, after: number) =>
  call<{ status: string; agent: string; messages: ChatMessage[] }>('POST', `/chat/${chat.id}/messages`, { body, after }, chat);

export async function endChat(chat: LiveChat) {
  try { await call('POST', `/chat/${chat.id}/close`, {}, chat); } finally { forgetChat(); }
}
