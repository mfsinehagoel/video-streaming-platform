import { Request, Response } from "express";
import { Video } from "@video-platform/shared";
import { minioClient, MINIO_BUCKET } from "../config/minio";
import { AppError } from "../errors/AppError";

export async function getThumbnail(req: Request, res: Response) {
  try {
    const videoId = Number(req.params.id);

    if (!Number.isInteger(videoId)) {
      throw new AppError("Invalid video ID", 400);
    }

    const video = await Video.findByPk(videoId);

    if (!video) {
      throw new AppError("Video not found", 404);
    }

    if (!video.thumbnailObjectKey) {
      throw new AppError("Thumbnail is not available", 404);
    }

    const object = await minioClient.getObject(
      MINIO_BUCKET,
      video.thumbnailObjectKey,
    );

    res.setHeader("Content-Type", "image/jpeg");

    res.setHeader("Cache-Control", "public, max-age=3600");

    object.pipe(res);
  } catch (error) {
    throw new AppError("Failed to retrieve thumbnail", 500);
  }
}
