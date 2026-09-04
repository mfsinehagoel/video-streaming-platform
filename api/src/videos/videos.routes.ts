import { Router } from "express";
import {
  createVideo,
  getVideoById,
  getVideos,
  incrementVideoView,
  streamVideo,
} from "./videos.controller";

import fs from "fs";
import path from "path";

import { upload } from "../config/upload";
import { minioClient, MINIO_BUCKET } from "../config/minio";
import { ProcessingJob, Video } from "../models";

import { getRabbitMQChannel, PROCESSING_QUEUE } from "../config/rabbitmq";

import { streamHLS } from "./hls.controller";
import { getThumbnail } from "./thumbnail.controller";
import { downloadOriginalVideo } from "./download.controller";
import { getVideoStatus } from "./status.controller";
import { deleteVideo } from "./delete.controller";
import { redisClient } from "../config/redis";

const router = Router();

router.post("/", createVideo);

router.post("/upload", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No video file uploaded",
      });
    }

    const userId = Number(req.body.userId || 1);

    const title = req.body.title || path.parse(req.file.originalname).name;

    // 1. Create database record
    const video = await Video.create({
      userId,
      title,
      originalFilename: req.file.originalname,
      fileSize: req.file.size,

      duration: null,
      width: null,
      height: null,
      codec: null,

      status: "UPLOADING",

      originalObjectKey: null,
    });

    await redisClient.del("videos:all");

    // 2. Generate object key
    const objectKey = `originals/${userId}/${video.id}/${req.file.originalname}`;

    // 3. Upload actual file to MinIO
    await minioClient.fPutObject(MINIO_BUCKET, objectKey, req.file.path, {
      "Content-Type": req.file.mimetype,
    });

    // 4. Update database
    await video.update({
      originalObjectKey: objectKey,
      status: "QUEUED",
    });

    const processingJob = await ProcessingJob.create({
      videoId: video.id,
      status: "QUEUED",
      attempts: 0,
    });

    // 5. Publish processing job to RabbitMQ
    const channel = getRabbitMQChannel();

    channel.sendToQueue(
      PROCESSING_QUEUE,
      Buffer.from(
        JSON.stringify({
          jobId: processingJob.id,
          videoId: video.id,
          userId,
          objectKey,
        }),
      ),
      {
        persistent: true,
      },
    );

    // 6. Delete temporary file
    fs.unlinkSync(req.file.path);

    return res.status(201).json({
      success: true,
      message: "Video uploaded successfully",

      video: {
        id: video.id,
        title: video.title,
        originalFilename: video.originalFilename,
        fileSize: video.fileSize,
        status: video.status,
        originalObjectKey: video.originalObjectKey,
      },
    });
  } catch (error) {
    // Clean up temporary file
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }

    return res.status(500).json({
      success: false,
      message: "Video upload failed",
    });
  }
});

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
