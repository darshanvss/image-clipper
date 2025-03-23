import cv2
import numpy as np
import io
import os
import uuid
from PIL import Image
from typing import List, Tuple, Dict, Any, Optional

def read_image(file) -> np.ndarray:
    """Read an image file and convert to RGB format."""
    try:
        # Read image using PIL
        image = Image.open(io.BytesIO(file))
        image = image.convert('RGB')
        image_np = np.array(image)
        
        # Convert from RGB to BGR for OpenCV compatibility
        image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        return image_np
    except Exception as e:
        raise ValueError(f"Error reading image: {str(e)}")

def save_uploaded_image(file, directory="uploads") -> str:
    """Save an uploaded file to disk and return the file path."""
    # Create directory if it doesn't exist
    os.makedirs(directory, exist_ok=True)
    
    # Generate a unique filename
    filename = f"{uuid.uuid4()}.png"
    file_path = os.path.join(directory, filename)
    
    # Read and save the image
    try:
        image = Image.open(io.BytesIO(file))
        image.save(file_path)
        return file_path
    except Exception as e:
        raise ValueError(f"Error saving image: {str(e)}")

def create_transparent_image_with_masks(
    image: np.ndarray, 
    masks: List[np.ndarray]
) -> Image.Image:
    """
    Create a transparent PNG with only the selected masks visible.
    
    Args:
        image: Original image
        masks: List of binary masks to include
        
    Returns:
        PIL Image with transparent background
    """
    try:
        # Create an empty RGBA image (transparent)
        height, width = image.shape[:2]
        transparent_img = np.zeros((height, width, 4), dtype=np.uint8)
        
        # For each mask, add the corresponding pixels from the original image
        for mask in masks:
            # Ensure mask is binary
            binary_mask = mask.astype(bool)
            
            # Extract RGB from original image where mask is True
            for c in range(3):  # RGB channels
                transparent_img[:, :, c] = np.where(
                    binary_mask, 
                    image[:, :, c],
                    transparent_img[:, :, c]
                )
                
            # Set alpha channel to 255 (fully opaque) where mask is True
            transparent_img[:, :, 3] = np.where(binary_mask, 255, transparent_img[:, :, 3])
        
        # Convert to PIL image
        pil_image = Image.fromarray(transparent_img)
        return pil_image
        
    except Exception as e:
        raise ValueError(f"Error creating transparent image: {str(e)}")

def decode_mask(mask_data: List[int], image_width: int, image_height: int) -> np.ndarray:
    """
    Decode a serialized mask back to a 2D numpy array.
    
    Args:
        mask_data: Flat list of integers representing the mask
        image_width: Width of the original image
        image_height: Height of the original image
        
    Returns:
        Binary mask as a 2D numpy array
    """
    try:
        # Convert list to numpy array
        mask_flat = np.array(mask_data, dtype=np.uint8)
        
        # Reshape to 2D
        mask = mask_flat.reshape(image_height, image_width)
        
        # Convert to binary (0 or 1)
        binary_mask = (mask > 127).astype(np.uint8)
        
        return binary_mask
    except Exception as e:
        raise ValueError(f"Error decoding mask: {str(e)}") 