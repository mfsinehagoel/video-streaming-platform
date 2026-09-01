import { Router } from "express";

import {
  getDashboard,
  getAdminVideos,
  getAdminJobs,
  retryJob,
} from "./admin.controller";

const router = Router();

// Dashboard statistics
router.get("/dashboard", getDashboard);

// Video browser
router.get("/videos", getAdminVideos);

// Processing jobs
router.get("/jobs", getAdminJobs);

// Retry failed job
router.post("/jobs/:id/retry", retryJob);

export default router;
