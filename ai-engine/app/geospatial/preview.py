from typing import Optional, Dict, Any
from pathlib import Path
import numpy as np
import matplotlib.cm as cm
from PIL import Image


def generate_png_preview(
    scores_2d: np.ndarray,
    output_path: str,
    colormap_name: str = "inferno",
    clip_percentiles: tuple = (1.0, 99.0),
    transparency_threshold: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Generate an 8-bit RGBA PNG preview heatmap for client UI rendering.
    
    Args:
        scores_2d: (H, W) array of scores.
        output_path: destination .png path.
        colormap_name: matplotlib colormap name ('inferno', 'viridis', 'magma', etc.).
        clip_percentiles: percentiles to clip extreme values.
        transparency_threshold: optional cutoff below which pixels are made fully transparent.
        
    Returns:
        Metadata about the written image.
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Percentile clipping to preserve contrast
    p_low, p_high = np.percentile(scores_2d, clip_percentiles)
    clipped = np.clip(scores_2d, p_low, p_high)

    val_range = p_high - p_low
    if np.isclose(val_range, 0.0) or np.isnan(val_range):
        normalized = np.zeros_like(scores_2d, dtype=np.float32)
    else:
        normalized = ((clipped - p_low) / val_range).astype(np.float32)

    # 2. Apply matplotlib colormap
    try:
        cmap = cm.get_cmap(colormap_name)
    except AttributeError:
        # matplotlib >= 3.7 colormap access
        import matplotlib.pyplot as plt
        cmap = plt.colormaps[colormap_name]

    rgba_floats = cmap(normalized)  # (H, W, 4) in [0.0, 1.0]
    rgba_bytes = (rgba_floats * 255).astype(np.uint8)

    # Optional background transparency below threshold
    if transparency_threshold is not None:
        mask = scores_2d < transparency_threshold
        rgba_bytes[mask, 3] = 0

    img = Image.fromarray(rgba_bytes, mode="RGBA")
    img.save(path, format="PNG")

    return {
        "format": "PNG",
        "path": str(path),
        "width": img.width,
        "height": img.height,
        "colormap": colormap_name,
        "file_size_bytes": path.stat().st_size,
    }

