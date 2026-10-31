// Upserts subjects, topics and quiz questions from prisma/content into the
// database. Never deletes — safe on a live database (runs on every container
// start, see server/Dockerfile).
//
//   npm run content:sync
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { syncContent } from "../prisma/content/sync";

const prisma = new PrismaClient();

syncContent(prisma, console.log)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
