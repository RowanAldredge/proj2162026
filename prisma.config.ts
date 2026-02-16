import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",

    // ✅ Prisma 7 seed command
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: env("DIRECT_URL"),
  },
});
