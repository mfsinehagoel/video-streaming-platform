import { Router } from "express";
import {
  createVideo,
  getVideoById,
  getVideos,
  incrementVideoView,
  streamVideo,
  uploadVideo,
} from "./videos.controller";

import { upload } from "../config/upload";

import { streamHLS } from "./hls.controller";
import { getThumbnail } from "./thumbnail.controller";
import { downloadOriginalVideo } from "./download.controller";
import { getVideoStatus } from "./status.controller";
import { deleteVideo } from "./delete.controller";

const router = Router();

router.post("/", createVideo);

router.post("/upload", upload.single("video"), uploadVideo);

router.get("/", getVideos);

router.get("/:id/hls/*splat", streamHLS);

router.get("/:id/thumbnail", getThumbnail);

router.get("/:id/download", downloadOriginalVideo);

router.post("/:id/view", incrementVideoView);

router.get("/:id/status", getVideoStatus);

router.get("/:id", getVideoById);

router.get("/:id/stream", streamVideo);

router.delete("/:id", deleteVideo);

export default router;
