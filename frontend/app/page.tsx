'use client';

import { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import dynamic from 'next/dynamic';
import { MaskList } from './components/MaskList';
import { DownloadButton } from './components/DownloadButton';
import { Spinner } from './components/Spinner';
import type { Mask, SegmentationResult } from './lib/segmentation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { ApiService } from './lib/api';

// Dynamically import SegmentCanvas with no SSR to avoid canvas-related issues
const SegmentCanvas = dynamic(() => import('./components/SegmentCanvas'), { ssr: false });

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [masks, setMasks] = useState<Mask[]>([]);
  const [selectedMasks, setSelectedMasks] = useState<number[]>([]);
  const [segmentationResult, setSegmentationResult] = useState<SegmentationResult | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  // Handle window resize to calculate container size
  useEffect(() => {
    const updateContainerSize = () => {
      const width = Math.min(window.innerWidth - 40, 1200);
      const height = Math.min(window.innerHeight - 200, 800);
      setContainerSize({ width, height });
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);

    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  // Clean up any blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (exportUrl && exportUrl.startsWith('blob:')) {
        URL.revokeObjectURL(exportUrl);
      }
    };
  }, [exportUrl]);

  // Handle file upload
  const handleImageUpload = async (file: File, url: string) => {
    setImageFile(file);
    setImageUrl(url);
    setMasks([]);
    setSelectedMasks([]);
    setSegmentationResult(null);
    setExportUrl(null);
    
    try {
      setIsLoading(true);
      toast.info('Uploading image to server...');
      
      // Upload image to backend
      const result = await ApiService.uploadImage(file);
      setImageId(result.image_id);
      
      // Keep the local preview URL
      toast.success('Image uploaded successfully! Ready to segment.');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error('Error uploading image:', error);
      toast.error(`Failed to upload the image: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Perform segmentation on the uploaded image
  const handleSegment = async () => {
    if (!imageId) return;

    try {
      setIsSegmenting(true);
      toast.info('Running segmentation on server...');

      // Run segmentation on the backend
      const result = await ApiService.segmentImage(imageId);
      
      if (!result || !result.masks || result.masks.length === 0) {
        throw new Error('No segments found in the image');
      }
      
      setMasks(result.masks);
      setSegmentationResult(result);
      toast.success(`Found ${result.masks.length} segments in your image!`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error('Error segmenting image:', error);
      toast.error(`Failed to segment the image: ${errorMessage}`);
    } finally {
      setIsSegmenting(false);
    }
  };

  // Handle mask selection
  const handleMaskSelect = (maskId: number) => {
    setSelectedMasks((prev) => {
      if (prev.includes(maskId)) {
        return prev.filter((id) => id !== maskId);
      } else {
        return [...prev, maskId];
      }
    });
  };

  // Select all masks
  const handleSelectAll = () => {
    setSelectedMasks(masks.map((mask) => mask.id));
  };

  // Deselect all masks
  const handleDeselectAll = () => {
    setSelectedMasks([]);
  };

  // Handle image export
  const handleExport = async () => {
    if (!imageId || selectedMasks.length === 0) return;

    try {
      setIsLoading(true);
      toast.info('Exporting selected segments...');

      // If we have a previous export URL, revoke it
      if (exportUrl && exportUrl.startsWith('blob:')) {
        URL.revokeObjectURL(exportUrl);
      }

      // Export the selected masks from the backend
      const url = await ApiService.exportImage(imageId, selectedMasks);
      setExportUrl(url);
      
      toast.success('Selected segments exported successfully!');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error('Error exporting image:', error);
      toast.error(`Failed to export the image: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resetting the app
  const handleReset = async () => {
    // Clean up backend resources
    if (imageId) {
      try {
        await ApiService.deleteImage(imageId);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    // Reset state
    setImageUrl(null);
    setImageFile(null);
    setImageId(null);
    setMasks([]);
    setSelectedMasks([]);
    setSegmentationResult(null);
    
    // Clean up blob URL
    if (exportUrl && exportUrl.startsWith('blob:')) {
      URL.revokeObjectURL(exportUrl);
      setExportUrl(null);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-gray-50 dark:bg-gray-900">
      <Toaster />
      <header className="w-full max-w-6xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Image Clipper</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload an image, select segments, and download as transparent PNG
        </p>
      </header>

      <div className="w-full max-w-6xl mx-auto grid gap-6">
        {!imageUrl ? (
          <FileUploader onImageUpload={handleImageUpload} isLoading={isLoading} />
        ) : (
          <div className="grid md:grid-cols-[2fr_1fr] gap-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-medium">Image Preview</h2>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleReset}
                  >
                    Upload New
                  </Button>
                  {masks.length === 0 && (
                    <Button 
                      onClick={handleSegment} 
                      disabled={isLoading || isSegmenting}
                    >
                      {isSegmenting ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Segmenting...
                        </>
                      ) : (
                        'Segment Image'
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {masks.length > 0 ? (
                <SegmentCanvas
                  imageUrl={imageUrl}
                  masks={masks}
                  selectedMasks={selectedMasks}
                  onMaskSelect={handleMaskSelect}
                  width={containerSize.width * 0.65}
                  height={containerSize.height}
                />
              ) : (
                <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {isSegmenting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 z-10">
                      <div className="text-center">
                        <Spinner size="lg" className="mb-2" />
                        <p className="text-white">Segmenting image...</p>
                      </div>
                    </div>
                  )}
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Uploaded"
                      className="w-full h-auto"
                      style={{ maxHeight: containerSize.height }}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {masks.length > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-medium">Segments</h2>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleSelectAll}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  <MaskList
                    masks={masks}
                    selectedMasks={selectedMasks}
                    onMaskSelect={handleMaskSelect}
                    maxHeight={containerSize.height - 160}
                  />

                  <DownloadButton
                    onExport={handleExport}
                    disabled={selectedMasks.length === 0 || isLoading}
                    loading={isLoading}
                    exportUrl={exportUrl}
                  />
                </>
              )}
              
              {masks.length === 0 && !isLoading && !isSegmenting && (
                <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="text-lg font-medium mb-2">How it works</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>Upload an image</li>
                    <li>Click &quot;Segment Image&quot; to detect objects</li>
                    <li>Select the segments you want to keep</li>
                    <li>Download as a transparent PNG</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
