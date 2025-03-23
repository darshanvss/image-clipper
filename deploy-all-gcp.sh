#!/bin/bash
set -e

echo "===================================="
echo "Image Clipper - Full GCP Deployment"
echo "===================================="
echo ""

# Configuration
PROJECT_ID="image-clipper-app"
REGION="asia-south1"
BACKEND_SERVICE_NAME="image-clipper"
FRONTEND_SERVICE_NAME="image-clipper-frontend"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed. Please install Google Cloud SDK first."
    exit 1
fi

# Check if project exists or create it
echo "Checking if project exists..."
if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    echo "Creating new GCP project: $PROJECT_ID"
    gcloud projects create $PROJECT_ID
    gcloud config set project $PROJECT_ID
else
    echo "Using existing project: $PROJECT_ID"
    gcloud config set project $PROJECT_ID
fi

# Enable required APIs
echo "Enabling required GCP APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com

# The model will be downloaded during container build
echo "Model will be downloaded during container build process..."

# Make the deployment scripts executable
chmod +x deploy-gcp.sh
chmod +x deploy-frontend-gcp.sh

# Step 2: Deploy Backend
echo ""
echo "Deploying backend..."
./deploy-gcp.sh

# Step 3: Deploy Frontend 
echo ""
echo "Deploying frontend..."
./deploy-frontend-gcp.sh

# Get service URLs
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE_NAME --region $REGION --format 'value(status.url)')
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE_NAME --region $REGION --format 'value(status.url)')

# Print deployment summary
echo ""
echo "=================================================="
echo "DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=================================================="
echo ""
echo "API Backend:        $BACKEND_URL"
echo "API Documentation:  $BACKEND_URL/docs"
echo "Frontend:           $FRONTEND_URL"
echo ""
echo "To monitor your services, visit:"
echo "https://console.cloud.google.com/run?project=$PROJECT_ID"
echo ""
echo "Note: If you need to make changes to the API URL in the frontend,"
echo "      edit the file: frontend/.env.production"
echo "" 