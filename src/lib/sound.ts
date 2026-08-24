/* ============================================================
   موتور صدا

   دو قاعده‌ی سخت:
   ۱. پیش‌فرض خاموش. صدای خودکار در بازدید اول آزاردهنده است و نرخ
      خروج را بالا می‌برد. کاربر خودش روشنش می‌کند و انتخابش می‌ماند.
   ۲. AudioContext فقط بعد از اولین تعامل کاربر ساخته می‌شود — مرورگرها
      ساخت زودهنگام را بلاک می‌کنند و کنسول پر از هشدار می‌شود.

   صداها سنتز می‌شوند، نه فایل: هیچ درخواست شبکه‌ای، هیچ بایت دانلودی.
   ============================================================ */

const STORAGE_KEY = 'phx-sound';

type Listener = (enabled: boolean) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = false;
  private listeners = new Set<Listener>();

  /** از localStorage خوانده می‌شود — فقط روی کلاینت */
  init() {
    if (typeof window === 'undefined') return;
    this.enabled = window.localStorage.getItem(STORAGE_KEY) === 'on';
    this.emit();
  }

  isEnabled() {
    return this.enabled;
  }

  /** برمی‌گرداند: تابع لغو اشتراک. عمداً void است نه boolean —
      این خروجی مستقیم به‌عنوان cleanup در useEffect استفاده می‌شود. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.enabled); // مقدار فعلی را فوراً بده تا UI منتظر تغییر بعدی نماند
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn(this.enabled));
  }

  toggle() {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, this.enabled ? 'on' : 'off');
    }
    this.emit();
    // بازخورد شنیداری خودِ روشن‌کردن
    if (this.enabled) this.blip(660, 0.08, 'sine');
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16; // سقف صدا — عمداً پایین
      this.master.connect(this.ctx.destination);
    }
    // مرورگر ممکن است کانتکست را معلق نگه دارد تا اولین تعامل
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** یک نُت کوتاه */
  private blip(freq: number, dur: number, type: OscillatorType = 'triangle', delay = 0) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;

    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);

    // پاکت نرم — بدون این، هر صدا یک «کلیک» دیجیتال دارد
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(1, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** نویز فیلترشده — برای صداهای «هوا» مثل پرواز */
  private noise(dur: number, from: number, to: number) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;

    const t0 = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  /* ---------- صداهای نام‌دار ---------- */

  hover() { this.blip(880, 0.05, 'sine'); }
  click() { this.blip(520, 0.07); }

  /** افزودن به سبد — دو نُت بالارونده */
  addToCart() {
    this.blip(523, 0.09);
    this.blip(784, 0.13, 'triangle', 0.07);
  }

  /** پرتاب جنگنده */
  launch() { this.noise(0.5, 380, 2400); }

  /** فرود روی سبد */
  impact() {
    this.blip(196, 0.16, 'sawtooth');
    this.blip(392, 0.1, 'sine', 0.03);
  }

  /** پرواز ققنوس به بالای صفحه */
  phoenix() { this.noise(0.75, 240, 1800); }

  success() {
    this.blip(659, 0.08);
    this.blip(880, 0.14, 'sine', 0.08);
  }

  error() {
    this.blip(220, 0.14, 'sawtooth');
    this.blip(165, 0.18, 'sawtooth', 0.1);
  }

  /* ---------- صداهای بازی سطح‌ها ---------- */

  /** جهش — نُت کوتاه بالارونده، مثل پلتفرمرهای کلاسیک */
  jump() { this.blip(392, 0.09, 'square'); this.blip(587, 0.07, 'square', 0.05); }

  /** فرود روی زمین — تُن کوتاه و بم */
  land() { this.blip(147, 0.06, 'triangle'); }

  /** رد شدن از پرچم — آرپژ چهارنُتی صعودی */
  flag() {
    this.blip(523, 0.09, 'square');
    this.blip(659, 0.09, 'square', 0.07);
    this.blip(784, 0.09, 'square', 0.14);
    this.blip(1047, 0.22, 'square', 0.21);
  }

  /** پایان مسیر — فانفار کوتاه */
  fanfare() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => this.blip(f, 0.16, 'triangle', i * 0.09));
  }

  /** افتادن در شکاف */
  fall() { this.blip(330, 0.12, 'sawtooth'); this.blip(180, 0.2, 'sawtooth', 0.08); }

  /** برداشتن سکه */
  coin() { this.blip(988, 0.06, 'square'); this.blip(1319, 0.12, 'square', 0.05); }

  /** موتور جنگنده — غرش کشیده‌تر از launch، برای نمایش سه‌بعدی */
  afterburner() { this.noise(1.1, 160, 900); this.blip(72, 0.9, 'sawtooth', 0.02); }

  /* ---------------------------------------------------------------
     پرواز سوخو.

     صدای جت یک بوق نیست، سه لایه است و هر سه لازم‌اند:

       ۱. غرش پایه — موج اره‌ای بم که با داپلر بالا و پایین می‌رود.
          بدون آن، صدا سبک و اسباب‌بازی‌وار می‌شود.
       ۲. سوت توربین — یک هارمونیک بالا که با غرش هم‌زمان حرکت می‌کند.
          همان چیزی که جت را از موتور معمولی جدا می‌کند.
       ۳. هوای عبوری — نویز پهن‌باند که در میانه اوج می‌گیرد.

     داپلر واقعی است نه تزئین: فرکانس موقع نزدیک شدن بالا می‌رود و
     موقع دور شدن پایین می‌آید، پس گوش «عبور» را می‌فهمد نه فقط
     «صدا».
  --------------------------------------------------------------- */
  jetFlyby(dur = 2.4) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;

    const t0 = ctx.currentTime;
    const mid = t0 + dur * 0.42;   // لحظه‌ی عبور — کمی قبل از وسط
    const end = t0 + dur;

    // ---- ۱. غرش پایه ----
    const rumble = ctx.createOscillator();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(58, t0);
    rumble.frequency.exponentialRampToValueAtTime(104, mid);
    rumble.frequency.exponentialRampToValueAtTime(42, end);

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.0001, t0);
    rumbleGain.gain.exponentialRampToValueAtTime(0.16, mid);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, end);

    // فیلتر پایین‌گذر تا اره‌ای خش‌دار نشود
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(320, t0);
    lp.frequency.linearRampToValueAtTime(900, mid);
    lp.frequency.linearRampToValueAtTime(260, end);

    rumble.connect(lp).connect(rumbleGain).connect(this.master);

    // ---- ۲. سوت توربین ----
    const whine = ctx.createOscillator();
    whine.type = 'triangle';
    whine.frequency.setValueAtTime(620, t0);
    whine.frequency.exponentialRampToValueAtTime(1180, mid);
    whine.frequency.exponentialRampToValueAtTime(430, end);

    const whineGain = ctx.createGain();
    whineGain.gain.setValueAtTime(0.0001, t0);
    whineGain.gain.exponentialRampToValueAtTime(0.045, mid);
    whineGain.gain.exponentialRampToValueAtTime(0.0001, end);

    whine.connect(whineGain).connect(this.master);

    // ---- ۳. هوای عبوری ----
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    const air = ctx.createBufferSource();
    air.buffer = buffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(400, t0);
    bp.frequency.exponentialRampToValueAtTime(2600, mid);
    bp.frequency.exponentialRampToValueAtTime(300, end);

    const airGain = ctx.createGain();
    airGain.gain.setValueAtTime(0.0001, t0);
    airGain.gain.exponentialRampToValueAtTime(0.09, mid);
    airGain.gain.exponentialRampToValueAtTime(0.0001, end);

    air.connect(bp).connect(airGain).connect(this.master);

    rumble.start(t0); whine.start(t0); air.start(t0);
    rumble.stop(end); whine.stop(end); air.stop(end);
  }
}

export const sound = new SoundEngine();
