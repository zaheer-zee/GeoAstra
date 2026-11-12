from typing import Optional, Dict, Any
from pathlib import Path
import numpy as np
import rasterio
from rasterio.transform import Affine, from_bounds
from rasterio.crs import CRS


def export_geotiff(
    scores_2d: np.ndarray,
    output_path: str,
    crs: str = "EPSG:4326",
    transform: Optional[Affine] = None,
    bounds: Optional[tuple] = None,
    nodata: Optional[float] = -9999.0,
) -> Dict[str, Any]:
    """
    Export a 2D continuous detection/anomaly score map to a georeferenced GeoTIFF.
    
    Args:
        scores_2d: (H, W) array of scores.
        output_path: destination file path.
        crs: Coordinate Reference System (default: 'EPSG:4326').
        transform: Affine transform. If None, computed from bounds or default unit coordinates.
        bounds: (west, south, east, north) bounding box if transform is not explicitly provided.
        nodata: Value to represent NoData / masked pixels.
        
    Returns:
        Metadata dictionary about the written raster.
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    height, width = scores_2d.shape

    # Determine transform
    if transform is None:
        if bounds is not None:
            west, south, east, north = bounds
            transform = from_bounds(west, south, east, north, width, height)
        else:
            # Fallback to an affine grid: 1 pixel = 0.0001 degrees (~11 meters)
            transform = Affine.translation(0.0, 0.0) @ Affine.scale(0.0001, -0.0001)

    crs_obj = CRS.from_user_input(crs)

    raster_data = scores_2d.astype(np.float32)
    if nodata is not None:
        raster_data = np.nan_to_num(raster_data, nan=nodata)

    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=1,
        dtype=np.float32,
        crs=crs_obj,
        transform=transform,
        nodata=nodata,
        compress="lzw",
    ) as dst:
        dst.write(raster_data, 1)

    return {
        "format": "GeoTIFF",
        "path": str(path),
        "width": width,
        "height": height,
        "crs": crs_obj.to_string(),
        "transform": list(transform)[:6],
        "file_size_bytes": path.stat().st_size,
    }
