"use client";

/* Scène 3D (React Three Fiber) du pilier Toxine.
   Anatomie RÉELLE : maillages segmentés BodyParts3D (avant-bras droit — radius,
   ulna, les deux chefs du fléchisseur superficiel des doigts), © DBCLS, CC BY-SA
   2.1 Japan. Le muscle cible est mis en évidence en bordeaux ; deux seringues
   animées descendent vers des points d'injection FICTIFS (au centre du muscle) et
   simulent l'injection. Les points/profondeurs/doses réels — sourcés et validés —
   remplaceront ces repères de démonstration. */

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { ToxineMuscle } from "@/data/toxineMuscles";

const ACCENT = "#C86B85";
const BORDEAUX = "#7A1E38";
const BONE = "#EAE2CF";
const TARGET_SIZE = 6; // hauteur cible de l'avant-bras dans la scène

const MESHES = {
  radius: "/models/toxine/right-radius.stl",
  ulna: "/models/toxine/right-ulna.stl",
  fdsHU: "/models/toxine/fds-head-humeroulnar.stl",
  fdsRad: "/models/toxine/fds-head-radial.stl",
};

const CYCLE = 4.4;
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Seringue animée : descente → injection (piston) → retrait → pause, en boucle.
    `target` et `approach` sont exprimés dans le repère normalisé de l'anatomie. */
function Syringe({ target, phase }: { target: THREE.Vector3; phase: number }) {
  const group = useRef<THREE.Group>(null);
  const plunger = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);

  const { dir, travel, quat } = useMemo(() => {
    const start = target.clone().add(new THREE.Vector3(0.4, 2.6, 2.8));
    const dir = target.clone().sub(start).normalize();
    const travel = target.distanceTo(start);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    return { dir, travel, quat };
  }, [target]);

  useFrame((s) => {
    if (!group.current) return;
    const tt = (s.clock.elapsedTime + phase) % CYCLE;
    let remaining: number;
    let plunge = 0;
    if (tt < 1.4) remaining = travel * (1 - smooth(tt / 1.4));
    else if (tt < 2.1) {
      remaining = 0;
      plunge = smooth((tt - 1.4) / 0.7);
    } else if (tt < 2.4) {
      remaining = 0;
      plunge = 1;
    } else if (tt < 3.6) {
      remaining = travel * smooth((tt - 2.4) / 1.2);
      plunge = 1 - smooth((tt - 2.4) / 1.2);
    } else remaining = travel;

    group.current.position.copy(target).sub(dir.clone().multiplyScalar(remaining));
    group.current.quaternion.copy(quat);
    if (plunger.current) plunger.current.position.y = 1.02 - 0.28 * plunge;
    if (glow.current) {
      (glow.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * plunge;
      glow.current.scale.setScalar(0.14 + 0.34 * plunge);
    }
  });

  return (
    <>
      {/* corps le long de +Y, pointe de l'aiguille à l'origine locale ; échelle scène */}
      <group ref={group}>
        <group scale={1.7}>
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.56, 12]} />
            <meshStandardMaterial color="#b8c2cc" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.95, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.8, 20]} />
            <meshStandardMaterial color="#dbe6ee" transparent opacity={0.5} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.082, 0.082, 0.4, 16]} />
            <meshStandardMaterial color={BORDEAUX} transparent opacity={0.9} />
          </mesh>
          <mesh ref={plunger} position={[0, 1.02, 0]}>
            <cylinderGeometry args={[0.078, 0.078, 0.14, 16]} />
            <meshStandardMaterial color={ACCENT} />
          </mesh>
          <mesh position={[0, 1.17, 0]}>
            <cylinderGeometry args={[0.026, 0.026, 0.22, 12]} />
            <meshStandardMaterial color="#eef3f7" />
          </mesh>
          <mesh position={[0, 1.32, 0]}>
            <boxGeometry args={[0.34, 0.03, 0.11]} />
            <meshStandardMaterial color="#eef3f7" />
          </mesh>
        </group>
      </group>
      <mesh position={target} scale={0.14}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={ACCENT} />
      </mesh>
      <mesh ref={glow} position={target} scale={0.14}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0} />
      </mesh>
    </>
  );
}

function MuscleMesh({ geometry }: { geometry: THREE.BufferGeometry }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((s) => {
    if (mat.current)
      mat.current.emissiveIntensity = 0.3 + 0.15 * Math.sin(s.clock.elapsedTime * 1.6);
  });
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial ref={mat} color={BORDEAUX} emissive={ACCENT} emissiveIntensity={0.35} roughness={0.55} />
    </mesh>
  );
}

function Anatomy({ muscle }: { muscle: ToxineMuscle }) {
  const root = useRef<THREE.Group>(null);
  const [gRadius, gUlna, gFdsHU, gFdsRad] = useLoader(STLLoader, [
    MESHES.radius,
    MESHES.ulna,
    MESHES.fdsHU,
    MESHES.fdsRad,
  ]);

  const { center, scale, fdsCenter } = useMemo(() => {
    const box = new THREE.Box3();
    for (const g of [gRadius, gUlna, gFdsHU, gFdsRad]) {
      g.computeBoundingBox();
      g.computeVertexNormals();
      box.union(g.boundingBox!);
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const scale = TARGET_SIZE / Math.max(size.x, size.y, size.z);
    // centre du corps musculaire (moyenne des deux chefs)
    const fbox = new THREE.Box3().union(gFdsHU.boundingBox!).union(gFdsRad.boundingBox!);
    const fdsCenter = fbox.getCenter(new THREE.Vector3());
    return { center, scale, fdsCenter };
  }, [gRadius, gUlna, gFdsHU, gFdsRad]);

  // repère normalisé : (p - center) * scale
  const norm = (p: THREE.Vector3) => p.clone().sub(center).multiplyScalar(scale);
  const targets = muscle.injectionPoints.map((ip) =>
    norm(fdsCenter).add(new THREE.Vector3(ip.position[0], ip.position[1], ip.position[2])),
  );

  useFrame((_s, delta) => {
    if (root.current) root.current.rotation.y += delta * 0.12;
  });

  return (
    // rotation : amène le grand axe (Z anatomique) à la verticale, léger basculement
    <group ref={root} rotation={[-Math.PI / 2, 0, 0.15]}>
      <group position={center.clone().multiplyScalar(-scale)} scale={scale}>
        <mesh geometry={gRadius}>
          <meshStandardMaterial color={BONE} roughness={0.8} />
        </mesh>
        <mesh geometry={gUlna}>
          <meshStandardMaterial color={BONE} roughness={0.8} />
        </mesh>
      </group>
      {/* muscle mis en évidence — dans le repère normalisé via un groupe jumeau */}
      <group position={center.clone().multiplyScalar(-scale)} scale={scale}>
        <MuscleMesh geometry={gFdsHU} />
        <MuscleMesh geometry={gFdsRad} />
      </group>
      {targets.map((t, i) => (
        <Syringe key={muscle.injectionPoints[i].id} target={t} phase={i * (CYCLE / 2)} />
      ))}
    </group>
  );
}

export default function ToxineScene({ muscle }: { muscle: ToxineMuscle }) {
  return (
    <Canvas camera={{ position: [5.5, 1.5, 6], fov: 40 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.15} />
      <directionalLight position={[-5, 2, -4]} intensity={0.45} color={ACCENT} />
      <Suspense fallback={null}>
        <Anatomy muscle={muscle} />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={4} maxDistance={14} target={[0, 0, 0]} />
    </Canvas>
  );
}
