from typing import Tuple, Dict, Any
import numpy as np


def compute_rxd(
    pixels: np.ndarray,
    regularization: float = 1e-4,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Compute Reed-Xiaoli Detector (RXD) statistical anomaly detection.
    
    Formula:
        r(x) = (x - mu)^T * inv(Sigma + lambda*I) * (x - mu)
        
    Args:
        pixels: (N, B) array of spectral pixels
        regularization: diagonal loading factor to prevent covariance singularity
        
    Returns:
        scores: (N,) array of anomaly scores (Mahalanobis distance squared)
        metadata: dictionary of runtime statistics (mean, variance, condition number)
    """
    n_samples, n_bands = pixels.shape

    # 1. Background mean
    mu = np.mean(pixels, axis=0)
    centered = pixels - mu

    # 2. Covariance matrix
    cov = np.cov(centered, rowvar=False)

    # 3. Regularization / diagonal loading
    diag_load = regularization * (np.trace(cov) / max(n_bands, 1))
    reg_cov = cov + diag_load * np.eye(n_bands)

    # 4. Invert or solve regularized covariance
    try:
        inv_cov = np.linalg.pinv(reg_cov)
    except np.linalg.LinAlgError:
        inv_cov = np.linalg.inv(reg_cov + 1e-2 * np.eye(n_bands))

    # 5. Vectorized Mahalanobis distance squared
    # r_i = (x_i - mu)^T * inv_cov * (x_i - mu)
    temp = np.dot(centered, inv_cov)
    scores = np.sum(temp * centered, axis=1)

    # Ensure non-negative scores
    scores = np.maximum(scores, 0.0)

    metadata = {
        "algorithm": "rxd",
        "sample_count": int(n_samples),
        "band_count": int(n_bands),
        "regularization_lambda": float(diag_load),
        "score_min": float(np.min(scores)),
        "score_max": float(np.max(scores)),
        "score_mean": float(np.mean(scores)),
        "score_std": float(np.std(scores)),
    }

    return scores, metadata

