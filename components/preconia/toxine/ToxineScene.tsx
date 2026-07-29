"use client";

/* Scène 3D (React Three Fiber) du pilier Toxine — atlas du membre supérieur.
   Anatomie réelle Open3D (upper-limb.glb, CC BY-SA 4.0). Le muscle SÉLECTIONNÉ
   (ses nœuds) est mis en évidence en bordeaux, les autres muscles sont estompés et
   les os très transparents. Orientation pilotée par le panneau de contrôle (vues
   préréglées + flèches). Un plan de coupe translucide, piloté par l'ascenseur sur le
   ventre du muscle sélectionné, matérialise le niveau de la coupe axiale.

   En mode simulation (prop `probe`), ce plan cède la place au matériel : sonde
   linéaire modélisée (semelle, nez, col, poignée, détrompeur, câble) posée à plat
   sur la peau et orientable tout autour du membre, champ échographié sous la
   semelle, et aiguille montée sur seringue arrivant par le côté de la sonde. Le
   cadrage (`focus`) se resserre alors sur la section du membre sous la sonde. */

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox, useGLTF } from "@react-three/drei";
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

export type PresetView = "anterior" | "posterior" | "medial" | "lateral" | "proximal" | "distal" | "oblique";
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
    // vue de trois quarts, en enfilade du membre : on voit la sonde tourner autour
    oblique: new THREE.Quaternion()
      .setFromAxisAngle(AX.x, HALF * 0.72)
      .multiply(new THREE.Quaternion().setFromAxisAngle(AX.y, -0.5))
      .multiply(qAnt),
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

export type V3 = [number, number, number];

/** sonde linéaire posée sur la peau : `o` = milieu de la semelle, `u` = axe long de la
    semelle, `n` = normale sortante (le corps de la sonde part vers +n). */
export interface Probe {
  o: V3;
  u: V3;
  n: V3;
  foot: number;
  depth: number;
}

/** cadrage de la simulation : centre et rayon de la section du membre sous la sonde. */
export interface Focus {
  c: V3;
  r: number;
}

/** aiguille : point de ponction et direction (unitaire), longueurs en mètres. */
export interface Needle3D {
  entry: V3;
  dir: V3;
  inserted: number;
  length: number;
  inTarget: boolean;
}

const STEEL = "#c6ccd3";

function ProbeMesh({ probe }: { probe: Probe }) {
  const { quat, pos } = useMemo(() => {
    const U = new THREE.Vector3(...probe.u).normalize();
    const N = new THREE.Vector3(...probe.n).normalize();
    const W = new THREE.Vector3().crossVectors(U, N).normalize();
    const m = new THREE.Matrix4().makeBasis(U, N, W);
    return { quat: new THREE.Quaternion().setFromRotationMatrix(m), pos: new THREE.Vector3(...probe.o) };
  }, [probe]);

  const cable = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.126, 0),
      new THREE.Vector3(0.004, 0.152, -0.016),
      new THREE.Vector3(0.002, 0.166, -0.055),
      new THREE.Vector3(-0.012, 0.158, -0.098),
    ]);
    return new THREE.TubeGeometry(c, 24, 0.0042, 10, false);
  }, []);

  const f = probe.foot;
  const plane = useMemo(() => new THREE.PlaneGeometry(f, probe.depth), [f, probe.depth]);
  const edges = useMemo(() => new THREE.EdgesGeometry(plane), [plane]);

  return (
    <group position={pos} quaternion={quat}>
      {/* champ échographié (plan de la coupe, sous la semelle) */}
      <mesh geometry={plane} position={[0, -probe.depth / 2, 0]}>
        <meshBasicMaterial color={ACCENT} transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges} position={[0, -probe.depth / 2, 0]}>
        <lineBasicMaterial color={ACCENT} transparent opacity={0.75} />
      </lineSegments>

      {/* lentille acoustique (semelle) */}
      <mesh position={[0, 0.0018, 0]}>
        <boxGeometry args={[f, 0.0036, 0.014]} />
        <meshStandardMaterial color="#15191e" roughness={0.25} metalness={0.1} />
      </mesh>
      {/* nez, col, poignée */}
      <RoundedBox args={[f + 0.004, 0.015, 0.021]} radius={0.0022} smoothness={3} position={[0, 0.0105, 0]}>
        <meshStandardMaterial color="#eceff2" roughness={0.42} metalness={0.06} />
      </RoundedBox>
      <RoundedBox args={[0.037, 0.03, 0.027]} radius={0.006} smoothness={3} position={[0, 0.031, 0]}>
        <meshStandardMaterial color="#e4e8ec" roughness={0.45} metalness={0.06} />
      </RoundedBox>
      <mesh position={[0, 0.0215, 0]}>
        <boxGeometry args={[0.0378, 0.004, 0.0276]} />
        <meshStandardMaterial color={BORDEAUX} roughness={0.35} metalness={0.15} />
      </mesh>
      <RoundedBox args={[0.031, 0.072, 0.029]} radius={0.009} smoothness={3} position={[0, 0.081, 0]}>
        <meshStandardMaterial color="#eceff2" roughness={0.48} metalness={0.05} />
      </RoundedBox>
      {/* détrompeur d'orientation (côté gauche de l'image) */}
      <mesh position={[-(f / 2 + 0.0015), 0.012, 0]}>
        <boxGeometry args={[0.0035, 0.011, 0.009]} />
        <meshStandardMaterial color="#7fd4e8" roughness={0.3} emissive="#2b6b7a" emissiveIntensity={0.35} />
      </mesh>
      {/* passe-câble + câble */}
      <mesh position={[0, 0.121, 0]}>
        <cylinderGeometry args={[0.0062, 0.0085, 0.016, 16]} />
        <meshStandardMaterial color="#c9ced3" roughness={0.6} />
      </mesh>
      <mesh geometry={cable}>
        <meshStandardMaterial color="#d5d9dd" roughness={0.75} />
      </mesh>
    </group>
  );
}

function NeedleMesh({ needle }: { needle: Needle3D }) {
  const { quat, pos } = useMemo(() => {
    const d = new THREE.Vector3(...needle.dir).normalize();
    return {
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d),
      pos: new THREE.Vector3(...needle.entry),
    };
  }, [needle]);
  const L = needle.length;
  const out = L - needle.inserted; // portion restée hors de la peau
  return (
    <group position={pos} quaternion={quat}>
      {/* corps de l'aiguille (traversant la peau) */}
      <mesh position={[0, needle.inserted - L / 2, 0]}>
        <cylinderGeometry args={[0.00045, 0.00045, L, 10]} />
        <meshStandardMaterial color={STEEL} roughness={0.18} metalness={0.95} />
      </mesh>
      {/* pointe biseautée */}
      <mesh position={[0, needle.inserted, 0]}>
        <coneGeometry args={[0.00046, 0.0022, 10]} />
        <meshStandardMaterial
          color={needle.inTarget ? "#7CE0A0" : STEEL}
          emissive={needle.inTarget ? "#2f8b52" : "#000000"}
          emissiveIntensity={needle.inTarget ? 0.6 : 0}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      {/* embase + corps de seringue */}
      <mesh position={[0, -out - 0.006, 0]}>
        <cylinderGeometry args={[0.0032, 0.0022, 0.012, 14]} />
        <meshStandardMaterial color="#8fb8d8" roughness={0.35} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, -out - 0.034, 0]}>
        <cylinderGeometry args={[0.0058, 0.0058, 0.044, 18]} />
        <meshStandardMaterial color="#eaf1f6" roughness={0.15} transparent opacity={0.42} />
      </mesh>
      <mesh position={[0, -out - 0.06, 0]}>
        <cylinderGeometry args={[0.0052, 0.0052, 0.01, 16]} />
        <meshStandardMaterial color="#c8d3db" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Anatomy({
  controller,
  highlight,
  level,
  belly,
  probe,
  needle,
  pad = 0,
  focus,
  initialView = "anterior",
}: {
  controller?: RefObject<ToxineController | null>;
  highlight: string[];
  level: number;
  belly: [number, number];
  probe?: Probe;
  needle?: Needle3D;
  pad?: number;
  focus?: Focus;
  initialView?: PresetView;
}) {
  const root = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL);
  const presets = useMemo(buildPresets, []);
  const targetQuat = useRef(presets[initialView].clone());
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

  // recadrage sur le VOLUME du muscle sélectionné (+ un peu de contexte), centré ;
  // `pad` élargit le cadre pour englober la section du membre et la sonde, et `focusZ`
  // recentre le cadre sur le niveau de la sonde (segment de membre autour d'elle).
  const view = useMemo(() => {
    const sel = new THREE.Box3();
    for (const it of geom) if (hi.has(it.node)) sel.union(it.box);
    if (sel.isEmpty()) for (const it of geom) sel.union(it.box);
    const size = sel.getSize(new THREE.Vector3());
    const region = sel
      .clone()
      .expandByVector(
        new THREE.Vector3(size.x * 0.5 + 0.008 + pad, size.y * 0.5 + 0.008 + pad, size.z * 0.22 + 0.008 + pad * 0.3),
      );
    // en simulation, on cadre sur la section du membre au niveau de la sonde, en
    // laissant la place du corps de la sonde (~12 cm) au-dessus de la peau
    if (focus) {
      const rxy = focus.r + 0.082;
      region.min.set(focus.c[0] - rxy, focus.c[1] - rxy, focus.c[2] - 0.085);
      region.max.set(focus.c[0] + rxy, focus.c[1] + rxy, focus.c[2] + 0.085);
    }
    const visible = geom.filter((it) => it.box.intersectsBox(region));
    const center = region.getCenter(new THREE.Vector3());
    const rs = region.getSize(new THREE.Vector3());
    const scale = TARGET_SIZE / Math.max(rs.x, rs.y, rs.z);
    const planeGeo = new THREE.PlaneGeometry(rs.x, rs.y);
    return { visible, offset: center.clone().multiplyScalar(-scale), scale, cx: center.x, cy: center.y, planeGeo, edgeGeo: new THREE.EdgesGeometry(planeGeo) };
  }, [geom, hi, pad, focus]);

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
        {/* plan de coupe (atlas) — remplacé par le champ de la sonde en simulation */}
        {!probe && (
          <group position={[view.cx, view.cy, planeZ]}>
            <mesh geometry={view.planeGeo}>
              <meshBasicMaterial color={ACCENT} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <lineSegments geometry={view.edgeGeo}>
              <lineBasicMaterial color={ACCENT} />
            </lineSegments>
          </group>
        )}
        {probe && <ProbeMesh probe={probe} />}
        {needle && <NeedleMesh needle={needle} />}
      </group>
    </group>
  );
}

export default function ToxineScene({
  controller,
  highlight,
  level = 0.5,
  belly,
  probe,
  needle,
  pad = 0,
  focus,
  initialView = "anterior",
}: {
  controller?: RefObject<ToxineController | null>;
  highlight: string[];
  level?: number;
  belly: [number, number];
  probe?: Probe;
  needle?: Needle3D;
  pad?: number;
  focus?: Focus;
  initialView?: PresetView;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 12], fov: 40 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 6, 8]} intensity={1.15} />
      <directionalLight position={[-5, 2, -4]} intensity={0.45} color={ACCENT} />
      <Suspense fallback={null}>
        <Anatomy
          controller={controller}
          highlight={highlight}
          level={level}
          belly={belly}
          probe={probe}
          needle={needle}
          pad={pad}
          focus={focus}
          initialView={initialView}
        />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={5} maxDistance={20} target={[0, 0, 0]} />
    </Canvas>
  );
}

useGLTF.preload(MODEL);
