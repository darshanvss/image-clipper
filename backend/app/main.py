import os
import io
import base64
from typing import List
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import torch
from segment_anything import sam_model_registry, SamPredictor
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://localhost:3000", "https://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize variables but don't load the model yet
# First try using the environment variable
MODEL_WEIGHTS_PATH = os.getenv("SAM_CHECKPOINT_PATH")

# If environment variable is not set, try various common locations
if not MODEL_WEIGHTS_PATH or not os.path.exists(MODEL_WEIGHTS_PATH):
    possible_paths = [
        # Docker mount path (most likely in containerized environment)
        "/app/models/sam_vit_h_4b8939.pth",
        # Path relative to this file - backend/app/../../../models/sam_vit_h_4b8939.pth
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "models", "sam_vit_h_4b8939.pth"),
        # Backend models directory
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "sam_vit_h_4b8939.pth"),
        # Current working directory
        os.path.join(os.getcwd(), "models", "sam_vit_h_4b8939.pth"),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            MODEL_WEIGHTS_PATH = path
            logger.info(f"Found model weights at {MODEL_WEIGHTS_PATH}")
            break
    else:
        logger.warning("Could not find model weights in any of the expected locations")
        # Use the Docker mount path as default
        MODEL_WEIGHTS_PATH = "/app/models/sam_vit_h_4b8939.pth"

MODEL_TYPE = "vit_h"

# Global variables for lazy loading
sam = None
predictor = None

# Function to initialize the model when needed
def initialize_model():
    global sam, predictor
    
    if predictor is not None:
        return predictor
    
    logger.info("Initializing SAM model...")
    
    if not os.path.exists(MODEL_WEIGHTS_PATH):
        logger.error(f"Model weights not found at {MODEL_WEIGHTS_PATH}")
        return None

    try:
        # Set PyTorch to use less memory
        torch.set_grad_enabled(False)  # Disable gradient computation
        
        # Use MPS if on Mac with Apple Silicon, CUDA if available, otherwise CPU
        if torch.backends.mps.is_available():
            device = torch.device('mps')
            logger.info("Using MPS (Apple Silicon)")
        elif torch.cuda.is_available():
            # Try to optimize GPU memory usage
            torch.cuda.empty_cache()
            device = torch.device('cuda')
            logger.info("Using CUDA")
        else:
            device = torch.device('cpu')
            logger.info("Using CPU (this may be slow)")
        
        # Try to load the model with optimized memory usage
        logger.info(f"Loading model from {MODEL_WEIGHTS_PATH}")
        sam = sam_model_registry[MODEL_TYPE](checkpoint=MODEL_WEIGHTS_PATH)
        
        # Move model to the selected device
        sam.to(device=device)
        
        # Create predictor
        predictor = SamPredictor(sam)
        logger.info("SAM model initialized successfully")
        return predictor
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            logger.error(f"Out of memory error: {str(e)}. Try increasing container memory limit.")
        else:
            logger.error(f"Runtime error initializing model: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error initializing model: {str(e)}")
        return None

@app.get("/")
def read_root():
    return {"message": "Image Clipper API is running"}

@app.get("/model-status")
def model_status():
    """Check if the model weights exist and can be loaded"""
    try:
        model_exists = os.path.exists(MODEL_WEIGHTS_PATH)
        model_size = 0
        if model_exists:
            model_size = os.path.getsize(MODEL_WEIGHTS_PATH)
        
        logger.info(f"Model status check - Path: {MODEL_WEIGHTS_PATH}, Exists: {model_exists}, Size: {model_size} bytes")
        
        # Check multiple possible paths for debugging
        debug_info = {
            "env_var": os.getenv("SAM_CHECKPOINT_PATH", "Not set"),
            "checked_paths": []
        }
        
        possible_paths = [
            "/app/models/sam_vit_h_4b8939.pth",  # Docker mounted path
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "sam_vit_h_4b8939.pth"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "models", "sam_vit_h_4b8939.pth"),
            os.path.join(os.getcwd(), "models", "sam_vit_h_4b8939.pth")
        ]
        
        for path in possible_paths:
            exists = os.path.exists(path)
            size = os.path.getsize(path) if exists else 0
            debug_info["checked_paths"].append({
                "path": path,
                "exists": exists,
                "size": size
            })
        
        return {
            "model_loaded": model_exists and model_size > 0,
            "model_path": MODEL_WEIGHTS_PATH,
            "model_exists": model_exists,
            "model_size": model_size,
            "debug_info": debug_info
        }
    except Exception as e:
        logger.error(f"Error in model_status: {str(e)}")
        return {
            "model_loaded": False,
            "error": str(e)
        }

@app.post("/segment")
async def segment_image(file: UploadFile = File(...)):
    try:
        # Get or initialize the predictor
        logger.info("Starting segment-image processing...")
        local_predictor = initialize_model()
        
        if local_predictor is None:
            logger.error("Failed to initialize model for segment-image endpoint")
            return JSONResponse(
                status_code=500,
                content={"detail": f"Failed to initialize model. The model may require more memory than available."}
            )
        
        # Read the image
        logger.info("Reading uploaded image...")
        contents = await file.read()
        
        # Validate image file
        try:
            image = Image.open(io.BytesIO(contents)).convert("RGB")
            
            # Get original image dimensions
            original_width, original_height = image.size
            logger.info(f"Original image dimensions: {original_width}x{original_height}")
            
            # Resize large images to prevent memory issues with SAM
            max_dimension = 1024  # Maximum dimension to process with SAM
            if original_width > max_dimension or original_height > max_dimension:
                logger.info(f"Resizing image for processing (original size: {original_width}x{original_height})")
                # Calculate new dimensions while maintaining aspect ratio
                if original_width > original_height:
                    new_width = max_dimension
                    new_height = int(original_height * (max_dimension / original_width))
                else:
                    new_height = max_dimension
                    new_width = int(original_width * (max_dimension / original_height))
                
                # Resize image for processing
                image_for_processing = image.resize((new_width, new_height), Image.LANCZOS)
                logger.info(f"Resized to {new_width}x{new_height} for processing")
            else:
                image_for_processing = image
                
        except Exception as e:
            logger.error(f"Invalid image file: {str(e)}")
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid image file. Please upload a valid image."}
            )
            
        # Convert to numpy array
        image_np = np.array(image_for_processing)
        
        # Set the image for the predictor
        logger.info("Setting image for prediction...")
        local_predictor.set_image(image_np)
        
        # Get automatic masks (we'll refine with user clicks in the frontend)
        logger.info("Generating automatic masks...")
        try:
            masks, scores, _ = local_predictor.predict(
                point_coords=None,
                point_labels=None,
                multimask_output=True
            )
        except RuntimeError as e:
            logger.error(f"Runtime error during prediction: {str(e)}")
            if "out of memory" in str(e).lower():
                return JSONResponse(
                    status_code=500,
                    content={"detail": "Out of memory while processing image. Try a smaller image or increase server memory."}
                )
            return JSONResponse(
                status_code=500,
                content={"detail": f"Error during prediction: {str(e)}"}
            )
        
        # Prepare masks for frontend
        logger.info(f"Processing {len(masks)} masks for response...")
        mask_results = []
        for i, (mask, score) in enumerate(zip(masks, scores)):
            mask_binary = mask.astype(np.uint8) * 255
            mask_img = Image.fromarray(mask_binary)
            buffered = io.BytesIO()
            mask_img.save(buffered, format="PNG")
            mask_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            mask_results.append({
                "id": i,
                "mask": mask_base64,
                "score": float(score)
            })
        
        # Sort masks by score (best masks first)
        mask_results.sort(key=lambda x: x["score"], reverse=True)
        
        # Convert original image to base64 as well
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        image_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        logger.info("Successfully completed segment-image request")
        return {
            "masks": mask_results,
            "original_image": image_base64
        }
    
    except Exception as e:
        logger.error(f"Error in segment_image: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error processing image: {str(e)}"}
        )

@app.post("/segment-with-points")
async def segment_with_points(
    file: UploadFile = File(...),
    points: str = Form(...),  # JSON string of points format: [[x, y, label], ...]
    mask_input: str = Form(None)  # Optional previous mask as base64
):
    import json
    
    try:
        # Get or initialize the predictor
        logger.info("Starting segment-with-points processing...")
        local_predictor = initialize_model()
        
        if local_predictor is None:
            logger.error("Failed to initialize model for segment-with-points endpoint")
            return JSONResponse(
                status_code=500,
                content={"detail": f"Failed to initialize model. The model may require more memory than available."}
            )
        
        # Parse points
        try:
            logger.info("Parsing points data...")
            points_data = json.loads(points)
            point_coords = np.array([p[:2] for p in points_data])
            point_labels = np.array([p[2] for p in points_data])
        except json.JSONDecodeError:
            logger.error("Invalid JSON in points data")
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid points data format. Expected JSON array."}
            )
        
        # Read the image
        logger.info("Reading uploaded image...")
        contents = await file.read()
        
        # Validate image file
        try:
            image = Image.open(io.BytesIO(contents)).convert("RGB")
            
            # Get original image dimensions
            original_width, original_height = image.size
            logger.info(f"Original image dimensions: {original_width}x{original_height}")
            
            # Resize large images to prevent memory issues with SAM
            max_dimension = 1024  # Maximum dimension to process with SAM
            if original_width > max_dimension or original_height > max_dimension:
                logger.info(f"Resizing image for processing (original size: {original_width}x{original_height})")
                # Calculate new dimensions while maintaining aspect ratio
                if original_width > original_height:
                    new_width = max_dimension
                    new_height = int(original_height * (max_dimension / original_width))
                else:
                    new_height = max_dimension
                    new_width = int(original_width * (max_dimension / original_height))
                
                # Resize image for processing
                image_for_processing = image.resize((new_width, new_height), Image.LANCZOS)
                
                # Adjust point coordinates based on resize ratio
                width_ratio = new_width / original_width
                height_ratio = new_height / original_height
                
                for i in range(len(point_coords)):
                    point_coords[i][0] = int(point_coords[i][0] * width_ratio)
                    point_coords[i][1] = int(point_coords[i][1] * height_ratio)
                
                logger.info(f"Resized to {new_width}x{new_height} for processing and adjusted point coordinates")
            else:
                image_for_processing = image
                
        except Exception as e:
            logger.error(f"Invalid image file: {str(e)}")
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid image file. Please upload a valid image."}
            )
        
        image_np = np.array(image_for_processing)
        
        # Set the image for the predictor
        logger.info("Setting image for prediction...")
        local_predictor.set_image(image_np)
        
        # Previous mask input handling
        mask_input_array = None
        if mask_input:
            try:
                logger.info("Processing previous mask input...")
                mask_bytes = base64.b64decode(mask_input)
                mask_image = Image.open(io.BytesIO(mask_bytes)).convert('L')
                mask_input_array = np.array(mask_image) > 0
            except Exception as e:
                logger.error(f"Error processing mask input: {str(e)}")
                # Continue without mask input if it fails
                mask_input_array = None
        
        # Get masks with point prompts
        logger.info("Generating masks with point prompts...")
        try:
            masks, scores, _ = local_predictor.predict(
                point_coords=point_coords,
                point_labels=point_labels,
                mask_input=mask_input_array,
                multimask_output=True
            )
        except RuntimeError as e:
            logger.error(f"Runtime error during prediction: {str(e)}")
            if "out of memory" in str(e).lower():
                return JSONResponse(
                    status_code=500,
                    content={"detail": "Out of memory while processing image. Try a smaller image or increase server memory."}
                )
            return JSONResponse(
                status_code=500,
                content={"detail": f"Error during prediction: {str(e)}"}
            )
        
        # Prepare masks for frontend
        logger.info(f"Processing {len(masks)} masks for response...")
        mask_results = []
        for i, (mask, score) in enumerate(zip(masks, scores)):
            mask_binary = mask.astype(np.uint8) * 255
            mask_img = Image.fromarray(mask_binary)
            buffered = io.BytesIO()
            mask_img.save(buffered, format="PNG")
            mask_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            mask_results.append({
                "id": i,
                "mask": mask_base64,
                "score": float(score)
            })
        
        # Sort by score
        mask_results.sort(key=lambda x: x["score"], reverse=True)
        
        logger.info("Successfully completed segment-with-points request")
        return {"masks": mask_results}
    
    except Exception as e:
        logger.error(f"Error in segment_with_points: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error processing image with points: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 