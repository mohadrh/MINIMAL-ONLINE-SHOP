# کدِ ورود با ربات تلگرام — به‌جای پیامک، رایگان

> Phoenix Account ۰٫۵٫۰. تا وقتی سامانه‌ی پیامک خریده نشده، کدهای ورود و تأییدِ
> مشتری در یک ربات تلگرام فرستاده می‌شود.

دو راه دارید — در «پیامک و ورود» ← «نوعِ ربات»:

| | رباتِ جدا برای ورود | رباتی که از قبل داریم |
|---|---|---|
| کی | ربات ندارید، یا ربات را فقط برای ورود می‌خواهید | رباتِ فروش دارید و می‌خواهید دکمه‌ی ورود هم همان‌جا باشد |
| برنامه‌نویسی | هیچ — افزونه همه‌ی کار را می‌کند | برنامه‌ی ربات یک دکمه و یک درخواستِ HTTP اضافه می‌کند |
| راهنما | «راه‌اندازی» پایین | «رباتی که از قبل داریم» پایین‌تر |

⚠ **توکنِ رباتِ فروش را در حالتِ «رباتِ جدا» نگذارید.** در آن حالت افزونه وبهوکِ
ربات را روی خودش ثبت می‌کند و رباتِ فروش دیگر پیامی نمی‌گیرد.

## مشتری چه می‌بیند

1. در سایت شماره را می‌زند و «ارسال کد تأیید».
2. **بارِ اول:** سایت می‌گوید «ربات ‎@…‎ را باز کنید و «ارسال شماره‌ی من» را بزنید».
   مشتری ربات را باز می‌کند، دکمه را می‌زند، و کد همان‌جا می‌رسد.
3. **از آن به بعد:** کد مستقیم در همان ربات می‌آید.

چرا امن است: دکمه‌ی «ارسال شماره‌ی من» شماره‌ی **حسابِ تلگرامِ خودِ مشتری** را
می‌فرستد و تلگرام آن را قبلاً با پیامک تأیید کرده. افزونه فقط وقتی شماره را
می‌پذیرد که مخاطبِ فرستاده‌شده خودِ فرستنده باشد — نه شماره‌ی کسِ دیگری از
مخاطبانش. پس کسی نمی‌تواند کدِ شماره‌ی دیگری را بگیرد.

## راه‌اندازی (یک بار)

1. **ساختنِ ربات:** در تلگرام ‎@BotFather‎ را باز کنید ← ‎/newbot‎ ← یک نام
   (مثلاً «فونیکس شاپ») و یک نامِ کاربری که به ‎bot‎ ختم شود (مثلاً
   ‎PhoenixShopLoginBot‎). BotFather یک **توکن** می‌دهد.
2. **گذاشتنِ توکن:** پیشخوان ← «فونیکس» ← «منابعِ قیمت» ← «اتصال‌ها» ← اتصالِ تازه،
   با نامِ «ربات تلگرام» و توکن به‌جای کلید. توکن رمزنگاری‌شده می‌ماند.
3. پیشخوان ← «مشتریان» ← «پیامک و ورود» ← سامانه: **ربات تلگرام (رایگان)** ← همان
   اتصال را انتخاب کنید ← «ذخیره».
4. در کارتِ «ربات تلگرام» **«وصل کردنِ ربات»** را بزنید. نامِ ربات خوانده و وبهوک
   ثبت می‌شود.
5. **امتحان:** ربات را خودتان در تلگرام باز کنید، «ارسال شماره‌ی من» را بزنید، بعد
   در همان صفحه «ارسالِ آزمایشی» به شماره‌ی خودتان.

## رباتی که از قبل داریم (با API)

رباتِ فروش منو و برنامه‌ی خودش را نگه می‌دارد. افزونه وبهوکش را **دست نمی‌زند**؛
فقط با همان توکن کدِ ورود می‌فرستد (فرستادنِ پیام با وبهوکِ برنامه‌ی دیگر تداخل ندارد).

### در پنل

1. توکنِ همان ربات را در «اتصال‌ها» بگذارید (مثلِ بالا).
2. «پیامک و ورود» ← سامانه: **ربات تلگرام** ← نوعِ ربات: **رباتی که از قبل داریم** ← ذخیره.
3. در کارتِ «رباتِ موجود» **نشانیِ API** و با «بررسیِ وضعیت» **رمز** را بردارید و به
   برنامه‌نویسِ ربات بدهید.
4. وقتی دکمه در ربات آماده شد، **«روشن کردن»**. از همان لحظه سایت بعد از «ارسال کد
   تأیید» مشتری را به این ربات می‌فرستد.

### در برنامه‌ی ربات — سه کار

**۱. دکمه.** وقتی مشتری از سایت می‌آید، ربات `/start login` می‌گیرد. در این حالت، و
هر جای دیگر که بخواهید (مثلاً دکمه‌ی «🔐 ورود به سایت فونیکس» در منو)، این کیبورد را
نشان دهید — سایت به مشتری می‌گوید همین دکمه را بزند:

```json
{"keyboard": [[{"text": "📱 ارسال شماره‌ی من", "request_contact": true}]],
 "resize_keyboard": true, "one_time_keyboard": true}
```

**۲. شماره را بفرستید.** وقتی پیامی با `contact` رسید:

```
POST https://panel.phonixmarket.com/wp-json/phoenix-account/v1/tg/link
X-Phoenix-Secret: <رمز از پنل>
Content-Type: application/json

{
  "chat_id":         message.chat.id,
  "user_id":         message.from.id,
  "contact_user_id": message.contact.user_id,
  "phone":           message.contact.phone_number,
  "username":        message.from.username
}
```

⚠ **شماره فقط از `message.contact`**، هیچ‌وقت از متنی که مشتری تایپ کرده. اگر ربات
شماره‌ی تایپ‌شده را بفرستد، هر کسی می‌تواند شماره‌ی دیگری را به تلگرامِ خودش ببندد و
کدِ ورودِ او را بگیرد. افزونه هم فقط وقتی می‌پذیرد که `contact_user_id` و `chat_id`
هر دو همان `user_id` باشند (یعنی شماره‌ی خودِ فرستنده، در گفتگوی خصوصیِ خودش).

**۳. جواب را نشان دهید و منوی خودتان را برگردانید.**

| پاسخ | یعنی | کار |
|---|---|---|
| ۲۰۰ `{"ok":true,"code_sent":true,"message":"…"}` | وصل شد و کدِ منتظر همین حالا فرستاده شد | `message` را نشان دهید |
| ۲۰۰ `{"ok":true,"code_sent":false,"message":"…"}` | وصل شد؛ کدی منتظر نبود | `message` را نشان دهید |
| ۴۲۲ `{"code":"phoenix_acc_tg_not_own","message":"…"}` | مخاطبِ کسِ دیگر | `message` را نشان دهید |
| ۴۲۲ `{"code":"phoenix_acc_tg_not_ir",…}` | شماره‌ی غیرِ ایران | `message` را نشان دهید |
| ۴۰۳ | رمز غلط، یا «نوعِ ربات» در پنل «رباتی که از قبل داریم» نیست | به مشتری: «لطفاً کمی بعد دوباره امتحان کنید»؛ به شما: خطا |

متن‌های `message` رسمی و آماده‌ی نشان دادن به مشتری‌اند. خودِ کد را افزونه مستقیم در
همان گفتگو می‌فرستد؛ ربات لازم نیست کاری با کد بکند.

### نمونه — Python (python-telegram-bot ۲۱)

```python
import os, httpx
from telegram import KeyboardButton, ReplyKeyboardMarkup, Update
from telegram.ext import ContextTypes

LINK_URL = "https://panel.phonixmarket.com/wp-json/phoenix-account/v1/tg/link"
SECRET = os.environ["PHOENIX_SECRET"]  # ⚠ فقط روی سرورِ ربات، نه در کد یا گیت

LOGIN_KB = ReplyKeyboardMarkup([[KeyboardButton("📱 ارسال شماره‌ی من", request_contact=True)]],
                               resize_keyboard=True, one_time_keyboard=True)

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if ctx.args and ctx.args[0] == "login":          # از سایت آمده
        await update.message.reply_text("لطفاً با دکمه‌ی پایین شماره‌ی خود را ارسال کنید.", reply_markup=LOGIN_KB)
        return
    ...  # منوی همیشگیِ ربات

async def on_contact(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    m = update.message
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.post(LINK_URL, headers={"X-Phoenix-Secret": SECRET}, json={
            "chat_id": m.chat.id, "user_id": m.from_user.id,
            "contact_user_id": m.contact.user_id, "phone": m.contact.phone_number,
            "username": m.from_user.username or "",
        })
    text = r.json().get("message") if r.status_code in (200, 422) else "لطفاً کمی بعد دوباره امتحان کنید."
    await m.reply_text(text, reply_markup=MAIN_MENU)   # منوی خودِ ربات

# app.add_handler(CommandHandler("start", start))
# app.add_handler(MessageHandler(filters.CONTACT, on_contact))
```

### اگر رمز لو رفت

«رمزِ تازه» در همان کارت. رمزِ قبلی همان لحظه باطل می‌شود؛ رمزِ تازه را در برنامه‌ی
ربات بگذارید. با رمز فقط می‌شود شماره‌ای را که تلگرام تأیید کرده به همان گفتگو بست —
ولی باز هم فقط روی سرورِ ربات نگهش دارید.

### اگر قبلاً اشتباهی در حالتِ «رباتِ جدا» وصلش کرده‌اید

وبهوکِ ربات روی سایت مانده و رباتِ فروش پیامی نمی‌گیرد. کارتِ «رباتِ موجود» بعد از
«بررسیِ وضعیت» هشدار می‌دهد. برنامه‌ی ربات باید وبهوکِ خودش را دوباره ثبت کند
(`setWebhook` با نشانیِ خودش، یا اگر با polling کار می‌کند، `deleteWebhook`).

## اگر «به تلگرام نرسید» — هاستِ ایران

بیشترِ هاست‌های داخلِ ایران به ‎api.telegram.org‎ دسترسی ندارند. راهِ رایگان یک
**Cloudflare Worker** است که بینِ سایت و تلگرام پیام را رد می‌کند:

1. در ‎dash.cloudflare.com‎ ← Workers & Pages ← Create ← یک Worker بسازید و کدِ پایین
   را جایش بگذارید.
2. در تنظیماتِ Worker ← Variables دو متغیر:
   - ‎BOT_ID‎ = عددِ اولِ توکن (قبل از «:»)، مثلاً ‎7412345678‎
   - ‎WEBHOOK_TARGET‎ = ‎https://panel.phonixmarket.com/wp-json/phoenix-account/v1/tg/hook‎
3. در «پیامک و ورود»:
   - «واسطه‌ی تلگرام» = نشانیِ Worker، مثلاً ‎https://phoenix-tg.xxx.workers.dev‎
   - «وبهوک از راهِ واسطه» = همان نشانی + ‎/hook‎
   ذخیره، و دوباره «وصل کردنِ ربات».

```js
// واسطه‌ی Bot API برای هاستی که به تلگرام نمی‌رسد.
// ⚠ فقط رباتِ خودتان (BOT_ID) رد می‌شود — بدونِ این، هر کسی می‌توانست
//   از این Worker برای ربات‌های خودش استفاده کند.
export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // تلگرام → این Worker → سایت (پیام‌های ربات)
    if (url.pathname === '/hook' && req.method === 'POST') {
      return fetch(env.WEBHOOK_TARGET, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': req.headers.get('X-Telegram-Bot-Api-Secret-Token') || '',
        },
        body: await req.text(),
      });
    }

    // سایت → این Worker → تلگرام (فرستادنِ کد)
    if (req.method === 'POST' && url.pathname.startsWith(`/bot${env.BOT_ID}:`)) {
      return fetch('https://api.telegram.org' + url.pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: await req.text(),
      });
    }

    return new Response('not found', { status: 404 });
  },
};
```

## بعداً، با پیامک

هر وقت سامانه‌ی پیامک خریدید، در همان صفحه سامانه را «کاوه‌نگار» یا «sms.ir» کنید.
مشتری‌هایی که ربات را وصل کرده‌اند از آن به بعد کد را پیامک می‌گیرند؛ جدولِ پیوندِ
تلگرام می‌ماند و می‌شود هر وقت برگشت.
