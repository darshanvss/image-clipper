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

# Create models directory
RUN mkdir -p /app/models

# Download the SAM model at build time instead of copying from local
RUN curl -L https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth -o /app/models/sam_vit_h_4b8939.pth

# Copy application code
COPY ./app /app/app

# Set environment variables for performance tuning
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UVICORN_WORKERS=4 \
    UVICORN_TIMEOUT=300

# Expose the API port
EXPOSE 8000

# Health check to ensure the service is ready
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/ || exit 1

# Command to run the application with optimized settings for production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--timeout-keep-alive", "75"] 