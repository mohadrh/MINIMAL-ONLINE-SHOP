'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { sound } from '../lib/sound';
import { PRODUCTS } from '../data/catalog';
import type { Product, Variant } from '../data/catalog';

/* ============================================================
   سبد خرید
   در نسخه‌ی Vite این استیت داخل App.tsx بود. حالا که هر صفحه یک
   روت مستقل است، باید بالاتر از روت‌ها زندگی کند.
   ============================================================ */

export interface CartLine {
  key: string;              // productId::variantId — کلید یکتای خط سبد
  product: Product;
  variant: Variant;
  quantity: number;
  /** ورودی‌هایی که مشتری قبل از پرداخت داده (ایمیل، یوزرنیم، آی‌دی بازیکن) */
  inputs: Record<string, string>;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (product: Product, variant: Variant, inputs?: Record<string, string>) => void;
  setQuantity: (key: string, delta: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart باید داخل <Providers> استفاده شود');
  return ctx;
}

/* ============================================================
   پرواز سوخو-۵۷ به سبد
   کارت محصول مستطیل خودش را اعلام می‌کند، اورلی پرواز را اجرا می‌کند.
   ============================================================ */

export interface FlightRequest {
  id: number;
  from: { x: number; y: number };
}

interface FlightContextValue {
  flight: FlightRequest | null;
  launch: (from: { x: number; y: number }) => void;
  complete: () => void;
  cartAnchor: { x: number; y: number } | null;
  registerCartAnchor: (pos: { x: number; y: number }) => void;
}

const FlightContext = createContext<FlightContextValue | null>(null);

export function useFlight() {
  const ctx = useContext(FlightContext);
  if (!ctx) throw new Error('useFlight باید داخل <Providers> استفاده شود');
  return ctx;
}

/* ============================================================ */

const CART_KEY = 'phoenix.cart.v1';

export function Providers({ children }: { children: React.ReactNode }) {

  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  /* تا اولین خواندن از حافظه انجام نشده، ننویس — وگرنه آرایه‌ی خالیِ
     اولیه سبد ذخیره‌شده را پاک می‌کند.

     این یک state است نه ref، و دلیلش دقیق است: ref را نمی‌شود به
     وابستگی‌های افکت نوشتن داد، پس آن افکت همان رندر اول با lines
     خالی اجرا می‌شد و حافظه را صفر می‌کرد. با state، افکت نوشتن
     دوباره اجرا می‌شود — این بار وقتی lines پر شده است. */
  const [hydrated, setHydrated] = useState(false);

  /* ---------------------------------------------------------------
     ماندگاری سبد.

     بدون این، رفرش صفحه سبد را خالی می‌کرد — و چون پرداخت کاربر را
     از سایت بیرون می‌برد و برمی‌گرداند، این یعنی هر برگشت از درگاه
     مساوی از دست رفتن سبد.

     محصول کامل ذخیره می‌شود نه فقط شناسه، تا صفحه بدون رفت‌وبرگشت به
     کاتالوگ رندر شود؛ در عوض موقع خواندن با کاتالوگ فعلی تطبیق داده
     می‌شود تا قیمت قدیمی روی صفحه نماند.
  --------------------------------------------------------------- */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as CartLine[];
        const fresh = saved
          .map((l) => {
            const product = PRODUCTS.find((p) => p.id === l.product.id);
            const variant = product?.variants.find((v) => v.id === l.variant.id);
            if (!product || !variant) return null;   // محصول یا پلن حذف شده
            return { ...l, product, variant };
          })
          .filter((l): l is CartLine => l !== null);
        if (fresh.length) setLines(fresh);
      }
    } catch {
      /* حافظه‌ی خراب یا حالت خصوصی — سبد خالی شروع می‌شود */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      /* فضای حافظه پر است — سبد در همین نشست معتبر می‌ماند */
    }
  }, [lines, hydrated]);

  const [flight, setFlight] = useState<FlightRequest | null>(null);
  const [cartAnchor, setCartAnchor] = useState<{ x: number; y: number } | null>(null);

  const add: CartContextValue['add'] = useCallback((product, variant, inputs = {}) => {
    sound.addToCart();
    const key = `${product.id}::${variant.id}`;
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { key, product, variant, quantity: 1, inputs }];
    });
  }, []);

  const setQuantity: CartContextValue['setQuantity'] = useCallback((key, delta) => {
    setLines((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const cart = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.variant.price * l.quantity, 0),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      add,
      setQuantity,
      remove,
      clear: () => setLines([]),
    }),
    [lines, isOpen, add, setQuantity, remove]
  );

  const flightValue = useMemo<FlightContextValue>(
    () => ({
      flight,
      // پرواز جدید تا پایان پرواز قبلی نادیده گرفته می‌شود
      launch: (from) =>
        setFlight((f) => {
          if (f) return f;
          /* سه صدا روی هم: پرتاب کوتاه، آفتربرنر، و عبور جت با داپلر.
             هرکدام یک لایه از یک اتفاق‌اند، نه سه صدای جدا. */
          sound.launch();
          sound.afterburner();
          sound.jetFlyby(1.6);
          return { id: Date.now(), from };
        }),
      complete: () => { sound.impact(); setFlight(null); },
      cartAnchor,
      registerCartAnchor: setCartAnchor,
    }),
    [flight, cartAnchor]
  );

  return (
    <CartContext.Provider value={cart}>
      <FlightContext.Provider value={flightValue}>{children}</FlightContext.Provider>
    </CartContext.Provider>
  );
}
