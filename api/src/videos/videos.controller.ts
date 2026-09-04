import { Request, Response } from "express";
import { VideosService } from "./videos.service";

import { Video, VideoVariant } from "../models";
import { minioClient, MINIO_BUCKET } from "../config/minio";
import { redisClient } from "../config/redis";

const videosService = new VideosService();

export async function createVideo(req: Request, res: Response) {
  try {
    const { userId, title, originalFilename, fileSize } = req.body;

    if (!userId || !title || !originalFilename || !fileSize) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const video = await videosService.createVideo({
      userId,
      title,
      originalFilename,
      fileSize,
    });

    return res.status(201).json({
      success: true,
      video,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create video",
    });
  }
}

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
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer",
      });
    }

    // Validate limit
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

    // Create cache key
    const cacheKey = [
      "videos:list",
      `search=${search ?? ""}`,
      "status=NOT_COMPLETED",
      `page=${page}`,
      `limit=${limit}`,
    ].join(":");

    // Check Redis
    const cachedVideos = await redisClient.get(cacheKey);

    if (cachedVideos) {
      return res.json({
        success: true,
        ...JSON.parse(cachedVideos),
        cached: true,
      });
    }

    // Fetch videos
    const result = await videosService.getVideos({
      ...(search !== undefined && { search }),
      page,
      limit,
    });

    // Cache for 60 seconds
    await redisClient.setEx(cacheKey, 60, JSON.stringify(result));

    return res.json({
      success: true,
      ...result,
      cached: false,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
    });
  }
}

export async function getVideoById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
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
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
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
    return res.status(500).json({
      success: false,
      message: "Failed to fetch video",
    });
  }
}

export const streamVideo = async (req: Request, res: Response) => {
  try {
    const videoId = Number(req.params.id);

    if (!Number.isInteger(videoId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    // Find video
    const video = await Video.findByPk(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Find 720p processed variant
    const variant = await VideoVariant.findOne({
      where: {
        videoId,
        resolution: "720p",
      },
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "720p video variant not available yet",
      });
    }

    const objectKey = variant.objectKey;

    // Get object metadata from MinIO
    const metadata = await minioClient.statObject(MINIO_BUCKET, objectKey);

    const fileSize = Number(metadata.size);

    if (!fileSize) {
      return res.status(404).json({
        success: false,
        message: "Video file is empty",
      });
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
      return res.status(416).json({
        success: false,
        message: "Invalid range",
      });
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
      return res.status(500).json({
        success: false,
        message: "Failed to stream video",
      });
    }
  }
};

export async function incrementVideoView(req: Request, res: Response) {
  try {
    const videoId = Number(req.params.id);

    if (!Number.isInteger(videoId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    const video = await Video.findByPk(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
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
    return res.status(500).json({
      success: false,
      message: "Failed to increment view count",
    });
  }
}
