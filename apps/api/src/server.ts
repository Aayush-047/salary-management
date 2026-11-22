import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createPrismaClient } from "./db/client.js";

const config = loadConfig(process.env);
const prisma = createPrismaClient(config.databaseUrl);

createApp({ corsOrigin: config.corsOrigin, prisma }).listen(config.port, () => {
  console.log(`API listening on :${config.port}`);
});
