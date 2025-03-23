'use client';

/**
 * Types for segmentation results
 */
export interface Mask {
  id: number;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  maskData: Uint8Array; // Binary mask data
}

export interface SegmentationResult {
  masks: Mask[];
  imageWidth: number;
  imageHeight: number;
}

/**
 * SAM model segmenter that uses the Xenova's transformers.js library in the browser
 * It relies exclusively on the CDN version to avoid Node.js dependencies.
 */
export class SAMSegmenter {
  private static model: any = null;
  private static isLoading = false;
  private static loadPromise: Promise<any> | null = null;
  private static transformersPromise: Promise<any> | null = null;

  /**
   * Loads the CDN version of transformers.js if it's not already loaded
   */
  private static async loadTransformersScript(): Promise<void> {
    // Return existing promise if already loading
    if (this.transformersPromise) {
      return this.transformersPromise;
    }

    this.transformersPromise = new Promise<void>((resolve, reject) => {
      // Check if transformers is already loaded globally
      if (typeof window !== 'undefined' && (window as any).transformers) {
        console.log('transformers.js already loaded');
        resolve();
        return;
      }

      // Use UMD build specifically - the key is to use the proper UMD build
      const script = document.createElement('script');
      // Using jsDelivr with explicit UMD version
      script.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.0/dist/transformers.umd.min.js';
      script.async = true;
      
      script.onload = () => {
        // Verify the library is actually available
        if ((window as any).transformers) {
          console.log('transformers.js loaded from CDN');
          resolve();
        } else {
          console.error('Script loaded but transformers object not found');
          reject(new Error('transformers.js loaded but object not available'));
        }
      };
      
      script.onerror = (error) => {
        console.error('Failed to load transformers.js:', error);
        reject(new Error('Failed to load transformers.js from CDN'));
      };
      
      // Handle timeout - increased to give more time
      const timeoutId = setTimeout(() => {
        if (!(window as any).transformers) {
          console.error('transformers.js loading timed out');
          reject(new Error('transformers.js loading timed out after 45 seconds'));
        }
      }, 45000);
      
      // Clean up timeout if script loads or errors
      script.addEventListener('load', () => clearTimeout(timeoutId));
      script.addEventListener('error', () => clearTimeout(timeoutId));
      
      document.head.appendChild(script);
    });

    return this.transformersPromise;
  }

  /**
   * Checks if transformers.js is loaded and available globally
   */
  public static isTransformersLoaded(): boolean {
    return typeof window !== 'undefined' && 
           typeof (window as any).transformers !== 'undefined' && 
           (window as any).transformers !== null;
  }
  
  /**
   * Gets debug info about the current state of the transformers library
   */
  public static getDebugInfo(): string {
    if (typeof window === 'undefined') {
      return 'Window object not available (server-side)';
    }
    
    const transformers = (window as any).transformers;
    
    if (!transformers) {
      return 'transformers.js not loaded';
    }
    
    return `transformers.js loaded: v${transformers.version || 'unknown'}, pipeline: ${typeof transformers.pipeline === 'function' ? 'available' : 'not available'}`;
  }

  /**
   * Loads the SAM model
   */
  public static async loadModel(): Promise<any> {
    // Return cached model if already loaded
    if (this.model) {
      return this.model;
    }

    // Return existing promise if model is already loading
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading = true;
    
    // Create a new promise for loading the model
    this.loadPromise = new Promise(async (resolve, reject) => {
      try {
        // First ensure transformers.js is loaded
        await this.loadTransformersScript();
        
        // Check if transformers was loaded properly
        if (typeof window === 'undefined' || !(window as any).transformers) {
          throw new Error('transformers.js not available after loading script');
        }
        
        const pipeline = (window as any).transformers.pipeline;
        if (!pipeline) {
          throw new Error('transformers.js pipeline function not found');
        }
        
        console.log('Creating SAM pipeline...');
        
        // Initialize the pipeline for mask generation
        this.model = await pipeline('mask-generation', 'Xenova/sam-vit-base', {
          quantized: true
        });
        
        console.log('SAM model loaded successfully');
        resolve(this.model);
      } catch (error) {
        console.error('Error loading SAM model:', error);
        // Reset state so we can try again
        this.isLoading = false;
        this.loadPromise = null;
        reject(error);
      }
    });

    return this.loadPromise;
  }

  /**
   * Segments an image using the SAM model
   * @param imageElement The image to segment
   * @returns A segmentation result with masks
   */
  public static async segment(imageElement: HTMLImageElement): Promise<SegmentationResult> {
    try {
      // Make sure model is loaded
      const model = await this.loadModel();
      
      if (!model) {
        throw new Error('Model not loaded');
      }
      
      console.log('Starting image segmentation...');
      
      // Run segmentation
      const result = await model(imageElement, {
        threshold: 0.92,
        points_per_side: 32
      });
      
      console.log(`Segmentation complete, found ${result.masks.length} masks`);
      
      // Transform the results to our format
      const masks: Mask[] = result.masks.map((mask: any, index: number) => {
        const id = index;
        
        // Get mask data - different versions of the library might have slightly different formats
        let maskData: Uint8Array;
        if (mask.data instanceof Uint8Array) {
          maskData = mask.data;
        } else if (mask.segmentation instanceof Uint8Array) {
          maskData = mask.segmentation;
        } else if (Array.isArray(mask.data)) {
          maskData = new Uint8Array(mask.data);
        } else if (Array.isArray(mask.segmentation)) {
          maskData = new Uint8Array(mask.segmentation);
        } else {
          console.error('Unexpected mask data format:', mask);
          maskData = new Uint8Array(imageElement.width * imageElement.height);
        }
        
        // Calculate bounding box if not provided
        let bbox: [number, number, number, number] = [0, 0, imageElement.width, imageElement.height];
        
        if (mask.bbox && Array.isArray(mask.bbox) && mask.bbox.length >= 4) {
          bbox = [
            mask.bbox[0], 
            mask.bbox[1], 
            mask.bbox[2] - mask.bbox[0], 
            mask.bbox[3] - mask.bbox[1]
          ];
        } else if (mask.box && Array.isArray(mask.box) && mask.box.length >= 4) {
          bbox = mask.box as [number, number, number, number];
        }
        
        return {
          id,
          score: mask.score || 0.95,
          bbox,
          maskData
        };
      });
      
      return {
        masks,
        imageWidth: imageElement.width,
        imageHeight: imageElement.height
      };
    } catch (error) {
      console.error('Error during segmentation:', error);
      throw error;
    }
  }
  
  /**
   * Resets the model and forces a reload on next use
   */
  public static reset() {
    this.model = null;
    this.isLoading = false;
    this.loadPromise = null;
    this.transformersPromise = null;
  }
} 