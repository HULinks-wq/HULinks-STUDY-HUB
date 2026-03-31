import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

const app = express();

// ✅ CORS FIX
app.use(cors({
  origin: [
    "https://hulinks-study-hub-production.up.railway.app",
    "http://localhost:3000"
  ],
  credentials: true
}));

app.use(express.json());

registerRoutes(app);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ SERVER STARTED ON PORT " + PORT);
});
