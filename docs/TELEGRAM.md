# ربات تلگرام — فقط برای اعلان‌های مدیر

> Phoenix Account ۰٫۹٫۰. **کدِ ورودِ مشتری دیگر به تلگرام نمی‌رود** (خواسته‌ی فروشگاه).
> مشتری با رمزِ عبور، ایمیل یا پیامک وارد می‌شود («پیامک و ورود»). ربات فقط خرید و
> پشتیبانی را به گفتگو، گروه یا کانالِ مدیر می‌فرستد — راهنمای کامل: docs/NOTIFY.md

اگر پیش‌تر کدِ ورود روی تلگرام بود، با نصبِ ۰٫۹٫۰ خودکار «خاموش» می‌شود و **همان ربات**
(توکن، وبهوک، واسطه) برای اعلان‌ها می‌ماند — لازم نیست چیزی را دوباره تنظیم کنید.

## ساختنِ ربات

1. در تلگرام ‎@BotFather‎ ← ‎/newbot‎ ← یک نام (مثلاً «اعلان‌های فونیکس») و نامِ کاربری‌ای که
   به ‎bot‎ ختم شود. BotFather یک **توکن** می‌دهد.
2. پیشخوان ← «فونیکس» ← «منابعِ قیمت» ← «اتصال‌ها» ← اتصالِ تازه، توکن به‌جای کلید.
3. «مشتریان» ← «اعلان در تلگرام» ← «توکنِ ربات» همان اتصال ← ذخیره ← **وصل کردنِ ربات**.

⚠ «وصل کردن» وبهوکِ ربات را روی همین سایت می‌گذارد. رباتی را که برنامه‌ی دیگری دارد
(مثلاً رباتِ فروش) وصل نکنید — از کار می‌افتد. برای آن فقط توکن را انتخاب کنید و
گیرنده‌ها را دستی بنویسید.

## اگر «به تلگرام نرسید» — هاستِ ایران

بیشترِ هاست‌های داخلِ ایران به ‎api.telegram.org‎ دسترسی ندارند. راهِ رایگان یک
**Cloudflare Worker** است که پیام‌ها را رد می‌کند:

1. ‎dash.cloudflare.com‎ ← Workers & Pages ← Create ← یک Worker با کدِ پایین.
2. Variables:
   - ‎BOT_ID‎ = عددِ اولِ توکن (قبل از «:»)
   - ‎WEBHOOK_TARGET‎ = ‎https://panel.phonixmarket.com/wp-json/phoenix-account/v1/tg/hook‎
3. «اعلان در تلگرام» ← «اگر هاست به تلگرام نمی‌رسد»:
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

    // تلگرام → این Worker → سایت (کدِ اتصالِ گفتگو)
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

    // سایت → این Worker → تلگرام (پیامِ اعلان)
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

## اگر روزی ورود با تلگرام برگشت

نسخه‌ی ورود با تلگرام (Phoenix Account ۰٫۴٫۰ تا ۰٫۸٫۰) در تاریخچه‌ی گیت هست
(‎git log -- wp-plugin/phoenix-account/includes/telegram.php‎).
