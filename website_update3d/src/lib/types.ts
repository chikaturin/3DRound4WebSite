export interface Model3D {
  id: string
  name: string
  description: string
  format: "glb" | "gltf" | "fbx" | "obj"
  size: number
  uploadDate: Date
  status: "processing" | "ready" | "error"
}
