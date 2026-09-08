import { Request, Response } from "express";
import { Video } from "@video-platform/shared";
import { minioClient, MINIO_BUCKET } from "../config/minio";
import { AppError } from "../errors/AppError";

export async function downloadOriginalVideo(req: Request, res: Response) {
  try {
    const videoId = Number(req.params.id);

    if (!Number.isInteger(videoId)) {
      throw new AppError("Invalid video ID", 400);
    }

    const video = await Video.findByPk(videoId);

    if (!video) {
      throw new AppError("Video not found", 404);
    }

    if (!video.originalObjectKey) {
      throw new AppError("Original video is not available", 404);
    }

    // Increment download count
    await Video.increment("downloads", {
      where: {
        id: videoId,
      },
    });

    const object = await minioClient.getObject(
      MINIO_BUCKET,
      video.originalObjectKey,
    );

    if (!object) {
      throw new AppError("Original video file not found", 404);
    }

    res.setHeader("Content-Type", "video/mp4");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(video.originalFilename)}"`,
    );

    res.setHeader("Cache-Control", "no-cache");

    object.pipe(res);
  } catch (error) {
    throw new AppError("Failed to download video", 500);
  }
}
