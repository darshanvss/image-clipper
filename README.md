# Image Clipper

Image Clipper is an application that uses Meta's Segment Anything Model (SAM) to precisely segment images. Users can upload images, click on segments they want to keep, and export the results.

## Features

- Upload images via drag and drop or file selection
- Automatic image segmentation using Meta's SAM
- Interactive selection of segments to keep
- Export segmented images with or without background
- Copy segmented images to clipboard
- Download segmented images in various formats (PNG, JPEG)

## Requirements

- Docker and Docker Compose (for cloud deployment)
- SAM model checkpoint file (for cloud deployment)
- Or Python 3.8+ (for local deployment)

## Setup

### Cloud Deployment (Original SAM)

1. Clone this repository:
   ```
   git clone <repository-url>
   cd image-clipper
   ```

2. Download the SAM model checkpoint:
   - Go to [Segment Anything Model Checkpoints](https://github.com/facebookresearch/segment-anything#model-checkpoints)
   - Download the `sam_vit_h_4b8939.pth` file
   - Create a `models` directory in the root of this project
   - Place the downloaded file in the `models` directory

3. Start the application using Docker Compose:
   ```
   docker-compose up
   ```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

### Local Deployment (MobileSAM for M1/M2 Macs)

For users with Apple Silicon M1/M2 MacBooks or other resource-constrained environments, we provide a lightweight backend using MobileSAM:

1. Clone this repository:
   ```
   git clone <repository-url>
   cd image-clipper
   ```

2. Run the local backend:
   ```
   cd backend-local
   ./run_local.sh
   ```
   This script will:
   - Set up a Python virtual environment
   - Install required dependencies
   - Download the MobileSAM model (~9.6MB)
   - Start the FastAPI server

3. In a separate terminal, run the frontend:
   ```
   cd frontend
   npm install
   npm run dev
   ```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. Upload an image by dragging and dropping it onto the designated area or clicking to select a file
2. The image will be automatically segmented, showing various regions
3. Click on segments you want to keep
4. Use the toolbar to:
   - Toggle segment visibility
   - Remove background
   - Copy to clipboard
   - Download the result

## Development

### Frontend

The frontend is built with Next.js and uses:
- React for the UI
- TailwindCSS for styling
- react-dropzone for file uploads
- canvas API for image manipulation

To run the frontend separately:

```
cd frontend
npm install
npm run dev
```

### Backend Options

#### Original SAM Backend

The original backend is built with FastAPI and uses:
- Segment Anything Model for image segmentation
- PyTorch for the underlying ML framework
- Python Pillow for image processing

To run the original backend separately:

```
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### MobileSAM Backend (Lightweight)

The lightweight backend is optimized for Apple Silicon and resource-constrained environments:
- Uses MobileSAM (~9.6MB model vs. 615MB for original SAM)
- 40x faster inference with good segmentation quality
- Metal Performance Shaders (MPS) support for M1/M2 Macs

To run the MobileSAM backend:

```
cd backend-local
./run_local.sh
```

For experimentation and testing, a Jupyter notebook is also provided:

```
cd backend-local
jupyter notebook
# Open mobile_sam_example.ipynb
```

## Performance Comparison

| Component | Original SAM | MobileSAM |
|-----------|--------------|-----------|
| Parameters | 615M | 9.66M |
| Speed | 456ms | 12ms |

## License

[MIT License](LICENSE) 