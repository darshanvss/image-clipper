'use client';

import { Mask, SegmentationResult } from './segmentation';

// Get the API URL from environment variable or default to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * API client for the backend segmentation service
 */
export class ApiService {
  /**
   * Upload an image to the backend
   * @param file Image file to upload
   * @returns Response containing image ID and URL
   */
  static async uploadImage(file: File): Promise<{ image_id: string; image_url: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/v1/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload image');
      }

      const data = await response.json();
      return {
        image_id: data.image_id,
        image_url: `${API_URL}${data.image_url}`,
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Segment an image using the backend service
   * @param imageId ID of the image to segment
   * @param options Optional segmentation parameters
   * @returns SegmentationResult containing masks
   */
  static async segmentImage(
    imageId: string,
    options: {
      points?: number[][];
      point_labels?: number[];
      box?: number[];
      mode?: 'auto' | 'point' | 'box';
    } = {}
  ): Promise<SegmentationResult> {
    try {
      const response = await fetch(`${API_URL}/api/v1/segment/${imageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to segment image');
      }

      const data = await response.json();
      
      // Map the backend response to the frontend Mask type
      const masks: Mask[] = data.masks.map((mask: any) => ({
        id: mask.id,
        score: mask.score,
        bbox: mask.bbox,
        maskData: new Uint8Array(mask.mask_data),
      }));
      
      return {
        masks,
        imageWidth: data.image_width,
        imageHeight: data.image_height,
      };
    } catch (error) {
      console.error('Error segmenting image:', error);
      throw error;
    }
  }

  /**
   * Export selected segments as a transparent PNG
   * @param imageId ID of the image
   * @param maskIds IDs of the masks to include
   * @returns URL to the exported image
   */
  static async exportImage(imageId: string, maskIds: number[]): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/api/v1/export/${imageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mask_ids: maskIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to export image');
      }

      // Create a blob URL from the response
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error exporting image:', error);
      throw error;
    }
  }

  /**
   * Delete an image and its associated data
   * @param imageId ID of the image to delete
   */
  static async deleteImage(imageId: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/api/v1/image/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }
} 