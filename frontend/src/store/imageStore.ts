import { create } from 'zustand';
import { ImageState } from '../types';
import axios from 'axios';

// Use type assertion to ensure the API_URL is a string
const API_URL: string = process.env.NEXT_PUBLIC_API_URL as string || 'http://localhost:8000';

// Make sure API_URL always has a protocol
const getApiUrl = (): string => {
  if (API_URL.startsWith('http://') || API_URL.startsWith('https://')) return API_URL;
  return `http://${API_URL}`;
};

interface ImageStore extends ImageState {
  setOriginalImage: (file: File) => void;
  clearImage: () => void;
  segmentImage: () => Promise<void>;
  toggleMaskSelection: (maskId: number) => void;
  toggleBackground: () => void;
  generateCompositeImage: () => void;
  reset: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

const initialState: ImageState = {
  originalImage: null,
  originalImageUrl: null,
  masks: [],
  selectedMasks: [],
  loading: false,
  error: null,
  showBackground: true,
  compositeImageUrl: null,
  processingProgress: null,
};

export const useImageStore = create<ImageStore>((set, get) => ({
  ...initialState,

  setOriginalImage: (file: File) => {
    // Validate file size more strictly
    if (file.size > 10 * 1024 * 1024) {
      set({ 
        error: "Image size exceeds 10MB limit. Please choose a smaller image.",
        loading: false 
      });
      return;
    }
    
    const url = URL.createObjectURL(file);
    set({
      originalImage: file,
      originalImageUrl: url,
      masks: [],
      selectedMasks: [],
      error: null,
      compositeImageUrl: null,
      processingProgress: null,
    });
  },

  clearImage: () => {
    if (get().originalImageUrl) {
      URL.revokeObjectURL(get().originalImageUrl);
    }
    if (get().compositeImageUrl) {
      URL.revokeObjectURL(get().compositeImageUrl!);
    }
    set(initialState);
  },

  segmentImage: async () => {
    const { originalImage } = get();
    if (!originalImage) {
      set({ error: "No image selected. Please upload an image first." });
      return;
    }

    set({ 
      loading: true, 
      error: null,
      processingProgress: "Uploading image to server...",
    });

    try {
      // Check network connectivity first
      try {
        const healthCheck = await axios.get(`${getApiUrl()}/`, { timeout: 5000 });
        if (healthCheck.status !== 200) {
          throw new Error('Server is not responding properly');
        }
      } catch (error) {
        throw new Error('Cannot connect to the server. Please check your internet connection or try again later.');
      }

      const formData = new FormData();
      formData.append('file', originalImage);

      // Create an upload progress handler
      const onUploadProgress = (progressEvent: any) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          set({ processingProgress: `Uploading: ${percentCompleted}%` });
        }
      };

      set({ processingProgress: "Processing image with AI model..." });

      const response = await axios.post(`${getApiUrl()}/segment`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 120 seconds timeout for large images
        onUploadProgress,
      });

      if (response.data.masks && Array.isArray(response.data.masks)) {
        set({ processingProgress: "Rendering masks..." });
        
        // If the backend returns the original image, we can use it
        if (response.data.original_image) {
          // Revoke old URL to prevent memory leak
          if (get().originalImageUrl) {
            URL.revokeObjectURL(get().originalImageUrl);
          }
          
          // Create new URL from the base64 data
          const imgUrl = `data:image/png;base64,${response.data.original_image}`;
          set({
            originalImageUrl: imgUrl,
            masks: response.data.masks,
            loading: false,
            processingProgress: null,
          });
        } else {
          // Just update masks if no original image is returned
          set({
            masks: response.data.masks,
            loading: false,
            processingProgress: null,
          });
        }
        
        // If masks are returned but empty, show a warning
        if (response.data.masks.length === 0) {
          set({
            error: "No objects were detected in the image. Try uploading a different image with clearer objects.",
          });
        }
      } else {
        throw new Error('Invalid response from server: masks not found');
      }
    } catch (error) {
      console.error('Error segmenting image:', error);
      
      // Extract the error message if it's from the API
      let errorMessage = 'Failed to segment image. Please try again.';
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. The image may be too large or the server is busy.';
        } else if (error.response?.status === 413) {
          errorMessage = 'Image is too large. Please upload a smaller image (max 10MB).';
        } else if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (!error.response) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      set({
        error: errorMessage,
        loading: false,
        processingProgress: null,
      });
    }
  },

  toggleMaskSelection: (maskId: number) => {
    const { selectedMasks } = get();
    const isSelected = selectedMasks.includes(maskId);

    if (isSelected) {
      set({
        selectedMasks: selectedMasks.filter(id => id !== maskId),
      });
    } else {
      set({
        selectedMasks: [...selectedMasks, maskId],
      });
    }
  },

  toggleBackground: () => {
    set(state => ({
      showBackground: !state.showBackground,
    }));
  },

  generateCompositeImage: () => {
    const { originalImageUrl, masks, selectedMasks, showBackground } = get();

    if (!originalImageUrl || selectedMasks.length === 0) {
      // If there's no image or no selected masks, clear the composite image
      if (get().compositeImageUrl) {
        URL.revokeObjectURL(get().compositeImageUrl);
        set({ compositeImageUrl: null });
      }
      return;
    }

    // Create a new image from the original image URL
    const img = new Image();
    img.crossOrigin = "anonymous"; // Handle CORS if needed
    img.src = originalImageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error("Failed to get canvas context");
        return;
      }

      if (showBackground) {
        // Draw original image as background
        ctx.drawImage(img, 0, 0);
      } else {
        // Clear canvas with transparency
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Create a counter to track when all masks are processed
      let loadedMasks = 0;
      const totalMasks = selectedMasks.length;

      // Process each selected mask
      selectedMasks.forEach((maskId) => {
        const mask = masks.find(m => m.id === maskId);
        if (!mask) {
          // Skip if mask not found and increment counter
          loadedMasks++;
          return;
        }

        const maskImg = new Image();
        maskImg.crossOrigin = "anonymous"; // Handle CORS if needed
        maskImg.src = `data:image/png;base64,${mask.mask}`;

        maskImg.onload = () => {
          try {
            // Create a temporary canvas for this mask
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');

            if (!tempCtx) {
              console.error("Failed to get temp canvas context");
              loadedMasks++;
              return;
            }

            // Draw the mask
            tempCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);

            // Use the mask to clip the original image
            tempCtx.globalCompositeOperation = 'source-in';
            tempCtx.drawImage(img, 0, 0);

            // Apply a color overlay to make the segment more visible
            if (!showBackground || selectedMasks.length > 1) {
              tempCtx.globalCompositeOperation = 'source-atop';
              // Generate a unique hue for each mask (60 degrees apart in the hue space)
              const hue = (maskId * 60) % 360;
              tempCtx.fillStyle = `hsla(${hue}, 80%, 50%, 0.3)`;
              tempCtx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Draw the masked image onto the main canvas
            ctx.drawImage(tempCanvas, 0, 0);
          } catch (error) {
            console.error("Error processing mask:", error);
          } finally {
            // Increment the counter
            loadedMasks++;
            
            // Generate new URL and update state when all masks are processed
            if (loadedMasks === totalMasks) {
              try {
                const dataUrl = canvas.toDataURL('image/png');
                
                // Revoke the old URL to prevent memory leaks
                if (get().compositeImageUrl) {
                  URL.revokeObjectURL(get().compositeImageUrl);
                }
                
                set({ compositeImageUrl: dataUrl });
              } catch (error) {
                console.error("Error generating composite image:", error);
                set({ error: "Failed to generate composite image" });
              }
            }
          }
        };

        maskImg.onerror = () => {
          console.error("Failed to load mask image");
          loadedMasks++;
          
          // Check if all masks have been processed, even with errors
          if (loadedMasks === totalMasks) {
            try {
              const dataUrl = canvas.toDataURL('image/png');
              set({ compositeImageUrl: dataUrl });
            } catch (error) {
              console.error("Error generating composite image:", error);
            }
          }
        };
      });
    };

    img.onerror = () => {
      console.error("Failed to load original image");
      set({ error: "Failed to load original image" });
    };
  },

  reset: () => {
    if (get().originalImageUrl) {
      URL.revokeObjectURL(get().originalImageUrl!);
    }
    if (get().compositeImageUrl) {
      URL.revokeObjectURL(get().compositeImageUrl!);
    }
    set(initialState);
  },

  setError: (error: string | null) => {
    set({ error });
  },
  
  setLoading: (loading: boolean) => {
    set({ 
      loading,
      // Reset progress if we're not loading anymore
      processingProgress: loading ? get().processingProgress : null
    });
  },
})); 