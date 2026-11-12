import pytest
import numpy as np

from app.preprocessing.validation import validate_cube, cube_to_matrix, matrix_to_cube
from app.preprocessing.bad_bands import identify_bad_bands, remove_bad_bands
from app.preprocessing.normalization import normalize_spectra
from app.preprocessing.dimensionality import reduce_dimension_pca
from app.algorithms.rxd import compute_rxd
from app.algorithms.matched_filter import compute_matched_filter
from app.algorithms.cem import compute_cem
from app.algorithms.fusion import compute_score_fusion, normalize_score_map


@pytest.fixture
def synthetic_hyperspectral_cube():
    """Generates a controlled 30x30x20 hyperspectral cube with an injected anomaly."""
    rng = np.random.default_rng(seed=42)
    h, w, b = 30, 30, 20
    # Background: normal distribution
    cube = rng.normal(loc=0.5, scale=0.05, size=(h, w, b)).clip(0.1, 0.9)
    # Inject strong anomaly at pixel (15, 15)
    cube[15, 15, :] = rng.normal(loc=0.9, scale=0.01, size=(b,))
    return cube


def test_cube_validation_and_reshaping(synthetic_hyperspectral_cube):
    validated = validate_cube(synthetic_hyperspectral_cube)
    assert validated.shape == (30, 30, 20)
    assert np.all(np.isfinite(validated))

    matrix, shape = cube_to_matrix(synthetic_hyperspectral_cube)
    assert matrix.shape == (900, 20)
    assert shape == (30, 30, 20)

    reconstructed = matrix_to_cube(matrix, (30, 30, 20))
    assert np.allclose(reconstructed, synthetic_hyperspectral_cube)


def test_bad_bands_detection():
    rng = np.random.default_rng(seed=123)
    cube = rng.uniform(0.1, 0.8, size=(20, 20, 10))
    # Make band 2 completely zero (dead band)
    cube[:, :, 2] = 0.0
    # Make band 7 contain constant values (zero variance)
    cube[:, :, 7] = 0.5

    good_mask = identify_bad_bands(cube)
    bad_indices = np.where(~good_mask)[0]
    assert 2 in bad_indices
    assert 7 in bad_indices

    cleaned, _, mask = remove_bad_bands(cube)
    assert cleaned.shape == (20, 20, 8)
    assert np.sum(mask) == 8


def test_normalization_methods(synthetic_hyperspectral_cube):
    l2_cube, meta_l2 = normalize_spectra(synthetic_hyperspectral_cube, method="l2")
    norms = np.linalg.norm(l2_cube, axis=2)
    assert np.allclose(norms, 1.0, atol=1e-5)
    assert meta_l2["method"] == "l2"

    std_cube, meta_std = normalize_spectra(synthetic_hyperspectral_cube, method="standard")
    assert meta_std["method"] == "standard"
    assert std_cube.shape == (30, 30, 20)


def test_pca_dimensionality_reduction(synthetic_hyperspectral_cube):
    pixels, _ = cube_to_matrix(synthetic_hyperspectral_cube)
    reduced, meta = reduce_dimension_pca(pixels, n_components=5)
    assert reduced.shape == (900, 5)
    assert meta["target_dimensions"] == 5
    assert meta["cumulative_variance_explained"] > 0.25


def test_rxd_anomaly_detector(synthetic_hyperspectral_cube):
    pixels, _ = cube_to_matrix(synthetic_hyperspectral_cube)
    scores, meta = compute_rxd(pixels)

    assert scores.shape == (900,)
    assert meta["algorithm"] == "rxd"
    assert np.all(scores >= 0)

    # Injected anomaly at (15, 15) -> index 15*30 + 15 = 465
    target_idx = 15 * 30 + 15
    assert scores[target_idx] == np.max(scores)


def test_matched_filter_detector(synthetic_hyperspectral_cube):
    pixels, _ = cube_to_matrix(synthetic_hyperspectral_cube)
    target_idx = 15 * 30 + 15
    target_spectrum = pixels[target_idx].copy()

    scores, meta = compute_matched_filter(pixels, target_spectrum)
    assert scores.shape == (900,)
    assert meta["algorithm"] == "matched_filter"
    assert np.argmax(scores) == target_idx


def test_cem_detector(synthetic_hyperspectral_cube):
    pixels, _ = cube_to_matrix(synthetic_hyperspectral_cube)
    target_idx = 15 * 30 + 15
    target_spectrum = pixels[target_idx].copy()

    scores, meta = compute_cem(pixels, target_spectrum)
    assert scores.shape == (900,)
    assert meta["algorithm"] == "cem"
    # Target pixel must satisfy theoretical CEM constraint: CEM(t) = 1.0
    assert np.isclose(scores[target_idx], 1.0, atol=1e-2)
    assert scores[target_idx] >= np.percentile(scores, 95)


def test_detection_fusion():
    target_scores = np.array([0.1, 0.2, 0.9, 0.15])
    anomaly_scores = np.array([0.05, 0.1, 0.85, 0.2])

    fused, meta = compute_score_fusion(target_scores, anomaly_scores, alpha=0.5)
    assert fused.shape == (4,)
    assert meta["algorithm"] == "fusion"
    assert np.all(fused >= 0.0) and np.all(fused <= 1.0)
    assert np.argmax(fused) == 2
