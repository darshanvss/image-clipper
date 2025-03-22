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

- Docker and Docker Compose
- SAM model checkpoint file (see below)

## Setup

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

### Backend

The backend is built with FastAPI and uses:
- Segment Anything Model for image segmentation
- PyTorch for the underlying ML framework
- Python Pillow for image processing

To run the backend separately:

```
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## License

[MIT License](LICENSE) 