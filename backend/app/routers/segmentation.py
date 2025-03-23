import os
import io
import logging
import cv2
import numpy as np
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from pydantic import ValidationError

from app.models.sam_model import get_model, SAMModel
from app.schemas.segmentation import SegmentationRequest, SegmentationResult, ExportRequest
from app.utils.image_utils import read_image, save_uploaded_image, create_transparent_image_with_masks, decode_mask

logger = logging.getLogger(__name__)

router = APIRouter()

# Store uploaded images and their masks in memory
# This is a simplification for development. In production, use a DB or file system.
IMAGE_STORE = {}

@router.post("/upload", status_code=201)
async def upload_image(file: UploadFile = File(...)):
    """
    Upload an image for segmentation.
    
    Returns the image ID and URL for further processing.
    """
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
            
        # Read file content
        contents = await file.read()
        
        # Save uploaded file
        file_path = save_uploaded_image(contents)
        
        # Generate a unique ID for this image session
        image_id = os.path.basename(file_path).split('.')[0]
        
        # Store image path for later use
        IMAGE_STORE[image_id] = {
            "file_path": file_path,
            "masks": None,
            "segmented": False
        }
        
        # Return image ID and URL
        return {
            "status": "success",
            "image_id": image_id,
            "image_url": f"/uploads/{os.path.basename(file_path)}"
        }
    
    except Exception as e:
        logger.error(f"Error uploading image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

@router.post("/segment/{image_id}", response_model=SegmentationResult)
async def segment_image(
    image_id: str,
    segmentation_request: SegmentationRequest = None,
    model: SAMModel = Depends(get_model)
):
    """
    Run segmentation on the uploaded image.
    
    Parameters:
        - image_id: ID of the uploaded image
        - segmentation_request: Optional parameters for segmentation
    
    Returns:
        - List of masks, each with ID, bounding box, and score
    """
    try:
        # Check if image exists
        if image_id not in IMAGE_STORE:
            raise HTTPException(status_code=404, detail="Image not found")
            
        image_data = IMAGE_STORE[image_id]
        file_path = image_data["file_path"]
        
        # Read image
        image = cv2.imread(file_path)
        if image is None:
            raise HTTPException(status_code=500, detail=f"Failed to read image from {file_path}")
            
        # Set image in the model
        model.set_image(image)
        
        # Extract segmentation parameters
        points = segmentation_request.points if segmentation_request else None
        point_labels = segmentation_request.point_labels if segmentation_request else None
        box = segmentation_request.box if segmentation_request else None
        mode = segmentation_request.mode if segmentation_request else "auto"
        
        # Run prediction
        result = model.predict_masks(
            points=points, 
            point_labels=point_labels,
            box=box,
            mode=mode
        )
        
        # Store masks for later use
        IMAGE_STORE[image_id]["masks"] = result
        IMAGE_STORE[image_id]["segmented"] = True
        
        return result
        
    except Exception as e:
        logger.error(f"Error segmenting image: {e}")
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Failed to segment image: {str(e)}")

@router.post("/export/{image_id}")
async def export_image(
    image_id: str,
    export_request: ExportRequest
):
    """
    Export selected segments as a transparent PNG.
    
    Parameters:
        - image_id: ID of the segmented image
        - export_request: Contains mask IDs to export
    
    Returns:
        - Transparent PNG with only the selected segments
    """
    try:
        # Check if image exists and was segmented
        if image_id not in IMAGE_STORE:
            raise HTTPException(status_code=404, detail="Image not found")
            
        image_data = IMAGE_STORE[image_id]
        if not image_data["segmented"] or not image_data["masks"]:
            raise HTTPException(status_code=400, detail="Image has not been segmented yet")
            
        # Read original image
        file_path = image_data["file_path"]
        image = cv2.imread(file_path)
        if image is None:
            raise HTTPException(status_code=500, detail=f"Failed to read image from {file_path}")
            
        # Get masks data
        masks_data = image_data["masks"]["masks"]
        image_width = image_data["masks"]["image_width"]
        image_height = image_data["masks"]["image_height"]
        
        # Find selected masks
        selected_mask_ids = export_request.mask_ids
        
        # Check if any of the requested masks exists
        valid_mask_ids = [mask["id"] for mask in masks_data]
        if not any(mask_id in valid_mask_ids for mask_id in selected_mask_ids):
            raise HTTPException(status_code=400, detail="None of the requested mask IDs exist")
        
        # Get the selected mask data
        selected_masks = []
        for mask_id in selected_mask_ids:
            for mask_data in masks_data:
                if mask_data["id"] == mask_id:
                    # Decode the mask data
                    binary_mask = decode_mask(mask_data["mask_data"], image_width, image_height)
                    selected_masks.append(binary_mask)
                    break
        
        # Create transparent image with the selected masks
        transparent_img = create_transparent_image_with_masks(image, selected_masks)
        
        # Save the result to a temporary file
        export_path = f"uploads/export_{image_id}.png"
        transparent_img.save(export_path, format="PNG")
        
        # Return the file
        return FileResponse(
            export_path,
            media_type="image/png",
            filename=f"export_{image_id}.png"
        )
        
    except Exception as e:
        logger.error(f"Error exporting image: {e}")
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Failed to export image: {str(e)}")
        
@router.delete("/image/{image_id}")
async def delete_image(image_id: str):
    """
    Delete an uploaded image and its associated data.
    """
    try:
        # Check if image exists
        if image_id not in IMAGE_STORE:
            raise HTTPException(status_code=404, detail="Image not found")
            
        # Get file path
        file_path = IMAGE_STORE[image_id]["file_path"]
        
        # Delete from storage if exists
        if os.path.exists(file_path):
            os.remove(file_path)
            
        # Remove from image store
        del IMAGE_STORE[image_id]
        
        # Delete any exported files
        export_path = f"uploads/export_{image_id}.png"
        if os.path.exists(export_path):
            os.remove(export_path)
            
        return {"status": "success", "message": "Image deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting image: {e}")
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}") 