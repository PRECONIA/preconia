"use client";

/* Scène 3D (React Three Fiber) du pilier Toxine.
   Anatomie RÉELLE : maillages BodyParts3D de l'avant-bras droit (forearm.glb),
   © DBCLS, CC BY-SA 2.1 Japan. Le fléchisseur superficiel des doigts (fds__) est
   mis en évidence en bordeaux, les os (bone__) estompés, les autres muscles (ctx__)
   très transparents. Pas de rotation automatique : l'orientation est pilotée par le
   panneau de contrôle (vues préréglées + flèches), transmis via `controller`. */

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { RefObject } from "react";
import type { ToxineMuscle } from "@/data/toxineMuscles";

const ACCENT = "#C86B85";
const BORDEAUX = "#7A1E38";
const BONE = "#EAE2CF";
const MUSCLE_FAINT = "#B47487";
const TARGET_SIZE = 6;
const MODEL = "/models/toxine/forearm.glb";

const HALF = Math.PI / 2;
const STEP = Math.PI / 9; // 20° par appui de flèche
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0) };

export type PresetView = "anterior" | "posterior" | "medial" | "lateral" | "proximal" | "distal";
export interface ToxineController {
  preset: (name: PresetView) => void;
  nudge: (axis: "x" | "y", sign: number) => void;
}

/* Orientations cibles (quaternions). Base « antérieure » = Rx(-90°) : grand axe
   vertical, face antérieure (fléchisseurs) vers la caméra ; on compose ensuite une
   rotation dans le repère monde pour chaque vue. */
function buildPresets(): Record<PresetView, THREE.Quaternion> {
  const qAnt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-HALF, 0, 0));
  const rot = (axis: THREE.Vector3, ang: number) =>
    new THREE.Quaternion().setFromAxisAngle(axis, ang).multiply(qAnt);
  return {
    anterior: qAnt.clone(),
    posterior: rot(AX.y, Math.PI),
    medial: rot(AX.y, -HALF), // du dedans vers le dehors
    lateral: rot(AX.y, HALF), // du dehors vers le dedans
    proximal: rot(AX.x, HALF), // vue du haut
    distal: rot(AX.x, -HALF), // vue du bas
  };
}

function FdsMesh({ geometry }: { geometry: THREE.BufferGeometry }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((s) => {
    if (mat.current)
      mat.current.emissiveIntensity = 0.3 + 0.13 * Math.sin(s.clock.elapsedTime * 1.5);
  });
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial ref={mat} color={BORDEAUX} emissive={ACCENT} emissiveIntensity={0.34} roughness={0.55} />
    </mesh>
  );
}

function Anatomy({
  controller,
}: {
  controller?: RefObject<ToxineController | null>;
}) {
  const root = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL);
  const presets = useMemo(buildPresets, []);
  const targetQuat = useRef(presets.anterior.clone());

  const parts = useMemo(() => {
    const bones: THREE.BufferGeometry[] = [];
    const ctx: THREE.BufferGeometry[] = [];
    const fds: THREE.BufferGeometry[] = [];
    const box = new THREE.Box3();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const g = m.geometry as THREE.BufferGeometry;
      g.computeVertexNormals();
      g.computeBoundingBox();
      box.union(g.boundingBox!);
      if (m.name.startsWith("bone__")) bones.push(g);
      else if (m.name.startsWith("fds__")) fds.push(g);
      else ctx.push(g);
    });
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const scale = TARGET_SIZE / Math.max(size.x, size.y, size.z);
    return { bones, ctx, fds, offset: center.multiplyScalar(-scale), scale };
  }, [scene]);

  useEffect(() => {
    if (!controller) return;
    controller.current = {
      preset: (name) => targetQuat.current.copy(presets[name]),
      nudge: (axis, sign) =>
        targetQuat.current.premultiply(
          new THREE.Quaternion().setFromAxisAngle(AX[axis], sign * STEP),
        ),
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
        {parts.fds.map((g, i) => (
          <FdsMesh key={`fds${i}`} geometry={g} />
        ))}
        {parts.bones.map((g, i) => (
          <mesh key={`bone${i}`} geometry={g}>
            <meshStandardMaterial color={BONE} roughness={0.85} transparent opacity={0.32} depthWrite={false} />
          </mesh>
        ))}
        {parts.ctx.map((g, i) => (
          <mesh key={`ctx${i}`} geometry={g}>
            <meshStandardMaterial color={MUSCLE_FAINT} roughness={0.7} transparent opacity={0.1} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function ToxineScene({
  muscle: _muscle,
  controller,
}: {
  muscle: ToxineMuscle;
  controller?: RefObject<ToxineController | null>;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 11], fov: 40 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 6, 8]} intensity={1.15} />
      <directionalLight position={[-5, 2, -4]} intensity={0.45} color={ACCENT} />
      <Suspense fallback={null}>
        <Anatomy controller={controller} />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={5} maxDistance={16} target={[0, 0, 0]} />
    </Canvas>
  );
}

useGLTF.preload(MODEL);
