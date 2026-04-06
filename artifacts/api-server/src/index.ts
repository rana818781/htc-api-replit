import app from "./app";
import { logger } from "./lib/logger";
import { seedPlans, seedAdmin } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Seed default plans on startup
seedPlans().catch((err) => {
  logger.error({ err }, "Failed to seed plans");
});

// Ensure the designated admin user has admin privileges on every startup
seedAdmin().catch((err) => {
  logger.error({ err }, "Failed to seed admin");
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
