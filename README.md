# Image Clipper

A web application for image segmentation and extraction of transparent PNGs, powered by a Python backend with PyTorch and Facebook's Segment Anything Model (SAM).

## Features

- Upload images (PNG/JPG)
- Automatic image segmentation using SAM
- Interactive segment selection
- Export selected segments as transparent PNG
- Docker-ready for easy deployment

## Architecture

The application is split into two parts:

### Frontend
- Built with Next.js and React
- Uses React-Konva for canvas manipulations
- Communicates with the backend API for image segmentation

### Backend
- FastAPI Python application
- PyTorch with SAM for image segmentation
- Processes images and returns mask data
- Handles export of transparent PNGs

## Getting Started

### Prerequisites

- Docker and Docker Compose (for the easiest setup)
- OR:
  - Node.js (for frontend)
  - Python 3.10+ (for backend)
  - CUDA-compatible GPU (optional, for faster segmentation)

### Setup with Docker (Recommended)

1. Clone the repository:
   ```
   git clone <repository-url>
   cd image-clipper
   ```

2. Download the SAM model checkpoint:
   ```
   mkdir -p backend/checkpoints
   curl -L https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth -o backend/checkpoints/sam_vit_h_4b8939.pth
   ```

3. Start the application with Docker Compose:
   ```
   docker-compose up
   ```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

### Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Download the SAM model checkpoint:
   ```
   mkdir -p checkpoints
   curl -L https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth -o checkpoints/sam_vit_h_4b8939.pth
   ```

5. Start the backend server:
   ```
   python run.py
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. Upload an image using the file uploader
2. Click "Segment Image" to process the image
3. Select segments you want to extract by clicking on them
4. Click "Export Selected Segments" to create a transparent PNG
5. Download the resulting image

## License

[MIT License](LICENSE) 