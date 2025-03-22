#!/bin/bash
set -e

# Configuration
PROJECT_ID="image-clipper-app"  # Your newly created project ID
REGION="asia-south1"  # Mumbai, India region for better latency
SERVICE_NAME="image-clipper"

# Step 1: Download SAM model if not already done
if [ ! -f "backend/models/sam_vit_h_4b8939.pth" ]; then
    echo "Downloading SAM model..."
    mkdir -p backend/models
    curl -L https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth -o backend/models/sam_vit_h_4b8939.pth
fi

# Step 2: Build the container
echo "Building container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME ./backend

# Step 3: Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --memory 8Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 3 \
  --port 8000 \
  --allow-unauthenticated

# Step 4: Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
echo "Service deployed successfully to: $SERVICE_URL"
echo "Swagger UI available at: $SERVICE_URL/docs" 