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

type Role = "muscle" | "bone" | "nerve" | "artery" | "vein" | "conn";
const roleOf = (n: string): Role =>
  n.startsWith("bone__") ? "bone" : n.startsWith("nerve__") ? "nerve" : n.startsWith("artery__") ? "artery" : n.startsWith("vein__") ? "vein" : n.startsWith("conn__") ? "conn" : "muscle";
const ROLE_MAT: Record<Role, { color: string; op: number; rough: number }> = {
  bone: { color: BONE, op: 0.24, rough: 0.85 },
  muscle: { color: MUSCLE_FAINT, op: 0.16, rough: 0.7 },
  nerve: { color: "#E3B23C", op: 0.72, rough: 0.5 },
  artery: { color: "#C0392B", op: 0.6, rough: 0.5 },
  vein: { color: "#3B6CA8", op: 0.55, rough: 0.5 },
  conn: { color: "#CBBFB4", op: 0.12, rough: 0.9 },
};

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

  const geom = useMemo(() => {
    const items: { g: THREE.BufferGeometry; node: string; role: Role; box: THREE.Box3 }[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const g = m.geometry as THREE.BufferGeometry;
      g.computeVertexNormals();
      g.computeBoundingBox();
      items.push({ g, node: m.name, role: roleOf(m.name), box: g.boundingBox!.clone() });
    });
    return items;
  }, [scene]);

  // recadrage sur le VOLUME du muscle sélectionné (+ un peu de contexte), centré
  const view = useMemo(() => {
    const sel = new THREE.Box3();
    for (const it of geom) if (hi.has(it.node)) sel.union(it.box);
    if (sel.isEmpty()) for (const it of geom) sel.union(it.box);
    const size = sel.getSize(new THREE.Vector3());
    const region = sel.clone().expandByVector(new THREE.Vector3(size.x * 0.5 + 0.008, size.y * 0.5 + 0.008, size.z * 0.22 + 0.008));
    const visible = geom.filter((it) => it.box.intersectsBox(region));
    const center = region.getCenter(new THREE.Vector3());
    const rs = region.getSize(new THREE.Vector3());
    const scale = TARGET_SIZE / Math.max(rs.x, rs.y, rs.z);
    const planeGeo = new THREE.PlaneGeometry(rs.x, rs.y);
    return { visible, offset: center.clone().multiplyScalar(-scale), scale, cx: center.x, cy: center.y, planeGeo, edgeGeo: new THREE.EdgesGeometry(planeGeo) };
  }, [geom, hi]);

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
      <group position={view.offset} scale={view.scale}>
        {view.visible.map((it, i) =>
          hi.has(it.node) ? (
            <HighlightMesh key={i} geometry={it.g} />
          ) : (
            <mesh key={i} geometry={it.g}>
              <meshStandardMaterial color={ROLE_MAT[it.role].color} roughness={ROLE_MAT[it.role].rough} transparent opacity={ROLE_MAT[it.role].op} depthWrite={false} />
            </mesh>
          ),
        )}
        {/* plan de coupe */}
        <group position={[view.cx, view.cy, planeZ]}>
          <mesh geometry={view.planeGeo}>
            <meshBasicMaterial color={ACCENT} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <lineSegments geometry={view.edgeGeo}>
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
