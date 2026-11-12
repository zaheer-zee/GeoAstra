import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import app from "../src/app.js";
import prisma from "../src/config/database.js";
import { satelliteService } from "../src/services/satellite.service.js";
import { closeAnalysisQueue } from "../src/queues/analysis.queue.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

test("Analysis Results & Artifacts Delivery API", async (t) => {
  let authToken;
  let testAreaId;
  let testAnalysisId;

  const previewPath = path.join(REPO_ROOT, "storage/previews/test_res_analysis_preview.png");
  const rasterPath = path.join(REPO_ROOT, "storage/output/test_res_analysis_score.tif");
  const polygonsPath = path.join(REPO_ROOT, "storage/output/test_res_analysis_polygons.geojson");

  t.before(async () => {
    await satelliteService.ensureDefaultScenes();

    // 1. Create dummy artifact files for download testing
    fs.mkdirSync(path.dirname(previewPath), { recursive: true });
    fs.mkdirSync(path.dirname(rasterPath), { recursive: true });
    fs.writeFileSync(previewPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])); // PNG header
    fs.writeFileSync(rasterPath, Buffer.from("II*\x00")); // TIFF header
    fs.writeFileSync(polygonsPath, JSON.stringify({ type: "FeatureCollection", features: [] }));

    // 2. Register user
    const userRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Results User",
        email: `results-${Date.now()}@results-test.com`,
        password: "Password123!",
      });
    authToken = userRes.body.data.token;
    const userId = userRes.body.data.user.id;

    // 3. Create Area
    const area = await prisma.area.create({
      data: {
        userId,
        name: "Results Test Area",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-87.05, 40.40],
              [-87.00, 40.40],
              [-87.00, 40.45],
              [-87.05, 40.45],
              [-87.05, 40.40],
            ],
          ],
        },
      },
    });
    testAreaId = area.id;

    // 4. Create completed Analysis with DetectionResult & ProviderRun
    const analysis = await prisma.analysis.create({
      data: {
        userId,
        areaId: testAreaId,
        sceneId: "Indian_pines",
        status: "COMPLETED",
        algorithmConfiguration: { algorithm: "rxd", regularization: 1e-4 },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
    testAnalysisId = analysis.id;

    await prisma.detectionResult.create({
      data: {
        analysisId: testAnalysisId,
        resultType: "anomaly_detection",
        algorithm: "rxd",
        rasterStorageKey: "storage/output/test_res_analysis_score.tif",
        vectorStorageKey: "storage/output/test_res_analysis_polygons.geojson",
        previewStorageKey: "storage/previews/test_res_analysis_preview.png",
        metricsJson: {
          pixel_count: 21025,
          processed_bands: 200,
          detected_features_count: 8,
          evaluation: { auc: 0.9521 },
        },
        processingMetadata: {
          comparative_summary: "The Reed-Xiaoli Detector identified 8 anomalous clusters.",
        },
      },
    });

    await prisma.providerRun.create({
      data: {
        analysisId: testAnalysisId,
        provider: "scientific_synthesis",
        model: "physics-rules-v1",
        task: "analysis_explanation",
        status: "success",
        responseJson: { text: "The Reed-Xiaoli Detector identified 8 anomalous clusters." },
        latencyMs: 15,
      },
    });
  });

  t.after(async () => {
    // Cleanup files
    if (fs.existsSync(previewPath)) fs.unlinkSync(previewPath);
    if (fs.existsSync(rasterPath)) fs.unlinkSync(rasterPath);
    if (fs.existsSync(polygonsPath)) fs.unlinkSync(polygonsPath);

    await prisma.user.deleteMany({
      where: { email: { contains: "@results-test.com" } },
    });
    await closeAnalysisQueue();
  });

  await t.test("GET /api/v1/analysis/:analysisId/results returns structured results & metrics", async () => {
    const res = await request(app)
      .get(`/api/v1/analysis/${testAnalysisId}/results`)
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.analysisId, testAnalysisId);
    assert.equal(res.body.data.status, "COMPLETED");
    assert.equal(res.body.data.metrics.detected_features_count, 8);
    assert.equal(res.body.data.metrics.evaluation.auc, 0.9521);
    assert.ok(res.body.data.aiExplanations.comparativeSummary.includes("Reed-Xiaoli Detector"));
    assert.equal(res.body.data.aiExplanations.providerRuns.length, 1);
  });

  await t.test("GET /api/v1/analysis/:analysisId/preview serves PNG heatmap", async () => {
    const res = await request(app)
      .get(`/api/v1/analysis/${testAnalysisId}/preview`)
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.headers["content-type"], "image/png");
  });

  await t.test("GET /api/v1/analysis/:analysisId/raster downloads GeoTIFF", async () => {
    const res = await request(app)
      .get(`/api/v1/analysis/${testAnalysisId}/raster`)
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.headers["content-type"], "image/tiff");
    assert.ok(res.headers["content-disposition"].includes("attachment"));
  });

  await t.test("GET /api/v1/analysis/:analysisId/polygons returns GeoJSON", async () => {
    const res = await request(app)
      .get(`/api/v1/analysis/${testAnalysisId}/polygons`)
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.headers["content-type"].includes("application/geo+json"));
  });
});
