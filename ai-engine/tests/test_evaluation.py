import numpy as np
from app.evaluation.metrics import evaluate_detection


def test_evaluate_detection_metrics():
    # 100 pixels, 10 targets
    ground_truth = np.zeros(100, dtype=int)
    ground_truth[10:20] = 1

    # Perfect detector scores
    scores = np.random.uniform(0.0, 0.4, size=100)
    scores[10:20] = np.random.uniform(0.8, 1.0, size=10)

    results = evaluate_detection(scores, ground_truth)

    assert results["auc"] >= 0.95
    assert results["target_count"] == 10
    assert results["background_count"] == 90
    assert results["f1_score"] >= 0.90
    assert "pd_at_fixed_pfa" in results
    assert "roc_curve_samples" in results
    assert results["pd_at_fixed_pfa"]["pd_at_pfa_0.01"] >= 0.8

