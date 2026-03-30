import express from "express";
import { registerRoutes } from "./routes";

const app = express();

app.use(express.json());

registerRoutes(app);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
