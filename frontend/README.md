# Image Clipper

A browser-based tool for segmenting and extracting objects from images using advanced machine learning models.

## Features

- Upload images and automatically segment them into different objects
- Select the segments you want to extract
- Download the selected segments as transparent PNG images
- Uses GPU acceleration with WebGPU when available
- Falls back to CPU processing using WebAssembly

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **ML Framework**: ONNX Runtime Web
- **Segmentation Model**: Segment Anything (SAM) in ONNX format
- **Acceleration**: WebGPU (GPU) and WebAssembly (CPU)

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/image-clipper.git
   cd image-clipper
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Download the model files:
   - See instructions in `public/models/README.md`
   - You need to download the SAM encoder and decoder ONNX models

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Browser Compatibility

- Best experience with Chrome or Edge (version 113+) which support WebGPU
- Works with Firefox and Safari but with reduced performance (CPU only)
- Requires a modern browser with WebAssembly support

## How It Works

1. **Upload**: Upload any image you want to process
2. **Segment**: Click "Segment Image" to detect objects in the image
3. **Select**: Choose the detected segments you want to extract
4. **Download**: Click "Download Selected Segments" to get a transparent PNG

The segmentation is performed client-side using the Segment Anything Model (SAM) from Meta AI, converted to ONNX format and accelerated with WebGPU when available. This approach ensures privacy (your images are processed locally and never sent to a server) and good performance.

## License

[MIT License](LICENSE)

## Acknowledgements

- [Meta AI's Segment Anything Model](https://segment-anything.com/)
- [ONNX Runtime Web](https://onnxruntime.ai/)
- [Next.js](https://nextjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
