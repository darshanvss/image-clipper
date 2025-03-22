import React, { useState } from 'react';
import { useImageStore } from '../store/imageStore';
import { 
  FaUpload, 
  FaEye, 
  FaEyeSlash, 
  FaTrash, 
  FaDownload, 
  FaCopy, 
  FaQuestionCircle,
  FaGithub,
  FaCheck
} from 'react-icons/fa';
import InfoPanel from './InfoPanel';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  setUploadActive: (active: boolean) => void;
  uploadActive: boolean;
  handleCopyToClipboard: () => void;
  handleDownload: () => void;
  copiedToClipboard: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  setUploadActive,
  uploadActive,
  handleCopyToClipboard,
  handleDownload,
  copiedToClipboard
}) => {
  const {
    originalImage,
    showBackground,
    toggleBackground,
    clearImage,
    compositeImageUrl,
    selectedMasks,
  } = useImageStore();

  const [showInfoPanel, setShowInfoPanel] = useState(false);

  return (
    <>
      <div className="h-screen bg-card p-4 w-64 flex flex-col shadow-md border-r border-border">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-foreground mb-1">Image Clipper</h1>
          <div className="flex items-center">
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
              Powered by SAM
            </Badge>
          </div>
        </div>

        <div className="space-y-6 flex-grow">
          {/* Upload Button */}
          <div>
            <Button
              onClick={() => setUploadActive(true)}
              variant={uploadActive ? "default" : "outline"}
              className="w-full gap-2"
            >
              <FaUpload className="h-4 w-4" />
              <span>Upload Image</span>
            </Button>
          </div>

          {originalImage && (
            <>
              <Separator />

              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Image Options
                </h2>

                {/* Toggle Background */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {showBackground ? 
                      <FaEyeSlash className="text-muted-foreground h-4 w-4" /> : 
                      <FaEye className="text-muted-foreground h-4 w-4" />
                    }
                    <span className="text-foreground text-sm">
                      {showBackground ? 'Hide Background' : 'Show Background'}
                    </span>
                  </div>
                  <Switch 
                    checked={showBackground} 
                    onCheckedChange={toggleBackground}
                    disabled={selectedMasks.length === 0}
                  />
                </div>

                {/* Export Options */}
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2 mb-3">
                    Export
                  </h2>

                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleCopyToClipboard}
                            disabled={!compositeImageUrl}
                            variant="outline"
                            className="w-full justify-start gap-2 text-foreground"
                          >
                            {copiedToClipboard ? 
                              <FaCheck className="text-green-500 h-4 w-4" /> : 
                              <FaCopy className="text-muted-foreground h-4 w-4" />
                            }
                            <span>
                              {copiedToClipboard ? 'Copied!' : 'Copy to Clipboard'}
                            </span>
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
                            disabled={!compositeImageUrl}
                            variant="outline"
                            className="w-full justify-start gap-2 text-foreground"
                          >
                            <FaDownload className="text-muted-foreground h-4 w-4" />
                            <span>Download Image</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download as PNG</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Button
                      onClick={clearImage}
                      variant="outline"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    >
                      <FaTrash className="h-4 w-4" />
                      <span>Clear Image</span>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowInfoPanel(true)}
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <FaQuestionCircle size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Help & Information</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <a
                      href="https://github.com/your-username/image-clipper"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaGithub size={18} />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>GitHub Repository</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      {showInfoPanel && <InfoPanel onClose={() => setShowInfoPanel(false)} />}
    </>
  );
};

export default Sidebar; 