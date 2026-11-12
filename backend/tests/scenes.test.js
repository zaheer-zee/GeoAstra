import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/database.js";

test("Satellite Scenes API", async (t) => {
  let authToken;

  t.before(async () => {
    // Register test user
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Scenes User",
        email: `scenes-${Date.now()}@scene-test.com`,
        password: "Password123!",
      });
    authToken = res.body.data.token;
  });

  t.after(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: "@scene-test.com" } },
    });
  });

  await t.test("GET /api/v1/scenes lists benchmark hyperspectral scenes", async () => {
    const res = await request(app)
      .get("/api/v1/scenes")
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.status, "success");
    assert.ok(res.body.data.scenes.length >= 2);

    const ids = res.body.data.scenes.map((s) => s.id);
    assert.ok(ids.includes("Indian_pines"));
    assert.ok(ids.includes("PaviaU"));
  });

  await t.test("GET /api/v1/scenes/:sceneId retrieves detailed scene metadata", async () => {
    const res = await request(app)
      .get("/api/v1/scenes/Indian_pines")
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, "Indian_pines");
    assert.equal(res.body.data.sensor, "AVIRIS");
    assert.equal(res.body.data.metadataJson.bands_count, 200);
  });

  await t.test("GET /api/v1/scenes/search filters scenes by sensor", async () => {
    const res = await request(app)
      .get("/api/v1/scenes/search?sensor=ROSIS")
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.resultsCount >= 1);
    assert.equal(res.body.data.scenes[0].sensor, "ROSIS");
  });
});

