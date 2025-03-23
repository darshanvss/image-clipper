'use client';

import { ChangeEvent, DragEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "./Spinner";
import { toast } from "sonner";

interface FileUploaderProps {
  onImageUpload: (file: File, imageUrl: string) => void;
  isLoading?: boolean;
}

export function FileUploader({ onImageUpload, isLoading = false }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (file: File) => {
    // Only accept image files
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG or JPG)');
      return;
    }

    // Create URL for preview
    const imageUrl = URL.createObjectURL(file);
    onImageUpload(file, imageUrl);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <Card className="w-full sm:max-w-md mx-auto">
      <CardContent className="p-6">
        <div
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-colors ${
            isDragging ? 'bg-primary/10 border-primary' : 'border-gray-300 dark:border-gray-700'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Spinner size="lg" className="text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Processing image...</p>
            </div>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mb-2 text-sm font-medium">Drag & drop your image here</p>
              <p className="mb-4 text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
              <input
                id="upload"
                type="file"
                className="hidden"
                accept="image/png, image/jpeg"
                onChange={handleFileChange}
              />
              <Button asChild size="sm">
                <label htmlFor="upload" className="cursor-pointer">
                  Select File
                </label>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 