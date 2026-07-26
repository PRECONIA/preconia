"use client";

/* Scène 3D (React Three Fiber) du pilier Toxine.
   Anatomie RÉELLE : maillages segmentés BodyParts3D de l'avant-bras droit, fusionnés
   et simplifiés en un glTF (public/models/toxine/forearm.glb). © DBCLS, CC BY-SA 2.1
   Japan. Le fléchisseur superficiel des doigts (nœuds fds__) est mis en évidence en
   bordeaux ; les os (bone__) sont estompés et les autres muscles (ctx__) très
   transparents, pour situer le muscle dans son contexte. Deux repères marquent des
   points d'injection FICTIFS (prototype) — remplacés à terme par les sites sourcés. */

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { ToxineMuscle } from "@/data/toxineMuscles";

const ACCENT = "#C86B85";
const BORDEAUX = "#7A1E38";
const BONE = "#EAE2CF";
const MUSCLE_FAINT = "#B47487";
const TARGET_SIZE = 6;
const MODEL = "/models/toxine/forearm.glb";

function FdsMesh({ geometry }: { geometry: THREE.BufferGeometry }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((s) => {
    if (mat.current)
      mat.current.emissiveIntensity = 0.3 + 0.14 * Math.sin(s.clock.elapsedTime * 1.5);
  });
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial ref={mat} color={BORDEAUX} emissive={ACCENT} emissiveIntensity={0.34} roughness={0.55} />
    </mesh>
  );
}

function Anatomy({ muscle }: { muscle: ToxineMuscle }) {
  const root = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL);

  const parts = useMemo(() => {
    const bones: THREE.BufferGeometry[] = [];
    const ctx: THREE.BufferGeometry[] = [];
    const fds: THREE.BufferGeometry[] = [];
    const box = new THREE.Box3();
    const fbox = new THREE.Box3();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const g = m.geometry as THREE.BufferGeometry;
      g.computeVertexNormals();
      g.computeBoundingBox();
      box.union(g.boundingBox!);
      if (m.name.startsWith("bone__")) bones.push(g);
      else if (m.name.startsWith("fds__")) {
        fds.push(g);
        fbox.union(g.boundingBox!);
      } else ctx.push(g);
    });
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const scale = TARGET_SIZE / Math.max(size.x, size.y, size.z);
    const fdsCenter = fbox.getCenter(new THREE.Vector3());
    return { bones, ctx, fds, center, scale, fdsCenter };
  }, [scene]);

  const norm = (p: THREE.Vector3) => p.clone().sub(parts.center).multiplyScalar(parts.scale);
  const offset = parts.center.clone().multiplyScalar(-parts.scale);
  const markers = muscle.injectionPoints.map((ip) =>
    norm(parts.fdsCenter).add(new THREE.Vector3(ip.position[0], ip.position[1], ip.position[2])),
  );

  useFrame((_s, delta) => {
    if (root.current) root.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={root} rotation={[-Math.PI / 2, 0, 0.15]}>
      {/* muscle cible — mis en évidence */}
      <group position={offset} scale={parts.scale}>
        {parts.fds.map((g, i) => (
          <FdsMesh key={`fds${i}`} geometry={g} />
        ))}
      </group>
      {/* os — estompés */}
      <group position={offset} scale={parts.scale}>
        {parts.bones.map((g, i) => (
          <mesh key={`bone${i}`} geometry={g}>
            <meshStandardMaterial color={BONE} roughness={0.85} transparent opacity={0.32} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* autres muscles — très transparents (contexte) */}
      <group position={offset} scale={parts.scale}>
        {parts.ctx.map((g, i) => (
          <mesh key={`ctx${i}`} geometry={g}>
            <meshStandardMaterial color={MUSCLE_FAINT} roughness={0.7} transparent opacity={0.1} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* points d'injection (fictifs) — repères statiques */}
      {markers.map((p, i) => (
        <group key={muscle.injectionPoints[i].id} position={p}>
          <mesh>
            <sphereGeometry args={[0.11, 20, 20]} />
            <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.6} roughness={0.4} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.02, 8, 32]} />
            <meshBasicMaterial color={ACCENT} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function ToxineScene({ muscle }: { muscle: ToxineMuscle }) {
  return (
    <Canvas camera={{ position: [5.5, 1.5, 6], fov: 40 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 8, 5]} intensity={1.15} />
      <directionalLight position={[-5, 2, -4]} intensity={0.45} color={ACCENT} />
      <Anatomy muscle={muscle} />
      <OrbitControls enablePan={false} minDistance={4} maxDistance={14} target={[0, 0, 0]} />
    </Canvas>
  );
}

useGLTF.preload(MODEL);
