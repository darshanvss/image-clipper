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
 * Image segmenter using ONNX Runtime Web with WebGPU acceleration
 * This approach uses the ONNX Runtime Web library to run image segmentation
 * models directly in the browser with GPU acceleration if available.
 */
export class ImageSegmenter {
  private static encoder: any = null;
  private static decoder: any = null;
  private static isLoading = false;
  private static loadPromise: Promise<any> | null = null;
  private static ort: any = null;
  private static usingWebGPU = false;

  // Model URLs - using SAM-ViT-B models for compatibility and performance
  private static ENCODER_MODEL_URL = 'https://cdn.jsdelivr.net/gh/xenova/transformers.js@main/precompiled/onnx/sam-vit_b/encoder_model_quantized.onnx';
  private static DECODER_MODEL_URL = 'https://cdn.jsdelivr.net/gh/xenova/transformers.js@main/precompiled/onnx/sam-vit_b/decoder_model_quantized.onnx';

  /**
   * Dynamically load ONNX Runtime Web
   */
  private static async loadOrtRuntime(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot load ONNX Runtime Web on server side');
    }

    if (this.ort) {
      return; // Already loaded
    }

    console.log('Loading ONNX Runtime Web...');
    try {
      // Use dynamic import to load the ONNX Runtime Web
      // This prevents server-side rendering issues
      this.ort = await import('onnxruntime-web');
      console.log('ONNX Runtime Web loaded successfully');
    } catch (error) {
      console.error('Failed to load ONNX Runtime Web:', error);
      throw error;
    }
  }

  /**
   * Gets debug info about the current state of the model
   */
  public static getDebugInfo(): string {
    if (typeof window === 'undefined') {
      return 'Running server-side, unable to check model status';
    }
    
    const status = [
      `ONNX Runtime: ${this.ort ? 'Loaded' : 'Not loaded'}`,
      `WebGPU: ${this.usingWebGPU ? 'Active' : 'Not active'}`,
      `Encoder: ${this.encoder ? 'Loaded' : 'Not loaded'}`,
      `Decoder: ${this.decoder ? 'Loaded' : 'Not loaded'}`
    ];
    
    return status.join(', ');
  }

  /**
   * Reset the model instances and force a reload
   */
  public static reset() {
    if (this.encoder) {
      // Ensure we free the WebGPU resources
      this.encoder.release?.();
      this.encoder = null;
    }
    
    if (this.decoder) {
      this.decoder.release?.();
      this.decoder = null;
    }
    
    this.isLoading = false;
    this.loadPromise = null;
  }

  /**
   * Loads the segmentation models
   */
  public static async loadModel(): Promise<any> {
    // Return cached models if already loaded
    if (this.encoder && this.decoder) {
      return { encoder: this.encoder, decoder: this.decoder };
    }

    // Return existing promise if already loading
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading = true;
    
    // Create a new promise for loading the models
    this.loadPromise = new Promise(async (resolve, reject) => {
      try {
        // First ensure ONNX Runtime is loaded
        await this.loadOrtRuntime();
        
        // Set WebAssembly flags for better performance
        // Only needed when using WASM backend
        this.ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
        this.ort.env.wasm.simd = true;
        
        console.log('Creating segmentation models...');
        console.log('Encoder URL:', this.ENCODER_MODEL_URL);
        console.log('Decoder URL:', this.DECODER_MODEL_URL);
        
        // Try to use WebGPU if available, fallback to WASM
        let executionProviders = ['webgpu', 'wasm'];
        
        // Load the encoder model
        try {
          console.log('Attempting to load encoder model...');
          this.encoder = await this.createSession(this.ENCODER_MODEL_URL, executionProviders);
          this.usingWebGPU = this.encoder.handler._backend === 'webgpu';
          console.log(`Encoder model loaded with ${this.usingWebGPU ? 'WebGPU' : 'WASM'} backend`);
        } catch (error) {
          console.error('Error loading encoder model:', error);
          console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
          console.error('Falling back to WASM only for encoder...');
          try {
            this.encoder = await this.createSession(this.ENCODER_MODEL_URL, ['wasm']);
            this.usingWebGPU = false;
            console.log('Encoder model loaded with WASM backend');
          } catch (wasm_error) {
            console.error('Failed to load encoder model even with WASM:', wasm_error);
            throw new Error(`Encoder model loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        // Load the decoder model
        try {
          console.log('Attempting to load decoder model...');
          this.decoder = await this.createSession(this.DECODER_MODEL_URL, executionProviders);
          console.log(`Decoder model loaded with ${this.decoder.handler._backend === 'webgpu' ? 'WebGPU' : 'WASM'} backend`);
        } catch (error) {
          console.error('Error loading decoder model:', error);
          console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
          console.error('Falling back to WASM only for decoder...');
          try {
            this.decoder = await this.createSession(this.DECODER_MODEL_URL, ['wasm']);
            console.log('Decoder model loaded with WASM backend');
          } catch (wasm_error) {
            console.error('Failed to load decoder model even with WASM:', wasm_error);
            throw new Error(`Decoder model loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        console.log('Segmentation models loaded successfully');
        resolve({ encoder: this.encoder, decoder: this.decoder });
      } catch (error) {
        console.error('Error loading segmentation models:', error);
        
        // Provide more detailed error information
        const errorMessage = error instanceof Error
          ? `${error.name}: ${error.message}${error.stack ? `\nStack: ${error.stack}` : ''}`
          : 'Unknown error loading segmentation models';
        
        console.error(errorMessage);
        
        // Reset state so we can try again
        this.isLoading = false;
        this.loadPromise = null;
        reject(error);
      }
    });

    return this.loadPromise;
  }

  /**
   * Create ONNX Runtime session with specified execution providers
   */
  private static async createSession(modelUrl: string, executionProviders: string[]): Promise<any> {
    // Try each execution provider in order
    for (const provider of executionProviders) {
      try {
        // Configure session options based on whether URL is remote or local
        const isRemoteUrl = modelUrl.startsWith('http');
        const sessionOptions: any = { 
          executionProviders: [provider],
          graphOptimizationLevel: 'all'
        };
        
        // For remote URLs, add CORS mode for fetch request
        if (isRemoteUrl) {
          sessionOptions.fetchOptions = {
            mode: 'cors',
            cache: 'force-cache' // Cache the models to avoid repeated downloads
          };
        }
        
        // Create session with the current provider
        const session = await this.ort.InferenceSession.create(modelUrl, sessionOptions);
        
        return session;
      } catch (error) {
        console.warn(`Failed to initialize with ${provider}, trying next provider:`, error);
        // Continue to the next provider
      }
    }
    
    // If we got here, all providers failed
    throw new Error(`Failed to create session with any of the execution providers: ${executionProviders.join(', ')}`);
  }

  /**
   * Preprocess image for the segmentation model
   */
  private static preprocessImage(image: HTMLImageElement): { tensor: any, longSide: number } {
    const { width, height } = image;
    const longSide = Math.max(width, height);
    
    // Create a canvas to resize and normalize the image
    const canvas = document.createElement('canvas');
    canvas.width = longSide;
    canvas.height = longSide;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Fill with black background and draw the image in the center
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, longSide, longSide);
    ctx.drawImage(
      image, 
      (longSide - width) / 2, 
      (longSide - height) / 2, 
      width, 
      height
    );
    
    // Get image data from canvas
    const imageData = ctx.getImageData(0, 0, longSide, longSide);
    const { data } = imageData;
    
    // Convert to RGB float32 tensor [3, longSide, longSide]
    const rgbData = new Float32Array(3 * longSide * longSide);
    
    // Normalize image data to [0, 1] range
    for (let i = 0; i < longSide * longSide; i++) {
      // Convert RGBA to RGB and normalize
      rgbData[i] = data[i * 4] / 255.0;                     // R
      rgbData[i + longSide * longSide] = data[i * 4 + 1] / 255.0;  // G
      rgbData[i + 2 * longSide * longSide] = data[i * 4 + 2] / 255.0;  // B
    }
    
    // Create tensor
    const tensor = new this.ort.Tensor('float32', rgbData, [1, 3, longSide, longSide]);
    
    return { tensor, longSide };
  }

  /**
   * Run image segmentation
   * @param imageElement The input image element
   * @returns A segmentation result with masks
   */
  public static async segment(imageElement: HTMLImageElement): Promise<SegmentationResult> {
    try {
      // Make sure models are loaded
      const { encoder, decoder } = await this.loadModel();
      
      // Preprocess image
      const { tensor: inputTensor, longSide } = this.preprocessImage(imageElement);
      
      // Run encoder
      console.log('Running encoder inference...');
      const encoderResult = await encoder.run({ images: inputTensor });
      const imageEmbedding = encoderResult.image_embeddings;
      
      // Create automatic point grid for segmentation
      // Generate 8x8 grid of points over the image
      const gridSize = 8;
      const step = longSide / gridSize;
      const pointCoords = [];
      const pointLabels = [];
      
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          // Add point coordinates (normalized to 0-1)
          pointCoords.push([
            (step * i + step / 2) / longSide,  // x
            (step * j + step / 2) / longSide   // y
          ]);
          
          // Mark as foreground point (1)
          pointLabels.push(1);
        }
      }
      
      // Convert to tensors
      const pointCoordsTensor = new this.ort.Tensor(
        'float32', 
        new Float32Array(pointCoords.flat()), 
        [1, pointCoords.length, 2]
      );
      
      const pointLabelsTensor = new this.ort.Tensor(
        'float32',
        new Float32Array(pointLabels), 
        [1, pointLabels.length]
      );
      
      const originalSizeTensor = new this.ort.Tensor(
        'float32',
        new Float32Array([imageElement.height, imageElement.width]),
        [2]
      );
      
      // Run decoder for each point
      console.log('Running decoder inference with multiple points...');
      
      // Prepare to collect masks
      const masks: Mask[] = [];
      
      // Process batches of points to avoid memory issues
      const batchSize = 4;
      for (let i = 0; i < pointCoords.length; i += batchSize) {
        const endIdx = Math.min(i + batchSize, pointCoords.length);
        const batchCoords = pointCoords.slice(i, endIdx);
        const batchLabels = pointLabels.slice(i, endIdx);
        
        // Create tensors for this batch
        const batchCoordsTensor = new this.ort.Tensor(
          'float32', 
          new Float32Array(batchCoords.flat()), 
          [1, batchCoords.length, 2]
        );
        
        const batchLabelsTensor = new this.ort.Tensor(
          'float32',
          new Float32Array(batchLabels), 
          [1, batchLabels.length]
        );
        
        // Run decoder with this batch
        const decoderInputs = {
          image_embeddings: imageEmbedding,
          point_coords: batchCoordsTensor,
          point_labels: batchLabelsTensor,
          orig_im_size: originalSizeTensor
        };
        
        const decoderResult = await decoder.run(decoderInputs);
        const masksProbability = decoderResult.masks;
        
        // Process masks
        const batchMasks = this.processMasks(
          masksProbability, 
          imageElement.width,
          imageElement.height,
          i
        );
        
        // Add unique, non-overlapping masks
        for (const mask of batchMasks) {
          // Check if this mask is too similar to any existing mask
          const isUnique = !masks.some(existingMask => 
            this.calculateIoU(mask, existingMask) > 0.5
          );
          
          if (isUnique) {
            masks.push(mask);
          }
        }
      }
      
      // Filter to keep only top N masks by score
      const topMasks = masks
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);  // Keep top 20 masks maximum
      
      // Renumber mask IDs sequentially
      const finalMasks = topMasks.map((mask, index) => ({
        ...mask,
        id: index,
      }));
      
      console.log(`Segmentation complete, found ${finalMasks.length} masks`);
      
      return {
        masks: finalMasks,
        imageWidth: imageElement.width,
        imageHeight: imageElement.height
      };
    } catch (error) {
      console.error('Error during segmentation:', error);
      throw error;
    }
  }
  
  /**
   * Process raw mask probabilities into binary masks
   */
  private static processMasks(
    masksProbability: any, 
    imageWidth: number, 
    imageHeight: number,
    startId: number
  ): Mask[] {
    const masks: Mask[] = [];
    const threshold = 0.5;
    
    // Get dimensions
    const [batchSize, height, width] = masksProbability.dims;
    const maskData = masksProbability.data;
    
    // Process each mask in the batch
    for (let b = 0; b < batchSize; b++) {
      // Convert floating-point mask probabilities to binary mask
      const binaryMask = new Uint8Array(width * height);
      let nonZeroPixels = 0;
      
      for (let i = 0; i < width * height; i++) {
        // Get probability value
        const idx = b * width * height + i;
        const value = maskData[idx];
        
        // Apply threshold
        binaryMask[i] = value > threshold ? 1 : 0;
        if (binaryMask[i] > 0) {
          nonZeroPixels++;
        }
      }
      
      // Skip empty or very small masks
      if (nonZeroPixels < 100) continue;
      
      // Calculate bounding box
      let minX = width, minY = height, maxX = 0, maxY = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (binaryMask[idx] > 0) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      
      // Convert normalized coordinates to image coordinates
      const boundingBox: [number, number, number, number] = [
        Math.floor(minX * (imageWidth / width)),
        Math.floor(minY * (imageHeight / height)),
        Math.ceil((maxX - minX) * (imageWidth / width)),
        Math.ceil((maxY - minY) * (imageHeight / height))
      ];
      
      // Resize mask to original image dimensions
      const resizedMask = this.resizeMask(
        binaryMask, 
        width, 
        height, 
        imageWidth,
        imageHeight
      );
      
      // Calculate mask confidence score based on average probability
      let totalProb = 0;
      for (let i = 0; i < width * height; i++) {
        const idx = b * width * height + i;
        if (binaryMask[i] > 0) {
          totalProb += maskData[idx];
        }
      }
      
      const avgProb = nonZeroPixels > 0 ? totalProb / nonZeroPixels : 0;
      
      masks.push({
        id: startId + b,
        score: avgProb,
        bbox: boundingBox,
        maskData: resizedMask
      });
    }
    
    return masks;
  }
  
  /**
   * Resize a mask to match the original image dimensions
   */
  private static resizeMask(
    mask: Uint8Array, 
    maskWidth: number, 
    maskHeight: number, 
    targetWidth: number, 
    targetHeight: number
  ): Uint8Array {
    const resizedMask = new Uint8Array(targetWidth * targetHeight);
    
    // Simple nearest neighbor scaling
    const scaleX = maskWidth / targetWidth;
    const scaleY = maskHeight / targetHeight;
    
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        // Find corresponding position in original mask
        const srcX = Math.min(Math.floor(x * scaleX), maskWidth - 1);
        const srcY = Math.min(Math.floor(y * scaleY), maskHeight - 1);
        
        // Copy value
        resizedMask[y * targetWidth + x] = mask[srcY * maskWidth + srcX];
      }
    }
    
    return resizedMask;
  }
  
  /**
   * Calculate Intersection over Union (IoU) between two masks
   */
  private static calculateIoU(mask1: Mask, mask2: Mask): number {
    const data1 = mask1.maskData;
    const data2 = mask2.maskData;
    
    if (data1.length !== data2.length) {
      return 0; // Different sizes, can't compare
    }
    
    let intersection = 0;
    let union = 0;
    
    for (let i = 0; i < data1.length; i++) {
      const val1 = data1[i] > 0 ? 1 : 0;
      const val2 = data2[i] > 0 ? 1 : 0;
      
      intersection += val1 & val2;
      union += val1 | val2;
    }
    
    return union > 0 ? intersection / union : 0;
  }
} 