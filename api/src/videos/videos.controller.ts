import { Request, Response } from "express";
import { VideosService } from "./videos.service";

import { Video, VideoVariant, ProcessingJob } from "@video-platform/shared";

import { getRabbitMQChannel, PROCESSING_QUEUE } from "@video-platform/shared";
import fs from "fs";
import path from "path";

import { minioClient, MINIO_BUCKET } from "../config/minio";
import { invalidateVideoListCache, redisClient } from "@video-platform/shared";
import { AppError } from "../errors/AppError";

const videosService = new VideosService();

// Create a video in database record
export async function createVideo(req: Request, res: Response) {
  try {
    const { userId, title, originalFilename, fileSize } = req.body;

    if (!userId || !title || !originalFilename || !fileSize) {
      throw new AppError("Missing required fields", 400);
    }

    const video = await videosService.createVideo({
      userId: Number(userId),
      title,
      originalFilename,
      fileSize: Number(fileSize),
    });

    return res.status(201).json({
      success: true,
      video,
    });
  } catch (error) {
    throw new AppError("Failed to create video", 500);
  }
}

// Upload a video, store it in MinIO
// then, create a processing job, and publish it to RabbitMQ
export async function uploadVideo(req: Request, res: Response) {
  try {
    if (!req.file) {
      throw new AppError("No video file uploaded", 400);
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

    // 2. Generate MinIO object key
    const objectKey = `originals/${userId}/${video.id}/${req.file.originalname}`;

    // 3. Upload file to MinIO
    await minioClient.fPutObject(MINIO_BUCKET, objectKey, req.file.path, {
      "Content-Type": req.file.mimetype,
    });

    // 4. Update video after successful MinIO upload
    await video.update({
      originalObjectKey: objectKey,
      status: "QUEUED",
    });

    // 5. Create processing job
    const processingJob = await ProcessingJob.create({
      videoId: video.id,
      status: "QUEUED",
      attempts: 0,
    });

    // 6. Publish job to RabbitMQ
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

    // Invalidate video list cache
    await invalidateVideoListCache();

    // 7. Delete temporary uploaded file
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
    // Clean up temporary file if upload failed
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }

    throw new AppError("Video upload failed", 500);
  }
}

// Get paginated completed videos
export async function getVideos(req: Request, res: Response) {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;

    const page =
      typeof req.query.page === "string" ? Number(req.query.page) : 1;

    const limit =
      typeof req.query.limit === "string" ? Number(req.query.limit) : 10;

    // Validate page
    if (!Number.isInteger(page) || page < 1) {
      throw new AppError("Page must be a positive integer", 400);
    }

    // Validate limit
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError("Limit must be between 1 and 100", 400);
    }

    // Create cache key
    const cacheKey = [
      "videos:list",
      `search=${search ?? ""}`,
      "status=COMPLETED",
      `page=${page}`,
      `limit=${limit}`,
    ].join(":");

    // Check Redis cache
    const cachedVideos = await redisClient.get(cacheKey);

    if (cachedVideos) {
      return res.json({
        success: true,
        ...JSON.parse(cachedVideos),
        cached: true,
      });
    }

    // Fetch videos from db
    const result = await videosService.getVideos({
      ...(search !== undefined && { search }),
      page,
      limit,
    });

    // Cache result for 60 seconds
    await redisClient.setEx(cacheKey, 60, JSON.stringify(result));

    return res.json({
      success: true,
      ...result,
      cached: false,
    });
  } catch (error) {
	throw new AppError("Failed to fetch videos", 500);
  }
}

export async function getVideoById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      throw new AppError("Invalid video ID", 400);
    }

    const cacheKey = `video:${id}`;

    // 1. Check Redis first
    const cachedVideo = await redisClient.get(cacheKey);

    if (cachedVideo) {
      return res.json({
        success: true,
        video: JSON.parse(cachedVideo),
        cached: true,
      });
    }

    // 2. If not cached, fetch from MySQL
    const video = await videosService.getVideoById(id);

    if (!video) {
      throw new AppError("Video not found", 404);
    }

    // 3. Store result in Redis for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(video));

    // 4. Return MySQL result
    return res.json({
      success: true,
      video,
      cached: false,
    });
  } catch (error) {
    throw new AppError("Failed to fetch video", 500);
  }
}

export const streamVideo = async (req: Request, res: Response) => {
  try {
    const videoId = Number(req.params.id);

    if (!Number.isInteger(videoId)) {
      throw new AppError("Invalid video ID", 400);
    }

    // Find video
    const video = await Video.findByPk(videoId);

    if (!video) {
      throw new AppError("Video not found", 404);
    }

    // Find 720p processed variant
    const variant = await VideoVariant.findOne({
      where: {
        videoId,
        resolution: "720p",
      },
    });

    if (!variant) {
      throw new AppError("720p video variant not available yet", 404);
    }

    const objectKey = variant.objectKey;

    // Get object metadata from MinIO
    const metadata = await minioClient.statObject(MINIO_BUCKET, objectKey);

    const fileSize = Number(metadata.size);

    if (!fileSize) {
      throw new AppError("Video file is empty", 404);
    }

    const range = req.headers.range;

    // No Range header

    if (!range) {
      await Video.increment("views", {
        where: {
          id: videoId,
        },
      });
      const stream = await minioClient.getObject(MINIO_BUCKET, objectKey);

      res.status(200);

      res.setHeader("Content-Type", "video/mp4");

      res.setHeader("Content-Length", fileSize);

      res.setHeader("Accept-Ranges", "bytes");

      stream.pipe(res);

      return;
    }

    // Range request
    const rangeValue = range.replace(/bytes=/, "");

    const [startString, endString] = rangeValue.split("-");

    if (!startString) {
      throw new AppError("Invalid range", 416);
    }

    const start = parseInt(startString, 10);

    const end = endString ? parseInt(endString, 10) : fileSize - 1;

    // Validate range
    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start < 0 ||
      end >= fileSize ||
      start > end
    ) {
      res.status(416);

      res.setHeader("Content-Range", `bytes */${fileSize}`);

      return res.end();
    }

    const chunkSize = end - start + 1;

    // Get only requested bytes from MinIO
    const stream = await minioClient.getPartialObject(
      MINIO_BUCKET,
      objectKey,
      start,
      chunkSize,
    );

    res.status(206);

    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);

    res.setHeader("Accept-Ranges", "bytes");

    res.setHeader("Content-Length", chunkSize);

    res.setHeader("Content-Type", "video/mp4");

    stream.pipe(res);
  } catch (error) {
    if (!res.headersSent) {
      throw new AppError("Failed to stream video", 500);
    }
  }
};

export async function incrementVideoView(req: Request, res: Response) {
  try {
    const videoId = Number(req.params.id);

    if (!Number.isInteger(videoId)) {
      throw new AppError("Invalid video ID", 400);
    }

    const video = await Video.findByPk(videoId);

    if (!video) {
      throw new AppError("Video not found", 404);
    }

    await Video.increment("views", {
      where: {
        id: videoId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "View counted",
    });
  } catch (error) {
    throw new AppError("Failed to increment view count", 500);
  }
}
