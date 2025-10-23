/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Vector3, MeshStandardMaterial, Group, Mesh } from "three";
import Data from "@/utils/data";

interface ModelProps {
  rotation?: [number, number, number];
  indexModel?: number;
  isOpen?: boolean;
  isDetected?: boolean;
  scaleFactor?: number;
  lerpSpeed?: number;
}

interface ObjectModelProps {
  modelPath: string;
  isOpen: boolean;
  scaleFactor: number;
  lerpSpeed: number;
  defaultScale: number;
  scale: number;
}

const lerp = (start: number, end: number, alpha: number): number => {
  return start + (end - start) * alpha;
};

function ObjectModel({
  modelPath,
  isOpen,
  scaleFactor,
  lerpSpeed,
  defaultScale,
  scale,
}: ObjectModelProps) {
  const ref = useRef<Group>(null);
  const gltf = useGLTF(modelPath);
  const { nodes, materials } = gltf;
  const targetScale = useRef(new Vector3(1, 1, 1));

  const meshes = Object.values(nodes).filter(
    (node: any) => node.isMesh && node.geometry
  );

  if (meshes.length === 0) {
    return null;
  }

  useFrame(() => {
    if (!ref.current) return;

    const factor = isOpen ? scale : defaultScale;
    targetScale.current.set(factor, factor, factor);
    ref.current.scale.lerp(targetScale.current, lerpSpeed);
  });

  return (
    <group ref={ref} dispose={null}>
      {meshes.map((node: any, index: number) => {
        let material = node.material || Object.values(materials)[0];
        if (material && !material.map && !material.isMeshStandardMaterial) {
          material = new MeshStandardMaterial({
            color: material.color || 0xffffff,
            map: material.map || null,
            roughness: 0.5,
            metalness: 0.5,
          });
        }
        return (
          <mesh key={index} geometry={node.geometry} material={material} />
        );
      })}
    </group>
  );
}

export default function Model({
  rotation = [0, 0, 0],
  indexModel = 0,
  isOpen = false,
  isDetected = false,
  scaleFactor = 1,
  lerpSpeed = 0.1,
}: ModelProps) {
  const meshRef = useRef<Group>(null);
  const targetRotation = useRef(new Vector3(0, 0, 0));
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReset = useRef(false);

  const modelData = Data[indexModel];
  if (!modelData?.path) {
    return null;
  }
  const { path: modelPath, defaultScale, scale } = modelData;

  useEffect(() => {
    if (!isDetected) {
      if (!shouldReset.current && !timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          shouldReset.current = true;
          timeoutRef.current = null;
        }, 1000);
      }
    } else {
      shouldReset.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isDetected]);

  useFrame(() => {
    if (!meshRef.current) return;

    if (isDetected) {
      targetRotation.current.x += rotation[0];
      targetRotation.current.y += rotation[1];
      targetRotation.current.z += rotation[2];

      meshRef.current.rotation.x = lerp(
        meshRef.current.rotation.x,
        targetRotation.current.x,
        lerpSpeed
      );
      meshRef.current.rotation.y = lerp(
        meshRef.current.rotation.y,
        targetRotation.current.y,
        lerpSpeed
      );
      meshRef.current.rotation.z = lerp(
        meshRef.current.rotation.z,
        targetRotation.current.z,
        lerpSpeed
      );
    } else if (shouldReset.current) {
      meshRef.current.rotation.x = lerp(
        meshRef.current.rotation.x,
        0,
        lerpSpeed
      );
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.z = lerp(
        meshRef.current.rotation.z,
        0,
        lerpSpeed
      );
    }
  });

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.rotation.set(0, -Math.PI / 2, 0);
      targetRotation.current.set(0, -Math.PI / 2, 0);
    }
  }, [indexModel]);

  return (
    <group ref={meshRef}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <ObjectModel
        modelPath={modelPath}
        isOpen={isOpen}
        scaleFactor={scaleFactor}
        lerpSpeed={lerpSpeed}
        defaultScale={defaultScale}
        scale={scale}
      />
    </group>
  );
}

// Preload models
Data.forEach((model) => {
  try {
    useGLTF.preload(model.path);
  } catch (error) {
    console.error(`Failed to preload model: ${model.path}`, error);
  }
});
