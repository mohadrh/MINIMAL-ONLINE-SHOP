'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { asset } from '../../lib/asset';

const MODEL_URL = asset('/models/su57.glb');

/* ---------------------------------------------------------------
   Su-57 — مدل glTF

   نسخه‌ی قبلی STL خام بود: نه UV داشت نه متریال، پس رنگ کاموفلاژ را
   دستی روی رأس‌ها می‌ریختیم و الگو را با هش مختصات می‌ساختیم. کل آن
   ترفند حالا حذف شده، چون glTF متریال و تکسچر واقعی هواپیما را با
   خودش می‌آورد.

   چیزی که می‌ماند سه کار است:
     ۱. مرکز و مقیاس — مدل با هر اندازه‌ای که آمده باشد، در قاب بنشیند.
     ۲. حرکت پرواز — چرخش، شناوری و بنک.
     ۳. شعله‌ی آفتربرنر روی نازل‌ها موقع پرتاب.
--------------------------------------------------------------- */

export function Su57Model({
  targetSize = 2.4,
  spin = true,
  ignite = false,
}: {
  targetSize?: number;
  spin?: boolean;
  ignite?: boolean;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);

  /* صحنه بین همه‌ی نمونه‌ها کش می‌شود، پس قبل از دست زدن باید کلون
     شود — وگرنه دو نمونه روی یک شیء کار می‌کنند و مقیاس دو بار
     اعمال می‌شود. */
  const model = useMemo(() => {
    const root = scene.clone(true);

    // مرکز و مقیاس تا در قاب بنشیند، مستقل از واحد فایل
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = targetSize / maxDim;

    root.position.sub(center);
    root.scale.setScalar(scale);
    root.position.multiplyScalar(scale);

    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      /* متریال هم کش می‌شود. بدون کلون، روشن شدن آفتربرنر روی یک
         نمونه، همه‌ی نمونه‌های دیگر را هم روشن می‌کند. */
      const mat = mesh.material;
      mesh.material = Array.isArray(mat) ? mat.map((m) => m.clone()) : mat.clone();
    });

    return root;
  }, [scene, targetSize]);

  /* متریال‌هایی که باید موقع پرتاب بدرخشند. یک بار جمع می‌شوند تا هر
     فریم کل درخت پیمایش نشود. */
  const glowing = useMemo(() => {
    const list: THREE.MeshStandardMaterial[] = [];
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        if (std.emissive) {
          std.emissive = new THREE.Color('#ff7a29');
          std.emissiveIntensity = 0;
          list.push(std);
        }
      });
    });
    return list;
  }, [model]);

  useEffect(() => () => {
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m?.dispose());
    });
  }, [model]);

  useFrame((state, delta) => {
    if (group.current && spin) {
      const t = state.clock.elapsedTime;
      /* چرخش حول محور قائمِ دنیا. تصحیح محور روی گروه داخلی است، پس
         اینجا فقط با Y سروکار داریم و نیازی به فکر کردن به قرارداد
         مدل نیست. */
      group.current.rotation.y += delta * 0.2;
      // شناوری و بنک — بدون بنک، شبیه مدل روی میز گردان می‌شود نه پرواز
      group.current.position.y = Math.sin(t * 0.8) * 0.05;
      group.current.rotation.z = Math.sin(t * 0.45) * 0.07;
      group.current.rotation.x = Math.sin(t * 0.62) * 0.04;
    }

    // شعله‌ی آفتربرنر — نرم روشن و خاموش می‌شود، نه ناگهانی
    const target = ignite ? 2.2 : 0;
    const k = Math.min(1, delta * 8);
    glowing.forEach((m) => {
      m.emissiveIntensity += (target - m.emissiveIntensity) * k;
    });
  });

  /* دو گروه تودرتو، و این تفکیک عمدی است:

     گروه بیرونی انیمیشن را می‌گیرد. گروه داخلی فقط قرارداد محور را
     تصحیح می‌کند — این مدل Z-up است (طول روی X، ارتفاع روی Z) ولی
     three.js دنیا را Y-up می‌بیند.

     وقتی تصحیح محور نبود، چرخش حول Y هواپیما را دور محور طولش
     می‌چرخاند و هر نیم‌دور لبه‌به‌لبه می‌شد — همان چیزی که شبیه مداد
     دیده می‌شد. */
  return (
    <group ref={group}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={model} />
      </group>
    </group>
  );
}

/* مدل پیش از نیاز دانلود می‌شود تا اولین نمایش لحظه‌ای باشد */
useGLTF.preload(MODEL_URL);
