#!/bin/bash
set -e

# Configuration - should match backend deployment
PROJECT_ID="image-clipper-app"
REGION="asia-south1"
FRONTEND_SERVICE_NAME="image-clipper-frontend"

# Step 1: Ensure the backend URL is set
if [ ! -f "frontend/.env.production" ]; then
    echo "Error: frontend/.env.production not found."
    echo "Please run deploy-gcp.sh first to deploy the backend and create this file."
    exit 1
fi

# Step 2: Build the container
echo "Building frontend container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$FRONTEND_SERVICE_NAME ./frontend

# Step 3: Deploy to Cloud Run
echo "Deploying frontend to Cloud Run..."
gcloud run deploy $FRONTEND_SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$FRONTEND_SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --port 3000 \
  --allow-unauthenticated

# Step 4: Get the service URL
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE_NAME --region $REGION --format 'value(status.url)')
echo "Frontend deployed successfully to: $FRONTEND_URL"
echo ""
echo "Deployment Complete!"
echo "===================="
echo "Your application is now available at: $FRONTEND_URL" 