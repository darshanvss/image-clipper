FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (only what's absolutely needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a models directory to mount the model
RUN mkdir -p /app/models

# Add model download command - uncomment and use this for cloud deployment
# For cloud deployment, we'll need to download the model at build time
RUN curl -L https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth -o /app/models/sam_vit_h_4b8939.pth

# Copy application code
COPY ./app /app/app

# Expose the API port
EXPOSE 8000

# Health check to ensure the service is ready
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/ || exit 1

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 