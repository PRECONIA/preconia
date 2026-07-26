"use client";

/* Scène 3D (React Three Fiber) du pilier Toxine — atlas du membre supérieur.
   Anatomie réelle Open3D (upper-limb.glb, CC BY-SA 4.0). Le muscle SÉLECTIONNÉ
   (ses nœuds) est mis en évidence en bordeaux, les autres muscles sont estompés et
   les os très transparents. Orientation pilotée par le panneau de contrôle (vues
   préréglées + flèches). Un plan de coupe translucide, piloté par l'ascenseur sur le
   ventre du muscle sélectionné, matérialise le niveau de la coupe axiale. */

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { RefObject } from "react";

const ACCENT = "#C86B85";
const BORDEAUX = "#7A1E38";
const BONE = "#EAE2CF";
const MUSCLE_FAINT = "#B47487";
const TARGET_SIZE = 6.6;
const MODEL = "/models/toxine/upper-limb.glb";

const HALF = Math.PI / 2;
const STEP = Math.PI / 9;
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0) };

export type PresetView = "anterior" | "posterior" | "medial" | "lateral" | "proximal" | "distal";
export interface ToxineController {
  preset: (name: PresetView) => void;
  nudge: (axis: "x" | "y", sign: number) => void;
}

function buildPresets(): Record<PresetView, THREE.Quaternion> {
  const qAnt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-HALF, 0, 0));
  const rot = (axis: THREE.Vector3, ang: number) =>
    new THREE.Quaternion().setFromAxisAngle(axis, ang).multiply(qAnt);
  return {
    anterior: qAnt.clone(),
    posterior: rot(AX.y, Math.PI),
    medial: rot(AX.y, -HALF),
    lateral: rot(AX.y, HALF),
    proximal: rot(AX.x, HALF),
    distal: rot(AX.x, -HALF),
  };
}

function HighlightMesh({ geometry }: { geometry: THREE.BufferGeometry }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((s) => {
    if (mat.current) mat.current.emissiveIntensity = 0.3 + 0.13 * Math.sin(s.clock.elapsedTime * 1.5);
  });
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial ref={mat} color={BORDEAUX} emissive={ACCENT} emissiveIntensity={0.34} roughness={0.55} />
    </mesh>
  );
}

function Anatomy({
  controller,
  highlight,
  level,
  belly,
}: {
  controller?: RefObject<ToxineController | null>;
  highlight: string[];
  level: number;
  belly: [number, number];
}) {
  const root = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL);
  const presets = useMemo(buildPresets, []);
  const targetQuat = useRef(presets.anterior.clone());
  const hi = useMemo(() => new Set(highlight), [highlight]);

  const parts = useMemo(() => {
    const items: { g: THREE.BufferGeometry; node: string; role: "muscle" | "bone" }[] = [];
    const box = new THREE.Box3();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const g = m.geometry as THREE.BufferGeometry;
      g.computeVertexNormals();
      g.computeBoundingBox();
      box.union(g.boundingBox!);
      items.push({ g, node: m.name, role: m.name.startsWith("bone__") ? "bone" : "muscle" });
    });
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const scale = TARGET_SIZE / Math.max(size.x, size.y, size.z);
    const planeGeo = new THREE.PlaneGeometry(size.x * 1.1, size.y * 1.1);
    return { items, offset: center.clone().multiplyScalar(-scale), scale, cx: center.x, cy: center.y, planeGeo, edgeGeo: new THREE.EdgesGeometry(planeGeo) };
  }, [scene]);

  const planeZ = belly[0] + Math.min(1, Math.max(0, level)) * (belly[1] - belly[0]);

  useEffect(() => {
    if (!controller) return;
    controller.current = {
      preset: (name) => targetQuat.current.copy(presets[name]),
      nudge: (axis, sign) => targetQuat.current.premultiply(new THREE.Quaternion().setFromAxisAngle(AX[axis], sign * STEP)),
    };
    return () => {
      if (controller.current) controller.current = null;
    };
  }, [controller, presets]);

  useFrame(() => {
    if (root.current) root.current.quaternion.slerp(targetQuat.current, 0.18);
  });

  return (
    <group ref={root}>
      <group position={parts.offset} scale={parts.scale}>
        {parts.items.map((it, i) =>
          hi.has(it.node) ? (
            <HighlightMesh key={i} geometry={it.g} />
          ) : (
            <mesh key={i} geometry={it.g}>
              <meshStandardMaterial
                color={it.role === "bone" ? BONE : MUSCLE_FAINT}
                roughness={it.role === "bone" ? 0.85 : 0.7}
                transparent
                opacity={it.role === "bone" ? 0.16 : 0.08}
                depthWrite={false}
              />
            </mesh>
          ),
        )}
        {/* plan de coupe */}
        <group position={[parts.cx, parts.cy, planeZ]}>
          <mesh geometry={parts.planeGeo}>
            <meshBasicMaterial color={ACCENT} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <lineSegments geometry={parts.edgeGeo}>
            <lineBasicMaterial color={ACCENT} />
          </lineSegments>
        </group>
      </group>
    </group>
  );
}

export default function ToxineScene({
  controller,
  highlight,
  level = 0.5,
  belly,
}: {
  controller?: RefObject<ToxineController | null>;
  highlight: string[];
  level?: number;
  belly: [number, number];
}) {
  return (
    <Canvas camera={{ position: [0, 0, 12], fov: 40 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 6, 8]} intensity={1.15} />
      <directionalLight position={[-5, 2, -4]} intensity={0.45} color={ACCENT} />
      <Suspense fallback={null}>
        <Anatomy controller={controller} highlight={highlight} level={level} belly={belly} />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={5} maxDistance={20} target={[0, 0, 0]} />
    </Canvas>
  );
}

useGLTF.preload(MODEL);
