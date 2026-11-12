from typing import Tuple, Dict, Any
import numpy as np


def compute_cem(
    pixels: np.ndarray,
    target_spectrum: np.ndarray,
    regularization: float = 1e-4,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Compute Constrained Energy Minimization (CEM) target detection.
    
    Formula:
        CEM(x) = (t^T * inv(R_reg) * x) / (t^T * inv(R_reg) * t)
        where R is the sample correlation matrix: R = (1/N) * X^T * X
        
    Args:
        pixels: (N, B) array of spectral pixels.
        target_spectrum: (B,) array representing the reference target signature.
        regularization: diagonal loading factor for correlation regularization.
        
    Returns:
        scores: (N,) array of CEM detection scores.
        metadata: dictionary of statistics and runtime information.
    """
    n_samples, n_bands = pixels.shape
    target = np.asarray(target_spectrum, dtype=np.float64).flatten()

    if target.shape[0] != n_bands:
        raise ValueError(
            f"Target spectrum band count ({target.shape[0]}) does not match pixel band count ({n_bands})"
        )

    # 1. Sample correlation matrix R = (X^T * X) / N
    R = np.dot(pixels.T, pixels) / max(n_samples, 1)

    # 2. Regularization / diagonal loading
    diag_load = regularization * (np.trace(R) / max(n_bands, 1))
    reg_R = R + diag_load * np.eye(n_bands)

    # 3. Invert correlation matrix
    try:
        inv_R = np.linalg.pinv(reg_R)
    except np.linalg.LinAlgError:
        inv_R = np.linalg.inv(reg_R + 1e-2 * np.eye(n_bands))

    # 4. Weight vector: w = (inv_R * t) / (t^T * inv_R * t)
    inv_R_t = np.dot(inv_R, target)
    denominator = np.dot(target, inv_R_t)

    if np.isclose(denominator, 0.0) or np.isnan(denominator):
        denominator = 1e-12

    # 5. Vectorized scoring: CEM(x) = x @ w
    scores = np.dot(pixels, inv_R_t) / denominator

    metadata = {
        "algorithm": "cem",
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

