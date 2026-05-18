import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
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

const TRUSTED_ORIGINS = [
  /^https:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.replit\.dev$/,
  /^https:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.replit\.app$/,
  /^https:\/\/(www\.)?dailyaitools\.store$/,
  /^https:\/\/(www\.)?veoflowapi\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^chrome-extension:\/\//,
];

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
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

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
  skipSuccessfulRequests: false,
});

app.use("/api/auth/login", loginRateLimit);

app.use("/api", router);

export default app;
