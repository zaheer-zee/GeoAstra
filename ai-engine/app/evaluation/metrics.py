from typing import Dict, Any, Optional, List, Tuple
import numpy as np
from sklearn.metrics import roc_curve, auc, precision_recall_fscore_support


def evaluate_detection(
    scores: np.ndarray,
    ground_truth: np.ndarray,
    target_class: Optional[int] = None,
    background_class: int = 0,
) -> Dict[str, Any]:
    """
    Evaluate detector score performance against ground truth mask.
    
    Args:
        scores: 1D array of continuous detector scores (or 2D map flattened).
        ground_truth: 1D or 2D array of class labels.
        target_class: specific class ID considered the target. If None, any non-background pixel is target.
        background_class: label ID representing unlabelled / background pixels (default: 0).
        
    Returns:
        Dictionary containing AUC, Pd at fixed Pfa thresholds, optimal threshold, precision, recall, F1.
    """
    flat_scores = np.asarray(scores, dtype=np.float64).flatten()
    flat_gt = np.asarray(ground_truth).flatten()

    if flat_scores.shape != flat_gt.shape:
        raise ValueError(
            f"Shape mismatch: scores ({flat_scores.shape}) vs ground truth ({flat_gt.shape})"
        )

    # Filter out unlabelled background pixels if testing specific target vs other classes
    # If target_class is specified, binary mask = (flat_gt == target_class)
    # If target_class is None, binary mask = (flat_gt != background_class)
    if target_class is not None:
        binary_gt = (flat_gt == target_class).astype(int)
    else:
        binary_gt = (flat_gt != background_class).astype(int)

    n_targets = int(np.sum(binary_gt))
    n_background = int(len(binary_gt) - n_targets)

    if n_targets == 0:
        return {
            "error": "No positive target pixels found in ground truth mask",
            "target_count": 0,
            "background_count": n_background,
            "auc": 0.0,
        }

    # 1. Compute ROC curve
    fpr, tpr, thresholds = roc_curve(binary_gt, flat_scores)
    roc_auc = float(auc(fpr, tpr))

    # 2. Pd (detection rate) at fixed Pfa (false alarm rate)
    # Common benchmark points: Pfa = 0.01 (1%), 0.001 (0.1%), 0.05 (5%)
    pfa_targets = [0.001, 0.01, 0.05, 0.10]
    pd_at_pfa = {}
    for pfa_val in pfa_targets:
        idx = np.where(fpr <= pfa_val)[0]
        pd_at_pfa[f"pd_at_pfa_{pfa_val}"] = float(tpr[idx[-1]]) if len(idx) > 0 else 0.0

    # 3. Find threshold maximizing Youden's J statistic (TPR - FPR)
    j_scores = tpr - fpr
    best_idx = int(np.argmax(j_scores))
    best_threshold = float(thresholds[best_idx])

    # 4. Binary predictions at optimal threshold
    binary_preds = (flat_scores >= best_threshold).astype(int)
    precision, recall, f1, _ = precision_recall_fscore_support(
        binary_gt, binary_preds, average="binary", zero_division=0
    )

    # Subsample ROC points for compact JSON serialization
    n_points = min(len(fpr), 50)
    subsample_indices = np.linspace(0, len(fpr) - 1, n_points, dtype=int)
    roc_samples = [
        {"pfa": float(fpr[i]), "pd": float(tpr[i]), "threshold": float(thresholds[i])}
        for i in subsample_indices
    ]

    return {
        "auc": roc_auc,
        "target_count": n_targets,
        "background_count": n_background,
        "optimal_threshold": best_threshold,
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "pd_at_fixed_pfa": pd_at_pfa,
        "roc_curve_samples": roc_samples,
    }

