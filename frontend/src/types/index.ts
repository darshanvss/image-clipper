export interface Mask {
  id: number;
  mask: string; // base64 encoded mask
  score?: number;
  selected?: boolean;
}

export interface ImageState {
  originalImage: File | null;
  originalImageUrl: string | null;
  masks: Mask[];
  selectedMasks: number[];
  loading: boolean;
  error: string | null;
  showBackground: boolean;
  compositeImageUrl: string | null;
}

export interface Point {
  x: number;
  y: number;
  label: number; // 1 for foreground, 0 for background
} 