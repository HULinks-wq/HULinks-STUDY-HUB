import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

const app = express();

// ✅ CORS FIX
app.use(cors({
  origin: [
    "https://hulinks-study-hub.up.railway.app",
    "http://localhost:3000"
  ],
  credentials: true
}));

app.use(express.json());

// ✅ ROOT ROUTE (so "/" doesn’t show 404)
app.get("/", (req, res) => {
  res.send("HULinks backend is live 🚀");
});

// ✅ REGISTER YOUR API ROUTES
registerRoutes(app);

// ✅ PORT (Railway compatible)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ SERVER STARTED ON PORT ${PORT}`);
});
