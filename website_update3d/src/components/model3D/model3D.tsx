/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

interface MichelleViewProps {
  x: number;
  y: number;
  z: number;
  angle?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  URL?: string;
  animationName?: string;
  onAnimationsReady?: (names: string[]) => void;
}

export default function MichelleView({
  x,
  y,
  z,
  angle = 0,
  autoRotate = false,
  autoRotateSpeed = 2.0,
  URL = "/3D/Michelle.glb",
  animationName,
  onAnimationsReady,
}: MichelleViewProps) {
  function MichelleModel() {
    const groupRef = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF(URL);
    const { gl } = useThree();
    const prepared = useMemo(() => {
      // Clone with skeleton/bone bindings preserved for skinned meshes
      const cloned = SkeletonUtils.clone(scene) as THREE.Object3D;
      cloned.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const applyMaterialTuning = (material: THREE.Material) => {
            material.side = THREE.FrontSide;
            const maybeSetAniso = (tex?: THREE.Texture | null) => {
              if (tex)
                tex.anisotropy = Math.min(
                  16,
                  gl.capabilities.getMaxAnisotropy()
                );
            };
            const m = material as unknown as {
              map?: THREE.Texture | null;
              normalMap?: THREE.Texture | null;
              roughnessMap?: THREE.Texture | null;
              metalnessMap?: THREE.Texture | null;
              aoMap?: THREE.Texture | null;
              emissiveMap?: THREE.Texture | null;
              displacementMap?: THREE.Texture | null;
            };
            maybeSetAniso(m.map);
            maybeSetAniso(m.normalMap);
            maybeSetAniso(m.roughnessMap);
            maybeSetAniso(m.metalnessMap);
            maybeSetAniso(m.aoMap);
            maybeSetAniso(m.emissiveMap);
            maybeSetAniso(m.displacementMap);
          };
          if (Array.isArray(mesh.material as any)) {
            (mesh.material as THREE.Material[]).forEach(applyMaterialTuning);
          } else if (mesh.material as any) {
            applyMaterialTuning(mesh.material as THREE.Material);
          }
        }
      });
      return cloned;
    }, [scene, gl]);

    // Setup and auto-play animations if available
    const { actions, names } = useAnimations(animations || [], groupRef);

    // Notify parent about available animations (once per change in names)
    useEffect(() => {
      if (typeof onAnimationsReady === "function" && names && names.length) {
        onAnimationsReady(names);
      }
    }, [names]);

    // Play/cleanup when selected animation changes
    useEffect(() => {
      const targetName = animationName || names?.[0];
      if (!targetName) return;
      const action = actions[targetName];
      if (!action) return;
      action.reset().fadeIn(0.25).play();
      return () => {
        action.fadeOut(0.2).stop();
      };
    }, [actions, names]);

    return (
      <group ref={groupRef}>
        <primitive object={prepared} />
      </group>
    );
  }
  // Update the default camera position based on joystick x,y,z
  function CameraController({ x, y, z }: { x: number; y: number; z: number }) {
    const { camera } = useThree();
    useEffect(() => {
      camera.position.set(x, y, z);
      camera.updateProjectionMatrix();
    }, [camera, x, y, z]);
    return null;
  }
  return (
    <div className="w-full h-[92vh]">
      <Canvas
        dpr={[1, 2]}
        shadows
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          (gl as any).outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        camera={{ position: [5, 3, 8], fov: 45, near: 0.1, far: 200 }}
      >
        <CameraController x={x} y={y} z={z} />
        {/* <Grid
          args={[100, 100]}
          sectionSize={1}
          cellSize={0.5}
          sectionThickness={1}
          cellThickness={0.5}
          infiniteGrid
          fadeDistance={30}
          fadeStrength={1}
          position={[0, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        /> */}

        <color attach="background" args={["#ffffff"]} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 10, 7.5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <hemisphereLight args={["#ffffff", "#e3e3e3", 0.6]} />
        <Suspense fallback={null}>
          <group
            position={[0, 0, 0]}
            rotation={[0, (angle * Math.PI) / 180, 0]}
          >
            <MichelleModel />
          </group>
        </Suspense>

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#e9e9e9" />
        </mesh>
        <OrbitControls
          enableDamping
          makeDefault
          target={[0, 1, 0]}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
        />
      </Canvas>
    </div>
  );
}
