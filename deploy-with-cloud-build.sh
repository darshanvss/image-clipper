#!/bin/bash
set -e

# Default values
PROJECT_ID=${PROJECT_ID:-"image-clipper-app"}
GCP_REGION=${GCP_REGION:-"asia-south1"}  # Mumbai, India
MODEL_TYPE=${MODEL_TYPE:-"vit_h"}
MEMORY=${MEMORY:-"4Gi"}
CPU=${CPU:-"4"}

# Display header
echo "===== Image Clipper GCP Deployment with Cloud Build ====="
echo "Project: $PROJECT_ID"
echo "Region: $GCP_REGION"
echo "SAM Model: $MODEL_TYPE"
echo "Backend Memory: $MEMORY"
echo "Backend CPU: $CPU"
echo "=================================================="

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

# 4. Start the Cloud Build process
echo "Starting Cloud Build deployment..."
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _REGION=$GCP_REGION,_MODEL_TYPE=$MODEL_TYPE,_MEMORY=$MEMORY,_CPU=$CPU .

# 5. Get the deployed URLs
echo "Getting service URLs..."
BACKEND_URL=$(gcloud run services describe image-clipper-backend --format='value(status.url)' --region $GCP_REGION)
FRONTEND_URL=$(gcloud run services describe image-clipper-frontend --format='value(status.url)' --region $GCP_REGION)

echo "===== Deployment Complete ====="
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "============================="

echo "You can access the application at: $FRONTEND_URL" 