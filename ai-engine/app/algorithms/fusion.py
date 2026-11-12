from typing import Tuple, Dict, Any
import numpy as np


def normalize_score_map(scores: np.ndarray, clip_percentiles: Tuple[float, float] = (1.0, 99.0)) -> np.ndarray:
    """
    Robust min-max normalization into [0, 1] using percentile clipping
    to prevent extreme outliers from crushing the dynamic range.
    """
    p_low, p_high = np.percentile(scores, clip_percentiles)
    clipped = np.clip(scores, p_low, p_high)
    val_range = p_high - p_low
    if np.isclose(val_range, 0.0) or np.isnan(val_range):
        return np.zeros_like(scores, dtype=np.float64)
    return (clipped - p_low) / val_range


def compute_score_fusion(
    target_scores: np.ndarray,
    anomaly_scores: np.ndarray,
    alpha: float = 0.5,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Experimental detection fusion:
        F(x) = alpha * target_norm(x) + (1 - alpha) * anomaly_norm(x)
        
    Args:
        target_scores: scores from MF or CEM target detector
        anomaly_scores: scores from RXD anomaly detector
        alpha: fusion weighting factor between 0.0 and 1.0 (default 0.5)
        
    Returns:
        fused_scores: (N,) combined detection score map in [0, 1]
        metadata: fusion weights and score statistics
    """
    if target_scores.shape != anomaly_scores.shape:
        raise ValueError("Target scores and anomaly scores must have identical shape")

    alpha_clamped = float(np.clip(alpha, 0.0, 1.0))

    norm_target = normalize_score_map(target_scores)
    norm_anomaly = normalize_score_map(anomaly_scores)

    fused_scores = alpha_clamped * norm_target + (1.0 - alpha_clamped) * norm_anomaly

    metadata = {
        "algorithm": "fusion",
        "alpha": alpha_clamped,
        "sample_count": int(fused_scores.size),
        "target_score_mean": float(np.mean(target_scores)),
        "anomaly_score_mean": float(np.mean(anomaly_scores)),
        "fused_min": float(np.min(fused_scores)),
        "fused_max": float(np.max(fused_scores)),
        "fused_mean": float(np.mean(fused_scores)),
        "fused_std": float(np.std(fused_scores)),
    }

    return fused_scores, metadata

