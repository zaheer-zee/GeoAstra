import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/database.js";

let userToken = "";
let otherUserToken = "";
let createdAreaId = "";

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
  // Create user 1
  const u1 = await request(app).post("/api/v1/auth/register").send({
    name: "Area Tester 1",
    email: `area_tester1_${Date.now()}@area-test.com`,
    password: "password123!",
  });
  userToken = u1.body.data.token;

  // Create user 2
  const u2 = await request(app).post("/api/v1/auth/register").send({
    name: "Area Tester 2",
    email: `area_tester2_${Date.now()}@area-test.com`,
    password: "password123!",
  });
  otherUserToken = u2.body.data.token;
});

test.after(async () => {
  await prisma.area.deleteMany({
    where: { name: { contains: "Pune AOI" } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: "area-test.com" } },
  });
  await prisma.$disconnect();
});

test("POST /api/v1/areas creates an area of interest", async () => {
  const res = await request(app)
    .post("/api/v1/areas")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      name: "Pune AOI Region",
      geometry: samplePolygon,
      crs: "EPSG:4326",
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.area.name, "Pune AOI Region");
  assert.equal(res.body.data.area.crs, "EPSG:4326");
  assert.deepEqual(res.body.data.area.geometry, samplePolygon);
  createdAreaId = res.body.data.area.id;
});

test("GET /api/v1/areas lists areas for authenticated user", async () => {
  const res = await request(app)
    .get("/api/v1/areas")
    .set("Authorization", `Bearer ${userToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.areas.length >= 1);
  assert.equal(res.body.data.areas[0].id, createdAreaId);
});

test("GET /api/v1/areas/:areaId retrieves specific area", async () => {
  const res = await request(app)
    .get(`/api/v1/areas/${createdAreaId}`)
    .set("Authorization", `Bearer ${userToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.area.id, createdAreaId);
});

test("GET /api/v1/areas/:areaId rejects unauthorized access from different user", async () => {
  const res = await request(app)
    .get(`/api/v1/areas/${createdAreaId}`)
    .set("Authorization", `Bearer ${otherUserToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test("PATCH /api/v1/areas/:areaId updates area metadata", async () => {
  const res = await request(app)
    .patch(`/api/v1/areas/${createdAreaId}`)
    .set("Authorization", `Bearer ${userToken}`)
    .send({ name: "Pune AOI Region Updated" });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.area.name, "Pune AOI Region Updated");
});

test("DELETE /api/v1/areas/:areaId deletes area", async () => {
  const res = await request(app)
    .delete(`/api/v1/areas/${createdAreaId}`)
    .set("Authorization", `Bearer ${userToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.deleted, true);

  // Confirm deleted
  const checkRes = await request(app)
    .get(`/api/v1/areas/${createdAreaId}`)
    .set("Authorization", `Bearer ${userToken}`);
  assert.equal(checkRes.status, 404);
});
