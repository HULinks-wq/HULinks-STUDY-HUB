import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(compression());

// 🔥 RATE LIMITERS
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.startsWith("/api"),
  message: { message: "Too many requests. Please slow down and try again in a few minutes." },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => (req.session as any)?.userId ?? ipKeyGenerator(req),
  message: { message: "You've made too many AI requests. Please wait a few minutes before trying again." },
});

app.use("/api", generalLimiter);
app.use("/api/quizzes", aiLimiter);
app.use("/api/exams", aiLimiter);
app.use("/api/voice", aiLimiter);
app.use("/api/study-buddy", aiLimiter);
app.use("/api/presentation", aiLimiter);
app.use("/api/research", aiLimiter);
app.use("/api/extract-text", aiLimiter);
app.use("/api/calculator", aiLimiter);

// 🔥 BODY PARSING
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// 🔥 LOGGER
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // ✅ ROOT TEST ROUTE (THIS FIXES YOUR ISSUE)
  app.get("/", (_req, res) => {
    res.send("HULinks server is running 🚀");
  });

  // 🔥 ERROR HANDLER
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // 🔥 STATIC / VITE
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // 🔥 SERVER START
  const port = parseInt(process.env.PORT || "5000", 10);

  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      console.log(`Server running on port ${port}`);
    },
  );
})();
