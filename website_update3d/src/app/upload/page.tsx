"use client";

import type React from "react";

import { useState, useCallback } from "react";
import { Upload, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { saveModel3D, uploadModelFile } from "@/services/save_model_3D/model3D";

const ACCEPTED_FORMATS = [".glb", ".gltf", ".fbx", ".obj"];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && isValidFile(droppedFile)) {
        setFile(droppedFile);
        if (!name) setName(droppedFile.name.replace(/\.[^/.]+$/, ""));
      } else {
        toast({
          title: "Invalid file",
          description: "Please upload a .glb, .gltf, .fbx, or .obj file",
          variant: "destructive",
        });
      }
    },
    [name, toast]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      if (!name) setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a .glb, .gltf, .fbx, or .obj file",
        variant: "destructive",
      });
    }
  };

  const isValidFile = (file: File) => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    return ACCEPTED_FORMATS.includes(extension);
  };

  const handleUpload = async () => {
    if (!file || !name) {
      toast({
        title: "Missing information",
        description: "Please provide a file and name",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    const uploaded = await uploadModelFile(file);
    const model3D = {
      name,
      description,
      fileUrl: uploaded.fileUrl,
      thumbnailUrl: uploaded.thumbnailUrl,
      tags: [],
    };

    const created = await saveModel3D(model3D);

    toast({
      title: "Upload successful",
      description: "Your 3D model has been uploaded",
    });

    setIsUploading(false);
    const newId = created?._id || created?.id;
    router.push(newId ? `/model_3D/${newId}` : "/");
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-balance font-sans text-3xl font-bold text-foreground">
            Upload Model
          </h1>
          <p className="mt-2 text-muted-foreground">
            Upload your 3D models in GLB, GLTF, FBX, or OBJ format
          </p>
        </div>

        {/* Upload Area */}
        <Card>
          <CardContent className="p-8">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
              )}
            >
              <input
                type="file"
                accept={ACCEPTED_FORMATS.join(",")}
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
              />

              {file ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{file.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="gap-2"
                  >
                    <X className="size-4" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Upload className="size-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">
                      Drop your file here
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {ACCEPTED_FORMATS.map((format) => (
                      <span
                        key={format}
                        className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Model Details */}
        <Card>
          <CardContent className="space-y-6 p-8">
            <div className="space-y-2">
              <Label htmlFor="name">Model Name *</Label>
              <Input
                id="name"
                placeholder="Enter model name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add a description for your model"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none bg-background/50"
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || !name || isUploading}
              className="w-full gap-2"
              size="lg"
            >
              {isUploading ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Upload Model
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
