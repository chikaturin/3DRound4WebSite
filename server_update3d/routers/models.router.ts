import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  createModel,
  listModels,
  getModelById,
} from "../controller/model3D.controller";

const router = Router();

// Multer storage to uploads directory
const uploadsDir =
  process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
// ensure uploads directory exists
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (_err) {
  // ignore; multer will error if not writable
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

/**
 * @openapi
 * components:
 *   schemas:
 *     Model3D:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         fileUrl:
 *           type: string
 *         thumbnailUrl:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/models:
 *   get:
 *     summary: List 3D models
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Model3D'
 */
router.get("/", listModels);

/**
 * @openapi
 * /api/models/{id}:
 *   get:
 *     summary: Get a model by id
 *     tags: [Models]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Model3D'
 *       404:
 *         description: Not found
 */
router.get("/:id", getModelById);

/**
 * @openapi
 * /api/models:
 *   post:
 *     summary: Create a model
 *     tags: [Models]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *               thumbnailUrl:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Model3D'
 *       400:
 *         description: Bad request
 */
router.post("/", createModel);

/**
 * Upload a model file
 * Returns { fileUrl, thumbnailUrl }
 */
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file" });
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const publicUrl = `${baseUrl}/files/${req.file.filename}`;
  return res.json({ fileUrl: publicUrl, thumbnailUrl: publicUrl });
});

export default router;
