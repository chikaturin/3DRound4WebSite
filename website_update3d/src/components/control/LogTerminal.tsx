/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { SwitchCameraIcon } from "lucide-react";
import * as THREE from "three";

const BoxModel = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
};

const HandBoxDemo = () => {
  const [position, setPosition] = useState([0, 0, 0]);
  const [isOpen, setIsOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [isDetected, setIsDetected] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const videoRef = useRef(document.createElement("video"));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(
    null
  );

  // Helper functions to replace HandStateManager
  const computeCentroid = (landmarks: Array<{ x: number; y: number }>) => {
    let sx = 0,
      sy = 0;
    for (let i = 0; i < landmarks.length; i++) {
      sx += landmarks[i].x;
      sy += landmarks[i].y;
    }
    const n = landmarks.length || 1;
    return { x: sx / n, y: sy / n };
  };

  const isHandOpenSimple = (landmarks: Array<{ x: number; y: number }>) => {
    if (!landmarks || landmarks.length < 9) return false; // 0 wrist, 4 thumb tip, 8 index tip
    const wrist = landmarks[0];
    const thumb = landmarks[4];
    const index = landmarks[8];
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    return dist(wrist, index) > dist(wrist, thumb) * 1.05;
  };

  const mapTo3DPosition = (centroid: {
    x: number;
    y: number;
  }): [number, number, number] => {
    const x = (centroid.x - 0.5) * 6;
    const y = (0.5 - centroid.y) * 4;
    const z = 0;
    return [x, y, z];
  };

  useEffect(() => {
    const createHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.5,
        });
        setHandLandmarker(landmarker);
      } catch (error) {
        console.error("Error creating hand landmarker:", error);
      }
    };

    createHandLandmarker();

    return () => {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async (mode: string) => {
    try {
      // Dừng stream hiện tại nếu có
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1280,
          height: 720,
          facingMode: mode,
        },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraReady(true);
      setShowDialog(true);
      setTimeout(() => setShowDialog(false), 3000);
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
  }, [facingMode]);

  useEffect(() => {
    if (cameraReady && handLandmarker) detectHands();
  }, [cameraReady, handLandmarker]);

  const detectHands = async () => {
    let lastDetectionTime = Date.now();
    const detectFrame = async () => {
      if (videoRef.current.paused || videoRef.current.ended) return;

      const currentTime = Date.now();
      if (currentTime - lastDetectionTime < 33) {
        requestAnimationFrame(detectFrame);
        return;
      }
      lastDetectionTime = currentTime;

      try {
        if (!handLandmarker) return;
        const results = await handLandmarker.detectForVideo(
          videoRef.current,
          currentTime
        );
        if (results?.landmarks?.length) {
          const lm = results.landmarks[0] as Array<{ x: number; y: number }>;
          const centroid = computeCentroid(lm);
          const open = isHandOpenSimple(lm);

          setPosition(mapTo3DPosition(centroid));
          setIsOpen(open);
          setIsDetected(true);
          drawLandmarks(lm, centroid);
        } else {
          setIsDetected(false);
          setIsOpen(false);
          clearCanvas();
        }
      } catch (error) {
        console.error("Error during hand detection:", error);
      }

      requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  const drawLandmarks = (
    landmarks: Array<{ x: number; y: number }>,
    centroid: { x: number; y: number }
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vẽ landmarks
    landmarks.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x * canvas.width, y * canvas.height, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    });

    // Vẽ centroid
    if (centroid) {
      ctx.beginPath();
      ctx.arc(
        centroid.x * canvas.width,
        centroid.y * canvas.height,
        10,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = "yellow";
      ctx.fill();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const toggleCamera = () => {
    setCameraReady(false); // Tạm dừng phát hiện tay
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <div
      ref={containerRef}
      className="flex justify-center items-center h-screen w-screen relative bg-white"
    >
      <video
        ref={videoRef}
        className="absolute w-full h-full object-cover z-[1] scale-x-[-1]"
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="absolute w-full h-full z-[2] scale-x-[-1]"
        width={1280}
        height={720}
      />
      <Canvas
        className="w-full h-full z-[3]"
        camera={{ position: [0, 0, 10], fov: 60 }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[0, 5, 5]} intensity={1} castShadow />
        <spotLight
          position={[-5, 5, 5]}
          angle={0.3}
          penumbra={1}
          intensity={0.5}
        />
        {isOpen && <BoxModel position={position as [number, number, number]} />}
        <OrbitControls
          ref={controlsRef}
          enableZoom={false}
          enableRotate={false}
        />
      </Canvas>
      <button
        onClick={toggleCamera}
        className="absolute top-2.5 right-2.5 px-4 py-2.5 bg-black/70 text-white border-none rounded text-base cursor-pointer z-[1000]"
      >
        <SwitchCameraIcon />
      </button>
      {showDialog && (
        <div className="absolute top-[10%] left-1/2 transform -translate-x-1/2 p-5 bg-green-500 text-white border-2 border-gray-800 rounded-lg z-[1000]">
          <p>Video connection established successfully!</p>
        </div>
      )}
    </div>
  );
};

export default HandBoxDemo;
