import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/database.js";

const testUser = {
  name: "Test Researcher",
  email: `researcher_${Date.now()}@auth-test.com`,
  password: "password123!",
};

test.after(async () => {
  // Clean up test user
  await prisma.user.deleteMany({
    where: { email: { contains: "auth-test.com" } },
  });
  await prisma.$disconnect();
});

test("POST /api/v1/auth/register creates user and returns JWT", async () => {
  const res = await request(app).post("/api/v1/auth/register").send(testUser);

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.user.email, testUser.email);
  assert.equal(res.body.data.user.name, testUser.name);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.user.passwordHash, undefined); // Ensure passwordHash not exposed
});

test("POST /api/v1/auth/register rejects duplicate email", async () => {
  const res = await request(app).post("/api/v1/auth/register").send(testUser);

  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);
});

test("POST /api/v1/auth/login authenticates valid user", async () => {
  const res = await request(app).post("/api/v1/auth/login").send({
    email: testUser.email,
    password: testUser.password,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.user.email, testUser.email);
});

test("POST /api/v1/auth/login rejects invalid password", async () => {
  const res = await request(app).post("/api/v1/auth/login").send({
    email: testUser.email,
    password: "wrongpassword",
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test("GET /api/v1/users/me returns authenticated user profile", async () => {
  const loginRes = await request(app).post("/api/v1/auth/login").send({
    email: testUser.email,
    password: testUser.password,
  });

  const token = loginRes.body.data.token;

  const meRes = await request(app)
    .get("/api/v1/users/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.success, true);
  assert.equal(meRes.body.data.user.email, testUser.email);
});

test("GET /api/v1/users/me rejects request without token", async () => {
  const res = await request(app).get("/api/v1/users/me");
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});
