// Container start-up helper (see server/Dockerfile): seeds a brand-new
// database so `docker compose up` gives a usable app — subjects, questions
// and the README's demo accounts — but never re-seeds an existing one. The
// seed rewrites every hand-written question set, and QuestionAttempt rows
// cascade-delete with their Question, so re-running it on each restart would
// silently wipe every student's adaptive-quiz history.
//
//   npm run prisma:seed-if-empty
import "dotenv/config";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const subjectCount = await prisma.subject.count();
  if (subjectCount > 0) {
    console.log("Ma'lumotlar bazasi allaqachon to'ldirilgan — seed o'tkazib yuborildi.");
    return;
  }
  console.log("Bo'sh ma'lumotlar bazasi — seed ishga tushirilmoqda...");
  execSync("npx prisma db seed", { stdio: "inherit" });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
