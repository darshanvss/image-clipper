'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Spinner } from './Spinner';

interface DownloadButtonProps {
  onExport: () => Promise<void>;
  disabled: boolean;
  loading: boolean;
  exportUrl: string | null;
}

export function DownloadButton({
  onExport,
  disabled,
  loading,
  exportUrl,
}: DownloadButtonProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    setDownloadUrl(exportUrl);
  }, [exportUrl]);

  const handleDownload = async () => {
    if (!exportUrl) {
      // If no export URL exists yet, trigger the export
      await onExport();
    } else {
      // If we already have an export URL, create a download link
      const downloadLink = document.createElement('a');
      downloadLink.href = exportUrl;
      downloadLink.download = `segmented-image-${Date.now()}.png`;
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={disabled}
      className="w-full"
      size="lg"
    >
      {loading ? (
        <>
          <Spinner size="sm" className="mr-2" />
          Processing...
        </>
      ) : exportUrl ? (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download Selected Segments
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Export Selected Segments
        </>
      )}
    </Button>
  );
} 