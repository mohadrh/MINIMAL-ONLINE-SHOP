/* ============================================================
   پشتیبان‌گیری — خروجی، بازگرداندن، و نسخه‌های خودکارِ تنظیمات.

   ⚠ فایل همیشه رمزنگاری می‌شود، و همین‌جا در مرورگر: شماره‌ی
   مشتری‌ها، هشِ رمزها و کدهای فروخته‌نشده در آن است. رمزِ فایل هیچ‌وقت
   به سرور نمی‌رود. AES-GCM با کلید از PBKDF2 (ششصدهزار دور)؛ هر تکه
   جدا رمز می‌شود و به جایش در فایل بسته است (AAD) — تکه‌ای را نمی‌شود
   جابه‌جا یا حذف کرد بی‌آنکه باز کردن شکست بخورد، و تکه‌ی آخر تعدادِ
   همه را دارد تا فایلِ نصفه‌دانلودشده پیش از هر نوشتنی شناخته شود.

   ⚠ سرور ردیف‌ها را دسته‌دسته می‌دهد و می‌گیرد (backup.php) — هیچ
   درخواستی به سقفِ زمانِ هاست نمی‌خورد، هر قدر هم داده زیاد شود.

   توابعِ رمزنگاری export شده‌اند تا بی‌مرورگر تست شوند
   (tests/backup-crypto-test.mjs).
   ============================================================ */

export const FORMAT = 'phoenix-backup';
export const KDF_ITER = 600000;
const enc = new TextEncoder();
const dec = new TextDecoder();
/* هر درخواستِ بازگردانی حداکثر این‌قدر — زیرِ ‎post_max_size‎ی هاست‌های کوچک */
const MAX_BODY = 1500000;

/* ---------- رمزنگاری ---------- */

export function toB64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromB64(b64) {
  const s = atob(String(b64));
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

export const canZip = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

async function through(u8, stream) {
  return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer());
}

export async function deriveKey(pass, salt, iter = KDF_ITER) {
  const base = await crypto.subtle.importKey('raw', enc.encode(String(pass).normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

/** تکه به جایش در فایل بسته است: قالب، زمانِ ساخت، شماره، بخش */
export function aad(head, index, section) {
  return enc.encode([head.format, head.v, head.created, index, section].join('|'));
}

export async function seal(key, value, ad, zip) {
  let data = enc.encode(JSON.stringify(value));
  if (zip) data = await through(data, new CompressionStream('gzip'));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: ad }, key, data));
  return { iv: toB64(iv), ct: toB64(ct) };
}

export async function open(key, box, ad, zip) {
  let data = new Uint8Array(await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(box.iv), additionalData: ad }, key, fromB64(box.ct),
  ));
  if (zip) data = await through(data, new DecompressionStream('gzip'));
  return JSON.parse(dec.decode(data));
}

export function passphraseProblem(p, again) {
  if (!p || p.length < 10) return 'دست‌کم ۱۰ نویسه — بدونِ این رمز، فایل هیچ‌وقت باز نمی‌شود.';
  if (again !== undefined && p !== again) return 'دو رمز یکی نیستند.';
  return '';
}

/**
 * ساختنِ فایل. ‎fetchBatch(section, cursor)‎ یک دسته از سرور می‌آورد:
 * ‎{rows, next}‎. خروجی ‎Blob‎ است — تکه‌ها جدا در حافظه، نه یک رشته‌ی بزرگ.
 */
export async function buildBackup({ pass, site, versions, sections, fetchBatch, onProgress = () => {}, iter = KDF_ITER }) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const head = { format: FORMAT, v: 1, created: new Date().toISOString(), z: canZip ? 'gzip' : '',
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iter, salt: toB64(salt) } };
  const key = await deriveKey(pass, salt, iter);
  const parts = [];
  const push = async (s, value) => {
    const box = await seal(key, value, aad(head, parts.length, s), !!head.z);
    parts.push(JSON.stringify({ s, iv: box.iv, ct: box.ct }));
  };

  await push('_manifest', { site, versions, created: head.created,
    sections: sections.map(({ id, label, group, count }) => ({ id, label, group, count })) });
  const totals = {};
  for (const sec of sections) {
    totals[sec.id] = 0;
    let cursor = '';
    for (;;) {
      const r = await fetchBatch(sec.id, cursor);
      if (r.rows.length) await push(sec.id, r.rows);
      totals[sec.id] += r.rows.length;
      onProgress(sec, totals[sec.id]);
      if (r.next === null || r.next === undefined || r.next === cursor) break;
      cursor = r.next;
    }
  }
  await push('_end', { chunks: parts.length + 1, totals });
  const json = JSON.stringify(head);
  return {
    blob: new Blob([json.slice(0, -1), ',"chunks":[', parts.join(','), ']}'], { type: 'application/octet-stream' }),
    totals, created: head.created,
  };
}

/** باز کردن و بررسیِ فایل — پیش از اینکه یک ردیف هم نوشته شود */
export async function readBackup(text, pass) {
  let f;
  try { f = JSON.parse(text); } catch { throw new Error('این فایل، فایلِ پشتیبانِ فونیکس نیست.'); }
  if (!f || f.format !== FORMAT || !Array.isArray(f.chunks) || f.chunks.length < 2 || !f.kdf) {
    throw new Error('این فایل، فایلِ پشتیبانِ فونیکس نیست.');
  }
  if (f.v !== 1) throw new Error('این فایل با نسخه‌ی تازه‌ترِ افزونه ساخته شده. اول افزونه را به‌روز کن.');
  const iter = Number(f.kdf.iter);
  if (!(iter >= 100000 && iter <= 5000000)) throw new Error('فایل خراب است.');
  const key = await deriveKey(pass, fromB64(f.kdf.salt), iter);
  const zip = f.z === 'gzip';
  if (zip && !canZip) throw new Error('این مرورگر فایلِ فشرده را باز نمی‌کند — با Chrome، Edge یا Firefoxِ تازه امتحان کن.');
  let manifest;
  try {
    if (f.chunks[0].s !== '_manifest') throw new Error();
    manifest = await open(key, f.chunks[0], aad(f, 0, '_manifest'), zip);
  } catch {
    throw new Error('رمز اشتباه است، یا فایل خراب شده.');
  }
  const n = f.chunks.length;
  let end = null;
  try {
    if (f.chunks[n - 1].s === '_end') end = await open(key, f.chunks[n - 1], aad(f, n - 1, '_end'), zip);
  } catch { end = null; }
  if (!end || end.chunks !== n) throw new Error('فایل ناقص است — احتمالاً کامل دانلود نشده.');
  const totals = end.totals || {};
  return {
    manifest, totals,
    /* تکه‌ها یکی‌یکی، تا کلِ داده هم‌زمان در حافظه باز نشود */
    async *chunks() {
      for (let i = 1; i < n - 1; i++) {
        const c = f.chunks[i];
        yield { section: c.s, rows: await open(key, c, aad(f, i, c.s), zip) };
      }
    },
    /**
     * ⚠ همه‌ی تکه‌ها پیش از نوشتنِ اولین ردیف: تکه‌ی دستکاری‌شده‌ی وسطِ
     *   فایل وگرنه فقط وقتی پیدا می‌شد که نیمی از فایل نوشته شده بود.
     */
    async verify() {
      const counts = {};
      try {
        for await (const c of this.chunks()) {
          if (!Array.isArray(c.rows)) throw new Error();
          counts[c.section] = (counts[c.section] || 0) + c.rows.length;
        }
      } catch {
        throw new Error('بخشی از فایل خراب یا دستکاری شده — چیزی از آن بازگردانده نمی‌شود.');
      }
      for (const [id, t] of Object.entries(totals)) {
        if ((counts[id] || 0) !== t) throw new Error('فایل ناقص است — شمارِ ردیف‌ها با فهرستش نمی‌خواند.');
      }
      return counts;
    },
  };
}

/** ردیف‌ها در دسته‌هایی که هم تعدادشان و هم حجمشان زیرِ سقف است */
export function* batches(rows, maxRows, maxBytes = MAX_BODY) {
  let cur = [];
  let size = 0;
  for (const r of rows) {
    const b = JSON.stringify(r).length;
    if (cur.length && (cur.length >= maxRows || size + b > maxBytes)) {
      yield cur;
      cur = [];
      size = 0;
    }
    cur.push(r);
    size += b;
  }
  if (cur.length) yield cur;
}

/* ============================================================
   صفحه
   ============================================================ */

export async function render(ctx) {
  const d = await ctx.api('GET', '/backup');
  if (ctx.alive()) paint(ctx, d);
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function fileName(site, created, tag = '') {
  const day = created.slice(0, 16).replace(/[:T]/g, '-');
  return `phoenix-${tag ? tag + '-' : ''}${String(site || 'site').replace(/[^a-z0-9.-]/gi, '')}-${day}.phxb`;
}

function paint(ctx, d) {
  const { h, icon, fa, pill, put, toast, busyButton, card, confirmBox, ago } = ctx.ui;
  const { kit } = ctx;
  const fetchBatch = (id, cursor) => ctx.api('GET',
    `/backup/export?section=${encodeURIComponent(id)}&cursor=${encodeURIComponent(cursor)}&limit=${d.batch}`);
  const exportAll = (pass, sections, onProgress) =>
    buildBackup({ pass, site: d.site, versions: d.versions, sections, fetchBatch, onProgress });

  /* ---------- خروجی ---------- */
  const picks = new Map();
  const groups = {};
  for (const s of d.sections) (groups[s.group] = groups[s.group] || []).push(s);
  const pickList = h('div', { class: 'phx2-stack' }, Object.entries(groups).map(([g, list]) => h('div', { class: 'phx2-stack' },
    h('b', null, g),
    list.map((s) => {
      const t = kit.toggle({ checked: true, label: s.label + ' — ' + fa(s.count) + (s.kind === 'option' ? ' بخش' : ' ردیف') });
      picks.set(s.id, t);
      return t.el;
    }),
  )));

  const pass1 = kit.text({ type: 'password', dir: 'ltr', max: 200 });
  const pass2 = kit.text({ type: 'password', dir: 'ltr', max: 200 });
  const F1 = kit.field({ label: 'رمزِ فایل', hint: 'دست‌کم ۱۰ نویسه. جایی امن نگهش دار — بدونِ آن، فایل هیچ‌وقت باز نمی‌شود و ما هم نمی‌توانیم بازش کنیم.' }, pass1.el);
  const F2 = kit.field({ label: 'تکرارِ رمز' }, pass2.el);
  const exOut = h('div', { class: 'phx2-stack', 'aria-live': 'polite' });
  const exBtn = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('save'), 'ساختنِ فایلِ پشتیبان');
  exBtn.addEventListener('click', busyButton(exBtn, async () => {
    F1.setError(''); F2.setError('');
    const bad = passphraseProblem(pass1.get(), pass2.get());
    if (bad) { (bad.includes('یکی') ? F2 : F1).setError(bad); return; }
    const chosen = d.sections.filter((s) => picks.get(s.id).get());
    if (!chosen.length) { toast('دست‌کم یک بخش را انتخاب کن.', 'warn'); return; }
    const bar = h('progress', { class: 'phx2-progress', max: String(chosen.reduce((a, s) => a + Math.max(1, s.count), 0)), value: '0' });
    const line = h('span', { class: 'phx2-td-muted' }, 'آماده‌سازی…');
    put(exOut, bar, line);
    let done = 0;
    const seen = {};
    try {
      const r = await exportAll(pass1.get(), chosen, (sec, n) => {
        done += n - (seen[sec.id] || 0);
        seen[sec.id] = n;
        bar.value = done;
        line.textContent = sec.label + ' — ' + fa(n);
      });
      const name = fileName(d.site, r.created);
      download(r.blob, name);
      ctx.api('POST', '/backup/log', { act: 'export', sections: chosen.map((s) => s.id) }).catch(() => {});
      put(exOut, h('div', { class: 'phx2-callout' }, icon('check'), h('span', null,
        'فایل «' + name + '» دانلود شد (' + fa(Math.ceil(r.blob.size / 1024)) + ' کیلوبایت). کنارِ رمزش، جایی جدا از هاست نگهش دار.')));
      pass1.set(''); pass2.set('');
    } catch (e) {
      put(exOut, h('div', { class: 'phx2-callout is-warn' }, icon('alert'), h('span', null, 'ساخته نشد: ' + e.message)));
    }
  }));

  const exportCard = card('ساختنِ فایلِ پشتیبان',
    'پیش از هر به‌روزرسانی یا تغییرِ بزرگ. فایل رمزنگاری‌شده در همین مرورگر ساخته و دانلود می‌شود؛ روی هاست چیزی نمی‌ماند.',
    pickList,
    h('div', { class: 'phx2-form' }, F1, F2),
    h('div', { class: 'phx2-row phx2-row--end' }, exBtn),
    exOut,
  );

  /* ---------- بازگرداندن ---------- */
  const file = h('input', { type: 'file', accept: '.phxb,application/octet-stream,application/json', class: 'phx2-in' });
  const passIn = kit.text({ type: 'password', dir: 'ltr', max: 200 });
  const FF = kit.field({ label: 'فایلِ پشتیبان (‎.phxb‎)' }, file);
  const FP = kit.field({ label: 'رمزِ همان فایل' }, passIn.el);
  const imOut = h('div', { class: 'phx2-stack', 'aria-live': 'polite' });
  const openBtn = h('button', { class: 'phx2-btn', type: 'button' }, icon('eye'), 'باز کردن و دیدن');
  openBtn.addEventListener('click', busyButton(openBtn, async () => {
    FF.setError(''); FP.setError('');
    const f = file.files && file.files[0];
    if (!f) { FF.setError('فایل را انتخاب کن.'); return; }
    let b;
    try {
      b = await readBackup(await f.text(), passIn.get());
      await b.verify();
    } catch (e) { FP.setError(e.message); return; }
    preview(b, passIn.get());
  }));

  function preview(b, pass) {
    const m = b.manifest;
    const known = new Set(d.sections.map((s) => s.id));
    const mode = kit.seg({ value: 'merge', label: 'روش', options: [
      { value: 'merge', label: 'ادغام (پیشنهادی)' }, { value: 'overwrite', label: 'جایگزینی' }] });
    const chosen = new Map();
    const rows = m.sections.map((s) => {
      const t = kit.toggle({ checked: known.has(s.id), label: s.label + ' — ' + fa(b.totals[s.id] ?? s.count) });
      if (!known.has(s.id)) { t.el.querySelector('button').disabled = true; }
      chosen.set(s.id, t);
      return h('div', { class: 'phx2-row' }, t.el, known.has(s.id) ? null : pill('در این نسخه نیست', 'warn'));
    });
    const warn = [];
    if (m.site && m.site !== d.site) warn.push('این فایل از سایتِ دیگری است (' + m.site + '). کلیدهای اتصال‌ها در این سایت باز نمی‌شوند و باید دوباره وارد شوند.');
    for (const [k, v] of Object.entries(m.versions || {})) {
      if (d.versions[k] && String(v).localeCompare(String(d.versions[k]), undefined, { numeric: true }) > 0) {
        warn.push(`فایل با ${k} ${v} ساخته شده و این‌جا ${d.versions[k]} است — چیزهایی که این نسخه نمی‌شناسد رد می‌شوند.`);
      }
    }

    const go = h('button', { class: 'phx2-btn phx2-btn--primary', type: 'button' }, icon('refresh'), 'بازگرداندن');
    const result = h('div', { class: 'phx2-stack', 'aria-live': 'polite' });
    go.addEventListener('click', busyButton(go, async () => {
      const ids = [...chosen].filter(([, t]) => t.get()).map(([id]) => id);
      if (!ids.length) { toast('دست‌کم یک بخش را انتخاب کن.', 'warn'); return; }
      const over = mode.get() === 'overwrite';
      const ok = await confirmBox({
        title: 'بازگرداندن از فایل؟',
        text: (over ? 'جایگزینی: ردیف‌های فایل روی همان ردیف‌های سایت نوشته می‌شوند. ' : 'ادغام: فقط چیزی که نیست اضافه، و کهنه‌تر تازه می‌شود. ')
          + 'تنظیمات در هر دو حالت از فایل می‌آیند. کدِ فروخته‌شده هیچ‌وقت دوباره آزاد نمی‌شود. اول از وضعیتِ فعلی یک فایل با همین رمز دانلود می‌شود.',
        ok: 'بازگردان', tone: over ? 'bad' : 'brand',
      });
      if (!ok) return;

      const bar = h('progress', { class: 'phx2-progress', max: String(ids.reduce((a, id) => a + Math.max(1, b.totals[id] || 0), 0)), value: '0' });
      const line = h('span', { class: 'phx2-td-muted' }, 'اول: نسخه‌ی وضعیتِ فعلی…');
      put(result, bar, line);
      try {
        const safety = await exportAll(pass, d.sections, (sec, n) => { line.textContent = 'نسخه‌ی وضعیتِ فعلی — ' + sec.label + ' ' + fa(n); });
        download(safety.blob, fileName(d.site, safety.created, 'before-restore'));
      } catch (e) {
        put(result, h('div', { class: 'phx2-callout is-warn' }, icon('alert'), h('span', null, 'نسخه‌ی وضعیتِ فعلی ساخته نشد، پس چیزی بازگردانده نشد: ' + e.message)));
        return;
      }

      const sum = {};
      const notes = new Set();
      let done = 0;
      try {
        for await (const c of b.chunks()) {
          if (!ids.includes(c.section)) continue;
          const s = (sum[c.section] = sum[c.section] || { inserted: 0, replaced: 0, skipped: 0, rejected: 0 });
          for (const part of batches(c.rows, d.batch)) {
            const r = await ctx.api('POST', '/backup/import', { section: c.section, mode: mode.get(), rows: part });
            for (const k of Object.keys(s)) s[k] += r[k] || 0;
            (r.notes || []).forEach((n) => notes.add(n));
            done += part.length;
            bar.value = done;
            line.textContent = c.section + ' — ' + fa(done);
          }
        }
      } catch (e) {
        notes.add('در میانه متوقف شد: ' + e.message + ' — چیزی که تا این‌جا نوشته شده می‌ماند؛ می‌توانی دوباره «ادغام» بزنی.');
      }
      ctx.api('POST', '/backup/log', { act: 'import', mode: mode.get(), sections: ids }).catch(() => {});
      const label = Object.fromEntries(m.sections.map((s) => [s.id, s.label]));
      put(result,
        h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table' },
          h('thead', null, h('tr', null, ['بخش', 'اضافه', 'تازه شد', 'دست نخورد', 'رد'].map((t) => h('th', null, t)))),
          h('tbody', null, Object.entries(sum).map(([id, s]) => h('tr', null,
            h('td', null, label[id] || id), h('td', { class: 'num' }, fa(s.inserted)), h('td', { class: 'num' }, fa(s.replaced)),
            h('td', { class: 'num' }, fa(s.skipped)), h('td', { class: 'num' }, s.rejected ? pill(fa(s.rejected), 'warn') : fa(0)))))),
        ),
        [...notes].map((n) => h('div', { class: 'phx2-callout is-warn' }, icon('alert'), h('span', null, n))),
        h('p', { class: 'phx2-td-muted' }, 'تمام شد. برای دیدنِ تنظیماتِ تازه صفحه را تازه کن.'),
      );
    }));

    put(imOut,
      h('dl', { class: 'phx2-kvs2' },
        h('dt', null, 'ساخته‌شده'), h('dd', null, ago(m.created)),
        h('dt', null, 'سایت'), h('dd', { dir: 'ltr' }, m.site || '—'),
        h('dt', null, 'نسخه‌ها'), h('dd', { dir: 'ltr' }, Object.entries(m.versions || {}).map(([k, v]) => k + ' ' + v).join(' · ')),
      ),
      warn.map((w) => h('div', { class: 'phx2-callout is-warn' }, icon('alert'), h('span', null, w))),
      h('div', { class: 'phx2-stack' }, rows),
      kit.field({ label: 'روش', wide: true, hint: 'ادغام: چیزی که در سایت هست و تازه‌تر است می‌ماند — برای وقتی که فقط چیزی گم شده. جایگزینی: ردیف‌های فایل برنده‌اند — برای برگشتن به وضعیتِ همان روز.' }, mode.el),
      h('div', { class: 'phx2-row phx2-row--end' }, go),
      result,
    );
  }

  const importCard = card('بازگرداندن از فایل',
    'فایل در همین مرورگر باز می‌شود؛ پیش از نوشتنِ هر چیزی، محتوایش را می‌بینی و بخش‌ها را انتخاب می‌کنی.',
    h('div', { class: 'phx2-form' }, FF, FP),
    h('div', { class: 'phx2-row phx2-row--end' }, openBtn),
    imOut,
  );

  /* ---------- نسخه‌های خودکار ---------- */
  const snapBtn = h('button', { class: 'phx2-btn phx2-btn--ghost', type: 'button' }, icon('save'), 'ذخیره‌ی الان');
  snapBtn.addEventListener('click', busyButton(snapBtn, async () => {
    try { paint(ctx, await ctx.api('POST', '/backup/snapshot', { act: 'take' })); toast('ذخیره شد.', 'good'); } catch (e) { toast(e.message, 'bad'); }
  }));
  const snapRows = d.snapshots.map((sn) => {
    const b = h('button', { class: 'phx2-btn phx2-btn--sm', type: 'button' }, 'بازگرداندن');
    b.addEventListener('click', busyButton(b, async () => {
      const ok = await confirmBox({ title: 'تنظیمات به این نسخه برگردد؟',
        text: 'فقط تنظیمات (قیمت، حاشیه، تخفیف، اتصال‌ها، پیامک و چت) — مشتری، سفارش و کد دست نمی‌خورند. نسخه‌ای از وضعیتِ فعلی هم پیش از آن ذخیره می‌شود.', ok: 'برگردان' });
      if (!ok) return;
      try { paint(ctx, await ctx.api('POST', '/backup/snapshot', { act: 'restore', id: sn.id })); toast('برگشت.', 'good'); } catch (e) { toast(e.message, 'bad'); }
    }));
    return h('tr', null,
      h('td', null, ago(sn.at)), h('td', null, sn.reason),
      h('td', { dir: 'ltr', class: 'phx2-td-muted' }, Object.entries(sn.versions || {}).map(([k, v]) => k + ' ' + v).join(' · ')),
      h('td', null, b));
  });
  const snapCard = card('نسخه‌های خودکارِ تنظیمات',
    'هر بار نسخه‌ی یکی از افزونه‌ها عوض شود، پیش از اینکه کدِ تازه کاری بکند، تنظیمات این‌جا ذخیره می‌شوند (پنج‌تای آخر).',
    d.snapshots.length
      ? h('div', { class: 'phx2-tablewrap' }, h('table', { class: 'phx2-table' },
        h('thead', null, h('tr', null, ['کِی', 'چرا', 'نسخه‌ها', ''].map((t) => h('th', null, t)))),
        h('tbody', null, snapRows)))
      : h('p', { class: 'phx2-empty' }, 'هنوز نسخه‌ای نیست.'),
    h('div', { class: 'phx2-row phx2-row--end' }, snapBtn),
  );

  put(ctx.view,
    kit.pageHead({ title: 'پشتیبان‌گیری', sub: 'داده و تنظیماتِ فونیکس — پیش از به‌روزرسانی فایل بگیر؛ اگر چیزی خراب شد، از همین‌جا برگردان.' }),
    h('div', { class: 'phx2-callout' }, icon('info'), h('span', null,
      'به‌روزرسانیِ افزونه‌ها هیچ داده‌ای پاک نمی‌کند — حتی حذفِ افزونه هم جدول‌ها و تنظیمات را نگه می‌دارد. این فایل برای روزِ مبادا است. سفارش‌ها و محصولاتِ ووکامرس جزوِ این فایل نیستند؛ برای آن‌ها پشتیبانِ کاملِ هاست لازم است.')),
    exportCard, importCard, snapCard,
  );
}
