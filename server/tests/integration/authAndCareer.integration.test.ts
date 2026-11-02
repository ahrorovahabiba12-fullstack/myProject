import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/config/prisma";

/**
 * INTEGRATION TEST — requires a real PostgreSQL connection (DATABASE_URL)
 * with migrations applied and the seed run. NOT executed in the sandbox
 * this project was authored in (no DB access there — see PROJECT_STATUS.md).
 * Run with: npm run prisma:migrate && npm run prisma:seed && npm test
 */
describe("Auth + Career grade-gate — end to end", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Auth is httpOnly-cookie-based (see authCookies.ts) — request.agent(app)
  // keeps a cookie jar across requests within one test, the same way a real
  // browser session would, instead of extracting a token from the JSON body.
  it("registers a grade-7 student and rejects career recommendations with 403", async () => {
    const email = `e2e-grade7-${Date.now()}@test.uz`;
    const agent = request.agent(app);
    const register = await agent
      .post("/api/auth/register")
      .send({ email, password: "Test1234!", fullName: "Test Student", role: "STUDENT", grade: 7 });

    expect(register.status).toBe(201);

    const career = await agent.get("/api/career/recommendations");

    expect(career.status).toBe(403);
  });

  it("registers a grade-10 student and allows career recommendations", async () => {
    const email = `e2e-grade10-${Date.now()}@test.uz`;
    const agent = request.agent(app);
    await agent
      .post("/api/auth/register")
      .send({ email, password: "Test1234!", fullName: "Test Student 10", role: "STUDENT", grade: 10 });

    const career = await agent.get("/api/career/recommendations");

    expect(career.status).toBe(200);
    expect(Array.isArray(career.body)).toBe(true);
  });

  it("rejects a parent from accessing a student they don't own", async () => {
    const parentEmail = `e2e-parent-${Date.now()}@test.uz`;
    const agent = request.agent(app);
    await agent
      .post("/api/auth/register")
      .send({ email: parentEmail, password: "Test1234!", fullName: "Test Parent", role: "PARENT" });

    const res = await agent.get("/api/parent/children/non-existent-student-id/dashboard");

    expect(res.status).toBe(403);
  });
});
