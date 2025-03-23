'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Mask } from '../lib/segmentation';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MaskListProps {
  masks: Mask[];
  selectedMasks: number[];
  onMaskSelect: (maskId: number) => void;
  maxHeight?: number;
}

export function MaskList({
  masks,
  selectedMasks,
  onMaskSelect,
  maxHeight = 500,
}: MaskListProps) {
  const [previewMask, setPreviewMask] = useState<number | null>(null);

  // Calculate pixels for each mask to display size/score
  const calculateMaskStats = (mask: Mask) => {
    const [, , width, height] = mask.bbox;
    let nonZeroPixels = 0;
    
    // Count non-zero pixels in the mask data
    for (let i = 0; i < mask.maskData.length; i++) {
      if (mask.maskData[i] > 0) {
        nonZeroPixels++;
      }
    }
    
    const totalPixels = width * height;
    const coverage = Math.round((nonZeroPixels / totalPixels) * 100);
    
    return {
      width,
      height,
      pixels: nonZeroPixels,
      coverage,
    };
  };

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
      {masks.length > 0 ? (
        <ScrollArea className="pr-4" style={{ height: maxHeight }}>
          <div className="space-y-2">
            {masks.map((mask, index) => {
              const isSelected = selectedMasks.includes(mask.id);
              const stats = calculateMaskStats(mask);
              
              // Determine confidence level text
              let confidenceText = 'Low';
              let confidenceColor = 'text-red-500 dark:text-red-400';
              
              if (mask.score > 0.9) {
                confidenceText = 'High';
                confidenceColor = 'text-green-500 dark:text-green-400';
              } else if (mask.score > 0.75) {
                confidenceText = 'Medium';
                confidenceColor = 'text-yellow-500 dark:text-yellow-400';
              }
              
              return (
                <div
                  key={mask.id}
                  className={`
                    flex items-center gap-4 p-3 rounded-md border 
                    ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                    transition-colors
                  `}
                  onMouseEnter={() => setPreviewMask(mask.id)}
                  onMouseLeave={() => setPreviewMask(null)}
                >
                  <Checkbox
                    id={`mask-${mask.id}`}
                    checked={isSelected}
                    onCheckedChange={() => onMaskSelect(mask.id)}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <label
                        htmlFor={`mask-${mask.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        Segment {index + 1}
                      </label>
                      <span className={`text-xs ${confidenceColor}`}>
                        {confidenceText} confidence
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <div className="flex justify-between">
                        <span>Size: {stats.width}×{stats.height}px</span>
                        <span>Area: {stats.pixels.toLocaleString()} px</span>
                      </div>
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${stats.coverage}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span>Coverage</span>
                          <span>{stats.coverage}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          No segments detected yet
        </div>
      )}
    </div>
  );
} 