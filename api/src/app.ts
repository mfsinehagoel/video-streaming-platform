import express from "express";
import cors from "cors";

import authRoutes from "./auth/auth.routes";

import { sequelize } from "./config/database";

import videosRoutes from "./videos/videos.routes";
import adminRoutes from "./admin/admin.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/videos", videosRoutes);
app.use("/api/admin", adminRoutes);

sequelize
  .authenticate()
  .then(() => {
    console.log("MySQL connected successfully");
  })
  .catch((error) => {
    console.error("MySQL connection failed:", error);
  });

export default app;
