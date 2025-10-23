/* eslint-disable @typescript-eslint/no-explicit-any */
import { HAND_STATES, LANDMARKS, HandState } from "./type";

interface HandStateConfig {
  rotationSensitivity?: number;
  maxHistorySize?: number;
  maxCentroidHistorySize?: number;
  detectionTolerance?: number;
  minOpenConfidence?: number;
  minPointingConfidence?: number;
  minClosedConfidence?: number;
  minPointingCount?: number;
  pointingThreshold?: number;
  startingDelay?: number;
  waitingTimeout?: number;
  fingerSpread?: number;
  indexToMiddle?: number;
  minExtendedFingers?: number;
  middleAngle?: number;
}

interface Point {
  x: number;
  y: number;
}

interface Landmark extends Point {
  z?: number;
}

export class HandStateManager {
  private centroidHistory: { x: number; y: number; time: number }[];
  private landmark0History: { x: number; y: number; time: number }[];
  private prevLandmark0: { x: number; y: number } | null;
  private rotationSensitivity: number;
  private lastActionTime: number;
  private maxHistorySize: number;
  private maxCentroidHistorySize: number;
  private openHandHistory: boolean[];
  private pointingHistory: boolean[];
  private closedHistory: boolean[];
  private detectionTolerance: number;
  private minOpenConfidence: number;
  private minPointingConfidence: number;
  private minClosedConfidence: number;
  private pointingCount: number;
  private minPointingCount: number;
  private pointingThreshold: number;
  private detectionPausedUntil: number;
  private noDetectionStartTime: number;
  private startingDelay: number;
  private waitingTimeout: number;
  private lastDetectionTime: number;
  private openHandThresholds: {
    fingerSpread: number;
    indexToMiddle: number;
    minExtendedFingers: number;
    middleAngle: number;
  };
  private lastState: HandState | null;

  constructor(config: HandStateConfig = {}) {
    this.centroidHistory = [];
    this.landmark0History = [];
    this.prevLandmark0 = null;
    this.rotationSensitivity = config.rotationSensitivity || 2;
    this.lastActionTime = 0;
    this.maxHistorySize = config.maxHistorySize || 15;
    this.maxCentroidHistorySize = config.maxCentroidHistorySize || 30;
    this.openHandHistory = [];
    this.pointingHistory = []; // Thay holdingHistory
    this.closedHistory = [];
    this.detectionTolerance = config.detectionTolerance || 2000;
    this.minOpenConfidence = config.minOpenConfidence || 5;
    this.minPointingConfidence = config.minPointingConfidence || 8; // Thay minHoldingConfidence
    this.minClosedConfidence = config.minClosedConfidence || 5;
    this.pointingCount = 0; // Thay holdingCount
    this.minPointingCount = config.minPointingCount || 5; // Thay minHoldingCount
    this.pointingThreshold = config.pointingThreshold || 0.3; // Ngưỡng cho khoảng cách ngón trỏ
    this.detectionPausedUntil = 0;
    this.noDetectionStartTime = 0;
    this.startingDelay = config.startingDelay || 1000;
    this.waitingTimeout = config.waitingTimeout || 3000;
    this.lastDetectionTime = 0;
    this.openHandThresholds = {
      fingerSpread: config.fingerSpread || 0.2,
      indexToMiddle: config.indexToMiddle || 0.15,
      minExtendedFingers: config.minExtendedFingers || 4,
      middleAngle: config.middleAngle || 50,
    };
    this.lastState = null;
  }

  static getDistance(p1: Point, p2: Point): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  static getAngle(p1: Point, p2: Point, p3: Point): number {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const det = v1.x * v2.y - v1.y * v2.x;
    const angle = (Math.atan2(det, dot) * 180) / Math.PI;
    return angle < 0 ? angle + 360 : angle;
  }

  calculateCentroid(landmarks: Landmark[], now: number): Point {
    if (!landmarks || landmarks.length < 1) return { x: 0, y: 0 };

    const landmark0 = landmarks[LANDMARKS.WRIST] || landmarks[0];
    this.landmark0History.push({ x: landmark0.x, y: landmark0.y, time: now });

    if (this.landmark0History.length > this.maxHistorySize) {
      this.landmark0History.shift();
    }

    let sumX = 0,
      sumY = 0,
      weightSum = 0;
    const alpha = 0.3;
    for (let i = 0; i < this.landmark0History.length; i++) {
      const weight = Math.pow(1 - alpha, this.landmark0History.length - 1 - i);
      sumX += this.landmark0History[i].x * weight;
      sumY += this.landmark0History[i].y * weight;
      weightSum += weight;
    }
    return { x: sumX / weightSum, y: sumY / weightSum };
  }

  isHandOpen(landmarks: Landmark[]): boolean {
    if (!landmarks || landmarks.length < LANDMARKS.PINKY_TIP + 1) {
      console.log("Insufficient landmarks for open hand detection");
      return false;
    }

    const distances = {
      palmToThumb: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.THUMB_TIP]
      ),
      palmToMiddle: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.MIDDLE_TIP]
      ),
      thumbToIndex: HandStateManager.getDistance(
        landmarks[LANDMARKS.THUMB_TIP],
        landmarks[LANDMARKS.INDEX_TIP]
      ),
      indexToMiddle: HandStateManager.getDistance(
        landmarks[LANDMARKS.INDEX_TIP],
        landmarks[LANDMARKS.MIDDLE_TIP]
      ),
      palmToIndex: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.INDEX_TIP]
      ),
      palmToRing: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.RING_TIP]
      ),
      palmToPinky: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.PINKY_TIP]
      ),
    };

    const handSize =
      (distances.palmToThumb + distances.palmToMiddle) / 2 || 0.15;
    const normalizedDistances = {
      thumb: distances.palmToThumb / handSize,
      index: distances.palmToIndex / handSize,
      middle: distances.palmToMiddle / handSize,
      ring: distances.palmToRing / handSize,
      pinky: distances.palmToPinky / handSize,
      thumbToIndex: distances.thumbToIndex / handSize,
      indexToMiddle: distances.indexToMiddle / handSize,
    };

    const extendedFingers = [
      normalizedDistances.index > normalizedDistances.thumb,
      normalizedDistances.middle > normalizedDistances.thumb,
      normalizedDistances.ring > normalizedDistances.thumb,
      normalizedDistances.pinky > normalizedDistances.thumb,
    ].filter(Boolean).length;

    const isFingersSpread =
      normalizedDistances.thumbToIndex > this.openHandThresholds.fingerSpread &&
      normalizedDistances.indexToMiddle > this.openHandThresholds.indexToMiddle;

    // const middleMcpIdx = LANDMARKS.MIDDLE_MCP || LANDMARKS.WRIST;
    // const middleAngle = HandStateManager.getAngle(
    //   landmarks[LANDMARKS.WRIST],
    //   landmarks[middleMcpIdx],
    //   landmarks[LANDMARKS.MIDDLE_TIP]
    // );

    const isOpenCandidate =
      extendedFingers >= this.openHandThresholds.minExtendedFingers &&
      isFingersSpread;

    this.openHandHistory.push(isOpenCandidate);
    if (this.openHandHistory.length > this.minOpenConfidence) {
      this.openHandHistory.shift();
    }

    const openCount = this.openHandHistory.filter(Boolean).length;
    return openCount >= Math.ceil(this.minOpenConfidence * 0.5);
  }

  isClosed(landmarks: Landmark[]): boolean {
    if (!landmarks || landmarks.length < LANDMARKS.PINKY_TIP + 1) {
      console.log("Insufficient landmarks for closed hand detection");
      return false;
    }

    const distances = {
      indexToMiddle: HandStateManager.getDistance(
        landmarks[LANDMARKS.INDEX_TIP],
        landmarks[LANDMARKS.MIDDLE_TIP]
      ),
      middleToRing: HandStateManager.getDistance(
        landmarks[LANDMARKS.MIDDLE_TIP],
        landmarks[LANDMARKS.RING_TIP]
      ),
      ringToPinky: HandStateManager.getDistance(
        landmarks[LANDMARKS.RING_TIP],
        landmarks[LANDMARKS.PINKY_TIP]
      ),
      palmToMiddle: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.MIDDLE_TIP]
      ),
      thumbToIndex: HandStateManager.getDistance(
        landmarks[LANDMARKS.THUMB_TIP],
        landmarks[LANDMARKS.INDEX_TIP]
      ),
    };

    const handSize = distances.palmToMiddle || 0.15;
    const normalizedDistances = {
      indexToMiddle: distances.indexToMiddle / handSize,
      middleToRing: distances.middleToRing / handSize,
      ringToPinky: distances.ringToPinky / handSize,
      thumbToIndex: distances.thumbToIndex / handSize,
    };

    const isClosedCandidate =
      normalizedDistances.indexToMiddle < 0.3 &&
      normalizedDistances.middleToRing < 0.3 &&
      normalizedDistances.ringToPinky < 0.3 &&
      normalizedDistances.thumbToIndex > this.pointingThreshold;

    this.closedHistory.push(isClosedCandidate);
    if (this.closedHistory.length > this.minClosedConfidence) {
      this.closedHistory.shift();
    }

    const closedCount = this.closedHistory.filter(Boolean).length;
    return closedCount >= Math.ceil(this.minClosedConfidence * 0.5);
  }

  clearAllHistory() {
    this.centroidHistory = [];
    this.landmark0History = [];
    this.prevLandmark0 = null;
    this.openHandHistory = [];
    this.pointingHistory = [];
    this.closedHistory = [];
    this.pointingCount = 0;
    this.lastActionTime = 0;
    this.lastState = null;
    this.detectionPausedUntil = 0;
    this.noDetectionStartTime = 0;
    this.lastDetectionTime = 0;
  }

  getRatio(distance: number, referenceDistance: number): number {
    return distance / (referenceDistance || 0.1);
  }

  isPointing(landmarks: Landmark[]): boolean {
    if (!landmarks || landmarks.length < LANDMARKS.PINKY_TIP + 1) {
      console.log("Insufficient landmarks for pointing detection");
      return false;
    }

    const distances = {
      palmToIndex: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.INDEX_TIP]
      ),
      palmToMiddle: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.MIDDLE_TIP]
      ),
      palmToRing: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.RING_TIP]
      ),
      palmToPinky: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.PINKY_TIP]
      ),
      palmToThumb: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.THUMB_TIP]
      ),
    };

    const handSize = distances.palmToIndex || 0.15;
    const normalizedDistances = {
      index: distances.palmToIndex / handSize,
      middle: distances.palmToMiddle / handSize,
      ring: distances.palmToRing / handSize,
      pinky: distances.palmToPinky / handSize,
      thumb: distances.palmToThumb / handSize,
    };
    console.log(normalizedDistances);

    const isIndexExtended =
      normalizedDistances.index > normalizedDistances.middle &&
      normalizedDistances.index > normalizedDistances.ring &&
      normalizedDistances.index > normalizedDistances.pinky &&
      normalizedDistances.index > normalizedDistances.thumb;

    const isPointingCandidate = isIndexExtended;

    this.pointingHistory.push(isPointingCandidate);
    if (this.pointingHistory.length > this.minPointingConfidence) {
      this.pointingHistory.shift();
    }
    const pointingCount = this.pointingHistory.filter(Boolean).length;
    console.log(pointingCount);
    console.log(Math.ceil(this.minPointingConfidence * 0.9));
    console.log(
      `pointingCount >= Math.ceil(this.minPointingConfidence * 0.9): ${
        pointingCount >= Math.ceil(this.minPointingConfidence * 0.9)
      }`
    );

    return pointingCount >= Math.ceil(this.minPointingConfidence * 0.9);
  }

  getRotation(landmarks: Landmark[], centroid: Point): number[] {
    if (!landmarks || landmarks.length < LANDMARKS.MIDDLE_TIP + 1)
      return [0, 0, 0];

    const handSize =
      HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.THUMB_TIP]
      ) || 0.15;
    const scaleFactor = 0.15 / handSize;

    let deltaX = 0,
      deltaY = 0;
    if (this.prevLandmark0) {
      deltaX = (centroid.x - this.prevLandmark0.x) * scaleFactor;
      deltaY = (centroid.y - this.prevLandmark0.y) * scaleFactor;
    }
    this.prevLandmark0 = { x: centroid.x, y: centroid.y };

    return [
      deltaY * this.rotationSensitivity,
      -deltaX * this.rotationSensitivity,
      0,
    ];
  }

  checkSwipe(
    landmarks: Landmark[],
    distances: Record<string, number>,
    direction: string
  ): boolean {
    if (
      !this.isPointing(landmarks) ||
      !landmarks ||
      this.landmark0History.length < 6 ||
      this.pointingCount < this.minPointingCount
    ) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastActionTime < 3000) return false;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const entry of this.landmark0History) {
      minX = Math.min(minX, entry.x);
      maxX = Math.max(maxX, entry.x);
      minY = Math.min(minY, entry.y);
      maxY = Math.max(maxY, entry.y);
    }
    const xRange = maxX - minX;
    const yRange = maxY - minY;
    const firstX = this.landmark0History[0].x;
    const lastX = this.landmark0History[this.landmark0History.length - 1].x;
    const firstY = this.landmark0History[0].y;
    const lastY = this.landmark0History[this.landmark0History.length - 1].y;

    let condition = false;
    switch (direction) {
      case "SWIPE_NEXT":
        condition = xRange > 0.03 && firstX - lastX > 0.03;
        break;
      case "SWIPE_PREVIOUS":
        condition = xRange > 0.03 && lastX - firstX > 0.03;
        break;
      case "SWIPE_UP":
        condition = yRange > 0.03 && firstY - lastY > 0.03;
        break;
      case "SWIPE_DOWN":
        condition = yRange > 0.03 && lastY - firstY > 0.03;
        break;
      default:
        return false;
    }

    if (condition) {
      this.landmark0History = [];
      this.lastActionTime = now;
      this.pointingCount = 0;
      return true;
    }
    return false;
  }

  processLandmarks(landmarks: Landmark[]): {
    state: HandState;
    rotation: number[];
  } {
    const now = Date.now();

    if (this.detectionPausedUntil > now) {
      console.log(
        `In STARTING state until ${new Date(
          this.detectionPausedUntil
        ).toLocaleTimeString()}`
      );
      return {
        state: HAND_STATES.STARTING,
        rotation: [0, 0, 0],
      };
    }

    if (!landmarks || landmarks.length < LANDMARKS.MIDDLE_TIP + 1) {
      this.pointingCount = 0;

      if (this.noDetectionStartTime === 0) {
        this.noDetectionStartTime = now;
        console.log(
          `No detection started at ${new Date(now).toLocaleTimeString()}`
        );
      }

      if (now - this.noDetectionStartTime < this.detectionTolerance) {
        console.log(
          `No landmarks, waiting ${
            (this.detectionTolerance - (now - this.noDetectionStartTime)) / 1000
          }s before NOT_DETECTED`
        );
        return {
          state: this.lastState || HAND_STATES.NOT_DETECTED,
          rotation: [0, 0, 0],
        };
      }

      if (now - this.noDetectionStartTime >= this.waitingTimeout) {
        this.lastState = HAND_STATES.WAITING;
        console.log(
          `Transitioned to WAITING after ${
            this.waitingTimeout / 1000
          }s of no detection`
        );
        return {
          state: HAND_STATES.WAITING,
          rotation: [0, 0, 0],
        };
      }

      this.lastState = HAND_STATES.NOT_DETECTED;
      console.log(
        `Transitioned to NOT_DETECTED after ${this.detectionTolerance / 1000}s`
      );
      return {
        state: HAND_STATES.NOT_DETECTED,
        rotation: [0, 0, 0],
      };
    }

    this.lastDetectionTime = now;

    if (
      this.lastState !== HAND_STATES.WAITING &&
      this.lastState !== HAND_STATES.NOT_DETECTED &&
      this.lastState !== HAND_STATES.STARTING &&
      now - this.lastDetectionTime <= this.detectionTolerance
    ) {
      console.log(
        `Short reconnection (${
          (now - this.lastDetectionTime) / 1000
        }s), continuing with last state: ${this.lastState}`
      );
    } else if (
      this.lastState === HAND_STATES.WAITING ||
      this.lastState === HAND_STATES.NOT_DETECTED
    ) {
      this.detectionPausedUntil = now + this.startingDelay;
      this.noDetectionStartTime = 0;
      this.lastState = HAND_STATES.STARTING;
      console.log(
        `Detected hand, entering STARTING for ${
          this.startingDelay / 1000
        }s until ${new Date(this.detectionPausedUntil).toLocaleTimeString()}`
      );
      return {
        state: HAND_STATES.STARTING,
        rotation: [0, 0, 0],
      };
    }

    this.noDetectionStartTime = 0;
    this.detectionPausedUntil = 0;

    const distances = {
      palmToThumb: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.THUMB_TIP]
      ),
      palmToMiddle: HandStateManager.getDistance(
        landmarks[LANDMARKS.WRIST],
        landmarks[LANDMARKS.MIDDLE_TIP]
      ),
      thumbToIndex: HandStateManager.getDistance(
        landmarks[LANDMARKS.THUMB_TIP],
        landmarks[LANDMARKS.INDEX_TIP]
      ),
    };

    const centroid = this.calculateCentroid(landmarks, now);
    this.centroidHistory.push({ x: centroid.x, y: centroid.y, time: now });
    if (this.centroidHistory.length > this.maxCentroidHistorySize) {
      this.centroidHistory.shift();
    }

    const rotation = this.getRotation(landmarks, centroid);

    if (this.isPointing(landmarks)) {
      this.pointingCount += 1;
    } else {
      this.pointingCount = 0;
    }
    console.log(`Pointing count: ${this.pointingCount}`);

    const prevState = this.lastState || HAND_STATES.CLOSED;
    let newState = HAND_STATES.CLOSED;

    if (this.checkSwipe(landmarks, distances, "SWIPE_NEXT")) {
      newState = HAND_STATES.SWIPE_NEXT;
    } else if (this.checkSwipe(landmarks, distances, "SWIPE_PREVIOUS")) {
      newState = HAND_STATES.SWIPE_PREVIOUS;
    } else if (this.checkSwipe(landmarks, distances, "SWIPE_UP")) {
      newState = HAND_STATES.SWIPE_UP;
    } else if (this.checkSwipe(landmarks, distances, "SWIPE_DOWN")) {
      newState = HAND_STATES.SWIPE_DOWN;
    } else if (this.isPointing(landmarks)) {
      newState = HAND_STATES.POINTING;
    } else if (this.isHandOpen(landmarks)) {
      newState = HAND_STATES.OPEN;
      console.log("Open hand detected");
    } else if (this.isClosed(landmarks)) {
      newState = HAND_STATES.CLOSED;
    }

    if (
      newState !== prevState &&
      (newState === HAND_STATES.OPEN ||
        newState === HAND_STATES.POINTING ||
        newState === HAND_STATES.CLOSED)
    ) {
      const requiredConfidence =
        newState === HAND_STATES.OPEN
          ? this.minOpenConfidence
          : newState === HAND_STATES.POINTING
          ? this.minPointingConfidence
          : this.minClosedConfidence;
      const history =
        newState === HAND_STATES.OPEN
          ? this.openHandHistory
          : newState === HAND_STATES.POINTING
          ? this.pointingHistory
          : this.closedHistory;
      const confidentCount = history.filter((v) => v).length;
      if (confidentCount < requiredConfidence * 0.5) {
        newState = prevState;
      }
    }
    console.log(`New state: ${newState}`);

    this.lastState = newState;
    switch (newState) {
      case HAND_STATES.POINTING:
      case HAND_STATES.SWIPE_NEXT:
      case HAND_STATES.SWIPE_PREVIOUS:
      case HAND_STATES.SWIPE_UP:
      case HAND_STATES.SWIPE_DOWN:
        rotation[0] = 0;
        rotation[1] = 0;
        rotation[2] = 0;
        break;
      default:
        break;
    }
    return {
      state: newState,
      rotation,
    };
  }
}
