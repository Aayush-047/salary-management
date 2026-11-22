import { createPrismaClient } from "../../src/db/client.js";
import { seedReference } from "./seed-reference.js";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = createPrismaClient(url);

try {
  const counts = await seedReference(prisma);
  console.log("Reference data seeded:", counts);
} finally {
  await prisma.$disconnect();
}
