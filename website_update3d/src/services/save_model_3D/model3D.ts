import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Model3D {
  name: string;
  description: string;
  fileUrl: string;
  thumbnailUrl: string;
  tags: string[];
}

export const saveModel3D = async (model3D: Model3D) => {
  const response = await axios.post(`${API_URL}/api/models`, model3D);
  return response.data;
};

export const uploadModelFile = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const response = await axios.post(`${API_URL}/api/models/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data as { fileUrl: string; thumbnailUrl: string };
};

export const getModel3D = async (id: string) => {
  const response = await axios.get(`${API_URL}/api/models/${id}`);
  return response.data;
};

export const listModels3D = async () => {
  const response = await axios.get(`${API_URL}/api/models`);
  return response.data;
};
