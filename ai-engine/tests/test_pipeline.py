from pathlib import Path
from app.services.analysis_service import analysis_service


def test_real_hyperspectral_pipeline_execution():
    """Test full scientific pipeline with Indian Pines real dataset."""
    result = analysis_service.execute_pipeline(
        analysis_id="test_analysis_indian_pines",
        scene_id="Indian_pines",
        algorithm="rxd",
        algorithm_configuration={
            "regularization": 1e-4,
            "normalization": "l2",
            "threshold_percentile": 99.0,
        },
    )

    assert result["status"] == "success"
    assert result["algorithm"] == "rxd"
    assert result["metrics"]["pixel_count"] == 145 * 145
    assert result["metrics"]["input_bands"] == 200
    assert result["metrics"]["detected_features_count"] >= 1
    assert "evaluation" in result["metrics"]
    assert result["metrics"]["evaluation"]["auc"] > 0.0

    # Verify output files exist
    assert Path(result["artifacts"]["raster_storage_key"]).exists()
    assert Path(result["artifacts"]["vector_storage_key"]).exists()
    assert Path(result["artifacts"]["preview_storage_key"]).exists()


def test_target_detection_pipeline_execution():
    """Test Matched Filter target detection with real dataset."""
    result = analysis_service.execute_pipeline(
        analysis_id="test_analysis_mf",
        scene_id="Indian_pines",
        algorithm="matched_filter",
        algorithm_configuration={
            "regularization": 1e-4,
            "threshold_percentile": 98.0,
            "colormap": "magma",
        },
    )

    assert result["status"] == "success"
    assert result["algorithm"] == "matched_filter"
    assert result["result_type"] == "target_detection"
    assert result["metrics"]["evaluation"]["auc"] > 0.0


def test_cem_detection_pipeline_execution():
    """Test CEM detection with real dataset."""
    result = analysis_service.execute_pipeline(
        analysis_id="test_analysis_cem",
        scene_id="Indian_pines",
        algorithm="cem",
        algorithm_configuration={
            "regularization": 1e-4,
            "threshold_percentile": 98.0,
        },
    )

    assert result["status"] == "success"
    assert result["algorithm"] == "cem"
    assert result["metrics"]["evaluation"]["auc"] > 0.0


def test_fusion_pipeline_execution():
    """Test detection fusion pipeline with real dataset."""
    result = analysis_service.execute_pipeline(
        analysis_id="test_analysis_fusion",
        scene_id="Indian_pines",
        algorithm="fusion",
        algorithm_configuration={
            "regularization": 1e-4,
            "alpha": 0.6,
        },
    )

    assert result["status"] == "success"
    assert result["algorithm"] == "fusion"

