# Deploying to Google Cloud Platform (GCP)

This document provides instructions for deploying the Image Clipper application to Google Cloud Platform using the larger SAM model (vit_h) for better accuracy.

## Prerequisites

- Google Cloud SDK installed and configured locally
- Docker and Docker Compose installed locally
- A GCP project created with the necessary APIs enabled
  - Container Registry API
  - Cloud Run API (if using Cloud Run)
  - Compute Engine API (if using VM instances)
- gcloud CLI authenticated with your GCP account

## Deployment Steps

### 1. Set Environment Variables

```bash
# Set your GCP project ID
export PROJECT_ID=image-clipper
export GCP_REGION=asia-south1  # Mumbai, India
```

### 2. Authenticate Docker with GCP

```bash
# Configure Docker to use gcloud as a credential helper
gcloud auth configure-docker
```

### 3. Build and Push Docker Images

```bash
# Build the containers using the GCP-specific config (with vit_h model)
docker compose -f docker-compose.gcp.yml build

# Tag the images
docker tag image-clipper-backend gcr.io/${PROJECT_ID}/image-clipper-backend
docker tag image-clipper-frontend gcr.io/${PROJECT_ID}/image-clipper-frontend

# Push the images to Container Registry
docker push gcr.io/${PROJECT_ID}/image-clipper-backend
docker push gcr.io/${PROJECT_ID}/image-clipper-frontend
```

### 4. Deploy to Cloud Run (Recommended)

```bash
# Deploy the backend
gcloud run deploy image-clipper-backend \
  --image gcr.io/${PROJECT_ID}/image-clipper-backend \
  --platform managed \
  --region ${GCP_REGION} \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars="SAM_MODEL_TYPE=vit_h,DEBUG=False"

# Get the backend URL
BACKEND_URL=$(gcloud run services describe image-clipper-backend --format='value(status.url)')

# Deploy the frontend
gcloud run deploy image-clipper-frontend \
  --image gcr.io/${PROJECT_ID}/image-clipper-frontend \
  --platform managed \
  --region ${GCP_REGION} \
  --set-env-vars="NEXT_PUBLIC_API_URL=${BACKEND_URL}"
```

### 5. Using Persistent Storage for Model Caching

For better performance, you may want to set up persistent storage for the model files:

```bash
# Create a Cloud Storage bucket for model files
gsutil mb gs://${PROJECT_ID}-models

# Upload the SAM vit_h model to the bucket (if you have it locally)
gsutil cp ./backend/checkpoints/sam_vit_h_4b8939.pth gs://${PROJECT_ID}-models/

# Update deployment to mount the bucket (using Cloud Run volume mounts or GCE persistent disks)
```

## Important Notes

1. **Memory Requirements**: The vit_h model is large (2.4GB) and requires significant memory (at least 2GB recommended) for running the model.

2. **Cold Start**: The first request after deployment might be slow as the model needs to be downloaded if not present.

3. **Cost Considerations**: Using the larger model consumes more resources which may affect your billing. Consider setting appropriate resource limits.

4. **Scaling**: Configure appropriate auto-scaling parameters to handle the load while controlling costs.

## Troubleshooting

- If the application crashes due to memory limits, increase the memory allocation in your deployment configuration.
- If download of the model is slow/failing, consider preloading the model into your persistent storage solution.
- Check the container logs for any issues:
  ```bash
  gcloud run logs read --service image-clipper-backend
  ```

## Switching Between Models

To switch between different SAM models, update the `SAM_MODEL_TYPE` environment variable:
- `vit_h`: Largest and most accurate model (2.4GB)
- `vit_l`: Medium-sized model with good balance (1.2GB)
- `vit_b`: Smallest and fastest model (375MB)

For example, to update your Cloud Run service to use a different model:

```bash
gcloud run services update image-clipper-backend \
  --set-env-vars="SAM_MODEL_TYPE=vit_l"
``` 