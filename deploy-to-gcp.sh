#!/bin/bash
set -e

# Default values
PROJECT_ID=${PROJECT_ID:-"image-clipper-app"}
GCP_REGION=${GCP_REGION:-"asia-south1"}  # Mumbai, India
MODEL_TYPE=${MODEL_TYPE:-"vit_h"}
MEMORY=${MEMORY:-"4Gi"}
CPU=${CPU:-"4"}

# Display header
echo "===== Image Clipper GCP Deployment ====="
echo "Project: $PROJECT_ID"
echo "Region: $GCP_REGION"
echo "SAM Model: $MODEL_TYPE"
echo "Backend Memory: $MEMORY"
echo "Backend CPU: $CPU"
echo "======================================"

# 1. Authenticate with GCP if not already authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "Please authenticate with GCP first:"
    gcloud auth login
fi

# 2. Set the current project
gcloud config set project $PROJECT_ID

# 3. Enable required APIs
echo "Enabling required GCP APIs..."
gcloud services enable containerregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# 4. Configure Docker to use gcloud as credential helper
echo "Configuring Docker authentication..."
gcloud auth configure-docker -q

# 5. Build backend image with the GCP Dockerfile
echo "Building backend Docker image for GCP..."
cd backend
docker build -t gcr.io/$PROJECT_ID/image-clipper-backend -f Dockerfile.gcp .
cd ..

# 6. Build frontend image
echo "Building frontend Docker image..."
cd frontend
docker build -t gcr.io/$PROJECT_ID/image-clipper-frontend .
cd ..

# 7. Push images to Container Registry
echo "Pushing Docker images to GCP Container Registry..."
docker push gcr.io/$PROJECT_ID/image-clipper-backend
docker push gcr.io/$PROJECT_ID/image-clipper-frontend

# 8. Deploy backend to Cloud Run
echo "Deploying backend to Cloud Run..."
gcloud run deploy image-clipper-backend \
  --image gcr.io/$PROJECT_ID/image-clipper-backend \
  --platform managed \
  --region $GCP_REGION \
  --memory $MEMORY \
  --cpu $CPU \
  --set-env-vars="SAM_MODEL_TYPE=$MODEL_TYPE,DEBUG=False" \
  --allow-unauthenticated

# 9. Get the backend URL
BACKEND_URL=$(gcloud run services describe image-clipper-backend --format='value(status.url)')
echo "Backend deployed at: $BACKEND_URL"

# 10. Deploy frontend to Cloud Run
echo "Deploying frontend to Cloud Run..."
gcloud run deploy image-clipper-frontend \
  --image gcr.io/$PROJECT_ID/image-clipper-frontend \
  --platform managed \
  --region $GCP_REGION \
  --set-env-vars="NEXT_PUBLIC_API_URL=$BACKEND_URL" \
  --allow-unauthenticated

# 11. Get the frontend URL
FRONTEND_URL=$(gcloud run services describe image-clipper-frontend --format='value(status.url)')

echo "===== Deployment Complete ====="
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "============================="

echo "You can access the application at: $FRONTEND_URL" 