from typing import Optional, Tuple
import numpy as np


def identify_bad_bands(
    cube: np.ndarray,
    wavelengths: Optional[np.ndarray] = None,
    variance_threshold: float = 1e-8,
) -> np.ndarray:
    """
    Identify bad or uninformative spectral bands.
    Returns a boolean mask where True = valid/good band, False = bad band to remove.
    """
    if cube.ndim == 3:
        h, w, b = cube.shape
        pixels = cube.reshape((h * w, b))
    else:
        pixels = cube
        b = pixels.shape[1]

    good_bands = np.ones(b, dtype=bool)

    # 1. Variance check: flag dead or constant bands
    variances = np.var(pixels, axis=0)
    good_bands = good_bands & (variances > variance_threshold)

    # 2. Wavelength-based water absorption check if wavelengths provided (in nm)
    if wavelengths is not None and len(wavelengths) == b:
        # Strong water vapor absorption regions in atmosphere
        water_absorption_regions = [
            (1350.0, 1450.0),
            (1800.0, 1950.0),
            (2450.0, 3000.0),
        ]
        for start_nm, end_nm in water_absorption_regions:
            in_water_window = (wavelengths >= start_nm) & (wavelengths <= end_nm)
            good_bands = good_bands & (~in_water_window)

    # Ensure we don't accidentally remove all bands
    if not np.any(good_bands):
        # Fallback: keep all bands if filter was too aggressive
        return np.ones(b, dtype=bool)

    return good_bands


def remove_bad_bands(
    cube: np.ndarray,
    wavelengths: Optional[np.ndarray] = None,
    variance_threshold: float = 1e-8,
) -> Tuple[np.ndarray, Optional[np.ndarray], np.ndarray]:
    """
    Filter out bad bands from the hyperspectral cube.
    Returns (cleaned_cube, cleaned_wavelengths, good_bands_mask).
    """
    good_mask = identify_bad_bands(cube, wavelengths, variance_threshold)

    if cube.ndim == 3:
        cleaned_cube = cube[:, :, good_mask]
    else:
        cleaned_cube = cube[:, good_mask]

    cleaned_wavelengths = (
        wavelengths[good_mask] if wavelengths is not None else None
    )

    return cleaned_cube, cleaned_wavelengths, good_mask

