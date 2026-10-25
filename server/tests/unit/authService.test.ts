import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { AuthService } from "../../src/services/authService";
import { registerSchema, loginSchema } from "../../src/validators/authValidators";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createParentUser, createStudentUser } from "../helpers/fixtures";

describe("AuthService — blocked accounts (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("rejects login for a BLOCKED user even with the correct password", async () => {
    const { user } = await createStudentUser();
    await prisma.user.update({ where: { id: user.id }, data: { status: "BLOCKED" } });

    await expect(
      new AuthService().login({ email: user.email, password: "Test1234!" })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("still logs in an ACTIVE user normally", async () => {
    const { user } = await createStudentUser();

    const result = await new AuthService().login({ email: user.email, password: "Test1234!" });

    expect(result.user.id).toBe(user.id);
    expect(result.accessToken).toBeTruthy();
  });

  it("rejects a refresh attempt once the account has been blocked mid-session, and revokes the token", async () => {
    const { user } = await createStudentUser();
    const service = new AuthService();
    const session = await service.login({ email: user.email, password: "Test1234!" });

    await prisma.user.update({ where: { id: user.id }, data: { status: "BLOCKED" } });

    await expect(service.refresh(session.refreshToken)).rejects.toMatchObject({ statusCode: 403 });
    // The revoked token must not work on a second attempt either (proves it was actually revoked, not just rejected this once).
    await expect(service.refresh(session.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  });
});

// Inputs go through the real zod schemas first, exactly as the validate()
// middleware runs them before the controller — that's where emails get
// normalized, so testing the service alone would skip the actual fix.
const registerBody = (body: unknown) => registerSchema.parse({ body }).body;
const loginBody = (body: unknown) => loginSchema.parse({ body }).body;

describe("AuthService — email casing (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("stores a new account's email lowercased and logs in whatever casing is typed later", async () => {
    const service = new AuthService();
    await service.register(registerBody({ email: "Ali.Valiyev@Mail.UZ", password: "Test1234!", role: "PARENT", fullName: "Ali Valiyev" }));

    const stored = await prisma.user.findFirst({ where: { fullName: "Ali Valiyev" } });
    expect(stored?.email).toBe("ali.valiyev@mail.uz");
    const session = await service.login(loginBody({ email: "ALI.valiyev@mail.uz", password: "Test1234!" }));
    expect(session.user.email).toBe("ali.valiyev@mail.uz");
  });

  it("still logs in an older account whose email was stored with mixed case", async () => {
    const { user } = await createStudentUser();
    await prisma.user.update({ where: { id: user.id }, data: { email: "Legacy.User@Test.uz" } });

    const session = await new AuthService().login(loginBody({ email: "legacy.user@test.uz", password: "Test1234!" }));

    expect(session.user.id).toBe(user.id);
  });

  it("refuses a second account whose email differs only by letter case", async () => {
    const service = new AuthService();
    await service.register(registerBody({ email: "same@mail.uz", password: "Test1234!", role: "PARENT", fullName: "First" }));

    await expect(
      service.register(registerBody({ email: "SAME@mail.uz", password: "Test1234!", role: "PARENT", fullName: "Second" }))
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("links a student to their parent at sign-up even when the parent's email was typed with different casing", async () => {
    const { user: parentUser, parent } = await createParentUser();

    const session = await new AuthService().register(
      registerBody({ email: "kid@mail.uz", password: "Test1234!", role: "STUDENT", fullName: "Kid", grade: 8, parentEmail: parentUser.email.toUpperCase() })
    );

    const student = await prisma.student.findUnique({ where: { id: session.user.studentId } });
    expect(student?.parentId).toBe(parent.id);
  });

  it("rejects a grade with no quiz content (below 4) at sign-up", () => {
    expect(() =>
      registerBody({ email: "young@mail.uz", password: "Test1234!", role: "STUDENT", fullName: "Young", grade: 3 })
    ).toThrow();
  });
});

describe("AuthService — refresh token uniqueness (real DB)", () => {
  beforeEach(() => resetDb());
  afterEach(() => vi.useRealTimers());
  afterAll(() => prisma.$disconnect());

  it("logging out one of two sessions opened in the same second leaves no still-valid twin of that token", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T10:00:00"));
    const { user } = await createStudentUser();
    const service = new AuthService();

    const a = await service.login({ email: user.email, password: "Test1234!" });
    const b = await service.login({ email: user.email, password: "Test1234!" });
    await service.logout(a.refreshToken);

    expect(a.refreshToken).not.toBe(b.refreshToken);
    await expect(service.refresh(a.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    await expect(service.refresh(b.refreshToken)).resolves.toBeTruthy();
  });
});
