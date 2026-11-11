-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('QUEUED', 'ACQUIRING_DATA', 'PREPROCESSING', 'RUNNING_ALGORITHMS', 'GENERATING_OUTPUTS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "crs" TEXT NOT NULL DEFAULT 'EPSG:4326',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satellite_scenes" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sensor" TEXT NOT NULL,
    "external_scene_id" TEXT NOT NULL,
    "acquisition_time" TIMESTAMP(3) NOT NULL,
    "footprint" JSONB NOT NULL,
    "product_level" TEXT NOT NULL,
    "cloud_or_quality_metadata" JSONB,
    "wavelength_metadata" JSONB,
    "spatial_resolution" DOUBLE PRECISION,
    "storage_key" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "satellite_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_signatures" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT,
    "name" TEXT NOT NULL,
    "sensor" TEXT NOT NULL,
    "wavelengths" JSONB NOT NULL,
    "values" JSONB NOT NULL,
    "units" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "provenance" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "target_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,
    "scene_id" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'QUEUED',
    "algorithm_configuration" JSONB NOT NULL,
    "target_signature_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detection_results" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "result_type" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "raster_storage_key" TEXT,
    "vector_storage_key" TEXT,
    "preview_storage_key" TEXT,
    "metrics_json" JSONB,
    "processing_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detection_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_runs" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response_json" JSONB,
    "latency_ms" INTEGER,
    "usage_json" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_signatures" ADD CONSTRAINT "target_signatures_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "satellite_scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_target_signature_id_fkey" FOREIGN KEY ("target_signature_id") REFERENCES "target_signatures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detection_results" ADD CONSTRAINT "detection_results_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_runs" ADD CONSTRAINT "provider_runs_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

