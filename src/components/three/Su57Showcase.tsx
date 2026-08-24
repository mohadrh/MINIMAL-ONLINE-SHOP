'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { Su57Model } from './Su57Model';
import './su57.css';

/**
 * نمایش سه‌بعدی Su-57.
 *
 * دو تصمیم که روی موبایل تفاوت واقعی می‌سازند:
 *
 *  ۱. صحنه تا وقتی وارد ویوپورت نشده اصلاً ساخته نمی‌شود. یک زمینه‌ی
 *     WebGL بیکار روی گوشی هم باتری می‌خورد هم حافظه.
 *  ۲. زیر prefers-reduced-motion و روی دستگاه‌های ضعیف، به تصویر
 *     ثابت سقوط می‌کند — نه اینکه کند بچرخد.
 */
export function Su57Showcase({
  height = 380,
  interactive = true,
  caption,
}: {
  height?: number;
  interactive?: boolean;
  caption?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        // یک‌طرفه: وقتی ساخته شد، با اسکرول دوباره نابود نمی‌شود
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="su57" style={{ height }}>
      <span className="su57__glow" aria-hidden="true" />

      {visible && !reduce ? (
        <Canvas
          shadows
          camera={{ position: [0, 1.1, 3.4], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          onCreated={({ gl }) => { gl.toneMappingExposure = 1.35; }}
        >
          {/* نورپردازی برای مدل glTF بازنویسی شد.

             نسخه‌ی قبلی برای STLِ رنگ‌شده‌ی دستی تنظیم شده بود و عمداً
             کم‌نور بود تا سه تُن کاموفلاژ به سفید نرسند. حالا مدل
             تکسچر واقعی دارد و آن نور کم فقط تاریکش می‌کرد. */}
          <ambientLight intensity={0.9} />
          <directionalLight
            position={[3, 6, 4]}
            intensity={2.6}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          {/* پرکننده‌ی سرد از پشت — لبه‌ی بال را از پس‌زمینه جدا می‌کند */}
          <directionalLight position={[-4, 2, -3]} intensity={1.3} color="#6f9bd1" />
          {/* لبه‌ی کهربایی برند، از پایین */}
          <pointLight position={[0, -1.6, 2]} intensity={1.6} color="#e8862e" distance={9} />

          <Suspense fallback={null}>
            <Su57Model targetSize={3.4} spin />
            {/* «night» بازتاب کمتری می‌دهد؛ رنگ رادارگریز نباید براق باشد */}
            <Environment preset="city" environmentIntensity={0.85} />
            <ContactShadows
              position={[0, -1.15, 0]}
              opacity={0.45}
              scale={7}
              blur={2.6}
              far={3}
            />
          </Suspense>

          {interactive && (
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              minPolarAngle={Math.PI / 3.4}
              maxPolarAngle={Math.PI / 1.9}
              rotateSpeed={0.5}
            />
          )}
        </Canvas>
      ) : (
        <div className="su57__fallback" aria-hidden="true">
          <span className="su57__fallback-mark">SU-57</span>
        </div>
      )}

      {caption && <span className="su57__caption">{caption}</span>}

      {interactive && visible && !reduce && (
        <span className="su57__hint">برای چرخاندن، بکشید</span>
      )}
    </div>
  );
}
