import { defineConfig } from "drizzle-kit";
import path from "path";

const dbPath = process.env.SQLITE_PATH ?? "./data/htcapi.db";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
