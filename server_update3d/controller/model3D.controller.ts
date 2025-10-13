import { Request, Response } from "express";
import Model3D from "../models/Model3D";

/**
 * Create a new 3D model
 * @param req
 * @param res
 */
export async function createModel(req: Request, res: Response) {
  try {
    const { name, description, fileUrl, thumbnailUrl, tags } = req.body;
    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const toAbsolute = (u?: string) => {
      if (!u) return u;
      if (/^https?:\/\//i.test(u)) return u;
      return `${baseUrl}/files/${String(u).replace(/^\//, "")}`;
    };

    const model = await Model3D.create({
      name,
      description,
      fileUrl: toAbsolute(fileUrl),
      thumbnailUrl: toAbsolute(thumbnailUrl),
      tags,
    });
    return res.status(201).json(model);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create model", error });
  }
}

/**
 * List all 3D models
 * @param _req
 * @param res
 */
export async function listModels(_req: Request, res: Response) {
  try {
    const models = await Model3D.find().sort({ createdAt: -1 });
    return res.json(models);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch models", error });
  }
}

/**
 * Get a 3D model by id
 * @param req
 * @param res
 */
export async function getModelById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const model = await Model3D.findById(id);
    if (!model) {
      return res.status(404).json({ message: "Model not found" });
    }
    return res.json(model);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch model", error });
  }
}
