from typing import Dict, Any, Optional, List
import json
from pathlib import Path
import numpy as np
import rasterio.features
from rasterio.transform import Affine, from_bounds


def polygonize_detections(
    scores_2d: np.ndarray,
    threshold: Optional[float] = None,
    threshold_percentile: float = 99.0,
    min_pixel_area: int = 2,
    transform: Optional[Affine] = None,
    bounds: Optional[tuple] = None,
    output_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Polygonize anomalous/target regions above a threshold into a GeoJSON FeatureCollection.
    
    Args:
        scores_2d: (H, W) continuous detection score raster.
        threshold: absolute score cutoff. If None, derived from threshold_percentile.
        threshold_percentile: percentile to use if threshold is None (e.g. 99th percentile).
        min_pixel_area: minimum number of connected pixels to keep as a detection cluster.
        transform: Affine transform for spatial coordinates.
        bounds: (west, south, east, north) if transform is not specified.
        output_path: optional path to save the .geojson file.
        
    Returns:
        GeoJSON FeatureCollection dictionary.
    """
    height, width = scores_2d.shape

    if transform is None:
        if bounds is not None:
            west, south, east, north = bounds
            transform = from_bounds(west, south, east, north, width, height)
        else:
            transform = Affine.translation(0.0, 0.0) @ Affine.scale(0.0001, -0.0001)

    # 1. Determine threshold cutoff
    if threshold is None:
        threshold = float(np.percentile(scores_2d, threshold_percentile))

    # 2. Binary detection mask
    binary_mask = (scores_2d >= threshold).astype(np.uint8)

    # 3. Extract polygon shapes
    features: List[Dict[str, Any]] = []
    shapes = rasterio.features.shapes(binary_mask, mask=(binary_mask == 1), transform=transform)

    detection_id = 1
    for geom, value in shapes:
        if value != 1:
            continue

        # Extract raster mask corresponding to this geometry to compute polygon statistics
        geom_mask = rasterio.features.geometry_mask(
            [geom],
            out_shape=(height, width),
            transform=transform,
            invert=True,
        )
        pixel_count = int(np.sum(geom_mask))
        if pixel_count < min_pixel_area:
            continue

        cluster_scores = scores_2d[geom_mask]
        mean_score = float(np.mean(cluster_scores))
        max_score = float(np.max(cluster_scores))

        features.append({
            "type": "Feature",
            "id": f"det_{detection_id}",
            "geometry": geom,
            "properties": {
                "detection_id": detection_id,
                "threshold_applied": float(threshold),
                "pixel_count": pixel_count,
                "mean_score": mean_score,
                "max_score": max_score,
                "confidence": min(1.0, max_score / (threshold * 1.5 if threshold > 0 else 1.0)),
            },
        })
        detection_id += 1

    feature_collection = {
        "type": "FeatureCollection",
        "metadata": {
            "feature_count": len(features),
            "threshold": float(threshold),
            "threshold_percentile": float(threshold_percentile) if threshold is None else None,
            "min_pixel_area": min_pixel_area,
        },
        "features": features,
    }

    if output_path:
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "w", encoding="utf-8") as f:
            json.dump(feature_collection, f, indent=2)

    return feature_collection
