from typing import Tuple, Union
import numpy as np


class PreprocessingError(Exception):
    pass


def validate_cube(cube: np.ndarray) -> np.ndarray:
    """
    Validate that input is a valid 3D hyperspectral cube (H x W x B)
    or 2D spectral matrix (N x B), containing finite numerical data.
    """
    if not isinstance(cube, np.ndarray):
        cube = np.asarray(cube)

    if cube.ndim not in (2, 3):
        raise PreprocessingError(f"Expected 2D or 3D array, got shape {cube.shape}")

    if cube.ndim == 3:
        h, w, b = cube.shape
        if h < 2 or w < 2 or b < 2:
            raise PreprocessingError(f"Hyperspectral dimensions too small: {cube.shape}")
    else:
        n, b = cube.shape
        if n < 2 or b < 2:
            raise PreprocessingError(f"Hyperspectral dimensions too small: {cube.shape}")

    # Handle float conversion
    if not np.issubdtype(cube.dtype, np.floating):
        cube = cube.astype(np.float64)

    # Check and clean non-finite values
    if not np.isfinite(cube).all():
        cube = np.nan_to_num(cube, nan=0.0, posinf=0.0, neginf=0.0)

    return cube


def cube_to_matrix(cube: np.ndarray) -> Tuple[np.ndarray, Tuple[int, int, int]]:
    """
    Convert (H, W, B) cube to 2D matrix (N, B) where N = H * W.
    Returns (pixels, (H, W, B)).
    """
    validated = validate_cube(cube)
    if validated.ndim == 2:
        n, b = validated.shape
        return validated, (1, n, b)

    h, w, b = validated.shape
    pixels = validated.reshape((h * w, b))
    return pixels, (h, w, b)


def matrix_to_cube(
    pixels: np.ndarray, shape: Union[Tuple[int, int], Tuple[int, int, int]]
) -> np.ndarray:
    """
    Convert 2D matrix back to 3D cube (H, W, B) or 2D raster (H, W).
    """
    if len(shape) == 2:
        h, w = shape
        return pixels.reshape((h, w))
    elif len(shape) == 3:
        h, w, b = shape
        return pixels.reshape((h, w, b))
    else:
        raise ValueError(f"Invalid shape tuple: {shape}")
