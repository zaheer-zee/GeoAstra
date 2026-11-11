import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";

test("GET / returns 200 and service metadata", async () => {
  const res = await request(app).get("/");
  assert.equal(res.status, 200);
  assert.equal(res.body.service, "GeoAstra AI Application Backend");
  assert.equal(res.body.status, "online");
});

test("GET /health returns 200 and healthy status", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "healthy");
  assert.equal(res.body.service, "geoastra-backend");
  assert.ok(res.body.timestamp);
});

test("GET /api/v1/health returns 200 and healthy status", async () => {
  const res = await request(app).get("/api/v1/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "healthy");
});

