'use client';

import { useEffect, useRef, useState } from 'react';
import type { Mask } from '../lib/segmentation';

interface SegmentCanvasProps {
  imageUrl: string;
  masks: Mask[];
  selectedMasks: number[];
  onMaskSelect: (maskId: number) => void;
  width: number;
  height: number;
}

const COLORS = [
  'rgba(255, 0, 0, 0.4)',    // Red
  'rgba(0, 255, 0, 0.4)',    // Green
  'rgba(0, 0, 255, 0.4)',    // Blue
  'rgba(255, 255, 0, 0.4)',  // Yellow
  'rgba(255, 0, 255, 0.4)',  // Magenta
  'rgba(0, 255, 255, 0.4)',  // Cyan
  'rgba(255, 165, 0, 0.4)',  // Orange
  'rgba(128, 0, 128, 0.4)',  // Purple
];

export default function SegmentCanvas({ 
  imageUrl, 
  masks, 
  selectedMasks, 
  onMaskSelect,
  width,
  height
}: SegmentCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hoveredMaskId, setHoveredMaskId] = useState<number | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  // Load the image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageSize({ width: img.width, height: img.height });
      
      // Calculate scale and canvas size
      const aspectRatio = img.width / img.height;
      
      let newWidth = width;
      let newHeight = newWidth / aspectRatio;
      
      if (newHeight > height) {
        newHeight = height;
        newWidth = newHeight * aspectRatio;
      }
      
      setCanvasSize({ width: newWidth, height: newHeight });
      setScale(newWidth / img.width);
    };
    img.src = imageUrl;
  }, [imageUrl, width, height]);

  // Draw the image and masks
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    const img = new Image();
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Draw selected masks
      selectedMasks.forEach((maskId) => {
        const mask = masks.find((m) => m.id === maskId);
        if (!mask) return;
        
        drawMask(ctx, mask, true);
      });
      
      // Draw hovered mask on top if not selected
      if (hoveredMaskId !== null && !selectedMasks.includes(hoveredMaskId)) {
        const mask = masks.find((m) => m.id === hoveredMaskId);
        if (mask) {
          drawMask(ctx, mask, false);
        }
      }
    };
    img.src = imageUrl;
  }, [imageUrl, masks, selectedMasks, hoveredMaskId, imageLoaded, canvasSize]);

  // Draw a mask on the canvas
  const drawMask = (ctx: CanvasRenderingContext2D, mask: Mask, isSelected: boolean) => {
    const { width, height } = canvasSize;
    const color = COLORS[mask.id % COLORS.length];
    
    // Get mask dimensions from the bounding box [x, y, width, height]
    const [x, y, maskWidth, maskHeight] = mask.bbox;
    
    // Create ImageData object
    const imageData = ctx.createImageData(maskWidth, maskHeight);
    
    // Get mask data as Uint8Array
    const maskData = mask.maskData;
    
    // Fill the ImageData with mask data
    for (let i = 0; i < maskWidth * maskHeight; i++) {
      const maskValue = maskData[i];
      // Only show mask where there's a positive segmentation
      if (maskValue > 0) {
        const pixelIndex = i * 4;
        
        // Parse the color (format: rgba(r, g, b, a))
        const rgba = color.match(/\d+/g)!.map(Number);
        
        // Set the pixel RGBA values
        imageData.data[pixelIndex] = rgba[0]; // R
        imageData.data[pixelIndex + 1] = rgba[1]; // G
        imageData.data[pixelIndex + 2] = rgba[2]; // B
        
        // Set a higher alpha for selected masks
        imageData.data[pixelIndex + 3] = isSelected ? 180 : 100; // A
      }
    }
    
    // Put the ImageData onto the canvas
    ctx.putImageData(imageData, x * scale, y * scale);
    
    // Draw a border around the mask if it's selected or hovered
    if (isSelected || hoveredMaskId === mask.id) {
      ctx.strokeStyle = isSelected ? 'white' : 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x * scale, y * scale, maskWidth * scale, maskHeight * scale);
    }
  };

  // Handle click on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // Find which mask was clicked
    for (const mask of masks) {
      const [maskX, maskY, maskWidth, maskHeight] = mask.bbox;
      
      // Check if click is inside the mask bounding box
      if (x >= maskX && x <= maskX + maskWidth && y >= maskY && y <= maskY + maskHeight) {
        // Check if the click is actually on a masked pixel
        const maskData = mask.maskData;
        const pixelIndex = Math.floor((y - maskY) * maskWidth + (x - maskX));
        
        if (pixelIndex >= 0 && pixelIndex < maskData.length && maskData[pixelIndex] > 0) {
          onMaskSelect(mask.id);
          return;
        }
      }
    }
  };

  // Handle mouse move to highlight hovered mask
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // Find which mask is being hovered
    let hoveredMask: number | null = null;
    
    for (const mask of masks) {
      const [maskX, maskY, maskWidth, maskHeight] = mask.bbox;
      
      // Check if hover is inside the mask bounding box
      if (x >= maskX && x <= maskX + maskWidth && y >= maskY && y <= maskY + maskHeight) {
        // Check if the hover is actually on a masked pixel
        const maskData = mask.maskData;
        const pixelIndex = Math.floor((y - maskY) * maskWidth + (x - maskX));
        
        if (pixelIndex >= 0 && pixelIndex < maskData.length && maskData[pixelIndex] > 0) {
          hoveredMask = mask.id;
          break;
        }
      }
    }
    
    setHoveredMaskId(hoveredMask);
  };

  return (
    <div className="relative border rounded-lg overflow-hidden bg-black flex items-center justify-center">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredMaskId(null)}
        style={{ 
          cursor: 'pointer',
          width: canvasSize.width,
          height: canvasSize.height
        }}
      />
    </div>
  );
} 