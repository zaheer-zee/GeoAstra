import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/database.js";
import { startAnalysisWorker } from "../src/workers/analysis.worker.js";
import { closeAnalysisQueue } from "../src/queues/analysis.queue.js";

let userToken = "";
let userId = "";
let areaId = "";
let worker;

const samplePolygon = {
  type: "Polygon",
  coordinates: [
    [
      [73.85, 18.5],
      [73.9, 18.5],
      [73.9, 18.55],
      [73.85, 18.55],
      [73.85, 18.5],
    ],
  ],
};

test.before(async () => {
  // Start test worker instance
  worker = startAnalysisWorker();

  // Create test user
  const uRes = await request(app).post("/api/v1/auth/register").send({
    name: "Queue Tester",
    email: `queue_tester_${Date.now()}@queue-test.com`,
    password: "password123!",
  });
  userToken = uRes.body.data.token;
  userId = uRes.body.data.user.id;

  // Create test area
  const aRes = await request(app)
    .post("/api/v1/areas")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      name: "Queue Test AOI",
      geometry: samplePolygon,
    });
  areaId = aRes.body.data.area.id;
});

test.after(async () => {
  if (worker) {
    await worker.close();
  }
  await closeAnalysisQueue();

  // Clean up database records
  await prisma.detectionResult.deleteMany({
    where: { analysis: { userId } },
  });
  await prisma.analysis.deleteMany({
    where: { userId },
  });
  await prisma.area.deleteMany({
    where: { userId },
  });
  await prisma.user.deleteMany({
    where: { id: userId },
  });
  await prisma.$disconnect();
});

test("POST /api/v1/analysis submits job and worker processes to COMPLETED", async () => {
  const submitRes = await request(app)
    .post("/api/v1/analysis")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      areaId,
      sceneId: `test-scene-${Date.now()}`,
      algorithm: "rxd",
      algorithmConfiguration: { threshold: 0.05 },
    });

  assert.equal(submitRes.status, 202);
  assert.equal(submitRes.body.success, true);
  assert.equal(submitRes.body.data.status, "QUEUED");
  const analysisId = submitRes.body.data.analysisId;
  assert.ok(analysisId);

  // Poll until worker finishes (up to 5 seconds)
  let finalStatus = "QUEUED";
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const statusRes = await request(app)
      .get(`/api/v1/analysis/${analysisId}`)
      .set("Authorization", `Bearer ${userToken}`);

    finalStatus = statusRes.body.data.analysis.status;
    if (finalStatus === "COMPLETED" || finalStatus === "FAILED") {
      break;
    }
  }

  assert.equal(finalStatus, "COMPLETED");

  // Check results endpoint
  const resultsRes = await request(app)
    .get(`/api/v1/analysis/${analysisId}/results`)
    .set("Authorization", `Bearer ${userToken}`);

  assert.equal(resultsRes.status, 200);
  assert.equal(resultsRes.body.data.status, "COMPLETED");
  assert.ok(resultsRes.body.data.detectionResults.length >= 1);
  assert.equal(resultsRes.body.data.detectionResults[0].algorithm, "rxd");
  assert.ok(resultsRes.body.data.detectionResults[0].rasterStorageKey);
});

test("GET /api/v1/analysis lists analyses for user", async () => {
  const res = await request(app)
    .get("/api/v1/analysis")
    .set("Authorization", `Bearer ${userToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.analyses.length >= 1);
});

test("POST /api/v1/analysis/:analysisId/cancel marks job as CANCELLED", async () => {
  // Create a scene and a queued analysis record without enqueuing to worker immediately
  const scene = await prisma.satelliteScene.create({
    data: {
      provider: "nasa_emit",
      sensor: "EMIT",
      externalSceneId: `cancel-scene-${Date.now()}`,
      acquisitionTime: new Date(),
      footprint: samplePolygon,
      productLevel: "L2A",
    },
  });

  const directAnalysis = await prisma.analysis.create({
    data: {
      userId,
      areaId,
      sceneId: scene.id,
      status: "QUEUED",
      algorithmConfiguration: { test: true },
    },
  });

  const cancelRes = await request(app)
    .post(`/api/v1/analysis/${directAnalysis.id}/cancel`)
    .set("Authorization", `Bearer ${userToken}`);

  assert.equal(cancelRes.status, 200);
  assert.equal(cancelRes.body.success, true);
  assert.equal(cancelRes.body.data.analysis.status, "CANCELLED");
});
