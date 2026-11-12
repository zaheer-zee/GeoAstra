import tempfile
from pathlib import Path
import numpy as np
import rasterio
from PIL import Image

from app.geospatial.raster import export_geotiff
from app.geospatial.vector import polygonize_detections
from app.geospatial.preview import generate_png_preview


def test_export_geotiff(tmp_path):
    scores_2d = np.random.uniform(0.0, 1.0, size=(25, 25)).astype(np.float32)
    output_tif = str(tmp_path / "test_score.tif")

    meta = export_geotiff(scores_2d, output_tif, crs="EPSG:4326")
    assert Path(output_tif).exists()
    assert meta["width"] == 25
    assert meta["height"] == 25

    with rasterio.open(output_tif) as src:
        assert src.width == 25
        assert src.height == 25
        assert src.crs.to_string() == "EPSG:4326"
        data = src.read(1)
        assert np.allclose(data, scores_2d, atol=1e-5)


def test_polygonize_detections(tmp_path):
    # Create 20x20 raster with a 3x3 high score cluster
    scores_2d = np.zeros((20, 20), dtype=np.float32)
    scores_2d[5:8, 5:8] = 0.95

    output_geojson = str(tmp_path / "test_polygons.geojson")
    result = polygonize_detections(
        scores_2d,
        threshold=0.8,
        min_pixel_area=2,
        output_path=output_geojson,
    )

    assert Path(output_geojson).exists()
    assert result["type"] == "FeatureCollection"
    assert len(result["features"]) >= 1

    feature = result["features"][0]
    assert feature["properties"]["pixel_count"] == 9
    assert feature["properties"]["max_score"] >= 0.9


def test_generate_png_preview(tmp_path):
    scores_2d = np.linspace(0.0, 1.0, 400).reshape((20, 20)).astype(np.float32)
    output_png = str(tmp_path / "test_preview.png")

    meta = generate_png_preview(scores_2d, output_png, colormap_name="viridis")
    assert Path(output_png).exists()
    assert meta["width"] == 20
    assert meta["height"] == 20

    with Image.open(output_png) as img:
        assert img.size == (20, 20)
        assert img.mode == "RGBA"
