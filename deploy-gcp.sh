#!/bin/bash
set -e

# Configuration
PROJECT_ID="image-clipper-app"  # Your newly created project ID
REGION="asia-south1"  # Mumbai, India region for better latency
SERVICE_NAME="image-clipper"

# The model will be downloaded in the Dockerfile build process
echo "Model will be downloaded during container build..."

# Step 2: Build the container
echo "Building container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME ./backend

# Step 3: Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --memory 16Gi \
  --cpu 4 \
  --min-instances 0 \
  --max-instances 5 \
  --port 8000 \
  --set-env-vars="SAM_CHECKPOINT_PATH=/app/models/sam_vit_h_4b8939.pth" \
  --timeout 300s \
  --allow-unauthenticated

# Step 4: Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
echo "Service deployed successfully to: $SERVICE_URL"
echo "Swagger UI available at: $SERVICE_URL/docs"

# Step 5: Update frontend environment with new backend URL
echo "NEXT_PUBLIC_API_URL=$SERVICE_URL" > frontend/.env.production
echo "Frontend environment updated with backend URL: $SERVICE_URL"
echo "You can now deploy the frontend separately or point it to this backend API." 