/* ============================================================
   حل‌کننده‌ی مسیر برای اجرای مستقیم TypeScript در Node

   ⚠ چرا لازم است

   TypeScript با تنظیم bundler اجازه می‌دهد بنویسی
   ‎import { GAMES } from './games'‎ بدون پسوند. Node این را قبول
   ندارد و دنبال فایلی به نام دقیقاً `games` می‌گردد و پیدا
   نمی‌کند.

   دو راه بود: پسوند را به همه‌ی ایمپورت‌های پروژه اضافه کنیم —
   ده‌ها فایل، فقط برای اینکه یک اسکریپت اجرا شود — یا این‌جا
   پسوند را حدس بزنیم. دومی کد اصلی را دست نمی‌زند.

   استفاده:
     node --experimental-strip-types --import ./scripts/ts-resolver.mjs ...
   ============================================================ */

import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as pathResolve } from 'node:path';
import { register } from 'node:module';

const EXTS = ['.ts', '.tsx', '.mjs', '.js', '.json'];

/** برای ایمپورت‌های نسبیِ بی‌پسوند، پسوند را پیدا می‌کند */
export function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    const parentPath = context.parentURL
      ? dirname(fileURLToPath(context.parentURL))
      : process.cwd();

    for (const ext of EXTS) {
      const candidate = pathResolve(parentPath, specifier + ext);
      if (existsSync(candidate)) {
        return next(pathToFileURL(candidate).href, context);
      }
    }
    /* شاید پوشه با index باشد */
    for (const ext of EXTS) {
      const candidate = pathResolve(parentPath, specifier, `index${ext}`);
      if (existsSync(candidate)) {
        return next(pathToFileURL(candidate).href, context);
      }
    }
  }
  return next(specifier, context);
}

/* JSON بدون import attribute هم باید کار کند، چون کد اصلی
   TypeScript است و آن‌جا لازم نیست. */
export function load(url, context, next) {
  if (url.endsWith('.json') && !context.importAttributes?.type) {
    return next(url, { ...context, importAttributes: { type: 'json' } });
  }
  return next(url, context);
}

register(import.meta.url, import.meta.url);
