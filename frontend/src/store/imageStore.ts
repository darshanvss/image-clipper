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
};

export const useImageStore = create<ImageStore>((set, get) => ({
  ...initialState,

  setOriginalImage: (file: File) => {
    const url = URL.createObjectURL(file);
    set({
      originalImage: file,
      originalImageUrl: url,
      masks: [],
      selectedMasks: [],
      error: null,
      compositeImageUrl: null,
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
    if (!originalImage) return;

    set({ loading: true, error: null });

    try {
      const formData = new FormData();
      formData.append('file', originalImage);

      const response = await axios.post(`${getApiUrl()}/segment`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      set({
        masks: response.data.masks,
        loading: false,
      });
    } catch (error) {
      console.error('Error segmenting image:', error);
      set({
        error: 'Failed to segment image. Please try again.',
        loading: false,
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

    if (!originalImageUrl || selectedMasks.length === 0) return;

    const img = new Image();
    img.src = originalImageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      if (showBackground) {
        // Draw original image as background
        ctx.drawImage(img, 0, 0);
      } else {
        // Clear canvas with transparency
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Process each selected mask
      selectedMasks.forEach(maskId => {
        const mask = masks.find(m => m.id === maskId);
        if (!mask) return;

        const maskImg = new Image();
        maskImg.src = `data:image/png;base64,${mask.mask}`;

        maskImg.onload = () => {
          // Create a temporary canvas for this mask
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');

          if (!tempCtx) return;

          // Draw the mask
          tempCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);

          // Use the mask to clip the original image
          tempCtx.globalCompositeOperation = 'source-in';
          tempCtx.drawImage(img, 0, 0);

          // Draw the masked image onto the main canvas
          ctx.drawImage(tempCanvas, 0, 0);

          // Generate new URL and update state
          const dataUrl = canvas.toDataURL('image/png');
          set({ compositeImageUrl: dataUrl });
        };
      });
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
})); 