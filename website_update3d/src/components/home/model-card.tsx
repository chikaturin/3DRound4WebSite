"use client";

import { useState } from "react";
import { MoreVertical, Edit, Trash2, Download, FileType } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Model3D } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
// import { DeleteDialog } from "./delete-dialog"

interface ModelCardProps {
  model: Model3D;
}

export function ModelCard({ model }: ModelCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: Model3D["status"]) => {
    switch (status) {
      case "ready":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "processing":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "error":
        return "bg-red-500/10 text-red-500 border-red-500/20";
    }
  };

  return (
    <Link href={`/model_3D/${model.id}`} className="cursor-pointer">
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30">
        <CardContent className="p-6">
          {/* Icon and Actions */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary/20">
              <FileType className="size-6" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    href={`/model_3D/${model.id}`}
                    className="cursor-pointer"
                  >
                    <Edit className="mr-2 size-4" />
                    Open
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 size-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Model Info */}
          <div className="space-y-3">
            <div className="pl-1">
              <Link
                href={`/model_3D/${model.id}`}
                className="text-balance font-sans text-lg font-semibold text-card-foreground line-clamp-1 hover:underline"
              >
                {model.name}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {model.description || "No description provided"}
              </p>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="font-mono uppercase">
                {model.format}
              </Badge>
              <span>•</span>
              <span>{formatFileSize(model.size)}</span>
              <span>•</span>
              <span>{formatDate(model.uploadDate)}</span>
            </div>

            {/* Status */}
            <Badge className={cn("font-medium", getStatusColor(model.status))}>
              {model.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        modelId={model.id}
        modelName={model.name}
      /> */}
    </Link>
  );
}
