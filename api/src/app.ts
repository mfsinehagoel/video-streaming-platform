import express from "express";
import cors from "cors";

import authRoutes from "./auth/auth.routes";

import { sequelize } from "@video-platform/shared";

import videosRoutes from "./videos/videos.routes";
import adminRoutes from "./admin/admin.routes";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/videos", videosRoutes);
app.use("/api/admin", adminRoutes);
app.use(errorHandler);

sequelize
  .authenticate()
  .catch((error) => {
    console.error("MySQL connection failed:", error);
  });

export default app;
