'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Trail, useGLTF } from '@react-three/drei';
import { useFlight } from '../../app/providers';
import { asset } from '../../lib/asset';

const MODEL_URL = asset('/models/su57.glb');
const DURATION_MS = 1100;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ---------------------------------------------------------------
   جنگنده

   همان مدل glTF نمایش سه‌بعدی، پس متریال و تکسچر واقعی هواپیما را
   دارد. نسخه‌ی قبلی STL خام بود و کاموفلاژ را دستی روی رأس‌ها
   می‌ساخت؛ آن کد با آمدن glTF بی‌مصرف شد.

   یک نکته: مدل بین این اورلی و نمایش صفحه‌ی پیگیری مشترک است، پس
   قبل از دست زدن کلون می‌شود — وگرنه مقیاس اینجا روی آن یکی هم
   اعمال می‌شد.
--------------------------------------------------------------- */
function Jet({ targetSize = 110 }: { targetSize?: number }) {
  const { scene } = useGLTF(MODEL_URL);

  const model = useMemo(() => {
    const root = scene.clone(true);

    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = targetSize / maxDim;

    root.position.sub(center);
    root.scale.setScalar(s);
    root.position.multiplyScalar(s);

    /* رنگ واقعی مدل دست‌نخورده می‌ماند — همان چیزی که در صفحه‌ی
       پیگیری دیده می‌شود.

       نسخه‌ی قبل روی همه‌ی متریال‌ها شعله‌ی نارنجی می‌گذاشت و کل
       هواپیما نارنجی می‌شد. متریال فقط کلون می‌شود تا این نمونه با
       نمونه‌ی صفحه‌ی پیگیری قاطی نشود. */
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material;
      mesh.material = Array.isArray(mat) ? mat.map((m) => m.clone()) : mat.clone();
    });

    return root;
  }, [scene, targetSize]);

  useEffect(() => () => {
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m?.dispose());
    });
  }, [model]);

  /* نمای از بالا.

     اندازه‌ی مدل در فضای دنیا (بعد از ترنسفورم گره‌ها) ۱۹۵×۴۶×۱۴۲ است:
     نازک‌ترین محور Y است، یعنی ارتفاع هواپیما. دوربین اورتوگرافیک در
     راستای Z نگاه می‌کند، پس بدون چرخش فقط لبه‌ی هواپیما دیده می‌شود.

     دو گروه تودرتو، هرکدام یک کار:
       داخلی — چرخش ۹۰ درجه حول X تا سطح بالای هواپیما رو به دوربین
               بیاید. علامتش مهم است: با منفی، شکم هواپیما دیده می‌شد
               نه پشتش. چرخش حول X محور طول را جابه‌جا نمی‌کند، پس
               عوض کردن علامت فقط رو و زیر را عوض می‌کند.
       بیرونی — چرخش حول Z تا دماغه رو به بالای صفحه بایستد؛ طول
               هواپیما روی X است و بدون این، افقی پرواز می‌کرد.
  */
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={model} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);

/** دوربین ارتوگرافیک پیکسلی: (۰,۰) گوشه‌ی پایین-چپ ویوپورت */
function ScreenCamera() {
  const { size, camera } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.left = 0;
    cam.right = size.width;
    cam.top = size.height;
    cam.bottom = 0;
    cam.near = -1000;
    cam.far = 1000;
    cam.position.set(0, 0, 100);
    cam.updateProjectionMatrix();
  }, [size, camera]);
  return null;
}

function ImpactRing() {
  const ref = useRef<THREE.Mesh>(null!);
  const start = useRef(performance.now());
  useFrame(() => {
    if (!ref.current) return;
    const t = Math.min(1, (performance.now() - start.current) / 420);
    ref.current.scale.setScalar(18 + t * 90);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 1 - t;
  });
  return (
    <mesh ref={ref} position={[0, 0, -5]}>
      <ringGeometry args={[0.82, 1, 48]} />
      <meshBasicMaterial color="#e8862e" transparent opacity={1} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function FlyingJet({
  from,
  to,
  onArrive,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  onArrive: () => void;
}) {
  const { size } = useThree();
  const group = useRef<THREE.Group>(null!);
  const start = useRef(performance.now());
  const [phase, setPhase] = useState<'fly' | 'impact'>('fly');

  // مختصات DOM از بالا می‌آید، دنیای three از پایین — فقط همین‌جا برعکس می‌شود
  const A = { x: from.x, y: size.height - from.y };
  const B = { x: to.x, y: size.height - to.y };

  // کمان رو به بالا، تا مسیر «سوئیش» بشود نه خط صاف
  const bow = Math.max(90, Math.hypot(B.x - A.x, B.y - A.y) * 0.35);
  const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 + bow };

  const pointAt = (t: number) => ({
    x: (1 - t) ** 2 * A.x + 2 * (1 - t) * t * mid.x + t ** 2 * B.x,
    y: (1 - t) ** 2 * A.y + 2 * (1 - t) * t * mid.y + t ** 2 * B.y,
  });

  useFrame(() => {
    if (phase !== 'fly' || !group.current) return;
    const tRaw = Math.min(1, (performance.now() - start.current) / DURATION_MS);
    const t = easeInOutCubic(tRaw);
    const p = pointAt(t);
    const ahead = pointAt(Math.min(1, t + 0.01));

    group.current.position.set(p.x, p.y, Math.sin(t * Math.PI) * 40);
    // دماغه همیشه رو به مسیر حرکت
    group.current.rotation.z = Math.atan2(ahead.y - p.y, ahead.x - p.x) - Math.PI / 2;
    group.current.scale.setScalar(1 - 0.35 * t);

    if (tRaw >= 1) setPhase('impact');
  });

  useEffect(() => {
    if (phase !== 'impact') return;
    const id = setTimeout(onArrive, 260);
    return () => clearTimeout(id);
  }, [phase, onArrive]);

  return (
    <group ref={group} position={[A.x, A.y, 0]}>
      <Trail width={7} length={5.5} color="#ff9a4d" attenuation={(t) => t * t} decay={2} local>
        <Jet targetSize={110} />
      </Trail>
      <pointLight color="#ff8a3d" intensity={phase === 'fly' ? 6 : 0} distance={240} />
      {phase === 'impact' && <ImpactRing />}
    </group>
  );
}

/**
 * یک نمونه در کل اپ، داخل لایوت ریشه.
 *
 * Canvas فقط وقتی پروازی در جریان است ساخته می‌شود — نگه‌داشتن یک
 * زمینه‌ی WebGL بیکار روی هر صفحه، باتری موبایل را بی‌دلیل می‌خورد.
 */
export function JetFlightOverlay() {
  const { flight, complete, cartAnchor } = useFlight();
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // بدون مقصد یا زیر کاهش موشن، پرواز بلافاصله تمام‌شده حساب می‌شود
  useEffect(() => {
    if (flight && (reduce || !cartAnchor)) complete();
  }, [flight, reduce, cartAnchor, complete]);

  if (!flight || !cartAnchor || reduce) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 600, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <Canvas orthographic gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
        <ScreenCamera />
        {/* مدل تکسچردار نور بیشتری از نسخه‌ی رنگ‌شده‌ی دستی لازم دارد،
            وگرنه در پس‌زمینه‌ی تیره‌ی صفحه سیاه دیده می‌شود */}
        <ambientLight intensity={1.8} />
        <directionalLight position={[0, 300, 400]} intensity={2.4} />
        <directionalLight position={[-200, -100, 300]} intensity={1.1} color="#9fc4ff" />
        <Suspense fallback={null}>
          <FlyingJet key={flight.id} from={flight.from} to={cartAnchor} onArrive={complete} />
        </Suspense>
      </Canvas>
    </div>
  );
}
