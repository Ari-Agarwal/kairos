"use client";
import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

const POINT_COUNT = 2600;
const FIELD = { x: 9, y: 3.2, zNear: 1.5, zFar: -11 };
const DRAW_DURATION = 2.6; // seconds for the path to draw itself in
const IGNITE_DURATION = 1.2; // seconds for the lighthouse flash/beam fade-in
const BEAM_PERIOD = 8; // seconds per full beam revolution
const PATH_SAMPLES = 400;

const POINT_VERTEX = `
  attribute float aSeed;
  uniform float uTime;
  uniform vec3 uComet;
  uniform float uCometActive;
  uniform vec3 uLight;
  uniform float uBeamAngle;
  uniform float uBeamOn;
  varying float vFade;
  varying float vBoost;
  varying float vTwinkle;
  void main() {
    vec3 pos = position;
    pos.x += sin(uTime * 0.12 + aSeed) * 0.05;
    pos.y += cos(uTime * 0.1 + aSeed * 1.9) * 0.05;

    // per-star glimmer: each twinkles at its own rate/phase, driven by its seed.
    // runs perpetually so the field always sparkles as an ambient resting state.
    float rate = 1.2 + fract(aSeed) * 2.0;
    vTwinkle = 0.5 + 0.5 * sin(uTime * rate + aSeed * 6.2831853);

    // comet proximity glow while the path draws in
    float cometGlow = smoothstep(1.4, 0.0, distance(pos, uComet)) * uCometActive;

    // lighthouse beam sweep: brighten points near the beam's current bearing
    vec2 rel = pos.xz - uLight.xz;
    float pointAngle = atan(rel.y, rel.x);
    float diff = abs(mod(pointAngle - uBeamAngle + 3.14159265, 6.2831853) - 3.14159265);
    float reach = smoothstep(11.0, 1.0, length(rel));
    float beamGlow = smoothstep(0.45, 0.0, diff) * (0.5 + reach * 0.5) * uBeamOn;

    vBoost = clamp(cometGlow + beamGlow, 0.0, 1.0);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vFade = smoothstep(16.0, 3.0, -mvPosition.z);
    gl_PointSize = (0.9 + fract(aSeed) * 1.1 + vTwinkle * 0.5 + vBoost * 1.6) * (60.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const POINT_FRAGMENT = `
  varying float vFade;
  varying float vBoost;
  varying float vTwinkle;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    // twinkle modulates the ambient brightness; the sweep/comet boost adds on top
    float ambient = 0.28 + 0.34 * vTwinkle;
    float alpha = smoothstep(0.5, 0.0, d) * vFade * (ambient + vBoost * 0.55);
    vec3 color = mix(vec3(0.64, 0.64, 0.66), vec3(0.98, 0.98, 0.98), clamp(vBoost + vTwinkle * 0.25, 0.0, 1.0));
    gl_FragColor = vec4(color, alpha);
  }
`;

function generatePoints() {
  const positions = new Float32Array(POINT_COUNT * 3);
  const seeds = new Float32Array(POINT_COUNT);
  for (let i = 0; i < POINT_COUNT; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * FIELD.x;
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * FIELD.y;
    positions[i * 3 + 2] = FIELD.zFar + Math.random() * (FIELD.zNear - FIELD.zFar);
    seeds[i] = Math.random() * Math.PI * 2;
  }
  return { positions, seeds };
}

function buildPath() {
  // A route from lower-left foreground, weaving through the field, to a
  // destination deep on the right — the "clear line through the noise".
  // Mirrored on x so the destination (the glowing lighthouse, the point that
  // draws the eye) lands on the left, near the hero copy, instead of pulling
  // attention to the empty right side of the screen.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(7.5, -1.6, 0.8),
    new THREE.Vector3(4.2, -0.4, -1.2),
    new THREE.Vector3(1.6, -1.1, -2.8),
    new THREE.Vector3(-1.2, 0.3, -4.2),
    new THREE.Vector3(-3.4, -0.5, -5.6),
    new THREE.Vector3(-5.2, 0.7, -7.2),
    new THREE.Vector3(-6.4, 1.1, -8.6),
  ]);
  const tube = new THREE.TubeGeometry(curve, PATH_SAMPLES, 0.035, 6, false);
  // count in index entries when indexed, vertices otherwise — drawRange units differ
  const indexCount = tube.index ? tube.index.count : tube.attributes.position.count;
  return { curve, tube, indexCount, destination: curve.getPoint(1) };
}

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(250,250,250,1)");
  g.addColorStop(0.25, "rgba(250,250,250,0.55)");
  g.addColorStop(1, "rgba(250,250,250,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function Scene({ pointer }: { pointer: React.RefObject<{ x: number; y: number }> }) {
  const groupRef = React.useRef<THREE.Group>(null!);
  const tubeRef = React.useRef<THREE.Mesh>(null!);
  const cometRef = React.useRef<THREE.Sprite>(null!);
  const cometMatRef = React.useRef<THREE.SpriteMaterial>(null!);
  const glowMatRef = React.useRef<THREE.SpriteMaterial>(null!);
  const towerMatRef = React.useRef<THREE.MeshBasicMaterial>(null!);
  const startTime = React.useRef<number | null>(null);

  const { positions, seeds } = React.useMemo(() => generatePoints(), []);
  const path = React.useMemo(() => buildPath(), []);
  const glowTexture = React.useMemo(() => makeGlowTexture(), []);

  const pointMaterial = React.useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uComet: { value: new THREE.Vector3(9999, 9999, 9999) },
          uCometActive: { value: 0 },
          uLight: { value: path.destination.clone() },
          uBeamAngle: { value: 0 },
          uBeamOn: { value: 0 },
        },
        vertexShader: POINT_VERTEX,
        fragmentShader: POINT_FRAGMENT,
        transparent: true,
        depthWrite: false,
      }),
    [path.destination]
  );

  // r3f's per-frame animation loop runs outside React's render phase, so mutating
  // memoized/ref-held three.js objects here is the correct, standard r3f pattern.
  /* eslint-disable react-hooks/immutability */
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    pointMaterial.uniforms.uTime.value = t;

    if (startTime.current === null) startTime.current = t;
    const elapsed = t - startTime.current;
    const progress = Math.min(elapsed / DRAW_DURATION, 1);
    const eased = easeOutCubic(progress);

    // path draws in; TubeGeometry indices run along the curve
    tubeRef.current.geometry.setDrawRange(0, Math.floor((eased * path.indexCount) / 3) * 3);

    // comet rides the tip of the drawing path, then fades out on arrival
    const tip = path.curve.getPoint(Math.min(eased, 0.999));
    cometRef.current.position.copy(tip);
    pointMaterial.uniforms.uComet.value.copy(tip);
    const cometLife = progress < 1 ? 1 : Math.max(0, 1 - (elapsed - DRAW_DURATION) / 0.5);
    pointMaterial.uniforms.uCometActive.value = cometLife;
    if (cometMatRef.current) cometMatRef.current.opacity = 0.9 * cometLife;

    // ignition: after arrival the lighthouse flashes on and the beam fades in
    const ignite = Math.min(Math.max((elapsed - DRAW_DURATION) / IGNITE_DURATION, 0), 1);
    const flash = ignite > 0 ? 1 + Math.sin(Math.min(ignite, 0.5) * Math.PI) * 1.2 : 0;
    if (glowMatRef.current) {
      glowMatRef.current.opacity = ignite * (0.55 + Math.sin(t * 1.4) * 0.12) * flash;
    }
    if (towerMatRef.current) towerMatRef.current.opacity = ignite * 0.9;

    // invisible beam sweep — the light has no body, only the points reveal it
    const beamOn = easeOutCubic(ignite);
    const beamAngle = ((elapsed - DRAW_DURATION) * Math.PI * 2) / BEAM_PERIOD;
    pointMaterial.uniforms.uBeamOn.value = beamOn;
    pointMaterial.uniforms.uBeamAngle.value = beamAngle;

    // slow drift + pointer parallax
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      pointer.current.x * 0.05 + Math.sin(t * 0.05) * 0.02,
      0.03
    );
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, pointer.current.x * 0.5, 0.04);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 0.2 + pointer.current.y * 0.3, 0.04);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 5 - Math.sin(t * 0.04) * 0.4, 0.02);
    state.camera.lookAt(-0.5, 0, -4);
  });
  /* eslint-enable react-hooks/immutability */

  const dest = path.destination;

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        </bufferGeometry>
        <primitive object={pointMaterial} attach="material" />
      </points>

      <mesh ref={tubeRef} geometry={path.tube}>
        <meshBasicMaterial color="#FAFAFA" transparent opacity={0.95} />
      </mesh>

      {/* comet riding the path tip during draw-in */}
      <sprite ref={cometRef} scale={[0.55, 0.55, 1]}>
        <spriteMaterial ref={cometMatRef} map={glowTexture} transparent opacity={0} depthWrite={false} />
      </sprite>

      {/* the lighthouse: abstract tower sliver + halo + rotating beam */}
      <group position={dest}>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.025, 0.045, 0.7, 8]} />
          <meshBasicMaterial ref={towerMatRef} color="#FAFAFA" transparent opacity={0} />
        </mesh>
        <sprite position={[0, 0.75, 0]} scale={[1.4, 1.4, 1]}>
          <spriteMaterial ref={glowMatRef} map={glowTexture} transparent opacity={0} depthWrite={false} />
        </sprite>
      </group>
    </group>
  );
}

function getInitialReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function PathFallback() {
  return (
    <div className="size-full flex items-center justify-center">
      <svg viewBox="0 0 240 160" className="w-2/3 max-w-md opacity-60" fill="none">
        {[
          [20, 30], [55, 95], [90, 20], [120, 130], [150, 55], [200, 100],
          [35, 130], [175, 25], [220, 45], [70, 60], [140, 90], [105, 75],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" fill="#A3A3A3" />
        ))}
        <path
          d="M10 140 C 60 120, 90 100, 130 85 S 200 60, 226 42"
          stroke="#FAFAFA"
          strokeWidth="1.2"
        />
        <path d="M226 42 L196 22 M226 42 L206 62" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.5" />
        <circle cx="226" cy="42" r="4" fill="#FAFAFA" />
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
    // Swallow WebGL/three.js runtime errors (unsupported GPU, lost context, etc.) — fall back to the static SVG.
  }
  render() {
    if (this.state.hasError) return <PathFallback />;
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

export function HeroPath() {
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
    return <PathFallback />;
  }

  return (
    <div className="size-full" onPointerMove={handlePointerMove}>
      <WebGLErrorBoundary>
        <Canvas
          camera={{ position: [0, 0.2, 5], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
          onCreated={(state) => {
            if (process.env.NODE_ENV === "development") {
              // dev-only: lets headless preview tooling pump frames manually
              (window as unknown as Record<string, unknown>).__kairos3d = state;
            }
          }}
        >
          <color attach="background" args={["#0A0A0A"]} />
          <Scene pointer={pointer} />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
