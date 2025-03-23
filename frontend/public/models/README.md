# Model Files for Image-Clipper

This directory needs to contain the segmentation model files in ONNX format.

## Model Files Required

1. `sam_vit_b_encoder.onnx` - The SAM encoder model
2. `sam_vit_b_decoder.onnx` - The SAM decoder model

## Download Links

You can download the required models from these sources:

### Option 1: Direct Download
- Encoder: https://github.com/YuanGongND/sam_onnx_inference/raw/main/vit_b_encoder.onnx
- Decoder: https://github.com/YuanGongND/sam_onnx_inference/raw/main/vit_b_decoder.onnx

After downloading, rename them to match the names above.

### Option 2: Export from PyTorch

If you prefer to export the models yourself from PyTorch:

1. Clone the repository: https://github.com/facebookresearch/segment-anything
2. Follow the instructions to export to ONNX format
3. Place the exported ONNX files in this directory

## Usage

Once the model files are placed in this directory, the application will automatically load them on startup. 