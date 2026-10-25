// Provisions the first (or an additional) ADMIN user directly against the
// database. Deliberately NOT an HTTP endpoint — there is no
// registration/API path that can ever create a Role.ADMIN account (see
// authValidators.ts, which only accepts STUDENT/PARENT). Credentials are
// read from environment variables at invocation time only and are never
// written to a file, so they never end up committed or logged:
//
//   SUPERADMIN_EMAIL=admin@yourdomain.uz SUPERADMIN_PASSWORD='…' \
//     npm run create-superadmin
//
// Re-running with an email that already belongs to a non-ADMIN user fails
// loudly instead of silently promoting it — an existing account's role is
// never changed by this script.
import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const MIN_PASSWORD_LENGTH = 12;

const prisma = new PrismaClient();

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  // Lowercased like every other account's email (see authValidators.emailField).
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  const fullName = process.env.SUPERADMIN_NAME?.trim() || "Super Admin";

  if (!email || !password) {
    fail(
      "SUPERADMIN_EMAIL va SUPERADMIN_PASSWORD environment o'zgaruvchilari kerak.\n" +
        "Masalan:\n" +
        "  SUPERADMIN_EMAIL=admin@yourdomain.uz SUPERADMIN_PASSWORD='KuchliVaUzunParol!23' npm run create-superadmin"
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`SUPERADMIN_PASSWORD kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak.`);
  }

  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (existing) {
    if (existing.role !== Role.ADMIN) {
      fail(
        `"${email}" allaqachon mavjud, lekin ADMIN roli bilan emas (hozirgi rol: ${existing.role}). ` +
          "Xavfsizlik uchun mavjud foydalanuvchi bu skript orqali avtomatik ADMIN'ga ko'tarilmaydi."
      );
    }
    console.log(`"${email}" allaqachon ADMIN sifatida mavjud. Hech narsa o'zgartirilmadi.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, role: Role.ADMIN },
  });
  console.log(`Superadmin yaratildi: ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
