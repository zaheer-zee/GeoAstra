import time
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import numpy as np
import scipy.io as sio

from app.preprocessing.validation import validate_cube, cube_to_matrix, matrix_to_cube
from app.preprocessing.bad_bands import identify_bad_bands, remove_bad_bands
from app.preprocessing.normalization import normalize_spectra
from app.preprocessing.dimensionality import reduce_dimension_pca
from app.algorithms.rxd import compute_rxd
from app.algorithms.matched_filter import compute_matched_filter
from app.algorithms.cem import compute_cem
from app.algorithms.fusion import compute_score_fusion
from app.geospatial.raster import export_geotiff
from app.geospatial.vector import polygonize_detections
from app.geospatial.preview import generate_png_preview
from app.evaluation.metrics import evaluate_detection


class ScientificAnalysisService:
    def __init__(self, base_dir: Optional[str] = None):
        if base_dir:
            self.base_dir = Path(base_dir)
        else:
            # Default to repo root
            self.base_dir = Path(__file__).resolve().parent.parent.parent.parent

        self.storage_input = self.base_dir / "storage" / "input"
        self.storage_output = self.base_dir / "storage" / "output"
        self.storage_previews = self.base_dir / "storage" / "previews"

        self.storage_output.mkdir(parents=True, exist_ok=True)
        self.storage_previews.mkdir(parents=True, exist_ok=True)

    def load_scene_cube(self, scene_id: str) -> Tuple[np.ndarray, Optional[np.ndarray], Dict[str, Any]]:
        """
        Load hyperspectral data cube and optional ground truth mask.
        Supports .mat files or generates synthetic hyperspectral cube for testing.
        """
        mat_candidates = [
            self.storage_input / f"{scene_id}.mat",
            self.storage_input / f"{scene_id}_corrected.mat",
            self.storage_input / "Indian_pines_corrected.mat",
            self.storage_input / "PaviaU.mat",
        ]

        for p in mat_candidates:
            if p.exists():
                mat_data = sio.loadmat(str(p))
                keys = [k for k in mat_data.keys() if not k.startswith("__")]
                if keys:
                    cube = np.asarray(mat_data[keys[0]], dtype=np.float64)
                    
                    # Look for corresponding ground truth
                    gt = None
                    gt_candidates = [
                        self.storage_input / f"{p.stem.replace('_corrected', '')}_gt.mat",
                        self.storage_input / f"{p.stem}_gt.mat",
                    ]
                    for gtp in gt_candidates:
                        if gtp.exists():
                            gt_data = sio.loadmat(str(gtp))
                            gt_keys = [k for k in gt_data.keys() if not k.startswith("__")]
                            if gt_keys:
                                gt = np.asarray(gt_data[gt_keys[0]])
                                break

                    meta = {
                        "source": "mat_file",
                        "file_path": str(p),
                        "dataset_name": keys[0],
                        "has_ground_truth": gt is not None,
                    }
                    return cube, gt, meta

        # Fallback to deterministic synthetic scientific cube if no file found
        rng = np.random.default_rng(seed=42)
        h, w, b = 100, 100, 50
        cube = rng.normal(loc=0.3, scale=0.05, size=(h, w, b)).clip(0.01, 1.0)
        # Inject small target/anomaly cluster
        cube[45:50, 45:50, :] += rng.normal(loc=0.4, scale=0.02, size=(5, 5, b))
        gt = np.zeros((h, w), dtype=int)
        gt[45:50, 45:50] = 1

        meta = {
            "source": "synthetic_benchmark",
            "file_path": None,
            "dataset_name": "SyntheticHyperspectralBenchmark",
            "has_ground_truth": True,
        }
        return cube, gt, meta

    def execute_pipeline(
        self,
        analysis_id: str,
        scene_id: str,
        algorithm: str,
        algorithm_configuration: Dict[str, Any],
        target_spectrum: Optional[list] = None,
    ) -> Dict[str, Any]:
        """
        Execute full end-to-end scientific processing pipeline.
        """
        start_time = time.perf_counter()

        # 1. Load data
        raw_cube, ground_truth, scene_meta = self.load_scene_cube(scene_id)
        valid_cube = validate_cube(raw_cube)
        h, w, b = valid_cube.shape

        # 2. Preprocess: Bad bands identification & removal
        clean_cube, _, good_mask = remove_bad_bands(valid_cube)
        clean_b = clean_cube.shape[2]
        bad_bands_count = int(np.sum(~good_mask))

        # 3. Preprocess: Normalization
        norm_method = algorithm_configuration.get("normalization", "l2")
        norm_cube, norm_meta = normalize_spectra(clean_cube, method=norm_method)

        # 4. Flatten to (N, B)
        pixels, _ = cube_to_matrix(norm_cube)

        # Optional: PCA Dimensionality Reduction
        pca_components = algorithm_configuration.get("pca_components")
        pca_meta = None
        if pca_components and int(pca_components) < clean_b:
            pixels, pca_meta = reduce_dimension_pca(pixels, n_components=int(pca_components))
            active_bands = int(pca_components)
        else:
            active_bands = clean_b

        # 5. Algorithm Execution
        algo_name = algorithm.lower().strip()
        algo_meta: Dict[str, Any] = {}
        target_used = None

        if algo_name == "rxd":
            reg = float(algorithm_configuration.get("regularization", 1e-4))
            scores_1d, algo_meta = compute_rxd(pixels, regularization=reg)

        elif algo_name in ("matched_filter", "mf", "cem"):
            if target_spectrum:
                target_used = np.asarray(target_spectrum, dtype=np.float64)
            else:
                if ground_truth is not None and np.any(ground_truth > 0):
                    gt_flat = ground_truth.flatten()
                    target_used = np.mean(pixels[gt_flat > 0], axis=0)
                else:
                    target_used = np.mean(pixels, axis=0) + 0.1

            reg = float(algorithm_configuration.get("regularization", 1e-4))
            if algo_name in ("matched_filter", "mf"):
                scores_1d, algo_meta = compute_matched_filter(pixels, target_used, regularization=reg)
            else:
                scores_1d, algo_meta = compute_cem(pixels, target_used, regularization=reg)

        elif algo_name == "fusion":
            reg = float(algorithm_configuration.get("regularization", 1e-4))
            alpha = float(algorithm_configuration.get("alpha", 0.5))

            if target_spectrum:
                target_used = np.asarray(target_spectrum, dtype=np.float64)
            else:
                if ground_truth is not None and np.any(ground_truth > 0):
                    gt_flat = ground_truth.flatten()
                    target_used = np.mean(pixels[gt_flat > 0], axis=0)
                else:
                    target_used = np.mean(pixels, axis=0) + 0.1

            mf_scores, _ = compute_matched_filter(pixels, target_used, regularization=reg)
            rxd_scores, _ = compute_rxd(pixels, regularization=reg)
            scores_1d, algo_meta = compute_score_fusion(mf_scores, rxd_scores, alpha=alpha)

        else:
            raise ValueError(f"Unsupported algorithm: '{algorithm}'. Supported: rxd, matched_filter, cem, fusion")

        # 6. Reshape to 2D raster
        scores_2d = matrix_to_cube(scores_1d, (h, w))

        # 7. Export Geospatial Artifacts
        raster_filename = f"{analysis_id}_score.tif"
        raster_path = self.storage_output / raster_filename
        raster_info = export_geotiff(scores_2d, str(raster_path))

        vector_filename = f"{analysis_id}_polygons.geojson"
        vector_path = self.storage_output / vector_filename
        vector_info = polygonize_detections(
            scores_2d,
            threshold_percentile=float(algorithm_configuration.get("threshold_percentile", 99.0)),
            output_path=str(vector_path),
        )

        preview_filename = f"{analysis_id}_preview.png"
        preview_path = self.storage_previews / preview_filename
        preview_info = generate_png_preview(
            scores_2d,
            output_path=str(preview_path),
            colormap_name=algorithm_configuration.get("colormap", "inferno"),
        )

        # 8. Evaluation against ground truth if present
        eval_metrics = None
        if ground_truth is not None and ground_truth.shape == (h, w):
            eval_metrics = evaluate_detection(scores_2d, ground_truth)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "status": "success",
            "analysis_id": analysis_id,
            "scene_id": scene_id,
            "algorithm": algo_name,
            "result_type": "anomaly_detection" if algo_name == "rxd" else "target_detection",
            "dataset": scene_meta,
            "metrics": {
                "execution_time_ms": elapsed_ms,
                "input_bands": b,
                "processed_bands": active_bands,
                "bad_bands_removed": bad_bands_count,
                "height": h,
                "width": w,
                "pixel_count": h * w,
                "algorithm_stats": algo_meta,
                "pca_applied": pca_meta is not None,
                "detected_features_count": vector_info["metadata"]["feature_count"],
                "evaluation": eval_metrics,
            },
            "artifacts": {
                "raster_storage_key": f"storage/output/{raster_filename}",
                "vector_storage_key": f"storage/output/{vector_filename}",
                "preview_storage_key": f"storage/previews/{preview_filename}",
            },
        }


analysis_service = ScientificAnalysisService()
