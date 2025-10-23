/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unknown-property */
"use client";
import { useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Model from "@/components/model3D/Model";
import HandDebugDialog from "@/components/control/HandDebugDialog";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { HandStateManager } from "../../utils/state";
import Data from "../../utils/data";
import { HAND_STATES } from "../../utils/type";

const ControllerHideVideo = () => {
  const [rotation, setRotation] = useState([0, 0, 0]);
  const [, setZoomVal] = useState(2);
  const [cameraReady, setCameraReady] = useState(false);
  const [showDialog, setShowDialog] = useState<any>(null);
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [isDebugDialogOpen, setIsDebugDialogOpen] = useState(false);
  const [landmarks, setLandmarks] = useState<any>(null);
  const [isDetected, setIsDetected] = useState(false);

  const [handState, setHandState] = useState({
    state: HAND_STATES.NOT_DETECTED,
    rotation: [0, 0, 0],
  });
  const controlsRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(document.createElement("video"));
  const containerRef = useRef<any>(null);
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(
    null
  );
  const handStateManager = useRef<any>(
    new HandStateManager({
      waitingTimeout: 10000,
      startingDelay: 3000,
    })
  );

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        setIsDebugDialogOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const createHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        let landmarker = null;
        try {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.6,
            minHandPresenceConfidence: 0.6,
            minTrackingConfidence: 0.5,
          });
        } catch (gpuError) {
          console.warn("GPU delegate failed, falling back to CPU:", gpuError);
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.6,
            minHandPresenceConfidence: 0.6,
            minTrackingConfidence: 0.5,
          });
        }
        setHandLandmarker(landmarker);
      } catch (error) {
        console.error("Error creating hand landmarker:", error);
      }
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 640;
        canvas.height = 480;

        videoRef.current.style.display = "none";

        document.body.appendChild(canvas);

        const zoomLevel = 1;
        const sourceWidth = 640 / zoomLevel;
        const sourceHeight = 480 / zoomLevel;
        const sourceX = (640 - sourceWidth) / 2;
        const sourceY = (480 - sourceHeight) / 2;

        const drawFrame = () => {
          if (!ctx) return;
          ctx.drawImage(
            videoRef.current,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            canvas.width,
            canvas.height
          );
          requestAnimationFrame(drawFrame);
        };
        drawFrame();

        (videoRef.current as any).canvas = canvas;

        setCameraReady(true);
        setShowDialog("camera_ready" as any);
        setTimeout(() => setShowDialog(null), 3000);
      } catch (error) {
        console.error("Lỗi khi truy cập camera:", error);
      }
    };
    createHandLandmarker();
    startCamera();

    return () => {
      const srcObject = videoRef.current.srcObject as MediaStream | null;
      if (
        srcObject &&
        typeof (srcObject as MediaStream).getTracks === "function"
      ) {
        (srcObject as MediaStream)
          .getTracks()
          .forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (cameraReady && handLandmarker) detectHands();
  }, [cameraReady, handLandmarker]);

  const detectHands = async () => {
    let lastDetectionTime = Date.now();
    let isRunning = true;
    let noDetectionCount = 0;

    const detectFrame = async () => {
      if (!isRunning || videoRef.current.paused || videoRef.current.ended) {
        isRunning = false;
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastDetectionTime < 60) {
        requestAnimationFrame(detectFrame);
        return;
      }
      lastDetectionTime = currentTime;

      try {
        if (!handLandmarker || !videoRef.current) return;
        const results = await handLandmarker.detectForVideo(
          videoRef.current,
          currentTime
        );
        const state = handStateManager.current.processLandmarks(
          results?.landmarks?.[0]
        );
        setHandState(state);

        if (results?.landmarks?.length) {
          noDetectionCount = 0;
          const landmarksData = results.landmarks[0];
          setLandmarks(landmarksData as any);
          setRotation(state.rotation);
          setIsDetected(true);

          if (state.state === HAND_STATES.STARTING) {
            setShowDialog("starting" as any);
            setTimeout(() => {
              if (
                (handStateManager.current as any).lastState !==
                HAND_STATES.STARTING
              ) {
                setShowDialog(null);
              }
            }, handStateManager.current.startingDelay);
          } else if (state.state === HAND_STATES.WAITING) {
            setShowDialog("waiting" as any);
          } else {
            setShowDialog(null);
          }

          if (state.state === HAND_STATES.SWIPE_NEXT) {
            setCurrentModelIndex((prev) => (prev + 1) % Data.length);
          } else if (state.state === HAND_STATES.SWIPE_PREVIOUS) {
            setCurrentModelIndex(
              (prev) => (prev - 1 + Data.length) % Data.length
            );
          }
        } else {
          setIsDetected(false);
          noDetectionCount++;
          setLandmarks(null);
          setRotation([0, 0, 0]);
          if (noDetectionCount > 20) {
            setShowDialog(
              state.state === HAND_STATES.WAITING ? "waiting" : (null as any)
            );
          }
        }
      } catch (error) {
        console.error("Error during hand detection:", error);
      }

      if (isRunning) requestAnimationFrame(detectFrame);
    };

    detectFrame();

    return () => {
      isRunning = false;
    };
  };

  // const handleNextModel = () => {
  //   setCurrentModelIndex((prev) => (prev + 1) % Data.length);
  // };

  // const handlePrevModel = () => {
  //   setCurrentModelIndex((prev) => (prev - 1 + Data.length) % Data.length);
  // };

  useEffect(() => {
    if (handState.state === HAND_STATES.OPEN) setZoomVal(2);
  }, [handState]);

  return (
    <div
      ref={containerRef}
      className="flex justify-center items-center h-screen w-screen relative bg-white"
    >
      <div className="absolute top-2.5 left-2.5 bg-black/80 text-white p-4 rounded z-[1000] max-w-[300px] text-sm">
        <h3>🎮 Hướng dẫn sử dụng tay:</h3>
        <div className="mt-2.5">
          <div className="flex items-center mb-2">
            <span className="text-xl mr-2.5 w-[30px]">👋</span>
            <span>
              <strong>TAY MỞ:</strong> Model sẽ to hơn và di chuyển theo tay
            </span>
          </div>
          <div className="flex items-center mb-2">
            <span className="text-xl mr-2.5 w-[30px]">✊</span>
            <span>
              <strong>TAY NẮM:</strong> Model sẽ nhỏ hơn và di chuyển theo tay
            </span>
          </div>
          <div className="flex items-center mb-2">
            <span className="text-xl mr-2.5 w-[30px]">👆</span>
            <span>
              <strong>CHỈ TAY:</strong> Model sẽ di chuyển theo ngón trỏ
            </span>
          </div>
        </div>
        <div className="mt-3 p-2.5 bg-white/10 rounded">
          <p className="mb-1.5">
            <strong>Trạng thái hiện tại:</strong>{" "}
            {isDetected ? "✅ Đã phát hiện tay" : "❌ Chưa phát hiện tay"}
          </p>
          <p>
            <strong>Vị trí tay:</strong> [{rotation[0].toFixed(2)},{" "}
            {rotation[1].toFixed(2)}, {rotation[2].toFixed(2)}]
          </p>
        </div>
      </div>
      <Canvas className="w-full h-full">
        <ambientLight intensity={0.8} />
        <directionalLight position={[0, 0, 0]} intensity={1} castShadow />
        <spotLight
          position={[-5, 5, 5]}
          angle={0.3}
          penumbra={1}
          decay={2}
          intensity={0.5}
        />
        <Model
          rotation={rotation as [number, number, number]}
          isOpen={handState.state === HAND_STATES.OPEN}
          indexModel={currentModelIndex}
          isDetected={
            handState.state !== HAND_STATES.NOT_DETECTED &&
            handState.state !== HAND_STATES.WAITING &&
            handState.state !== HAND_STATES.STARTING
          }
        />
        <OrbitControls
          ref={controlsRef}
          enableZoom={false}
          enableRotate={false}
        />
      </Canvas>
      {showDialog && (
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 p-5 bg-green-600 text-white border-2 border-gray-800 rounded z-[1000]">
          <p>
            {showDialog === "camera_ready" &&
              "Video connection established successfully!"}
            {showDialog === "starting" &&
              "Preparing to detect hand... Please wait."}
            {/* {showDialog === 'waiting' && 'No hand detected. Waiting for interaction...'} */}
          </p>
        </div>
      )}
      <HandDebugDialog
        landmarks={landmarks}
        state={handState.state}
        rotation={handState.rotation}
        isOpen={isDebugDialogOpen}
        onToggle={() => setIsDebugDialogOpen((prev) => !prev)}
      />
      {/* <button style={styles.prevButton} onClick={handlePrevModel}>
        ← Prev
      </button>
      <button style={styles.nextButton} onClick={handleNextModel}>
        Next →
      </button> */}
      <button
        className="absolute top-2.5 right-2.5 bg-white p-2.5 rounded shadow"
        onClick={() => {}}
      >
        <img width={50} height={50} src="/fullscreen.svg" alt="Fullscreen" />
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
    position: "relative",
  },
  canvas: {
    width: "100%",
    height: "100%",
  },
  dialog: {
    position: "absolute",
    top: "10%",
    left: "50%",
    transform: "translate(-50%, 0)",
    padding: "20px",
    backgroundColor: "green",
    color: "#fff",
    border: "2px solid #333",
    borderRadius: "8px",
    zIndex: 1000,
  },
  fullscreenButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
    backgroundColor: "#ffffff",
    padding: "10px 20px",
    fontSize: "16px",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  prevButton: {
    position: "absolute",
    left: "20px",
    top: "50%",
    transform: "translateY(-50%)",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#fff",
    padding: "10px 20px",
    fontSize: "18px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    zIndex: 1000,
    transition: "background-color 0.3s",
  },
  nextButton: {
    position: "absolute",
    right: "20px",
    top: "50%",
    transform: "translateY(-50%)",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#fff",
    padding: "10px 20px",
    fontSize: "18px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    zIndex: 1000,
    transition: "background-color 0.3s",
  },
  instructions: {
    position: "absolute",
    top: "10px",
    left: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "#fff",
    padding: "15px",
    borderRadius: "8px",
    zIndex: 1000,
    maxWidth: "300px",
    fontSize: "14px",
  },
  gestureList: {
    marginTop: "10px",
  },
  gestureItem: {
    display: "flex",
    alignItems: "center",
    marginBottom: "8px",
  },
  gestureIcon: {
    fontSize: "20px",
    marginRight: "10px",
    width: "30px",
  },
  status: {
    marginTop: "15px",
    padding: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: "5px",
  },
};

export default ControllerHideVideo;
