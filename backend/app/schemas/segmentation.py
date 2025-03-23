from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class SegmentationRequest(BaseModel):
    """Request model for segmentation endpoint."""
    points: Optional[List[List[int]]] = None
    point_labels: Optional[List[int]] = None
    mode: str = "auto"  # "auto", "point", "box"
    box: Optional[List[int]] = None  # [x1, y1, x2, y2]


class Mask(BaseModel):
    """Model representing a single mask."""
    id: int
    score: float
    bbox: List[int]  # [x, y, width, height]
    mask_data: List[int]  # Base64 encoded binary mask data
    area: int


class SegmentationResult(BaseModel):
    """Response model for segmentation endpoint."""
    masks: List[Mask]
    image_width: int
    image_height: int


class ExportRequest(BaseModel):
    """Request model for export endpoint."""
    mask_ids: List[int] 