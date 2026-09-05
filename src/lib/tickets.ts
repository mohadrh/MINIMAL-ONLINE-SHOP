/* ============================================================
   تیکت‌های پشتیبانی

   تا امروز فرم ثبت تیکت کار می‌کرد ولی تیکت هیچ‌جا نمی‌رفت: فهرست
   تیکت‌ها داده‌ی نمایشی ثابت بود و چیزی که کاربر ثبت می‌کرد در آن
   دیده نمی‌شد. این ماژول همان حلقه‌ی گمشده است.

   مثل orders.ts روی localStorage می‌نشیند و شکل توابعش عمداً شبیه
   یک کلاینت API است، تا وصل کردن بک‌اند فقط همین فایل را عوض کند.
   ============================================================ */

export type TicketStatus = 'open' | 'answered' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high';

export interface TicketMessage {
  id: string;
  from: 'user' | 'support';
  text: string;
  at: number;
}

export interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  /** شماره‌ی سفارش مرتبط، اگر انتخاب شده باشد */
  orderCode?: string;
  createdAt: number;
  updatedAt: number;
  unread: boolean;
  messages: TicketMessage[];
}

const KEY = 'phoenix.tickets.v1';

function readAll(): Ticket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Ticket[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: Ticket[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* حافظه پر است — تیکت در همین نشست معتبر می‌ماند */
  }
}

export function newTicketId(): string {
  return `PHX-${Math.floor(100000 + Math.random() * 899999)}`;
}

export function listTickets(): Ticket[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getTicket(id: string): Ticket | undefined {
  return readAll().find((t) => t.id === id);
}

export function saveTicket(t: Ticket): Ticket {
  const all = readAll();
  const i = all.findIndex((x) => x.id === t.id);
  if (i >= 0) all[i] = t;
  else all.unshift(t);
  writeAll(all.slice(0, 40));
  return t;
}

export function createTicket(input: {
  subject: string;
  category: string;
  priority: TicketPriority;
  message: string;
  orderCode?: string;
}): Ticket {
  const now = Date.now();
  const ticket: Ticket = {
    id: newTicketId(),
    subject: input.subject,
    category: input.category,
    priority: input.priority,
    status: 'open',
    orderCode: input.orderCode || undefined,
    createdAt: now,
    updatedAt: now,
    unread: false,
    messages: [{ id: `m${now}`, from: 'user', text: input.message, at: now }],
  };
  saveTicket(ticket);
  scheduleFirstReply(ticket.id, input.priority);
  return ticket;
}

export function replyToTicket(id: string, text: string): Ticket | undefined {
  const t = getTicket(id);
  if (!t || t.status === 'closed') return;
  const now = Date.now();
  return saveTicket({
    ...t,
    status: 'open',
    updatedAt: now,
    unread: false,
    messages: [...t.messages, { id: `m${now}`, from: 'user', text, at: now }],
  });
}

export function closeTicket(id: string): Ticket | undefined {
  const t = getTicket(id);
  if (!t) return;
  return saveTicket({ ...t, status: 'closed', updatedAt: Date.now(), unread: false });
}

/* ---------------------------------------------------------------
   پاسخ خودکار اول.

   تا وقتی پشتیبان واقعی پشت این فرم نیست، تیکت بدون جواب می‌ماند و
   کاربر فکر می‌کند سیستم خراب است. یک پاسخ دریافت خودکار می‌فرستیم
   که صادقانه می‌گوید این پیام خودکار است — نه اینکه وانمود کند
   کسی جواب داده.

   زمانش با اولویت تیکت فرق می‌کند، همان‌طور که در واقعیت هم هست.
--------------------------------------------------------------- */
function scheduleFirstReply(id: string, priority: TicketPriority) {
  if (typeof window === 'undefined') return;
  const delay = priority === 'high' ? 4000 : priority === 'normal' ? 8000 : 12000;

  window.setTimeout(() => {
    const t = getTicket(id);
    if (!t || t.status === 'closed' || t.messages.length > 1) return;
    const now = Date.now();
    saveTicket({
      ...t,
      status: 'answered',
      updatedAt: now,
      unread: true,
      messages: [
        ...t.messages,
        {
          id: `m${now}`,
          from: 'support',
          text:
            'تیکتت ثبت شد و در صف پشتیبانی است. این پیام خودکار است؛ ' +
            'کارشناس در اولین فرصت همین‌جا جواب می‌دهد. اگر موضوع فوری است و ' +
            'سفارشی مرتبط دارید، شماره‌ی پیگیری را در همین گفتگو بفرستید تا ' +
            'سریع‌تر بررسی شود.',
          at: now,
        },
      ],
    });
  }, delay);
}

/** تعداد تیکت‌های پاسخ‌داده‌شده‌ی خوانده‌نشده — برای نشان روی منو */
export function unreadCount(): number {
  return readAll().filter((t) => t.unread).length;
}

export function markRead(id: string) {
  const t = getTicket(id);
  if (t?.unread) saveTicket({ ...t, unread: false });
}
