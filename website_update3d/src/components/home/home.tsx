/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { Grid3x3, List, Plus } from "lucide-react";
import Link from "next/link";
import { Card } from "../ui/card";
import { ModelCard } from "./model-card";
import { Model3D } from "@/lib/types";
import { listModels3D } from "@/services/save_model_3D/model3D";

export default function Home() {
  const [viewMode, setViewMode] = useState("grid");
  const [models, setModels] = useState<Model3D[]>([]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const apiModels = await listModels3D();
        // Map API models to UI Model3D shape
        const mapped: Model3D[] = (apiModels || []).map((m: any) => {
          const id = m._id ?? m.id ?? "";
          const name = m.name ?? "Untitled";
          const description = m.description ?? "";
          const fileUrl: string = m.fileUrl ?? "";
          const ext = (fileUrl.split(".").pop() || "").toLowerCase();
          const allowed = ["glb", "gltf", "fbx", "obj"] as const;
          const format = (
            allowed.includes(ext as any) ? ext : "glb"
          ) as Model3D["format"];
          const uploadDate = m.createdAt ? new Date(m.createdAt) : new Date();
          const size = Number(m.size) || 0; // backend doesn't provide size yet
          const status: Model3D["status"] = "ready"; // assume ready for now
          return { id, name, description, format, size, uploadDate, status };
        });
        setModels(mapped);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load models", err);
        setModels([]);
      }
    };
    fetchModels();
  }, []);
  return (
    <div className="p-4 space-y-8">
      <div className="flex justify-between">
        <div className="block">
          <p className="text-2xl font-bold">Dashboard</p>
          <span className="text-sm">Manage your 3D models collection</span>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-8",
                viewMode === "grid" && "bg-primary/10 text-primary"
              )}
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-8",
                viewMode === "list" && "bg-primary/10 text-primary"
              )}
              onClick={() => setViewMode("list")}
            >
              <List className="size-4" />
            </Button>
          </div>
          <Button asChild className="gap-2">
            <Link href="/upload">
              <Plus className="size-4" />
              Upload Model
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <Card className="p-4">
          <p className="text-gray-500">Total Models</p>
          <p className="text-4xl">{models.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-gray-500">Proccessing</p>
          <p className="text-4xl text-yellow-500">0</p>
        </Card>
        <Card className="p-4">
          <p className="text-gray-500">Ready</p>
          <p className="text-4xl text-green-500">{models.length}</p>
        </Card>
      </div>
      {models.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Grid3x3 className="size-8" />
          </div>
          <h3 className="mt-6 font-sans text-xl font-semibold text-foreground">
            No models yet
          </h3>
          <p className="mt-2 max-w-sm text-balance text-muted-foreground">
            Get started by uploading your first 3D model
          </p>
          <Button asChild className="mt-6 gap-2">
            <Link href="/upload">
              <Plus className="size-4" />
              Upload Model
            </Link>
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-6",
            viewMode === "grid"
              ? "md:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1"
          )}
        >
          {models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      )}
    </div>
  );
}
