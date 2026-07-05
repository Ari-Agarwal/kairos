"use client";
import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

const NODE_COUNT = 1800;
const IMPORTANT_RATIO = 0.06;
const FIELD_RADIUS = 3.3;
const BG_LINK_RATIO = 0.1;
const BG_LINK_MAX_DIST = 0.5;
const PATH_LINK_MAX_DIST = 1.1;

const STEEL_BLUE = new THREE.Color("#4D7CFE");
const NODE_GRAY = new THREE.Color("#9AA1AC");

const VERTEX_SHADER = `
  attribute float aSeed;
  attribute float aImportant;
  attribute vec3 aColor;
  uniform vec3 uPointer;
  uniform float uTime;
  uniform float uBaseSize;
  varying vec3 vColor;
  varying float vGlow;
  varying float vImportant;
  void main() {
    vec3 pos = position;
    pos.x += sin(uTime * 0.15 + aSeed) * 0.045;
    pos.y += cos(uTime * 0.12 + aSeed * 1.7) * 0.045;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float dist = distance(pos, uPointer);
    float glow = smoothstep(1.1, 0.0, dist);
    vGlow = glow;
    vImportant = aImportant;
    vColor = aColor;
    float size = uBaseSize * (1.0 + aImportant * 1.0 + glow * 1.6);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vGlow;
  varying float vImportant;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d);
    vec3 hoverColor = vec3(0.353, 0.529, 1.0);
    vec3 color = mix(vColor, hoverColor, clamp(vImportant * 0.6 + vGlow * 0.6, 0.0, 1.0));
    float baseAlpha = min(0.5 + vImportant * 0.35 + vGlow * 0.35, 1.0);
    gl_FragColor = vec4(color, alpha * baseAlpha);
  }
`;

function generateField() {
  const positions = new Float32Array(NODE_COUNT * 3);
  const seeds = new Float32Array(NODE_COUNT);
  const important = new Float32Array(NODE_COUNT);
  const colors = new Float32Array(NODE_COUNT * 3);
  const pts: THREE.Vector3[] = [];

  for (let i = 0; i < NODE_COUNT; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = FIELD_RADIUS * Math.cbrt(Math.random());
    const x = r * Math.sin(phi) * Math.cos(theta) * 1.3;
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi) * 0.85;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    pts.push(new THREE.Vector3(x, y, z));
    seeds[i] = Math.random() * Math.PI * 2;

    const isImportant = Math.random() < IMPORTANT_RATIO ? 1 : 0;
    important[i] = isImportant;
    const c = isImportant ? STEEL_BLUE : NODE_GRAY;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  return { positions, seeds, important, colors, pts };
}

function buildLines(pts: THREE.Vector3[], important: Float32Array) {
  const bg: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (Math.random() > BG_LINK_RATIO) continue;
    let nearest = -1;
    let nd = Infinity;
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      const d = pts[i].distanceTo(pts[j]);
      if (d < nd) {
        nd = d;
        nearest = j;
      }
    }
    if (nearest !== -1 && nd < BG_LINK_MAX_DIST) {
      bg.push(pts[i].x, pts[i].y, pts[i].z, pts[nearest].x, pts[nearest].y, pts[nearest].z);
    }
  }

  const importantIdx: number[] = [];
  for (let i = 0; i < important.length; i++) {
    if (important[i]) importantIdx.push(i);
  }
  const path: number[] = [];
  const linked = new Set<string>();
  for (const i of importantIdx) {
    let nearest = -1;
    let nd = Infinity;
    for (const j of importantIdx) {
      if (i === j) continue;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (linked.has(key)) continue;
      const d = pts[i].distanceTo(pts[j]);
      if (d < nd) {
        nd = d;
        nearest = j;
      }
    }
    if (nearest !== -1 && nd < PATH_LINK_MAX_DIST) {
      path.push(pts[i].x, pts[i].y, pts[i].z, pts[nearest].x, pts[nearest].y, pts[nearest].z);
      linked.add(`${Math.min(i, nearest)}-${Math.max(i, nearest)}`);
    }
  }

  return { bg: new Float32Array(bg), path: new Float32Array(path) };
}

function Constellation({ pointer }: { pointer: React.RefObject<{ x: number; y: number }> }) {
  const groupRef = React.useRef<THREE.Group>(null!);
  const { positions, seeds, important, colors, pts } = React.useMemo(() => generateField(), []);
  const { bg, path } = React.useMemo(() => buildLines(pts, important), [pts, important]);

  const material = React.useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uPointer: { value: new THREE.Vector3(9999, 9999, 9999) },
          uTime: { value: 0 },
          uBaseSize: { value: 0.35 },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  const { camera, raycaster } = useThree();
  const ndc = React.useRef(new THREE.Vector2());
  const plane = React.useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const hitPoint = React.useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;

    groupRef.current.rotation.y += delta * 0.025;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, pointer.current.y * 0.15, 0.03);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, pointer.current.x * 0.08, 0.03);

    ndc.current.set(pointer.current.x, pointer.current.y);
    raycaster.setFromCamera(ndc.current, camera);
    if (raycaster.ray.intersectPlane(plane, hitPoint.current)) {
      const local = groupRef.current.worldToLocal(hitPoint.current.clone());
      material.uniforms.uPointer.value.lerp(local, 0.15);
    }
  });

  return (
    <group ref={groupRef} position={[1, 0, -0.4]}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[bg, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#9AA1AC" transparent opacity={0.05} />
      </lineSegments>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[path, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#6E93FF" transparent opacity={0.8} />
      </lineSegments>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
          <bufferAttribute attach="attributes-aImportant" args={[important, 1]} />
          <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        </bufferGeometry>
        <primitive object={material} attach="material" />
      </points>
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

function ConstellationFallback() {
  return (
    <div className="size-full flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-2/3 max-w-sm opacity-70" fill="none" stroke="#9AA1AC" strokeWidth="0.4">
        <circle cx="60" cy="50" r="2" fill="#9AA1AC" stroke="none" />
        <circle cx="130" cy="40" r="2" fill="#9AA1AC" stroke="none" />
        <circle cx="160" cy="110" r="2.5" fill="#4D7CFE" stroke="none" />
        <circle cx="100" cy="150" r="2" fill="#9AA1AC" stroke="none" />
        <circle cx="40" cy="120" r="2" fill="#9AA1AC" stroke="none" />
        <circle cx="100" cy="90" r="2.5" fill="#4D7CFE" stroke="none" />
        <path d="M100 90 L160 110" stroke="#4D7CFE" strokeWidth="0.5" />
        <path d="M60 50 L100 90 M130 40 L100 90 M100 90 L100 150 M100 90 L40 120" />
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
    if (this.state.hasError) return <ConstellationFallback />;
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
    return <ConstellationFallback />;
  }

  return (
    <div className="size-full" onPointerMove={handlePointerMove}>
      <WebGLErrorBoundary>
        <Canvas camera={{ position: [0, 0, 5.5], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={["#0A0A0A"]} />
          <ambientLight intensity={0.2} />
          <pointLight position={[5, 1, 2]} intensity={6} color="#FFFFFF" distance={14} />
          <pointLight position={[-2, 3, 3]} intensity={3} color="#FFFFFF" distance={14} />
          <Constellation pointer={pointer} />
          <Rig pointer={pointer} />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
