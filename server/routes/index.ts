import { Express } from "express";

import health from "./health";
import ai from "./ai";
import uploads from "./uploads";

export function registerRoutes(app: Express) {
  app.use("/api/health", health);
  app.use("/api/ai", ai);
  app.use("/api/uploads", uploads);
}
