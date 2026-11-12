from typing import Tuple, Dict, Any
import numpy as np


def normalize_spectra(
    data: np.ndarray, method: str = "l2", eps: float = 1e-8
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Normalize spectral data (2D matrix of shape (N, B) or 3D cube of shape (H, W, B)).
    
    Methods:
      - 'l2': Unit L2 norm per pixel (spectral angle invariant)
      - 'standard': Zero-mean, unit-variance per band
      - 'minmax': Scale between 0 and 1 per band
      
    Returns:
      (normalized_data, metadata_dict)
    """
    is_3d = data.ndim == 3
    if is_3d:
        h, w, b = data.shape
        pixels = data.reshape((h * w, b)).copy()
    else:
        pixels = data.copy()

    if method == "l2":
        norms = np.linalg.norm(pixels, axis=1, keepdims=True)
        norms = np.maximum(norms, eps)
        norm_pixels = pixels / norms

    elif method == "standard":
        mean = np.mean(pixels, axis=0, keepdims=True)
        std = np.std(pixels, axis=0, keepdims=True)
        std = np.maximum(std, eps)
        norm_pixels = (pixels - mean) / std

    elif method == "minmax":
        min_val = np.min(pixels, axis=0, keepdims=True)
        max_val = np.max(pixels, axis=0, keepdims=True)
        diff = np.maximum(max_val - min_val, eps)
        norm_pixels = (pixels - min_val) / diff

    else:
        norm_pixels = pixels

    if is_3d:
        result = norm_pixels.reshape((h, w, b))
    else:
        result = norm_pixels

    meta = {
        "method": method,
        "input_shape": list(data.shape),
        "output_shape": list(result.shape),
    }

    return result, meta
