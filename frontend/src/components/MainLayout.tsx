import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ImageUploader from './ImageUploader';
import ImageEditor from './ImageEditor';
import { useImageStore } from '../store/imageStore';
import { toast } from 'react-toastify';

const MainLayout: React.FC = () => {
  const { 
    originalImage, 
    compositeImageUrl,
  } = useImageStore();

  const [uploadActive, setUploadActive] = useState(!originalImage);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  useEffect(() => {
    if (originalImage) {
      setUploadActive(false);
    }
  }, [originalImage]);

  const handleCopyToClipboard = async () => {
    if (!compositeImageUrl) return;
    
    try {
      const response = await fetch(compositeImageUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      
      setCopiedToClipboard(true);
      toast.success('Copied to clipboard!');
      
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar 
        setUploadActive={setUploadActive}
        uploadActive={uploadActive}
        handleCopyToClipboard={handleCopyToClipboard}
        handleDownload={handleDownload}
        copiedToClipboard={copiedToClipboard}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {uploadActive || !originalImage ? (
          <div className="flex-1 p-6">
            <ImageUploader fullScreen={true} />
          </div>
        ) : (
          <ImageEditor />
        )}
      </main>
    </div>
  );
};

export default MainLayout; 