"use client";

/* Scène 3D (React Three Fiber) du pilier Toxine — PROTOTYPE.
   Modèle schématique d'avant-bras : deux os (radius/ulna), une enveloppe cutanée
   translucide et le corps musculaire cible mis en évidence. Les seringues animées
   descendent vers des points d'injection FICTIFS (au centre du muscle) et simulent
   l'injection (piston + halo). Aucune valeur clinique. Le vrai maillage anatomique
   (BodyParts3D / Z-Anatomy, CC-BY-SA) et les points sourcés remplaceront ce schéma. */

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { ToxineMuscle } from "@/data/toxineMuscles";

const ACCENT = "#C86B85";
const BORDEAUX = "#7A1E38";
const BONE = "#E9E1CE";

function MuscleBody() {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((s) => {
    if (mat.current)
      mat.current.emissiveIntensity = 0.35 + 0.16 * Math.sin(s.clock.elapsedTime * 1.6);
  });
  return (
    <mesh position={[0, 0, 0.55]} scale={[0.52, 1.7, 0.4]}>
      <sphereGeometry args={[1, 48, 32]} />
      <meshStandardMaterial ref={mat} color={BORDEAUX} emissive={ACCENT} emissiveIntensity={0.4} roughness={0.5} />
    </mesh>
  );
}

function Bone({ x }: { x: number }) {
  return (
    <mesh position={[x, 0, -0.15]}>
      <cylinderGeometry args={[0.2, 0.22, 3.2, 24]} />
      <meshStandardMaterial color={BONE} roughness={0.75} />
    </mesh>
  );
}

function Envelope() {
  return (
    <mesh position={[0, 0, 0.1]}>
      <cylinderGeometry args={[1.2, 1.1, 3.5, 40, 1, true]} />
      <meshStandardMaterial color="#F4E3E9" transparent opacity={0.08} side={THREE.DoubleSide} roughness={1} />
    </mesh>
  );
}

function InjectionMarker({ p }: { p: [number, number, number] }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s) => {
    if (mat.current) mat.current.opacity = 0.45 + 0.45 * Math.abs(Math.sin(s.clock.elapsedTime * 2));
  });
  return (
    <mesh position={p}>
      <sphereGeometry args={[0.07, 16, 16]} />
      <meshBasicMaterial ref={mat} color={ACCENT} transparent />
    </mesh>
  );
}

const CYCLE = 4.4;
const smooth = (x: number) => x * x * (3 - 2 * x);

function Syringe({ target, phase }: { target: [number, number, number]; phase: number }) {
  const group = useRef<THREE.Group>(null);
  const plunger = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);

  const { dir, travel, quat, targetVec } = useMemo(() => {
    const targetVec = new THREE.Vector3(...target);
    const start = targetVec.clone().add(new THREE.Vector3(0.05, 1.5, 1.7));
    const dir = targetVec.clone().sub(start).normalize(); // sens de progression de l'aiguille
    const travel = targetVec.distanceTo(start);
    // le corps est construit le long de +Y (pointe en -Y local) : on aligne -Y sur dir.
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    return { dir, travel, quat, targetVec };
  }, [target]);

  useFrame((s) => {
    if (!group.current) return;
    const tt = (s.clock.elapsedTime + phase) % CYCLE;
    // phases : descente (0→1,4) · injection (→2,1) · maintien (→2,4) · retrait (→3,6) · pause
    let remaining: number;
    let plunge = 0;
    if (tt < 1.4) {
      remaining = travel * (1 - smooth(tt / 1.4));
    } else if (tt < 2.1) {
      remaining = 0;
      plunge = smooth((tt - 1.4) / 0.7);
    } else if (tt < 2.4) {
      remaining = 0;
      plunge = 1;
    } else if (tt < 3.6) {
      remaining = travel * smooth((tt - 2.4) / 1.2);
      plunge = 1 - smooth((tt - 2.4) / 1.2);
    } else {
      remaining = travel;
    }

    const tip = targetVec.clone().sub(dir.clone().multiplyScalar(remaining));
    group.current.position.copy(tip);
    group.current.quaternion.copy(quat);
    if (plunger.current) plunger.current.position.y = 1.02 - 0.28 * plunge;
    if (glow.current) {
      (glow.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * plunge;
      glow.current.scale.setScalar(0.08 + 0.2 * plunge);
    }
  });

  return (
    <>
      {/* corps construit le long de +Y, pointe de l'aiguille à l'origine locale */}
      <group ref={group}>
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
      <mesh ref={glow} position={target} scale={0.08}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0} />
      </mesh>
    </>
  );
}

function Anatomy({ muscle }: { muscle: ToxineMuscle }) {
  const grp = useRef<THREE.Group>(null);
  useFrame((_s, delta) => {
    if (grp.current) grp.current.rotation.y += delta * 0.12;
  });
  return (
    <group ref={grp}>
      <Envelope />
      <Bone x={0.5} />
      <Bone x={-0.5} />
      <MuscleBody />
      {muscle.injectionPoints.map((ip) => (
        <InjectionMarker key={ip.id} p={ip.position} />
      ))}
      {muscle.injectionPoints.map((ip, i) => (
        <Syringe key={ip.id} target={ip.position} phase={i * (CYCLE / 2)} />
      ))}
    </group>
  );
}

export default function ToxineScene({ muscle }: { muscle: ToxineMuscle }) {
  return (
    <Canvas camera={{ position: [3.6, 1.4, 4.2], fov: 42 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} />
      <directionalLight position={[-4, 2, -3]} intensity={0.4} color={ACCENT} />
      <Anatomy muscle={muscle} />
      <OrbitControls enablePan={false} minDistance={3} maxDistance={9} target={[0, 0, 0.3]} />
    </Canvas>
  );
}
