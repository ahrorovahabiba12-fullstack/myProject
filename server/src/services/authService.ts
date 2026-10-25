import crypto from "crypto";
import { Role } from "@prisma/client";
import { UserRepository } from "../repositories/userRepository";
import { hashPassword, comparePassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { RegisterInput, LoginInput } from "../validators/authValidators";
import { prisma } from "../config/prisma";

const REFRESH_TTL_DAYS = 30;
const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export class AuthService {
  constructor(private users = new UserRepository(prisma)) {}

  async register(input: RegisterInput) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw AppError.conflict("Bu email allaqachon ro'yxatdan o'tgan");

    if (input.role === "STUDENT" && !input.grade) {
      throw AppError.badRequest("Student uchun sinf (grade) ko'rsatilishi shart");
    }

    const passwordHash = await hashPassword(input.password);

    // Registration touches User + Student/Parent together — do it in one
    // transaction so a half-created account can never exist.
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, passwordHash, fullName: input.fullName, role: input.role as Role },
      });

      if (input.role === "PARENT") {
        const parent = await tx.parent.create({ data: { userId: user.id } });
        return { user, parent, student: null };
      }

      // Best-effort at sign-up: no parent account with that email yet (or a
      // typo) must not block registration — the student can link one later
      // from their Profile (StudentService.linkParent).
      let parentId: string | undefined;
      if (input.parentEmail) {
        const parentRecord = await tx.parent.findFirst({
          where: { user: { email: { equals: input.parentEmail, mode: "insensitive" } } },
        });
        parentId = parentRecord?.id;
      }
      const student = await tx.student.create({
        data: { userId: user.id, grade: input.grade!, parentId },
      });
      return { user, student, parent: null };
    });

    return this.issueSession(result.user.id, result.user.role, result.student?.id, result.parent?.id);
  }

  async login(input: LoginInput) {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw AppError.unauthorized("Email yoki parol noto'g'ri");

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) throw AppError.unauthorized("Email yoki parol noto'g'ri");

    if (user.status === "BLOCKED") {
      throw AppError.forbidden("Hisobingiz bloklangan. Administratsiyaga murojaat qiling.");
    }

    return this.issueSession(user.id, user.role, user.student?.id, user.parent?.id);
  }

  async refresh(refreshToken: string) {
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized("Refresh token yaroqsiz");
    }

    const stored = await this.users.findRefreshToken(hashToken(refreshToken));
    if (!stored || stored.expiresAt < new Date()) {
      throw AppError.unauthorized("Refresh token muddati tugagan");
    }

    const user = await this.users.findById(payload.userId);
    if (!user) throw AppError.unauthorized("Foydalanuvchi topilmadi");

    // A user blocked mid-session must not be able to keep refreshing a
    // still-live token into new access tokens.
    if (user.status === "BLOCKED") {
      await this.users.revokeRefreshToken(stored.id);
      throw AppError.forbidden("Hisobingiz bloklangan. Administratsiyaga murojaat qiling.");
    }

    await this.users.revokeRefreshToken(stored.id);
    return this.issueSession(user.id, user.role, user.student?.id, user.parent?.id);
  }

  async logout(refreshToken: string) {
    const stored = await this.users.findRefreshToken(hashToken(refreshToken));
    if (stored) await this.users.revokeRefreshToken(stored.id);
  }

  private async issueSession(userId: string, role: Role, studentId?: string, parentId?: string) {
    const accessToken = signAccessToken({ userId, role, studentId, parentId });
    const refreshToken = signRefreshToken(userId);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.users.storeRefreshToken(userId, hashToken(refreshToken), expiresAt);

    const user = await this.users.findById(userId);
    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: user!.email,
        fullName: user!.fullName,
        role,
        studentId: user!.student?.id,
        parentId: user!.parent?.id,
        grade: user!.student?.grade,
      },
    };
  }
}
