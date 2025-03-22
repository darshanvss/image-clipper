import React, { useEffect } from 'react';
import { useImageStore } from '../store/imageStore';
import { Mask } from '../types';
import { FaCheck, FaInfoCircle } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ImageEditor: React.FC = () => {
  const {
    originalImageUrl,
    masks,
    selectedMasks,
    toggleMaskSelection,
    showBackground,
    compositeImageUrl,
    generateCompositeImage,
  } = useImageStore();
  
  // Generate composite image when selection changes
  useEffect(() => {
    if (selectedMasks.length > 0) {
      generateCompositeImage();
    }
  }, [selectedMasks, showBackground, generateCompositeImage]);
  
  if (!originalImageUrl || masks.length === 0) {
    return null;
  }
  
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original Image */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium">Original Image</CardTitle>
              <div className="text-primary text-sm flex items-center gap-1">
                <FaInfoCircle size={14} />
                <span>Click segments to select</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md overflow-hidden bg-muted">
              <img 
                src={originalImageUrl} 
                alt="Original" 
                className="w-full h-auto object-contain max-h-[500px]"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Result Preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Result Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md overflow-hidden bg-muted flex items-center justify-center">
              {compositeImageUrl ? (
                <img 
                  src={compositeImageUrl} 
                  alt="Result" 
                  className="w-full h-auto object-contain max-h-[500px]"
                />
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  <p>Select segments to see result</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Available Segments */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Available Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-80 overflow-y-auto p-2">
            {masks.map((mask: Mask) => (
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
                        <Badge className="absolute top-1 right-1 h-4 w-4 p-0 flex items-center justify-center">
                          <FaCheck size={8} />
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
      </Card>
    </div>
  );
};

export default ImageEditor; 