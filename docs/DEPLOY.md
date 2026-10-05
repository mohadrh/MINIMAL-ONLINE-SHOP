# انتشارِ خودکار روی phonixmarket.com — با «اوکی»

> ‎.github/workflows/deploy-host.yml‎

بعد از راه‌اندازی، هر بار که چیزی روی شاخه‌ی main گیت‌هاب برود:

1. **بررسی** — نوع‌ها، همه‌ی تست‌های افزونه‌ها و بیلدِ نسخه‌ی دامنه‌ی اصلی. اگر یکی
   شکست، هیچ چیزی روی سایت نمی‌رود.
2. **«اوکی»** — گیت‌هاب ایمیل و اعلان می‌فرستد: «Review deployments». تا یکی از
   تأییدکننده‌ها **Approve** نزند، چیزی آپلود نمی‌شود. («Reject» = این نسخه نرود.)
3. **آپلود** روی هاست با FTPِ رمزدار یا SFTP — اول فایل‌های ‎_next‎ بعد صفحه‌ها، تا
   بازدیدکننده‌ای که وسطِ کار می‌آید صفحه‌ی به‌هم‌ریخته نبیند. هیچ فایلی پاک نمی‌شود.
4. **بررسیِ سایتِ زنده** — اگر سایت هنوز نسخه‌ی قبلی را نشان دهد، کار قرمز می‌شود.

افزونه‌های وردپرس با این راه **نمی‌روند** — آن‌ها را مثلِ قبل از زیپ نصب کنید
(به‌روزرسانیِ افزونه روی سایتِ زنده باید آگاهانه باشد).

## راه‌اندازی (یک بار، حدود ۱۰ دقیقه)

### ۱. یک حسابِ FTP جدا در هاست

در cPanel/DirectAdmin ← FTP Accounts ← حسابِ تازه، **فقط** با دسترسی به پوشه‌ی سایت
(مثلاً ‎public_html‎). رمزِ قوی. نشانیِ سرور (مثلاً ‎ftp.phonixmarket.com‎) را بردارید.
اگر هاست SSH/SFTP دارد، بهتر است.

### ۲. محیطِ production — همان «اوکی»

گیت‌هاب ← مخزن ← **Settings ← Environments ← New environment** ← نام: `production`
- **Required reviewers**: خودتان (و هر کس دیگر که باید تأیید کند) ← Save protection rules
- **Deployment branches and tags**: Selected branches ← `main`

### ۳. رمزها — داخلِ همان محیط

در صفحه‌ی همان محیطِ production:
- **Environment secrets** ← Add secret:
  - `DEPLOY_USER` — نام‌کاربریِ FTP
  - `DEPLOY_PASSWORD` — رمزِ FTP
- **Environment variables** ← Add variable:
  - `DEPLOY_DIR` — پوشه‌ی سایت از دیدِ همان حسابِ FTP؛ معمولاً `public_html` (در
    DirectAdmin گاهی `domains/phonixmarket.com/public_html`، و اگر حسابِ FTP مستقیم
    روی پوشه‌ی سایت باز می‌شود، `.`)

⚠ رمزها را **در محیط** بگذارید، نه در «Repository secrets»: کسی که دسترسیِ نوشتن به
مخزن دارد می‌تواند گردش‌کار را عوض کند، ولی به رمزِ محیط بی‌تأییدِ شما نمی‌رسد.

### ۴. روشن کردن

**Settings ← Secrets and variables ← Actions ← Variables ← New repository variable**:
- `DEPLOY_HOST` — `ftp://ftp.phonixmarket.com` (FTP با TLS) یا `sftp://phonixmarket.com:22`

تا وقتی این متغیر نیست، فقط «بررسی و بیلد» اجرا می‌شود و چیزی آپلود نمی‌شود.

### ۵. امتحان

Actions ← «Deploy to phonixmarket.com» ← Run workflow. بعد از بررسی، دکمه‌ی
«Review deployments» ← Approve ← چند دقیقه بعد سایت تازه است.

## اگر نشد

| خطا | یعنی |
|---|---|
| `Login failed` / `530` | نام‌کاربری یا رمز |
| `Certificate verification` | گواهیِ FTPِ هاست برای همان نشانی نیست — نشانیِ دقیقی که هاست برای FTP داده را بگذارید (مثلاً نامِ سرور به‌جای ‎ftp.phonixmarket.com‎)، یا SFTP |
| زمانِ اتصال تمام شد | هاست اتصالِ FTP از خارج از ایران را می‌بندد (سرورهای گیت‌هاب خارج‌اند) — از پشتیبانیِ هاست بخواهید باز کند |
| «سایتِ زنده هنوز بیلدِ قبلی» | ‎DEPLOY_DIR‎ پوشه‌ی دیگری است، یا CDN کش کرده |
