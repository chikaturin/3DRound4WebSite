import mongoose, { Document, Schema } from "mongoose";

export interface Model3D extends Document {
  name: string;
  description?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const Model3DSchema = new Schema<Model3D>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Model3D ||
  mongoose.model<Model3D>("Model3D", Model3DSchema);
