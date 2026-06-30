"use client";
import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

const NODE_COUNT = 34;
const RADIUS = 2.4;
const CONNECT_DISTANCE = 1.55;
const MAX_EDGES_PER_NODE = 3;

function generateNetwork() {
  const nodes: THREE.Vector3[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = RADIUS * (0.55 + Math.random() * 0.45);
    nodes.push(
      new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )
    );
  }

  const edges: [number, number][] = [];
  const edgeCounts = new Array(NODE_COUNT).fill(0);
  for (let i = 0; i < NODE_COUNT; i++) {
    const distances = nodes
      .map((n, j) => ({ j, d: i === j ? Infinity : nodes[i].distanceTo(n) }))
      .sort((a, b) => a.d - b.d);
    for (const { j, d } of distances) {
      if (edgeCounts[i] >= MAX_EDGES_PER_NODE) break;
      if (d > CONNECT_DISTANCE) break;
      if (edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) continue;
      edges.push([i, j]);
      edgeCounts[i]++;
      edgeCounts[j]++;
    }
  }

  return { nodes, edges };
}

function Network({ pointer }: { pointer: React.RefObject<{ x: number; y: number }> }) {
  const groupRef = React.useRef<THREE.Group>(null!);
  const { nodes, edges } = React.useMemo(() => generateNetwork(), []);

  const lineGeometry = React.useMemo(() => {
    const positions = new Float32Array(edges.length * 6);
    edges.forEach(([a, b], i) => {
      positions[i * 6] = nodes[a].x;
      positions[i * 6 + 1] = nodes[a].y;
      positions[i * 6 + 2] = nodes[a].z;
      positions[i * 6 + 3] = nodes[b].x;
      positions[i * 6 + 4] = nodes[b].y;
      positions[i * 6 + 5] = nodes[b].z;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [nodes, edges]);

  useFrame((state, delta) => {
    groupRef.current.rotation.y += delta * 0.06;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      pointer.current.y * 0.25,
      0.04
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      pointer.current.x * 0.12,
      0.04
    );
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      if (child.userData.isNode) {
        const pulse = 1 + Math.sin(t * 1.2 + i * 0.7) * 0.18;
        child.scale.setScalar(pulse);
      }
    });
  });

  return (
    <group ref={groupRef} position={[1.3, 0.1, -0.3]}>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#FFFFFF" transparent opacity={0.22} />
      </lineSegments>
      {nodes.map((pos, i) => (
        <mesh key={i} position={pos} userData={{ isNode: true }}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive="#FFFFFF"
            emissiveIntensity={1.4}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ pointer }: { pointer: React.RefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();
  useFrame(() => {
    /* eslint-disable react-hooks/immutability -- r3f camera is a mutable three.js object by design */
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.current.x * 0.6, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointer.current.y * 0.4, 0.05);
    /* eslint-enable react-hooks/immutability */
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function getInitialReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function NetworkFallback() {
  return (
    <div className="size-full flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-2/3 max-w-sm opacity-70" fill="none" stroke="#FFFFFF" strokeWidth="0.6">
        <circle cx="60" cy="50" r="3" fill="#FFFFFF" stroke="none" />
        <circle cx="130" cy="40" r="3" fill="#FFFFFF" stroke="none" />
        <circle cx="160" cy="110" r="3" fill="#FFFFFF" stroke="none" />
        <circle cx="100" cy="150" r="3" fill="#FFFFFF" stroke="none" />
        <circle cx="40" cy="120" r="3" fill="#FFFFFF" stroke="none" />
        <circle cx="100" cy="90" r="3" fill="#FFFFFF" stroke="none" />
        <path d="M60 50 L100 90 L130 40 M100 90 L160 110 M100 90 L100 150 M100 90 L40 120" />
      </svg>
    </div>
  );
}

class WebGLErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    // Swallow WebGL/three.js runtime errors (unsupported GPU, lost context, etc.) — fall back to the static SVG below.
  }
  render() {
    if (this.state.hasError) return <NetworkFallback />;
    return this.props.children;
  }
}

function isWebGLAvailable() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export function Hero3D() {
  const [reducedMotion, setReducedMotion] = React.useState(getInitialReducedMotion);
  const [webglAvailable] = React.useState(() =>
    typeof window !== "undefined" ? isWebGLAvailable() : true
  );
  const pointer = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handlePointerMove = (e: React.PointerEvent) => {
    const { innerWidth, innerHeight } = window;
    pointer.current = {
      x: (e.clientX / innerWidth) * 2 - 1,
      y: -((e.clientY / innerHeight) * 2 - 1),
    };
  };

  if (reducedMotion || !webglAvailable) {
    return <NetworkFallback />;
  }

  return (
    <div className="size-full" onPointerMove={handlePointerMove}>
      <WebGLErrorBoundary>
        <Canvas camera={{ position: [0, 0, 5.5], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={["#000000"]} />
          <ambientLight intensity={0.2} />
          <pointLight position={[5, 1, 2]} intensity={6} color="#FFFFFF" distance={14} />
          <pointLight position={[-2, 3, 3]} intensity={3} color="#FFFFFF" distance={14} />
          <Network pointer={pointer} />
          <Rig pointer={pointer} />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
