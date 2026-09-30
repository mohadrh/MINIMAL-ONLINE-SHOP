// تستِ فایلِ پشتیبان — همان کدِ صفحه (admin/screens/backup.js)، بی‌مرورگر.
// اجرا:  node wp-plugin/tests/backup-crypto-test.mjs

import { buildBackup, readBackup, batches, passphraseProblem, canZip } from '../phoenix-bridge/admin/screens/backup.js';

let pass = 0;
let fail = 0;
const same = (label, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { pass++; console.log('  ok    ' + label); return; }
  fail++;
  console.log(`  FAIL  ${label}\n        got  ${g}\n        want ${w}`);
};
const throwsWith = async (label, fn, part) => {
  try { await fn(); fail++; console.log(`  FAIL  ${label} — خطا نداد`); } catch (e) { same(label, String(e.message).includes(part), true); }
};

const ITER = 100000; // کمترینی که readBackup می‌پذیرد — تست سریع بماند
const DATA = {
  'bridge.settings': [[{ name: 'phoenix_pricing_settings', value: { engine_on: true, note: 'قیمت' } }]],
  'account.customers': [
    [{ phone: '09121234567', name: 'علی', pass_hash: '$2y$10$abc' }, { phone: '09351112233', name: 'سارا' }],
    [{ phone: '09900000000', name: 'مینا' }],
  ],
  'bridge.codes': [[]],
};
const sections = Object.keys(DATA).map((id) => ({ id, label: id, group: 'g', count: 9 }));
const fetchBatch = async (id, cursor) => {
  const pages = DATA[id];
  const i = cursor === '' ? 0 : Number(cursor);
  return { rows: pages[i], next: i + 1 < pages.length ? String(i + 1) : null };
};
const make = (p = 'correct horse battery') => buildBackup({ pass: p, site: 'panel.example', versions: { bridge: '1.7.0' }, sections, fetchBatch, iter: ITER });

console.log(`\n== ساخت و باز کردن (فشرده: ${canZip}) ==`);
const built = await make();
const text = await built.blob.text();
const f = JSON.parse(text);
same('قالب و بی‌متنِ باز', [f.format, f.v, text.includes('09121234567'), text.includes('علی'), text.includes('engine_on')], ['phoenix-backup', 1, false, false, false]);
same('شمارِ ردیف‌ها', built.totals, { 'bridge.settings': 1, 'account.customers': 3, 'bridge.codes': 0 });
same('تکه‌ها: فهرست + ۳ دسته + پایان', f.chunks.map((c) => c.s), ['_manifest', 'bridge.settings', 'account.customers', 'account.customers', '_end']);

const b = await readBackup(text, 'correct horse battery');
same('فهرست', [b.manifest.site, b.manifest.versions.bridge, b.manifest.sections.length], ['panel.example', '1.7.0', 3]);
const got = [];
for await (const c of b.chunks()) got.push([c.section, c.rows.length]);
same('ردیف‌ها همان', got, [['bridge.settings', 1], ['account.customers', 2], ['account.customers', 1]]);
let firstRows;
for await (const c of b.chunks()) { if (c.section === 'account.customers') { firstRows = c.rows; break; } }
same('محتوا دقیقاً همان (فارسی، هش)', firstRows[0], { phone: '09121234567', name: 'علی', pass_hash: '$2y$10$abc' });

console.log('\n== حمله و خرابی ==');
await throwsWith('رمزِ اشتباه', () => readBackup(text, 'wrong password!!'), 'رمز اشتباه');
const tampered = JSON.parse(text);
const ct = tampered.chunks[2].ct;
tampered.chunks[2].ct = (ct[0] === 'A' ? 'B' : 'A') + ct.slice(1);
const t2 = await readBackup(JSON.stringify(tampered), 'correct horse battery');
await throwsWith('تکه‌ی دستکاری‌شده — پیش از نوشتن (verify)', () => t2.verify(), 'دستکاری');
const swapped = JSON.parse(text);
[swapped.chunks[2], swapped.chunks[3]] = [swapped.chunks[3], swapped.chunks[2]];
const t3 = await readBackup(JSON.stringify(swapped), 'correct horse battery');
await throwsWith('جابه‌جایی‌ِ تکه‌ها (AAD) — پیش از نوشتن', () => t3.verify(), 'دستکاری');
same('فایلِ سالم: verify شمارِ درست', await b.verify(), { 'bridge.settings': 1, 'account.customers': 3 });
const cut = JSON.parse(text);
cut.chunks.splice(2, 1);
await throwsWith('تکه‌ی حذف‌شده → ناقص', () => readBackup(JSON.stringify(cut), 'correct horse battery'), 'ناقص');
const trunc = JSON.parse(text);
trunc.chunks.pop();
await throwsWith('فایلِ نصفه (بی‌پایان)', () => readBackup(JSON.stringify(trunc), 'correct horse battery'), 'ناقص');
await throwsWith('فایلِ دیگر', () => readBackup('{"hello":1}', 'x'), 'نیست');
await throwsWith('متنِ غیرِ JSON', () => readBackup('PK\u0003\u0004', 'x'), 'نیست');
const newer = JSON.parse(text); newer.v = 2;
await throwsWith('نسخه‌ی تازه‌ترِ قالب', () => readBackup(JSON.stringify(newer), 'correct horse battery'), 'تازه‌تر');
const weak = JSON.parse(text); weak.kdf.iter = 10;
await throwsWith('PBKDF2ِ ضعیف رد', () => readBackup(JSON.stringify(weak), 'correct horse battery'), 'خراب');
const other = await make('another password 1');
same('دو فایل با یک داده، رمزِ متفاوت → متنِ متفاوت', JSON.parse(await other.blob.text()).chunks[1].ct === f.chunks[1].ct, false);

console.log('\n== رمز و دسته ==');
same('رمزِ کوتاه', passphraseProblem('short', 'short') !== '', true);
same('تکرارِ نابرابر', passphraseProblem('0123456789', '0123456780'), 'دو رمز یکی نیستند.');
same('درست', passphraseProblem('0123456789', '0123456789'), '');
const rows = Array.from({ length: 7 }, (_, i) => ({ i, pad: 'x'.repeat(100) }));
same('دسته با سقفِ تعداد', [...batches(rows, 3)].map((x) => x.length), [3, 3, 1]);
same('دسته با سقفِ حجم', [...batches(rows, 100, 250)].map((x) => x.length), [2, 2, 2, 1]);
same('ردیفِ بزرگ‌تر از سقف تنها می‌رود', [...batches([{ big: 'y'.repeat(500) }, { a: 1 }], 100, 100)].map((x) => x.length), [1, 1]);

console.log(`\n${pass} قبول، ${fail} مردود`);
process.exit(fail ? 1 : 0);
