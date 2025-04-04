import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging

from app.routers import segmentation
from app.models.sam_model import SAM_MODELS, get_model

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Image Clipper API",
    description="API for image segmentation and mask extraction",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(segmentation.router, prefix="/api/v1", tags=["segmentation"])

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Image Clipper API is running"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint for the API."""
    return {"status": "healthy", "api_version": "1.0.0"}

@app.get("/api/v1/models")
async def get_available_models():
    """Get information about available SAM models and the current model in use."""
    # Get the current model instance
    model = get_model()
    
    # Get the current model type from environment
    current_model_type = os.environ.get('SAM_MODEL_TYPE', 'vit_b')
    
    return {
        "available_models": SAM_MODELS,
        "current_model": current_model_type,
        "device": str(model.device)
    } 