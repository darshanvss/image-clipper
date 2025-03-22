"use client";

import React, { useState, useEffect } from "react";
import { useImageStore } from "../store/imageStore";
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { FaUpload, FaFileImage, FaCopy, FaDownload, FaTrash, FaCheck } from 'react-icons/fa';

// Import Shadcn components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function Home() {
  // Important to avoid hydration issues with SSR
  const [isClient, setIsClient] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const {
    originalImage,
    originalImageUrl,
    masks,
    selectedMasks,
    loading,
    showBackground,
    compositeImageUrl,
    setOriginalImage,
    clearImage,
    segmentImage,
    toggleMaskSelection,
    toggleBackground,
    generateCompositeImage,
  } = useImageStore();
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Generate composite image when selection changes
  useEffect(() => {
    if (selectedMasks.length > 0) {
      generateCompositeImage();
    }
  }, [selectedMasks, showBackground, generateCompositeImage]);

  const onDrop = React.useCallback(
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

  const handleCopyToClipboard = async () => {
    if (!compositeImageUrl) return;
    
    try {
      // Convert base64 to blob
      const response = await fetch(compositeImageUrl);
      const blob = await response.blob();
      
      // Copy to clipboard API
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      
      setCopiedToClipboard(true);
      toast.success('Copied to clipboard!');
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };
  
  const handleDownload = () => {
    if (!compositeImageUrl) return;
    
    const link = document.createElement('a');
    link.href = compositeImageUrl;
    link.download = 'image-clipper-export.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Image downloaded!');
  };

  const handleReset = () => {
    clearImage();
    toast.info('Image cleared!');
  };
  
  // Only render the component on the client to avoid hydration issues
  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Image Clipper
          </h1>
          {originalImage && (
            <Button
              onClick={handleReset}
              variant="ghost"
              className="text-destructive"
            >
              <FaTrash className="w-3.5 h-3.5 mr-2" />
              <span>Clear Image</span>
            </Button>
          )}
        </header>

        {/* Main content */}
        <Card className="overflow-hidden">
          {/* Upload Section */}
          {!originalImage ? (
            <CardContent className="p-6 md:p-10">
              <div
                {...getRootProps()}
                className={`rounded-lg border-2 border-dashed text-center cursor-pointer transition-colors p-10 md:p-16 ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center gap-6">
                  <div className={`rounded-full p-6 ${isDragActive ? 'bg-primary/10' : 'bg-muted'}`}>
                    {isDragActive ? (
                      <FaUpload className={`w-14 h-14 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    ) : (
                      <FaFileImage className="w-14 h-14 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xl font-medium text-foreground">
                      {isDragActive
                        ? 'Drop the image here'
                        : 'Drag & drop an image, or click to select'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports JPG, PNG, GIF, WebP (Max 10MB)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
              {/* Left side - Image Editor */}
              <div className="lg:col-span-3 p-6 border-b lg:border-b-0 lg:border-r border-border">
                <div className="space-y-6">
                  {/* Original Image */}
                  <div>
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-lg font-medium">Original Image</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="rounded-md overflow-hidden bg-muted">
                        <img 
                          src={originalImageUrl!} 
                          alt="Original" 
                          className="w-full h-auto object-contain max-h-[400px]"
                        />
                      </div>
                    </CardContent>
                  </div>

                  {/* Segments Grid */}
                  {masks.length > 0 && (
                    <div>
                      <CardHeader className="px-0 pt-2 pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg font-medium">Available Segments</CardTitle>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">Show Background</span>
                            <Switch 
                              checked={showBackground} 
                              onCheckedChange={toggleBackground}
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[250px] overflow-y-auto p-2">
                          {masks.map((mask) => (
                            <TooltipProvider key={mask.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    onClick={() => toggleMaskSelection(mask.id)}
                                    className={`relative aspect-square cursor-pointer rounded-md overflow-hidden transition-all ${
                                      selectedMasks.includes(mask.id) 
                                        ? 'ring-2 ring-primary ring-opacity-90 scale-[0.97]' 
                                        : 'border border-border hover:border-muted-foreground hover:shadow-md'
                                    }`}
                                  >
                                    <div className="w-full h-full bg-muted bg-opacity-40 flex items-center justify-center">
                                      <img 
                                        src={`data:image/png;base64,${mask.mask}`} 
                                        alt={`Segment ${mask.id}`} 
                                        className="max-w-full max-h-full object-contain"
                                      />
                                    </div>
                                    
                                    {selectedMasks.includes(mask.id) && (
                                      <Badge className="absolute top-1 right-1 h-5 w-5 p-0 flex items-center justify-center">
                                        <FaCheck size={10} />
                                      </Badge>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Click to {selectedMasks.includes(mask.id) ? 'deselect' : 'select'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </CardContent>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Result Preview */}
              <div className="lg:col-span-2 p-6">
                <CardHeader className="px-0 pt-0 pb-4">
                  <CardTitle className="text-lg font-medium">
                    Result Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="rounded-md overflow-hidden bg-muted flex items-center justify-center min-h-[300px]">
                    {compositeImageUrl ? (
                      <img 
                        src={compositeImageUrl} 
                        alt="Result" 
                        className="w-full h-auto object-contain max-h-[500px]"
                      />
                    ) : (
                      <div className="p-12 text-center text-muted-foreground">
                        <p>Select segments to see the result</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                
                {compositeImageUrl && (
                  <CardFooter className="px-0 pt-6 flex flex-wrap gap-3 justify-center lg:justify-start">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            onClick={handleCopyToClipboard}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            {copiedToClipboard ? <FaCheck className="w-4 h-4" /> : <FaCopy className="w-4 h-4" />}
                            {copiedToClipboard ? 'Copied!' : 'Copy to Clipboard'}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy image to clipboard</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleDownload}
                            variant="default"
                            className="flex items-center gap-2"
                          >
                            <FaDownload className="w-4 h-4" />
                            Download
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download as PNG</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardFooter>
                )}
              </div>
            </div>
          )}
        </Card>
        
        {loading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="w-[300px]">
              <CardHeader>
                <CardTitle className="text-center">Processing Image</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center pb-6">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
