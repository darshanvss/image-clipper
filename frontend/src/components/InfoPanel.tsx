import React from 'react';
import { FaClipboard, FaMousePointer, FaDownload, FaRegEyeSlash } from 'react-icons/fa';

interface InfoPanelProps {
  onClose: () => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden max-w-2xl w-full">
        <div className="bg-blue-500 p-4 text-white flex justify-between items-center">
          <h2 className="text-lg font-semibold">How to Use Image Clipper</h2>
          <button 
            onClick={onClose}
            className="hover:bg-blue-600 p-1 rounded"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
                <FaMousePointer className="text-blue-600 dark:text-blue-300 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white text-lg">Select Segments</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  After uploading an image, click on the segments you want to keep. 
                  You can select multiple segments to compose your final image.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
                <FaRegEyeSlash className="text-blue-600 dark:text-blue-300 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white text-lg">Background Options</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Use the toggle in the sidebar to show or hide the background. 
                  Hiding the background creates a transparent image with only your selected segments.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
                <FaClipboard className="text-blue-600 dark:text-blue-300 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white text-lg">Copy to Clipboard</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Copy your result directly to the clipboard for easy pasting into other applications.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
                <FaDownload className="text-blue-600 dark:text-blue-300 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white text-lg">Download Image</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Save your result as a PNG image file with transparency support.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Image Clipper uses Meta&apos;s Segment Anything Model (SAM) to provide AI-powered image segmentation.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 p-4 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel; 