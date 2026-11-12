from typing import Tuple, Optional, Dict, Any
import numpy as np
from sklearn.decomposition import PCA


def reduce_dimension_pca(
    pixels: np.ndarray,
    n_components: Optional[int] = None,
    variance_ratio: float = 0.99,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Apply Principal Component Analysis (PCA) to reduce spectral dimensionality.
    If n_components is None, select components explaining `variance_ratio` of variance.
    
    Returns:
        (transformed_pixels, metadata_dict)
    """
    n_samples, n_features = pixels.shape
    max_components = min(n_samples, n_features)

    if n_components is None:
        pca = PCA(n_components=variance_ratio, svd_solver="full")
    else:
        target_components = min(n_components, max_components)
        pca = PCA(n_components=target_components)

    transformed = pca.fit_transform(pixels)
    explained = float(np.sum(pca.explained_variance_ratio_))

    meta = {
        "original_dimensions": n_features,
        "target_dimensions": transformed.shape[1],
        "cumulative_variance_explained": explained,
    }

    return transformed, meta
