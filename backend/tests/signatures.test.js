import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/database.js";

test("Target Signatures API", async (t) => {
  let authToken;

  t.before(async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Signatures User",
        email: `signatures-${Date.now()}@sig-test.com`,
        password: "Password123!",
      });
    authToken = res.body.data.token;
  });

  t.after(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: "@sig-test.com" } },
    });
  });

  await t.test("GET /api/v1/signatures lists default USGS reference signatures", async () => {
    const res = await request(app)
      .get("/api/v1/signatures")
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.status, "success");
    assert.ok(res.body.data.length >= 2);

    const names = res.body.data.map((s) => s.name);
    assert.ok(names.some((n) => n.includes("Green Vegetation")));
    assert.ok(names.some((n) => n.includes("Kaolinite")));
  });

  await t.test("POST /api/v1/signatures creates a custom target spectral signature", async () => {
    const payload = {
      name: "Custom Rare Mineral Target",
      sensor: "AVIRIS",
      wavelengths: [500, 600, 700, 800],
      values: [0.12, 0.25, 0.38, 0.45],
      units: "reflectance",
      source: "Lab Spectrometer Test",
      provenance: "Verified diagnostic absorption dip at 700nm",
    };

    const res = await request(app)
      .post("/api/v1/signatures")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, payload.name);
    assert.equal(res.body.data.wavelengths.length, 4);

    const signatureId = res.body.data.id;

    // Verify GET by ID
    const getRes = await request(app)
      .get(`/api/v1/signatures/${signatureId}`)
      .set("Authorization", `Bearer ${authToken}`);
    assert.equal(getRes.status, 200);

    // Verify DELETE
    const delRes = await request(app)
      .delete(`/api/v1/signatures/${signatureId}`)
      .set("Authorization", `Bearer ${authToken}`);
    assert.equal(delRes.status, 200);
  });

  await t.test("DELETE /api/v1/signatures rejects deleting system reference signatures", async () => {
    const res = await request(app)
      .delete("/api/v1/signatures/default_vegetation_chlorophyll")
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(res.status, 403);
  });
});

