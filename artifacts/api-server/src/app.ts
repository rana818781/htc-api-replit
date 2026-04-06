import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Restrict CORS to trusted origins only — do NOT use origin: true (reflects all origins)
const TRUSTED_ORIGINS = [
  // Replit dev domains (allow any number of subdomains, e.g. foo.worf.replit.dev)
  /^https:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.replit\.dev$/,
  /^https:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.replit\.app$/,
  // Local development
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  // Chrome extension — all extension IDs allowed (extension authenticates via API token)
  /^chrome-extension:\/\//,
];

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, mobile apps)
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowed = TRUSTED_ORIGINS.some((pattern) => pattern.test(origin));
      if (allowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin not allowed: ${origin}`));
      }
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.use("/api", router);

export default app;
