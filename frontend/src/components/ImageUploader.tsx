import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { useImageStore } from '../store/imageStore';
import { FaUpload, FaFileImage } from 'react-icons/fa';
import { Card, CardContent } from "@/components/ui/card";

interface ImageUploaderProps {
  fullScreen?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ fullScreen = false }) => {
  const { setOriginalImage, segmentImage, loading } = useImageStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        
        // Check if the file is an image
        if (!file.type.startsWith('image/')) {
          toast.error('Please upload an image file');
          return;
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error('Image size should be less than 10MB');
          return;
        }
        
        setOriginalImage(file);
        
        // Automatically segment the image after upload
        try {
          await segmentImage();
        } catch (error) {
          console.error('Error segmenting image:', error);
          toast.error('Failed to segment image. Please try again.');
        }
      }
    },
    [setOriginalImage, segmentImage]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxFiles: 1,
    disabled: loading,
  });

  return (
    <Card className={`${fullScreen ? 'h-full' : ''}`}>
      <CardContent className={`p-0 ${fullScreen ? 'h-full' : ''}`}>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${
            fullScreen ? 'flex items-center justify-center h-full' : 'p-8'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-4">
            {isDragActive ? (
              <div className="rounded-full bg-primary/10 p-4">
                <FaUpload className="text-primary w-12 h-12" />
              </div>
            ) : (
              <div className="rounded-full bg-muted p-4">
                <FaFileImage className="text-muted-foreground w-12 h-12" />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">
                {isDragActive
                  ? 'Drop the image here'
                  : 'Drag & drop an image, or click to select'}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports JPG, PNG, GIF, WebP (Max 10MB)
              </p>
            </div>
            {loading && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                <p className="mt-2 text-sm text-muted-foreground">Processing image...</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageUploader; 