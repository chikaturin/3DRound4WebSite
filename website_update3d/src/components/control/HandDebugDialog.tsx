/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";

interface HandDebugDialogProps {
  landmarks: Array<{ x: number; y: number }> | null;
  state: string;
  rotation: number[];
  isOpen: boolean;
  onToggle: () => void;
}

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [5, 9],
  [9, 13],
  [13, 17],
];

const STATE_DISPLAY: Record<string, string> = {
  not_detected: "Not Detected",
  open: "Open",
  closed: "Closed",
  holding: "Holding",
  swipe_next: "Swipe Next",
  swipe_previous: "Swipe Previous",
  pointing: "Pointing",
  swipe_up: "Swipe Up",
  swipe_down: "Swipe Down",
};

const HandDebugDialog = ({
  landmarks,
  state,
  rotation,
  isOpen,
  onToggle,
}: HandDebugDialogProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (landmarks && landmarks.length >= 21) {
        landmarks.forEach(({ x, y }) => {
          ctx.beginPath();
          ctx.arc(x * width, y * height, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "red";
          ctx.fill();
          ctx.closePath();
        });

        HAND_CONNECTIONS.forEach(([start, end]) => {
          const startPoint = landmarks[start];
          const endPoint = landmarks[end];
          ctx.beginPath();
          ctx.moveTo(startPoint.x * width, startPoint.y * height);
          ctx.lineTo(endPoint.x * width, endPoint.y * height);
          ctx.strokeStyle = "blue";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.closePath();
        });
      }
    };

    draw();

    return () => {
      ctx.clearRect(0, 0, width, height);
    };
  }, [landmarks, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-1/2 left-[20%] transform -translate-x-1/2 -translate-y-1/2 bg-gray-500 border-2 border-gray-800 rounded-lg p-5 z-[2000] shadow-lg max-w-[20%] w-[90%]">
      <div className="flex justify-between items-center mb-2.5">
        <h3 className="text-lg font-semibold">Hand Debug View</h3>
        <button
          className="bg-none border-none text-xl cursor-pointer text-gray-800 hover:text-gray-600"
          onClick={onToggle}
        >
          ×
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="border border-gray-800 mb-2.5 w-full max-w-[320px]"
      />
      <div className="text-sm">
        <h4 className="font-medium mb-2">Hand State</h4>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="pr-2">State</td>
              <td>{STATE_DISPLAY[state] || state}</td>
            </tr>
            <tr>
              <td className="pr-2">Rotation</td>
              <td>[{rotation.map((v) => v.toFixed(2)).join(", ")}]</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HandDebugDialog;
