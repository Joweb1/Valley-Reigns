import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface MorphingParticles3DProps {
  className?: string;
  size?: number;
}

const PARTICLE_COUNT = 2600;

// Helper to create a circular particle texture
function createCircleTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 64, 64);
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, "rgba(7, 21, 48, 1)");        // Dark deep blue core
    grad.addColorStop(0.65, "rgba(11, 27, 61, 0.95)"); // Deep midnight navy
    grad.addColorStop(0.85, "rgba(18, 45, 95, 0.6)");  // Subtle soft edge
    grad.addColorStop(1, "rgba(11, 27, 61, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 1. SPHERE
function generateSphere(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT);
    const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi;
    const r = 1.35 + (Math.random() - 0.5) * 0.08;

    positions[i * 3] = r * Math.cos(theta) * Math.sin(phi);
    positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

// 2. SOLID 3-DIMENSIONAL BLOCK 3
function generateThree(): Float32Array {
  function isInBlock3(x: number, y: number): boolean {
    // Chamfers on the outermost 45-degree corners
    if (x + y > 1.5) return false;
    if (x - y > 1.5) return false;
    if (-x + y > 1.45) return false;
    if (-x - y > 1.45) return false;

    // Top horizontal block slab
    if (x >= -0.65 && x <= 0.50 && y >= 0.72 && y <= 1.15) return true;
    // Top-left drop serif
    if (x >= -0.65 && x <= -0.28 && y >= 0.45 && y <= 0.80) return true;
    // Upper-right vertical block pillar
    if (x >= 0.22 && x <= 0.72 && y >= 0.12 && y <= 0.85) return true;
    // Center horizontal block bar
    if (x >= -0.15 && x <= 0.55 && y >= -0.18 && y <= 0.22) return true;
    // Lower-right vertical block pillar
    if (x >= 0.22 && x <= 0.72 && y >= -0.85 && y <= -0.12) return true;
    // Bottom horizontal block slab
    if (x >= -0.65 && x <= 0.50 && y >= -1.15 && y <= -0.72) return true;
    // Bottom-left upward lift serif
    if (x >= -0.65 && x <= -0.28 && y >= -0.80 && y <= -0.45) return true;

    return false;
  }

  // Precompute 2D grid of valid points and boundary edge points
  const step = 0.024;
  const allPoints: [number, number][] = [];
  const edgePoints: [number, number][] = [];

  for (let y = -1.25; y <= 1.25; y += step) {
    for (let x = -0.75; x <= 0.80; x += step) {
      if (isInBlock3(x, y)) {
        allPoints.push([x, y]);
        const isEdge =
          !isInBlock3(x + step, y) ||
          !isInBlock3(x - step, y) ||
          !isInBlock3(x, y + step) ||
          !isInBlock3(x, y - step);
        if (isEdge) {
          edgePoints.push([x, y]);
        }
      }
    }
  }

  const positions = new Float32Array(PARTICLE_COUNT * 3);
  let idx = 0;
  const depth = 0.36; // 3D extrusion thickness

  // 1. Solid front face particles (~33% of particles)
  const frontTarget = Math.floor(PARTICLE_COUNT * 0.33);
  for (let i = 0; i < frontTarget && idx < PARTICLE_COUNT; i++) {
    const pt = allPoints[Math.floor(Math.random() * allPoints.length)];
    positions[idx * 3] = pt[0] + (Math.random() - 0.5) * step;
    positions[idx * 3 + 1] = pt[1] + (Math.random() - 0.5) * step;
    positions[idx * 3 + 2] = depth + (Math.random() - 0.5) * 0.03;
    idx++;
  }

  // 2. Solid back face particles (~33% of particles)
  const backTarget = Math.floor(PARTICLE_COUNT * 0.33);
  for (let i = 0; i < backTarget && idx < PARTICLE_COUNT; i++) {
    const pt = allPoints[Math.floor(Math.random() * allPoints.length)];
    positions[idx * 3] = pt[0] + (Math.random() - 0.5) * step;
    positions[idx * 3 + 1] = pt[1] + (Math.random() - 0.5) * step;
    positions[idx * 3 + 2] = -depth + (Math.random() - 0.5) * 0.03;
    idx++;
  }

  // 3. Extruded side perimeter walls (~24% of particles)
  const sideTarget = Math.floor(PARTICLE_COUNT * 0.24);
  for (let i = 0; i < sideTarget && idx < PARTICLE_COUNT; i++) {
    const pt = edgePoints[Math.floor(Math.random() * edgePoints.length)];
    positions[idx * 3] = pt[0] + (Math.random() - 0.5) * (step * 0.7);
    positions[idx * 3 + 1] = pt[1] + (Math.random() - 0.5) * (step * 0.7);
    positions[idx * 3 + 2] = (Math.random() * 2 - 1) * depth;
    idx++;
  }

  // 4. Volumetric interior core (remaining particles to reach exactly PARTICLE_COUNT)
  while (idx < PARTICLE_COUNT) {
    const pt = allPoints[Math.floor(Math.random() * allPoints.length)];
    positions[idx * 3] = pt[0] + (Math.random() - 0.5) * step;
    positions[idx * 3 + 1] = pt[1] + (Math.random() - 0.5) * step;
    positions[idx * 3 + 2] = (Math.random() * 2 - 1) * (depth * 0.85);
    idx++;
  }

  return positions;
}

// 3. BRIEFCASE
function generateBriefcase(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const bodyCount = Math.floor(PARTICLE_COUNT * 0.72);
  const handleCount = Math.floor(PARTICLE_COUNT * 0.18);
  const claspCount = PARTICLE_COUNT - bodyCount - handleCount;

  let idx = 0;
  // Main Briefcase body: rectangular box
  const w = 2.1;
  const h = 1.35;
  const d = 0.75;

  for (let i = 0; i < bodyCount; i++) {
    const isFrontBack = Math.random() < 0.65;
    let x = (Math.random() - 0.5) * w;
    let y = (Math.random() - 0.5) * h - 0.25;
    let z = (Math.random() - 0.5) * d;

    if (isFrontBack) {
      z = (Math.random() > 0.5 ? 1 : -1) * (d / 2) + (Math.random() - 0.5) * 0.06;
    }
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  }

  // Briefcase curved handle on top
  for (let i = 0; i < handleCount; i++) {
    const angle = (i / handleCount) * Math.PI; // Arch from 0 to PI
    const hr = 0.55;
    const x = Math.cos(angle) * hr;
    const y = 0.43 + Math.sin(angle) * 0.45 + (Math.random() - 0.5) * 0.05;
    const z = (Math.random() - 0.5) * 0.1;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  }

  // Two metallic latches/clasps on front
  const claspXs = [-0.55, 0.55];
  for (let i = 0; i < claspCount; i++) {
    const cx = claspXs[i % 2];
    const x = cx + (Math.random() - 0.5) * 0.15;
    const y = 0.15 + (Math.random() - 0.5) * 0.2;
    const z = d / 2 + 0.04 + (Math.random() - 0.5) * 0.04;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  }

  return positions;
}

export const MorphingParticles3D: React.FC<MorphingParticles3DProps> = ({
  className = "",
  size = 140,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || size;
    const height = container.clientHeight || size;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.3;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Sequence: Sphere -> 3 -> Briefcase -> 3 -> Sphere (continuous loop)
    const shapeCoordinates = [
      generateSphere(),
      generateThree(),
      generateBriefcase(),
      generateThree(),
    ];

    // Buffers for current, target, and dynamic morphing
    const dynamicPositions = new Float32Array(shapeCoordinates[0]);
    const dispersionOffsets = new Float32Array(PARTICLE_COUNT * 3);

    // Populate explosion/scatter vectors for dynamic transition
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const mag = 1.1 + Math.random() * 2.0;
      dispersionOffsets[i * 3] = mag * Math.sin(phi) * Math.cos(theta);
      dispersionOffsets[i * 3 + 1] = mag * Math.sin(phi) * Math.sin(theta);
      dispersionOffsets[i * 3 + 2] = mag * Math.cos(phi);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(dynamicPositions, 3)
    );

    // Particle Material with deep dark blue tint (#0B1B3D)
    const circleTexture = createCircleTexture();
    const material = new THREE.PointsMaterial({
      color: new THREE.Color("#0B1B3D"),
      size: 0.076,
      map: circleTexture,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    // Morph state variables
    let shapeIndex = 0;
    let nextShapeIndex = 1;
    let morphProgress = 1; // 1 = resting in shapeIndex
    let isMorphing = false;
    let lastMorphTime = performance.now();
    const HOLD_DURATION = 4500; // ms to stay formed in each shape (~4.5s)
    const MORPH_DURATION = 1800; // ms for graceful dispersion and reforming (1.8s)

    let animationFrameId: number;

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth to-and-fro oscillation (right and left) to showcase 3D depth without 360 inversion
      particleSystem.rotation.y = Math.sin(time * 0.0011) * 0.44; // sways ~25 degrees left and right
      particleSystem.rotation.x = Math.sin(time * 0.0007) * 0.10; // subtle vertical breathing tilt

      const elapsed = time - lastMorphTime;

      if (!isMorphing) {
        if (elapsed > HOLD_DURATION) {
          isMorphing = true;
          morphProgress = 0;
          lastMorphTime = time;
          nextShapeIndex = (shapeIndex + 1) % shapeCoordinates.length;
        }
      } else {
        morphProgress = Math.min(1, elapsed / MORPH_DURATION);

        // Smooth cubic ease in-out
        const ease =
          morphProgress < 0.5
            ? 4 * morphProgress * morphProgress * morphProgress
            : 1 - Math.pow(-2 * morphProgress + 2, 3) / 2;

        // Dispersion curve peaks in the middle of morph (scatter effect)
        const scatterFactor = Math.sin(morphProgress * Math.PI) * 0.42;

        const src = shapeCoordinates[shapeIndex];
        const dst = shapeCoordinates[nextShapeIndex];
        const posAttr = geometry.attributes.position;
        const arr = posAttr.array as Float32Array;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          const sx = src[i3];
          const sy = src[i3 + 1];
          const sz = src[i3 + 2];

          const dx = dst[i3];
          const dy = dst[i3 + 1];
          const dz = dst[i3 + 2];

          const ox = dispersionOffsets[i3] * scatterFactor;
          const oy = dispersionOffsets[i3 + 1] * scatterFactor;
          const oz = dispersionOffsets[i3 + 2] * scatterFactor;

          arr[i3] = sx + (dx - sx) * ease + ox;
          arr[i3 + 1] = sy + (dy - sy) * ease + oy;
          arr[i3 + 2] = sz + (dz - sz) * ease + oz;
        }

        posAttr.needsUpdate = true;

        if (morphProgress >= 1) {
          isMorphing = false;
          shapeIndex = nextShapeIndex;
          lastMorphTime = time;
        }
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Resize handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || size;
      const h = container.clientHeight || size;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      circleTexture.dispose();
      renderer.dispose();
    };
  }, [size]);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <div
        ref={containerRef}
        style={{ width: size, height: size }}
        className="relative pointer-events-none select-none flex items-center justify-center cursor-default"
      />
      {/* 3 Years Anniversary badge */}
      <span className="text-[10px] sm:text-[11px] font-sans font-extrabold tracking-wide text-[#0B1B3D] bg-slate-100/95 px-2.5 py-0.5 rounded-full border border-slate-200/90 -mt-1 shadow-2xs whitespace-nowrap">
        3 Years Anniversary
      </span>
    </div>
  );
};
