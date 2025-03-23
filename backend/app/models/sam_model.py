import os
import torch
import numpy as np
from segment_anything import sam_model_registry, SamPredictor
import logging
import cv2
from typing import List, Tuple, Dict, Any, Optional

logger = logging.getLogger(__name__)

class SAMModel:
    def __init__(self):
        self.predictor = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        # Load model
        self._load_model()
        
    def _load_model(self):
        """Load the SAM model."""
        try:
            # Get model path from env or use default
            model_path = os.environ.get('MODEL_PATH', './checkpoints/sam_vit_h_4b8939.pth')
            model_type = "vit_h"  # Use the appropriate model type based on your checkpoint
            
            logger.info(f"Loading SAM model from {model_path}...")
            
            # Download model if it doesn't exist
            if not os.path.exists(model_path):
                logger.info("Model checkpoint not found. Downloading...")
                # Create checkpoints directory if it doesn't exist
                os.makedirs(os.path.dirname(model_path), exist_ok=True)
                
                # Download the model - this is a placeholder
                # In a real implementation, use requests or similar to download from a URL
                raise FileNotFoundError(
                    f"Model not found at {model_path}. Please download the model from "
                    "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth "
                    "and place it in the checkpoints directory."
                )
            
            # Initialize the SAM model
            sam = sam_model_registry[model_type](checkpoint=model_path)
            sam.to(device=self.device)
            
            # Create the predictor
            self.predictor = SamPredictor(sam)
            logger.info("SAM model loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading SAM model: {e}")
            raise

    def set_image(self, image: np.ndarray):
        """Set the image for segmentation."""
        if self.predictor is None:
            raise RuntimeError("Model predictor not initialized")
            
        self.predictor.set_image(image)
        return True
        
    def predict_masks(
        self, 
        points: Optional[List[List[int]]] = None, 
        point_labels: Optional[List[int]] = None,
        box: Optional[List[int]] = None,
        mode: str = "auto"
    ) -> Dict[str, Any]:
        """
        Predict masks for the image using different prompts.
        
        Args:
            points: List of [x, y] coordinates to use as point prompts
            point_labels: List of labels for each point (1 for foreground, 0 for background)
            box: Box prompt in format [x1, y1, x2, y2]
            mode: Prediction mode - "auto" (automatic mask generation), "point" (point prompts), "box" (box prompt)
            
        Returns:
            Dictionary with masks, scores, and bounding boxes
        """
        if self.predictor is None:
            raise RuntimeError("Model predictor not initialized")
            
        try:
            if mode == "auto":
                # Generate masks automatically
                masks, scores, logits = self.predictor.predict(
                    multimask_output=True,
                    point_coords=points,
                    point_labels=point_labels,
                    box=box
                )
                
            elif mode == "point" and points is not None and point_labels is not None:
                # Generate masks from point prompts
                masks, scores, logits = self.predictor.predict(
                    point_coords=np.array(points),
                    point_labels=np.array(point_labels),
                    multimask_output=True
                )
                
            elif mode == "box" and box is not None:
                # Generate masks from box prompt
                masks, scores, logits = self.predictor.predict(
                    box=np.array(box),
                    multimask_output=True
                )
                
            else:
                raise ValueError(f"Invalid mode '{mode}' or missing required prompts")
                
            # Process results
            mask_data = []
            for i, (mask, score) in enumerate(zip(masks, scores)):
                # Find bounding box for the mask
                y_indices, x_indices = np.where(mask)
                if len(y_indices) > 0 and len(x_indices) > 0:
                    x_min, x_max = int(np.min(x_indices)), int(np.max(x_indices))
                    y_min, y_max = int(np.min(y_indices)), int(np.max(y_indices))
                    width, height = x_max - x_min, y_max - y_min
                    
                    # Calculate area of the mask
                    area = int(np.sum(mask))
                    
                    # Convert mask to binary and then to list of integers for serialization
                    # (we'll reconstruct this on the client)
                    binary_mask = mask.astype(np.uint8) * 255
                    mask_flat = binary_mask.flatten().tolist()
                    
                    mask_data.append({
                        "id": i,
                        "score": float(score),
                        "bbox": [x_min, y_min, width, height],
                        "mask_data": mask_flat,
                        "area": area
                    })
                    
            return {
                "masks": mask_data,
                "image_width": self.predictor.original_size[1],
                "image_height": self.predictor.original_size[0]
            }
                
        except Exception as e:
            logger.error(f"Error predicting masks: {e}")
            raise

# Singleton instance
_model_instance = None

def get_model() -> SAMModel:
    """Get or create the SAM model instance."""
    global _model_instance
    if _model_instance is None:
        _model_instance = SAMModel()
    return _model_instance 