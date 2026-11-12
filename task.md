# GeoSpectra AI

## Project Vision, Architecture, Technical Specification & Development Blueprint

**Document version:** 1.0\
**Prepared:** November 2026\
**Project status:** Architecture and MVP planning\
**Working name:** GeoSpectra AI

------------------------------------------------------------------------

## 1. Executive Summary

GeoSpectra AI is a proposed hyperspectral intelligence and geospatial
analysis platform. It is intended to help users select a geographic
region, discover available satellite observations, process scientific
raster data, detect unusual spectral patterns or known target
signatures, and inspect the results on a map.

The project combines:

1.  **A scientific hyperspectral processing engine** for preprocessing,
    anomaly detection, known-target detection, optimization and
    evaluation.
2.  **A geospatial application backend** for users, areas of interest,
    satellite scenes, analysis jobs, results and metadata.
3.  **An AI-provider layer** integrating Hugging Face, NaraRouter and
    NVIDIA NIM for selected model inference and language-based
    explanations.
4.  **A geospatial visualization and storage layer** for GeoTIFF,
    GeoJSON, previews and map-ready raster tiles.
5.  **A future web frontend** for area selection, scene discovery,
    analysis configuration and result exploration.

The scientific engine is the core of the product. LLMs and external
model providers are supporting capabilities; they do not replace
validated spectral algorithms.

### Important product principle

GeoSpectra AI must not claim that every detected anomaly is a particular
material, object or event. An anomaly is a statistically unusual
observation relative to a background model. Identifying its physical
cause requires suitable reference spectra, sensor compatibility, ground
truth and domain validation.

------------------------------------------------------------------------

## 2. Vision and Product Positioning

### Vision

Turn complex hyperspectral observations into reproducible, interpretable
and geographically useful detection results.

### Proposed positioning

**GeoSpectra AI --- Hyperspectral Intelligence & Detection Platform**

A sensor-aware platform for hyperspectral data acquisition, spectral
analysis, target detection, anomaly detection, algorithm comparison and
geospatial result exploration.

### What the platform should do

-   Allow users to define an area of interest (AOI) on a map.
-   Search supported satellite sources for observations intersecting the
    AOI.
-   Display scene metadata, acquisition dates, cloud/quality information
    where available, sensor and spectral characteristics.
-   Let users choose an available scene and configure an analysis.
-   Run anomaly detection for unknown or unusual spectral responses.
-   Run known-target detection using a compatible reference spectrum or
    reference region.
-   Compare multiple algorithms and configurations.
-   Produce georeferenced results and performance metrics.
-   Explain results using an LLM without allowing it to invent
    scientific conclusions.
-   Preserve enough metadata to reproduce an analysis.

### Initial market

The product is not yet committed to one commercial vertical. A
general-purpose technical platform is the current product direction, but
a startup should validate one narrow initial use case.

Potential initial markets: - Hyperspectral research and academic labs. -
Mineral exploration and geology. - Environmental monitoring. - Precision
agriculture.

A sensible first validation path is to build a research-grade prototype
and interview researchers and domain experts before selecting a
commercial vertical. Mineral exploration may be a promising pilot
direction, but it is not yet a proven market choice.

------------------------------------------------------------------------

## 3. Scope and Non-Goals

### MVP scope

1.  Backend foundation and service communication.
2.  PostgreSQL database for application metadata.
3.  User and analysis management.
4.  Satellite scene discovery for at least one data source.
5.  A genuine hyperspectral dataset workflow using EnMAP or NASA EMIT,
    subject to data availability.
6.  Preprocessing and data-quality checks.
7.  RX anomaly detection baseline.
8.  Matched Filter and/or CEM known-target detection baseline.
9.  Georeferenced output generation.
10. Parallel AI-provider prototype for supported model tasks.
11. API tests, reproducibility metadata and documentation.

### Explicit non-goals for the first MVP

-   Building or launching our own satellite.
-   Claiming global, all-sensor coverage.
-   Treating Google Maps imagery as scientific input.
-   Training a foundation model from scratch.
-   Sending entire hyperspectral cubes to an LLM.
-   Building a full enterprise multi-tenant platform before validating
    the science.
-   Supporting every sensor and data provider simultaneously.
-   Claiming mineral, crop disease, pollution or object identification
    without appropriate validation.

------------------------------------------------------------------------

## 4. Core Scientific Concepts

### 4.1 Hyperspectral imagery

A hyperspectral image contains many narrow, contiguous spectral bands.
Each image pixel has a spectral vector describing measured reflectance
or radiance across wavelengths.

A hyperspectral cube is commonly represented as:

`height × width × bands`

The actual band count, wavelength range, spectral sampling, spatial
resolution, radiometric properties and quality flags depend on the
sensor and product.

### 4.2 Anomaly detection

Anomaly detection looks for pixels whose spectral behaviour differs from
the estimated background.

Initial algorithm: - **RX / Reed-Xiaoli detector (RXD):** a statistical
anomaly detector using background mean and covariance.

Potential later experiments: - Local RX variants. - Robust covariance
estimation. - Subspace-based methods. - Deep anomaly detection, only if
justified by data and benchmarks.

An anomaly score is not a material label. Thresholding and false-alarm
calibration must be evaluated.

### 4.3 Known-target detection

Known-target detection searches for a specified spectral signature.

Initial algorithms: - **Matched Filter (MF):** detects a target
signature relative to an estimated background. - **Constrained Energy
Minimization (CEM):** suppresses background response while preserving
response to a target signature.

A target signature can come from: - A verified reference spectrum. - A
compatible spectral library. - A carefully selected reference region in
the same scene.

The system must record the signature source and its provenance.

### 4.4 Dimensionality reduction and optimization

Potential techniques: - PCA for dimensionality reduction. - Band
selection. - Covariance regularization. - Tiled/chunked processing. -
Efficient linear algebra and numerical precision choices.

Any optimization must be measured against a baseline. Report
accuracy/detection performance, runtime, peak memory and false-alarm
behaviour.

### 4.5 Detection fusion

A possible experimental fusion method is:

`F(x) = alpha * normalized_target_score(x) + (1 - alpha) * normalized_anomaly_score(x)`

This is a research hypothesis, not an established improvement. Score
normalization, alpha selection, thresholds and evaluation must be
designed carefully. Do not claim fusion is superior until experiments
support that claim.

### 4.6 Evaluation

Depending on available ground truth, evaluate: - Probability of
detection (Pd). - Probability of false alarm (Pfa). - ROC curve and
AUC. - Precision, recall and F1. - Detection rate at a fixed false-alarm
rate. - Localization quality where labels support it. - Runtime. - Peak
memory. - Throughput and scaling with image size/band count.

Use separate training/reference and test regions where applicable. Avoid
data leakage from selecting a target signature using test pixels.

------------------------------------------------------------------------

## 5. Satellite Data Strategy

The selected data strategy is **hybrid**: use different data sources for
different roles, while keeping sensor pipelines explicit.

### 5.1 Sentinel-2

-   Multispectral, not hyperspectral.
-   13 spectral bands.
-   Spatial resolution varies by band (10 m, 20 m or 60 m).
-   Useful for a first location-based acquisition workflow and
    multispectral experimentation.
-   It must never be presented as hyperspectral data.

Example Earth Engine collection: `COPERNICUS/S2_SR_HARMONIZED`

### 5.2 EnMAP

-   Genuine imaging spectroscopy / hyperspectral satellite mission.
-   Approximately 30 m spatial resolution.
-   Suitable for hyperspectral research and material-oriented
    experiments.
-   Scene coverage and access depend on acquisition availability and
    provider conditions.

Data access: https://www.enmap.org/data_access/

### 5.3 NASA EMIT

-   Genuine imaging spectroscopy instrument on the International Space
    Station.
-   Approximately 60 m spatial resolution.
-   Particularly useful for mineral and surface-material investigations.
-   Coverage is limited to acquired observations; it is not an
    always-available global image service.

Earth Engine catalogue:
https://developers.google.com/earth-engine/datasets/catalog/NASA_EMIT_L2A_RFL

### 5.4 Acquisition rules

-   Search scene availability before offering an analysis.
-   Display acquisition date, sensor, footprint, quality/cloud
    information when supplied, bands/wavelength metadata and product
    level.
-   Never promise coverage for every region/date.
-   Preserve original CRS, affine transform, spatial resolution, NoData
    values and wavelength metadata.
-   Process in the source projection where appropriate; reproject for
    display only when needed.
-   Do not use Google Maps tiles or screenshots as scientific raster
    input.
-   Keep provider-specific acquisition and preprocessing adapters
    separate.

### 5.5 Sensor compatibility

A reference spectrum from one sensor cannot automatically be used with
another. Sensors differ in wavelength range, spectral response
functions, band centres, spectral sampling, calibration, atmospheric
correction and noise.

Before comparing signatures across sensors: - Check wavelength
overlap. - Check units and reflectance/radiance conventions. - Apply a
defensible spectral resampling or response-function transformation where
appropriate. - Record the transformation and its assumptions. - Reject
incompatible signatures rather than silently comparing them.

------------------------------------------------------------------------

## 6. System Architecture

### 6.1 High-level components

**Frontend (later)** - React + Vite. - Map-based AOI selection. - Scene
search and date selection. - Analysis configuration. - Job status and
results. - Map overlays and report views.

**Application backend** - Node.js + Express. - Authentication and
authorization. - API gateway and request validation. - User, AOI, scene
metadata and analysis management. - Job creation and status endpoints. -
Prisma ORM for PostgreSQL.

**Scientific backend** - Python + FastAPI. - Satellite provider
adapters. - Raster preprocessing. - Hyperspectral algorithms. -
Geospatial conversion and output generation. - Evaluation and metrics. -
AI-provider orchestration.

**Background processing** - Redis + BullMQ for Node-side queue
orchestration. - Worker processes for long-running jobs. - Python
processing worker/service receives a job contract and processes
referenced files. - HTTP requests should not remain open while large
raster processing runs.

**Database** - PostgreSQL. - Prisma initially for application
entities. - PostGIS can be introduced for advanced spatial querying. -
Do not store huge raster cubes as ordinary database rows.

**Storage** - Local filesystem for initial development. - S3-compatible
object storage for production. - Store input scenes, intermediate
products, GeoTIFF outputs, previews and manifests. - Database stores
storage keys/paths, metadata and checksums.

**Raster serving** - TiTiler or a similar COG/raster tile service for
map visualization. - GeoJSON for vector features and detected regions. -
Signed/authorized access to private outputs.

### 6.2 Architecture diagram

``` text
                    React + Vite (later)
                            |
                            v
                    Node.js + Express
                    - Auth / users
                    - AOI and scene metadata
                    - Analysis API
                    - Job creation/status
                            |
                 PostgreSQL + Prisma
                            |
                      Redis / BullMQ
                            |
                            v
                 Python processing worker
                       / FastAPI
                            |
          +-----------------+------------------+
          |                 |                  |
          v                 v                  v
    Data providers    Scientific engine   AI provider layer
    - EnMAP           - Preprocessing     - Hugging Face
    - NASA EMIT       - RXD               - NaraRouter
    - Sentinel-2      - Matched Filter    - NVIDIA NIM
                      - CEM
                      - PCA
                      - Fusion
                      - Evaluation
                            |
                            v
                  Geospatial output layer
                  - GeoTIFF / COG
                  - GeoJSON
                  - PNG previews
                  - JSON metrics
                            |
               Object storage / local storage
                            |
                            v
                  TiTiler / API result access
                            |
                            v
                    Frontend map layers
```

### 6.3 Service boundaries

Node/Express is the application backend. Python/FastAPI is the
scientific processing backend.

Avoid duplicating responsibilities: - Node owns application users,
sessions, application-level authorization, job records and public
APIs. - Python owns raster processing, scientific algorithms, data
acquisition adapters and model inference adapters. - Both services
communicate using versioned contracts. - Internal Python endpoints must
not be exposed publicly without authentication. - Large files should be
referenced by storage key/path, not embedded in JSON.

------------------------------------------------------------------------

## 7. AI Provider Strategy: Parallel Orchestration

The project will use three external AI ecosystems/providers, but they
serve different roles.

### 7.1 Hugging Face

Primary role: - Discover and evaluate pretrained models. - Access
datasets and model artifacts. - Run compatible models locally where
licensing and hardware permit. - Use Hugging Face Inference Providers
for selected experiments, subject to model/provider availability and
quota. - Potentially host a demo on Spaces.

Important: - Hugging Face is an ecosystem, not one single model. -
Choose a specific model, task, license, input format and inference
backend. - Do not assume a model tagged "hyperspectral" is suitable for
our sensor or detection task. - Verify model card, training data,
license, expected input shape and benchmark evidence. - Prefer local
inference for large scientific arrays when practical.

### 7.2 NaraRouter

Primary role: - Language-model explanations. - Analysis report
drafting. - Natural-language questions about completed analyses. -
Structured summaries of algorithm outputs.

Use a server-side API key and an OpenAI-compatible client only where
supported by the selected endpoint/model.

The advertised free allowance (including the discussed 7 million daily
tokens) must be verified in the user's account, model-specific terms and
current official documentation. Do not assume every model is eligible or
that quota is guaranteed.

### 7.3 NVIDIA NIM

Primary role: - Prototype GPU-backed inference for selected models. -
Test NVIDIA-hosted models and supported accelerated inference. -
Potentially run suitable vision/language/embedding models.

NIM availability, API endpoints, models, quotas, free access and
production pricing depend on the particular NVIDIA service and account.
Verify the current API Catalog and terms. Do not assume a free
production GPU.

### 7.4 Parallel execution design

For a task that genuinely supports multiple providers: 1. Build a
compact, versioned scientific context. 2. Select compatible
models/providers for the task. 3. Dispatch requests concurrently. 4.
Apply timeouts and provider-specific concurrency limits. 5. Normalize
responses into a common result schema. 6. Record latency, status, model
identifier and usage if returned. 7. Compare outputs and identify
agreement/disagreement. 8. Persist provider responses and provenance.

Do not send the same prompt to every provider merely to use all three. A
provider should only be called if it has a suitable model for that task.

### 7.5 Scientific independence

The scientific engine remains authoritative for numerical detections and
scores.

-   LLMs may explain results, not alter them.
-   LLM agreement is not scientific validation.
-   The LLM must not invent material labels from anomaly scores.
-   Any model-generated classification must be clearly marked as a model
    hypothesis and validated separately.
-   Do not send entire hyperspectral cubes to LLM APIs. Send compact
    summaries, selected spectra or appropriately transformed features
    only when justified.

### 7.6 Provider abstraction

Suggested structure:

``` text
ai-engine/app/providers/
    base.py
    huggingface_provider.py
    nararouter_provider.py
    nvidia_provider.py
    orchestrator.py
    schemas.py
```

Provider interface (conceptual):

``` python
class AIProvider:
    async def analyze(self, request):
        raise NotImplementedError
```

The orchestrator should use a task registry and capability metadata,
rather than assuming every provider supports every task.

### 7.7 Common provider result

Example normalized response:

``` json
{
  "provider": "nararouter",
  "model": "configured-model-id",
  "task": "analysis_explanation",
  "status": "success",
  "response": "Explanation text",
  "latency_seconds": 1.42,
  "usage": {
    "input_tokens": 1200,
    "output_tokens": 300
  },
  "error": null
}
```

Usage fields are optional because not every provider returns them in the
same format.

### 7.8 Reliability requirements

-   Timeouts.
-   Retries with exponential backoff for transient failures only.
-   Rate limiting and concurrency caps.
-   Circuit breaker or temporary provider disablement.
-   Per-provider error handling.
-   Secret management.
-   Request IDs and structured logs.
-   Cost/quota monitoring.
-   Caching where safe.
-   No automatic retry of non-idempotent operations without an
    idempotency strategy.

------------------------------------------------------------------------

## 8. Proposed Backend Project Structure

This is the target structure to build incrementally. It is not necessary
to create every file immediately.

``` text
geospectra-ai/
|
|-- backend/                         # Node.js application backend
|   |-- src/
|   |   |-- config/
|   |   |   |-- env.js
|   |   |   |-- database.js
|   |   |   |-- redis.js
|   |   |
|   |   |-- controllers/
|   |   |   |-- auth.controller.js
|   |   |   |-- area.controller.js
|   |   |   |-- scene.controller.js
|   |   |   |-- analysis.controller.js
|   |   |
|   |   |-- routes/
|   |   |   |-- auth.routes.js
|   |   |   |-- area.routes.js
|   |   |   |-- satellite.routes.js
|   |   |   |-- analysis.routes.js
|   |   |
|   |   |-- middleware/
|   |   |   |-- auth.middleware.js
|   |   |   |-- error.middleware.js
|   |   |   |-- validate.middleware.js
|   |   |
|   |   |-- services/
|   |   |   |-- auth.service.js
|   |   |   |-- area.service.js
|   |   |   |-- satellite.service.js
|   |   |   |-- analysis.service.js
|   |   |
|   |   |-- workers/
|   |   |   |-- analysis.worker.js
|   |   |
|   |   |-- queues/
|   |   |   |-- analysis.queue.js
|   |   |
|   |   |-- utils/
|   |   |   |-- ApiError.js
|   |   |   |-- logger.js
|   |   |
|   |   |-- app.js
|   |   |-- server.js
|   |
|   |-- prisma/
|   |   |-- schema.prisma
|   |
|   |-- tests/
|   |-- package.json
|   |-- .env.example
|   |
|
|-- ai-engine/                        # Python scientific backend
|   |-- app/
|   |   |-- api/
|   |   |   |-- routes/
|   |   |   |   |-- health.py
|   |   |   |   |-- scenes.py
|   |   |   |   |-- analysis.py
|   |   |   |   |-- providers.py
|   |   |
|   |   |-- core/
|   |   |   |-- config.py
|   |   |   |-- logging.py
|   |   |   |-- security.py
|   |   |
|   |   |-- providers/
|   |   |   |-- base.py
|   |   |   |-- sentinel2.py
|   |   |   |-- enmap.py
|   |   |   |-- emit.py
|   |   |   |-- huggingface_provider.py
|   |   |   |-- nararouter_provider.py
|   |   |   |-- nvidia_provider.py
|   |   |   |-- orchestrator.py
|   |   |
|   |   |-- preprocessing/
|   |   |   |-- validation.py
|   |   |   |-- calibration.py
|   |   |   |-- normalization.py
|   |   |   |-- bad_bands.py
|   |   |   |-- dimensionality.py
|   |   |
|   |   |-- algorithms/
|   |   |   |-- rxd.py
|   |   |   |-- matched_filter.py
|   |   |   |-- cem.py
|   |   |   |-- fusion.py
|   |   |
|   |   |-- geospatial/
|   |   |   |-- raster.py
|   |   |   |-- coordinates.py
|   |   |   |-- vector.py
|   |   |   |-- tiling.py
|   |   |
|   |   |-- evaluation/
|   |   |   |-- metrics.py
|   |   |   |-- benchmarks.py
|   |   |   |-- validation.py
|   |   |
|   |   |-- services/
|   |   |   |-- acquisition_service.py
|   |   |   |-- analysis_service.py
|   |   |   |-- report_service.py
|   |   |
|   |   |-- schemas/
|   |   |   |-- scene.py
|   |   |   |-- analysis.py
|   |   |   |-- provider.py
|   |   |
|   |   |-- main.py
|   |
|   |-- tests/
|   |-- requirements.txt
|   |-- .env.example
|
|-- frontend/                         # Later phase
|   |-- src/
|   |   |-- components/
|   |   |   |-- Map/
|   |   |   |-- Analysis/
|   |   |   |-- Results/
|   |   |   |-- Scenes/
|   |   |
|   |   |-- pages/
|   |   |-- services/
|   |   |-- hooks/
|   |   |-- App.jsx
|   |   |-- main.jsx
|   |
|   |-- package.json
|
|-- storage/
|   |-- input/
|   |-- intermediate/
|   |-- output/
|   |-- previews/
|
|-- infrastructure/
|   |-- docker/
|   |-- titiler/
|   |-- deployment/
|
|-- docs/
|   |-- architecture.md
|   |-- api.md
|   |-- algorithms.md
|   |-- data-sources.md
|   |-- experiments.md
|
|-- docker-compose.yml
|-- .gitignore
|-- README.md
```

------------------------------------------------------------------------

## 9. Database Design

Use PostgreSQL as the primary application database and Prisma as the ORM
for the Node.js backend.

PostGIS may be added when spatial queries become necessary.

### Core entities

#### User

-   id
-   name
-   email
-   password_hash
-   created_at
-   updated_at

#### Area

-   id
-   user_id
-   name
-   geometry (GeoJSON geometry or suitable spatial representation)
-   crs
-   created_at

#### SatelliteScene

-   id
-   provider
-   sensor
-   external_scene_id
-   acquisition_time
-   footprint
-   product_level
-   cloud_or_quality_metadata
-   wavelength_metadata
-   spatial_resolution
-   storage_key (nullable)
-   metadata_json

#### TargetSignature

-   id
-   owner_user_id (nullable for public/system references)
-   name
-   sensor
-   wavelengths
-   values
-   units
-   source
-   provenance
-   created_at

#### Analysis

-   id
-   user_id
-   area_id
-   scene_id
-   status
-   algorithm_configuration
-   target_signature_id (nullable)
-   started_at
-   completed_at
-   error_message
-   created_at

#### DetectionResult

-   id
-   analysis_id
-   result_type
-   algorithm
-   raster_storage_key
-   vector_storage_key
-   preview_storage_key
-   metrics_json
-   processing_metadata
-   created_at

#### ProviderRun

-   id
-   analysis_id
-   provider
-   model
-   task
-   status
-   response_json
-   latency_ms
-   usage_json
-   error
-   created_at

### Relationships

``` text
User 1 ----- N Area
User 1 ----- N Analysis
Area 1 ----- N Analysis
SatelliteScene 1 ----- N Analysis
TargetSignature 1 ----- N Analysis
Analysis 1 ----- N DetectionResult
Analysis 1 ----- N ProviderRun
```

### Database principles

-   Store password hashes, never plaintext passwords.
-   Use explicit enums or constrained values for job status and source
    types.
-   Index frequently queried foreign keys and timestamps.
-   Keep large raster arrays out of ordinary relational rows.
-   Store storage keys and checksums in the database.
-   Use migrations and backups.
-   Keep provider outputs and scientific results separate.

------------------------------------------------------------------------

## 10. API Design

The Express backend exposes public application APIs. Python APIs should
be private/internal or protected by service authentication.

### Authentication

``` text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/users/me
```

### Areas

``` text
POST   /api/v1/areas
GET    /api/v1/areas
GET    /api/v1/areas/:areaId
PATCH  /api/v1/areas/:areaId
DELETE /api/v1/areas/:areaId
```

### Satellite scenes

``` text
POST /api/v1/satellite/scenes/search
GET  /api/v1/satellite/scenes/:sceneId
```

Example search body:

``` json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [73.85, 18.50],
      [73.90, 18.50],
      [73.90, 18.55],
      [73.85, 18.55],
      [73.85, 18.50]
    ]]
  },
  "source": "enmap",
  "dateRange": {
    "start": "2026-10-01",
    "end": "2026-11-01"
  }
}
```

Coordinates are illustrative only. Validate polygon closure, coordinate
order, geometry validity, size and supported AOI limits.

### Analysis

``` text
POST /api/v1/analysis
GET  /api/v1/analysis
GET  /api/v1/analysis/:analysisId
GET  /api/v1/analysis/:analysisId/results
POST /api/v1/analysis/:analysisId/cancel
```

Example request:

``` json
{
  "areaId": "area-id",
  "sceneId": "scene-id",
  "algorithm": "combined",
  "anomalyMethod": "rxd",
  "targetMethod": "matched_filter",
  "targetSignatureId": "signature-id",
  "runProviderComparison": true
}
```

Example response:

``` json
{
  "analysisId": "analysis-id",
  "status": "QUEUED",
  "message": "Analysis job created"
}
```

### Python internal endpoints

``` text
GET  /health
POST /internal/v1/scenes/search
POST /internal/v1/analysis/run
POST /internal/v1/providers/compare
GET  /internal/v1/jobs/:jobId
```

Internal endpoints require service-to-service authentication. Avoid
exposing them directly to browsers.

------------------------------------------------------------------------

## 11. Analysis Job Lifecycle

Long-running satellite and raster processing must run asynchronously.

Suggested states:

``` text
QUEUED
  |
  v
ACQUIRING_DATA
  |
  v
PREPROCESSING
  |
  v
RUNNING_ALGORITHMS
  |
  v
GENERATING_OUTPUTS
  |
  v
COMPLETED
```

Failure and cancellation paths:

``` text
Any active state -> FAILED
Any cancellable state -> CANCELLED
```

Each transition should be persisted with timestamps and useful error
metadata.

### Job flow

1.  User submits an analysis request.
2.  Express validates ownership, AOI, scene and configuration.
3.  Express creates an Analysis record.
4.  Express enqueues a job in BullMQ.
5.  Worker obtains the job.
6.  Python processing service acquires or locates input data.
7.  Preprocessing validates and prepares the raster.
8.  Scientific algorithms execute.
9.  Results are georeferenced and saved.
10. Optional AI provider tasks run in parallel.
11. Provider results are saved separately.
12. Analysis status becomes completed or failed.
13. Frontend later polls or subscribes for status updates.

Use idempotency keys and safe retry semantics to avoid duplicate
expensive jobs.

------------------------------------------------------------------------

## 12. Geospatial Processing and Output

### Preserve geospatial metadata

For every raster, preserve: - CRS. - Affine transform. - Dimensions. -
Spatial resolution. - NoData values. - Band descriptions and wavelength
metadata. - Units and product level. - Acquisition and processing
provenance.

Example using Rasterio:

``` python
import rasterio

with rasterio.open("input.tif") as src:
    transform = src.transform
    crs = src.crs

    row, col = 120, 85
    x, y = rasterio.transform.xy(
        transform, row, col
    )
```

Convert to WGS84 only when geographic coordinates are needed:

``` python
from rasterio.warp import transform

lon, lat = transform(
    crs,
    "EPSG:4326",
    [x],
    [y]
)
```

### Output types

-   **GeoTIFF:** full-resolution anomaly/target score raster.
-   **Cloud Optimized GeoTIFF (COG):** efficient remote raster access.
-   **GeoJSON:** detected regions, polygons or points.
-   **PNG:** preview and heatmap.
-   **JSON:** metrics, algorithm settings and processing provenance.

Avoid turning every anomalous pixel into a separate polygon. Use
connected-component grouping, thresholding and minimum-area rules where
appropriate.

------------------------------------------------------------------------

## 13. Frontend and Map Plan (Later)

The frontend will be built after the backend workflow is reliable.

### Proposed stack

-   React + Vite.
-   Google Maps JavaScript API or another suitable map provider.
-   Terra Draw for polygon drawing.
-   TiTiler for raster tiles.
-   GeoJSON overlays for vector detections.

Google Maps is a navigation and visualization basemap, not the
scientific source of satellite spectral measurements.

### User workflow

1.  Search for a location.
2.  Draw an AOI polygon.
3.  Choose satellite source and date range.
4.  Search for available scenes.
5.  Inspect scene metadata and coverage.
6.  Select a scene.
7.  Choose anomaly detection and/or target detection.
8.  Supply or select a compatible reference signature for known-target
    detection.
9.  Submit analysis.
10. Monitor job status.
11. Inspect detection maps, scores, metrics and AI explanations.
12. Export GeoTIFF, GeoJSON and reports.

------------------------------------------------------------------------

## 14. Security and Operational Requirements

-   Keep all API keys in server-side environment variables or a secrets
    manager.
-   Never commit `.env` files.
-   Never expose provider keys to the frontend.
-   Use password hashing such as Argon2id or bcrypt with appropriate
    parameters.
-   Implement authentication, authorization and per-user resource
    ownership.
-   Validate all AOI geometry and analysis parameters.
-   Restrict file types, file sizes and archive extraction.
-   Prevent path traversal and unsafe file access.
-   Use private object storage and signed URLs where appropriate.
-   Protect internal services with service credentials and network
    controls.
-   Rate-limit public endpoints.
-   Record audit logs for analysis creation and access.
-   Apply timeouts and concurrency limits to external provider calls.
-   Do not log secrets or sensitive raw data.
-   Define retention and deletion policies for user data and
    uploaded/reference files.

------------------------------------------------------------------------

## 15. Testing Strategy

### Unit tests

-   RXD and target detector numerical correctness.
-   Preprocessing and NoData handling.
-   Geometry validation.
-   Coordinate conversion.
-   Provider response normalization.
-   Job state transitions.

### Integration tests

-   Express to PostgreSQL.
-   Express queue submission.
-   Worker to Python service.
-   Python to satellite provider.
-   Python to object/file storage.
-   Provider failure isolation.
-   Result retrieval.

### Scientific validation

-   Use documented datasets with appropriate labels or reference
    information.
-   Compare to established baseline implementations.
-   Record parameter choices.
-   Avoid leakage between reference/training and test regions.
-   Test across multiple scenes and, where possible, sensors.
-   Document failure cases and limitations.

### Performance tests

-   Runtime by image dimensions and band count.
-   Peak memory.
-   Processing throughput.
-   Tile/preview generation time.
-   API latency.
-   Provider latency and failure rate.

------------------------------------------------------------------------

## 16. Development Roadmap

Assuming approximately five hours of focused work per day, this is a
planning estimate. Actual duration depends on data access, debugging,
scientific validation and deployment complexity.

### Phase 1 --- Backend foundation (1--2 days)

-   Create monorepo.
-   Initialize Express and FastAPI.
-   Configure environment variables.
-   Add health checks.
-   Establish service-to-service communication.

### Phase 2 --- PostgreSQL and application APIs (2--3 days)

-   Configure PostgreSQL and Prisma.
-   Create initial user, area and analysis models.
-   Add migrations.
-   Implement basic authentication and area APIs.

### Phase 3 --- Job infrastructure (1--2 days)

-   Configure Redis and BullMQ.
-   Create job schema and lifecycle.
-   Implement worker and Python job contract.
-   Test failure and retry behaviour.

### Phase 4 --- Satellite data acquisition (3--5 days)

-   Select one real hyperspectral source and dataset.
-   Implement scene discovery.
-   Download/access one test scene.
-   Validate metadata and raster handling.
-   Keep Sentinel-2 as a separate multispectral workflow if integrated.

### Phase 5 --- Scientific engine (4--7 days)

-   Implement data validation and preprocessing.
-   Implement RXD baseline.
-   Implement Matched Filter and/or CEM.
-   Add PCA or other optimization experiment.
-   Create benchmark and evaluation scripts.

### Phase 6 --- Geospatial results (2--3 days)

-   Generate GeoTIFF/COG.
-   Generate GeoJSON and previews.
-   Preserve CRS and affine transform.
-   Test result retrieval.

### Phase 7 --- Provider orchestration (2--4 days)

-   Implement Hugging Face adapter.
-   Implement NaraRouter adapter.
-   Implement NVIDIA NIM adapter.
-   Add capability selection, parallel calls, timeouts and
    normalization.
-   Persist provider runs.
-   Test partial failures.

### Phase 8 --- Integration and hardening (3--5 days)

-   End-to-end analysis workflow.
-   Security checks.
-   Automated tests.
-   Logging and observability.
-   Docker development environment.
-   Documentation.

A useful backend MVP may take roughly **3--5 weeks of focused
development**, with a longer timeline if the scientific experiments or
satellite access prove difficult. A validated commercial-grade product
is a much larger effort.

------------------------------------------------------------------------

## 17. Development Environment and Dependencies

### Node backend

Likely dependencies:

``` bash
npm install express cors dotenv axios
npm install prisma @prisma/client
npm install bullmq ioredis
npm install bcrypt jsonwebtoken
npm install zod
npm install -D nodemon
```

Use secure, maintained package versions and lock dependencies.

### Python backend

Initial dependencies:

``` bash
pip install fastapi uvicorn
pip install numpy scipy scikit-learn
pip install rasterio pyproj
pip install pydantic python-dotenv
pip install openai httpx
```

Additional libraries such as PyTorch, Transformers, Hugging Face Hub,
Earth Engine SDK and provider-specific packages should be installed when
their use is confirmed.

### PostgreSQL

Local development can use a locally installed PostgreSQL server or
Docker. Supabase PostgreSQL is an alternative hosted option, but the
application should remain standard PostgreSQL-compatible.

### Docker

Use Docker Compose for local PostgreSQL and Redis initially. Add
application containers once local service development is stable.

------------------------------------------------------------------------

## 18. Antigravity and Development Workflow

The project is being developed with Antigravity Free and approximately
five hours of daily development time.

Do not ask an agent to generate the entire repository in one prompt.

Recommended workflow: 1. Give the agent one milestone and its acceptance
criteria. 2. Ask it to inspect the existing code before changing files.
3. Implement a small vertical slice. 4. Run tests and inspect the actual
output. 5. Review generated code and security-sensitive changes. 6.
Commit a working checkpoint. 7. Move to the next milestone.

Antigravity does not provide a stable public token allowance that can be
reliably converted into a fixed number of project days. Monitor the
actual usage dashboard rather than planning around an assumed
token-to-quota conversion.

### Development acceptance criteria

A milestone is not complete merely because code was generated. It is
complete when: - The service starts. - The relevant endpoint works. -
Tests pass. - Errors are handled. - Configuration is documented. - The
code can be reproduced from a clean setup.

------------------------------------------------------------------------

## 19. Startup Potential and Commercial Validation

GeoSpectra AI has potential as a research/software product, but it is
not yet a validated startup.

### Competitive landscape to research

Examples of relevant companies include: - Pixxel. - Wyvern. - Kuva
Space. - Companies providing mineral exploration and geospatial
analytics.

The market is not empty. A generic "AI satellite anomaly detector" is
not a sufficient differentiator.

### Possible differentiation

-   Sensor-aware spectral processing.
-   Reproducible algorithm comparison.
-   Transparent uncertainty and false-alarm analysis.
-   Efficient processing of large hyperspectral scenes.
-   Research-grade exports and provenance.
-   A workflow that makes sophisticated algorithms accessible to domain
    users.

### Validation plan

1.  Build a working scientific prototype.
2.  Benchmark against established algorithms.
3.  Demonstrate on documented hyperspectral data.
4.  Interview 10--15 researchers, geologists or remote-sensing
    professionals.
5.  Find one pilot user with a real dataset and a defined problem.
6.  Measure whether GeoSpectra AI improves their workflow.
7.  Only then select pricing and a commercial market.

### Potential business models

-   Research/lab subscription.
-   Pay-per-scene or pay-per-analysis.
-   Enterprise deployment.
-   API access for geospatial companies.
-   Paid custom analytics or pilot projects.

These are hypotheses, not validated revenue streams.

------------------------------------------------------------------------

## 20. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Inconsistent satellite coverage     Search availability first and show
                                      coverage gaps

  Sensor incompatibility              Sensor-specific metadata and
                                      spectral resampling

  False positives                     Calibrated thresholds and
                                      ground-truth evaluation

  Unverified AI explanations          Keep scientific scores
                                      authoritative

  Provider outages or quota limits    Parallel partial-failure handling
                                      and fallback policies

  Large raster memory requirements    Chunking, tiling and object storage

  Cost escalation                     Usage tracking, local processing
                                      and quotas

  Weak differentiation                Focus on measurable scientific and
                                      workflow improvements

  Overengineering                     Build one complete end-to-end
                                      workflow first
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 21. Immediate Build Order

The next implementation steps should be:

### Milestone 01: Backend foundation

-   [x] Create `geospectra-ai` repository.
-   [x] Create `backend` and `ai-engine`.
-   [x] Start Express on port 5000 (port 5001 configured for macOS AirPlay conflict prevention).
-   [x] Start FastAPI on port 8000.
-   [x] Add health endpoints.
-   [x] Test Express calling FastAPI.

### Milestone 02: Database

-   [x] Configure PostgreSQL.
-   [x] Initialize Prisma.
-   [x] Define User, Area and Analysis.
-   [x] Run first migration.
-   [x] Test database operations.

### Milestone 03: Job processing

-   [x] Add Redis.
-   [x] Add BullMQ.
-   [x] Implement analysis job creation.
-   [x] Implement worker and job status updates.

### Milestone 04: First real hyperspectral scene

-   [ ] Choose EnMAP or NASA EMIT.
-   [ ] Find a scene with suitable coverage and metadata.
-   [ ] Access/download the scientific raster.
-   [ ] Validate dimensions, CRS, wavelength metadata and NoData.
-   [ ] Save an immutable input manifest.

### Milestone 05: First scientific result

-   [x] Implement RXD.
-   [x] Generate a score raster.
-   [x] Preserve georeferencing.
-   [x] Evaluate and document limitations.
-   [x] Add target detection after the anomaly baseline works.

### Milestone 06: AI providers

-   [ ] Verify Hugging Face model and inference access.
-   [ ] Verify NaraRouter model and quota.
-   [ ] Verify NVIDIA NIM endpoint and model access.
-   [ ] Implement provider adapters.
-   [ ] Add parallel orchestration and failure isolation.
-   [ ] Compare explanations without treating them as ground truth.

### Milestone 07: Complete backend workflow

-   [ ] End-to-end scene-to-result job.
-   [ ] Persist metadata and outputs.
-   [ ] Add result APIs.
-   [ ] Add integration tests.
-   [ ] Document setup and deployment.

------------------------------------------------------------------------

## 22. Final Architecture Decisions

  -----------------------------------------------------------------------
  Decision                            Current choice
  ----------------------------------- -----------------------------------
  Project name                        GeoSpectra AI

  Product direction                   Hyperspectral intelligence and
                                      detection

  Initial application                 General-purpose platform; first
                                      commercial vertical not yet
                                      validated

  Satellite strategy                  Hybrid

  Genuine hyperspectral sources       EnMAP and NASA EMIT

  Multispectral source                Sentinel-2, clearly labelled
                                      multispectral

  Main application backend            Node.js + Express

  Scientific backend                  Python + FastAPI

  Database                            PostgreSQL

  ORM                                 Prisma

  Background jobs                     Redis + BullMQ

  Scientific processing               NumPy, SciPy, scikit-learn,
                                      Rasterio

  Initial algorithms                  RXD, Matched Filter, CEM

  Optimization experiments            PCA, band selection, chunking and
                                      numerical optimization

  AI ecosystem                        Hugging Face

  LLM API provider                    NaraRouter

  GPU inference provider              NVIDIA NIM

  Provider strategy                   Parallel orchestration for
                                      compatible tasks

  Scientific authority                Our own validated processing
                                      pipeline

  Raster output                       GeoTIFF / COG

  Vector output                       GeoJSON

  Raster visualization                TiTiler

  Frontend (later)                    React + Vite + map interface

  Initial storage                     Local files; object storage later

  Development approach                Milestone-based, test-driven
                                      implementation
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 23. Closing Principle

GeoSpectra AI should be built around scientific reliability, not the
number of AI services it integrates.

The order of priorities is:

1.  Obtain real hyperspectral data.
2.  Build correct and reproducible scientific processing.
3.  Validate detection performance.
4.  Make the workflow efficient and accessible.
5.  Add AI explanations and model comparisons.
6.  Validate a specific customer problem.
7.  Build a sustainable business around proven value.

**The goal is not to build a platform that merely detects colourful
anomalies on a map. The goal is to build a system whose results can be
understood, reproduced, evaluated and trusted.**
