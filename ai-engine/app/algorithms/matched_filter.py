from typing import Tuple, Dict, Any
import numpy as np


def compute_matched_filter(
    pixels: np.ndarray,
    target_spectrum: np.ndarray,
    regularization: float = 1e-4,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Compute Matched Filter (MF) spectral target detection.
    
    Formula:
        MF(x) = ((t - mu)^T * inv(Sigma_reg) * (x - mu)) / ((t - mu)^T * inv(Sigma_reg) * (t - mu))
        
    Args:
        pixels: (N, B) array of spectral pixels.
        target_spectrum: (B,) array representing the reference target signature.
        regularization: diagonal loading factor for covariance regularization.
        
    Returns:
        scores: (N,) array of matched filter detection scores.
        metadata: dictionary of statistics and runtime information.
    """
    n_samples, n_bands = pixels.shape
    target = np.asarray(target_spectrum, dtype=np.float64).flatten()

    if target.shape[0] != n_bands:
        raise ValueError(
            f"Target spectrum band count ({target.shape[0]}) does not match pixel band count ({n_bands})"
        )

    # 1. Background mean
    mu = np.mean(pixels, axis=0)
    centered = pixels - mu
    target_centered = target - mu

    # 2. Sample covariance
    cov = np.cov(centered, rowvar=False)

    # 3. Regularization / diagonal loading
    diag_load = regularization * (np.trace(cov) / max(n_bands, 1))
    reg_cov = cov + diag_load * np.eye(n_bands)

    # 4. Invert regularized covariance
    try:
        inv_cov = np.linalg.pinv(reg_cov)
    except np.linalg.LinAlgError:
        inv_cov = np.linalg.inv(reg_cov + 1e-2 * np.eye(n_bands))

    # 5. Filter vector: q = inv_cov * target_centered
    q = np.dot(inv_cov, target_centered)
    denominator = np.dot(target_centered, q)

    if np.isclose(denominator, 0.0) or np.isnan(denominator):
        denominator = 1e-12

    # 6. Vectorized scoring: (centered @ q) / denominator
    scores = np.dot(centered, q) / denominator

    metadata = {
        "algorithm": "matched_filter",
        "sample_count": int(n_samples),
        "band_count": int(n_bands),
        "regularization_lambda": float(diag_load),
        "denominator": float(denominator),
        "score_min": float(np.min(scores)),
        "score_max": float(np.max(scores)),
        "score_mean": float(np.mean(scores)),
        "score_std": float(np.std(scores)),
    }

    return scores, metadata

